/**
 * useCategoryDefaultsGuard — session-scoped set of category slugs that have
 * already had their `paramDefaults` applied on the Thermodynamics page.
 *
 * Shared between:
 *   • `pages/mygpc/[catId]/thermodynamics.vue` — applies defaults on first
 *     visit unless the slug is already in the set.
 *   • `data/guidedFlows.ts` — pre-marks the slug so the guided preset (e.g.
 *     Cold storage: airInletTempC=+2) isn't overwritten by the more generic
 *     category default (Evaporator DX: airInletTempC=0) on the following
 *     page mount.
 *
 * Session-scoped via useState so a page refresh re-arms the defaults path.
 */

export function useCategoryDefaultsGuard() {
  return useState<Set<string>>('thermo:appliedDefaults', () => new Set())
}
