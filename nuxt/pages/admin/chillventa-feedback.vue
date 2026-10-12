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
const deleteTarget = ref<FeedbackRow | null>(null)
const deleting = ref(false)

const columns = [
  { key: 'customer_name', label: 'Name / Unternehmen' },
  { key: 'chatbot_feedback', label: 'Chatbot-Ansatz', width: '120px', align: 'center' as const },
  { key: 'refrigerant_feedback', label: 'by App / Refrig.', width: '120px', align: 'center' as const },
  { key: 'catalog_feedback', label: 'Produktkatalog', width: '120px', align: 'center' as const },
  { key: 'other_use_cases', label: 'Weitere Module?', width: '120px', align: 'center' as const },
  { key: 'created_at', label: 'Datum', width: '140px' },
  { key: 'expand', label: '', width: '36px', align: 'center' as const },
  { key: 'delete', label: '', width: '36px', align: 'center' as const },
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

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await api.del(`/api/admin/chillventa-feedback/${deleteTarget.value.id}`)
    toast.success(`Eintrag von „${deleteTarget.value.customer_name}" gelöscht`)
    deleteTarget.value = null
    await load()
  } catch (err: any) {
    toast.error(err?.data?.error || err.message || 'Löschen fehlgeschlagen')
  } finally {
    deleting.value = false
  }
}

function formatDate(s: string): string {
  try { return new Date(s).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) } catch { return s }
}

function ratingStars(r: string | null): { filled: number; label: string } {
  const n = r ? parseInt(r, 10) : 0
  const labels = ['', 'Schlecht', 'Ausreichend', 'Gut', 'Sehr gut', 'Ausgezeichnet']
  return { filled: isNaN(n) ? 0 : n, label: labels[n] ?? r ?? '—' }
}

