<script setup lang="ts">
/**
 * LearnModeOverlay — mounted globally in the default layout.
 *
 * When the `learn_mode` feature flag is ON:
 *   • Hovering any element highlights it with a dashed brand-blue outline
 *   • Clicking any element opens the right-hand edit panel with a title +
 *     body textarea. Save persists via useLearnMode() (localStorage).
 *
 * When OFF: renders nothing and installs no listeners.
 */
import { onBeforeUnmount, ref, watch, computed, nextTick } from 'vue'
import { useLearnMode, elementLearnId } from '~/composables/useLearnMode'

const flags = useFeatureFlags()
const isActive = computed(() => flags.isOn('learn_mode'))

const learn = useLearnMode()
const panelOpen = ref(false)
const draftTitle = ref('')
const draftBody = ref('')

// Track the currently-hovered element (to render the outline overlay)
const hoveredRect = ref<{ x: number; y: number; w: number; h: number } | null>(null)
const hoveredEl = ref<HTMLElement | null>(null)

function isOwnElement(el: HTMLElement): boolean {
  return !!el.closest('.learn-mode-overlay-root')
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
  const existing = learn.activeNote.value
  draftTitle.value = existing?.title || ''
  draftBody.value = existing?.body || ''
  panelOpen.value = true
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

// Toggle listeners with the flag (guarded to run client-only)
watch(isActive, (on) => {
  if (typeof window === 'undefined') return
  if (on) attach()
  else {
    detach()
    panelOpen.value = false
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  detach()
})

function save() {
  if (!learn.activeId.value) return
  learn.saveNote(learn.activeId.value, {
    title: draftTitle.value.trim(),
    body: draftBody.value
  })
  panelOpen.value = false
  learn.clearPick()
}

function removeNote() {
  if (!learn.activeId.value) return
  learn.deleteNote(learn.activeId.value)
  panelOpen.value = false
  learn.clearPick()
}

function cancel() {
  panelOpen.value = false
  learn.clearPick()
}
</script>

<template>
  <div v-if="isActive" class="learn-mode-overlay-root">
    <!-- Hover outline -->
    <div
      v-if="hoveredRect && !panelOpen"
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

    <!-- Right-side edit drawer -->
    <Teleport to="body">
      <aside v-if="panelOpen" class="learn-panel" role="dialog" aria-label="Element-Notiz">
        <header class="learn-panel-head">
          <strong>Notiz zu Element</strong>
          <button type="button" class="learn-icon-btn" aria-label="Schließen" @click="cancel">
            <svg viewBox="0 0 16 16" width="14" height="14">
              <path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor"
                    stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </header>
        <div class="learn-panel-meta">
          <code>{{ learn.activeId.value }}</code>
        </div>
        <div class="learn-panel-body">
          <div class="learn-field">
            <label>Titel</label>
            <input v-model="draftTitle" type="text" placeholder="Kurzer Titel" autofocus />
          </div>
          <div class="learn-field">
            <label>Beschreibung</label>
            <textarea v-model="draftBody" rows="8" placeholder="Kontext, Formeln, Grenzwerte…" />
          </div>
        </div>
        <footer class="learn-panel-foot">
          <button
            v-if="learn.activeNote.value"
            type="button"
            class="learn-btn learn-btn-danger"
            @click="removeNote"
          >Löschen</button>
          <span class="learn-panel-spacer" />
          <button type="button" class="learn-btn" @click="cancel">Abbrechen</button>
          <button
            type="button"
            class="learn-btn learn-btn-primary"
            :disabled="!draftTitle.trim() && !draftBody.trim()"
            @click="save"
          >Speichern</button>
        </footer>
      </aside>
    </Teleport>
  </div>
</template>

<style scoped>
.learn-hover-outline {
  position: fixed;
  pointer-events: none;
  border: 2px dashed var(--c-brand-blue);
  border-radius: 4px;
  background: color-mix(in srgb, var(--c-brand-blue) 6%, transparent);
  z-index: 300;
  transition: left 0.05s, top 0.05s, width 0.05s, height 0.05s;
}
.learn-hover-badge {
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

<!-- Non-scoped: teleported panel lives outside the component's scope -->
<style>
.learn-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 380px;
  max-width: calc(100vw - 40px);
  background: white;
  border-left: 1px solid var(--c-border);
  box-shadow: -8px 0 30px rgba(0, 0, 0, 0.15);
  z-index: 310;
  display: flex;
  flex-direction: column;
  animation: learn-panel-in 0.18s ease-out;
}
@keyframes learn-panel-in {
  from { transform: translateX(20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.learn-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border);
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-text-value);
}
.learn-icon-btn {
  border: none;
  background: transparent;
  padding: 6px;
  color: var(--c-text-medium);
  cursor: pointer;
  border-radius: 4px;
}
.learn-icon-btn:hover { background: var(--c-border-card); color: var(--c-text); }
.learn-panel-meta {
  padding: 8px 16px;
  border-bottom: 1px solid var(--c-border-card);
  background: var(--c-bg);
}
.learn-panel-meta code {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--c-text-medium);
  word-break: break-all;
}
.learn-panel-body {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}
.learn-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}
.learn-field label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-light2);
}
.learn-field input,
.learn-field textarea {
  padding: 8px 10px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  color: var(--c-text-value);
  outline: none;
  background: white;
}
.learn-field input:focus,
.learn-field textarea:focus {
  border-color: var(--c-brand-blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 15%, transparent);
}
.learn-field textarea { resize: vertical; line-height: 1.5; }
.learn-panel-foot {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--c-border);
  gap: 8px;
}
.learn-panel-spacer { flex: 1; }
.learn-btn {
  padding: 8px 14px;
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  cursor: pointer;
  border: 1px solid var(--c-border);
  background: white;
  color: var(--c-text-value);
}
.learn-btn:hover:not(:disabled) { background: var(--c-bg); }
.learn-btn-primary {
  background: var(--c-brand-blue);
  color: white;
  border-color: var(--c-brand-blue);
}
.learn-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.learn-btn-danger {
  color: var(--c-error, #B33A3A);
  border-color: var(--c-border);
}
.learn-btn-danger:hover { background: color-mix(in srgb, var(--c-error, #B33A3A) 8%, white); }
</style>
