/**
 * Home Entry Flows — deklarative Q&A-Dialoge, die getriggert werden wenn
 * der User eine Karte im Home-Screen anklickt ("By Application" oder
 * "By Refrigerant").
 *
 * Neuen Kühlzweck oder ein neues Kältemittel abfragen? → Config-Zeile im
 * `HOME_ENTRY_FLOWS`-Array unten hinzufügen. Der `buildEntryFlow`-Factory
 * generiert daraus einen kompletten `GuidedFlow` mit Match-Predicate,
 * Message-Steps und Terminal-Navigation.
 *
 * **Frage hinzufügen** — Einfach ein weiteres Element in `questions: [...]`
 * einer Config. Jede Frage muss eine ID (für Debug/Analytics), einen
 * Message-Text (Markdown) und `choices[]` haben. Jeder Choice mergt
 * `params` in den Store.
 *
 * **Ziel-Kategorie** — Entweder statisch (`target: { catId, slug }`) oder
 * dynamisch aus den gesammelten Store-Werten resolvet
 * (`target: (store) => ({ catId, slug })`).
 */

import type { RouteLocationNormalized } from 'vue-router'
import type { useConfigStore } from '~/stores/configuration'
import type { HomeTabId } from '~/composables/useHomeTab'
import type { GuidedFlow, GuidedStep, GuidedContext } from './guidedFlows'

type ConfigStore = ReturnType<typeof useConfigStore>

// ============================================================================
// Types
// ============================================================================

export interface EntryChoice {
  /** Button label — kurz, klickbar (2-5 Wörter) */
  readonly label: string
  /** Optionale Sekundärzeile unter dem Label */
  readonly detail?: string
  /** Params die in den Store gemergt werden wenn diese Auswahl geklickt wird.
   *  Alle Felder aus `ConfigurationParameters` sind erlaubt (siehe stores/configuration.ts). */
  readonly params: Record<string, unknown>
}

export interface EntryQuestion {
  /** Stable ID für Debug + Analytics (z.B. 'capacity', 'refrigerant', 'building-type') */
  readonly id: string
  /** Frage-Text (Markdown erlaubt, kurz halten — 1-2 Sätze) */
  readonly message: string
  /** Optional: DOM-`data-learn-id` für den GuidedHighlight-Ring */
  readonly targetLearnId?: string
  /** Antwort-Buttons */
  readonly choices: readonly EntryChoice[]
}

export interface EntryFlowConfig {
  /** Muss exakt einem Card-`slug` in nuxt/pages/index.vue entsprechen */
  readonly entryId: string
  /** Auf welchem Home-Tab ist die Karte platziert */
  readonly tabId: HomeTabId
  /** Titel im ChatDock-Header wenn der Flow aktiv ist */
  readonly title: string
  /** Ordered Q&A steps */
  readonly questions: readonly EntryQuestion[]
  /**
   * Ziel-Kategorie und catId für die Wizard-Navigation am Ende.
   * - Statisch: `{ catId: 2, slug: 'air-cooler' }`
   * - Dynamisch: Funktion, die die im Verlauf gesammelten Store-Params liest
   *   und daraus die passende Kategorie ableitet (z.B. refrigerant × purpose)
   */
  readonly target:
    | { catId: number; slug: string }
    | ((store: ConfigStore) => { catId: number; slug: string })
  /** Optional: Zusätzliche fixe Params die am Terminal-Schritt gesetzt werden
   *  (z.B. `productSection: 1` oder ein constant `coolingPurpose`) */
  readonly fixedParams?: Record<string, unknown>
}

// ============================================================================
// Factory — Config → GuidedFlow
// ============================================================================

/** Terminaler Message-Text — wird als letzter Step angehängt. */
const TERMINAL_MESSAGE =
  '✅ Got it — I have everything I need. Taking you to the thermodynamics ' +
  'step with your answers pre-filled. You can fine-tune any field there.'

