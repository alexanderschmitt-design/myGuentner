<script setup lang="ts">
/**
 * /admin/features — Toggle app-wide feature flags (Chatbot, Learn Mode).
 * Stored per-browser via useFeatureFlags() (localStorage).
 */

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'myGPC — Features' })

const { features, flags, setFlag, reset } = useFeatureFlags()

function count(id: string): number {
  if (id !== 'learn_mode') return 0
  if (typeof window === 'undefined') return 0
  try {
    const raw = window.localStorage.getItem('mygpc_learn_notes')
    return raw ? Object.keys(JSON.parse(raw)).length : 0
  } catch { return 0 }
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="Features"
      description="App-weite Feature-Schalter. Änderungen sind pro Browser (localStorage) und greifen sofort auf jeder Seite."
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
              @change="setFlag(f.id, ($event.target as HTMLInputElement).checked)"
            />
            <span class="slider"></span>
          </label>
        </li>
      </ul>
    </section>

    <section class="card hint-card">
      <h2>Learn-Mode: so funktioniert's</h2>
      <ol>
        <li>Feature oben aktivieren.</li>
        <li>Auf einer beliebigen Seite den Zeiger über ein Element ziehen — es wird mit einer gestrichelten Umrandung markiert.</li>
        <li>Klick auf das Element öffnet rechts eine Eingabemaske mit Titel + Beschreibung.</li>
        <li><strong>Speichern</strong> legt die Notiz unter einer stabilen Element-ID im Browser-Storage ab. Fügt der Autor ein <code>data-learn-id</code>-Attribut zu einem Element hinzu, überlebt die Notiz Refactorings.</li>
        <li>Zum Deaktivieren einfach den Toggle oben umlegen.</li>
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
