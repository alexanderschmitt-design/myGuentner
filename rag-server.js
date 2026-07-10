/**
 * RAG Server — Express API for Document Management & RAG Pipeline
 *
 * Endpoints:
 *   POST   /api/documents/upload         Upload a document
 *   GET    /api/documents                List all documents with stats
 *   GET    /api/documents/:id/download   Download original file
 *   GET    /api/documents/:id/view       Stream original file inline (PDF viewer / preview)
 *   POST   /api/documents/:id/process    Trigger (re-)processing of a document
 *   DELETE /api/documents/:id            Delete document and its vectors
 *   POST   /api/documents/reprocess-all  Reprocess all documents
 *   POST   /api/rag/query                RAG query — retrieve context for a question
 *   GET    /api/rag/stats                Vector store statistics
 *
 * Start: node rag-server.js
 * Default port: 3001 (configurable via PORT env var)
 */

require('dotenv').config();

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const documentProcessor = require('./rag/document-processor');
const embeddings = require('./rag/embeddings');
const vectorStore = require('./rag/vector-store');
const retriever = require('./rag/retriever');
const dmsConnector = require('./rag/dms-connector');
const bella = require('./rag/llm-bella');
const gemini = require('./rag/llm-gemini');
const gpceuProxy = require('./rag/gpceu-proxy');
const { createProxyMiddleware } = require('http-proxy-middleware');

/* ============================================================
   LLM Provider Dispatch
   ============================================================
   Wahl zwischen Anthropic Claude und Google Gemini.
   Steuerung über process.env.LLM_PROVIDER (default 'anthropic').
   Wird zur Laufzeit ausgewertet, sodass die Settings-PUT-Route den
   Provider ohne Server-Neustart umschalten kann (via setLlmProvider). */

var activeLlmProvider = (process.env.LLM_PROVIDER || 'anthropic').trim().toLowerCase();
if (activeLlmProvider !== 'anthropic' && activeLlmProvider !== 'gemini') {
  console.warn('[LLM] Unbekannter LLM_PROVIDER "' + activeLlmProvider + '", fallback auf anthropic');
  activeLlmProvider = 'anthropic';
}

function setLlmProvider(p) {
  var v = (p || '').trim().toLowerCase();
  if (v === 'anthropic' || v === 'gemini') activeLlmProvider = v;
}

/** Liefert den aktiven LLM-Adapter mit einer einheitlichen API. */
function getActiveLlm() {
  if (activeLlmProvider === 'gemini') {
    return {
      name: 'gemini',
      ask: gemini.askGemini,
      healthCheck: gemini.healthCheck,
      config: gemini.config,
    };
  }
  return {
    name: 'anthropic',
    ask: bella.askBella,
    healthCheck: bella.healthCheck,
    config: bella.config,
  };
}

/* ============================================================
   Configuration
   ============================================================ */

var PORT = process.env.PORT || 3001;
var UPLOAD_DIR = path.join(__dirname, 'uploads');
var DB_FILE = path.join(__dirname, 'uploads', '_documents.json');

// DMS-Property-UUIDs für die 5 Cascading-Dropdowns im Modal.
// Aus /api/dms/source verifiziert (siehe getSourceDefinition).
// Frontend übergibt Werte als Query-Keys category|level1|group|family|series,
// /api/dms/search mappt sie hier auf die DMS-Property-IDs.
var DMS_FILTER_PROPS = {
  category: '331437f3-d166-4a1f-af21-b547d2d64ccd', // Product Category
  level1:   '72ad6780-5236-48e8-a22a-a176ca025cb8', // Product Level 1
  group:    'ae6fba82-d919-404a-863e-07d32823ca00', // Product Group
  family:   '435010da-3852-4f7f-9066-6f208b68927b', // Product Family
  series:   '4e13f3aa-4fdc-41db-b4ad-f24ab6f1f31e', // Product Series
};

// Default-Kategorie für die Modal-Standardansicht: "Portal Public Documents".
// UUID aus /api/dms/source verifiziert. Live-Test bestätigt: Treffer sind
// ausschließlich technische Manuals (GACC, Cubic COMPACT, GADC etc.) —
// kein Geschäftsbeleg-Rauschen mehr. Frontend kann via ?allCategories=true
// opt-outen oder via ?categoryid=<uuid> auf eine andere Kategorie scopen.
var DMS_DEFAULT_CATEGORY_ID = process.env.DMS_DEFAULT_CATEGORY_ID
  || '86d59bc5-b4ea-4b32-ba9e-fc76630b64d5';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* ============================================================
   Document Database (JSON file)
   ============================================================ */

function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  }
  return { documents: [] };
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function findDoc(id) {
  var db = loadDB();
  return db.documents.find(function(d) { return d.id === id; });
}

function updateDoc(id, updates) {
  var db = loadDB();
  var idx = db.documents.findIndex(function(d) { return d.id === id; });
  if (idx === -1) return null;
  Object.assign(db.documents[idx], updates);
  saveDB(db);
  return db.documents[idx];
}

function removeDoc(id) {
  var db = loadDB();
  db.documents = db.documents.filter(function(d) { return d.id !== id; });
  saveDB(db);
}

function computeStats(db) {
  var stats = { total: 0, ready: 0, processing: 0, pending: 0, failed: 0, totalChunks: 0 };
  db.documents.forEach(function(d) {
    stats.total++;
    stats[d.status] = (stats[d.status] || 0) + 1;
    stats.totalChunks += d.chunks || 0;
  });
  return stats;
}

/* ============================================================
   Express App
   ============================================================ */

var app = express();
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'frontend')));

/* ---- Multer Storage ---- */
var storage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, UPLOAD_DIR); },
  filename: function(req, file, cb) {
    var id = crypto.randomBytes(8).toString('hex');
    var ext = path.extname(file.originalname);
    cb(null, id + ext);
  }
});

var upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: function(req, file, cb) {
    var allowedExts = ['.pdf', '.docx', '.txt', '.md', '.csv', '.xlsx'];
    var ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.indexOf(ext) === -1) {
      return cb(new Error('Dateityp nicht unterstützt: ' + ext));
    }
    cb(null, true);
  }
});

/* ============================================================
   Routes — Document Management
   ============================================================ */

