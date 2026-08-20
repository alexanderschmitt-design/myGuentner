<script setup lang="ts">
/**
 * GuentherIntro — kleines Video-Overlay unten rechts, das beim ersten
 * Besuch als Willkommens-Animation abspielt. Zeigt Günther-Character-Video.
 *
 * Verhalten:
 *  - Zeigt sich beim ersten Load (localStorage-flag „gpc:intro-seen").
 *  - Auto-play muted (Browser-Autoplay-Policy erfordert muted).
 *  - Nach Video-Ende auto-hide (+ Flag setzen).
 *  - Manual dismiss via × Button — Flag wird ebenfalls gesetzt.
 *  - Positioniert links vom Chat-FAB, sodass sich beide nicht überlappen.
 *  - Wird ausgeblendet sobald der Chat-Drawer offen ist (isOpen chat state).
 */
import { ref, computed, onMounted } from 'vue'

const chatDockOpen = useChatDockState()

const STORAGE_KEY = 'gpc:intro-seen'
const visible = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)

const shouldRender = computed(() => visible.value && !chatDockOpen.value)

onMounted(() => {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(STORAGE_KEY)) return
  } catch { /* ignore */ }
  // Kurz warten, damit Layout / FAB gemounted sind, sonst „blitzt" das
  // Video schon bevor der Hintergrund steht.
  setTimeout(() => {
    visible.value = true
  }, 600)
})

function markSeen() {
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
  }
}
function dismiss() {
  visible.value = false
  markSeen()
}
function onEnded() {
  // Nach dem Video-Ende noch 1s stehen lassen, dann ausblenden.
  markSeen()
  setTimeout(() => { visible.value = false }, 1000)
}
function onLoaded() {
  // Autoplay via JS anstoßen, damit iOS/Safari-Policy den muted-Path akzeptiert.
  const v = videoRef.value
  if (!v) return
  v.play().catch(() => { /* Fallback: User klickt Play manuell */ })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="intro-fade">
      <div
        v-if="shouldRender"
        class="guenther-intro"
        role="dialog"
        aria-label="Meet Günther"
      >
        <button
          type="button"
          class="guenther-intro-close"
          aria-label="Dismiss intro"
          @click="dismiss"
        >
          <svg viewBox="0 0 12 12" width="10" height="10">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>
          </svg>
        </button>
        <video
          ref="videoRef"
          class="guenther-intro-video"
          src="/images/Brooks - Grey Shirt.mp4"
          muted
          playsinline
          autoplay
          preload="auto"
          @loadeddata="onLoaded"
          @ended="onEnded"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.guenther-intro {
  position: fixed;
  bottom: 88px;               /* über dem Chat-FAB (52px + 24px margin + Puffer) */
  right: 24px;
  z-index: 92;                /* unter dem Chat-Drawer (95), über allem anderen */
  width: 200px;
  height: 200px;
  border-radius: 50%;
  overflow: hidden;
  background: white;
  box-shadow:
    0 12px 40px color-mix(in srgb, var(--c-brand-blue, #0078BE) 30%, transparent),
    0 0 0 4px color-mix(in srgb, var(--c-brand-blue, #0078BE) 12%, transparent);
}
.guenther-intro-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.guenther-intro-close {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, transform 0.12s;
}
.guenther-intro-close:hover { background: rgba(0, 0, 0, 0.75); transform: scale(1.06); }

/* Enter/Leave transitions */
.intro-fade-enter-active { transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease-out; }
.intro-fade-leave-active { transition: transform 0.3s ease-in, opacity 0.3s ease-in; }
.intro-fade-enter-from { transform: translateY(24px) scale(0.85); opacity: 0; }
.intro-fade-leave-to { transform: translateY(12px) scale(0.9); opacity: 0; }

@media (max-width: 640px) {
  .guenther-intro { width: 160px; height: 160px; bottom: 76px; right: 16px; }
}
</style>
