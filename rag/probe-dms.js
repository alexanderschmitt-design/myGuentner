/**
 * d.velop d.3one DMS Probe Script
 * --------------------------------
 * Empirisch herausfinden:
 *   1. welche Auth-Methode mit dem konfigurierten DMS_API_KEY funktioniert
 *      (Bearer / Session-Cookie / Custom-Header)
 *   2. welches URL-Pattern für Content-Abruf gilt
 *      (literal vs. dmsId substituiert vs. o2m-Variante)
 *   3. ob /srm/ (Search) und /source (Source-Liste) erreichbar sind
 *
 * Aufruf:
 *   node rag/probe-dms.js
 *
 * Aufrufoptionen:
 *   PROBE_VERBOSE=1 node rag/probe-dms.js   # zeigt Response-Header & Body-Auszüge
 *   PROBE_ONLY=test node rag/probe-dms.js   # nur Test-Umgebung (Default: test+prod)
 */

require('dotenv').config();

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------
const BASE_TEST = process.env.DMS_BASE_URL_TEST || 'https://dms-test.guentner.com';
const BASE_PROD = process.env.DMS_BASE_URL_PROD || 'https://dms-prod.guentner.com';

// Bevorzugt aus .env, sonst der Wert aus der Beispiel-URL des Admins
const KNOWN_REPO_FROM_EXAMPLE = 'cffcc398-5466-586f-921f-4655e26f70e0';
const REPO_ID = process.env.DMS_REPOSITORY_ID && process.env.DMS_REPOSITORY_ID.length > 20
  ? process.env.DMS_REPOSITORY_ID
  : KNOWN_REPO_FROM_EXAMPLE;

const DMS_KEY = (process.env.DMS_API_KEY || '').trim();
const SAMPLE_DMS_ID = 'P002925864';

const VERBOSE = process.env.PROBE_VERBOSE === '1';
const ONLY = (process.env.PROBE_ONLY || 'both').toLowerCase(); // 'test' | 'prod' | 'both'

// ---------------------------------------------------------------------------
// Auth-Header-Matrix
// ---------------------------------------------------------------------------
function buildHeaders(mode) {
  const h = {
    Accept: 'application/hal+json, application/json, */*',
    'User-Agent': 'myGPC-DMS-Probe/0.1',
  };
  switch (mode) {
    case 'bearer':
      h.Authorization = `Bearer ${DMS_KEY}`;
      break;
    case 'session-cookie':
      h.Cookie = `AuthSessionId=${DMS_KEY}`;
      break;
    case 'session-header':
      h.Authorization = `Bearer ${DMS_KEY}`;
      break;
    case 'apikey-header':
      h['x-dv-apikey'] = DMS_KEY;
      break;
    case 'apikey-sig':
      // d.velop Signed-Request Variante mit "x-dv-sig-1" Header (selten)
      h['x-dv-sig-1'] = DMS_KEY;
      break;
    case 'no-auth':
      // Kontrollprobe — soll i.d.R. 401 oder Login-Redirect auslösen
      break;
    default:
      throw new Error(`Unknown auth mode: ${mode}`);
  }
  return h;
}

const ALL_AUTH_MODES = [
  'bearer',
  'session-cookie',
  'apikey-header',
  'apikey-sig',
  'no-auth',
];

// ---------------------------------------------------------------------------
// HTTP-Helfer
// ---------------------------------------------------------------------------
async function tryRequest(url, mode, opts = {}) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers: buildHeaders(mode),
      redirect: 'manual',
    });
    const duration = Date.now() - start;
    const ct = res.headers.get('content-type') || '';
    const cl = res.headers.get('content-length') || '';
    const loc = res.headers.get('location') || '';
    const setCookie = res.headers.get('set-cookie') || '';

    let bodyPreview = null;
    if (res.status < 400 && (ct.includes('json') || ct.startsWith('text/'))) {
      try {
        const text = await res.text();
        bodyPreview = text.slice(0, 600);
      } catch { /* ignore */ }
    } else if (res.status < 400 && cl) {
      bodyPreview = `[binary ${cl} bytes]`;
    } else if (res.status >= 400) {
      try {
        const text = await res.text();
        bodyPreview = text.slice(0, 200);
      } catch { /* ignore */ }
    }

    return {
      url, mode, status: res.status, contentType: ct, contentLength: cl,
      location: loc, setCookie, duration, bodyPreview,
      ok: res.ok,
    };
  } catch (err) {
    return { url, mode, error: err.message, duration: Date.now() - start };
  }
}

function statusIcon(r) {
  if (r.error) return '💥';
  if (r.ok) return '✅';
  if (r.status === 401 || r.status === 403) return '🔒';
  if (r.status === 404) return '❓';
  if (r.status >= 300 && r.status < 400) return '↪️';
  return '❌';
}

