/**
 * useChatDockPreload — cross-component channel to inject a pre-formulated
 * question into the ChatDock and auto-send it.
 *
 * Set `useChatDockPreload().value = "..."` and open the dock via
 * `useChatDockState().value = true`. ChatDock.vue watches this ref and,
 * once the drawer is visible, drops the string into the textarea and
 * submits it, then clears the ref. This is the plumbing behind the
 * "Frag Günther" fallback buttons on the Results and Datasheet pages.
 */

export function useChatDockPreload() {
  return useState<string | null>('chat-dock-preload', () => null)
}
