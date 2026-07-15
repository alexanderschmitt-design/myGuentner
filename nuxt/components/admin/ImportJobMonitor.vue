<script setup lang="ts">
/**
 * ImportJobMonitor — poll GET /api/dms/import/[jobId] and render a
 * progress bar until the job reaches a terminal status.
 */
import { onMounted, watch } from 'vue'

interface ImportJob {
  id: string
  status: string  // pending | running | completed | completed_with_errors | failed
  total_count: number
  processed_count: number
  failed_count: number
  started_at?: string
  finished_at?: string | null
  errors?: Array<{ dmsId: string; error: string }> | null
}

const props = defineProps<{ jobId: string }>()
const emit = defineEmits<{ (e: 'done', job: ImportJob): void }>()

const { job, error, isPolling, start } = useJobPoller<ImportJob>({
  urlFor: (id) => `/api/dms/import/${id}`,
  isTerminal: (j) => !!j && j.status !== 'pending' && j.status !== 'running',
  intervalMs: 1500
})

// The server returns { ok, job }, not the job directly — wrap.
onMounted(() => {
  if (props.jobId) start(props.jobId)
})
watch(() => props.jobId, (id) => { if (id) start(id) })

// Emit `done` when we reach a terminal status
watch(job, (j) => {
  if (j && j.status !== 'pending' && j.status !== 'running') emit('done', j)
})

// The poller stores the raw response ({ ok, job }); adapt getter
const jobData = computed<ImportJob | null>(() => (job.value as any)?.job || (job.value as any) || null)
const percent = computed(() => {
  const j = jobData.value
  if (!j || !j.total_count) return 0
  return Math.round((j.processed_count / j.total_count) * 100)
})
</script>

<template>
  <div class="import-monitor">
    <div v-if="error" class="import-monitor-error">Job fetch failed: {{ error }}</div>
    <template v-else-if="jobData">
      <div class="import-monitor-head">
        <strong>Import job</strong>
        <span class="import-monitor-status" :class="`import-monitor-status-${jobData.status}`">
          {{ jobData.status }}
        </span>
      </div>
      <div class="import-monitor-bar">
        <div class="import-monitor-fill" :style="{ width: percent + '%' }" />
      </div>
      <div class="import-monitor-counts">
        <span>{{ jobData.processed_count }} / {{ jobData.total_count }} verarbeitet</span>
        <span v-if="jobData.failed_count"> · {{ jobData.failed_count }} Fehler</span>
      </div>
      <details v-if="jobData.errors && jobData.errors.length" class="import-monitor-errors">
        <summary>Fehler-Details</summary>
        <ul>
          <li v-for="(e, i) in jobData.errors" :key="i">
            <code>{{ e.dmsId }}</code>: {{ e.error }}
          </li>
        </ul>
      </details>
    </template>
    <div v-else-if="isPolling" class="import-monitor-empty">Wait for first update…</div>
  </div>
</template>

<style scoped>
.import-monitor {
  padding: 12px 14px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-value);
}
.import-monitor-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.import-monitor-status {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: var(--font-4xs);
  text-transform: capitalize;
}
.import-monitor-status-running,
.import-monitor-status-pending { background: color-mix(in srgb, var(--c-warning) 15%, white); color: var(--c-warning); }
.import-monitor-status-completed { background: color-mix(in srgb, var(--c-success) 15%, white); color: var(--c-success); }
.import-monitor-status-completed_with_errors { background: color-mix(in srgb, var(--c-warning) 15%, white); color: var(--c-warning); }
.import-monitor-status-failed { background: color-mix(in srgb, var(--c-error) 15%, white); color: var(--c-error); }
.import-monitor-bar {
  height: 6px;
  background: var(--c-border);
  border-radius: 3px;
  overflow: hidden;
}
.import-monitor-fill {
  height: 100%;
  background: var(--c-brand-blue);
  transition: width 0.3s;
}
.import-monitor-counts {
  margin-top: 6px;
  color: var(--c-text-medium);
  font-size: var(--font-4xs);
}
.import-monitor-empty { color: var(--c-text-light2); }
.import-monitor-error { color: var(--c-error, #B33A3A); }
.import-monitor-errors { margin-top: 8px; }
.import-monitor-errors ul { margin: 4px 0 0; padding-left: 18px; }
.import-monitor-errors code { font-family: 'DM Mono', monospace; font-size: var(--font-4xs); }
</style>
