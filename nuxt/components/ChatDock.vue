<script setup lang="ts">
/**
 * ChatDock — global chatbot widget (FAB + slide-in drawer).
 * Mounted once from the default layout so it appears on every page.
 * Streams answers from POST /api/chat via useChatStream and renders
 * sources as clickable numbered chips.
 */
import { computed, nextTick, ref, watch } from 'vue'
import ChatMessage from './ChatMessage.vue'
import ModalDialog from './ModalDialog.vue'
import type { RagSource } from '~/composables/useChatStream'
import type { GuidedStep } from '~/data/guidedFlows'
import { LEARN_CATEGORIES, resolveElementMeta, type LearnCategory } from '~/composables/useLearnMode'

const isOpen = useChatDockState()
const mode = useChatDockMode()
const inputValue = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const bodyRef = ref<HTMLElement | null>(null)

interface HistoryEntry {
  role: 'user' | 'assistant'
  content: string
  sources?: RagSource[]
  /** When set, this turn is a scripted Guided-Pass step. The renderer
   *  shows suggestion buttons underneath it. */
  guidedStep?: GuidedStep
}

const history = ref<HistoryEntry[]>([])
const stream = useChatStream()
const guided = useGuidedFlow()
const flags = useFeatureFlags()

// Live assistant message during streaming (built from stream refs)
const liveAssistant = computed<HistoryEntry | null>(() => {
  if (!stream.isStreaming.value && !stream.text.value) return null
  return {
    role: 'assistant',
    content: stream.text.value,
    sources: stream.sources.value
  }
})

// Full transcript = history + live
const transcript = computed<HistoryEntry[]>(() => {
  return liveAssistant.value ? [...history.value, liveAssistant.value] : history.value
})

const sourceModal = ref(false)
const openedSource = ref<RagSource | null>(null)

function openSource(src: RagSource) {
  openedSource.value = src
  sourceModal.value = true
}

function scrollToEnd() {
  nextTick(() => {
    if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
  })
}

// Auto-scroll while streaming
watch([() => stream.text.value, () => transcript.value.length], scrollToEnd)

// --------------------------------------------------------------------------
// Guided Pass — when the `guided_pass` flag is on AND the current route has
// a matching flow, we inject the current step as an assistant turn. Each
// step replaces the previous *guided* turn (we don't spam the transcript)
// but user turns and free-form Günther replies stay in place.
// --------------------------------------------------------------------------
const guidedEnabled = computed(() => flags.isOn('guided_pass'))

function commitGuidedStep(step: GuidedStep | null) {
  // Drop the previous trailing guided turn if there was one, so we don't
  // stack scripted turns on top of each other during a session.
  const cleaned = history.value.filter((h, i, arr) => {
    // Keep every non-guided entry, and every guided entry except the last
    // one (we replace it below).
    if (!h.guidedStep) return true
    // Is this the last guided entry?
    const lastGuidedIdx = arr.map((x) => !!x.guidedStep).lastIndexOf(true)
    return i !== lastGuidedIdx
  })
  if (step) {
    cleaned.push({
      role: 'assistant',
      content: step.message,
      guidedStep: step
    })
  }
  history.value = cleaned
  scrollToEnd()
}

// Re-inject the guided step when the flow OR step changes AND the dock is
// open. If the dock is closed, we defer until it opens (see toggle()).
watch(
  [() => guided.currentStep.value, () => isOpen.value, () => guidedEnabled.value],
  () => {
    if (!isOpen.value) return
    if (!guidedEnabled.value) {
      commitGuidedStep(null)
      return
    }
    commitGuidedStep(guided.currentStep.value)
  },
  { immediate: true }
)

function onSuggestion(sugg: import('~/data/guidedFlows').GuidedSuggestion, step: GuidedStep) {
  // Record what the user picked as a user turn so the transcript reads
  // as a real conversation
  history.value = [
    ...history.value,
    { role: 'user', content: sugg.label + (sugg.detail ? ` — ${sugg.detail}` : '') }
  ]
  guided.applySuggestion(sugg)
  scrollToEnd()
  void step
}

function onAdvanceGuided() {
  guided.advance()
}

