#!/usr/bin/env node
/**
 * seed-demo-overrides.mjs
 *
 * Two-phase script:
 *  1. ALTER TABLE — adds demo_override column if not present.
 *  2. For each of the 7 guided flows, picks 3 real templates from
 *     user_templates and writes a demo_override JSONB with fixed
 *     matchCounts (3 / 2 / 1).
 *
 * Selection strategy per flow:
 *  - commercial-hvac    → air-cooler templates
 *  - industrial-refrig  → evaporator-pump templates, then evaporator-dx
 *  - energy-process     → dry-cooler templates
 *  - data-center        → dry-cooler templates (prefer coolingPurpose=data-center)
 *  - natural-refrig     → evaporator-pump + gas-cooler templates
 *  - brine              → air-cooler templates
 *  - synthetic-refrig   → evaporator-dx + air-cooler templates
 *
 * Preference order within each pool: is_system DESC, updated_at DESC.
 * If a pool has fewer than 3, remaining slots are filled from the same-category
 * general pool, then from any other category.
 *
 * Usage:
 *   node scripts/seed-demo-overrides.mjs
 *   node scripts/seed-demo-overrides.mjs --dry-run   # print plan, no writes
 */

import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as dotenvConfig } from 'dotenv'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenvConfig({ path: resolve(__dirname, '..', '.env') })

const DRY_RUN = process.argv.includes('--dry-run')

const ref = process.env.SUPABASE_PROJECT_ID
const pwd = process.env.SUPABASE_PSW
if (!ref || !pwd) {
  console.error('SUPABASE_PROJECT_ID + SUPABASE_PSW must be set in .env')
  process.exit(1)
}

// ---- DB connect ----
const candidates = [
  { label: 'direct',                host: `db.${ref}.supabase.co`,                     port: 5432, user: 'postgres' },
  { label: 'pooler eu-central',     host: 'aws-0-eu-central-1.pooler.supabase.com',    port: 6543, user: `postgres.${ref}` },
  { label: 'pooler eu-west',        host: 'aws-0-eu-west-1.pooler.supabase.com',        port: 6543, user: `postgres.${ref}` },
  { label: 'pooler eu-central-ses', host: 'aws-0-eu-central-1.pooler.supabase.com',    port: 5432, user: `postgres.${ref}` }
]

let client = null
let usedCand = null
for (const cand of candidates) {
  const c = new pg.Client({
    host: cand.host, port: cand.port, user: cand.user, password: pwd,
    database: 'postgres', ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 12000
  })
  try {
    console.log(`[demo-override] Connecting via ${cand.label} → ${cand.host}:${cand.port}`)
    await c.connect()
    client = c
    usedCand = cand.label
    break
  } catch (err) {
    console.warn(`[demo-override] ✗ ${cand.label}: ${err.message}`)
    try { await c.end() } catch {}
  }
}
if (!client) {
  console.error('[demo-override] Could not connect. Abort.')
  process.exit(1)
}
console.log(`[demo-override] Connected via ${usedCand}.`)

// ---- Phase 1: Add column ----
console.log('[demo-override] Phase 1: Ensuring demo_override column exists…')
if (!DRY_RUN) {
  await client.query(`
    ALTER TABLE guided_entry_flows
    ADD COLUMN IF NOT EXISTS demo_override JSONB DEFAULT NULL
  `)
  console.log('[demo-override] ✓ Column ready.')
} else {
  console.log('[demo-override] DRY RUN — skipping ALTER TABLE')
}

// ---- Phase 2: Fetch all templates ----
console.log('[demo-override] Phase 2: Fetching template catalog…')
const { rows: templates } = await client.query(`
  SELECT id, name, category_slug, is_system, visibility, configuration, updated_at
  FROM user_templates
  ORDER BY is_system DESC, updated_at DESC
`)
console.log(`[demo-override] Found ${templates.length} templates.`)

if (templates.length === 0) {
  console.warn('[demo-override] No templates in DB — cannot assign overrides. Seed templates first.')
  await client.end()
  process.exit(0)
}

