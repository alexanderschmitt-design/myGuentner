/**
 * myGPC — Parameter Presets
 * --------------------------
 * Kuratierte Use-Case-Konfigurationen pro Kühlzweck (CLAUDE.md §7).
 * Jedes Preset ist ein **partielles** UnitInputData-Patch, das auf den
 * Default aus `/defaultinputdata?productcategory=N` draufgelegt wird.
 *
 * Konsumenten:
 *  - Pillar A (Nuxt-Wizard): Step 1 zeigt Quick-Start-Cards, Click → Preset wird angewandt
 *  - Pillar C (LLM-Tools): `applyParameterPreset({presetId})` ruft das Patch ab
 *  - Pillar D (MCP, Folge-Phase): exposed als Resource
 *
 * Designprinzipien:
 *  1. Preset ist immer DELTA gegen den API-Default — nicht der vollständige State.
 *  2. Jedes Preset deklariert seine `applicableCategories` (welche productCategory-IDs sind kompatibel).
 *  3. Ein Preset darf mehrere Properties setzen, aber sollte THEMATISCH zusammengehörig sein
 *     (z.B. "Tiefkühl-Lager" = Temp + Defrost + EC fans + Coil Defender).
 *  4. Werte sind realistische Startpunkte. Echtwert-Spec kommt vom Anwender.
 *
 * Empirische Defaults (aus /defaultinputdata 2026-05-24):
 *   cat=0 DX     fluidID=2010 CO2, capacity=10kW, evap=-8, defrost=80 (Air)
 *   cat=1 Pump   fluidID=2009 NH3, capacity=5kW,  evap=-8, defrost=80
 *   cat=2 Coolant fluidID=4 Glykol, capacity=5kW, t_in/out via fluidInputMode=0
 *   cat=3 Condenser fluidID=2012 R404A, capacity=100kW, t_c=45
 *   cat=4 Dry cooler fluidID=4 Glykol, capacity=300kW, t_in/out
 *   cat=5 Subcooler fluidID=2012 R404A, capacity=50kW
 *   cat=6 Oil cooler fluidID=1002, capacity=20kW
 *   cat=10 CO2 GC fluidID=41, capacity=180kW, isSupercritic=true
 *
 * Stand: 2026-05-24 (Phase 1.3 nach `nach-der-api-agile-bachman.md`)
 */

import type { components } from '~/types/gpceu';
import type { ProductCategory } from '~/types/classes';

/** Untergeordneter Typ aus dem generierten Swagger-Schema */
type UnitInputDataLike = components['schemas']['UnitInputData'];

/** Kategorien-Kontext für Preset-Filterung in der UI */
export type CoolingPurpose =
  | 'cold-storage'        // Standard-Kühlraum 0..+5°C
  | 'deep-freeze'         // Tiefkühl-Lager / -Frostung
  | 'process-cooling'     // Industrieprozess
  | 'air-conditioning'    // Klimatisierung
  | 'data-center'         // IT-Kühlung
  | 'pharma-lab'          // Pharma / Labor
  | 'condensing'          // Wärmeabgabe / Verflüssiger
  | 'special';            // Spezial-Anwendungen

export interface ParameterPreset {
  /** Stable ID — wird von Tool-Calling und i18n-Keys referenziert */
  readonly id: string;
  /** Kurzes Display-Label */
  readonly label: string;
  /** Längere Beschreibung — Tooltip, Chat-Preview, Datasheet-Hinweis */
  readonly description: string;
  /** Welche productCategory-IDs ist dieses Preset kompatibel */
  readonly applicableCategories: ReadonlyArray<ProductCategory>;
  /** Primärer Kühlzweck (für UI-Filter) */
  readonly purpose: CoolingPurpose;
  /** Optionale weitere Tags für Suchbarkeit */
  readonly tags?: ReadonlyArray<string>;
  /** Die eigentlichen Parameter-Overrides, die ON TOP des API-Default angewandt werden */
  readonly partialUid: Partial<UnitInputDataLike>;
  /** Optional: empfohlene Perspective beim Anzeigen */
  readonly perspective?: 'technical' | 'application' | 'location';
}

