/**
 * Catch-all Proxy für /api/gpc-eu/*
 *
 * Reicht alle Sub-Pfade an die GPC.EU-Customer-API weiter. Injiziert Auth-Header
 * (X-API-Key oder Bearer JWT), retryed transient auf 5xx/429, streamt Response
 * durch (Binary-safe für getgpcfilecontent).
 *
 * NOTE: GET /api/gpc-eu/health wird von health.get.ts abgefangen — bei Nitros
 * File-based Routing gewinnt der spezifischere Handler.
 */

import { getGpceuConfig, checkGpceuConfig, withPrefix, callGpceu, errorEnvelope } from '../../utils/gpceu'

export default defineEventHandler(async (event) => {
  const cfg = getGpceuConfig()

  const configErr = checkGpceuConfig(cfg)
  if (configErr) {
    setResponseStatus(event, configErr.status)
    return configErr.body
  }

  // params.path ist bei Nitro's [...path]-Catch-all ein Array. Zusammenfügen
  // gibt uns den Sub-Path relativ zu /api/gpc-eu/.
  const pathParam = getRouterParam(event, 'path')
  const subpath = Array.isArray(pathParam) ? pathParam.join('/') : (pathParam || '')

  // Query-String durchreichen (findunits ?languageID=EN etc.)
  const url = getRequestURL(event)
  const query = url.search || ''

  const targetUrl = cfg.baseUrl + '/' + withPrefix(cfg, subpath) + query

  const method = event.method
  let body: string | null = null
  if (method !== 'GET' && method !== 'HEAD') {
    const raw = await readRawBody(event)
    body = raw ? (typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf-8')) : null
  }

  const t0 = Date.now()
  try {
    const upstream = await callGpceu(cfg, targetUrl, method, body, event)
    const elapsed = Date.now() - t0
    console.log(`[gpceu] ${method} ${subpath} → ${upstream.status} (${elapsed}ms)`)

    setResponseStatus(event, upstream.status)
    const contentType = upstream.headers.get('content-type')
    if (contentType) setHeader(event, 'content-type', contentType)

    // Nitro/h3 unterstützt Response-Streams direkt. sendStream() nimmt einen
    // Readable und pipet ihn durch — auch für Binärdaten sauber.
    if (upstream.body) {
      return sendStream(event, upstream.body as any)
    }
    return null
  } catch (err: any) {
    const elapsed = Date.now() - t0
    console.error(`[gpceu] ${method} ${subpath} FAIL after ${elapsed}ms:`, err?.message)
    setResponseStatus(event, err?.name === 'AbortError' ? 504 : 502)
    return errorEnvelope(err, elapsed)
  }
})
