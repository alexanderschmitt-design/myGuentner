#!/usr/bin/env node
/**
 * build-db.js — Parse product CSV files and spare part Excel into JSON database
 *
 * Usage:  node build-db.js
 *
 * Reads all CSV files from /products and generates:
 *   - frontend/database/products.json
 *   - frontend/database/spareparts.json (placeholder — Excel requires manual export)
 */

const fs = require('fs');
const path = require('path');

const PRODUCTS_DIR = path.join(__dirname, 'products');
const LAYOUTS_DIR  = path.join(__dirname, 'layouts');
const OUTPUT_DIR = path.join(__dirname, 'frontend', 'database');

// Ensure output dir
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// --- Parse CSV ---
function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(';');
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (vals[idx] || '').trim(); });
    rows.push(obj);
  }
  return rows;
}

// --- Map CSV row to product record ---
function mapProduct(row, sourceFile) {
  const series = (row['RANGE NAME'] || '').trim();
  const typeName = (row['TYPE NAME'] || '').trim();

  return {
    id: row['PRODUCT_CODE'] || typeName,
    typeName: typeName,
    series: series,
    type: (row['TYPE'] || '').trim(),
    sku: row['PRODUCT_CODE'] || '',
    internalModel: row['INTERNAL MODEL TYPE'] || '',
    source: sourceFile,

    // Category derived from series prefix
    category: deriveCategory(series),

    // Pricing
    price: parseNum(row['PRICE']),
    priceEpoxy: row['PRICE EPOXY'] || 'n/a',
    priceCoilDefender: row['PRICE COIL DEFENDER'] || 'n/a',
    priceWiring: row['PRICE WIRING TO JUNCTION BOX'] || '',
    priceStreamer: row['PRICE STREAMER'] || '',

    // Technical
    surface: parseNum(row['SURFACE (m2)']),
    airVolumeFlow: parseNum(row['AIR VOLUME FLOW (m3/h)']),
    fanSpeed: parseNum(row['FAN SPEED (rpm)']),
    airThrow: parseNum(row['AIR THROW (m)']),
    powerConsumption: parseNum(row['POWER CONSUMPTION (kW)']),
    fanCurrentNominal: parseNum(row['FAN CURRENT NOMINAL (A)']),
    energyEfficiencyClass: row['ENERGY EFFICIENCY CLASS'] || '',
    soundPressure: parseNum(row['UNIT SOUND PRESSURE (dB(A),3m)']),
    soundPower: parseNum(row['UNIT SOUND POWER (dB(A))']),
    tubeVolume: parseNum(row['TUBE VOLUME (L)']),

    // Fans
    fansPerRow: parseInt(row['FANS PER ROW']) || 0,
    fanRows: parseInt(row['FAN ROWS']) || 0,
    fanDiameter: parseInt(row['FAN DIAMETER']) || 0,
    fanTechnology: row['FAN TECHNOLOGY'] || '',
    fanImpellerType: row['FAN IMPELLER TYPE'] || '',

    // Dimensions
    length: parseInt(row['UNIT LENGTH']) || 0,
    width: parseInt(row['UNIT WIDTH']) || 0,
    height: parseInt(row['UNIT HEIGHT']) || 0,
    dimensionE: parseInt(row['DIMENSION E']) || 0,
    dimensionF: parseInt(row['DIMENSION F']) || 0,
    weight: parseNum(row['NET WEIGHT (KG)']),

    // Connections
    inletDiam: parseNum(row['INLET OUTER DIAM (mm)']),
    outletDiam: parseNum(row['OUTLET OUTER DIAM (mm)']),

    // Defrost
    defrost: row['DEFROST'] || '',
    heating: row['HEATING'] || '',
    junctionBox: row['JUNCTION_BOX'] || '',

    // Materials
    finType: row['FIN TYPE'] || '',
    finMaterial: row['FIN MATERIAL'] || '',
    finSpacing: parseNum(row['FIN SPACING']),
    numberOfPasses: parseInt(row['NUMBER OF PASSES']) || 0,
    tubeRows: parseInt(row['TUBE ROWS']) || 0,
    moduleSizeLetter: row['MODULESIZELETTER'] || '',

    // Power
    powerFrequency: row['POWER FREQUENCY'] || '',
    powerConnection: row['POWER CONNECTION'] || '',
    elMountedPowerConnection: row['EL MOUNTED POWERCONNECTION'] || '',
    elLoosePowerConnection: row['EL LOOSE POWERCONNECTION'] || '',

    // Stock & catalog
    stockUnit: row['STOCK UNIT'] || 'no',
    catalogRecommendation: row['CATALOG_RECOMMENDATION'] || 'no',
    articleWithSerialNumber: row['ARTICLE WITH SERIAL NUMBER'] || '',

    // Status
    status: 'Active'
  };
}

