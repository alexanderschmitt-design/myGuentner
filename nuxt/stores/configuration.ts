/**
 * Configuration Store — Pinia
 *
 * Spiegelt das ConfigurationState-Interface aus CLAUDE.md. Eine einzige Quelle
 * der Wahrheit für den gesamten Wizard, gerendert durch drei Perspektiven.
 *
 * Persistenz: localStorage (Phase-3-Entscheidung F4, MVP). Plugin
 * pinia-plugin-persistedstate wird in plugins/pinia-persistedstate.client.ts
 * client-side initialisiert.
 */

import { defineStore } from 'pinia';
import type { UnitInputData } from '~/composables/useGpceu';
import {
  emptyUnitInputData,
  mergeUnitInputData,
  unitInputDataFromLegacyParameters,
  legacyParametersFromUnitInputData
} from '~/utils/unitInputDataMapper';
import { slugToFluidId } from '~/utils/fluidIdMap';
import { CATEGORIES } from '~/composables/useCategory';

/**
 * Kategorien-spezifische Default-Serien für den `findUnits`-Payload.
 * API-interne Model-Prefix-Strings (nicht die Katalog-IDs aus
 * `seriesCatalog.ts`), gezogen aus den Fixture-Snapshots
 * `nuxt/public/productCategoryN.json`. Ohne mindestens einen Eintrag
 * antwortet die API mit „At least one series must be selected!".
 *
 * TODO: Diese Defaults sollten später aus der reaktiven User-Selection
 * in unit-selection.vue (`selectedSeries`-Ref) kommen — dazu muss die
 * Selection erst in den Pinia-Store gehoben werden. Bis dahin sorgt die
 * Default-Map dafür, dass die API-Query überhaupt einen Suchraum hat.
 */
const CATEGORY_DEFAULT_UNITS: Record<number, string[]> = {
  0:  ['GACC_CX_3E_WS_KDB', 'GACV_CX_5E'],     // Evaporator DX
  1:  ['GACV_AP_4E'],                          // Evaporator Pump
  2:  ['GACC_FP_2E_WS_KDB', 'GACV_FP_4E'],     // Air Cooler (Coolant)
  3:  ['GCHC_3E', 'GCHV_3E'],                  // Condenser
  4:  ['GFHC_2E', 'GFHV_3E'],                  // Dry Cooler
  5:  ['GSHC_3E'],                             // Subcooler
  6:  ['GOHC_2E'],                             // Oil Cooler
  10: ['GGHC_2E', 'GGHV_4E']                   // Gas Cooler CO₂
};

export type Perspective = 'technical' | 'application' | 'location';

export type CoolingPurpose =
  | 'cold-storage' | 'deep-freeze' | 'industrial' | 'air-conditioning'
  | 'data-center' | 'condensing';

export type InstallationType =
  | 'indoor-ceiling' | 'indoor-floor' | 'outdoor-roof' | 'outdoor-ground' | 'wall-mounted';

export type EnvironmentClass =
  | 'standard' | 'moderate' | 'aggressive' | 'very-aggressive';

export interface Dimensions { lengthMm: number; widthMm: number; heightMm: number; }

export interface ConfigurationParameters {
  // Performance
  coolingCapacityKw: number | null;
  airflowM3h: number | null;
  evaporatingTempC: number | null;
  condensingTempC: number | null;

  // Refrigerant-side (DX / Pump / Condenser / Subcooler / Gas cooler)
  refrigerant: string | null;
  refrigerantRegion: 'eu' | 'us' | 'apac' | null;
  superheatingK: number | null;
  subcoolingK: number | null;
  dewPointMode: 'dew-point' | 'mean';
  inletByTempPressure: boolean;

  // Liquid-side (Air cooler Coolant / Dry cooler / Oil cooler) — from Figma 2328:7827
  // String, weil die Live-Fluid-API arbitrary fluidIDs zurückgeben kann
  // (z. B. "4" für Ethylene glycol, "1002" für Öl). Slug-Konvention siehe
  // nuxt/utils/fluidIdMap.ts.
  glycolType: string | null;
  concentrationVolPct: number | null;
  inletTempC: number | null;
  outletTempC: number | null;
  parameterMode: 'inlet-outlet' | 'inlet-temperature-lift' | 'outlet-temperature-lift';

