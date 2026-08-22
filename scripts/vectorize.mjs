#!/usr/bin/env node
/**
 * scripts/vectorize.mjs — CLI-Tool: lokale Dateien in den Supabase-RAG
 *                        schieben, ohne Vercel/UI zu benutzen.
 *
 * Warum: die Server-Route /api/documents/upload läuft in Vercels 60s-
 * Function-Budget. Große PDFs (200+ Chunks) müssen sonst mehrfach über
 * "Reprocess" wieder angetreten werden. Das CLI läuft lokal ohne
 * Timeout — komplett offline gegen Supabase direkt.
 *
 * Beispiele:
 *   node scripts/vectorize.mjs manual.pdf
 *   node scripts/vectorize.mjs docs/*.pdf
 *   node scripts/vectorize.mjs --dir=docs/ --provider=openrouter
 *   node scripts/vectorize.mjs manual.pdf --force
 *
 * CLI-Options:
 *   --provider=openai|gemini|openrouter   default: rag_settings.embedding_mode
 *   --model=<id>                          default: provider-passender Default
 *   --chunk-size=1000                     default: rag_settings.chunk_size
 *   --chunk-overlap=200                   default: rag_settings.chunk_overlap
 *   --source=<tag>                        default: 'cli-import'
 *   --dir=<path>                          rekursiv PDFs/DOCX/MD/CSV/XLSX/TXT
 *   --force                               überschreibt bestehende docs mit gleichem Content-Hash
 *   --dry-run                             extract+chunk anzeigen, kein Embed/Insert
 *   --skip-upload                         nicht in Storage-Bucket 'documents' hochladen
 *
 * Env (.env im Repo-Root):
 *   SUPABASE_URL, SUPABASE_SECRET_KEY   Pflicht
 *   OPENAI_API_KEY | GEMINI_API_KEY | OPENROUTER_API_KEY   (mindestens der aktive)
 *
 * Exit-Codes:
 *   0 = alle Dateien erfolgreich oder skipped
 *   1 = mindestens ein Fehler
 *   2 = Config-Fehler (fehlende Env-Vars)
 */

import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// CLI-Args
// ============================================================================

const args = process.argv.slice(2)
const flags = {}
const positional = []
for (const a of args) {
  if (a.startsWith('--')) {
    const eq = a.indexOf('=')
    if (eq > 0) flags[a.slice(2, eq)] = a.slice(eq + 1)
    else flags[a.slice(2)] = true
  } else {
    positional.push(a)
  }
}

if (flags.help || flags.h || (positional.length === 0 && !flags.dir)) {
  console.log(`Usage: node scripts/vectorize.mjs <files...> [options]

Options:
  --provider=openai|gemini|openrouter   Embedding-Provider (default: rag_settings.embedding_mode)
  --model=<id>                          Provider-Modell (default: Provider-Standard)
  --chunk-size=<n>                      Chunk-Größe in Zeichen (default: rag_settings.chunk_size)
  --chunk-overlap=<n>                   Overlap in Zeichen (default: rag_settings.chunk_overlap)
  --source=<tag>                        documents.source (default: 'cli-import')
  --dir=<path>                          Ordner rekursiv scannen
  --force                               überschreibt Docs mit gleichem Content-Hash
  --dry-run                             kein Embed + Insert, nur Extract preview
  --skip-upload                         kein Storage-Upload (nur Chunks)
  --help, -h                            diese Hilfe`)
  process.exit(0)
}

// ============================================================================
// Config + Env-Check
// ============================================================================

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY
if (!url || !key) {
  console.error('SUPABASE_URL und SUPABASE_SECRET_KEY müssen in .env gesetzt sein.')
  process.exit(2)
}

const sb = createClient(url, key, { auth: { persistSession: false } })

// Provider-Auswahl: --provider Argument > DB-Setting > 'openai'
let provider = flags.provider
let providerModel = flags.model
let chunkSize = flags['chunk-size'] ? parseInt(flags['chunk-size'], 10) : null
let chunkOverlap = flags['chunk-overlap'] ? parseInt(flags['chunk-overlap'], 10) : null

if (!provider || chunkSize == null || chunkOverlap == null) {
  try {
    const { data } = await sb.from('rag_settings').select('*').eq('id', 1).maybeSingle()
    if (data) {
      provider = provider || (data.embedding_mode || 'openai').toLowerCase()
      chunkSize = chunkSize ?? (data.chunk_size || 1000)
      chunkOverlap = chunkOverlap ?? (data.chunk_overlap || 200)
    }
  } catch (err) {
    console.warn(`[warn] rag_settings unreachable: ${err.message} — Defaults werden genutzt.`)
  }
}
provider = provider || 'openai'
chunkSize = chunkSize ?? 1000
chunkOverlap = chunkOverlap ?? 200