function onDismissGuided() {
  guided.dismiss()
  commitGuidedStep(null)
}

// --------------------------------------------------------------------------
// Learn Mode — drawer body when mode === 'learn'.
// LearnModeOverlay handles the on-page hover + click-to-pick; this block
// owns the note-editor form. Drafts sync from useLearnMode when the picker
// changes so switching elements doesn't stomp an unsaved draft on the same
// element.
// --------------------------------------------------------------------------
const learn = useLearnMode()
const learnModeAvailable = computed(() => flags.isOn('learn_mode'))
const draftTitle = ref('')
const draftBody = ref('')
const draftCategory = ref<LearnCategory>('element')

// When the user picks a new element, load its existing note into the draft
// (or start blank if none exists).
watch(() => learn.activeId.value, (id) => {
  if (!id) return
  const existing = learn.activeNote.value
  draftTitle.value = existing?.title || ''
  draftBody.value = existing?.body || ''
  draftCategory.value = existing?.category || 'element'
})

function switchMode(next: 'chat' | 'learn') {
  if (mode.value === next) return
  mode.value = next
  if (next === 'chat') {
    // Leaving learn mode → clear picker so the persistent outline goes away
    learn.clearPick()
  }
}

function saveLearn() {
  if (!learn.activeId.value) return
  learn.saveNote(learn.activeId.value, {
    title: draftTitle.value.trim(),
    body: draftBody.value,
    category: draftCategory.value
  })
  learn.clearPick()
  draftTitle.value = ''
  draftBody.value = ''
}

function deleteLearn() {
  if (!learn.activeId.value) return
  learn.deleteNote(learn.activeId.value)
  learn.clearPick()
  draftTitle.value = ''
  draftBody.value = ''
}

function cancelLearn() {
  learn.clearPick()
  draftTitle.value = ''
  draftBody.value = ''
}

const savedNotes = computed(() =>
  Object.values(learn.notes.value).sort((a, b) =>
    (b.updatedAt || '').localeCompare(a.updatedAt || '')
  )
)

// Resolved friendly metadata for the currently-picked element
// (Feldname + API-Parameter, read from data-attributes on the anchor).
const activeMeta = computed(() => {
  const el = learn.activeElement.value
  if (!el) return null
  return resolveElementMeta(el)
})

async function submit() {
  const q = inputValue.value.trim()
  if (!q || stream.isStreaming.value) return

  // Append user turn to history
  history.value = [...history.value, { role: 'user', content: q }]
  inputValue.value = ''
  scrollToEnd()

  // Build API history (exclude the latest user turn — /api/chat receives
  // it separately in the `query` field)
  const apiHistory = history.value
    .slice(0, -1)
    .map((h) => ({ role: h.role, content: h.content }))

  await stream.send({
    query: q,
    language: 'en',
    history: apiHistory
  })

  // On stream done: commit the assistant turn to history
  if (stream.text.value) {
    history.value = [
      ...history.value,
      {
        role: 'assistant',
        content: stream.text.value,
        sources: stream.sources.value.slice()
      }
    ]
  }
  stream.reset()
  scrollToEnd()
}

