/**
 * useChoiceIcon — einzige Wahrheitsquelle für Icon-Auflösung.
 *
 * Kuratierte Icons (kein Präfix) → inline SVG via Registry.
 * Custom-Icons (Präfix "custom:") → <img src> aus der DB-basierten Liste.
 *
 * Verwendet von ConfigQuestionCard (Chat-Laufzeit) und GuidedFlowEditor
 * (Admin-Vorschau), damit beide identisch rendern.
 */

import { computed } from 'vue'
import { findChoiceIcon, FALLBACK_SVG_PATH } from '~/data/choiceIcons'

export interface CustomIconEntry {
  icon_key: string
  label: string
  group_label: string
  public_url: string
  mime_type: string
}

export type ResolvedIcon =
  | { type: 'svg'; svgPath: string }
  | { type: 'img'; url: string }

export function useChoiceIcon() {
  const { data, refresh } = useAsyncData(
    'custom-icons',
    () => $fetch<{ ok: boolean; icons: CustomIconEntry[] }>('/api/custom-icons'),
    { default: () => ({ ok: false, icons: [] as CustomIconEntry[] }) }
  )

  const customIcons = computed<CustomIconEntry[]>(() => data.value?.icons ?? [])

  function resolveChoiceIcon(key?: string): ResolvedIcon {
    const fallback: ResolvedIcon = { type: 'svg', svgPath: FALLBACK_SVG_PATH }
    if (!key) return fallback

    if (key.startsWith('custom:')) {
      const ci = customIcons.value.find(c => c.icon_key === key)
      return ci ? { type: 'img', url: ci.public_url } : fallback
    }

    const found = findChoiceIcon(key)
    return found ? { type: 'svg', svgPath: found.svgPath } : fallback
  }

  return { resolveChoiceIcon, customIcons, refreshCustomIcons: refresh }
}
