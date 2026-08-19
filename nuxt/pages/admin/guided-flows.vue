<script setup lang="ts">
/**
 * /admin/guided-flows — CRUD-UI für die 7 Home-Entry-Q&A-Flows.
 *
 * Liest aus GET /api/admin/guided-flows (inkl. disabled), zeigt gruppiert
 * nach tab_id, öffnet für jede Row den GuidedFlowEditor als Modal.
 *
 * Delete führt zu Fallback auf Code-Config (nuxt/data/homeEntryFlows.ts),
 * wenn dort dieselbe entry_id noch vorhanden ist.
 */
import { ref, computed, onMounted } from 'vue'
import GuidedFlowEditor from '~/components/admin/GuidedFlowEditor.vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'myGPC — Guided Flows' })

interface DbFlow {
  id: string
  entry_id: string
  tab_id: 'application' | 'refrigerant'
  title: string
  questions: any[]
  fixed_params: Record<string, unknown>
  target_kind: 'static' | 'refrigerant-map'
  target_cat_id: number | null
  target_slug: string | null
  enabled: boolean
  updated_at: string
}

const toast = useToast()
const flows = ref<DbFlow[]>([])
const loading = ref(true)

const activeTab = ref<'application' | 'refrigerant'>('application')

const editorOpen = ref(false)
const editorFlow = ref<DbFlow | null>(null)

const pendingDelete = ref<DbFlow | null>(null)

const applicationFlows = computed(() =>
  flows.value.filter(f => f.tab_id === 'application')
)
const refrigerantFlows = computed(() =>
  flows.value.filter(f => f.tab_id === 'refrigerant')
)
const currentFlows = computed(() =>
  activeTab.value === 'application' ? applicationFlows.value : refrigerantFlows.value
)

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ ok: boolean; flows: DbFlow[]; error?: string }>('/api/admin/guided-flows')
    if (!res.ok) throw new Error(res.error || 'Load failed')
    flows.value = res.flows
  } catch (err: any) {
    toast.error(err?.data?.error || err?.message || 'Failed to load flows')
  } finally {
    loading.value = false
  }
}

function openEditor(flow: DbFlow) {
  editorFlow.value = flow
  editorOpen.value = true
}

async function onSaved(updated: DbFlow) {
  // Row im lokalen State aktualisieren, dann Runtime-Loader invalidieren
  // damit der nächste Home-Klick die neue Version zieht.
  const idx = flows.value.findIndex(f => f.entry_id === updated.entry_id)
  if (idx >= 0) flows.value[idx] = updated
  const { invalidate } = useGuidedEntryFlows()
  invalidate()
}

async function toggleEnabled(flow: DbFlow) {
  try {
    const res = await $fetch<{ ok: boolean; flow: DbFlow; error?: string }>(
      `/api/admin/guided-flows/${encodeURIComponent(flow.entry_id)}`,
      { method: 'PUT', body: { enabled: !flow.enabled } }
    )
    if (!res.ok) throw new Error(res.error || 'Failed')
    const idx = flows.value.findIndex(f => f.entry_id === flow.entry_id)
    if (idx >= 0) flows.value[idx] = res.flow
    useGuidedEntryFlows().invalidate()
    toast.success(`${res.flow.enabled ? 'Enabled' : 'Disabled'} "${res.flow.title}"`)
  } catch (err: any) {
    toast.error(err?.data?.error || err?.message || 'Toggle failed')
  }
}

function askDelete(flow: DbFlow) {
  pendingDelete.value = flow
}
function cancelDelete() { pendingDelete.value = null }
async function confirmDelete() {
  const f = pendingDelete.value
  if (!f) return
  pendingDelete.value = null
  try {
    await $fetch(`/api/admin/guided-flows/${encodeURIComponent(f.entry_id)}`, { method: 'DELETE' })
    flows.value = flows.value.filter(x => x.entry_id !== f.entry_id)
    useGuidedEntryFlows().invalidate()
    toast.success(`Deleted "${f.title}" — code fallback (if any) now active.`)
  } catch (err: any) {
    toast.error(err?.data?.error || err?.message || 'Delete failed')
  }
}

onMounted(load)
</script>

