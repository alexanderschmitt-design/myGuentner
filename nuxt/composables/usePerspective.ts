/**
 * usePerspective — Convenience-Composable um die aktive 3-Ebenen-Perspektive
 * aus dem Pinia-Store zu lesen/setzen. Hält die Page-Components frei davon,
 * den Store direkt zu importieren.
 */

import type { Perspective } from '~/stores/configuration';

export function usePerspective() {
  const store = useConfigStore();
  const active = computed<Perspective>(() => store.activePerspective);

  const labels: Record<Perspective, string> = {
    technical:   'Technical',
    application: 'Application',
    location:    'Location'
  };

  function set(p: Perspective) { store.setPerspective(p); }
  function isActive(p: Perspective) { return store.activePerspective === p; }

  return { active, labels, set, isActive };
}