/** Upload a document */
app.post('/api/documents/upload', upload.single('document'), function(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei empfangen.' });
  }

  var ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
  var doc = {
    id: path.basename(req.file.filename, path.extname(req.file.filename)),
    name: path.basename(req.file.originalname, path.extname(req.file.originalname)),
    originalName: req.file.originalname,
    filename: req.file.filename,
    type: ext,
    size: req.file.size,
    chunks: null,
    status: 'pending',
    uploadedAt: new Date().toISOString(),
    processedAt: null,
    error: null
  };

  var db = loadDB();
  db.documents.push(doc);
  saveDB(db);

  // Auto-trigger processing
  processDocumentAsync(doc.id);

  res.json({ success: true, document: doc });
});

/** List all documents */
app.get('/api/documents', function(req, res) {
  var db = loadDB();
  var stats = computeStats(db);
  res.json({ documents: db.documents, stats: stats });
});

/** Download original file */
app.get('/api/documents/:id/download', function(req, res) {
  var doc = findDoc(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden.' });

  var filePath = path.join(UPLOAD_DIR, doc.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Datei nicht gefunden.' });

  res.download(filePath, doc.originalName);
});

/** View original file inline (for browser PDF viewer / image preview) */
app.get('/api/documents/:id/view', function(req, res) {
  var doc = findDoc(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden.' });

  var filePath = path.join(UPLOAD_DIR, doc.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Datei nicht gefunden.' });

  // MIME-Type aus Endung ableiten — Browser-PDF-Viewer braucht application/pdf
  var ext = (path.extname(doc.originalName || doc.filename) || '').toLowerCase();
  var mimeMap = {
    '.pdf':  'application/pdf',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.txt':  'text/plain; charset=utf-8',
    '.md':   'text/plain; charset=utf-8',
    '.csv':  'text/csv; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
  };
  var mime = mimeMap[ext] || 'application/octet-stream';

  // RFC 5987-konforme Filename-Codierung (Umlaute / Sonderzeichen)
  var safeName = encodeURIComponent(doc.originalName || doc.filename || 'document').replace(/['()]/g, escape);
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', 'inline; filename*=UTF-8\'\'' + safeName);
  res.setHeader('Cache-Control', 'private, max-age=300');
  fs.createReadStream(filePath).pipe(res);
});

/** Trigger (re-)processing */
app.post('/api/documents/:id/process', function(req, res) {
  var doc = findDoc(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden.' });

  updateDoc(doc.id, { status: 'processing', error: null });
  processDocumentAsync(doc.id);

  res.json({ success: true, message: 'Verarbeitung gestartet.' });
});

/** Delete document */
app.delete('/api/documents/:id', function(req, res) {
  var doc = findDoc(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden.' });

  // Delete file
  var filePath = path.join(UPLOAD_DIR, doc.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  // Delete vectors
  vectorStore.removeVectors(doc.id);

  // Remove from DB
  removeDoc(doc.id);

  res.json({ success: true, message: 'Dokument gelöscht.' });
});

/** Reprocess all documents */
app.post('/api/documents/reprocess-all', function(req, res) {
  var db = loadDB();
  db.documents.forEach(function(doc) {
    updateDoc(doc.id, { status: 'processing', error: null });
    processDocumentAsync(doc.id);
  });
  res.json({ success: true, message: 'Alle Dokumente werden neu verarbeitet.' });
});

/* ============================================================
   Routes — RAG Query
   ============================================================ */

/** Query the RAG pipeline */
app.post('/api/rag/query', async function(req, res) {
  try {
    var query = req.body.query;
    if (!query) return res.status(400).json({ error: 'query ist erforderlich.' });

    var options = {
      topK: req.body.topK || 5,
      minScore: req.body.minScore || 0.1,
      documentIds: req.body.documentIds || null,
      filter: req.body.filter || null,
      language: req.body.language || 'de'
    };

    var result = await retriever.ragQuery(query, options);

    res.json({
      success: true,
      prompt: result.prompt,
      context: result.context,
      chunks: result.chunks.map(function(c) {
        return {
          text: c.text,
          score: c.score,
          documentId: c.metadata ? c.metadata.documentId : null,
          chunkIndex: c.metadata ? c.metadata.chunkIndex : null
        };
      }),
      totalResults: result.totalResults
    });
  } catch (err) {
    console.error('RAG query error:', err);
    res.status(500).json({ error: 'RAG Query fehlgeschlagen: ' + err.message });
  }
});

/** Vector store statistics */
app.get('/api/rag/stats', function(req, res) {
  var stats = vectorStore.getStats();
  res.json({ success: true, stats: stats });
});

/** Save RAG settings (persisted as JSON file) */
var SETTINGS_FILE = path.join(__dirname, 'rag-settings.json');

app.put('/api/rag/settings', function(req, res) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(req.body, null, 2), 'utf-8');

    // Apply embedding settings at runtime
    if (req.body.embeddingMode || req.body.openaiModel || req.body.apiKey || req.body.localDimensions) {
      embeddings.configure({
        mode: req.body.embeddingMode,
        openaiApiKey: req.body.apiKey,
        openaiModel: req.body.openaiModel,
        localDimensions: req.body.localDimensions
      });
    }

    // LLM-Provider zur Laufzeit umschalten (kein Neustart nötig)
    if (req.body.llmProvider) setLlmProvider(req.body.llmProvider);

    // Sync API key and mode to .env file
    // Hinweis: Anthropic/Gemini-Keys werden in den Modulen erst beim require() gelesen —
    // ein NEUER Key in .env wird erst nach Server-Neustart aktiv. Dafür ist eine
    // entsprechende Hint in der Settings-UI angebracht.
    var envUpdates = {
      OPENAI_API_KEY: req.body.apiKey || '',
      RAG_EMBEDDING_MODE: req.body.embeddingMode || 'local',
      RAG_EMBEDDING_MODEL: req.body.openaiModel || 'text-embedding-3-small',
    };
    if (req.body.llmProvider) envUpdates.LLM_PROVIDER = req.body.llmProvider;
    if (req.body.googleApiKey != null) envUpdates.GOOGLE_API_KEY = req.body.googleApiKey;
    if (req.body.geminiModel) envUpdates.GEMINI_MODEL = req.body.geminiModel;
    if (req.body.anthropicApiKey != null) envUpdates.ANTHROPIC_API_KEY = req.body.anthropicApiKey;
    if (req.body.anthropicModel) envUpdates.ANTHROPIC_MODEL = req.body.anthropicModel;
    updateEnvFile(envUpdates);

    res.json({
      success: true,
      message: 'Settings gespeichert.',
      activeLlmProvider: activeLlmProvider,
      requiresRestart: !!(req.body.googleApiKey || req.body.anthropicApiKey || req.body.geminiModel || req.body.anthropicModel),
    });
  } catch (err) {
    res.status(500).json({ error: 'Settings konnten nicht gespeichert werden: ' + err.message });
  }
});

/** Helper: update .env file with new key-value pairs (preserves other entries) */
function updateEnvFile(updates) {
  var envPath = path.join(__dirname, '.env');
  var lines = [];
  if (fs.existsSync(envPath)) {
    lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  }
  Object.keys(updates).forEach(function(key) {
    var found = false;
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].match(new RegExp('^' + key + '\\s*='))) {
        lines[i] = key + '=' + updates[key];
        found = true;
        break;
      }
    }
    if (!found) lines.push(key + '=' + updates[key]);
  });
  fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');
}

app.get('/api/rag/settings', function(req, res) {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      var settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      res.json({ success: true, settings: settings });
    } else {
      res.json({ success: true, settings: null });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Test an OpenAI API key (proxy to avoid CORS) */
app.post('/api/rag/test-key', async function(req, res) {
  var key = (req.body.apiKey || '').trim();
  if (!key) {
    return res.json({ success: false, error: 'Kein API-Key angegeben.' });
  }
  try {
    var response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': 'Bearer ' + key }
    });
    if (response.ok) {
      res.json({ success: true, message: 'API-Key ist gültig.' });
    } else {
      var body = await response.text();
      var detail = '';
      try { detail = JSON.parse(body).error.message; } catch (e) {}
      res.json({ success: false, error: 'Status ' + response.status + (detail ? ': ' + detail : '') });
    }
  } catch (err) {
    res.json({ success: false, error: 'Netzwerkfehler: ' + err.message });
  }
});

/** Test a Google Gemini API key. Macht einen minimalen generateContent-Call
 *  gegen das angegebene Modell (default gemini-1.5-flash). */
app.post('/api/rag/test-gemini-key', async function(req, res) {
  var key = (req.body.apiKey || req.body.googleApiKey || '').trim();
  var model = (req.body.model || req.body.geminiModel || 'gemini-1.5-flash').trim();
  if (!key) {
    return res.json({ success: false, error: 'Kein Gemini-Key angegeben.' });
  }
  try {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/'
      + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key);
    var response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'OK?' }] }],
        generationConfig: { maxOutputTokens: 8, temperature: 0 },
      }),
    });
    if (response.ok) {
      res.json({ success: true, message: 'Gemini-Key ist gültig.', model: model });
    } else {
      var body = await response.text();
      var detail = '';
      try { detail = JSON.parse(body).error.message; } catch (e) { detail = body.slice(0, 240); }
      res.json({ success: false, error: 'Status ' + response.status + (detail ? ': ' + detail : ''), status: response.status });
    }
  } catch (err) {
    res.json({ success: false, error: 'Netzwerkfehler: ' + err.message });
  }
});