function fmt(r) {
  const status = r.error ? `ERR: ${r.error}` : `HTTP ${r.status}`;
  const ct = r.contentType ? ` ${r.contentType.split(';')[0]}` : '';
  const cl = r.contentLength ? ` ${r.contentLength}B` : '';
  const dur = ` ${r.duration}ms`;
  return `${statusIcon(r)} [${r.mode.padEnd(15)}] ${status.padEnd(20)}${ct}${cl}${dur}\n   ${r.url}`;
}

function printDetails(r) {
  if (!VERBOSE) return;
  if (r.location) console.log(`   ↪ Location: ${r.location}`);
  if (r.setCookie) console.log(`   🍪 Set-Cookie: ${r.setCookie.slice(0, 120)}…`);
  if (r.bodyPreview) {
    const lines = r.bodyPreview.split('\n').slice(0, 6).map(l => '      ' + l).join('\n');
    console.log(lines);
  }
}

// ---------------------------------------------------------------------------
// Probe-Phasen
// ---------------------------------------------------------------------------
async function phase(label, urls, modes, hint = '') {
  console.log(`\n--- ${label} ---`);
  if (hint) console.log(`   (${hint})`);
  const winners = [];
  for (const url of urls) {
    for (const mode of modes) {
      const r = await tryRequest(url, mode);
      console.log(fmt(r));
      printDetails(r);
      if (r.ok) winners.push(r);
    }
  }
  return winners;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  d.velop d.3one DMS Probe');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Test-URL:       ${BASE_TEST}`);
  console.log(`Prod-URL:       ${BASE_PROD}`);
  console.log(`Repository-ID:  ${REPO_ID}`);
  console.log(`Sample dmsId:   ${SAMPLE_DMS_ID}`);
  console.log(`API-Key Länge:  ${DMS_KEY.length} Zeichen`);
  console.log(`API-Key Anfang: ${DMS_KEY.slice(0, 16)}…`);
  console.log(`Auth-Modes:     ${ALL_AUTH_MODES.join(', ')}`);
  console.log(`Verbose:        ${VERBOSE ? 'JA (Body-Auszüge werden gezeigt)' : 'nein (PROBE_VERBOSE=1 zum Aktivieren)'}`);

  if (!DMS_KEY) {
    console.error('\n💥 DMS_API_KEY ist leer in .env — Abbruch.');
    process.exit(1);
  }

  const bases = ONLY === 'test' ? [BASE_TEST]
              : ONLY === 'prod' ? [BASE_PROD]
              : [BASE_TEST, BASE_PROD];

  // ────────────────────────────────────────────────────────────────────
  // Phase 1 — Auth-Methode an Root-Endpoints feststellen
  // ────────────────────────────────────────────────────────────────────
  const rootUrls = bases.flatMap(b => [
    `${b}/dms/`,                    // d.velop App-Root, sollte HAL+JSON liefern
    `${b}/dms/r/`,                  // Repository-Liste
    `${b}/dms/r/${REPO_ID}`,        // Spezifisches Repository-Root
  ]);

  const phase1Winners = await phase(
    'Phase 1: Auth-Methode discoverern (Root-Endpoints)',
    rootUrls,
    ALL_AUTH_MODES,
    'Wir suchen den ersten 200-OK Response. 401/403 = Auth falsch. 302 = Login-Redirect (Cookie nötig).'
  );

  // Working Mode bestimmen — der häufigste unter den Winners
  const modeCounts = {};
  phase1Winners.forEach(w => { modeCounts[w.mode] = (modeCounts[w.mode] || 0) + 1; });
  const workingModes = Object.entries(modeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => m);

  if (workingModes.length === 0) {
    console.log('\n⚠ Keine Auth-Methode hat auf Root-Endpoints funktioniert.');
    console.log('  Wir probieren in Phase 2 alle Methoden — vielleicht liefert der Server für Root-Zugriff bewusst kein 200, aber für Object-Zugriff schon.\n');
  } else {
    console.log(`\n→ Funktionierende Auth-Methode(n): ${workingModes.join(', ')}`);
  }

  const modesForRest = workingModes.length > 0 ? workingModes : ALL_AUTH_MODES.filter(m => m !== 'no-auth');

  // ────────────────────────────────────────────────────────────────────
  // Phase 2 — URL-Pattern für Content-Abruf finden
  // ────────────────────────────────────────────────────────────────────
  // Wir probieren BEIDE Interpretationen der Admin-URL:
  //  (a) literal ("dmsId" ist Pfadsegment, Wert kommt woanders her)
  //  (b) substituiert ("dmsId" wird durch P002925864 ersetzt)
  // sowie typische d.velop-Patterns (o2 vs. o2m).
  const contentUrls = bases.flatMap(b => [
    // Variante A — literal wie vom Admin geschickt
    `${b}/dms/r/${REPO_ID}/o2/dmsId/v/1_1/b/main/c`,

    // Variante B — Wert hinter "dmsId" eingesetzt (Standard d.velop o2-Schema: source/key/value)
    `${b}/dms/r/${REPO_ID}/o2/dmsId/${SAMPLE_DMS_ID}/v/1_1/b/main/c`,

    // Variante C — o2m (multi-source query nach key/value)
    `${b}/dms/r/${REPO_ID}/o2m/dmsId/${SAMPLE_DMS_ID}/v/1_1/b/main/c`,

    // Variante D — Object ohne Versionspfad (neueste Version implizit)
    `${b}/dms/r/${REPO_ID}/o2/dmsId/${SAMPLE_DMS_ID}`,

    // Variante E — Object mit /b/main aber ohne /v/
    `${b}/dms/r/${REPO_ID}/o2/dmsId/${SAMPLE_DMS_ID}/b/main/c`,
  ]);

  const phase2Winners = await phase(
    'Phase 2: Content-URL-Pattern testen',
    contentUrls,
    modesForRest,
    `Wir probieren 5 URL-Varianten, um zu sehen welche der Server akzeptiert.`
  );

  // ────────────────────────────────────────────────────────────────────
  // Phase 3 — Metadaten-Endpoint
  // ────────────────────────────────────────────────────────────────────
  const metaUrls = bases.flatMap(b => [
    `${b}/dms/r/${REPO_ID}/o2/dmsId/${SAMPLE_DMS_ID}/v/1_1/b/main`,
    `${b}/dms/r/${REPO_ID}/o2/dmsId/${SAMPLE_DMS_ID}/v/current`,
    `${b}/dms/r/${REPO_ID}/o2m/dmsId/${SAMPLE_DMS_ID}`,
  ]);

  await phase(
    'Phase 3: Metadaten-Endpoints',
    metaUrls,
    modesForRest,
    'Liefert idealerweise JSON mit Property-Liste (Titel, Größe, Version, …) — wichtig für Connector.'
  );

  // ────────────────────────────────────────────────────────────────────
  // Phase 4 — Search-Endpoint (für /api/dms/search)
  // ────────────────────────────────────────────────────────────────────
  const searchUrls = bases.flatMap(b => [
    `${b}/dms/r/${REPO_ID}/srm/`,
    `${b}/dms/r/${REPO_ID}/srm`,
    `${b}/dms/r/${REPO_ID}/source`,
    `${b}/dms/r/${REPO_ID}/o2/dmsId/${SAMPLE_DMS_ID}/relations`,
  ]);

  await phase(
    'Phase 4: Search- und Source-Endpoints',
    searchUrls,
    modesForRest,
    'Wir brauchen einen funktionierenden Search-Endpoint, um die Frontend-Modal-Liste mit echten Dokumenten zu füllen.'
  );

  // ────────────────────────────────────────────────────────────────────
  // Phase 5 — Versions-Iteration (Probe für getLatestVersion-Logik)
  // ────────────────────────────────────────────────────────────────────
  console.log('\n--- Phase 5: Versions-Iteration (1_1 → 1_2 → 2_0 → …) ---');
  console.log('   Wir testen welche Versions-Pfade der Server liefert (relevant für getLatestVersion()).');
  const versionTries = ['1_1', '1_2', '2_0', '2_1', '3_0', 'current', 'latest'];
  // Variante mit der erfolgreichsten Pattern aus Phase 2 — falls keine, nehmen wir die wahrscheinlichste
  const winner2 = phase2Winners[0];
  const baseUrlForVersion = winner2
    ? winner2.url.replace(/\/v\/[^/]+\/b\/main\/c$/, '').replace(/\/o2\/[^/]+\/[^/]+$/, m => m)
    : `${BASE_PROD}/dms/r/${REPO_ID}/o2/dmsId/${SAMPLE_DMS_ID}`;

  for (const v of versionTries) {
    const url = `${baseUrlForVersion}/v/${v}/b/main/c`;
    const r = await tryRequest(url, modesForRest[0] || 'bearer');
    console.log(fmt(r));
  }

  // ────────────────────────────────────────────────────────────────────
  // Zusammenfassung
  // ────────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Zusammenfassung');
  console.log('═══════════════════════════════════════════════════════════════');
  if (workingModes.length > 0) {
    console.log(`✅ Auth-Methode(n) die funktioniert haben: ${workingModes.join(', ')}`);
    console.log(`   → in .env setzen: DMS_AUTH_MODE=${workingModes[0]}`);
  } else {
    console.log('❌ Keine der getesteten Auth-Methoden hat 200-OK auf Root-Endpoints geliefert.');
    console.log('   Bitte beim Admin nachfragen: Bearer-Token, Session-Cookie oder eigener Header?');
  }
  if (phase2Winners.length > 0) {
    console.log(`✅ Content-URL-Pattern: ${phase2Winners[0].url}`);
  } else {
    console.log('❌ Keine Content-URL-Variante hat 200-OK geliefert.');
  }
  console.log('\nWeitere Diagnose: PROBE_VERBOSE=1 node rag/probe-dms.js');
  console.log('═══════════════════════════════════════════════════════════════\n');
})().catch(err => {
  console.error('Probe-Skript abgebrochen:', err);
  process.exit(1);
});
