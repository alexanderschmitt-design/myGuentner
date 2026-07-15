/**
 * useJobPoller — poll a job endpoint until it reaches a terminal status.
 *
 * Usage:
 *   const { job, isDone, start, stop } = useJobPoller<ImportJob>(
 *     (id) => `/api/dms/import/${id}`,
 *     (job) => job?.status !== 'pending' && job?.status !== 'running',
 *     2000
 *   )
 *   start('abc-123')
 */

export interface JobPollerOptions<T> {
  urlFor: (id: string) => string
  isTerminal: (job: T | null) => boolean
  intervalMs?: number
  onUpdate?: (job: T) => void
}

export function useJobPoller<T = any>(opts: JobPollerOptions<T>) {
  const job = ref<T | null>(null)
  const error = ref<string | null>(null)
  const isPolling = ref(false)
  const currentId = ref<string | null>(null)
  let handle: ReturnType<typeof setInterval> | null = null

  async function tick() {
    if (!currentId.value) return
    try {
      const res = await $fetch<T>(opts.urlFor(currentId.value))
      job.value = res
      opts.onUpdate?.(res)
      if (opts.isTerminal(res)) stop()
    } catch (err: any) {
      error.value = err?.data?.error || err?.message || String(err)
      stop()
    }
  }

  function start(id: string) {
    stop()
    currentId.value = id
    error.value = null
    isPolling.value = true
    tick()
    handle = setInterval(tick, opts.intervalMs ?? 2000)
  }

  function stop() {
    if (handle) {
      clearInterval(handle)
      handle = null
    }
    isPolling.value = false
  }

  onBeforeUnmount(() => stop())

  return {
    job,
    error,
    isPolling,
    isDone: computed(() => opts.isTerminal(job.value)),
    start,
    stop
  }
}
