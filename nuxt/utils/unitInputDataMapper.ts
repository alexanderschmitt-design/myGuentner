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
import type { ConfigurationParameters } from '~/stores/configuration';

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
  concentrationVolPct: { apiName: 'FluidVolConcentration' as keyof UnitInputData }
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
  p: ConfigurationParameters
): Partial<UnitInputData> {
  const patch: Record<string, unknown> = {};
  for (const [legacyKey, field] of Object.entries(LEGACY_MAP)) {
    if (!field) continue;
    const val = (p as Record<string, unknown>)[legacyKey];
    if (val === null || val === undefined) continue;
    patch[field.apiName as string] = field.toApi ? field.toApi(val) : val;
  }
  return patch as Partial<UnitInputData>;
}

/**
 * Rück-Mapping: `UnitInputData` → `Partial<ConfigurationParameters>`.
 * Nützlich beim initialen Hydraten des Stores aus einer geladenen
 * GPC-Datei (uploadFile → getNativeContents → getInputData).
 */
export function legacyParametersFromUnitInputData(
  u: UnitInputData
): Partial<ConfigurationParameters> {
  const out: Record<string, unknown> = {};
  const uAny = u as unknown as Record<string, unknown>;
  for (const [legacyKey, field] of Object.entries(LEGACY_MAP)) {
    if (!field) continue;
    const val = uAny[field.apiName as string];
    if (val === undefined) continue;
    out[legacyKey] = field.fromApi ? field.fromApi(val) : val;
  }
  return out as Partial<ConfigurationParameters>;
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
