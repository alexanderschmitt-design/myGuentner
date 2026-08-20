/**
 * useGuidedFlow — orchestrates a scripted chatbot pass on the current
 * route.
 *
 * Selects the matching flow from `data/guidedFlows.ts`, tracks the
 * current step, exposes the target element (for GuidedHighlight) and the
 * `applySuggestion` / `advance` / `reset` actions used by ChatDock.
 *
 * The state is module-scoped so ChatDock and GuidedHighlight share one
 * cursor. Route changes and store-slug changes automatically re-select
 * the flow and reset the cursor.
 */
import { computed, ref, watch } from 'vue'
import type { GuidedFlow, GuidedStep, GuidedSuggestion } from '~/data/guidedFlows'
import { findFlowForRoute } from '~/data/guidedFlows'

const activeFlow = ref<GuidedFlow | null>(null)
const stepIndex = ref(0)
const targetEl = ref<HTMLElement | null>(null)
/** Guides that the user has manually dismissed on this route — remain
 *  suppressed until the route changes or reset() is called. */
const dismissedFlowIds = ref<Set<string>>(new Set())
/** Label of the last suggestion the user picked in the current flow — used
 *  to identify which of the 5 demo paths (Cold storage, Deep freeze, …)
 *  the user chose, so the chatbot can reference it in answers. Cleared
 *  when the active flow id changes. */
const pickedSuggestionLabel = ref<string | null>(null)
/** Which home-card the user clicked to trigger a guided Q&A flow — e.g.
 *  'industrial-refrigeration' or 'natural-refrigerants'. Read by flow.match()
 *  to branch into the correct step tree. Cleared on route change away from '/'. */
const pickedEntryId = ref<string | null>(null)

let installed = false

/**
 * Resolve the data-learn-id-tagged DOM node for the step's targetLearnId.
 * Retries once via requestAnimationFrame because the flow can activate
 * before the target page's DOM has fully mounted.
 */
function resolveTarget(learnId: string | undefined) {
  if (!learnId || typeof document === 'undefined') {
    targetEl.value = null
    return
  }
  const query = () => document.querySelector<HTMLElement>(`[data-learn-id="${learnId}"]`)
  const found = query()
  if (found) {
    targetEl.value = found
  } else {
    // DOM may not be mounted yet — try once more next frame
    requestAnimationFrame(() => {
      targetEl.value = query()
    })
  }
}

