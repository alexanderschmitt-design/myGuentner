/**
 * GPC.EU Customer API Proxy
 * --------------------------
 * Reverse-Proxy zwischen der Nuxt-App (bzw. Browser) und der offiziellen
 * Güntner-GPC-EU-API. Injiziert JWT-Bearer-Token und hängt die Base-URL an,
 * damit der Token nie im Browser landet.
 *
 * OpenAPI-Spec: rag/gpceu_custromer.json (32 Endpoints, Version 2026.8-317).
 *
 * Routen-Pattern (im rag-server.js gemounted):
 *   ALL  /api/gpc-eu/*   → Proxy zur GPC-EU-API mit JWT-Injection
 *   GET  /api/gpc-eu/health → Konnektivitäts-Probe (ruft /gpcversion durch)
 *
 * Auth: Authorization: Bearer <GPCEU_JWT>
 * Config: ENV GPCEU_BASE_URL + GPCEU_JWT (siehe .env)
 *
 * Design-Entscheidungen:
 *  - Nicht throwen wenn ENV fehlt — Server startet trotzdem; Proxy gibt 503
 *    mit klarer Fehlermeldung zurück. Macht Phase-1-Test ohne echte Credentials möglich.
 *  - Spiegelt das Retry-Pattern aus rag/dms-connector.js (Backoff bei 5xx/429).
 *  - Streamt Response-Body direkt durch — kein JSON-Parsing im Proxy, damit auch
 *    Binary-Endpoints (z.B. getgpcfilecontent) funktionieren.
 */

require('dotenv').config();
const gpceuAuth = require('./gpceu-auth');
const gpceuMock = require('./gpceu-mock');

const BASE_URL = (process.env.GPCEU_BASE_URL || '').trim().replace(/\/$/, '');
const STATIC_JWT = (process.env.GPCEU_JWT || '').trim();
const HAS_CREDENTIALS = !!(process.env.GPCEU_EMAIL || '').trim() && !!(process.env.GPCEU_PASSWORD || '').trim();
const HAS_API_KEY = !!(process.env.GPCEU_API_KEY || process.env.GUENTNER_API_KEY || '').trim();
const REQUEST_TIMEOUT_MS = parseInt(process.env.GPCEU_TIMEOUT_MS || '30000', 10);
const MOCK_ENABLED = gpceuMock.isEnabled();
// Pfad-Prefix — wird vor jeden Sub-Path gehängt.
// Test-Backend (apieu-calc-test):   GPCEU_PATH_PREFIX=api/GPCDataQuery
// Prod-Backend (api.portal-…):       GPCEU_PATH_PREFIX=  (leer, alle Endpoints unter Root)
const PATH_PREFIX = (process.env.GPCEU_PATH_PREFIX || 'api/GPCDataQuery').replace(/^\/+|\/+$/g, '');

// Health-Pfad konfigurierbar — Default ist (Prefix + 'gpcversion'),
// kann aber via GPCEU_HEALTH_PATH komplett überschrieben werden (vollständiger
// Pfad ohne führenden Slash, ohne BASE_URL).
const HEALTH_PATH = (process.env.GPCEU_HEALTH_PATH
  || (PATH_PREFIX ? PATH_PREFIX + '/gpcversion' : 'gpcversion')).replace(/^\/+/, '');

/**
 * Setzt den Pfad-Prefix vor einen Sub-Path. Idempotent: wenn der Sub-Path
 * den Prefix bereits trägt, wird er nicht verdoppelt — wichtig, falls ein
 * Caller den vollen Pfad mitgibt.
 */
function withPrefix(subpath) {
  var clean = subpath.replace(/^\/+/, '');
  if (!PATH_PREFIX) return clean;
  if (clean === PATH_PREFIX || clean.indexOf(PATH_PREFIX + '/') === 0) return clean;
  return PATH_PREFIX + '/' + clean;
}

const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 400;

if (MOCK_ENABLED) {
  console.warn('[GPCEU] MOCK-MODUS aktiv (GPCEU_MOCK=1) — alle /api/gpc-eu/*-Requests bekommen Fixture-Daten aus rag/gpceu-mock.js.');
} else {
  if (!BASE_URL) {
    console.warn('[GPCEU] GPCEU_BASE_URL ist nicht gesetzt — Proxy gibt 503 zurück bis die ENV-Variable gesetzt ist.');
  }
  if (!STATIC_JWT && !HAS_CREDENTIALS && !HAS_API_KEY) {
    console.warn('[GPCEU] Keine Auth-Konfiguration (GPCEU_API_KEY / GPCEU_JWT / GPCEU_EMAIL+GPCEU_PASSWORD) — Proxy gibt 401 zurück bis Auth konfiguriert ist.');
  } else {
    console.log('[GPCEU] Auth-Modus: ' + gpceuAuth.getMode() + ' · Base-URL: ' + BASE_URL);
  }
}

