<script setup lang="ts">
/**
 * /admin/documents — Manage uploaded / imported documents.
 *
 * Actions per row: view (opens the file in a new tab), download,
 * re-process (re-extract + re-chunk + re-embed), delete (with confirm).
 * Top actions: upload a new file, import from DMS, reprocess-all.
 */
import { ref, onMounted } from 'vue'
import DmsSearchModal from '~/components/admin/DmsSearchModal.vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'myGPC — Documents' })

interface DocRow {
  id: string
  name: string
  original_name?: string
  filename?: string
  type: string
  size_bytes: number
  chunk_count: number
  status: string
  source: string
  uploaded_at?: string
  error?: string | null
}

const api = useApi()
const toast = useToast()

const docs = ref<DocRow[]>([])
const loading = ref(true)
const uploading = ref(false)
const dmsOpen = ref(false)
const deleteTarget = ref<DocRow | null>(null)
const reprocessingAll = ref(false)

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type', width: '80px' },
  { key: 'size_bytes', label: 'Size', width: '100px', align: 'right' as const },
  { key: 'chunk_count', label: 'Chunks', width: '90px', align: 'right' as const },
  { key: 'status', label: 'Status', width: '120px' },
  { key: 'source', label: 'Source', width: '110px' }
]

async function load() {
  loading.value = true
  try {
    const res = await api.get<{ documents: DocRow[] }>('/api/documents')
    docs.value = res.documents || []
  } catch (err: any) {
    toast.error(err.message || 'Konnte Dokumente nicht laden')
  } finally {
    loading.value = false
  }
}

async function onFile(f: File | null) {
  if (!f) return
  uploading.value = true
  const fd = new FormData()
  fd.append('document', f)
  try {
    await $fetch('/api/documents/upload', { method: 'POST', body: fd })
    toast.success(`${f.name} hochgeladen`)
    await load()
  } catch (err: any) {
    toast.error(err?.data?.error || err.message || 'Upload fehlgeschlagen')
  } finally {
    uploading.value = false
  }
}

async function reprocess(row: DocRow) {
  try {
    await api.post(`/api/documents/${row.id}/process`)
    toast.success(`Reprocess für ${row.name} gestartet`)
    await load()
  } catch (err: any) {
    toast.error(err.message || 'Reprocess fehlgeschlagen')
  }
}

async function reprocessAll() {
  reprocessingAll.value = true
  try {
    await api.post('/api/documents/reprocess-all')
    toast.success('Reprocess-All gestartet')
    await load()
  } catch (err: any) {
    toast.error(err.message || 'Reprocess-All fehlgeschlagen')
  } finally {
    reprocessingAll.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const row = deleteTarget.value
  deleteTarget.value = null
  try {
    await api.del(`/api/documents/${row.id}`)
    toast.success(`${row.name} gelöscht`)
    await load()
  } catch (err: any) {
    toast.error(err.message || 'Löschen fehlgeschlagen')
  }
}

function view(row: DocRow) {
  window.open(`/api/documents/${row.id}/view`, '_blank')
}

function download(row: DocRow) {
  window.open(`/api/documents/${row.id}/download`, '_blank')
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

onMounted(load)
</script>

<template>
  <div>
    <AdminPageHeader
      title="Documents"
      description="Dokumente hochladen, indexieren, aus dem DMS importieren."
    >
      <template #actions>
        <button class="btn btn-outline" :disabled="reprocessingAll" @click="reprocessAll">
          {{ reprocessingAll ? 'Reprocess…' : 'Reprocess all' }}
        </button>
        <button class="btn btn-outline" @click="dmsOpen = true">Aus DMS importieren</button>
      </template>
    </AdminPageHeader>

    <FileDropzone
      class="doc-upload"
      :disabled="uploading"
      :label="uploading ? 'Uploading…' : 'Datei hierher ziehen oder klicken zum Auswählen'"
      @file="onFile"
      @error="toast.error"
    />

    <DataTable
      :rows="docs"
      :columns="columns"
      :loading="loading"
      empty-message="Noch keine Dokumente. Lade eines hoch oder importiere aus dem DMS."
    >
      <template #cell-name="{ row }">
        <div>
          <strong>{{ row.name }}</strong>
          <div v-if="row.original_name && row.original_name !== row.name" class="cell-sub">{{ row.original_name }}</div>
          <div v-if="row.error" class="cell-error">{{ row.error }}</div>
        </div>
      </template>
      <template #cell-size_bytes="{ row }">{{ formatBytes(row.size_bytes || 0) }}</template>
      <template #cell-status="{ row }">
        <span class="status-pill" :class="`status-${row.status}`">{{ row.status }}</span>
      </template>
      <template #actions="{ row }">
        <button class="row-btn" title="View" @click="view(row)">Ansehen</button>
        <button class="row-btn" title="Download" @click="download(row)">Download</button>
        <button class="row-btn" title="Re-process" @click="reprocess(row)">Reprocess</button>
        <button class="row-btn row-btn-danger" title="Delete" @click="deleteTarget = row">Löschen</button>
      </template>
    </DataTable>

    <DmsSearchModal v-model:open="dmsOpen" @imported="load" />

    <ModalDialog
      :open="!!deleteTarget"
      :title="`${deleteTarget?.name || ''} löschen?`"
      size="sm"
      @update:open="(v) => { if (!v) deleteTarget = null }"
    >
      <p>Löscht das Dokument samt allen Chunks. Nicht rückgängig zu machen.</p>
      <template #footer>
        <button class="btn btn-outline" @click="deleteTarget = null">Abbrechen</button>
        <button class="btn btn-danger" @click="confirmDelete">Ja, löschen</button>
      </template>
    </ModalDialog>
  </div>
</template>

<style scoped>
.doc-upload { margin-bottom: var(--space-4); }

.cell-sub {
  font-family: var(--font-ui);
  font-size: var(--font-4xs);
  color: var(--c-text-light2);
  margin-top: 2px;
}
.cell-error {
  font-size: var(--font-4xs);
  color: var(--c-error, #B33A3A);
  margin-top: 2px;
}
.status-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: var(--font-4xs);
  font-weight: 500;
  text-transform: capitalize;
}
.status-ready { background: color-mix(in srgb, var(--c-success, #2E7D4F) 15%, white); color: var(--c-success, #2E7D4F); }
.status-processing { background: color-mix(in srgb, var(--c-warning, #C57B00) 15%, white); color: var(--c-warning, #C57B00); }
.status-failed { background: color-mix(in srgb, var(--c-error, #B33A3A) 15%, white); color: var(--c-error, #B33A3A); }

.row-btn {
  margin-left: 4px;
  padding: 4px 8px;
  border: 1px solid var(--c-border);
  background: white;
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-value);
  cursor: pointer;
}
.row-btn:hover { background: var(--c-bg); }
.row-btn-danger { color: var(--c-error, #B33A3A); }
.row-btn-danger:hover { background: color-mix(in srgb, var(--c-error, #B33A3A) 8%, white); }

.btn-danger { background: var(--c-error, #B33A3A); color: white; border: 1px solid var(--c-error, #B33A3A); }
</style>