function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => inputRef.value?.focus())
    // Inject the current guided step if applicable — the watcher only fires
    // when the step *changes*, so the initial open needs a manual poke.
    if (guidedEnabled.value && guided.currentStep.value) {
      commitGuidedStep(guided.currentStep.value)
    }
    scrollToEnd()
  } else {
    stream.abort()
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

function clearHistory() {
  history.value = []
  stream.reset()
}

// ---- Start-screen preset intents ----
// Mascot: bound dynamically so Vite doesn't try to statically import the PNG
// (avoids a compile error until the user drops the asset into public/).
const mascotSrc = '/images/guenther-bot.png'
const mascotError = ref(false)

// Reads the app locale via @nuxtjs/i18n if available; falls back to 'en'.
const i18n = (() => { try { return useI18n() } catch { return null } })()
const activeLocale = computed(() => {
  const l = (i18n as any)?.locale?.value
  return (l === 'de' ? 'de' : 'en') as 'de' | 'en'
})

const startPrompt = computed(() => activeLocale.value === 'de'
  ? 'Was möchtest du konfigurieren?'
  : 'What would you like to configure?')

interface PresetIntent {
  id: string
  label: string
  queryDe: string
  queryEn: string
  iconPath: string        // SVG path for a 20×20 viewBox
}
const presets: PresetIntent[] = [
  {
    id: 'gcvc',
    label: 'GCVC',
    queryDe: 'Ich möchte eine GCVC-Anlage konfigurieren. Führe mich durch die nötigen Schritte.',
    queryEn: 'I want to configure a GCVC unit. Walk me through the required steps.',
    // Fan-blade icon
    iconPath: 'M10 2c2 3 2 6 0 8-2-3-2-6 0-8zM18 10c-3 2-6 2-8 0 3-2 6-2 8 0zM10 18c-2-3-2-6 0-8 2 3 2 6 0 8zM2 10c3-2 6-2 8 0-3 2-6 2-8 0zM10 10a1 1 0 100 0'
  },
  {
    id: 'fruit',
    label: 'Fruit Cooling',
    queryDe: 'Ich brauche eine Lösung für Obst-Kühlung. Welche Parameter empfiehlst du?',
    queryEn: 'I need a fruit-cooling solution. What parameters do you recommend?',
    // Apple-with-leaf icon
    iconPath: 'M10 5c-3 0-6 2-6 6 0 4 3 7 6 7s6-3 6-7c0-4-3-6-6-6zM11 5c1-2 3-2 4-2-.5 2-2 3-4 3'
  },
  {
    id: 'support',
    label: 'Support by configuration',
    queryDe: 'Ich brauche Unterstützung bei einer laufenden Konfiguration. Wie können wir starten?',
    queryEn: 'I need help with an ongoing configuration. How can we get started?',
    // Chat-bubble with helper dots
    iconPath: 'M3 4h14v10h-8l-4 3v-3H3zM7 9h.01M10 9h.01M13 9h.01'
  }
]

function pickPreset(p: PresetIntent) {
  if (stream.isStreaming.value) return
  inputValue.value = activeLocale.value === 'de' ? p.queryDe : p.queryEn
  submit()
}
</script>

<template>
  <div class="chat-dock">
    <!-- Slide-in drawer -->
    <transition name="chat-drawer">
      <aside v-if="isOpen" class="chat-drawer" aria-label="Chat with Günther">
        <header class="chat-drawer-head">
          <div class="chat-drawer-title">
            <span class="chat-drawer-dot" aria-hidden="true"></span>
            <strong>Günther</strong>
            <span class="chat-drawer-subtitle">
              <template v-if="mode === 'learn'">Learn Mode</template>
              <template v-else-if="guidedEnabled && guided.activeFlow.value">{{ guided.activeFlow.value.title }}</template>
              <template v-else>Güntner Assistant</template>
            </span>
          </div>
          <div class="chat-drawer-head-actions">
            <!-- Mode toggle: Chat / Learn. Only shows Learn icon when the
                 admin flag is on. Chat icon is always visible so both
                 states are one click away. -->
            <div v-if="learnModeAvailable" class="chat-mode-toggle" role="tablist" aria-label="Chat mode">
              <button
                type="button"
                class="chat-mode-btn"
                :class="{ active: mode === 'chat' }"
                :aria-pressed="mode === 'chat'"
                title="Product chat"
                @click="switchMode('chat')"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
                     stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 3.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6l-3 2v-2H3a1 1 0 0 1-1-1v-7z"/>
                </svg>
              </button>
              <button
                type="button"
                class="chat-mode-btn"
                :class="{ active: mode === 'learn' }"
                :aria-pressed="mode === 'learn'"
                title="Learn Mode"
                @click="switchMode('learn')"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
                     stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2.5 2.5h8a2 2 0 0 1 2 2v9M2.5 2.5v11h9a1.5 1.5 0 0 0 0-3H2.5"/>
                </svg>
              </button>
            </div>
            <button
              v-if="mode === 'chat' && history.length"
              type="button"
              class="chat-drawer-icon-btn"
              title="Reset chat"
              @click="clearHistory"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
                   stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h10M6 6v7a1 1 0 001 1h2a1 1 0 001-1V6M5 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
            <button type="button" class="chat-drawer-icon-btn" aria-label="Close" @click="toggle">
              <svg viewBox="0 0 16 16" width="14" height="14">
                <path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor"
                      stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </header>

        <div ref="bodyRef" class="chat-drawer-body">
          <!-- =========== CHAT MODE =========== -->
          <template v-if="mode === 'chat'">
          <div v-if="!transcript.length" class="chat-start">
            <img :src="mascotSrc" alt="Günther" class="start-mascot" @error="mascotError = true" v-show="!mascotError" />
            <div v-if="mascotError" class="start-mascot-fallback" aria-hidden="true">
              <svg viewBox="0 0 120 140" width="180" height="210" fill="none">
                <!-- Head -->
                <rect x="18" y="14" width="84" height="72" rx="34" fill="#f6f6f5" stroke="#c5c5c5" stroke-width="1.5"/>
                <!-- Face plate -->
                <rect x="30" y="30" width="60" height="42" rx="20" fill="#181c24"/>
                <!-- Eyes -->
                <ellipse cx="46" cy="50" rx="5" ry="7" fill="#39edb5"/>
                <ellipse cx="74" cy="50" rx="5" ry="7" fill="#39edb5"/>
                <!-- Smile -->
                <path d="M50 60 Q60 66 70 60" stroke="#39edb5" stroke-width="2" stroke-linecap="round" fill="none"/>
                <!-- Antennas -->
                <line x1="30" y1="14" x2="24" y2="4" stroke="#c5c5c5" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="90" y1="14" x2="96" y2="4" stroke="#c5c5c5" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="24" cy="4"  r="2" fill="#c5c5c5"/>
                <circle cx="96" cy="4"  r="2" fill="#c5c5c5"/>
                <!-- Ears -->
                <circle cx="14" cy="50" r="6" fill="#e8e6e2" stroke="#c5c5c5" stroke-width="1.5"/>
                <circle cx="106" cy="50" r="6" fill="#e8e6e2" stroke="#c5c5c5" stroke-width="1.5"/>
                <!-- Body -->
                <rect x="30" y="90" width="60" height="42" rx="22" fill="#f6f6f5" stroke="#c5c5c5" stroke-width="1.5"/>
                <!-- Body light -->
                <rect x="52" y="102" width="16" height="4" rx="2" fill="#39edb5"/>
                <!-- Arm waving -->
                <path d="M90 100 Q108 92 112 78" stroke="#c5c5c5" stroke-width="10" stroke-linecap="round" fill="none"/>
                <circle cx="112" cy="76" r="7" fill="#f6f6f5" stroke="#c5c5c5" stroke-width="1.5"/>
              </svg>
            </div>
            <h2 class="start-headline">{{ startPrompt }}</h2>
            <div class="start-presets">
              <button
                v-for="p in presets"
                :key="p.id"
                type="button"
                class="start-preset"
                :disabled="stream.isStreaming.value"
                @click="pickPreset(p)"
              >
                <span class="preset-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <path :d="p.iconPath"/>
                  </svg>
                </span>
                <span class="preset-label">{{ p.label }}</span>
                <span class="preset-arrow" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 3l5 5-5 5"/>
                  </svg>
                </span>
              </button>
            </div>
          </div>
          <template v-for="(msg, i) in transcript" :key="i">
            <ChatMessage
              :role="msg.role"
              :content="msg.content"
              :sources="msg.sources"
              :streaming="i === transcript.length - 1 && stream.isStreaming.value && msg.role === 'assistant'"
              @open-source="openSource"
            />
            <!-- Guided-Pass suggestion strip. Rendered only under the
                 last message if that message is the currently-active
                 guided step (i.e. the user hasn't picked yet). -->
            <div
              v-if="msg.guidedStep
                    && i === transcript.length - 1
                    && guidedEnabled
                    && guided.currentStep.value?.id === msg.guidedStep.id"
              class="guided-suggestions"
            >
              <button
                v-for="s in msg.guidedStep.suggestions"
                :key="s.label"
                type="button"
                class="guided-suggestion"
                @click="onSuggestion(s, msg.guidedStep!)"
              >
                <span class="guided-suggestion-label">{{ s.label }}</span>
                <span v-if="s.detail" class="guided-suggestion-detail">{{ s.detail }}</span>
              </button>

              <div class="guided-actions">
                <button
                  v-if="msg.guidedStep.showAdvance !== false && !guided.isFinished.value"
                  type="button"
                  class="guided-action-btn"
                  @click="onAdvanceGuided"
                >
                  Skip
                </button>
                <button
                  type="button"
                  class="guided-action-btn guided-action-btn-muted"
                  @click="onDismissGuided"
                >
                  Exit guided mode
                </button>
              </div>
            </div>
          </template>
          <p v-if="stream.error.value" class="chat-drawer-error">
            {{ stream.error.value }}
          </p>
          </template>

          <!-- =========== LEARN MODE =========== -->
          <template v-else>
            <div v-if="!learn.activeId.value" class="learn-empty">
              <p><strong>Learn Mode</strong></p>
              <p>Hover over any element on the page to the left — it will get a dashed outline. Click it to add a comment.</p>
              <div v-if="savedNotes.length" class="learn-saved">
                <h4>Already annotated ({{ savedNotes.length }})</h4>
                <ul>
                  <li v-for="n in savedNotes.slice(0, 8)" :key="n.id" class="learn-saved-item">
                    <span class="learn-saved-cat" :class="`cat-${n.category}`">{{
                      LEARN_CATEGORIES.find(c => c.id === n.category)?.label || n.category
                    }}</span>
                    <span class="learn-saved-title">{{ n.title || '(untitled)' }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div v-else class="learn-editor">
              <div class="learn-editor-meta">
                <div class="learn-meta-row">
                  <span class="learn-meta-label">Field</span>
                  <span class="learn-meta-value">{{ activeMeta?.fieldName || '—' }}</span>
                </div>
                <div class="learn-meta-row">
                  <span class="learn-meta-label">API parameter</span>
                  <code v-if="activeMeta?.apiParam">{{ activeMeta.apiParam }}</code>
                  <span v-else class="learn-meta-empty">not tagged</span>
                </div>
              </div>

              <div class="learn-field">
                <label>Category</label>
                <div class="learn-cat-grid">
                  <label
                    v-for="c in LEARN_CATEGORIES"
                    :key="c.id"
                    class="learn-cat-option"
                    :class="{ active: draftCategory === c.id }"
                  >
                    <input type="radio" :value="c.id" v-model="draftCategory" />
                    <span class="learn-cat-label">{{ c.label }}</span>
                    <span class="learn-cat-hint">{{ c.hint }}</span>
                  </label>
                </div>
              </div>

              <div class="learn-field">
                <label>Title</label>
                <input v-model="draftTitle" type="text" placeholder="Short title" />
              </div>

              <div class="learn-field">
                <label>Description</label>
                <textarea v-model="draftBody" rows="8" placeholder="Context, formulas, limits, relationships to other fields…" />
              </div>

              <div class="learn-editor-actions">
                <button
                  v-if="learn.activeNote.value"
                  type="button"
                  class="learn-btn learn-btn-danger"
                  @click="deleteLearn"
                >Delete</button>
                <span class="learn-editor-spacer" />
                <button type="button" class="learn-btn" @click="cancelLearn">Cancel</button>
                <button
                  type="button"
                  class="learn-btn learn-btn-primary"
                  :disabled="!draftTitle.trim() && !draftBody.trim()"
                  @click="saveLearn"
                >Save</button>
              </div>
            </div>
          </template>
        </div>

        <footer v-if="mode === 'chat'" class="chat-drawer-input">
          <textarea
            ref="inputRef"
            v-model="inputValue"
            placeholder="Ask a question…"
            rows="2"
            :disabled="stream.isStreaming.value"
            @keydown="onKey"
          />
          <button
            type="button"
            class="chat-drawer-send"
            :disabled="!inputValue.trim() || stream.isStreaming.value"
            @click="submit"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor"
                 stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 8l12-5-4 12-2-5-6-2z"/>
            </svg>
          </button>
        </footer>
      </aside>
    </transition>

    <!-- Floating action button (only when drawer is closed — the
         drawer has its own header X for closing) -->
    <button v-if="!isOpen" type="button" class="chat-fab" aria-label="Open chat" @click="toggle">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
           stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 5h16v11H8l-4 4V5z"/>
      </svg>
    </button>

    <!-- Source detail modal -->
    <ModalDialog v-model:open="sourceModal" title="Source" size="md">
      <template v-if="openedSource">
        <p><strong>{{ openedSource.metadata?.documentName || 'Document' }}</strong></p>
        <p v-if="openedSource.metadata?.dmsFilename" class="src-meta">
          DMS: {{ openedSource.metadata.dmsFilename }}
          <span v-if="openedSource.metadata.dmsVersion"> (v{{ openedSource.metadata.dmsVersion }})</span>
        </p>
        <p v-if="openedSource.metadata?.chunkIndex != null" class="src-meta">
          Chunk #{{ openedSource.metadata.chunkIndex }}
          <span v-if="openedSource.score"> · Score {{ openedSource.score.toFixed(3) }}</span>
        </p>
        <pre class="src-body">{{ openedSource.text }}</pre>
      </template>
    </ModalDialog>
  </div>
</template>

<style scoped>
.chat-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 90;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: var(--c-brand-blue);
  color: white;
  box-shadow: 0 8px 24px rgba(38, 102, 224, 0.35);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;
}
.chat-fab:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(38, 102, 224, 0.45); }
.chat-fab.is-open { background: var(--c-text-medium); }

/* Drawer sits BELOW the site header (var --header-h fallback 68px)
   and extends to the viewport bottom. It's pinned to the right edge
   of the viewport; the default layout adds padding-right on .site-main
   so the drawer sits NEXT to the content instead of on top of it. */
.chat-drawer {
  position: fixed;
  right: 0;
  top: var(--header-h, 68px);
  bottom: 0;
  z-index: 95;
  width: var(--chat-drawer-w, 440px);
  max-width: 90vw;
  background: white;
  border-left: 1px solid var(--c-border);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--c-border-card);
  background: var(--c-bg);
}
.chat-drawer-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-text-value);
}
.chat-drawer-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-success, #2E7D4F);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-success, #2E7D4F) 20%, transparent);
}
.chat-drawer-subtitle {
  color: var(--c-text-light2);
  font-size: var(--font-3xs);
}
.chat-drawer-head-actions { display: flex; gap: 4px; align-items: center; }

