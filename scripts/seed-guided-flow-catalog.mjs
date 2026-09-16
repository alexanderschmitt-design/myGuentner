#!/usr/bin/env node
/**
 * seed-guided-flow-catalog.mjs
 *
 * Finale Migration: Alle 7 produktiven Guided Flows erhalten exakt 5 Fragen
 * mit zugewiesenen Icons aus der 40-Key-Registry.
 *
 * Abdeckung:
 *   By Application: commercial-hvac, industrial-refrigeration,
 *                   energy-process-cooling, data-center
 *   By Refrigerant: natural-refrigerants, brine, synthetic-refrigerants
 *
 * Icon-Validierung läuft lokal gegen VALID_ICON_KEYS (synchron mit
 * nuxt/server/utils/choiceIconKeys.ts) — dieselbe Logik wie der PUT-Endpunkt.
 * Nach dem Einspielen wird programmatisch verifiziert, dass jede der 7
 * Kategorien exakt 5 Fragen enthält.
 *
 * Usage:
 *   node scripts/seed-guided-flow-catalog.mjs
 *   node scripts/seed-guided-flow-catalog.mjs --dry-run
 */

import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as dotenvConfig } from 'dotenv'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenvConfig({ path: resolve(__dirname, '..', '.env') })

const DRY_RUN = process.argv.includes('--dry-run')
const REQUIRED_QUESTIONS = 5

// ─────────────────────────────────────────────────────────────────────────────
// Icon-Key-Validierung (manuell synchron mit server/utils/choiceIconKeys.ts)
// ─────────────────────────────────────────────────────────────────────────────

const VALID_ICON_KEYS = new Set([
  // Gebäude & Anwendung
  'building-cold-storage', 'building-freezer', 'building-hvac',
  'building-data-center', 'building-pharma',
  // Kapazität
  'capacity-small', 'capacity-medium', 'capacity-large',
  'capacity-custom', 'capacity-redundant',
  // Kältemittel
  'refrigerant-co2', 'refrigerant-nh3', 'refrigerant-hfc',
  'refrigerant-hydrocarbon', 'refrigerant-hfo',
  // Temperaturniveau
  'temp-chilling', 'temp-freezing', 'temp-deep-freeze',
  'temp-process', 'temp-ambient',
  // Aufstellung & Umgebung
  'install-indoor-ceiling', 'install-indoor-floor', 'install-outdoor-roof',
  'install-coastal', 'install-atex',
  // Sicherheit & Regulatorik
  'reg-fgas', 'reg-atex', 'reg-food', 'reg-pharma', 'reg-noise',
  // Abtauung
  'defrost-electric', 'defrost-hot-gas', 'defrost-air',
  'defrost-combined', 'defrost-none',
  // Betriebsweise
  'ops-standalone', 'ops-bms', 'ops-redundant',
  'ops-freecooling', 'ops-retrofit',
])

// ─────────────────────────────────────────────────────────────────────────────
// Tracking: FALLBACK (kein Icon) + WEAK (Annäherung)
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_ENTRIES = []   // { flow, question, choice }
const WEAK_ENTRIES    = []   // { flow, question, choice, icon, reason }

