/**
 * d.velop d.3one DMS Connector
 * ----------------------------
 * Schnittstelle zum Güntner-DMS unter dms-prod.guentner.com.
 *
 * Verifizierte URL-Patterns (aus Probe Runde 2):
 *   GET /dms/r/{repo}/srm/?fulltext=…&page=…&pagesize=…   → Suche
 *   GET /dms/r/{repo}/o2m/{id}                            → Object-Metadaten
 *   GET /dms/r/{repo}/o2m/{id}/v/current                  → aktuelle Versions-Metadaten
 *   GET /dms/r/{repo}/o2/{id}/v/{ver}/b/main/c            → Content (aus mainblobcontent-Link)
 *   GET /dms/r/{repo}/dmsobjpropfacetcount?…              → Facet-Counts
 *   GET /dms/r/{repo}/dmsobjectPropFacet?propertyid=…     → Distinkte Werte
 *
 * Auth: Authorization: Bearer <DMS_API_KEY>  (nur diese Methode funktioniert)
 */

require('dotenv').config();

const BASE_URL = (process.env.DMS_BASE_URL || 'https://dms-prod.guentner.com').replace(/\/$/, '');
const REPO_ID = process.env.DMS_REPOSITORY_ID || '';
const API_KEY = (process.env.DMS_API_KEY || '').trim();
const AUTH_MODE = (process.env.DMS_AUTH_MODE || 'bearer').toLowerCase();
// Property-Filter-Syntax für /srm/?: "bracket" (properties[<uuid>]=val, d.velop-empfohlen)
// oder "flat" (legacy: <uuid>=val). Falls eine Variante 0-Treffer/500er produziert,
// auf die andere wechseln via ENV DMS_PROPERTY_SYNTAX=flat. Default bracket.
const PROPERTY_SYNTAX = (process.env.DMS_PROPERTY_SYNTAX || 'bracket').toLowerCase();

if (!REPO_ID) {
  throw new Error('DMS_REPOSITORY_ID ist nicht gesetzt in .env');
}
if (!API_KEY) {
  throw new Error('DMS_API_KEY ist nicht gesetzt in .env');
}

/* ============================================================
   HTTP-Layer
   ============================================================ */

function buildHeaders(extra) {
  const h = {
    Accept: 'application/hal+json, application/json, */*',
    'User-Agent': 'myGPC-DMS/1.0',
  };
  switch (AUTH_MODE) {
    case 'bearer':
      h.Authorization = 'Bearer ' + API_KEY;
      break;
    case 'session':
    case 'session-cookie':
      h.Cookie = 'AuthSessionId=' + API_KEY;
      break;
    case 'basic':
      h.Authorization = 'Basic ' + API_KEY; // Caller liefert base64-encoded user:pass
      break;
    default:
      throw new Error('Unbekannter DMS_AUTH_MODE: ' + AUTH_MODE);
  }
  return Object.assign(h, extra || {});
}

/** Status-Codes, die einen Retry rechtfertigen (transient/idempotent). */
const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 400;

function sleep(ms) {
  return new Promise(function(r) { setTimeout(r, ms); });
}

/**
 * Generischer GET mit Retry — nimmt entweder einen vollen Path (z. B. aus HAL-Link)
 * oder einen path-Suffix (z. B. "/srm/?fulltext=…").
 *
 * Retry-Verhalten: bei Network-Errors und 5xx/429/408/425/504 wird bis zu MAX_RETRIES
 * mal mit exponentiellem Backoff (400 ms × 2^attempt + Jitter) wiederholt.
 * 4xx (außer 429) wird sofort propagiert — z. B. 401/403 nicht zu retryen, das ist
 * ein Konfigurationsfehler; 404 bedeutet das Objekt existiert nicht.
 */
async function dmsFetch(pathOrUrl, opts) {
  opts = opts || {};
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : (BASE_URL + pathOrUrl);
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: opts.method || 'GET',
        headers: buildHeaders(opts.headers),
        redirect: 'manual',
      });

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location') || '';
        throw new Error('DMS-Redirect (Auth fehlgeschlagen?) ' + res.status + ' → ' + loc);
      }

      if (res.ok) return res;

      // Status mit Retry-Potenzial?
      if (RETRY_STATUS.has(res.status) && attempt < MAX_RETRIES) {
        const text = await res.text().catch(() => '');
        lastError = new Error('DMS HTTP ' + res.status + ' (attempt ' + (attempt + 1) +
          '/' + (MAX_RETRIES + 1) + ') :: ' + text.slice(0, 120));
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
        console.warn('[DMS] retry in ' + delay + 'ms:', lastError.message);
        await sleep(delay);
        continue;
      }

      // Nicht-retry-fähiger Fehler — sofort propagieren
      const text = await res.text().catch(() => '');
      throw new Error('DMS HTTP ' + res.status + ' für ' + url + ' :: ' + text.slice(0, 200));

    } catch (err) {
      // Netzwerkfehler (TypeError, ECONNRESET, ETIMEDOUT…) → retry
      const isNetworkError = err.name === 'TypeError' ||
        /ECONNRESET|ETIMEDOUT|ENOTFOUND|ENETUNREACH|UND_ERR/.test(err.message || '');
      if (isNetworkError && attempt < MAX_RETRIES) {
        lastError = err;
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
        console.warn('[DMS] network retry in ' + delay + 'ms:', err.message);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }

  // Alle Versuche aufgebraucht
  throw lastError || new Error('DMS Request fehlgeschlagen nach ' + (MAX_RETRIES + 1) + ' Versuchen');
}

