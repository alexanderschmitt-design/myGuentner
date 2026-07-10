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

  // Refrigerant
  refrigerant: string | null;
  refrigerantRegion: 'eu' | 'us' | 'apac' | null;

  // Application
  coolingPurpose: CoolingPurpose | null;
  defrostMethod: 'electric' | 'hot-gas' | 'air' | null;

  // Location
  installationType: InstallationType | null;
  ambientTempMaxC: number | null;
  ambientTempMinC: number | null;
  altitudeM: number | null;
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

function emptyParameters(): ConfigurationParameters {
  return {
    coolingCapacityKw: null,
    airflowM3h: null,
    evaporatingTempC: null,
    condensingTempC: null,
    refrigerant: null,
    refrigerantRegion: null,
    coolingPurpose: null,
    defrostMethod: null,
    installationType: null,
    ambientTempMaxC: null,
    ambientTempMinC: null,
    altitudeM: null,
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
    currentCategory: null as string | null,
    currentSubcategory: null as string | null
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
    resetWizard() {
      this.parameters = emptyParameters();
      this.validationWarnings = [];
      this.selectedProducts = [];
      this.currentCategory = null;
      this.currentSubcategory = null;
    }
  },

  persist: {
    // Pinia-Plugin-Persisted-State Konfiguration. Nur client-seitig aktiv,
    // weil localStorage server-side nicht existiert.
    storage: import.meta.client ? localStorage : undefined,
    pick: [
      'activePerspective', 'unitSystem', 'project', 'parameters',
      'selectedProducts', 'currentCategory', 'currentSubcategory'
    ]
  } as any  // pinia-plugin-persistedstate-Optionen sind aus Sicht von vanilla Pinia "extra"
});