export function buildEntryFlow(config: EntryFlowConfig): GuidedFlow {
  // Alle Q&A-Schritte: Choice.apply mergt params in den Store und advanced.
  // Der letzte Q&A-Step advanced zur synthetischen `__recommendations__`-Karte
  // (statt direkt zu finalisieren) — die Karte fetcht dann passende Templates
  // aus der DB und lässt den User entweder eines anwenden oder Skip.
  const questionSteps: GuidedStep[] = config.questions.map((q) => ({
    id: `${config.entryId}-${q.id}`,
    message: q.message,
    targetLearnId: q.targetLearnId,
    suggestions: q.choices.map(c => ({
      label: c.label,
      detail: c.detail,
      apply: (ctx: GuidedContext) => {
        ctx.store.updateParameters(c.params as any)
        // fixedParams (z.B. constant coolingPurpose) werden HIER schon gesetzt,
        // damit die Recommendation-Karte gegen die vollständige Store-Config
        // filtern kann (Refrigerant-Map-Resolver braucht coolingPurpose).
        if (config.fixedParams) ctx.store.updateParameters(config.fixedParams as any)
        return true
      }
    }))
  }))

  const resolveTarget = (store: ConfigStore) =>
    typeof config.target === 'function' ? config.target(store) : config.target

  const recommendationStep: GuidedStep = {
    id: `${config.entryId}-__recommendations__`,
    message:
      'Based on your answers, we have identified the following products for you. ' +
      'Pick one to continue in the wizard with a pre-filled configuration, or ' +
      'skip to configure from scratch.',
    kind: 'recommendations',
    recommendationCtx: {
      resolveTarget,
      finalize: (ctx) => { finalize(ctx, config) }
    },
    showAdvance: false
  }

  return {
    id: `home-entry-${config.entryId}`,
    title: config.title,
    match: (route, _store, homeTab, entryId) =>
      route.path === '/' && homeTab === config.tabId && entryId === config.entryId,
    steps: [...questionSteps, recommendationStep]
  }
}

/** Terminal-Handler: fixedParams anwenden, Ziel-Kategorie auflösen, navigieren. */
function finalize(ctx: GuidedContext, config: EntryFlowConfig): boolean {
  if (config.fixedParams) {
    ctx.store.updateParameters(config.fixedParams as any)
  }
  const target = typeof config.target === 'function'
    ? config.target(ctx.store)
    : config.target
  ctx.store.setProductSection(1)
  ctx.store.currentCategory = target.slug
  ctx.markCategoryDefaultsApplied?.(target.slug)
  ctx.push(`/mygpc/${target.catId}/thermodynamics`)
  return true
}

// ============================================================================
// Refrigerant × Purpose → Category Lookup
// ----------------------------------------------------------------------------
// Wird von den refrigerant-getriebenen Flows genutzt, deren Ziel-Kategorie
// erst nach den Antworten feststeht.
// ============================================================================

interface RefrigerantTarget { slug: string; catId: number }

const REFRIGERANT_TARGET_MAP: Record<string, RefrigerantTarget> = {
  // R744 (CO₂)
  'R744/cold-storage':    { slug: 'evaporator-dx',   catId: 0 },
  'R744/deep-freeze':     { slug: 'evaporator-dx',   catId: 0 },
  'R744/industrial':      { slug: 'evaporator-pump', catId: 1 },
  'R744/condensing':      { slug: 'gas-cooler',      catId: 10 },
  'R744/air-conditioning':{ slug: 'evaporator-dx',   catId: 0 },
  // R717 (NH₃)
  'R717/cold-storage':    { slug: 'evaporator-pump', catId: 1 },
  'R717/deep-freeze':     { slug: 'evaporator-pump', catId: 1 },
  'R717/industrial':      { slug: 'evaporator-pump', catId: 1 },
  'R717/condensing':      { slug: 'condenser',       catId: 3 },
  // R290 (Propan)
  'R290/cold-storage':    { slug: 'evaporator-dx',   catId: 0 },
  'R290/deep-freeze':     { slug: 'evaporator-dx',   catId: 0 },
  'R290/industrial':      { slug: 'evaporator-dx',   catId: 0 },
  'R290/condensing':      { slug: 'condenser',       catId: 3 },
  // Synthetics (HFO/HFC-Blends)
  'R448A/cold-storage':   { slug: 'evaporator-dx',   catId: 0 },
  'R448A/deep-freeze':    { slug: 'evaporator-dx',   catId: 0 },
  'R448A/condensing':     { slug: 'condenser',       catId: 3 },
  'R448A/air-conditioning': { slug: 'air-cooler',    catId: 2 },
  'R1234ze/cold-storage': { slug: 'evaporator-dx',   catId: 0 },
  'R1234ze/air-conditioning': { slug: 'air-cooler',  catId: 2 },
  'R134a/cold-storage':   { slug: 'evaporator-dx',   catId: 0 },
  'R134a/air-conditioning': { slug: 'air-cooler',    catId: 2 },
  'R32/air-conditioning': { slug: 'air-cooler',      catId: 2 }
}

