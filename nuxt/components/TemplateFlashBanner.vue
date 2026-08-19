<script setup lang="ts">
/**
 * TemplateFlashBanner — schwebendes Success-Banner am oberen Rand.
 *
 * Erscheint für ~5s wenn Günther ein Template über eine Guided-Flow-
 * Recommendation lädt. CSS-Animation: slide-in from top + subtle glow-pulse.
 */
const { state, dismiss } = useTemplateFlash()
</script>

<template>
  <Teleport to="body">
    <Transition name="flash-banner">
      <div
        v-if="state"
        class="template-flash"
        role="status"
        aria-live="polite"
      >
        <div class="template-flash-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
            <path d="M10 1l1.9 5.3L17 8l-5.1 1.7L10 15l-1.9-5.3L3 8l5.1-1.7L10 1zm6 11l1 2.7 2.7 1-2.7 1-1 2.7-1-2.7L12.3 16l2.7-1L16 12z"/>
          </svg>
        </div>
        <div class="template-flash-body">
          <div class="template-flash-title">Template loaded</div>
          <div class="template-flash-detail">
            <strong>{{ state.templateName }}</strong>
            <span v-if="state.categoryTitle"> · {{ state.categoryTitle }}</span>
            <span class="template-flash-count">{{ state.paramCount }} parameter{{ state.paramCount === 1 ? '' : 's' }} pre-filled</span>
          </div>
        </div>
        <button
          type="button"
          class="template-flash-close"
          aria-label="Dismiss"
          @click="dismiss"
        >
          <svg viewBox="0 0 12 12" width="10" height="10">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.template-flash {
  position: fixed;
  top: 84px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 120;
  min-width: 340px;
  max-width: 640px;
  padding: 14px 16px 14px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--c-brand-blue, #0078BE) 92%, white) 0%,
    color-mix(in srgb, var(--c-brand-blue, #0078BE) 78%, white) 100%);
  color: white;
  border-radius: 12px;
  box-shadow:
    0 12px 40px color-mix(in srgb, var(--c-brand-blue, #0078BE) 40%, transparent),
    0 0 0 6px color-mix(in srgb, var(--c-brand-blue, #0078BE) 12%, transparent);
  animation: template-flash-pulse 1.4s ease-out;
}
.template-flash-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  animation: template-flash-icon-spin 1.4s ease-out;
}
.template-flash-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.template-flash-title {
  font-family: var(--font-ui);
  font-size: var(--font-4xs, 11.58px);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.85;
}
.template-flash-detail {
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  line-height: 1.35;
  color: white;
}
.template-flash-detail strong { font-weight: 600; }
.template-flash-count {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  font-size: var(--font-4xs, 11.58px);
  vertical-align: middle;
}
.template-flash-close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.template-flash-close:hover { background: rgba(255, 255, 255, 0.28); }

/* Enter/Leave animations */
.flash-banner-enter-active {
  transition: transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.32s ease-out;
}
.flash-banner-leave-active {
  transition: transform 0.28s ease-in, opacity 0.28s ease-in;
}
.flash-banner-enter-from {
  transform: translate(-50%, -32px) scale(0.94);
  opacity: 0;
}
.flash-banner-leave-to {
  transform: translate(-50%, -20px);
  opacity: 0;
}

/* Persistent gentle pulse on the shadow for ~1.4s after entry */
@keyframes template-flash-pulse {
  0%   { box-shadow: 0 12px 40px color-mix(in srgb, var(--c-brand-blue, #0078BE) 40%, transparent), 0 0 0 0    color-mix(in srgb, var(--c-brand-blue, #0078BE) 25%, transparent); }
  60%  { box-shadow: 0 12px 40px color-mix(in srgb, var(--c-brand-blue, #0078BE) 40%, transparent), 0 0 0 22px color-mix(in srgb, var(--c-brand-blue, #0078BE)  0%, transparent); }
  100% { box-shadow: 0 12px 40px color-mix(in srgb, var(--c-brand-blue, #0078BE) 40%, transparent), 0 0 0 6px  color-mix(in srgb, var(--c-brand-blue, #0078BE) 12%, transparent); }
}
@keyframes template-flash-icon-spin {
  0%   { transform: rotate(-40deg) scale(0.6); }
  100% { transform: rotate(0deg) scale(1); }
}

@media (max-width: 640px) {
  .template-flash { min-width: 0; width: calc(100vw - 24px); top: 74px; }
  .template-flash-count { display: block; margin: 4px 0 0; }
}
</style>