  // Shared
  calculationMode: 'fixed-capacity' | 'fixed-surface' | 'fixed-capacity-adjust-cond-temp';
  minSurfaceReserve: number;
  maxSurfaceReserve: number;
  frostThicknessMm: number;
  /** Category 3 (Condenser) und ähnliche Refrigerant-Kategorien mit mehreren
   *  Kreisen. Aus Fixture-Feld `multipleCircuits` (0/1) hydriert. */
  multipleCircuits: boolean;
  /** Anzahl der Kreise pro Coil. Fixture-Feld `noOfCircuitsThermo`. */
  noOfCircuits: number;
  /** Feld nur relevant für Evaporator Pump (Cat 1). Aus Fixture-Feld
   *  `fluidPumpMode` — 0 = Pumpe (feed rate), 1 = gravity flooded. */
  gravityFlooded: boolean;
  /** Feed-Rate für die Pumpe (Cat 1). Fixture `fluidPumpRate`. */
  pumpFeedRate: number | null;
  /** Frost-Coil-Modus (nicht identisch mit Frost-Thickness). Fixture
   *  `frostedCoil`. Nur informativ, kein UI-Steuerelement bisher. */
  frostedCoil: boolean;
  /** Fixture-Feld `wetCoilFactor` — wird beim Payload-Bau weitergereicht. */
  wetCoilFactor: boolean;
  maxPressureDropBar: number | null;     // liquid-side unit
  maxPressureDropK: number | null;       // refrigerant-side unit
  maxPressureDropAuto: boolean;
  airInletTempC: number;
  relHumidityPct: number | null;
  humidityAuto: boolean;
  wetBulbTempC: number | null;
  altitudeM: number;
  airPressureMbar: number;
  capacityWithHumidityFactor: boolean;
  /** Which humidity measure is shown on the Air card. Toggled from
   *  the Options modal on that card. Default 'rel-humidity'. */
  humidityMode: 'rel-humidity' | 'wet-bulb';
  /** Which pressure measure is shown on the Air card. Toggled from
   *  the Options modal on that card. Default 'air-pressure'. */
  pressureMode: 'air-pressure' | 'altitude';

  // Bare-coil-specific Air options (MPD-6932). Rendered inside the Air
  // "Options" panel when store.productSection === 2 (Bare Coil).
  volumeFlowValue: number | null;
  volumeFlowUnit: 'm3s' | 'm3h' | 'cfm' | 'gpm' | 'ls' | 'lmin' | 'lh';
  volumeFlowReference: 'inlet' | 'outlet';

  // Application
  coolingPurpose: CoolingPurpose | null;
  defrostMethod: 'electric' | 'hot-gas' | 'air' | null;

  // Location
  installationType: InstallationType | null;
  ambientTempMaxC: number | null;
  ambientTempMinC: number | null;
  noiseLimitDBA: number | null;
  roomDimensions: Dimensions | null;
  environmentClass: EnvironmentClass;

  /**
   * Transkritische CO₂-Konfiguration (Cat 10 Gas cooler). `enabled` = true
   * wenn Fixture `isSubcritic && isSupercritic` liefert. Aktiviert im Wizard
   * die zwei extra Karten "Subcooler / supercritic" und "Condenser / subcritic".
   * Alle Werte kommen aus den `subcritic*`-Fixture-Feldern.
   */
  transcritic: TranscriticConfig;
}

/**
 * Zwei-Sektionen-Layout für Cat 10 (Gas cooler CO₂). Die supercritic-Sektion
 * hält Werte des Haupt-Kreises (isSupercritic=true), die subcritic-Sektion
 * die des sekundären Kreises (isSubcritic=true) — siehe Live-Referenz
 * public/cat10.png.
 */
export interface TranscriticConfig {
  enabled: boolean;
  /** Fixture `fluidPressure` (mbar) → Druck im Supercritic-Kreis */
  supercriticPressureMbar: number | null;
  /** Fixture `subcriticThermalCapacity` (W) → kW im Store */
  subcriticCapacityKw: number | null;
  /** Fixture `subcriticFluidTempInlet` (°C) */
  subcriticFluidTempInletC: number | null;
  /** Fixture `subcriticFluidTempCond` (°C) */
  subcriticFluidTempCondC: number | null;
  /** Fixture `subcriticAirTemperature` (°C) */
  subcriticAirTempC: number | null;
  /** Fixture `subcriticAirRelHumidity` (%) */
  subcriticRelHumidityPct: number | null;
  /** Fixture `subcriticFluidPressureDropMax` — API in kPa, UI in bar */
  subcriticMaxPressureDropBar: number | null;
}

export interface ValidationWarning {
  id: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  affects: Perspective[];
}

export interface ProductSelection {
  productId: string;
  typeDesignation: string;
  quantity: number;
}

export interface ProjectMeta {
  name: string;
  contact: string;
  city: string;
  state: string;
  country: string;
}

/**
 * Unit-Selection-Optionen — die Checkboxen und Dropdowns aus dem Options-Accordion
 * in `unit-selection.vue`. Vorher lokaler `reactive()`, jetzt im Store, damit
 * Template-Save/Load die Werte erfasst. Mirrors `rag/gpc-parameters.json`.
 */