/** Resolver für refrigerant-getriebene Flows. Fallback: Evaporator DX. */
function resolveByRefrigerantAndPurpose(store: ConfigStore): RefrigerantTarget {
  const refrigerant = store.parameters.refrigerant
  const purpose = store.parameters.coolingPurpose
  return REFRIGERANT_TARGET_MAP[`${refrigerant}/${purpose}`]
    || { slug: 'evaporator-dx', catId: 0 }
}

// ============================================================================
// Configs — 4 Application + 3 Refrigerant Karten
// ----------------------------------------------------------------------------
// Zum Fragen ergänzen: Neues Element im `questions`-Array eintragen.
// Zum Choices erweitern: Neues Element im `choices`-Array der Frage eintragen.
// ============================================================================

// ============ By Application ============

const commercialHvacFlow: EntryFlowConfig = {
  entryId: 'commercial-hvac',
  tabId: 'application',
  title: 'Application: Commercial HVAC',
  target: { slug: 'air-cooler', catId: 2 },
  fixedParams: { coolingPurpose: 'air-conditioning', glycolType: 'ethylene', concentrationVolPct: 34 },
  questions: [
    {
      id: 'building-type',
      message:
        'Commercial HVAC — got it. **What kind of building** are you cooling? Helps me pick sensible defaults for occupancy and cooling loads.',
      choices: [
        { label: 'Office building',      detail: '9-to-5 occupancy, moderate load',      params: {} },
        { label: 'Hotel',                detail: 'Continuous, varying occupancy',        params: {} },
        { label: 'Hospital / lab',       detail: '24/7, tight tolerance',                params: {} },
        { label: 'Retail / mall',        detail: 'Long hours, high solar gain',          params: {} }
      ]
    },
    {
      id: 'capacity',
      message:
        'How much **cooling capacity** do you need? Commercial HVAC typically sits between 20 kW (single-tenant office) and several hundred kW (full building).',
      choices: [
        { label: '20 kW',  detail: 'Small tenant / single floor',   params: { coolingCapacityKw: 20 } },
        { label: '50 kW',  detail: 'Mid-size office',                params: { coolingCapacityKw: 50 } },
        { label: '150 kW', detail: 'Large office / hotel',           params: { coolingCapacityKw: 150 } },
        { label: '300 kW', detail: 'Multi-story / hospital',         params: { coolingCapacityKw: 300 } }
      ]
    },
    {
      id: 'water-regime',
      message:
        'Which **chilled-water regime** does your system use? Standard 6/12 °C fits most fan-coil setups; higher regimes save energy but need bigger coils.',
      choices: [
        { label: '6 / 12 °C', detail: 'Standard chilled water',              params: { inletTempC: 12, outletTempC: 6 } },
        { label: '7 / 12 °C', detail: 'Heat-pump compatible',                params: { inletTempC: 12, outletTempC: 7 } },
        { label: '10 / 15 °C', detail: 'High-temp chilled water (efficient)', params: { inletTempC: 15, outletTempC: 10 } }
      ]
    }
  ]
}