async function dmsFetchJson(pathOrUrl, opts) {
  const res = await dmsFetch(pathOrUrl, opts);
  return res.json();
}

async function dmsFetchBuffer(pathOrUrl, opts) {
  const res = await dmsFetch(pathOrUrl, opts);
  const ab = await res.arrayBuffer();
  return {
    buffer: Buffer.from(ab),
    contentType: res.headers.get('content-type') || 'application/octet-stream',
    contentDisposition: res.headers.get('content-disposition') || '',
  };
}

/* ============================================================
   Search
   ============================================================ */

/**
 * Suche im DMS via /srm/-Endpoint.
 *
 * @param {object} params
 * @param {string} [params.fulltext]    Volltext-Suche
 * @param {object} [params.properties]  Property-Filter, z. B. { dmsId: "P002925864" }
 * @param {number} [params.page]        Seite (1-basiert, default 1)
 * @param {number} [params.pageSize]    Treffer pro Seite (default 25, max je nach Server)
 * @returns {Promise<{ items: Array, totalCount: number, links: object }>}
 */
async function searchDocuments(params) {
  params = params || {};
  const qs = new URLSearchParams();
  qs.set('page', String(params.page || 1));
  qs.set('pagesize', String(params.pageSize || 25));
  if (params.fulltext) qs.set('fulltext', params.fulltext);

  const hasCategory = !!params.categoryId;
  const hasProperties = params.properties && typeof params.properties === 'object'
    && Object.keys(params.properties).length > 0;

  // `sourceid` ist Voraussetzung für `sourcecategories` und `sourceproperties` —
  // ohne erhalten wir HTTP 400. Lazy-cached, einmal pro Server-Lifetime.
  if (hasCategory || hasProperties) {
    const sid = await getSourceId();
    if (sid) qs.set('sourceid', sid);
  }

  if (hasCategory) {
    // Array-Literal in eckigen Klammern — Live-Test bestätigt: das ist die
    // korrekte Syntax für Mehrwert-Kategorie-Filter im /srm/?-Endpoint.
    qs.set('sourcecategories', `[${params.categoryId}]`);
  }

  if (hasProperties) {
    for (const [key, value] of Object.entries(params.properties)) {
      // d.velop unterstützt Bracket-Syntax (?properties[key]=val) für Property-Filter.
      // flat-Modus ist Legacy-Fallback (via ENV DMS_PROPERTY_SYNTAX=flat).
      if (PROPERTY_SYNTAX === 'flat') {
        qs.set(key, String(value));
      } else {
        qs.set(`properties[${key}]`, String(value));
      }
    }
  }

  const path = `/dms/r/${REPO_ID}/srm/?${qs.toString()}`;
  const data = await dmsFetchJson(path);
  const items = Array.isArray(data.items) ? data.items.map(normalizeSearchHit) : [];

  return {
    items,
    page: data.page || params.page || 1,
    links: data._links || {},
    nextHref: data._links && data._links.next ? data._links.next.href : null,
    rawCount: items.length,
  };
}

/**
 * Normalisiert einen Such-Treffer auf eine einheitliche, leicht zu konsumierende Form.
 * Extrahiert die wichtigsten _links direkt als Top-Level-Felder.
 */
function normalizeSearchHit(hit) {
  const links = hit._links || {};
  const mainBlob = links.mainblobcontent && links.mainblobcontent.href;
  const pdfBlob = links.pdfblobcontent && links.pdfblobcontent.href;
  const versionMatch = mainBlob && mainBlob.match(/\/v\/([^/]+)\/b\/main\/c$/);

  return {
    dmsId: hit.id,
    self: links.self && links.self.href,
    versionId: versionMatch ? versionMatch[1] : null,
    mainContentUrl: mainBlob || null,
    pdfContentUrl: pdfBlob || null,
    versionsListUrl: links.versions && links.versions.href,
    currentVersionUrl: links.displayVersion && links.displayVersion.href,
    previewUrl: links.previewReadonly && links.previewReadonly.href,
    sourceProperties: hit.sourceProperties || [],
    sourceCategories: hit.sourceCategories || [],
    raw: hit,
  };
}

