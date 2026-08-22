/**
 * seriesCatalog — Katalog der Güntner-Serien pro Produktkategorie mit
 * Verfügbarkeits-Regeln je nach Kältemittel (Impact vs. Non-Impact) und
 * Accessory-Kompatibilität.
 *
 * **Visual truth für Cat 0 (Evaporator DX)** aus Screenshots
 * (Screenshot 2026-08-22 215313 = Impact/CX, 215323 = Non-Impact/RX-PX-Mix):
 *
 *   Impact-Refrigerant (R744, R717, HC-Naturals):
 *     🟢 Mini COMPACT — GAMC CX
 *     🟢 Slim COMPACT — GASC CX
 *     🟢 Dual COMPACT — GADC CX
 *     🟢 Cubic COMPACT — GACC CX
 *     🟢 Cubic VARIO — GACV CX
 *     🔴 Process APPLICATION — GADP CX
 *
 *   Non-Impact-Refrigerant (HFC/HFO-Blends: R448A, R449A, R134a, R32 …):
 *     🟢 Mini COMPACT — GAMC PX
 *     🟢 Slim COMPACT — GASC RX
 *     🟢 Dual COMPACT — GADC RX
 *     🟢 Cubic COMPACT — GACC RX
 *     🟢 Dual VARIO — DHN
 *     🟢 Cubic VARIO — GACV RX
 *     🔴 Process APPLICATION — GADP RX
 *     🔴 Process APPLICATION — GBK
 *     🟢 Agri APPLICATION — GACA RX
 *     🟢 Blast APPLICATION — GAFB
 *
 * **Visual truth für Cat 1 (Evaporator Pump)** aus Screenshots
 * (Screenshot 2026-08-22 221044 = Impact, 221055 = Non-Impact):
 *
 *   Impact-Refrigerant (R717 NH3, R744 CO2, HC-Naturals):
 *     🟢 Dual VARIO — ADHN
 *     🟢 Cubic VARIO — GACV AP
 *
 *   Non-Impact-Refrigerant (HFC-Blends):
 *     🟢 Dual VARIO — ADHN
 *
 * **Visual truth für Cat 2 (Air Cooler / Coolant)** aus Screenshots
 * (Screenshot 2026-08-22 221650 = Fluids-Dropdown, 221638 = Serien-Liste):
 *
 *   Fluids-Dropdown (grüner Blatt-Marker = Impact):
 *     🌿 Ethanol
 *     🌿 Ethylene glycol
 *     🌿 Propylene glycol
 *     🌿 Water (R718)
 *     ✗  Thermogen 1869
 *
 *   Serien-Liste (Impact-Case, FP-Suffix + spezifische Glycol-Serien):
 *     🟢 Slim COMPACT — GASC FP
 *     🟢 Dual COMPACT — GADC FP
 *     🟢 Cubic COMPACT — GACC FP
 *     🟢 Dual VARIO — DGN (dual discharge glycol unit coolers)
 *     🟢 Cubic VARIO — GACV FP
 *     🔴 Process APPLICATION — GADP FP
 *     🟢 Process APPLICATION — GGBK (processing room glycol unit coolers)
 *     🟢 Agri APPLICATION — GACA FP
 *
 *   Non-Impact-Serien-Liste (Thermogen o. ä.): (TBD — Screenshot fehlt)
 *
 * **Visual truth für Cat 3 (Condenser)** aus Screenshot 2026-08-22 222402:
 *
 *   Serien-Liste (Refrigerant = R744 CO2, GC-Präfix, keine Suffix-Variante
 *   sichtbar → gleiche Liste für Impact + Non-Impact):
 *     🟢 Flat COMPACT — GCHC
 *     🟢 Vertical COMPACT — GCVC
 *     🟢 V-shape COMPACT — GCDC
 *     🟢 Flat VARIO — GCHV
 *     🟢 Vertical VARIO — GCVV
 *     🟢 V-shape VARIO — GVW (W aircooled condensers)
 *     🟢 V-shape VARIO — GVD (Aircooled condensers V-shape)
 *     🟢 V-shape VARIO — GCDV
 *
 * **Visual truth für Cat 4 (Dry Cooler)** aus Screenshots 2026-08-22
 * 222745 (Fluids-Dropdown, Thermogen 1869 = Non-Impact selektiert) und
 * 222954 (Serien-Liste im Non-Impact-Case):
 *
 *   Fluids: Ethanol / Ethylene glycol / Propylene glycol / Water (R718)
 *     = Impact; Thermogen 1869 = Non-Impact.
 *
 *   Serien-Liste im Non-Impact-Case — 8 GF-Serien, alle grün. Impact-
 *   Case-Screenshot fehlt; da Cat 4 wie Cat 3 (Condenser) refrigerant-/
 *   fluid-agnostisch scheint, wird dieselbe Liste in beiden Buckets
 *   angezeigt.
 *     🟢 Flat COMPACT — GFHC
 *     🟢 Vertical COMPACT — GFVC
 *     🟢 V-shape COMPACT — GFDC
 *     🟢 Flat VARIO — GFHV
 *     🟢 Vertical VARIO — GFVV
 *     🟢 V-shape VARIO — GFW (W dry coolers)
 *     🟢 V-shape VARIO — GFD (Dry coolers V-shape coil)
 *     🟢 V-shape VARIO — GFDV
 *
 * **Visual truth für Cat 5 (Subcooler)** aus Screenshots 2026-08-22
 * 223200 (Medium-Dropdown, R404A selektiert) und 223206 (Serien im
 * Non-Impact-Case):
 *
 *   Medium-Dropdown im Non-Impact-Case: R404A / R407A / R407C / R407F /
 *   R408A / R409A — alle HFC-Blends, keiner mit Impact-Leaf.
 *
 *   Serien im Non-Impact-Case (GS-Präfix, nur COMPACT-Familie):
 *     🟢 Flat COMPACT — GSHC
 *     🟢 Vertical COMPACT — GSVC
 *
 *   Impact-Case (z. B. R744 CO2): Screenshot fehlt — Annahme gleicher
 *   Serien-Slot bis zur visuellen Bestätigung.
 *
 * **Visual truth für Cat 6 (Oil Cooler)** aus Screenshots 2026-08-22
 * 223706 (Medium-Dropdown mit Schmierölen) und 223714 (Serien-Liste):
 *
 *   Medium-Dropdown: Bitzer B150 SH / Bitzer BSE 170 / ISO VG32 / ISO
 *   VG46 / ISO VG68 / Shell T46 — reine Schmieröle, alle Non-Impact.
 *
 *   Serien-Liste (GO-Präfix, nur COMPACT-Familie parallel zu Cat 5):
 *     🟢 Flat COMPACT — GOHC
 *     🟢 Vertical COMPACT — GOVC
 *
 * **Visual truth für Cat 10 (Gas Cooler CO₂)** aus Screenshots 2026-08-22
 * 223939 (Medium-Dropdown) und 223947 (Serien-Liste):
 *
 *   Medium-Dropdown: nur CO2 (R744) mit Impact-Leaf — Dropdown ist
 *   disabled/nur eine Option, weil Cat 10 CO2-only ausgelegt ist.
 *
 *   Serien-Liste im Impact-Case (GG-Präfix, 5 Serien; keine V-shape VARIO):
 *     🟢 Flat COMPACT — GGHC
 *     🟢 Vertical COMPACT — GGVC
 *     🟢 V-shape COMPACT — GGDC
 *     🟢 Flat VARIO — GGHV
 *     🟢 Vertical VARIO — GGVV
 *
 *   Non-Impact-Case existiert für Cat 10 nicht (kein Non-CO₂-Fluid
 *   auswählbar), Bucket bleibt strukturell leer.
 *
 * Später soll dieser Slot gegen einen `findUnits`-Live-Call ausgetauscht
 * werden — die UI-Datenshape bleibt gleich, nur die Herkunft ändert sich.
 */

