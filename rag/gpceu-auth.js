/**
 * GPC.EU Auth Helper — drei Auth-Modi
 * ------------------------------------
 *
 * Variante A — Static JWT (Read-Only-Tests):
 *   GPCEU_JWT=<token>  → wird unverändert als `Authorization: Bearer …` benutzt.
 *
 * Variante B — Auto-Login (klassischer Service-Account, ASP.NET-Identity):
 *   GPCEU_EMAIL + GPCEU_PASSWORD → POST /identity/login → JWT.
 *   Token wird im Memory gecached, `exp`-Claim getriggert Refresh,
 *   parallele Login-Versuche werden dedupliziert.
 *
 * Variante C — API-Key (neues Test-Backend apieu-calc-test.azurewebsites.net):
 *   GPCEU_API_KEY (oder Alias GUENTNER_API_KEY) → wird als `X-API-Key`-Header
 *   bei jedem Request mitgegeben. Kein Login, kein Caching, kein Refresh.
 *
 * Priorität bei mehreren gesetzten Variablen: A → B → C wird in dieser Reihenfolge
 * NICHT erzwungen — der Proxy fragt `getMode()` und handelt entsprechend.
 * Implizit: API-Key gewinnt, wenn gesetzt (weil das der aktuelle Test-Endpoint ist).
 */

require('dotenv').config();

const BASE_URL = (process.env.GPCEU_BASE_URL || '').trim().replace(/\/$/, '');
// Login-URL ableiten: BASE_URL hat das /emea/api/gpc-Suffix — wir strippen das
// und hängen /identity/login an. Per ENV überschreibbar für unerwartete Setups.
const LOGIN_URL = (process.env.GPCEU_LOGIN_URL || '').trim()
  || (BASE_URL ? BASE_URL.replace(/\/emea\/api\/gpc\/?$/, '') + '/identity/login' : '');

const EMAIL = (process.env.GPCEU_EMAIL || '').trim();
const PASSWORD = (process.env.GPCEU_PASSWORD || '').trim();
const STATIC_JWT = (process.env.GPCEU_JWT || '').trim();
// API-Key-Modus — zwei akzeptierte ENV-Namen, GPCEU_API_KEY ist der bevorzugte.
const API_KEY = (process.env.GPCEU_API_KEY || process.env.GUENTNER_API_KEY || '').trim();

// In-Memory-State (Module-Level — ein Token pro Server-Prozess)
let cachedToken = null;
let cachedExpiryMs = 0;
let lastLoginAt = null;
let lastLoginError = null;
// Inflight-Promise — verhindert, dass 50 parallele Requests 50 parallele Logins triggern
let loginInflight = null;

/**
 * Decodiert eine JWT-Payload (Base64URL-encoded JSON) und liest die `exp`-Claim.
 * Falls keine Expiry-Info enthalten ist, default = jetzt + 1 h (defensiv).
 *
 * @param {string} jwt
 * @returns {number}  Unix-Timestamp in MILLISEKUNDEN
 */
function parseJwtExpiry(jwt) {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return Date.now() + 3600 * 1000;
    // Base64URL → Base64 (replace - mit +, _ mit /, padding ergänzen)
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    if (typeof payload.exp === 'number') {
      return payload.exp * 1000; // exp ist in Sekunden, wir wollen Millisekunden
    }
  } catch (e) {
    // JWT ist opaque oder nicht-Standard → unkritisch, wir nutzen den Default
  }
  return Date.now() + 3600 * 1000;
}

/**
 * Führt den eigentlichen Login durch.
 * Nicht direkt aufrufen — über getToken() gehen, das dedupliziert.
 */