<template>
  <div>
    <AdminPageHeader
      title="Guided Flows"
      description="Q&A-Dialoge, die Günther beim Klick auf Home-Karten führt. Fragen, Antworten, und die Store-Params pro Antwort werden hier gepflegt."
    >
      <template #actions>
        <button class="btn btn-outline" :disabled="loading" @click="load">Refresh</button>
      </template>
    </AdminPageHeader>

    <div class="tab-nav">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'application' }"
        @click="activeTab = 'application'"
      >Application ({{ applicationFlows.length }})</button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'refrigerant' }"
        @click="activeTab = 'refrigerant'"
      >Refrigerant ({{ refrigerantFlows.length }})</button>
    </div>

    <div v-if="loading" class="loading">Loading flows…</div>
    <div v-else-if="!currentFlows.length" class="empty">No flows in this tab. Deleted rows fall back to code configs.</div>

    <div v-else class="flow-grid">
      <article
        v-for="flow in currentFlows"
        :key="flow.entry_id"
        class="flow-card"
        :class="{ 'is-disabled': !flow.enabled }"
      >
        <header class="flow-card-head">
          <div class="flow-card-title">
            <strong>{{ flow.title }}</strong>
            <code class="flow-card-slug">{{ flow.entry_id }}</code>
          </div>
          <span class="flow-card-badge" :class="{ on: flow.enabled }">
            {{ flow.enabled ? '● Enabled' : '○ Disabled' }}
          </span>
        </header>
        <div class="flow-card-meta">
          <span class="meta-pill">{{ flow.questions.length }} question{{ flow.questions.length === 1 ? '' : 's' }}</span>
          <span class="meta-pill">
            <template v-if="flow.target_kind === 'static'">→ {{ flow.target_slug }} (catId {{ flow.target_cat_id }})</template>
            <template v-else>→ refrigerant × purpose map</template>
          </span>
        </div>
        <footer class="flow-card-foot">
          <button class="btn btn-primary btn-sm" @click="openEditor(flow)">Edit</button>
          <button class="btn btn-outline btn-sm" @click="toggleEnabled(flow)">
            {{ flow.enabled ? 'Disable' : 'Enable' }}
          </button>
          <button class="btn btn-outline btn-sm btn-danger" @click="askDelete(flow)">Delete</button>
        </footer>
      </article>
    </div>

    <GuidedFlowEditor
      v-model:open="editorOpen"
      :flow="editorFlow"
      @saved="onSaved"
    />

    <ModalDialog
      :open="!!pendingDelete"
      title="Delete guided flow"
      size="sm"
      @update:open="v => { if (!v) cancelDelete() }"
    >
      <p>
        Delete <strong>"{{ pendingDelete?.title }}"</strong>? If the same
        <code>entry_id</code> is defined in <code>nuxt/data/homeEntryFlows.ts</code>,
        the code fallback will take over. Otherwise the Home card will no longer
        trigger a Q&A dialog.
      </p>
      <template #footer>
        <button type="button" class="btn btn-outline" @click="cancelDelete">Cancel</button>
        <button type="button" class="btn btn-primary btn-danger-solid" @click="confirmDelete">Delete</button>
      </template>
    </ModalDialog>
  </div>
</template>

<style scoped>
.tab-nav {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--c-border);
  margin: 12px 0 20px;
}
.tab-btn {
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  color: var(--c-text-medium);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.tab-btn:hover { color: var(--c-text); }
.tab-btn.active {
  color: var(--c-brand-blue);
  border-bottom-color: var(--c-brand-blue);
  font-weight: 500;
}

.loading, .empty {
  padding: 40px 20px;
  text-align: center;
  color: var(--c-text-medium);
  background: white;
  border: 1px dashed var(--c-border);
  border-radius: var(--radius-md);
}

.flow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
}
.flow-card {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.15s, opacity 0.15s;
}
.flow-card:hover { border-color: var(--c-brand-blue); }
.flow-card.is-disabled { opacity: 0.6; }

.flow-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.flow-card-title { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.flow-card-title strong {
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  color: var(--c-text-value);
}
.flow-card-slug {
  font-family: var(--font-mono, monospace);
  font-size: var(--font-4xs, 11.58px);
  color: var(--c-text-medium);
}
.flow-card-badge {
  font-family: var(--font-ui);
  font-size: var(--font-4xs, 11.58px);
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--c-surface-alt);
  color: var(--c-text-medium);
  white-space: nowrap;
  flex-shrink: 0;
}
.flow-card-badge.on {
  background: color-mix(in srgb, var(--c-success, #2E7D4F) 15%, white);
  color: var(--c-success, #2E7D4F);
}

.flow-card-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.meta-pill {
  padding: 3px 8px;
  border-radius: 3px;
  background: var(--c-surface-alt);
  font-family: var(--font-ui);
  font-size: var(--font-4xs, 11.58px);
  color: var(--c-text-medium);
}

.flow-card-foot {
  display: flex;
  gap: 6px;
  margin-top: auto;
  padding-top: 6px;
}
.btn-sm { padding: 6px 12px; font-size: var(--font-3xs, 12.81px); }
.btn-danger { color: var(--c-error, #B33A3A); border-color: var(--c-error, #B33A3A); }
.btn-danger:hover { background: color-mix(in srgb, var(--c-error, #B33A3A) 6%, white); }
.btn-danger-solid {
  background: var(--c-error, #B33A3A);
  color: white;
  border: 1px solid var(--c-error, #B33A3A);
}
.btn-danger-solid:hover { filter: brightness(1.08); }
</style>
