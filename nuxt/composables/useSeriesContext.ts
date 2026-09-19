/**
 * useSeriesContext — geteilter State für die zuletzt angewählte
 * Produktserie in Unit Selection.
 *
 * Wenn der User eine Serie anklickt, ruft unit-selection.vue
 * `announceSeriesSelected(seriesId)` auf. ChatDock.vue watchet
 * `activeSeriesMeta` und zeigt eine proaktive Bubble.
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

export function useSeriesContext() {
  const activeSeriesCode = useState<string | null>('_seriesCtxCode', () => null)
  const activeSeriesMeta = useState<SeriesMeta | null>('_seriesCtxMeta', () => null)

  async function announceSeriesSelected(seriesId: string) {
    // Basiscode ableiten: 'gamc-cx' → 'GAMC'
    const baseCode = seriesId.split('-')[0].toUpperCase()
    if (activeSeriesCode.value === baseCode) return

    activeSeriesCode.value = baseCode
    activeSeriesMeta.value = null

    try {
      const res = await $fetch<{ ok: boolean; data: SeriesMeta | null }>(`/api/products/${baseCode}`)
      activeSeriesMeta.value = res.data ?? null
    } catch {
      // Serie nicht gepflegt oder nicht eingeloggt — kein Fehler
    }
  }

  return {
    activeSeriesCode,
    activeSeriesMeta,
    announceSeriesSelected
  }
}
