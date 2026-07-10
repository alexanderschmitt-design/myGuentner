/**
 * Phase 2 — myGPC ↔ GPC.EU API Mapping Roundtrip Validation
 * ---------------------------------------------------------
 * Validiert für alle 8 productCategories (0, 1, 2, 3, 4, 5, 6, 10), dass:
 *   1. GET /defaultinputdata liefert success + content
 *   2. Erwartete Default-Werte aus rag/gpc-field-mapping.md stimmen
 *   3. POST /findunits mit den Default-Inputs liefert >=1 foundUnit
 *   4. POST /unitgroup liefert die erwartete Series-Liste
 *   5. End-to-End-Sample (cat=3 Condenser): unitbidtext + unitfeatures funktionieren
 *
 * Aufruf:
 *   npm run probe-mapping
 *
 * ENV-Overrides:
 *   PROBE_VERBOSE=1   → Mehr Detail-Output pro Schritt
 *   PROBE_LANG=2      → languageID (1=DEU, 2=ENG)
 *   PROBE_BASE=...    → Override-Base-URL (Default: http://localhost:3001/api/gpc-eu)
 *   PROBE_CAT=3       → Nur eine Kategorie probieren statt aller 8
 *
 * Exit-Codes:
 *   0  alle Kategorien OK
 *   1  Connectivity / Env-Fehler
 *   2  Mindestens eine Kategorie hat einen Roundtrip-Fehler
 */

require('dotenv').config();

const BASE_URL = process.env.PROBE_BASE || 'http://localhost:3001/api/gpc-eu';
const LANG = parseInt(process.env.PROBE_LANG || '2', 10);
const VERBOSE = process.env.PROBE_VERBOSE === '1';
const SINGLE_CAT = process.env.PROBE_CAT != null ? parseInt(process.env.PROBE_CAT, 10) : null;
// findunits/unitgroup mit Default-Inputs können bei großen Searches (z.B. Dry cooler mit
// 300 kW Default-Capacity) >30s brauchen. 90s ist generös, aber sicher.
const TIMEOUT_MS = parseInt(process.env.PROBE_TIMEOUT_MS || '90000', 10);

function color(c, s) {
  const codes = { red: 31, green: 32, yellow: 33, blue: 34, gray: 90, bold: 1 };
  return `\x1b[${codes[c] || 0}m${s}\x1b[0m`;
}
function ok(msg)   { console.log(color('green', '  [OK]   ') + msg); }
function fail(msg) { console.log(color('red',   '  [FAIL] ') + msg); }
function warn(msg) { console.log(color('yellow','  [WARN] ') + msg); }
function info(msg) { console.log(color('gray',  '  [..]   ') + msg); }
function head(msg) { console.log('\n' + color('bold', msg)); }
function sub(msg)  { console.log(color('blue', '  → ') + msg); }

async function fetchWithTimeout(url, opts) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try { return await fetch(url, Object.assign({}, opts || {}, { signal: ctrl.signal })); }
  finally { clearTimeout(t); }
}

async function apiGet(path, query) {
  const q = query ? '?' + new URLSearchParams(query).toString() : '';
  const t0 = Date.now();
  try {
    const r = await fetchWithTimeout(BASE_URL + '/' + path + q);
    const ms = Date.now() - t0;
    let body = null;
    try { body = await r.json(); } catch (_) { /* nicht-JSON ok */ }
    return { status: r.status, ok: r.ok, body, ms };
  } catch (err) {
    return { status: 0, ok: false, body: null, ms: Date.now() - t0, error: err.name === 'AbortError' ? 'TIMEOUT' : err.message };
  }
}
async function apiPost(path, body, query) {
  const q = query ? '?' + new URLSearchParams(query).toString() : '';
  const t0 = Date.now();
  try {
    const r = await fetchWithTimeout(BASE_URL + '/' + path + q, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    });
    const ms = Date.now() - t0;
    // unitbidtext liefert plain text (RTF), nicht JSON
    const contentType = r.headers.get('content-type') || '';
    let parsed = null;
    if (contentType.includes('application/json')) {
      try { parsed = await r.json(); } catch (_) {}
    } else {
      try { parsed = await r.text(); } catch (_) {}
    }
    return { status: r.status, ok: r.ok, body: parsed, ms };
  } catch (err) {
    return { status: 0, ok: false, body: null, ms: Date.now() - t0, error: err.name === 'AbortError' ? 'TIMEOUT' : err.message };
  }
}