export interface UnitSelectionOpts {
  onlyErpCompliant: boolean;
  powerSupply: number;
  motorTechnology: number;
  minimumEnergyEfficiencyClass: number;
  maxOperatingPressure: number;
  coreTubeMaterial: string;
  airBlowDirection: number;
  defrostingType: number;
  hotGasInterconnectingTubing: boolean;
  airVelocityClass: number;
  esp: boolean;
  espPressurePa: number;
  epoxyCoatedFins: boolean;
  airSockWithStreamer: boolean;
  coilDefender: boolean;
  repairSwitch: boolean;
  repairSwitchPosition: number;
  repairSwitchType: number;
  repairSwitchWiring: number;
  wiringToTerminalBox: boolean;
  fanRingHeater: boolean;
  fanRingHeaterMode: string;
  doubleTrayInsulated: boolean;
  casingSimpleTraySs: boolean;
  casingDoubleTraySs: boolean;
  legsForFloorMounting: boolean;
  legsMaterial: string;
  defrostHose: boolean;
  hingedFanUnits: boolean;
  designForEvapT0Below40: boolean;
  connectionsAirFlowLeft: boolean;
  inletHood: boolean;
  louvreWithDrive: boolean;
  guentnerStreamer: boolean;
}

export function emptyUnitSelectionOpts(): UnitSelectionOpts {
  // Defaults gemäß Live-App-Konvention aus den Fixture-JSONs
  // (`productCategoryN.json`). Grep über alle 8 Fixtures bestätigt:
  // powerSupply=3001, airBlowOffType=10001, airVelocityClass=10001,
  // erP_Compliant=true, nippleTubeMaterial=0, wiring_To_Terminal_Box=0
  // sind cat-übergreifend identisch. `defrostingType` variiert
  // (80 für Evap/AirCooler, 0 für Cond/Kühler) — Sync in
  // hydrateUnitInputDataFromFixture() für den Cat-spezifischen Wert.
  // Der 80er-Default hier ist der Evap-Startwert (App defaultet Cat 0).
  return {
    onlyErpCompliant: true,
    powerSupply: 3001,
    motorTechnology: -3,
    minimumEnergyEfficiencyClass: 0,
    maxOperatingPressure: 0,
    coreTubeMaterial: '0',
    airBlowDirection: 10001,
    defrostingType: 80,
    hotGasInterconnectingTubing: false,
    airVelocityClass: 10001,
    esp: false,
    espPressurePa: 0,
    epoxyCoatedFins: false,
    airSockWithStreamer: false,
    coilDefender: false,
    repairSwitch: false,
    repairSwitchPosition: 3,
    repairSwitchType: 2,
    repairSwitchWiring: 1,
    wiringToTerminalBox: false,
    fanRingHeater: false,
    fanRingHeaterMode: 'standard',
    doubleTrayInsulated: false,
    casingSimpleTraySs: false,
    casingDoubleTraySs: false,
    legsForFloorMounting: false,
    legsMaterial: 'galv',
    defrostHose: false,
    hingedFanUnits: false,
    designForEvapT0Below40: false,
    connectionsAirFlowLeft: false,
    inletHood: false,
    louvreWithDrive: false,
    guentnerStreamer: false
  };
}

export interface DefrostOpts {
  hotGasEndTempC: number;
  hotGasMinDurationMin: number;
  drainPanHeater: boolean;
  warmBrineTempC: number;
  warmBrineFlowLpm: number;
}

export function emptyDefrostOpts(): DefrostOpts {
  return {
    hotGasEndTempC: 6,
    hotGasMinDurationMin: 3,
    drainPanHeater: true,
    warmBrineTempC: 35,
    warmBrineFlowLpm: 30
  };
}

/**
 * TemplatePayload — full wizard snapshot as saved to `user_templates.configuration`
 * (see supabase/migrations/20260818000001_user_templates.sql). Symmetric partner
 * of `snapshotForTemplate` + `applyTemplate`. Keep the field list in sync with
 * TEMPLATE_PAYLOAD_KEYS below.
 */
export interface TemplatePayload {
  parameters: ConfigurationParameters;
  coilGeometry: CoilGeometryConfig;
  unitInputData: UnitInputData;
  unitSelectionOpts: UnitSelectionOpts;
  defrostOpts: DefrostOpts;
  productSection: 1 | 2;
  currentCategory: string | null;
  currentSubcategory: string | null;
  selectedUnitKey: string | null;
}

export const TEMPLATE_PAYLOAD_KEYS = [
  'parameters', 'coilGeometry', 'unitInputData',
  'unitSelectionOpts', 'defrostOpts',
  'productSection', 'currentCategory', 'currentSubcategory',
  'selectedUnitKey'
] as const;

export interface ServiceConfig {
  quantity: number;
  discountPercent: number;
  startupSupport: boolean;
  notes: string;
}

function emptyService(): ServiceConfig {
  return {
    quantity: 1,
    discountPercent: 0,
    startupSupport: false,
    notes: ''
  };
}

/**
 * Bare-coil geometry configuration (Step 3 in the Coil flow, replaces
 * Unit Selection). Structure mirrors layouts/03 Coil-Geometry-all-formelements.png
 * and the pre-migration frontend/coil-geometry.html field set.
 */
