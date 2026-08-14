/**
 * Rate-Limiter auf Supabase-Basis (Sliding-Window per SQL-COUNT).
 *
 * Keine Redis-Abhängigkeit — für Vercel-serverless einfach und ausreichend
 * bei internen User-Volumina. Bei Skalierung > ~50 QPS auf Upstash umziehen.
 *
 * Usage:
 *   const check = await checkRateLimit(`user:${user.id}`, 'chat', 50, 3600)
 *   if (!check.allowed) throw createError({ statusCode: 429, statusMessage: ... })
 */

import { getSupabaseServiceClient } from './supabase'

export interface RateLimitResult {
  allowed: boolean
  count: number
  limit: number
  retryAfterSec: number
}

/**
 * Sliding-Window-Limiter.
 *
 * @param subject      Bucket-Key (z.B. `user:<uuid>` oder `ip:<addr>`)
 * @param action       Aktions-Name (z.B. 'chat', 'upload')
 * @param limit        Max. Events im Fenster
 * @param windowSec    Fenster-Länge in Sekunden
 */
export async function checkRateLimit(
  subject: string,
  action: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const sb = getSupabaseServiceClient()
  const windowStart = new Date(Date.now() - windowSec * 1000).toISOString()

  const { count, error } = await sb
    .from('rate_limit_events')
    .select('*', { count: 'exact', head: true })
    .eq('subject', subject)
    .eq('action', action)
    .gte('created_at', windowStart)

  if (error) {
    // Fail-open: bei DB-Fehler nicht den User blockieren, aber loggen.
    console.error('[rate-limit] Supabase count failed:', error.message)
    return { allowed: true, count: 0, limit, retryAfterSec: 0 }
  }

  const current = count ?? 0
  if (current >= limit) {
    return { allowed: false, count: current, limit, retryAfterSec: windowSec }
  }

  // Event zählen (best-effort — Fehler nicht dem User zumuten)
  try {
    const { error: insertErr } = await sb.from('rate_limit_events').insert({ subject, action })
    if (insertErr) console.error('[rate-limit] insert failed:', insertErr.message)
  } catch (err) {
    console.error('[rate-limit] insert threw:', err)
  }

  return { allowed: true, count: current + 1, limit, retryAfterSec: 0 }
}
