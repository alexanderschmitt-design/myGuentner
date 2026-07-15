<script setup lang="ts">
/**
 * /admin/rag-test — Inline query tester for the RAG stack.
 *
 * Two modes:
 *   • "Chat (streamed)" — full pipeline via useChatStream (retrieval + LLM)
 *   • "Retrieval only"  — POST /api/rag/query (chunks + scores, no LLM)
 *
 * Both let the user pin topK / minScore / documentIds filters.
 */
import { ref, computed, onMounted } from 'vue'
import ChatMessage from '~/components/ChatMessage.vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'myGPC — RAG Test' })

const api = useApi()
const toast = useToast()

const mode = ref<'chat' | 'retrieval'>('chat')
const query = ref('')
const topK = ref(5)
const minScore = ref(0.05)
const thinkingOn = ref(false)
const selectedDocIds = ref<string[]>([])

const availableDocs = ref<Array<{ id: string; name: string }>>([])
const retrievalChunks = ref<any[] | null>(null)
const retrievalLoading = ref(false)

const stream = useChatStream()

const canSubmit = computed(() => query.value.trim().length > 0 && !stream.isStreaming.value && !retrievalLoading.value)

const chunkColumns = [
  { key: 'documentName', label: 'Document' },
  { key: 'chunkIndex', label: 'Chunk', width: '80px', align: 'right' as const },
  { key: 'score', label: 'Score', width: '80px', align: 'right' as const },
  { key: 'preview', label: 'Preview' }
]

const retrievalRows = computed(() =>
  (retrievalChunks.value || []).map((c: any) => ({
    documentName: c.metadata?.documentName || c.metadata?.documentId || '—',
    chunkIndex: c.metadata?.chunkIndex ?? '',
    score: (c.score || 0).toFixed(3),
    preview: (c.text || '').slice(0, 200) + (c.text?.length > 200 ? '…' : ''),
    _raw: c
  }))
)

async function loadDocs() {
  try {
    const res = await api.get<{ documents: any[] }>('/api/documents')
    availableDocs.value = (res.documents || []).map((d: any) => ({ id: d.id, name: d.name }))
  } catch { /* ignore — filter is optional */ }
}

async function submit() {
  if (!canSubmit.value) return
  if (mode.value === 'chat') {
    stream.reset()
    await stream.send({
      query: query.value.trim(),
      topK: topK.value,
      minScore: minScore.value,
      documentIds: selectedDocIds.value.length ? selectedDocIds.value : undefined,
      thinking: thinkingOn.value,
      language: 'de'
    })
  } else {
    retrievalLoading.value = true
    retrievalChunks.value = null
    try {
      const res = await api.post<{ chunks: any[] }>('/api/rag/query', {
        query: query.value.trim(),
        topK: topK.value,
        minScore: minScore.value,
        documentIds: selectedDocIds.value.length ? selectedDocIds.value : undefined
      })
      retrievalChunks.value = res.chunks || []
    } catch (err: any) {
      toast.error(err.message || 'Retrieval fehlgeschlagen')
    } finally {
      retrievalLoading.value = false
    }
  }
}

function toggleDoc(id: string, on: boolean) {
  if (on) selectedDocIds.value = [...selectedDocIds.value, id]
  else selectedDocIds.value = selectedDocIds.value.filter((x) => x !== id)
}

onMounted(loadDocs)
</script>