// ============================================================
// Fluid-ID-Konstanten (verifiziert via GET /fluids 2026-05-24)
// ============================================================
export const FLUID_IDS = Object.freeze({
  // Refrigerants (cat 0/1/3/5)
  R744_CO2:       2010,   // hasImpact=true (low GWP)
  R717_NH3:       2009,   // hasImpact=true (natural)
  R290_PROPANE:   2015,   // hasImpact=true (natural, A3 flammable)
  R600_BUTANE:    2036,   // hasImpact=true
  R600A_ISOBUTANE: 2037,  // hasImpact=true
  R134A:          2011,   // hasImpact=false (GWP 1430)
  R404A:          2012,   // hasImpact=false (GWP 3922, legacy)
  R407A:          2022,   // hasImpact=false
  R407C:          2013,   // hasImpact=false
  R407F:          2032,   // hasImpact=false
  R448A:          2041,   // hasImpact=false (HFC-Blend, GWP 1387)
  R449A:          2038,   // hasImpact=false
  R452A:          2039,   // hasImpact=false

  // Coolants (cat 2/4)
  WATER:          1,      // nominaler Index — actual via API discovery
  ETHYLENE_GLYCOL: 4,     // cat=2 default
  PROPYLENE_GLYCOL: 5,    // nominaler Index — actual via API discovery

  // Oil (cat 6)
  OIL_ISO_46:     1002,   // cat=6 default

  // CO2 Gas cooler (cat 10) — special wrapper fluid
  CO2_GAS_COOLER: 41,
});

// ============================================================
// Enum-Konstanten (aus PDF #49 Defrosting, #186 MotorTech)
// ============================================================
export const DEFROST = Object.freeze({
  NONE:            0,
  AIR:             80,
  ELECTRIC_KIT:    258,
  ELECTRIC_FACTORY: 263,
  HOTGAS:          264,
  WARM_BRINE:      265,
  ELECTRIC_EFFICIENT: 339,
});

export const MOTOR_TECH = Object.freeze({
  ALL:           -1,
  ENERGY_OPT:    -2,
  COST_OPT:      -3,
  AC:            1,
  EC:            2,
});