export function useGuidedFlow() {
  const route = useRoute()
  const router = useRouter()
  const flags = useFeatureFlags()
  const store = useConfigStore()
  const homeTab = useHomeTab()
  // Admin-editierbare Entry-Flows (aus DB oder Code-Fallback). Wird beim
  // ersten Aufruf vom Watcher unten via ensureLoaded() angestoßen.
  const entryFlowsState = useGuidedEntryFlows()

  // Install once per module. `flow` and `stepIndex` are module-scoped, but the
  // watchers reference the current router — safe because Nuxt gives every
  // browser tab a single router instance.
  if (!installed && typeof window !== 'undefined') {
    installed = true

    // Fire-and-forget: sobald die DB-Configs da sind, matcht der Watcher neu
    // (entryFlowsState.flows ist reactive, ändert sich nach ensureLoaded()).
    entryFlowsState.ensureLoaded()

    watch(
      [
        () => route.path,
        () => store.currentCategory,
        () => flags.isOn('guided_pass'),
        () => homeTab.value,
        pickedEntryId,
        entryFlowsState.flows
      ],
      ([path]) => {
        // Verlässt der User '/', ist ein pickedEntry veraltet — er stammt aus
        // einem Home-Karten-Klick, dessen Flow nur auf '/' matched.
        if (path !== '/' && pickedEntryId.value) {
          pickedEntryId.value = null
        }
        // When flag is off, blank everything so the overlay disappears.
        if (!flags.isOn('guided_pass')) {
          activeFlow.value = null
          targetEl.value = null
          return
        }
        // 1) Zuerst DB-hydrierte Entry-Flows (Admin-editierbar) prüfen —
        //    Match ist über pickedEntryId.
        const dynFlows = entryFlowsState.flows.value
        const dyn = dynFlows.find(f => f.match(route, store, homeTab.value, pickedEntryId.value))
        // 2) Wenn kein Entry-Flow matcht, auf die statische Registry
        //    (homeUnit, thermo-*) zurückfallen.
        const next = dyn || findFlowForRoute(route, store, homeTab.value, pickedEntryId.value)
        if (!next) {
          activeFlow.value = null
          targetEl.value = null
          return
        }
        // Was this flow dismissed on the current path? Then leave it alone.
        if (dismissedFlowIds.value.has(`${path}::${next.id}`)) {
          activeFlow.value = null
          targetEl.value = null
          return
        }
        const changed = !activeFlow.value || activeFlow.value.id !== next.id
        activeFlow.value = next
        if (changed) {
          // Wenn die ersten Steps bereits durch Guided-Q&A / Template
          // beantwortet sind, gleich zum ersten unbeantworteten Step
          // springen. Steps ohne `hasAnswer` gelten als unbeantwortet.
          const firstOpenIdx = next.steps.findIndex(
            (s) => !s.hasAnswer || !s.hasAnswer(store)
          )
          stepIndex.value = firstOpenIdx < 0 ? next.steps.length - 1 : firstOpenIdx
          pickedSuggestionLabel.value = null
        }
        resolveTarget(next.steps[stepIndex.value]?.targetLearnId)
      },
      { immediate: true }
    )
  }

  const currentStep = computed<GuidedStep | null>(() => {
    if (!activeFlow.value) return null
    return activeFlow.value.steps[stepIndex.value] || null
  })

  const isFinished = computed<boolean>(() => {
    if (!activeFlow.value) return false
    return stepIndex.value >= activeFlow.value.steps.length - 1
  })

  function advance() {
    if (!activeFlow.value) return
    if (stepIndex.value < activeFlow.value.steps.length - 1) {
      stepIndex.value += 1
      resolveTarget(activeFlow.value.steps[stepIndex.value]?.targetLearnId)
    }
  }

  const appliedDefaultsFor = useCategoryDefaultsGuard()

  function applySuggestion(sugg: GuidedSuggestion) {
    // Remember which of the guided-path shortcuts the user picked so the
    // chatbot's userContext can say "user is on the Deep-freeze path".
    pickedSuggestionLabel.value = sugg.label
    const result = sugg.apply({
      store,
      push: (path: string) => router.push(path),
      markCategoryDefaultsApplied: (slug: string) => {
        appliedDefaultsFor.value.add(slug)
      }
    })
    // Suggestions that returned `true` want us to auto-advance. Suggestions
    // that navigate to another route will re-trigger the route watcher, which
    // resets stepIndex; the auto-advance is a no-op in that case.
    if (result !== false) advance()
  }

  function dismiss() {
    if (activeFlow.value) {
      dismissedFlowIds.value.add(`${route.path}::${activeFlow.value.id}`)
      activeFlow.value = null
      targetEl.value = null
    }
    // Wenn der Nutzer einen Home-Card-Flow abbricht, den Entry-Marker
    // freigeben, damit ein neuer Card-Klick den Flow wieder aktivieren kann.
    pickedEntryId.value = null
  }

  /**
   * setEntry — vom Home-Karten-Klick aufgerufen. Räumt vorherigen Flow auf
   * (dismiss löscht dessen dismissed-Cache NICHT — okay, Flows sind nach id
   * unterschieden), setzt die Entry-ID und triggert damit den Match-Watcher.
   */
  function setEntry(entryId: string) {
    // Dismissed-Set nicht anfassen — wir wollen genau diesen Flow neu starten.
    dismissedFlowIds.value.clear()
    stepIndex.value = 0
    pickedSuggestionLabel.value = null
    pickedEntryId.value = entryId
  }

  function reset() {
    dismissedFlowIds.value.clear()
    stepIndex.value = 0
    pickedSuggestionLabel.value = null
    if (flags.isOn('guided_pass')) {
      const dynFlows = entryFlowsState.flows.value
      const dyn = dynFlows.find(f => f.match(route, store, homeTab.value, pickedEntryId.value))
      const next = dyn || findFlowForRoute(route, store, homeTab.value, pickedEntryId.value)
      activeFlow.value = next
      resolveTarget(next?.steps[0]?.targetLearnId)
    }
  }

  /** Re-resolve the target element (used after scroll or when a page
   *  hydrates asynchronously). */
  function refreshTarget() {
    resolveTarget(currentStep.value?.targetLearnId)
  }

  return {
    activeFlow: computed(() => activeFlow.value),
    currentStep,
    stepIndex: computed(() => stepIndex.value),
    targetEl: computed(() => targetEl.value),
    isFinished,
    pickedSuggestionLabel: computed(() => pickedSuggestionLabel.value),
    pickedEntryId: computed(() => pickedEntryId.value),
    advance,
    applySuggestion,
    dismiss,
    reset,
    refreshTarget,
    setEntry
  }
}