/**
 * Erwartungen aus rag/gpc-field-mapping.md — Drift-Check.
 * Wenn diese Werte vom API drift'en, wird das als WARN gemeldet, nicht als FAIL.
 */
const CATEGORY_CONFIG = {
  0: {
    name: 'Evaporator DX', side: 'cold', cls: 'A',
    expectedCapacity: 10000, expectedFluidID: 2010,
    expectedFluidInputMode: 3,   // Dew point at inlet
    expectedDefrosting: 80,      // Air defrost
    expectedSeries: ['GACC_CX_3E_WS_KDB', 'GACV_CX_4E']
  },
  1: {
    name: 'Evaporator Pump', side: 'cold', cls: 'B',
    expectedCapacity: 5000, expectedFluidID: 2009,
    expectedFluidInputMode: 3,
    expectedDefrosting: 80,
    expectedSeries: ['GACV_AP_4E']
  },
  2: {
    name: 'Air cooler Coolant', side: 'cold', cls: 'C',
    expectedCapacity: 5000, expectedFluidID: 4,
    expectedFluidInputMode: 0,   // Inlet/Outlet temperature
    expectedDefrosting: 80,
    expectedSeries: ['GACC_FP_2E_WS_KDB', 'GACV_FP_4E']
  },
  3: {
    name: 'Condenser', side: 'warm', cls: 'D1',
    expectedCapacity: 100000, expectedFluidID: 2012,
    expectedFluidInputMode: 3,
    expectedDefrosting: 0,
    expectedSeries: ['GCHC_3E', 'GCHV_3E']
  },
  4: {
    name: 'Dry cooler', side: 'warm', cls: 'E1',
    expectedCapacity: 300000, expectedFluidID: 4,
    expectedFluidInputMode: 0,
    expectedDefrosting: 0,
    expectedSeries: ['GFHC_2E', 'GFHV_3E']
  },
  5: {
    name: 'Subcooler', side: 'warm', cls: 'D2',
    expectedCapacity: 50000, expectedFluidID: 2012,
    expectedFluidInputMode: 0,
    expectedDefrosting: 0,
    expectedSeries: ['GSHC_3E']
  },
  6: {
    name: 'Oil cooler', side: 'warm', cls: 'E2',
    expectedCapacity: 20000, expectedFluidID: 1002,
    expectedFluidInputMode: 0,
    expectedDefrosting: 0,
    expectedSeries: ['GOHC_2E']
  },
  10: {
    name: 'CO2 Gas Cooler', side: 'warm', cls: 'F',
    expectedCapacity: 180000, expectedFluidID: 41,
    expectedFluidInputMode: 0,
    expectedDefrosting: 0,
    expectedSeries: ['GGHC_2E', 'GGHV_4E'],
    expectedSupercritic: true,
    expectedSubcritic: true,
    expectedSubcriticCapacity: 130000
  }
};

/**
 * Test eine Kategorie — defaultinputdata → drift check → findunits → unitgroup
 */