const industrialRefrigerationFlow: EntryFlowConfig = {
  entryId: 'industrial-refrigeration',
  tabId: 'application',
  title: 'Application: Industrial Refrigeration',
  target: { slug: 'evaporator-pump', catId: 1 },
  fixedParams: { coolingPurpose: 'industrial' },
  questions: [
    {
      id: 'process-type',
      message:
        'Industrial refrigeration — solid choice. **What are you cooling?** This helps me set the right temperature levels.',
      choices: [
        { label: 'Meat / fish',       detail: '-2 °C storage, hygiene-critical',   params: {} },
        { label: 'Fruit / vegetable', detail: '0-4 °C, high humidity',              params: {} },
        { label: 'Dairy / beverages', detail: '+2 °C, moderate temperature',        params: {} },
        { label: 'Frozen goods',      detail: '-18 to -25 °C long-term storage',    params: {} }
      ]
    },
    {
      id: 'capacity',
      message:
        '**How much cooling capacity** do you need? Industrial systems land between 25 kW (single cold room) and 500+ kW (full facility).',
      choices: [
        { label: '25 kW',  detail: 'Small industrial cold room', params: { coolingCapacityKw: 25 } },
        { label: '50 kW',  detail: 'Mid-size cold storage',      params: { coolingCapacityKw: 50 } },
        { label: '100 kW', detail: 'Large freezer / process',    params: { coolingCapacityKw: 100 } },
        { label: '250 kW', detail: 'Full industrial facility',   params: { coolingCapacityKw: 250 } }
      ]
    },
    {
      id: 'refrigerant',
      message:
        '**Which refrigerant?** NH₃ (R717) is the industrial standard for large systems. CO₂ (R744) works well for cascade / transcritical setups. R448A/R452A are HFO blends for HFC retrofits.',
      choices: [
        { label: 'R717 (NH₃)', detail: 'Industrial standard',     params: { refrigerant: 'R717' } },
        { label: 'R744 (CO₂)', detail: 'Cascade / transcritical', params: { refrigerant: 'R744' } },
        { label: 'R448A',      detail: 'HFO blend, retrofit',     params: { refrigerant: 'R448A' } },
        { label: 'R452A',      detail: 'HFO blend, low-temp',     params: { refrigerant: 'R452A' } }
      ]
    },
    {
      id: 'temperature-regime',
      message:
        'Last one: **which temperature regime?** Sets the evaporating temperature (t₀) and the target room temperature.',
      choices: [
        { label: 'Cold storage (+2 °C)',   detail: 't₀ = -8 °C, room +2 °C',    params: { evaporatingTempC: -8,  airInletTempC: 2 } },
        { label: 'Deep freeze (-18 °C)',   detail: 't₀ = -25 °C, room -18 °C',  params: { evaporatingTempC: -25, airInletTempC: -18 } },
        { label: 'Blast freezer (-35 °C)', detail: 't₀ = -40 °C, room -35 °C',  params: { evaporatingTempC: -40, airInletTempC: -35 } }
      ]
    }
  ]
}

const energyProcessCoolingFlow: EntryFlowConfig = {
  entryId: 'energy-process-cooling',
  tabId: 'application',
  title: 'Application: Energy & Process Cooling',
  target: { slug: 'dry-cooler', catId: 4 },
  fixedParams: { coolingPurpose: 'industrial', glycolType: 'ethylene', concentrationVolPct: 34 },
  questions: [
    {
      id: 'process-purpose',
      message:
        'Process cooling — what\'s the **primary purpose** of the loop?',
      choices: [
        { label: 'Free cooling',       detail: 'Ambient dry-cooler pre-cooling',      params: {} },
        { label: 'Heat rejection',     detail: 'Chiller condenser water loop',        params: {} },
        { label: 'Machine tool cooling', detail: 'Molds, hydraulics, spindles',      params: {} },
        { label: 'Renewable energy',   detail: 'Battery / power electronics',         params: {} }
      ]
    },
    {
      id: 'capacity',
      message:
        'How much **cooling capacity** do you need?',
      choices: [
        { label: '50 kW',  detail: 'Small process',              params: { coolingCapacityKw: 50 } },
        { label: '150 kW', detail: 'Mid-size industrial',        params: { coolingCapacityKw: 150 } },
        { label: '300 kW', detail: 'Large process / chiller',    params: { coolingCapacityKw: 300 } },
        { label: '500 kW', detail: 'Plant-scale',                params: { coolingCapacityKw: 500 } }
      ]
    },
    {
      id: 'water-regime',
      message:
        'Which **fluid inlet/outlet temperature regime**? Dry coolers work best when the fluid is well above ambient (bigger ΔT = smaller unit).',
      choices: [
        { label: '35 / 30 °C', detail: 'Free cooling, low ΔT',      params: { inletTempC: 35, outletTempC: 30 } },
        { label: '45 / 40 °C', detail: 'Dry cooler standard',       params: { inletTempC: 45, outletTempC: 40 } },
        { label: '55 / 45 °C', detail: 'High-temp process',         params: { inletTempC: 55, outletTempC: 45 } }
      ]
    }
  ]
}

