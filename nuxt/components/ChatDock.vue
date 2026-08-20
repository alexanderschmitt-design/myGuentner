<script setup lang="ts">
/**
 * ChatDock — global chatbot widget (FAB + slide-in drawer).
 * Mounted once from the default layout so it appears on every page.
 * Streams answers from POST /api/chat via useChatStream and renders
 * sources as clickable numbered chips.
 */
import { computed, nextTick, ref, watch } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import ChatMessage from './ChatMessage.vue'
import ModalDialog from './ModalDialog.vue'
import type { RagSource, ToolCall, UserContext } from '~/composables/useChatStream'
import type { GuidedStep } from '~/data/guidedFlows'
import { LEARN_CATEGORIES, resolveElementMeta, type LearnCategory } from '~/composables/useLearnMode'
import { getCategoryById, getCategoryBySlug } from '~/composables/useCategory'

/** Render Markdown → sanitized HTML for the config-question card message.
 *  Mirrors ChatMessage's setup so ** bold **, lists, and inline formatting
 *  work in guided-step messages. */
marked.setOptions({ breaks: true, gfm: true })
function renderStepMarkdown(content: string): string {
  const raw = marked.parse(content || '') as string
  if (typeof window === 'undefined') return raw
  return DOMPurify.sanitize(raw)
}

const isOpen = useChatDockState()
const { layout: chatLayout, toggle: toggleChatLayout } = useChatDockLayout()
const mode = useChatDockMode()
const inputValue = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const bodyRef = ref<HTMLElement | null>(null)

interface HistoryEntry {
  role: 'user' | 'assistant'
  content: string
  sources?: RagSource[]
  messageId?: string | null
  /** Tool-Use trace for this turn — rendered as inline chips above the text. */
  toolCalls?: ToolCall[]
  /** When set, this turn is a scripted Guided-Pass step. The renderer
   *  shows suggestion buttons underneath it. */
  guidedStep?: GuidedStep
}

const history = ref<HistoryEntry[]>([])
const stream = useChatStream()
const guided = useGuidedFlow()
const flags = useFeatureFlags()
const configStore = useConfigStore()
const homeTab = useHomeTab()
const route = useRoute()
const preload = useChatDockPreload()
const toast = useToast()

// Chatbot-Tool gpc_apply_template — Watcher wendet das Template auf den
// Store an sobald das SSE-Event `template_apply` reingekommen ist. Zusätzlich
// wird der Auto-Apply-Session-Flag gesetzt, damit thermodynamics.vue nicht
// hinterher nochmal drüberrennt.
watch(() => stream.templateApply.value, (ev) => {
  if (!ev) return
  configStore.applyTemplate(ev.configuration)
  if (typeof window !== 'undefined' && ev.categorySlug) {
    window.sessionStorage.setItem(`gpc:autoApplied:${ev.categorySlug}`, '1')
  }
  toast.success(`Günther applied template "${ev.templateName}"`)
})

/**
 * Derive the wizard-step id from the current route so Günther knows where
 * the user stands. Kept as a small pure function — the mapping mirrors
 * `TopStepNav.vue` (1..5) but uses semantic ids so the LLM can reason
 * about it without knowing our numbering.
 */
function wizardStepFromPath(path: string): string {
  if (path === '/') return 'category'
  if (/^\/mygpc\/\d+\/thermodynamics$/.test(path)) return 'thermodynamics'
  if (/^\/mygpc\/\d+\/unit-selection$/.test(path)) return 'unit'
  if (/^\/mygpc\/\d+\/coil-geometry$/.test(path)) return 'coil'
  if (/^\/mygpc\/\d+\/search$/.test(path)) return 'results'
  if (path === '/gpc-details' || /^\/mygpc\/\d+\/coil-datasheet$/.test(path)) return 'datasheet'
  return 'other'
}

/**
 * Build the wire-format userContext from the reactive stores. Called once
 * per chat submission so the snapshot reflects the state *at send time*
 * rather than at component-mount time.
 */
