#!/usr/bin/env node
/**
 * scripts/validate-defaults.mjs
 *
 * Diff-Tool: vergleicht die Live-Backend-Defaults pro Produkt-Kategorie
 * (Fixtures in nuxt/public/productCategoryN.json — aus der Live-App
 * myguntner.com via DevTools exportiert) gegen die effektiven Frontend-
 * Defaults die unser Store beim Kategorie-Wechsel produzieren würde.
 *
 * Report zeigt pro Kategorie und pro Feld: Live-Wert vs. Frontend-Wert.
 * Exit-Code 1 wenn Diffs vorhanden — nutzbar in CI.
 *
 * Ausführung:
 *   node scripts/validate-defaults.mjs
 *   node scripts/validate-defaults.mjs --category=0     # nur eine Kategorie
 *   node scripts/validate-defaults.mjs --verbose        # auch grüne Felder zeigen
 */

import fs from 'node:fs/promises'
import path from 'node:path'

// ============================================================================
// CLI-Args
// ============================================================================

const args = process.argv.slice(2)
const flags = {}
for (const a of args) {
  if (a.startsWith('--')) {
    const eq = a.indexOf('=')
    if (eq > 0) flags[a.slice(2, eq)] = a.slice(eq + 1)
    else flags[a.slice(2)] = true
  }
}
const onlyCat = flags.category !== undefined ? parseInt(flags.category, 10) : null
const verbose = flags.verbose === true

// ============================================================================
// LEGACY_MAP — 1:1 aus nuxt/utils/unitInputDataMapper.ts kopiert
// ============================================================================
// Wenn du hier Felder ergänzt, aktualisiere auch die TypeScript-Datei —
// sonst driften Store-Mapping und Diff-Tool auseinander.

const LEGACY_MAP = {
  coolingCapacityKw: {
    apiName: 'ThermalCapacity',
    fromApi: (v) => (typeof v === 'number' ? v / 1000 : null)
  },
  airflowM3h:          { apiName: 'AirVolumeFlow' },
  evaporatingTempC:    { apiName: 'FluidTempEvap' },
  condensingTempC:     { apiName: 'FluidTempCond' },
  superheatingK:       { apiName: 'FluidSuperHeating' },
  subcoolingK:         { apiName: 'FluidSubCooling' },
  airInletTempC:       { apiName: 'AirTemperature' },
  relHumidityPct:      { apiName: 'AirRelHumidity' },
  wetBulbTempC:        { apiName: 'AirWetBulbTemp' },
  altitudeM:           { apiName: 'Altitude' },
  airPressureMbar:     { apiName: 'AirPressure' },
  frostThicknessMm:    { apiName: 'FrostThickness' },
  inletTempC:          { apiName: 'FluidTempInlet' },
  outletTempC:         { apiName: 'FluidTempOutlet' },
  concentrationVolPct: { apiName: 'FluidVolConcentration' }
}

// ============================================================================
// emptyParameters — 1:1 aus nuxt/stores/configuration.ts kopiert (nur die
// Felder die auch in LEGACY_MAP stehen — der Rest ist irrelevant fürs Diff)
// ============================================================================

const EMPTY_PARAMETERS = {
  coolingCapacityKw: 10,
  airflowM3h: null,
  evaporatingTempC: -8,
  condensingTempC: 5,
  superheatingK: 5,
  subcoolingK: 1,
  airInletTempC: 32,
  relHumidityPct: 40,
  wetBulbTempC: 15,
  altitudeM: 0,
  airPressureMbar: 1013,
  frostThicknessMm: 0,
  inletTempC: 45,
  outletTempC: 40,
  concentrationVolPct: 34
}

// ============================================================================
// paramDefaults pro Kategorie — 1:1 aus nuxt/composables/useCategory.ts
// ============================================================================

const CATEGORY_PARAM_DEFAULTS = {
  0:  { airInletTempC: 0 },     // Evaporator DX
  1:  {},                        // Evaporator Pump
  2:  {},                        // Air Cooler
  3:  {},                        // Condenser
  4:  {},                        // Dry Cooler
  5:  {},                        // Subcooler
  6:  {},                        // Oil Cooler
  10: {}                         // Gas Cooler
}

const CATEGORY_NAMES = {
  0: 'Evaporator DX',
  1: 'Evaporator Pump',
  2: 'Air Cooler (Coolant)',
  3: 'Condenser',
  4: 'Dry Cooler',
  5: 'Subcooler',
  6: 'Oil Cooler',
  10: 'Gas Cooler (CO₂)'
}

// ============================================================================
// Fixture-Lade + Diff-Logik
// ============================================================================

const FIXTURE_DIR = path.resolve('nuxt', 'public')

async function loadFixture(catId) {
  const file = path.join(FIXTURE_DIR, `productCategory${catId}.json`)
  try {
    const raw = await fs.readFile(file, 'utf-8')
    const parsed = JSON.parse(raw)
    // Live-Response hat Envelope { success, message, content: {…} }
    return parsed.content || parsed
  } catch (err) {
    return null
  }
}

/**
 * Baut die effektiven Frontend-Defaults für eine Kategorie:
 *   emptyParameters + CATEGORIES[catId].paramDefaults + fixture-sync
 *
 * Der 3. Layer (Fixture-Sync) simuliert was thermodynamics.vue seit
 * Commit 2026-08-22 automatisch macht: legacyParametersFromUnitInputData
 * auf der Fixture-Response.
 */