// ============================================================
// Preset-Library
// ============================================================
export const PRESETS: ReadonlyArray<ParameterPreset> = Object.freeze([
  // --------------------------------------------------------
  // COLD STORAGE — Obst & Gemüse
  // --------------------------------------------------------
  {
    id: 'cold-storage-fruit-vegetables',
    label: 'Cold storage — fruit & vegetables (+0 °C)',
    description: 'Standard cooling chamber for fresh produce. High humidity (~90%) to prevent dehydration. Air defrost preserves storage atmosphere.',
    applicableCategories: [0],
    purpose: 'cold-storage',
    tags: ['fruit', 'vegetable', 'produce', 'fresh'],
    perspective: 'application',
    partialUid: {
      fluidID: FLUID_IDS.R448A,
      thermalCapacity: 15000,   // 15 kW typical for medium chamber
      fluidTempEvap: 0,
      airTemperature: 5,
      airRelHumidity: 90,
      defrosting: DEFROST.AIR,
      motorTechnology: MOTOR_TECH.EC,
    },
  },
  {
    id: 'cold-storage-fruit-with-streamer',
    label: 'Cold storage with Güntner Streamer',
    description: 'Same as fruit/vegetables cold storage but with extended air-throw via Güntner Streamer — improves humidity uniformity in large rooms.',
    applicableCategories: [0],
    purpose: 'cold-storage',
    tags: ['fruit', 'large-room', 'streamer'],
    perspective: 'application',
    partialUid: {
      fluidID: FLUID_IDS.R448A,
      thermalCapacity: 18000,
      fluidTempEvap: 0,
      airTemperature: 5,
      airRelHumidity: 90,
      defrosting: DEFROST.AIR,
      motorTechnology: MOTOR_TECH.EC,
      GuentnerStreamer: 1,
    },
  },

  // --------------------------------------------------------
  // COLD STORAGE — Fleisch & Fisch
  // --------------------------------------------------------
  {
    id: 'cold-storage-meat-fish',
    label: 'Cold storage — meat & fish (-2 °C)',
    description: 'Chilled storage near 0°C. Stainless steel finish for hygiene; no air defrost (frost is minimal at this temp range).',
    applicableCategories: [0],
    purpose: 'cold-storage',
    tags: ['meat', 'fish', 'protein', 'hygiene'],
    perspective: 'application',
    partialUid: {
      fluidID: FLUID_IDS.R448A,
      thermalCapacity: 12000,
      fluidTempEvap: -8,
      airTemperature: -2,
      airRelHumidity: 80,
      defrosting: DEFROST.AIR,
      motorTechnology: MOTOR_TECH.EC,
      coil_Defender: 1,        // powder-coated for hygiene
    },
  },
  {
    id: 'cold-storage-meat-hygienic',
    label: 'Hygienic meat & fish (stainless steel double tray)',
    description: 'Premium hygienic build: stainless steel double tray + Coil Defender for prolonged service in food-contact zones.',
    applicableCategories: [0],
    purpose: 'cold-storage',
    tags: ['meat', 'fish', 'hygiene', 'stainless'],
    perspective: 'application',
    partialUid: {
      fluidID: FLUID_IDS.R448A,
      thermalCapacity: 12000,
      fluidTempEvap: -8,
      airTemperature: -2,
      defrosting: DEFROST.AIR,
      motorTechnology: MOTOR_TECH.EC,
      coil_Defender: 1,
      casingAndDoubleTray: 1,  // stainless steel double tray
    },
  },

  // --------------------------------------------------------
  // DEEP FREEZE
  // --------------------------------------------------------
  {
    id: 'deep-freeze-storage',
    label: 'Deep freeze storage (-25 °C)',
    description: 'Long-term frozen storage. Hot-gas defrost reuses compressor waste heat (energy-efficient). EC fans for variable load.',
    applicableCategories: [0],
    purpose: 'deep-freeze',
    tags: ['frozen', 'long-term', 'storage'],
    perspective: 'application',
    partialUid: {
      fluidID: FLUID_IDS.R448A,
      thermalCapacity: 20000,
      fluidTempEvap: -32,
      airTemperature: -25,
      defrosting: DEFROST.HOTGAS,
      motorTechnology: MOTOR_TECH.EC,
      coil_Defender: 1,
    },
  },
  {
    id: 'deep-freeze-blast-nh3',
    label: 'Blast freezing -35 °C (NH₃ Pump)',
    description: 'Fast freezing for industrial food processing. NH₃ pump-fed system with gravity-flooded option for highest efficiency at extreme cold.',
    applicableCategories: [1],
    purpose: 'deep-freeze',
    tags: ['blast', 'industrial', 'nh3', 'ammonia'],
    perspective: 'technical',
    partialUid: {
      fluidID: FLUID_IDS.R717_NH3,
      thermalCapacity: 80000,
      fluidTempEvap: -38,
      airTemperature: -35,
      fluidPumpMode: 0,        // pump-driven (0 = pump, 1 = gravity)
      fluidPumpRate: 4.0,
      defrosting: DEFROST.HOTGAS,
      motorTechnology: MOTOR_TECH.EC,
      mountedLegs: 1,
      mountedLegsSS: 1,        // stainless steel legs
    },
  },
  {
    id: 'deep-freeze-low-temp',
    label: 'Low evap. temp. design (t₀ < -40 °C)',
    description: 'Special design for ultra-low evaporation temperatures (cryogenic-adjacent). Heavy electric defrost for coil + tray.',
    applicableCategories: [0],
    purpose: 'deep-freeze',
    tags: ['cryogenic', 'low-temp', 't0<-40'],
    perspective: 'technical',
    partialUid: {
      fluidID: FLUID_IDS.R448A,
      thermalCapacity: 25000,
      fluidTempEvap: -45,
      airTemperature: -38,
      defrosting: DEFROST.ELECTRIC_FACTORY,
      motorTechnology: MOTOR_TECH.EC,
      lowEvapTempDesign: 1,
    },
  },

  // --------------------------------------------------------
  // BEVERAGES / DAIRY / PHARMA
  // --------------------------------------------------------
  {
    id: 'beverages-dairy',
    label: 'Beverages & dairy (+2 °C)',
    description: 'Standard cooling for beverage warehouses and dairy storage. Low noise for indoor distribution centers.',
    applicableCategories: [0],
    purpose: 'cold-storage',
    tags: ['beverages', 'dairy', 'logistics'],
    perspective: 'application',
    partialUid: {
      fluidID: FLUID_IDS.R448A,
      thermalCapacity: 15000,
      fluidTempEvap: -5,
      airTemperature: 2,
      defrosting: DEFROST.AIR,
      motorTechnology: MOTOR_TECH.EC,
      soundPressureMax: 50,
      efficiencyClass: 'A',
    },
  },
  {
    id: 'pharma-laboratory',
    label: 'Pharma / laboratory (+5 °C)',
    description: 'Pharmaceutical cold storage with validation requirements. Redundant cooling (use noOfDevices=2). Efficient EC fans, low-GWP R134a alternative.',
    applicableCategories: [0],
    purpose: 'pharma-lab',
    tags: ['pharma', 'lab', 'validation', 'redundancy'],
    perspective: 'application',
    partialUid: {
      fluidID: FLUID_IDS.R134A,
      thermalCapacity: 8000,
      fluidTempEvap: -2,
      airTemperature: 5,
      defrosting: DEFROST.AIR,
      motorTechnology: MOTOR_TECH.EC,
      noOfDevices: 2,          // redundancy
      efficiencyClass: 'A+',
    },
  },

  // --------------------------------------------------------
  // INDUSTRIAL PROCESS
  // --------------------------------------------------------
  {
    id: 'industrial-nh3-pump',
    label: 'Industrial process — NH₃ pump',
    description: 'Industrial process cooling with NH₃ pump-fed system. Often floor-mounted in machine rooms.',
    applicableCategories: [1],
    purpose: 'process-cooling',
    tags: ['industrial', 'nh3', 'process'],
    perspective: 'technical',
    partialUid: {
      fluidID: FLUID_IDS.R717_NH3,
      thermalCapacity: 50000,
      fluidTempEvap: -10,
      airTemperature: -5,
      fluidPumpMode: 0,
      fluidPumpRate: 3.5,
      motorTechnology: MOTOR_TECH.EC,
      mountedLegs: 1,
      mountedLegsGS: 1,        // galvanised steel legs
    },
  },
  {
    id: 'industrial-glycol-cooling',
    label: 'Industrial process — glycol coolant',
    description: 'Industrial process using a secondary glycol-water loop. Inlet/outlet temperature mode is the standard for coolant flows.',
    applicableCategories: [2],
    purpose: 'process-cooling',
    tags: ['glycol', 'brine', 'process', 'secondary-loop'],
    perspective: 'technical',
    partialUid: {
      fluidID: FLUID_IDS.ETHYLENE_GLYCOL,
      fluidVolConcentration: 34,
      thermalCapacity: 80000,
      fluidInputMode: 0,       // Inlet/Outlet temperature
      fluidTempInlet: -10,
      fluidTempOutlet: -5,
      airTemperature: 10,
      motorTechnology: MOTOR_TECH.EC,
    },
  },

  // --------------------------------------------------------
  // CONDENSING / WÄRMEABGABE
  // --------------------------------------------------------
  {
    id: 'condenser-standard-outdoor',
    label: 'Condenser standard +35 °C outdoor',
    description: 'Standard heat rejection condenser for typical European summer design (Tamb=35°C, tc=45°C). Multi-circuit option available.',
    applicableCategories: [3],
    purpose: 'condensing',
    tags: ['condenser', 'outdoor', 'summer'],
    perspective: 'location',
    partialUid: {
      fluidID: FLUID_IDS.R448A,
      thermalCapacity: 150000,
      fluidTempCond: 45,
      airTemperature: 35,
      motorTechnology: MOTOR_TECH.EC,
    },
  },
  {
    id: 'condenser-high-ambient',
    label: 'Condenser high ambient (+45 °C)',
    description: 'For hot climates (Middle East, southern Spain summer peaks). Higher capacity to compensate, EC fans mandatory for stable operation.',
    applicableCategories: [3],
    purpose: 'condensing',
    tags: ['hot-climate', 'high-ambient', 'tropical'],
    perspective: 'location',
    partialUid: {
      fluidID: FLUID_IDS.R448A,
      thermalCapacity: 200000,
      fluidTempCond: 55,
      airTemperature: 45,
      motorTechnology: MOTOR_TECH.EC,
      corrosionProtectionClass: 335,  // Class 4
    },
  },
  {
    id: 'condenser-multi-circuit',
    label: 'Condenser multi-circuit (parallel compressors)',
    description: 'Two parallel refrigerant circuits — typical for rack systems with multiple compressors. Activates _2-suffix fields.',
    applicableCategories: [3],
    purpose: 'condensing',
    tags: ['multi-circuit', 'rack', 'parallel'],
    perspective: 'technical',
    partialUid: {
      fluidID: FLUID_IDS.R448A,
      thermalCapacity: 200000,
      fluidTempCond: 45,
      airTemperature: 35,
      motorTechnology: MOTOR_TECH.EC,
      multipleCircuits: 1,
      noOfCircuitsThermo: 2,
    },
  },
  {
    id: 'condenser-with-subcooler',
    label: 'Condenser with integrated subcooler',
    description: 'Built-in subcooling stage (~3 K) downstream of condensation — improves expansion valve performance and overall COP.',
    applicableCategories: [3],
    purpose: 'condensing',
    tags: ['subcooler', 'integrated', 'cop-optimization'],
    perspective: 'technical',
    partialUid: {
      fluidID: FLUID_IDS.R448A,
      thermalCapacity: 150000,
      fluidTempCond: 45,
      airTemperature: 35,
      motorTechnology: MOTOR_TECH.EC,
      subcooler: 1,
      miniumRequiredSubcooling: 3,
    },
  },
  {
    id: 'subcooler-dedicated',
    label: 'Subcooler — dedicated unit',
    description: 'Standalone subcooler unit (cat=5). Uses Inlet/Outlet temperature mode rather than dew point.',
    applicableCategories: [5],
    purpose: 'condensing',
    tags: ['subcooler', 'standalone'],
    perspective: 'technical',
    partialUid: {
      fluidID: FLUID_IDS.R448A,
      thermalCapacity: 30000,
      fluidInputMode: 0,
      fluidTempInlet: 45,
      fluidTempOutlet: 38,
      airTemperature: 32,
      motorTechnology: MOTOR_TECH.EC,
    },
  },
  {
    id: 'drycooler-glycol-outdoor',
    label: 'Dry cooler — glycol, outdoor',
    description: 'Outdoor glycol heat rejection. THREAD/FLANGE connections, corrosion protection for weather exposure.',
    applicableCategories: [4],
    purpose: 'condensing',
    tags: ['dry-cooler', 'glycol', 'outdoor'],
    perspective: 'location',
    partialUid: {
      fluidID: FLUID_IDS.ETHYLENE_GLYCOL,
      fluidVolConcentration: 34,
      thermalCapacity: 250000,
      fluidInputMode: 0,
      fluidTempInlet: 45,
      fluidTempOutlet: 40,
      airTemperature: 32,
      motorTechnology: MOTOR_TECH.EC,
      corrosionProtectionClass: 335,
    },
  },
  {
    id: 'oilcooler-industrial',
    label: 'Oil cooler — industrial',
    description: 'Cooling for compressor or hydraulic oil systems. Lower capacities, no humidity considerations.',
    applicableCategories: [6],
    purpose: 'process-cooling',
    tags: ['oil', 'compressor', 'hydraulic'],
    perspective: 'technical',
    partialUid: {
      fluidID: FLUID_IDS.OIL_ISO_46,
      thermalCapacity: 25000,
      fluidInputMode: 0,
      fluidTempInlet: 60,
      fluidTempOutlet: 50,
      airTemperature: 32,
      motorTechnology: MOTOR_TECH.EC,
    },
  },
  {
    id: 'co2-gas-cooler-transcritical',
    label: 'CO₂ gas cooler — transcritical',
    description: 'Supercritical CO₂ heat rejection (Tamb ≥ 25°C). HBLK valve, high-pressure 92 bar operation. Future-proof natural refrigerant.',
    applicableCategories: [10],
    purpose: 'condensing',
    tags: ['co2', 'transcritical', 'supercritical', 'natural'],
    perspective: 'technical',
    partialUid: {
      fluidID: FLUID_IDS.CO2_GAS_COOLER,
      thermalCapacity: 200000,
      fluidPressure: 92000,    // 92 bar in mbar
      isSupercritic: true,
      airTemperature: 35,
      motorTechnology: MOTOR_TECH.EC,
    },
  },
  {
    id: 'co2-gas-cooler-subcritical',
    label: 'CO₂ gas cooler — subcritical mode',
    description: 'CO₂ at low ambient temperatures where condensation occurs (below 31°C critical point). Subcritical operation is more efficient when possible.',
    applicableCategories: [10],
    purpose: 'condensing',
    tags: ['co2', 'subcritical', 'low-ambient', 'natural'],
    perspective: 'technical',
    partialUid: {
      fluidID: FLUID_IDS.CO2_GAS_COOLER,
      thermalCapacity: 180000,
      isSubcritic: true,
      subcriticAirTemperature: 5,
      subcriticFluidTempCond: 10,
      motorTechnology: MOTOR_TECH.EC,
    },
  },

  // --------------------------------------------------------
  // AIR CONDITIONING / DATA CENTER
  // --------------------------------------------------------
  {
    id: 'comfort-cooling',
    label: 'Comfort cooling (chiller +7 °C)',
    description: 'Building air conditioning via chilled-water loop. Low noise (<55 dB) for office use; glycol concentration only for freeze protection in winter mode.',
    applicableCategories: [2],
    purpose: 'air-conditioning',
    tags: ['comfort', 'building', 'office', 'chiller'],
    perspective: 'application',
    partialUid: {
      fluidID: FLUID_IDS.ETHYLENE_GLYCOL,
      fluidVolConcentration: 30,
      thermalCapacity: 60000,
      fluidInputMode: 0,
      fluidTempInlet: 7,
      fluidTempOutlet: 12,
      airTemperature: 25,
      motorTechnology: MOTOR_TECH.EC,
      soundPressureMax: 55,
      efficiencyClass: 'A',
    },
  },
  {
    id: 'datacenter-aircooled',
    label: 'Data center — air-cooled (sound-critical)',
    description: 'IT room cooling with strict noise budget. Glycol loop with high concentration for redundancy resilience.',
    applicableCategories: [2],
    purpose: 'data-center',
    tags: ['datacenter', 'IT', 'sound-critical', 'redundancy'],
    perspective: 'application',
    partialUid: {
      fluidID: FLUID_IDS.ETHYLENE_GLYCOL,
      fluidVolConcentration: 34,
      thermalCapacity: 100000,
      fluidInputMode: 0,
      fluidTempInlet: 18,
      fluidTempOutlet: 25,
      airTemperature: 32,
      motorTechnology: MOTOR_TECH.EC,
      soundPressureMax: 55,
      efficiencyClass: 'A+',
      noOfDevices: 2,
    },
  },
  {
    id: 'datacenter-raised-floor',
    label: 'Data center — raised-floor CRAC-style',
    description: 'Compact in-row coolers near server racks. Cool 12°C return, 18°C supply (modern hot/cold-aisle setup).',
    applicableCategories: [2],
    purpose: 'data-center',
    tags: ['datacenter', 'raised-floor', 'CRAC', 'hot-aisle'],
    perspective: 'application',
    partialUid: {
      fluidID: FLUID_IDS.ETHYLENE_GLYCOL,
      fluidVolConcentration: 30,
      thermalCapacity: 50000,
      fluidInputMode: 0,
      fluidTempInlet: 12,
      fluidTempOutlet: 18,
      airTemperature: 27,
      motorTechnology: MOTOR_TECH.EC,
      unitHeightMax: 2.2,      // restrict for raised floor
    },
  },

  // --------------------------------------------------------
  // SPECIAL / CROSS-CATEGORY
  // --------------------------------------------------------
  {
    id: 'coastal-corrosion',
    label: 'Coastal / saline environment',
    description: 'Increased corrosion protection for coastal sites (salt aerosol). Stainless legs, Coil Defender, corrosion class 4.',
    applicableCategories: [0, 1, 2, 3, 4],
    purpose: 'special',
    tags: ['coastal', 'salt', 'corrosion', 'maritime'],
    perspective: 'location',
    partialUid: {
      coil_Defender: 1,
      corrosionProtectionClass: 335,
      mountedLegsSS: 1,
      specialVarnishing: 1,
    },
  },
  {
    id: 'atex-zone-natural-refrigerant',
    label: 'ATEX zone — natural refrigerant only',
    description: 'For installations in explosion-protected zones: only natural refrigerants (NH₃ or R290 propane). Restricted charge limits.',
    applicableCategories: [0, 1],
    purpose: 'special',
    tags: ['atex', 'explosion', 'natural', 'r290', 'nh3'],
    perspective: 'location',
    partialUid: {
      fluidID: FLUID_IDS.R290_PROPANE,
      thermalCapacity: 20000,
      fluidTempEvap: -8,
      airTemperature: 0,
      motorTechnology: MOTOR_TECH.EC,
    },
  },
  {
    id: 'low-noise-indoor',
    label: 'Low-noise indoor (≤ 45 dB(A))',
    description: 'Strict indoor noise limit (residential, hospital, school). EC fans + sound absorbers achieve <45 dB(A) at 3 m.',
    applicableCategories: [0, 1, 2, 3, 4],
    purpose: 'special',
    tags: ['low-noise', 'residential', 'hospital'],
    perspective: 'location',
    partialUid: {
      soundPressureMax: 45,
      soundPressureDistance: 3,
      motorTechnology: MOTOR_TECH.EC,
      controllerType: 7,       // GMM EC for speed control
    },
  },
  {
    id: 'high-efficiency-aplus',
    label: 'High-efficiency A++ class',
    description: 'Maximum energy efficiency. EC fans, efficiency-class filter A++ (excludes lower-class units from search).',
    applicableCategories: [0, 1, 2, 3, 4, 5, 6, 10],
    purpose: 'special',
    tags: ['efficiency', 'energy', 'erp', 'a++'],
    perspective: 'application',
    partialUid: {
      motorTechnology: MOTOR_TECH.EC,
      efficiencyClass: 'A++',
      erP_Compliant: true,
    },
  },
  {
    id: 'transport-container-fit',
    label: 'Transport by container (≤ 11.8 m)',
    description: 'Unit dimensions constrained to standard 40 ft container (11.8 × 2.3 × 2.55 m). Sets transport rail flags.',
    applicableCategories: [3, 4],
    purpose: 'special',
    tags: ['container', 'transport', 'logistics'],
    perspective: 'location',
    partialUid: {
      isContainerTransport: true,
      unitLengthMax: 11.8,
      unitWidthMax: 2.3,
      unitHeightMax: 2.55,
    },
  },
] as const);

