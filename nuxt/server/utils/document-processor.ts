/**
 * Document Processor — extracts text from PDF/DOCX/TXT/CSV/XLSX, chunks it.
 *
 * pdf-parse and xlsx are loaded via createRequire() so Rollup does not try to
 * statically resolve them. Dynamic `import()` inside a function still gets
 * Rollup-analysed on Windows and produces `import('C:\\...\\pdf-parse\\...')`,
 * which the ESM loader rejects with "protocol 'c:'". createRequire uses Node's
 * CommonJS resolver directly, bypassing the bundler.
 */

import { createRequire } from 'node:module'

const nodeRequire = createRequire(import.meta.url)

export interface Chunk {
  text: string
  index: number
  metadata: Record<string, any>
}

interface ChunkOptions {
  chunkSize?: number
  chunkOverlap?: number
}

export async function extractText(buffer: Buffer, mime: string, filename: string): Promise<string> {
  const type = (mime || '').toLowerCase()
  const ext = (filename.split('.').pop() || '').toLowerCase()

  if (type.includes('pdf') || ext === 'pdf') {
    // pdf-parse/lib/pdf-parse.js is the internal impl — the top-level index.js
    // runs a debug PDF read on module load in ESM contexts, which fails.
    const pdfParse = nodeRequire('pdf-parse/lib/pdf-parse.js') as (buf: Buffer) => Promise<{ text: string }>
    const data = await pdfParse(buffer)
    return data.text || ''
  }

  if (type.includes('spreadsheet') || ext === 'xlsx' || ext === 'xls') {
    const XLSX: any = nodeRequire('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const parts: string[] = []
    wb.SheetNames.forEach((name: string) => {
      const sheet = wb.Sheets[name]
      parts.push(`--- Sheet: ${name} ---`)
      parts.push(XLSX.utils.sheet_to_csv(sheet))
    })
    return parts.join('\n')
  }

  if (type.includes('csv') || ext === 'csv') {
    return buffer.toString('utf-8')
  }

  // Default: treat as plain text (txt, md, log, unknown)
  return buffer.toString('utf-8')
}

/**
 * Chunks text into overlapping windows. Respects sentence boundaries where possible.
 */
export function chunkText(text: string, opts: ChunkOptions = {}): Chunk[] {
  const chunkSize = opts.chunkSize ?? 1000
  const chunkOverlap = opts.chunkOverlap ?? 200

  if (!text || text.length <= chunkSize) {
    return text ? [{ text: text.trim(), index: 0, metadata: {} }] : []
  }

  const chunks: Chunk[] = []
  let start = 0
  let index = 0
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length)

    // Try to align end on a sentence/paragraph boundary within the last 200 chars
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
      if (lastPunct > 0) {
        end = windowStart + lastPunct + 1
      }
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
