/**
 * Guided Flows — scripted chatbot passes for the Category picker and
 * Thermodynamics steps.
 *
 * Each flow declares a `match(route, store)` predicate so the router can
 * pick the right one, and an ordered list of steps. A step carries an
 * assistant message (Markdown), an optional `targetLearnId` that the
 * GuidedHighlight overlay uses to pulse a form field, and 0..n
 * `suggestions` rendered as buttons under the assistant turn. Clicking a
 * suggestion runs `apply(ctx)` — the composable/store shape is passed in
 * as ctx so the flow file itself stays free of framework imports (Nuxt
 * auto-imports don't cover *.ts data files reliably).
 *
 * The flows below cover:
 *   • '/' (Home) — one intro turn + Kühlzweck suggestions that route into
 *     /mygpc/<catId>/thermodynamics with a preset applied
 *   • '/mygpc/<catId>/thermodynamics' — refrigerant AND liquid variants;
 *     4 steps each (capacity, medium, temperatures, air)
 */

import type { RouteLocationNormalized } from 'vue-router'
import type { useConfigStore } from '~/stores/configuration'
import type { HomeTabId } from '~/composables/useHomeTab'
import { HOME_ENTRY_FLOWS } from './homeEntryFlows'

type ConfigStore = ReturnType<typeof useConfigStore>

/** Router-agnostic ctx handed to each suggestion. Kept small on purpose. */
export interface GuidedContext {
  store: ConfigStore
  push: (path: string) => void
  /**
   * Mark a category slug as "defaults already applied" so
   * `thermodynamics.vue`'s watcher doesn't clobber richer presets we just
   * wrote to the store. Injected from useGuidedFlow — kept out of the flow
   * data itself to avoid coupling to composable internals.
   */
  markCategoryDefaultsApplied?: (slug: string) => void
}

export interface GuidedSuggestion {
  /** Short button label (2-4 words) */
  readonly label: string
  /** Optional secondary line under the label */
  readonly detail?: string
  /** Mutate store / navigate. Return true to auto-advance to the next step */
  readonly apply: (ctx: GuidedContext) => boolean | void
}

export interface GuidedStep {
  readonly id: string
  /** Markdown-safe assistant turn text. Kept short — one paragraph max. */
  readonly message: string
  /** data-learn-id of the form element this step is about (optional) */
  readonly targetLearnId?: string
  /** 0..n suggestion buttons */
  readonly suggestions?: readonly GuidedSuggestion[]
  /** Show a "Weiter" button when there are no suggestions (default: yes) */
  readonly showAdvance?: boolean
  /**
   * Signalisiert, dass dieser Step bereits beantwortet ist (durch Guided-Q&A
   * auf der Home-Karte, ein zuvor geladenes Template, o.ä.). Wenn beim
   * Aktivieren eines Flows die ersten Steps `hasAnswer(store)===true` liefern,
   * springt der Cursor gleich zum ersten unbeantworteten Step — der User
   * wird nicht nochmal gefragt was er schon geklärt hat.
   *
   * Steps ohne `hasAnswer` gelten als "unbeantwortet" (sicherer Default).
   */
  readonly hasAnswer?: (store: ConfigStore) => boolean
  /**
   * Special-step-Rendering. Wenn gesetzt, rendert die ChatDock den Step
   * mit einer alternativen Karte:
   *   - `recommendations` → Template-Empfehlungs-Karte mit bis zu 3
   *     Templates aus der DB, gematched gegen die aktuelle Store-Config.
   */
  readonly kind?: 'recommendations'
  /**
   * Context für Special-Steps. Bei kind='recommendations' liefert
   * `resolveTarget(store)` die Ziel-Kategorie (catId + slug), gegen die
   * Templates gefiltert werden. `finalize(ctx)` ist der Fallback wenn
   * User keinen Vorschlag annimmt (Standard-Navigation ohne Template).
   */
  readonly recommendationCtx?: {
    resolveTarget: (store: ConfigStore) => { catId: number; slug: string }
    finalize: (ctx: GuidedContext) => void
  }
}