const dataCenterFlow: EntryFlowConfig = {
  entryId: 'data-center',
  tabId: 'application',
  title: 'Application: Data Center',
  target: { slug: 'dry-cooler', catId: 4 },
  fixedParams: { coolingPurpose: 'data-center', glycolType: 'ethylene', concentrationVolPct: 34 },
  questions: [
    {
      id: 'redundancy',
      message:
        'Data center cooling — critical stuff. **What redundancy level** does your design require? Drives quantity and sizing safety.',
      choices: [
        { label: 'N',    detail: 'No redundancy — non-critical / test',     params: {} },
        { label: 'N+1',  detail: 'Single-point fault tolerance (standard)', params: {} },
        { label: '2N',   detail: 'Full duplication (tier-3+)',              params: {} }
      ]
    },
    {
      id: 'capacity',
      message:
        '**IT load** you need to reject? Rule of thumb: 1 kW IT ≈ 1 kW cooling load. Cooling systems are usually sized 10-20 % above IT load.',
      choices: [
        { label: '100 kW',  detail: 'Small colo / edge site',       params: { coolingCapacityKw: 100 } },
        { label: '300 kW',  detail: 'Mid-size data center',         params: { coolingCapacityKw: 300 } },
        { label: '500 kW',  detail: 'Large data hall',              params: { coolingCapacityKw: 500 } },
        { label: '1000 kW', detail: 'Hyperscale zone',              params: { coolingCapacityKw: 1000 } }
      ]
    },
    {
      id: 'cooling-strategy',
      message:
        'Which **cooling strategy** does your design use? Free-cooling saves energy but needs high-temp chilled water.',
      choices: [
        { label: 'Chilled water 12/6', detail: 'Traditional DX-fed cooling',        params: { inletTempC: 12, outletTempC: 6 } },
        { label: 'Free cooling 32/22', detail: 'Warm water, high efficiency',       params: { inletTempC: 32, outletTempC: 22 } },
        { label: 'Free cooling 45/40', detail: 'Full free-cooling dry cooler loop', params: { inletTempC: 45, outletTempC: 40 } }
      ]
    }
  ]
}

// ============ By Refrigerant ============

const naturalRefrigerantsFlow: EntryFlowConfig = {
  entryId: 'natural-refrigerants',
  tabId: 'refrigerant',
  title: 'Refrigerant: Natural',
  target: resolveByRefrigerantAndPurpose,
  questions: [
    {
      id: 'family',
      message:
        'Natural refrigerants — great choice, F-gas-independent and future-proof. **Which one** fits your case?',
      choices: [
        { label: 'R744 (CO₂)',     detail: 'GWP 1, A1, transcritical option',   params: { refrigerant: 'R744' } },
        { label: 'R717 (NH₃)',     detail: 'GWP 0, B2L, industrial powerhouse', params: { refrigerant: 'R717' } },
        { label: 'R290 (Propane)', detail: 'GWP 3, A3, small-charge systems',   params: { refrigerant: 'R290' } }
      ]
    },
    {
      id: 'use-case',
      message:
        'What\'s your **primary use case**? This determines whether we\'re heading into an evaporator, condenser, or gas cooler.',
      choices: [
        { label: 'Cold storage',        detail: '0…+5 °C, food & retail',       params: { coolingPurpose: 'cold-storage' } },
        { label: 'Deep freeze',         detail: '-18…-35 °C, long-term',        params: { coolingPurpose: 'deep-freeze' } },
        { label: 'Industrial process',  detail: 'Process cooling, plants',      params: { coolingPurpose: 'industrial' } },
        { label: 'Heat rejection',      detail: 'Condenser / gas cooler',       params: { coolingPurpose: 'condensing' } }
      ]
    },
    {
      id: 'capacity',
      message:
        'Finally: **how much capacity**? Pick the closest starting point — you can fine-tune the value in the next step.',
      choices: [
        { label: '10 kW',  detail: 'Small system',       params: { coolingCapacityKw: 10 } },
        { label: '25 kW',  detail: 'Mid-size',           params: { coolingCapacityKw: 25 } },
        { label: '100 kW', detail: 'Large system',       params: { coolingCapacityKw: 100 } },
        { label: '250 kW', detail: 'Industrial scale',   params: { coolingCapacityKw: 250 } }
      ]
    }
  ]
}

