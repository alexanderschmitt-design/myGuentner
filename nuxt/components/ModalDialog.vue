<script setup lang="ts">
/**
 * ModalDialog — reusable Teleport+backdrop modal with slotted header,
 * body, footer. `v-model:open` toggles visibility. Escape and backdrop
 * click both close it (unless `dismissible={false}`).
 *
 * Extracted from the ad-hoc modal in `InfoIcon.vue` so every admin page
 * uses the same pattern instead of hand-rolling a new one.
 */
import { onBeforeUnmount, onMounted, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    /** false → clicking backdrop or pressing Escape does NOT close */
    dismissible?: boolean
    /** Optional size preset. */
    size?: 'sm' | 'md' | 'lg' | 'xl'
  }>(),
  { dismissible: true, size: 'md' }
)

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'close'): void
}>()

function close() {
  if (!props.dismissible) return
  emit('update:open', false)
  emit('close')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) close()
}

onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))

// Lock body scroll while open
watch(
  () => props.open,
  (o) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = o ? 'hidden' : ''
  }
)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-dialog-backdrop" @click.self="close">
      <div class="modal-dialog" :class="`modal-size-${size}`" role="dialog" aria-modal="true">
        <header v-if="$slots.header || title" class="modal-dialog-head">
          <slot name="header">
            <h3>{{ title }}</h3>
          </slot>
          <button
            v-if="dismissible"
            type="button"
            class="modal-dialog-close"
            aria-label="Close"
            @click="close"
          >
            <svg viewBox="0 0 16 16" width="16" height="16">
              <path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor"
                    stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </header>

        <div class="modal-dialog-body">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="modal-dialog-foot">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<!-- Non-scoped: teleported markup lives outside this component's scope
     attribute reach. -->
<style>
.modal-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(28, 26, 33, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}
.modal-dialog {
  background: white;
  border-radius: var(--radius-md, 8px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  width: 100%;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-size-sm { max-width: 360px; }
.modal-size-md { max-width: 480px; }
.modal-size-lg { max-width: 720px; }
.modal-size-xl { max-width: 960px; }

.modal-dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 24px 8px;
}
.modal-dialog-head h3 {
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--font-md, 18px);
  font-weight: 500;
  color: var(--c-text-value, #262326);
}
.modal-dialog-close {
  flex-shrink: 0;
  border: none;
  background: transparent;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--c-text-medium, #676377);
  display: inline-flex;
}
.modal-dialog-close:hover { background: var(--c-border-card, #e6e4ea); }

.modal-dialog-body {
  padding: 8px 24px;
  overflow-y: auto;
  flex: 1;
}
.modal-dialog-body > p {
  margin: 0 0 12px;
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  line-height: 1.5;
  color: var(--c-text-value, #262326);
}

.modal-dialog-foot {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 24px 20px;
  border-top: 1px solid var(--c-border-card, #e6e4ea);
}
</style>