export interface CoilGeometryConfig {
  maxOperatingPressure: string;           // 'AUTO' or numeric string
  fins: {
    finType: string;                      // e.g. 'F 50 mm x 25 mm (staggered) (FT09 old)'
    material: string;                     // 'AUTO' | material code
    thickness: string;                    // 'AUTO' | numeric
    finSpacingMinMm: number;
    finSpacingMaxMm: number;
    variableFinSpacing: boolean;
  };
  dimensions: {
    finnedLengthMm: number;
    finnedHeightMm: number;
    tubeRowsMin: number;
    tubeRowsMax: number;
  };
  coreTubes: {
    material: string;
    wallThickness: string;
  };
  circuiting: {
    passesMin: number;
    passesMax: number;
    onlyEvenPasses: boolean;
    circuits: number;
  };
  connectionSystem: {
    maxOuterDiameterMm: number;
    material: string;
  };
  distributionSystem: {
    matDistributor: string;
    matCapillaries: string;
    minLengthCapillariesMm: number;
  };
  frame: {
    material: string;
  };
  coilAlignment: 'vertical' | 'horizontal';
  constructionFor: 'casing' | 'duct';
}

function emptyCoilGeometry(): CoilGeometryConfig {
  return {
    maxOperatingPressure: 'AUTO',
    fins: {
      finType: 'F 50 mm x 25 mm (staggered) (FT09 old)',
      material: 'AUTO',
      thickness: 'AUTO',
      finSpacingMinMm: 4.00,
      finSpacingMaxMm: 7.00,
      variableFinSpacing: false
    },
    dimensions: {
      finnedLengthMm: 1000,
      finnedHeightMm: 400,
      tubeRowsMin: 2,
      tubeRowsMax: 12
    },
    coreTubes: {
      material: 'AUTO',
      wallThickness: 'AUTO'
    },
    circuiting: {
      passesMin: 2,
      passesMax: 999,
      onlyEvenPasses: false,
      circuits: 1
    },
    connectionSystem: {
      maxOuterDiameterMm: 0,
      material: 'AUTO'
    },
    distributionSystem: {
      matDistributor: 'AUTO',
      matCapillaries: 'AUTO',
      minLengthCapillariesMm: 0
    },
    frame: {
      material: 'AUTO'
    },
    coilAlignment: 'vertical',
    constructionFor: 'casing'
  };
}

function emptyParameters(): ConfigurationParameters {
  return {
    coolingCapacityKw: 10,
    airflowM3h: null,
    evaporatingTempC: -8,
    condensingTempC: 5,

    refrigerant: 'R744',
    refrigerantRegion: 'eu',
    superheatingK: 5,
    subcoolingK: 1,
    dewPointMode: 'dew-point',
    inletByTempPressure: false,

    glycolType: 'ethylene',
    concentrationVolPct: 34,
    inletTempC: 45,
    outletTempC: 40,
    parameterMode: 'inlet-outlet',

    calculationMode: 'fixed-capacity',
    minSurfaceReserve: -10,
    maxSurfaceReserve: 50,
    frostThicknessMm: 0,
    multipleCircuits: false,
    noOfCircuits: 1,
    gravityFlooded: false,
    pumpFeedRate: null,
    frostedCoil: false,
    wetCoilFactor: true,
    maxPressureDropBar: 1,
    maxPressureDropK: 5,
    maxPressureDropAuto: true,
    airInletTempC: 32,
    relHumidityPct: 40,
    humidityAuto: true,
    wetBulbTempC: 15,
    altitudeM: 0,
    airPressureMbar: 1013,
    capacityWithHumidityFactor: true,
    humidityMode: 'rel-humidity',
    pressureMode: 'air-pressure',

    volumeFlowValue: null,
    volumeFlowUnit: 'm3h',
    volumeFlowReference: 'outlet',

    coolingPurpose: null,
    defrostMethod: null,
    installationType: null,
    ambientTempMaxC: null,
    ambientTempMinC: null,
    noiseLimitDBA: null,
    roomDimensions: null,
    environmentClass: 'standard',

    transcritic: {
      enabled: false,
      supercriticPressureMbar: null,
      subcriticCapacityKw: null,
      subcriticFluidTempInletC: null,
      subcriticFluidTempCondC: null,
      subcriticAirTempC: null,
      subcriticRelHumidityPct: null,
      subcriticMaxPressureDropBar: null
    }
  };
}