function buildUserContext(): UserContext {
  const ctx: UserContext = {
    route: route.path,
    wizardStep: wizardStepFromPath(route.path),
    homeTab: homeTab.value,
    productSection: configStore.productSection,
    selectedUnitKey: configStore.selectedUnitKey
  }

  // Category (only if we're actually inside /mygpc/[catId]/… or the slug is set)
  const catIdMatch = route.path.match(/^\/mygpc\/(\d+)\//)
  const catId = catIdMatch ? parseInt(catIdMatch[1], 10) : null
  if (catId !== null && !Number.isNaN(catId)) {
    ctx.catId = catId
    const cat = getCategoryById(catId)
    if (cat) {
      ctx.categorySlug = cat.slug
      ctx.categoryTitle = cat.sublabel ? `${cat.title} (${cat.sublabel})` : cat.title
    }
  } else if (configStore.currentCategory) {
    ctx.categorySlug = configStore.currentCategory
  }

  // Guided flow
  if (guided.activeFlow.value) {
    ctx.guidedFlowId = guided.activeFlow.value.id
    ctx.guidedFlowTitle = guided.activeFlow.value.title
  }
  if (guided.pickedSuggestionLabel.value) {
    ctx.guidedPathLabel = guided.pickedSuggestionLabel.value
  }

  // Parameter-Whitelist — nur die Werte, die die 5 Pfade wirklich unterscheiden
  const p = configStore.parameters
  ctx.params = {
    coolingCapacityKw: p.coolingCapacityKw,
    refrigerant: p.refrigerant,
    evaporatingTempC: p.evaporatingTempC,
    condensingTempC: p.condensingTempC,
    airInletTempC: p.airInletTempC,
    glycolType: p.glycolType,
    concentrationVolPct: p.concentrationVolPct,
    inletTempC: p.inletTempC,
    outletTempC: p.outletTempC,
    coolingPurpose: p.coolingPurpose,
    defrostMethod: p.defrostMethod,
    unitSystem: configStore.unitSystem
  }

  return ctx
}

// Live assistant message during streaming (built from stream refs)
const liveAssistant = computed<HistoryEntry | null>(() => {
  if (!stream.isStreaming.value && !stream.text.value && stream.toolCalls.value.length === 0) return null
  return {
    role: 'assistant',
    content: stream.text.value,
    sources: stream.sources.value,
    toolCalls: stream.toolCalls.value.length ? stream.toolCalls.value.slice() : undefined
  }
})

// Full transcript = history + live
const transcript = computed<HistoryEntry[]>(() => {
  return liveAssistant.value ? [...history.value, liveAssistant.value] : history.value
})

/** True sobald User selbst irgendwas beigetragen hat (Klick auf Choice,
 *  Text abgeschickt). Steuert die Sichtbarkeit des Begrüßungs-Blocks:
 *  auto-injizierte Guided-Steps zählen NICHT als „User-Interaction". */
const hasUserTurn = computed(() => history.value.some((m) => m.role === 'user'))

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
/** True wenn der aktive Guided-Flow einer der Home-Karten-Q&A-Flows ist
 *  (byapplication/byrefrigerant). Steuert nur das Header-Label der Card:
 *    - true  → "CONFIGURATION QUESTION"
 *    - false → "CONFIGURATION GUIDANCE"
 *  Beide Varianten nutzen dieselbe Card-Optik (Choices mit Icon + Label +
 *  Detail + Chevron); das Design-Sprachbild bleibt konsistent. */
const isHomeEntryFlow = computed(() =>
  !!guided.activeFlow.value?.id?.startsWith('home-entry-')
)
const guidedCardLabel = computed(() =>
  isHomeEntryFlow.value ? 'CONFIGURATION QUESTION' : 'CONFIGURATION GUIDANCE'
)

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

// ============================================================
// Template-Recommendation-Step (kind='recommendations')
// ------------------------------------------------------------
// Wenn der aktive Guided-Step die kind='recommendations'-Marker
// trägt, fetchen wir Templates für die resolved-Kategorie und
// zeigen bis zu 3 Vorschläge. Klick auf einen Vorschlag lädt das
// Template + navigiert + triggert den Flash-Banner. „Skip"
// navigiert ohne Template (existing finalize()).
// ============================================================
interface RecommendationTemplate {
  id: string
  name: string
  categorySlug: string
  isDefaultForCategory: boolean
  isSystem: boolean
  isOwn: boolean
  configuration: any
  updatedAt: string
  paramCount: number
}
const recTargetSlug = ref<string | null>(null)
const recTargetCatId = ref<number | null>(null)
const recTemplates = ref<RecommendationTemplate[]>([])
const recLoading = ref(false)
const recAutoSkipped = ref(false)
const { trigger: triggerFlash } = useTemplateFlash()

function countConfigParams(cfg: any): number {
  if (!cfg?.parameters) return 0
  let n = 0
  for (const [, v] of Object.entries(cfg.parameters)) {
    if (v === null || v === undefined || v === '') continue
    if (typeof v === 'number' && !Number.isFinite(v)) continue
    n++
  }
  return n
}

async function loadRecommendationsForStep(step: GuidedStep) {
  if (step.kind !== 'recommendations' || !step.recommendationCtx) return
  recTemplates.value = []
  recAutoSkipped.value = false

  const target = step.recommendationCtx.resolveTarget(configStore)
  recTargetSlug.value = target.slug
  recTargetCatId.value = target.catId

  recLoading.value = true
  try {
    const res = await $fetch<{ ok: boolean; templates: any[] }>(`/api/templates?category=${encodeURIComponent(target.slug)}`)
    if (res.ok && Array.isArray(res.templates)) {
      // System-Templates zuerst, dann private (API sortiert schon so, aber
      // wir stellen sicher dass die Top-3 möglichst gemischt sind).
      recTemplates.value = res.templates
        .slice(0, 3)
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          categorySlug: t.categorySlug,
          isDefaultForCategory: t.isDefaultForCategory,
          isSystem: t.isSystem === true,
          isOwn: t.isOwn === true,
          configuration: t.configuration,
          updatedAt: t.updatedAt,
          paramCount: countConfigParams(t.configuration)
        }))
    }
  } catch (err: any) {
    console.warn('[recommendations] fetch failed:', err?.message || err)
  } finally {
    recLoading.value = false
  }

  // Wenn keine Templates da sind, überspringen wir die Empfehlungs-Karte
  // und laufen direkt in den Wizard weiter (via finalize).
  if (!recTemplates.value.length) {
    recAutoSkipped.value = true
    runRecommendationFinalize(step)
  }
}

function runRecommendationFinalize(step: GuidedStep) {
  if (!step.recommendationCtx) return
  step.recommendationCtx.finalize({
    store: configStore,
    push: (path: string) => useRouter().push(path)
  })
}