/* Mode toggle (Chat / Learn) — segment control */
.chat-mode-toggle {
  display: inline-flex;
  padding: 2px;
  background: var(--c-border-card);
  border-radius: 999px;
  margin-right: 4px;
}
.chat-mode-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--c-text-medium);
  cursor: pointer;
  border-radius: 999px;
  transition: background 0.12s, color 0.12s;
}
.chat-mode-btn:hover { color: var(--c-text); }
.chat-mode-btn.active {
  background: white;
  color: var(--c-brand-blue);
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
}

.chat-drawer-icon-btn {
  border: none;
  background: transparent;
  padding: 6px;
  border-radius: 4px;
  color: var(--c-text-medium);
  cursor: pointer;
}
.chat-drawer-icon-btn:hover { background: var(--c-border-card); color: var(--c-text); }

.chat-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 14px 6px;
}
.chat-drawer-empty {
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  padding: 12px;
  border: 1px dashed var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-bg);
}
.chat-drawer-empty p { margin: 0 0 8px; }
.chat-drawer-empty p:last-child { margin-bottom: 0; }

/* ---------- New start screen (empty transcript) ---------- */
.chat-start {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 32px 24px;
  text-align: center;
}
.start-mascot {
  max-width: 240px;
  height: auto;
  filter: drop-shadow(0 8px 16px rgba(38, 102, 224, 0.12));
}
.start-mascot-fallback {
  display: inline-flex;
  filter: drop-shadow(0 8px 16px rgba(38, 102, 224, 0.12));
}
.start-headline {
  margin: 0;
  font-family: var(--font-headline);
  font-weight: 400;
  font-size: var(--font-2xl);
  color: var(--c-text-value);
  line-height: 1.2;
  max-width: 460px;
}
.start-presets {
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.start-preset {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xs);
  color: var(--c-text);
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.12s, box-shadow 0.15s;
  text-align: left;
  min-height: 56px;
}
.start-preset:hover:not(:disabled) {
  border-color: var(--c-brand-blue);
  background: color-mix(in srgb, var(--c-brand-blue) 4%, white);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(38, 102, 224, 0.08);
}
.start-preset:disabled { opacity: 0.5; cursor: not-allowed; }
.start-preset .preset-icon {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--c-brand-blue);
  background: color-mix(in srgb, var(--c-brand-blue) 10%, white);
  border-radius: var(--radius-xs2);
  flex-shrink: 0;
}
.start-preset .preset-label { flex: 1 0 0; min-width: 0; }
.start-preset .preset-arrow {
  color: var(--c-text-light);
  transition: transform 0.15s, color 0.15s;
  display: inline-flex;
}
.start-preset:hover:not(:disabled) .preset-arrow { color: var(--c-brand-blue); transform: translateX(2px); }

