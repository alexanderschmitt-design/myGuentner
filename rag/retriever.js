/**
 * RAG Retriever
 * Orchestrates the retrieval pipeline: query embedding → vector search → context assembly.
 * Provides the bridge between user questions and the vector store.
 */

const embeddings = require('./embeddings');
const vectorStore = require('./vector-store');

/* ============================================================
   Retrieval
   ============================================================ */

/**
 * Retrieve relevant document chunks for a user query.
 * @param {string} query - The user's question / search text
 * @param {object} options
 * @param {number} options.topK - Number of chunks to retrieve (default: 5)
 * @param {number} options.minScore - Minimum similarity threshold (default: 0.1)
 * @param {string[]} options.documentIds - Restrict to specific documents
 * @returns {Promise<{chunks: Array, context: string}>}
 */
async function retrieve(query, options) {
  var opts = Object.assign({ topK: 5, minScore: 0.1, documentIds: null, filter: null }, options || {});

  // 1. Generate embedding for the query
  var queryEmbedding = await embeddings.generateEmbedding(query);

  // 2. Search the vector store (mit optionalem Metadaten-Filter)
  var results = vectorStore.search(queryEmbedding, {
    topK: opts.topK,
    minScore: opts.minScore,
    documentIds: opts.documentIds,
    filter: opts.filter
  });

  // 3. Assemble context string for the LLM
  var context = results.map(function(r, i) {
    return '--- Quelle ' + (i + 1) + ' (Score: ' + r.score.toFixed(3) + ') ---\n' + r.text;
  }).join('\n\n');

  return {
    chunks: results,
    context: context,
    totalResults: results.length
  };
}

/**
 * Build a prompt with RAG context for an LLM.
 * @param {string} query - User question
 * @param {string} context - Retrieved context from retrieve()
 * @param {object} options
 * @param {string} options.systemPrompt - Custom system instruction
 * @param {string} options.language - Response language (default: 'de')
 * @returns {string} Complete prompt with context
 */
function buildRAGPrompt(query, context, options) {
  var opts = Object.assign({
    language: 'de',
    systemPrompt: ''
  }, options || {});

  var defaultSystem = opts.language === 'de'
    ? 'Du bist ein technischer Assistent für Güntner Kältetechnik-Produkte. Beantworte Fragen ausschließlich basierend auf dem bereitgestellten Kontext. Wenn der Kontext keine ausreichende Information enthält, sage dies ehrlich.'
    : 'You are a technical assistant for Güntner refrigeration products. Answer questions based solely on the provided context. If the context does not contain sufficient information, say so honestly.';

  var systemPrompt = opts.systemPrompt || defaultSystem;

  var prompt = systemPrompt + '\n\n';
  prompt += '=== KONTEXT AUS DER WISSENSDATENBANK ===\n\n';
  prompt += context || '(Kein relevanter Kontext gefunden)';
  prompt += '\n\n=== FRAGE ===\n\n';
  prompt += query;
  prompt += '\n\n=== ANTWORT ===\n';

  return prompt;
}

/**
 * Full RAG pipeline: retrieve context and build prompt.
 * @param {string} query
 * @param {object} options - Same options as retrieve() plus buildRAGPrompt() options
 * @returns {Promise<{prompt: string, chunks: Array, context: string}>}
 */
async function ragQuery(query, options) {
  var retrieval = await retrieve(query, options);

  var prompt = buildRAGPrompt(query, retrieval.context, options);

  return {
    prompt: prompt,
    context: retrieval.context,
    chunks: retrieval.chunks,
    totalResults: retrieval.totalResults
  };
}

module.exports = {
  retrieve: retrieve,
  buildRAGPrompt: buildRAGPrompt,
  ragQuery: ragQuery
};
