#!/usr/bin/env node
/**
 * seed-system-templates.mjs
 *
 * Creates ~15 system templates with real Güntner series names verified against
 * nuxt/data/seriesCatalog.ts. All templates are is_system=true, visibility='shared'
 * so every user sees them in recommendations.
 *
 * Idempotent: existing templates with the same name + owner_id=NULL are updated,
 * not duplicated. Uses UPSERT on (name, is_system) effectively by deleting
 * any system template with matching name first, then inserting fresh.
 *
 * Usage:
 *   node scripts/seed-system-templates.mjs
 *   node scripts/seed-system-templates.mjs --dry-run
 */

import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as dotenvConfig } from 'dotenv'
import pg from 'pg'
import { randomUUID } from 'node:crypto'

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
  { label: 'direct',                host: `db.${ref}.supabase.co`,                  port: 5432, user: 'postgres' },
  { label: 'pooler eu-central',     host: 'aws-0-eu-central-1.pooler.supabase.com', port: 6543, user: `postgres.${ref}` },
  { label: 'pooler eu-west',        host: 'aws-0-eu-west-1.pooler.supabase.com',     port: 6543, user: `postgres.${ref}` },
  { label: 'pooler eu-central-ses', host: 'aws-0-eu-central-1.pooler.supabase.com', port: 5432, user: `postgres.${ref}` },
]

let client = null
let usedCand = null
for (const cand of candidates) {
  const c = new pg.Client({
    host: cand.host, port: cand.port, user: cand.user, password: pwd,
    database: 'postgres', ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 12000,
  })
  try {
    console.log(`[seed-templates] Connecting via ${cand.label} → ${cand.host}:${cand.port}`)
    await c.connect()
    client = c
    usedCand = cand.label
    break
  } catch (err) {
    console.warn(`[seed-templates] ✗ ${cand.label}: ${err.message}`)
    try { await c.end() } catch {}
  }
}
if (!client) {
  console.error('[seed-templates] Could not connect. Abort.')
  process.exit(1)
}
console.log(`[seed-templates] Connected via ${usedCand}.\n`)

// ---- Template definitions ----
// Series verified against nuxt/data/seriesCatalog.ts
// category_slug values match the slugs used in user_templates and FLOW_CATEGORY_PRIORITY

