/**
 * useChatDockMode — which sub-view the ChatDock drawer is showing.
 *
 *   'chat'  — Günther product chat (RAG + Guided Pass)
 *   'learn' — Note editor for elements picked on the page. Uses
 *             LearnModeOverlay for the hover-outline + click-to-pick,
 *             but the edit form itself lives inside the drawer body.
 *
 * Shared between ChatDock (owns the tabs + body) and LearnModeOverlay
 * (activates only when mode === 'learn' AND the drawer is open).
 */

export type ChatDockMode = 'chat' | 'learn'

export function useChatDockMode() {
  return useState<ChatDockMode>('chat-dock-mode', () => 'chat')
}