.chat-drawer-error {
  color: var(--c-error, #B33A3A);
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  margin: 8px 4px 0;
}

.chat-drawer-input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px 12px;
  border-top: 1px solid var(--c-border-card);
  background: white;
}
.chat-drawer-input textarea {
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  padding: 8px 10px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  line-height: 1.4;
  color: var(--c-text-value);
  resize: none;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.chat-drawer-input textarea:focus {
  border-color: var(--c-brand-blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 15%, transparent);
}
.chat-drawer-input textarea:disabled { opacity: 0.6; background: var(--c-bg); }

.chat-drawer-send {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--radius-xs);
  background: var(--c-brand-blue);
  color: white;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.chat-drawer-send:disabled { opacity: 0.4; cursor: not-allowed; }

.chat-drawer-enter-active,
.chat-drawer-leave-active { transition: transform 0.24s ease, opacity 0.24s ease; }
.chat-drawer-enter-from,
.chat-drawer-leave-to { transform: translateX(20px); opacity: 0; }

/* Guided Pass — suggestion strip beneath a scripted assistant turn. Each
   suggestion is a 2-line button with a strong label + optional detail. */
.guided-suggestions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: -6px 0 14px;
  padding: 0 4px;
}
.guided-suggestion {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--c-brand-blue) 30%, transparent);
  background: color-mix(in srgb, var(--c-brand-blue) 5%, white);
  border-radius: var(--radius-xs);
  text-align: left;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, transform 0.06s;
}
.guided-suggestion:hover {
  background: color-mix(in srgb, var(--c-brand-blue) 12%, white);
  border-color: var(--c-brand-blue);
}
.guided-suggestion:active { transform: translateY(1px); }
.guided-suggestion-label {
  font-size: var(--font-2xs);
  font-weight: 500;
  color: var(--c-brand-blue);
  line-height: 1.3;
}
.guided-suggestion-detail {
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
  line-height: 1.4;
}
.guided-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
}
.guided-action-btn {
  border: none;
  background: transparent;
  padding: 4px 8px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-brand-blue);
  cursor: pointer;
  border-radius: var(--radius-xs);
}
.guided-action-btn:hover { background: color-mix(in srgb, var(--c-brand-blue) 8%, transparent); }
.guided-action-btn-muted { color: var(--c-text-medium); }
.guided-action-btn-muted:hover { background: var(--c-bg); color: var(--c-text); }

