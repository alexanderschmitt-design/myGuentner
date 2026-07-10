/**
 * GET /api/system/status — Aggregated health check.
 * Composes /api/rag/stats + /api/dms/health + /api/chat/health + /api/gpc-eu/health.
 */

import { vectorStoreStats } from '../../utils/vector-store'
import { getRagSettings } from '../../utils/rag-settings'
import { dmsHealthCheck } from '../../utils/dms'
import { getActiveLlm } from '../../utils/llm'
import { getGpceuConfig, checkGpceuConfig, callGpceu } from '../../utils/gpceu'
import { getGpceuAuthStatus } from '../../utils/gpceu-auth'
import { getSupabaseServiceClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const [ragStats, ragSettings, dms, llmHealth, gpceu, recentDocs, activeJobs] = await Promise.all([
    vectorStoreStats().catch((e) => ({ error: e.message })),
    getRagSettings().catch((e) => ({ error: e.message })),
    dmsHealthCheck().catch((e) => ({ ok: false, error: e.message })),
    (async () => {
      try {
        const llm = getActiveLlm()
        const h = await llm.healthCheck()
        return { ...h, provider: llm.name, activeModel: llm.config.model }
      } catch (e: any) { return { ok: false, error: e.message } }
    })(),
    (async () => {
      const cfg = getGpceuConfig()
      const configErr = checkGpceuConfig(cfg)
      if (configErr) return { ok: false, ...configErr.body, auth: getGpceuAuthStatus(cfg) }
      try {
        const res = await callGpceu(cfg, cfg.baseUrl + '/' + cfg.healthPath, 'GET', null, event)
        const bodyText = await res.text()
        let parsed: unknown = null
        try { parsed = JSON.parse(bodyText) } catch { /* text */ }
        return { ok: res.ok, gpcVersion: parsed ?? bodyText.trim(), auth: getGpceuAuthStatus(cfg), status: res.status }
      } catch (e: any) { return { ok: false, error: e.message, auth: getGpceuAuthStatus(cfg) } }
    })(),
    (async () => {
      try {
        const sb = getSupabaseServiceClient()
        const { data } = await sb.from('documents').select('id, name, status, uploaded_at').order('uploaded_at', { ascending: false }).limit(5)
        return data || []
      } catch { return [] }
    })(),
    (async () => {
      try {
        const sb = getSupabaseServiceClient()
        const { data } = await sb.from('import_jobs').select('id, status, total_count, processed_count, failed_count, started_at').in('status', ['pending', 'running']).order('started_at', { ascending: false }).limit(5)
        return data || []
      } catch { return [] }
    })()
  ])

  return {
    ok: true,
    timestamp: new Date().toISOString(),
    vectorStore: ragStats,
    ragSettings,
    dms,
    chat: llmHealth,
    gpceu,
    recentDocuments: recentDocs,
    activeJobs
  }
})
