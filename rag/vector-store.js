/**
 * RAG Vector Store
 * File-based vector database that stores document embeddings as JSON.
 * Supports CRUD operations and cosine-similarity search.
 */

const fs = require('fs');
const path = require('path');

var STORE_DIR = path.join(__dirname, '..', 'vector-store');

/* ============================================================
   Initialization
   ============================================================ */

/** Ensure storage directory exists */
function ensureStoreDir() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

/** Get the path for a document's vector file */
function getDocVectorPath(documentId) {
  return path.join(STORE_DIR, documentId + '.vectors.json');
}

/** Get the index file path */
function getIndexPath() {
  return path.join(STORE_DIR, '_index.json');
}

/* ============================================================
   Index Management
   ============================================================ */

/** Load the global index */
function loadIndex() {
  ensureStoreDir();
  var indexPath = getIndexPath();
  if (fs.existsSync(indexPath)) {
    return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  }
  return { documents: {}, totalChunks: 0, lastUpdated: null };
}

/** Save the global index */
function saveIndex(index) {
  ensureStoreDir();
  index.lastUpdated = new Date().toISOString();
  fs.writeFileSync(getIndexPath(), JSON.stringify(index, null, 2), 'utf-8');
}

/* ============================================================
   CRUD Operations
   ============================================================ */

/**
 * Store vectors for a document.
 * @param {string} documentId - Unique document ID
 * @param {Array<{text: string, embedding: number[], metadata: object}>} chunks
 */
function storeVectors(documentId, chunks) {
  ensureStoreDir();

  var data = {
    documentId: documentId,
    chunkCount: chunks.length,
    storedAt: new Date().toISOString(),
    chunks: chunks.map(function(chunk, i) {
      return {
        id: documentId + '_chunk_' + i,
        text: chunk.text,
        embedding: chunk.embedding,
        metadata: Object.assign({}, chunk.metadata || {}, {
          documentId: documentId,
          chunkIndex: i
        })
      };
    })
  };

  fs.writeFileSync(getDocVectorPath(documentId), JSON.stringify(data), 'utf-8');

  // Update index
  var index = loadIndex();
  if (index.documents[documentId]) {
    index.totalChunks -= index.documents[documentId].chunkCount || 0;
  }
  index.documents[documentId] = {
    chunkCount: chunks.length,
    storedAt: data.storedAt
  };
  index.totalChunks += chunks.length;
  saveIndex(index);

  return data;
}

/**
 * Remove all vectors for a document.
 * @param {string} documentId
 */
function removeVectors(documentId) {
  var vecPath = getDocVectorPath(documentId);
  if (fs.existsSync(vecPath)) {
    fs.unlinkSync(vecPath);
  }

  var index = loadIndex();
  if (index.documents[documentId]) {
    index.totalChunks -= index.documents[documentId].chunkCount || 0;
    delete index.documents[documentId];
    saveIndex(index);
  }
}

/**
 * Get vectors for a specific document.
 * @param {string} documentId
 * @returns {object|null}
 */
function getVectors(documentId) {
  var vecPath = getDocVectorPath(documentId);
  if (!fs.existsSync(vecPath)) return null;
  return JSON.parse(fs.readFileSync(vecPath, 'utf-8'));
}

/**
 * Get summary statistics.
 */
function getStats() {
  var index = loadIndex();
  return {
    documentCount: Object.keys(index.documents).length,
    totalChunks: index.totalChunks,
    lastUpdated: index.lastUpdated
  };
}

/* ============================================================
   Similarity Search
   ============================================================ */

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  var dotProduct = 0;
  var normA = 0;
  var normB = 0;
  for (var i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  var denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

/**
 * Prüft ob die metadata eines Chunks alle filter-Kriterien erfüllt.
 * Filter-Format:
 *   { source: 'dms' }                              → metadata.source === 'dms'
 *   { dmsId: ['P001', 'P002'] }                    → in-Operator (Array = OR)
 *   { contentType: { $in: ['application/pdf'] } }  → expliziter $in-Operator
 *   { dmsVersion: { $exists: true } }              → existiert (egal welcher Wert)
 * Mehrere Keys werden mit AND verknüpft.
 * Rückwärtskompatibel: undefined/null filter → trifft alles zu.
 */
function matchesMetadataFilter(metadata, filter) {
  if (!filter) return true;
  if (!metadata) return Object.keys(filter).length === 0;
  for (var key in filter) {
    if (!Object.prototype.hasOwnProperty.call(filter, key)) continue;
    var crit = filter[key];
    var val = metadata[key];
    // Operator-Objekte
    if (crit && typeof crit === 'object' && !Array.isArray(crit)) {
      if (Object.prototype.hasOwnProperty.call(crit, '$in')) {
        if (!Array.isArray(crit.$in) || crit.$in.indexOf(val) === -1) return false;
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(crit, '$exists')) {
        var has = val !== undefined && val !== null;
        if (!!crit.$exists !== has) return false;
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(crit, '$ne')) {
        if (val === crit.$ne) return false;
        continue;
      }
      // Unbekannter Operator → strict-equal Vergleich des ganzen Objekts (Edge-Case)
      if (val !== crit) return false;
      continue;
    }
    // Array → in-Operator (OR)
    if (Array.isArray(crit)) {
      if (crit.indexOf(val) === -1) return false;
      continue;
    }
    // Skalar → strict-equal
    if (val !== crit) return false;
  }
  return true;
}

/**
 * Search for the most similar chunks across all documents.
 * @param {number[]} queryEmbedding - The query vector
 * @param {object} options
 * @param {number} options.topK - Number of results to return (default: 5)
 * @param {number} options.minScore - Minimum similarity score (default: 0.0)
 * @param {string[]} options.documentIds - Restrict to specific documents (optional)
 * @param {object}   options.filter - Metadata filter applied BEFORE cosine scoring (optional)
 *                                    z. B. { source: 'dms', dmsId: ['P001', 'P002'] }
 * @returns {Array<{text: string, score: number, metadata: object}>}
 */
function search(queryEmbedding, options) {
  var opts = Object.assign({ topK: 5, minScore: 0.0, documentIds: null, filter: null }, options || {});

  ensureStoreDir();
  var index = loadIndex();
  var results = [];

  var docIds = opts.documentIds || Object.keys(index.documents);

  docIds.forEach(function(docId) {
    var data = getVectors(docId);
    if (!data || !data.chunks) return;

    data.chunks.forEach(function(chunk) {
      // Metadaten-Filter vor dem teuren Cosine-Scoring anwenden
      if (opts.filter && !matchesMetadataFilter(chunk.metadata, opts.filter)) return;

      var score = cosineSimilarity(queryEmbedding, chunk.embedding);
      if (score >= opts.minScore) {
        results.push({
          id: chunk.id,
          text: chunk.text,
          score: score,
          metadata: chunk.metadata
        });
      }
    });
  });

  // Sort by descending score and return top K
  results.sort(function(a, b) { return b.score - a.score; });
  return results.slice(0, opts.topK);
}

/**
 * Get total chunk count across all documents.
 */
function getTotalChunks() {
  var index = loadIndex();
  return index.totalChunks;
}

/**
 * Configure the storage directory.
 */
function setStoreDir(dir) {
  STORE_DIR = dir;
}

module.exports = {
  storeVectors: storeVectors,
  removeVectors: removeVectors,
  getVectors: getVectors,
  getStats: getStats,
  search: search,
  matchesMetadataFilter: matchesMetadataFilter,
  cosineSimilarity: cosineSimilarity,
  getTotalChunks: getTotalChunks,
  setStoreDir: setStoreDir,
  loadIndex: loadIndex
};