function deriveCategory(series) {
  if (series.startsWith('GACC')) return 'Evaporator';
  if (series.startsWith('GADC')) return 'Dual Compact';
  if (series.startsWith('GAMC')) return 'Mini Compact';
  if (series.startsWith('GASC')) return 'Slim Compact';
  if (series.startsWith('GCHC')) return 'Condenser';
  if (series.startsWith('GCVC')) return 'Condenser';
  return 'Other';
}

function parseNum(val) {
  if (!val || val === 'n/a') return null;
  // Handle European number format (comma as decimal) and thousand separators
  // e.g. "51,081" (DE thousands) → 51081, "0.361" → 0.361, "18.6" → 18.6
  let s = String(val).trim();
  // Comma + 3 digits = thousands separator → strip
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  // Otherwise comma is the decimal separator
  else s = s.replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/* ============================================================
   XLSX condenser support (GCHC / GCVC families)
   The condenser pricebook XLSX files have a different shape than
   the evaporator/cooler CSV files: different header set, and a few
   numeric cells (TUBE VOLUME, FIN SPACING) are corrupted by Excel
   auto-converting "18.6" → "18-Jun" date. We undo that here.
   ============================================================ */
const MONTH_TO_NUM = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};
function unmangleDateNumber(val) {
  if (val == null || val === '') return null;
  const s = String(val).trim();
  // Pattern: "18-Jun"  →  18.6
  let m = s.match(/^(\d{1,2})-([A-Za-z]{3})$/);
  if (m) {
    const month = MONTH_TO_NUM[m[2].toLowerCase()];
    if (month) return parseFloat(m[1] + '.' + month);
  }
  // Pattern: "Jun-18"  →  18.6  (alt locale)
  m = s.match(/^([A-Za-z]{3})-(\d{1,2})$/);
  if (m) {
    const month = MONTH_TO_NUM[m[1].toLowerCase()];
    if (month) return parseFloat(m[2] + '.' + month);
  }
  // Pattern: "18.06.2025" (DE date) → 18.6
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.\d{4}$/);
  if (m) return parseFloat(m[1] + '.' + parseInt(m[2], 10));
  // Pattern: "06/18/2025" (US date) → 18.6  (day from second slot)
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/\d{4}$/);
  if (m) return parseFloat(m[2] + '.' + parseInt(m[1], 10));
  // Otherwise fall back to plain numeric parsing
  return parseNum(s);
}

function readXLSX(filePath) {
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  // raw:false → cells with date format come back as their formatted string
  // ("18-Jun") rather than the serial number, so we can detect & undo.
  return XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
}

