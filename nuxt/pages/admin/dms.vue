<script setup lang="ts">
/**
 * /admin/dms — Direct DMS search + import trigger.
 *
 * Für Portal Public Documents (DMANU) ist ein statisches 10-Filter-Set
 * (Document Type, Permission, Brand, Region, Language Portal, Product
 * Category, Product Level 1, Product Group, Product Family, Product Series)
 * fest in der Seite verdrahtet. Die einzelnen Filter-Options werden lazy
 * vom Server geholt (6h in-process gecached) — damit blockiert der
 * erste Page-Load nicht auf Full-Discovery.
 *
 * Andere ObjectDefinitions verwenden weiterhin das legacy DMS_PROPERTY_MAP-
 * getriebene facets.get.ts.
 */
import { ref, onMounted, computed } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'myGPC — DMS' })

const api = useApi()
const toast = useToast()

interface FilterOption { value: string; label: string; count?: number }
interface FilterDef {
  frontendField: string
  label: string
  hint?: string
  options: FilterOption[]
  sourcePropertyId?: string | null
  loading?: boolean
}

const filterTree = useDmsPortalFilterTree()

// Portal Public Documents ist der Default-Objekttyp — die Guntner-DMS-
// Suche findet hier die freigegebenen Kunden-Manuals + Broschüren.
const PORTAL_PUBLIC_DOCUMENTS_OBJDEF_ID = 'DMANU'
const PORTAL_FILTERS_STATIC: Array<{ frontendField: string; label: string }> = [
  { frontendField: 'documentType',    label: 'Document Type' },
  { frontendField: 'permission',      label: 'Permission' },
  { frontendField: 'brand',           label: 'Brand' },
  { frontendField: 'region',          label: 'Region' },
  { frontendField: 'languagePortal',  label: 'Language Portal' },
  { frontendField: 'productCategory', label: 'Product Category' },
  { frontendField: 'productLevel1',   label: 'Product Level 1' },
  { frontendField: 'productGroup',    label: 'Product Group' },
  { frontendField: 'productFamily',   label: 'Product Family' },
  { frontendField: 'productSeries',   label: 'Product Series' }
]

const health = ref<any>(null)
const fulltext = ref('')
const rows = ref<any[]>([])
const searching = ref(false)
const selected = ref<Set<string>>(new Set())
const importing = ref(false)
const activeJobId = ref<string | null>(null)

const objectCategory = ref<string>(PORTAL_PUBLIC_DOCUMENTS_OBJDEF_ID)
const filterDefs = ref<FilterDef[]>(PORTAL_FILTERS_STATIC.map((f) => ({ ...f, options: [], loading: true })))
const activeFilters = ref<Record<string, string>>({})

const columns = [
  { key: 'select', label: '', width: '36px' },
  { key: 'filename', label: 'Filename' },
  { key: 'category', label: 'Category', width: '160px' },
  { key: 'modified', label: 'Modified', width: '120px' }
]

async function loadHealth() {
  try {
    health.value = await api.get('/api/dms/health')
    const defaults: string = health.value?.defaultObjectDefinitionIds || ''
    if (defaults) {
      const first = defaults.split(',').map((s: string) => s.trim()).filter(Boolean)[0]
      if (first) objectCategory.value = first
    }
  } catch (err: any) {
    health.value = { ok: false, error: err.message }
  }
}

async function loadPortalFilterValues() {
  // Nur DMANU hat das statische Filter-Set. Andere ObjDefs → leer / TODO.
  if (objectCategory.value !== PORTAL_PUBLIC_DOCUMENTS_OBJDEF_ID) {
    filterDefs.value = []
    return
  }
  // Ein Aufruf holt alle 10 Filter parallel; Server cached 6h in-process
  // → zweiter Load praktisch instant.
  try {
    const res = await api.get<{
      ok: boolean
      filters: Array<{ frontendField: string; label: string; propertyId: string | null; options: Array<{ value: string; count?: number }> }>
    }>('/api/dms/filter-values', { query: { objectDefinitionId: objectCategory.value } })
    if (res.ok && Array.isArray(res.filters)) {
      const byField = new Map(res.filters.map((f) => [f.frontendField, f]))
      filterDefs.value = PORTAL_FILTERS_STATIC.map((f) => {
        const v = byField.get(f.frontendField)
        return {
          ...f,
          options: (v?.options || []).map((o) => ({ value: o.value, label: o.value, count: o.count })),
          sourcePropertyId: v?.propertyId || null,
          loading: false
        }
      })
    }
  } catch (err: any) {
    toast.error(err.message || 'Filter-Werte konnten nicht geladen werden')
    filterDefs.value = filterDefs.value.map((f) => ({ ...f, loading: false }))
  }
}

