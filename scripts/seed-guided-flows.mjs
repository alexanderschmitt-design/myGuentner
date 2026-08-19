#!/usr/bin/env node
/**
 * Seed-Script — schreibt die 7 Code-Configs aus nuxt/data/homeEntryFlows.ts
 * in die Supabase-Tabelle `guided_entry_flows`. Idempotent (upsert auf
 * entry_id).
 *
 * Usage:
 *   node scripts/seed-guided-flows.mjs
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as dotenvConfig } from 'dotenv'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenvConfig({ path: resolve(__dirname, '..', '.env') })

const ref = process.env.SUPABASE_PROJECT_ID
const pwd = process.env.SUPABASE_PSW
if (!ref || !pwd) {
  console.error('SUPABASE_PROJECT_ID + SUPABASE_PSW müssen in .env gesetzt sein')
  process.exit(1)
}

// -----------------------------------------------------------------------------
// Configs — 1:1 aus nuxt/data/homeEntryFlows.ts kopiert. Bewusst inline hier,
// damit das Script kein TS-Loader-Setup braucht und rein Node/ESM läuft.
// Bei Änderungen an homeEntryFlows.ts sollte das hier synchron gehalten werden
// oder besser: der Admin-UI folgen und die Configs nur via Admin editieren.
// -----------------------------------------------------------------------------

const SEEDS = [
  {
    entry_id: 'commercial-hvac',
    tab_id: 'application',
    title: 'Application: Commercial HVAC',
    target_kind: 'static',
    target_cat_id: 2,
    target_slug: 'air-cooler',
    fixed_params: { coolingPurpose: 'air-conditioning', glycolType: 'ethylene', concentrationVolPct: 34 },
    questions: [
      { id: 'building-type', message: 'Commercial HVAC — got it. **What kind of building** are you cooling? Helps me pick sensible defaults for occupancy and cooling loads.', choices: [
        { label: 'Office building', detail: '9-to-5 occupancy, moderate load', params: {} },
        { label: 'Hotel', detail: 'Continuous, varying occupancy', params: {} },
        { label: 'Hospital / lab', detail: '24/7, tight tolerance', params: {} },
        { label: 'Retail / mall', detail: 'Long hours, high solar gain', params: {} }
      ]},
      { id: 'capacity', message: 'How much **cooling capacity** do you need? Commercial HVAC typically sits between 20 kW (single-tenant office) and several hundred kW (full building).', choices: [
        { label: '20 kW', detail: 'Small tenant / single floor', params: { coolingCapacityKw: 20 } },
        { label: '50 kW', detail: 'Mid-size office', params: { coolingCapacityKw: 50 } },
        { label: '150 kW', detail: 'Large office / hotel', params: { coolingCapacityKw: 150 } },
        { label: '300 kW', detail: 'Multi-story / hospital', params: { coolingCapacityKw: 300 } }
      ]},
      { id: 'water-regime', message: 'Which **chilled-water regime** does your system use? Standard 6/12 °C fits most fan-coil setups; higher regimes save energy but need bigger coils.', choices: [
        { label: '6 / 12 °C', detail: 'Standard chilled water', params: { inletTempC: 12, outletTempC: 6 } },
        { label: '7 / 12 °C', detail: 'Heat-pump compatible', params: { inletTempC: 12, outletTempC: 7 } },
        { label: '10 / 15 °C', detail: 'High-temp chilled water (efficient)', params: { inletTempC: 15, outletTempC: 10 } }
      ]}
    ]
  },
  {
    entry_id: 'industrial-refrigeration',
    tab_id: 'application',
    title: 'Application: Industrial Refrigeration',
    target_kind: 'static',
    target_cat_id: 1,
    target_slug: 'evaporator-pump',
    fixed_params: { coolingPurpose: 'industrial' },
    questions: [
      { id: 'process-type', message: 'Industrial refrigeration — solid choice. **What are you cooling?** This helps me set the right temperature levels.', choices: [
        { label: 'Meat / fish', detail: '-2 °C storage, hygiene-critical', params: {} },
        { label: 'Fruit / vegetable', detail: '0-4 °C, high humidity', params: {} },
        { label: 'Dairy / beverages', detail: '+2 °C, moderate temperature', params: {} },
        { label: 'Frozen goods', detail: '-18 to -25 °C long-term storage', params: {} }
      ]},
      { id: 'capacity', message: '**How much cooling capacity** do you need? Industrial systems land between 25 kW (single cold room) and 500+ kW (full facility).', choices: [
        { label: '25 kW', detail: 'Small industrial cold room', params: { coolingCapacityKw: 25 } },
        { label: '50 kW', detail: 'Mid-size cold storage', params: { coolingCapacityKw: 50 } },
        { label: '100 kW', detail: 'Large freezer / process', params: { coolingCapacityKw: 100 } },
        { label: '250 kW', detail: 'Full industrial facility', params: { coolingCapacityKw: 250 } }
      ]},
      { id: 'refrigerant', message: '**Which refrigerant?** NH₃ (R717) is the industrial standard for large systems. CO₂ (R744) works well for cascade / transcritical setups. R448A/R452A are HFO blends for HFC retrofits.', choices: [
        { label: 'R717 (NH₃)', detail: 'Industrial standard', params: { refrigerant: 'R717' } },
        { label: 'R744 (CO₂)', detail: 'Cascade / transcritical', params: { refrigerant: 'R744' } },
        { label: 'R448A', detail: 'HFO blend, retrofit', params: { refrigerant: 'R448A' } },
        { label: 'R452A', detail: 'HFO blend, low-temp', params: { refrigerant: 'R452A' } }
      ]},
      { id: 'temperature-regime', message: 'Last one: **which temperature regime?** Sets the evaporating temperature (t₀) and the target room temperature.', choices: [
        { label: 'Cold storage (+2 °C)', detail: 't₀ = -8 °C, room +2 °C', params: { evaporatingTempC: -8, airInletTempC: 2 } },
        { label: 'Deep freeze (-18 °C)', detail: 't₀ = -25 °C, room -18 °C', params: { evaporatingTempC: -25, airInletTempC: -18 } },
        { label: 'Blast freezer (-35 °C)', detail: 't₀ = -40 °C, room -35 °C', params: { evaporatingTempC: -40, airInletTempC: -35 } }
      ]}
    ]
  },
  {
    entry_id: 'energy-process-cooling',
    tab_id: 'application',
    title: 'Application: Energy & Process Cooling',
    target_kind: 'static',
    target_cat_id: 4,
    target_slug: 'dry-cooler',
    fixed_params: { coolingPurpose: 'industrial', glycolType: 'ethylene', concentrationVolPct: 34 },
    questions: [
      { id: 'process-purpose', message: 'Process cooling — what\'s the **primary purpose** of the loop?', choices: [
        { label: 'Free cooling', detail: 'Ambient dry-cooler pre-cooling', params: {} },
        { label: 'Heat rejection', detail: 'Chiller condenser water loop', params: {} },
        { label: 'Machine tool cooling', detail: 'Molds, hydraulics, spindles', params: {} },
        { label: 'Renewable energy', detail: 'Battery / power electronics', params: {} }
      ]},
      { id: 'capacity', message: 'How much **cooling capacity** do you need?', choices: [
        { label: '50 kW', detail: 'Small process', params: { coolingCapacityKw: 50 } },
        { label: '150 kW', detail: 'Mid-size industrial', params: { coolingCapacityKw: 150 } },
        { label: '300 kW', detail: 'Large process / chiller', params: { coolingCapacityKw: 300 } },
        { label: '500 kW', detail: 'Plant-scale', params: { coolingCapacityKw: 500 } }
      ]},
      { id: 'water-regime', message: 'Which **fluid inlet/outlet temperature regime**? Dry coolers work best when the fluid is well above ambient (bigger ΔT = smaller unit).', choices: [
        { label: '35 / 30 °C', detail: 'Free cooling, low ΔT', params: { inletTempC: 35, outletTempC: 30 } },
        { label: '45 / 40 °C', detail: 'Dry cooler standard', params: { inletTempC: 45, outletTempC: 40 } },
        { label: '55 / 45 °C', detail: 'High-temp process', params: { inletTempC: 55, outletTempC: 45 } }
      ]}
    ]
  },
  {
    entry_id: 'data-center',
    tab_id: 'application',
    title: 'Application: Data Center',
    target_kind: 'static',
    target_cat_id: 4,
    target_slug: 'dry-cooler',
    fixed_params: { coolingPurpose: 'data-center', glycolType: 'ethylene', concentrationVolPct: 34 },
    questions: [
      { id: 'redundancy', message: 'Data center cooling — critical stuff. **What redundancy level** does your design require? Drives quantity and sizing safety.', choices: [
        { label: 'N', detail: 'No redundancy — non-critical / test', params: {} },
        { label: 'N+1', detail: 'Single-point fault tolerance (standard)', params: {} },
        { label: '2N', detail: 'Full duplication (tier-3+)', params: {} }
      ]},
      { id: 'capacity', message: '**IT load** you need to reject? Rule of thumb: 1 kW IT ≈ 1 kW cooling load. Cooling systems are usually sized 10-20 % above IT load.', choices: [
        { label: '100 kW', detail: 'Small colo / edge site', params: { coolingCapacityKw: 100 } },
        { label: '300 kW', detail: 'Mid-size data center', params: { coolingCapacityKw: 300 } },
        { label: '500 kW', detail: 'Large data hall', params: { coolingCapacityKw: 500 } },
        { label: '1000 kW', detail: 'Hyperscale zone', params: { coolingCapacityKw: 1000 } }
      ]},
      { id: 'cooling-strategy', message: 'Which **cooling strategy** does your design use? Free-cooling saves energy but needs high-temp chilled water.', choices: [
        { label: 'Chilled water 12/6', detail: 'Traditional DX-fed cooling', params: { inletTempC: 12, outletTempC: 6 } },
        { label: 'Free cooling 32/22', detail: 'Warm water, high efficiency', params: { inletTempC: 32, outletTempC: 22 } },
        { label: 'Free cooling 45/40', detail: 'Full free-cooling dry cooler loop', params: { inletTempC: 45, outletTempC: 40 } }
      ]}
    ]
  },
  {
    entry_id: 'natural-refrigerants',
    tab_id: 'refrigerant',
    title: 'Refrigerant: Natural',
    target_kind: 'refrigerant-map',
    target_cat_id: null,
    target_slug: null,
    fixed_params: {},
    questions: [
      { id: 'family', message: 'Natural refrigerants — great choice, F-gas-independent and future-proof. **Which one** fits your case?', choices: [
        { label: 'R744 (CO₂)', detail: 'GWP 1, A1, transcritical option', params: { refrigerant: 'R744' } },
        { label: 'R717 (NH₃)', detail: 'GWP 0, B2L, industrial powerhouse', params: { refrigerant: 'R717' } },
        { label: 'R290 (Propane)', detail: 'GWP 3, A3, small-charge systems', params: { refrigerant: 'R290' } }
      ]},
      { id: 'use-case', message: 'What\'s your **primary use case**? This determines whether we\'re heading into an evaporator, condenser, or gas cooler.', choices: [
        { label: 'Cold storage', detail: '0…+5 °C, food & retail', params: { coolingPurpose: 'cold-storage' } },
        { label: 'Deep freeze', detail: '-18…-35 °C, long-term', params: { coolingPurpose: 'deep-freeze' } },
        { label: 'Industrial process', detail: 'Process cooling, plants', params: { coolingPurpose: 'industrial' } },
        { label: 'Heat rejection', detail: 'Condenser / gas cooler', params: { coolingPurpose: 'condensing' } }
      ]},
      { id: 'capacity', message: 'Finally: **how much capacity**? Pick the closest starting point — you can fine-tune the value in the next step.', choices: [
        { label: '10 kW', detail: 'Small system', params: { coolingCapacityKw: 10 } },
        { label: '25 kW', detail: 'Mid-size', params: { coolingCapacityKw: 25 } },
        { label: '100 kW', detail: 'Large system', params: { coolingCapacityKw: 100 } },
        { label: '250 kW', detail: 'Industrial scale', params: { coolingCapacityKw: 250 } }
      ]}
    ]
  },
  {
    entry_id: 'brine',
    tab_id: 'refrigerant',
    title: 'Refrigerant: Brine (Secondary Loop)',
    target_kind: 'static',
    target_cat_id: 2,
    target_slug: 'air-cooler',
    fixed_params: {},
    questions: [
      { id: 'application', message: 'Brine loops decouple the primary refrigerant from the cooling point. **What\'s the target application** of the brine loop?', choices: [
        { label: 'Cold storage', detail: '+2 to -5 °C rooms', params: { coolingPurpose: 'cold-storage' } },
        { label: 'Deep freeze', detail: '-25 to -40 °C', params: { coolingPurpose: 'deep-freeze' } },
        { label: 'Chiller / AC', detail: '+6 to +12 °C', params: { coolingPurpose: 'air-conditioning' } },
        { label: 'Industrial process', detail: 'Custom temperature', params: { coolingPurpose: 'industrial' } }
      ]},
      { id: 'medium', message: 'Which **brine medium** does your system use? Glycol is standard; salt brines are used at very low temperatures.', choices: [
        { label: 'Ethylene glycol', detail: 'Standard industrial', params: { glycolType: 'ethylene', concentrationVolPct: 34 } },
        { label: 'Propylene glycol', detail: 'Food-safe, higher viscosity', params: { glycolType: 'propylene', concentrationVolPct: 34 } },
        { label: 'Water (pure)', detail: 'No frost protection', params: { glycolType: 'water', concentrationVolPct: 0 } }
      ]},
      { id: 'temperature-regime', message: 'Which **inlet / outlet temperature regime**?', choices: [
        { label: '+12 / +6 °C', detail: 'Chiller / AC', params: { inletTempC: 12, outletTempC: 6 } },
        { label: '-5 / -10 °C', detail: 'Deep-freeze brine loop', params: { inletTempC: -5, outletTempC: -10 } },
        { label: '+2 / -3 °C', detail: 'Cold storage', params: { inletTempC: 2, outletTempC: -3 } }
      ]}
    ]
  },
  {
    entry_id: 'synthetic-refrigerants',
    tab_id: 'refrigerant',
    title: 'Refrigerant: Synthetic',
    target_kind: 'refrigerant-map',
    target_cat_id: null,
    target_slug: null,
    fixed_params: {},
    questions: [
      { id: 'family', message: 'Synthetic refrigerants — **which one** are you planning to use? Consider F-gas phase-down rules for GWP > 750.', choices: [
        { label: 'R448A', detail: 'HFO blend, common retrofit', params: { refrigerant: 'R448A' } },
        { label: 'R1234ze', detail: 'HFO, very low GWP (7)', params: { refrigerant: 'R1234ze' } },
        { label: 'R134a', detail: 'Legacy HFC, GWP 1430', params: { refrigerant: 'R134a' } },
        { label: 'R32', detail: 'Single-comp HFC, GWP 675', params: { refrigerant: 'R32' } }
      ]},
      { id: 'use-case', message: 'What\'s the **primary use case**?', choices: [
        { label: 'Cold storage', detail: '0…+5 °C', params: { coolingPurpose: 'cold-storage' } },
        { label: 'Deep freeze', detail: '-18…-35 °C', params: { coolingPurpose: 'deep-freeze' } },
        { label: 'AC / Chiller', detail: 'Comfort cooling', params: { coolingPurpose: 'air-conditioning' } },
        { label: 'Heat rejection', detail: 'Condenser', params: { coolingPurpose: 'condensing' } }
      ]},
      { id: 'capacity', message: 'And the **capacity**?', choices: [
        { label: '10 kW', detail: 'Small system', params: { coolingCapacityKw: 10 } },
        { label: '25 kW', detail: 'Mid-size', params: { coolingCapacityKw: 25 } },
        { label: '100 kW', detail: 'Large system', params: { coolingCapacityKw: 100 } },
        { label: '250 kW', detail: 'Industrial scale', params: { coolingCapacityKw: 250 } }
      ]}
    ]
  }
]

// -----------------------------------------------------------------------------
// DB-Connect (kopiert aus run-migration.mjs — dieselben Kandidaten)
// -----------------------------------------------------------------------------
const candidates = [
  { label: 'direct', host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres' },
  { label: 'pooler eu-central', host: 'aws-0-eu-central-1.pooler.supabase.com', port: 6543, user: `postgres.${ref}` },
  { label: 'pooler eu-west', host: 'aws-0-eu-west-1.pooler.supabase.com', port: 6543, user: `postgres.${ref}` },
  { label: 'pooler eu-central-session', host: 'aws-0-eu-central-1.pooler.supabase.com', port: 5432, user: `postgres.${ref}` }
]

let client = null
let usedCand = null
for (const cand of candidates) {
  const c = new pg.Client({
    host: cand.host, port: cand.port, user: cand.user, password: pwd,
    database: 'postgres', ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000
  })
  try {
    console.log(`[seed] Versuche ${cand.label} → ${cand.host}:${cand.port}`)
    await c.connect()
    client = c
    usedCand = cand.label
    break
  } catch (err) {
    console.warn(`[seed] ✗ ${cand.label}: ${err.message}`)
    try { await c.end() } catch {}
  }
}
if (!client) {
  console.error('[seed] Konnte nicht verbinden.')
  process.exit(1)
}

console.log(`[seed] Verbunden via ${usedCand}. Führe Upserts aus …`)

let inserted = 0, updated = 0, failed = 0
for (const seed of SEEDS) {
  try {
    const result = await client.query(
      `INSERT INTO guided_entry_flows
         (entry_id, tab_id, title, questions, fixed_params, target_kind, target_cat_id, target_slug, enabled)
       VALUES ($1, $2, $3, $4::JSONB, $5::JSONB, $6, $7, $8, TRUE)
       ON CONFLICT (entry_id) DO UPDATE SET
         tab_id = EXCLUDED.tab_id,
         title = EXCLUDED.title,
         questions = EXCLUDED.questions,
         fixed_params = EXCLUDED.fixed_params,
         target_kind = EXCLUDED.target_kind,
         target_cat_id = EXCLUDED.target_cat_id,
         target_slug = EXCLUDED.target_slug,
         updated_at = NOW()
       RETURNING (xmax = 0) AS is_insert`,
      [
        seed.entry_id, seed.tab_id, seed.title,
        JSON.stringify(seed.questions), JSON.stringify(seed.fixed_params),
        seed.target_kind, seed.target_cat_id, seed.target_slug
      ]
    )
    if (result.rows[0].is_insert) {
      inserted++
      console.log(`  ✓ inserted: ${seed.entry_id}`)
    } else {
      updated++
      console.log(`  ✓ updated:  ${seed.entry_id}`)
    }
  } catch (err) {
    failed++
    console.error(`  ✗ ${seed.entry_id}: ${err.message}`)
  }
}

await client.end()
console.log(`\n[seed] Done. ${inserted} inserted, ${updated} updated, ${failed} failed.`)
process.exit(failed > 0 ? 1 : 0)