function mapProductCondenser(row, sourceFile) {
  const series = (row['RANGE NAME'] || '').trim();
  const typeName = (row['TYPE NAME'] || '').trim();
  const ui = (row['UI'] || '').toString().trim();
  // Condenser pricebook lacks PRODUCT_CODE — use UI (internal article id) or fall back to TYPE NAME
  const id = ui ? `UI-${ui}` : typeName;

  return {
    id,
    typeName,
    series,
    type: (row['TYPE'] || '').trim(),
    sku: ui,
    internalModel: row['INTERNAL MODEL TYPE'] || '',
    source: sourceFile,

    category: deriveCategory(series),

    // Pricing — condensers have a single PRICE; refrigerant-specific options not modelled in the simple CSV schema
    price: parseNum(row['PRICE']),
    priceEpoxy: 'n/a',
    priceCoilDefender: 'n/a',
    priceWiring: '',
    priceStreamer: '',

    // Refrigerant capacity columns (kept for reference, used by the condenser detail view)
    condenserCapacityR454C: parseNum(row['Condenser (R454C EN327)']),
    condenserCapacityR455A: parseNum(row['Condenser (R455A EN327)']),

    // Technical
    surface: parseNum(row['SURFACE (m2)']),
    airVolumeFlow: parseNum(row['AIR VOLUME FLOW (m3/h)']),
    fanSpeed: parseNum(row['FAN SPEED (rpm)']),
    airThrow: null, // not provided for condensers
    powerConsumption: parseNum(row['POWER CONSUMPTION (kW)']),
    fanCurrentNominal: parseNum(row['FAN CURRENT NOMINAL (A)']),
    energyEfficiencyClass: row['ENERGY EFFICIENCY CLASS'] || '',
    soundPressure: parseNum(row['UNIT SOUND PRESSURE (dB(A),3m)']),
    soundPower: parseNum(row['UNIT SOUND POWER (dB(A))']),
    tubeVolume: unmangleDateNumber(row['TUBE VOLUME (L)']),

    // Fans
    fansPerRow: parseInt(row['FANS PER ROW']) || 0,
    fanRows: parseInt(row['FAN ROWS']) || 0,
    fanDiameter: parseInt(row['FAN DIAMETER']) || 0,
    fanTechnology: row['FAN TECHNOLOGY'] || '',
    fanImpellerType: row['FAN IMPELLER TYPE'] || '',
    fanErpCode: row['FAN ERP CODE'] || '',
    fanConnectionId: (row['FAN CONNECTION ID'] || '').toString(),

    // Dimensions
    length: parseInt(row['UNIT LENGTH']) || 0,
    width: parseInt(row['UNIT WIDTH']) || 0,
    height: parseInt(row['UNIT HEIGHT']) || 0,
    dimensionE: parseInt(row['DIMENSION E']) || 0,
    dimensionF: parseInt(row['DIMENSION F']) || 0,
    weight: parseNum(row['NET WEIGHT (KG)']),

    // Connections
    inletDiam: parseNum(row['INLET OUTER DIAM (mm)']),
    outletDiam: parseNum(row['OUTLET OUTER DIAM (mm)']),

    // Defrost — condensers do not need defrost
    defrost: '',
    heating: 'No',
    junctionBox: '',

    // Materials
    finType: row['FIN TYPE'] || '',
    finMaterial: row['FIN MATERIAL'] || '',
    finSpacing: unmangleDateNumber(row['FIN SPACING']),
    numberOfPasses: parseInt(row['NUMBER OF PASSES']) || 0,
    tubeRows: parseInt(row['TUBE ROWS']) || 0,
    moduleSizeLetter: row['MODULESIZELETTER'] || '',

    // Power
    powerFrequency: (row['POWER FREQUENCY'] || '').toString(),
    powerConnection: row['POWER CONNECTION'] || '',
    elMountedPowerConnection: '',
    elLoosePowerConnection: '',

    // Stock & catalog
    stockUnit: row['STOCK UNIT'] || 'no',
    catalogRecommendation: row['CATALOG_RECOMMENDATION'] || 'no',
    articleWithSerialNumber: row['ARTICLE WITH SERIAL NUMBER'] || '',

    // Heat-exchanger metadata (specific to condensers)
    hxTechnology: row['HX_TECHNOLOGY'] || '',
    sketchName: row['SKETCH NAME'] || '',
    unitOfQuantity: row['UNIT OF QUANTITY'] || '',
    packagingUnit: parseInt(row['PACKAGING UNIT']) || 0,

    status: 'Active'
  };
}

// --- Main ---
const csvFiles = fs.readdirSync(PRODUCTS_DIR).filter(f => f.endsWith('.csv'));
let allProducts = [];

csvFiles.forEach(file => {
  const filePath = path.join(PRODUCTS_DIR, file);
  const rows = parseCSV(filePath);
  const sourceLabel = file.replace('_2026.csv', '').replace(/_/g, ' ');
  console.log(`  ${file}: ${rows.length} products`);
  rows.forEach(r => allProducts.push(mapProduct(r, sourceLabel)));
});

// XLSX condenser pricebooks (GCHC + GCVC, PD / RD) — same /products folder.
const xlsxProductFiles = fs.readdirSync(PRODUCTS_DIR)
  .filter(f => /^GC(HC|VC) (PD|RD).*\.xlsx$/i.test(f));