// ============================================================
// Public API
// ============================================================

const BY_ID: ReadonlyMap<string, ParameterPreset> = new Map(PRESETS.map((p) => [p.id, p]));

/** Liefert ein Preset zu seiner ID. */
export function getPreset(id: string | null | undefined): ParameterPreset | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

/** Alle Presets (für Iteration in der UI). */
export function getAllPresets(): ReadonlyArray<ParameterPreset> {
  return PRESETS;
}

/**
 * Presets, die zur gegebenen ProductCategory passen.
 * Reihenfolge entspricht PRESETS-Definition.
 */
export function getPresetsForCategory(category: ProductCategory): ParameterPreset[] {
  return PRESETS.filter((p) => p.applicableCategories.includes(category));
}

/** Presets eines Kühlzwecks (für UI-Filter "Cold storage", "Deep freeze", …). */
export function getPresetsByPurpose(purpose: CoolingPurpose): ParameterPreset[] {
  return PRESETS.filter((p) => p.purpose === purpose);
}

/** Free-Text-Suche über id/label/description/tags. */
export function searchPresets(query: string): ParameterPreset[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return PRESETS.filter((p) => {
    if (p.id.toLowerCase().includes(q)) return true;
    if (p.label.toLowerCase().includes(q)) return true;
    if (p.description.toLowerCase().includes(q)) return true;
    if (p.tags && p.tags.some((t) => t.toLowerCase().includes(q))) return true;
    return false;
  });
}

/** Anzahl der Presets (für Sanity-Checks / Tests). */
export const PRESET_COUNT = PRESETS.length;
