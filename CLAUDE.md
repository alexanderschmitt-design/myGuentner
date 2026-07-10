# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**myGPC** (my Guntner Product Configurator) — a web application for configuring Guntner heat exchanger / cooling equipment. The app is a 5-step wizard:

1. **Category** — select equipment type (Evaporator, Air Cooler, etc.)
2. **Thermodynamics** — configure calculation parameters (capacity, medium, air conditions, frost, feed rate)
3. **Unit Selection** — choose a specific product model
4. **Results** — view matching products in a data grid (capacity, surface area, pricing, delivery)
5. **Datasheet** — generate detailed technical specification documents

## Tech Stack

- **Runtime**: Node.js (CommonJS modules)
- **Entry point**: `index.js`

## Commands

```bash
npm test        # No test framework configured yet
```

## Current State (Stand: 2026-05-10)

**RAG + DMS + Bella Pipeline ist live** (siehe SETUP.md für Details).

### Was läuft
- **rag-server.js** — Express auf Port 3001 mit folgenden Routen-Gruppen:
  - `/api/documents/*` — Upload, List, Process, Delete
  - `/api/rag/*` — Vector-Store-Stats, Query, Settings, OpenAI-Key-Test
  - `/api/dms/*` — DMS-Health, Search (mit Property-Enrichment), Document-Detail, Source-Schema, Bulk-Import (Job-Tracking)
  - `/api/chat` — Streaming-Chat über Bella (SSE: sources → text → done)
- **Vector-Store** — File-basiert in `vector-store/`, Cosine-Similarity, Metadaten-Filter ($in/$exists/$ne)
- **Embeddings** — Standard `local` (TF-IDF, 384-dim) — `openai` umschaltbar
- **DMS-Connector** (`rag/dms-connector.js`) — d.velop d.3one Bearer-Auth gegen `dms-prod.guentner.com`. Test-Umgebung war beim letzten Probe offline (HTTP 503)
- **Bella** (`rag/llm-bella.js`) — Anthropic Claude Sonnet 4.6 mit Prompt-Caching, Streaming, deutschem Güntner-System-Prompt mit Citations-Anweisung
- **Frontend-Chatbot** — `streamBella()` in `main.js` konsumiert `/api/chat` als SSE-Stream, rendert Tokens live mit Light-Markdown + nummerierten Quellen-Chips

### Was nicht läuft (User-Aktion erforderlich)
- **Anthropic-API-Key in `.env`** wurde im Konversations-Kontext öffentlich → **Key rotieren** unter https://console.anthropic.com/settings/keys, alten revoken, neuen in `.env` als `ANTHROPIC_API_KEY` einsetzen. Bis dahin liefert `/api/chat` einen `error`-SSE-Event statt Tokens
- **Property-Mapping DMS ↔ Frontend-Filter** — die 5 Cascading-Dropdowns im DMS-Modal (Category/Level/Group/Family/Series) sind noch UI-only, weil das Mapping zu den 238 DMS-Properties nicht definiert ist. Volltextsuche im Modal funktioniert vollständig

### Wichtige Werte zum Wiederfinden
- DMS Repository-UUID: `cffcc398-5466-586f-921f-4655e26f70e0` (Source: "Productive")
- Sample-Dokument: `dmsId=P002925864` ("Guntner Manual GVH FR 2023-11", PDF, ~4,5 MB, aktuelle Version `3_2`)
- `npm run probe-dms` zeigt jederzeit den aktuellen Verbindungsstatus

### Nicht angefasste Bereiche
- Die statischen UI-Komponenten (admin-rag-settings.html, learn-mode.js, Wizard-Schritte in main.js) sind funktional und bleiben unverändert
- Die hardcoded `DMS_PRODUCTS`-Tabelle (~289 Produkte) in admin-documents.html bleibt als Legacy-Quelle für die Cascading-Filter, bis das Property-Mapping steht
- UI-Screenshots (`01`–`05 *.png`) zeigen die Ziel-Optik — das aktuelle Frontend setzt sie weitgehend um

## Project Goal
Generate HTML pages based on layout files in this project folder. All Form elements need to work and pages are linked among each other. Provide a click dummy to meet full frontend user experience.  