/**
 * Accessory-Keys korrelieren 1:1 mit `UnitSelectionOpts` in
 * `stores/configuration.ts`. `undefined` = no constraint (series unterstützt
 * beides). `true` = braucht die Option (rare). `false` = inkompatibel — Serie
 * wird rot markiert, wenn User die Option aktiviert.
 */
export type AccessoryKey =
  | 'epoxyCoatedFins'
  | 'airSockWithStreamer'
  | 'coilDefender'
  | 'guentnerStreamer'
  | 'hotGasInterconnectingTubing'
  | 'repairSwitch'
  | 'fanRingHeater'
  | 'doubleTrayInsulated'
  | 'casingSimpleTraySs'
  | 'casingDoubleTraySs'
  | 'legsForFloorMounting'
  | 'inletHood'
  | 'louvreWithDrive'

export interface SeriesDefinition {
  /** Stabiler Key für Vue-Listen + Selection-State. */
  id: string
  /** Anzeige-Titel — "Mini COMPACT – GAMC CX". */
  title: string
  /** Untertitel — Anwendungs-Kurzbeschreibung. */
  subtitle: string
  /** Thumb-Pfad; fällt auf generisches Air-Cooler-Icon zurück, wenn Serie
   *  keine eigene Grafik hat. */
  image: string
  /** true = Serie in Impact-Refrigerant-Auswahl zeigen (CX-Suffix o. ä.).
   *  false = in Non-Impact-Auswahl zeigen (PX/RX/legacy). Das Feld
   *  entscheidet, ob der Katalog-Eintrag zur aktuellen Auswahl gehört. */
  refrigerantMatch: 'impact' | 'nonImpact'
  /** Wenn `false`, wird die Serie mit rotem Punkt (nicht auswählbar)
   *  vorbelegt — matched dem Screenshot-Zustand ohne aktivierte Filter. */
  defaultAvailable: boolean
  /** Optional. Wenn `false` für einen Accessory-Key gesetzt: Serie wird
   *  automatisch rot, sobald der User das Accessory aktiviert. */
  supports?: Partial<Record<AccessoryKey, boolean>>
}

