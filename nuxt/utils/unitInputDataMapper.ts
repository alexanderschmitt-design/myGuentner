/**
 * unitInputDataMapper — Konvertierung zwischen dem Wizard-Store und der
 * offiziellen GPC-EU `UnitInputData`-Payload-Shape.
 *
 * Warum: die API erwartet 222 Properties in PascalCase mit exakten
 * Feld-Namen (z. B. `ThermalCapacity`, `FluidTempInlet`). Der Wizard-Store
 * hat historisch camelCase-Namen mit teils anderen Einheiten (kW ↔ W).
 * Dieser Modul kapselt die Übersetzung an einem Ort.
 *
 * Quelle der Wahrheit für die Property-Liste ist `rag/gpc-parameters.json`
 * (222 Properties mit datatype + enums), das aus der offiziellen PDF von
 * Güntner extrahiert wurde. Wir bauen daraus zur Runtime das leere
 * Default-Objekt — kein manuelles Copy-Paste der 222 Felder.
 */

import rawParams from '../../rag/gpc-parameters.json';
import type { UnitInputData } from '~/composables/useGpceu';
import type { ConfigurationParameters, TranscriticConfig, UnitSelectionOpts } from '~/stores/configuration';
import { fluidIdToSlug } from '~/utils/fluidIdMap';

type Datatype = 'Int32' | 'Int64' | 'Double' | 'Boolean' | 'String' | 'List`1';

interface RawParam {
  seq: number;
  name: string;
  unit: string | null;
  datatype: Datatype;
  group: string;
  description: string;
  enums: Array<{ value: string; description: string }>;
  productCategories: number[] | null;
}

interface RawParamsFile {
  count: number;
  parameters: RawParam[];
}

const RAW = rawParams as RawParamsFile;

/**
 * Datatype-abhängiger Nullwert. Die GPC-API akzeptiert:
 *   Int32 / Int64 → 0
 *   Double        → 0 (nicht null, weil viele Werte 0.0 als "auto" haben)
 *   Boolean       → false
 *   String        → ""
 *   List`1        → []
 * Explizite Defaults aus `defaultInputData(productCategory)` überschreiben
 * diese Werte beim Wizard-Start — siehe hydrateUnitInputData().
 */
function nullValue(datatype: Datatype): number | boolean | string | unknown[] {
  switch (datatype) {
    case 'Int32':
    case 'Int64':
    case 'Double': return 0;
    case 'Boolean': return false;
    case 'String':  return '';
    case 'List`1':  return [];
    default:        return 0;
  }
}

/**
 * Erzeugt ein UnitInputData-Objekt mit allen 222 Properties auf datatype-
 * spezifischen Nullwerten. Wird beim Store-Init aufgerufen, damit der Store
 * SSR-safe ist (kein API-Call nötig, bevor der User im Wizard landet).
 *
 * Cast auf `UnitInputData` ist notwendig, weil TypeScript den generierten
 * OpenAPI-Type nicht mit dem dynamischen Aufbau zusammenbringt — laufzeit-
 * sicher, weil jede Property aus `gpc-parameters.json` per Definition in
 * der API existiert.
 */
export function emptyUnitInputData(): UnitInputData {
  const out: Record<string, unknown> = {};
  for (const p of RAW.parameters) {
    out[p.name] = nullValue(p.datatype);
  }
  return out as UnitInputData;
}

/**
 * Deep-merged Patch auf ein Basis-Objekt. Undefined-Werte im Patch
 * überschreiben nicht — so bleiben nutzergesetzte Werte erhalten, wenn
 * die API nur Teil-Defaults liefert.
 */
export function mergeUnitInputData(base: UnitInputData, patch: Partial<UnitInputData>): UnitInputData {
  const out: Record<string, unknown> = { ...(base as unknown as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) out[k] = v;
  }
  return out as UnitInputData;
}