function sleep(ms) {
  return new Promise(function(r) { setTimeout(r, ms); });
}

/**
 * Baut die ausgehenden Headers — entweder X-API-Key (Test-Backend) oder
 * Authorization: Bearer (Prod-Backend mit JWT). Wird auf Basis des aktuellen
 * Auth-Modus entschieden.
 *
 * @param {string|null} credential  Bearer-Token (JWT-Mode) ODER API-Key (api-key-Mode)
 * @param {object} [incomingReq]    Express-Request für Header-Pass-Through
 */
function buildHeaders(credential, incomingReq) {
  var mode = gpceuAuth.getMode();
  var h = {
    'Accept': 'application/json',
    'User-Agent': 'myGPC-GPCEU-Proxy/1.0',
  };
  if (mode === 'api-key') {
    h['X-API-Key'] = credential;
  } else {
    h['Authorization'] = 'Bearer ' + credential;
  }
  // Body-haltige Methoden brauchen Content-Type
  if (incomingReq && incomingReq.method !== 'GET' && incomingReq.method !== 'HEAD') {
    h['Content-Type'] = 'application/json';
  }
  // Accept-Language wird durchgereicht, wenn der Client eine Präferenz hat —
  // die GPC-API hat einen languageID-Query-Param, aber manche Endpoints honorieren
  // auch den Header. Pass-Through schadet nicht.
  if (incomingReq && incomingReq.headers && incomingReq.headers['accept-language']) {
    h['Accept-Language'] = incomingReq.headers['accept-language'];
  }
  return h;
}

/**
 * Einheitliches Fehlerobjekt für alle Konfigurations-/Verbindungsprobleme.
 * Macht Frontend-Error-Handling deterministisch.
 */
function configError(res) {
  if (!BASE_URL) {
    return res.status(503).json({
      ok: false,
      error: 'GPCEU_BASE_URL ist nicht gesetzt in .env',
      code: 'PROXY_CONFIG_MISSING',
      hint: 'Setze GPCEU_BASE_URL=https://<host>/emea/api/gpc in .env und starte rag-server neu.',
    });
  }
  if (!STATIC_JWT && !HAS_CREDENTIALS && !HAS_API_KEY) {
    return res.status(401).json({
      ok: false,
      error: 'Keine Auth-Konfiguration vorhanden',
      code: 'PROXY_AUTH_MISSING',
      hint: 'Setze GPCEU_API_KEY=<key> (Test-Backend) ODER GPCEU_JWT=<token> ODER GPCEU_EMAIL=<email>+GPCEU_PASSWORD=<pw> in .env und starte rag-server neu.',
    });
  }
  return null;
}

/**
 * Holt die Credentials für den aktuellen Auth-Modus.
 * Im API-Key-Modus: sofort (sync); im JWT-Modus: ggf. async via Login.
 * @param {boolean} [forceRefresh]
 * @returns {Promise<string>}
 */
async function getCredential(forceRefresh) {
  if (gpceuAuth.getMode() === 'api-key') {
    return gpceuAuth.getApiKey();
  }
  return gpceuAuth.getToken(forceRefresh);
}

/**
 * Ruft die GPC-EU-API mit Retry-Logik.
 * Gibt das `fetch`-Response-Objekt zurück — der Caller pipet den Body weiter.
 *
 * @param {string} targetUrl  Vollständige URL inkl. Query-String
 * @param {object} opts       method, headers, body
 * @returns {Promise<Response>}
 */
