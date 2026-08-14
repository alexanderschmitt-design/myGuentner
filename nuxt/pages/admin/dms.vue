<script setup lang="ts">
/**
 * /admin/dms — Direct DMS search + import trigger. Complements the
 * DmsSearchModal reachable from /admin/documents; this full-page view
 * adds a persistent job-monitor panel for tracking imports.
 */
import { ref, onMounted, computed } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'myGPC — DMS' })

const api = useApi()
const toast = useToast()

interface FilterOption { value: string; label: string; count?: number }
interface FilterDef { frontendField: string; label: string; hint: string; options: FilterOption[] }

const health = ref<any>(null)
const fulltext = ref('')
const rows = ref<any[]>([])
const searching = ref(false)
const selected = ref<Set<string>>(new Set())
const importing = ref(false)
const activeJobId = ref<string | null>(null)

const filterDefs = ref<FilterDef[]>([])
const activeFilters = ref<Record<string, string>>({})
const filtersLoading = ref(false)

const columns = [
  { key: 'select', label: '', width: '36px' },
  { key: 'filename', label: 'Filename' },
  { key: 'category', label: 'Category', width: '160px' },
  { key: 'modified', label: 'Modified', width: '120px' }
]

async function loadHealth() {
  try {
    health.value = await api.get('/api/dms/health')
  } catch (err: any) {
    health.value = { ok: false, error: err.message }
  }
}

async function loadFilters() {
  filtersLoading.value = true
  try {
    const res = await api.get<{ ok: boolean; filters: FilterDef[] }>('/api/dms/facets', {
      query: fulltext.value.trim() ? { fulltext: fulltext.value.trim() } : {}
    })
    filterDefs.value = res.filters || []
  } catch (err: any) {
    toast.error(err.message || 'Filter konnten nicht geladen werden')
  } finally {
    filtersLoading.value = false
  }
}

function setFilter(field: string, value: string) {
  if (!value) delete activeFilters.value[field]
  else activeFilters.value[field] = value
  activeFilters.value = { ...activeFilters.value }
}

function clearFilters() {
  activeFilters.value = {}
}

const hasFilters = computed(() => Object.keys(activeFilters.value).length > 0)

function buildSearchQuery() {
  const query: Record<string, string | number> = { pageSize: 50 }
  if (fulltext.value.trim()) query.fulltext = fulltext.value.trim()
  for (const [k, v] of Object.entries(activeFilters.value)) {
    query[`filter.${k}`] = v
  }
  return query
}

async function runSearch() {
  if (!fulltext.value.trim() && !hasFilters.value) return
  searching.value = true
  try {
    const res = await api.get<{ ok: boolean; items?: any[] }>('/api/dms/search', {
      query: buildSearchQuery()
    })
    rows.value = (res.items || []).map((h: any) => ({
      dmsId: h.dmsId || h.id,
      filename: h.filename || h.caption || '(no filename)',
      category: h.categoryLabel || h.categoryId || '',
      modified: (h.modifiedAt || '').slice(0, 10),
      _raw: h
    }))
    selected.value = new Set()
  } catch (err: any) {
    toast.error(err.message || 'DMS-Suche fehlgeschlagen')
  } finally {
    searching.value = false
  }
}

function toggleRow(dmsId: string) {
  if (selected.value.has(dmsId)) selected.value.delete(dmsId)
  else selected.value.add(dmsId)
  selected.value = new Set(selected.value)
}

async function runImport() {
  if (!selected.value.size || importing.value) return
  importing.value = true
  try {
    const res = await api.post<{ ok: boolean; jobId: string }>('/api/dms/import', {
      dmsIds: Array.from(selected.value)
    })
    activeJobId.value = res.jobId
    toast.success('Import gestartet')
  } catch (err: any) {
    toast.error(err.message || 'Import fehlgeschlagen')
  } finally {
    importing.value = false
  }
}

onMounted(() => {
  loadHealth()
  loadFilters()
})
</script>

