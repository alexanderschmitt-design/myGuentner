import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Cache clients across requests within the same Nitro instance — createClient
// is cheap but avoids re-parsing config on every server call.
let serviceClient: SupabaseClient | null = null
let anonClient: SupabaseClient | null = null

/**
 * Server-side Supabase client with the SECRET key (aka service_role).
 * Bypasses Row Level Security. Use for admin operations, background jobs,
 * document ingestion, vector-store writes. NEVER expose to the browser.
 */
export function getSupabaseServiceClient(): SupabaseClient {
  if (serviceClient) return serviceClient

  const config = useRuntimeConfig()
  const url = config.supabaseUrl
  const key = config.supabaseSecretKey

  if (!url || !key) {
    throw new Error('Supabase service client not configured: SUPABASE_URL and SUPABASE_SECRET_KEY must be set')
  }

  serviceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  return serviceClient
}

/**
 * Server-side Supabase client with the PUBLISHABLE key (aka anon).
 * Respects Row Level Security. Use when acting on behalf of a user
 * (session-scoped queries).
 */
export function getSupabaseAnonClient(): SupabaseClient {
  if (anonClient) return anonClient

  const config = useRuntimeConfig()
  const url = config.supabaseUrl
  const key = config.public.supabasePublishableKey

  if (!url || !key) {
    throw new Error('Supabase anon client not configured: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set')
  }

  anonClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  return anonClient
}
