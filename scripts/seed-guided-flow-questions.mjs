#!/usr/bin/env node
/**
 * seed-guided-flow-questions.mjs
 *
 * Befüllt den Guided-Flow-Fragenkatalog für 6 Kategorien:
 *   – Allgemein            (neu, tab_id: 'basic')
 *   – Facility & Sizing    (neu, tab_id: 'basic')
 *   – System-Auslegung     (neu, tab_id: 'basic')
 *   – By Refrigerant       (neu, tab_id: 'refrigerant')
 *   – Energy & Process     (bestehend, Questions ergänzt + Icons)
 *   – Industrial Refrig.   (bestehend, Questions ergänzt + Icons)
 *
 * Idempotent — erneutes Ausführen erzeugt keine Duplikate (ON CONFLICT upsert).
 * Icon-Schlüssel werden lokal gegen VALID_ICON_KEYS validiert, bevor etwas in
 * die DB geschrieben wird. Am Ende wird ein Report ausgegeben mit allen FALLBACK-
 * und WEAK-Einträgen.
 *
 * Voraussetzungen:
 *   .env mit SUPABASE_PROJECT_ID + SUPABASE_PSW
 *
 * Usage:
 *   node scripts/seed-guided-flow-questions.mjs
 *   node scripts/seed-guided-flow-questions.mjs --dry-run   (Validierung, kein DB-Write)
 */

import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as dotenvConfig } from 'dotenv'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenvConfig({ path: resolve(__dirname, '..', '.env') })

const DRY_RUN = process.argv.includes('--dry-run')

// ─────────────────────────────────────────────────────────────────────────────
// Icon-Key-Validierung (manuell synchron mit server/utils/choiceIconKeys.ts)
// ─────────────────────────────────────────────────────────────────────────────

const VALID_ICON_KEYS = new Set([
  'building-cold-storage', 'building-freezer', 'building-hvac',
  'building-data-center', 'building-pharma',
  'capacity-small', 'capacity-medium', 'capacity-large',
  'capacity-custom', 'capacity-redundant',
  'refrigerant-co2', 'refrigerant-nh3', 'refrigerant-hfc',
  'refrigerant-hydrocarbon', 'refrigerant-hfo',
  'temp-chilling', 'temp-freezing', 'temp-deep-freeze',
  'temp-process', 'temp-ambient',
  'install-indoor-ceiling', 'install-indoor-floor', 'install-outdoor-roof',
  'install-coastal', 'install-atex',
  'reg-fgas', 'reg-atex', 'reg-food', 'reg-pharma', 'reg-noise',
  'defrost-electric', 'defrost-hot-gas', 'defrost-air',
  'defrost-combined', 'defrost-none',
  'ops-standalone', 'ops-bms', 'ops-redundant',
  'ops-freecooling', 'ops-retrofit',
])

// ─────────────────────────────────────────────────────────────────────────────
// Tracking: FALLBACK (kein Icon) + WEAK (Icon ist Annäherung)
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_ENTRIES = []  // { flow, question, choice }
const WEAK_ENTRIES = []      // { flow, question, choice, icon, reason }