## Instructions for Claude
- Always read layout files in the `/layouts` folder before creating HTML
- Use the frontend-design skill for all HTML/CSS generation
- Generate clean, production-ready HTML with inline or linked CSS
- Match the layout structure exactly as defined in the layout files
- Use modern CSS (flexbox/grid), no frameworks unless specified

## Layout Files Location
- Layout files are in: `/layouts`
- Output HTML files to: `/frontend`


## Code Style
- Semantic HTML5
- Mobile-first responsive design
- No jQuery, vanilla JS only
- Images for HMTL in `/frontend/images`


# CLAUDE.md — Güntner Produktkonfigurator

## Project Overview

Build a **Güntner Product Configurator** web application that guides users through the product selection and configuration process across 
**three distinct perspectives (Ebenen)**. 
Every feature of the configurator must simultaneously reflect all three perspectives and keep them in sync.

---

## The Three Perspectives (Die 3 Ebenen)

All configurator features, UI states, filters, result views, and export outputs must be aware of and reflect all three perspectives at all times.

### Ebene 1 — Technischer Weg (Device Manufacturer View)
**Who:** Güntner as the device manufacturer — engineering, product management, production.
**Focus:** Technical product classification, component selection, performance parameters, manufacturing variants, part numbers, engineering data.

Key dimensions:
- Product family & series (e.g. GFH, GHF, SGHE, VHF, …)
- Technical parameters: airflow (m³/h), capacity (kW), fin spacing, coil geometry, fan diameter, refrigerant type
- Material variants: casing, fins (aluminium, copper, epoxy-coated, …)
- Electrical specs: voltage, phases, motor type (EC/AC), IP class
- Manufacturing codes & option codes
- Engineering documentation: dimensional drawings, wiring diagrams, performance curves

### Ebene 2 — Anwendersicht (User / Application View)
**Who:** Plant engineers (Anlagenbauer), planning offices (Planungsbüro), refrigeration contractors.
**Focus:** Application purpose, system integration, required cooling capacity, ambient conditions, energy efficiency, compliance.

Key dimensions:
- **Kühlzweck (Cooling purpose):**
  - Cold storage (Kühlraum): fruit & vegetables, meat & fish, dairy, beverages, flowers
  - Deep freeze (Tiefkühl): blast freezing, long-term storage
  - Industrial process cooling
  - Air conditioning & comfort cooling
  - Data center cooling
  - Condensing / heat rejection (Verflüssiger)
- System parameters: evaporating temperature (t₀), condensing temperature (t_c), superheat, refrigerant selection
- Energy labels, efficiency ratings (EER, COP)
- Defrost method: electric, hot gas, air defrost
- Control & regulation: standalone, BMS integration, Güntner Controller

### Ebene 3 — Standort / Einsatzort (Location / Installation View)
**Who:** Project planners, site engineers, building owners.
**Focus:** Installation environment, climate zone, building integration, logistics, local regulations.

Key dimensions:
- **Standort-Typ:**
  - Indoor (inside cold room, machine room, processing area)
  - Outdoor (roof, facade, open yard)
  - Aggressive environment (coastal/saline, ammonia, industrial gases)
- Climatic zone: ambient temperature range (min/max), humidity, altitude above sea level
- Space constraints: unit dimensions, weight, service clearances, acoustic limits (dB(A))
- Installation position: ceiling-suspended, floor-standing, wall-mounted, v-shape, hybrid
- Access & logistics: transport route dimensions, crane availability, assembly on site
- Local regulations: F-gas regulation, ATEX zones, local noise ordinances, food safety standards

---

## Application Architecture

### Core Navigation

The application has a **primary mode switcher** always visible in the header:

```
[ Technischer Weg ]  [ Anwendersicht ]  [ Standort & Einsatz ]
```

Switching modes does NOT reset the configurator state — it recontextualises the same underlying data through a different lens. Parameters entered in one view are automatically reflected in the others.

### Configuration Flow

The configurator operates in **three phases**:

