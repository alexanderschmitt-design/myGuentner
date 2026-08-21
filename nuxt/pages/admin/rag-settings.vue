<script setup lang="ts">
/**
 * /admin/rag-settings — Edit the singleton rag_settings row.
 * Backed by GET/PUT /api/rag/settings + test-key + reset store.
 */
import { ref, computed, watch, onMounted } from 'vue'
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

// Kuratierte OpenRouter-Modelle für den Dropdown. Slug entspricht dem `model`-Feld
// im OpenRouter-API-Body. Volle Liste unter https://openrouter.ai/models.
const OPENROUTER_MODELS: Array<{ id: string; label: string; group: string }> = [
  { id: 'anthropic/claude-sonnet-4.5',       label: 'Claude Sonnet 4.5 (Default)', group: 'Anthropic' },
  { id: 'anthropic/claude-opus-4.1',         label: 'Claude Opus 4.1',             group: 'Anthropic' },
  { id: 'anthropic/claude-haiku-4.5',        label: 'Claude Haiku 4.5',            group: 'Anthropic' },
  { id: 'anthropic/claude-3.5-sonnet',       label: 'Claude 3.5 Sonnet (Legacy)',  group: 'Anthropic' },
  { id: 'openai/gpt-4o',                     label: 'GPT-4o',                      group: 'OpenAI' },
  { id: 'openai/gpt-4o-mini',                label: 'GPT-4o mini',                 group: 'OpenAI' },
  { id: 'openai/o1',                         label: 'o1 (Reasoning)',              group: 'OpenAI' },
  { id: 'google/gemini-2.5-flash',           label: 'Gemini 2.5 Flash',            group: 'Google' },
  { id: 'google/gemini-2.5-pro',             label: 'Gemini 2.5 Pro',              group: 'Google' },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct',      group: 'Meta' },
  { id: 'mistralai/mistral-large',           label: 'Mistral Large',               group: 'Mistral' },
  { id: 'deepseek/deepseek-chat',            label: 'DeepSeek Chat',               group: 'DeepSeek' }
]

const OPENROUTER_DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5'

const openrouterGroups = computed(() => {
  const groups: Record<string, typeof OPENROUTER_MODELS> = {}
  for (const m of OPENROUTER_MODELS) {
    if (!groups[m.group]) groups[m.group] = []
    groups[m.group].push(m)
  }
  return groups
})

const api = useApi()
const toast = useToast()

const settings = ref<RagSettings | null>(null)
const loading = ref(true)
const saving = ref(false)
const resetOpen = ref(false)
const resetting = ref(false)
// Snapshot der zuletzt gespeicherten Settings — für Dirty-State-Erkennung.
// Ohne diesen Vergleich wusste der Admin nicht, dass sein Mode-Wechsel
// nur im UI ist bis Save gedrückt wird (siehe Debug 2026-08-21).
const savedSnapshot = ref<string>('')
const isDirty = computed(() => {
  if (!settings.value) return false
  return JSON.stringify(settings.value) !== savedSnapshot.value
})

/** Wenn der Admin den Embedding-Mode umschaltet, automatisch den passenden
 *  Modell-Default eintragen — sonst bleibt z.B. "text-embedding-3-small"
 *  auch nach dem Wechsel auf Gemini stehen und wird als (invalider) Model-
 *  Name an die falsche API geschickt. */
const EMBEDDING_MODE_DEFAULTS: Record<string, string> = {
  openai: 'text-embedding-3-small',
  gemini: 'gemini-embedding-001'
}
function onEmbeddingModeChange() {
  if (!settings.value) return
  const mode = settings.value.embedding_mode
  const currentModel = (settings.value.embedding_model || '').trim()
  // Nur überschreiben wenn der aktuelle Wert der Default des ANDEREN Providers ist.
  const otherDefaults = Object.entries(EMBEDDING_MODE_DEFAULTS)
    .filter(([k]) => k !== mode)
    .map(([, v]) => v)
  if (!currentModel || otherDefaults.includes(currentModel)) {
    settings.value.embedding_model = EMBEDDING_MODE_DEFAULTS[mode] || currentModel
  }
}

