/**
 * App-wide admin-controlled settings (feature flags, section visibility, …).
 * KV-Tabelle `app_settings` in Supabase. Keys folgen dem Namespace-Muster
 * `feature.*` und `section.*` (siehe Migration 20260820000001).
 *
 * In-process Cache 30 s, analog rag-settings.ts.
 */

import { getSupabaseServiceClient } from './supabase'

export type AppSettings = Record<string, unknown>

let cached: AppSettings | null = null
let cachedAt = 0
const CACHE_TTL_MS = 30_000

export async function getAppSettings(): Promise<AppSettings> {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached
  const sb = getSupabaseServiceClient()
  const { data, error } = await sb.from('app_settings').select('key, value')
  if (error) throw new Error(`Failed to load app_settings: ${error.message}`)
  const out: AppSettings = {}
  for (const r of (data ?? []) as Array<{ key: string; value: unknown }>) {
    out[r.key] = r.value
  }
  cached = out
  cachedAt = Date.now()
  return cached
}

export async function setAppSetting(key: string, value: unknown, userId?: string | null): Promise<void> {
  const sb = getSupabaseServiceClient()
  const row: any = { key, value, updated_at: new Date().toISOString() }
  if (userId) row.updated_by = userId
  const { error } = await sb.from('app_settings').upsert(row, { onConflict: 'key' })
  if (error) throw new Error(`Failed to upsert app_settings[${key}]: ${error.message}`)
  invalidateAppSettingsCache()
}

export function invalidateAppSettingsCache(): void {
  cached = null
  cachedAt = 0
}
