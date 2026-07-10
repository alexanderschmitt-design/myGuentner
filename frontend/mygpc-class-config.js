/**
 * myGPC Class-Config — Architektur-Klassen, Kategorie-Mapping, Enums, Converter
 * ------------------------------------------------------------------------------
 * Single Source of Truth für die kategorie-aware UI-Logik.
 *
 * Die 7 Architektur-Klassen (verifiziert in rag/gpc-field-mapping.md):
 *   A   DX-Refrigerant-Cold        cat=0      (Phase-Change, Dew Point, Superheat/Subcool)
 *   B   Pump-Refrigerant-Cold      cat=1      (gravity flooded + Feed rate)
 *   C   Coolant-Cold               cat=2      (Glykol + Concentration + Inlet/Outlet)
 *   D1  Condenser-Warm             cat=3      (Multiple circuits, Hot gas, Subcooler, EMPTY CASING)
 *   D2  Subcooler-Warm             cat=5      (Refrigerant + Inlet/Outlet-Mode, reduziert)
 *   E1  Coolant-Warm-Glycol        cat=4      (THREAD/FLANGE + Ball valve + viele OPTIONS)
 *   E2  Coolant-Warm-Oil           cat=6      (Oil + KEIN Concentration + reduziert)
 *   F   CO2-Gas-Cooler-DualMode    cat=10     (Supercritic + Subcritic parallel, HBLK valve)
 *
 * HTML-Felder geben sich via data-gpc-classes="A,B,…" zu erkennen.
 * Wenn data-gpc-classes fehlt → Feld ist für ALLE Klassen sichtbar.
 *
 * Stand: 2026-05-20
 */