/* -------- Learn Mode body -------- */
.learn-empty {
  padding: 14px;
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-value);
  line-height: 1.5;
}
.learn-empty p { margin: 0 0 8px; }
.learn-empty p:last-of-type { color: var(--c-text-medium); }
.learn-saved { margin-top: 18px; }
.learn-saved h4 {
  margin: 0 0 8px;
  font-size: var(--font-3xs);
  color: var(--c-text-light2);
  font-weight: 500;
  letter-spacing: 0.1px;
  text-transform: uppercase;
}
.learn-saved ul { margin: 0; padding: 0; list-style: none; }
.learn-saved-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--c-border-card);
  font-size: var(--font-3xs);
}
.learn-saved-item:last-child { border-bottom: none; }
.learn-saved-cat {
  font-size: 10px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 3px;
  letter-spacing: 0.1px;
  color: white;
  flex-shrink: 0;
}
.learn-saved-cat.cat-element   { background: var(--c-brand-blue); }
.learn-saved-cat.cat-relations { background: #7a4fbe; }
.learn-saved-cat.cat-product   { background: #2e7d4f; }
.learn-saved-title { color: var(--c-text-value); }

.learn-editor {
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.learn-editor-meta {
  padding: 10px 12px;
  background: var(--c-bg);
  border-radius: var(--radius-xs);
  border: 1px solid var(--c-border-card);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.learn-meta-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-height: 18px;
}
.learn-meta-label {
  flex: 0 0 96px;
  font-family: var(--font-ui);
  font-size: 10px;
  letter-spacing: 0.1px;
  text-transform: uppercase;
  color: var(--c-text-light2);
}
.learn-meta-value {
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  color: var(--c-text-value);
  font-weight: 500;
}
.learn-meta-row code {
  font-family: 'DM Mono', monospace;
  font-size: var(--font-3xs);
  color: var(--c-brand-blue);
  background: white;
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px solid var(--c-border-card);
}
.learn-meta-empty {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light2);
  font-style: italic;
}

.learn-field { display: flex; flex-direction: column; gap: 6px; }
.learn-field > label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  color: var(--c-text-light2);
  letter-spacing: 0.1px;
}
.learn-field input[type='text'],
.learn-field textarea {
  padding: 8px 10px;
  border: 1px solid var(--c-border-input);
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  line-height: 1.4;
  color: var(--c-text-value);
  background: white;
  outline: none;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.learn-field input[type='text']:focus,
.learn-field textarea:focus {
  border-color: var(--c-brand-blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-brand-blue) 15%, transparent);
}
.learn-field textarea { resize: vertical; }

/* Category radios rendered as three side-by-side clickable cards */
.learn-cat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.learn-cat-option {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 8px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-xs);
  background: white;
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}
.learn-cat-option input[type='radio'] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.learn-cat-option.active {
  border-color: var(--c-brand-blue);
  background: color-mix(in srgb, var(--c-brand-blue) 8%, white);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--c-brand-blue) 22%, transparent);
}
.learn-cat-label {
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
  color: var(--c-text-value);
}
.learn-cat-option.active .learn-cat-label { color: var(--c-brand-blue); }
.learn-cat-hint {
  font-size: 10px;
  color: var(--c-text-light2);
  line-height: 1.3;
}

