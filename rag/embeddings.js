/**
 * RAG Embeddings Module
 * Generates vector embeddings for text chunks.
 *
 * Supports two modes:
 * 1. Local TF-IDF based embeddings (no API key required, good for development)
 * 2. OpenAI API embeddings (production quality, requires OPENAI_API_KEY)
 *
 * Set RAG_EMBEDDING_MODE=openai and OPENAI_API_KEY in .env for production.
 */

const crypto = require('crypto');

/* ============================================================
   Configuration
   ============================================================ */

var config = {
  mode: process.env.RAG_EMBEDDING_MODE || 'local',        // 'local' | 'openai'
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.RAG_EMBEDDING_MODEL || 'text-embedding-3-small',
  localDimensions: 384  // dimension of local TF-IDF vectors
};

/* ============================================================
   Local TF-IDF Embeddings (development / offline)
   ============================================================ */

/** Global vocabulary built across all indexed documents */
var vocabulary = {};
var vocabSize = 0;
var idfScores = {};

/**
 * Build/update vocabulary from a set of texts
 */
function updateVocabulary(texts) {
  var docCount = texts.length;

  // Compute document frequency
  var df = {};
  texts.forEach(function(text) {
    var tokens = tokenize(text);
    var seen = {};
    tokens.forEach(function(t) {
      if (!seen[t]) { df[t] = (df[t] || 0) + 1; seen[t] = true; }
    });
  });

  // Merge into global vocabulary
  Object.keys(df).forEach(function(token) {
    if (!vocabulary[token]) {
      vocabulary[token] = vocabSize;
      vocabSize++;
    }
    idfScores[token] = Math.log((docCount + 1) / (df[token] + 1)) + 1;
  });
}

/**
 * Tokenize text into normalized word tokens
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\wäöüß]+/g, ' ')
    .split(/\s+/)
    .filter(function(t) { return t.length > 1; });
}

/**
 * Generate a local TF-IDF based embedding vector for a text.
 * Uses deterministic hashing to project into a fixed-dimension space.
 */
function generateLocalEmbedding(text) {
  var dim = config.localDimensions;
  var vector = new Float32Array(dim);
  var tokens = tokenize(text);
  var totalTokens = tokens.length || 1;

  // Compute TF for this text
  var tf = {};
  tokens.forEach(function(t) { tf[t] = (tf[t] || 0) + 1; });

  // Build vector using hashed projection
  Object.keys(tf).forEach(function(token) {
    var tfidf = (tf[token] / totalTokens) * (idfScores[token] || 1);

    // Hash the token to get deterministic indices
    var hash = crypto.createHash('md5').update(token).digest();
    for (var i = 0; i < 4; i++) {
      var idx = hash.readUInt16LE(i * 2) % dim;
      var sign = (hash[8 + i] & 1) ? 1 : -1;
      vector[idx] += sign * tfidf;
    }
  });

  // L2 normalize
  var norm = 0;
  for (var i = 0; i < dim; i++) norm += vector[i] * vector[i];
  norm = Math.sqrt(norm) || 1;
  for (var i = 0; i < dim; i++) vector[i] /= norm;

  return Array.from(vector);
}

/**
 * Generate local embeddings for multiple texts (batch)
 */
function generateLocalEmbeddings(texts) {
  updateVocabulary(texts);
  return texts.map(function(text) { return generateLocalEmbedding(text); });
}

/* ============================================================
   OpenAI API Embeddings (production)
   ============================================================ */

/**
 * Generate embeddings via OpenAI API
 */
async function generateOpenAIEmbeddings(texts) {
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required for OpenAI embeddings. Set it in .env or use RAG_EMBEDDING_MODE=local');
  }

  var batchSize = 100; // OpenAI allows up to 2048 inputs
  var allEmbeddings = [];

  for (var i = 0; i < texts.length; i += batchSize) {
    var batch = texts.slice(i, i + batchSize);

    var response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.openaiApiKey
      },
      body: JSON.stringify({
        model: config.openaiModel,
        input: batch
      })
    });

    if (!response.ok) {
      var err = await response.text();
      throw new Error('OpenAI API error: ' + err);
    }

    var data = await response.json();
    var embeddings = data.data
      .sort(function(a, b) { return a.index - b.index; })
      .map(function(item) { return item.embedding; });

    allEmbeddings = allEmbeddings.concat(embeddings);
  }

  return allEmbeddings;
}

/* ============================================================
   Public API
   ============================================================ */

/**
 * Generate embeddings for an array of text strings.
 * Uses local or OpenAI mode depending on configuration.
 * @param {string[]} texts
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
async function generateEmbeddings(texts) {
  if (config.mode === 'openai') {
    return generateOpenAIEmbeddings(texts);
  }
  return generateLocalEmbeddings(texts);
}

/**
 * Generate embedding for a single text string.
 * @param {string} text
 * @returns {Promise<number[]>} Embedding vector
 */
async function generateEmbedding(text) {
  var results = await generateEmbeddings([text]);
  return results[0];
}

/**
 * Update the embedding configuration at runtime.
 */
function configure(newConfig) {
  Object.assign(config, newConfig);
}

/**
 * Get current embedding dimensions.
 */
function getDimensions() {
  return config.mode === 'openai' ? 1536 : config.localDimensions;
}

module.exports = {
  generateEmbedding: generateEmbedding,
  generateEmbeddings: generateEmbeddings,
  configure: configure,
  getDimensions: getDimensions,
  tokenize: tokenize,
  updateVocabulary: updateVocabulary
};