async function probeCategory(cat) {
  const cfg = CATEGORY_CONFIG[cat];
  head(`Kategorie ${cat} — ${cfg.name} (${cfg.side}-side, Klasse ${cfg.cls})`);

  let driftCount = 0;
  let failed = false;

  // === Stufe A: defaultinputdata ===
  const def = await apiGet('defaultinputdata', { productcategory: cat });
  if (!def.ok || !def.body || !def.body.success || !def.body.content) {
    fail(`defaultinputdata HTTP ${def.status} (${def.ms}ms): ${JSON.stringify(def.body)?.slice(0, 150)}`);
    return { ok: false, code: 'DEFAULTS_FAILED' };
  }
  const uid = def.body.content;
  ok(`defaultinputdata → ${def.status} (${def.ms}ms) · ${Object.keys(uid).length} properties`);

  // Drift-Checks gegen mapping-Doku
  function checkDrift(field, expected) {
    const actual = uid[field];
    if (actual !== expected) {
      warn(`${field} = ${actual}, doc-expected ${expected}`);
      driftCount++;
    } else if (VERBOSE) {
      info(`${field} = ${actual} ✓`);
    }
  }
  checkDrift('thermalCapacity', cfg.expectedCapacity);
  checkDrift('fluidID', cfg.expectedFluidID);
  checkDrift('fluidInputMode', cfg.expectedFluidInputMode);
  checkDrift('defrosting', cfg.expectedDefrosting);
  if (cfg.expectedSupercritic != null) checkDrift('isSupercritic', cfg.expectedSupercritic);
  if (cfg.expectedSubcritic != null) checkDrift('isSubcritic', cfg.expectedSubcritic);
  if (cfg.expectedSubcriticCapacity != null) checkDrift('subcriticThermalCapacity', cfg.expectedSubcriticCapacity);

  if (driftCount === 0) ok(`Drift-Check: alle Defaults stimmen mit Mapping-Doku überein`);
  else warn(`Drift-Check: ${driftCount} Abweichungen (siehe oben)`);

  // === Stufe B: findunits ===
  const find = await apiPost('findunits', uid, { languageID: LANG });
  if (!find.ok || !find.body) {
    fail(`findunits HTTP ${find.status} (${find.ms}ms)${find.error ? ' · ' + find.error : ''}`);
    return { ok: false, code: 'FINDUNITS_FAILED', driftCount };
  }
  if (!find.body.success) {
    fail(`findunits success=false (${find.ms}ms): ${find.body.message || ''}`);
    return { ok: false, code: 'FINDUNITS_NOSUCCESS', driftCount };
  }
  const foundUnits = find.body.foundUnits || [];
  if (foundUnits.length === 0) {
    warn(`findunits → 0 foundUnits (${find.ms}ms) — keine passende Hardware mit Default-Inputs`);
    failed = true;
  } else {
    ok(`findunits → ${foundUnits.length} units (${find.ms}ms)`);
    const u = foundUnits[0];
    sub(`first: ${u.unitModelID_MRNameExternal || '?'} ${u.unitModelID_MTNameExternal || '?'} · cap=${u.thermalCapacity} · weight=${u.unitWeight} · sound=${u.soundPressure}dB(A) · airflow=${u.airVolumeFlow}m³/h`);
    if (!find.body.inputDataMFCBinary) {
      warn(`inputDataMFCBinary fehlt im findunits-Response`);
    }
  }

  // === Stufe C: unitgroup ===
  const ug = await apiPost('unitgroup', uid, { languageID: LANG });
  if (!ug.ok || !ug.body || !ug.body.content) {
    fail(`unitgroup HTTP ${ug.status} (${ug.ms}ms)`);
    return { ok: false, code: 'UNITGROUP_FAILED', driftCount, foundUnits: foundUnits.length };
  }
  const series = ug.body.content || [];
  const visible = series.filter(s => s.visible === true);
  const validVisible = visible.filter(s => s.validationResult === true);
  ok(`unitgroup → ${series.length} total / ${visible.length} visible / ${validVisible.length} valid (${ug.ms}ms)`);
  if (VERBOSE) {
    visible.slice(0, 5).forEach(s => {
      const flag = s.validationResult ? color('green', '●') : color('red', '●');
      sub(`${flag} ${s.unitGroupID} | ${s.serieName}`);
    });
  }

  // === Stufe D: Series pre-selection check ===
  const apiUnits = uid.units || [];
  const missing = cfg.expectedSeries.filter(s => !apiUnits.includes(s));
  if (missing.length === 0) {
    ok(`units[]: ${cfg.expectedSeries.join(', ')} ✓`);
  } else {
    warn(`units[]: erwartete ${cfg.expectedSeries.join(', ')}, fehlend: ${missing.join(', ')} (got: ${apiUnits.join(', ')})`);
    driftCount++;
  }

  return {
    ok: !failed,
    driftCount,
    foundUnits: foundUnits.length,
    seriesVisible: visible.length,
    seriesValid: validVisible.length,
    mfcInputBinary: find.body.inputDataMFCBinary ? find.body.inputDataMFCBinary.length : 0,
    firstUnit: foundUnits[0] || null,
    inputData: uid
  };
}