.learn-editor-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 4px;
}
.learn-editor-spacer { flex: 1; }
.learn-btn {
  padding: 8px 12px;
  border-radius: var(--radius-xs);
  font-family: var(--font-ui);
  font-size: var(--font-2xs);
  cursor: pointer;
  border: 1px solid var(--c-border);
  background: white;
  color: var(--c-text-value);
  transition: background 0.12s, border-color 0.12s;
}
.learn-btn:hover:not(:disabled) { background: var(--c-bg); }
.learn-btn-primary {
  background: var(--c-brand-blue);
  color: white;
  border-color: var(--c-brand-blue);
}
.learn-btn-primary:hover:not(:disabled) { filter: brightness(1.05); }
.learn-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.learn-btn-danger { color: var(--c-error, #B33A3A); }
.learn-btn-danger:hover { background: color-mix(in srgb, var(--c-error, #B33A3A) 8%, white); }

.src-meta {
  margin: 4px 0;
  font-size: var(--font-3xs);
  color: var(--c-text-medium);
}
.src-body {
  margin: 8px 0 0;
  padding: 10px 12px;
  background: var(--c-bg);
  border-radius: var(--radius-xs);
  font-family: 'DM Mono', monospace;
  font-size: var(--font-3xs);
  line-height: 1.5;
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
}
</style>
