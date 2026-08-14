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

  // Install once per module. `flow` and `stepIndex` are module-scoped, but the
  // watchers reference the current router — safe because Nuxt gives every
  // browser tab a single router instance.
  if (!installed && typeof window !== 'undefined') {
    installed = true

    watch(
      [() => route.path, () => store.currentCategory, () => flags.isOn('guided_pass'), () => homeTab.value],
      ([path]) => {
        // When flag is off, blank everything so the overlay disappears.
        if (!flags.isOn('guided_pass')) {
          activeFlow.value = null
          targetEl.value = null
          return
        }
        const next = findFlowForRoute(route, store, homeTab.value)
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
          stepIndex.value = 0
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
  }

  function reset() {
    dismissedFlowIds.value.clear()
    stepIndex.value = 0
    pickedSuggestionLabel.value = null
    if (flags.isOn('guided_pass')) {
      const next = findFlowForRoute(route, store, homeTab.value)
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
    advance,
    applySuggestion,
    dismiss,
    reset,
    refreshTarget
  }
}
