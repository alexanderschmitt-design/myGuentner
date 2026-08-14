<script setup lang="ts">
import type { Perspective } from '~/stores/configuration';

const { active, labels, set } = usePerspective();

// Try to read the aria-label from i18n, fall back to a hardcoded English
// string if the key isn't in the locale files (which is the current state).
// $t() safely returns the missing key rather than throwing, so this only
// improves the screen-reader experience.
const i18nAvailable = (() => { try { return !!useI18n() } catch { return false } })();
function ariaHint(): string {
  if (!i18nAvailable) return 'Choose perspective';
  const t = (useI18n() as any).t as ((k: string) => string) | undefined;
  const val = t?.('perspective.switchHint');
  return val && val !== 'perspective.switchHint' ? val : 'Choose perspective';
}

const options: { id: Perspective; color: string }[] = [
  { id: 'technical',   color: 'var(--c-primary)' },
  { id: 'application', color: 'var(--c-process)' },
  { id: 'location',    color: 'var(--c-site)' }
];
</script>

<template>
  <div class="perspective-switcher" role="tablist" :aria-label="ariaHint()">
    <button
      v-for="opt in options"
      :key="opt.id"
      role="tab"
      :aria-selected="active === opt.id"
      :class="['perspective-btn', { 'is-active': active === opt.id }]"
      :style="{ '--btn-color': opt.color }"
      @click="set(opt.id)"
    >
      {{ labels[opt.id] }}
    </button>
  </div>
</template>

<style scoped>
.perspective-switcher {
  display: inline-flex;
  gap: 0;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  overflow: hidden;
}
.perspective-btn {
  --btn-color: var(--c-accent);
  border: 0;
  background: transparent;
  padding: 0.4rem 0.9rem;
  font: inherit;
  color: var(--c-text-muted);
  cursor: pointer;
  transition: var(--transition-accent);
  border-right: 1px solid var(--c-border);
}
.perspective-btn:last-child { border-right: 0; }
.perspective-btn:hover { color: var(--btn-color); }
.perspective-btn.is-active {
  background: var(--btn-color);
  color: #fff;
  font-weight: 600;
}
</style>
