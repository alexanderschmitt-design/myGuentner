<script setup lang="ts">
/**
 * Admin — section visibility toggles for the Home page accordions.
 * Ports the pre-migration frontend/admin.html feature switches.
 * State is persisted to localStorage via useSectionVisibility().
 */

useHead({ title: 'myGPC — Admin' })

const { sections, visibility, setVisible } = useSectionVisibility()

function toggle(id: string, on: boolean) {
  setVisible(id as any, on)
}

function resetToDefaults() {
  for (const s of sections) setVisible(s.id, s.defaultVisible)
}
</script>

<template>
  <div class="admin">
    <header>
      <h1>Admin — Home sections</h1>
      <p class="lede">Toggle the accordions on the home page. Changes are per-browser (localStorage) and take effect on the next home-page load.</p>
    </header>

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
      <div class="actions">
        <button class="btn btn-outline" @click="resetToDefaults">Reset to defaults</button>
        <NuxtLink to="/" class="btn btn-primary">View home →</NuxtLink>
      </div>
    </section>

    <section class="card">
      <h2>Storage</h2>
      <p class="hint">Section flags are stored as <code>mygpc_section_&lt;id&gt;</code> in <code>localStorage</code>. Clearing site data resets them.</p>
    </section>
  </div>
</template>

<style scoped>
.admin { max-width: 800px; margin: 0 auto; }
header { margin-bottom: 24px; }
h1 { margin: 0 0 4px; color: var(--c-primary); font-size: 1.4rem; }
.lede { margin: 0; color: var(--c-text-muted); }

.card {
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
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
.switch-info p { margin: 0; font-size: 0.85rem; color: var(--c-text-muted); }
.default {
  display: inline-block;
  margin-top: 6px;
  padding: 2px 8px;
  font-size: 0.7rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--c-success) 12%, white);
  color: var(--c-success);
}
.default.off { background: color-mix(in srgb, var(--c-text-muted) 12%, white); color: var(--c-text-muted); }

/* Toggle switch */
.switch { position: relative; display: inline-block; width: 44px; height: 24px; }
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

.actions { margin-top: 20px; display: flex; gap: 10px; }
.hint { color: var(--c-text-muted); font-size: 0.85rem; }
.hint code { padding: 2px 6px; background: var(--c-surface-muted); border-radius: 3px; font-family: 'DM Mono', monospace; }
</style>