function effectiveFrontendDefaults(catId, fixture) {
  const base = { ...EMPTY_PARAMETERS, ...(CATEGORY_PARAM_DEFAULTS[catId] || {}) }
  if (fixture) {
    const backendPatch = fixtureToLegacyParams(fixture)
    for (const [k, v] of Object.entries(backendPatch)) {
      if (v === null || v === undefined) continue
      base[k] = v
    }
  }
  return base
}

/**
 * Extrahiert die im LEGACY_MAP gemappten Felder aus einer Fixture.
 * Rückgabe: { coolingCapacityKw: 10, airInletTempC: 0, ... }
 */
function fixtureToLegacyParams(fixture) {
  const out = {}
  for (const [legacyKey, field] of Object.entries(LEGACY_MAP)) {
    const raw = fixture[field.apiName.charAt(0).toLowerCase() + field.apiName.slice(1)] ??
                fixture[field.apiName] // fallback für PascalCase
    if (raw === undefined) continue
    out[legacyKey] = field.fromApi ? field.fromApi(raw) : raw
  }
  return out
}

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'

function fmtVal(v) {
  if (v === null) return 'null'
  if (v === undefined) return 'undefined'
  if (typeof v === 'number') return String(Number.isInteger(v) ? v : Number(v.toFixed(3)))
  return JSON.stringify(v)
}

function approxEqual(a, b) {
  if (a === b) return true
  // null ↔ undefined — semantisch identisch (beide = "kein Wert gesetzt")
  if ((a === null || a === undefined) && (b === null || b === undefined)) return true
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 0.01  // 0.01 Toleranz — Rundungs-Slack bei Floats
  }
  return false
}

async function diffCategory(catId) {
  const fixture = await loadFixture(catId)
  if (!fixture) {
    console.log(`${YELLOW}⚠ catId=${catId} (${CATEGORY_NAMES[catId] || '?'}): keine Fixture in nuxt/public/productCategory${catId}.json${RESET}`)
    return { catId, missing: true, diffs: 0 }
  }

  const live = fixtureToLegacyParams(fixture)
  const frontend = effectiveFrontendDefaults(catId, fixture)

  const rows = []
  let diffCount = 0
  for (const key of Object.keys(LEGACY_MAP)) {
    const liveVal = live[key]
    const frontendVal = frontend[key]
    // Beide undefined → uninteressant
    if (liveVal === undefined && frontendVal === undefined) continue
    const same = approxEqual(liveVal, frontendVal)
    if (!same) diffCount++
    if (same && !verbose) continue
    rows.push({
      key,
      apiName: LEGACY_MAP[key].apiName,
      live: liveVal,
      frontend: frontendVal,
      same
    })
  }

  console.log(`\n${BOLD}=== catId=${catId} (${CATEGORY_NAMES[catId] || '?'}) ===${RESET}`)
  if (rows.length === 0) {
    console.log(`${GREEN}✓ Alle ${Object.keys(LEGACY_MAP).length} gemappten Felder identisch mit Live-Backend.${RESET}`)
  } else {
    const w1 = Math.max(...rows.map((r) => r.key.length), 8)
    const w2 = Math.max(...rows.map((r) => r.apiName.length), 8)
    console.log(`${DIM}  ${'legacyKey'.padEnd(w1)}  ${'apiName'.padEnd(w2)}  ${'live'.padEnd(15)}  ${'frontend'.padEnd(15)}${RESET}`)
    for (const r of rows) {
      const mark = r.same ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`
      const live = fmtVal(r.live).padEnd(15)
      const fe = fmtVal(r.frontend).padEnd(15)
      console.log(`${mark} ${r.key.padEnd(w1)}  ${r.apiName.padEnd(w2)}  ${live}  ${fe}`)
    }
  }
  return { catId, missing: false, diffs: diffCount, totalMapped: Object.keys(LEGACY_MAP).length }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const catIds = onlyCat !== null ? [onlyCat] : [0, 1, 2, 3, 4, 5, 6, 10]
  console.log(`${BOLD}Validate defaults — Frontend vs. Live-Backend${RESET}`)
  console.log(`${DIM}Fixtures: nuxt/public/productCategoryN.json${RESET}`)
  console.log(`${DIM}Mapped fields: ${Object.keys(LEGACY_MAP).length}${RESET}`)

  const results = []
  for (const catId of catIds) {
    results.push(await diffCategory(catId))
  }

  console.log(`\n${BOLD}=== Summary ===${RESET}`)
  let totalDiffs = 0
  let totalMissing = 0
  for (const r of results) {
    if (r.missing) {
      console.log(`  ${YELLOW}⚠${RESET} catId=${r.catId}: fixture missing`)
      totalMissing++
    } else if (r.diffs === 0) {
      console.log(`  ${GREEN}✓${RESET} catId=${r.catId}: 0 diffs (${r.totalMapped} fields match)`)
    } else {
      console.log(`  ${RED}✗${RESET} catId=${r.catId}: ${r.diffs}/${r.totalMapped} diffs`)
      totalDiffs += r.diffs
    }
  }
  console.log(`\n${totalDiffs === 0 && totalMissing === 0 ? GREEN + '✓ all green' : RED + '✗ ' + totalDiffs + ' diff(s), ' + totalMissing + ' missing fixture(s)'}${RESET}`)

  process.exit(totalDiffs > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('FATAL:', err.stack || err.message)
  process.exit(2)
})