// ============================================================
// Legacy-Parameter-Mapping — Wizard-Store camelCase → API PascalCase
// ============================================================

/**
 * Mapping-Tabelle: Wizard-Store-Feldname → { apiName, transform? }.
 * Nur die im aktuellen Wizard genutzten ~30 Felder — die restlichen 192
 * werden über `defaultInputData()` beim Wizard-Start gefüllt und bleiben
 * unangetastet, es sei denn ein Preset oder der User setzt sie explizit.
 */
type LegacyKey = keyof ConfigurationParameters;

interface FieldMap {
  apiName: keyof UnitInputData;
  /** Optional: Wandelt UI-Wert (z. B. kW) in API-Wert (z. B. W). */
  toApi?: (v: unknown) => unknown;
  /** Optional: Wandelt API-Wert (W) zurück in UI-Wert (kW). */
  fromApi?: (v: unknown) => unknown;
}

const LEGACY_MAP: Partial<Record<LegacyKey, FieldMap>> = {
  // Performance — API in Watt, UI in Kilowatt.
  coolingCapacityKw: {
    apiName: 'ThermalCapacity' as keyof UnitInputData,
    toApi:   (v) => (typeof v === 'number' ? v * 1000 : 0),
    fromApi: (v) => (typeof v === 'number' ? v / 1000 : null)
  },
  airflowM3h: {
    apiName: 'AirVolumeFlow' as keyof UnitInputData
  },
  // Refrigerant-side
  evaporatingTempC:  { apiName: 'FluidTempEvap' as keyof UnitInputData },
  condensingTempC:   { apiName: 'FluidTempCond' as keyof UnitInputData },
  superheatingK:     { apiName: 'FluidSuperHeating' as keyof UnitInputData },
  subcoolingK:       { apiName: 'FluidSubCooling' as keyof UnitInputData },
  // Air
  airInletTempC:     { apiName: 'AirTemperature' as keyof UnitInputData },
  relHumidityPct:    { apiName: 'AirRelHumidity' as keyof UnitInputData },
  wetBulbTempC:      { apiName: 'AirWetBulbTemp' as keyof UnitInputData },
  altitudeM:         { apiName: 'Altitude' as keyof UnitInputData },
  airPressureMbar:   { apiName: 'AirPressure' as keyof UnitInputData },
  frostThicknessMm:  { apiName: 'FrostThickness' as keyof UnitInputData },
  // Liquid-side
  inletTempC:        { apiName: 'FluidTempInlet' as keyof UnitInputData },
  outletTempC:       { apiName: 'FluidTempOutlet' as keyof UnitInputData },
  concentrationVolPct: { apiName: 'FluidVolConcentration' as keyof UnitInputData },
  // Kategorien-spezifische Wizard-Felder
  gravityFlooded:    { apiName: 'GravityFlooded' as keyof UnitInputData },
  pumpFeedRate:      { apiName: 'PumpFeedRate' as keyof UnitInputData },
  multipleCircuits:  { apiName: 'MultipleCircuits' as keyof UnitInputData },
  noOfCircuits:      { apiName: 'NoOfCircuitsThermo' as keyof UnitInputData },
  // Surface Reserve / Capacity Tolerance in % — API muss beide > 0 setzen
  // (Upper tolerance must be > 0). Store hat Defaults -10 / +50.
  minSurfaceReserve: { apiName: 'TC_Tolerance_L' as keyof UnitInputData },
  maxSurfaceReserve: { apiName: 'TC_Tolerance_H' as keyof UnitInputData }
};

/**
 * Kategorie-inhärente Wizard-Felder — Werte, die sich beim Cat-Wechsel
 * IMMER ändern müssen, weil sie an die Kategorie gebunden sind
 * (Fluid-Slug, Kreisläufe, Pump-Modus, Transcritic-Flag). Werden beim
 * Fixture-Sync im Store hart überschrieben, damit alte Session-Werte
 * aus Cat-0 nicht in Cat-1 leaken.
 *
 * Gleiche Liste wie in `pages/mygpc/[catId]/thermodynamics.vue` — dort
 * dupliziert für den Watcher-Guard; hier zentral, damit Store-Action
 * und Watcher die identische Menge nutzen.
 */
