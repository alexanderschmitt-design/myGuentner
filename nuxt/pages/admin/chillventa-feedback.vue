<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'myGPC — Chillventa Feedback' })

interface FeedbackRow {
  id: string
  customer_name: string
  chatbot_feedback: string | null
  catalog_feedback: string | null
  refrigerant_feedback: string | null
  other_use_cases: string | null
  comments: string | null
  created_at: string
}

const api = useApi()
const toast = useToast()

const rows = ref<FeedbackRow[]>([])
const total = ref(0)
const loading = ref(true)
const expandedId = ref<string | null>(null)

const columns = [
  { key: 'customer_name', label: 'Name / Unternehmen' },
  { key: 'chatbot_feedback', label: 'Chatbot', width: '130px', align: 'center' as const },
  { key: 'catalog_feedback', label: 'Konfigurator', width: '130px', align: 'center' as const },
  { key: 'refrigerant_feedback', label: 'Kältemittel', width: '130px', align: 'center' as const },
  { key: 'other_use_cases', label: 'Weitere Nutzung', width: '160px' },
  { key: 'created_at', label: 'Datum', width: '150px' },
  { key: 'expand', label: '', width: '50px', align: 'center' as const },
]

async function load() {
  loading.value = true
  try {
    const res = await api.get<{ rows: FeedbackRow[]; total: number }>('/api/admin/chillventa-feedback')
    rows.value = res.rows
    total.value = res.total
  } catch (err: any) {
    toast.error(err.message || 'Feedback konnte nicht geladen werden')
  } finally {
    loading.value = false
  }
}

function formatDate(s: string): string {
  try { return new Date(s).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) } catch { return s }
}

function ratingClass(r: string | null): string {
  if (!r) return 'rating-none'
  if (r === 'Sehr hilfreich') return 'rating-great'
  if (r === 'Hilfreich') return 'rating-good'
  if (r === 'Okay') return 'rating-ok'
  return 'rating-low'
}

