/**
 * myGPC — Parameter Definitions
 * ------------------------------
 * Erweitert die 222 UnitInputData-Properties aus `rag/gpc-parameters.json`
 * (PDF-Doku) um Perspective-Labels (technical/application/location, CLAUDE.md §3)
 * und Class-Visibility (welche Property in welcher der 8 Architektur-Klassen sichtbar/required ist).
 *
 * Diese Datei ist die **Single Source of Truth** für:
 *   - Pillar A (Nuxt-Wizard): ParameterInput.vue liest Label/Hint/Type/Enums hier
 *   - Pillar C (LLM-Tools): tool-definitions.js generiert Tool-Schemas aus diesen Definitionen
 *
 * Stand: 2026-05-24 (Phase 1.1 nach Plan `nach-der-api-agile-bachman.md`)
 */

// Nuxt/Vite resolvt JSON-Imports nativ — assert-Syntax wird nicht benötigt.
// Relativer Pfad zum rag/-Ordner außerhalb von nuxt/.
import rawData from '../../rag/gpc-parameters.json';
import type { ClassId } from '~/types/classes';
import { ALL_CLASSES, isColdSide } from '~/types/classes';

// ============================================================
// Raw-JSON-Typen — spiegelt die Struktur aus rag/build-gpc-parameters.js
// ============================================================
export type Datatype = 'Int32' | 'Int64' | 'Double' | 'Boolean' | 'String' | 'List`1';
export type Group =
  | 'Thermodynamics' | 'Options' | 'Limitations' | 'Startpage'
  | 'Recalculation' | 'Hydro' | 'Extras' | 'UnitSelection' | 'Unknown';

interface PdfEnum {
  value: string;
  description: string;
  _override?: boolean;
}

interface PdfParameter {
  seq: number;
  name: string;
  unit: string | null;
  datatype: Datatype;
  group: Group;
  description: string;
  enums: PdfEnum[];
  productCategories: number[] | null;
}

interface PdfData {
  source: string;
  version: string;
  generated: string;
  count: number;
  productCategoryNames: Record<string, string>;
  parameters: PdfParameter[];
}

const RAW: PdfData = rawData as PdfData;

// ============================================================
// Public Types
// ============================================================
export type Priority = 'required' | 'optional' | 'hidden';
export type Perspective = 'technical' | 'application' | 'location';

export interface PerspectiveMeta {
  label: string;
  hint?: string;
  priority: Priority;
}

export interface NormalizedEnum {
  /** Numerischer Wert wo möglich, sonst String (z.B. CoreTubeMaterial Codes "C"/"F"/"V") */
  value: number | string;
  /** Anzeige-Label (aus PDF-description) */
  label: string;
}

export interface ParameterDef {
  /** API-Property-Name (z.B. "fluidID", "motorTechnology"). Stabile ID. */
  id: string;
  /** PDF-Reihenfolge (1–222), für Debug-Referenz */
  seq: number;
  /** Einheit aus PDF: "Degree_C", "kW", "mbar", "%", "K_TD", … oder null */
  unit: string | null;
  /** Datentyp aus PDF (für Input-Field-Type-Ableitung) */
  datatype: Datatype;
  /** Group aus PDF — primär für Gruppierung in Forms */
  group: Group;
  /** Offizielle Beschreibung aus der PDF (zum Anzeigen als Hint/Tooltip) */
  description: string;
  /** Enum-Werte normalisiert (number wo möglich) */
  enums: NormalizedEnum[];
  /** ProductCategories, in denen diese Property laut PDF-Description erwähnt wird */
  productCategories: number[] | null;
  /** Per-Perspektive: Label, Hint, Priority */
  perspectives: Record<Perspective, PerspectiveMeta>;
  /** Per-Class: ist die Property sichtbar/required/hidden? */
  visibility: Record<ClassId, Priority>;
}

// ============================================================
// Helper: PascalCase → "Pascal Case" (Default-Label-Generator)
// ============================================================
function humanize(pascalCase: string): string {
  // "fluidID" → "Fluid ID", "AirHoseConnectionInclStreamer" → "Air Hose Connection Incl Streamer"
  return pascalCase
    .replace(/_/g, ' ')                            // Snake-Case-Splitter
    .replace(/([a-z])([A-Z])/g, '$1 $2')           // camelCase split
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')     // CONST→Const split
    .replace(/^\w/, (c) => c.toUpperCase());       // First-Letter-Upper
}