async function load() {
  loading.value = true
  try {
    const res = await api.get<{ ok: boolean; settings: RagSettings }>('/api/rag/settings')
    settings.value = res.settings
    savedSnapshot.value = JSON.stringify(res.settings)
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
    savedSnapshot.value = JSON.stringify(res.settings)
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

// Wenn Provider auf openrouter umgestellt wird und das aktuelle Model nicht wie
// ein OpenRouter-Slug aussieht (kein `provider/model`-Format), auf Default setzen.
// Umgekehrt beim Wechsel weg von openrouter das Feld leeren, damit der User den
// nativen Modellnamen des neuen Providers eintippen kann.
watch(() => settings.value?.llm_provider, (next, prev) => {
  if (!settings.value || next === prev) return
  if (next === 'openrouter') {
    const looksLikeOpenRouter = /^[a-z0-9._-]+\/[a-z0-9._-]+$/i.test(settings.value.llm_model || '')
    if (!looksLikeOpenRouter) settings.value.llm_model = OPENROUTER_DEFAULT_MODEL
  } else if (prev === 'openrouter') {
    settings.value.llm_model = ''
  }
})

onMounted(load)
</script>

<template>
  <div>
    <AdminPageHeader
      title="RAG Settings"
      description="LLM-Provider, Embedding-Modell, Chunking, Top-K und System-Prompt."
    >
      <template #actions>
        <span v-if="isDirty" class="dirty-pill" title="Änderungen sind noch nicht in der DB">● Ungespeichert</span>
        <button
          class="btn btn-primary"
          :class="{ 'is-dirty': isDirty }"
          :disabled="saving || loading || !isDirty"
          @click="save"
        >
          {{ saving ? 'Speichern…' : (isDirty ? 'Änderungen speichern' : 'Gespeichert') }}
        </button>
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="loading">Lade Settings…</div>

    <div v-else-if="settings" class="settings-grid">
      <section class="card pipeline-card">
        <div class="pipeline-head">
          <span class="pipeline-badge pipeline-badge-chat">1</span>
          <div>
            <h2>Chat-LLM · Antwort-Generierung</h2>
            <p class="pipeline-sub">Beantwortet User-Fragen. Bekommt die RAG-Chunks als Kontext-Block. Ändert nichts am Vektor-Store.</p>
          </div>
        </div>
        <div class="field">
          <label>Provider</label>
          <select v-model="settings.llm_provider">
            <option value="bella">Günther (Anthropic Claude)</option>
            <option value="anthropic">Anthropic (direkt)</option>
            <option value="gemini">Google Gemini</option>
            <option value="openrouter">OpenRouter (Multi-Provider Gateway)</option>
          </select>
        </div>
        <div class="field">
          <label>Model</label>
          <select v-if="settings.llm_provider === 'openrouter'" v-model="settings.llm_model">
            <optgroup v-for="(models, group) in openrouterGroups" :key="group" :label="group">
              <option v-for="m in models" :key="m.id" :value="m.id">{{ m.label }}</option>
            </optgroup>
          </select>
          <input v-else type="text" v-model="settings.llm_model" placeholder="claude-sonnet-4-6 / gemini-1.5-flash" />
          <p v-if="settings.llm_provider === 'openrouter'" class="hint">
            Modell-ID im Format <code>provider/model</code>. Weitere Modelle: <a href="https://openrouter.ai/models" target="_blank" rel="noopener">openrouter.ai/models</a>.
          </p>
        </div>
        <div class="tester-row">
          <ApiKeyTester label="Chat-Anthropic" endpoint="/api/rag/test-anthropic-key" />
          <ApiKeyTester label="Chat-Gemini" endpoint="/api/rag/test-gemini-key" />
          <ApiKeyTester label="Chat-OpenRouter" endpoint="/api/rag/test-openrouter-key" />
        </div>
      </section>

      <section class="card pipeline-card">
        <div class="pipeline-head">
          <span class="pipeline-badge pipeline-badge-embed">2</span>
          <div>
            <h2>Embedding-Provider · Dokument-Vektorisierung</h2>
            <p class="pipeline-sub">Wandelt PDF/DOCX-Textblöcke in 1536-dim Vektoren. Läuft beim Import + Reprocess. Wird auch bei jedem Chat-Query genutzt, um die Frage in denselben Vektor-Raum zu embedden.</p>
          </div>
        </div>
        <div class="field">
          <label>Mode</label>
          <select v-model="settings.embedding_mode" @change="onEmbeddingModeChange">
            <option value="openai">OpenAI (text-embedding-3-small · 1536-dim)</option>
            <option value="gemini">Google Gemini (gemini-embedding-001 · 1536-dim)</option>
          </select>
        </div>
        <div class="field">
          <label>Model</label>
          <input type="text" v-model="settings.embedding_model" placeholder="text-embedding-3-small" />
        </div>
        <p class="hint">
          Bei Wechsel zwischen openai ↔ gemini muss der Vector Store neu berechnet werden (Reset unten + Documents → Reprocess All).
          Beide Provider liefern 1536-dim Vektoren — pgvector-Schema bleibt unverändert.
        </p>
        <div class="tester-row">
          <ApiKeyTester label="Active Embedding Provider" endpoint="/api/rag/test-embeddings" />
        </div>
      </section>

      <section class="card">
        <h2>Retrieval</h2>
        <p class="pipeline-sub">
          Steuert wie Dokumente beim Import in kleine Text-Blöcke ("Chunks") zerteilt werden
          und wie viele davon der Chatbot pro Frage zurückbekommt.
        </p>
        <div class="row-2">
          <div class="field">
            <label>Chunk size <span class="field-unit">Zeichen</span></label>
            <input type="number" min="100" step="50" v-model.number="settings.chunk_size" />
            <p class="field-hint">Wie lang ist ein einzelner Text-Block? Typisch 800–1500. Größer = weniger Kontext-Fragmentierung, aber ungenaueres Retrieval.</p>
          </div>
          <div class="field">
            <label>Chunk overlap <span class="field-unit">Zeichen</span></label>
            <input type="number" min="0" step="10" v-model.number="settings.chunk_overlap" />
            <p class="field-hint">Wie viele Zeichen des vorherigen Chunks wiederholen sich am Anfang des nächsten. Verhindert dass ein Satz an der Chunk-Grenze zerrissen wird. Typisch 10–20 % der Chunk size.</p>
          </div>
        </div>
        <div class="field">
          <label>Top K <span class="field-unit">Anzahl</span></label>
          <input type="number" min="1" max="50" v-model.number="settings.top_k" />
          <p class="field-hint">Wie viele der ähnlichsten Chunks werden dem Chatbot als Kontext übergeben. Typisch 3–8. Höher = mehr Kontext aber teurer + evtl. Rauschen.</p>
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
  /* Nach mehreren fehlgeschlagenen Grid-Versuchen zurück zu Flexbox mit
     festem 50%-Split. Grid mit 1fr/1fr rundet bei bestimmten Viewports
     einzelne Columns pixelig verschieden (fractional pixel rounding),
     was auf breiten Screens sichtbaren Versatz produziert.
     Flexbox mit calc((100% - gap) / 2) ist mathematisch exakt. */
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  --row-gap: var(--space-4);
  align-items: stretch;
}
.settings-grid > .card {
  /* Alle Cards nehmen exakt die halbe Breite (minus halber Gap). */
  flex: 0 0 calc(50% - (var(--row-gap) / 2));
  max-width: calc(50% - (var(--row-gap) / 2));
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
}
.settings-grid > .card.danger,
.settings-grid > .card.full-width {
  flex: 0 0 100%;
  max-width: 100%;
}
@media (max-width: 900px) {
  .settings-grid > .card {
    flex: 0 0 100%;
    max-width: 100%;
  }
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
/* Alle Text-Elemente in Cards dürfen keine ausbrechenden natural-widths
   erzeugen — sonst wird die Card-Column vom Grid gestreckt. */
.card * {
  min-width: 0;
  overflow-wrap: break-word;
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
  /* min-width:0 + width:100% ist Pflicht, sonst dehnt ein <select> mit
     langem Options-Text (z.B. "OpenRouter (Multi-Provider Gateway)")
     die eigene Grid-Column über das minmax(0,1fr) hinaus — dann sind
     die zwei Karten in Row 1 unterschiedlich breit. */
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
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

/* Pipeline-Kopf: farbige Nummer + Rollen-Beschreibung — macht sofort klar,
   welche Section welche Pipeline steuert (Chat-Antworten vs. Vektor-Store). */
.pipeline-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.pipeline-head h2 {
  margin: 0 0 4px;
}
.pipeline-sub {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  line-height: 1.5;
}
.pipeline-badge {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  font-weight: 600;
  color: white;
}
.pipeline-badge-chat  { background: var(--c-brand-blue, #0078BE); }
.pipeline-badge-embed { background: var(--c-success, #2E7D4F); }

/* Retrieval-Feld-Erklärungen (Chunk size, Chunk overlap, Top K). */
.field-unit {
  color: var(--c-text-light2);
  font-weight: 400;
  font-size: 90%;
}
.field-hint {
  margin: 4px 0 0;
  font-family: var(--font-ui);
  font-size: var(--font-4xs);
  color: var(--c-text-medium);
  line-height: 1.4;
}

/* Dirty-State — signalisiert dass der Save-Button geklickt werden muss,
   sonst wirkt der geänderte Mode nicht in der DB. */
.dirty-pill {
  margin-right: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c-warning, #C57B00) 15%, white);
  color: var(--c-warning, #C57B00);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 600;
  animation: dirty-pulse 1.6s ease-in-out infinite;
}
.btn-primary.is-dirty {
  animation: dirty-pulse 1.6s ease-in-out infinite;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--c-warning, #C57B00) 40%, transparent);
}
@keyframes dirty-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.65; }
}
.btn-danger {
  background: var(--c-error, #B33A3A);
  color: white;
  border: 1px solid var(--c-error, #B33A3A);
}
.btn-danger:hover { filter: brightness(1.08); }
</style>