function ratingEmoji(r: string | null): string {
  if (!r) return '—'
  const map: Record<string, string> = {
    'Sehr hilfreich': '😊',
    'Hilfreich': '🙂',
    'Okay': '😐',
    'Nicht relevant': '🤷',
  }
  return `${map[r] ?? ''} ${r}`
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function downloadCsv() {
  const header = ['Name', 'Chatbot', 'Konfigurator', 'Kältemittel', 'Weitere Nutzung', 'Kommentar', 'Datum']
  const lines = rows.value.map(r => [
    r.customer_name,
    r.chatbot_feedback ?? '',
    r.catalog_feedback ?? '',
    r.refrigerant_feedback ?? '',
    r.other_use_cases ?? '',
    (r.comments ?? '').replace(/\n/g, ' '),
    formatDate(r.created_at),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

  const csv = [header.join(','), ...lines].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `chillventa-feedback-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Rating distribution stats
const stats = computed(() => {
  const fields = ['chatbot_feedback', 'catalog_feedback', 'refrigerant_feedback'] as const
  return fields.map(f => {
    const counts: Record<string, number> = {}
    for (const r of rows.value) {
      const v = r[f] ?? 'Keine Angabe'
      counts[v] = (counts[v] ?? 0) + 1
    }
    return { field: f, counts }
  })
})

const statLabels: Record<string, string> = {
  chatbot_feedback: 'Chatbot',
  catalog_feedback: 'Konfigurator',
  refrigerant_feedback: 'Kältemittel',
}

onMounted(load)
</script>

<template>
  <div>
    <AdminPageHeader
      title="Chillventa Feedback"
      :description="`${total} Rückmeldungen von der Chillventa 2024`"
    >
      <template #actions>
        <button class="btn btn-outline btn-sm" @click="downloadCsv" :disabled="!rows.length">
          ↓ CSV Export
        </button>
        <button class="btn btn-outline btn-sm" @click="load">Aktualisieren</button>
        <NuxtLink to="/chillventa-feedback" target="_blank" class="btn btn-primary btn-sm">
          Formular öffnen ↗
        </NuxtLink>
      </template>
    </AdminPageHeader>

    <!-- Stats summary -->
    <div v-if="rows.length" class="stats-grid">
      <div v-for="s in stats" :key="s.field" class="stat-card">
        <div class="stat-title">{{ statLabels[s.field] }}</div>
        <div class="stat-bars">
          <div
            v-for="(count, label) in s.counts"
            :key="label"
            class="stat-bar-row"
          >
            <span class="stat-bar-label">{{ label }}</span>
            <div class="stat-bar-track">
              <div
                class="stat-bar-fill"
                :class="ratingClass(label === 'Keine Angabe' ? null : label)"
                :style="{ width: `${Math.round((count / rows.length) * 100)}%` }"
              />
            </div>
            <span class="stat-bar-count">{{ count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <DataTable
      :rows="rows"
      :columns="columns"
      :loading="loading"
      empty-message="Noch keine Feedback-Einträge vorhanden."
    >
      <template #cell-chatbot_feedback="{ row }">
        <span class="rating-chip" :class="ratingClass(row.chatbot_feedback)">
          {{ ratingEmoji(row.chatbot_feedback) }}
        </span>
      </template>
      <template #cell-catalog_feedback="{ row }">
        <span class="rating-chip" :class="ratingClass(row.catalog_feedback)">
          {{ ratingEmoji(row.catalog_feedback) }}
        </span>
      </template>
      <template #cell-refrigerant_feedback="{ row }">
        <span class="rating-chip" :class="ratingClass(row.refrigerant_feedback)">
          {{ ratingEmoji(row.refrigerant_feedback) }}
        </span>
      </template>
      <template #cell-other_use_cases="{ row }">
        <span class="text-truncate" :title="row.other_use_cases ?? ''">
          {{ row.other_use_cases || '—' }}
        </span>
      </template>
      <template #cell-created_at="{ row }">{{ formatDate(row.created_at) }}</template>
      <template #cell-expand="{ row }">
        <button
          v-if="row.comments || row.other_use_cases"
          class="btn-expand"
          :class="{ active: expandedId === row.id }"
          :title="expandedId === row.id ? 'Einklappen' : 'Kommentar lesen'"
          @click="toggleExpand(row.id)"
        >{{ expandedId === row.id ? '▲' : '▼' }}</button>
        <span v-else class="text-muted">·</span>
      </template>

      <!-- Expanded row for comments -->
      <template #after-row="{ row }">
        <tr v-if="expandedId === row.id" class="expanded-row">
          <td :colspan="columns.length" class="expanded-cell">
            <div class="expanded-body">
              <div v-if="row.other_use_cases" class="expanded-section">
                <strong>Weitere Anwendungsfälle:</strong>
                <span>{{ row.other_use_cases }}</span>
              </div>
              <div v-if="row.comments" class="expanded-section">
                <strong>Anmerkungen:</strong>
                <p class="comment-text">{{ row.comments }}</p>
              </div>
            </div>
          </td>
        </tr>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}
.stat-card {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: 16px;
}
.stat-title {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 600;
  color: var(--c-text-medium);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 12px;
}
.stat-bars { display: flex; flex-direction: column; gap: 7px; }
.stat-bar-row {
  display: grid;
  grid-template-columns: 110px 1fr 28px;
  align-items: center;
  gap: 8px;
}
.stat-bar-label {
  font-family: var(--font-ui);
  font-size: var(--font-4xs, 11.58px);
  color: var(--c-text-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stat-bar-track {
  height: 6px;
  border-radius: 999px;
  background: var(--c-bg-muted, #f5f5f5);
  overflow: hidden;
}
.stat-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
  background: var(--c-text-light2);
}
.stat-bar-fill.rating-great { background: #2a7d4f; }
.stat-bar-fill.rating-good  { background: #0078be; }
.stat-bar-fill.rating-ok    { background: #e0a020; }
.stat-bar-fill.rating-low   { background: #c0392b; }
.stat-bar-count {
  font-family: var(--font-mono, monospace);
  font-size: var(--font-4xs, 11.58px);
  color: var(--c-text-medium);
  text-align: right;
}

/* Rating chips */
.rating-chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-family: var(--font-ui);
  font-size: var(--font-4xs, 11.58px);
  font-weight: 500;
  white-space: nowrap;
}
.rating-great { background: #e8f5ee; color: #2a7d4f; }
.rating-good  { background: color-mix(in srgb, var(--c-brand-blue) 12%, white); color: var(--c-brand-blue); }
.rating-ok    { background: #fff8e1; color: #996500; }
.rating-low   { background: #fdf2f2; color: #c0392b; }
.rating-none  { color: var(--c-text-light2); }

/* Expand */
.btn-expand {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--c-border);
  background: white;
  cursor: pointer;
  font-size: 10px;
  color: var(--c-text-medium);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, background 0.15s;
}
.btn-expand:hover,
.btn-expand.active {
  border-color: var(--c-brand-blue);
  background: color-mix(in srgb, var(--c-brand-blue) 8%, white);
  color: var(--c-brand-blue);
}
.text-muted { color: var(--c-text-light2); }

/* Expanded row */
.expanded-row { background: var(--c-bg-muted, #fafafa); }
.expanded-cell { padding: 0 !important; }
.expanded-body {
  padding: 12px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid var(--c-border);
}
.expanded-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
}
.expanded-section strong {
  font-weight: 600;
  color: var(--c-text-medium);
  font-size: var(--font-4xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.comment-text {
  margin: 0;
  color: var(--c-text-value);
  line-height: 1.55;
  white-space: pre-line;
}
.text-truncate {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
}

/* Buttons */
.btn-sm { padding: 6px 12px; font-size: var(--font-3xs, 12.81px); }
</style>
