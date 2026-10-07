/**
 * import-products.mjs — Importiert CSV-Produktdateien aus products/ in Supabase.
 *
 * Unterstützt zwei CSV-Formate:
 *   - Per-Serie (z.B. GAMC_CX_2026.csv): Hat PRODUCT_CODE-Spalte, single-line Header
 *   - Kombiniert (z.B. Wholesales_all_products_combined.csv): Kein PRODUCT_CODE,
 *     multi-line Header (gequotete Feldnamen mit Zeilenumbrüchen), TYPE NAME als Key
 *
 * Usage:
 *   node scripts/import-products.mjs              # alle CSVs
 *   node scripts/import-products.mjs Wholesales   # nur matching files
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
const FILTER = process.argv.slice(2).find(a => !a.startsWith('-') && a.length > 1)

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
)

// ---- CSV-Parsing ----

// Erkennt Delimiter aus der ersten Zeile (Komma vs. Semikolon)
function detectDelimiter(headerLine) {
  const commas = (headerLine.match(/,/g) || []).length
  const semis  = (headerLine.match(/;/g) || []).length
  return commas > semis ? ',' : ';'
}

// Normalisiert Spaltennamen: "AIR VOLUME FLOW(m3/h)" → "AIR VOLUME FLOW (m3/h)"
// Manche CSV-Exporte lassen das Leerzeichen vor der Klammer weg.
function normalizeHeader(h) {
  return h.replace(/([A-Za-z])(\()/, '$1 $2').trim()
}

// Splittet eine CSV-Zeile am angegebenen Delimiter, respektiert gequotete Felder.
function splitCsvLine(line, delim = ';') {
  const result = []
  let current = ''
  let inQuote = false
  for (const ch of line) {
    if (ch === '"') {
      inQuote = !inQuote
    } else if (ch === delim && !inQuote) {
      result.push(current.trim())
      current = ''
    } else if (ch === '\n' && inQuote) {
      current += ' '
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

// Liest den CSV-Header, der ggf. mehrere Zeilen umfasst (gequotete Feldnamen).
// Erkennt Delimiter separat für Header und Datenzeilen (manche Exports mischen `;` / `,`).
// Gibt { headers, headerLineCount, delim } zurück.
function parseHeader(rawLines) {
  let headerRaw = ''
  let headerLineCount = 0
  for (const line of rawLines) {
    headerRaw = headerRaw ? headerRaw + '\n' + line : line
    headerLineCount++
    if ((headerRaw.match(/"/g) || []).length % 2 === 0) break
  }
  const headerDelim = detectDelimiter(headerRaw.split('\n')[0])
  const headers = splitCsvLine(headerRaw, headerDelim).map(normalizeHeader)

  // Delimiter der Datenzeilen aus erster Datenzeile bestimmen (kann vom Header abweichen)
  const firstDataLine = rawLines[headerLineCount] || ''
  const dataDelim = firstDataLine ? detectDelimiter(firstDataLine) : headerDelim

  return { headers, headerLineCount, delim: dataDelim }
}

function parseCsvRow(headers, values) {
  const row = {}
  headers.forEach((h, i) => {
    row[h] = values[i]?.trim() ?? ''
  })
  return row
}

// ---- Serien-Erkennung ----

// Prüft ob Dateiname eine einzelne Serie codiert (z.B. "GAMC_CX_2026.csv")
function isSeriesFilename(filename) {
  const base = basename(filename, '.csv')
  const parts = base.split('_')
  return parts.length >= 2 && /^[A-Z]{2,6}$/.test(parts[0]) && /^[A-Z]{2,3}$/.test(parts[1])
}

// Extrahiert series_code + series_variant aus Dateiname: "GAMC_CX_2026.csv" → "GAMC", "GAMC CX"
function parseFilename(filename) {
  const base = basename(filename, '.csv')
  const parts = base.split('_')
  return { code: parts[0], variant: `${parts[0]} ${parts[1]}` }
}

// Bestimmt series_code + series_variant — Dateiname hat Vorrang, sonst RANGE NAME-Spalte
function resolveSeriesFromRow(row, fnCode, fnVariant) {
  if (fnCode) return { code: fnCode, variant: fnVariant }
  const rangeName = (row['RANGE NAME'] || '').trim()
  if (rangeName) {
    return { code: rangeName.split(' ')[0], variant: rangeName }
  }
  return { code: 'UNKNOWN', variant: 'UNKNOWN' }
}

// ---- Nummer / Bool ----

function toNum(val) {
  if (!val || val === 'n/a' || val === '') return null
  const n = parseFloat(val.replace(',', '.'))
  return isNaN(n) ? null : n
}

function toBool(val) {
  if (!val) return false
  return val.toLowerCase() === 'yes' || val === '1' || val.toLowerCase() === 'true'
}

// ---- Produkt bauen ----

function buildProduct(row, seriesCode, seriesVariant, sourceFile) {
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

  // PRODUCT_CODE bevorzugen; Fallback auf TYPE NAME (Wholesales-Format)
  const productCode = row['PRODUCT_CODE'] || row['TYPE NAME']

  return {
    product_code: productCode,
    series_code: seriesCode,
    series_variant: seriesVariant,
    type_name: row['TYPE NAME'] || productCode,
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

// ---- Import einer CSV-Datei ----

async function importCsv(filepath) {
  const filename = basename(filepath)
  const seriesFile = isSeriesFilename(filename)
  const { code: fnCode, variant: fnVariant } = seriesFile ? parseFilename(filename) : { code: '', variant: '' }

  const content = await readFile(filepath, 'utf-8')
  const rawLines = content.split('\n')

  // Header parsen (ggf. mehrzeilig, Delimiter auto-erkannt)
  const { headers, headerLineCount, delim } = parseHeader(rawLines)
  const dataLines = rawLines.slice(headerLineCount).filter(l => l.trim())

  const products = []
  let skipped = 0

  for (const line of dataLines) {
    const values = splitCsvLine(line, delim)
    const row = parseCsvRow(headers, values)

    // Zeilen ohne Produktbezeichner überspringen
    const hasId = row['PRODUCT_CODE'] || row['TYPE NAME']
    if (!hasId) { skipped++; continue }

    const { code, variant } = resolveSeriesFromRow(row, fnCode, fnVariant)
    if (code === 'UNKNOWN') { skipped++; continue }

    products.push(buildProduct(row, code, variant, filename))
  }

  // Duplikate entfernen (letzter Eintrag pro product_code gewinnt)
  const uniqueMap = new Map()
  for (const p of products) uniqueMap.set(p.product_code, p)
  const uniqueProducts = Array.from(uniqueMap.values())
  const dupes = products.length - uniqueProducts.length

  const label = `  ${filename}: ${uniqueProducts.length} Produkte${dupes ? ` (${dupes} Duplikate entfernt)` : ''}${skipped ? ` (${skipped} übersprungen)` : ''}`
  console.log(label)

  if (DRY_RUN) {
    if (uniqueProducts[0]) {
      const s = uniqueProducts[0]
      console.log(`    Sample: series_variant="${s.series_variant}" product_code="${s.product_code}" price=${s.price} fan_tech=${s.fan_technology}`)
    }
    if (!seriesFile && uniqueProducts.length) {
      const variants = [...new Set(uniqueProducts.map(p => p.series_variant))].sort()
      console.log(`    Serien: ${variants.join(', ')}`)
    }
    return { file: filepath, count: uniqueProducts.length, skipped }
  }

  // Batch-Upsert (ON CONFLICT product_code → UPDATE)
  let inserted = 0
  const BATCH = 100
  for (let i = 0; i < uniqueProducts.length; i += BATCH) {
    const batch = uniqueProducts.slice(i, i + BATCH)
    const { error } = await sb.from('products').upsert(batch, { onConflict: 'product_code' })
    if (error) {
      console.error(`  ✗ Batch ${i}–${i + BATCH}: ${error.message}`)
    } else {
      inserted += batch.length
    }
  }
  return { file: filepath, count: uniqueProducts.length, inserted, skipped }
}

// ---- Main ----

async function main() {
  console.log(`\n[import-products] ${DRY_RUN ? 'DRY-RUN ' : ''}Import von ${PRODUCTS_DIR}`)
  if (FILTER) console.log(`  Filter: "${FILTER}"`)

  const allFiles = await readdir(PRODUCTS_DIR)
  const csvFiles = allFiles
    .filter(f => f.endsWith('.csv'))
    .filter(f => !FILTER || f.toLowerCase().includes(FILTER.toLowerCase()))
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