/* ============================================================
   Object Metadata
   ============================================================ */

/**
 * Lädt die Metadaten der **aktuellen** Version eines Objects.
 * @param {string} dmsobjectid  z. B. "P002925864"
 */
async function getCurrentVersionMetadata(dmsobjectid) {
  const path = `/dms/r/${REPO_ID}/o2m/${encodeURIComponent(dmsobjectid)}/v/current`;
  return dmsFetchJson(path);
}

/**
 * Lädt das gesamte Object (kein /v/current — liefert Object-Header + _links).
 */
async function getObject(dmsobjectid) {
  const path = `/dms/r/${REPO_ID}/o2m/${encodeURIComponent(dmsobjectid)}`;
  return dmsFetchJson(path);
}

/**
 * Listet alle Versionen eines Objects.
 */
async function listVersions(dmsobjectid) {
  const path = `/dms/r/${REPO_ID}/o2m/${encodeURIComponent(dmsobjectid)}/v/`;
  return dmsFetchJson(path);
}

/* ============================================================
   Content Download
   ============================================================ */

/**
 * Lädt den Content (Original-Datei) zu einem Such-Treffer herunter.
 * Nutzt den im Treffer enthaltenen `mainblobcontent`-Link — keine Versions-Iteration nötig.
 *
 * @param {object} hit  Normalisierter Treffer aus searchDocuments() ODER ein Object mit _links
 * @returns {Promise<{ buffer: Buffer, contentType: string, filename: string|null }>}
 */
async function downloadContent(hit) {
  const url = hit.mainContentUrl
    || (hit._links && hit._links.mainblobcontent && hit._links.mainblobcontent.href)
    || null;
  if (!url) {
    throw new Error('Kein mainblobcontent-Link im Treffer — Object hat möglicherweise keinen Content');
  }
  const result = await dmsFetchBuffer(url);
  return {
    buffer: result.buffer,
    contentType: result.contentType,
    filename: parseFilenameFromContentDisposition(result.contentDisposition),
  };
}

function parseFilenameFromContentDisposition(cd) {
  if (!cd) return null;
  // Beispiel: attachment; filename="manual.pdf"; filename*=UTF-8''manual.pdf
  // Auch Variante mit lowercase utf-8'' akzeptieren (d.velop liefert das so)
  const utf8Match = cd.match(/filename\*=utf-8''([^;]+)/i);
  if (utf8Match) return decodeURIComponent(utf8Match[1].trim());
  const plainMatch = cd.match(/filename="?([^";]+)"?/i);
  return plainMatch ? plainMatch[1].trim() : null;
}

/**
 * Liefert nur den Filename eines DMS-Dokuments — ohne den ganzen Content zu downloaden.
 * Trick: Range-GET mit bytes=0-0 lädt nur 1 Byte, aber der Server schickt den
 * vollen Content-Disposition-Header mit. Body wird sofort gecancelt.
 *
 * Performance: ~150-300 ms pro Aufruf (vs. mehrere MB beim vollen Download).
 *
 * @param {object} hit  Such-Treffer mit `mainContentUrl` (oder direkt URL-String)
 * @returns {Promise<string|null>}  Filename oder null bei Fehler
 */
async function getFilenameForHit(hit) {
  const urlPath = typeof hit === 'string' ? hit : (hit.mainContentUrl || null);
  if (!urlPath) return null;
  const url = urlPath.startsWith('http') ? urlPath : (BASE_URL + urlPath);

  // Wichtig: Accept: */* — der hal+json-Accept aus buildHeaders() unterdrückt
  // bei manchen d.velop-Konfigurationen das Content-Disposition für binäre Inhalte.
  // Wir bauen die Auth-Header daher selbst, ohne Accept.
  const headers = { Range: 'bytes=0-0' };
  switch (AUTH_MODE) {
    case 'bearer':
      headers.Authorization = 'Bearer ' + API_KEY;
      break;
    case 'session':
    case 'session-cookie':
      headers.Cookie = 'AuthSessionId=' + API_KEY;
      break;
    case 'basic':
      headers.Authorization = 'Basic ' + API_KEY;
      break;
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: headers,
      redirect: 'manual',
    });
    // Body sofort schließen — wir wollen nur den Header, nicht den Inhalt
    try { await res.body.cancel(); } catch (e) { /* schon zu */ }
    if (res.status !== 200 && res.status !== 206) return null;
    return parseFilenameFromContentDisposition(res.headers.get('content-disposition') || '');
  } catch (err) {
    return null;
  }
}