1. **Start / Profil wählen** — Select entry point (which perspective to start from)
2. **Konfigurieren** — Step-by-step parameter input (adapts to active perspective)
3. **Ergebnisse & Auswahl** — Product results, comparison, documentation

Each phase must render its content according to the active perspective while sharing the same underlying configuration state.

---

## Feature Specifications

### 1. Entry Point / Profile Selection (`/start`)

**Feature:** Perspective Selector Card Grid

Three large cards on the home screen, each describing one perspective with:
- Icon / illustration
- Target user persona description
- Typical questions this path answers
- "Start" CTA button

All three paths lead to the same configurator engine — only the presentation layer differs.

**Perspective-aware content:**
| | Technischer Weg | Anwendersicht | Standort |
|---|---|---|---|
| Card title | "Ich bin Gerätehersteller / Produktingenieur" | "Ich plane eine Kälteanlage" | "Ich definiere den Aufstellort" |
| Entry question | "Welche Baureihe / welches Produkt suche ich?" | "Welchen Kühlzweck soll die Anlage erfüllen?" | "Wo wird das Gerät installiert?" |

---

### 2. Step-by-Step Configurator (`/configure`)

**Feature:** Adaptive Wizard with Perspective-Aware Steps

The wizard steps reorder and relabel themselves based on the active perspective. All steps exist in all perspectives — only their sequence, labels, and input emphasis change.

#### Step Map

| Step | Technischer Weg | Anwendersicht | Standort |
|---|---|---|---|
| 1 | Produktfamilie wählen | Kühlzweck wählen | Standort-Typ wählen |
| 2 | Leistungsparameter (kW, m³/h) | Lagertemperatur & t₀ | Klimazone & Umgebungstemperatur |
| 3 | Kältemittel & Kreislauf | Kältemittel & Effizienz | Aufstellbedingungen (Innen/Außen) |
| 4 | Materialvarianten | Abtauart & Regelung | Platzbedarf & Einbaulage |
| 5 | Elektrische Ausführung | Elektrische Anschlüsse | Schallschutz & Normen |
| 6 | Optionen & Sonderausführungen | Zubehör & Integration | Logistik & Montage |
| 7 | Ergebnis: Typenbezeichnung | Ergebnis: Empfohlene Geräte | Ergebnis: Geeignete Ausführungen |

**Implementation requirements:**
- Each step renders a `StepPanel` component with perspective-appropriate field labels, helper texts, and input types
- A persistent **"Andere Perspektive"** sidebar panel shows the equivalent parameters in the other two perspectives in real-time (collapsed by default, expandable)
- Required fields differ per perspective — a field mandatory in Technischer Weg may be optional in Anwendersicht
- Input validation messages must be phrased in perspective-appropriate language

---

### 3. Parameter Input Components

**Feature:** Perspective-Aware Input Fields

Every parameter input field must carry metadata for all three perspectives:

```typescript
interface ConfigParameter {
  id: string;
  value: any;
  unit: string;
  
  // Per-perspective metadata
  perspectives: {
    technical: {
      label: string;          // "Nennkälteleistung"
      hint: string;           // "Nach EN 327"
      priority: 'required' | 'optional' | 'hidden';
    };
    application: {
      label: string;          // "Benötigte Kühlleistung"
      hint: string;           // "Für den definierten Kühlraum"
      priority: 'required' | 'optional' | 'hidden';
    };
    location: {
      label: string;          // "Verfügbare Kälteleistung am Aufstellort"
      hint: string;           // "Unter Berücksichtigung der Umgebungstemperatur"
      priority: 'required' | 'optional' | 'hidden';
    };
  };
}
```

**Key parameter groups:**

| Parameter | Technical label | Application label | Location label |
|---|---|---|---|
| Cooling capacity | Nennkälteleistung (kW) | Benötigte Kühlleistung | Verfügbare Leistung am Standort |
| Airflow | Nennluftvolumenstrom (m³/h) | Luftumlaufzahl | Raumlüftung / Belüftungsrate |
| Evap. temp. | Verdampfungstemperatur t₀ | Raumtemperatur - Spreizung | Auslegungstemperatur Standort |
| Refrigerant | Kältemittel (R-Nummer) | Kältemittel (F-Gas Klasse) | Zugelassene Kältemittel (lokal) |
| Noise level | Schallleistungspegel LWA | Geräuschentwicklung (dB(A)) | Zulässiger Schallpegel (Grenzwert) |