(function () {
  'use strict';

  // ============================================================
  // Klassen-Definition
  // ============================================================
  var CLASSES = {
    A:  { name: 'DX-Refrigerant-Cold',     side: 'cold', fluidFamily: 'refrigerant', paramMode: 'phase-change' },
    B:  { name: 'Pump-Refrigerant-Cold',   side: 'cold', fluidFamily: 'refrigerant', paramMode: 'pump' },
    C:  { name: 'Coolant-Cold',            side: 'cold', fluidFamily: 'coolant',     paramMode: 'inlet-outlet' },
    D1: { name: 'Condenser-Warm',          side: 'warm', fluidFamily: 'refrigerant', paramMode: 'phase-change' },
    D2: { name: 'Subcooler-Warm',          side: 'warm', fluidFamily: 'refrigerant', paramMode: 'inlet-outlet' },
    E1: { name: 'Coolant-Warm-Glycol',     side: 'warm', fluidFamily: 'coolant',     paramMode: 'inlet-outlet' },
    E2: { name: 'Coolant-Warm-Oil',        side: 'warm', fluidFamily: 'oil',         paramMode: 'inlet-outlet' },
    F:  { name: 'CO2-Gas-Cooler-DualMode', side: 'warm', fluidFamily: 'co2',         paramMode: 'dual-supercritic-subcritic' }
  };

  // ============================================================
  // productCategory → Klasse-ID
  // ============================================================
  var CAT_TO_CLASS = {
    0:  'A',
    1:  'B',
    2:  'C',
    3:  'D1',
    4:  'E1',
    5:  'D2',
    6:  'E2',
    10: 'F'
  };

  function classOf(productSection, productCategory) {
    // productSection=2 (Bare coil) — separater Flow, hier nicht abgedeckt
    if (productSection !== 1) return null;
    return CAT_TO_CLASS[productCategory] || null;
  }

  // ============================================================
  // Statische Enums (für select-Felder, deren Werte nicht aus der API kommen)
  // Stand: aus Phase-1-Live-UI-Verifikation rekonstruiert.
  // Werte mit '?' sind noch nicht bestätigt — Open Questions.
  // ============================================================
  var ENUMS = {
    // Aus GET /inputcapacitymodes verifiziert (Werte 0 und 1).
    // Cat=3+ Default ist 3 — vermutlich category-spezifische Label-Variante.
    inputModeCapacity: {
      label: 'Calculation mode',
      labelByClass: {
        D1: 'Calculation mode (Condenser)',  // "adjust condensation temperature"
        F:  'Calculation mode (Gas cooler)'
      },
      options: [
        { value: 0, label: 'State fixed capacity (adjust surface reserve)' },
        { value: 1, label: 'Calculate capacity' }
      ]
    },

    // Aus GET /fluidinputmode verifiziert.
    // Wert 3 (Dew point at inlet) ist NICHT im Endpoint-Response, aber UI-Default für DX/Pump/Condenser
    fluidInputMode: {
      label: 'Parameter mode',
      options: [
        { value: 0, label: 'Inlet/Outlet temperature' },
        { value: 1, label: 'Inlet temp./Volume flow' },
        { value: 2, label: 'Outlet temp./Volume flow' },
        { value: 3, label: 'Dew point at inlet (DIN EN328/EN327)' },
        { value: 5, label: 'Inlet temp./Mass flow' },
        { value: 6, label: 'Outlet temp./Mass flow' }
      ]
    },

    // Live-UI: Default "Cost-optimised" (-3). Andere Werte noch zu enumerieren.
    motorTechnology: {
      label: 'Motor technology',
      options: [
        { value: -3, label: 'Cost-optimised', impact: true }
      ]
    },

    // Live-UI: Default "All 50Hz" (3001). Weitere via GET /properties1ph ermittelbar.
    powerSupply: {
      label: 'Power supply',
      options: [
        { value: 3001, label: 'All 50Hz' }
      ]
    },

    // Live-UI: Default "Standard" (10001). "Reverse" zu ermitteln.
    airBlowOffType: {
      label: 'Air blow direction',
      options: [
        { value: 10001, label: 'Standard' }
      ]
    },

    // Live-UI: Default "All" (10001). High/Medium/Low zu ermitteln.
    airVelocityClass: {
      label: 'Air velocity',
      options: [
        { value: 10001, label: 'All' }
      ]
    },

    // Live-UI: Cold-Side Default 80 = "Air defrost". Andere Werte zu ermitteln.
    defrosting: {
      label: 'Defrosting',
      options: [
        { value: 0,  label: '— (no defrost)' },     // Warm-Side
        { value: 80, label: 'Air defrost', impact: true }
      ]
    },

    // Live-UI: Default -1 = "Only available units".
    deliveryTimeFilter: {
      label: 'Delivery time',
      options: [
        { value: -1, label: 'Only available units' }
      ]
    },

    // Live-UI: Default 0/leer = "No"-Filter. A+/A/B/C zu ermitteln.
    efficiencyClass: {
      label: 'Minimum energy efficiency class',
      options: [
        { value: '--', label: 'No', impact: true }
      ]
    },

    // Aus rag/gpc-field-mapping.md — Repair switch hat 3 Sub-Selects mit klassen-abhängigen Optionen
    repairSwitchPosition: {
      label: 'Repair switch position',
      optionsByClass: {
        // Cold-Side (A, B, C) Defaults
        A: [{ value: 0, label: 'Preferably one per fan' }],
        B: [{ value: 0, label: 'Preferably one per fan' }],
        C: [{ value: 0, label: 'Preferably one per fan' }],
        // Warm-Side mit "Near fan if possible"
        D1: [{ value: 0, label: 'Preferably one per fan' }],
        E1: [{ value: 0, label: 'Preferably one per fan' }],
        F:  [{ value: 0, label: 'Preferably one per fan' }],
        // Subcooler / Oil cooler — "wired in pairs"
        D2: [{ value: 1, label: 'Preferably wired in pairs' }],
        E2: [{ value: 1, label: 'Preferably wired in pairs' }]
      }
    }
  };

  // ============================================================
  // Converter — Wertumrechnung API ↔ UI
  // ============================================================
  // toUI: API-Wert → UI-Wert (zum Anzeigen)
  // toAPI: UI-Wert → API-Wert (zum Speichern)
  // ============================================================
  var CONVERTERS = {
    // thermalCapacity: API liefert Watts, UI zeigt kW.
    'W-kW': {
      toUI:  function (v) { return v == null ? null : v / 1000; },
      toAPI: function (v) { return v == null ? null : v * 1000; }
    },

    // fluidPressureDropMax bei Coolant/Oil: API in mbar, UI in bar.
    'mbar-bar': {
      toUI:  function (v) { return v == null ? null : v / 1000; },
      toAPI: function (v) { return v == null ? null : v * 1000; }
    },

    // fluidPressure bei CO2 Supercritic: API in mbar, UI zeigt mbar direkt (kein Convert nötig).
    // Falls UI in bar gewünscht: 'mbar-bar' verwenden.

    // Boolean ↔ Integer 0/1 (manche API-Felder sind int statt bool)
    'bool-int': {
      toUI:  function (v) { return v === 1 || v === true; },
      toAPI: function (v) { return v ? 1 : 0; }
    },

    // Invertiertes Boolean: UI-checked = API-false (z.B. "Capacity including humidity factor" ↔ capacitySensibleHeatOnly)
    'bool-invert': {
      toUI:  function (v) { return !v; },
      toAPI: function (v) { return !v; }
    }
  };

  function applyToUI(converterName, value) {
    if (!converterName || !CONVERTERS[converterName]) return value;
    return CONVERTERS[converterName].toUI(value);
  }

  function applyToAPI(converterName, value) {
    if (!converterName || !CONVERTERS[converterName]) return value;
    return CONVERTERS[converterName].toAPI(value);
  }

  // ============================================================
  // Class-Match-Logik — wird vom Bind-Engine genutzt
  // ============================================================
  /**
   * Prüft, ob ein Feld/Section sichtbar ist für die aktuelle Klasse.
   * @param {string} currentClass        — z.B. 'A', 'D1', 'F'
   * @param {string|null} classesAttr    — z.B. "A,B,C" oder null/empty (= visible für alle)
   * @param {string|null} notClassesAttr — z.B. "F" (= überall sichtbar AUSSER F)
   */
  function matchesClass(currentClass, classesAttr, notClassesAttr) {
    if (!currentClass) return true; // wenn keine Klasse gesetzt (z.B. vor Step 1) — alles zeigen

    // not-list hat Vorrang
    if (notClassesAttr) {
      var notList = String(notClassesAttr).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (notList.indexOf(currentClass) >= 0) return false;
    }

    // include-list
    if (classesAttr) {
      var list = String(classesAttr).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (list.length === 0) return true;
      return list.indexOf(currentClass) >= 0;
    }

    return true; // keine Liste angegeben → visible für alle
  }

  // ============================================================
  // Export
  // ============================================================
  if (typeof window !== 'undefined') {
    window.MyGPC = window.MyGPC || {};
    window.MyGPC.classConfig = {
      CLASSES: CLASSES,
      CAT_TO_CLASS: CAT_TO_CLASS,
      ENUMS: ENUMS,
      CONVERTERS: CONVERTERS,
      classOf: classOf,
      matchesClass: matchesClass,
      applyToUI: applyToUI,
      applyToAPI: applyToAPI
    };
  }
})();