// Markierungen werden vor DB-Write entfernt (stripMeta)
function c(label, detail, params, icon, weakReason) {
  return { label, detail, params, icon: icon ?? undefined, _weak: weakReason ?? null }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fragenkatalog — 7 × 5 = 35 Fragen
// ─────────────────────────────────────────────────────────────────────────────

const SEEDS = [

  // ══════════════════════════════════════════════════════════════════════════
  // BY APPLICATION
  // ══════════════════════════════════════════════════════════════════════════

  // ── 1. Commercial HVAC ────────────────────────────────────────────────────
  {
    entry_id: 'commercial-hvac',
    tab_id: 'application',
    title: 'Application: Commercial HVAC',
    target_kind: 'static',
    target_cat_id: 2,
    target_slug: 'air-cooler',
    fixed_params: { coolingPurpose: 'air-conditioning', glycolType: 'ethylene', concentrationVolPct: 34 },
    questions: [
      {
        id: 'side',
        message: 'Are you configuring a unit for the **cold side or the warm side**?',
        choices: [
          c('Cold side', 'Outdoor, roof-mounted condenser — rejects heat', { systemSide: 'warm' },
            'install-outdoor-roof'),
          c('Warm side', 'Indoor air cooler / fan coil — absorbs room heat', { systemSide: 'cold' },
            'install-indoor-ceiling'),
        ],
      },
      {
        id: 'building-type',
        message: '**What type of building** needs to be served?',
        choices: [
          c('Office', 'Comfort cooling, 9 am–6 pm, moderate load', { buildingType: 'office' },
            'building-hvac'),
          c('Hotel', 'Continuous operation, variable occupancy', { buildingType: 'hotel' },
            'install-indoor-floor', 'install-indoor-floor ist Annäherung — kein Hotel-Icon in Registry'),
          c('Clinic / Lab', 'GMP environment, tight tolerance, 24/7', { buildingType: 'clinic', coolingPurpose: 'pharma' },
            'building-pharma'),
          c('Retail', 'Display cooling, long opening hours, high solar gain', { buildingType: 'retail', coolingPurpose: 'cold-storage' },
            'building-cold-storage', 'building-cold-storage ist Annäherung — kein Einzelhandels-Icon'),
        ],
      },
      {
        id: 'capacity',
        message: '**What cooling capacity** is required?',
        choices: [
          c('< 50 kW', 'Small office, single tenant', { coolingCapacityKw: 30 }, 'capacity-small'),
          c('50–200 kW', 'Mid-size office building, hotel', { coolingCapacityKw: 100 }, 'capacity-medium'),
          c('200–500 kW', 'Large office / clinic / shopping centre', { coolingCapacityKw: 300 }, 'capacity-large'),
          c('> 500 kW', 'Multi-building campus / hospital', { coolingCapacityKw: 600 }, 'capacity-custom'),
        ],
      },
      {
        id: 'refrigerant-medium',
        message: '**Which refrigerant or medium** will be used?',
        choices: [
          c('R134a', 'HFC, GWP 1430 — established, phase-down underway', { refrigerant: 'R134a' },
            'refrigerant-hfc'),
          c('R32', 'HFC, GWP 675 — more efficient, mildly flammable (A2L)', { refrigerant: 'R32' },
            'refrigerant-hfc'),
          c('Glycol brine', 'Indirect system — secondary glycol loop', { glycolType: 'ethylene', concentrationVolPct: 34 },
            undefined),  // FALLBACK: no glycol icon in registry
        ],
      },
      {
        id: 'install-conditions',
        message: '**What installation conditions** need to be considered on site?',
        choices: [
          c('Space constraints / limited footprint', 'Compact unit or roof mounting required', { installConstraint: 'space' },
            'install-indoor-floor', 'install-indoor-floor ist Annäherung — kein Platz/Fläche-Icon'),
          c('Noise limits / sound regulations', 'Near residential area or neighbourhood noise ordinance', { noiseSensitive: true },
            'reg-noise'),
          c('Access / maintenance / delivery', 'Narrow stairwells, crane restrictions', { installConstraint: 'access' },
            undefined),  // FALLBACK: no access/maintenance icon
        ],
      },
    ],
  },

  // ── 2. Industrial Refrigeration ───────────────────────────────────────────
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
        id: 'cold-room-purpose',
        message: '**What is the purpose** of the cold room or refrigerated space?',
        choices: [
          c('Cooling down', 'Active chilling of product — high initial load', { coolingPurpose: 'chilling' },
            'temp-chilling'),
          c('Warehousing', 'Long-term cold storage at stable temperature', { coolingPurpose: 'cold-storage' },
            'building-cold-storage'),
          c('Processing area', 'Food processing, butchery, packaging line', { coolingPurpose: 'processing' },
            'building-hvac', 'building-hvac ist Annäherung — kein Produktions-Icon'),
        ],
      },
      {
        id: 'temperature-range',
        message: '**What temperature range** does the application require?',
        choices: [
          c('Normal chill (0–8 °C)', 'Fresh produce, dairy, beverages', { airInletTempC: 4 },
            'temp-chilling'),
          c('Deep-freeze (< −16 °C)', 'Frozen goods, blast freezing', { airInletTempC: -20 },
            'temp-freezing'),
          c('Comfort / AC range (+18–26 °C)', 'Processing areas, crew spaces', { airInletTempC: 22 },
            'temp-ambient'),
        ],
      },
      {
        id: 'refrigerant',
        message: '**Which refrigerant** is used or planned?',
        choices: [
          c('R717 (NH₃)', 'Industrial standard — GWP 0, high efficiency', { refrigerant: 'R717' },
            'refrigerant-nh3'),
          c('R744 (CO₂)', 'Natural — GWP 1, cascade or transcritical', { refrigerant: 'R744' },
            'refrigerant-co2'),
          c('Synthetic (HFO/HFC blend)', 'R448A, R452A — retrofit-friendly', { refrigerant: 'R448A' },
            'refrigerant-hfc'),
        ],
      },
      {
        id: 'defrost-method',
        message: '**What defrost method** is required for the evaporator?',
        choices: [
          c('Air defrost', 'Above 0 °C only — lowest energy, simplest', { defrostMethod: 'air' },
            'defrost-air'),
          c('Electric defrost', 'Universal, reliable, shorter cycles', { defrostMethod: 'electric' },
            'defrost-electric'),
          c('Hot gas defrost', 'Energy-efficient — recirculates refrigerant', { defrostMethod: 'hot-gas' },
            'defrost-hot-gas'),
        ],
      },
      {
        id: 'room-access',
        message: '**What are the room dimensions and installation access conditions?**',
        choices: [
          c('Small room / tight fit (< 200 m²)', 'Low ceiling, limited crane access', { roomVolumeM3: 150 },
            'capacity-small'),
          c('Standard room (200–800 m²)', 'Normal ceiling height, standard delivery', { roomVolumeM3: 400 },
            'capacity-medium'),
          c('Large hall / high bay (> 800 m²)', 'Wide span, crane available, high ceiling', { roomVolumeM3: 1500 },
            'capacity-large'),
        ],
      },
    ],
  },

  // ── 3. Energy & Process Cooling ───────────────────────────────────────────
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
        message: 'What is the **primary purpose** of the loop?',
        choices: [
          c('Free cooling', 'Ambient dry-cooler pre-cooling', { coolingConcept: 'free-cooling' },
            'ops-freecooling'),
          c('Heat rejection', 'Chiller condenser water loop', { coolingConcept: 'heat-rejection' },
            'install-outdoor-roof'),
          c('Machine tool cooling', 'Molds, hydraulics, spindles', { coolingConcept: 'process' },
            'building-hvac', 'building-hvac ist Annäherung — kein Maschinenwerkzeug-Icon'),
          c('Renewable energy / power electronics', 'Battery cooling, inverters, solar', { coolingConcept: 'renewable' },
            'refrigerant-hfo', 'refrigerant-hfo (eco) ist Annäherung — kein Erneuerbare-Icon'),
        ],
      },
      {
        id: 'medium-concentration',
        message: 'What **medium and concentration** is used in the loop?',
        choices: [
          c('Water (no frost protection)', 'Pure water, inside only or above 0 °C', { glycolType: 'water', concentrationVolPct: 0 },
            undefined),  // FALLBACK: kein Wasser-Icon in Registry
          c('Glycol mix (standard concentration)', 'Frost protection down to approx. −15 °C', { glycolType: 'ethylene', concentrationVolPct: 34 },
            undefined),  // FALLBACK: kein Glykol-Icon
          c('Set specific concentration', 'Custom glycol % for site frost requirements', { glycolType: 'ethylene' },
            undefined),  // FALLBACK: kein Konzentrations-Icon
        ],
      },
      {
        id: 'temperature-regime',
        message: 'What **supply/return temperature regime** and allowable temperature rise are needed?',
        choices: [
          c('Low-temp chilled water (6 / 12 °C)', 'Standard HVAC chilled water', { inletTempC: 12, outletTempC: 6 },
            'temp-chilling'),
          c('Medium-temp process water (12 / 18 °C)', 'Process cooling, dry-cooler standard', { inletTempC: 18, outletTempC: 12 },
            'temp-process'),
          c('High-temp loop (35 / 45 °C, ΔT 10 K)', 'Free cooling, high ambient efficiency', { inletTempC: 45, outletTempC: 35 },
            'temp-ambient'),
        ],
      },
      {
        id: 'freecooling-availability',
        message: 'Is **free cooling** available year-round at the site, or only seasonally?',
        choices: [
          c('Year-round (cold region)', 'Ambient consistently below set-point — full benefit', { freeCoolingMode: 'full-year' },
            'ops-freecooling'),
          c('Seasonal only (spring / autumn / winter)', 'Partial free cooling — hybrid operation', { freeCoolingMode: 'seasonal' },
            'ops-freecooling'),
        ],
      },
      {
        id: 'site-environment',
        message: 'Is the site **near residential areas**, or in an industrial zone?',
        choices: [
          c('Residential nearby', 'Strict noise limits apply — sound-optimised selection', { noiseSensitive: true, noiseLimitDBA: 45 },
            'reg-noise'),
          c('Industrial zone', 'No special noise or access restrictions', { noiseSensitive: false },
            'ops-standalone'),
        ],
      },
    ],
  },

  // ── 4. Data Center ────────────────────────────────────────────────────────
  {
    entry_id: 'data-center',
    tab_id: 'application',
    title: 'Application: Data Center',
    target_kind: 'static',
    target_cat_id: 4,
    target_slug: 'dry-cooler',
    fixed_params: { coolingPurpose: 'data-center', glycolType: 'ethylene', concentrationVolPct: 34 },
    questions: [
      {
        id: 'cooling-concept',
        message: '**Which cooling concept** will be used?',
        choices: [
          c('Free cooling / ambient air', 'Dry cooler — high efficiency, no chiller required', { coolingConcept: 'free-cooling' },
            'ops-freecooling'),
          c('Adiabatic / evaporative cooling', 'Boosts capacity during heat events via water evaporation', { coolingConcept: 'adiabatic' },
            'temp-ambient', 'temp-ambient ist Annäherung — kein dediziertes Adiabatik-Icon'),
          c('Combination with chiller', 'Hybrid: free cooling + chiller for peak load', { coolingConcept: 'hybrid' },
            'ops-bms', 'ops-bms (BMS = managed system) ist Annäherung für Hybrid-Konzept'),
        ],
      },
      {
        id: 'redundancy',
        message: '**What redundancy level** is required?',
        choices: [
          c('N — no redundancy', 'Non-critical, test or edge environment', { redundancy: 'N' },
            'ops-standalone'),
          c('N+1 — one standby unit', 'Standard fault tolerance, single-point failure covered', { redundancy: 'N+1' },
            'ops-redundant'),
          c('2N — full duplication', 'Tier-3+ reliability, complete system duplication', { redundancy: '2N' },
            'capacity-redundant'),
        ],
      },
      {
        id: 'supply-temp',
        message: '**What supply temperature** is permissible in your design?',
        choices: [
          c('< 18 °C', 'Traditional chiller-fed supply', { outletTempC: 16 },
            'temp-chilling'),
          c('18–22 °C', 'Warm-water cooling — efficient, broad free-cooling window', { outletTempC: 20 },
            'temp-process'),
          c('22–27 °C', 'Extended economiser — free cooling almost year-round', { outletTempC: 25 },
            'temp-process'),
          c('> 27 °C', 'Full free cooling / liquid immersion — maximum efficiency', { outletTempC: 32 },
            'temp-ambient'),
        ],
      },
      {
        id: 'installation-site',
        message: '**Where will the unit be installed**, and what weather or noise protection is needed?',
        choices: [
          c('Rooftop — wind, rain, frost exposure', 'Weather protection, vibration isolation required', { installationType: 'outdoor-roof' },
            'install-outdoor-roof'),
          c('Open ground / noise-sensitive site', 'Concrete pad, noise limit to be observed', { installationType: 'outdoor-ground', noiseSensitive: true },
            'reg-noise'),
          c('Enclosed / fenced compound', 'Restricted access security perimeter', { installationType: 'enclosed' },
            'install-atex', 'install-atex ist Annäherung — kein Einfriedungs-Icon in Registry'),
        ],
      },
      {
        id: 'climate-zone',
        message: '**Which climate zone** determines frost protection and glycol content?',
        choices: [
          c('Mild — approx. 20 % glycol', 'Central European climate, min. −10 °C', { glycolType: 'ethylene', concentrationVolPct: 20, ambientTempMin: -10 },
            'temp-chilling'),
          c('Temperate — approx. 35 % glycol', 'Continental climate, min. −20 °C', { glycolType: 'ethylene', concentrationVolPct: 35, ambientTempMin: -20 },
            'temp-freezing'),
          c('Severe — approx. 50 % glycol', 'Northern Europe / Alps, min. −35 °C', { glycolType: 'ethylene', concentrationVolPct: 50, ambientTempMin: -35 },
            'temp-deep-freeze'),
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BY REFRIGERANT
  // ══════════════════════════════════════════════════════════════════════════

  // ── 5. Natural Refrigerants ───────────────────────────────────────────────
  {
    entry_id: 'natural-refrigerants',
    tab_id: 'refrigerant',
    title: 'Refrigerant: Natural',
    target_kind: 'refrigerant-map',
    target_cat_id: null,
    target_slug: null,
    fixed_params: {},
    questions: [
      {
        id: 'refrigerant-selection',
        message: '**Which natural refrigerant** will be used?',
        choices: [
          c('R717 (NH₃)', 'GWP 0, B2L — industrial standard, high efficiency', { refrigerant: 'R717' },
            'refrigerant-nh3'),
          c('R744 (CO₂)', 'GWP 1, A1 — transcritical or cascade', { refrigerant: 'R744' },
            'refrigerant-co2'),
          c('R290 (Propane) / HC', 'GWP 3, A3 — small-charge systems, high efficiency', { refrigerant: 'R290' },
            'refrigerant-hydrocarbon'),
        ],
      },
      {
        id: 'safety-requirements',
        message: '**What safety requirements** apply at the installation site?',
        choices: [
          c('Ventilation required', 'Machine room, exhaust system, safety zone', { safetyRequirement: 'ventilation' },
            'reg-atex'),
          c('Restricted access', 'Controlled entry zone, limited personnel', { safetyRequirement: 'restricted-access' },
            undefined),  // FALLBACK: no access/lock icon in registry
          c('Gas detection required', 'Detector, alarm system, emergency shut-off', { safetyRequirement: 'gas-detection' },
            'reg-atex'),
        ],
      },
      {
        id: 'charge-size',
        message: '**What charge size / system scale** is planned?',
        choices: [
          c('Small — below reporting threshold', 'No mandatory reporting obligation', { refrigerantChargeKg: 5 },
            'capacity-small'),
          c('Medium — reportable', 'Regular leak inspection and logbook required', { refrigerantChargeKg: 20 },
            'capacity-medium'),
          c('Large — permit required', 'Authority permit, independent inspection', { refrigerantChargeKg: 100 },
            'capacity-large'),
        ],
      },
      {
        id: 'operating-conditions',
        message: '**What operating temperatures / pressures** are required?',
        choices: [
          c('Transcritical — high ambient temperature', 'CO₂ above critical point (> 31 °C), high-pressure circuit', { operatingMode: 'transcritical' },
            'temp-ambient'),
          c('Subcritical — moderate ambient temperature', 'NH₃ / HC / CO₂ below critical point', { operatingMode: 'subcritical' },
            'temp-process'),
        ],
      },
      {
        id: 'project-type',
        message: '**New installation** with free refrigerant choice, or **retrofit** of an existing system?',
        choices: [
          c('New installation', 'Greenfield — optimal design, free refrigerant selection', { projectType: 'greenfield' },
            'ops-standalone'),
          c('Retrofit / existing system', 'Drop-in replacement or conversion of existing plant', { projectType: 'retrofit' },
            'ops-retrofit'),
        ],
      },
    ],
  },

  // ── 6. Brine ──────────────────────────────────────────────────────────────
  {
    entry_id: 'brine',
    tab_id: 'refrigerant',
    title: 'Refrigerant: Brine (Secondary Loop)',
    target_kind: 'static',
    target_cat_id: 2,
    target_slug: 'air-cooler',
    fixed_params: {},
    questions: [
      {
        id: 'brine-medium',
        message: '**Which brine medium** is used in the secondary loop?',
        choices: [
          c('Ethylene glycol', 'Industrial standard — cost-effective, widely available', { glycolType: 'ethylene' },
            undefined),  // FALLBACK: no glycol icon in registry
          c('Propylene glycol', 'Food-safe (H1) — higher viscosity', { glycolType: 'propylene' },
            undefined),  // FALLBACK: no glycol icon
          c('Calcium chloride', 'Very low temperatures down to −50 °C, corrosive', { glycolType: 'calcium-chloride' },
            undefined),  // FALLBACK: no salt/crystal icon
        ],
      },
      {
        id: 'frost-protection',
        message: '**What concentration / frost protection point** is required?',
        choices: [
          c('Low — mild frost protection (to approx. −10 °C)', 'Approx. 25 % glycol content', { concentrationVolPct: 25 },
            'temp-chilling'),
          c('Medium — standard protection (to approx. −20 °C)', 'Approx. 35 % glycol content', { concentrationVolPct: 35 },
            'temp-freezing'),
          c('High — strong frost protection (to approx. −35 °C)', 'Approx. 50 % glycol content', { concentrationVolPct: 50 },
            'temp-deep-freeze'),
        ],
      },
      {
        id: 'temperature-regime',
        message: '**What supply / return temperature** is planned for the brine circuit?',
        choices: [
          c('< 0 °C — sub-zero range', 'Deep-freeze applications, frost protection essential', { inletTempC: -5, outletTempC: -10 },
            'temp-freezing'),
          c('0–10 °C — chilling range', 'Cold rooms, production processes', { inletTempC: 2, outletTempC: -3 },
            'temp-chilling'),
          c('> 10 °C — air conditioning / chiller', 'Building cooling, comfort applications', { inletTempC: 12, outletTempC: 6 },
            'temp-process'),
        ],
      },
      {
        id: 'material-protection',
        message: '**What material / corrosion-protection requirements** apply?',
        choices: [
          c('Standard materials', 'Standard steel / copper, inhibitor in glycol sufficient', { materialClass: 'standard' },
            'ops-standalone'),
          c('Inhibitor mandatory', 'pH monitoring, anti-corrosion additive required', { materialClass: 'inhibited', inhibitorRequired: true },
            'reg-fgas', 'reg-fgas ist Annäherung — kein dediziertes Inhibitor/Chemie-Icon'),
          c('Special materials (stainless / titanium)', 'Food contact or aggressive environment', { materialClass: 'special' },
            'install-coastal', 'install-coastal ist Annäherung — Küstenumgebung = Korrosionsschutz'),
        ],
      },
      {
        id: 'flow-rate',
        message: '**How is the flow rate** in the brine circuit sized?',
        choices: [
          c('Low flow rate (< 5 m³/h)', 'Small system, short pipework runs', { coolingCapacityKw: 10 },
            'capacity-small'),
          c('Medium flow rate (5–30 m³/h)', 'Standard system, medium distribution', { coolingCapacityKw: 50 },
            'capacity-medium'),
          c('High flow rate (> 30 m³/h)', 'Large system, long pipework distances', { coolingCapacityKw: 150 },
            'capacity-large'),
        ],
      },
    ],
  },

  // ── 7. Synthetic Refrigerants ─────────────────────────────────────────────
  {
    entry_id: 'synthetic-refrigerants',
    tab_id: 'refrigerant',
    title: 'Refrigerant: Synthetic',
    target_kind: 'refrigerant-map',
    target_cat_id: null,
    target_slug: null,
    fixed_params: {},
    questions: [
      {
        id: 'refrigerant-selection',
        message: '**Which synthetic refrigerant** is being used or planned?',
        choices: [
          c('R134a', 'HFC, GWP 1430 — established, phase-down affected', { refrigerant: 'R134a' },
            'refrigerant-hfc'),
          c('R32', 'HFC, GWP 675 — high efficiency, mildly flammable (A2L)', { refrigerant: 'R32' },
            'refrigerant-hfc'),
          c('R449A / R1234yf / HFO blend', 'GWP < 150 — future-proof, F-gas compliant', { refrigerant: 'R449A' },
            'refrigerant-hfo'),
        ],
      },
      {
        id: 'fgas-compliance',
        message: 'Is the refrigerant permitted in the target market under **F-gas regulations / GWP limits**?',
        choices: [
          c('Compliant — no restrictions', 'GWP < 150 or natural refrigerant', { fgasStatus: 'compliant' },
            'reg-fgas'),
          c('Check restrictions', 'GWP 150–750, specific application limits may apply', { fgasStatus: 'check' },
            'reg-fgas'),
          c('Phase-down affected', 'GWP > 750 — availability declining, prices rising', { fgasStatus: 'phase-down' },
            'reg-fgas'),
        ],
      },
      {
        id: 'charge-size',
        message: 'How does the planned **charge size** compare to F-gas thresholds?',
        choices: [
          c('Small — below threshold', 'No leak log required', { refrigerantChargeKg: 1 },
            'capacity-small'),
          c('Medium — reportable', 'Annual leak inspection and logbook required', { refrigerantChargeKg: 10 },
            'capacity-medium'),
          c('Large — quota relevant', 'F-gas quota, bi-annual inspection required', { refrigerantChargeKg: 60 },
            'capacity-large'),
        ],
      },
      {
        id: 'temperature-level',
        message: '**What temperature level** is required for the application?',
        choices: [
          c('Low temperature (< −18 °C)', 'Deep-freeze, blast freezer', { evaporatingTempC: -30 },
            'temp-freezing'),
          c('Medium temperature (−5 to +5 °C)', 'Cold storage, process cooling', { evaporatingTempC: -10 },
            'temp-chilling'),
          c('High temperature (> +5 °C)', 'Air conditioning, warm process cooling', { evaporatingTempC: 0 },
            'temp-process'),
        ],
      },
      {
        id: 'project-type',
        message: '**New installation** or **retrofit** of an existing system using a predecessor refrigerant?',
        choices: [
          c('New installation', 'Free design — choose the optimal refrigerant', { projectType: 'greenfield' },
            'ops-standalone'),
          c('Retrofit / conversion', 'Drop-in or compressor swap with new refrigerant', { projectType: 'retrofit' },
            'ops-retrofit'),
        ],
      },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Validierung — Icon-Keys prüfen + FALLBACK/WEAK einsammeln
// ─────────────────────────────────────────────────────────────────────────────

function validateAndCollect() {
  let errors = 0
  for (const flow of SEEDS) {
    for (const q of flow.questions) {
      for (const ch of q.choices) {
        if (ch.icon !== undefined && ch.icon !== null) {
          if (!VALID_ICON_KEYS.has(ch.icon)) {
            console.error(`  ✗ Ungültiger Key "${ch.icon}" — ${flow.entry_id}/${q.id}/${ch.label}`)
            errors++
          } else if (ch._weak) {
            WEAK_ENTRIES.push({
              flow: flow.entry_id, question: q.id,
              choice: ch.label, icon: ch.icon, reason: ch._weak,
            })
          }
        } else {
          FALLBACK_ENTRIES.push({ flow: flow.entry_id, question: q.id, choice: ch.label })
        }
      }
    }
  }
  return errors
}

function stripMeta(questions) {
  return questions.map(q => ({
    ...q,
    choices: q.choices.map(({ _weak, ...rest }) => rest),
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Strukturprüfung — jede Kategorie muss exakt REQUIRED_QUESTIONS Fragen haben
// ─────────────────────────────────────────────────────────────────────────────

function checkStructure() {
  let ok = true
  for (const flow of SEEDS) {
    const n = flow.questions.length
    if (n !== REQUIRED_QUESTIONS) {
      console.error(`  ✗ ${flow.entry_id}: ${n} Fragen — erwartet ${REQUIRED_QUESTIONS}`)
      ok = false
    }
  }
  return ok
}

// ─────────────────────────────────────────────────────────────────────────────
// Ausführung
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n[catalog] Struktur- und Icon-Validierung …')

const structureOk = checkStructure()
const iconErrors  = validateAndCollect()

if (!structureOk || iconErrors > 0) {
  if (!structureOk) console.error(`[catalog] Strukturfehler: Nicht alle Flows haben ${REQUIRED_QUESTIONS} Fragen.`)
  if (iconErrors)   console.error(`[catalog] ${iconErrors} ungültige Icon-Schlüssel.`)
  process.exit(1)
}

console.log(`  ✓ Alle 7 Flows × 5 Fragen strukturell korrekt`)
console.log(`  ✓ Alle Icon-Schlüssel gültig (${VALID_ICON_KEYS.size} erlaubte Keys)`)

if (DRY_RUN) {
  console.log('\n[catalog] --dry-run: kein DB-Write.\n')
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
  { label: 'direct',                 host: `db.${ref}.supabase.co`,                  port: 5432, user: 'postgres' },
  { label: 'pooler eu-central',      host: 'aws-0-eu-central-1.pooler.supabase.com', port: 6543, user: `postgres.${ref}` },
  { label: 'pooler eu-west',         host: 'aws-0-eu-west-1.pooler.supabase.com',    port: 6543, user: `postgres.${ref}` },
  { label: 'pooler eu-central-sess', host: 'aws-0-eu-central-1.pooler.supabase.com', port: 5432, user: `postgres.${ref}` },
]

let client = null, usedCand = null
for (const cand of candidates) {
  const c = new pg.Client({
    host: cand.host, port: cand.port, user: cand.user, password: pwd,
    database: 'postgres', ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000,
  })
  try {
    console.log(`\n[catalog] Versuche ${cand.label} → ${cand.host}:${cand.port}`)
    await c.connect()
    client = c; usedCand = cand.label; break
  } catch (err) {
    console.warn(`[catalog] ✗ ${cand.label}: ${err.message}`)
    try { await c.end() } catch {}
  }
}
if (!client) {
  console.error('[catalog] Konnte nicht verbinden.')
  process.exit(1)
}
console.log(`[catalog] Verbunden via ${usedCand}.\n`)

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
    const cTotal = questions.reduce((n, q) => n + q.choices.length, 0)
    if (isNew) { inserted++; console.log(`  ✓ inserted: ${seed.entry_id}  (${questions.length}Q / ${cTotal} Optionen)`) }
    else       { updated++;  console.log(`  ✓ updated:  ${seed.entry_id}  (${questions.length}Q / ${cTotal} Optionen)`) }
  } catch (err) {
    failed++
    console.error(`  ✗ ${seed.entry_id}: ${err.message}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Post-Write-Verifikation: jede Kategorie hat genau 5 Fragen?
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n[catalog] Post-Write-Verifikation …')
const entryIds = SEEDS.map(s => s.entry_id)
let verifyOk = true
try {
  const { rows } = await client.query(
    `SELECT entry_id, jsonb_array_length(questions) AS q_count
       FROM guided_entry_flows
      WHERE entry_id = ANY($1)
      ORDER BY entry_id`,
    [entryIds],
  )
  for (const row of rows) {
    const n = parseInt(row.q_count, 10)
    if (n === REQUIRED_QUESTIONS) {
      console.log(`  ✓ ${row.entry_id}: ${n} Fragen`)
    } else {
      console.error(`  ✗ ${row.entry_id}: ${n} Fragen — erwartet ${REQUIRED_QUESTIONS}`)
      verifyOk = false
    }
  }
  const found = rows.map(r => r.entry_id)
  for (const id of entryIds) {
    if (!found.includes(id)) {
      console.error(`  ✗ ${id}: Zeile nicht in DB gefunden`)
      verifyOk = false
    }
  }
} catch (err) {
  console.error(`[catalog] Verifikations-Query fehlgeschlagen: ${err.message}`)
  verifyOk = false
}

await client.end()

// ─────────────────────────────────────────────────────────────────────────────
// Abschluss-Report
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n[catalog] Done. ${inserted} inserted, ${updated} updated, ${failed} failed.`)
if (!verifyOk) console.warn('[catalog] ⚠ Verifikation: Mindestens eine Kategorie weicht ab!')
console.log()
printReport()
process.exit((failed > 0 || !verifyOk) ? 1 : 0)

// ─────────────────────────────────────────────────────────────────────────────

function printReport() {
  // Vollständige Übersicht aller Fragen + Icons
  console.log('══ Icon-Belegung je Kategorie ════════════════════════════════════════════')
  for (const flow of SEEDS) {
    console.log(`\n  ${flow.entry_id} (${flow.tab_id})`)
    for (const q of flow.questions) {
      console.log(`    Q[${q.id}]: ${q.message.replace(/\*\*/g, '').substring(0, 60)}`)
      for (const ch of q.choices) {
        const iconStr = ch.icon
          ? `${ch.icon}${ch._weak ? ' ⚠' : ''}`
          : 'FALLBACK ✗'
        console.log(`      • ${ch.label.padEnd(42)} → ${iconStr}`)
      }
    }
  }

  console.log('\n══ FALLBACK (kein Icon in Registry) ════════════════════════════════════')
  if (FALLBACK_ENTRIES.length === 0) {
    console.log('  (keine)')
  } else {
    for (const e of FALLBACK_ENTRIES) {
      console.log(`  ${e.flow} / ${e.question} / "${e.choice}"`)
    }
    console.log(`\n  → ${FALLBACK_ENTRIES.length} Option(en) ohne Icon.`)
    console.log('    Empfehlung: Icon-Registry um folgende Gruppen erweitern:')
    console.log('    • Medien/Fluide (Glykol, Wasser, Sole)  z. B. "fluid-glycol", "fluid-water"')
    console.log('    • Zugang/Sicherheit                    z. B. "access-restricted", "maintenance"')
  }

  console.log('\n══ WEAK (Annäherungs-Icon) ══════════════════════════════════════════════')
  if (WEAK_ENTRIES.length === 0) {
    console.log('  (keine)')
  } else {
    for (const e of WEAK_ENTRIES) {
      console.log(`  ${e.flow} / ${e.question} / "${e.choice}"`)
      console.log(`    Icon: ${e.icon}  —  ${e.reason}`)
    }
    console.log(`\n  → ${WEAK_ENTRIES.length} Option(en) mit Annäherungs-Icon.`)
    console.log('    Kann manuell im Admin-Picker verfeinert werden, sobald passendere Icons hinzukommen.')
  }
  console.log()
}