---

### 4. Refrigerant Selection Module

**Feature:** Tri-Perspective Refrigerant Advisor

**Technischer Weg:** Shows full R-number list with engineering properties (GWP, boiling point, pressure levels, oil compatibility, material compatibility).

**Anwendersicht:** Groups refrigerants by application suitability:
- "Für Kühlräume +5°C bis -5°C" → R448A, R449A, R452A, R134a
- "Für Tiefkühlräume -18°C bis -40°C" → R404A (legacy), R448A, R452A, R744 (CO₂)
- "Natürliche Kältemittel" → R744 (CO₂), R717 (NH₃), R290 (Propan)
- F-gas regulation phase-out timeline shown prominently

**Standort:** Filters by regulatory constraints:
- ATEX zone compatibility (R290 restrictions)
- Local F-gas regulations (EU vs. non-EU)
- Maximum charge weight limits per installation type
- Proximity to food (NH₃ restrictions in food retail)

---

### 5. Product Results View (`/results`)

**Feature:** Perspective-Switched Results Display

The same product result set is displayed differently per perspective:

**Technischer Weg — Results Table:**
- Columns: Type designation | Series | Capacity (kW) | Airflow (m³/h) | Fan Ø | Weight | Option codes
- Sortable by all technical parameters
- "Download Typenblatt" button per row
- Comparison checkbox (max 4 products)

**Anwendersicht — Results Cards:**
- Large cards with: Product image | "Empfohlen für: [Kühlzweck]" badge | Key application benefits | Efficiency class | Defrost method | Estimated energy consumption per year
- "Warum dieses Gerät?" expandable explanation tied to the user's input parameters
- Accessories recommendation panel: drain pan heaters, controllers, air baffles

**Standort — Results Grid:**
- Focus on physical fit: dimensional drawing preview | Weight | Installation type | Min. service clearances shown as diagram
- "Passt in meinen Aufstellort?" checker: user enters room dimensions → system confirms fit with visual
- Noise level check: shows dB(A) vs. user's defined noise limit with traffic-light indicator
- Transport & logistics flag: highlights units requiring crane or special access

---

### 6. Cross-Perspective Sync Panel

**Feature:** Live Parameter Mirror

A collapsible panel (right sidebar on desktop, bottom sheet on mobile) always visible during configuration showing:

```
┌─────────────────────────────────────────┐
│  Ihre Konfiguration aus allen Sichten   │
├─────────────────────────────────────────┤
│ ⚙ Technisch         Anwendersicht 🏭    │
│ t₀: -10°C           Tiefkühlraum -18°C │
│ 25 kW               Leistung: 25 kW    │
│ R448A               F-Gas Klasse 1     │
├─────────────────────────────────────────┤
│ 📍 Standort                             │
│ Innen / Deckenabhängung                 │
│ Umgebung: +25°C                        │
│ Schall: ≤ 55 dB(A)                     │
└─────────────────────────────────────────┘
```

Clicking any parameter in the mirror panel jumps to the relevant step in any perspective.

---

### 7. Application-Based Quick Start (Kühlzweck Wizard)

**Feature:** Cooling Purpose Fast Lane (Anwendersicht shortcut)

From the Anwendersicht entry, offer a visual quick-start grid:

| Icon | Kühlzweck | Typical t₀ | Pre-fills |
|---|---|---|---|
| 🥦 | Obst & Gemüse | 0°C | High humidity, air defrost |
| 🥩 | Fleisch & Fisch | -2°C | Stainless fins, no air defrost |
| 🧊 | Tiefkühl | -35°C | Hot gas defrost, EC fans |
| 🍺 | Getränke & Molkerei | +2°C | Standard, low noise |
| 💊 | Pharma / Labor | +5°C | Redundancy, alarms, validation |
| 🏭 | Industrieprozess | Custom | Custom t₀, high capacity |
| ❄ | Verflüssiger | +35°C | Outdoor, high ambient |
| 🌡 | Klimatisierung | +7°C (chiller) | Indoor, low noise |