const TEMPLATES = [
  // ── Cat 2: Air Cooler ──────────────────────────────────────────────────────
  {
    name: 'Cubic COMPACT – GACC FP',
    category_slug: 'air-cooler',
    configuration: {
      parameters: {
        coolingCapacityKw: 45,
        airflowM3h: 18000,
        evaporatingTempC: -10,
        condensingTempC: 30,
        refrigerant: 'R448A',
        defrostMethod: 'electric',
        installationType: 'indoor-ceiling',
        environmentClass: 'standard',
        coolingPurpose: 'cold-storage',
      },
    },
  },
  {
    name: 'Cubic VARIO – GACV FP',
    category_slug: 'air-cooler',
    configuration: {
      parameters: {
        coolingCapacityKw: 60,
        airflowM3h: 24000,
        evaporatingTempC: -8,
        condensingTempC: 32,
        refrigerant: 'R448A',
        defrostMethod: 'hot-gas',
        installationType: 'indoor-ceiling',
        environmentClass: 'standard',
        coolingPurpose: 'cold-storage',
      },
    },
  },
  {
    name: 'Slim COMPACT – GASC FP',
    category_slug: 'air-cooler',
    configuration: {
      parameters: {
        coolingCapacityKw: 22,
        airflowM3h: 9500,
        evaporatingTempC: -12,
        condensingTempC: 28,
        refrigerant: 'R449A',
        defrostMethod: 'electric',
        installationType: 'indoor-ceiling',
        environmentClass: 'standard',
        coolingPurpose: 'cold-storage',
      },
    },
  },
  {
    name: 'Dual COMPACT – GADC FP',
    category_slug: 'air-cooler',
    configuration: {
      parameters: {
        coolingCapacityKw: 80,
        airflowM3h: 32000,
        evaporatingTempC: -8,
        condensingTempC: 30,
        refrigerant: 'R448A',
        defrostMethod: 'hot-gas',
        installationType: 'indoor-ceiling',
        environmentClass: 'standard',
        coolingPurpose: 'cold-storage',
      },
    },
  },

  // ── Cat 1: Evaporator Pump ─────────────────────────────────────────────────
  {
    name: 'Cubic VARIO – GACV AP',
    category_slug: 'evaporator-pump',
    configuration: {
      parameters: {
        coolingCapacityKw: 55,
        airflowM3h: 20000,
        evaporatingTempC: -10,
        condensingTempC: 30,
        refrigerant: 'R717',
        defrostMethod: 'hot-gas',
        installationType: 'indoor-ceiling',
        environmentClass: 'standard',
        coolingPurpose: 'industrial-process',
      },
    },
  },
  {
    name: 'Dual VARIO – ADHN',
    category_slug: 'evaporator-pump',
    configuration: {
      parameters: {
        coolingCapacityKw: 120,
        airflowM3h: 48000,
        evaporatingTempC: -12,
        condensingTempC: 28,
        refrigerant: 'R717',
        defrostMethod: 'hot-gas',
        installationType: 'indoor-ceiling',
        environmentClass: 'standard',
        coolingPurpose: 'industrial-process',
      },
    },
  },

  // ── Cat 0: Evaporator DX (non-impact) ─────────────────────────────────────
  {
    name: 'Cubic COMPACT – GACC RX',
    category_slug: 'evaporator-dx',
    configuration: {
      parameters: {
        coolingCapacityKw: 35,
        airflowM3h: 14000,
        evaporatingTempC: -15,
        condensingTempC: 30,
        refrigerant: 'R452A',
        defrostMethod: 'electric',
        installationType: 'indoor-ceiling',
        environmentClass: 'standard',
        coolingPurpose: 'deep-freeze',
      },
    },
  },
  {
    name: 'Slim COMPACT – GASC RX',
    category_slug: 'evaporator-dx',
    configuration: {
      parameters: {
        coolingCapacityKw: 18,
        airflowM3h: 7500,
        evaporatingTempC: -18,
        condensingTempC: 30,
        refrigerant: 'R452A',
        defrostMethod: 'electric',
        installationType: 'indoor-ceiling',
        environmentClass: 'standard',
        coolingPurpose: 'deep-freeze',
      },
    },
  },
  {
    name: 'Cubic COMPACT – GACC CX',
    category_slug: 'evaporator-dx',
    configuration: {
      parameters: {
        coolingCapacityKw: 30,
        airflowM3h: 12000,
        evaporatingTempC: -20,
        condensingTempC: 25,
        refrigerant: 'R744',
        defrostMethod: 'hot-gas',
        installationType: 'indoor-ceiling',
        environmentClass: 'standard',
        coolingPurpose: 'deep-freeze',
      },
    },
  },

  // ── Cat 4: Dry Cooler ──────────────────────────────────────────────────────
  {
    name: 'V-shape VARIO – GFD',
    category_slug: 'dry-cooler',
    configuration: {
      parameters: {
        coolingCapacityKw: 200,
        airflowM3h: 80000,
        inletTempC: 45,
        outletTempC: 35,
        ambientTempMaxC: 40,
        ambientTempMinC: -20,
        installationType: 'outdoor-roof',
        environmentClass: 'standard',
        coolingPurpose: 'process-cooling',
      },
    },
  },
  {
    name: 'Flat COMPACT – GFHC',
    category_slug: 'dry-cooler',
    configuration: {
      parameters: {
        coolingCapacityKw: 85,
        airflowM3h: 34000,
        inletTempC: 40,
        outletTempC: 30,
        ambientTempMaxC: 35,
        ambientTempMinC: -15,
        installationType: 'outdoor-ground',
        environmentClass: 'standard',
        coolingPurpose: 'process-cooling',
      },
    },
  },
  {
    name: 'Vertical COMPACT – GFVC',
    category_slug: 'dry-cooler',
    configuration: {
      parameters: {
        coolingCapacityKw: 120,
        airflowM3h: 48000,
        inletTempC: 42,
        outletTempC: 32,
        ambientTempMaxC: 38,
        ambientTempMinC: -15,
        installationType: 'outdoor-ground',
        environmentClass: 'standard',
        coolingPurpose: 'data-center',
      },
    },
  },
  {
    name: 'Flat VARIO – GFHV',
    category_slug: 'dry-cooler',
    configuration: {
      parameters: {
        coolingCapacityKw: 160,
        airflowM3h: 64000,
        inletTempC: 40,
        outletTempC: 28,
        ambientTempMaxC: 35,
        ambientTempMinC: -20,
        installationType: 'outdoor-roof',
        environmentClass: 'standard',
        coolingPurpose: 'data-center',
      },
    },
  },

  // ── Cat 10: Gas Cooler CO₂ ────────────────────────────────────────────────
  {
    name: 'Vertical COMPACT – GGVC',
    category_slug: 'gas-cooler',
    configuration: {
      parameters: {
        coolingCapacityKw: 95,
        airflowM3h: 38000,
        inletTempC: 100,
        outletTempC: 35,
        ambientTempMaxC: 40,
        ambientTempMinC: -25,
        refrigerant: 'R744',
        installationType: 'outdoor-roof',
        environmentClass: 'standard',
        coolingPurpose: 'natural-refrigerants',
      },
    },
  },

  // ── Cat 3: Condenser ───────────────────────────────────────────────────────
  {
    name: 'Vertical COMPACT – GCVC',
    category_slug: 'condenser',
    configuration: {
      parameters: {
        coolingCapacityKw: 110,
        airflowM3h: 44000,
        condensingTempC: 40,
        ambientTempMaxC: 42,
        ambientTempMinC: -15,
        refrigerant: 'R407C',
        installationType: 'outdoor-roof',
        environmentClass: 'standard',
        coolingPurpose: 'heat-rejection',
      },
    },
  },
]

