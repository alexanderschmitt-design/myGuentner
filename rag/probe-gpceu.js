/**
 * GPC.EU Customer API Probe
 * --------------------------
 * Verifiziert die GPC.EU-Anbindung in vier Stufen:
 *   1. ENV-Prüfung    — GPCEU_BASE_URL + Auth-Daten vorhanden?
 *   2. Login-Probe    — POST /identity/login → JWT erhalten (skipped bei statischem GPCEU_JWT)
 *   3. Version-Call   — GET /gpcversion mit Bearer-Token
 *   4. Smoke-Calls    — productcategories + fluids (gängigste Read-Endpoints)
 *
 * Aufruf:
 *   npm run probe-gpceu
 *
 * Aufrufoptionen:
 *   PROBE_VERBOSE=1 npm run probe-gpceu   # Response-Header & Body-Auszüge zeigen
 *   PROBE_LANG=2    npm run probe-gpceu   # languageID-Param (1=DEU, 2=ENG, …)
 *
 * Exit-Codes:
 *   0  alle Stufen OK
 *   1  ENV unvollständig
 *   2  Login fehlgeschlagen
 *   3  Version-Call fehlgeschlagen
 *   4  Smoke-Calls fehlgeschlagen
 */

require('dotenv').config();

const BASE_URL = (process.env.GPCEU_BASE_URL || '').trim().replace(/\/$/, '');
const STATIC_JWT = (process.env.GPCEU_JWT || '').trim();
const API_KEY = (process.env.GPCEU_API_KEY || process.env.GUENTNER_API_KEY || '').trim();
const EMAIL = (process.env.GPCEU_EMAIL || '').trim();
const PASSWORD = (process.env.GPCEU_PASSWORD || '').trim();
const LOGIN_URL = (process.env.GPCEU_LOGIN_URL || '').trim()
  || (BASE_URL ? BASE_URL.replace(/\/emea\/api\/gpc\/?$/, '') + '/identity/login' : '');
const TIMEOUT_MS = parseInt(process.env.GPCEU_TIMEOUT_MS || '30000', 10);
const VERBOSE = process.env.PROBE_VERBOSE === '1';
const LANG = parseInt(process.env.PROBE_LANG || '2', 10); // 2 = ENG

// Pfad-Prefix für das Test-Backend (apieu-calc-test) ist /api/GPCDataQuery/.
// Das Prod-Backend hatte alles unter Root. Per ENV überschreibbar.
const PATH_PREFIX = (process.env.GPCEU_PATH_PREFIX || 'api/GPCDataQuery').replace(/^\/+|\/+$/g, '');

// Auth-Modus auflösen (gleiche Priorität wie gpceu-auth.getMode())
const MODE = API_KEY ? 'api-key' : (STATIC_JWT ? 'static-jwt' : (EMAIL && PASSWORD ? 'auto-login' : 'none'));

function color(c, s) {
  const codes = { red: 31, green: 32, yellow: 33, blue: 34, gray: 90, bold: 1 };
  return `\x1b[${codes[c] || 0}m${s}\x1b[0m`;
}
function ok(msg)   { console.log(color('green', '[OK]   ') + msg); }
function fail(msg) { console.log(color('red',   '[FAIL] ') + msg); }
function info(msg) { console.log(color('gray',  '[..]   ') + msg); }
function head(msg) { console.log('\n' + color('bold', msg)); }

async function fetchWithTimeout(url, opts) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, Object.assign({}, opts || {}, { signal: ctrl.signal }));
  } finally {
    clearTimeout(t);
  }
}

/** Stufe 1 — ENV */
function checkEnv() {
  head('Stufe 1 — ENV-Prüfung');
  let bad = false;
  if (!BASE_URL) { fail('GPCEU_BASE_URL fehlt in .env'); bad = true; }
  else            ok(`GPCEU_BASE_URL = ${BASE_URL}`);

  ok(`Pfad-Prefix    = /${PATH_PREFIX}/`);

  if (MODE === 'api-key') {
    ok(`Auth-Modus: api-key (X-API-Key, Länge ${API_KEY.length})`);
  } else if (MODE === 'static-jwt') {
    ok(`Auth-Modus: static-jwt (Länge ${STATIC_JWT.length})`);
  } else if (MODE === 'auto-login') {
    ok(`Auth-Modus: auto-login (email=${EMAIL})`);
    if (!LOGIN_URL) { fail('Login-URL konnte nicht abgeleitet werden'); bad = true; }
    else             ok(`Login-URL = ${LOGIN_URL}`);
  } else {
    fail('Keine Auth-Variante gesetzt — setze GPCEU_API_KEY (oder GPCEU_JWT, oder GPCEU_EMAIL+GPCEU_PASSWORD).');
    bad = true;
  }
  return !bad;
}

