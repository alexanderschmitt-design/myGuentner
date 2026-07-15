<script setup lang="ts">
/**
 * InfoIcon — subtle outlined "i" badge that opens an Information modal
 * on click. Reference: outlined circle with a lowercase italic "i", matches
 * the Güntner UI language (thin brand-blue stroke, no fill).
 *
 * Usage: `<InfoIcon title="Frost thickness" body="…explainer copy…" />`.
 * If no `body` is provided the click still opens a modal — with `title`
 * used as the body — so consumers upgrading from the tooltip-only version
 * keep working while their copy is migrated.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  title?: string
  body?: string
  /** Modal heading — falls back to "Information". */
  heading?: string
}>()

const isOpen = ref(false)
function open() { isOpen.value = true }
function close() { isOpen.value = false }

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) close()
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <button
    type="button"
    class="info-badge"
    :title="title"
    :aria-label="heading || 'More information'"
    @click="open"
  >
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.25"/>
      <path d="M8 6.9v4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="8" cy="5" r="0.9" fill="currentColor"/>
    </svg>
  </button>

  <Teleport to="body">
    <div v-if="isOpen" class="info-modal-backdrop" @click.self="close">
      <div class="info-modal" role="dialog" aria-labelledby="info-modal-title">
        <header class="info-modal-head">
          <h3 id="info-modal-title">{{ heading || 'Information' }}</h3>
        </header>
        <div class="info-modal-body">
          <p>{{ body || title }}</p>
        </div>
        <footer class="info-modal-foot">
          <button type="button" class="info-modal-close" @click="close">Close</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.info-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--c-brand-blue);
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.15s, color 0.15s;
}
.info-badge:hover {
  background: color-mix(in srgb, var(--c-brand-blue) 10%, transparent);
}
.info-badge:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 25%, transparent);
}
.info-badge svg { display: block; }
</style>

<!-- Modal styles are non-scoped: <Teleport to="body"> puts the markup
     outside the component's scope-attribute reach. -->
<style>
.info-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(28, 26, 33, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}
.info-modal {
  background: white;
  border-radius: var(--radius-md, 8px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
}
.info-modal-head {
  padding: 20px 24px 8px;
}
.info-modal-head h3 {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-md, 18px);
  font-weight: 500;
  color: var(--c-text-value, #262326);
}
.info-modal-body {
  padding: 8px 24px 8px;
}
.info-modal-body p {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  line-height: 1.5;
  color: var(--c-text-value, #262326);
}
.info-modal-foot {
  display: flex;
  justify-content: flex-end;
  padding: 12px 24px 20px;
}
.info-modal-close {
  border: none;
  background: transparent;
  padding: 6px 8px;
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  font-weight: 500;
  color: var(--c-brand-blue, #2666e0);
  cursor: pointer;
  border-radius: 4px;
}
.info-modal-close:hover {
  background: color-mix(in srgb, var(--c-brand-blue, #2666e0) 8%, transparent);
}
</style>