xlsxProductFiles.forEach(file => {
  const filePath = path.join(PRODUCTS_DIR, file);
  let rows;
  try { rows = readXLSX(filePath); }
  catch (e) {
    console.log(`  ${file}: skipped (xlsx package not available — run "npm install xlsx")`);
    return;
  }
  const sourceLabel = file.replace(/\.xlsx$/i, '').replace(/\s+2026$/, '').trim();
  console.log(`  ${file}: ${rows.length} products`);
  rows.forEach(r => allProducts.push(mapProductCondenser(r, sourceLabel)));
});

// Write products database
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'products.json'),
  JSON.stringify({ generated: new Date().toISOString(), count: allProducts.length, products: allProducts }, null, 2),
  'utf-8'
);
console.log(`\nProducts database: ${allProducts.length} total → frontend/database/products.json`);

/* ============================================================
   products-summary.json — slim sample for product-manager.html
   (max SUMMARY_PER_SERIES per series; lighter field schema)
   ============================================================ */
const SUMMARY_PER_SERIES = 50;

function toSummary(p) {
  return {
    id: p.id,
    typeName: p.typeName,
    series: p.series,
    category: p.category,
    sku: p.sku,
    surface: p.surface,
    airFlow: p.airVolumeFlow,
    fanCount: (p.fansPerRow || 0) * (p.fanRows || 1) || (p.fansPerRow || 0),
    fanDiameter: p.fanDiameter,
    fanTech: p.fanTechnology,
    sound: p.soundPressure,
    length: p.length,
    width: p.width,
    height: p.height,
    weight: p.weight,
    eClass: p.energyEfficiencyClass,
    defrost: p.defrost,
    finMaterial: p.finMaterial,
    finSpacing: p.finSpacing,
    tubeRows: p.tubeRows,
    price: p.price,
    stockUnit: p.stockUnit,
    status: p.status
  };
}

const seriesBuckets = {};
allProducts.forEach(p => {
  const s = p.series || 'Other';
  if (!seriesBuckets[s]) seriesBuckets[s] = [];
  if (seriesBuckets[s].length < SUMMARY_PER_SERIES) seriesBuckets[s].push(toSummary(p));
});

const summaryProducts = Object.keys(seriesBuckets)
  .sort()
  .reduce((acc, s) => acc.concat(seriesBuckets[s]), []);

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'products-summary.json'),
  JSON.stringify({ generated: new Date().toISOString(), count: summaryProducts.length, products: summaryProducts }, null, 2),
  'utf-8'
);
console.log(`Products summary:  ${summaryProducts.length} sampled → frontend/database/products-summary.json (${Object.keys(seriesBuckets).length} series)`);

// Spare parts: combine fan parts (Excel) + heater parts (CSV)
const spareParts = {
  generated: new Date().toISOString(),
  count: 0,
  note: 'Fans from Excel + heaters from layouts/heater_spareparts.csv',
  parts: []
};

// ---- Fans (from Excel) ----
try {
  const XLSX = require('xlsx');
  const xlsxPath = path.join(PRODUCTS_DIR, 'Güntner Spare Part price book_2026.xlsx');
  if (fs.existsSync(xlsxPath)) {
    const wb = XLSX.readFile(xlsxPath);
    const sheetName = wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
    rows.forEach((r, i) => {
      spareParts.parts.push({
        id: spareParts.parts.length + 1,
        category: 'Fan',
        ...r,
        status: 'Active'
      });
    });
    console.log(`Spare parts (fans): ${rows.length} items from Excel`);
  }
} catch(e) {
  console.log('Spare parts (fans): xlsx package not available — skipping.');
}

