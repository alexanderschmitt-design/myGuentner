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
  altitudeM: number;
  airPressureMbar: number;
  capacityWithHumidityFactor: boolean;

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
    altitudeM: 0,
    airPressureMbar: 1013,
    capacityWithHumidityFactor: false,

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
    coilGeometry: emptyCoilGeometry() as CoilGeometryConfig
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
      'productSection', 'coilGeometry'
    ]
  } as any  // pinia-plugin-persistedstate-Optionen sind aus Sicht von vanilla Pinia "extra"
});
