/**
 * Datasheet-Mapping-Probe
 * -----------------------
 * Empirisches Auflösen der Open Questions in rag/gpc-datasheet-mapping.md.
 *
 * Macht:
 *   1. GET  /defaultinputdata?productcategory=N         — Inputs für die Probe
 *   2. POST /findunits                                  — selectedUnit-Sample dumpen
 *   3. POST /unitfeatures                               — feature-key/itemValue/value-Sample dumpen
 *   4. Analyse pro Datasheet-Sektion:
 *      - Welche Properties sind im Response vorhanden?
 *      - Welche fehlen? (= Open Question bleibt offen)
 *      - Welche Werte enthalten sie tatsächlich?
 *   5. Sample-Files schreiben:
 *      - rag/probe-datasheet-{cat}-findunits.json   (komplettes selectedUnit)
 *      - rag/probe-datasheet-{cat}-features.json    (komplette feature-Liste)
 *
 * Aufruf:
 *   npm run probe-datasheet
 *   npm run probe-datasheet -- 3      # Kategorie 3 (Condenser) statt 0 (DX)
 *
 * Default-Kategorie: 0 (Evap DX), weil die Mockup-Datasheet so aussieht.
 *
 * Voraussetzung:
 *   rag-server.js läuft auf :3001 mit GUENTNER_API_KEY in .env.
 *
 * Exit-Codes:
 *   0   alle Stages OK
 *   1   Connectivity-Fehler / kein Server
 *   2   /findunits liefert 0 units
 *   3   Crashed
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.PROBE_BASE || 'http://localhost:3001/api/gpc-eu';
const LANG = parseInt(process.env.PROBE_LANG || '2', 10);
const TIMEOUT_MS = parseInt(process.env.PROBE_TIMEOUT_MS || '90000', 10);
const CAT = parseInt(process.argv[2] || process.env.PROBE_CAT || '0', 10);

// --------------- pretty output -----------------
function color(c, s) {
  const codes = { red: 31, green: 32, yellow: 33, blue: 34, gray: 90, bold: 1, cyan: 36 };
  return `\x1b[${codes[c] || 0}m${s}\x1b[0m`;
}
function ok(m)   { console.log(color('green', '  [OK]   ') + m); }
function fail(m) { console.log(color('red',   '  [FAIL] ') + m); }
function warn(m) { console.log(color('yellow','  [WARN] ') + m); }
function info(m) { console.log(color('gray',  '  [..]   ') + m); }
function head(m) { console.log('\n' + color('bold', m)); }
function sub(m)  { console.log(color('blue', '  → ') + m); }

// --------------- http -----------------
async function withTimeout(p) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try { return await p(ctrl.signal); } finally { clearTimeout(t); }
}
async function apiGet(p, q) {
  const url = BASE_URL + '/' + p + (q ? '?' + new URLSearchParams(q).toString() : '');
  const t0 = Date.now();
  try {
    const r = await withTimeout(s => fetch(url, { signal: s }));
    const ms = Date.now() - t0;
    let body = null; try { body = await r.json(); } catch (_) {}
    return { status: r.status, ok: r.ok, body, ms };
  } catch (e) { return { status: 0, ok: false, error: e.message, ms: Date.now() - t0 }; }
}
async function apiPost(p, body, q) {
  const url = BASE_URL + '/' + p + (q ? '?' + new URLSearchParams(q).toString() : '');
  const t0 = Date.now();
  try {
    const r = await withTimeout(s => fetch(url, {
      method: 'POST', signal: s,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    }));
    const ms = Date.now() - t0;
    const ct = r.headers.get('content-type') || '';
    let parsed = null;
    if (ct.includes('application/json')) { try { parsed = await r.json(); } catch (_) {} }
    else { try { parsed = await r.text(); } catch (_) {} }
    return { status: r.status, ok: r.ok, body: parsed, ms };
  } catch (e) { return { status: 0, ok: false, error: e.message, ms: Date.now() - t0 }; }
}

// --------------- analysis -----------------
function describe(val) {
  if (val === null || val === undefined) return color('gray', '(null)');
  if (typeof val === 'string') return color('cyan', JSON.stringify(val.length > 80 ? val.slice(0, 80) + '…' : val));
  if (typeof val === 'number') return color('cyan', String(val));
  if (typeof val === 'boolean') return color('cyan', String(val));
  if (Array.isArray(val)) return color('cyan', `Array[${val.length}]`);
  if (typeof val === 'object') return color('cyan', `Object{${Object.keys(val).length} keys}`);
  return color('cyan', String(val));
}

function checkField(u, propName, label) {
  const val = u[propName];
  const isPresent = val !== undefined && val !== null && val !== '';
  if (isPresent) {
    ok(`${label.padEnd(34)} ${propName.padEnd(28)} = ${describe(val)}`);
  } else {
    warn(`${label.padEnd(34)} ${propName.padEnd(28)} = ${color('gray', '(missing/empty)')}`);
  }
  return isPresent;
}

function analyzeSelectedUnit(u, uid) {
  head(`Section 1+2 — Header + Key Specs`);
  checkField(u, 'unitKey', 'Model code (unitKey)');
  checkField(u, 'unitModelID_MRNameExternal', 'Subtitle MR');
  checkField(u, 'unitModelID_MTNameExternal', 'Subtitle MT');
  checkField(u, 'thermalCapacity', 'Capacity');
  checkField(u, 'surfaceReserve', 'Surface reserve');
  checkField(u, 'airVolumeFlow', 'Air volume');
  checkField(u, 'airVelocity', 'Air velocity');
  checkField(u, 'airthrow', 'Air throw');
  checkField(u, 'evaporationTemp', 'Evaporation temp');
  checkField(u, 'superHeating', 'Superheating');
  checkField(u, 'feedRateValue', 'Feed rate (Pump)');
  checkField(u, 'feedRateDescription', 'Feed rate description');
  checkField(u, 'airTempInlet', 'Air temp');
  checkField(u, 'airInletRelHumidity', 'Rel. humidity');
  checkField(u, 'frost', 'Frost thickness');

  head(`Section 3 — Fan Data`);
  checkField(u, 'fanNumber', 'Fans count');
  checkField(u, 'fanSpeed', 'Fan speed (RPM)');
  checkField(u, 'fanDiameter', 'Fan diameter');
  checkField(u, 'motor_technology', 'Motor tech label');
  checkField(u, 'fanPSVoltage', 'Voltage');
  checkField(u, 'fanPSFrequency', 'Frequency');
  checkField(u, 'fanPSPhaseNumber', 'Phases');
  checkField(u, 'fanConnectionType', 'Motor connection');
  checkField(u, 'fanCapacityDescription', 'Fan capacity desc');
  checkField(u, 'fanCurrentNominal', 'Nominal current');
  checkField(u, 'fanELPowerNominal', 'Nominal el. power');
  checkField(u, 'fanShaftPowerNominal', 'Shaft power');
  checkField(u, 'soundPressure', 'Sound pressure');
  checkField(u, 'soundPressureDistance', 'Sound distance');
  checkField(u, 'soundPowerLevel', 'Sound power');

  head(`Section 4 — Materials`);
  checkField(u, 'casing', 'Casing');
  checkField(u, 'surface', 'Surface (m²)');
  checkField(u, 'coreTubeMaterialCode', 'Tube material code');
  checkField(u, 'finMaterialCode', 'Fin material code');
  checkField(u, 'tubes', 'Tubes');
  checkField(u, 'fins', 'Fins');
  checkField(u, 'inletOuterDiameter', 'Inlet Ø');
  checkField(u, 'outletOuterDiameter', 'Outlet Ø');
  checkField(u, 'pedClassification', 'PED category');

  head(`Section 5 — Dimensions`);
  checkField(u, 'unitLength', 'Length L');
  checkField(u, 'unitWidth', 'Width W');
  checkField(u, 'unitHeight', 'Height H');
  checkField(u, 'unitWeight', 'Net weight');
  checkField(u, 'sketchFileName', 'Sketch filename');
  checkField(u, 'sketchLegend', 'Sketch legend (A-G?)');
  checkField(u, 'sketchNote', 'Sketch note');
  checkField(u, 'subSketchFileName', 'Sub-sketch file');

  head(`Section 7 — Pricing`);
  checkField(u, 'unitPrice', 'Unit price');
  checkField(u, 'listPrice_without_Surcharge', 'List price');
  checkField(u, 'materialSurcharge', 'Material surcharge');
  checkField(u, 'total_price', 'Total price');
  checkField(u, 'priceOnDemand', 'Price on demand flag');
  checkField(u, 'accessories', 'Accessories array');
  if (Array.isArray(u.accessories) && u.accessories.length > 0) {
    sub(`accessories[0]: ${JSON.stringify(u.accessories[0])}`);
  }

  head(`Section 8 — Delivery`);
  checkField(u, 'deliveryTime', 'Delivery time');
  checkField(u, 'deliveryTimeInDays', 'Delivery days');
  checkField(u, 'isUnitInStock', 'In stock flag');

  head(`Section 9 — IMPACT`);
  checkField(u, 'impactRating', 'IMPACT rating');
  checkField(u, 'totalPowerConsumption', 'Total el. power');
  checkField(u, 'energyEfficencyClass', 'Energy class');
  checkField(u, 'impactDefrostMethode', 'Defrost method');
  checkField(u, 'impactCEI', 'CEI');
  checkField(u, 'impactDEI', 'DEI');
  checkField(u, 'impactDefrostPerDay', 'Defrost per day');
  checkField(u, 'impactDefrostDuration', 'Defrost duration');
  const hasImpactData = !!u.impactData && typeof u.impactData === 'object';
  if (hasImpactData) {
    ok(`impactData                          (dict with ${Object.keys(u.impactData).length} keys)`);
    Object.entries(u.impactData).forEach(([k, v]) => {
      sub(`impactData["${k}"] = ${color('cyan', JSON.stringify(v))}`);
    });
  } else {
    warn(`impactData                          ${color('gray', '(missing/empty)')}`);
  }

  head(`Section 6/CO2-Sub — Refrigerant via thermoCircuits[]`);
  const tc = Array.isArray(u.thermoCircuits) ? u.thermoCircuits : null;
  if (tc && tc.length > 0) {
    ok(`thermoCircuits                      Array[${tc.length}]`);
    sub(`[0]: ${JSON.stringify(tc[0])}`);
  } else {
    warn(`thermoCircuits                      ${color('gray', '(missing/empty)')}`);
  }

  head(`Section 10 — IMPACT Product Life Cycle (User-Inputs aus unitInputData)`);
  function checkUid(prop) {
    const v = uid[prop];
    const isPresent = v !== undefined && v !== null && v !== '';
    if (isPresent) ok(`uid.${prop.padEnd(30)} = ${describe(v)}`);
    else           warn(`uid.${prop.padEnd(30)} = ${color('gray', '(missing/empty)')}`);
  }
  checkUid('impactOperationLife');
  checkUid('impactElectricityPrice');
  checkUid('impactPlanningFactor');
  checkUid('impactEmissionFactor');
  checkUid('impactCountryID');
  checkUid('impactUsePredictionModelDefrost');
}

function analyzeUnitFeatures(features) {
  head(`/unitfeatures — Material/Coating/Tray-Lookups`);
  if (!Array.isArray(features) || features.length === 0) {
    warn('unitfeatures liefert leere oder fehlende content[]');
    return;
  }
  ok(`Feature-Liste: ${features.length} Einträge`);
  console.log(color('gray', '  ┌──── key ──────────────────────┬─ description ───────┬─ itemValue / value ──'));
  const interesting = ['coating', 'tray', 'distributorPipe', 'distrPipe', 'distrPipes',
                       'specialVarnishing', 'corrosion', 'finMaterial', 'finPitch',
                       'defrosting', 'defrost', 'erp', 'efficiency', 'connectionType'];
  features.forEach(f => {
    const k = f.key || '';
    const isInteresting = interesting.some(needle => k.toLowerCase().includes(needle.toLowerCase()));
    const line = `  ${(isInteresting ? color('cyan', k) : k).padEnd(40)} ${(f.description || '').slice(0, 20).padEnd(22)} ${color('gray', (f.itemValue ?? '').toString().slice(0, 28))}`;
    if (isInteresting) console.log(color('bold', line));
    else console.log(line);
  });
}

// --------------- main -----------------
(async function main() {
  console.log(color('bold', `Datasheet-Mapping Probe — Kategorie ${CAT}`));
  console.log(color('gray', `Base: ${BASE_URL} · Lang: ${LANG}`));

  // 1. Connectivity
  const v = await apiGet('gpcversion');
  if (!v.ok) {
    fail(`Connectivity: gpcversion HTTP ${v.status} — ist der rag-server.js gestartet?`);
    process.exit(1);
  }
  ok(`gpcversion → ${typeof v.body === 'string' ? v.body : JSON.stringify(v.body).slice(0, 80)} (${v.ms}ms)`);

  // 2. defaultinputdata
  const def = await apiGet('defaultinputdata', { productcategory: CAT });
  if (!def.ok || !def.body?.success || !def.body?.content) {
    fail(`defaultinputdata fehlgeschlagen: ${JSON.stringify(def.body).slice(0, 200)}`);
    process.exit(1);
  }
  const uid = def.body.content;
  ok(`defaultinputdata → ${Object.keys(uid).length} props (${def.ms}ms)`);

  // 3. findunits
  const find = await apiPost('findunits', uid, { languageID: LANG, unitSystem: 0 });
  if (!find.ok || !find.body?.success) {
    fail(`findunits fehlgeschlagen (${find.ms}ms): ${find.body?.message || find.error}`);
    process.exit(2);
  }
  const units = find.body.foundUnits || [];
  if (units.length === 0) {
    fail(`findunits → 0 units — Default-Inputs liefern keine Hardware-Treffer`);
    process.exit(2);
  }
  ok(`findunits → ${units.length} units (${find.ms}ms)`);
  const sample = units[0];
  sub(`Sample: ${sample.unitKey || '?'}`);

  // 4. unitfeatures
  const feat = await apiPost('unitfeatures', uid, { languageID: LANG, unitSystem: 0 });
  if (!feat.ok || !feat.body) {
    fail(`unitfeatures fehlgeschlagen (${feat.ms}ms): ${feat.body?.message || feat.error}`);
  } else {
    ok(`unitfeatures → ${(feat.body.content || []).length} features (${feat.ms}ms)`);
  }

  // 5. Dumps
  const dumpsDir = __dirname;
  const fnFind = path.join(dumpsDir, `probe-datasheet-${CAT}-findunits.json`);
  const fnFeat = path.join(dumpsDir, `probe-datasheet-${CAT}-features.json`);
  fs.writeFileSync(fnFind, JSON.stringify({ unitInputData: uid, selectedUnit: sample, inputDataMFCBinaryLen: (find.body.inputDataMFCBinary || '').length }, null, 2));
  fs.writeFileSync(fnFeat, JSON.stringify(feat.body, null, 2));
  ok(`Dumps: ${path.basename(fnFind)} (${(fs.statSync(fnFind).size / 1024).toFixed(1)} KB), ${path.basename(fnFeat)} (${(fs.statSync(fnFeat).size / 1024).toFixed(1)} KB)`);

  // 6. Analyse
  analyzeSelectedUnit(sample, uid);
  analyzeUnitFeatures(feat.body?.content);

  // 7. Top-Level summary of unknown keys
  head(`Vollständiger Property-Index (selectedUnit)`);
  const allKeys = Object.keys(sample).sort();
  console.log(color('gray', `${allKeys.length} Properties total:`));
  console.log('  ' + allKeys.map(k => sample[k] !== null && sample[k] !== undefined && sample[k] !== '' ? color('cyan', k) : color('gray', k)).join(', '));

  console.log('\n' + color('bold', 'Fertig.') + ' Sample-Files: ' + path.basename(fnFind) + ', ' + path.basename(fnFeat));
  process.exit(0);
})().catch(e => {
  console.error('\n' + color('red', 'Unexpected exception:'), e);
  process.exit(3);
});