export const CATEGORY_INHERENT_KEYS = [
  'refrigerant',
  'glycolType',
  'concentrationVolPct',
  'multipleCircuits',
  'gravityFlooded',
  'pumpFeedRate',
  'transcritic'
] as const;

/**
 * Mapping-Tabelle: UnitSelectionOpts-Feldname → UnitInputData-API-Name.
 * Umfasst die ~30 Accessory-Checkboxen + Dropdowns aus dem Options-
 * Accordion + der Terminal-Box-Section. Nur Felder, die im Store und im
 * API-Vokabular existieren.
 */
type OptsKey = keyof UnitSelectionOpts;
const OPTS_MAP: Partial<Record<OptsKey, FieldMap>> = {
  onlyErpCompliant:              { apiName: 'ErP_Compliant' as keyof UnitInputData },
  powerSupply:                   { apiName: 'PowerSupply' as keyof UnitInputData },
  motorTechnology:               { apiName: 'MotorTechnology' as keyof UnitInputData },
  // EfficiencyClass ist im API-Schema type=String, gültige Werte:
  // "--" (kein Filter), "A", "B", "C", "D", "E". Store nutzt numerisch
  // 0-5 fürs UI-Dropdown (5=A ... 0=No) — hier zum String casten,
  // sonst wirft die API „FhxDLException 009 - Invalid class code".
  minimumEnergyEfficiencyClass:  {
    apiName: 'EfficiencyClass' as keyof UnitInputData,
    toApi: (v) => {
      const n = typeof v === 'number' ? v : 0
      return n === 5 ? 'A'
           : n === 4 ? 'B'
           : n === 3 ? 'C'
           : n === 2 ? 'D'
           : n === 1 ? 'E'
           : '--'
    }
  },
  maxOperatingPressure:          { apiName: 'MaxOperatingPressure' as keyof UnitInputData },
  coreTubeMaterial:              { apiName: 'NippleTubeMaterial' as keyof UnitInputData },
  airBlowDirection:              { apiName: 'AirBlowOffType' as keyof UnitInputData },
  defrostingType:                { apiName: 'Defrosting' as keyof UnitInputData },
  hotGasInterconnectingTubing:   { apiName: 'HotGasInterConnectingTubing' as keyof UnitInputData },
  airVelocityClass:              { apiName: 'AirVelocityClass' as keyof UnitInputData },
  espPressurePa:                 { apiName: 'Esp' as keyof UnitInputData },
  epoxyCoatedFins:               { apiName: 'Epoxy_Fins' as keyof UnitInputData },
  coilDefender:                  { apiName: 'Coil_Defender' as keyof UnitInputData },
  wiringToTerminalBox:           { apiName: 'Wiring_To_Terminal_Box' as keyof UnitInputData },
  guentnerStreamer:              { apiName: 'GuentnerStreamer' as keyof UnitInputData }
};

/**
 * Wandelt einen Store-Slice (`ConfigurationParameters`) in ein
 * `Partial<UnitInputData>`-Patch. Nur Felder, die im Mapping stehen UND
 * im Store gesetzt sind (nicht `null` / `undefined`), landen im Patch.
 *
 * `refrigerant` (R-Nummer als String) wird NICHT hier gemappt — die
 * FluidID ist eine API-interne numerische ID, die per `resolveFluidId()`
 * aus der Fluids-API-Response ermittelt wird.
 */