export interface GuidedFlow {
  readonly id: string
  /** Human label — surfaced in the drawer header when a flow is active */
  readonly title: string
  /**
   * Predicate: does this flow apply to the current route/store/tab state?
   * `entryId` reflects the last Home-Karten-Klick (via useGuidedFlow.setEntry())
   * — entry-driven Q&A-Flows nutzen den, um sich nur bei genau ihrer Karte zu
   * aktivieren.
   */
  readonly match: (
    route: RouteLocationNormalized,
    store: ConfigStore,
    homeTab: HomeTabId,
    entryId: string | null
  ) => boolean
  readonly steps: readonly GuidedStep[]
}

// ============================================================================
// Home — Unit-tab category picker (mirrors the 6 unit cards)
// ============================================================================

const homeUnitFlow: GuidedFlow = {
  id: 'home-unit',
  title: 'Product Category Selection',
  match: (route, _store, homeTab) => route.path === '/' && homeTab === 'unit',
  steps: [
    {
      id: 'home-unit-intro',
      message:
        'Welcome! I can help you find the right **product category**.\n\n' +
        'Pick one of the six unit categories from the card grid on the left — ' +
        'I\'ll take you straight to the thermodynamics configuration.',
      targetLearnId: 'home-unit-grid',
      suggestions: [
        {
          label: 'Evaporator DX',
          detail: 'Direct-expansion evaporator, refrigerant side',
          apply: (ctx) => {
            ctx.store.setProductSection(1)
            ctx.store.currentCategory = 'evaporator-dx'
            ctx.push('/mygpc/0/thermodynamics')
            return true
          }
        },
        {
          label: 'Evaporator Pump',
          detail: 'Pump-fed, flooded operation',
          apply: (ctx) => {
            ctx.store.setProductSection(1)
            ctx.store.currentCategory = 'evaporator-pump'
            ctx.push('/mygpc/1/thermodynamics')
            return true
          }
        },
        {
          label: 'Air cooler',
          detail: 'Air cooler, coolant loop',
          apply: (ctx) => {
            ctx.store.setProductSection(1)
            ctx.store.currentCategory = 'air-cooler'
            ctx.push('/mygpc/2/thermodynamics')
            return true
          }
        },
        {
          label: 'Dry cooler',
          detail: 'Dry cooler / free cooling',
          apply: (ctx) => {
            ctx.store.setProductSection(1)
            ctx.store.currentCategory = 'dry-cooler'
            ctx.push('/mygpc/4/thermodynamics')
            return true
          }
        },
        {
          label: 'Condenser',
          detail: 'Air-cooled condenser',
          apply: (ctx) => {
            ctx.store.setProductSection(1)
            ctx.store.currentCategory = 'condenser'
            ctx.push('/mygpc/3/thermodynamics')
            return true
          }
        },
        {
          label: 'Gas cooler',
          detail: 'CO₂ gas cooler, R744',
          apply: (ctx) => {
            ctx.store.setProductSection(1)
            ctx.store.currentCategory = 'gas-cooler'
            ctx.push('/mygpc/10/thermodynamics')
            return true
          }
        }
      ]
    }
  ]
}

// ============================================================================
// Home — Application-tab picker (Kühlzweck-driven Startwerte)
// ============================================================================

