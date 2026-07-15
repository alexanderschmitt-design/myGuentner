<script setup lang="ts">
/**
 * /admin/system — Aggregated health dashboard. Reads /api/system/status
 * and renders one card per subsystem (vectorStore, ragSettings, dms,
 * chat, gpceu, recentDocuments, activeJobs).
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'myGPC — System' })

const api = useApi()
const toast = useToast()

const status = ref<any>(null)
const loading = ref(false)
const autoRefresh = ref(false)
let handle: ReturnType<typeof setInterval> | null = null

async function load() {
  loading.value = true
  try {
    status.value = await api.get('/api/system/status')
  } catch (err: any) {
    toast.error(err.message || 'Status konnte nicht geladen werden')
  } finally {
    loading.value = false
  }
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) {
    handle = setInterval(load, 30_000)
  } else if (handle) {
    clearInterval(handle)
    handle = null
  }
}

function okBadge(section: any): 'ok' | 'fail' | 'unknown' {
  if (!section) return 'unknown'
  if (section.error) return 'fail'
  if (section.ok === false) return 'fail'
  if (section.ok === true) return 'ok'
  return 'ok'
}

onMounted(load)
onBeforeUnmount(() => { if (handle) clearInterval(handle) })
</script>

<template>
  <div>
    <AdminPageHeader
      title="System"
      description="Live-Status aller Backends."
    >
      <template #actions>
        <label class="check-inline">
          <input type="checkbox" :checked="autoRefresh" @change="toggleAutoRefresh" />
          Auto-refresh 30s
        </label>
        <button class="btn btn-outline" :disabled="loading" @click="load">
          {{ loading ? 'Lade…' : 'Refresh' }}
        </button>
      </template>
    </AdminPageHeader>

    <div v-if="!status" class="loading">Lade Status…</div>

    <div v-else class="system-grid">
      <!-- Vector Store -->
      <section class="card">
        <h2>
          Vector Store
          <span class="pill" :class="`pill-${okBadge(status.vectorStore)}`">
            {{ okBadge(status.vectorStore) === 'ok' ? 'OK' : 'failed' }}
          </span>
        </h2>
        <template v-if="!status.vectorStore?.error">
          <dl>
            <dt>Documents</dt><dd>{{ status.vectorStore?.documentCount ?? '—' }}</dd>
            <dt>Chunks</dt><dd>{{ status.vectorStore?.chunkCount ?? '—' }}</dd>
            <dt>Embedding-Dims</dt><dd>{{ status.vectorStore?.embeddingDims ?? '—' }}</dd>
          </dl>
        </template>
        <p v-else class="error">{{ status.vectorStore.error }}</p>
      </section>

      <!-- RAG Settings -->
      <section class="card">
        <h2>
          RAG Settings
          <span class="pill" :class="`pill-${okBadge(status.ragSettings)}`">
            {{ okBadge(status.ragSettings) === 'ok' ? 'OK' : 'failed' }}
          </span>
        </h2>
        <template v-if="!status.ragSettings?.error">
          <dl>
            <dt>LLM provider</dt><dd>{{ status.ragSettings?.llm_provider }}</dd>
            <dt>Embeddings</dt><dd>{{ status.ragSettings?.embedding_mode }} — {{ status.ragSettings?.embedding_model }}</dd>
            <dt>Chunk size</dt><dd>{{ status.ragSettings?.chunk_size }}</dd>
            <dt>Top-K</dt><dd>{{ status.ragSettings?.top_k }}</dd>
          </dl>
        </template>
        <p v-else class="error">{{ status.ragSettings.error }}</p>
      </section>

      <!-- DMS -->
      <section class="card">
        <h2>
          DMS
          <span class="pill" :class="`pill-${okBadge(status.dms)}`">
            {{ okBadge(status.dms) === 'ok' ? 'OK' : 'failed' }}
          </span>
        </h2>
        <dl>
          <dt>Endpoint</dt><dd>{{ status.dms?.baseUrl || '—' }}</dd>
          <dt>Auth mode</dt><dd>{{ status.dms?.authMode || '—' }}</dd>
          <dt>Repository</dt><dd class="mono">{{ status.dms?.repositoryId || '—' }}</dd>
        </dl>
        <p v-if="status.dms?.error" class="error">{{ status.dms.error }}</p>
      </section>

      <!-- Chat / LLM -->
      <section class="card">
        <h2>
          Chat / LLM
          <span class="pill" :class="`pill-${okBadge(status.chat)}`">
            {{ okBadge(status.chat) === 'ok' ? 'OK' : 'failed' }}
          </span>
        </h2>
        <dl>
          <dt>Provider</dt><dd>{{ status.chat?.provider || '—' }}</dd>
          <dt>Active model</dt><dd class="mono">{{ status.chat?.activeModel || '—' }}</dd>
        </dl>
        <p v-if="status.chat?.error" class="error">{{ status.chat.error }}</p>
      </section>

      <!-- GPC.EU -->
      <section class="card">
        <h2>
          GPC.EU
          <span class="pill" :class="`pill-${okBadge(status.gpceu)}`">
            {{ okBadge(status.gpceu) === 'ok' ? 'OK' : 'failed' }}
          </span>
        </h2>
        <dl>
          <dt>Version</dt><dd class="mono">{{ status.gpceu?.gpcVersion?.version || status.gpceu?.gpcVersion || '—' }}</dd>
          <dt>Auth</dt><dd>{{ status.gpceu?.auth?.mode || '—' }}</dd>
        </dl>
        <p v-if="status.gpceu?.error" class="error">{{ status.gpceu.error }}</p>
      </section>

      <!-- Recent documents -->
      <section class="card">
        <h2>Recent documents</h2>
        <ul v-if="status.recentDocuments?.length" class="recent-list">
          <li v-for="d in status.recentDocuments" :key="d.id">
            <NuxtLink to="/admin/documents"><strong>{{ d.name }}</strong></NuxtLink>
            <span class="pill pill-mini" :class="`pill-${d.status === 'ready' ? 'ok' : d.status === 'failed' ? 'fail' : 'unknown'}`">
              {{ d.status }}
            </span>
          </li>
        </ul>
        <p v-else class="empty">Noch keine Dokumente.</p>
      </section>

      <!-- Active jobs -->
      <section class="card">
        <h2>Active import jobs</h2>
        <ul v-if="status.activeJobs?.length" class="recent-list">
          <li v-for="j in status.activeJobs" :key="j.id">
            <span class="mono">{{ j.id.slice(0, 8) }}…</span>
            <span>{{ j.processed_count }} / {{ j.total_count }}</span>
            <span class="pill pill-mini pill-unknown">{{ j.status }}</span>
          </li>
        </ul>
        <p v-else class="empty">Keine laufenden Jobs.</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.check-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  cursor: pointer;
}
.loading {
  padding: 32px;
  text-align: center;
  color: var(--c-text-medium);
}
.system-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-4);
}
.card {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}
.card h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 var(--space-3);
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  font-weight: 500;
  color: var(--c-text-value);
}
.pill {
  padding: 2px 8px;
  border-radius: 999px;
  font-family: var(--font-ui);
  font-size: var(--font-4xs);
  font-weight: 500;
  text-transform: capitalize;
}
.pill-mini { font-size: 9.5px; padding: 1px 7px; }
.pill-ok { background: color-mix(in srgb, var(--c-success) 15%, white); color: var(--c-success); }
.pill-fail { background: color-mix(in srgb, var(--c-error) 15%, white); color: var(--c-error); }
.pill-unknown { background: color-mix(in srgb, var(--c-text-medium) 12%, white); color: var(--c-text-medium); }

dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 12px;
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
}
dt { color: var(--c-text-light2); }
dd { margin: 0; color: var(--c-text-value); }
.mono { font-family: 'DM Mono', monospace; font-size: var(--font-4xs); }
.error {
  margin: 8px 0 0;
  font-family: 'DM Mono', monospace;
  font-size: var(--font-4xs);
  color: var(--c-error);
}
.recent-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
}
.recent-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--c-border-card);
}
.recent-list li:last-child { border-bottom: none; }
.recent-list a { color: var(--c-text-value); text-decoration: none; }
.recent-list a:hover { color: var(--c-brand-blue); }
.empty {
  margin: 0;
  color: var(--c-text-light2);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
}
</style>