function ch(label, detail, params, icon, weak) {
  if (icon === undefined || icon === null) {
    // Wird beim Bauen der Flows eingetragen
  }
  return { label, detail, params, icon: icon ?? undefined, _weak: weak }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fragenkatalog — 6 Flows
// ─────────────────────────────────────────────────────────────────────────────

const SEEDS = [

  // ── 1. ALLGEMEIN ─────────────────────────────────────────────────────────
  {
    entry_id: 'allgemein',
    tab_id: 'basic',
    title: 'Allgemein: Anlage & Gebäudetyp',
    target_kind: 'refrigerant-map',
    target_cat_id: null,
    target_slug: null,
    fixed_params: {},
    questions: [
      {
        id: 'side',
        message: '**Kalte oder warme Seite** der Kälteanlage? Diese Grundentscheidung bestimmt den Gerätetyp.',
        choices: [
          { label: 'Kalte Seite', detail: 'Verdampfer, Luftkühler — entzieht Wärme', params: { systemSide: 'cold' }, icon: 'install-indoor-ceiling' },
          { label: 'Warme Seite', detail: 'Verflüssiger, Rückkühler, Dry Cooler — gibt Wärme ab', params: { systemSide: 'warm' }, icon: 'install-outdoor-roof' },
        ],
      },
      {
        id: 'building-type',
        message: '**Welche Art von Anlage oder Gebäude** wird gekühlt?',
        choices: [
          { label: 'Kühl-/Gefrierhaus (Lebensmittel)', detail: 'Lagerung, Produktion, Logistik', params: { coolingPurpose: 'cold-storage' }, icon: 'building-cold-storage' },
          { label: 'Industrieprozess', detail: 'Produktion, Maschinen, Hydraulik', params: { coolingPurpose: 'industrial' }, icon: 'building-hvac', _weak: 'building-hvac ist Annäherung — kein dediziertes Industrie-Icon' },
          { label: 'Bürogebäude / Komfortkühlung', detail: 'HVAC, Klimaanlage', params: { coolingPurpose: 'air-conditioning' }, icon: 'building-hvac' },
          { label: 'Hotel / Gastronomie', detail: 'Dauerbetrieb, wechselnde Last', params: { coolingPurpose: 'air-conditioning' }, icon: 'install-indoor-floor', _weak: 'install-indoor-floor ist Annäherung — kein Hotel-Icon' },
          { label: 'Rechenzentrum', detail: 'IT-Last, 24/7, hohe Zuverlässigkeit', params: { coolingPurpose: 'data-center' }, icon: 'building-data-center' },
          { label: 'Pharma / Labor', detail: 'GMP-Umgebung, enge Temperaturtoleranz', params: { coolingPurpose: 'pharma' }, icon: 'building-pharma' },
          { label: 'Einzelhandel (Supermarkt, Shop)', detail: 'Verkaufskühlmöbel, Lager', params: { coolingPurpose: 'cold-storage' }, icon: 'building-cold-storage', _weak: 'building-cold-storage ist Annäherung für Einzelhandel' },
        ],
      },
    ],
  },

  // ── 2. FACILITY & SIZING ─────────────────────────────────────────────────
  {
    entry_id: 'facility-sizing',
    tab_id: 'basic',
    title: 'Facility & Sizing: Leistung, Konzept, Redundanz',
    target_kind: 'refrigerant-map',
    target_cat_id: null,
    target_slug: null,
    fixed_params: {},
    questions: [
      {
        id: 'capacity',
        message: '**Wie viel Kühlleistung** wird benötigt? Wählen Sie den nächsten passenden Bereich.',
        choices: [
          { label: '< 20 kW', detail: 'Kleinstsystem, Einzelraum', params: { coolingCapacityKw: 10 }, icon: 'capacity-small' },
          { label: '20–100 kW', detail: 'Mittleres System, mehrere Räume', params: { coolingCapacityKw: 50 }, icon: 'capacity-medium' },
          { label: '100–500 kW', detail: 'Großes System, Halle oder Gebäude', params: { coolingCapacityKw: 250 }, icon: 'capacity-large' },
          { label: '> 500 kW / individuell', detail: 'Anlageplanung, Sonderprojekt', params: { coolingCapacityKw: 500 }, icon: 'capacity-custom' },
        ],
      },
      {
        id: 'cooling-concept',
        message: '**Welches Kühlkonzept** setzt Ihr System ein?',
        choices: [
          { label: 'Direktverdampfung', detail: 'Kältemittel im Verdampfer, kompaktes System', params: { coolingConcept: 'direct' }, icon: 'refrigerant-hfc' },
          { label: 'Sole / Glykol-Sekundärkreis', detail: 'Indirektes System mit Wärmetauscherkreis', params: { coolingConcept: 'brine', glycolType: 'ethylene' }, icon: undefined },
          { label: 'Kaltwasser-Kreis (Chiller)', detail: 'Kaltwasser zum Verbraucher', params: { coolingConcept: 'chilled-water' }, icon: undefined },
          { label: 'Freikühlung / Dry Cooler', detail: 'Nutzung der Außentemperatur, energieeffizient', params: { coolingConcept: 'free-cooling' }, icon: 'ops-freecooling' },
          { label: 'Adiabatisch / Verdunstungskühlung', detail: 'Wasserverdunstung als Vorkühlung', params: { coolingConcept: 'adiabatic' }, icon: 'temp-ambient', _weak: 'temp-ambient ist Annäherung — kein dediziertes Adiabatik-Icon' },
        ],
      },
      {
        id: 'redundancy',
        message: '**Welche Redundanzstufe** ist für die Kälteanlage gefordert?',
        choices: [
          { label: 'N — keine Redundanz', detail: 'Nicht-kritischer Betrieb, Kostenfokus', params: { redundancy: 'N' }, icon: 'ops-standalone' },
          { label: 'N+1 — ein Reserve-Gerät', detail: 'Standard-Ausfallsicherheit', params: { redundancy: 'N+1' }, icon: 'ops-redundant' },
          { label: '2N — vollständige Duplizierung', detail: 'Tier-3+ Zuverlässigkeit (RZ, Pharma)', params: { redundancy: '2N' }, icon: 'capacity-redundant' },
        ],
      },
    ],
  },

  // ── 3. SYSTEM-AUSLEGUNG ──────────────────────────────────────────────────
  {
    entry_id: 'system-auslegung',
    tab_id: 'basic',
    title: 'System-Auslegung: Aufstellort, Schall, Klima',
    target_kind: 'refrigerant-map',
    target_cat_id: null,
    target_slug: null,
    fixed_params: {},
    questions: [
      {
        id: 'install-env',
        message: '**Aufstellort und Umgebungsbedingungen** des Geräts?',
        choices: [
          { label: 'Innen, Bodenmontage', detail: 'Trocken, kontrollierte Umgebung', params: { installationType: 'indoor-floor' }, icon: 'install-indoor-floor' },
          { label: 'Innen, Deckenmontage', detail: 'Kaltluft nach unten, Raumkühlung', params: { installationType: 'indoor-ceiling' }, icon: 'install-indoor-ceiling' },
          { label: 'Außen, Dach oder Gelände', detail: 'Wetterschutz, Umgebungstemperatur relevant', params: { installationType: 'outdoor-roof' }, icon: 'install-outdoor-roof' },
          { label: 'Küstenstandort', detail: 'Salzluft, erhöhte Korrosionsanforderungen', params: { installationType: 'coastal' }, icon: 'install-coastal' },
          { label: 'ATEX-Zone', detail: 'Explosionsgefährdeter Bereich', params: { installationType: 'atex' }, icon: 'install-atex' },
        ],
      },
      {
        id: 'noise',
        message: '**Schallschutz-Anforderungen** am Aufstellort?',
        choices: [
          { label: 'Keine besonderen Anforderungen', detail: 'Gewerbegebiet, kein Grenzwert vorgegeben', params: {}, icon: 'ops-standalone' },
          { label: 'Lärmreduzierung gewünscht', detail: 'Nähe zu Nachbarbetrieben oder Wohnbebauung', params: { noiseSensitive: true }, icon: 'reg-noise' },
          { label: 'Strenger Lärmgrenzwert < 45 dB(A)', detail: 'Wohngebiet, besondere Genehmigungsauflagen', params: { noiseLimitDBA: 45 }, icon: 'reg-noise' },
        ],
      },
      {
        id: 'climate',
        message: '**Klimazone und minimale Außentemperatur** am Standort?',
        choices: [
          { label: 'Gemäßigt — Mitteleuropa', detail: 'Minimum ca. −15 °C, Standardauslegung', params: { ambientTempMin: -15 }, icon: 'temp-chilling' },
          { label: 'Kalt — Nordeuropa / Alpen', detail: 'Minimum ca. −25 °C, verstärkter Frostschutz', params: { ambientTempMin: -25 }, icon: 'temp-freezing' },
          { label: 'Extrem kalt — Arktis / Sibirien', detail: 'Unter −30 °C, Sonderkonstruktion', params: { ambientTempMin: -35 }, icon: 'temp-deep-freeze' },
          { label: 'Tropisch / subtropisch', detail: 'Immer über 0 °C, hohe Luftfeuchte', params: { ambientTempMin: 5 }, icon: 'temp-ambient' },
        ],
      },
      {
        id: 'frost-protection',
        message: '**Frostschutz-Medium** bei Außenaufstellung oder Minustemperaturen?',
        choices: [
          { label: 'Ethylenglykol', detail: 'Industriestandard, günstig', params: { glycolType: 'ethylene', concentrationVolPct: 34 }, icon: undefined },
          { label: 'Propylenglykol', detail: 'Lebensmittelsicher (H1), höhere Viskosität', params: { glycolType: 'propylene', concentrationVolPct: 34 }, icon: undefined },
          { label: 'Glykol-/Sole-Mischung', detail: 'Sondermischung für sehr tiefe Temperaturen', params: { glycolType: 'mixed' }, icon: undefined },
          { label: 'Kein Frostschutz erforderlich', detail: 'Innen oder immer > 0 °C', params: { glycolType: 'water', concentrationVolPct: 0 }, icon: undefined },
        ],
      },
    ],
  },

  // ── 4. BY REFRIGERANT ────────────────────────────────────────────────────
  {
    entry_id: 'by-refrigerant',
    tab_id: 'refrigerant',
    title: 'Refrigerant: Auswahl nach Ansatz & Compliance',
    target_kind: 'refrigerant-map',
    target_cat_id: null,
    target_slug: null,
    fixed_params: {},
    questions: [
      {
        id: 'approach',
        message: '**Welchen Kältemittelansatz** verfolgen Sie? Die Wahl beeinflusst Kosten, F-Gas-Regulierung und Langlebigkeit.',
        choices: [
          { label: 'Natürliche Kältemittel', detail: 'CO₂, NH₃, Propan — F-Gas-frei, zukunftssicher', params: { refrigerantGroup: 'natural' }, icon: 'refrigerant-hfo', _weak: 'refrigerant-hfo ist Annäherung (eco/future-proof) — kein "natürlich"-Icon' },
          { label: 'Synthetische Kältemittel', detail: 'HFO, HFC-Blends — bewährt, breite Verfügbarkeit', params: { refrigerantGroup: 'synthetic' }, icon: 'refrigerant-hfc' },
          { label: 'Entflammbare Kältemittel (A3 / A2L)', detail: 'R290, R32 — hohe Effizienz, Sicherheitsauflagen', params: { refrigerantGroup: 'flammable' }, icon: 'refrigerant-hydrocarbon' },
          { label: 'Ammoniak NH₃ (B2L, toxisch)', detail: 'Industriestandard, GWP 0, Sicherheitszone nötig', params: { refrigerant: 'R717' }, icon: 'refrigerant-nh3' },
        ],
      },
      {
        id: 'flammability',
        message: '**Entflammbarkeitsklasse** des geplanten Kältemittels (ASHRAE 34)?',
        choices: [
          { label: 'A1 — nicht entflammbar', detail: 'R744, R717, R134a, R448A …', params: { flammabilityClass: 'A1' }, icon: 'reg-fgas' },
          { label: 'A2L — gering entflammbar', detail: 'R32, R1234yf, R454B …', params: { flammabilityClass: 'A2L' }, icon: 'reg-atex' },
          { label: 'A3 / B3 — stark entflammbar', detail: 'R290 (Propan), R600a …', params: { flammabilityClass: 'A3' }, icon: 'reg-atex' },
        ],
      },
      {
        id: 'toxicity',
        message: '**Toxizitätsklasse** des Kältemittels?',
        choices: [
          { label: 'Klasse A — geringe Toxizität', detail: 'Alle gängigen HFO/HFC/CO₂', params: { toxicityClass: 'A' }, icon: 'ops-standalone' },
          { label: 'Klasse B — erhöhte Toxizität', detail: 'NH₃ — Maschinenkeller, Schulungen, Alarmierung', params: { toxicityClass: 'B' }, icon: 'reg-atex' },
        ],
      },
      {
        id: 'fgas-fill',
        message: '**Kältemittel-Füllmenge** — F-Gas-Compliance (EU 2024/573)?',
        choices: [
          { label: '< 3 kg', detail: 'Kein Leckage-Logbuch erforderlich', params: { refrigerantChargeKg: 1.5 }, icon: 'reg-fgas' },
          { label: '3–40 kg', detail: 'Jährliche Leckageprüfung, Logbuch', params: { refrigerantChargeKg: 10 }, icon: 'reg-fgas' },
          { label: '> 40 kg', detail: 'Automatische Leckage-Meldepflicht, halbjährliche Prüfung', params: { refrigerantChargeKg: 60 }, icon: 'reg-fgas' },
        ],
      },
      {
        id: 'retrofit',
        message: '**Neuanlage oder Retrofit** einer bestehenden Kälteanlage?',
        choices: [
          { label: 'Neuanlage (Greenfield)', detail: 'Freie Kältemittelwahl, optimale Auslegung', params: { projectType: 'greenfield' }, icon: 'ops-standalone' },
          { label: 'Retrofit bestehender Anlage', detail: 'Kältemittel-Drop-in oder Umbau', params: { projectType: 'retrofit' }, icon: 'ops-retrofit' },
          { label: 'Erweiterung laufende Anlage', detail: 'Zusätzliche Kapazität, bestehendes Netz', params: { projectType: 'expansion' }, icon: 'ops-bms' },
        ],
      },
    ],
  },

  // ── 5. ENERGY & PROCESS COOLING ─────────────────────────────────────────
  // Bestehende 3 Fragen + Icons; 2 neue Fragen ergänzt.
  {
    entry_id: 'energy-process-cooling',
    tab_id: 'application',
    title: 'Application: Energy & Process Cooling',
    target_kind: 'static',
    target_cat_id: 4,
    target_slug: 'dry-cooler',
    fixed_params: { coolingPurpose: 'industrial', glycolType: 'ethylene', concentrationVolPct: 34 },
    questions: [
      {
        id: 'process-purpose',
        message: 'Process cooling — what\'s the **primary purpose** of the loop?',
        choices: [
          { label: 'Free cooling', detail: 'Ambient dry-cooler pre-cooling', params: {}, icon: 'ops-freecooling' },
          { label: 'Heat rejection', detail: 'Chiller condenser water loop', params: {}, icon: 'install-outdoor-roof' },
          { label: 'Machine tool cooling', detail: 'Molds, hydraulics, spindles', params: {}, icon: 'building-hvac', _weak: 'building-hvac ist Annäherung — kein Maschinenwerkzeug-Icon' },
          { label: 'Renewable energy', detail: 'Battery / power electronics', params: {}, icon: 'refrigerant-hfo', _weak: 'refrigerant-hfo (eco) ist Annäherung — kein Erneuerbare-Energien-Icon' },
        ],
      },
      {
        id: 'capacity',
        message: 'How much **cooling capacity** do you need?',
        choices: [
          { label: '50 kW', detail: 'Small process', params: { coolingCapacityKw: 50 }, icon: 'capacity-small' },
          { label: '150 kW', detail: 'Mid-size industrial', params: { coolingCapacityKw: 150 }, icon: 'capacity-medium' },
          { label: '300 kW', detail: 'Large process / chiller', params: { coolingCapacityKw: 300 }, icon: 'capacity-large' },
          { label: '500 kW', detail: 'Plant-scale', params: { coolingCapacityKw: 500 }, icon: 'capacity-custom' },
        ],
      },
      {
        id: 'water-regime',
        message: 'Which **fluid inlet/outlet temperature regime**? Dry coolers work best when the fluid is well above ambient.',
        choices: [
          { label: '35 / 30 °C', detail: 'Free cooling, low ΔT', params: { inletTempC: 35, outletTempC: 30 }, icon: 'temp-ambient', _weak: 'temp-ambient ist Annäherung für Niedertemperatur-Freikühlung' },
          { label: '45 / 40 °C', detail: 'Dry cooler standard', params: { inletTempC: 45, outletTempC: 40 }, icon: 'temp-process' },
          { label: '55 / 45 °C', detail: 'High-temp process', params: { inletTempC: 55, outletTempC: 45 }, icon: 'temp-process' },
        ],
      },
      {
        id: 'freecooling-mode',
        message: '**Freikühlung** — ganzjährig oder saisonal nutzbar?',
        choices: [
          { label: 'Ganzjährig (kalte Region)', detail: 'Außentemperatur dauerhaft unter Sollwert', params: { freeCoolingMode: 'full-year' }, icon: 'ops-freecooling' },
          { label: 'Saisonal (Frühjahr / Herbst / Winter)', detail: 'Freikühlung nur bei Kälteeinbruch', params: { freeCoolingMode: 'seasonal' }, icon: 'ops-freecooling' },
          { label: 'Keine Freikühlung geplant', detail: 'Reine Prozesskühlung, Außentemperatur irrelevant', params: { freeCoolingMode: 'none' }, icon: 'ops-standalone' },
        ],
      },
      {
        id: 'adiabatic',
        message: '**Adiabatische Vorkühlung** des Luftstroms (Wasserverdunstung)?',
        choices: [
          { label: 'Ja — adiabatische Kühlung', detail: 'Erhöhte Leistung bei hohen Außentemperaturen', params: { adiabaticCooling: true }, icon: 'temp-ambient', _weak: 'temp-ambient ist Annäherung — kein dediziertes Adiabatik-Icon' },
          { label: 'Nein — trockener Betrieb', detail: 'Wartungsärmer, kein Wasseranschluss nötig', params: { adiabaticCooling: false }, icon: 'install-outdoor-roof' },
        ],
      },
    ],
  },

  // ── 6. INDUSTRIAL REFRIGERATION ─────────────────────────────────────────
  // Bestehende 4 Fragen + Icons; 3 neue Fragen ergänzt.
  {
    entry_id: 'industrial-refrigeration',
    tab_id: 'application',
    title: 'Application: Industrial Refrigeration',
    target_kind: 'static',
    target_cat_id: 1,
    target_slug: 'evaporator-pump',
    fixed_params: { coolingPurpose: 'industrial' },
    questions: [
      {
        id: 'process-type',
        message: 'Industrial refrigeration — solid choice. **What are you cooling?** This helps me set the right temperature levels.',
        choices: [
          { label: 'Meat / fish', detail: '-2 °C storage, hygiene-critical', params: {}, icon: 'building-cold-storage' },
          { label: 'Fruit / vegetable', detail: '0-4 °C, high humidity', params: {}, icon: 'building-cold-storage' },
          { label: 'Dairy / beverages', detail: '+2 °C, moderate temperature', params: {}, icon: 'building-cold-storage' },
          { label: 'Frozen goods', detail: '-18 to -25 °C long-term storage', params: {}, icon: 'temp-freezing' },
        ],
      },
      {
        id: 'capacity',
        message: '**How much cooling capacity** do you need? Industrial systems land between 25 kW and 500+ kW.',
        choices: [
          { label: '25 kW', detail: 'Small industrial cold room', params: { coolingCapacityKw: 25 }, icon: 'capacity-small' },
          { label: '50 kW', detail: 'Mid-size cold storage', params: { coolingCapacityKw: 50 }, icon: 'capacity-medium' },
          { label: '100 kW', detail: 'Large freezer / process', params: { coolingCapacityKw: 100 }, icon: 'capacity-large' },
          { label: '250 kW', detail: 'Full industrial facility', params: { coolingCapacityKw: 250 }, icon: 'capacity-custom' },
        ],
      },
      {
        id: 'refrigerant',
        message: '**Which refrigerant?** NH₃ is the industrial standard. CO₂ works for cascade / transcritical. R448A/R452A for HFC retrofits.',
        choices: [
          { label: 'R717 (NH₃)', detail: 'Industrial standard', params: { refrigerant: 'R717' }, icon: 'refrigerant-nh3' },
          { label: 'R744 (CO₂)', detail: 'Cascade / transcritical', params: { refrigerant: 'R744' }, icon: 'refrigerant-co2' },
          { label: 'R448A', detail: 'HFO blend, retrofit', params: { refrigerant: 'R448A' }, icon: 'refrigerant-hfc' },
          { label: 'R452A', detail: 'HFO blend, low-temp', params: { refrigerant: 'R452A' }, icon: 'refrigerant-hfc' },
        ],
      },
      {
        id: 'temperature-regime',
        message: 'Last one: **which temperature regime?** Sets the evaporating temperature (t₀) and the target room temperature.',
        choices: [
          { label: 'Cold storage (+2 °C)', detail: 't₀ = -8 °C, room +2 °C', params: { evaporatingTempC: -8, airInletTempC: 2 }, icon: 'temp-chilling' },
          { label: 'Deep freeze (-18 °C)', detail: 't₀ = -25 °C, room -18 °C', params: { evaporatingTempC: -25, airInletTempC: -18 }, icon: 'temp-freezing' },
          { label: 'Blast freezer (-35 °C)', detail: 't₀ = -40 °C, room -35 °C', params: { evaporatingTempC: -40, airInletTempC: -35 }, icon: 'temp-deep-freeze' },
        ],
      },
      {
        id: 'defrost',
        message: '**Abtaumethode** für den Verdampfer?',
        choices: [
          { label: 'Elektrische Abtauung', detail: 'Robust, universell einsetzbar', params: { defrostMethod: 'electric' }, icon: 'defrost-electric' },
          { label: 'Heißgas-Abtauung', detail: 'Energieeffizient, kürzere Zyklen', params: { defrostMethod: 'hot-gas' }, icon: 'defrost-hot-gas' },
          { label: 'Luftabtauung', detail: 'Nur bei Plusgraden (> 0 °C)', params: { defrostMethod: 'air' }, icon: 'defrost-air' },
          { label: 'Kombiniert (elektr. + Heißgas)', detail: 'Flexibel, für variierende Lasten', params: { defrostMethod: 'combined' }, icon: 'defrost-combined' },
          { label: 'Keine Abtauung erforderlich', detail: 'Plusgrad-Anwendung ohne Reif', params: { defrostMethod: 'none' }, icon: 'defrost-none' },
        ],
      },
      {
        id: 'noise-zone',
        message: '**Nähe zu Wohnbebauung** oder Schallschutzzone am Aufstellort?',
        choices: [
          { label: 'Nein, keine Einschränkungen', detail: 'Reines Industriegebiet', params: {}, icon: 'ops-standalone' },
          { label: 'Gewerbegebiet, moderate Anforderungen', detail: 'Lärmreduzierung empfohlen', params: { noiseSensitive: true }, icon: 'reg-noise' },
          { label: 'Wohngebiet, strenge Lärmauflagen', detail: 'Grenzwert < 45 dB(A), Schallwand nötig', params: { noiseLimitDBA: 45 }, icon: 'reg-noise' },
          { label: 'Sicherheitsbereich (Einfriedung)', detail: 'NH₃ oder andere Schutzzone', params: { safetyEnclosure: true }, icon: 'install-atex', _weak: 'install-atex ist Annäherung — kein dediziertes Einfriedungs-Icon' },
        ],
      },
      {
        id: 'room-size',
        message: '**Ungefähre Raumgröße** der gekühlten Einheit oder Halle?',
        choices: [
          { label: 'Kleinkammer < 50 m³', detail: 'Einzelraum, kleine Anlage', params: { roomVolumeM3: 25 }, icon: 'capacity-small' },
          { label: 'Mittelkammer 50–500 m³', detail: 'Standardkammer, mittlere Anlage', params: { roomVolumeM3: 200 }, icon: 'capacity-medium' },
          { label: 'Großkammer > 500 m³', detail: 'Lagerhalle, Großanlage', params: { roomVolumeM3: 1000 }, icon: 'capacity-large' },
          { label: 'Mehrere Kammern / Komplex', detail: 'Mehr als eine Temperaturzone', params: { multiZone: true }, icon: 'capacity-custom' },
        ],
      },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Validierung — Icon-Keys prüfen + FALLBACK/WEAK einsammeln
// ─────────────────────────────────────────────────────────────────────────────

function validateAndReport() {
  let errors = 0
  for (const flow of SEEDS) {
    for (const q of flow.questions) {
      for (const c of q.choices) {
        if (c.icon !== undefined) {
          if (!VALID_ICON_KEYS.has(c.icon)) {
            console.error(`  ✗ Ungültiger Icon-Schlüssel "${c.icon}" — ${flow.entry_id}/${q.id}/${c.label}`)
            errors++
          } else if (c._weak) {
            WEAK_ENTRIES.push({
              flow: flow.entry_id, question: q.id, choice: c.label,
              icon: c.icon, reason: c._weak,
            })
          }
        } else {
          FALLBACK_ENTRIES.push({ flow: flow.entry_id, question: q.id, choice: c.label })
        }
      }
    }
  }
  return errors
}

// Entferne interne _weak-Marker bevor JSON in DB geht
function stripMeta(questions) {
  return questions.map(q => ({
    ...q,
    choices: q.choices.map(({ _weak, ...c }) => c),
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Validierung ausführen
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n[seed-questions] Icon-Validierung …')
const validationErrors = validateAndReport()
if (validationErrors > 0) {
  console.error(`\n[seed-questions] ${validationErrors} Validierungsfehler — Abbruch.`)
  process.exit(1)
}
console.log(`  ✓ Alle Icon-Schlüssel gültig (${VALID_ICON_KEYS.size} erlaubte Schlüssel geprüft)`)

if (DRY_RUN) {
  console.log('\n[seed-questions] --dry-run: kein DB-Write. Reports:\n')
  printReport()
  process.exit(0)
}

// ─────────────────────────────────────────────────────────────────────────────
// DB-Connect (identisch mit seed-guided-flows.mjs)
// ─────────────────────────────────────────────────────────────────────────────

const ref = process.env.SUPABASE_PROJECT_ID
const pwd = process.env.SUPABASE_PSW
if (!ref || !pwd) {
  console.error('SUPABASE_PROJECT_ID + SUPABASE_PSW müssen in .env gesetzt sein')
  process.exit(1)
}

const candidates = [
  { label: 'direct',                 host: `db.${ref}.supabase.co`,                     port: 5432, user: 'postgres' },
  { label: 'pooler eu-central',      host: 'aws-0-eu-central-1.pooler.supabase.com',    port: 6543, user: `postgres.${ref}` },
  { label: 'pooler eu-west',         host: 'aws-0-eu-west-1.pooler.supabase.com',       port: 6543, user: `postgres.${ref}` },
  { label: 'pooler eu-central-sess', host: 'aws-0-eu-central-1.pooler.supabase.com',    port: 5432, user: `postgres.${ref}` },
]

let client = null
let usedCand = null
for (const cand of candidates) {
  const c = new pg.Client({
    host: cand.host, port: cand.port, user: cand.user, password: pwd,
    database: 'postgres', ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000,
  })
  try {
    console.log(`[seed-questions] Versuche ${cand.label} → ${cand.host}:${cand.port}`)
    await c.connect()
    client = c
    usedCand = cand.label
    break
  } catch (err) {
    console.warn(`[seed-questions] ✗ ${cand.label}: ${err.message}`)
    try { await c.end() } catch {}
  }
}
if (!client) {
  console.error('[seed-questions] Konnte nicht verbinden.')
  process.exit(1)
}
console.log(`[seed-questions] Verbunden via ${usedCand}.\n`)

// ─────────────────────────────────────────────────────────────────────────────
// Migration: tab_id-Check um 'basic' erweitern (idempotent)
// ─────────────────────────────────────────────────────────────────────────────

try {
  console.log('[seed-questions] Prüfe tab_id-CHECK-Constraint …')
  await client.query(`
    ALTER TABLE guided_entry_flows
      DROP CONSTRAINT IF EXISTS guided_entry_flows_tab_check;
    ALTER TABLE guided_entry_flows
      ADD CONSTRAINT guided_entry_flows_tab_check
        CHECK (tab_id IN ('application', 'refrigerant', 'basic'));
  `)
  console.log("  ✓ Constraint guided_entry_flows_tab_check → ('application', 'refrigerant', 'basic')\n")
} catch (err) {
  console.error('[seed-questions] Migration fehlgeschlagen:', err.message)
  await client.end()
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// Upserts
// ─────────────────────────────────────────────────────────────────────────────

let inserted = 0, updated = 0, failed = 0

for (const seed of SEEDS) {
  const questions = stripMeta(seed.questions)
  try {
    const result = await client.query(
      `INSERT INTO guided_entry_flows
         (entry_id, tab_id, title, questions, fixed_params, target_kind, target_cat_id, target_slug, enabled)
       VALUES ($1, $2, $3, $4::JSONB, $5::JSONB, $6, $7, $8, TRUE)
       ON CONFLICT (entry_id) DO UPDATE SET
         tab_id        = EXCLUDED.tab_id,
         title         = EXCLUDED.title,
         questions     = EXCLUDED.questions,
         fixed_params  = EXCLUDED.fixed_params,
         target_kind   = EXCLUDED.target_kind,
         target_cat_id = EXCLUDED.target_cat_id,
         target_slug   = EXCLUDED.target_slug,
         updated_at    = NOW()
       RETURNING (xmax = 0) AS is_insert`,
      [
        seed.entry_id, seed.tab_id, seed.title,
        JSON.stringify(questions), JSON.stringify(seed.fixed_params),
        seed.target_kind, seed.target_cat_id, seed.target_slug,
      ],
    )
    const isNew = result.rows[0].is_insert
    const qCount = questions.length
    const cCount = questions.reduce((n, q) => n + q.choices.length, 0)
    if (isNew) {
      inserted++
      console.log(`  ✓ inserted: ${seed.entry_id}  (${qCount} Fragen, ${cCount} Optionen)`)
    } else {
      updated++
      console.log(`  ✓ updated:  ${seed.entry_id}  (${qCount} Fragen, ${cCount} Optionen)`)
    }
  } catch (err) {
    failed++
    console.error(`  ✗ ${seed.entry_id}: ${err.message}`)
  }
}

await client.end()

// ─────────────────────────────────────────────────────────────────────────────
// Abschluß-Report
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n[seed-questions] Done. ${inserted} inserted, ${updated} updated, ${failed} failed.\n`)
printReport()
process.exit(failed > 0 ? 1 : 0)

// ─────────────────────────────────────────────────────────────────────────────

function printReport() {
  if (FALLBACK_ENTRIES.length > 0) {
    console.log('── FALLBACK (kein Icon zugewiesen) ──────────────────────────────────')
    for (const e of FALLBACK_ENTRIES) {
      console.log(`   ${e.flow} / ${e.question} / "${e.choice}"`)
    }
    console.log(`   → ${FALLBACK_ENTRIES.length} Option(en) ohne Icon — im Admin-Picker nachholen\n`)
  }

  if (WEAK_ENTRIES.length > 0) {
    console.log('── WEAK (Icon ist Annäherung, kein exakter Match) ───────────────────')
    for (const e of WEAK_ENTRIES) {
      console.log(`   ${e.flow} / ${e.question} / "${e.choice}"  →  ${e.icon}`)
      console.log(`     ${e.reason}`)
    }
    console.log(`   → ${WEAK_ENTRIES.length} Option(en) mit Annäherungs-Icon — ggf. Icon-Registry erweitern\n`)
  }

  if (FALLBACK_ENTRIES.length === 0 && WEAK_ENTRIES.length === 0) {
    console.log('✓ Alle Optionen haben exakte Icon-Zuordnungen.\n')
  }
}
