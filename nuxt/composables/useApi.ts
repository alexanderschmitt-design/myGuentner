/**
 * useApi — thin $fetch wrapper for admin pages.
 *
 * Surfaces `{ ok: false, error: '...' }` response bodies as thrown Errors so
 * consumers can use plain try/catch and let useToast render the message.
 * All admin routes go through here so we can centralise auth-error handling
 * later (e.g. redirect to /login on 401 in one place).
 */

interface FetchOpts {
  /** Skip the `{ ok:false }` unwrap. */
  raw?: boolean
  method?: string
  headers?: Record<string, string>
  body?: any
  query?: Record<string, any>
  [key: string]: any
}

export function useApi() {
  async function request<T = any>(path: string, opts: FetchOpts = {}): Promise<T> {
    const { raw, ...rest } = opts
    try {
      const res = await $fetch<any>(path, rest as any)
      if (!raw && res && typeof res === 'object' && res.ok === false) {
        throw new Error(res.error || res.message || 'Request failed')
      }
      return res as T
    } catch (err: any) {
      // Nuxt $fetch throws on non-2xx already; surface the server's error body if present
      const body = err?.data
      if (body && (body.error || body.message)) {
        throw new Error(body.error || body.message)
      }
      throw err
    }
  }

  return {
    get: <T = any>(path: string, opts: FetchOpts = {}) => request<T>(path, { ...opts, method: 'GET' }),
    post: <T = any>(path: string, body?: any, opts: FetchOpts = {}) =>
      request<T>(path, { ...opts, method: 'POST', body }),
    put: <T = any>(path: string, body?: any, opts: FetchOpts = {}) =>
      request<T>(path, { ...opts, method: 'PUT', body }),
    del: <T = any>(path: string, opts: FetchOpts = {}) => request<T>(path, { ...opts, method: 'DELETE' })
  }
}
