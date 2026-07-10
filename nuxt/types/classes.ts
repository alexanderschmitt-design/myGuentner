/**
 * myGPC — Architecture Classes (TypeScript-Port)
 * -----------------------------------------------
 * Single source of truth for the kategorie-aware Wizard-UI:
 *
 *   A   DX-Refrigerant-Cold        cat=0   (Phase-Change, Dew Point, Superheat/Subcool)
 *   B   Pump-Refrigerant-Cold      cat=1   (gravity flooded + Feed rate)
 *   C   Coolant-Cold               cat=2   (Glykol + Concentration + Inlet/Outlet)
 *   D1  Condenser-Warm             cat=3   (Multiple circuits, Hot gas, Subcooler)
 *   D2  Subcooler-Warm             cat=5   (Refrigerant + Inlet/Outlet, reduced)
 *   E1  Coolant-Warm-Glycol        cat=4   (Glycol + THREAD/FLANGE + Ball valve)
 *   E2  Coolant-Warm-Oil           cat=6   (Oil + no Concentration, reduced)
 *   F   CO2-Gas-Cooler-DualMode    cat=10  (Supercritic + Subcritic parallel)
 *
 * Vorlage: `frontend/mygpc-class-config.js` (Vanilla IIFE). Diese Datei ist die
 * kanonische TS-Quelle für den Nuxt-Stack — Vanilla bleibt unverändert weiter
 * lauffähig, zukünftige Anpassungen sollten beide synchron halten.
 */

export type ClassId = 'A' | 'B' | 'C' | 'D1' | 'D2' | 'E1' | 'E2' | 'F';

export type Side = 'cold' | 'warm';

export type FluidFamily = 'refrigerant' | 'coolant' | 'oil' | 'co2';

export type ParamMode =
  | 'phase-change'
  | 'pump'
  | 'inlet-outlet'
  | 'dual-supercritic-subcritic';

export type ProductSection = 1 | 2; // 1 = Unit, 2 = Bare coil

/**
 * Die 8 GPC.EU-API ProductCategory-IDs für productSection=1.
 * Lücke bei 7/8/9 ist beabsichtigt (Marketing-IDs, nicht Customer-API).
 */
export type ProductCategory = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 10;

export interface ClassInfo {
  readonly id: ClassId;
  readonly name: string;
  readonly side: Side;
  readonly fluidFamily: FluidFamily;
  readonly paramMode: ParamMode;
  readonly productCategory: ProductCategory;
}

export const CLASSES: Readonly<Record<ClassId, ClassInfo>> = Object.freeze({
  A:  { id: 'A',  name: 'DX-Refrigerant-Cold',     side: 'cold', fluidFamily: 'refrigerant', paramMode: 'phase-change',                  productCategory: 0 },
  B:  { id: 'B',  name: 'Pump-Refrigerant-Cold',   side: 'cold', fluidFamily: 'refrigerant', paramMode: 'pump',                          productCategory: 1 },
  C:  { id: 'C',  name: 'Coolant-Cold',            side: 'cold', fluidFamily: 'coolant',     paramMode: 'inlet-outlet',                  productCategory: 2 },
  D1: { id: 'D1', name: 'Condenser-Warm',          side: 'warm', fluidFamily: 'refrigerant', paramMode: 'phase-change',                  productCategory: 3 },
  D2: { id: 'D2', name: 'Subcooler-Warm',          side: 'warm', fluidFamily: 'refrigerant', paramMode: 'inlet-outlet',                  productCategory: 5 },
  E1: { id: 'E1', name: 'Coolant-Warm-Glycol',     side: 'warm', fluidFamily: 'coolant',     paramMode: 'inlet-outlet',                  productCategory: 4 },
  E2: { id: 'E2', name: 'Coolant-Warm-Oil',        side: 'warm', fluidFamily: 'oil',         paramMode: 'inlet-outlet',                  productCategory: 6 },
  F:  { id: 'F',  name: 'CO2-Gas-Cooler-DualMode', side: 'warm', fluidFamily: 'co2',         paramMode: 'dual-supercritic-subcritic',    productCategory: 10 },
});

/**
 * Reverse-Lookup ProductCategory → ClassId. Wird vom Wizard verwendet, wenn der
 * User in Step 1 eine Category wählt und der Store die zugehörige Klasse ableiten muss.
 */
export const CAT_TO_CLASS: Readonly<Record<ProductCategory, ClassId>> = Object.freeze({
  0:  'A',
  1:  'B',
  2:  'C',
  3:  'D1',
  4:  'E1',
  5:  'D2',
  6:  'E2',
  10: 'F',
});

/**
 * Liefert die ClassId für eine gegebene ProductSection + ProductCategory.
 * `productSection=2` (Bare coil) ist ein separater Flow und wird hier nicht abgedeckt
 * — Aufrufer bekommen `null` zurück und können explizit Bare-Coil-Logik bauen.
 */
export function classOf(
  productSection: ProductSection | number | null | undefined,
  productCategory: ProductCategory | number | null | undefined,
): ClassId | null {
  if (productSection !== 1) return null;
  if (productCategory == null) return null;
  return CAT_TO_CLASS[productCategory as ProductCategory] ?? null;
}