const AIR_COOLER_ICON = '/icons/coil-air-cooler.svg'
const CONDENSER_ICON  = '/icons/coil-condenser.svg'
const DRY_COOLER_ICON = '/icons/coil-dry-cooler.svg'
const SUBCOOLER_ICON  = '/icons/coil-sub-cooler.svg'

/**
 * Cat 0 — Evaporator DX. Reihenfolge im Array = Reihenfolge im UI-Panel.
 * Suffix-Mapping folgt Güntner-Konvention:
 *   CX = CO2-transkritisch/subkritisch (R744)
 *   PX = Kohlenwasserstoffe (R290, R600, R600a) — Impact via Natural HC
 *   NX = NH3-Serien (R717) — (in Cat 0 nicht explizit sichtbar)
 *   RX = A2L / HFC-Blends
 *   ohne Suffix / DHN / GBK / GAFB = App-spezifische Legacy
 */
const CAT_0_EVAPORATOR_DX: SeriesDefinition[] = [
  // ---------- Impact-Refrigerant-Liste (CX-Suffix) ----------
  {
    id: 'gamc-cx',
    title: 'Mini COMPACT – GAMC CX',
    subtitle: 'Air cooler – ultra-slim design',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: { airSockWithStreamer: false, epoxyCoatedFins: true }
  },
  {
    id: 'gasc-cx',
    title: 'Slim COMPACT – GASC CX',
    subtitle: 'Air cooler – slimline design',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: { airSockWithStreamer: false, epoxyCoatedFins: true }
  },
  {
    id: 'gadc-cx',
    title: 'Dual COMPACT – GADC CX',
    subtitle: 'Air cooler – dual discharge, compact',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: { airSockWithStreamer: false, epoxyCoatedFins: true }
  },
  {
    id: 'gacc-cx',
    title: 'Cubic COMPACT – GACC CX',
    subtitle: 'Air cooler – cubic design, compact',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: { airSockWithStreamer: false, epoxyCoatedFins: true, guentnerStreamer: true }
  },
  {
    id: 'gacv-cx',
    title: 'Cubic VARIO – GACV CX',
    subtitle: 'Air cooler – cubic design, variable',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: { airSockWithStreamer: true, epoxyCoatedFins: true, guentnerStreamer: true, coilDefender: true }
  },
  {
    id: 'gadp-cx',
    title: 'Process APPLICATION – GADP CX',
    subtitle: 'Air cooler – for processing rooms, draught-reduced',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: false,
    supports: {}
  },

  // ---------- Non-Impact-Refrigerant-Liste (PX/RX/Legacy) ----------
  {
    id: 'gamc-px',
    title: 'Mini COMPACT – GAMC PX',
    subtitle: 'Air cooler – ultra-slim design',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: { airSockWithStreamer: false, epoxyCoatedFins: true }
  },
  {
    id: 'gasc-rx',
    title: 'Slim COMPACT – GASC RX',
    subtitle: 'Air cooler – slimline design',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: { airSockWithStreamer: false, epoxyCoatedFins: true }
  },
  {
    id: 'gadc-rx',
    title: 'Dual COMPACT – GADC RX',
    subtitle: 'Air cooler – dual discharge, compact',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: { airSockWithStreamer: false, epoxyCoatedFins: true }
  },
  {
    id: 'gacc-rx',
    title: 'Cubic COMPACT – GACC RX',
    subtitle: 'Air cooler – cubic design, compact',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: { airSockWithStreamer: false, epoxyCoatedFins: true, guentnerStreamer: true }
  },
  {
    id: 'dhn',
    title: 'Dual VARIO – DHN',
    subtitle: 'Dual discharge unit coolers',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: { epoxyCoatedFins: true }
  },
  {
    id: 'gacv-rx',
    title: 'Cubic VARIO – GACV RX',
    subtitle: 'Air cooler – cubic design, variable',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: { airSockWithStreamer: true, epoxyCoatedFins: true, guentnerStreamer: true, coilDefender: true }
  },
  {
    id: 'gadp-rx',
    title: 'Process APPLICATION – GADP RX',
    subtitle: 'Air cooler – for processing rooms, draught-reduced',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: false,
    supports: {}
  },
  {
    id: 'gbk',
    title: 'Process APPLICATION – GBK',
    subtitle: 'Processing room unit coolers',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: false,
    supports: {}
  },
  {
    id: 'gaca-rx',
    title: 'Agri APPLICATION – GACA RX',
    subtitle: 'Air cooler – fruit and vegetable cooling, blow-through',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: { epoxyCoatedFins: true }
  },
  {
    id: 'gafb',
    title: 'Blast APPLICATION – GAFB',
    subtitle: 'Blast freezer – fast cooling, freezing',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: {}
  }
]