Selecting a Kühlzweck pre-populates 6–8 parameters across all three perspectives simultaneously.

---

### 8. Location Profile Builder (Standort Ebene)

**Feature:** Installation Environment Questionnaire

A dedicated Standort module with a visual-first approach:

**Step 1 — Installation Type (visual selection):**
```
[  Indoor ceiling  ] [  Indoor floor  ] [  Outdoor roof  ] [  Outdoor ground  ]
```

**Step 2 — Climate Zone Map:**
Interactive map or dropdown: select country/region → auto-fills:
- Summer design temperature (°C)
- Winter minimum temperature (°C)
- Altitude above sea level (m)
- Relevant local regulations pre-loaded

**Step 3 — Environment Aggressiveness:**
```
○ Standard (clean indoor)
○ Mäßig aggressiv (leichte Feuchtigkeit, Staub)
○ Aggressiv (Küstenstandort, Salzluft, chlorhaltige Atmosphäre)
○ Sehr aggressiv (NH₃-Atmosphäre, Industriegase, ATEX)
```
→ Filters material variants, triggers coating recommendations

**Step 4 — Acoustic Constraints:**
- Input: max. allowed sound pressure level at X meters distance
- System back-calculates required LWA and filters accordingly
- Shows noise map preview (estimated noise contour)

**Step 5 — Space & Logistics:**
- Room dimension inputs (L × W × H)
- Access door dimensions
- Max. unit weight (crane availability toggle)
- Required service clearances (auto-checked against selected product dimensions)

---

### 9. Comparison View

**Feature:** Perspective-Aware Product Comparison

Up to 4 products can be compared. The comparison table adapts its rows based on the active perspective:

**Technischer Weg rows:** Part number, series, capacity, airflow, fan Ø × qty, motor type, weight, IP class, connections

**Anwendersicht rows:** Recommended cooling purpose, defrost method, energy label, accessories included, typical annual energy consumption, controller compatibility, warranty

**Standort rows:** Dimensions (L×W×H), weight, installation type compatibility, outdoor rating, noise level, fin material, coating options, max ambient temperature

A **"Gesamtübersicht"** toggle shows all rows from all three perspectives combined.

---

### 10. Documentation & Export

**Feature:** Perspective-Tailored Output Documents

Three export types, one per perspective:

**Technischer Weg → Technisches Datenblatt (PDF)**
- Full engineering data sheet with performance curves
- Option codes list
- Wiring diagram reference
- Dimensional drawing (PDF/DXF link)
- Certifications & compliance marks

**Anwendersicht → Planungsunterlage (PDF)**
- Application summary: Kühlzweck, capacity, refrigerant
- Energy efficiency analysis
- Accessories recommendation
- Installation & commissioning checklist
- Spare parts recommendation
- BIM object download link (IFC/RVT)

**Standort → Aufstellplanung (PDF)**
- Dimensional layout drawing
- Service clearance diagram
- Weight & load data for structural engineer
- Noise assessment summary
- Required utilities (power, drainage, pipe sizes)
- Logistics checklist (access, crane, transport)

All three documents can be generated simultaneously as a **"Komplettpaket"** ZIP download.

---

### 11. Saved Configurations & Projects

**Feature:** Project-Based Configuration Management

Users can save configurations as a **"Projekt"** containing:
- Project name & reference number
- Multiple configured units (with quantities)
- All three perspective views saved per unit
- Revision history

A project can be shared via link. The recipient opens it in their preferred perspective.

---

### 12. Guided Recommendation Engine

**Feature:** AI-Assisted Parameter Validation (Cross-Perspective Consistency Check)

Before showing results, the system runs a consistency check across all three perspectives:

