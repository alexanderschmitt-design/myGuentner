/**
 * End-to-End-Ingestion-Test
 * --------------------------
 * Holt ein Sample-Dokument aus dem DMS, schickt es durch die komplette
 * RAG-Pipeline (extract → chunk → embed → store) und führt eine Test-Query.
 *
 * Aufruf:
 *   node rag/test-ingestion.js                 # Default: dmsId P002925864
 *   node rag/test-ingestion.js P003492334     # andere ID
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const dms = require('./dms-connector');
const processor = require('./document-processor');
const embeddings = require('./embeddings');
const vectorStore = require('./vector-store');

const SAMPLE_ID = process.argv[2] || 'P002925864';
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const MIME_TO_EXT = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'text/markdown': '.md',
  'application/json': '.json',
  'application/xml': '.xml',
  'image/png': '.png',
  'image/jpeg': '.jpg',
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function pickExtension(contentType, filename) {
  if (filename) {
    const ext = path.extname(filename).toLowerCase();
    if (ext) return ext;
  }
  const base = (contentType || '').split(';')[0].trim().toLowerCase();
  return MIME_TO_EXT[base] || '.bin';
}

function ms(t0) { return ((Date.now() - t0)).toString().padStart(5, ' ') + 'ms'; }
function kb(n)  { return (n / 1024).toFixed(1) + ' KB'; }

(async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' End-to-End-Ingestion-Test');
  console.log(`  Sample dmsId: ${SAMPLE_ID}`);
  console.log(`  DMS:          ${dms.config.baseUrl} (Repo ${dms.config.repositoryId.slice(0, 8)}…)`);
  console.log(`  Embedding:    ${process.env.RAG_EMBEDDING_MODE || 'local'} / dim ${embeddings.getDimensions()}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ───────────────────────────────────────────────────────────────
  // 1) Health-Check
  // ───────────────────────────────────────────────────────────────
  let t0 = Date.now();
  console.log('[1/8] DMS Health-Check…');
  const health = await dms.healthCheck();
  if (!health.ok) {
    console.error('   ❌ Health-Check fehlgeschlagen:', health.error);
    process.exit(1);
  }
  console.log(`   ✅ Erreichbar (${health.linkCount} Service-Links) ${ms(t0)}`);

  // ───────────────────────────────────────────────────────────────
  // 2) Sample-Dokument finden
  // ───────────────────────────────────────────────────────────────
  t0 = Date.now();
  console.log(`\n[2/8] Suche nach dmsId="${SAMPLE_ID}" via /srm/?fulltext=…`);
  const search = await dms.searchDocuments({ fulltext: SAMPLE_ID, pageSize: 5 });
  if (!search.items.length) {
    console.error('   ❌ Kein Treffer für', SAMPLE_ID);
    process.exit(1);
  }
  const hit = search.items.find(it => it.dmsId === SAMPLE_ID) || search.items[0];
  console.log(`   ✅ ${search.items.length} Treffer, davon Match auf "${hit.dmsId}" (Version ${hit.versionId}) ${ms(t0)}`);
  console.log(`      mainContent: ${hit.mainContentUrl}`);

  if (!hit.mainContentUrl) {
    console.error('   ❌ Kein mainblobcontent-Link — Object hat keinen Content');
    process.exit(1);
  }

  // ───────────────────────────────────────────────────────────────
  // 3) Content herunterladen
  // ───────────────────────────────────────────────────────────────
  t0 = Date.now();
  console.log('\n[3/8] Content herunterladen…');
  const content = await dms.downloadContent(hit);
  console.log(`   ✅ ${kb(content.buffer.length)} (${content.contentType})${content.filename ? ' filename=' + content.filename : ''} ${ms(t0)}`);

  // ───────────────────────────────────────────────────────────────
  // 4) Auf Festplatte speichern
  // ───────────────────────────────────────────────────────────────
  t0 = Date.now();
  ensureDir(UPLOAD_DIR);
  const ext = pickExtension(content.contentType, content.filename);
  const localPath = path.join(UPLOAD_DIR, `dms_${hit.dmsId}_v${hit.versionId || 'x'}${ext}`);
  fs.writeFileSync(localPath, content.buffer);
  console.log(`\n[4/8] Lokale Kopie gespeichert: ${path.relative(process.cwd(), localPath)} ${ms(t0)}`);

  // ───────────────────────────────────────────────────────────────
  // 5) Text extrahieren
  // ───────────────────────────────────────────────────────────────
  t0 = Date.now();
  console.log('\n[5/8] Text-Extraktion…');
  let text;
  try {
    text = await processor.extractText(localPath, content.contentType);
  } catch (err) {
    console.error('   ❌ Extraktion fehlgeschlagen:', err.message);
    console.error('      Datei behalten zur Diagnose:', localPath);
    process.exit(1);
  }
  const charCount = text.length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  console.log(`   ✅ ${charCount.toLocaleString()} Zeichen, ~${wordCount.toLocaleString()} Wörter ${ms(t0)}`);
  console.log(`      Auszug: "${text.slice(0, 200).replace(/\s+/g, ' ').trim()}…"`);

  // ───────────────────────────────────────────────────────────────
  // 6) Chunking
  // ───────────────────────────────────────────────────────────────
  t0 = Date.now();
  console.log('\n[6/8] Chunking (1000 Zeichen, 200 Overlap)…');
  const chunks = processor.chunkText(text, { chunkSize: 1000, chunkOverlap: 200 });
  console.log(`   ✅ ${chunks.length} Chunks erzeugt ${ms(t0)}`);
  if (chunks.length === 0) {
    console.error('   ❌ Keine Chunks — Text war wohl leer');
    process.exit(1);
  }

  // ───────────────────────────────────────────────────────────────
  // 7) Embeddings + Speichern
  // ───────────────────────────────────────────────────────────────
  t0 = Date.now();
  console.log('\n[7/8] Embeddings erzeugen…');
  // Lokale TF-IDF braucht ein Vokabular über die Texte
  if ((process.env.RAG_EMBEDDING_MODE || 'local') === 'local') {
    embeddings.updateVocabulary(chunks.map(c => c.text));
  }
  const vectors = await embeddings.generateEmbeddings(chunks.map(c => c.text));
  console.log(`   ✅ ${vectors.length} Vektoren à ${vectors[0].length} Dimensionen ${ms(t0)}`);

  // Chunks für Vector-Store mit DMS-Metadaten anreichern
  const documentId = `dms_${hit.dmsId}`;
  const enriched = chunks.map((c, i) => ({
    text: c.text,
    embedding: Array.from(vectors[i]),
    metadata: {
      source: 'dms',
      dmsId: hit.dmsId,
      version: hit.versionId,
      mainContentUrl: hit.mainContentUrl,
      contentType: content.contentType,
      filename: content.filename || path.basename(localPath),
      charStart: c.start,
      charEnd: c.end,
      ingestedAt: new Date().toISOString(),
    },
  }));

  t0 = Date.now();
  vectorStore.storeVectors(documentId, enriched);
  console.log(`   ✅ In Vector-Store gespeichert als "${documentId}" ${ms(t0)}`);

  // ───────────────────────────────────────────────────────────────
  // 8) Test-Query
  // ───────────────────────────────────────────────────────────────
  t0 = Date.now();
  console.log('\n[8/8] Test-Query gegen den Vector-Store…');
  // Eine generische Frage — funktioniert mit jedem deutschen technischen Text
  const queryText = 'technische Daten Spezifikation';
  const queryEmb = await embeddings.generateEmbedding(queryText);
  const results = vectorStore.search(queryEmb, { topK: 3 });
  console.log(`   ✅ ${results.length} Treffer für "${queryText}" ${ms(t0)}`);
  results.forEach((r, i) => {
    const preview = r.text.slice(0, 120).replace(/\s+/g, ' ').trim();
    console.log(`      #${i + 1} score=${r.score.toFixed(3)}  "${preview}…"`);
  });

  // ───────────────────────────────────────────────────────────────
  // Statistik
  // ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  const stats = vectorStore.getStats();
  console.log(`Vector-Store: ${stats.documentCount} Dokument(e), ${stats.totalChunks} Chunks, lastUpdated=${stats.lastUpdated}`);
  console.log('✅ End-to-End-Test erfolgreich.');
  console.log('═══════════════════════════════════════════════════════════════\n');
})().catch(err => {
  console.error('\n💥 Test abgebrochen:', err);
  process.exit(1);
});
