/**
 * useChatDockLayout — Overlay- vs. Push-Modus für die ChatDock.
 *
 *  - overlay (default): Drawer schwebt über dem Content mit box-shadow
 *  - push:              Main-Content wird um die Drawer-Breite gepaddet,
 *                       Drawer sitzt neben dem Content
 *
 * Der Modus wird pro Browser in localStorage persistiert. Shared zwischen
 * ChatDock.vue (Toggle-Button im Header) und layouts/default.vue (setzt die
 * .with-chat-push-Klasse auf .site-main).
 */

export type ChatDockLayout = 'overlay' | 'push'
const STORAGE_KEY = 'gpc:chat-dock-layout'

export function useChatDockLayout() {
  const state = useState<ChatDockLayout>('chat-dock-layout', () => 'overlay')

  // Hydrate from localStorage on first client access.
  if (import.meta.client && state.value === 'overlay') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw === 'push' || raw === 'overlay') state.value = raw
    } catch { /* localStorage disabled — Default bleibt overlay */ }
  }

  function set(mode: ChatDockLayout) {
    state.value = mode
    if (import.meta.client) {
      try { window.localStorage.setItem(STORAGE_KEY, mode) } catch { /* ignore */ }
    }
  }

  function toggle() {
    set(state.value === 'overlay' ? 'push' : 'overlay')
  }

  return { layout: state, set, toggle }
}
