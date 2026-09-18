<script setup lang="ts">
/**
 * /admin/features — Toggle app-wide feature flags (Chatbot, Learn Mode).
 * Stored per-browser via useFeatureFlags() (localStorage).
 */

import { nextTick, ref, computed } from 'vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'myGPC — Features' })

const { features, flags, setFlag, reset } = useFeatureFlags()

async function handleToggle(id: string, el: HTMLInputElement) {
  const newVal = el.checked
  const ok = await setFlag(id, newVal)
  if (!ok) {
    await nextTick()
    el.checked = !newVal
  }
}

function count(id: string): number {
  if (id !== 'learn_mode') return 0
  if (typeof window === 'undefined') return 0
  try {
    const raw = window.localStorage.getItem('mygpc_learn_notes')
    return raw ? Object.keys(JSON.parse(raw)).length : 0
  } catch { return 0 }
}

// --- Diagnose panel ---
const diagOpen = ref(false)
const diagLoading = ref(false)
const diagResult = ref<any>(null)
const diagError = ref<string | null>(null)

// Raw state that the plugin loaded into useState('app-settings')
const rawState = useState<Record<string, unknown> | null>('app-settings', () => null)
const rawStateJson = computed(() => JSON.stringify(rawState.value, null, 2))

async function runDiag() {
  diagLoading.value = true
  diagResult.value = null
  diagError.value = null
  try {
    const res = await $fetch<any>('/api/admin/debug/app-settings')
    diagResult.value = res
  } catch (err: any) {
    diagError.value = err?.data?.message ?? err?.message ?? String(err)
  } finally {
    diagLoading.value = false
  }
}