export function unitInputDataFromLegacyParameters(
  p: ConfigurationParameters,
  opts?: UnitSelectionOpts
): Partial<UnitInputData> {
  const patch: Record<string, unknown> = {};
  for (const [legacyKey, field] of Object.entries(LEGACY_MAP)) {
    if (!field) continue;
    const val = (p as unknown as Record<string, unknown>)[legacyKey];
    if (val === null || val === undefined) continue;
    patch[field.apiName as string] = field.toApi ? field.toApi(val) : val;
  }
  if (opts) {
    for (const [optsKey, field] of Object.entries(OPTS_MAP)) {
      if (!field) continue;
      const val = (opts as unknown as Record<string, unknown>)[optsKey];
      if (val === null || val === undefined) continue;
      // Boolean-Store-Werte werden 1:1 an die API weitergereicht — der
      // OpenAPI-Type ist boolean für epoxyCoatedFins etc. Numerische
      // Dropdowns bleiben numerisch.
      patch[field.apiName as string] = field.toApi ? field.toApi(val) : val;
    }
  }
  return patch as Partial<UnitInputData>;
}

/**
 * Rück-Mapping: `UnitInputData` → `Partial<ConfigurationParameters>`.
 * Nützlich beim initialen Hydraten des Stores aus einer geladenen
 * GPC-Datei (uploadFile → getNativeContents → getInputData) und primär
 * für den Fixture-Sync in pages/mygpc/[catId]/thermodynamics.vue.
 *
 * Neben den 1:1-Mappings aus LEGACY_MAP werden hier zusätzlich mehrere
 * Sonderfälle behandelt, weil die API-Shape für sie nicht 1:1 zum Store
 * passt: FluidID → refrigerant/glycolType (mediumType-abhängig),
 * Enum-Modes (FluidInputMode/InputModeCapacity/AirPressureInputMode)
 * → String-Enums im Store, `subcritic*`-Felder → verschachteltes
 * `transcritic`-Sub-Objekt.
 */
