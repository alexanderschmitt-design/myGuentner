<script setup lang="ts">
/**
 * /admin/rag-settings — Edit the singleton rag_settings row.
 * Backed by GET/PUT /api/rag/settings + test-key + reset store.
 */
import { ref, onMounted } from 'vue'
import ApiKeyTester from '~/components/admin/ApiKeyTester.vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'myGPC — RAG Settings' })

interface RagSettings {
  id: number
  embedding_mode: string
  embedding_model: string
  llm_provider: string
  llm_model: string
  chunk_size: number
  chunk_overlap: number
  top_k: number
  system_prompt: string | null
  updated_at?: string
  updated_by?: string | null
}

const api = useApi()
const toast = useToast()

const settings = ref<RagSettings | null>(null)
const loading = ref(true)
const saving = ref(false)
const resetOpen = ref(false)
const resetting = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await api.get<{ ok: boolean; settings: RagSettings }>('/api/rag/settings')
    settings.value = res.settings
  } catch (err: any) {
    toast.error(`Konnte Settings nicht laden: ${err.message}`)
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!settings.value) return
  saving.value = true
  try {
    const { id, updated_at, updated_by, ...patch } = settings.value
    const res = await api.put<{ ok: boolean; settings: RagSettings }>('/api/rag/settings', patch)
    settings.value = res.settings
    toast.success('Settings gespeichert')
  } catch (err: any) {
    toast.error(err.message || 'Speichern fehlgeschlagen')
  } finally {
    saving.value = false
  }
}

async function resetStore() {
  resetting.value = true
  try {
    await api.del('/api/rag/store')
    toast.success('Vector Store zurückgesetzt')
    resetOpen.value = false
  } catch (err: any) {
    toast.error(err.message || 'Reset fehlgeschlagen')
  } finally {
    resetting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <AdminPageHeader
      title="RAG Settings"
      description="LLM-Provider, Embedding-Modell, Chunking, Top-K und System-Prompt."
    >
      <template #actions>
        <button class="btn btn-primary" :disabled="saving || loading" @click="save">
          {{ saving ? 'Speichern…' : 'Speichern' }}
        </button>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="loading">Lade Settings…</div>

    <div v-else-if="settings" class="settings-grid">
      <section class="card">
        <h2>LLM Provider</h2>
        <div class="field">
          <label>Provider</label>
          <select v-model="settings.llm_provider">
            <option value="bella">Bella (Anthropic Claude)</option>
            <option value="anthropic">Anthropic (direkt)</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </div>
        <div class="field">
          <label>Model</label>
          <input type="text" v-model="settings.llm_model" placeholder="claude-sonnet-4-6 / gemini-1.5-flash" />
        </div>
        <div class="tester-row">
          <ApiKeyTester label="Anthropic" endpoint="/api/rag/test-key" />
          <ApiKeyTester label="Gemini" endpoint="/api/rag/test-gemini-key" />
        </div>
      </section>

      <section class="card">
        <h2>Embeddings</h2>
        <div class="field">
          <label>Mode</label>
          <select v-model="settings.embedding_mode">
            <option value="local">Local (TF-IDF, 384-dim)</option>
            <option value="openai">OpenAI API</option>
          </select>
        </div>
        <div class="field">
          <label>Model</label>
          <input type="text" v-model="settings.embedding_model" placeholder="text-embedding-3-small" />
        </div>
        <p class="hint">
          Bei Wechsel zwischen local ↔ openai muss der Vector Store neu berechnet werden (Reset unten + Documents → Reprocess All).
        </p>
      </section>

      <section class="card">
        <h2>Retrieval</h2>
        <div class="row-2">
          <div class="field">
            <label>Chunk size</label>
            <input type="number" min="100" step="50" v-model.number="settings.chunk_size" />
          </div>
          <div class="field">
            <label>Chunk overlap</label>
            <input type="number" min="0" step="10" v-model.number="settings.chunk_overlap" />
          </div>
        </div>
        <div class="field">
          <label>Top K</label>
          <input type="number" min="1" max="50" v-model.number="settings.top_k" />
        </div>
      </section>

      <section class="card">
        <h2>System Prompt</h2>
        <div class="field">
          <textarea rows="10" v-model="settings.system_prompt" placeholder="System prompt for the LLM…" />
        </div>
      </section>

      <section class="card danger">
        <h2>Danger zone</h2>
        <p class="hint">Löscht alle Chunks und Embeddings. Dokumenten-Rows bleiben; müssen anschließend neu prozessiert werden.</p>
        <button class="btn btn-outline btn-danger" @click="resetOpen = true">Vector Store zurücksetzen…</button>
      </section>
    </div>

    <ModalDialog v-model:open="resetOpen" title="Vector Store zurücksetzen?" size="sm">
      <p>Alle Chunks und Embeddings werden gelöscht. Die Dokumente selbst bleiben — sie müssen anschließend neu prozessiert werden.</p>
      <template #footer>
        <button class="btn btn-outline" @click="resetOpen = false">Abbrechen</button>
        <button class="btn btn-danger" :disabled="resetting" @click="resetStore">
          {{ resetting ? 'Reset…' : 'Ja, zurücksetzen' }}
        </button>
      </template>
    </ModalDialog>
  </div>
</template>

<style scoped>
.loading {
  padding: 32px;
  text-align: center;
  color: var(--c-text-medium);
}
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: var(--space-4);
}
.card {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.card h2 {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  font-weight: 500;
  color: var(--c-text-value);
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light2);
}
.field input, .field select, .field textarea {
  padding: 8px 10px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-value);
  outline: none;
  background: white;
}
.field input:focus, .field select:focus, .field textarea:focus {
  border-color: var(--c-brand-blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 15%, transparent);
}
.field textarea {
  font-family: 'DM Mono', monospace;
  font-size: var(--font-3xs);
  line-height: 1.5;
  resize: vertical;
}
.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.tester-row { display: flex; flex-wrap: wrap; gap: 12px; }
.hint {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
}
.card.danger { grid-column: 1 / -1; border-color: color-mix(in srgb, var(--c-error, #B33A3A) 25%, var(--c-border)); }
.card.danger h2 { color: var(--c-error, #B33A3A); }
.btn-danger {
  background: var(--c-error, #B33A3A);
  color: white;
  border: 1px solid var(--c-error, #B33A3A);
}
.btn-danger:hover { filter: brightness(1.08); }
</style>
