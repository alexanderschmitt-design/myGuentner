/**
 * choiceIconKeys — Server-seitige Schlüsselmenge der Icon-Registry.
 *
 * Abgeleitet von nuxt/data/choiceIcons.ts, aber als eigenständige Datei,
 * weil server/ keinen direkten Import aus nuxt/data/ (client-only) tätigen kann.
 *
 * Bei neuen Icons in choiceIcons.ts diesen Set synchron halten:
 *   1. Eintrag in CHOICE_ICONS ergänzen (choiceIcons.ts)
 *   2. Denselben key hier in das Set eintragen
 *
 * Nur die Schlüssel — kein SVG-Code — werden server-seitig benötigt.
 */

export const VALID_CHOICE_ICON_KEYS: ReadonlySet<string> = new Set([
  // Gebäude & Anwendung
  'building-cold-storage',
  'building-freezer',
  'building-hvac',
  'building-data-center',
  'building-pharma',

  // Kapazität
  'capacity-small',
  'capacity-medium',
  'capacity-large',
  'capacity-custom',
  'capacity-redundant',

  // Kältemittel
  'refrigerant-co2',
  'refrigerant-nh3',
  'refrigerant-hfc',
  'refrigerant-hydrocarbon',
  'refrigerant-hfo',

  // Temperaturniveau
  'temp-chilling',
  'temp-freezing',
  'temp-deep-freeze',
  'temp-process',
  'temp-ambient',

  // Aufstellung & Umgebung
  'install-indoor-ceiling',
  'install-indoor-floor',
  'install-outdoor-roof',
  'install-coastal',
  'install-atex',

  // Sicherheit & Regulatorik
  'reg-fgas',
  'reg-atex',
  'reg-food',
  'reg-pharma',
  'reg-noise',

  // Abtauung
  'defrost-electric',
  'defrost-hot-gas',
  'defrost-air',
  'defrost-combined',
  'defrost-none',

  // Betriebsweise
  'ops-standalone',
  'ops-bms',
  'ops-redundant',
  'ops-freecooling',
  'ops-retrofit',
])
