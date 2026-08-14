#!/usr/bin/env node
/**
 * DMS-Property-Discovery — findet heraus, welche Properties existieren
 * und was Category/Level/Group/Family/Series in DMS-Feldern sind.
 *
 * Nutzt DMS_BASE_URL, DMS_REPOSITORY_ID, DMS_API_KEY aus .env.
 *
 * Ausgabe:
 *   1. Alle Object-Definitions (Kategorien im DMS)
 *   2. Alle Property-Definitions einer Beispiel-ObjectDefinition
 *   3. Roh-Properties + Categories eines Sample-Dokuments
 */

import { resolve } from 'node:path'
import { config as dotenvConfig } from 'dotenv'

dotenvConfig({ path: resolve(process.cwd(), '.env') })

const BASE = (process.env.DMS_BASE_URL || 'https://dms-prod.guentner.com').replace(/\/$/, '')
const REPO = process.env.DMS_REPOSITORY_ID
const KEY = process.env.DMS_API_KEY
const SAMPLE = process.env.PROBE_DMS_ID || 'P002925864'

if (!REPO || !KEY) {
  console.error('DMS_REPOSITORY_ID und DMS_API_KEY müssen in .env sein')
  process.exit(1)
}

const headers = {
  Accept: 'application/hal+json, application/json, */*',
  Authorization: `Bearer ${KEY}`,
  'User-Agent': 'myGPC-Probe/1.0'
}

async function get(path) {
  const url = path.startsWith('http') ? path : BASE + path
  const res = await fetch(url, { headers, redirect: 'manual' })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`${res.status} ${url} — ${t.slice(0, 200)}`)
  }
  return res.json()
}

function truncate(s, n = 60) {
  if (typeof s !== 'string') return s
  return s.length > n ? s.slice(0, n) + '…' : s
}

async function main() {
  console.log('=== 1. Object-Definitions (DMS-Kategorien) ===')
  const objDefs = await get(`/dms/r/${REPO}/objdef`)
  const defs = objDefs.objectDefinitions || []
  console.log(`Gefunden: ${defs.length}`)
  // Alle zeigen mit Güntner-Produkt-Bezug
  const productDefs = defs.filter((d) => /product|guentner|güntner|manual|technical|drawing|GFH|GHF|SGHE|VHF/i.test(d.displayName || d.name || ''))
  console.log(`Mit Produkt-Bezug: ${productDefs.length}`)
  for (const d of productDefs.slice(0, 25)) {
    console.log(`  ${d.id.padEnd(38)} → ${d.displayName || d.name}`)
  }
  if (productDefs.length > 25) console.log(`  … +${productDefs.length - 25}`)

  console.log('\n=== 2. Volltext-Suche (statt Direktzugriff) ===')
  const source = await get(`/dms/r/${REPO}/source`)
  const sid = source?.id || ''
  console.log('Source-ID:', sid || '(none)')
  try {
    const q = new URLSearchParams()
    q.set('page', '1')
    q.set('pagesize', '3')
    q.set('fulltext', 'manual')
    if (sid) q.set('sourceid', sid)
    const search = await get(`/dms/r/${REPO}/srm/?${q.toString()}`)
    const items = search.items || []
    console.log(`Treffer: ${items.length}`)
    for (const [i, hit] of items.entries()) {
      console.log(`\n--- Hit ${i + 1} (id=${hit.id}) ---`)
      console.log(`sourceCategories: ${JSON.stringify(hit.sourceCategories || [])}`)
      const props = hit.sourceProperties || []
      console.log(`sourceProperties (${props.length}):`)
      for (const p of props) {
        const id = p.key || p.id
        const v = Array.isArray(p.values) ? p.values.join(' | ') : (p.value ?? '')
        console.log(`  ${(id || '?').padEnd(28)} = ${truncate(String(v), 80)}`)
      }
    }
  } catch (err) {
    console.error(`  Search-Fehler: ${err.message}`)
  }

  console.log('\n=== 3. Alle Property-IDs aus mehreren Searches sammeln ===')
  const uniqueProps = new Map()
  for (const term of ['manual', 'evaporator', 'condenser', 'GFH', 'drawing', 'datasheet']) {
    try {
      const q = new URLSearchParams()
      q.set('page', '1')
      q.set('pagesize', '20')
      q.set('fulltext', term)
      if (sid) q.set('sourceid', sid)
      const search = await get(`/dms/r/${REPO}/srm/?${q.toString()}`)
      for (const hit of search.items || []) {
        for (const p of hit.sourceProperties || []) {
          const key = p.key || p.id
          if (!key) continue
          if (!uniqueProps.has(key)) uniqueProps.set(key, new Set())
          const v = Array.isArray(p.values) ? p.values.join(' | ') : (p.value ?? '')
          if (v) uniqueProps.get(key).add(String(v))
        }
      }
    } catch { /* ignore */ }
  }
  console.log(`Unique Property-Keys über alle Searches: ${uniqueProps.size}\n`)
  const sorted = Array.from(uniqueProps.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  for (const [key, vals] of sorted) {
    const sample = Array.from(vals).slice(0, 3).map((v) => truncate(v, 40)).join(', ')
    console.log(`  ${key.padEnd(40)} (${vals.size} distinct) — z.B. ${sample}`)
  }

  console.log('\n=== 4. Suche mit Kandidaten-Property-Namen ===')
  const candidates = ['category', 'Category', 'productCategory', 'level', 'group', 'family', 'series', 'productFamily', 'productSeries']
  for (const c of candidates) {
    try {
      const facets = await get(`/dms/r/${REPO}/dmsobjectPropFacet?propertyid=${c}&objectdefinitionids=${defs.map(d => d.id).join(',')}`)
      const facetList = facets.propertyFacets?.[0]?.facets || facets.facets || []
      if (facetList.length) {
        console.log(`  ✓ ${c}: ${facetList.length} Facetten — Beispiele:`)
        for (const f of facetList.slice(0, 5)) {
          console.log(`      "${f.value}" (${f.count || '?'})`)
        }
      }
    } catch { /* Property existiert nicht */ }
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(2)
})
