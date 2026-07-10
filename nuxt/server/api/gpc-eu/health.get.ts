/**
 * GET /api/gpc-eu/health
 *
 * Konnektivitäts-Probe zur GPC.EU-API. Ruft den konfigurierten Health-Endpoint
 * (Default `api/GPCDataQuery/gpcversion`) auf, bestätigt Auth + Netzwerk.
 */

import { getGpceuAuthStatus } from '../../utils/gpceu-auth'
import { getGpceuConfig, checkGpceuConfig, callGpceu, errorEnvelope } from '../../utils/gpceu'

export default defineEventHandler(async (event) => {
  const cfg = getGpceuConfig()
  const t0 = Date.now()

  const configErr = checkGpceuConfig(cfg)
  if (configErr) {
    setResponseStatus(event, configErr.status)
    return {
      ...configErr.body,
      baseUrl: cfg.baseUrl,
      auth: getGpceuAuthStatus(cfg)
    }
  }

  const healthUrl = cfg.baseUrl + '/' + cfg.healthPath

  try {
    const upstream = await callGpceu(cfg, healthUrl, 'GET', null, event)
    const elapsed = Date.now() - t0
    const bodyText = await upstream.text()

    let parsed: unknown = null
    try {
      parsed = JSON.parse(bodyText)
    } catch {
      // gpcversion often returns a plain-text version string — that's fine
    }

    if (!upstream.ok) {
      setResponseStatus(event, upstream.status)
      return {
        ok: false,
        status: upstream.status,
        responseTimeMs: elapsed,
        baseUrl: cfg.baseUrl,
        body: parsed ?? bodyText.slice(0, 240),
        auth: getGpceuAuthStatus(cfg)
      }
    }

    return {
      ok: true,
      gpcVersion: parsed ?? bodyText.trim(),
      responseTimeMs: elapsed,
      baseUrl: cfg.baseUrl,
      auth: getGpceuAuthStatus(cfg)
    }
  } catch (err: any) {
    const elapsed = Date.now() - t0
    setResponseStatus(event, err?.name === 'AbortError' ? 504 : 502)
    return {
      ...errorEnvelope(err, elapsed),
      responseTimeMs: elapsed,
      baseUrl: cfg.baseUrl,
      auth: getGpceuAuthStatus(cfg)
    }
  }
})
