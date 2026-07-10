#!/usr/bin/env node
/**
 * One-shot migration: local file-based state → Supabase.
 *
 * Reads:
 *   uploads/_documents.json  →  documents table
 *   uploads/*.{pdf,docx,...} →  Supabase Storage bucket `documents`
 *   vector-store/_index.json + *.vectors.json → chunks table (RE-EMBEDDED with OpenAI)
 *
 * OpenAI is required because the new schema uses vector(1536) —
 * the old local TF-IDF vectors (384-dim) can't be reused.
 *
 * Usage:  node scripts/migrate-local-to-supabase.mjs [--reprocess]
 *
 * Env required in .env:
 *   SUPABASE_URL, SUPABASE_SECRET_KEY, OPENAI_API_KEY
 *
 * Idempotent: existing rows are updated (upsert); already-embedded chunks are
 * skipped unless --reprocess is passed.
 */

import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { createClient } from '@supabase/supabase-js'

const nodeRequire = createRequire(import.meta.url)

const REPROCESS = process.argv.includes('--reprocess')
const ROOT = process.cwd()
const UPLOADS_DIR = path.join(ROOT, 'uploads')
const VECTOR_DIR = path.join(ROOT, 'vector-store')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY
const openaiKey = process.env.OPENAI_API_KEY
const chunkSize = parseInt(process.env.RAG_CHUNK_SIZE || '1000', 10)
const chunkOverlap = parseInt(process.env.RAG_CHUNK_OVERLAP || '200', 10)

if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env')
  process.exit(1)
}
if (!openaiKey) {
  console.error('OPENAI_API_KEY must be set — chunks are re-embedded with text-embedding-3-small (1536-dim)')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })

async function embedTexts(texts) {
  const BATCH = 100
  const out = []
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH)
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: batch })
    })
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 240)
      throw new Error(`OpenAI ${res.status}: ${detail}`)
    }
    const data = await res.json()
    const embs = (data.data || []).sort((a, b) => a.index - b.index).map((e) => e.embedding)
    out.push(...embs)
  }
  return out
}

function chunkText(text) {
  if (!text || text.length <= chunkSize) return text ? [text.trim()] : []
  const chunks = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length)
    if (end < text.length) {
      const windowStart = Math.max(start + chunkSize - 200, start)
      const candidate = text.substring(windowStart, end)
      const lastPunct = Math.max(
        candidate.lastIndexOf('. '),
        candidate.lastIndexOf('.\n'),
        candidate.lastIndexOf('\n\n')
      )
      if (lastPunct > 0) end = windowStart + lastPunct + 1
    }
    const piece = text.substring(start, end).trim()
    if (piece) chunks.push(piece)
    if (end >= text.length) break
    start = Math.max(end - chunkOverlap, start + 1)
  }
  return chunks
}

async function readJson(p) {
  const raw = await fs.readFile(p, 'utf-8')
  return JSON.parse(raw)
}

async function processDocument(doc) {
  const id = doc.id
  console.log(`\n=== ${id} :: ${doc.name}`)

  // Skip check
  if (!REPROCESS) {
    const { data: existing } = await sb.from('documents').select('id, status, chunk_count').eq('id', id).maybeSingle()
    if (existing?.status === 'ready' && existing.chunk_count > 0) {
      console.log(`  [skip] already ready with ${existing.chunk_count} chunks`)
      return { id, skipped: true }
    }
  }

  const localPath = path.join(UPLOADS_DIR, doc.filename)
  let buffer
  try {
    buffer = await fs.readFile(localPath)
  } catch (err) {
    console.log(`  [skip] file not on disk: ${localPath}`)
    return { id, error: 'file-missing' }
  }

  // Upload to Storage
  console.log(`  [1/3] uploading ${buffer.length} bytes → storage/documents/${doc.filename}`)
  const { error: upErr } = await sb.storage.from('documents').upload(doc.filename, buffer, {
    contentType: doc.dmsMetadata?.contentType || 'application/pdf',
    upsert: true
  })
  if (upErr) throw new Error(`storage: ${upErr.message}`)

  // Upsert document row
  console.log(`  [2/3] upserting documents row`)
  const docRow = {
    id,
    name: doc.name,
    original_name: doc.originalName,
    filename: doc.filename,
    type: doc.type || 'pdf',
    size_bytes: doc.size || buffer.length,
    chunk_count: 0,
    status: 'processing',
    source: id.startsWith('dms_') ? 'dms' : 'upload',
    dms_metadata: doc.dmsMetadata || null,
    error: null,
    uploaded_at: doc.uploadedAt || new Date().toISOString(),
    processed_at: null
  }
  const { error: docErr } = await sb.from('documents').upsert(docRow, { onConflict: 'id' })
  if (docErr) throw new Error(`documents upsert: ${docErr.message}`)

  // Extract text + re-embed
  console.log(`  [3/3] extracting + re-embedding`)
  const pdfParse = nodeRequire('pdf-parse/lib/pdf-parse.js')
  const parsed = await pdfParse(buffer)
  const pieces = chunkText(parsed.text || '')
  if (pieces.length === 0) {
    console.log(`  [warn] no chunks after extraction`)
    await sb.from('documents').update({ status: 'ready', chunk_count: 0, processed_at: new Date().toISOString() }).eq('id', id)
    return { id, chunks: 0 }
  }

  const embeddings = await embedTexts(pieces)
  const rows = pieces.map((text, i) => ({
    document_id: id,
    chunk_index: i,
    text,
    embedding: embeddings[i],
    metadata: {}
  }))
  // Wipe existing chunks (in case of reprocess)
  await sb.from('document_chunks').delete().eq('document_id', id)
  const { error: chunkErr } = await sb.from('document_chunks').insert(rows)
  if (chunkErr) throw new Error(`chunks insert: ${chunkErr.message}`)

  await sb.from('documents').update({
    status: 'ready',
    chunk_count: pieces.length,
    processed_at: new Date().toISOString()
  }).eq('id', id)

  console.log(`  ✓ ${pieces.length} chunks`)
  return { id, chunks: pieces.length }
}

async function main() {
  const indexPath = path.join(UPLOADS_DIR, '_documents.json')
  let index
  try {
    index = await readJson(indexPath)
  } catch (err) {
    console.error(`Cannot read ${indexPath}. Nothing to migrate.`)
    process.exit(1)
  }
  const docs = index.documents || []
  console.log(`Found ${docs.length} documents to migrate. reprocess=${REPROCESS}`)

  const results = { ok: 0, skipped: 0, failed: 0, missing: 0 }
  for (const doc of docs) {
    try {
      const r = await processDocument(doc)
      if (r.skipped) results.skipped++
      else if (r.error === 'file-missing') results.missing++
      else results.ok++
    } catch (err) {
      console.error(`  ✗ ${doc.id}: ${err.message}`)
      await sb.from('documents').update({ status: 'failed', error: err.message }).eq('id', doc.id).catch(() => {})
      results.failed++
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`  Migrated:    ${results.ok}`)
  console.log(`  Skipped:     ${results.skipped}`)
  console.log(`  File missing:${results.missing}`)
  console.log(`  Failed:      ${results.failed}`)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