function normalizeEnumValue(v: string): number | string {
  if (v === 'TRUE') return 1;
  if (v === 'FALSE') return 0;
  if (v === 'No filter defined') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

function normalizeEnums(raw: PdfEnum[]): NormalizedEnum[] {
  return raw.map((e) => ({
    value: normalizeEnumValue(e.value),
    label: e.description?.trim() || String(e.value),
  }));
}

// ============================================================
// PERSPECTIVE_OVERRIDES — handgepflegte Labels für die ~30 wichtigsten Properties
// CLAUDE.md §3: pro Perspective ein eigenes Label + Hint + Priority.
// Properties NICHT in dieser Map bekommen humanize()-Defaults + 'optional' für alle Perspectives.
// ============================================================
const PERSPECTIVE_OVERRIDES: Partial<Record<string, Record<Perspective, PerspectiveMeta>>> = {
  // ----- Performance -----
  thermalCapacity: {
    technical:   { label: 'Nominal cooling capacity', hint: 'Per EN 327 reference conditions', priority: 'required' },
    application: { label: 'Required cooling load',    hint: 'For the defined cooling space', priority: 'required' },
    location:    { label: 'Available capacity at site', hint: 'Considering local ambient temperature', priority: 'required' },
  },
  surfaceReserve: {
    technical:   { label: 'Surface reserve tolerance', hint: 'Engineering margin (%)', priority: 'optional' },
    application: { label: 'Capacity margin',           hint: 'Safety factor for fouling/aging', priority: 'optional' },
    location:    { label: 'Capacity margin',           hint: 'Safety factor', priority: 'optional' },
  },
  airVolumeFlow: {
    technical:   { label: 'Nominal airflow', hint: 'm³/h at standard conditions', priority: 'optional' },
    application: { label: 'Air circulation rate',  hint: 'Air changes per hour for the room', priority: 'optional' },
    location:    { label: 'Room ventilation rate', hint: 'Total airflow into the space', priority: 'optional' },
  },

  // ----- Refrigerant / Fluid -----
  fluidID: {
    technical:   { label: 'Refrigerant (R-number)',           hint: 'GWP, oil and material compatibility', priority: 'required' },
    application: { label: 'Refrigerant',                      hint: 'F-Gas class and phase-out timeline', priority: 'required' },
    location:    { label: 'Permitted refrigerants',           hint: 'Local regulations, ATEX, food-proximity', priority: 'required' },
  },
  fluidTempEvap: {
    technical:   { label: 'Evaporation temperature t₀', hint: 'Dew point or mean depending on input mode', priority: 'required' },
    application: { label: 'Evaporation temperature',    hint: 'Set ~ room temp minus design ΔT (typ. 6–10 K)', priority: 'required' },
    location:    { label: 'Design evaporation temp',    hint: 'Influenced by ambient + insulation', priority: 'optional' },
  },
  fluidTempInlet: {
    technical:   { label: 'Fluid inlet temperature', hint: 'For coolants/dry coolers; for condensers = hot gas temp', priority: 'required' },
    application: { label: 'Coolant inlet temperature', hint: 'From the chiller / system supply', priority: 'required' },
    location:    { label: 'Inlet temperature',         hint: 'Site-dependent (e.g. district cooling)', priority: 'optional' },
  },
  fluidTempCond: {
    technical:   { label: 'Condensing temperature t_c', hint: 'Dew point at condenser inlet', priority: 'required' },
    application: { label: 'Condensing temperature',     hint: 'Drives compressor work; lower = more efficient', priority: 'required' },
    location:    { label: 'Design condensing temp',     hint: 'Function of ambient + heat-rejection medium', priority: 'optional' },
  },
  fluidSuperHeating: {
    technical:   { label: 'Superheat', hint: 'Δ above evaporation temp at outlet', priority: 'optional' },
    application: { label: 'Useful superheat', hint: 'Affects compressor inlet vapor quality', priority: 'optional' },
    location:    { label: 'Superheat', priority: 'hidden' },
  },
  fluidSubCooling: {
    technical:   { label: 'Subcooling',           hint: 'Δ below condensing temp', priority: 'optional' },
    application: { label: 'Liquid line subcooling', hint: 'Improves expansion valve performance', priority: 'optional' },
    location:    { label: 'Subcooling',           priority: 'hidden' },
  },
  fluidPumpRate: {
    technical:   { label: 'Pump feed rate (recirculation factor)', hint: 'How many times the refrigerant cycles through the coil', priority: 'required' },
    application: { label: 'Feed rate', hint: 'Higher = more thorough wetting of tubes', priority: 'optional' },
    location:    { label: 'Feed rate', priority: 'hidden' },
  },
  fluidPumpMode: {
    technical:   { label: 'Pump mode',         hint: '0=Pump, 1=Gravity-fed', priority: 'required' },
    application: { label: 'Circulation mode',  hint: 'Pump-driven or natural circulation', priority: 'optional' },
    location:    { label: 'Circulation mode',  priority: 'hidden' },
  },
  fluidVolConcentration: {
    technical:   { label: 'Concentration (vol %)', hint: 'For glycols/brines, affects freeze point', priority: 'required' },
    application: { label: 'Antifreeze concentration', hint: 'Match to lowest expected coolant temp', priority: 'required' },
    location:    { label: 'Concentration', priority: 'optional' },
  },
  fluidInputMode: {
    technical:   { label: 'Fluid input mode', hint: 'Defines which two of Inlet/Outlet/Volume/Mass must be set', priority: 'required' },
    application: { label: 'Parameter mode',   hint: 'How to specify the coolant flow', priority: 'optional' },
    location:    { label: 'Parameter mode',   priority: 'hidden' },
  },

  // ----- Air-side -----
  airTemperature: {
    technical:   { label: 'Air inlet temperature', hint: '°C at coil face', priority: 'required' },
    application: { label: 'Ambient / room temperature', hint: 'Cold-room setpoint or outdoor design temp', priority: 'required' },
    location:    { label: 'Site air temperature',   hint: 'Climate-zone design value', priority: 'required' },
  },
  airRelHumidity: {
    technical:   { label: 'Relative humidity', hint: '%', priority: 'optional' },
    application: { label: 'Cold-room humidity', hint: 'Higher RH = closer fin spacing problems', priority: 'optional' },
    location:    { label: 'Ambient humidity', hint: 'Affects condensate handling', priority: 'optional' },
  },
  airPressure: {
    technical:   { label: 'Air pressure',    hint: 'mbar at inlet', priority: 'optional' },
    application: { label: 'Air pressure',    priority: 'optional' },
    location:    { label: 'Site air pressure', hint: 'Set via altitude or directly', priority: 'optional' },
  },
  altitude: {
    technical:   { label: 'Altitude (m)',         hint: 'Geodetic height above sea level', priority: 'optional' },
    application: { label: 'Site altitude',        priority: 'optional' },
    location:    { label: 'Altitude above MSL',   hint: 'Higher altitude = lower air density', priority: 'optional' },
  },
  frostThickness: {
    technical:   { label: 'Frost thickness',    hint: 'mm of frost on coil (evaporators only)', priority: 'optional' },
    application: { label: 'Expected frost',     hint: 'Affects defrost intervals', priority: 'optional' },
    location:    { label: 'Frost expectation',  priority: 'hidden' },
  },
  capacitySensibleHeatOnly: {
    technical:   { label: 'Sensible-heat-only mode', hint: 'TRUE = thermalCapacity ignores latent (US-only)', priority: 'optional' },
    application: { label: 'Capacity including humidity factor', hint: 'Inverted: checked = include latent heat', priority: 'optional' },
    location:    { label: 'Humidity factor', priority: 'hidden' },
  },

  // ----- Sound / Dimensions / Limits -----
  soundPressureMax: {
    technical:   { label: 'Max. sound pressure level',  hint: 'dB(A) at SoundPressureDistance', priority: 'optional' },
    application: { label: 'Noise budget',               hint: 'Match to local noise ordinance', priority: 'required' },
    location:    { label: 'Permissible noise level',    hint: 'dB(A) limit at the site boundary', priority: 'required' },
  },
  unitLengthMax: {
    technical:   { label: 'Max. installation length', hint: 'meters', priority: 'optional' },
    application: { label: 'Max. unit length',         priority: 'optional' },
    location:    { label: 'Available length at site', hint: 'Room or access constraint', priority: 'required' },
  },
  unitWidthMax: {
    technical:   { label: 'Max. installation width',  priority: 'optional' },
    application: { label: 'Max. unit width',          priority: 'optional' },
    location:    { label: 'Available width at site',  priority: 'required' },
  },
  unitHeightMax: {
    technical:   { label: 'Max. installation height', priority: 'optional' },
    application: { label: 'Max. unit height',         priority: 'optional' },
    location:    { label: 'Available height at site', hint: 'Door clearance, ceiling height', priority: 'required' },
  },

  // ----- Options that drive impact score -----
  motorTechnology: {
    technical:   { label: 'Fan motor technology', hint: 'AC vs. EC vs. cost/energy-optimised', priority: 'optional' },
    application: { label: 'Motor technology',     hint: 'EC = variable speed, energy-efficient', priority: 'optional' },
    location:    { label: 'Motor technology',     priority: 'optional' },
  },
  efficiencyClass: {
    technical:   { label: 'Min. ErP efficiency class', hint: 'A++/A+/A/B/…', priority: 'optional' },
    application: { label: 'Minimum efficiency class',  hint: 'Higher = lower TCO', priority: 'optional' },
    location:    { label: 'Minimum efficiency class',  priority: 'optional' },
  },
  defrosting: {
    technical:   { label: 'Defrost method',  hint: 'Air/Hot gas/Electric/Brine', priority: 'optional' },
    application: { label: 'Defrost method',  hint: 'Hot gas re-uses compressor waste heat', priority: 'optional' },
    location:    { label: 'Defrost method',  priority: 'optional' },
  },

  // ----- Series-Auswahl -----
  units: {
    technical:   { label: 'Pre-selected series',  hint: 'UnitGroupIDs to include in search', priority: 'optional' },
    application: { label: 'Series shortlist',      priority: 'optional' },
    location:    { label: 'Series candidates',     priority: 'optional' },
  },
};

// ============================================================
// VISIBILITY_OVERRIDES — pro Property eine Class→Priority-Map.
// Properties NICHT in dieser Map: alle Klassen 'optional' (Default).
// Klassen, die in der Map fehlen für eine Property: 'hidden' (= property irrelevant für diese Klasse).
// ============================================================
const VISIBILITY_OVERRIDES: Partial<Record<string, Partial<Record<ClassId, Priority>>>> = {
  // ----- Performance — alle Klassen required -----
  thermalCapacity: allRequired(),
  surfaceReserve:  allOptional(),
  airTemperature:  allRequired(),

  // ----- Refrigerant / Fluid -----
  fluidID:            allRequired(),
  fluidTempEvap:      { A: 'required', B: 'required', D2: 'optional' },                    // DX + Pump (Subcooler optional)
  fluidTempInlet:     { C: 'required', D1: 'required', D2: 'required', E1: 'required', E2: 'required', F: 'required' }, // Coolants + Warm
  fluidTempOutlet:    { C: 'required', E1: 'required', E2: 'required' },                   // Coolant flows
  fluidTempCond:      { A: 'required', D1: 'required', F: 'optional' },                    // Phase-change
  fluidSuperHeating:  { A: 'required' },                                                   // DX only
  fluidSubCooling:    { A: 'optional', D1: 'optional' },                                   // DX + Condenser
  fluidPumpRate:      { B: 'required' },                                                   // Pump only
  fluidPumpMode:      { B: 'required' },                                                   // Pump only
  fluidVolConcentration: { C: 'required', E1: 'required' },                                // Glycol coolers
  fluidInputMode:     { C: 'required', E1: 'required', E2: 'required', D2: 'required' },  // Coolant + Subcooler-Inlet-Outlet
  fluidPressureDropMax: { A: 'optional', B: 'optional', C: 'required', D1: 'optional', D2: 'required', E1: 'required', E2: 'required' },

  // ----- Air-side -----
  airRelHumidity:     allOptional(),
  airPressure:        allOptional(),
  altitude:           allOptional(),
  frostThickness:     { A: 'optional', B: 'optional', C: 'optional' },                    // Cold-side only
  capacitySensibleHeatOnly: { A: 'optional', B: 'optional', C: 'optional' },              // Cold-side only

  // ----- Dimensions / Sound -----
  unitLengthMax:      allOptional(),
  unitWidthMax:       allOptional(),
  unitHeightMax:      allOptional(),
  soundPressureMax:   allOptional(),
  soundPressureDistance: allOptional(),
  finPitch0Min:       allOptional(),
  finPitch0Max:       allOptional(),
  finSpacingInputMode: allOptional(),

  // ----- Common Options -----
  erP_Compliant:      allOptional(),
  powerSupply:        allOptional(),
  motorTechnology:    allOptional(),
  efficiencyClass:    allOptional(),
  maxOperatingPressure: allOptional(),
  coreTubeMaterial:   allOptional(),
  airBlowOffType:     { A: 'optional', B: 'optional', C: 'optional' },                    // Cold-side
  airVelocityClass:   { A: 'optional', B: 'optional', C: 'optional' },                    // Cold-side
  defrosting:         { A: 'optional', B: 'optional', C: 'optional' },                    // Cold-side only
  defrostingHotGasFeed: { A: 'optional' },                                                // DX only

  // ----- Cold-side accessories -----
  epoxy_Fins:         { A: 'optional', B: 'optional', C: 'optional' },
  airHoseConnectionInclStreamer: { A: 'optional', B: 'optional', C: 'optional' },
  coil_Defender:      { A: 'optional', C: 'optional' },                                   // not on Pump
  GuentnerStreamer:   { A: 'optional', B: 'optional', C: 'optional' },
  fanRingHeater:      { A: 'optional', B: 'optional', C: 'optional' },
  doubleTrayInsulated: { A: 'optional', B: 'optional', C: 'optional' },
  casingAndSimplyTray: { A: 'optional', B: 'optional', C: 'optional' },
  casingAndDoubleTray: { A: 'optional', B: 'optional', C: 'optional' },
  inletHood:          { A: 'optional', B: 'optional', C: 'optional' },
  adjustableFlapWithDrive: { A: 'optional', B: 'optional', C: 'optional' },
  lowEvapTempDesign:  { A: 'optional', B: 'optional' },                                   // DX + Pump only

  // ----- Pump-specific -----
  mountedLegs:        { B: 'optional', C: 'optional' },
  mountedLegsGS:      { B: 'optional', C: 'optional' },
  mountedLegsSS:      { B: 'optional', C: 'optional' },

  // ----- Warm-side accessories -----
  vibrationDampers:   { D1: 'optional', E1: 'optional' },
  reducedLegs:        { D1: 'optional', E1: 'optional' },
  extendedLegs:       { D1: 'optional', E1: 'optional' },
  inspectionCover:    { D1: 'optional', E1: 'optional' },
  connectionRoof:     { D1: 'optional', E1: 'optional' },                                 // = "Header cover"
  specialVarnishing:  { D1: 'optional', E1: 'optional', F: 'optional' },
  ralNumber:          { D1: 'optional', E1: 'optional', F: 'optional' },
  corrosionProtectionClass: { D1: 'optional', E1: 'optional' },
  ioTModule:          { D1: 'optional', E1: 'optional', F: 'optional' },                  // aicore link
  hingedFanPlate:     { D1: 'optional', E1: 'optional' },
  isContainerTransport: { D1: 'optional', E1: 'optional', F: 'optional' },
  noOfCircuitsThermo: { D1: 'optional', F: 'optional' },
  multipleCircuits:   { D1: 'optional', F: 'optional' },
  subcooler:          { D1: 'optional' },
  miniumRequiredSubcooling: { D1: 'optional' },
  tubing_Of_Integrated_Subcooler_With_Syphon: { D1: 'optional' },

  // ----- Coolant Warm Connection -----
  connectionType:     { C: 'optional', E1: 'optional', E2: 'optional' },                  // THREAD/FLANGE
  threadConnectionMaterial: { C: 'optional', E1: 'optional', E2: 'optional' },
  weldingNeckFlangeNominalPressure: { C: 'optional', E1: 'optional', E2: 'optional' },

  // ----- CO2-only -----
  isSubcritic:        { F: 'required' },
  isSupercritic:      { F: 'required' },
  fluidPressure:      { A: 'optional', F: 'required' },                                   // DX inlet pressure or CO2 supercritical
  subcriticThermalCapacity: { F: 'required' },
  subcriticAirTemperature: { F: 'optional' },
  subcriticFluidTempCond: { F: 'optional' },
  subcriticFluidTempInlet: { F: 'optional' },
  subcriticIsHotGasAuto: { F: 'optional' },
  hBLKValve:          { F: 'optional' },

  // ----- Limits + Series -----
  noOfFans:           allOptional(),
  deliveryTimeFilter: allOptional(),
  onlyStockUnits:     allOptional(),
  noOfPasses:         allOptional(),
  noOfDevices:        allOptional(),
  units:              allOptional(),
  unitFilterList:     allOptional(),
  unitSelectionMode:  allOptional(),

  // ----- Controller / Terminal Box (all classes) -----
  switchCabinet:      allOptional(),
  switchCabinetMotorTechnology: allOptional(),
  switchCabinetType:  allOptional(),
  switchCabinetAllocation: allOptional(),
  mountedAndWired:    allOptional(),
  enableForMounting:  allOptional(),
  controllerByPassObligatory: allOptional(),
  ecJunctionBoxWithMainSwitch: allOptional(),
  controllerAllocation: allOptional(),
  fanFuseSpec:        allOptional(),
  forEnergySavingController: allOptional(),
  forNoiseUse:        allOptional(),
  controllerType:     allOptional(),
  controllerInterface: allOptional(),
  manualSpeedController: allOptional(),
  repairSwitch:       allOptional(),
  repairSwitchPosition: allOptional(),
  repairSwitchType:   allOptional(),
  repairSwitchWiring: allOptional(),
  wiring_To_Terminal_Box: allOptional(),
  wiring_To_Junction_Box_At_Side: allOptional(),

  // ----- IMPACT (User-Inputs für Lifecycle-Costs) -----
  impactOperationLife: allOptional(),
  impactElectricityPrice: allOptional(),
  impactPlanningFactor: allOptional(),
  impactEmissionFactor: allOptional(),
  impactCountryID:    allOptional(),
  impactFanUsageProfile: allOptional(),
  impactDefrostPerDay: { A: 'optional', B: 'optional', C: 'optional' },
  impactMaxDefrostDuration: { A: 'optional', B: 'optional', C: 'optional' },
  impactUsePredictionModelDefrost: { A: 'optional', B: 'optional', C: 'optional' },
};

function allRequired(): Partial<Record<ClassId, Priority>> {
  return Object.fromEntries(ALL_CLASSES.map((c) => [c, 'required' as Priority]));
}
function allOptional(): Partial<Record<ClassId, Priority>> {
  return Object.fromEntries(ALL_CLASSES.map((c) => [c, 'optional' as Priority]));
}

// ============================================================
// Build enriched parameter definitions (one-time at module load)
// ============================================================
function buildVisibility(name: string): Record<ClassId, Priority> {
  const overrides = VISIBILITY_OVERRIDES[name];
  const result = {} as Record<ClassId, Priority>;
  for (const cls of ALL_CLASSES) {
    if (overrides) {
      result[cls] = overrides[cls] ?? 'hidden';
    } else {
      // Default: alle 'optional' (sichtbar, nicht required)
      result[cls] = 'optional';
    }
  }
  return result;
}

function buildPerspectives(name: string): Record<Perspective, PerspectiveMeta> {
  const override = PERSPECTIVE_OVERRIDES[name];
  if (override) return override;
  // Default: alle 3 Perspectives = humanize(name) + optional
  const label = humanize(name);
  const meta: PerspectiveMeta = { label, priority: 'optional' };
  return { technical: meta, application: meta, location: meta };
}

function buildDefinition(p: PdfParameter): ParameterDef {
  return {
    id: p.name,
    seq: p.seq,
    unit: p.unit,
    datatype: p.datatype,
    group: p.group,
    description: p.description,
    enums: normalizeEnums(p.enums || []),
    productCategories: p.productCategories,
    perspectives: buildPerspectives(p.name),
    visibility: buildVisibility(p.name),
  };
}

const ALL_DEFINITIONS: ReadonlyArray<ParameterDef> = Object.freeze(
  RAW.parameters.map(buildDefinition),
);

const BY_NAME: ReadonlyMap<string, ParameterDef> = new Map(
  ALL_DEFINITIONS.map((d) => [d.id, d]),
);

// Case-insensitive Fallback-Map für lose API-Property-Naming-Konventionen
// (manche Backends liefern `coil_Defender`, andere `Coil_Defender`)
const BY_NAME_LOWER: ReadonlyMap<string, ParameterDef> = new Map(
  ALL_DEFINITIONS.map((d) => [d.id.toLowerCase(), d]),
);

// ============================================================
// Public API
// ============================================================

/** Liefert die Definition zu einer Property-ID (case-insensitive Fallback). */
export function getParameter(id: string | null | undefined): ParameterDef | null {
  if (!id) return null;
  return BY_NAME.get(id) ?? BY_NAME_LOWER.get(id.toLowerCase()) ?? null;
}

/** Alle 222 Definitionen (für Iteration / Tool-Schema-Generierung). */
export function getAllParameters(): ReadonlyArray<ParameterDef> {
  return ALL_DEFINITIONS;
}

/** Properties sichtbar für eine bestimmte Class (Filter: nicht 'hidden'). */
export function getVisibleParameters(cls: ClassId, perspective: Perspective = 'application'): ParameterDef[] {
  return ALL_DEFINITIONS.filter((p) => {
    const vis = p.visibility[cls];
    if (vis === 'hidden') return false;
    const persp = p.perspectives[perspective];
    if (persp.priority === 'hidden') return false;
    return true;
  });
}

/** Required-Properties für eine Class (für Validierung / Tool-Calling-Required-Fields). */
export function getRequiredParameters(cls: ClassId): ParameterDef[] {
  return ALL_DEFINITIONS.filter((p) => p.visibility[cls] === 'required');
}

/** Enum-Options für eine Property — falls die Property ein Enum hat. */
export function getEnumOptions(id: string): NormalizedEnum[] {
  const def = getParameter(id);
  return def?.enums ?? [];
}

/** Gruppieren nach PDF-Group (für Form-Sektion-Layout). */
export function getParametersByGroup(group: Group, cls?: ClassId): ParameterDef[] {
  const filtered = ALL_DEFINITIONS.filter((p) => p.group === group);
  if (!cls) return filtered;
  return filtered.filter((p) => p.visibility[cls] !== 'hidden');
}

/**
 * Validiert einen Wert gegen die Property-Definition.
 * Returns { valid, reason } — Aufrufer können `reason` als User-Hinweis nutzen.
 */
export function validateValue(id: string, value: unknown): { valid: boolean; reason?: string } {
  const def = getParameter(id);
  if (!def) return { valid: false, reason: `Unknown parameter: ${id}` };

  if (value === null || value === undefined || value === '') {
    return { valid: true };  // null = unset, gilt als valid (außer required, das prüft der Aufrufer)
  }

  // Type-Check
  if (def.datatype === 'Int32' || def.datatype === 'Int64') {
    const n = Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      return { valid: false, reason: `${def.id} expects an integer, got ${JSON.stringify(value)}` };
    }
  } else if (def.datatype === 'Double') {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return { valid: false, reason: `${def.id} expects a number, got ${JSON.stringify(value)}` };
    }
  } else if (def.datatype === 'Boolean') {
    if (typeof value !== 'boolean' && value !== 0 && value !== 1 && value !== 'true' && value !== 'false') {
      return { valid: false, reason: `${def.id} expects a boolean (or 0/1), got ${JSON.stringify(value)}` };
    }
  }

  // Enum-Check (wenn die Property einen Enum hat, muss der Wert dort sein)
  if (def.enums.length > 0) {
    const numValue = Number(value);
    const matches = def.enums.some((e) => e.value === value || e.value === numValue || String(e.value) === String(value));
    if (!matches) {
      const allowed = def.enums.map((e) => `${e.value}=${e.label}`).join(', ');
      return { valid: false, reason: `${def.id} value ${JSON.stringify(value)} not in enum. Allowed: ${allowed}` };
    }
  }

  return { valid: true };
}

/**
 * Hilfsfunktion für die LLM-Tool-Beschreibung: liefert eine kompakte
 * String-Repräsentation einer Property — Name, Beschreibung, Enum-Werte.
 */
export function getParameterSummary(id: string): string | null {
  const def = getParameter(id);
  if (!def) return null;
  const parts = [`${def.id} (${def.datatype}${def.unit ? ', ' + def.unit : ''})`];
  parts.push(def.description);
  if (def.enums.length > 0) {
    const opts = def.enums.map((e) => `${e.value}=${e.label}`).join(' | ');
    parts.push(`Allowed: ${opts}`);
  }
  return parts.join(' — ');
}

/** Anzahl Properties (für Sanity-Checks / Tests) */
export const PARAMETER_COUNT = ALL_DEFINITIONS.length;

/** PDF-Metadaten (für UI-Anzeige z.B. "Spec version 2026.1-310") */
export const PDF_METADATA = Object.freeze({
  source: RAW.source,
  version: RAW.version,
  generated: RAW.generated,
});

/** Re-Export von Class-Utils, damit Consumer nur diesen einen Module-Path brauchen */
export { ALL_CLASSES, isColdSide };
export type { ClassId };
