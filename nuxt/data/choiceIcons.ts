/**
 * choiceIcons — Kuratierte Icon-Registry für Guided-Q&A-Antwortoptionen.
 *
 * Neues Icon hinzufügen:
 *   1. Eintrag hier in CHOICE_ICONS ergänzen (key global eindeutig).
 *   2. Denselben key in nuxt/server/utils/choiceIconKeys.ts in das Set eintragen.
 *   3. Im Admin-Picker erscheint es automatisch, da CHOICE_ICONS_GROUPED reaktiv
 *      aus diesem Array abgeleitet wird.
 *
 * SVG-Konventionen:
 *   - viewBox="0 0 16 16" (der SVG-Wrapper setzt das, hier nur der Inhalt)
 *   - fill="none", stroke="currentColor", stroke-width="1.6",
 *     stroke-linecap="round", stroke-linejoin="round" (alles am Wrapper-SVG)
 *   - Für gefüllte Akzentpunkte fill="currentColor" direkt am Element setzen
 */

export type ChoiceIconGroup =
  | 'Gebäude & Anwendung'
  | 'Kapazität'
  | 'Kältemittel'
  | 'Temperaturniveau'
  | 'Aufstellung & Umgebung'
  | 'Sicherheit & Regulatorik'
  | 'Abtauung'
  | 'Betriebsweise'

export interface ChoiceIcon {
  /** Stabiler Bezeichner — wird als Wert im JSONB gespeichert */
  readonly key: string
  /** Deutsches Label für den Admin-Picker */
  readonly label: string
  readonly group: ChoiceIconGroup
  /** SVG-Elementinhalt für viewBox="0 0 16 16", Stroke-Stil */
  readonly svgPath: string
}

/** Pfad-Inhalt des heutigen Fallback-Icons (Rechteck + Trennlinie).
 *  Identisch mit dem hard-codierten SVG in ChatDock.vue Z. 1094–1095. */
export const FALLBACK_SVG_PATH =
  '<rect x="2.5" y="3.5" width="11" height="9" rx="1.5"/><path d="M2.5 6.5h11"/>'