async function onRecommendationPick(t: RecommendationTemplate, step: GuidedStep) {
  // 1) Template applien (existing store action aus Templates-Feature)
  configStore.applyTemplate(t.configuration)

  // 2) Sicherstellen dass die Ziel-Kategorie gesetzt ist (Template kann
  //    unterschiedliche Kategorie tragen — wir nehmen die vom Template).
  const targetSlug = t.categorySlug || recTargetSlug.value || configStore.currentCategory
  const cat = targetSlug ? getCategoryBySlug(targetSlug) : null
  const catId = cat ? cat.id : (recTargetCatId.value ?? 0)
  configStore.setProductSection(1)
  configStore.currentCategory = targetSlug || null

  // 3) sessionStorage-Flag setzen damit der thermodynamics-Auto-Apply-Hook
  //    unser Template nicht überschreibt.
  if (typeof window !== 'undefined' && targetSlug) {
    window.sessionStorage.setItem(`gpc:autoApplied:${targetSlug}`, '1')
  }

  // 4) Transcript-Eintrag als User-Turn (damit der Chat es „bestätigt")
  history.value = [
    ...history.value,
    { role: 'user', content: `Load template: ${t.name}` }
  ]

  // 5) Flash-Banner triggern
  triggerFlash({
    templateName: t.name,
    paramCount: t.paramCount,
    categoryTitle: cat?.title
  })

  // 6) Navigieren
  await useRouter().push(`/mygpc/${catId}/thermodynamics`)
  void step
}

function onRecommendationSkip(step: GuidedStep) {
  history.value = [
    ...history.value,
    { role: 'user', content: 'Skip — configure from scratch' }
  ]
  runRecommendationFinalize(step)
}

// Watcher: sobald der aktive Step ein Recommendation-Step ist → Templates laden
watch(
  () => guided.currentStep.value,
  (step) => {
    if (step?.kind === 'recommendations') {
      loadRecommendationsForStep(step)
    } else {
      recTemplates.value = []
    }
  }
)

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

/**
 * Consume `useChatDockPreload()` — when other pages push a pre-formulated
 * question into the ref (e.g. the "no matching units — Frag Günther" button
 * on the Results page), we open the drawer if needed, drop the text into the
 * textarea and auto-submit it. The ref is cleared after handling so the
 * same prompt doesn't fire twice.
 */
watch(
  [preload, isOpen],
  async ([p, open]) => {
    if (!p) return
    if (!open) {
      isOpen.value = true
      // Wait one tick so the drawer mounts before we drive the textarea.
      await nextTick()
    }
    inputValue.value = p
    preload.value = null
    await nextTick()
    submit()
  }
)

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
    history: apiHistory,
    userContext: buildUserContext()
  })

  // On stream done: commit the assistant turn to history
  if (stream.text.value) {
    history.value = [
      ...history.value,
      {
        role: 'assistant',
        content: stream.text.value,
        sources: stream.sources.value.slice(),
        toolCalls: stream.toolCalls.value.length ? stream.toolCalls.value.slice() : undefined,
        messageId: stream.done.value?.messageId ?? null
      }
    ]
  }
  stream.reset()
  scrollToEnd()
}