const PROVIDER_DEFAULTS = {
  openai:     'text-embedding-3-small',
  gemini:     'gemini-embedding-001',
  openrouter: 'openai/text-embedding-3-small'
}
providerModel = providerModel || PROVIDER_DEFAULTS[provider] || 'text-embedding-3-small'

const openaiKey     = process.env.OPENAI_API_KEY
const geminiKey     = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
const openrouterKey = process.env.OPENROUTER_API_KEY
const openrouterBaseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'

if (provider === 'openai' && !openaiKey) {
  console.error('provider=openai — aber OPENAI_API_KEY fehlt in .env.')
  process.exit(2)
}
if (provider === 'gemini' && !geminiKey) {
  console.error('provider=gemini — aber GEMINI_API_KEY (oder GOOGLE_API_KEY) fehlt in .env.')
  process.exit(2)
}
if (provider === 'openrouter' && !openrouterKey) {
  console.error('provider=openrouter — aber OPENROUTER_API_KEY fehlt in .env.')
  process.exit(2)
}

const source = flags.source || 'cli-import'
const force = flags.force === true
const dryRun = flags['dry-run'] === true
const skipUpload = flags['skip-upload'] === true

console.log(`vectorize.mjs → provider=${provider} model=${providerModel} chunkSize=${chunkSize} overlap=${chunkOverlap}${force ? ' [force]' : ''}${dryRun ? ' [dry-run]' : ''}${skipUpload ? ' [skip-upload]' : ''}`)

// ============================================================================
// Provider-Dispatcher (Embeddings)
// ============================================================================

const DIMENSION = 1536
const BATCH = 100

async function embedTexts(texts) {
  if (!texts.length) return []
  if (provider === 'gemini') return embedGemini(texts)
  if (provider === 'openrouter') return embedOpenRouter(texts)
  return embedOpenAI(texts)
}

async function embedOpenAI(texts) {
  const out = []
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH)
    process.stdout.write(`\r  embedding ${Math.min(i + batch.length, texts.length)}/${texts.length} …`)
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: providerModel, input: batch })
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300)
      throw new Error(`OpenAI ${res.status}: ${detail}`)
    }
    const data = await res.json()
    const embs = (data.data || []).sort((a, b) => a.index - b.index).map((e) => e.embedding)
    validateDim(embs, i)
    out.push(...embs)
  }
  process.stdout.write('\n')
  return out
}

async function embedGemini(texts) {
  const out = []
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(providerModel)}:batchEmbedContents?key=${encodeURIComponent(geminiKey)}`
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH)
    process.stdout.write(`\r  embedding ${Math.min(i + batch.length, texts.length)}/${texts.length} …`)
    const requests = batch.map((t) => ({
      model: `models/${providerModel}`,
      content: { parts: [{ text: t }] },
      outputDimensionality: DIMENSION
    }))
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 500)
      if (res.status === 429) {
        throw new Error('Gemini Free-Tier erschöpft (100 Embed-Requests/Tag). Morgen oder Paid-Tier / --provider=openrouter versuchen.')
      }
      throw new Error(`Gemini ${res.status}: ${detail}`)
    }
    const data = await res.json()
    const embs = (data.embeddings || []).map((e) => e.values)
    validateDim(embs, i)
    out.push(...embs)
  }
  process.stdout.write('\n')
  return out
}

async function embedOpenRouter(texts) {
  const out = []
  const base = openrouterBaseUrl.replace(/\/+$/, '')
  const url = `${base}/embeddings`
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH)
    process.stdout.write(`\r  embedding ${Math.min(i + batch.length, texts.length)}/${texts.length} …`)
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openrouterKey}`,
        'X-Title': 'myGPC vectorize.mjs'
      },
      body: JSON.stringify({ model: providerModel, input: batch })
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 500)
      if (res.status === 402) throw new Error('OpenRouter-Guthaben aufgebraucht (402). Auf openrouter.ai/credits aufladen.')
      if (res.status === 429) throw new Error(`OpenRouter Rate-Limit (429). Kurz warten. Detail: ${detail}`)
      throw new Error(`OpenRouter ${res.status}: ${detail}`)
    }
    const data = await res.json()
    const embs = (data.data || []).sort((a, b) => a.index - b.index).map((e) => e.embedding)
    validateDim(embs, i)
    out.push(...embs)
  }
  process.stdout.write('\n')
  return out
}