**Example validations:**
- "t₀ = -35°C gewählt, aber Kühlzweck = Obst & Gemüse (typisch +0°C) — Bitte prüfen."
- "Aufstellort Außen + Umgebungstemperatur +45°C + gewähltes Kältemittel R404A → Verflüssigungsdruck kritisch. Empfehlung: R448A oder R452A."
- "Schallgrenzwert 45 dB(A) nicht erreichbar mit Standardausführung. Empfehlung: EC-Ventilatoren + Schallhaube."
- "Lagerprodukt Fisch + Aluminiumlamellen → Empfehlung: epoxidbeschichtete Lamellen oder Edelstahl."

Warnings shown as inline hints with "Mehr erfahren" expandable explanation and automatic suggestion of corrective parameter.

---

## Technical Implementation

### Tech Stack

```
Framework:     React 18 + TypeScript
Routing:       React Router v6
State:         Zustand (global config store) + React Query (product data)
UI Components: Custom design system (no off-the-shelf UI library)
Styling:       CSS Modules + CSS custom properties
Charts:        Recharts (performance curves)
PDF Export:    react-pdf / @react-pdf/renderer
i18n:          react-i18next (DE / EN / FR as primary languages)
Build:         Vite
```

### State Architecture

```typescript
// Core configuration store — perspective-agnostic
interface ConfigurationState {
  // Active perspective (UI layer only)
  activePerspective: 'technical' | 'application' | 'location';
  
  // Shared parameters (same data, rendered differently per perspective)
  parameters: {
    coolingCapacity: number | null;       // kW
    airflow: number | null;               // m³/h
    evaporatingTemp: number | null;       // °C
    condensingTemp: number | null;        // °C
    refrigerant: RefrigerantCode | null;
    defrostMethod: DefrostType | null;
    installationType: InstallationType | null;
    ambientTempMax: number | null;        // °C
    ambientTempMin: number | null;        // °C
    altitude: number | null;             // m above sea level
    noiseLimitDBA: number | null;
    roomDimensions: Dimensions | null;
    environmentClass: EnvironmentClass;
    coolingPurpose: CoolingPurpose | null;
    refrigerantRegion: RegulationRegion;
  };
  
  // Completion tracking per perspective
  perspectiveProgress: {
    technical: StepCompletion[];
    application: StepCompletion[];
    location: StepCompletion[];
  };
  
  // Cross-perspective validation results
  validationWarnings: ValidationWarning[];
  
  // Selected products
  selectedProducts: ProductSelection[];
}
```

### Perspective Rendering Pattern

```typescript
// Every configurable feature uses a perspective-aware renderer
const useActiveLabels = (parameterId: string) => {
  const perspective = useConfigStore(s => s.activePerspective);
  const param = PARAMETER_DEFINITIONS[parameterId];
  return param.perspectives[perspective];
};

// Component usage
const CoolingCapacityInput = () => {
  const labels = useActiveLabels('coolingCapacity');
  return (
    <ParameterInput
      label={labels.label}
      hint={labels.hint}
      required={labels.priority === 'required'}
    />
  );
};
```

### Product Data Model

```typescript
interface GuentnerProduct {
  id: string;
  typeDesignation: string;          // e.g. "GFH 031B/1-S"
  series: string;                   // e.g. "GFH"
  
  technical: {
    nominalCapacity: number;        // kW at EN conditions
    nominalAirflow: number;         // m³/h
    fanDiameter: number;            // mm
    fanCount: number;
    motorType: 'EC' | 'AC';
    refrigerants: RefrigerantCode[];
    dimensionsLWH: [number, number, number]; // mm
    weight: number;                 // kg
    ipClass: string;
    noiseLevelLWA: number;          // dB(A)
    optionCodes: OptionCode[];
  };
  
  application: {
    suitablePurposes: CoolingPurpose[];
    evapTempRange: [number, number]; // °C min/max
    defrostMethods: DefrostType[];
    energyLabel: string;
    controllerCompatibility: string[];
  };
  
  location: {
    installationTypes: InstallationType[];
    maxAmbientTemp: number;         // °C
    minAmbientTemp: number;         // °C
    environmentClasses: EnvironmentClass[];
    outdoorRated: boolean;
    finMaterials: FinMaterial[];
    coatingOptions: CoatingOption[];
  };
}
```

---

## Design System

### Visual Identity

