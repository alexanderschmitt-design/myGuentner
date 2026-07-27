<script setup lang="ts">
/**
 * GuidedHighlight — pulsing ring around the element the current guided-
 * flow step is talking about.
 *
 * Mounted once in the default layout. Reads useGuidedFlow().targetEl,
 * measures its bounding rect against the viewport, and paints a fixed-
 * position ring on top of it. On step change, the target is scrolled
 * into view.
 *
 * Deliberately DOES NOT capture clicks — the user still interacts with
 * the underlying form. Only visual guidance.
 *
 * Alignment guarantees:
 *   • ResizeObserver on the target catches layout shifts driven by CSS
 *     transitions (e.g. the chat-drawer opening changes .site-main's
 *     padding-right, which reshapes the whole grid the target lives in)
 *   • A rAF loop runs for ~320ms after every step change so smooth-scroll
 *     landings + reflows are captured even when no observer fires
 *   • Scroll + window resize keep the ring pinned during normal use
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const guided = useGuidedFlow()
const chatDockOpen = useChatDockState()

const rect = ref<{ x: number; y: number; w: number; h: number } | null>(null)

function measure() {
  const el = guided.targetEl.value
  if (!el) {
    rect.value = null
    return
  }
  const r = el.getBoundingClientRect()
  // Skip zero-size or detached elements (still hydrating)
  if (r.width < 1 || r.height < 1) {
    rect.value = null
    return
  }
  rect.value = { x: r.left, y: r.top, w: r.width, h: r.height }
}

function scrollIntoView() {
  const el = guided.targetEl.value
  if (!el) return
  // Only scroll if the element is off-screen (avoid jumpiness on step 1)
  const r = el.getBoundingClientRect()
  const viewportH = window.innerHeight
  const isVisible = r.top >= 60 && r.bottom <= viewportH - 60
  if (!isVisible) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

// ResizeObserver — fires when the target's own box changes, which happens
// during the .site-main padding-right transition (grid cell shrinks).
let resizeObs: ResizeObserver | null = null

function bindObserver(el: HTMLElement | null) {
  if (resizeObs) {
    resizeObs.disconnect()
    resizeObs = null
  }
  if (!el || typeof ResizeObserver === 'undefined') return
  resizeObs = new ResizeObserver(() => measure())
  resizeObs.observe(el)
}

// Belt-and-suspenders: run a short rAF loop after any state that could
// shift the target — the drawer opening triggers a CSS transition that
// takes ~240ms, so we sample every frame for 320ms.
let animatingUntil = 0
function ensureRafLoop() {
  const now = performance.now()
  if (now < animatingUntil) {
    measure()
    requestAnimationFrame(ensureRafLoop)
  }
}
function kickRafLoop(durationMs = 320) {
  animatingUntil = performance.now() + durationMs
  requestAnimationFrame(ensureRafLoop)
}

// Re-measure on step / target changes, on scroll and on resize.
watch(() => guided.targetEl.value, (el) => {
  measure()
  bindObserver(el)
  // A short delay so smooth-scroll settles before we take the final rect
  requestAnimationFrame(() => {
    scrollIntoView()
    kickRafLoop(360)  // covers smooth-scroll + any post-scroll reflow
  })
}, { immediate: true })

// Re-measure whenever the drawer opens/closes — the .site-main padding
// transition shifts the target left/right across ~240ms.
watch(chatDockOpen, () => kickRafLoop(320))

function onScrollOrResize() { measure() }

if (typeof window !== 'undefined') {
  window.addEventListener('scroll', onScrollOrResize, true)
  window.addEventListener('resize', onScrollOrResize)
}
onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('scroll', onScrollOrResize, true)
  window.removeEventListener('resize', onScrollOrResize)
  if (resizeObs) resizeObs.disconnect()
})

const label = computed(() => {
  const step = guided.currentStep.value
  if (!step) return ''
  // Extract the first bold-marked term in the message as a short label,
  // e.g. "**Kälteleistung**" → "Kälteleistung"
  const m = step.message.match(/\*\*([^*]+)\*\*/)
  return m ? m[1] : 'Günther suggests'
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="rect && chatDockOpen"
      class="guided-highlight"
      :style="{
        left: rect.x - 6 + 'px',
        top: rect.y - 6 + 'px',
        width: rect.w + 12 + 'px',
        height: rect.h + 12 + 'px'
      }"
      aria-hidden="true"
    >
      <span class="guided-highlight-badge">{{ label }}</span>
    </div>
  </Teleport>
</template>

<style scoped>
.guided-highlight {
  position: fixed;
  pointer-events: none;
  border: 2px solid var(--c-brand-blue);
  border-radius: 6px;
  background: color-mix(in srgb, var(--c-brand-blue) 5%, transparent);
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--c-brand-blue) 12%, transparent),
    0 0 22px 4px color-mix(in srgb, var(--c-brand-blue) 22%, transparent);
  z-index: 88;   /* below the chat drawer (95) but above page content */
  animation: guided-pulse 1.8s ease-in-out infinite;
  transition:
    left 0.28s cubic-bezier(0.22, 0.61, 0.36, 1),
    top 0.28s cubic-bezier(0.22, 0.61, 0.36, 1),
    width 0.28s cubic-bezier(0.22, 0.61, 0.36, 1),
    height 0.28s cubic-bezier(0.22, 0.61, 0.36, 1);
}
@keyframes guided-pulse {
  0%, 100% {
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--c-brand-blue) 12%, transparent),
      0 0 22px 4px color-mix(in srgb, var(--c-brand-blue) 22%, transparent);
  }
  50% {
    box-shadow:
      0 0 0 8px color-mix(in srgb, var(--c-brand-blue) 6%, transparent),
      0 0 30px 6px color-mix(in srgb, var(--c-brand-blue) 30%, transparent);
  }
}
.guided-highlight-badge {
  position: absolute;
  top: -26px;
  left: 0;
  background: var(--c-brand-blue);
  color: white;
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 3px;
  white-space: nowrap;
  letter-spacing: 0.1px;
}
</style>
