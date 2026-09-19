/**
 * import-spare-parts.mjs — Importiert den Güntner Spare Part Price Book
 * (Excel) in die spare_parts-Tabelle in Supabase.
 *
 * Usage:
 *   node scripts/import-spare-parts.mjs             # Standard
 *   node scripts/import-spare-parts.mjs --dry-run   # Preview
 *   node scripts/import-spare-parts.mjs --list-sheets # zeigt alle Sheet-Namen
 *
 * Env: SUPABASE_URL, SUPABASE_SECRET_KEY
 */

import { join, dirname } from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

// xlsx liegt im nuxt/-Subprojekt
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const require = createRequire(join(__dirname, '..', 'nuxt', 'package.json'))
const XLSX = require('xlsx')

const EXCEL_PATH = join(process.cwd(), 'products', 'Güntner Spare Part price book_2026.xlsx')
const DRY_RUN = process.argv.includes('--dry-run')
const LIST_SHEETS = process.argv.includes('--list-sheets')

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
)

function toNum(val) {
  if (val == null || val === '') return null
  if (typeof val === 'number') return val
  const s = String(val).replace(',', '.').replace(/[^0-9.-]/g, '')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parseFanSheet(rows) {
  const parts = []
  for (const r of rows) {
    const code = r['Itemcode'] ? String(r['Itemcode']).trim() : null
    if (!code) continue

    const typePart = r['Type'] ? String(r['Type']).trim() : ''
    const itemNo = r['Item No'] ? String(r['Item No']).trim() : ''
    const description = [typePart, itemNo].filter(Boolean).join(' — ')

    const ecTech = r['Ec Technology'] ? String(r['Ec Technology']).trim().toLowerCase() : ''
    const subCat = ecTech === 'yes' ? 'EC Motor' : ecTech ? `EC ${ecTech}` : 'Standard'

    const specs = {}
    if (r['Diameter (mm)'] != null && r['Diameter (mm)'] !== '') specs.diameter_mm = r['Diameter (mm)']
    if (r['Air Flow Direction']) specs.air_flow_direction = String(r['Air Flow Direction']).trim()
    if (r['Voltage']) specs.voltage = String(r['Voltage']).trim()
    if (r['Air Flow m3/h']) specs.air_flow_m3h = toNum(r['Air Flow m3/h'])
    if (r['Item No']) specs.item_no = String(r['Item No']).trim()
    if (r['Type']) specs.type = typePart

    parts.push({
      code,
      description: description || code,
      category: 'Fans',
      sub_category: subCat,
      price: toNum(r['spare part price 2026']),
      specs,
      source: 'excel:fan-spare-parts'
    })
  }
  return parts
}

function parseHeaterSheet(rows) {
  const parts = []
  for (const r of rows) {
    const modelRange = r['Model Range Name'] ? String(r['Model Range Name']).trim() : ''
    const seriesInfo = r['Model Type Name'] ? String(r['Model Type Name']).trim() : ''

    const baseSpecs = {}
    for (const [k, v] of Object.entries(r)) {
      if (v !== '' && v != null &&
        k !== 'Item Code Heating Element Coil' &&
        k !== 'Item Code Heating Element Tray' &&
        k !== 'price per heater in coil - 2026' &&
        k !== 'price per heater in tray - 2026') {
        baseSpecs[k] = v
      }
    }

    const coilCode = r['Item Code Heating Element Coil']
      ? String(r['Item Code Heating Element Coil']).trim()
      : null
    if (coilCode) {
      parts.push({
        code: coilCode,
        description: ['Heating Element Coil', modelRange, seriesInfo].filter(Boolean).join(' — '),
        category: 'Heating elements',
        sub_category: 'Coil',
        price: toNum(r['price per heater in coil - 2026']),
        specs: { ...baseSpecs, element_type: 'coil' },
        source: 'excel:heater-spare-parts'
      })
    }

    const trayCode = r['Item Code Heating Element Tray']
      ? String(r['Item Code Heating Element Tray']).trim()
      : null
    if (trayCode) {
      parts.push({
        code: trayCode,
        description: ['Heating Element Tray', modelRange, seriesInfo].filter(Boolean).join(' — '),
        category: 'Heating elements',
        sub_category: 'Tray',
        price: toNum(r['price per heater in tray - 2026']),
        specs: { ...baseSpecs, element_type: 'tray' },
        source: 'excel:heater-spare-parts'
      })
    }
  }
  return parts
}

async function importSheet(sheet, sheetName) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  if (!rows.length) {
    console.log(`  Sheet "${sheetName}": leer — übersprungen`)
    return 0
  }

  const headers = Object.keys(rows[0])
  console.log(`  Sheet "${sheetName}": ${rows.length} Zeilen, Spalten: ${headers.slice(0, 8).join(', ')}…`)

  let parts
  if (sheetName === 'fan-spare-parts') {
    parts = parseFanSheet(rows)
  } else if (sheetName === 'heater-spare-parts') {
    parts = parseHeaterSheet(rows)
  } else {
    console.log(`    → unbekanntes Sheet, wird übersprungen`)
    return 0
  }

  // Deduplizieren: letzter Eintrag pro code gewinnt
  const byCode = new Map()
  for (const p of parts) byCode.set(p.code, p)
  const deduped = [...byCode.values()]

  console.log(`    → ${parts.length} Einträge geparst, ${deduped.length} nach Deduplizierung`)

  if (DRY_RUN) {
    if (deduped[0]) console.log('    Sample:', JSON.stringify(deduped[0]).slice(0, 300))
    return deduped.length
  }

  const BATCH = 100
  let inserted = 0
  for (let i = 0; i < deduped.length; i += BATCH) {
    const batch = deduped.slice(i, i + BATCH)
    const { error } = await sb.from('spare_parts').upsert(batch, { onConflict: 'code' })
    if (error) {
      console.error(`  ✗ Batch ${i}: ${error.message}`)
    } else {
      inserted += batch.length
    }
  }
  return inserted
}

async function main() {
  console.log(`\n[import-spare-parts] ${DRY_RUN ? 'DRY-RUN ' : ''}Lade: ${EXCEL_PATH}`)

  let workbook
  try {
    workbook = XLSX.readFile(EXCEL_PATH)
  } catch (e) {
    console.error(`✗ Datei nicht lesbar: ${e.message}`)
    process.exit(1)
  }

  const sheets = workbook.SheetNames
  console.log(`Sheets (${sheets.length}): ${sheets.join(', ')}`)

  if (LIST_SHEETS) {
    for (const name of sheets) {
      const ws = workbook.Sheets[name]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      const headers = rows[0] ? Object.keys(rows[0]) : []
      console.log(`\n  ${name}: ${rows.length} Zeilen`)
      console.log(`  Spalten: ${headers.join(' | ')}`)
    }
    return
  }

  let total = 0
  for (const sheetName of sheets) {
    const ws = workbook.Sheets[sheetName]
    const count = await importSheet(ws, sheetName)
    total += count
  }

  console.log(`\n✓ Import abgeschlossen: ${total} Ersatzteile`)
  if (DRY_RUN) console.log('  (--dry-run: nichts geschrieben)')
}

main().catch(e => { console.error(e); process.exit(1) })