export function legacyParametersFromUnitInputData(
  u: UnitInputData,
  ctx?: { categoryMediumType?: 'refrigerant' | 'liquid' }
): Partial<ConfigurationParameters> {
  const out: Record<string, unknown> = {};
  const uAny = u as unknown as Record<string, unknown>;
  for (const [legacyKey, field] of Object.entries(LEGACY_MAP)) {
    if (!field) continue;
    const val = readCaseTolerant(uAny, field.apiName as string);
    if (val === undefined) continue;
    out[legacyKey] = field.fromApi ? field.fromApi(val) : val;
  }

  // === Sonderfälle, die nicht als 1:1-LEGACY_MAP-Eintrag darstellbar sind ===

  // FluidID → refrigerant/glycolType. `ctx.categoryMediumType` diambiguiert
  // die statische fluidIdMap: dieselbe fluidID kann in verschiedenen
  // Kategorien ein anderes Fluid meinen (z. B. 2012 = R404A in Condenser,
  // aber ein Coolant im Subcooler).
  const fluidIdRaw = getNum(uAny, 'FluidID');
  if (fluidIdRaw !== null) {
    const entry = fluidIdToSlug(fluidIdRaw, ctx?.categoryMediumType);
    if (entry) {
      if (entry.mediumType === 'refrigerant') out.refrigerant = entry.slug;
      else                                    out.glycolType  = entry.slug;
    }
  }

  // FluidInputMode: 0 = dew point at inlet (DIN EN328), 3 = mean (Inlet state
  // by temperature and pressure). Die "mean"-Variante klappt im Wizard auch
  // die Checkbox `inletByTempPressure` mit auf.
  const fluidInputMode = getNum(uAny, 'FluidInputMode');
  if (fluidInputMode !== null) {
    out.dewPointMode         = fluidInputMode === 3 ? 'mean' : 'dew-point';
    out.inletByTempPressure  = fluidInputMode === 3;
  }

  // InputModeCapacity: 0 = fixed capacity (adjust surface reserve),
  //                    3 = fixed capacity (adjust condensation temperature).
  // Live-App-Screenshot cat3.png rechts zeigt für Condenser die 3. Option.
  const inputModeCapacity = getNum(uAny, 'InputModeCapacity');
  if (inputModeCapacity !== null) {
    out.calculationMode = inputModeCapacity === 3
      ? 'fixed-capacity-adjust-cond-temp'
      : 'fixed-capacity';
  }

  // AirPressureInputMode: 0 = Air pressure (mbar), 1 = Altitude (m).
  const airPressureInputMode = getNum(uAny, 'AirPressureInputMode');
  if (airPressureInputMode !== null) {
    out.pressureMode = airPressureInputMode === 1 ? 'altitude' : 'air-pressure';
  }

  // Booleans mit Direkt-Mapping — API kennt keine Undefineds, aber wir wollen
  // fehlende Keys nicht mit `false` überschreiben.
  copyBoolean(uAny, out, 'IsAirRelHumidityAuto',       'humidityAuto');
  copyBoolean(uAny, out, 'IsMaxFluidPressureDropAuto', 'maxPressureDropAuto');
  copyBoolean(uAny, out, 'WetCoilFactor',              'wetCoilFactor');
  copyBoolean(uAny, out, 'FrostedCoil',                'frostedCoil');

  // CapacitySensibleHeatOnly ist invertiert zum Store-Toggle
  // `capacityWithHumidityFactor` (Screenshot cat1 rechts: Häkchen gesetzt
  // → SensibleHeatOnly=false).
  const sensibleOnly = getBool(uAny, 'CapacitySensibleHeatOnly');
  if (sensibleOnly !== null) out.capacityWithHumidityFactor = !sensibleOnly;

  // FluidPumpMode: 0 = Pumpe (Feed rate zeigen), 1 = gravity flooded.
  const pumpMode = getNum(uAny, 'FluidPumpMode');
  if (pumpMode !== null) out.gravityFlooded = pumpMode === 1;

  // FluidPumpRate: Fixture-Files enthalten NaN-artige Grabage-Werte
  // (1.69761312256888E-312) für Kategorien ohne Pumpe. Solche filtern.
  const pumpRate = getNum(uAny, 'FluidPumpRate');
  if (pumpRate !== null && Number.isFinite(pumpRate) && pumpRate > 1e-6) {
    out.pumpFeedRate = pumpRate;
  }

  // MultipleCircuits + NoOfCircuitsThermo
  const multi = getNum(uAny, 'MultipleCircuits');
  if (multi !== null) out.multipleCircuits = multi === 1;
  const nCircuits = getNum(uAny, 'NoOfCircuitsThermo');
  if (nCircuits !== null && nCircuits > 0) out.noOfCircuits = nCircuits;

  // FluidPressureDropMax kommt in mbar bzw. K, je nach Medium.
  // Wir schreiben in BEIDE Slots — der Wizard-Renderer wählt sichtbaren aus.
  // Für den bar-Slot mbar → bar (÷1000), für den K-Slot Wert direkt.
  const pdropMax = getNum(uAny, 'FluidPressureDropMax');
  if (pdropMax !== null) {
    out.maxPressureDropK   = pdropMax;
    out.maxPressureDropBar = pdropMax / 1000;
  }

  // Transcritic-Sub-Objekt (nur relevant für Cat 10 Gas cooler CO₂).
  const isSubcritic   = getBool(uAny, 'IsSubcritic');
  const isSupercritic = getBool(uAny, 'IsSupercritic');
  const enabled = (isSubcritic === true) && (isSupercritic === true);
  if (isSubcritic !== null || isSupercritic !== null) {
    const t: TranscriticConfig = {
      enabled,
      supercriticPressureMbar:     getNum(uAny, 'FluidPressure'),
      subcriticCapacityKw:         numOrNull(getNum(uAny, 'SubcriticThermalCapacity'), (v) => v / 1000),
      subcriticFluidTempInletC:    getNum(uAny, 'SubcriticFluidTempInlet'),
      subcriticFluidTempCondC:     getNum(uAny, 'SubcriticFluidTempCond'),
      subcriticAirTempC:           getNum(uAny, 'SubcriticAirTemperature'),
      subcriticRelHumidityPct:     getNum(uAny, 'SubcriticAirRelHumidity'),
      subcriticMaxPressureDropBar: numOrNull(getNum(uAny, 'SubcriticFluidPressureDropMax'), (v) => v / 1000)
    };
    out.transcritic = t;
  }

  return out as Partial<ConfigurationParameters>;
}