/**
 * Prüft, ob ein Feld/Section für die aktuelle Klasse sichtbar ist.
 *
 * Konvention aus dem Vanilla-Frontend (data-gpc-classes-Attribut):
 *   - `classesAttr=null`/empty → sichtbar für ALLE Klassen
 *   - `classesAttr="A,B,C"`    → nur sichtbar wenn currentClass ∈ {A,B,C}
 *   - `notClassesAttr="F"`     → überall sichtbar AUSSER bei Class F (Vorrang vor classesAttr)
 *   - `currentClass=null`      → vor Step-1-Auswahl: alles zeigen
 */
export function matchesClass(
  currentClass: ClassId | null | undefined,
  classesAttr?: string | null,
  notClassesAttr?: string | null,
): boolean {
  if (!currentClass) return true;

  if (notClassesAttr) {
    const notList = parseClassList(notClassesAttr);
    if (notList.includes(currentClass)) return false;
  }

  if (classesAttr) {
    const list = parseClassList(classesAttr);
    if (list.length === 0) return true;
    return list.includes(currentClass);
  }

  return true;
}

function parseClassList(attr: string): ClassId[] {
  return attr
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s): s is ClassId => s in CLASSES);
}

// ============================================================
// Converters — bidirektionale Wertumrechnung API ↔ UI
// ============================================================

export type ConverterName = 'W-kW' | 'mbar-bar' | 'bool-int' | 'bool-invert';

export interface Converter<TApi, TUi> {
  readonly toUI: (v: TApi | null | undefined) => TUi | null;
  readonly toAPI: (v: TUi | null | undefined) => TApi | null;
}

/** thermalCapacity etc.: API in Watts, UI in Kilowatt. */
export const W_TO_KW: Converter<number, number> = {
  toUI:  (v) => (v == null ? null : v / 1000),
  toAPI: (v) => (v == null ? null : v * 1000),
};

/** fluidPressureDropMax bei Coolant: API in mbar, UI in bar. */
export const MBAR_TO_BAR: Converter<number, number> = {
  toUI:  (v) => (v == null ? null : v / 1000),
  toAPI: (v) => (v == null ? null : v * 1000),
};

/** Manche API-Felder sind int (0/1) statt bool. */
export const BOOL_INT: Converter<number, boolean> = {
  toUI:  (v) => v === 1,
  toAPI: (v) => (v ? 1 : 0),
};

/**
 * Invertiert: UI-checked = API-false. Beispiel:
 * "Capacity including humidity factor" ☑ ⇔ `capacitySensibleHeatOnly=false`.
 */
export const BOOL_INVERT: Converter<boolean, boolean> = {
  toUI:  (v) => !v,
  toAPI: (v) => !v,
};

const CONVERTERS_BY_NAME: Readonly<Record<ConverterName, Converter<any, any>>> = Object.freeze({
  'W-kW':       W_TO_KW,
  'mbar-bar':   MBAR_TO_BAR,
  'bool-int':   BOOL_INT,
  'bool-invert': BOOL_INVERT,
});

/**
 * Liefert den Converter zu einem Namen — wird vom generic ParameterInput.vue gebraucht,
 * das die Converter-ID als String-Prop bekommt (analog dem Vanilla `data-gpc-convert`-Attribut).
 */
export function getConverter(name?: ConverterName | null): Converter<any, any> | null {
  if (!name) return null;
  return CONVERTERS_BY_NAME[name] ?? null;
}

export function applyToUI<TApi, TUi>(name: ConverterName | null | undefined, value: TApi | null | undefined): TUi | TApi | null {
  const c = getConverter(name);
  if (!c) return value as TUi | TApi | null;
  return c.toUI(value);
}

export function applyToAPI<TUi, TApi>(name: ConverterName | null | undefined, value: TUi | null | undefined): TApi | TUi | null {
  const c = getConverter(name);
  if (!c) return value as TApi | TUi | null;
  return c.toAPI(value);
}

// ============================================================
// Convenience-Helper für Pillar B (parameterDefinitions) und Pillar A (Components)
// ============================================================

/** Alle 8 ClassIds als Array, sortiert (Cold-Side zuerst). */
export const ALL_CLASSES: readonly ClassId[] = Object.freeze(['A', 'B', 'C', 'D1', 'D2', 'E1', 'E2', 'F'] as const);

/** Cold-Side-Klassen (Step-2-Verdampfer-Layouts). */
export const COLD_CLASSES: readonly ClassId[] = Object.freeze(['A', 'B', 'C'] as const);

/** Warm-Side-Klassen (Step-2-Verflüssiger/Subcooler/Drycooler-Layouts). */
export const WARM_CLASSES: readonly ClassId[] = Object.freeze(['D1', 'D2', 'E1', 'E2', 'F'] as const);

/** Klassen mit Refrigerant-Fluid (relevant für `fluid.hasImpact`-Logik). */
export const REFRIGERANT_CLASSES: readonly ClassId[] = Object.freeze(['A', 'B', 'D1', 'D2'] as const);

/**
 * Schnell-Check: Cold oder Warm Side?
 *   isColdSide('A')  → true
 *   isColdSide('D1') → false
 *   isColdSide(null) → false
 */
export function isColdSide(cls: ClassId | null | undefined): boolean {
  if (!cls) return false;
  return CLASSES[cls].side === 'cold';
}

export function isWarmSide(cls: ClassId | null | undefined): boolean {
  if (!cls) return false;
  return CLASSES[cls].side === 'warm';
}
