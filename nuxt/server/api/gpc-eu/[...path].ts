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

/**
 * Extrahiert die menschenlesbare Fehlermeldung aus einem Upstream-Response.
 * Reihenfolge: strukturierter Envelope > verbreitete JSON-Felder > .NET-typisches
 * ModelState-Dict > Roh-Text > Fallback.
 */
function extractUpstreamError(parsed: any, raw: string): string {
  if (parsed && typeof parsed === 'object') {
    // Bekannte Schlüssel — GPC.EU-typische Antworten
    for (const key of ['message', 'Message', 'error', 'Error', 'errorMessage', 'detail', 'title']) {
      const v = (parsed as any)[key]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
    // .NET ModelState: { errors: { fieldName: ["msg1", "msg2"] } }
    if (parsed.errors && typeof parsed.errors === 'object') {
      const first = Object.values(parsed.errors).flat().find((x: any) => typeof x === 'string')
      if (typeof first === 'string' && first.trim()) return first.trim()
    }
    // ValidationInfo-Wrapper — die GPC.EU-typischen "Result"-Types haben
    // { success:false, message:"…", content:… }
    if (typeof parsed.success === 'boolean' && !parsed.success && typeof parsed.message === 'string') {
      return parsed.message
    }
  }
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return 'Unknown upstream error'
}

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

    // Propagate EventId-Header, falls upstream ihn liefert. Client-seitig
    // liest formatGpceuError() den Wert bevorzugt aus dem Body-Envelope; als
    // zweite Quelle kann die App den X-Event-Id-Header über err.response
    // greifen. Fällt beides aus, wird ein GUID clientseitig generiert.
    for (const h of ['x-event-id', 'x-request-id', 'x-correlation-id']) {
      const v = upstream.headers.get(h)
      if (v) setHeader(event, h, v)
    }

    // Bei Fehler-Status (4xx/5xx) den Body puffern und als sauberes JSON-
    // Envelope zurückgeben. Streamen würde die Fehlermeldung verlieren, wenn
    // $fetch clientseitig den Body-Typ nicht sauber parsen kann. Für
    // Erfolgs-Responses bleibt Streaming aktiv (Binary-safe, z. B. PDF-DL).
    if (upstream.status >= 400) {
      const raw = await upstream.text()
      let parsed: any = null
      try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = null }
      console.warn(`[gpceu] ${method} ${subpath} error body:`, (raw || '(empty)').slice(0, 500))
      setHeader(event, 'content-type', 'application/json')
      const envelope: Record<string, unknown> = {
        ok: false,
        error: extractUpstreamError(parsed, raw),
        code: 'UPSTREAM_ERROR',
        upstreamStatus: upstream.status,
        durationMs: elapsed
      }
      const evId = upstream.headers.get('x-event-id') || upstream.headers.get('x-request-id')
      if (evId) envelope.eventId = evId
      if (parsed && typeof parsed === 'object') {
        if ((parsed as any).eventId || (parsed as any).EventId) envelope.eventId = (parsed as any).eventId || (parsed as any).EventId
        if ((parsed as any).occurredAt || (parsed as any).Date) envelope.occurredAt = (parsed as any).occurredAt || (parsed as any).Date
      }
      return envelope
    }

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
