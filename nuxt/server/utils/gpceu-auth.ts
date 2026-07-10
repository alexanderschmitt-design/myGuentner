/**
 * GPC.EU Auth — drei Modi (api-key | static-jwt | auto-login)
 *
 * Portiert von rag/gpceu-auth.js (CommonJS) nach TypeScript für Nitro.
 * Behält die gleichen Semantiken:
 *  - Modus-Auswahl: api-key gewinnt, sonst static-jwt, sonst auto-login, sonst none
 *  - JWT-Caching mit 30s Sicherheitspuffer vor exp
 *  - Inflight-Login-Dedup (kein Thundering-Herd bei parallelen Requests)
 *  - clearToken() + forceRefresh für 401-Retry-Path
 */

export type GpceuMode = 'api-key' | 'static-jwt' | 'auto-login' | 'none'

export interface GpceuAuthStatus {
  mode: GpceuMode
  loginUrl: string | null
  hasApiKey: boolean
  hasCredentials: boolean
  hasStaticJwt: boolean
  cachedTokenValid: boolean
  cachedTokenExpiresAt: string | null
  lastLoginAt: string | null
  lastLoginError: string | null
}

interface GpceuConfig {
  baseUrl: string
  apiKey: string
  jwt: string
  email: string
  password: string
  loginUrl: string
}

// Module-level State — ein Cache pro Nitro-Worker.
// Serverless (Vercel): jeder Cold-Start hat einen frischen Cache. Bei
// warm invocations bleibt der Token erhalten → typischer Nutzen.
let cachedToken: string | null = null
let cachedExpiryMs = 0
let lastLoginAt: string | null = null
let lastLoginError: string | null = null
let loginInflight: Promise<string> | null = null

function parseJwtExpiry(jwt: string): number {
  try {
    const parts = jwt.split('.')
    if (parts.length < 2) return Date.now() + 3600 * 1000
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    while (b64.length % 4) b64 += '='
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))
    if (typeof payload.exp === 'number') return payload.exp * 1000
  } catch {
    // opaque JWT → fall through
  }
  return Date.now() + 3600 * 1000
}

function deriveLoginUrl(cfg: GpceuConfig): string {
  if (cfg.loginUrl) return cfg.loginUrl
  if (!cfg.baseUrl) return ''
  return cfg.baseUrl.replace(/\/emea\/api\/gpc\/?$/, '').replace(/\/$/, '') + '/identity/login'
}

export function getGpceuMode(cfg: GpceuConfig): GpceuMode {
  if (cfg.apiKey) return 'api-key'
  if (cfg.jwt) return 'static-jwt'
  if (cfg.email && cfg.password) return 'auto-login'
  return 'none'
}

export function getGpceuApiKey(cfg: GpceuConfig): string {
  if (!cfg.apiKey) {
    throw new Error('GPCEU_API_KEY (or GUENTNER_API_KEY) is not set.')
  }
  return cfg.apiKey
}

async function doLogin(cfg: GpceuConfig): Promise<string> {
  const loginUrl = deriveLoginUrl(cfg)
  if (!loginUrl) {
    throw new Error('GPCEU_LOGIN_URL could not be derived — GPCEU_BASE_URL is missing.')
  }
  if (!cfg.email || !cfg.password) {
    throw new Error('GPCEU_EMAIL and GPCEU_PASSWORD must be set for auto-login.')
  }

  const t0 = Date.now()
  console.log(`[gpceu-auth] login → ${loginUrl} (email=${cfg.email})`)

  const res = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'myGPC-GPCEU-Auth/2.0'
    },
    body: JSON.stringify({ email: cfg.email, password: cfg.password })
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    lastLoginError = `HTTP ${res.status}: ${errText.slice(0, 240)}`
    throw new Error(`Login failed (${res.status}): ${errText.slice(0, 240)}`)
  }

  let data: any
  try {
    data = await res.json()
  } catch (e: any) {
    throw new Error(`Login response is not JSON: ${e.message}`)
  }

  const token =
    data.token ||
    data.accessToken ||
    data.access_token ||
    data.jwt ||
    (data.data && (data.data.token || data.data.accessToken)) ||
    null

  if (!token) {
    throw new Error(`Login response has no token in expected fields. Body: ${JSON.stringify(data).slice(0, 240)}`)
  }

  cachedToken = token
  cachedExpiryMs = parseJwtExpiry(token)
  lastLoginAt = new Date().toISOString()
  lastLoginError = null

  console.log(`[gpceu-auth] login OK in ${Date.now() - t0}ms, JWT TTL ≈ ${Math.round((cachedExpiryMs - Date.now()) / 1000)}s`)
  return token
}

export async function getGpceuToken(cfg: GpceuConfig, forceRefresh = false): Promise<string> {
  if (cfg.jwt) return cfg.jwt
  if (!forceRefresh && cachedToken && Date.now() < cachedExpiryMs - 30000) {
    return cachedToken
  }
  if (loginInflight) return loginInflight
  loginInflight = doLogin(cfg).finally(() => {
    loginInflight = null
  })
  return loginInflight
}

export function clearGpceuToken() {
  cachedToken = null
  cachedExpiryMs = 0
}

export function getGpceuAuthStatus(cfg: GpceuConfig): GpceuAuthStatus {
  const mode = getGpceuMode(cfg)
  return {
    mode,
    loginUrl: mode === 'auto-login' ? deriveLoginUrl(cfg) : null,
    hasApiKey: !!cfg.apiKey,
    hasCredentials: !!(cfg.email && cfg.password),
    hasStaticJwt: !!cfg.jwt,
    cachedTokenValid: mode === 'api-key' ? true : (!!cachedToken && Date.now() < cachedExpiryMs),
    cachedTokenExpiresAt: cachedExpiryMs ? new Date(cachedExpiryMs).toISOString() : null,
    lastLoginAt,
    lastLoginError
  }
}