const homeApplicationFlow: GuidedFlow = {
  id: 'home-application',
  title: 'Selection by Application',
  match: (route, _store, homeTab) => route.path === '/' && homeTab === 'application',
  steps: [
    {
      id: 'home-application-intro',
      message:
        'Welcome! I can help you find the right product category.\n\n' +
        'What is your **application**? Pick a typical cooling purpose below — ' +
        'I\'ll set matching start values and take you straight to the thermodynamics configuration.',
      targetLearnId: 'home-unit-grid',
      suggestions: [
        {
          label: 'Cold storage (0…+5 °C)',
          detail: 'Evaporator DX, R448A, 10 kW',
          apply: (ctx) => {
            const patch = {
              coolingCapacityKw: 10,
              refrigerant: 'R448A',
              evaporatingTempC: -8,
              airInletTempC: 2,
              coolingPurpose: 'cold-storage'
            } as const
            ctx.store.updateParameters(patch)
            ctx.store.markAnswered(Object.keys(patch))
            ctx.store.setProductSection(1)
            ctx.store.currentCategory = 'evaporator-dx'
            ctx.markCategoryDefaultsApplied?.('evaporator-dx')
            ctx.push('/mygpc/0/thermodynamics')
            return true
          }
        },
        {
          label: 'Deep freeze (-18…-35 °C)',
          detail: 'Evaporator DX, R744, 25 kW',
          apply: (ctx) => {
            const patch = {
              coolingCapacityKw: 25,
              refrigerant: 'R744',
              evaporatingTempC: -35,
              airInletTempC: -25,
              coolingPurpose: 'deep-freeze'
            } as const
            ctx.store.updateParameters(patch)
            ctx.store.markAnswered(Object.keys(patch))
            ctx.store.setProductSection(1)
            ctx.store.currentCategory = 'evaporator-dx'
            ctx.markCategoryDefaultsApplied?.('evaporator-dx')
            ctx.push('/mygpc/0/thermodynamics')
            return true
          }
        },
        {
          label: 'Air conditioning / Chiller',
          detail: 'Air cooler coolant, glycol 34%, 5 kW',
          apply: (ctx) => {
            const patch = {
              coolingCapacityKw: 5,
              glycolType: 'ethylene',
              concentrationVolPct: 34,
              inletTempC: 12,
              outletTempC: 6,
              airInletTempC: 25,
              coolingPurpose: 'air-conditioning'
            } as const
            ctx.store.updateParameters(patch)
            ctx.store.markAnswered(Object.keys(patch))
            ctx.store.setProductSection(1)
            ctx.store.currentCategory = 'air-cooler'
            ctx.markCategoryDefaultsApplied?.('air-cooler')
            ctx.push('/mygpc/2/thermodynamics')
            return true
          }
        },
        {
          label: 'Condensing / Heat rejection',
          detail: 'Condenser, R448A, 100 kW',
          apply: (ctx) => {
            const patch = {
              coolingCapacityKw: 100,
              refrigerant: 'R448A',
              condensingTempC: 45,
              airInletTempC: 32,
              coolingPurpose: 'condensing'
            } as const
            ctx.store.updateParameters(patch)
            ctx.store.markAnswered(Object.keys(patch))
            ctx.store.setProductSection(1)
            ctx.store.currentCategory = 'condenser'
            ctx.markCategoryDefaultsApplied?.('condenser')
            ctx.push('/mygpc/3/thermodynamics')
            return true
          }
        },
        {
          label: 'CO₂ Gas Cooler',
          detail: 'Gas cooler, R744, 180 kW',
          apply: (ctx) => {
            const patch = {
              coolingCapacityKw: 180,
              refrigerant: 'R744',
              condensingTempC: 45,
              airInletTempC: 32,
              coolingPurpose: 'condensing'
            } as const
            ctx.store.updateParameters(patch)
            ctx.store.markAnswered(Object.keys(patch))
            ctx.store.setProductSection(1)
            ctx.store.currentCategory = 'gas-cooler'
            ctx.markCategoryDefaultsApplied?.('gas-cooler')
            ctx.push('/mygpc/10/thermodynamics')
            return true
          }
        }
      ]
    }
  ]
}

// ============================================================================
// Home — Entry-driven Q&A: Application + Refrigerant Karten
// ----------------------------------------------------------------------------
// Die pro-Karte Q&A-Flows werden aus deklarativen Configs generiert. Zum
// Anpassen der Fragen/Antworten: nuxt/data/homeEntryFlows.ts editieren.
// ============================================================================

// (import at top of file — siehe Registry unten)

// ============================================================================
// Thermodynamics — refrigerant side (DX / Pump / Condenser / Subcooler / GC)
// ============================================================================