const brineFlow: EntryFlowConfig = {
  entryId: 'brine',
  tabId: 'refrigerant',
  title: 'Refrigerant: Brine (Secondary Loop)',
  target: { slug: 'air-cooler', catId: 2 },
  questions: [
    {
      id: 'application',
      message:
        'Brine loops decouple the primary refrigerant from the cooling point. **What\'s the target application** of the brine loop?',
      choices: [
        { label: 'Cold storage',       detail: '+2 to -5 °C rooms',       params: { coolingPurpose: 'cold-storage' } },
        { label: 'Deep freeze',        detail: '-25 to -40 °C',           params: { coolingPurpose: 'deep-freeze' } },
        { label: 'Chiller / AC',       detail: '+6 to +12 °C',            params: { coolingPurpose: 'air-conditioning' } },
        { label: 'Industrial process', detail: 'Custom temperature',      params: { coolingPurpose: 'industrial' } }
      ]
    },
    {
      id: 'medium',
      message:
        'Which **brine medium** does your system use? Glycol is standard; salt brines are used at very low temperatures.',
      choices: [
        { label: 'Ethylene glycol',   detail: 'Standard industrial',        params: { glycolType: 'ethylene',  concentrationVolPct: 34 } },
        { label: 'Propylene glycol',  detail: 'Food-safe, higher viscosity', params: { glycolType: 'propylene', concentrationVolPct: 34 } },
        { label: 'Water (pure)',      detail: 'No frost protection',         params: { glycolType: 'water',     concentrationVolPct: 0 } }
      ]
    },
    {
      id: 'temperature-regime',
      message:
        'Which **inlet / outlet temperature regime**?',
      choices: [
        { label: '+12 / +6 °C',  detail: 'Chiller / AC',              params: { inletTempC: 12, outletTempC: 6 } },
        { label: '-5 / -10 °C',  detail: 'Deep-freeze brine loop',    params: { inletTempC: -5, outletTempC: -10 } },
        { label: '+2 / -3 °C',   detail: 'Cold storage',              params: { inletTempC: 2, outletTempC: -3 } }
      ]
    }
  ]
}

const syntheticRefrigerantsFlow: EntryFlowConfig = {
  entryId: 'synthetic-refrigerants',
  tabId: 'refrigerant',
  title: 'Refrigerant: Synthetic',
  target: resolveByRefrigerantAndPurpose,
  questions: [
    {
      id: 'family',
      message:
        'Synthetic refrigerants — **which one** are you planning to use? Consider F-gas phase-down rules for GWP > 750.',
      choices: [
        { label: 'R448A',   detail: 'HFO blend, common retrofit',      params: { refrigerant: 'R448A' } },
        { label: 'R1234ze', detail: 'HFO, very low GWP (7)',           params: { refrigerant: 'R1234ze' } },
        { label: 'R134a',   detail: 'Legacy HFC, GWP 1430',            params: { refrigerant: 'R134a' } },
        { label: 'R32',     detail: 'Single-comp HFC, GWP 675',        params: { refrigerant: 'R32' } }
      ]
    },
    {
      id: 'use-case',
      message:
        'What\'s the **primary use case**?',
      choices: [
        { label: 'Cold storage',      detail: '0…+5 °C',                 params: { coolingPurpose: 'cold-storage' } },
        { label: 'Deep freeze',       detail: '-18…-35 °C',              params: { coolingPurpose: 'deep-freeze' } },
        { label: 'AC / Chiller',      detail: 'Comfort cooling',         params: { coolingPurpose: 'air-conditioning' } },
        { label: 'Heat rejection',    detail: 'Condenser',               params: { coolingPurpose: 'condensing' } }
      ]
    },
    {
      id: 'capacity',
      message:
        'And the **capacity**?',
      choices: [
        { label: '10 kW',  detail: 'Small system',       params: { coolingCapacityKw: 10 } },
        { label: '25 kW',  detail: 'Mid-size',           params: { coolingCapacityKw: 25 } },
        { label: '100 kW', detail: 'Large system',       params: { coolingCapacityKw: 100 } },
        { label: '250 kW', detail: 'Industrial scale',   params: { coolingCapacityKw: 250 } }
      ]
    }
  ]
}

// ============================================================================
// Exports
// ============================================================================

/** Alle Home-Entry-Flow-Configs. Reihenfolge egal — Match ist über entryId. */
export const HOME_ENTRY_FLOW_CONFIGS: readonly EntryFlowConfig[] = [
  commercialHvacFlow,
  industrialRefrigerationFlow,
  energyProcessCoolingFlow,
  dataCenterFlow,
  naturalRefrigerantsFlow,
  brineFlow,
  syntheticRefrigerantsFlow
]

/** Built `GuidedFlow`s aus den Configs. Wird von guidedFlows.ts in die
 *  GUIDED_FLOWS-Registry gemergt. */
export const HOME_ENTRY_FLOWS: readonly GuidedFlow[] =
  HOME_ENTRY_FLOW_CONFIGS.map(buildEntryFlow)

/** Set aller entryIds — Home-Karten-Handler in pages/index.vue checkt hier
 *  gegen, ob ein Klick den Q&A-Dialog aktivieren soll oder direkt zum Wizard. */
export const GUIDED_ENTRY_IDS: ReadonlySet<string> =
  new Set(HOME_ENTRY_FLOW_CONFIGS.map(c => c.entryId))