- Güntner brand colors: primary blue `#003865`, accent `#0078BE`, warm grey `#F5F4F0`
- The three perspectives each have a distinct accent color for UI differentiation:
  - Technischer Weg: `#003865` (Güntner Navy)
  - Anwendersicht: `#0078BE` (Process Blue)
  - Standort: `#5B8C5A` (Site Green)
- Typography: `DM Sans` (UI) + `DM Mono` (technical values/codes)

### Perspective Indicator

A persistent colored top bar or left border indicates the active perspective. When the user switches perspectives, a smooth color transition animation signals the mode change. The perspective label is always visible in the header.

### Responsive Layout

- Desktop (≥1280px): Three-column layout — wizard steps left, parameter form center, sync panel right
- Tablet (768–1279px): Two-column — steps + form, sync panel as collapsible drawer
- Mobile (<768px): Single column, bottom navigation for perspective switching

---

## Content & Copy Guidelines

All UI copy must be written for the target persona of the active perspective:

| Tone | Technischer Weg | Anwendersicht | Standort |
|---|---|---|---|
| Language register | Technical/precise | Practical/planning | Regulatory/spatial |
| Units preference | SI units, engineering notation | Practical rounded values | mm/m, kg, dB(A) |
| Error messages | "Parameter außerhalb EN 327 Auslegungsgrenzen" | "Diese Kombination ist für Ihren Kühlzweck ungewöhnlich" | "Das Gerät überschreitet den zulässigen Schallgrenzwert am Aufstellort" |
| Help texts | Standards references (EN, ISO) | Application examples, best practice | Norm references (VDI, local building codes) |

---

## Development Priorities

### Phase 1 — MVP
- [ ] Three-perspective navigation switcher
- [ ] Core parameter store (shared state, perspective rendering)
- [ ] Kühlzweck quick-start selector (Anwendersicht)
- [ ] Basic step wizard for all three perspectives
- [ ] Product results table/card/grid (perspective-switched)
- [ ] Cross-perspective sync panel
- [ ] Basic PDF export (technical datasheet)

### Phase 2 — Enhanced
- [ ] Refrigerant advisor module
- [ ] Location profile builder with climate zone map
- [ ] Consistency validation engine (cross-perspective warnings)
- [ ] Product comparison view (all three perspectives)
- [ ] Full documentation export (all three PDF types)
- [ ] Saved projects / configuration management

### Phase 3 — Advanced
- [ ] BIM object export (IFC)
- [ ] Performance curve viewer
- [ ] Acoustic noise map visualization
- [ ] Space fit checker (room dimension validator)
- [ ] Multi-language support (DE/EN/FR)
- [ ] API integration with Güntner product database

---

## Key Design Decisions & Rationale

1. **Shared state, different lens** — The configurator never duplicates data. One configuration object is rendered through three different presentation layers. This prevents inconsistency and ensures that a planner switching from Anwendersicht to Standort sees their work immediately reflected.

2. **All paths lead to the same product** — The three perspectives are entry points and filters, not separate tools. A user starting from Standort (outdoor, coastal, +45°C) and one starting from Anwendersicht (blast freezing, -35°C) can arrive at the same product — and compare notes by switching perspectives.

3. **Kühlzweck as primary accelerator** — In the real world, the cooling purpose is known first. Pre-populating 6–8 parameters from a single Kühlzweck selection dramatically reduces configuration time and error rate for the Anwendersicht persona.

4. **Soft validation, not hard blocking** — Cross-perspective warnings are advisory. Expert users (Technischer Weg) may intentionally set parameters outside typical ranges. The system warns but does not block.

5. **Perspective metadata on every parameter** — By embedding all three perspective labels/hints/priorities inside each parameter definition, the UI remains a thin rendering layer. Adding a new perspective in the future is a data change, not a structural refactor.

 ## Autonomy
  - Don't ask before reading, editing, or creating files in this repo.
  - Don't ask before running npm/npx/node, git read commands, or local dev
  servers.
  - Confirm only before: git push, deleting files, schema migrations, anything
  irreversible.
  - Default to acting; report briefly what you did instead of asking permission.