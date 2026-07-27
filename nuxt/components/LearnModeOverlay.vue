<script setup lang="ts">
/**
 * LearnModeOverlay — hover-outline + click-to-pick layer, mounted globally
 * in the default layout.
 *
 * Active when:
 *   • `learn_mode` feature flag is on  AND
 *   • ChatDock is open   AND
 *   • ChatDock mode is 'learn'
 *
 * Hovering any element highlights it with a dashed brand-blue outline;
 * clicking picks the element into useLearnMode(). The edit form itself
 * lives inside ChatDock's LearnBody — this component is just the
 * on-page picker + visual outline.
 */
import { onBeforeUnmount, ref, watch, computed } from 'vue'

const flags = useFeatureFlags()
const chatDockOpen = useChatDockState()
const chatMode = useChatDockMode()

const isActive = computed(
  () => flags.isOn('learn_mode') && chatDockOpen.value && chatMode.value === 'learn'
)

const learn = useLearnMode()

// Track the currently-hovered element (to render the outline overlay)
const hoveredRect = ref<{ x: number; y: number; w: number; h: number } | null>(null)
const hoveredEl = ref<HTMLElement | null>(null)

function isOwnElement(el: HTMLElement): boolean {
  // Never target our own overlay, and skip the chat drawer itself
  return !!el.closest('.learn-mode-overlay-root') || !!el.closest('.chat-drawer')
}

function shouldSkip(el: HTMLElement): boolean {
  // Skip whole-page containers to avoid selecting the entire body
  const skipTags = new Set(['HTML', 'BODY'])
  if (skipTags.has(el.tagName)) return true
  return false
}

function measure(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  hoveredRect.value = { x: r.left, y: r.top, w: r.width, h: r.height }
}

function onMouseOver(e: MouseEvent) {
  const el = e.target as HTMLElement
  if (!el || isOwnElement(el) || shouldSkip(el)) return
  hoveredEl.value = el
  measure(el)
}

function onMouseOut() {
  hoveredEl.value = null
  hoveredRect.value = null
}

function onClick(e: MouseEvent) {
  const el = e.target as HTMLElement
  if (!el || isOwnElement(el) || shouldSkip(el)) return
  e.preventDefault()
  e.stopPropagation()
  learn.pick(el)
}

function onScrollOrResize() {
  if (hoveredEl.value) measure(hoveredEl.value)
}

function attach() {
  document.addEventListener('mouseover', onMouseOver, true)
  document.addEventListener('mouseout', onMouseOut, true)
  document.addEventListener('click', onClick, true)
  window.addEventListener('scroll', onScrollOrResize, true)
  window.addEventListener('resize', onScrollOrResize)
}
function detach() {
  document.removeEventListener('mouseover', onMouseOver, true)
  document.removeEventListener('mouseout', onMouseOut, true)
  document.removeEventListener('click', onClick, true)
  window.removeEventListener('scroll', onScrollOrResize, true)
  window.removeEventListener('resize', onScrollOrResize)
  hoveredRect.value = null
  hoveredEl.value = null
}

// Toggle listeners with active state (guarded to run client-only)
watch(isActive, (on) => {
  if (typeof window === 'undefined') return
  if (on) attach()
  else detach()
}, { immediate: true })

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  detach()
})

// Rectangle for the CURRENTLY-PICKED element (persists across mouse-out)
const pickedRect = ref<{ x: number; y: number; w: number; h: number } | null>(null)

function measurePicked() {
  const el = learn.activeElement.value
  if (!el) {
    pickedRect.value = null
    return
  }
  const r = el.getBoundingClientRect()
  pickedRect.value = { x: r.left, y: r.top, w: r.width, h: r.height }
}

// Re-measure the picked element on scroll, resize, and picker change.
watch(() => learn.activeElement.value, () => measurePicked(), { immediate: true })

if (typeof window !== 'undefined') {
  window.addEventListener('scroll', measurePicked, true)
  window.addEventListener('resize', measurePicked)
}
onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('scroll', measurePicked, true)
  window.removeEventListener('resize', measurePicked)
})
</script>

<template>
  <div v-if="isActive" class="learn-mode-overlay-root">
    <!-- Hover outline (transient) -->
    <div
      v-if="hoveredRect"
      class="learn-hover-outline"
      :style="{
        left: hoveredRect.x + 'px',
        top: hoveredRect.y + 'px',
        width: hoveredRect.w + 'px',
        height: hoveredRect.h + 'px'
      }"
    >
      <span class="learn-hover-badge">Klicken zum Kommentieren</span>
    </div>

    <!-- Picked outline (persistent while a note is being edited) -->
    <div
      v-if="pickedRect && !hoveredRect"
      class="learn-picked-outline"
      :style="{
        left: pickedRect.x + 'px',
        top: pickedRect.y + 'px',
        width: pickedRect.w + 'px',
        height: pickedRect.h + 'px'
      }"
    >
      <span class="learn-picked-badge">Kommentar rechts →</span>
    </div>
  </div>
</template>

<style scoped>
.learn-hover-outline,
.learn-picked-outline {
  position: fixed;
  pointer-events: none;
  z-index: 300;
  transition: left 0.05s, top 0.05s, width 0.05s, height 0.05s;
}
.learn-hover-outline {
  border: 2px dashed var(--c-brand-blue);
  border-radius: 4px;
  background: color-mix(in srgb, var(--c-brand-blue) 6%, transparent);
}
.learn-picked-outline {
  border: 2px solid var(--c-brand-blue);
  border-radius: 4px;
  background: color-mix(in srgb, var(--c-brand-blue) 8%, transparent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--c-brand-blue) 14%, transparent);
}
.learn-hover-badge,
.learn-picked-badge {
  position: absolute;
  top: -22px;
  left: 0;
  background: var(--c-brand-blue);
  color: white;
  font-family: var(--font-ui);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
  pointer-events: none;
}
</style>
