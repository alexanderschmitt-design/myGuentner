/**
 * import-products.mjs — Importiert CSV-Produktdateien aus products/ in Supabase.
 *
 * Usage:
 *   node scripts/import-products.mjs              # alle CSVs
 *   node scripts/import-products.mjs GAMC_CX      # nur matching files
 *   node scripts/import-products.mjs --dry-run    # nur Preview, kein Insert
 *
 * Env: SUPABASE_URL, SUPABASE_SECRET_KEY
 */

import { readdir, readFile } from 'fs/promises'
import { join, basename } from 'path'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const PRODUCTS_DIR = join(process.cwd(), 'products')
const DRY_RUN = process.argv.includes('--dry-run')
const FILTER = process.argv.find(a => !a.startsWith('-') && a.includes('_'))

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
)

// Extrahiert Series-Code aus filename: "GAMC_CX_2026.csv" → code="GAMC", variant="GAMC CX"
function parseFilename(filename) {
  const base = basename(filename, '.csv')
  const parts = base.split('_')
  const code = parts[0]
  const variant = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0]
  return { code, variant }
}

function parseCsvRow(headers, values) {
  const row = {}
  headers.forEach((h, i) => {
    row[h] = values[i]?.trim() ?? ''
  })
  return row
}

function toNum(val) {
  if (!val || val === 'n/a' || val === '') return null
  const n = parseFloat(val.replace(',', '.'))
  return isNaN(n) ? null : n
}

function toBool(val) {
  if (!val) return false
  return val.toLowerCase() === 'yes' || val === '1' || val.toLowerCase() === 'true'
}

function buildProduct(row, seriesCode, seriesVariant, sourceFile) {
  // Bekannte Spalten explizit mappen, Rest in specs
  const EXPLICIT = new Set([
    'TYPE NAME', 'RANGE NAME', 'TYPE', 'PRODUCT_CODE', 'INTERNAL MODEL TYPE',
    'PRICE', 'DEFROST', 'FANS PER ROW', 'FAN ROWS',
    'SURFACE (m2)', 'AIR VOLUME FLOW (m3/h)', 'POWER CONSUMPTION (kW)',
    'UNIT SOUND PRESSURE (dB(A),3m)', 'UNIT SOUND POWER (dB(A))',
    'UNIT LENGTH', 'UNIT WIDTH', 'UNIT HEIGHT', 'NET WEIGHT (KG)',
    'FAN DIAMETER', 'FAN TECHNOLOGY', 'FIN MATERIAL', 'FIN SPACING',
    'TUBE ROWS', 'HEATING', 'JUNCTION_BOX',
    'PRICE EPOXY', 'PRICE COIL DEFENDER'
  ])

  const specs = {}
  for (const [k, v] of Object.entries(row)) {
    if (!EXPLICIT.has(k) && v !== '') specs[k] = v
  }

  return {
    product_code: row['PRODUCT_CODE'],
    series_code: seriesCode,
    series_variant: seriesVariant,
    type_name: row['TYPE NAME'],
    model_type: row['INTERNAL MODEL TYPE'] || null,
    price: toNum(row['PRICE']),
    defrost: row['DEFROST'] || null,
    fans_per_row: toNum(row['FANS PER ROW']),
    fan_rows: toNum(row['FAN ROWS']),
    surface_m2: toNum(row['SURFACE (m2)']),
    air_volume_m3h: toNum(row['AIR VOLUME FLOW (m3/h)']),
    power_kw: toNum(row['POWER CONSUMPTION (kW)']),
    sound_pressure_db: toNum(row['UNIT SOUND PRESSURE (dB(A),3m)']),
    sound_power_db: toNum(row['UNIT SOUND POWER (dB(A))']),
    unit_length_mm: toNum(row['UNIT LENGTH']),
    unit_width_mm: toNum(row['UNIT WIDTH']),
    unit_height_mm: toNum(row['UNIT HEIGHT']),
    weight_kg: toNum(row['NET WEIGHT (KG)']),
    fan_diameter_mm: toNum(row['FAN DIAMETER']),
    fan_technology: row['FAN TECHNOLOGY'] || null,
    fin_material: row['FIN MATERIAL'] || null,
    fin_spacing: toNum(row['FIN SPACING']),
    tube_rows: toNum(row['TUBE ROWS']),
    has_heating: toBool(row['HEATING']),
    has_junction_box: toBool(row['JUNCTION_BOX']),
    price_epoxy: toNum(row['PRICE EPOXY']),
    price_coil_defender: toNum(row['PRICE COIL DEFENDER']),
    specs,
    source_file: sourceFile
  }
}

async function importCsv(filepath) {
  const { code, variant } = parseFilename(basename(filepath))
  const content = await readFile(filepath, 'utf-8')
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length < 2) return { file: filepath, count: 0, skipped: 0 }

  const headers = lines[0].split(';').map(h => h.trim())
  const products = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';')
    const row = parseCsvRow(headers, values)
    if (!row['PRODUCT_CODE']) continue
    products.push(buildProduct(row, code, variant, basename(filepath)))
  }

  console.log(`  ${basename(filepath)}: ${products.length} Produkte`)

  if (DRY_RUN) {
    if (products[0]) console.log('    Sample:', JSON.stringify(products[0]).slice(0, 200))
    return { file: filepath, count: products.length, skipped: 0 }
  }

  // Batch-Upsert
  let inserted = 0
  const BATCH = 100
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH)
    const { error } = await sb.from('products').upsert(batch, { onConflict: 'product_code' })
    if (error) {
      console.error(`  ✗ Batch ${i}-${i + BATCH}: ${error.message}`)
    } else {
      inserted += batch.length
    }
  }
  return { file: filepath, count: products.length, inserted }
}

async function main() {
  console.log(`\n[import-products] ${DRY_RUN ? 'DRY-RUN ' : ''}Import von ${PRODUCTS_DIR}`)

  const allFiles = await readdir(PRODUCTS_DIR)
  const csvFiles = allFiles
    .filter(f => f.endsWith('.csv'))
    .filter(f => !FILTER || f.includes(FILTER))
    .map(f => join(PRODUCTS_DIR, f))

  if (!csvFiles.length) {
    console.log('Keine CSV-Dateien gefunden.')
    return
  }

  let total = 0
  for (const file of csvFiles) {
    const result = await importCsv(file)
    total += result.count
  }

  console.log(`\n✓ Import abgeschlossen: ${total} Produkte aus ${csvFiles.length} Dateien`)
  if (DRY_RUN) console.log('  (--dry-run: nichts geschrieben)')
}

main().catch(e => { console.error(e); process.exit(1) })
