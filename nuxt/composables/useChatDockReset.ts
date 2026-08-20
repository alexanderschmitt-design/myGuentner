/**
 * useChatDockReset — App-weiter Reset-Signal für den ChatDock.
 *
 * Verwendung: Jeder Klick auf einen Navigations-Wechsel (Tabs auf Home,
 * Teaser-Cards, ChatDock-Presets, Nav-Links) darf `reset()` rufen. Das
 * bumpt einen Counter, den die ChatDock-Komponente beobachtet und
 * dabei history + guided-flow-Dismiss-Cache + stream leert. Danach
 * matcht der Guided-Flow-Watcher zur neuen Route automatisch neu und
 * injiziert die erste Frage — der User sieht wieder das Greeting
 * gefolgt vom passenden Chatbot-Flow-Step.
 *
 * Modul-scoped ref: klein und client-only. Kein useState, weil kein
 * Server-Payload nötig ist und der Reset nie SSR relevant sein wird.
 */

const signalRef = ref(0)

export function useChatDockReset() {
  function reset() {
    signalRef.value++
  }
  return {
    signal: computed(() => signalRef.value),
    reset
  }
}
