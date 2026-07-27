/**
 * useChatDockState — global open/closed state for the ChatDock drawer.
 *
 * Shared between the ChatDock component (which owns the UI) and the
 * default layout (which shifts .site-main left to keep the drawer next
 * to the content rather than on top of it, Jira-Rovo style).
 */

export function useChatDockState() {
  return useState<boolean>('chat-dock-open', () => false)
}