async function refreshCachedState() {
  diagLoading.value = true
  diagError.value = null
  try {
    const res = await $fetch<{ ok: boolean; settings: Record<string, unknown> }>('/api/app-settings')
    if (res?.ok) {
      rawState.value = res.settings
    } else {
      diagError.value = 'GET /api/app-settings returned ok: false'
    }
  } catch (err: any) {
    diagError.value = err?.message ?? String(err)
  } finally {
    diagLoading.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="Features"
      description="App-weite Feature-Schalter. Änderungen gelten für alle User (persistiert in Supabase) und greifen beim nächsten Page-Load."
    >
      <template #actions>
        <button class="btn btn-outline" @click="reset">Reset defaults</button>
      </template>
    </AdminPageHeader>

    <section class="card">
      <h2>Feature toggles</h2>
      <ul class="switch-list">
        <li v-for="f in features" :key="f.id">
          <div class="switch-info">
            <strong>{{ f.label }}</strong>
            <p>{{ f.description }}</p>
            <p v-if="f.id === 'learn_mode' && flags[f.id]" class="learn-active-hint">
              Aktiv: Hover ein beliebiges Element auf einer Seite → klicken zum Kommentieren.
              <span class="tag">{{ count('learn_mode') }} Notizen im Store</span>
            </p>
          </div>
          <label class="switch">
            <input
              type="checkbox"
              :checked="flags[f.id]"
              @change="handleToggle(f.id, $event.target as HTMLInputElement)"
            />
            <span class="slider"></span>
          </label>
        </li>
      </ul>
    </section>

    <section class="card diag-card">
      <button class="diag-toggle" @click="diagOpen = !diagOpen">
        <span>Diagnose</span>
        <span class="diag-chevron" :class="{ open: diagOpen }">›</span>
      </button>
      <div v-if="diagOpen" class="diag-body">
        <div class="diag-row">
          <span class="diag-label">useState (Client geladen)</span>
          <pre class="diag-pre">{{ rawStateJson }}</pre>
        </div>
        <div class="diag-actions">
          <button class="btn btn-outline" :disabled="diagLoading" @click="refreshCachedState">
            ↺ Refresh Client-State (/api/app-settings)
          </button>
          <button class="btn btn-outline" :disabled="diagLoading" @click="runDiag">
            ⚡ Supabase direkt abfragen (cache-bypass)
          </button>
        </div>
        <p v-if="diagError" class="diag-error">{{ diagError }}</p>
        <div v-if="diagResult" class="diag-row">
          <div class="diag-summary">
            <span :class="diagResult.ok ? 'diag-ok' : 'diag-fail'">{{ diagResult.ok ? '✓ Supabase erreichbar' : '✗ Supabase-Fehler' }}</span>
            <span class="diag-chip">SUPABASE_URL: {{ diagResult.envPresence?.SUPABASE_URL ? '✓' : '✗ fehlt!' }}</span>
            <span class="diag-chip">SUPABASE_SECRET_KEY: {{ diagResult.envPresence?.SUPABASE_SECRET_KEY ? '✓' : '✗ fehlt!' }}</span>
            <span class="diag-chip" :class="diagResult.flagValue === true ? 'diag-ok' : 'diag-warn'">
              basic_expert_toggle: {{ JSON.stringify(diagResult.flagValue) }}
            </span>
            <span v-if="diagResult.flagUpdatedAt" class="diag-chip">zuletzt: {{ diagResult.flagUpdatedAt }}</span>
          </div>
          <details class="diag-details">
            <summary>Alle app_settings Zeilen ({{ diagResult.rows?.length ?? 0 }})</summary>
            <pre class="diag-pre">{{ JSON.stringify(diagResult.rows, null, 2) }}</pre>
          </details>
          <p v-if="diagResult.error" class="diag-error">{{ diagResult.error }}</p>
        </div>
      </div>
    </section>

    <section class="card hint-card">
      <h2>Learn-Mode: so funktioniert's</h2>
      <ol>
        <li>Feature oben aktivieren.</li>
        <li>Chatbot-Drawer öffnen (Sprechblasen-Icon unten rechts).</li>
        <li>Oben im Drawer den zweiten Tab (Buch-Icon) wählen — der Chat wird zur Notiz-Maske.</li>
        <li>Auf der Seite links über ein Element fahren — es wird gestrichelt umrandet. Klicken zum Anwählen.</li>
        <li>Rechts im Drawer eine <strong>Kategorie</strong> wählen (Element / Beziehungen / Produkt), Titel + Beschreibung eingeben, <strong>Speichern</strong>.</li>
        <li>Notiz liegt unter einer stabilen Element-ID im Browser-Storage. Fügt der Autor ein <code>data-learn-id</code>-Attribut hinzu, überlebt die Notiz Refactorings.</li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.card {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
}
.card h2 {
  margin: 0 0 var(--space-3);
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  font-weight: 500;
  color: var(--c-text-value);
}
.switch-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.switch-list li {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 0;
  border-bottom: 1px solid var(--c-border-card);
}
.switch-list li:last-child { border-bottom: none; }
.switch-info { flex: 1; }
.switch-info strong { display: block; margin-bottom: 4px; color: var(--c-text-value); }
.switch-info p {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  line-height: 1.5;
}
.learn-active-hint {
  margin-top: 8px !important;
  padding: 6px 10px;
  background: color-mix(in srgb, var(--c-brand-blue) 6%, transparent);
  border-radius: var(--radius-xs);
  color: var(--c-brand-blue) !important;
}
.tag {
  margin-left: 8px;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  padding: 1px 6px;
  background: white;
  border-radius: 10px;
}
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute; inset: 0;
  background: var(--c-border);
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s;
}
.slider::before {
  content: '';
  position: absolute;
  top: 3px; left: 3px;
  width: 18px; height: 18px;
  background: white;
  border-radius: 50%;
  transition: transform 0.15s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.switch input:checked + .slider { background: var(--c-brand-blue); }
.switch input:checked + .slider::before { transform: translateX(20px); }

.diag-card { padding: 0; overflow: hidden; }
.diag-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px var(--space-4);
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  font-weight: 500;
  color: var(--c-text-medium);
  text-align: left;
}
.diag-toggle:hover { color: var(--c-text); }
.diag-chevron { font-size: 16px; transition: transform 0.15s; display: inline-block; }
.diag-chevron.open { transform: rotate(90deg); }
.diag-body { padding: 0 var(--space-4) var(--space-4); border-top: 1px solid var(--c-border-card); }
.diag-row { margin-top: var(--space-3); }
.diag-label {
  display: block;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  margin-bottom: 6px;
}
.diag-pre {
  margin: 0;
  padding: 10px 12px;
  background: var(--c-bg);
  border: 1px solid var(--c-border-card);
  border-radius: var(--radius-xs);
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  line-height: 1.5;
  overflow: auto;
  max-height: 240px;
  white-space: pre-wrap;
  word-break: break-all;
}
.diag-actions { display: flex; gap: 8px; margin-top: var(--space-3); flex-wrap: wrap; }
.diag-error {
  margin-top: 10px;
  padding: 8px 12px;
  background: color-mix(in srgb, #ef4444 8%, transparent);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: #b91c1c;
}
.diag-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 10px;
}
.diag-chip {
  padding: 2px 8px;
  background: var(--c-bg);
  border: 1px solid var(--c-border-card);
  border-radius: 999px;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--c-text-medium);
}
.diag-ok { color: #16a34a; font-weight: 600; font-size: var(--font-3xs); }
.diag-fail { color: #dc2626; font-weight: 600; font-size: var(--font-3xs); }
.diag-warn { color: #d97706; }
.diag-details summary {
  cursor: pointer;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  margin-bottom: 6px;
}

.hint-card { border-color: color-mix(in srgb, var(--c-brand-blue) 20%, var(--c-border)); }
.hint-card ol {
  margin: 0;
  padding-left: 20px;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-value);
  line-height: 1.6;
}
.hint-card ol li { margin-bottom: 6px; }
.hint-card code {
  padding: 1px 5px;
  background: var(--c-bg);
  border-radius: 3px;
  font-family: 'DM Mono', monospace;
  font-size: 90%;
}
</style>
