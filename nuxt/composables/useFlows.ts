/**
 * useFlows — kategorie-spezifische Step-Konfigurationen für den myGPS-Wizard.
 * Portiert aus frontend/mygps-flows.js gemäß Planning.md §6.1.
 *
 * Pro Kategorie und Unterkategorie kann sich das Step-Set unterscheiden. MVP
 * (Planning.md §6.3): Evaporative Products → Condenser durchläuft den vollen
 * 8-Step-Pfad, die anderen erben dieselbe Liste.
 */

export type StepId =
  | 'projects' | 'inputs' | 'accessories' | 'service'
  | 'output' | 'annual' | 'datasheet';

export interface Subcategory {
  label: string;
  steps: StepId[];
}

export interface Category {
  slug: string;
  label: string;
  image: string;
  subcategories: Record<string, Subcategory> | null;  // null = direkter Wizard-Einstieg
  steps?: StepId[];  // nur gesetzt, wenn subcategories null
}

const FULL_STEPS: StepId[] = [
  'projects', 'inputs', 'accessories', 'service', 'output', 'annual', 'datasheet'
];

export const MYGPS_FLOWS: Record<string, Category> = {
  evaporative: {
    slug: 'evaporative',
    label: 'Evaporative Products',
    image: '/app/images/mygps/cat-evaporative.jpg',
    subcategories: {
      condenser:    { label: 'Evaporative Condenser',     steps: FULL_STEPS },
      'fluid-cooler': { label: 'Evaporative Fluid Coolers', steps: FULL_STEPS }
    }
  },
  adiabatic: {
    slug: 'adiabatic',
    label: 'Adiabatic Products',
    image: '/app/images/mygps/cat-adiabatic.jpg',
    subcategories: {
      condenser:       { label: 'Adiabatic Condensers',       steps: FULL_STEPS },
      'fluid-cooler':  { label: 'Adiabatic Fluid Coolers',    steps: FULL_STEPS },
      'co2-gas-cooler': { label: 'Adiabatic CO2 Gas Coolers', steps: FULL_STEPS }
    }
  },
  'high-density': {
    slug: 'high-density',
    label: 'High-Density Products',
    image: '/app/images/mygps/cat-high-density.jpg',
    subcategories: {
      'fluid-cooler': { label: 'Adiabatic Fluid Coolers', steps: FULL_STEPS },
      condenser:      { label: 'Adiabatic Condensers',    steps: FULL_STEPS }
    }
  },
  dry: {
    slug: 'dry',
    label: 'Dry Products',
    image: '/app/images/mygps/cat-dry.jpg',
    subcategories: {
      condenser: { label: 'DryCondensers', steps: FULL_STEPS }
    }
  },
  'air-cooler': {
    slug: 'air-cooler',
    label: 'Air Cooler Products',
    image: '/app/images/mygps/cat-air-cooler.jpg',
    subcategories: null,
    steps: FULL_STEPS
  }
};

const STEP_LABELS: Record<StepId, string> = {
  projects:    'Project Info',
  inputs:      'Selector Inputs',
  accessories: 'Options & Accessories',
  service:     'Service & Pricing',
  output:      'Selector Output',
  annual:      'Annual Analysis',
  datasheet:   'Datasheet'
};

const STEP_ROUTES: Record<StepId, string> = {
  projects:    '/mygps/projects',
  inputs:      '/mygps/inputs',
  accessories: '/mygps/accessories',
  service:     '/mygps/service',
  output:      '/mygps/output',
  annual:      '/mygps/annual',
  datasheet:   '/mygps/datasheet'
};

export function useFlows() {
  const store = useConfigStore();

  function categoryFor(slug: string | null): Category | null {
    if (!slug) return null;
    return MYGPS_FLOWS[slug] || null;
  }

  function stepsFor(slug: string | null, sub: string | null): StepId[] {
    const cat = categoryFor(slug);
    if (!cat) return FULL_STEPS;
    if (cat.subcategories === null) return cat.steps || FULL_STEPS;
    if (!sub) return FULL_STEPS;
    return cat.subcategories[sub]?.steps || FULL_STEPS;
  }

  function activeSteps(): StepId[] {
    return stepsFor(store.currentCategory, store.currentSubcategory);
  }

  function nextRoute(current: StepId): string | null {
    const seq = activeSteps();
    const i = seq.indexOf(current);
    if (i === -1 || i === seq.length - 1) return null;
    return STEP_ROUTES[seq[i + 1]];
  }

  function prevRoute(current: StepId): string | null {
    const seq = activeSteps();
    const i = seq.indexOf(current);
    if (i <= 0) return null;
    return STEP_ROUTES[seq[i - 1]];
  }

  return {
    flows: MYGPS_FLOWS,
    stepLabels: STEP_LABELS,
    stepRoutes: STEP_ROUTES,
    categoryFor,
    stepsFor,
    activeSteps,
    nextRoute,
    prevRoute
  };
}