/* ============================================================
   Facets (für Filter-Dropdowns im Frontend-Modal)
   ============================================================ */

/* Cache für die Object-Definitions des Repositories (117 Stück, ändern sich nicht).
   Wird lazy beim ersten Facet-Aufruf befüllt. */
let _objDefsCache = null;

async function getObjectDefinitions() {
  if (_objDefsCache) return _objDefsCache;
  const data = await dmsFetchJson(`/dms/r/${REPO_ID}/objdef`);
  _objDefsCache = data.objectDefinitions || [];
  return _objDefsCache;
}

/* Cache für die Source-ID des Repository. Wird benötigt sobald wir
   `sourcecategories` oder `sourceproperties` an `/srm/?` senden — sonst
   antwortet d.velop mit HTTP 400 ("When using 'sourceproperties', 'sourcecategories'
   or 'sourcepropertysort' you have to set 'sourceid'."). Konstant pro Repo. */
let _sourceIdCache = null;

async function getSourceId() {
  if (_sourceIdCache) return _sourceIdCache;
  try {
    const src = await getSourceDefinition();
    _sourceIdCache = src && src.id ? src.id : null;
  } catch (err) {
    console.warn('[DMS] getSourceId failed — Category/Property-Filter fallen leer aus:', err.message);
    _sourceIdCache = null;
  }
  return _sourceIdCache;
}

/**
 * Liefert die distinkten Werte für eine Property — für dynamische Filter-Dropdowns.
 * Der DMS-Endpoint verlangt zwingend `objectdefinitionids`; ohne wird 404 zurückgegeben.
 * Per Default werden alle Object-Definitions des Repositories als Scope genommen.
 *
 * @param {string} propertyId        Property-Key (UUID, aus /source ablesbar)
 * @param {object} [filter]
 * @param {string|string[]} [filter.objectDefinitionIds]  Einschränkung auf bestimmte
 *                                                         Object-Definitionen (Komma-Liste oder Array)
 * @param {string} [filter.fulltext]                       Volltext-Vorfilter
 */
async function getFacetValues(propertyId, filter) {
  filter = filter || {};

  let objDefs = filter.objectDefinitionIds;
  if (!objDefs) {
    const all = await getObjectDefinitions();
    objDefs = all.map(function(d) { return d.id; }).join(',');
  } else if (Array.isArray(objDefs)) {
    objDefs = objDefs.join(',');
  }

  const qs = new URLSearchParams();
  qs.set('propertyid', propertyId);
  qs.set('objectdefinitionids', objDefs);
  if (filter.fulltext) qs.set('fulltext', filter.fulltext);

  const path = `/dms/r/${REPO_ID}/dmsobjectPropFacet?${qs.toString()}`;
  return dmsFetchJson(path);
}

/**
 * Liefert die Source-Definition (alle Properties + Categories des Repository).
 * Nützlich um die Property-IDs für getFacetValues() zu finden.
 */
async function getSourceDefinition() {
  const path = `/dms/r/${REPO_ID}/source`;
  return dmsFetchJson(path);
}

/**
 * Liefert die Repository-Service-URLs (alle verfügbaren Endpunkte als HAL-Links).
 */
async function getRepositoryRoot() {
  const path = `/dms/r/${REPO_ID}`;
  return dmsFetchJson(path);
}

/* ============================================================
   Health-Check
   ============================================================ */

/**
 * Prüft ob die Konfiguration funktioniert. Gibt einen kurzen Status zurück.
 */
async function healthCheck() {
  try {
    const root = await getRepositoryRoot();
    return {
      ok: true,
      repository: REPO_ID,
      baseUrl: BASE_URL,
      authMode: AUTH_MODE,
      hasLinks: typeof root._links === 'object',
      linkCount: root._links ? Object.keys(root._links).length : 0,
    };
  } catch (err) {
    return {
      ok: false,
      repository: REPO_ID,
      baseUrl: BASE_URL,
      authMode: AUTH_MODE,
      error: err.message,
    };
  }
}

/* ============================================================
   Exports
   ============================================================ */

module.exports = {
  // Search
  searchDocuments,
  normalizeSearchHit,

  // Metadata
  getObject,
  getCurrentVersionMetadata,
  listVersions,

  // Content
  downloadContent,
  getFilenameForHit,

  // Facets / Schema
  getFacetValues,
  getObjectDefinitions,
  getSourceDefinition,
  getRepositoryRoot,

  // Misc
  healthCheck,
  dmsFetch,
  dmsFetchJson,
  dmsFetchBuffer,

  // Konfiguration (read-only)
  config: {
    baseUrl: BASE_URL,
    repositoryId: REPO_ID,
    authMode: AUTH_MODE,
  },
};