/**
 * End-to-End-Test: findunits → Pick first → unitbidtext + unitfeatures
 * Beispiel-Kategorie Condenser cat=3, weil dort die Full-Pipeline gut testbar ist.
 */
async function probeEndToEnd(catResult, cat) {
  head(`End-to-End — Datasheet-Pipeline (cat=${cat})`);

  if (!catResult.firstUnit) {
    warn('Keine foundUnit verfügbar — End-to-End-Test übersprungen');
    return { ok: false, code: 'NO_UNIT' };
  }

  const u = catResult.firstUnit;
  const uid = catResult.inputData;

  // unitbidtext braucht MFCInputAndOutputBinary-Body
  const bidBody = {
    mfcInputData: catResult.mfcInputBinary > 0 ? uid._inputDataMFCBinary : null,
    mfcOutputData: u.unitOutPutMFCBinary || '',
    signature: u.signature || ''
  };
  // hack: catResult enthält nicht direkt das mfcInputBinary; nehmen wir es nochmal aus der vorherigen Stufe-Response
  // Workaround: erneuter findunits-Call, um inputDataMFCBinary zu bekommen
  const find = await apiPost('findunits', uid, { languageID: LANG });
  const mfcInputData = find.body && find.body.inputDataMFCBinary;
  if (!mfcInputData) {
    fail(`Kein inputDataMFCBinary verfügbar — kann unitbidtext nicht testen`);
    return { ok: false, code: 'NO_MFC' };
  }
  bidBody.mfcInputData = mfcInputData;

  // unitbidtext
  const bid = await apiPost('unitbidtext', bidBody, { languageID: LANG, unitSystem: 0 });
  if (!bid.ok) {
    fail(`unitbidtext HTTP ${bid.status} (${bid.ms}ms)`);
    return { ok: false, code: 'BIDTEXT_FAILED' };
  }
  const bidText = typeof bid.body === 'string' ? bid.body : JSON.stringify(bid.body);
  ok(`unitbidtext → ${bid.status} (${bid.ms}ms) · ${bidText.length} chars RTF`);
  if (bidText.includes('Technical data') || bidText.includes('Capacity')) {
    sub(`RTF enthält "Technical data" / "Capacity" — Inhalt plausibel`);
  } else {
    warn(`RTF-Inhalt enthält keine erwarteten Marker — evtl. anderes Format als RTF`);
  }

  // unitfeatures
  const feat = await apiPost('unitfeatures', uid, { languageID: LANG, unitSystem: 0 });
  if (!feat.ok || !feat.body) {
    fail(`unitfeatures HTTP ${feat.status} (${feat.ms}ms)`);
    return { ok: false, code: 'FEATURES_FAILED' };
  }
  const featContent = feat.body.content || [];
  if (!feat.body.success) {
    warn(`unitfeatures success=false (${feat.ms}ms): ${feat.body.message || ''}`);
  } else {
    ok(`unitfeatures → ${feat.status} (${feat.ms}ms) · ${featContent.length} features`);
    if (VERBOSE && featContent.length > 0) {
      featContent.slice(0, 5).forEach(f => sub(`${f.key}: ${f.description} (value=${f.value || f.itemValue})`));
    }
  }

  return { ok: true, bidLength: bidText.length, featureCount: featContent.length };
}