<template>
  <div>
    <AdminPageHeader
      title="RAG Test"
      description="Frage die Retrieval-Pipeline direkt an — mit oder ohne LLM-Antwort."
    />

    <div class="rag-test-grid">
      <section class="card query-card">
        <div class="mode-tabs">
          <button
            type="button"
            class="mode-tab"
            :class="{ active: mode === 'chat' }"
            @click="mode = 'chat'"
          >Chat (streamed)</button>
          <button
            type="button"
            class="mode-tab"
            :class="{ active: mode === 'retrieval' }"
            @click="mode = 'retrieval'"
          >Retrieval only</button>
        </div>

        <div class="field">
          <label>Query</label>
          <textarea rows="3" v-model="query" placeholder="Wie viele Kühlkreise hat ein GACC CX 040?" />
        </div>

        <div class="filter-row">
          <div class="field">
            <label>Top K</label>
            <input type="number" min="1" max="50" v-model.number="topK" />
          </div>
          <div class="field">
            <label>Min score</label>
            <input type="number" step="0.01" min="0" max="1" v-model.number="minScore" />
          </div>
          <label v-if="mode === 'chat'" class="check-inline">
            <input type="checkbox" v-model="thinkingOn" />
            Thinking
          </label>
        </div>

        <div v-if="availableDocs.length" class="field">
          <label>Nur diese Dokumente durchsuchen</label>
          <div class="doc-filter">
            <label v-for="d in availableDocs" :key="d.id" class="check-inline">
              <input
                type="checkbox"
                :checked="selectedDocIds.includes(d.id)"
                @change="toggleDoc(d.id, ($event.target as HTMLInputElement).checked)"
              />
              {{ d.name }}
            </label>
          </div>
        </div>

        <button
          class="btn btn-primary"
          :disabled="!canSubmit"
          @click="submit"
        >
          {{ stream.isStreaming.value || retrievalLoading ? 'Läuft…' : 'Ausführen' }}
        </button>
      </section>

      <section class="card result-card">
        <template v-if="mode === 'chat'">
          <h2>Antwort</h2>
          <div v-if="!stream.text.value && !stream.isStreaming.value" class="empty">
            Noch keine Antwort. Query eingeben und ausführen.
          </div>
          <ChatMessage
            v-else
            role="assistant"
            :content="stream.text.value"
            :sources="stream.sources.value"
            :streaming="stream.isStreaming.value"
          />
          <div v-if="stream.thinking.value" class="thinking">
            <summary>Thinking (streamed)</summary>
            <pre>{{ stream.thinking.value }}</pre>
          </div>
          <div v-if="stream.done.value" class="stream-meta">
            <small>
              Provider: {{ stream.done.value.provider }} ·
              Stop: {{ stream.done.value.stopReason }} ·
              Tokens: {{ stream.done.value.usage?.output_tokens || '—' }}
            </small>
          </div>
          <p v-if="stream.error.value" class="error">{{ stream.error.value }}</p>
        </template>

        <template v-else>
          <h2>Retrieved Chunks</h2>
          <div v-if="retrievalChunks === null" class="empty">
            Query eingeben und ausführen.
          </div>
          <DataTable
            v-else
            :rows="retrievalRows"
            :columns="chunkColumns"
            :loading="retrievalLoading"
            empty-message="Keine Chunks über dem Score-Threshold."
          >
            <template #cell-preview="{ row }">
              <span class="preview-cell">{{ row.preview }}</span>
            </template>
          </DataTable>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.rag-test-grid {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: var(--space-4);
  align-items: start;
}
@media (max-width: 900px) {
  .rag-test-grid { grid-template-columns: 1fr; }
}
.card {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}
.card h2 {
  margin: 0 0 var(--space-3);
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  font-weight: 500;
  color: var(--c-text-value);
}
.mode-tabs { display: flex; gap: 4px; margin-bottom: 14px; border-bottom: 1px solid var(--c-border); }
.mode-tab {
  padding: 6px 10px;
  border: none;
  background: transparent;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  cursor: pointer;
  position: relative;
  bottom: -1px;
}
.mode-tab.active { color: var(--c-brand-blue); border-bottom: 2px solid var(--c-brand-blue); font-weight: 500; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
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
  outline: none;
}
.field textarea { resize: vertical; font-family: 'DM Mono', monospace; font-size: var(--font-3xs); }
.field input:focus, .field textarea:focus {
  border-color: var(--c-brand-blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 15%, transparent);
}
.filter-row { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 12px; }
.filter-row .field { margin-bottom: 0; flex: 1; }
.check-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-value);
  cursor: pointer;
}
.doc-filter { display: flex; flex-direction: column; gap: 4px; max-height: 200px; overflow-y: auto; padding: 6px 8px; border: 1px solid var(--c-border-card); border-radius: var(--radius-xs); background: var(--c-bg); }
.empty {
  padding: 24px;
  text-align: center;
  color: var(--c-text-light2);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
}
.thinking {
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px dashed var(--c-border);
  border-radius: var(--radius-xs);
  background: var(--c-bg);
  font-family: 'DM Mono', monospace;
  font-size: var(--font-3xs);
}
.stream-meta { margin-top: 10px; color: var(--c-text-light2); font-size: var(--font-4xs); }
.error { color: var(--c-error, #B33A3A); font-size: var(--font-3xs); }
.preview-cell { font-family: 'DM Mono', monospace; font-size: var(--font-4xs); color: var(--c-text-medium); }
</style>
