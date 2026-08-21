/**
 * DMS Connector — d.velop d.3one API for Güntner.
 * Port of rag/dms-connector.js. Reads config via useRuntimeConfig().dms.
 */

interface DmsConfig {
  baseUrl: string
  repositoryId: string
  apiKey: string
  authMode: string
  propertySyntax: string
  defaultObjectDefinitionIds: string
}

interface DmsBufferResult {
  buffer: Buffer
  contentType: string
  contentDisposition: string
}

const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])
const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 400

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function getDmsConfig(): DmsConfig {
  const raw = useRuntimeConfig().dms as DmsConfig
  return {
    ...raw,
    baseUrl: raw.baseUrl.replace(/\/$/, '')
  }
}

function buildHeaders(cfg: DmsConfig, extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/hal+json, application/json, */*',
    'User-Agent': 'myGPC-DMS/2.0'
  }
  switch (cfg.authMode) {
    case 'bearer':
      h.Authorization = 'Bearer ' + cfg.apiKey
      break
    case 'session':
    case 'session-cookie':
      h.Cookie = 'AuthSessionId=' + cfg.apiKey
      break
    case 'basic':
      h.Authorization = 'Basic ' + cfg.apiKey
      break
    default:
      throw new Error('Unknown DMS_AUTH_MODE: ' + cfg.authMode)
  }
  return { ...h, ...extra }
}

export async function dmsFetch(pathOrUrl: string, opts: { method?: string; headers?: Record<string, string> } = {}): Promise<Response> {
  const cfg = getDmsConfig()
  if (!cfg.repositoryId) throw new Error('DMS_REPOSITORY_ID is not set')
  if (!cfg.apiKey) throw new Error('DMS_API_KEY is not set')

  const url = pathOrUrl.startsWith('http') ? pathOrUrl : (cfg.baseUrl + pathOrUrl)
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: opts.method || 'GET',
        headers: buildHeaders(cfg, opts.headers),
        redirect: 'manual'
      })

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location') || ''
        throw new Error(`DMS redirect (auth failed?) ${res.status} → ${loc}`)
      }

      if (res.ok) return res

      if (RETRY_STATUS.has(res.status) && attempt < MAX_RETRIES) {
        const text = await res.text().catch(() => '')
        lastError = new Error(`DMS HTTP ${res.status} (attempt ${attempt + 1}/${MAX_RETRIES + 1}) :: ${text.slice(0, 120)}`)
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 200)
        console.warn(`[dms] retry in ${delay}ms:`, lastError.message)
        await sleep(delay)
        continue
      }

      const text = await res.text().catch(() => '')
      throw new Error(`DMS HTTP ${res.status} for ${url} :: ${text.slice(0, 200)}`)
    } catch (err: any) {
      const isNetworkError = err.name === 'TypeError' || /ECONNRESET|ETIMEDOUT|ENOTFOUND|ENETUNREACH|UND_ERR/.test(err.message || '')
      if (isNetworkError && attempt < MAX_RETRIES) {
        lastError = err
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 200)
        console.warn(`[dms] network retry in ${delay}ms:`, err.message)
        await sleep(delay)
        continue
      }
      throw err
    }
  }
  throw lastError || new Error(`DMS request failed after ${MAX_RETRIES + 1} attempts`)
}

export async function dmsFetchJson(pathOrUrl: string, opts?: { method?: string; headers?: Record<string, string> }): Promise<any> {
  const res = await dmsFetch(pathOrUrl, opts)
  return res.json()
}

export async function dmsFetchBuffer(pathOrUrl: string, opts?: { method?: string; headers?: Record<string, string> }): Promise<DmsBufferResult> {
  const res = await dmsFetch(pathOrUrl, opts)
  const ab = await res.arrayBuffer()
  return {
    buffer: Buffer.from(ab),
    contentType: res.headers.get('content-type') || 'application/octet-stream',
    contentDisposition: res.headers.get('content-disposition') || ''
  }
}

export function normalizeSearchHit(hit: any) {
  const links = hit._links || {}
  const mainBlob = links.mainblobcontent && links.mainblobcontent.href
  const pdfBlob = links.pdfblobcontent && links.pdfblobcontent.href
  const versionMatch = mainBlob && mainBlob.match(/\/v\/([^/]+)\/b\/main\/c$/)

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
    raw: hit
  }
}

// Cached at module level — constant per repo, but note Nitro cold-start clears cache.
let _sourceIdCache: string | null = null

async function getSourceId(cfg: DmsConfig): Promise<string | null> {
  if (_sourceIdCache) return _sourceIdCache
  try {
    const src = await getSourceDefinition()
    _sourceIdCache = src?.id || null
  } catch (err: any) {
    console.warn('[dms] getSourceId failed:', err.message)
    _sourceIdCache = null
  }
  return _sourceIdCache
}

export interface DmsSearchParams {
  fulltext?: string
  categoryId?: string
  /** d.velop ObjectDefinition-IDs (z.B. ["DMANU"]) — schränkt Ergebnisse auf
   *  bestimmte Dokumenttypen ein. Analog zum Preset "Portal Public Documents"
   *  in der d.velop-Browser-Suche (URL-Param `objectdefinitionids=["DMANU"]`).
   *  Wenn nicht gesetzt, greift der Default aus `runtimeConfig.dms.
   *  defaultObjectDefinitionIds`. Leerer Array = keine Filterung. */
  objectDefinitionIds?: string[]
  properties?: Record<string, string | number>
  page?: number
  pageSize?: number
}

