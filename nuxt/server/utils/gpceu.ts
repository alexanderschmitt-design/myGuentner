/**
 * GPC.EU Proxy — Shared HTTP helpers for the /api/gpc-eu/* Nitro routes.
 *
 * Portiert von rag/gpceu-proxy.js. Behält die Retry-Semantik (5xx/429/network,
 * exponential backoff mit Jitter) und das Streaming-Response-Design (kein
 * JSON-Parsing im Proxy, damit auch Binary-Endpoints funktionieren).
 */

import type { H3Event } from 'h3'
import {
  getGpceuMode,
  getGpceuToken,
  getGpceuApiKey,
  clearGpceuToken,
  type GpceuMode
} from './gpceu-auth'

export interface GpceuConfig {
  baseUrl: string
  apiKey: string
  jwt: string
  email: string
  password: string
  loginUrl: string
  timeoutMs: number
  pathPrefix: string
  healthPath: string
  mock: boolean
}

const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])
const MAX_RETRIES = 2
const BASE_BACKOFF_MS = 400

/**
 * Reads GPC.EU runtime config from useRuntimeConfig(). Normalises the base URL
 * (strips trailing slash) and path prefix (strips leading/trailing slashes).
 */
export function getGpceuConfig(): GpceuConfig {
  const raw = useRuntimeConfig().gpceu as GpceuConfig
  const baseUrl = (raw.baseUrl || '').trim().replace(/\/$/, '')
  const pathPrefix = (raw.pathPrefix ?? 'api/GPCDataQuery').replace(/^\/+|\/+$/g, '')
  const healthPath = (raw.healthPath || (pathPrefix ? pathPrefix + '/gpcversion' : 'gpcversion')).replace(/^\/+/, '')
  return {
    ...raw,
    baseUrl,
    pathPrefix,
    healthPath
  }
}

export function withPrefix(cfg: GpceuConfig, subpath: string): string {
  const clean = subpath.replace(/^\/+/, '')
  if (!cfg.pathPrefix) return clean
  if (clean === cfg.pathPrefix || clean.indexOf(cfg.pathPrefix + '/') === 0) return clean
  return cfg.pathPrefix + '/' + clean
}

/**
 * Emits the standardised config-missing / auth-missing errors so the frontend
 * gets deterministic error codes. Returns null if config is OK.
 */
export function checkGpceuConfig(cfg: GpceuConfig): { status: number; body: any } | null {
  if (!cfg.baseUrl) {
    return {
      status: 503,
      body: {
        ok: false,
        error: 'GPCEU_BASE_URL is not set',
        code: 'PROXY_CONFIG_MISSING',
        hint: 'Set GPCEU_BASE_URL in the env vars.'
      }
    }
  }
  if (!cfg.jwt && !cfg.apiKey && !(cfg.email && cfg.password)) {
    return {
      status: 401,
      body: {
        ok: false,
        error: 'No auth configuration',
        code: 'PROXY_AUTH_MISSING',
        hint: 'Set GPCEU_API_KEY OR GPCEU_JWT OR GPCEU_EMAIL+GPCEU_PASSWORD.'
      }
    }
  }
  return null
}

export function buildHeaders(cfg: GpceuConfig, credential: string, event?: H3Event, method?: string): Record<string, string> {
  const mode = getGpceuMode(cfg)
  const h: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'myGPC-GPCEU-Proxy/2.0'
  }
  if (mode === 'api-key') {
    h['X-API-Key'] = credential
  } else {
    h['Authorization'] = 'Bearer ' + credential
  }
  if (method && method !== 'GET' && method !== 'HEAD') {
    h['Content-Type'] = 'application/json'
  }
  const acceptLang = event ? getHeader(event, 'accept-language') : undefined
  if (acceptLang) {
    h['Accept-Language'] = acceptLang
  }
  return h
}

async function getCredential(cfg: GpceuConfig, forceRefresh = false): Promise<string> {
  if (getGpceuMode(cfg) === 'api-key') return getGpceuApiKey(cfg)
  return getGpceuToken(cfg, forceRefresh)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Fetches from GPC.EU with retry on 5xx/429/network errors. Returns the raw
 * Response so the caller can stream the body.
 */
async function gpceuFetch(targetUrl: string, opts: { method: string; headers: Record<string, string>; body?: string | Buffer | null; timeoutMs: number }): Promise<Response> {
  let lastError: unknown = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), opts.timeoutMs)

      const res = await fetch(targetUrl, {
        method: opts.method,
        headers: opts.headers,
        body: opts.body ?? undefined,
        signal: controller.signal
      })
      clearTimeout(timer)

      if (RETRY_STATUS.has(res.status) && attempt < MAX_RETRIES) {
        const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 200)
        console.warn(`[gpceu] ${res.status} on ${targetUrl} — retry in ${backoff}ms (${attempt + 1}/${MAX_RETRIES})`)
        await sleep(backoff)
        continue
      }
      return res
    } catch (err: any) {
      lastError = err
      if (attempt < MAX_RETRIES) {
        const bo = BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 200)
        console.warn(`[gpceu] network error ${err.message} — retry in ${bo}ms`)
        await sleep(bo)
        continue
      }
      throw err
    }
  }
  throw lastError || new Error('Unknown gpceu fetch error')
}

/**
 * Executes a proxied call with automatic 401-retry in auto-login mode.
 */
export async function callGpceu(cfg: GpceuConfig, targetUrl: string, method: string, body: string | null, event?: H3Event): Promise<Response> {
  const credential = await getCredential(cfg)
  let res = await gpceuFetch(targetUrl, {
    method,
    headers: buildHeaders(cfg, credential, event, method),
    body,
    timeoutMs: cfg.timeoutMs
  })

  if (res.status === 401 && getGpceuMode(cfg) === 'auto-login') {
    console.warn('[gpceu] 401 upstream — token refresh + retry')
    clearGpceuToken()
    const fresh = await getGpceuToken(cfg, true)
    res = await gpceuFetch(targetUrl, {
      method,
      headers: buildHeaders(cfg, fresh, event, method),
      body,
      timeoutMs: cfg.timeoutMs
    })
  }
  return res
}

/**
 * Turns a fetch error into the standard error envelope (timeout vs upstream).
 */
export function errorEnvelope(err: any, durationMs: number) {
  const isTimeout = err?.name === 'AbortError'
  return {
    ok: false,
    error: err?.message || String(err),
    code: isTimeout ? 'PROXY_TIMEOUT' : 'PROXY_UPSTREAM_FAIL',
    durationMs
  }
}