async function gpceuFetch(targetUrl, opts) {
  opts = opts || {};
  var lastError = null;

  for (var attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      var controller = new AbortController();
      var timer = setTimeout(function() { controller.abort(); }, REQUEST_TIMEOUT_MS);

      var res = await fetch(targetUrl, {
        method: opts.method || 'GET',
        headers: opts.headers,
        body: opts.body,
        signal: controller.signal,
      });
      clearTimeout(timer);

      // Retry bei transienten 5xx/429
      if (RETRY_STATUS.has(res.status) && attempt < MAX_RETRIES) {
        var backoff = BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
        console.warn('[GPCEU] ' + res.status + ' auf ' + targetUrl + ' — Retry in ' + backoff + 'ms (' + (attempt + 1) + '/' + MAX_RETRIES + ')');
        await sleep(backoff);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      // Bei Network-Fehlern auch retryen
      if (attempt < MAX_RETRIES) {
        var bo = BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
        console.warn('[GPCEU] Network-Error ' + err.message + ' — Retry in ' + bo + 'ms');
        await sleep(bo);
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error('Unbekannter Fehler bei GPC-EU-Request');
}

/**
 * Express-Handler — fängt alle Requests unter /api/gpc-eu/* ab und proxied sie.
 * Die GPC-Pfad-Komponente wird aus req.params[0] genommen (express '*'-Wildcard).
 */
/**
 * Führt einen einzelnen Upstream-Call durch — kommt aus proxyHandler raus,
 * damit der 401-Retry-Pfad denselben Code nutzen kann.
 */
async function callUpstream(targetUrl, method, body, token, incomingReq) {
  return gpceuFetch(targetUrl, {
    method: method,
    headers: buildHeaders(token, incomingReq),
    body: body,
  });
}

async function proxyHandler(req, res) {
  // Health-Endpoint hat eigene Behandlung — fängt vor dem allgemeinen Proxy
  var subpath = req.params[0] || req.url.replace(/^\/api\/gpc-eu\/?/, '');
  if (!subpath || subpath === 'health') {
    return healthHandler(req, res);
  }

  // Mock-Mode: short-circuit vor Auth/Network. Wenn GPCEU_MOCK=1, liefert
  // gpceu-mock.js Fixture-Daten und der Upstream wird gar nicht erst kontaktiert.
  if (MOCK_ENABLED) {
    var mock = gpceuMock.handle(subpath, req.method, req.body);
    console.log('[GPCEU-MOCK] ' + req.method + ' ' + subpath + ' → ' + mock.status);
    res.status(mock.status);
    if (typeof mock.body === 'string') {
      res.set('Content-Type', 'text/plain; charset=utf-8').send(mock.body);
    } else {
      res.json(mock.body);
    }
    return;
  }

  var configErr = configError(res);
  if (configErr) return; // 503 oder 401 bereits gesendet

  var query = req.url.indexOf('?') >= 0 ? req.url.substring(req.url.indexOf('?')) : '';
  var targetUrl = BASE_URL + '/' + withPrefix(subpath) + query;

  var t0 = Date.now();
  try {
    var body = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = req.body ? JSON.stringify(req.body) : null;
    }

    // Credential holen (API-Key sync ODER JWT cached/login)
    var credential;
    try {
      credential = await getCredential();
    } catch (authErr) {
      return res.status(401).json({
        ok: false,
        error: authErr.message,
        code: 'PROXY_AUTH_FAILED',
        durationMs: Date.now() - t0,
      });
    }

    var upstream = await callUpstream(targetUrl, req.method, body, credential, req);

    // 401-Refresh-Flow nur sinnvoll im JWT-Auto-Login-Modus
    // (statisches JWT und API-Key haben keinen Refresh-Mechanismus).
    var mode = gpceuAuth.getMode();
    if (upstream.status === 401 && mode === 'auto-login') {
      console.warn('[GPCEU] 401 vom Upstream — Token-Refresh und Retry');
      gpceuAuth.clearToken();
      var freshToken;
      try {
        freshToken = await gpceuAuth.getToken(true);
      } catch (reAuthErr) {
        var elapsedRe = Date.now() - t0;
        return res.status(401).json({
          ok: false,
          error: 'Token-Refresh fehlgeschlagen: ' + reAuthErr.message,
          code: 'PROXY_AUTH_REFRESH_FAILED',
          durationMs: elapsedRe,
        });
      }
      upstream = await callUpstream(targetUrl, req.method, body, freshToken, req);
    }

    var elapsed = Date.now() - t0;
    console.log('[GPCEU] ' + req.method + ' ' + subpath + ' → ' + upstream.status + ' (' + elapsed + 'ms)');

    // Headers durchreichen (Content-Type insbesondere)
    var ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    res.status(upstream.status);

    // Body durchstreamen — funktioniert sowohl für JSON als auch für Binärdaten
    if (upstream.body) {
      var reader = upstream.body.getReader();
      while (true) {
        var chunk = await reader.read();
        if (chunk.done) break;
        res.write(Buffer.from(chunk.value));
      }
    }
    res.end();
  } catch (err) {
    var elapsedErr = Date.now() - t0;
    console.error('[GPCEU] ' + req.method + ' ' + subpath + ' FEHLER nach ' + elapsedErr + 'ms:', err.message);
    var status = err.name === 'AbortError' ? 504 : 502;
    var code = err.name === 'AbortError' ? 'PROXY_TIMEOUT' : 'PROXY_UPSTREAM_FAIL';
    res.status(status).json({
      ok: false,
      error: err.message,
      code: code,
      durationMs: elapsedErr,
    });
  }
}

/**
 * Health-Endpoint — ruft GET /gpcversion durch, der kürzeste / billigste
 * Endpoint im Spec. Bestätigt Konnektivität + JWT-Gültigkeit.
 */
async function healthHandler(req, res) {
  var t0 = Date.now();

  // Mock-Mode: gleiche Antwort-Form wie der echte Health-Handler, damit die
  // Frontend-Debug-Page (nuxt/pages/_debug.vue) keine Sonderbehandlung braucht.
  if (MOCK_ENABLED) {
    var mockVer = gpceuMock.handle('gpcversion', 'GET', null);
    return res.json({
      ok: true,
      mock: true,
      gpcVersion: mockVer.body,
      responseTimeMs: Date.now() - t0,
      baseUrl: '(mock)',
      auth: { mode: 'mock', cachedTokenValid: true }
    });
  }

  var configErr = configError(res);
  if (configErr) return; // 503 oder 401 schon gesendet

  var healthUrl = BASE_URL + '/' + HEALTH_PATH;
  try {
    var credential;
    try {
      credential = await getCredential();
    } catch (authErr) {
      return res.status(401).json({
        ok: false,
        error: authErr.message,
        code: 'PROXY_AUTH_FAILED',
        baseUrl: BASE_URL,
        auth: gpceuAuth.status(),
      });
    }

    var upstream = await gpceuFetch(healthUrl, {
      method: 'GET',
      headers: buildHeaders(credential, req),
    });

    // 401-Retry nur im JWT-Auto-Login-Modus
    var mode = gpceuAuth.getMode();
    if (upstream.status === 401 && mode === 'auto-login') {
      gpceuAuth.clearToken();
      try {
        var freshToken = await gpceuAuth.getToken(true);
        upstream = await gpceuFetch(healthUrl, {
          method: 'GET',
          headers: buildHeaders(freshToken, req),
        });
      } catch (reAuthErr) {
        return res.status(401).json({
          ok: false,
          error: 'Token-Refresh fehlgeschlagen: ' + reAuthErr.message,
          code: 'PROXY_AUTH_REFRESH_FAILED',
          baseUrl: BASE_URL,
        });
      }
    }

    var elapsed = Date.now() - t0;
    var bodyText = await upstream.text();
    var parsed = null;
    try { parsed = JSON.parse(bodyText); } catch (e) { /* might be plain text */ }

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        ok: false,
        status: upstream.status,
        responseTimeMs: elapsed,
        baseUrl: BASE_URL,
        body: parsed || bodyText.slice(0, 240),
        auth: gpceuAuth.status(),
      });
    }

    res.json({
      ok: true,
      gpcVersion: parsed || bodyText.trim(),
      responseTimeMs: elapsed,
      baseUrl: BASE_URL,
      auth: gpceuAuth.status(),
    });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: err.message,
      code: err.name === 'AbortError' ? 'PROXY_TIMEOUT' : 'PROXY_UPSTREAM_FAIL',
      responseTimeMs: Date.now() - t0,
      baseUrl: BASE_URL,
      auth: gpceuAuth.status(),
    });
  }
}

module.exports = {
  proxyHandler,
  healthHandler,
  auth: gpceuAuth,
  config: {
    baseUrl: BASE_URL,
    hasStaticJwt: !!STATIC_JWT,
    hasCredentials: HAS_CREDENTIALS,
    hasApiKey: HAS_API_KEY,
    authMode: MOCK_ENABLED ? 'mock' : gpceuAuth.getMode(),
    pathPrefix: PATH_PREFIX,
    healthPath: HEALTH_PATH,
    timeoutMs: REQUEST_TIMEOUT_MS,
    mockEnabled: MOCK_ENABLED,
  },
};
