/**
 * useGuidedEntryFlows — Runtime-Loader für die admin-editierten Q&A-Flows.
 *
 * Ablauf beim App-Start:
 *   1. `ensureLoaded()` wird aus `useGuidedFlow` heraus getriggert.
 *   2. Der Loader holt einmalig `GET /api/guided-flows` (public).
 *   3. Bei erfolgreicher DB-Response werden die Rows via `dbRowToConfig`
 *      in EntryFlowConfig übersetzt und über `buildEntryFlow` zu
 *      GuidedFlow-Objekten gebaut.
 *   4. Bei DB-Ausfall / leerer Response fallen wir auf die Code-Configs
 *      aus `nuxt/data/homeEntryFlows.ts` (HOME_ENTRY_FLOWS) zurück.
 *
 * Speicher-Design: der State enthält `GuidedFlow`-Objekte MIT `match(...)`-
 * und ggf. `target(store)`-Funktionen — die sind NICHT devalue-serialisierbar,
 * deshalb kein `useState` (das würde die SSR→Client-Hydration killen).
 * Statt dessen ein modul-scoped `ref` das nur im Browser-Kontext existiert.
 * Auf Server-Seite gibt der Composable ein statisches Code-Fallback-Array
 * zurück — kein Home-Klick passiert während SSR.
 */

import type { GuidedFlow } from '~/data/guidedFlows'
import {
  buildEntryFlow,
  HOME_ENTRY_FLOWS,
  HOME_ENTRY_FLOW_CONFIGS,
  type EntryFlowConfig,
  type EntryQuestion
} from '~/data/homeEntryFlows'

interface DbFlow {
  entry_id: string
  tab_id: 'application' | 'refrigerant'
  title: string
  questions: EntryQuestion[]
  fixed_params: Record<string, unknown>
  target_kind: 'static' | 'refrigerant-map'
  target_cat_id: number | null
  target_slug: string | null
  enabled: boolean
}

function dbRowToConfig(row: DbFlow): EntryFlowConfig | null {
  if (row.target_kind === 'static') {
    if (row.target_cat_id == null || !row.target_slug) return null
    return {
      entryId: row.entry_id,
      tabId: row.tab_id,
      title: row.title,
      questions: row.questions,
      fixedParams: row.fixed_params,
      target: { catId: row.target_cat_id, slug: row.target_slug }
    }
  }
  // refrigerant-map: Code-Resolver derselben entryId wiederverwenden.
  const codeConfig = HOME_ENTRY_FLOW_CONFIGS.find(c => c.entryId === row.entry_id)
  if (!codeConfig || typeof codeConfig.target !== 'function') return null
  return {
    entryId: row.entry_id,
    tabId: row.tab_id,
    title: row.title,
    questions: row.questions,
    fixedParams: row.fixed_params,
    target: codeConfig.target
  }
}

// ============================================================================
// Modul-scoped state — läuft nur im Browser (weil useGuidedFlow den Watcher
// hinter `typeof window !== 'undefined'` gated installiert). Kein useState =
// keine SSR-Serialisierung = keine devalue-Function-Fehler.
// ============================================================================

const flowsRef = ref<GuidedFlow[]>(HOME_ENTRY_FLOWS as GuidedFlow[])
const loadedRef = ref(false)
let inflight: Promise<void> | null = null

export function useGuidedEntryFlows() {
  async function ensureLoaded(): Promise<void> {
    if (loadedRef.value) return
    if (typeof window === 'undefined') return  // Server-Render: Code-Fallback bleibt
    if (inflight) return inflight              // Concurrent-Call-Deduplication

    inflight = (async () => {
      try {
        const res = await $fetch<{ ok: boolean; flows: DbFlow[] }>('/api/guided-flows')
        if (res.ok && Array.isArray(res.flows) && res.flows.length > 0) {
          const dbConfigs = res.flows
            .map(dbRowToConfig)
            .filter((c): c is EntryFlowConfig => c !== null)
          const dbEntryIds = new Set(dbConfigs.map(c => c.entryId))
          const dbFlows = dbConfigs.map(buildEntryFlow)

          // Merge-Regel: DB gewinnt bei gleicher entryId. Code-Fallback bleibt
          // für entryIds die die DB (noch) nicht kennt.
          const codeFallback = HOME_ENTRY_FLOWS.filter((flow) => {
            const entryId = flow.id.replace(/^home-entry-/, '')
            return !dbEntryIds.has(entryId)
          })
          flowsRef.value = [...dbFlows, ...codeFallback] as GuidedFlow[]
        } else {
          flowsRef.value = HOME_ENTRY_FLOWS as GuidedFlow[]
        }
      } catch (err: any) {
        console.warn('[useGuidedEntryFlows] fetch failed, using code fallback:', err?.message || err)
        flowsRef.value = HOME_ENTRY_FLOWS as GuidedFlow[]
      } finally {
        loadedRef.value = true
        inflight = null
      }
    })()

    return inflight
  }

  /** Nach einem Admin-Save aus /admin/guided-flows aufrufen — cache leeren
   *  und sofort re-loaden. */
  async function invalidate(): Promise<void> {
    loadedRef.value = false
    await ensureLoaded()
  }

  return {
    flows: computed(() => flowsRef.value),
    loaded: computed(() => loadedRef.value),
    ensureLoaded,
    invalidate
  }
}