function starBarClass(n: number): string {
  if (n >= 5) return 'bar-5'
  if (n >= 4) return 'bar-4'
  if (n >= 3) return 'bar-3'
  if (n >= 2) return 'bar-2'
  return 'bar-1'
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

// Average star rating per field
const averages = computed(() => {
  const fields = ['chatbot_feedback', 'catalog_feedback', 'refrigerant_feedback'] as const
  return fields.map(f => {
    const vals = rows.value.map(r => parseInt(r[f] ?? '0', 10)).filter(n => n > 0)
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    return { field: f, avg: Math.round(avg * 10) / 10, count: vals.length }
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
      <div v-for="s in averages" :key="s.field" class="stat-card">
        <div class="stat-title">{{ statLabels[s.field] }}</div>
        <div class="stat-avg-stars">
          <svg v-for="n in 5" :key="n" viewBox="0 0 20 20" width="22" height="22">
            <path
              d="M10 2l2.4 5.3H18l-4.5 3.4 1.7 5.6L10 13.3l-5.2 3 1.7-5.6L2 7.3h5.6z"
              stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"
              :stroke="n <= Math.round(s.avg) ? '#f59e0b' : '#d1d5db'"
              :fill="n <= Math.round(s.avg) ? '#f59e0b' : 'none'"
            />
          </svg>
        </div>
        <div class="stat-avg-num">Ø {{ s.avg > 0 ? s.avg.toFixed(1) : '—' }} / 5 <span class="stat-avg-count">({{ s.count }} Bewertungen)</span></div>
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
        <span class="inline-stars" :title="ratingStars(row.chatbot_feedback).label">
          <svg v-for="n in 5" :key="n" viewBox="0 0 20 20" width="14" height="14">
            <path d="M10 2l2.4 5.3H18l-4.5 3.4 1.7 5.6L10 13.3l-5.2 3 1.7-5.6L2 7.3h5.6z" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" :stroke="n <= ratingStars(row.chatbot_feedback).filled ? '#f59e0b' : '#d1d5db'" :fill="n <= ratingStars(row.chatbot_feedback).filled ? '#f59e0b' : 'none'"/>
          </svg>
        </span>
      </template>
      <template #cell-catalog_feedback="{ row }">
        <span class="inline-stars" :title="ratingStars(row.catalog_feedback).label">
          <svg v-for="n in 5" :key="n" viewBox="0 0 20 20" width="14" height="14">
            <path d="M10 2l2.4 5.3H18l-4.5 3.4 1.7 5.6L10 13.3l-5.2 3 1.7-5.6L2 7.3h5.6z" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" :stroke="n <= ratingStars(row.catalog_feedback).filled ? '#f59e0b' : '#d1d5db'" :fill="n <= ratingStars(row.catalog_feedback).filled ? '#f59e0b' : 'none'"/>
          </svg>
        </span>
      </template>
      <template #cell-refrigerant_feedback="{ row }">
        <span class="inline-stars" :title="ratingStars(row.refrigerant_feedback).label">
          <svg v-for="n in 5" :key="n" viewBox="0 0 20 20" width="14" height="14">
            <path d="M10 2l2.4 5.3H18l-4.5 3.4 1.7 5.6L10 13.3l-5.2 3 1.7-5.6L2 7.3h5.6z" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" :stroke="n <= ratingStars(row.refrigerant_feedback).filled ? '#f59e0b' : '#d1d5db'" :fill="n <= ratingStars(row.refrigerant_feedback).filled ? '#f59e0b' : 'none'"/>
          </svg>
        </span>
      </template>
      <template #cell-other_use_cases="{ row }">
        <span
          v-if="row.other_use_cases === 'Ja'"
          class="yesno-chip yesno-yes"
        >✓ Ja</span>
        <span
          v-else-if="row.other_use_cases === 'Nein'"
          class="yesno-chip yesno-no"
        >✗ Nein</span>
        <span v-else class="text-muted">—</span>
      </template>
      <template #cell-created_at="{ row }">{{ formatDate(row.created_at) }}</template>
      <template #cell-expand="{ row }">
        <button
          v-if="row.comments || row.other_use_cases"
          class="btn-icon-sm"
          :class="{ active: expandedId === row.id }"
          :title="expandedId === row.id ? 'Einklappen' : 'Kommentar lesen'"
          @click="toggleExpand(row.id)"
        >{{ expandedId === row.id ? '▲' : '▼' }}</button>
        <span v-else class="text-muted">·</span>
      </template>
      <template #cell-delete="{ row }">
        <button
          class="btn-icon-sm btn-icon-danger"
          title="Eintrag löschen"
          @click="deleteTarget = row"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 4h10M6 4V3h4v1M5 4v8h6V4"/>
            <line x1="7" y1="7" x2="7" y2="10"/><line x1="9" y1="7" x2="9" y2="10"/>
          </svg>
        </button>
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

    <!-- Delete confirm -->
    <ModalDialog
      :open="!!deleteTarget"
      title="Eintrag löschen"
      size="sm"
      @update:open="v => { if (!v) deleteTarget = null }"
    >
      <p>Feedback von <strong>{{ deleteTarget?.customer_name }}</strong> unwiderruflich löschen?</p>
      <template #footer>
        <button class="btn btn-outline" @click="deleteTarget = null">Abbrechen</button>
        <button class="btn btn-primary btn-danger-solid" :disabled="deleting" @click="confirmDelete">
          {{ deleting ? 'Lösche…' : 'Löschen' }}
        </button>
      </template>
    </ModalDialog>
  </div>
</template>

<style scoped>
/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}
.stat-card {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.stat-title {
  font-family: var(--font-ui);
  font-size: var(--font-4xs, 11.58px);
  font-weight: 600;
  color: var(--c-text-medium);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.stat-avg-stars { display: flex; gap: 2px; }
.stat-avg-num {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 600;
  color: var(--c-text-value);
}
.stat-avg-count {
  font-weight: 400;
  color: var(--c-text-medium);
}

/* Inline stars in table */
.inline-stars { display: inline-flex; gap: 1px; vertical-align: middle; }

/* Icon buttons */
.btn-icon-sm {
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
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}
.btn-icon-sm:hover,
.btn-icon-sm.active {
  border-color: var(--c-brand-blue);
  background: color-mix(in srgb, var(--c-brand-blue) 8%, white);
  color: var(--c-brand-blue);
}
.btn-icon-danger { color: var(--c-error, #B33A3A); border-color: transparent; }
.btn-icon-danger:hover {
  border-color: var(--c-error, #B33A3A);
  background: color-mix(in srgb, var(--c-error, #B33A3A) 8%, white);
  color: var(--c-error, #B33A3A);
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

/* Ja/Nein chips */
.yesno-chip {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 999px;
  font-family: var(--font-ui);
  font-size: var(--font-4xs, 11.58px);
  font-weight: 600;
}
.yesno-yes { background: #e8f5ee; color: #2a7d4f; }
.yesno-no  { background: #fdf2f2; color: #c0392b; }

/* Buttons */
.btn-sm { padding: 6px 12px; font-size: var(--font-3xs, 12.81px); }
</style>