export const CHOICE_ICONS: readonly ChoiceIcon[] = [

  // ── Gebäude & Anwendung ──────────────────────────────────────────────────
  {
    key: 'building-cold-storage',
    label: 'Kühlhaus',
    group: 'Gebäude & Anwendung',
    svgPath: '<path d="M1.5 8L8 2l6.5 6"/><rect x="3" y="7.5" width="10" height="6.5" rx="0.5"/><line x1="8" y1="9.5" x2="8" y2="13"/><line x1="6" y1="11" x2="10" y2="11"/><line x1="6.5" y1="9.5" x2="9.5" y2="12.5"/><line x1="9.5" y1="9.5" x2="6.5" y2="12.5"/>',
  },
  {
    key: 'building-freezer',
    label: 'Tiefkühlraum',
    group: 'Gebäude & Anwendung',
    svgPath: '<rect x="2" y="5.5" width="12" height="9" rx="0.5"/><line x1="5" y1="5.5" x2="5" y2="3"/><path d="M4.2 3.8 5 2.8l.8 1"/><line x1="8" y1="5.5" x2="8" y2="2.5"/><path d="M7.2 3.3 8 2.3l.8 1"/><line x1="11" y1="5.5" x2="11" y2="3"/><path d="M10.2 3.8l.8-1 .8 1"/><line x1="3" y1="9.5" x2="13" y2="9.5"/>',
  },
  {
    key: 'building-hvac',
    label: 'Klimatechnik / HVAC',
    group: 'Gebäude & Anwendung',
    svgPath: '<circle cx="8" cy="8" r="1.5"/><path d="M8 6.5c.5-2.5 2.5-4 4-3.5-1 .5-2.5 2-2.5 3.5"/><path d="M9.5 8.5c2.5.5 4 2.5 3.5 4-.5-1-2-2.5-3.5-2.5"/><path d="M8 9.5c-.5 2.5-2.5 4-4 3.5 1-.5 2.5-2 2.5-3.5"/><path d="M6.5 7.5c-2.5-.5-4-2.5-3.5-4 .5 1 2 2.5 3.5 2.5"/>',
  },
  {
    key: 'building-data-center',
    label: 'Rechenzentrum',
    group: 'Gebäude & Anwendung',
    svgPath: '<rect x="2" y="2" width="12" height="3" rx="0.5"/><rect x="2" y="6.5" width="12" height="3" rx="0.5"/><rect x="2" y="11" width="12" height="3" rx="0.5"/><circle cx="12.5" cy="3.5" r="0.8" fill="currentColor"/><circle cx="12.5" cy="8" r="0.8" fill="currentColor"/><circle cx="12.5" cy="12.5" r="0.8" fill="currentColor"/>',
  },
  {
    key: 'building-pharma',
    label: 'Pharma & Labor',
    group: 'Gebäude & Anwendung',
    svgPath: '<path d="M6 2h4v4h4v4h-4v4H6v-4H2V6h4V2z"/>',
  },

  // ── Kapazität ────────────────────────────────────────────────────────────
  {
    key: 'capacity-small',
    label: 'Kleine Leistung',
    group: 'Kapazität',
    svgPath: '<rect x="1.5" y="11.5" width="3" height="3" rx="0.4"/><rect x="6.5" y="9" width="3" height="5.5" rx="0.4" stroke-opacity="0.3"/><rect x="11.5" y="6.5" width="3" height="8" rx="0.4" stroke-opacity="0.3"/>',
  },
  {
    key: 'capacity-medium',
    label: 'Mittlere Leistung',
    group: 'Kapazität',
    svgPath: '<rect x="1.5" y="11.5" width="3" height="3" rx="0.4"/><rect x="6.5" y="9" width="3" height="5.5" rx="0.4"/><rect x="11.5" y="6.5" width="3" height="8" rx="0.4" stroke-opacity="0.3"/>',
  },
  {
    key: 'capacity-large',
    label: 'Große Leistung',
    group: 'Kapazität',
    svgPath: '<rect x="1.5" y="11.5" width="3" height="3" rx="0.4"/><rect x="6.5" y="9" width="3" height="5.5" rx="0.4"/><rect x="11.5" y="6.5" width="3" height="8" rx="0.4"/>',
  },
  {
    key: 'capacity-custom',
    label: 'Benutzerdefiniert',
    group: 'Kapazität',
    svgPath: '<line x1="2" y1="8" x2="14" y2="8"/><circle cx="9.5" cy="8" r="2.5"/><line x1="9.5" y1="2" x2="9.5" y2="5"/><line x1="9.5" y1="11" x2="9.5" y2="14"/>',
  },
  {
    key: 'capacity-redundant',
    label: 'Redundante Auslegung',
    group: 'Kapazität',
    svgPath: '<path d="M3.5 6a5.5 5.5 0 0 1 9 0"/><path d="M12.5 10a5.5 5.5 0 0 1-9 0"/><path d="M3.5 6l-2-.5 0 2"/><path d="M12.5 10l2 .5 0-2"/>',
  },

  // ── Kältemittel ──────────────────────────────────────────────────────────
  {
    key: 'refrigerant-co2',
    label: 'CO₂ (R744)',
    group: 'Kältemittel',
    svgPath: '<circle cx="8" cy="8" r="2.5"/><circle cx="2.5" cy="8" r="1.5"/><circle cx="13.5" cy="8" r="1.5"/><line x1="4" y1="8" x2="5.5" y2="8"/><line x1="10.5" y1="8" x2="12" y2="8"/>',
  },
  {
    key: 'refrigerant-nh3',
    label: 'Ammoniak (R717)',
    group: 'Kältemittel',
    svgPath: '<path d="M8 2.5L14.5 13H1.5L8 2.5z"/><line x1="8" y1="6.5" x2="8" y2="9.5"/><circle cx="8" cy="11.5" r="0.8" fill="currentColor"/>',
  },
  {
    key: 'refrigerant-hfc',
    label: 'Synthetische KM (HFC/HFKW)',
    group: 'Kältemittel',
    svgPath: '<path d="M6 2h4v5.5l3.5 7H2.5L6 7.5V2z"/><line x1="5.5" y1="9" x2="10.5" y2="9"/>',
  },
  {
    key: 'refrigerant-hydrocarbon',
    label: 'Kohlenwasserstoffe (HC)',
    group: 'Kältemittel',
    svgPath: '<path d="M9.5 14c-3 0-5-2-5-5 0-2.5 1.5-4 2.5-5.5 0 2 0.8 3 1.5 4C9 6 9.5 4 9 2c3 2 5 4.5 5 7S12.5 14 9.5 14z"/>',
  },
  {
    key: 'refrigerant-hfo',
    label: 'Neue Generation (HFO)',
    group: 'Kältemittel',
    svgPath: '<path d="M4.5 13.5C4.5 8 8 3.5 13.5 2.5c-4 1-7 4.5-7 11"/><path d="M4.5 13.5c2-4 5-7 9-9"/>',
  },

  // ── Temperaturniveau ─────────────────────────────────────────────────────
  {
    key: 'temp-chilling',
    label: 'Kühlen (+5 bis −5 °C)',
    group: 'Temperaturniveau',
    svgPath: '<rect x="7" y="2" width="2" height="7.5" rx="1"/><circle cx="8" cy="12.5" r="2"/><path d="M10 4.5h1.5M10 7h1.5"/>',
  },
  {
    key: 'temp-freezing',
    label: 'Tiefkühlen (−18 °C)',
    group: 'Temperaturniveau',
    svgPath: '<rect x="7" y="2" width="2" height="7.5" rx="1"/><circle cx="8" cy="12.5" r="2"/><path d="M10 8h1.5"/>',
  },
  {
    key: 'temp-deep-freeze',
    label: 'Schockfrost (−35 °C)',
    group: 'Temperaturniveau',
    svgPath: '<line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/>',
  },
  {
    key: 'temp-process',
    label: 'Prozesskühlung (variabel)',
    group: 'Temperaturniveau',
    svgPath: '<path d="M2 5.5c1-1.5 2-1.5 3 0s2 1.5 3 0 2-1.5 3 0 2 1.5 3 0"/><path d="M2 9c1-1.5 2-1.5 3 0s2 1.5 3 0 2-1.5 3 0 2 1.5 3 0"/><path d="M2 12.5c1-1.5 2-1.5 3 0s2 1.5 3 0 2-1.5 3 0 2 1.5 3 0"/>',
  },
  {
    key: 'temp-ambient',
    label: 'Außentemperatur / Umgebung',
    group: 'Temperaturniveau',
    svgPath: '<circle cx="8" cy="8" r="3"/><line x1="8" y1="1.5" x2="8" y2="3.5"/><line x1="8" y1="12.5" x2="8" y2="14.5"/><line x1="1.5" y1="8" x2="3.5" y2="8"/><line x1="12.5" y1="8" x2="14.5" y2="8"/><line x1="3.4" y1="3.4" x2="4.8" y2="4.8"/><line x1="11.2" y1="11.2" x2="12.6" y2="12.6"/><line x1="12.6" y1="3.4" x2="11.2" y2="4.8"/><line x1="4.8" y1="11.2" x2="3.4" y2="12.6"/>',
  },

  // ── Aufstellung & Umgebung ───────────────────────────────────────────────
  {
    key: 'install-indoor-ceiling',
    label: 'Deckenabhängung (innen)',
    group: 'Aufstellung & Umgebung',
    svgPath: '<line x1="2" y1="3" x2="14" y2="3"/><line x1="8" y1="3" x2="8" y2="6.5"/><rect x="4" y="6.5" width="8" height="5.5" rx="1"/><line x1="5.5" y1="9.5" x2="10.5" y2="9.5"/>',
  },
  {
    key: 'install-indoor-floor',
    label: 'Bodenaufstellung (innen)',
    group: 'Aufstellung & Umgebung',
    svgPath: '<line x1="2" y1="13" x2="14" y2="13"/><rect x="4" y="4.5" width="8" height="8.5" rx="1"/><line x1="5.5" y1="8.5" x2="10.5" y2="8.5"/>',
  },
  {
    key: 'install-outdoor-roof',
    label: 'Dachaufstellung (außen)',
    group: 'Aufstellung & Umgebung',
    svgPath: '<path d="M2 10L8 5l6 5"/><rect x="3.5" y="10" width="9" height="4" rx="0.5"/><rect x="5" y="2" width="6" height="3.5" rx="0.5"/><line x1="6" y1="3.75" x2="10" y2="3.75"/>',
  },
  {
    key: 'install-coastal',
    label: 'Küstenstandort (Salzkorrosion)',
    group: 'Aufstellung & Umgebung',
    svgPath: '<path d="M1.5 7c2-2 3.5-2 5.5 0s3.5 2 5.5 0"/><path d="M1.5 10.5c2-2 3.5-2 5.5 0s3.5 2 5.5 0"/><path d="M1.5 14c2-2 3.5-2 5.5 0s3.5 2 5.5 0"/><path d="M7 4.5a3.5 3.5 0 0 1 7 0"/>',
  },
  {
    key: 'install-atex',
    label: 'ATEX-Zone (Explosionsschutz)',
    group: 'Aufstellung & Umgebung',
    svgPath: '<path d="M8 1.5l1.5 4.5H14L10.5 9l1.5 4.5L8 11l-4 2.5L5.5 9 2 6h4.5L8 1.5z"/>',
  },

  // ── Sicherheit & Regulatorik ─────────────────────────────────────────────
  {
    key: 'reg-fgas',
    label: 'F-Gas-Verordnung',
    group: 'Sicherheit & Regulatorik',
    svgPath: '<rect x="3" y="1.5" width="10" height="13" rx="1"/><path d="M5.5 8.5l2 2 3.5-3.5"/><line x1="5" y1="5" x2="11" y2="5"/>',
  },
  {
    key: 'reg-atex',
    label: 'ATEX-Zertifizierung',
    group: 'Sicherheit & Regulatorik',
    svgPath: '<path d="M8 1.5L13.5 4.5v7L8 14.5 2.5 11.5v-7L8 1.5z"/><path d="M8.5 5.5l-2 3h3l-2 3"/>',
  },
  {
    key: 'reg-food',
    label: 'Lebensmittelbereich',
    group: 'Sicherheit & Regulatorik',
    svgPath: '<line x1="5" y1="2" x2="5" y2="14"/><path d="M3 2v4a2 2 0 0 0 4 0V2"/><line x1="11" y1="2" x2="11" y2="14"/><path d="M9 2c0 2.5 2 3.5 2 6"/>',
  },
  {
    key: 'reg-pharma',
    label: 'GMP / Pharmabereich',
    group: 'Sicherheit & Regulatorik',
    svgPath: '<circle cx="8" cy="8" r="6"/><path d="M8 5v6M5 8h6"/>',
  },
  {
    key: 'reg-noise',
    label: 'Lärmschutzanforderung',
    group: 'Sicherheit & Regulatorik',
    svgPath: '<path d="M4 6H2v4h2l3.5 3V3L4 6z"/><line x1="11.5" y1="6" x2="15" y2="10"/><line x1="15" y1="6" x2="11.5" y2="10"/>',
  },

  // ── Abtauung ─────────────────────────────────────────────────────────────
  {
    key: 'defrost-electric',
    label: 'Elektrische Abtauung',
    group: 'Abtauung',
    svgPath: '<path d="M10 1.5 5.5 9H10L6 14.5 11.5 7.5H7L10 1.5z"/>',
  },
  {
    key: 'defrost-hot-gas',
    label: 'Heißgas-Abtauung',
    group: 'Abtauung',
    svgPath: '<path d="M10 14c-3.5 0-5.5-2.5-5.5-5.5 0-2 1-3.5 2-4.5 0 1.5 0.5 2.5 1.5 3.5.5-2 0.5-3.5 0-5 2.5 1.5 4 3.5 4 6 0 2.5-1 5.5-2 5.5z"/>',
  },
  {
    key: 'defrost-air',
    label: 'Luftabtauung',
    group: 'Abtauung',
    svgPath: '<path d="M2 8h8a2.5 2.5 0 0 0 0-5c-1.5 0-2.5 1-2.5 2"/><path d="M2 12h10a2.5 2.5 0 0 1 0 5c-1.5 0-2.5-1-2.5-2"/>',
  },
  {
    key: 'defrost-combined',
    label: 'Kombiabtauung (elektrisch + Heißgas)',
    group: 'Abtauung',
    svgPath: '<path d="M6 2 3.5 7H6.5L4 12.5l5.5-7H7L9.5 2"/><path d="M12 4.5c1 1.5 1.5 3 1.5 4s-.5 2.5-1.5 3.5"/><path d="M14 3c1.5 2 2 3.5 2 5s-.5 3-2 5"/>',
  },
  {
    key: 'defrost-none',
    label: 'Kein Abtauen (natürliche Luftabtauung)',
    group: 'Abtauung',
    svgPath: '<line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/><line x1="5" y1="5" x2="11" y2="11"/><line x1="11" y1="5" x2="5" y2="11"/><line x1="2" y1="14" x2="14" y2="2"/>',
  },

  // ── Betriebsweise ────────────────────────────────────────────────────────
  {
    key: 'ops-standalone',
    label: 'Einzelbetrieb',
    group: 'Betriebsweise',
    svgPath: '<rect x="4" y="4.5" width="8" height="8" rx="1"/><line x1="8" y1="1.5" x2="8" y2="4.5"/><line x1="8" y1="12.5" x2="8" y2="14.5"/><line x1="5.5" y1="8.5" x2="10.5" y2="8.5"/>',
  },
  {
    key: 'ops-bms',
    label: 'Gebäudeleittechnik (BMS)',
    group: 'Betriebsweise',
    svgPath: '<circle cx="8" cy="8" r="1.5"/><circle cx="2.5" cy="4" r="1.5"/><circle cx="13.5" cy="4" r="1.5"/><circle cx="2.5" cy="12" r="1.5"/><circle cx="13.5" cy="12" r="1.5"/><line x1="3.8" y1="4.8" x2="6.7" y2="7.2"/><line x1="12.2" y1="4.8" x2="9.3" y2="7.2"/><line x1="3.8" y1="11.2" x2="6.7" y2="8.8"/><line x1="12.2" y1="11.2" x2="9.3" y2="8.8"/>',
  },
  {
    key: 'ops-redundant',
    label: 'Redundanter Betrieb',
    group: 'Betriebsweise',
    svgPath: '<rect x="1.5" y="5" width="5.5" height="6.5" rx="1"/><rect x="9" y="5" width="5.5" height="6.5" rx="1"/><line x1="7" y1="8.25" x2="9" y2="8.25"/><line x1="4.25" y1="3" x2="4.25" y2="5"/><line x1="11.75" y1="3" x2="11.75" y2="5"/>',
  },
  {
    key: 'ops-freecooling',
    label: 'Freikühlung (Economizer)',
    group: 'Betriebsweise',
    svgPath: '<path d="M5 13C5 8 8 4 13.5 3c-3.5 1-6 4.5-6 10"/><path d="M5 13c1.5-4 4.5-7 8.5-8.5"/><path d="M3.5 11l-2 2 2 0"/>',
  },
  {
    key: 'ops-retrofit',
    label: 'Retrofit / Umrüstung',
    group: 'Betriebsweise',
    svgPath: '<path d="M13 3.5a3.5 3.5 0 0 0-4.2 3.3c0 .5.1 1 .3 1.5L3.8 13.5a1.5 1.5 0 1 0 2.1 2.1l5.5-5.5c.5.2 1 .3 1.5.3A3.5 3.5 0 1 0 13 3.5z"/>',
  },
]

// ── Lookup-Helpers ────────────────────────────────────────────────────────────

const _byKey = new Map(CHOICE_ICONS.map(i => [i.key, i]))

const _grouped = CHOICE_ICONS.reduce<Map<ChoiceIconGroup, ChoiceIcon[]>>((acc, icon) => {
  const list = acc.get(icon.group) ?? []
  list.push(icon)
  acc.set(icon.group, list)
  return acc
}, new Map())

/** O(1)-Lookup nach Schlüssel. Gibt undefined zurück wenn kein Eintrag. */
export function findChoiceIcon(key: string): ChoiceIcon | undefined {
  return _byKey.get(key)
}

/** Alle Icons, gruppiert nach ChoiceIconGroup (Reihenfolge: Einfügereihenfolge). */
export const CHOICE_ICONS_GROUPED: ReadonlyMap<ChoiceIconGroup, readonly ChoiceIcon[]> = _grouped

/** Alle gültigen Schlüssel als Set (für Typ-Guards und schnelle Validierung). */
export const CHOICE_ICON_KEY_SET: ReadonlySet<string> = new Set(CHOICE_ICONS.map(i => i.key))