// ---- Heaters (from CSV, dedup by item code) ----
const heaterCsv = path.join(LAYOUTS_DIR, 'heater_spareparts.csv');
if (fs.existsSync(heaterCsv)) {
  const rows = parseCSV(heaterCsv);
  // Map: itemCode -> aggregated heater record
  const heaters = new Map();

  rows.forEach(row => {
    const modelRange = row['Model Range Name'];
    const modelType  = row['Model Type Name'];
    if (!modelRange) return;

    // ---- Coil heater ----
    const coilCode = row['Item Code Heating Element Coil'];
    if (coilCode) {
      addHeater(heaters, coilCode, {
        sub: 'Coil',
        modelRange,
        modelType,
        pieces:   parseInt(row['Piece Coil']) || 1,
        voltage:  parseInt(row['Heat Voltage Coil [V]']) || null,
        watts:    parseInt(row['Heat Capacity Coil [W]']) || null,
        length:   parseInt(row['Length of Coil [mm]']) || null,
        width:    parseInt(row['Width of Coil [mm]']) || null,
        price:    parseNum(row['price per heater in coil - 2026']),
      });
    }

    // ---- Tray heater ----
    const trayCode = row['Item Code Heating Element Tray'];
    if (trayCode) {
      addHeater(heaters, trayCode, {
        sub: 'Tray',
        modelRange,
        modelType,
        pieces:   parseInt(row['Piece ']) || parseInt(row['Piece']) || 1,
        voltage:  parseInt(row['Heat Voltage Tray [V]']) || null,
        watts:    parseInt(row['Heat Capacity Tray [W]']) || null,
        length:   parseInt(row['Length of Tray [mm]']) || null,
        width:    parseInt(row['Width of Tray [mm]']) || null,
        price:    parseNum(row['price per heater in tray - 2026']),
      });
    }
  });

  // Map heater records into spare-part objects
  let heaterCount = 0;
  heaters.forEach((h, itemCode) => {
    spareParts.parts.push({
      id: spareParts.parts.length + 1,
      category: 'Heater',
      'Item No': itemCode,
      'Type': `Heating Element ${h.sub} ${h.watts ? h.watts + ' W' : ''}${h.voltage ? ' / ' + h.voltage + ' V' : ''}`.trim(),
      'Itemcode': h.modelRanges.size === 1 ? [...h.modelRanges][0] : 'Multiple',
      'Heating Type': h.sub,                              // Coil | Tray
      'Heat Capacity (W)': h.watts,
      'Heat Voltage (V)': h.voltage,
      'Length (mm)': h.length,
      'Width (mm)': h.width,
      'Diameter (mm)': null,
      'Min-1': null,
      'Nominal Capacity (kW)': h.watts != null ? h.watts / 1000 : null,
      'Nominal Current (A)': null,
      'Ec Technology': null,
      'Air Flow Direction': null,
      'Mounting Type': h.sub === 'Coil' ? 'coil-side' : 'drip-tray',
      'Power Connection': h.voltage ? h.voltage + 'V / 1ph' : null,
      'Compatible Model Ranges': [...h.modelRanges].sort(),
      'Compatible Model Types': [...h.modelTypes].sort().slice(0, 50),  // cap to keep JSON small
      'Compatible Model Type Count': h.modelTypes.size,
      'spare part price 2026 ': h.price,
      status: 'Active'
    });
    heaterCount++;
  });
  console.log(`Spare parts (heaters): ${heaterCount} unique item codes from ${rows.length} CSV rows`);
} else {
  console.log('Spare parts (heaters): heater_spareparts.csv not found in layouts/ — skipping.');
}

spareParts.count = spareParts.parts.length;

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'spareparts.json'),
  JSON.stringify(spareParts, null, 2),
  'utf-8'
);

console.log(`\nSpare parts database: ${spareParts.count} total → frontend/database/spareparts.json`);
console.log('Done.');

// ---- Helpers ----
function addHeater(map, itemCode, info) {
  let h = map.get(itemCode);
  if (!h) {
    h = {
      sub: info.sub,
      voltage: info.voltage,
      watts: info.watts,
      length: info.length,
      width: info.width,
      price: info.price,
      modelRanges: new Set(),
      modelTypes: new Set(),
    };
    map.set(itemCode, h);
  }
  if (info.modelRange) h.modelRanges.add(info.modelRange);
  if (info.modelType)  h.modelTypes.add(info.modelType);
  // Use first non-null tech specs encountered (assume consistent per item code)
  if (h.voltage == null && info.voltage != null) h.voltage = info.voltage;
  if (h.watts   == null && info.watts   != null) h.watts   = info.watts;
  if (h.length  == null && info.length  != null) h.length  = info.length;
  if (h.width   == null && info.width   != null) h.width   = info.width;
  if (h.price   == null && info.price   != null) h.price   = info.price;
}
