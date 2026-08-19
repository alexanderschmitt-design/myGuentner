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
  unitInputDataFromLegacyParameters
} from '~/utils/unitInputDataMapper';

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
  glycolType: 'ethylene' | 'propylene' | 'water' | null;
  concentrationVolPct: number | null;
  inletTempC: number | null;
  outletTempC: number | null;
  parameterMode: 'inlet-outlet' | 'inlet-temperature-lift' | 'outlet-temperature-lift';

  // Shared
  calculationMode: 'fixed-capacity' | 'fixed-surface';
  minSurfaceReserve: number;
  maxSurfaceReserve: number;
  frostThicknessMm: number;
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
  return {
    onlyErpCompliant: false,
    powerSupply: 0,
    motorTechnology: -3,
    minimumEnergyEfficiencyClass: 0,
    maxOperatingPressure: 0,
    coreTubeMaterial: '0',
    airBlowDirection: 0,
    defrostingType: 1,
    hotGasInterconnectingTubing: false,
    airVelocityClass: 0,
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
    environmentClass: 'standard'
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
    // Unit Selection Options-Accordion state (vorher lokaler reactive in
    // unit-selection.vue). Ins Pinia gehoben, damit Template-Save/Load die
    // Checkbox-Werte erfasst.
    unitSelectionOpts: emptyUnitSelectionOpts() as UnitSelectionOpts,
    defrostOpts: emptyDefrostOpts() as DefrostOpts
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
      return mergeUnitInputData(
        this.unitInputData,
        unitInputDataFromLegacyParameters(this.parameters)
      );
    }
  },

  actions: {
    setPerspective(p: Perspective) { this.activePerspective = p; },
    setUnitSystem(s: 'us' | 'si') { this.unitSystem = s; },
    updateParameters(patch: Partial<ConfigurationParameters>) {
      Object.assign(this.parameters, patch);
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
    resetWizard() {
      this.parameters = emptyParameters();
      this.validationWarnings = [];
      this.selectedProducts = [];
      this.selectedAccessories = [];
      this.service = emptyService();
      this.selectedUnitKey = null;
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
      'unitSelectionOpts', 'defrostOpts'
    ]
  } as any  // pinia-plugin-persistedstate-Optionen sind aus Sicht von vanilla Pinia "extra"
});