// ObjectDefinition-Label-Cache (5-Minuten-TTL). Nitro-Cold-Start invalidiert
// automatisch; das ist okay, weil ObjDefs sich fast nie ändern.
let _objDefLabelCache: { at: number; map: Record<string, string> } | null = null
const OBJDEF_TTL_MS = 5 * 60 * 1000

async function getObjectDefinitionLabels(): Promise<Record<string, string>> {
  if (_objDefLabelCache && (Date.now() - _objDefLabelCache.at) < OBJDEF_TTL_MS) {
    return _objDefLabelCache.map
  }
  try {
    const defs = await getObjectDefinitions()
    const map: Record<string, string> = {}
    for (const d of defs as any[]) {
      if (d.id) map[d.id] = d.displayName || d.name || d.id
    }
    _objDefLabelCache = { at: Date.now(), map }
    return map
  } catch (err: any) {
    console.warn('[dms] getObjectDefinitionLabels failed:', err.message)
    return _objDefLabelCache?.map || {}
  }
}

export async function searchDocuments(params: DmsSearchParams = {}) {
  const cfg = getDmsConfig()
  const qs = new URLSearchParams()
  qs.set('page', String(params.page || 1))
  qs.set('pagesize', String(params.pageSize || 25))
  if (params.fulltext) qs.set('fulltext', params.fulltext)

  const hasCategory = !!params.categoryId
  const hasProperties = params.properties && typeof params.properties === 'object' && Object.keys(params.properties).length > 0

  // ObjectDefinition-Filter (default aus Env übernehmen wenn Client nichts
  // explizit setzt). Format spiegelt die d.velop-Browser-Suche wider:
  // `objectdefinitionids=["DMANU"]`. Wenn der Client bereits eine
  // `categoryId` (via UI-Dropdown "Dokumenten-Kategorie") mitgibt, greift
  // dieser Env-Default NICHT — sonst kollidieren zwei Object-Type-Filter.
  const explicitObjDefs = Array.isArray(params.objectDefinitionIds) ? params.objectDefinitionIds : null
  const objDefs = explicitObjDefs
    ? explicitObjDefs.filter((s) => typeof s === 'string' && s.trim())
    : (hasCategory
        ? []
        : cfg.defaultObjectDefinitionIds
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean))
  if (objDefs.length > 0) {
    qs.set('objectdefinitionids', JSON.stringify(objDefs))
  }

  if (hasCategory || hasProperties) {
    const sid = await getSourceId(cfg)
    if (sid) qs.set('sourceid', sid)
  }

  if (hasCategory) {
    qs.set('sourcecategories', `[${params.categoryId}]`)
  }

  if (hasProperties && params.properties) {
    for (const [key, value] of Object.entries(params.properties)) {
      if (cfg.propertySyntax === 'flat') {
        qs.set(key, String(value))
      } else {
        qs.set(`properties[${key}]`, String(value))
      }
    }
  }

  const path = `/dms/r/${cfg.repositoryId}/srm/?${qs.toString()}`
  const data = await dmsFetchJson(path)
  const rawItems = Array.isArray(data.items) ? data.items.map(normalizeSearchHit) : []

  // Enrichment: sourceCategories in Human-Readable-Labels auflösen,
  // Standard-Properties zu strukturierten Feldern extrahieren.
  const labelMap = await getObjectDefinitionLabels()
  const items = rawItems.map((hit: any) => enrichHit(hit, labelMap))

  return {
    items,
    page: data.page || params.page || 1,
    links: data._links || {},
    nextHref: data._links?.next?.href || null,
    rawCount: items.length
  }
}

function findPropValue(props: any[], keys: string[]): string | null {
  for (const p of props || []) {
    const key = p.key || p.id
    if (!keys.includes(key)) continue
    const v = Array.isArray(p.values) ? p.values[0] : p.value
    if (typeof v === 'string' && v.trim()) return v
  }
  return null
}

