<script setup lang="ts">
/**
 * DmsSearchModal — fulltext search over the DMS + import one-or-more
 * selected hits into the local vector store.
 *
 * Fires POST /api/dms/import on confirm; parent should refresh its
 * document list when this modal closes with `success`.
 */
import { ref, computed } from 'vue'
import ModalDialog from '~/components/ModalDialog.vue'
import DataTable from '~/components/DataTable.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'imported', imported: string[]): void
}>()

const api = useApi()
const toast = useToast()

const fulltext = ref('')
const searching = ref(false)
const rows = ref<any[]>([])
const selected = ref<Set<string>>(new Set())
const importing = ref(false)
/** Wenn die Suche eine Server-Antwort mit ok:false liefert (z.B. weil DMS_API_KEY
 *  auf Vercel nicht gesetzt ist, oder dms-prod.guentner.com aus dem Vercel-Netz
 *  nicht erreichbar ist), zeigen wir den Fehlertext direkt in der Modal-Tabelle
 *  statt die irreführende "keine Treffer"-Empty-Zeile. */
const searchError = ref<string | null>(null)
const hasSearched = ref(false)

const columns = [
  { key: 'select', label: '', width: '40px' },
  { key: 'filename', label: 'Filename' },
  { key: 'category', label: 'Category', width: '140px' },
  { key: 'modified', label: 'Modified', width: '120px' }
]

const canImport = computed(() => selected.value.size > 0 && !importing.value)

const appliedObjectDefIds = ref<string[]>([])

async function runSearch() {
  if (!fulltext.value.trim()) return
  searching.value = true
  searchError.value = null
  hasSearched.value = true
  try {
    const res = await api.get<{ ok: boolean; hits?: any[]; items?: any[]; appliedFilters?: any }>('/api/dms/search', {
      query: { fulltext: fulltext.value.trim(), pageSize: 25 }
    })
    const items = res.items || res.hits || []
    rows.value = items.map((h: any) => ({
      dmsId: h.id || h.dmsId,
      filename: h.filename || h.title || h.name || '(no filename)',
      category: h.categoryLabel || h.category || h.objectType || '',
      modified: h.modified || h.lastModified || '',
      _raw: h
    }))
    appliedObjectDefIds.value = Array.isArray(res.appliedFilters?.objectDefinitionIds)
      ? res.appliedFilters.objectDefinitionIds
      : []
    selected.value = new Set()
  } catch (err: any) {
    const msg = err?.message || 'DMS-Suche fehlgeschlagen'
    searchError.value = msg
    rows.value = []
    toast.error(msg)
  } finally {
    searching.value = false
  }
}

const emptyMessage = computed(() => {
  if (searchError.value) return `DMS-Verbindung fehlgeschlagen: ${searchError.value}`
  if (hasSearched.value) return `Keine Treffer für „${fulltext.value.trim()}".`
  return 'Volltext eintippen und Enter drücken, um im DMS zu suchen.'
})

function toggleRow(dmsId: string) {
  if (selected.value.has(dmsId)) selected.value.delete(dmsId)
  else selected.value.add(dmsId)
  selected.value = new Set(selected.value)
}

async function runImport() {
  if (!canImport.value) return
  importing.value = true
  try {
    const res = await api.post<{ ok: boolean; imported: string[]; failed: any[] }>('/api/dms/import', {
      dmsIds: Array.from(selected.value)
    })
    if (res.failed?.length) {
      toast.error(`${res.imported.length} importiert, ${res.failed.length} fehlgeschlagen`)
    } else {
      toast.success(`${res.imported.length} Dokument(e) importiert`)
    }
    emit('imported', res.imported)
    emit('update:open', false)
  } catch (err: any) {
    toast.error(err.message || 'Import fehlgeschlagen')
  } finally {
    importing.value = false
  }
}

function close() { emit('update:open', false) }
</script>