// Kaskaden-Reihenfolge: wenn ein Parent geändert wird, werden alle Child-
// Filter, deren aktueller Wert nicht mehr in der neuen Menge erlaubter Werte
// enthalten ist, automatisch zurückgesetzt.
const CASCADE_ORDER = ['productCategory', 'productLevel1', 'productGroup', 'productFamily', 'productSeries']

function setFilter(field: string, value: string) {
  if (!value) delete activeFilters.value[field]
  else activeFilters.value[field] = value
  activeFilters.value = { ...activeFilters.value }

  // Cascade-Reset: alle Child-Filter prüfen ob ihr Wert noch valide ist.
  const parentIdx = CASCADE_ORDER.indexOf(field)
  if (parentIdx < 0) return
  for (let i = parentIdx + 1; i < CASCADE_ORDER.length; i++) {
    const child = CASCADE_ORDER[i]
    const active = activeFilters.value[child]
    if (!active) continue
    const allowed = filterTree.allowedValuesFor(child as any, activeFilters.value)
    if (allowed.size && !allowed.has(active)) {
      delete activeFilters.value[child]
      activeFilters.value = { ...activeFilters.value }
    }
  }
}

// Options der 5 Cascading-Filter live gegen die CSV filtern. Non-Cascade-
// Filter (Document Type, Permission, Brand, Region, Language Portal) bleiben
// unverändert — die haben keine Abhängigkeit untereinander.
const cascadedFilterDefs = computed<FilterDef[]>(() => {
  return filterDefs.value.map((f) => {
    if (!filterTree.isCascadeField(f.frontendField)) return f
    return {
      ...f,
      options: filterTree.filterOptions(f.frontendField as any, f.options, activeFilters.value)
    }
  })
})

function clearFilters() {
  activeFilters.value = {}
}

const hasFilters = computed(() => Object.keys(activeFilters.value).length > 0)

function buildSearchQuery() {
  const query: Record<string, string | number> = { pageSize: 50 }
  if (fulltext.value.trim()) query.fulltext = fulltext.value.trim()
  query.objectDefinitionIds = objectCategory.value
  const propMap = new Map(filterDefs.value.map((f) => [f.frontendField, f.sourcePropertyId]))
  for (const [k, v] of Object.entries(activeFilters.value)) {
    const propId = propMap.get(k)
    if (propId) query[`prop.${propId}`] = v
    else query[`filter.${k}`] = v
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

onMounted(async () => {
  await loadHealth()
  // Filter-Values + CSV-Kaskaden parallel laden — Page ist sofort sichtbar.
  loadPortalFilterValues()
  filterTree.ensureLoaded()
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

      <div class="dms-scope-row">
        <span class="dms-scope-label">Dokumententyp:</span>
        <span class="dms-scope-chip">Portal Public Documents <code>({{ objectCategory }})</code></span>
      </div>

      <div v-if="cascadedFilterDefs.length" class="dms-filter-row">
        <div v-for="f in cascadedFilterDefs" :key="f.frontendField" class="dms-filter">
          <label>{{ f.label }}<span v-if="f.options.length" class="dms-filter-count">{{ f.options.length }}</span></label>
          <select
            :value="activeFilters[f.frontendField] || ''"
            :disabled="f.loading || !f.options.length"
            @change="setFilter(f.frontendField, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">
              {{ f.loading ? '— lädt… —' : (!f.options.length ? '— keine Werte —' : '— alle —') }}
            </option>
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
    </section>

    <DataTable
      :rows="rows"
      :columns="columns"
      :loading="searching"
      empty-message="Volltext oben eingeben oder Filter setzen und suchen."
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

.dms-scope-row {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
}
.dms-scope-chip {
  padding: 3px 10px;
  background: color-mix(in srgb, var(--c-brand-blue, #0078BE) 12%, white);
  color: var(--c-brand-blue, #0078BE);
  border-radius: 999px;
  font-weight: 500;
}
.dms-scope-chip code {
  margin-left: 4px;
  font-family: 'DM Mono', monospace;
  font-size: 90%;
  color: color-mix(in srgb, var(--c-brand-blue, #0078BE) 70%, black);
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
  display: flex;
  align-items: center;
  gap: 6px;
}
.dms-filter-count {
  padding: 1px 6px;
  background: var(--c-bg, #F5F4F0);
  border-radius: 10px;
  font-family: 'DM Mono', monospace;
  font-size: 90%;
  color: var(--c-text-light2);
}
.dms-filter select {
  padding: 8px 10px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  background: white;
}
.dms-filter select:disabled {
  background: color-mix(in srgb, var(--c-bg, #F5F4F0) 70%, white);
  color: var(--c-text-light2);
  cursor: not-allowed;
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