// ─── Hilfsfunktionen für den Sonderfall-Block ───────────────────────────

/**
 * Liest einen Property-Wert case-tolerant aus einem beliebigen Objekt.
 * Die GPC-EU-API antwortet mit PascalCase (`FluidTempCond`), die
 * Fixture-JSONs unter nuxt/public/ sind aber camelCase-Snapshots
 * (`fluidTempCond`). Wir versuchen erst den vom Aufrufer angegebenen
 * Schlüssel, dann die andere Groß-/Kleinschreibung am ersten Buchstaben.
 */
function readCaseTolerant(o: Record<string, unknown>, key: string): unknown {
  if (key in o) return o[key];
  const first = key.charAt(0);
  const alt = first === first.toUpperCase()
    ? first.toLowerCase() + key.slice(1)
    : first.toUpperCase() + key.slice(1);
  return o[alt];
}

function getNum(o: Record<string, unknown>, key: string): number | null {
  const v = readCaseTolerant(o, key);
  if (typeof v === 'number') return v;
  return null;
}
function getBool(o: Record<string, unknown>, key: string): boolean | null {
  const v = readCaseTolerant(o, key);
  if (typeof v === 'boolean') return v;
  return null;
}
function copyBoolean(
  src: Record<string, unknown>,
  dst: Record<string, unknown>,
  apiKey: string,
  storeKey: string
): void {
  const v = getBool(src, apiKey);
  if (v !== null) dst[storeKey] = v;
}
function numOrNull(v: number | null, transform: (n: number) => number): number | null {
  return v === null ? null : transform(v);
}

// ============================================================
// FluidID Look-up — R-Nummer / Kurzname → numerische FluidID
// ============================================================

/**
 * Cache für den letzten `useGpceu().fluids()`-Call. Wird vom Store bzw.
 * vom Wizard beim Fluid-Change gepflegt.
 */
let fluidCache: Array<{ id: number; code: string; name?: string }> | null = null;

export function setFluidLookupCache(fluids: Array<{ id: number; code: string; name?: string }>): void {
  fluidCache = fluids;
}

/**
 * Löst einen R-Nummer-String (z. B. "R448A") auf eine numerische FluidID
 * auf, indem der Cache aus `useGpceu().fluids()` konsultiert wird. Wird
 * kein Match gefunden, wirft die Funktion — Aufrufer sollten sicherstellen,
 * dass der Cache gefüllt ist, bevor sie einen Payload zusammenbauen.
 */
export function resolveFluidId(code: string): number {
  if (!fluidCache) {
    throw new Error(
      '[unitInputDataMapper] Fluid cache is empty — call setFluidLookupCache() ' +
      'with the response of useGpceu().fluids() before resolving IDs.'
    );
  }
  const norm = code.trim().toLowerCase();
  const hit = fluidCache.find((f) => f.code?.toLowerCase() === norm || f.name?.toLowerCase() === norm);
  if (!hit) throw new Error(`[unitInputDataMapper] No FluidID found for "${code}".`);
  return hit.id;
}

/**
 * Sammelt Metadaten pro Property aus `gpc-parameters.json` — für den
 * DynamicParameterField-Renderer. Nur bei Bedarf importieren; bei
 * Tree-Shaking bleibt die Konstante draußen, wenn nicht referenziert.
 */
export const RAW_PARAMETERS: ReadonlyArray<RawParam> = RAW.parameters;
