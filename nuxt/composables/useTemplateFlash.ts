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

const AUTO_HIDE_MS = 5500

interface FlashState {
  templateName: string
  paramCount: number
  categoryTitle?: string
  shownAt: number
}

const flashRef = ref<FlashState | null>(null)
let hideTimer: ReturnType<typeof setTimeout> | null = null

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
  }

  function dismiss() {
    flashRef.value = null
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  }

  return {
    state: computed(() => flashRef.value),
    trigger,
    dismiss
  }
}