// ---- Find system owner (any existing user, system templates are visibility=shared) ----
console.log('[seed-templates] Looking up admin owner_id…')
const { rows: userRows } = await client.query(
  `SELECT id FROM user_templates ORDER BY created_at ASC LIMIT 1`
)
let systemOwnerId = userRows[0]?.id ? null : null
// Fetch an actual user UUID
const { rows: ownerRows } = await client.query(
  `SELECT DISTINCT owner_id FROM user_templates WHERE owner_id IS NOT NULL LIMIT 1`
)
systemOwnerId = ownerRows[0]?.owner_id
if (!systemOwnerId) {
  console.error('[seed-templates] No existing user found in user_templates. Seed a user template first.')
  await client.end()
  process.exit(1)
}
console.log(`[seed-templates] Using owner_id: ${systemOwnerId}\n`)

// ---- Execute ----
console.log(`[seed-templates] Planning to upsert ${TEMPLATES.length} system templates.\n`)

let ok = 0, failed = 0

for (const tpl of TEMPLATES) {
  const cfg = JSON.stringify(tpl.configuration)
  console.log(`  → ${tpl.name}  [${tpl.category_slug}]`)

  if (DRY_RUN) {
    console.log(`     DRY RUN — skipped.\n`)
    ok++
    continue
  }

  try {
    // Delete any existing system template with this name first (idempotent)
    await client.query(
      `DELETE FROM user_templates WHERE name = $1 AND is_system = true`,
      [tpl.name]
    )

    await client.query(
      `INSERT INTO user_templates
         (id, owner_id, name, category_slug, is_system, is_default_for_category, visibility, configuration, created_at, updated_at)
       VALUES
         ($1, $2, $3, $4, true, false, 'shared', $5::JSONB, now(), now())`,
      [randomUUID(), systemOwnerId, tpl.name, tpl.category_slug, cfg]
    )
    console.log(`     ✓ Inserted.\n`)
    ok++
  } catch (err) {
    console.error(`     ✗ Failed: ${err.message}\n`)
    failed++
  }
}

console.log(`[seed-templates] Done. ${ok} ok, ${failed} failed.`)
if (DRY_RUN) console.log('[seed-templates] (DRY RUN — no DB changes were made)')
await client.end()
