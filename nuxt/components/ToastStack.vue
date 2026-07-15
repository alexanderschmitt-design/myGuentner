<script setup lang="ts">
/**
 * ToastStack — renders the reactive queue from useToast().
 * Meant to be mounted once in the default layout.
 */

const { toasts, dismiss } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="`toast-${t.kind}`"
        role="status"
      >
        <span class="toast-message">{{ t.message }}</span>
        <button
          type="button"
          class="toast-close"
          aria-label="Dismiss"
          @click="dismiss(t.id)"
        >
          <svg viewBox="0 0 16 16" width="12" height="12">
            <path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor"
                  stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style>
.toast-stack {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 360px;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  background: white;
  border: 1px solid var(--c-border);
  border-left: 3px solid var(--c-text-medium);
  border-radius: var(--radius-md, 8px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.10);
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  color: var(--c-text-value);
  pointer-events: auto;
  animation: toast-in 0.18s ease-out;
}
.toast-success { border-left-color: var(--c-success, #2E7D4F); }
.toast-error   { border-left-color: var(--c-error, #B33A3A); }
.toast-info    { border-left-color: var(--c-brand-blue, #2666e0); }
.toast-message { flex: 1; }
.toast-close {
  flex-shrink: 0;
  border: none;
  background: transparent;
  padding: 4px;
  color: var(--c-text-light2);
  cursor: pointer;
  border-radius: 4px;
}
.toast-close:hover { background: var(--c-border-card); color: var(--c-text); }

@keyframes toast-in {
  from { transform: translateY(6px); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}
</style>