(async function main() {
  console.log(color('bold', 'GPC.EU Mapping Probe — Phase 2 Validation'));
  console.log(color('gray', `Base: ${BASE_URL} · Lang: ${LANG} · Verbose: ${VERBOSE}${SINGLE_CAT != null ? ' · Single: cat=' + SINGLE_CAT : ''}`));

  // Stufe 1 — Connectivity
  head('Stufe 1 — Connectivity');
  const v = await apiGet('gpcversion');
  if (!v.ok) {
    fail(`gpcversion HTTP ${v.status}: ${JSON.stringify(v.body)?.slice(0, 200)}`);
    console.log('\n' + color('red', 'Connectivity fehlgeschlagen — ist der Express-Server (rag-server.js) gestartet?'));
    process.exit(1);
  }
  ok(`gpcversion → ${typeof v.body === 'string' ? v.body : JSON.stringify(v.body)} (${v.ms}ms)`);

  // Stufe 2 — Pro Kategorie
  const cats = SINGLE_CAT != null ? [SINGLE_CAT] : Object.keys(CATEGORY_CONFIG).map(Number);
  const results = {};
  for (const cat of cats) {
    if (!CATEGORY_CONFIG[cat]) {
      fail(`Unbekannte Kategorie ${cat} — bekannte: ${Object.keys(CATEGORY_CONFIG).join(', ')}`);
      continue;
    }
    try {
      results[cat] = await probeCategory(cat);
    } catch (err) {
      fail(`Kategorie ${cat} crashed: ${err.message}`);
      results[cat] = { ok: false, code: 'EXCEPTION', error: err.message };
    }
  }

  // Stufe 3 — End-to-End-Sample (nur wenn alle 8 oder cat=3 explizit)
  if (SINGLE_CAT == null || SINGLE_CAT === 3) {
    const sampleCat = 3;
    if (results[sampleCat] && results[sampleCat].ok) {
      results.endToEnd = await probeEndToEnd(results[sampleCat], sampleCat);
    }
  }

  // Stufe 4 — Summary
  head('Summary');
  const catResults = Object.entries(results).filter(([k]) => !isNaN(Number(k)));
  const okCount = catResults.filter(([, r]) => r.ok).length;
  const totalCount = catResults.length;
  const totalDrift = catResults.reduce((s, [, r]) => s + (r.driftCount || 0), 0);

  console.log(`${color('bold', `${okCount}/${totalCount} Kategorien OK`)} · Drift-Warnungen: ${totalDrift}`);
  for (const [cat, r] of catResults) {
    const cfg = CATEGORY_CONFIG[cat];
    const status = r.ok ? color('green', 'OK  ') : color('red', 'FAIL');
    const detail = r.ok
      ? `${r.foundUnits} units · ${r.seriesValid}/${r.seriesVisible} valid series${r.driftCount > 0 ? ` · ${r.driftCount} drift` : ''}`
      : `code=${r.code}`;
    console.log(`  ${status} cat=${cat.toString().padStart(2)} ${cfg.cls.padEnd(2)} ${cfg.name.padEnd(20)} ${detail}`);
  }
  if (results.endToEnd) {
    const e = results.endToEnd;
    const status = e.ok ? color('green', 'OK  ') : color('red', 'FAIL');
    console.log(`  ${status} end-to-end (datasheet pipeline, cat=3)${e.ok ? ` · bid=${e.bidLength}c · ${e.featureCount} features` : ` · code=${e.code}`}`);
  }

  if (okCount === totalCount && totalDrift === 0) {
    console.log('\n' + color('green', 'Alle Stufen OK, kein Drift — Phase 2 erfolgreich.'));
    process.exit(0);
  } else if (okCount === totalCount) {
    console.log('\n' + color('yellow', `Alle Roundtrips OK, aber ${totalDrift} Drift-Warnungen — Mapping-Doku ggf. anpassen.`));
    process.exit(0);
  } else {
    console.log('\n' + color('red', `${totalCount - okCount} Kategorien fehlgeschlagen — siehe oben.`));
    process.exit(2);
  }
})().catch(err => {
  console.error('\n' + color('red', 'Unerwartete Exception:'), err);
  process.exit(99);
});