const thermoRefrigerantFlow: GuidedFlow = {
  id: 'thermo-refrigerant',
  title: 'Thermodynamics: Refrigerant Side',
  match: (route, store) => {
    if (!/^\/mygpc\/\d+\/thermodynamics$/.test(route.path)) return false
    // mediumType lives on the resolved category; infer from currentCategory slug
    return !isLiquidCategory(store.currentCategory)
  },
  steps: [
    {
      id: 'r-capacity',
      message:
        'Let\'s start with **capacity**. What is your design target?\n\n' +
        'The suggestions are typical starting points — you can fine-tune the value in the field afterwards.',
      targetLearnId: 'thermo-capacity',
      hasAnswer: (store) => store.hasAnsweredParam('coolingCapacityKw'),
      suggestions: [
        { label: '10 kW', detail: 'Small cold room',            apply: (ctx) => { ctx.store.updateParameters({ coolingCapacityKw: 10 });  ctx.store.markAnswered('coolingCapacityKw'); return true } },
        { label: '25 kW', detail: 'Standard cold room',         apply: (ctx) => { ctx.store.updateParameters({ coolingCapacityKw: 25 });  ctx.store.markAnswered('coolingCapacityKw'); return true } },
        { label: '50 kW', detail: 'Large cold room / freezer',  apply: (ctx) => { ctx.store.updateParameters({ coolingCapacityKw: 50 });  ctx.store.markAnswered('coolingCapacityKw'); return true } },
        { label: '100 kW', detail: 'Industrial process',        apply: (ctx) => { ctx.store.updateParameters({ coolingCapacityKw: 100 }); ctx.store.markAnswered('coolingCapacityKw'); return true } }
      ]
    },
    {
      id: 'r-refrigerant',
      message:
        'Now the **refrigerant**. The three natural refrigerants below are F-gas compliant and future-proof; R448A is the common HFO blend for retrofit applications.',
      targetLearnId: 'thermo-refrigerant',
      hasAnswer: (store) => store.hasAnsweredParam('refrigerant'),
      suggestions: [
        { label: 'R744 (CO₂)',    detail: 'Natural, GWP 1',           apply: (ctx) => { ctx.store.updateParameters({ refrigerant: 'R744' });  ctx.store.markAnswered('refrigerant'); return true } },
        { label: 'R717 (NH₃)',    detail: 'Natural, industrial',      apply: (ctx) => { ctx.store.updateParameters({ refrigerant: 'R717' });  ctx.store.markAnswered('refrigerant'); return true } },
        { label: 'R290 (propane)', detail: 'Natural, small charge',   apply: (ctx) => { ctx.store.updateParameters({ refrigerant: 'R290' });  ctx.store.markAnswered('refrigerant'); return true } },
        { label: 'R448A',         detail: 'HFO blend, retrofit',      apply: (ctx) => { ctx.store.updateParameters({ refrigerant: 'R448A' }); ctx.store.markAnswered('refrigerant'); return true } }
      ]
    },
    {
      id: 'r-evap',
      message:
        'And the **evaporating temperature t₀**? Rule of thumb: about 6–10 K below the target room temperature; often more for deep freeze.',
      targetLearnId: 'thermo-evap-temp',
      hasAnswer: (store) => store.hasAnsweredParam('evaporatingTempC'),
      suggestions: [
        { label: '-8 °C',  detail: 'Cold room +2 °C',       apply: (ctx) => { ctx.store.updateParameters({ evaporatingTempC: -8 });  ctx.store.markAnswered('evaporatingTempC'); return true } },
        { label: '-25 °C', detail: 'Deep freeze -18 °C',    apply: (ctx) => { ctx.store.updateParameters({ evaporatingTempC: -25 }); ctx.store.markAnswered('evaporatingTempC'); return true } },
        { label: '-35 °C', detail: 'Blast freezer',         apply: (ctx) => { ctx.store.updateParameters({ evaporatingTempC: -35 }); ctx.store.markAnswered('evaporatingTempC'); return true } },
        { label: '+2 °C',  detail: 'Chiller / AC',          apply: (ctx) => { ctx.store.updateParameters({ evaporatingTempC: 2 });   ctx.store.markAnswered('evaporatingTempC'); return true } }
      ]
    },
    {
      id: 'r-air-inlet',
      message:
        'Finally the **air inlet temperature** at the evaporator. For a cold room this is the room temperature; for a condenser it\'s the ambient temperature at the installation site.',
      targetLearnId: 'thermo-air-inlet',
      hasAnswer: (store) => store.hasAnsweredParam('airInletTempC'),
      suggestions: [
        { label: '+2 °C',  detail: 'Cold room',              apply: (ctx) => { ctx.store.updateParameters({ airInletTempC: 2 });   ctx.store.markAnswered('airInletTempC'); return true } },
        { label: '-18 °C', detail: 'Deep freeze store',      apply: (ctx) => { ctx.store.updateParameters({ airInletTempC: -18 }); ctx.store.markAnswered('airInletTempC'); return true } },
        { label: '+25 °C', detail: 'Air conditioning',       apply: (ctx) => { ctx.store.updateParameters({ airInletTempC: 25 });  ctx.store.markAnswered('airInletTempC'); return true } },
        { label: '+32 °C', detail: 'Condenser, summer',      apply: (ctx) => { ctx.store.updateParameters({ airInletTempC: 32 });  ctx.store.markAnswered('airInletTempC'); return true } }
      ]
    },
    {
      id: 'r-done',
      message:
        '✅ Done — the four core parameters are set. Review the remaining fields ' +
        '(superheat, condensing temperature, humidity), then click **Next** at the top right ' +
        'to move on to unit selection. If anything is unclear, just ask me in the chat.',
      showAdvance: false
    }
  ]
}

