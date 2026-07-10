/* ============================================================
   myGPS — Flow Configuration
   Maps categories and sub-categories to wizard step lists.
   Loaded as a global on every myGPS page.
   ============================================================ */

(function () {

  // Master list of all available steps. Used by every flow as a default.
  // Order here is the canonical order shown in the step-wizard.
  const STEP_DEFINITIONS = {
    projects:    { label: 'Project Info',         file: 'mygps-projects.html'    },
    inputs:      { label: 'Selector Inputs',      file: 'mygps-inputs.html'      },
    accessories: { label: 'Options & Accessories',file: 'mygps-accessories.html' },
    service:     { label: 'Service & Pricing',    file: 'mygps-service.html'     },
    output:      { label: 'Selector Output',      file: 'mygps-output.html'      },
    annual:      { label: 'Annual Analysis',      file: 'mygps-annual.html'      },
    datasheet:   { label: 'Datasheet',            file: 'mygps-datasheet.html'   }
  };

  const FULL_STEPS = ['projects', 'inputs', 'accessories', 'service', 'output', 'annual', 'datasheet'];

  // Category → sub-category → step list.
  // Each sub-category may override `steps` to drop or reorder steps for that flow.
  const FLOWS = {
    'evaporative': {
      label: 'Evaporative Products',
      image: 'images/Evaporator-Pump.png',
      icon:  'images/icon-pump.svg',
      subcategories: {
        'condenser':    { label: 'Evaporative Condenser',     steps: FULL_STEPS },
        'fluid-cooler': { label: 'Evaporative Fluid Coolers', steps: FULL_STEPS }
      }
    },
    'adiabatic': {
      label: 'Adiabatic Products',
      image: 'images/Condenser.png',
      icon:  'images/icon-condenser.svg',
      subcategories: {
        'condenser':      { label: 'Adiabatic Condensers',      steps: FULL_STEPS },
        'fluid-cooler':   { label: 'Adiabatic Fluid Coolers',   steps: FULL_STEPS },
        'co2-gas-cooler': { label: 'Adiabatic CO2 Gas Coolers', steps: FULL_STEPS }
      }
    },
    'high-density': {
      label: 'High-Density Products',
      image: 'images/Gas-Cooler.png',
      icon:  'images/icon-gascooler.svg',
      subcategories: {
        'fluid-cooler': { label: 'Adiabatic Fluid Coolers', steps: FULL_STEPS },
        'condenser':    { label: 'Adiabatic Condensers',    steps: FULL_STEPS }
      }
    },
    'dry': {
      label: 'Dry Products',
      image: 'images/Drycooler.png',
      icon:  'images/icon-dry.svg',
      subcategories: {
        'condenser': { label: 'Dry Condensers', steps: FULL_STEPS }
      }
    },
    'air-cooler': {
      label: 'Air Cooler Products',  // also referred to as Data Center
      image: 'images/Aircooler.png',
      icon:  'images/icon-aircooler.svg',
      subcategories: null,           // no sub-category modal — direct entry
      steps: FULL_STEPS
    }
  };

  function resolveSteps(cat, sub) {
    const c = FLOWS[cat];
    if (!c) return FULL_STEPS;
    if (c.subcategories && sub && c.subcategories[sub]) {
      return c.subcategories[sub].steps || FULL_STEPS;
    }
    return c.steps || FULL_STEPS;
  }

  function resolveLabels(cat, sub) {
    const c = FLOWS[cat];
    if (!c) return { category: '', subcategory: '' };
    const subEntry = c.subcategories && sub ? c.subcategories[sub] : null;
    return {
      category: c.label,
      subcategory: subEntry ? subEntry.label : ''
    };
  }

  // Expose globally
  window.MYGPS = {
    STEP_DEFINITIONS: STEP_DEFINITIONS,
    FULL_STEPS: FULL_STEPS,
    FLOWS: FLOWS,
    resolveSteps: resolveSteps,
    resolveLabels: resolveLabels
  };

})();