/** Stufe 2 — Login (falls Auto-Login) */
async function doLogin() {
  head('Stufe 2 — Login-Probe');
  if (MODE === 'api-key') {
    info('API-Key-Modus aktiv — kein Login nötig');
    return API_KEY;
  }
  if (STATIC_JWT) {
    info('Statisches GPCEU_JWT vorhanden — Login wird übersprungen');
    return STATIC_JWT;
  }

  const t0 = Date.now();
  const res = await fetchWithTimeout(LOGIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'myGPC-GPCEU-Probe/1.0',
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const ms = Date.now() - t0;

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    fail(`Login HTTP ${res.status} (${ms} ms): ${text.slice(0, 240)}`);
    return null;
  }

  let body;
  try { body = await res.json(); }
  catch (e) { fail(`Login-Response ist kein JSON: ${e.message}`); return null; }

  const token = body.token || body.accessToken || body.access_token || body.jwt
    || (body.data && (body.data.token || body.data.accessToken)) || null;
  if (!token) {
    fail(`Login-Response enthält kein Token-Feld. Body-Keys: ${Object.keys(body).join(', ')}`);
    return null;
  }
  ok(`Login OK in ${ms} ms — Token-Länge ${token.length}`);

  // exp-Claim ablesen (rein informativ)
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
      if (typeof payload.exp === 'number') {
        const ttl = Math.round(payload.exp - Date.now() / 1000);
        info(`JWT exp-Claim: ${new Date(payload.exp * 1000).toISOString()} (TTL ≈ ${ttl}s)`);
      }
    }
  } catch (_) { /* opaque token — ok */ }
  return token;
}

function buildAuthHeaders(credential) {
  const h = {
    'Accept': 'application/json',
    'User-Agent': 'myGPC-GPCEU-Probe/1.0',
  };
  if (MODE === 'api-key') {
    h['X-API-Key'] = credential;
  } else {
    h['Authorization'] = 'Bearer ' + credential;
  }
  return h;
}

async function callEndpoint(credential, label, path, query) {
  const q = query ? '?' + new URLSearchParams(query).toString() : '';
  const prefixed = PATH_PREFIX ? `${PATH_PREFIX}/${path}` : path;
  const url = BASE_URL + '/' + prefixed + q;
  const t0 = Date.now();
  let res;
  try {
    res = await fetchWithTimeout(url, {
      method: 'GET',
      headers: buildAuthHeaders(credential),
    });
  } catch (err) {
    fail(`${label} → Netz-Fehler nach ${Date.now() - t0} ms: ${err.message}`);
    return { ok: false };
  }
  const ms = Date.now() - t0;
  const text = await res.text().catch(() => '');
  let parsed = null;
  try { parsed = JSON.parse(text); } catch (_) { /* nicht-JSON ist ok bei manchen Endpoints */ }
  if (!res.ok) {
    fail(`${label} → HTTP ${res.status} (${ms} ms): ${text.slice(0, 180)}`);
    return { ok: false };
  }
  let summary = '';
  if (parsed && Array.isArray(parsed)) summary = `${parsed.length} Items`;
  else if (parsed && typeof parsed === 'object') summary = `Keys: ${Object.keys(parsed).slice(0, 6).join(', ')}`;
  else summary = `Body: ${String(parsed || text).slice(0, 60)}`;
  ok(`${label} → ${res.status} (${ms} ms) — ${summary}`);
  if (VERBOSE) info(text.slice(0, 400));
  return { ok: true, parsed };
}

(async function main() {
  console.log(color('bold', 'GPC.EU Customer API — Probe Script'));
  console.log(color('gray', `Spec: rag/gpceu_custromer.json · languageID=${LANG}`));

  if (!checkEnv()) process.exit(1);

  let token;
  try {
    token = await doLogin();
  } catch (err) {
    fail(`Login-Exception: ${err.message}`);
    process.exit(2);
  }
  if (!token) process.exit(2);

  head('Stufe 3 — Version-Call');
  const v = await callEndpoint(token, 'GET /gpcversion', 'gpcversion');
  if (!v.ok) process.exit(3);

  head('Stufe 4 — Smoke-Calls');
  const pc = await callEndpoint(token, 'GET /productcategories', 'productcategories', { languageID: LANG });
  const fl = await callEndpoint(token, 'GET /fluids', 'fluids', { languageID: LANG });
  if (!pc.ok || !fl.ok) process.exit(4);

  console.log('\n' + color('green', 'Alle Stufen OK — GPC.EU-Anbindung ist live.'));
})().catch(err => {
  console.error('\n' + color('red', 'Unerwartete Exception:'), err);
  process.exit(99);
});