async function doLogin() {
  if (!LOGIN_URL) {
    throw new Error('GPCEU_LOGIN_URL konnte nicht abgeleitet werden — GPCEU_BASE_URL fehlt in .env.');
  }
  if (!EMAIL || !PASSWORD) {
    throw new Error('GPCEU_EMAIL und GPCEU_PASSWORD müssen in .env gesetzt sein für Auto-Login.');
  }

  const t0 = Date.now();
  console.log('[GPCEU-Auth] Login → ' + LOGIN_URL + ' (email=' + EMAIL + ')');

  const res = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'myGPC-GPCEU-Auth/1.0',
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(function() { return ''; });
    const errSnippet = errText.slice(0, 240);
    lastLoginError = 'HTTP ' + res.status + ': ' + errSnippet;
    throw new Error('Login fehlgeschlagen (' + res.status + '): ' + errSnippet);
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error('Login-Response ist kein JSON: ' + e.message);
  }

  // Token-Feld flexibel suchen — verschiedene Backend-Konventionen
  const token =
    data.token ||
    data.accessToken ||
    data.access_token ||
    data.jwt ||
    (data.data && (data.data.token || data.data.accessToken)) ||
    null;

  if (!token) {
    throw new Error('Login-Response enthält kein Token in den erwarteten Feldern (token/accessToken/access_token/jwt). Body: ' +
      JSON.stringify(data).slice(0, 240));
  }

  cachedToken = token;
  cachedExpiryMs = parseJwtExpiry(token);
  lastLoginAt = new Date().toISOString();
  lastLoginError = null;

  const ttlSec = Math.round((cachedExpiryMs - Date.now()) / 1000);
  console.log('[GPCEU-Auth] Login OK in ' + (Date.now() - t0) + 'ms, JWT TTL ≈ ' + ttlSec + 's');

  return token;
}

/**
 * Liefert den aktiven Auth-Modus.
 * Reihenfolge der Erkennung:
 *   1. API-Key (neuer Test-Endpoint) — gewinnt, wenn gesetzt
 *   2. Static JWT
 *   3. Auto-Login (email/password)
 *   4. 'none' — Proxy gibt dann 401 zurück
 *
 * @returns {'api-key'|'static-jwt'|'auto-login'|'none'}
 */
function getMode() {
  if (API_KEY) return 'api-key';
  if (STATIC_JWT) return 'static-jwt';
  if (EMAIL && PASSWORD) return 'auto-login';
  return 'none';
}

/**
 * Liefert den API-Key (für `X-API-Key`-Header). Wirft, wenn nicht gesetzt.
 * @returns {string}
 */
function getApiKey() {
  if (!API_KEY) {
    throw new Error('GPCEU_API_KEY (oder GUENTNER_API_KEY) ist nicht gesetzt.');
  }
  return API_KEY;
}

/**
 * Liefert einen gültigen JWT-Token zurück.
 * - Bei statischem GPCEU_JWT: gibt den unverändert raus
 * - Sonst: cached, falls Token noch gültig (mit 30 s Sicherheitspuffer); login() ansonsten
 * - Inflight-Dedup: parallele Aufrufe triggern nur EINEN Login
 *
 * @param {boolean} [forceRefresh=false]  Cache invalidieren und neu loggen (für 401-Retry)
 * @returns {Promise<string>}
 */
async function getToken(forceRefresh) {
  if (STATIC_JWT) return STATIC_JWT;

  if (!forceRefresh && cachedToken && Date.now() < cachedExpiryMs - 30000) {
    return cachedToken;
  }

  // Inflight-Dedup
  if (loginInflight) return loginInflight;

  loginInflight = doLogin().finally(function() {
    loginInflight = null;
  });
  return loginInflight;
}

/**
 * Token-Cache löschen — wird vom Proxy bei 401-Upstream aufgerufen,
 * damit der nächste getToken()-Aufruf zwingend neu loggt.
 */
function clearToken() {
  cachedToken = null;
  cachedExpiryMs = 0;
}

/**
 * Debug/Status-Info für /api/gpc-eu/health und System-Status.
 */
function status() {
  const mode = getMode();
  return {
    mode: mode,
    loginUrl: mode === 'auto-login' ? LOGIN_URL : null,
    hasApiKey: !!API_KEY,
    hasCredentials: !!(EMAIL && PASSWORD),
    hasStaticJwt: !!STATIC_JWT,
    cachedTokenValid: mode === 'api-key' ? true : (!!cachedToken && Date.now() < cachedExpiryMs),
    cachedTokenExpiresAt: cachedExpiryMs ? new Date(cachedExpiryMs).toISOString() : null,
    lastLoginAt: lastLoginAt,
    lastLoginError: lastLoginError,
  };
}

module.exports = {
  getMode,
  getApiKey,
  getToken,
  clearToken,
  status,
};
