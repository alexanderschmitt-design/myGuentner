/**
 * useSeriesContext — geteilter State für die zuletzt angewählte
 * Produktserie und -variante in Unit Selection.
 *
 * Wenn der User eine Serie anklickt, ruft unit-selection.vue
 * `announceSeriesSelected(seriesId)` auf. ChatDock.vue watchet
 * `activeSeriesMeta` und `activeVariantMeta` und zeigt proaktive Bubbles.
 *
 * Series-ID-Format: 'gamc-cx' → seriesCode 'GAMC', variantKey 'GAMC_CX'.
 */

export interface SeriesDocLink {
  id: string
  name: string
  type: string
  dmsId: string | null
  source: string
}

export interface SeriesMeta {
  seriesCode: string
  introText: string
  docs: SeriesDocLink[]
  templates: { id: string; name: string }[]
}

export interface VariantMeta {
  seriesVariant: string
  description: string
  docs: SeriesDocLink[]
  templates: { id: string; name: string }[]
}

export function useSeriesContext() {
  const activeSeriesCode = useState<string | null>('_seriesCtxCode', () => null)
  const activeSeriesMeta = useState<SeriesMeta | null>('_seriesCtxMeta', () => null)
  const activeVariantKey = useState<string | null>('_seriesCtxVariantKey', () => null)
  const activeVariantMeta = useState<VariantMeta | null>('_seriesCtxVariantMeta', () => null)

  async function announceSeriesSelected(seriesId: string) {
    // seriesId z.B. 'gamc-cx' oder 'gamc'
    // Basiscode: 'gamc-cx' → 'GAMC'
    const baseCode = seriesId.split('-')[0].toUpperCase()
    // Varianten-Key: 'gamc-cx' → 'GAMC_CX'
    const variantKey = seriesId.toUpperCase().replace(/-/g, '_')
    // Nur fetchen wenn sich etwas ändert
    const seriesChanged = activeSeriesCode.value !== baseCode
    const variantChanged = activeVariantKey.value !== variantKey

    if (!seriesChanged && !variantChanged) return

    if (seriesChanged) {
      activeSeriesCode.value = baseCode
      activeSeriesMeta.value = null
    }
    if (variantChanged) {
      activeVariantKey.value = variantKey
      activeVariantMeta.value = null
    }

    // Parallel fetchen: series-level + variant-level
    await Promise.allSettled([
      seriesChanged
        ? $fetch<{ ok: boolean; data: SeriesMeta | null }>(`/api/products/${baseCode}`)
            .then(res => { activeSeriesMeta.value = res.data ?? null })
            .catch(() => {})
        : Promise.resolve(),

      variantChanged
        ? $fetch<{ ok: boolean; data: VariantMeta | null }>(`/api/products/variants/${variantKey}`)
            .then(res => { activeVariantMeta.value = res.data ?? null })
            .catch(() => {})
        : Promise.resolve()
    ])
  }

  return {
    activeSeriesCode,
    activeSeriesMeta,
    activeVariantKey,
    activeVariantMeta,
    announceSeriesSelected
  }
}