export const useConfigStore = defineStore('configuration', {
  state: () => ({
    activePerspective: 'application' as Perspective,
    unitSystem: 'us' as 'us' | 'si',  // Default US (Planning.md §7)
    project: {
      name: '', contact: '', city: '', state: '', country: ''
    } as ProjectMeta,
    parameters: emptyParameters() as ConfigurationParameters,
    validationWarnings: [] as ValidationWarning[],
    selectedProducts: [] as ProductSelection[],
    selectedAccessories: [] as string[],
    service: emptyService() as ServiceConfig,
    selectedUnitKey: null as string | null,
    currentCategory: null as string | null,
    currentSubcategory: null as string | null,
    // productSection: 1 = Unit (default), 2 = Bare Coil.
    // Set by Home cards before navigation into the wizard; drives TopStepNav
    // label (Unit Selection vs Coil Geometry) and Results/Datasheet variants.
    productSection: 1 as 1 | 2,
    coilGeometry: emptyCoilGeometry() as CoilGeometryConfig,
    // Vollständiges UnitInputData (222 Properties) — Payload-Shape für
    // GPC-EU-API-Calls (findunits, unitfeatures, coilgeometry, …). Wird
    // beim Wizard-Start aus useGpceu().defaultInputData(productCategory)
    // gefüllt (siehe action `hydrateUnitInputData`). Wizard-Änderungen
    // schreiben direkt hier hinein oder gehen via `updateParameters` +
    // Legacy-Mapper. Persistiert.
    unitInputData: emptyUnitInputData() as UnitInputData,
    /** Cat-ID der zuletzt via `hydrateUnitInputDataFromFixture()`
     *  hydrierten Fixture. Guard gegen Doppel-Hydration innerhalb
     *  derselben Kategorie; erzwingt Full-Replace beim Cat-Wechsel. */
    lastHydratedCatId: null as number | null,
    // Unit Selection Options-Accordion state (vorher lokaler reactive in
    // unit-selection.vue). Ins Pinia gehoben, damit Template-Save/Load die
    // Checkbox-Werte erfasst.
    unitSelectionOpts: emptyUnitSelectionOpts() as UnitSelectionOpts,
    defrostOpts: emptyDefrostOpts() as DefrostOpts,

    // Welche ConfigurationParameters-Keys wurden bereits durch Guided-Q&A
    // oder ein Template intentional gesetzt (im Gegensatz zu den Startwerten
    // aus emptyParameters()). Der Wizard-Guided-Flow (thermoRefrigerantFlow,
    // thermoLiquidFlow) skippt Steps deren Key hier gemarkt ist, damit der
    // User nicht nochmal gefragt wird, wenn die Q&A das schon geklärt hat.
    answeredParams: {} as Record<string, boolean>,

    // ID des zuletzt geladenen System- oder User-Templates. Erlaubt UI-States
    // wie "Template X geladen" + Undo, und wird beim Reload aus dem Persist-
    // Store rehydriert (statt Modul-scope zu verpuffen).
    lastAppliedTemplateId: null as string | null,
    lastAppliedTemplateName: null as string | null
  }),

  getters: {
    accentColorVar(): string {
      switch (this.activePerspective) {
        case 'technical':   return 'var(--c-primary)';
        case 'application': return 'var(--c-process)';
        case 'location':    return 'var(--c-site)';
      }
    },
    hasSelection(): boolean {
      return this.selectedProducts.length > 0;
    },
    /**
     * Payload für POST-Endpoints wie /findunits + /unitfeatures + /impactrating.
     * Merget die aktuellen Wizard-Parameter (camelCase → API-PascalCase)
     * über die vollständige UnitInputData-Slice, sodass Änderungen im
     * Wizard immer im finalen Payload landen — auch wenn der User ein Feld
     * setzt, das noch nie im API-Default-Response war.
     */
    payloadForFindUnits(): UnitInputData {
      const merged = mergeUnitInputData(
        this.unitInputData,
        unitInputDataFromLegacyParameters(this.parameters, this.unitSelectionOpts)
      );
      // ProductCategory und FluidID sind Pflichtfelder für findUnits.
      // Beides steht im Store implizit (currentCategory-Slug + refrigerant/
      // glycolType-Slug), landet aber sonst nicht im Payload, weil das
      // Legacy-Mapping die beiden bewusst auslässt (Slug ≠ ID).
      const cat = CATEGORIES.find((c) => c.slug === this.currentCategory);
      const out = merged as unknown as Record<string, unknown>;
      if (cat) out.ProductCategory = cat.id;
      // FluidID: bevorzuge den aus der Fixture-Sync geladenen numerischen
      // Wert (`unitInputData.FluidID`), falls gesetzt. Erst wenn der Store
      // keinen Wert hat (User navigierte direkt ohne Thermodynamics-
      // Fixture-Sync), auf den Slug-Lookup zurückfallen.
      const existingFluidId = (out.FluidID as number | undefined) ?? 0;
      if (!existingFluidId || existingFluidId === 0) {
        const slug = cat?.mediumType === 'liquid'
          ? this.parameters.glycolType
          : this.parameters.refrigerant;
        const fluidId = slug ? slugToFluidId(slug, cat?.mediumType, cat?.id) : null;
        if (fluidId !== null) out.FluidID = fluidId;
      }
      // FluidPressureDropMax: derselbe API-Slot bekommt je nach mediumType
      // den Bar-Wert (liquid) oder K-Wert (refrigerant). Beide Store-Felder
      // haben Defaults, deshalb hier gezielt der passende. API akzeptiert
      // 0 nicht — auch im Auto-Modus muss ein Nicht-Null-Wert stehen
      // (Fixture Cat 3 zeigt fluidPressureDropMax=2 mit
      // isMaxFluidPressureDropAuto=true).
      const pdVal = cat?.mediumType === 'liquid'
        ? this.parameters.maxPressureDropBar
        : this.parameters.maxPressureDropK;
      if (pdVal != null && pdVal !== 0) out.FluidPressureDropMax = pdVal;
      out.IsMaxFluidPressureDropAuto = this.parameters.maxPressureDropAuto;
      // Units-Filter: die API verlangt "At least one series must be
      // selected". Ohne UI-Sync haben wir aktuell keine live-gewählten
      // Serien im Store — force-replace mit Cat-Defaults, damit Cat-0-
      // Units nicht in Cat-1-Payloads leaken (Fixture-Hydration merged,
      // die alte Cat-Units-Liste würde sonst persistieren). Sobald der
      // Store User-Auswahl trackt (Follow-up), dieser Zweig wird bedingt.
      if (cat && CATEGORY_DEFAULT_UNITS[cat.id]) {
        out.Units = CATEGORY_DEFAULT_UNITS[cat.id];
      }
      // Hit-Cap: die API rejected `MaxNumberOfHits: 0` mit „must be at
      // least 1". Default 20 matcht dem `pageSize`-Selector in search.vue.
      const mnh = out.MaxNumberOfHits;
      if (typeof mnh !== 'number' || mnh < 1) out.MaxNumberOfHits = 20;
      return out as UnitInputData;
    }
  },

  actions: {
    setPerspective(p: Perspective) { this.activePerspective = p; },
    setUnitSystem(s: 'us' | 'si') { this.unitSystem = s; },
    updateParameters(patch: Partial<ConfigurationParameters>) {
      Object.assign(this.parameters, patch);
    },
    /**
     * Hydratiert `unitInputData` mit den Werten aus dem Fixture-Snapshot
     * `nuxt/public/productCategoryN.json` und synchronisiert die
     * kategorien-inhärenten Wizard-Parameter (refrigerant / glycolType /
     * multipleCircuits etc.). Kritisch für den findUnits-Backend-Call,
     * weil die Fixture ~40 API-Felder auf realistische Werte setzt, die
     * im UI nicht editierbar sind aber vom Backend gebraucht werden.
     *
     * **Per-Cat-Guard**: skippt nur, wenn die aktuelle Kategorie bereits
     * hydriert wurde. Bei Cat-Wechsel läuft die Hydration erneut, damit
     * Cat-0-Werte nicht in Cat-1-Payloads leaken.
     *
     * **Full-Replace**: die Basis ist `emptyUnitInputData()` — Felder,
     * die die neue Fixture nicht setzt, fallen auf Null-Defaults zurück
     * (statt Cat-0-Werte aus voriger Fixture zu behalten).
     *
     * Fixture-Keys sind camelCase; API + `unitInputData` PascalCase.
     */
    async hydrateUnitInputDataFromFixture(catId: number) {
      // Per-Cat-Guard — wenn Cat schon hydriert, skip.
      if (this.lastHydratedCatId === catId) return;
      try {
        const raw = await $fetch<{ content?: Record<string, unknown> } | Record<string, unknown>>(
          `/productCategory${catId}.json`
        );
        const content = (raw as { content?: Record<string, unknown> }).content
          ?? (raw as Record<string, unknown>);
        if (!content || typeof content !== 'object') return;
        // camelCase → PascalCase merge.
        const patch: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(content)) {
          patch[k.charAt(0).toUpperCase() + k.slice(1)] = v;
        }
        // FULL-REPLACE: emptyUnitInputData() als Basis + Fixture-Patch.
        // Alte Werte fallen zurück auf Null-Defaults, wenn die neue Fixture
        // sie nicht mehr setzt.
        this.unitInputData = mergeUnitInputData(
          emptyUnitInputData() as UnitInputData,
          patch as Partial<UnitInputData>
        );
        // Full-Replace der `parameters`-Slice aus der Fixture: für einen
        // Cat-Wechsel ist die Fixture autoritativ. Ein 7-Key-Sync
        // (CATEGORY_INHERENT_KEYS) reichte nicht, weil der Payload-Getter
        // aus Legacy-Params abgeleitete API-Felder (ThermalCapacity,
        // FluidTempCond, FluidTempInlet, Altitude …) baut — und die
        // Legacy-Params dort gewinnen. `legacyParametersFromUnitInputData()`
        // mapt die Fixture-Werte zurück in exakt diese Params.
        const cat = CATEGORIES.find((c) => c.id === catId);
        const legacyPatch = legacyParametersFromUnitInputData(
          this.unitInputData,
          { categoryMediumType: cat?.mediumType }
        );
        for (const [key, v] of Object.entries(legacyPatch)) {
          if (v === undefined) continue;
          (this.parameters as unknown as Record<string, unknown>)[key] = v;
        }
        // unitSelectionOpts.defrostingType Cat-inhärent syncen:
        // Cat 0/1/2 (Evap DX/Pump + Air Cooler) → 80 (Default-Defrost),
        // Cat 3/4/5/6/10 (Cond/Kühler/Subcooler/GasCooler) → 0 (kein Defrost).
        // Andere Enums (powerSupply, airBlowOffType, airVelocityClass,
        // erP_Compliant, nippleTubeMaterial, wiring_To_Terminal_Box) sind
        // laut Fixture-Grep cat-übergreifend konstant → bereits in
        // emptyUnitSelectionOpts() als Live-App-Defaults verankert.
        const fixtureDefrost = (this.unitInputData as unknown as Record<string, unknown>).Defrosting;
        if (typeof fixtureDefrost === 'number') {
          this.unitSelectionOpts.defrostingType = fixtureDefrost;
        }
        this.lastHydratedCatId = catId;
      } catch {
        // Fehlt die Fixture: still auf Null-Defaults belassen — Diagnostics-
        // Panel zeigt dann Deltas gegen die Fixture, User kann manuell fixen.
      }
    },
    addWarning(w: ValidationWarning) {
      if (!this.validationWarnings.find(x => x.id === w.id)) this.validationWarnings.push(w);
    },
    clearWarnings() { this.validationWarnings = []; },
    selectProduct(s: ProductSelection) {
      const existing = this.selectedProducts.find(p => p.productId === s.productId);
      if (existing) existing.quantity = s.quantity;
      else this.selectedProducts.push(s);
    },
    removeProduct(productId: string) {
      this.selectedProducts = this.selectedProducts.filter(p => p.productId !== productId);
    },
    toggleAccessory(id: string) {
      const i = this.selectedAccessories.indexOf(id);
      if (i >= 0) this.selectedAccessories.splice(i, 1);
      else this.selectedAccessories.push(id);
    },
    updateService(patch: Partial<ServiceConfig>) {
      Object.assign(this.service, patch);
    },
    selectUnit(key: string | null) {
      this.selectedUnitKey = key;
    },
    setProductSection(s: 1 | 2) {
      this.productSection = s;
    },
    updateCoilGeometry(patch: Partial<CoilGeometryConfig>) {
      Object.assign(this.coilGeometry, patch);
    },
    resetCoilGeometry() {
      this.coilGeometry = emptyCoilGeometry();
    },
    /**
     * Setzt beliebige Properties der UnitInputData-Slice. Wird vom
     * Options-Accordion, vom DynamicParameterField und von Presets genutzt.
     */
    updateUnitInputData(patch: Partial<UnitInputData>) {
      this.unitInputData = mergeUnitInputData(this.unitInputData, patch);
    },
    /**
     * Hydriert die UnitInputData-Slice aus einem API-Default-Response
     * (z. B. `defaultInputData(productCategory)`). Bestehende, vom User
     * bereits geänderte Werte bleiben erhalten — nur Felder, die noch auf
     * datatype-Default stehen, werden überschrieben.
     */
    hydrateUnitInputData(defaults: Partial<UnitInputData>) {
      // Nur überschreiben, wo der Store noch auf empty steht; user-eingaben
      // haben Vorrang. Wir werten "empty" als Wert === Wert aus emptyUnitInputData
      // — d.h. 0/false/""/[]. Bei ambivalenten 0-Werten (z. B. Temperatur 0 °C)
      // greift der Default trotzdem, was in der Praxis kein Problem ist, weil
      // der Wizard vor dem Hydrate noch nicht editiert wurde.
      const empty = emptyUnitInputData() as unknown as Record<string, unknown>;
      const cur = this.unitInputData as unknown as Record<string, unknown>;
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(defaults)) {
        if (v === undefined) continue;
        if (cur[k] === empty[k]) patch[k] = v;
      }
      this.unitInputData = mergeUnitInputData(this.unitInputData, patch as Partial<UnitInputData>);
    },
    /**
     * Markiert Parameter-Keys als "vom User / Guided-Flow / Template intentional
     * beantwortet". Der Wizard-Guided-Flow konsultiert das über hasAnsweredParam(),
     * um bereits geklärte Steps zu überspringen.
     */
    markAnswered(keys: string[] | string) {
      const arr = Array.isArray(keys) ? keys : [keys];
      for (const k of arr) this.answeredParams[k] = true;
    },
    hasAnsweredParam(key: string): boolean {
      return this.answeredParams[key] === true;
    },
    clearAnsweredParams() { this.answeredParams = {}; },

    /**
     * Merkt sich, welches Template gerade aktiv ist. Persistiert, damit ein
     * F5-Reload den Kontext behält (für UI-Badges + Undo-Fähigkeit).
     */
    noteTemplateApplied(id: string | null, name?: string | null) {
      this.lastAppliedTemplateId = id;
      this.lastAppliedTemplateName = name ?? null;
    },

    resetWizard() {
      this.parameters = emptyParameters();
      this.validationWarnings = [];
      this.selectedProducts = [];
      this.selectedAccessories = [];
      this.service = emptyService();
      this.selectedUnitKey = null;
      this.answeredParams = {};
      this.lastAppliedTemplateId = null;
      this.lastAppliedTemplateName = null;
      this.currentCategory = null;
      this.currentSubcategory = null;
      this.productSection = 1;
      this.coilGeometry = emptyCoilGeometry();
      this.unitInputData = emptyUnitInputData();
      this.unitSelectionOpts = emptyUnitSelectionOpts();
      this.defrostOpts = emptyDefrostOpts();
      // Session-Flags freigeben, damit Auto-Apply beim nächsten Kategorie-
      // Öffnen wieder greift. Siehe pages/mygpc/[catId]/thermodynamics.vue.
      if (typeof window !== 'undefined') {
        for (const key of Object.keys(window.sessionStorage)) {
          if (key.startsWith('gpc:autoApplied:')) window.sessionStorage.removeItem(key);
        }
      }
    },
    /**
     * Snapshot der Konfiguration im Template-Format. Symmetrischer Partner
     * zu `applyTemplate`. Rückgabe wird direkt in user_templates.configuration
     * (JSONB) geschrieben.
     */
    snapshotForTemplate(): TemplatePayload {
      return {
        parameters: { ...this.parameters },
        coilGeometry: JSON.parse(JSON.stringify(this.coilGeometry)),
        unitInputData: JSON.parse(JSON.stringify(this.unitInputData)),
        unitSelectionOpts: { ...this.unitSelectionOpts },
        defrostOpts: { ...this.defrostOpts },
        productSection: this.productSection,
        currentCategory: this.currentCategory,
        currentSubcategory: this.currentSubcategory,
        selectedUnitKey: this.selectedUnitKey
      };
    },
    /**
     * Wendet ein Template auf den Store an. Schema-tolerant — fehlende Felder
     * fallen auf `emptyXxx()`-Defaults zurück, sodass alte Templates nach
     * Schema-Evolution nicht kaputt gehen.
     */
    applyTemplate(payload: Partial<TemplatePayload>) {
      if (payload.parameters) {
        this.parameters = Object.assign(emptyParameters(), payload.parameters);
        // Alles, was das Template mitbringt, ist ein bewusst gesetzter Wert —
        // der Wizard soll diese Steps im Guided-Flow nicht nochmal fragen.
        for (const k of Object.keys(payload.parameters)) {
          this.answeredParams[k] = true;
        }
      }
      if (payload.coilGeometry) {
        this.coilGeometry = Object.assign(emptyCoilGeometry(), payload.coilGeometry);
      }
      if (payload.unitInputData) {
        this.unitInputData = mergeUnitInputData(emptyUnitInputData(), payload.unitInputData);
      }
      if (payload.unitSelectionOpts) {
        // In-place mergen (nicht ersetzen), damit die reaktive Referenz bleibt
        // und v-model-Bindings in unit-selection.vue live updaten.
        Object.assign(this.unitSelectionOpts, emptyUnitSelectionOpts(), payload.unitSelectionOpts);
      }
      if (payload.defrostOpts) {
        Object.assign(this.defrostOpts, emptyDefrostOpts(), payload.defrostOpts);
      }
      if (payload.productSection === 1 || payload.productSection === 2) {
        this.productSection = payload.productSection;
      }
      if (payload.currentCategory !== undefined) this.currentCategory = payload.currentCategory;
      if (payload.currentSubcategory !== undefined) this.currentSubcategory = payload.currentSubcategory;
      if (payload.selectedUnitKey !== undefined) this.selectedUnitKey = payload.selectedUnitKey;
    }
  },

  persist: {
    // Pinia-Plugin-Persisted-State Konfiguration. Nur client-seitig aktiv,
    // weil localStorage server-side nicht existiert.
    storage: import.meta.client ? localStorage : undefined,
    pick: [
      'activePerspective', 'unitSystem', 'project', 'parameters',
      'selectedProducts', 'selectedAccessories', 'service', 'selectedUnitKey',
      'currentCategory', 'currentSubcategory',
      'productSection', 'coilGeometry', 'unitInputData',
      'unitSelectionOpts', 'defrostOpts',
      'answeredParams', 'lastAppliedTemplateId', 'lastAppliedTemplateName'
    ]
  } as any  // pinia-plugin-persistedstate-Optionen sind aus Sicht von vanilla Pinia "extra"
});
