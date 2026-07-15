<script setup lang="ts">
/**
 * /admin/home-sections — Toggles for the Home page tab/accordion
 * visibility. Ports the pre-migration frontend/admin.html feature
 * switches. Persisted per-browser via useSectionVisibility() (localStorage).
 */

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'myGPC — Home sections' })

const { sections, visibility, setVisible } = useSectionVisibility()

function toggle(id: string, on: boolean) {
  setVisible(id as any, on)
}

function resetToDefaults() {
  for (const s of sections) setVisible(s.id, s.defaultVisible)
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="Home sections"
      description="Sichtbarkeit der Startseiten-Accordions umschalten. Änderungen sind pro Browser (localStorage) und greifen beim nächsten Home-Load."
    >
      <template #actions>
        <button class="btn btn-outline" @click="resetToDefaults">Reset defaults</button>
        <NuxtLink to="/" class="btn btn-primary">View home →</NuxtLink>
      </template>
    </AdminPageHeader>

    <section class="card">
      <h2>Section visibility</h2>
      <ul class="switch-list">
        <li v-for="s in sections" :key="s.id">
          <div class="switch-info">
            <strong>{{ s.label }}</strong>
            <p>{{ s.description }}</p>
            <span class="default" v-if="s.defaultVisible">Default: visible</span>
            <span class="default off" v-else>Default: hidden</span>
          </div>
          <label class="switch">
            <input
              type="checkbox"
              :checked="visibility[s.id]"
              @change="toggle(s.id, ($event.target as HTMLInputElement).checked)"
            />
            <span class="slider"></span>
          </label>
        </li>
      </ul>
    </section>

    <section class="card">
      <h2>Storage</h2>
      <p class="hint">Flags sind unter <code>mygpc_section_&lt;id&gt;</code> im <code>localStorage</code> gespeichert. Site-Daten löschen setzt zurück.</p>
    </section>
  </div>
</template>

<style scoped>
.card {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  padding: 24px;
  margin-bottom: 20px;
}
.card h2 { margin: 0 0 16px; font-size: 1rem; color: var(--c-text); }
.switch-list { list-style: none; margin: 0; padding: 0; }
.switch-list li {
  padding: 16px 0;
  border-bottom: 1px solid var(--c-border);
  display: flex;
  align-items: flex-start;
  gap: 20px;
  justify-content: space-between;
}
.switch-list li:last-child { border-bottom: none; }
.switch-info { flex: 1; }
.switch-info strong { display: block; margin-bottom: 4px; color: var(--c-text); }
.switch-info p { margin: 0; font-size: 0.85rem; color: var(--c-text-medium); }
.default {
  display: inline-block;
  margin-top: 6px;
  padding: 2px 8px;
  font-size: 0.7rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--c-success) 12%, white);
  color: var(--c-success);
}
.default.off { background: color-mix(in srgb, var(--c-text-medium) 12%, white); color: var(--c-text-medium); }
.switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
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
.hint { color: var(--c-text-medium); font-size: 0.85rem; }
.hint code { padding: 2px 6px; background: var(--c-bg); border-radius: 3px; font-family: 'DM Mono', monospace; }
</style>
