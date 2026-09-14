<script setup lang="ts">
/**
 * ToastStack — renders the reactive queue from useToast().
 * Meant to be mounted once in the default layout.
 *
 * Position: fixed top-right (an die myGuentner-Live-Referenz angelehnt).
 * Kritische Fehler bleiben sticky bis der Nutzer sie schließt.
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
        :role="t.kind === 'warning' || t.kind === 'error' ? 'alert' : 'status'"
        :aria-live="t.kind === 'warning' || t.kind === 'error' ? 'assertive' : 'polite'"
      >
        <span class="toast-icon" aria-hidden="true">
          <!-- Warning: ⚠-Triangle (an Referenz angelehnt) -->
          <svg v-if="t.kind === 'warning'" viewBox="0 0 24 24" width="20" height="20">
            <path d="M12 3L2 20h20L12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="M12 10v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="12" cy="17.5" r="0.9" fill="currentColor"/>
          </svg>
          <!-- Error: ⓧ-Circle -->
          <svg v-else-if="t.kind === 'error'" viewBox="0 0 24 24" width="20" height="20">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>
            <path d="M8 8l8 8M16 8l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <!-- Success: ✓ -->
          <svg v-else-if="t.kind === 'success'" viewBox="0 0 24 24" width="20" height="20">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>
            <path d="M7.5 12.5l3 3 6-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <!-- Info: ℹ -->
          <svg v-else viewBox="0 0 24 24" width="20" height="20">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>
            <path d="M12 11v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="12" cy="8" r="0.9" fill="currentColor"/>
          </svg>
        </span>
        <div class="toast-body">
          <span class="toast-message">{{ t.message }}</span>
          <span v-if="t.hint" class="toast-hint">→ {{ t.hint }}</span>
          <span v-if="t.fieldLabel" class="toast-meta toast-field">Field: {{ t.fieldLabel }}</span>
          <span v-if="t.currentValue" class="toast-meta">Current: {{ t.currentValue }}</span>
          <span v-if="t.eventId" class="toast-meta">EventId: {{ t.eventId }}</span>
          <span v-if="t.date" class="toast-meta">Date: {{ t.date }}</span>
        </div>
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
  top: 24px;
  right: 24px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 380px;
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
.toast-success { border-left-color: var(--c-success, #2E7D4F); color: var(--c-text-value); }
.toast-success .toast-icon { color: var(--c-success, #2E7D4F); }
.toast-error   { border-left-color: var(--c-error, #B33A3A); }
.toast-error   .toast-icon { color: var(--c-error, #B33A3A); }
.toast-warning { border-left-color: #E1A100; }
.toast-warning .toast-icon { color: #E1A100; }
.toast-info    { border-left-color: var(--c-brand-blue, #2666e0); }
.toast-info    .toast-icon { color: var(--c-brand-blue, #2666e0); }

.toast-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}
.toast-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.toast-message {
  white-space: pre-line;
  word-break: break-word;
}
.toast-meta {
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-light2, #878391);
  word-break: break-all;
}
.toast-field { color: var(--c-text-medium, #676377); font-weight: 500; }
.toast-hint {
  margin-top: 4px;
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-value, #262326);
  padding: 6px 8px;
  background: color-mix(in srgb, #E1A100 10%, white);
  border-left: 2px solid #E1A100;
  border-radius: 3px;
  word-break: break-word;
}
.toast-close {
  flex-shrink: 0;
  border: none;
  background: transparent;
  padding: 4px;
  color: var(--c-text-light2);
  cursor: pointer;
  border-radius: 4px;
  align-self: flex-start;
}
.toast-close:hover { background: var(--c-border-card); color: var(--c-text); }

@keyframes toast-in {
  from { transform: translateY(-6px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
</style>
