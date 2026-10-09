/**
 * useTemplateFlash — globaler „Template geladen!"-Effekt.
 *
 * Wird von TemplateFlashBanner.vue gerendert (mounted in layouts/default.vue).
 * Der Trigger kommt aus der Guided-Flow-Recommendation (ChatDock, nach
 * Template-Auswahl) oder theoretisch auch aus anderen Load-Pfaden.
 *
 * Auto-hide nach `AUTO_HIDE_MS`. Manuelles Schließen via `dismiss()`.
 * Modul-scoped ref — kein useState (Banner läuft nur client-seitig).
 */

const AUTO_HIDE_MS = 8000          // Banner steht ~8s
const FIELD_HIGHLIGHT_MS = 3200    // Feld-Puls-Effekt läuft ~3.2s auf Wizard-Seiten

interface FlashState {
  templateName: string
  paramCount: number
  categoryTitle?: string
  shownAt: number
}

export interface TemplateGuidance {
  templateName: string
  categoryTitle: string
  paramCount: number
}

const flashRef = ref<FlashState | null>(null)
/** Pending guidance payload — consumed once by ChatDock when landing on
 *  thermodynamics after a template pick. Module-scoped so it survives
 *  route navigation without being stored in the router state. */
const pendingGuidanceRef = ref<TemplateGuidance | null>(null)
/** Signal-Counter — jeder Template-Load bumpt ihn. Wizard-Seiten
 *  watchen darauf und setzen kurzzeitig eine CSS-Klasse auf ihr
 *  Root-Element, die alle populierten Form-Felder pulsen lässt. */
const highlightSignalRef = ref(0)
const highlightActiveRef = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null
let highlightTimer: ReturnType<typeof setTimeout> | null = null

export function useTemplateFlash() {
  function trigger(payload: { templateName: string; paramCount: number; categoryTitle?: string }) {
    flashRef.value = {
      templateName: payload.templateName,
      paramCount: payload.paramCount,
      categoryTitle: payload.categoryTitle,
      shownAt: Date.now()
    }
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      flashRef.value = null
      hideTimer = null
    }, AUTO_HIDE_MS)

    // Store guidance payload — ChatDock picks this up on thermodynamics mount.
    pendingGuidanceRef.value = {
      templateName: payload.templateName,
      categoryTitle: payload.categoryTitle ?? '',
      paramCount: payload.paramCount
    }

    // Field-Highlight-Signal parallel bumpen — Wizard-Seiten reagieren.
    highlightSignalRef.value++
    highlightActiveRef.value = true
    if (highlightTimer) clearTimeout(highlightTimer)
    highlightTimer = setTimeout(() => {
      highlightActiveRef.value = false
      highlightTimer = null
    }, FIELD_HIGHLIGHT_MS)
  }

  function dismiss() {
    flashRef.value = null
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  }

  /** Consume the pending guidance once. Returns the payload and clears it. */
  function consumeGuidance(): TemplateGuidance | null {
    const g = pendingGuidanceRef.value
    pendingGuidanceRef.value = null
    return g
  }

  return {
    state: computed(() => flashRef.value),
    /** True während des ~3.2s Field-Highlight-Fensters nach einem Template-Load. */
    highlightActive: computed(() => highlightActiveRef.value),
    /** Counter — Wizard-Seiten können darauf watchen um bei jedem Load
     *  einen frischen Puls-Effekt auszulösen (auch wenn active gerade schon true ist). */
    highlightSignal: computed(() => highlightSignalRef.value),
    trigger,
    dismiss,
    consumeGuidance
  }
}