// ============================================================================
// Thermodynamics — liquid side (Air cooler Coolant / Dry cooler / Oil cooler)
// ============================================================================

const thermoLiquidFlow: GuidedFlow = {
  id: 'thermo-liquid',
  title: 'Thermodynamics: Liquid Side',
  match: (route, store) => {
    if (!/^\/mygpc\/\d+\/thermodynamics$/.test(route.path)) return false
    return isLiquidCategory(store.currentCategory)
  },
  steps: [
    {
      id: 'l-capacity',
      message:
        'Let\'s start with **capacity**. For liquid coolers / dry coolers, the design usually sits in the 5–300 kW range.',
      targetLearnId: 'thermo-capacity',
      hasAnswer: (store) => store.hasAnsweredParam('coolingCapacityKw'),
      suggestions: [
        { label: '5 kW',   detail: 'Small AC application',        apply: (ctx) => { ctx.store.updateParameters({ coolingCapacityKw: 5 });   ctx.store.markAnswered('coolingCapacityKw'); return true } },
        { label: '50 kW',  detail: 'Mid-size chiller',            apply: (ctx) => { ctx.store.updateParameters({ coolingCapacityKw: 50 });  ctx.store.markAnswered('coolingCapacityKw'); return true } },
        { label: '150 kW', detail: 'Industrial / data center',    apply: (ctx) => { ctx.store.updateParameters({ coolingCapacityKw: 150 }); ctx.store.markAnswered('coolingCapacityKw'); return true } },
        { label: '300 kW', detail: 'Large dry cooler network',    apply: (ctx) => { ctx.store.updateParameters({ coolingCapacityKw: 300 }); ctx.store.markAnswered('coolingCapacityKw'); return true } }
      ]
    },
    {
      id: 'l-medium',
      message:
        'Which **medium** circulates in the loop? Glycol-water mixtures are the standard when freezing is a risk.',
      targetLearnId: 'thermo-medium',
      hasAnswer: (store) => store.hasAnsweredParam('glycolType'),
      suggestions: [
        { label: 'Ethylene glycol',   detail: 'Standard, cost-effective',   apply: (ctx) => { ctx.store.updateParameters({ glycolType: 'ethylene',  concentrationVolPct: 34 }); ctx.store.markAnswered(['glycolType', 'concentrationVolPct']); return true } },
        { label: 'Propylene glycol',  detail: 'Food-grade',                  apply: (ctx) => { ctx.store.updateParameters({ glycolType: 'propylene', concentrationVolPct: 34 }); ctx.store.markAnswered(['glycolType', 'concentrationVolPct']); return true } },
        { label: 'Water (pure)',      detail: 'No frost protection',         apply: (ctx) => { ctx.store.updateParameters({ glycolType: 'water',     concentrationVolPct: 0 });  ctx.store.markAnswered(['glycolType', 'concentrationVolPct']); return true } }
      ]
    },
    {
      id: 'l-inlet-outlet',
      message:
        'What are the **inlet and outlet temperatures** at the heat exchanger?',
      targetLearnId: 'thermo-inlet-temp',
      hasAnswer: (store) => store.hasAnsweredParam('inletTempC') && store.hasAnsweredParam('outletTempC'),
      suggestions: [
        { label: '12/6 °C',   detail: 'Chiller standard',        apply: (ctx) => { ctx.store.updateParameters({ inletTempC: 12, outletTempC: 6 });   ctx.store.markAnswered(['inletTempC', 'outletTempC']); return true } },
        { label: '45/40 °C',  detail: 'Dry cooler',              apply: (ctx) => { ctx.store.updateParameters({ inletTempC: 45, outletTempC: 40 });  ctx.store.markAnswered(['inletTempC', 'outletTempC']); return true } },
        { label: '-5/-10 °C', detail: 'Deep-freeze brine loop',  apply: (ctx) => { ctx.store.updateParameters({ inletTempC: -5, outletTempC: -10 }); ctx.store.markAnswered(['inletTempC', 'outletTempC']); return true } }
      ]
    },
    {
      id: 'l-air-inlet',
      message:
        'And the **air inlet temperature** — i.e. the ambient temperature at the installation site.',
      targetLearnId: 'thermo-air-inlet',
      hasAnswer: (store) => store.hasAnsweredParam('airInletTempC'),
      suggestions: [
        { label: '+25 °C', detail: 'Mild summer',             apply: (ctx) => { ctx.store.updateParameters({ airInletTempC: 25 }); ctx.store.markAnswered('airInletTempC'); return true } },
        { label: '+32 °C', detail: 'Summer design',           apply: (ctx) => { ctx.store.updateParameters({ airInletTempC: 32 }); ctx.store.markAnswered('airInletTempC'); return true } },
        { label: '+40 °C', detail: 'Hot climate site',        apply: (ctx) => { ctx.store.updateParameters({ airInletTempC: 40 }); ctx.store.markAnswered('airInletTempC'); return true } }
      ]
    },
    {
      id: 'l-done',
      message:
        '✅ Done. Review the remaining fields (concentration, altitude), then click **Next** to continue. If anything is unclear, just ask me in the chat.',
      showAdvance: false
    }
  ]
}

// ============================================================================
// Registry + helpers
// ============================================================================

const LIQUID_CATEGORY_SLUGS = new Set([
  'air-cooler',
  'dry-cooler',
  'oil-cooler'
])

function isLiquidCategory(slug: string | null | undefined): boolean {
  return !!slug && LIQUID_CATEGORY_SLUGS.has(slug)
}

/** Ordered registry — first match wins. Entry-driven Q&A-Flows (aus den
 *  homeEntryFlows-Configs generiert) stehen vor ihren generischen
 *  Geschwistern, damit ein gesetzter pickedEntryId immer gewinnt. */
export const GUIDED_FLOWS: readonly GuidedFlow[] = [
  ...HOME_ENTRY_FLOWS,
  homeUnitFlow,
  homeApplicationFlow,
  thermoLiquidFlow,
  thermoRefrigerantFlow
]

export function findFlowForRoute(
  route: RouteLocationNormalized,
  store: ConfigStore,
  homeTab: HomeTabId,
  entryId: string | null = null
): GuidedFlow | null {
  for (const flow of GUIDED_FLOWS) {
    if (flow.match(route, store, homeTab, entryId)) return flow
  }
  return null
}
