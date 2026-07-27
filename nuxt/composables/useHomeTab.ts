/**
 * useHomeTab — shared state for the landing-page tab bar.
 *
 * The <index.vue> tab bar owns the switch UI; the guided-flow selector
 * reads this state to decide which chatbot script to run when the user
 * is sitting on '/'. Kept in a Nuxt useState so SSR + client stay in
 * sync across the page and the chat drawer.
 */

export type HomeTabId = 'unit' | 'coil' | 'application' | 'api-services' | 'mygps'

export function useHomeTab() {
  return useState<HomeTabId>('home-tab', () => 'unit')
}