<template>
  <div>
    <AdminPageHeader
      title="DMS"
      description="d.velop d.3one Volltextsuche und Import in den lokalen Vector Store."
    >
      <template #actions>
        <span v-if="health" class="dms-status" :class="{ 'is-ok': health.ok, 'is-fail': !health.ok }">
          DMS: {{ health.ok ? 'OK' : 'offline' }}
        </span>
      </template>
    </AdminPageHeader>

    <section class="card search-card">
      <div class="dms-search-form">
        <input
          type="search"
          v-model="fulltext"
          placeholder="Volltextsuche…"
          @keyup.enter="runSearch"
        />
        <button
          class="btn btn-primary"
          :disabled="searching || (!fulltext.trim() && !hasFilters)"
          @click="runSearch"
        >
          {{ searching ? 'Suche…' : 'Suchen' }}
        </button>
      </div>

      <div v-if="filterDefs.length" class="dms-filter-row">
        <div v-for="f in filterDefs" :key="f.frontendField" class="dms-filter">
          <label>{{ f.label }}</label>
          <select
            :value="activeFilters[f.frontendField] || ''"
            @change="setFilter(f.frontendField, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">— alle —</option>
            <option v-for="opt in f.options" :key="opt.value" :value="opt.value">
              {{ opt.label }}<span v-if="opt.count"> ({{ opt.count }})</span>
            </option>
          </select>
        </div>
        <button
          v-if="hasFilters"
          class="btn btn-link filter-clear"
          type="button"
          @click="clearFilters"
        >Filter zurücksetzen</button>
      </div>
      <div v-else-if="filtersLoading" class="filter-hint">Lade Filter …</div>
    </section>

    <DataTable
      :rows="rows"
      :columns="columns"
      :loading="searching"
      empty-message="Volltext oben eingeben und suchen."
      :row-key="(r: any) => r.dmsId"
    >
      <template #cell-select="{ row }">
        <input
          type="checkbox"
          :checked="selected.has(row.dmsId)"
          @change="toggleRow(row.dmsId)"
        />
      </template>
      <template #cell-filename="{ row }">
        <div>
          <strong>{{ row.filename }}</strong>
          <div class="cell-sub">{{ row.dmsId }}</div>
        </div>
      </template>
    </DataTable>

    <div v-if="rows.length" class="dms-actions">
      <span class="selected-count">{{ selected.size }} ausgewählt</span>
      <button class="btn btn-primary" :disabled="!selected.size || importing" @click="runImport">
        {{ importing ? 'Import läuft…' : `Ausgewählte importieren` }}
      </button>
    </div>

    <div v-if="activeJobId" class="job-panel">
      <ImportJobMonitor :job-id="activeJobId" />
    </div>
  </div>
</template>

<style scoped>
.dms-status {
  padding: 4px 10px;
  border-radius: 999px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
}
.dms-status.is-ok { background: color-mix(in srgb, var(--c-success) 15%, white); color: var(--c-success); }
.dms-status.is-fail { background: color-mix(in srgb, var(--c-error) 15%, white); color: var(--c-error); }

.card {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
}
.dms-search-form { display: flex; gap: 8px; }
.dms-search-form input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  outline: none;
}
.dms-search-form input:focus {
  border-color: var(--c-brand-blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 15%, transparent);
}

.dms-filter-row {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  align-items: end;
}
.dms-filter { display: flex; flex-direction: column; gap: 4px; }
.dms-filter label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
}
.dms-filter select {
  padding: 8px 10px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  background: white;
}
.filter-clear {
  align-self: center;
  color: var(--c-brand-blue);
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--font-3xs);
  text-decoration: underline;
  padding: 4px 0;
}
.filter-hint {
  margin-top: 12px;
  color: var(--c-text-medium);
  font-size: var(--font-3xs);
}

.cell-sub {
  font-family: 'DM Mono', monospace;
  font-size: var(--font-4xs);
  color: var(--c-text-light2);
}
.dms-actions {
  margin-top: var(--space-4);
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
}
.selected-count {
  margin-right: auto;
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
}
.job-panel { margin-top: var(--space-4); }
</style>