/** Clear entire vector store */
app.delete('/api/rag/store', function(req, res) {
  try {
    var index = vectorStore.loadIndex();
    var docIds = Object.keys(index.documents);
    docIds.forEach(function(id) { vectorStore.removeVectors(id); });
    res.json({ success: true, message: 'Vector Store geleert. ' + docIds.length + ' Dokumente entfernt.' });
  } catch (err) {
    res.status(500).json({ error: 'Vector Store konnte nicht geleert werden: ' + err.message });
  }
});

/* ============================================================
   Routes — System Status (Aggregator für Health-Dashboard)
   ============================================================ */

var SERVER_STARTED_AT = new Date().toISOString();

/**
 * Liefert einen kompakten Gesamt-Status für das Health-Dashboard.
 * Alle Sub-Calls laufen parallel und sind tolerant gegen Einzelfehler —
 * fällt der DMS-Check aus, blockiert das nicht den restlichen Status.
 */
app.get('/api/system/status', async function(req, res) {
  function safe(promise, fallback) {
    return promise.then(function(v) { return v; }).catch(function(err) {
      return Object.assign({}, fallback || {}, { error: err.message });
    });
  }

  try {
    var pkgVersion = '1.0.0';
    try { pkgVersion = require('./package.json').version; } catch (e) {}

    var dmsHealth = safe(dmsConnector.healthCheck(), { ok: false });
    var llm = getActiveLlm();
    var llmHealth = safe(llm.healthCheck(), { ok: false });

    var [dms, llmH] = await Promise.all([dmsHealth, llmHealth]);

    var vecStats = vectorStore.getStats();
    var docDb = loadDB();
    var docStats = computeStats(docDb);

    // Recent: letzte 10 verarbeiteten Dokumente, sortiert nach processedAt desc
    var recent = docDb.documents
      .filter(function(d) { return d.processedAt; })
      .sort(function(a, b) { return (b.processedAt || '').localeCompare(a.processedAt || ''); })
      .slice(0, 10)
      .map(function(d) {
        return {
          id: d.id,
          name: d.originalName || d.name,
          status: d.status,
          chunks: d.chunks,
          type: d.type,
          processedAt: d.processedAt,
          dmsId: d.dmsMetadata ? d.dmsMetadata.dmsId : null,
        };
      });

    // Aktive Import-Jobs
    var activeJobs = [];
    importJobs.forEach(function(job, id) {
      if (job.state === 'running') {
        activeJobs.push({
          jobId: id,
          state: job.state,
          processed: job.processed,
          total: job.total,
          startedAt: job.startedAt,
        });
      }
    });

    res.json({
      success: true,
      server: {
        version: pkgVersion,
        startedAt: SERVER_STARTED_AT,
        uptimeSec: Math.floor((Date.now() - new Date(SERVER_STARTED_AT).getTime()) / 1000),
        port: PORT,
      },
      embeddings: {
        mode: process.env.RAG_EMBEDDING_MODE || 'local',
        model: process.env.RAG_EMBEDDING_MODEL || 'text-embedding-3-small',
        dimensions: embeddings.getDimensions(),
        hasOpenAIKey: !!(process.env.OPENAI_API_KEY || '').trim(),
      },
      vectorStore: vecStats,
      documents: docStats,
      dms: {
        ok: dms.ok,
        baseUrl: dmsConnector.config.baseUrl,
        repositoryId: dmsConnector.config.repositoryId,
        authMode: dmsConnector.config.authMode,
        linkCount: dms.linkCount || 0,
        error: dms.error || null,
      },
      // "bella"-Sektion bleibt rückwärtskompatibel — sie zeigt jetzt den aktiven LLM-Provider
      // (Anthropic ODER Gemini), je nach LLM_PROVIDER-Setting.
      bella: {
        ok: llmH.ok,
        model: llm.config.model,
        hasApiKey: llm.config.hasApiKey,
        responseSnippet: llmH.response || null,
        usage: llmH.usage || null,
        error: llmH.error || null,
        status: llmH.status || null,
      },
      llm: {
        provider: activeLlmProvider,
        ok: llmH.ok,
        model: llm.config.model,
        hasApiKey: llm.config.hasApiKey,
        responseSnippet: llmH.response || null,
        error: llmH.error || null,
        availableProviders: [
          { id: 'anthropic', label: 'Anthropic Claude', model: bella.config.model, hasApiKey: bella.config.hasApiKey },
          { id: 'gemini',    label: 'Google Gemini',    model: gemini.config.model, hasApiKey: gemini.config.hasApiKey },
        ],
      },
      activeJobs: activeJobs,
      recentDocuments: recent,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================
   Routes — Bella Chat (RAG → Claude → SSE)
   ============================================================ */

/** Health-Check des aktiven LLM-Providers (Anthropic ODER Gemini). */
app.get('/api/chat/health', async function(req, res) {
  try {
    var llm = getActiveLlm();
    var health = await llm.healthCheck();
    // Provider-Info anreichern, damit das Frontend weiß, welche LLM gerade aktiv ist
    health.provider = llm.name;
    health.activeModel = llm.config && llm.config.model;
    res.json(health);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, provider: activeLlmProvider });
  }
});

/**
 * POST /api/chat — Streaming-Chat mit Bella + RAG
 *
 * Body: { query, topK?, minScore?, filter?, language?, effort?, thinking?, history? }
 *
 * Antwortet als Server-Sent Events (SSE):
 *   event: sources       data: { sources: [...] }
 *   event: text          data: { text: "..." }     (für jedes Token)
 *   event: thinking      data: { text: "..." }     (nur wenn thinking=true)
 *   event: done          data: { stopReason, usage, fullText }
 *   event: error         data: { error: "..." }
 */
app.post('/api/chat', async function(req, res) {
  var query = (req.body && req.body.query || '').trim();
  if (!query) {
    return res.status(400).json({ error: 'query ist erforderlich' });
  }

  // SSE-Header
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // nginx-Bypass falls vorhanden
  res.flushHeaders && res.flushHeaders();

  function send(eventName, data) {
    res.write('event: ' + eventName + '\n');
    res.write('data: ' + JSON.stringify(data) + '\n\n');
  }

  try {
    // 1. RAG-Retrieval
    var retrieval = await retriever.retrieve(query, {
      topK: req.body.topK || 5,
      minScore: req.body.minScore || 0.05,
      documentIds: req.body.documentIds || null,
      filter: req.body.filter || null,
    });

    // 2. Streamen via aktivem LLM (Anthropic ODER Gemini)
    var llm = getActiveLlm();
    var llmStream = llm.ask(query, retrieval.chunks, {
      language: req.body.language || 'de',
      effort: req.body.effort || 'medium',
      thinking: req.body.thinking === true,
      maxTokens: req.body.maxTokens || 4096,
      history: req.body.history || [],
      // Per-Call Model-Override (Playground-Feature) — z.B. gemini-2.5-pro für höhere Qualität.
      // Provider-spezifisch: nur Gemini wertet das aus; Bella ignoriert es derzeit.
      model: req.body.model || null,
      // Detail-Modus erweitert den System-Prompt um eine "ausführlich antworten"-Regel.
      detailedMode: req.body.detailedMode === true,
    });

    for await (const ev of llmStream) {
      if (ev.type === 'sources') {
        send('sources', { sources: ev.sources });
      } else if (ev.type === 'text_delta') {
        send('text', { text: ev.text });
      } else if (ev.type === 'thinking_delta') {
        send('thinking', { text: ev.text });
      } else if (ev.type === 'done') {
        send('done', {
          stopReason: ev.stopReason,
          fullText: ev.fullText,
          usage: ev.usage,
        });
      } else if (ev.type === 'error') {
        send('error', { error: ev.error });
      }
    }
  } catch (err) {
    console.error('[Chat] Stream error:', err);
    send('error', { error: err.message });
  }
  res.end();
});

/* ============================================================
   Routes — DMS (d.velop d.3one Anbindung)
   ============================================================ */

/** Job-Tracking für Bulk-Imports — Map + JSON-Persistenz.
    Beim Server-Start wird die Datei geladen, jede Mutation schreibt sie.
    Lebenszyklus: state="running" → "done"/"failed". Nach 24 h auto-bereinigt. */
var importJobs = new Map();
var JOBS_FILE = path.join(UPLOAD_DIR, '_jobs.json');

function loadJobs() {
  try {
    if (fs.existsSync(JOBS_FILE)) {
      var data = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf-8'));
      Object.keys(data || {}).forEach(function(id) {
        // Laufende Jobs aus altem Server-Run als "interrupted" markieren
        var job = data[id];
        if (job.state === 'running') {
          job.state = 'failed';
          job.errors = job.errors || [];
          job.errors.push({ stage: 'server-restart', error: 'Server wurde neugestartet, Job war noch nicht fertig' });
          job.finishedAt = new Date().toISOString();
        }
        importJobs.set(id, job);
      });
      console.log('[Jobs] ' + importJobs.size + ' Jobs aus ' + path.basename(JOBS_FILE) + ' geladen');
    }
  } catch (err) {
    console.warn('[Jobs] Konnte ' + JOBS_FILE + ' nicht lesen:', err.message);
  }
}

function saveJobs() {
  try {
    var obj = {};
    importJobs.forEach(function(job, id) { obj[id] = job; });
    fs.writeFileSync(JOBS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Jobs] Konnte ' + JOBS_FILE + ' nicht schreiben:', err.message);
  }
}

loadJobs();

function newJobId() { return crypto.randomBytes(8).toString('hex'); }

/** Hintergrund-Cleanup für alte Jobs (>24 h fertig) — und sofortiger Disk-Sync */
setInterval(function() {
  var cutoff = Date.now() - 24 * 60 * 60 * 1000;
  var changed = false;
  importJobs.forEach(function(job, id) {
    if (job.finishedAt && new Date(job.finishedAt).getTime() < cutoff) {
      importJobs.delete(id);
      changed = true;
    }
  });
  if (changed) saveJobs();
}, 5 * 60 * 1000).unref();

/** Health-Check der DMS-Anbindung */
app.get('/api/dms/health', async function(req, res) {
  try {
    var health = await dmsConnector.healthCheck();
    res.json(health);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** MIME → Doc-Typ-Label für die UI */
var MIME_LABEL = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'application/vnd.ms-powerpoint': 'PPT',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
  'text/markdown': 'MD',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
};
function labelForMime(mime) {
  if (!mime) return null;
  var base = mime.split(';')[0].trim().toLowerCase();
  return MIME_LABEL[base] || base.split('/')[1] || base;
}

/** Suche im DMS — Proxy für /srm/?fulltext=…&page=…&pagesize=…
    Optional enrich=true (Default): Pro Treffer parallel Metadaten (mimeType, creationDate)
    via /o2m/{id}/v/current nachladen, damit das Frontend Doc-Typ + Datum anzeigen kann.
    Bei großen Trefferlisten oder enrich=false wird das übersprungen.
    Default: Container/Dossier-Objekte ohne mainContentUrl werden ausgefiltert
    (sie sind nicht indexierbar) — kann mit ?includeContainers=true überschrieben werden. */
app.get('/api/dms/search', async function(req, res) {
  try {
    var pageSize = parseInt(req.query.pageSize || req.query.pagesize, 10) || 25;
    // Enrich-Schwelle bei 50 — passt zum Frontend-Default (pageSize=50 im DMS-Modal).
    // Damit erscheinen Filenames, mimeType, creationDate, state ohne extra Roundtrip.
    var enrich = req.query.enrich === 'true' || (req.query.enrich !== 'false' && pageSize <= 50);
    var includeContainers = req.query.includeContainers === 'true';

    // Dropdown-Filter → DMS-Property-UUIDs (Mapping fix; UUIDs aus /api/dms/source verifiziert).
    // Werte werden vom Frontend über die Query-Keys category/level1/group/family/series
    // übergeben und hier auf die Property-UUIDs umgesetzt.
    var propertyFilter = {};
    Object.entries(DMS_FILTER_PROPS).forEach(function(entry) {
      var qsKey = entry[0];
      var propId = entry[1];
      var v = req.query[qsKey];
      if (v && String(v).trim()) propertyFilter[propId] = String(v).trim();
    });

    // Kategorie-Scope: per Default "Portal Public Documents" (nur Technik-Doku).
    // Override-Wege:
    //   ?categoryid=<UUID>      → andere Kategorie filtern
    //   ?allCategories=true     → kein Scope, alles sichtbar inkl. Geschäftsbelege
    var categoryId = req.query.categoryid
      || (req.query.allCategories === 'true' ? null : DMS_DEFAULT_CATEGORY_ID);

    var result = await dmsConnector.searchDocuments({
      fulltext: req.query.q || req.query.fulltext || '',
      page: parseInt(req.query.page, 10) || 1,
      pageSize: pageSize,
      properties: Object.keys(propertyFilter).length ? propertyFilter : undefined,
      categoryId: categoryId,
    });

    // Filter: nur Treffer mit echtem Content (keine Ordner/Dossiers).
    // Das DMS liefert ohne Volltext-Filter primär Container-Objekte zurück, die
    // für RAG-Indexierung wertlos sind. mainContentUrl ist der definitive Marker.
    var rawCount = result.items.length;
    var filtered = includeContainers
      ? result.items
      : result.items.filter(function(it) { return !!it.mainContentUrl; });
    var containersFiltered = rawCount - filtered.length;

    // Parallel-Enrichment der Metadaten + Filename (limitiert auf pageSize <= 50)
    // Pro Treffer 2 Requests: getCurrentVersionMetadata (für mimeType/Datum/State) +
    // getFilenameForHit (Range-GET für echten Filename via Content-Disposition).
    var enriched = filtered;
    if (enrich && filtered.length > 0) {
      var metaPromises = Promise.allSettled(filtered.map(function(it) {
        return dmsConnector.getCurrentVersionMetadata(it.dmsId);
      }));
      var filenamePromises = Promise.allSettled(filtered.map(function(it) {
        return dmsConnector.getFilenameForHit(it);
      }));
      var [metaResults, filenameResults] = await Promise.all([metaPromises, filenamePromises]);

      enriched = filtered.map(function(it, i) {
        var meta = metaResults[i].status === 'fulfilled' ? metaResults[i].value : null;
        var fname = filenameResults[i].status === 'fulfilled' ? filenameResults[i].value : null;
        return {
          dmsId: it.dmsId,
          version: it.versionId,
          mainContentUrl: it.mainContentUrl,
          previewUrl: it.previewUrl,
          filename: fname,
          mimeType: meta ? meta.mimeType : null,
          docTypeLabel: meta ? labelForMime(meta.mimeType) : null,
          creationDate: meta ? meta.creationDate : null,
          state: meta ? meta.state : null,
        };
      });
    } else {
      enriched = filtered.map(function(it) {
        return {
          dmsId: it.dmsId,
          version: it.versionId,
          mainContentUrl: it.mainContentUrl,
          previewUrl: it.previewUrl,
        };
      });
    }

    res.json({
      success: true,
      items: enriched,
      page: result.page,
      hasNext: !!result.nextHref,
      count: enriched.length,
      enriched: enrich,
      containersFiltered: containersFiltered,  // Diagnose: wie viele Ordner wurden weggefiltert
    });
  } catch (err) {
    console.error('[DMS] search error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Detail-Metadaten zu einer dmsId */
app.get('/api/dms/document/:dmsId', async function(req, res) {
  try {
    var meta = await dmsConnector.getCurrentVersionMetadata(req.params.dmsId);
    res.json({ success: true, document: meta });
  } catch (err) {
    var status = err.message.indexOf('404') !== -1 ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * DMS-Content-Proxy: liefert das eigentliche Dokument (PDF/DOCX/...) durch.
 * Browser kann das DMS nicht direkt abrufen (Bearer-Auth + CORS), daher
 * muss der Server den Buffer mit Content-Type/-Disposition durchreichen.
 *
 * Query-Param: inline=1 → Content-Disposition: inline (Browser-Vorschau)
 *              ohne     → Content-Disposition: attachment (Download-Dialog)
 */
app.get('/api/dms/content/:dmsId', async function(req, res) {
  var dmsId = req.params.dmsId;
  try {
    // Erst suchen, um den mainContentUrl-Link zu bekommen (enthält die korrekte Version)
    var search = await dmsConnector.searchDocuments({ fulltext: dmsId, pageSize: 5 });
    var hit = search.items.find(function(it) { return it.dmsId === dmsId; });
    if (!hit) {
      return res.status(404).json({ success: false, error: 'Kein Treffer für dmsId ' + dmsId });
    }
    if (!hit.mainContentUrl) {
      return res.status(404).json({ success: false, error: 'Object hat keinen Content (vermutlich Ordner)' });
    }

    // Download
    var content = await dmsConnector.downloadContent(hit);
    var disposition = req.query.inline === '1' ? 'inline' : 'attachment';
    var filename = content.filename || (dmsId + '.bin');

    // ASCII-sichere Variante des Filenames für Content-Disposition
    var asciiFilename = filename.replace(/[^\x20-\x7E]/g, '_');
    var encodedFilename = encodeURIComponent(filename);

    res.setHeader('Content-Type', content.contentType);
    res.setHeader('Content-Length', content.buffer.length);
    res.setHeader('Content-Disposition',
      disposition + '; filename="' + asciiFilename + '"; ' +
      'filename*=UTF-8\'\'' + encodedFilename
    );
    // Browser-Caching erlauben (bei stabiler Version):
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(content.buffer);
  } catch (err) {
    console.error('[DMS] content proxy error for', dmsId, ':', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Source-Definition (Properties + Categories) — zum Aufbau der Filter-Dropdowns */
app.get('/api/dms/source', async function(req, res) {
  try {
    var src = await dmsConnector.getSourceDefinition();
    // Frontend braucht nur das Wesentliche
    res.json({
      success: true,
      id: src.id,
      displayName: src.displayName,
      properties: (src.properties || []).map(function(p) {
        return { key: p.key, type: p.type, displayName: p.displayName };
      }),
      categories: src.categories || [],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Bulk-Import: Liste von dmsIds → in Vector-Store */
app.post('/api/dms/import', async function(req, res) {
  try {
    var dmsIds = Array.isArray(req.body && req.body.dmsIds) ? req.body.dmsIds : [];
    if (!dmsIds.length) {
      return res.status(400).json({ success: false, error: 'dmsIds ist erforderlich (nicht-leeres Array)' });
    }

    var jobId = newJobId();
    var job = {
      jobId: jobId,
      state: 'running',
      total: dmsIds.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
      results: [],
      startedAt: new Date().toISOString(),
      finishedAt: null,
    };
    importJobs.set(jobId, job);
    saveJobs();

    // Fire-and-forget — Status über GET /api/dms/import/:jobId pollen
    importFromDmsAsync(jobId, dmsIds).catch(function(err) {
      console.error('[DMS] import job', jobId, 'crashed:', err);
      job.state = 'failed';
      job.errors.push({ stage: 'job', error: err.message });
      job.finishedAt = new Date().toISOString();
      saveJobs();
    });

    res.json({ success: true, jobId: jobId, total: dmsIds.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Job-Status pollen */
app.get('/api/dms/import/:jobId', function(req, res) {
  var job = importJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ success: false, error: 'Job nicht gefunden (möglicherweise bereits aufgeräumt)' });
  res.json({ success: true, job: job });
});

/* ============================================================
   Document Processing (async background)
   ============================================================ */

async function processDocumentAsync(docId) {
  try {
    var doc = findDoc(docId);
    if (!doc) return;

    var filePath = path.join(UPLOAD_DIR, doc.filename);
    if (!fs.existsSync(filePath)) {
      updateDoc(docId, { status: 'failed', error: 'Datei nicht gefunden.' });
      return;
    }

    updateDoc(docId, { status: 'processing' });

    // Load user settings for chunking
    var chunkOpts = { chunkSize: 1000, chunkOverlap: 200 };
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        var userSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
        if (userSettings.chunkSize) chunkOpts.chunkSize = userSettings.chunkSize;
        if (userSettings.chunkOverlap != null) chunkOpts.chunkOverlap = userSettings.chunkOverlap;
        if (userSettings.chunkSeparator) chunkOpts.separator = userSettings.chunkSeparator.replace(/\\n/g, '\n');
      }
    } catch (e) { /* use defaults */ }

    // Step 1: Extract text and chunk
    console.log('[RAG] Processing:', doc.originalName, '| chunkSize:', chunkOpts.chunkSize, '| overlap:', chunkOpts.chunkOverlap);
    var result = await documentProcessor.processDocument(filePath, chunkOpts);

    if (!result.chunks || result.chunks.length === 0) {
      updateDoc(docId, { status: 'failed', error: 'Keine Textinhalte extrahiert.' });
      return;
    }

    // Step 2: Generate embeddings for all chunks
    console.log('[RAG] Generating embeddings for', result.chunks.length, 'chunks...');
    var texts = result.chunks.map(function(c) { return c.text; });
    var embeddingVectors = await embeddings.generateEmbeddings(texts);

    // Step 3: Store in vector database
    // Bei DMS-Importen werden zusätzliche Metadaten aus doc.dmsMetadata in jeden Chunk übernommen
    var dmsMeta = doc.dmsMetadata || null;
    var vectorChunks = result.chunks.map(function(chunk, i) {
      var meta = {
        documentId: docId,
        documentName: doc.name,
        chunkIndex: chunk.index,
        charStart: chunk.start,
        charEnd: chunk.end
      };
      if (dmsMeta) {
        meta.source = 'dms';
        meta.dmsId = dmsMeta.dmsId;
        meta.dmsVersion = dmsMeta.version;
        meta.dmsContentUrl = dmsMeta.mainContentUrl;
        if (dmsMeta.contentType) meta.contentType = dmsMeta.contentType;
        if (dmsMeta.dmsFilename) meta.dmsFilename = dmsMeta.dmsFilename;
      }
      return {
        text: chunk.text,
        embedding: embeddingVectors[i],
        metadata: meta
      };
    });

    vectorStore.storeVectors(docId, vectorChunks);

    // Update document record
    updateDoc(docId, {
      status: 'ready',
      chunks: result.chunks.length,
      processedAt: new Date().toISOString(),
      error: null
    });

    console.log('[RAG] Done:', doc.originalName, '—', result.chunks.length, 'chunks indexed.');

  } catch (err) {
    console.error('[RAG] Processing failed for', docId, ':', err.message);
    updateDoc(docId, {
      status: 'failed',
      error: err.message,
      processedAt: null
    });
  }
}

/* ============================================================
   DMS Import Worker (async background)
   ============================================================ */

/** MIME → File-Extension Mapping, damit document-processor das Format erkennt */
var DMS_MIME_TO_EXT = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'text/markdown': '.md',
};

function pickExtFromMime(contentType, filename) {
  if (filename) {
    var ext = path.extname(filename).toLowerCase();
    if (ext) return ext;
  }
  var base = (contentType || '').split(';')[0].trim().toLowerCase();
  return DMS_MIME_TO_EXT[base] || '.bin';
}

/**
 * Importiert eine Liste von dmsIds aus dem DMS:
 *  1. Suche nach Treffer (fulltext = dmsId)
 *  2. Download Content
 *  3. Speichern in uploads/ unter dms_<id>_v<ver><ext>
 *  4. Registrieren in _documents.json mit dmsMetadata
 *  5. processDocumentAsync triggert Pipeline (extract → chunk → embed → store)
 */
async function importFromDmsAsync(jobId, dmsIds) {
  var job = importJobs.get(jobId);
  if (!job) return;

  for (var i = 0; i < dmsIds.length; i++) {
    var dmsId = dmsIds[i];
    try {
      // 1. Suche — bevorzugt per Fulltext, weil das auch sourceProperties
      //    mitliefert. Falls die Fulltext-Suche kein Match liefert (passiert
      //    bei einigen DMS-Objekten — die dmsId ist nicht zwingend
      //    fulltext-indiziert), fallback auf direkten Object-Lookup via
      //    /o2m/{id}/v/current — der Link `mainblobcontent` reicht für den
      //    Content-Download.
      var search = await dmsConnector.searchDocuments({ fulltext: dmsId, pageSize: 5 });
      var hit = search.items.find(function(it) { return it.dmsId === dmsId; });
      if (!hit) {
        // Fallback: Objekt direkt holen
        try {
          var meta = await dmsConnector.getCurrentVersionMetadata(dmsId);
          var links = meta && meta._links;
          var mainHref = links && links.mainblobcontent && links.mainblobcontent.href;
          if (!mainHref) {
            throw new Error('Kein mainblobcontent-Link in /v/current für ' + dmsId);
          }
          var verMatch = mainHref.match(/\/v\/([^/]+)\/b\/main\/c$/);
          hit = {
            dmsId: dmsId,
            versionId: verMatch ? verMatch[1] : (meta.id || 'x'),
            mainContentUrl: mainHref,
            pdfContentUrl: links.pdfblobcontent && links.pdfblobcontent.href,
            previewUrl: null,
            sourceProperties: [],
            sourceCategories: [],
          };
          console.log('[DMS] fulltext leer für', dmsId, '— Fallback auf /v/current ok (v=' + hit.versionId + ')');
        } catch (fbErr) {
          throw new Error('Kein Treffer im DMS für ' + dmsId + ' (Fallback: ' + fbErr.message + ')');
        }
      }
      if (!hit.mainContentUrl) {
        throw new Error('Kein mainblobcontent-Link für ' + dmsId);
      }

      // 2. Download
      var content = await dmsConnector.downloadContent(hit);

      // 3. Speichern
      var ext = pickExtFromMime(content.contentType, content.filename);
      var docId = 'dms_' + dmsId;
      var localFilename = docId + '_v' + (hit.versionId || 'x') + ext;
      var localPath = path.join(UPLOAD_DIR, localFilename);
      fs.writeFileSync(localPath, content.buffer);

      // 4. Registrieren in _documents.json (idempotent — bei Re-Import wird ersetzt)
      var db = loadDB();
      var existingIdx = db.documents.findIndex(function(d) { return d.id === docId; });
      var docRecord = {
        id: docId,
        name: content.filename ? path.basename(content.filename, path.extname(content.filename)) : 'DMS ' + dmsId,
        originalName: content.filename || (dmsId + ext),
        filename: localFilename,
        type: ext.replace('.', ''),
        size: content.buffer.length,
        chunks: null,
        status: 'pending',
        uploadedAt: new Date().toISOString(),
        processedAt: null,
        error: null,
        // ── DMS-spezifisch ──
        dmsMetadata: {
          dmsId: hit.dmsId,
          version: hit.versionId,
          mainContentUrl: hit.mainContentUrl,
          previewUrl: hit.previewUrl,
          contentType: content.contentType,
          dmsFilename: content.filename,
          source: dmsConnector.config.baseUrl,
          repositoryId: dmsConnector.config.repositoryId,
        },
      };
      if (existingIdx !== -1) {
        // Bei Re-Import alte Vektoren entfernen, damit nicht zwei Versionen im Index sind
        vectorStore.removeVectors(docId);
        db.documents[existingIdx] = docRecord;
      } else {
        db.documents.push(docRecord);
      }
      saveDB(db);

      // 5. Pipeline anstoßen — bestehender processDocumentAsync übernimmt extract → chunk → embed → store
      await processDocumentAsync(docId);

      // Status nach Verarbeitung lesen
      var processed = findDoc(docId);
      if (processed && processed.status === 'ready') {
        job.succeeded++;
        job.results.push({
          dmsId: dmsId,
          docId: docId,
          status: 'ready',
          chunks: processed.chunks,
          filename: docRecord.originalName,
        });
      } else {
        job.failed++;
        job.errors.push({
          dmsId: dmsId,
          stage: 'pipeline',
          error: processed ? processed.error : 'Unbekannter Pipeline-Fehler',
        });
      }

    } catch (err) {
      console.error('[DMS] import error for', dmsId, ':', err.message);
      job.failed++;
      job.errors.push({ dmsId: dmsId, stage: 'fetch', error: err.message });
    }

    job.processed = i + 1;
    saveJobs(); // Disk-Sync nach jedem Dokument für Restart-Resilienz
  }

  job.state = job.failed > 0 && job.succeeded === 0 ? 'failed' : 'done';
  job.finishedAt = new Date().toISOString();
  saveJobs();
  console.log('[DMS] Job', jobId, 'finished:', job.succeeded, 'erfolgreich,', job.failed, 'fehlgeschlagen');
}

/* ============================================================
   Routes — GPC.EU Customer API Proxy (Phase 1 der Nuxt-Migration)
   ============================================================ */

/** Health-Endpoint — explizit, damit /api/gpc-eu/health klar von Proxy-Aufrufen
 *  unterscheidbar ist (Spec hat zwar keinen /health-Pfad, aber wir tunneln über
 *  /gpcversion). */
app.get('/api/gpc-eu/health', gpceuProxy.healthHandler);

/** Catch-all für alle anderen GPC-EU-Endpoints — POST, GET, etc.
 *  Express '*'-Wildcard liefert den Rest in req.params[0]. */
app.all('/api/gpc-eu/*', gpceuProxy.proxyHandler);

/* ============================================================
   Routes — Nuxt-App Reverse-Proxy (Phase 3)
   ============================================================
   Nitro-Server liefert /app/*. Wenn NUXT_TARGET nicht erreichbar ist, fällt
   der Proxy auf eine deutliche Hinweis-Seite zurück — der Express-Server
   selbst läuft unabhängig weiter. */

const NUXT_TARGET = (process.env.NUXT_TARGET || 'http://localhost:3002').trim();
const NUXT_ENABLED = !!NUXT_TARGET;

if (NUXT_ENABLED) {
  // Filter-Funktion statt app.use('/app', …): Express würde sonst den /app-Prefix
  // aus req.url strippen, aber Nuxt erwartet /app/ wegen app.baseURL = '/app/'.
  // Mit pathFilter bleibt req.url='/app/…' erhalten und wird 1:1 an Nitro weitergereicht.
  app.use(createProxyMiddleware({
    pathFilter: function(pathname) {
      return pathname === '/app' || pathname.indexOf('/app/') === 0;
    },
    target: NUXT_TARGET,
    changeOrigin: true,
    ws: true,  // Hot-Module-Replacement-Sockets im Dev
    logLevel: 'warn',
    // http-proxy-middleware v3 Callback-Style: `on: { error, proxyReq, ... }`.
    // In v2 hieß das `onError` — alte Schreibweise greift in v3 nicht mehr.
    on: {
      error: function(err, req, res) {
        // Nitro nicht erreichbar — meistens läuft `npm run nuxt:dev` nicht.
        if (res && !res.headersSent && typeof res.status === 'function') {
          res.status(503).set('Content-Type', 'text/html; charset=utf-8').end(
            '<!DOCTYPE html><html><head><title>Nuxt offline</title>' +
            '<style>body{font:14px/1.5 system-ui,sans-serif;max-width:680px;margin:4rem auto;padding:0 1rem;color:#1A1F2A}' +
            'code,pre{background:#F5F4F0;padding:.1em .3em;border-radius:3px;font-family:ui-monospace,Consolas,monospace}' +
            'pre{padding:.6em .8em}h1{color:#003865;margin-top:0}</style></head><body>' +
            '<h1>Nuxt-Server nicht erreichbar</h1>' +
            '<p>Express proxied <code>/app/*</code> an <code>' + NUXT_TARGET + '</code>, ' +
            'aber dort antwortet niemand.</p>' +
            '<p>Starte den Nitro-Dev-Server parallel:</p>' +
            '<pre>npm run dev:all</pre>' +
            '<p>oder, falls Express bereits separat läuft, nur Nuxt:</p>' +
            '<pre>npm run nuxt:dev</pre>' +
            '<p>Für Production-Smoketest:</p>' +
            '<pre>npm run nuxt:build &amp;&amp; npm run start:all</pre>' +
            '<p>Fehler: <code>' + (err && err.message ? err.message : 'unknown') + '</code></p>' +
            '</body></html>'
          );
        }
      }
    }
  }));
}

/* ============================================================
   Start Server
   ============================================================ */

app.listen(PORT, function() {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║  myGPC RAG Server                           ║');
  console.log('  ║  http://localhost:' + PORT + '                      ║');
  console.log('  ║                                              ║');
  console.log('  ║  API:       /api/documents                   ║');
  console.log('  ║  RAG:       /api/rag/query                   ║');
  console.log('  ║  DMS:       /api/dms/search, /api/dms/import ║');
  console.log('  ║  Chat:      /api/chat (SSE)                  ║');
  console.log('  ║  GPC-EU:    /api/gpc-eu/*                    ║');
  console.log('  ║  Nuxt-App:  /app/*  → ' + (NUXT_TARGET + '            ').slice(0, 22) + ' ║');
  console.log('  ║  Frontend:  /admin-documents.html            ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('  DMS-Repo: ' + dmsConnector.config.repositoryId.slice(0, 8) + '… @ ' + dmsConnector.config.baseUrl);
  console.log('  GPC-EU:   ' + (gpceuProxy.config.baseUrl || '(BASE_URL fehlt)') + '  [auth: ' + gpceuProxy.config.authMode + ']');
  console.log('  Nuxt:     ' + (NUXT_ENABLED ? NUXT_TARGET : '(disabled)'));
  console.log('');
});

module.exports = app;
