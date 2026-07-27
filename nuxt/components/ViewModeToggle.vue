<script setup lang="ts">
/**
 * ViewModeToggle — Basic / Expert segment control.
 *
 * Placed in the sub-toolbar of the wizard steps (Thermodynamics, Coil
 * Geometry). Renders nothing when the `basic_expert_toggle` admin flag
 * is off — the feature is effectively hidden from users, and every
 * field shows because useViewMode.effectiveMode forces 'expert'.
 *
 * Style: labelled version of the ChatDock chat-mode segment control
 * (ChatDock.vue → .chat-mode-toggle). Same pill background + white
 * active-pill treatment, but with text labels instead of icons.
 */
import { computed } from 'vue'

const viewMode = useViewMode()
const flags = useFeatureFlags()

const visible = computed(() => flags.isOn('basic_expert_toggle'))
</script>

<template>
  <div v-if="visible" class="view-mode-toggle" role="tablist" aria-label="Ansicht">
    <button
      type="button"
      role="tab"
      :aria-selected="viewMode.mode.value === 'basic'"
      class="view-mode-btn"
      :class="{ active: viewMode.mode.value === 'basic' }"
      title="Basic-Ansicht — nur Kern-Parameter"
      @click="viewMode.setMode('basic')"
    >Basic</button>
    <button
      type="button"
      role="tab"
      :aria-selected="viewMode.mode.value === 'expert'"
      class="view-mode-btn"
      :class="{ active: viewMode.mode.value === 'expert' }"
      title="Expert-Ansicht — alle Felder"
      @click="viewMode.setMode('expert')"
    >Expert</button>
  </div>
</template>

<style scoped>
.view-mode-toggle {
  display: inline-flex;
  padding: 2px;
  background: var(--c-border-card);
  border-radius: 999px;
  flex-shrink: 0;
}
.view-mode-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  padding: 0 12px;
  border: none;
  background: transparent;
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
  letter-spacing: 0.1px;
  cursor: pointer;
  border-radius: 999px;
  transition: background 0.12s, color 0.12s;
}
.view-mode-btn:hover { color: var(--c-text); }
.view-mode-btn.active {
  background: white;
  color: var(--c-brand-blue);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}
</style>