function validateDim(embs, offset) {
  for (let j = 0; j < embs.length; j++) {
    const v = embs[j]
    if (!Array.isArray(v) || v.length !== DIMENSION) {
      throw new Error(`Embedding ${offset + j} has dim ${v?.length} (expected ${DIMENSION}). Provider/Modell prüfen — pgvector-Schema ist vector(1536).`)
    }
  }
}

// ============================================================================
// Text-Extraktion (PDF/TXT/MD/CSV/XLSX)
// ============================================================================

async function extractText(buffer, ext) {
  const e = ext.toLowerCase()
  if (e === 'pdf') {
    const { extractText: unpdfExtract, getDocumentProxy } = await import('unpdf')
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { text } = await unpdfExtract(pdf, { mergePages: true })
    return typeof text === 'string' ? text : (Array.isArray(text) ? text.join('\n\n') : '')
  }
  if (e === 'xlsx' || e === 'xls') {
    // xlsx über die im nuxt-Verzeichnis installierte Dep laden
    const XLSX = await import(path.resolve(process.cwd(), 'nuxt', 'node_modules', 'xlsx', 'xlsx.mjs'))
      .catch(() => import('xlsx'))
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const parts = []
    wb.SheetNames.forEach((n) => {
      parts.push(`--- Sheet: ${n} ---`)
      parts.push(XLSX.utils.sheet_to_csv(wb.Sheets[n]))
    })
    return parts.join('\n')
  }
  if (e === 'docx') {
    throw new Error('.docx wird vom CLI-Script noch nicht unterstützt (mammoth muss noch als dep hinzugefügt werden). Konvertiere lokal zu PDF oder TXT.')
  }
  // txt/md/csv/log/unbekannt → als UTF-8 lesen
  return buffer.toString('utf-8')
}

// ============================================================================
// Chunker — 1:1 aus nuxt/server/utils/document-processor.ts
// ============================================================================

function chunkText(text) {
  if (!text || text.length <= chunkSize) {
    return text ? [{ text: text.trim(), index: 0, metadata: {} }] : []
  }
  const chunks = []
  let start = 0
  let index = 0
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length)
    if (end < text.length) {
      const windowStart = Math.max(start + chunkSize - 200, start)
      const candidate = text.substring(windowStart, end)
      const lastPunct = Math.max(
        candidate.lastIndexOf('. '),
        candidate.lastIndexOf('.\n'),
        candidate.lastIndexOf('!\n'),
        candidate.lastIndexOf('?\n'),
        candidate.lastIndexOf('\n\n')
      )
      if (lastPunct > 0) end = windowStart + lastPunct + 1
    }
    const piece = text.substring(start, end).trim()
    if (piece) {
      chunks.push({ text: piece, index, metadata: { charStart: start, charEnd: end } })
      index++
    }
    if (end >= text.length) break
    start = Math.max(end - chunkOverlap, start + 1)
  }
  return chunks
}

// ============================================================================
// File-Discovery
// ============================================================================

const SUPPORTED_EXTENSIONS = new Set(['pdf', 'txt', 'md', 'csv', 'xlsx', 'xls'])

async function walkDir(dir) {
  const out = []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await walkDir(full)))
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).slice(1).toLowerCase()
      if (SUPPORTED_EXTENSIONS.has(ext)) out.push(full)
    }
  }
  return out
}

async function resolveFiles() {
  const files = []
  for (const p of positional) {
    const st = await fs.stat(p).catch(() => null)
    if (!st) {
      console.warn(`[warn] nicht gefunden: ${p}`)
      continue
    }
    if (st.isDirectory()) files.push(...(await walkDir(p)))
    else files.push(p)
  }
  if (flags.dir) files.push(...(await walkDir(flags.dir)))
  // Dedup + supported-Filter
  const seen = new Set()
  const out = []
  for (const f of files) {
    const abs = path.resolve(f)
    if (seen.has(abs)) continue
    seen.add(abs)
    const ext = path.extname(abs).slice(1).toLowerCase()
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      console.warn(`[warn] unsupported: ${abs} (.${ext})`)
      continue
    }
    out.push(abs)
  }
  return out
}

// ============================================================================
// Per-File-Pipeline
// ============================================================================

const CONTENT_TYPES = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel'
}

