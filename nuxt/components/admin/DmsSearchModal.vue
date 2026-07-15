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

const columns = [
  { key: 'select', label: '', width: '40px' },
  { key: 'filename', label: 'Filename' },
  { key: 'category', label: 'Category', width: '140px' },
  { key: 'modified', label: 'Modified', width: '120px' }
]

const canImport = computed(() => selected.value.size > 0 && !importing.value)

async function runSearch() {
  if (!fulltext.value.trim()) return
  searching.value = true
  try {
    const res = await api.get<{ ok: boolean; hits?: any[] }>('/api/dms/search', {
      query: { fulltext: fulltext.value.trim(), pageSize: 25 }
    })
    rows.value = (res.hits || []).map((h: any) => ({
      dmsId: h.id || h.dmsId,
      filename: h.filename || h.title || h.name || '(no filename)',
      category: h.category || h.objectType || '',
      modified: h.modified || h.lastModified || '',
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

    <DataTable
      :rows="rows"
      :columns="columns"
      :loading="searching"
      empty-message="Noch keine Suche ausgeführt oder keine Treffer."
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
</style>