/**
 * Cat 1 — Evaporator Pump. Industriell-ausgerichtete Pump-Evaporator-Serie
 * für R717 NH3, R744 CO2 und Sekundärkreisläufe. Impact-Case zeigt Dual
 * VARIO ADHN + Cubic VARIO GACV AP; Non-Impact-Case reduziert auf ADHN.
 * ADHNs Untertitel erwähnt NH3 als primäre Anwendung, schließt aber
 * andere Fluide nicht aus — deshalb erscheint dieselbe Serie in beiden
 * Buckets als zwei Katalog-Einträge mit unterschiedlicher `id`.
 */
const CAT_1_EVAPORATOR_PUMP: SeriesDefinition[] = [
  // ---------- Impact-Refrigerant (R717 NH3, R744 CO2, HC-Naturals) ----------
  {
    id: 'adhn',
    title: 'Dual VARIO – ADHN',
    subtitle: 'Dual discharge NH3 evaporators (stainless steel/al.)',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gacv-ap',
    title: 'Cubic VARIO – GACV AP',
    subtitle: 'Air cooler – cubic design, variable',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  // ---------- Non-Impact-Refrigerant (HFC-Blends) ----------
  {
    id: 'adhn-legacy',
    title: 'Dual VARIO – ADHN',
    subtitle: 'Dual discharge NH3 evaporators (stainless steel/al.)',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: {}
  }
]

/**
 * Cat 2 — Air Cooler (Coolant / Liquid). Sekundärkreisläufe mit Glykol-,
 * Alkohol- oder Wasser-basierten Coolants. Impact-Case aus Screenshot
 * 2026-08-22 221638 (Fluid = Ethylene glycol) — Suffix "FP" bei Standard-
 * Familien plus zwei glycol-spezifische Legacy-Serien (DGN, GGBK).
 *
 * Non-Impact-Case (z. B. Thermogen 1869) ist visuell noch nicht bestätigt.
 * Vorläufig zeigt dieselbe Serien-Auswahl auch für Non-Impact-Fluids —
 * konservativer als eine leere Liste, aber falsch anzuzeigen wäre
 * schlimmer als das TODO. Refinement, sobald Screenshot vorliegt.
 */
const CAT_2_AIR_COOLER_IMPACT: SeriesDefinition[] = [
  {
    id: 'gasc-fp',
    title: 'Slim COMPACT – GASC FP',
    subtitle: 'Air cooler – slimline design',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gadc-fp',
    title: 'Dual COMPACT – GADC FP',
    subtitle: 'Air cooler – dual discharge, compact',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gacc-fp',
    title: 'Cubic COMPACT – GACC FP',
    subtitle: 'Air cooler – cubic design, compact',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'dgn',
    title: 'Dual VARIO – DGN',
    subtitle: 'Dual discharge glycol unit coolers',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gacv-fp',
    title: 'Cubic VARIO – GACV FP',
    subtitle: 'Air cooler – cubic design, variable',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gadp-fp',
    title: 'Process APPLICATION – GADP FP',
    subtitle: 'Air cooler – for processing rooms, draught-reduced',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: false,
    supports: {}
  },
  {
    id: 'ggbk',
    title: 'Process APPLICATION – GGBK',
    subtitle: 'Processing room glycol unit coolers',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gaca-fp',
    title: 'Agri APPLICATION – GACA FP',
    subtitle: 'Air cooler – fruit and vegetable cooling, blow-through',
    image: AIR_COOLER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  }
]

/**
 * Non-Impact-Bucket für Cat 2 — TODO: durch echte Auswahl ersetzen, sobald
 * Screenshot mit einem Non-Impact-Coolant (Thermogen 1869 o. ä.) vorliegt.
 * Klont vorläufig die Impact-Liste mit `-legacy`-ID-Suffix + Match-Flag.
 */
const CAT_2_AIR_COOLER_NONIMPACT: SeriesDefinition[] = CAT_2_AIR_COOLER_IMPACT.map(
  (s) => ({ ...s, id: `${s.id}-legacy`, refrigerantMatch: 'nonImpact' })
)

const CAT_2_AIR_COOLER: SeriesDefinition[] = [
  ...CAT_2_AIR_COOLER_IMPACT,
  ...CAT_2_AIR_COOLER_NONIMPACT
]

/**
 * Cat 3 — Condenser (luftgekühlte Verflüssiger). Standardmäßig für R744
 * CO2 (Impact) und HFC-Blends (Non-Impact) gleichermaßen ausgelegt — die
 * GC-Serien-Familie unterscheidet nicht via Suffix. Bis ein Non-Impact-
 * Screenshot etwas anderes zeigt, wird dieselbe Liste in beiden Buckets
 * gerendert (Duplikate mit `-legacy`-ID).
 */
const CAT_3_CONDENSER_IMPACT: SeriesDefinition[] = [
  {
    id: 'gchc',
    title: 'Flat COMPACT – GCHC',
    subtitle: 'Condenser – horizontal design, compact',
    image: CONDENSER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gcvc',
    title: 'Vertical COMPACT – GCVC',
    subtitle: 'Condenser – vertical design, compact',
    image: CONDENSER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gcdc',
    title: 'V-shape COMPACT – GCDC',
    subtitle: 'Condenser – V-shape, compact',
    image: CONDENSER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gchv',
    title: 'Flat VARIO – GCHV',
    subtitle: 'Condenser – horizontal design, variable',
    image: CONDENSER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gcvv',
    title: 'Vertical VARIO – GCVV',
    subtitle: 'Condenser – vertical design, variable',
    image: CONDENSER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gvw',
    title: 'V-shape VARIO – GVW',
    subtitle: 'W aircooled condensers',
    image: CONDENSER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gvd',
    title: 'V-shape VARIO – GVD',
    subtitle: 'Aircooled condensers (V-shape)',
    image: CONDENSER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gcdv',
    title: 'V-shape VARIO – GCDV',
    subtitle: 'Condenser – V-shape, variable',
    image: CONDENSER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  }
]

/**
 * Non-Impact-Bucket für Cat 3 — TODO: mit echter Auswahl abgleichen,
 * sobald ein Non-Impact-Screenshot vorliegt. Vorläufig identisch zur
 * Impact-Liste (Condenser-Suffixe scheinen refrigerant-agnostisch).
 */
const CAT_3_CONDENSER_NONIMPACT: SeriesDefinition[] = CAT_3_CONDENSER_IMPACT.map(
  (s) => ({ ...s, id: `${s.id}-legacy`, refrigerantMatch: 'nonImpact' })
)

const CAT_3_CONDENSER: SeriesDefinition[] = [
  ...CAT_3_CONDENSER_IMPACT,
  ...CAT_3_CONDENSER_NONIMPACT
]

/**
 * Cat 4 — Dry Cooler (Rückkühler, flüssig-gekühlte Sekundärkreise). GF-
 * Serien-Familie strukturell parallel zu Cat 3 (Condenser). Screenshot
 * 2026-08-22 222954 zeigt den Non-Impact-Case (Thermogen 1869); Impact-
 * Case ist visuell nicht bestätigt, wird aber wie Cat 3 als „identische
 * Liste" behandelt bis Screenshot vorliegt.
 */
const CAT_4_DRY_COOLER_NONIMPACT: SeriesDefinition[] = [
  {
    id: 'gfhc',
    title: 'Flat COMPACT – GFHC',
    subtitle: 'Fluid cooler – horizontal design, compact',
    image: DRY_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gfvc',
    title: 'Vertical COMPACT – GFVC',
    subtitle: 'Fluid cooler – vertical design, compact',
    image: DRY_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gfdc',
    title: 'V-shape COMPACT – GFDC',
    subtitle: 'Fluid cooler – V-shape, compact',
    image: DRY_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gfhv',
    title: 'Flat VARIO – GFHV',
    subtitle: 'Fluid cooler – horizontal design, variable',
    image: DRY_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gfvv',
    title: 'Vertical VARIO – GFVV',
    subtitle: 'Fluid cooler – vertical design, variable',
    image: DRY_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gfw',
    title: 'V-shape VARIO – GFW',
    subtitle: 'W dry coolers',
    image: DRY_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gfd',
    title: 'V-shape VARIO – GFD',
    subtitle: 'Dry coolers (V-shape coil)',
    image: DRY_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gfdv',
    title: 'V-shape VARIO – GFDV',
    subtitle: 'Fluid cooler – V-shape, variable',
    image: DRY_COOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: {}
  }
]

/**
 * Impact-Bucket für Cat 4 — TODO: durch echte Auswahl bestätigen, sobald
 * ein Impact-Screenshot (z. B. Fluid = Ethylene glycol) vorliegt. Klont
 * vorläufig die Non-Impact-Liste mit `-impact`-ID-Suffix.
 */
const CAT_4_DRY_COOLER_IMPACT: SeriesDefinition[] = CAT_4_DRY_COOLER_NONIMPACT.map(
  (s) => ({ ...s, id: `${s.id}-impact`, refrigerantMatch: 'impact' })
)

const CAT_4_DRY_COOLER: SeriesDefinition[] = [
  ...CAT_4_DRY_COOLER_IMPACT,
  ...CAT_4_DRY_COOLER_NONIMPACT
]

/**
 * Cat 5 — Subcooler (Nachkühler in HFC-Kreisläufen; useCategory führt Cat 5
 * als mediumType='liquid', der Dropdown zeigt aber R-Codes wie R404A —
 * Slug landet also z. B. als 'R404A' in `glycolType`). Screenshot 2026-08-22
 * 223206 zeigt nur zwei COMPACT-Serien (keine VARIO-Familie) — Subcooler
 * decken meist einen engeren Leistungsbereich ab als Kondensatoren.
 */
const CAT_5_SUBCOOLER_NONIMPACT: SeriesDefinition[] = [
  {
    id: 'gshc',
    title: 'Flat COMPACT – GSHC',
    subtitle: 'Subcooler – horizontal design, compact',
    image: SUBCOOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gsvc',
    title: 'Vertical COMPACT – GSVC',
    subtitle: 'Subcooler – vertical design, compact',
    image: SUBCOOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: {}
  }
]

/**
 * Impact-Bucket für Cat 5 — TODO: durch echte Auswahl bestätigen, sobald
 * Screenshot vorliegt (Subcooler in Impact-Kreisläufen wie R744 CO2).
 * Klont vorläufig die Non-Impact-Liste mit `-impact`-ID-Suffix.
 */
const CAT_5_SUBCOOLER_IMPACT: SeriesDefinition[] = CAT_5_SUBCOOLER_NONIMPACT.map(
  (s) => ({ ...s, id: `${s.id}-impact`, refrigerantMatch: 'impact' })
)

const CAT_5_SUBCOOLER: SeriesDefinition[] = [
  ...CAT_5_SUBCOOLER_IMPACT,
  ...CAT_5_SUBCOOLER_NONIMPACT
]

/**
 * Cat 6 — Oil Cooler (Schmieröl-Rückkühler für Verdichter). Der Medium-
 * Dropdown listet ausschließlich Schmieröle (Bitzer / ISO VG-Klassen /
 * Shell) — keine haben Impact-Marker, deshalb ist der Impact-Bucket
 * strukturell ungenutzt. Wir pflegen ihn trotzdem als Klon der Non-Impact-
 * Liste, falls in Zukunft Bio-Öle als Impact eingeführt werden.
 * Icon: `SUBCOOLER_ICON` reused (dieselbe COMPACT-only Familie).
 */
const CAT_6_OIL_COOLER_NONIMPACT: SeriesDefinition[] = [
  {
    id: 'gohc',
    title: 'Flat COMPACT – GOHC',
    subtitle: 'Oil cooler – horizontal design, compact',
    image: SUBCOOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'govc',
    title: 'Vertical COMPACT – GOVC',
    subtitle: 'Oil cooler – vertical design, compact',
    image: SUBCOOLER_ICON,
    refrigerantMatch: 'nonImpact',
    defaultAvailable: true,
    supports: {}
  }
]

/**
 * Impact-Bucket für Cat 6 — aktuell strukturell leer (Schmieröle tragen
 * keinen Impact-Marker). Klon der Non-Impact-Liste mit `-impact`-Suffix
 * bis ggf. Bio-Öle als Impact-Fluid eingeführt werden.
 */
const CAT_6_OIL_COOLER_IMPACT: SeriesDefinition[] = CAT_6_OIL_COOLER_NONIMPACT.map(
  (s) => ({ ...s, id: `${s.id}-impact`, refrigerantMatch: 'impact' })
)

const CAT_6_OIL_COOLER: SeriesDefinition[] = [
  ...CAT_6_OIL_COOLER_IMPACT,
  ...CAT_6_OIL_COOLER_NONIMPACT
]

/**
 * Cat 10 — Gas Cooler CO₂ (transkritische / superkritische Kühlung).
 * Ausschließlich R744 (CO2) — Fluid-Dropdown ist auf eine Option
 * eingeschränkt und trägt immer Impact-Marker. Deshalb existiert
 * strukturell nur der Impact-Bucket; Non-Impact-Bucket bleibt leer.
 * GG-Präfix, 5 Serien (COMPACT-Familie + zwei VARIO; keine V-shape VARIO
 * anders als bei Cat 3/4). Icon: `CONDENSER_ICON` reused (Gas Cooler ist
 * strukturell ein superkritischer Kondensator).
 */
const CAT_10_GAS_COOLER: SeriesDefinition[] = [
  {
    id: 'gghc',
    title: 'Flat COMPACT – GGHC',
    subtitle: 'Gas cooler – horizontal design, compact',
    image: CONDENSER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'ggvc',
    title: 'Vertical COMPACT – GGVC',
    subtitle: 'Gas cooler – vertical design, compact',
    image: CONDENSER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'ggdc',
    title: 'V-shape COMPACT – GGDC',
    subtitle: 'Gas cooler – V-shape, compact',
    image: CONDENSER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'gghv',
    title: 'Flat VARIO – GGHV',
    subtitle: 'Gas cooler – horizontal design, variable',
    image: CONDENSER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  },
  {
    id: 'ggvv',
    title: 'Vertical VARIO – GGVV',
    subtitle: 'Gas cooler – vertical design, variable',
    image: CONDENSER_ICON,
    refrigerantMatch: 'impact',
    defaultAvailable: true,
    supports: {}
  }
]

/**
 * Katalog-Slots pro Produktkategorie. Kategorien ohne Eintrag fallen auf
 * die Legacy-Hardcoded-Liste in `unit-selection.vue` zurück.
 */
export const SERIES_CATALOG: Record<number, SeriesDefinition[]> = {
  0: CAT_0_EVAPORATOR_DX,
  1: CAT_1_EVAPORATOR_PUMP,
  2: CAT_2_AIR_COOLER,
  3: CAT_3_CONDENSER,
  4: CAT_4_DRY_COOLER,
  5: CAT_5_SUBCOOLER,
  6: CAT_6_OIL_COOLER,
  10: CAT_10_GAS_COOLER
}

/**
 * Set von Fluid-Slugs, die als "Impact" gelten. Deckt beide mediumTypes:
 *   • Refrigerants (R-Codes) — Naturals mit sehr niedrigem GWP.
 *   • Liquids/Coolants — Naturals ohne PFAS oder toxische Wasser-Impact.
 * Cross-Reference: `hasImpact: true`-Einträge aus `REFRIGERANT_FALLBACK`
 * bzw. `LIQUID_FALLBACK` in `pages/mygpc/[catId]/thermodynamics.vue`.
 */
export const IMPACT_FLUIDS: ReadonlySet<string> = new Set([
  // Refrigerants (R-Codes)
  'R744',    // CO2
  'R717',    // NH3
  'R170',    // Ethane
  'R290',    // Propane
  'R600',    // Butane
  'R600a',   // Isobutane
  'R1270',   // Propene
  'R1150',   // Ethylene
  'R718',    // Water
  // Coolants / Liquids (Store-Slugs aus LIQUID_FALLBACK + Live-API)
  'ethylene',    // Ethylene glycol
  'propylene',   // Propylene glycol
  'ethanol',     // Ethanol (Live-API)
  'water',       // Water als Coolant (falls Slug 'water' statt 'R718')
  'brineNaCl',   // Sole (NaCl)
  'brineCaCl2'   // Sole (CaCl2)
])

/** Backwards-Compat-Alias — vorherige Version des Namens. */
export const IMPACT_REFRIGERANTS = IMPACT_FLUIDS

export function isImpactFluid(slug: string | null | undefined): boolean {
  return !!slug && IMPACT_FLUIDS.has(slug)
}

/** Backwards-Compat-Alias — vorherige Version des Funktionsnamens. */
export const isImpactRefrigerant = isImpactFluid

/** Runtime-Status einer Serie in der aktuellen Konfiguration. */
export interface SeriesStatus {
  id: string
  title: string
  subtitle: string
  image: string
  /** 'available' = grüner Punkt, wählbar.
   *  'unavailable' = roter Punkt, ausgegraut. */
  status: 'available' | 'unavailable'
  /** Menschlich lesbare Erklärung, warum die Serie nicht verfügbar ist —
   *  für Tooltips / Hint-UI. Leer bei 'available'. */
  reason: string
}

/**
 * Ermittelt die anzuzeigende Serien-Liste + Status für eine Kategorie,
 * bezogen auf das aktuelle Fluid und die aktiven Accessories.
 *
 * @param catId Produktkategorie-ID (0 = Evaporator DX, …)
 * @param fluidSlug Aktuelles Fluid — je nach Kategorie ein Refrigerant-
 *   Slug ('R744') oder ein Coolant-Slug ('ethylene'). Der Aufrufer wählt
 *   die richtige Store-Property basierend auf `mediumType`. Bestimmt
 *   die Impact- vs. Non-Impact-Aufteilung.
 * @param accessories partieller Snapshot von UnitSelectionOpts — nur
 *   Boolean-Accessory-Flags werden geprüft, alle anderen Keys ignoriert.
 * @returns Array in Anzeigereihenfolge; `null` wenn der Katalog für die
 *   Kategorie noch nicht gepflegt ist (Aufrufer soll dann auf Legacy-Liste
 *   zurückfallen).
 */
export function seriesForCategory(
  catId: number,
  fluidSlug: string | null | undefined,
  accessories: Partial<Record<AccessoryKey, boolean>>
): SeriesStatus[] | null {
  const catalog = SERIES_CATALOG[catId]
  if (!catalog) return null

  const impact = isImpactFluid(fluidSlug)
  const bucket = impact ? 'impact' : 'nonImpact'

  return catalog
    .filter((s) => s.refrigerantMatch === bucket)
    .map<SeriesStatus>((s) => {
      // 1) Explizit als „nicht verfügbar" markiert (Katalog-Default) →
      //    Serie startet rot, Grund ist generisch.
      if (!s.defaultAvailable) {
        return {
          id: s.id,
          title: s.title,
          subtitle: s.subtitle,
          image: s.image,
          status: 'unavailable',
          reason: 'Not available for the current thermodynamic configuration.'
        }
      }

      // 2) Accessory-Kompatibilität — jedes aktive Flag muss von der Serie
      //    unterstützt werden. Nicht deklarierte Keys gelten als
      //    „unbekannt → tolerant" (kein Rot).
      const conflict = Object.entries(accessories).find(
        ([key, value]) => value === true && s.supports?.[key as AccessoryKey] === false
      )
      if (conflict) {
        return {
          id: s.id,
          title: s.title,
          subtitle: s.subtitle,
          image: s.image,
          status: 'unavailable',
          reason: `Not compatible with "${humanAccessoryLabel(conflict[0] as AccessoryKey)}".`
        }
      }

      return {
        id: s.id,
        title: s.title,
        subtitle: s.subtitle,
        image: s.image,
        status: 'available',
        reason: ''
      }
    })
}

/** Menschlich lesbare Labels für Accessory-Keys — für Tooltip-Reason. */
function humanAccessoryLabel(key: AccessoryKey): string {
  const map: Record<AccessoryKey, string> = {
    epoxyCoatedFins: 'Epoxy coated fins',
    airSockWithStreamer: 'Air sock connection incl. Güntner Streamer',
    coilDefender: 'Coil Defender',
    guentnerStreamer: 'Güntner Streamer',
    hotGasInterconnectingTubing: 'Hot gas interconnecting tubing',
    repairSwitch: 'Repair switch',
    fanRingHeater: 'Fan ring heater',
    doubleTrayInsulated: 'Double tray insulated',
    casingSimpleTraySs: 'Casing with simple tray (SS)',
    casingDoubleTraySs: 'Casing with double tray (SS)',
    legsForFloorMounting: 'Legs for floor mounting',
    inletHood: 'Inlet hood',
    louvreWithDrive: 'Louvre with drive'
  }
  return map[key]
}