async function processFile(filePath, idx, total) {
  const relPath = path.relative(process.cwd(), filePath)
  const filename = path.basename(filePath)
  const ext = path.extname(filename).slice(1).toLowerCase()
  const buffer = await fs.readFile(filePath)
  const contentHash = createHash('sha256').update(buffer).digest('hex').slice(0, 32)
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream'
  const sizeBytes = buffer.length

  console.log(`\n[${idx}/${total}] ${relPath}  (${(sizeBytes / 1024 / 1024).toFixed(2)} MB, hash=${contentHash.slice(0, 8)})`)

  // Duplikat-Check via contentHash in dms_metadata
  if (!force) {
    const { data: existing } = await sb
      .from('documents')
      .select('id, name, status, chunk_count, dms_metadata')
      .filter('dms_metadata->>contentHash', 'eq', contentHash)
      .maybeSingle()
    if (existing) {
      console.log(`  - skipped: bereits vorhanden als ${existing.id} (${existing.chunk_count} chunks, status=${existing.status}). --force überschreibt.`)
      return { status: 'skipped' }
    }
  }

  // Extract Text
  const t0 = Date.now()
  const text = await extractText(buffer, ext)
  const chunks = chunkText(text)
  console.log(`  extracted ${text.length} chars → ${chunks.length} chunks in ${Date.now() - t0}ms`)

  if (chunks.length === 0) {
    throw new Error('0 chunks — Text nicht extrahierbar (image-only PDF?)')
  }

  if (dryRun) {
    console.log(`  [dry-run] Preview erster Chunk:\n    ${chunks[0].text.slice(0, 200).replace(/\n/g, ' ')}${chunks[0].text.length > 200 ? '…' : ''}`)
    return { status: 'dry-run', chunks: chunks.length }
  }

  const localId = `cli_${contentHash}`
  const storagePath = `${localId}.${ext}`
  const displayName = filename.replace(/\.[^.]+$/, '')

  // Storage-Upload (skip mit --skip-upload)
  if (!skipUpload) {
    const { error: upErr } = await sb.storage.from('documents').upload(storagePath, buffer, {
      contentType, upsert: true
    })
    if (upErr) throw new Error(`Storage-Upload: ${upErr.message}`)
  }

  // Documents-Row upserten (Force-Fall: alte Chunks vorher löschen)
  if (force) {
    await sb.from('document_chunks').delete().eq('document_id', localId)
  }
  const docRow = {
    id: localId,
    name: displayName,
    original_name: filename,
    filename: skipUpload ? filename : storagePath,
    type: ext,
    size_bytes: sizeBytes,
    chunk_count: 0,
    status: 'processing',
    source,
    dms_metadata: { contentHash, originalPath: relPath, contentType },
    error: null,
    processed_at: null
  }
  const { error: docErr } = await sb.from('documents').upsert(docRow, { onConflict: 'id' })
  if (docErr) throw new Error(`documents upsert: ${docErr.message}`)

  // Embed + Chunks-Insert
  const texts = chunks.map((c) => c.text)
  const embeddings = await embedTexts(texts)
  const rows = chunks.map((c, i) => ({
    document_id: localId,
    chunk_index: c.index,
    text: c.text,
    embedding: embeddings[i],
    metadata: c.metadata || {}
  }))
  const { error: chunkErr } = await sb.from('document_chunks').insert(rows)
  if (chunkErr) throw new Error(`chunks insert: ${chunkErr.message}`)

  await sb.from('documents').update({
    status: 'ready',
    chunk_count: chunks.length,
    processed_at: new Date().toISOString()
  }).eq('id', localId)

  console.log(`  ✓ imported: ${chunks.length} chunks (${((Date.now() - t0) / 1000).toFixed(1)}s)`)
  return { status: 'imported', chunks: chunks.length, docId: localId }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const files = await resolveFiles()
  if (files.length === 0) {
    console.error('Keine passenden Dateien gefunden. Unterstützt: ' + [...SUPPORTED_EXTENSIONS].join(', '))
    process.exit(1)
  }
  console.log(`\n${files.length} Datei${files.length === 1 ? '' : 'en'} gefunden.`)

  const results = { imported: 0, skipped: 0, failed: 0, chunks: 0 }
  for (let i = 0; i < files.length; i++) {
    try {
      const r = await processFile(files[i], i + 1, files.length)
      if (r.status === 'imported') { results.imported++; results.chunks += r.chunks }
      else if (r.status === 'skipped') results.skipped++
      else if (r.status === 'dry-run') results.chunks += r.chunks
    } catch (err) {
      results.failed++
      console.error(`  ✗ FAILED: ${err.message}`)
      // Bei Server-Insert-Erfolg + späterem Embed-Fehler: doc auf failed setzen
      const failedId = `cli_${createHash('sha256').update(await fs.readFile(files[i])).digest('hex').slice(0, 32)}`
      await sb.from('documents').update({ status: 'failed', error: err.message }).eq('id', failedId).catch(() => {})
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`  ✓ imported: ${results.imported}  (${results.chunks} chunks total)`)
  console.log(`  - skipped:  ${results.skipped}`)
  console.log(`  ✗ failed:   ${results.failed}`)
  process.exit(results.failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('\nFATAL:', err.stack || err.message)
  process.exit(1)
})