function countParams(cfg) {
  if (!cfg?.parameters || typeof cfg.parameters !== 'object') return 0
  let n = 0
  for (const v of Object.values(cfg.parameters)) {
    if (v === null || v === undefined || v === '') continue
    if (typeof v === 'number' && !Number.isFinite(v)) continue
    n++
  }
  return n
}

// Group templates by category_slug for quick lookup
const byCategory = {}
for (const t of templates) {
  const slug = t.category_slug || '__none__'
  if (!byCategory[slug]) byCategory[slug] = []
  byCategory[slug].push(t)
}

function pickFromCategories(slugs, need = 3) {
  const picked = []
  const seen = new Set()
  for (const slug of slugs) {
    const pool = byCategory[slug] || []
    for (const t of pool) {
      if (!seen.has(t.id)) {
        seen.add(t.id)
        picked.push(t)
        if (picked.length >= need) return picked
      }
    }
  }
  // Fill remaining from any category
  if (picked.length < need) {
    for (const t of templates) {
      if (!seen.has(t.id)) {
        seen.add(t.id)
        picked.push(t)
        if (picked.length >= need) break
      }
    }
  }
  return picked
}

// Category-slug priorities per guided flow entry_id
const FLOW_CATEGORY_PRIORITY = {
  'commercial-hvac':          ['air-cooler'],
  'industrial-refrigeration': ['evaporator-pump', 'evaporator-dx'],
  'energy-process-cooling':   ['dry-cooler'],
  'data-center':              ['dry-cooler'],
  'natural-refrigerants':     ['evaporator-pump', 'gas-cooler', 'evaporator-dx'],
  'brine':                    ['air-cooler', 'evaporator-dx'],
  'synthetic-refrigerants':   ['evaporator-dx', 'air-cooler', 'condenser']
}

// ---- Phase 3: Fetch guided flows and build overrides ----
const { rows: flows } = await client.query(
  `SELECT entry_id FROM guided_entry_flows WHERE entry_id = ANY($1)`,
  [Object.keys(FLOW_CATEGORY_PRIORITY)]
)
const flowIds = new Set(flows.map(f => f.entry_id))

console.log('\n[demo-override] Phase 3: Building and writing overrides…\n')

let ok = 0, skipped = 0, failed = 0
for (const [entryId, catPriority] of Object.entries(FLOW_CATEGORY_PRIORITY)) {
  if (!flowIds.has(entryId)) {
    console.warn(`  ⚠ ${entryId}: not found in guided_entry_flows — skipping.`)
    skipped++
    continue
  }

  const picked = pickFromCategories(catPriority)
  if (picked.length === 0) {
    console.warn(`  ⚠ ${entryId}: no templates found at all — skipping.`)
    skipped++
    continue
  }

  const items = picked.slice(0, 3).map((t, i) => ({
    templateId: t.id,
    matchCount: 3 - i  // 3, 2, 1
  }))

  const override = { enabled: true, items }

  console.log(`  ${entryId}:`)
  for (const [i, item] of items.entries()) {
    const t = picked[i]
    const pCount = countParams(t.configuration)
    console.log(`    ${['★★★','★★','★'][i]} ${t.name.padEnd(40)} [${item.matchCount} matches, ${pCount}p, cat:${t.category_slug}]`)
  }

  if (!DRY_RUN) {
    try {
      await client.query(
        `UPDATE guided_entry_flows SET demo_override = $1::JSONB WHERE entry_id = $2`,
        [JSON.stringify(override), entryId]
      )
      console.log(`    → Saved.\n`)
      ok++
    } catch (err) {
      console.error(`    ✗ DB write failed: ${err.message}\n`)
      failed++
    }
  } else {
    console.log(`    → DRY RUN — not written.\n`)
    ok++
  }
}

// ---- Summary ----
console.log(`[demo-override] Done. ${ok} set, ${skipped} skipped, ${failed} failed.`)
if (DRY_RUN) console.log('[demo-override] (DRY RUN — no DB changes were made)')
await client.end()