async function onFeedback(payload: import('./ChatMessage.vue').FeedbackPayload) {
  try {
    await fetch(`/api/chat/messages/${payload.messageId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ rating: payload.rating, correctionText: payload.correctionText })
    })
  } catch (err) {
    console.warn('[ChatDock] feedback send failed:', err)
  }
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

// Greeting bleibt Englisch — konsistent mit dem restlichen Wizard-UI,
// unabhängig von activeLocale (DE-Fallback im Chatbot-Sprachstil ist
// weiter möglich, aber die Empty-State-Zeile ist eine feste Marketing-
// Zeile in EN).
const startPrompt = computed(() => 'Hello, I\'m Günther')
const startSubtitle = computed(() => 'Answer a short question so I can suggest the right configuration for you.')

interface PresetIntent {
  id: string
  label: string
  iconPath: string        // SVG path for a 20×20 viewBox
  /** 'guided-entry' → aktiviert Home-Q&A-Flow für die entryId +
   *  navigiert nach '/'. 'direct-unit' → springt direkt in den
   *  Wizard `/mygpc/[catId]/thermodynamics`. */
  kind: 'guided-entry' | 'direct-unit'
  entryId?: string        // für guided-entry
  catId?: number          // für direct-unit
  categorySlug?: string   // für direct-unit
}
const presets: PresetIntent[] = [
  {
    id: 'air-cooler',
    label: 'Air Cooler',
    // Fan-in-square icon
    iconPath: 'M3 3h14v14H3zM10 6c1 2 1 3 0 4-1-2-1-3 0-4zM14 10c-2 1-3 1-4 0 2-1 3-1 4 0zM10 14c-1-2-1-3 0-4 1 2 1 3 0 4zM6 10c2-1 3-1 4 0-2 1-3 1-4 0z',
    kind: 'direct-unit',
    catId: 2,
    categorySlug: 'air-cooler'
  },
  {
    id: 'dry-cooler',
    label: 'Dry Cooler',
    // Radiator-fins icon
    iconPath: 'M3 4h14v12H3zM6 4v12M10 4v12M14 4v12',
    kind: 'direct-unit',
    catId: 4,
    categorySlug: 'dry-cooler'
  },
  {
    id: 'data-center',
    label: 'Data Center',
    // Server-stack icon
    iconPath: 'M3 4h14v5H3zM3 11h14v5H3zM6 6.5h.01M6 13.5h.01M9 6.5h5M9 13.5h5',
    kind: 'guided-entry',
    entryId: 'data-center'
  },
  {
    id: 'commercial-hvac',
    label: 'Commercial HVAC',
    // Building-with-vents icon
    iconPath: 'M4 17V6l6-3 6 3v11H4zM8 10h4M8 13h4M8 7h4',
    kind: 'guided-entry',
    entryId: 'commercial-hvac'
  }
]

function pickPreset(p: PresetIntent) {
  if (stream.isStreaming.value) return
  if (p.kind === 'guided-entry' && p.entryId) {
    // Home-Entry-Q&A aktivieren + zurück zur Home, ChatDock offen lassen.
    guided.setEntry(p.entryId)
    if (route.path !== '/') useRouter().push('/')
  } else if (p.kind === 'direct-unit' && p.catId != null && p.categorySlug) {
    // Direkt in den Wizard springen — ChatDock bleibt offen für inline-Guidance
    // via thermo-liquid / thermo-refrigerant Flow.
    configStore.setProductSection(1)
    configStore.currentCategory = p.categorySlug
    useRouter().push(`/mygpc/${p.catId}/thermodynamics`)
  }
}
</script>

<template>
  <div class="chat-dock">
    <!-- Slide-in drawer -->
    <transition name="chat-drawer">
      <aside v-if="isOpen" class="chat-drawer" aria-label="Chat with Günther">
        <header class="chat-drawer-head">
          <div class="chat-drawer-title">
            <!-- Kleines Roboter-Avatar (Header) — konsistent mit FAB + Empty-State-Greeting -->
            <div class="chat-drawer-avatar" aria-hidden="true">
              <svg viewBox="0 0 56 56" width="20" height="20" fill="none">
                <line x1="28" y1="12" x2="28" y2="7" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <circle cx="28" cy="5" r="3.2" fill="#EF4444"/>
                <rect x="6" y="24" width="4" height="10" rx="2" fill="white"/>
                <rect x="46" y="24" width="4" height="10" rx="2" fill="white"/>
                <rect x="10" y="14" width="36" height="30" rx="8" fill="white"/>
                <rect x="14" y="20" width="28" height="18" rx="5" fill="var(--c-brand-blue, #0078BE)"/>
                <circle cx="22" cy="28" r="2.2" fill="white"/>
                <circle cx="34" cy="28" r="2.2" fill="white"/>
                <path d="M23 33.5 Q28 36 33 33.5" stroke="white" stroke-width="1.8" stroke-linecap="round" fill="none"/>
              </svg>
            </div>
            <div class="chat-drawer-title-text">
              <strong>Günther</strong>
              <span class="chat-drawer-subtitle">
                <template v-if="mode === 'learn'">Learn Mode</template>
                <template v-else-if="guidedEnabled && guided.activeFlow.value">{{ guided.activeFlow.value.title }}</template>
                <template v-else>Güntner Assistant</template>
              </span>
            </div>
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
            <!-- Layout-Toggle: Overlay (schwebt) ↔ Push (nebenan). Persistiert
                 in localStorage via useChatDockLayout(). Wechselt sofort ohne
                 Reload; die Klasse .with-chat-push auf .site-main sitzt in
                 layouts/default.vue. -->
            <button
              type="button"
              class="chat-drawer-icon-btn"
              :title="chatLayout === 'overlay' ? 'Currently: Overlay — click to switch to Push (side-by-side)' : 'Currently: Push — click to switch to Overlay (floating)'"
              :aria-pressed="chatLayout === 'push'"
              @click="toggleChatLayout"
            >
              <!-- Overlay-Icon: zwei überlappende Rechtecke -->
              <svg v-if="chatLayout === 'overlay'" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
                   stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="9" height="9" rx="1"/>
                <rect x="5" y="5" width="9" height="9" rx="1"/>
              </svg>
              <!-- Push-Icon: zwei Rechtecke nebeneinander -->
              <svg v-else viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
                   stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="6" height="10" rx="1"/>
                <rect x="9" y="3" width="5" height="10" rx="1"/>
              </svg>
            </button>
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
          <div v-if="!hasUserTurn" class="chat-start" :class="{ 'chat-start-with-guided': transcript.length > 0 }">
            <!-- Roboter-Avatar im Blaukreis mit roter Antennen-Kugel — matched
                 das Referenz-Icon (Screenshot 2026-08-20). -->
            <div class="start-avatar" aria-hidden="true">
              <svg viewBox="0 0 56 56" width="40" height="40" fill="none">
                <!-- Antennen-Stab -->
                <line x1="28" y1="12" x2="28" y2="7" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <!-- Rote Antennen-Kugel -->
                <circle cx="28" cy="5" r="3.2" fill="#EF4444"/>
                <!-- Ohren links + rechts (weiße Rechtecke) -->
                <rect x="6" y="24" width="4" height="10" rx="2" fill="white"/>
                <rect x="46" y="24" width="4" height="10" rx="2" fill="white"/>
                <!-- Head (Rechteck rund, weiß) -->
                <rect x="10" y="14" width="36" height="30" rx="8" fill="white"/>
                <!-- Face-Screen (blau-getönt für Gegen-Kontrast) -->
                <rect x="14" y="20" width="28" height="18" rx="5" fill="var(--c-brand-blue, #0078BE)"/>
                <!-- Eyes (weiße Punkte) -->
                <circle cx="22" cy="28" r="2.2" fill="white"/>
                <circle cx="34" cy="28" r="2.2" fill="white"/>
                <!-- Smile — leicht kurviger weißer Strich -->
                <path d="M23 33.5 Q28 36 33 33.5" stroke="white" stroke-width="1.8" stroke-linecap="round" fill="none"/>
                <!-- Body-Ansatz (Hals) — kurzer weißer Streifen unter dem Kopf -->
                <rect x="24" y="44" width="8" height="4" rx="1.5" fill="white"/>
              </svg>
            </div>
            <h2 class="start-headline">{{ startPrompt }}</h2>
            <p class="start-subtitle">{{ startSubtitle }}</p>
            <!-- Presets nur zeigen wenn KEIN Guided-Flow schon aktiv ist —
                 sonst hat der User die Auswahl-Karte des Flows unmittelbar
                 darunter und würde doppelte Choices sehen. -->
            <div v-if="transcript.length === 0" class="start-presets">
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
            <!-- Tool-Use chips — one per GPC.EU call Günther made this turn -->
            <div v-if="msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length" class="tool-chips">
              <span
                v-for="tc in msg.toolCalls"
                :key="tc.toolUseId"
                class="tool-chip"
                :class="{
                  'tool-chip-pending': tc.ok === undefined,
                  'tool-chip-ok': tc.ok === true,
                  'tool-chip-err': tc.ok === false
                }"
                :title="tc.error || tc.summary || 'Working…'"
              >
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor"
                     stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 4l-3 3 3 3M10 4l3 3-3 3"/>
                </svg>
                <span class="tool-chip-name">{{ tc.name.replace(/^gpc_/, 'GPC.EU · ') }}</span>
                <span v-if="tc.summary" class="tool-chip-summary">→ {{ tc.summary }}</span>
                <span v-else-if="tc.ok === undefined" class="tool-chip-summary tool-chip-pending-dots">…</span>
              </span>
            </div>
            <!-- Guided-Pass turn: rendered as "Konfigurationsfrage"-Card
                 (blue-tinted panel + choice cards) statt der Standard-
                 Chat-Bubble. Nur für den AKTUELLEN Step — historische
                 guided-Turns würden hier nichts mehr rendern, sind aber
                 durch commitGuidedStep bereits aus der Transkript-Liste
                 entfernt worden. -->
            <template v-if="msg.guidedStep
                            && guidedEnabled
                            && guided.currentStep.value?.id === msg.guidedStep.id
                            && msg.guidedStep.kind === 'recommendations'">
              <!-- Template-Empfehlungs-Karte — grüner Akzent, distinctive
                   vom Q&A-Blau, damit User erkennt: neuer Schritt-Typ. -->
              <div class="rec-card">
                <div class="rec-card-head">
                  <svg class="rec-card-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                    <path d="M8 1l1.6 4.6L14 7l-4.4 1.4L8 13 6.4 8.4 2 7l4.4-1.4L8 1z"/>
                  </svg>
                  <span class="rec-card-label">TEMPLATE SUGGESTIONS</span>
                </div>
                <div class="rec-card-body" v-html="renderStepMarkdown(msg.content)"></div>

                <div v-if="recLoading" class="rec-loading">Searching matching templates…</div>

                <div v-else-if="recTemplates.length" class="rec-choice-list">
                  <button
                    v-for="t in recTemplates"
                    :key="t.id"
                    type="button"
                    class="rec-choice"
                    :class="{ 'rec-choice-system': t.isSystem }"
                    @click="onRecommendationPick(t, msg.guidedStep!)"
                  >
                    <span class="rec-choice-icon" aria-hidden="true">
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2.5 3.5h11v9h-11zM2.5 6h11M5 3.5v9"/>
                      </svg>
                    </span>
                    <span class="rec-choice-body">
                      <span class="rec-choice-label">
                        {{ t.name }}
                        <span v-if="t.isSystem" class="rec-badge rec-badge-system" title="Güntner-curated system template">★ SYSTEM</span>
                        <span v-else-if="t.isDefaultForCategory" class="rec-star" title="Your default template for this category">★</span>
                      </span>
                      <span class="rec-choice-detail">
                        {{ t.paramCount }} parameter{{ t.paramCount === 1 ? '' : 's' }} pre-filled
                      </span>
                    </span>
                    <span class="rec-choice-chevron" aria-hidden="true">
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 3l5 5-5 5"/>
                      </svg>
                    </span>
                  </button>
                </div>

                <div v-else-if="!recAutoSkipped" class="rec-empty">
                  No saved templates for this category yet — you'll configure from scratch.
                </div>

                <div class="rec-card-actions">
                  <button
                    type="button"
                    class="config-action-btn"
                    @click="onRecommendationSkip(msg.guidedStep!)"
                  >Skip — configure from scratch →</button>
                </div>
              </div>
            </template>
            <template v-else-if="msg.guidedStep
                            && guidedEnabled
                            && guided.currentStep.value?.id === msg.guidedStep.id">
              <!-- Guided-Pass Card — für ALLE Guided-Flows: Home-Entry-Q&A
                   ("CONFIGURATION QUESTION") und Wizard-Guidance
                   ("CONFIGURATION GUIDANCE"). Nur das Header-Label
                   unterscheidet die zwei Kontexte, die Card-Struktur ist
                   identisch (Choices mit Icon+Label+Detail+Chevron). -->
              <div class="config-question-card">
                <div class="config-question-head">
                  <svg class="config-question-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                    <path d="M8 1l1.3 3.7L13 6l-3.7 1.3L8 11 6.7 7.3 3 6l3.7-1.3L8 1zM13 10l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7L13 10z"/>
                  </svg>
                  <span class="config-question-label">{{ guidedCardLabel }}</span>
                </div>
                <div class="config-question-body" v-html="renderStepMarkdown(msg.content)"></div>
                <div v-if="msg.guidedStep.suggestions && msg.guidedStep.suggestions.length" class="config-choice-list">
                  <button
                    v-for="s in msg.guidedStep.suggestions"
                    :key="s.label"
                    type="button"
                    class="config-choice"
                    @click="onSuggestion(s, msg.guidedStep!)"
                  >
                    <span class="config-choice-icon" aria-hidden="true">
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2.5" y="3.5" width="11" height="9" rx="1.5"/>
                        <path d="M2.5 6.5h11"/>
                      </svg>
                    </span>
                    <span class="config-choice-body">
                      <span class="config-choice-label">{{ s.label }}</span>
                      <span v-if="s.detail" class="config-choice-detail">{{ s.detail }}</span>
                    </span>
                    <span class="config-choice-chevron" aria-hidden="true">
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 3l5 5-5 5"/>
                      </svg>
                    </span>
                  </button>
                </div>
                <div class="config-question-actions">
                  <button
                    v-if="msg.guidedStep.showAdvance !== false && !guided.isFinished.value"
                    type="button"
                    class="config-action-btn"
                    @click="onAdvanceGuided"
                  >Skip</button>
                  <button
                    type="button"
                    class="config-action-btn config-action-btn-muted"
                    @click="onDismissGuided"
                  >Exit guided mode</button>
                </div>
              </div>
            </template>
            <ChatMessage
              v-else
              :role="msg.role"
              :content="msg.content"
              :sources="msg.sources"
              :message-id="msg.messageId"
              :streaming="i === transcript.length - 1 && stream.isStreaming.value && msg.role === 'assistant'"
              @open-source="openSource"
              @feedback="onFeedback"
            />
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
      <!-- Roter Notification-Dot als Aufmerksamkeits-Zeichen -->
      <span class="chat-fab-dot" aria-hidden="true"></span>
      <svg viewBox="0 0 56 56" width="60" height="60" fill="none">
        <line x1="28" y1="12" x2="28" y2="7" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <circle cx="28" cy="5" r="3.2" fill="#EF4444"/>
        <rect x="6" y="24" width="4" height="10" rx="2" fill="white"/>
        <rect x="46" y="24" width="4" height="10" rx="2" fill="white"/>
        <rect x="10" y="14" width="36" height="30" rx="8" fill="white"/>
        <rect x="14" y="20" width="28" height="18" rx="5" fill="var(--c-brand-blue, #0078BE)"/>
        <circle cx="22" cy="28" r="2.2" fill="white"/>
        <circle cx="34" cy="28" r="2.2" fill="white"/>
        <path d="M23 33.5 Q28 36 33 33.5" stroke="white" stroke-width="1.8" stroke-linecap="round" fill="none"/>
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
  /* Angehoben aus dem viewport-Boden auf ~20vh — landet ungefähr auf
     Höhe der untersten Kategorie-Kartenreihe auf typischen Desktop-
     Auflösungen (1080p / 900p). Auf kleineren Bildschirmen sitzt der
     FAB dadurch nicht mehr direkt am Rand aber bleibt gut sichtbar. */
  bottom: 20vh;
  right: 24px;
  z-index: 90;
  /* Doppelt so groß wie vorher (52 → 104px), sichtbarer Call-to-Action. */
  width: 104px;
  height: 104px;
  border-radius: 50%;
  border: none;
  background: var(--c-brand-blue);
  color: white;
  box-shadow: 0 12px 32px rgba(38, 102, 224, 0.4);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;
  /* Sanfte, dauerhafte Pulse-Animation auf den Outline-Ring, damit der
     Button auf Landing-Pages klar sichtbar bleibt. */
  animation: fab-pulse 2.4s ease-out infinite;
}
.chat-fab:hover { transform: translateY(-2px) scale(1.02); }
.chat-fab.is-open { background: var(--c-text-medium); }

/* Roter Notification-Dot oben rechts am FAB — Aufmerksamkeits-Marker. */
.chat-fab-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #EF4444;
  border: 3px solid white;
  box-shadow: 0 0 0 3px color-mix(in srgb, #EF4444 25%, transparent);
  z-index: 1;
}

/* Pulse-Ring: outline expandiert mit fadeout, dauerhafter Loop. */
@keyframes fab-pulse {
  0% {
    box-shadow:
      0 12px 32px rgba(38, 102, 224, 0.4),
      0 0 0 0 color-mix(in srgb, var(--c-brand-blue, #0078BE) 45%, transparent);
  }
  70% {
    box-shadow:
      0 12px 32px rgba(38, 102, 224, 0.4),
      0 0 0 22px color-mix(in srgb, var(--c-brand-blue, #0078BE) 0%, transparent);
  }
  100% {
    box-shadow:
      0 12px 32px rgba(38, 102, 224, 0.4),
      0 0 0 0 color-mix(in srgb, var(--c-brand-blue, #0078BE) 0%, transparent);
  }
}
/* Bevorzugung des Users respektieren — bei prefers-reduced-motion keine
   endlose Animation. */
@media (prefers-reduced-motion: reduce) {
  .chat-fab { animation: none; }
}

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
  gap: 10px;
  font-family: var(--font-ui);
  font-size: var(--font-xs);
  color: var(--c-text-value);
  min-width: 0;
}
.chat-drawer-avatar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--c-brand-blue, #0078BE);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--c-brand-blue, #0078BE) 25%, transparent);
}
.chat-drawer-title-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  line-height: 1.2;
}
.chat-drawer-title-text strong {
  font-size: var(--font-xs, 15.69px);
  color: var(--c-text-value);
  font-weight: 600;
}
.chat-drawer-subtitle {
  color: var(--c-text-light2);
  font-size: var(--font-3xs, 12.81px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  /* Top-anchored: Content startet oben, nicht mittig zentriert im Drawer */
  justify-content: flex-start;
  gap: 14px;
  padding: 32px 24px 24px;
  text-align: center;
}
/* Kompakter wenn ein Guided-Flow-Step darunter rendert — weniger Vertikal-
   Padding + Subtitle darf ausgeblendet werden auf schmalen Höhen. */
.chat-start-with-guided {
  padding: 20px 24px 12px;
  gap: 8px;
}
.chat-start-with-guided .start-headline { font-size: var(--font-md, 18px); }
.chat-start-with-guided .start-subtitle { display: none; }
.chat-start-with-guided .start-avatar { width: 52px; height: 52px; }
/* Blaukreis-Avatar mit Roboter-Glyph — kompakter „Hi, ich bin Günther"-Header */
.start-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--c-brand-blue, #0078BE);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--c-brand-blue, #0078BE) 30%, transparent);
  margin-bottom: 4px;
}
.start-headline {
  margin: 0;
  font-family: var(--font-headline, var(--font-ui));
  font-weight: 500;
  font-size: var(--font-lg, 22px);
  color: var(--c-text-value);
  line-height: 1.2;
  max-width: 320px;
}
.start-subtitle {
  margin: 0 0 8px;
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  color: var(--c-text-medium);
  line-height: 1.5;
  max-width: 340px;
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

/* Tool-Use chips — one per GPC.EU tool call in an assistant turn.
   Pending calls pulse; success is a solid teal; errors go red-tinted. */
.tool-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 4px 0 6px;
}
.tool-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs);
  font-weight: 500;
  border: 1px solid transparent;
}
.tool-chip-name { font-family: 'DM Mono', monospace; }
.tool-chip-summary { color: var(--c-text-medium); font-weight: 400; }
.tool-chip-pending {
  background: color-mix(in srgb, var(--c-brand-blue) 6%, white);
  border-color: color-mix(in srgb, var(--c-brand-blue) 25%, transparent);
  color: var(--c-brand-blue);
}
.tool-chip-pending-dots {
  animation: chip-dots 1s infinite steps(1);
}
@keyframes chip-dots {
  0%, 100% { opacity: 0.3 }
  50% { opacity: 1 }
}
.tool-chip-ok {
  background: color-mix(in srgb, var(--c-success, #2E7D4F) 8%, white);
  border-color: color-mix(in srgb, var(--c-success, #2E7D4F) 30%, transparent);
  color: var(--c-success, #2E7D4F);
}
.tool-chip-err {
  background: color-mix(in srgb, var(--c-error, #B33A3A) 8%, white);
  border-color: color-mix(in srgb, var(--c-error, #B33A3A) 30%, transparent);
  color: var(--c-error, #B33A3A);
}

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

/* ============================================================
   Config-Question Card — ersetzt die Chat-Bubble für Guided-
   Pass-Turns. Vier Zonen:
     1) Header: Sparkle-Icon + Label "CONFIGURATION QUESTION"
     2) Body:   Frage-Text (Markdown, bold)
     3) Choices: klickbare Karten mit Icon + Label + Chevron
     4) Actions: Skip / Exit guided mode
   ============================================================ */
.config-question-card {
  margin: 6px 0 14px;
  padding: 14px 14px 12px;
  background: color-mix(in srgb, var(--c-brand-blue) 7%, white);
  border: 1px solid color-mix(in srgb, var(--c-brand-blue) 20%, transparent);
  border-left: 4px solid var(--c-brand-blue);
  border-radius: var(--radius-md, 8px);
}
.config-question-head {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--c-brand-blue);
  margin-bottom: 8px;
}
.config-question-icon { flex-shrink: 0; }
.config-question-label {
  font-family: var(--font-ui);
  font-size: var(--font-4xs, 11.58px);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.config-question-body {
  font-family: var(--font-ui);
  font-size: var(--font-2xs, 14.17px);
  font-weight: 600;
  color: var(--c-text-value);
  line-height: 1.4;
  margin-bottom: 12px;
}
.config-question-body :deep(p) { margin: 0 0 6px; }
.config-question-body :deep(p:last-child) { margin-bottom: 0; }
.config-question-body :deep(strong) { font-weight: 700; }

.config-choice-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.config-choice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: white;
  border: 1px solid var(--c-border, #cfcdd6);
  border-radius: var(--radius-xs, 4px);
  text-align: left;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: border-color 0.12s, box-shadow 0.12s, transform 0.06s;
}
.config-choice:hover {
  border-color: var(--c-brand-blue);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--c-brand-blue) 12%, transparent);
}
.config-choice:active { transform: translateY(1px); }
.config-choice-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-xs, 4px);
  background: color-mix(in srgb, var(--c-brand-blue) 10%, white);
  color: var(--c-brand-blue);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.config-choice-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.config-choice-label {
  font-size: var(--font-2xs, 14.17px);
  font-weight: 600;
  color: var(--c-text-value);
  line-height: 1.3;
}
.config-choice-detail {
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-medium);
  line-height: 1.4;
}
.config-choice-chevron {
  flex-shrink: 0;
  color: var(--c-text-medium);
  display: inline-flex;
  transition: transform 0.12s, color 0.12s;
}
.config-choice:hover .config-choice-chevron {
  color: var(--c-brand-blue);
  transform: translateX(2px);
}

.config-question-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 10px;
}
.config-action-btn {
  border: none;
  background: transparent;
  padding: 6px 10px;
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-brand-blue);
  cursor: pointer;
  border-radius: var(--radius-xs, 4px);
}
.config-action-btn:hover { background: color-mix(in srgb, var(--c-brand-blue) 10%, transparent); }
.config-action-btn-muted { color: var(--c-text-medium); }
.config-action-btn-muted:hover { background: white; color: var(--c-text-value); }

/* ============================================================
   Template-Recommendation Card — visuell abgesetzt vom Q&A-Blau,
   damit User den neuen Schritt-Typ erkennt. Grüner Akzent +
   subtile inset-Border, damit der Kontext „Vorschläge" klar wird.
   ============================================================ */
.rec-card {
  margin: 6px 0 14px;
  padding: 14px 14px 12px;
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--c-success, #2E7D4F) 10%, white) 0%,
    color-mix(in srgb, var(--c-success, #2E7D4F) 5%, white) 100%);
  border: 1px solid color-mix(in srgb, var(--c-success, #2E7D4F) 30%, transparent);
  border-left: 4px solid var(--c-success, #2E7D4F);
  border-radius: var(--radius-md, 8px);
}
.rec-card-head {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--c-success, #2E7D4F);
  margin-bottom: 8px;
}
.rec-card-icon { flex-shrink: 0; }
.rec-card-label {
  font-family: var(--font-ui);
  font-size: var(--font-4xs, 11.58px);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.rec-card-body {
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-value);
  line-height: 1.5;
  margin-bottom: 12px;
}
.rec-card-body :deep(p) { margin: 0 0 4px; }
.rec-card-body :deep(p:last-child) { margin-bottom: 0; }
.rec-card-body :deep(strong) { font-weight: 600; }

.rec-loading, .rec-empty {
  padding: 12px;
  color: var(--c-text-medium);
  font-family: var(--font-ui);
  font-size: var(--font-3xs, 12.81px);
  font-style: italic;
  text-align: center;
  background: white;
  border-radius: var(--radius-xs);
  border: 1px dashed color-mix(in srgb, var(--c-success, #2E7D4F) 20%, transparent);
}

.rec-choice-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rec-choice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: white;
  border: 1px solid var(--c-border, #cfcdd6);
  border-radius: var(--radius-xs, 4px);
  text-align: left;
  font-family: var(--font-ui);
  cursor: pointer;
  transition: border-color 0.12s, box-shadow 0.12s, transform 0.06s;
}
.rec-choice:hover {
  border-color: var(--c-success, #2E7D4F);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--c-success, #2E7D4F) 15%, transparent);
}
.rec-choice:active { transform: translateY(1px); }
.rec-choice-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-xs, 4px);
  background: color-mix(in srgb, var(--c-success, #2E7D4F) 12%, white);
  color: var(--c-success, #2E7D4F);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.rec-choice-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.rec-choice-label {
  font-size: var(--font-2xs, 14.17px);
  font-weight: 600;
  color: var(--c-text-value);
  line-height: 1.3;
  display: flex;
  align-items: center;
  gap: 6px;
}
.rec-star {
  color: color-mix(in srgb, var(--c-warning, #F5B800) 100%, transparent);
  font-size: 0.9em;
}
.rec-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: var(--font-4xs, 11.58px);
  font-weight: 600;
  letter-spacing: 0.06em;
  vertical-align: middle;
}
.rec-badge-system {
  background: var(--c-brand-blue, #0078BE);
  color: white;
}
/* System-Choices bekommen einen subtilen linken Blaustreifen, damit sie
   visuell aus dem grünen Recommendation-Kontext hervorstechen. */
.rec-choice-system {
  border-left: 3px solid var(--c-brand-blue, #0078BE);
}
.rec-choice-detail {
  font-size: var(--font-3xs, 12.81px);
  color: var(--c-text-medium);
  line-height: 1.4;
}
.rec-choice-chevron {
  flex-shrink: 0;
  color: var(--c-text-medium);
  display: inline-flex;
  transition: transform 0.12s, color 0.12s;
}
.rec-choice:hover .rec-choice-chevron {
  color: var(--c-success, #2E7D4F);
  transform: translateX(2px);
}
.rec-card-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

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