<template>
  <ModalDialog :open="props.open" title="Aus DMS importieren" size="xl" @update:open="close">
    <div class="dms-search-form">
      <input
        type="search"
        v-model="fulltext"
        placeholder="Volltextsuche in DMS…"
        @keyup.enter="runSearch"
      />
      <button class="btn btn-primary" :disabled="searching || !fulltext.trim()" @click="runSearch">
        {{ searching ? 'Suche…' : 'Suchen' }}
      </button>
    </div>
    <p v-if="appliedObjectDefIds.length" class="dms-filter-chip">
      Filter: <code>{{ appliedObjectDefIds.join(', ') }}</code>
      <span class="dms-filter-hint">(via <code>DMS_DEFAULT_OBJECT_DEFINITION_IDS</code>)</span>
    </p>

    <div v-if="searchError" class="dms-error-hint">
      <strong>DMS-Verbindung fehlgeschlagen.</strong>
      <p>{{ searchError }}</p>
      <p class="dms-error-hint-tip">
        Prüfe: <code>DMS_BASE_URL</code>, <code>DMS_REPOSITORY_ID</code>, <code>DMS_API_KEY</code>
        in den Vercel Environment Variables — und ob <code>dms-prod.guentner.com</code> aus dem
        Deploy-Netz erreichbar ist (VPN / IP-Allowlist).
        Diagnose: <code>/api/dms/health</code> aufrufen.
      </p>
    </div>

    <DataTable
      :rows="rows"
      :columns="columns"
      :loading="searching"
      :empty-message="emptyMessage"
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
        <div class="filename-cell">
          <strong>{{ row.filename }}</strong>
          <small>{{ row.dmsId }}</small>
        </div>
      </template>
    </DataTable>

    <template #footer>
      <span class="selected-count">{{ selected.size }} ausgewählt</span>
      <button class="btn btn-outline" @click="close">Abbrechen</button>
      <button class="btn btn-primary" :disabled="!canImport" @click="runImport">
        {{ importing ? 'Importiere…' : 'Importieren' }}
      </button>
    </template>
  </ModalDialog>
</template>

<style scoped>
.dms-search-form {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.dms-search-form input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
}
.filename-cell strong {
  display: block;
  color: var(--c-text-value);
  font-weight: 500;
}
.filename-cell small {
  font-family: 'DM Mono', monospace;
  font-size: var(--font-4xs);
  color: var(--c-text-light2);
}
.selected-count {
  margin-right: auto;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
}
.dms-error-hint {
  margin-bottom: 12px;
  padding: 12px 14px;
  background: color-mix(in srgb, var(--c-error, #B33A3A) 8%, white);
  border: 1px solid color-mix(in srgb, var(--c-error, #B33A3A) 40%, transparent);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-value);
}
.dms-error-hint strong { display: block; margin-bottom: 4px; }
.dms-error-hint p { margin: 0 0 6px; line-height: 1.5; }
.dms-error-hint p:last-child { margin: 0; }
.dms-error-hint-tip {
  color: var(--c-text-medium);
  font-size: var(--font-4xs);
}
.dms-error-hint code {
  padding: 1px 5px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: 3px;
  font-family: 'DM Mono', monospace;
  font-size: 90%;
}
.dms-filter-chip {
  margin: -6px 0 12px;
  font-family: var(--font-ui);
  font-size: var(--font-4xs);
  color: var(--c-text-medium);
}
.dms-filter-chip code {
  padding: 1px 6px;
  background: color-mix(in srgb, var(--c-brand-blue, #0078BE) 10%, white);
  border: 1px solid color-mix(in srgb, var(--c-brand-blue, #0078BE) 30%, transparent);
  border-radius: 3px;
  font-family: 'DM Mono', monospace;
  color: var(--c-brand-blue, #0078BE);
}
.dms-filter-hint {
  margin-left: 6px;
  color: var(--c-text-light2);
}
</style>