function enrichHit(hit: any, labelMap: Record<string, string>) {
  const categories = hit.sourceCategories || []
  const categoryId = categories[0] || null
  const props = hit.sourceProperties || []

  return {
    ...hit,
    categoryId,
    categoryLabel: categoryId ? (labelMap[categoryId] || categoryId) : null,
    // Häufig gebrauchte Standard-Properties bereits extrahiert
    filename: findPropValue(props, ['property_filename']) || null,
    caption: findPropValue(props, ['property_caption']) || null,
    documentId: findPropValue(props, ['property_document_id', 'property_document_number']) || hit.dmsId,
    fileType: findPropValue(props, ['property_filetype']) || null,
    state: findPropValue(props, ['property_state']) || null,
    modifiedAt: findPropValue(props, ['property_last_modified_date']) || null,
    createdAt: findPropValue(props, ['property_creation_date']) || null,
    sizeBytes: (() => {
      const s = findPropValue(props, ['property_size'])
      const n = s ? parseInt(s, 10) : NaN
      return Number.isFinite(n) ? n : null
    })()
  }
}

export async function getCurrentVersionMetadata(dmsobjectid: string) {
  const cfg = getDmsConfig()
  return dmsFetchJson(`/dms/r/${cfg.repositoryId}/o2m/${encodeURIComponent(dmsobjectid)}/v/current`)
}

export async function getObject(dmsobjectid: string) {
  const cfg = getDmsConfig()
  return dmsFetchJson(`/dms/r/${cfg.repositoryId}/o2m/${encodeURIComponent(dmsobjectid)}`)
}

export async function listVersions(dmsobjectid: string) {
  const cfg = getDmsConfig()
  return dmsFetchJson(`/dms/r/${cfg.repositoryId}/o2m/${encodeURIComponent(dmsobjectid)}/v/`)
}

export function parseFilenameFromContentDisposition(cd: string | null): string | null {
  if (!cd) return null
  const utf8Match = cd.match(/filename\*=utf-8''([^;]+)/i)
  if (utf8Match) return decodeURIComponent(utf8Match[1].trim())
  const plainMatch = cd.match(/filename="?([^";]+)"?/i)
  return plainMatch ? plainMatch[1].trim() : null
}

export async function downloadContent(hit: any): Promise<{ buffer: Buffer; contentType: string; filename: string | null }> {
  const url = hit.mainContentUrl || hit._links?.mainblobcontent?.href
  if (!url) throw new Error('No mainblobcontent link in hit')
  const result = await dmsFetchBuffer(url)
  return {
    buffer: result.buffer,
    contentType: result.contentType,
    filename: parseFilenameFromContentDisposition(result.contentDisposition)
  }
}

export async function getSourceDefinition() {
  const cfg = getDmsConfig()
  return dmsFetchJson(`/dms/r/${cfg.repositoryId}/source`)
}

export async function getRepositoryRoot() {
  const cfg = getDmsConfig()
  return dmsFetchJson(`/dms/r/${cfg.repositoryId}`)
}

export async function getObjectDefinitions() {
  const cfg = getDmsConfig()
  const data = await dmsFetchJson(`/dms/r/${cfg.repositoryId}/objdef`)
  return data.objectDefinitions || []
}

export async function getFacetValues(propertyId: string, filter: { objectDefinitionIds?: string | string[]; fulltext?: string } = {}) {
  const cfg = getDmsConfig()
  let objDefs: string
  if (!filter.objectDefinitionIds) {
    const all = await getObjectDefinitions()
    objDefs = all.map((d: any) => d.id).join(',')
  } else if (Array.isArray(filter.objectDefinitionIds)) {
    objDefs = filter.objectDefinitionIds.join(',')
  } else {
    objDefs = filter.objectDefinitionIds
  }

  const qs = new URLSearchParams()
  qs.set('propertyid', propertyId)
  qs.set('objectdefinitionids', objDefs)
  if (filter.fulltext) qs.set('fulltext', filter.fulltext)

  return dmsFetchJson(`/dms/r/${cfg.repositoryId}/dmsobjectPropFacet?${qs.toString()}`)
}

export async function dmsHealthCheck() {
  const cfg = getDmsConfig()
  try {
    const root = await getRepositoryRoot()
    return {
      ok: true,
      repository: cfg.repositoryId,
      baseUrl: cfg.baseUrl,
      authMode: cfg.authMode,
      hasLinks: typeof root._links === 'object',
      linkCount: root._links ? Object.keys(root._links).length : 0,
      defaultObjectDefinitionIds: cfg.defaultObjectDefinitionIds || null
    }
  } catch (err: any) {
    return {
      ok: false,
      repository: cfg.repositoryId,
      baseUrl: cfg.baseUrl,
      authMode: cfg.authMode,
      error: err.message
    }
  }
}
