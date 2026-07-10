# Planning — myGPS Wizard Integration

> Status: **Entscheidungen geklärt — bereit zur Implementierung**
> Erstellt: 2026-04-27 · Aktualisiert: 2026-04-27
>
> **myGPS = my Güntner Product Specificator**

---

## 1. Zusammenfassung der Aufgabe (so wie ich sie verstehe)

1. Auf `frontend/index.html` (myGPC-Seite) ein **viertes Akkordeon** mit der Headline **„myGPS"** ergänzen — analog zu den drei bestehenden Akkordeons („By Category", „By Application", „Bare Coils").
2. Hinter dem Akkordeon einen eigenen **Step-by-Step-Wizard** aufbauen — analog zu den zwei bestehenden Wizards:
   - **myGPC** (`thermodynamics.html` → `unit-selection.html` → `results.html` → `datasheet.html`)
   - **Bare Coils** (`coil-thermodynamics.html` → `coil-geometry.html` → `coil-result-grid.html` → `coil-datasheet.html`)
3. Die **Felder/Inhalte** der neuen Wizard-Schritte stammen aus den 7 Layout-PNGs in `frontend/images/mygps/`. Das **visuelle Design** dieser Layouts ist veraltet und soll **nicht übernommen** werden — stattdessen wird das **bestehende myGPC/Bare-Coils-CI** (gleiches Header, Step-Wizard, Action-Bar, Form-Stil, Buttons, Accordion, Footer, Chatbot) auf die Inhalte adaptiert.
4. Vor dem Coden: **kurze Zusammenfassung + offene Fragen** klären — kein Implementieren ohne Freigabe.

---

## 2. Was ich aus den 8 Layouts gelesen habe

| # | Layout-Datei | Tab-Label | Funktion |
|---|---|---|---|
| 1 | `1 myGPS-categories.png` | (Einstieg) | Kategoriewahl: 5 Produktkategorien als Bild-Cards — *Evaporative Products, Adiabatic Products, High-Density Products, Dry Products, Air Cooler Products*. Unter jedem Bild Buttons für Unterkategorien (analog zur myGPC-Category-Page). |
| 2 | `2 myGPS-projects.png` | **PROJECT INFO** | Projektdaten: Project Name, Contact Name, City/State/Province, Country (Dropdown). CTAs: „Continue" + „Consider Specific Model" |
| 3 | `3 myGPS-selector-inputs.png` | **SELECTOR INPUTS** | Auslegung: Calculation Mode, Motor Types (EC, Containerized), Design Conditions (Refrigerant, Heat of Rejection [MBH], Condensing Temp [°F], Wet Bulb Temp [°F], Elevation), Restrictions (Number of Units min/max, Capacity Tolerance Range, Rank Equipment By), „Set all units of measure to…" |
| 4 | `4 myGPS-accessories.png` | **OPTIONS/ACCESSORIES** | Quantity & Model, Coil Construction (ASME U Stamp), Inlet Louvers, Fan Motor Electric Supply, Water Level Control, Water Quality Control, Pump Electrical Options, Fan Motor Protection & Control, Unit Electrical Protection (Modbus, Enclosure: FRP/SS) |
| 5 | `5 myGPS-service and price.png` | **SERVICE AND PRICING** | Quantity & Model, Quote remote/in-person start-up + State, Product Discount %. CTA: „Rate Equipment" |
| 6 | `6 myGPS-selector-outputs.png` | **SELECTOR OUTPUT** *(Liste)* | Ergebnis-Tabelle (Modell-Liste mit Heat of Rejection, etc.) + Modelldetail-Bereich mit technischer Zeichnung |
| 7 | `7 anual analysis.png` | **ANNUAL ANALYSIS** | Number of Units + Modell, Location (+ Find Location), ASHRAE Location, Water Price ($/1000 gal), Energy Price ($/kWh), Cycles of Concentration, Load Profile + „Define Load", Capacity, Refrigerant, Minimum Condensing Temperature. CTA: „Run Annual Analysis". Zusätzlich: „Set Currency to…" |
| 8 | `8 myGPS-datasheet.png` | **SELECTOR OUTPUT** *(Detail)* | Vollständiges Datenblatt: Modell-Header, Options/Accessories-Liste mit Preisen, Service-Liste, technische Zeichnung mit Maßen + Gewicht/Air Side/Pump Side/Coil/Sound |

### Beobachtung — zwei sichtbare Tab-Sets in den alten Layouts
- Layout 6 zeigt nur **3 Tabs** (Project Info · Selector Inputs · Selector Output) — *„Consider All Models"*-Pfad.
- Layouts 4, 5, 7, 8 zeigen **6 Tabs** (+ Options/Accessories · Service & Pricing · Annual Analysis) — *„Consider Specific Model"*-Pfad.

→ Wir bauen das **flexibel** als kategorie- und pfadabhängige Step-Konfiguration (siehe 3.5).

---

## 3. Geplanter Aufbau der Implementierung

### 3.1 Neues Akkordeon auf `index.html`
- Neuer Block `.index-accordion` mit Header **„myGPS"** und Subline **„my Güntner Product Specificator"** (gleicher Klassen-Aufbau wie die drei vorhandenen Akkordeons → identisches Verhalten und Look-and-Feel).
- **Position 2** — direkt nach „By Category", vor „By Application".
- Inhalt = 5 Kategorie-Cards aus Layout 1 (Foto + Titel), Layout-Vorbild ist die bestehende myGPC-Category-Page (`cat-card`-Komponente).
- **Klick-Verhalten** (gem. neuen Screenshots):
  - Click auf eine Card mit Unterkategorien → **Modal öffnet sich** mit Titel = Kategoriename, Icon und einer Liste blauer Buttons („Please choose between" + ein Button pro Unterkategorie).
  - Click auf einen Modal-Button → in den Wizard (`mygps-projects.html?cat=…&sub=…`).
  - Card ohne Unterkategorie (Air Cooler / Data Center) → direkter Sprung in den Wizard, kein Modal.

### 3.1.1 Kategorie- und Unterkategorie-Map (aus Screenshots 090541–090603)

| Kategorie (Card-Titel) | Slug | Unterkategorien (Modal-Buttons) | Sub-Slugs |
|---|---|---|---|
| Evaporative Products | `evaporative` | Evaporative Condenser · Evaporative Fluid Coolers | `condenser`, `fluid-cooler` |
| Adiabatic Products | `adiabatic` | Adiabatic Condensers · Adiabatic Fluid Coolers · Adiabatic CO2 Gas Coolers | `condenser`, `fluid-cooler`, `co2-gas-cooler` |
| High-Density Products | `high-density` | Adiabatic Fluid Coolers · Adiabatic Condensers | `fluid-cooler`, `condenser` |
| Dry Products | `dry` | DryCondensers | `condenser` |
| Air Cooler Products *(= Data Center)* | `air-cooler` | — keine Unterkategorie, direkter Wizard-Einstieg — | (none) |

> Anmerkung: Das Modal für **High-Density Products** verwendet laut Screenshot dieselben Button-Labels wie Adiabatic („Adiabatic Fluid Coolers" / „Adiabatic Condensers"). Ich nehme die Labels 1:1 aus dem Screenshot; falls das ein Copy-Fehler ist, bitte korrigieren.

### 3.2 Neue Wizard-Seiten (8 Steps — vollständiger „Specific Model"-Pfad)
| Schritt | Datei | Step-Wizard-Label | Quelle |
|---|---|---|---|
| 1 | (Akkordeon auf `index.html`) | Category | Layout 1 |
| 2 | `mygps-projects.html`        | Project Info | Layout 2 |
| 3 | `mygps-inputs.html`          | Selector Inputs | Layout 3 |
| 4 | `mygps-accessories.html`     | Options & Accessories | Layout 4 |
| 5 | `mygps-service.html`         | Service & Pricing | Layout 5 |
| 6 | `mygps-output.html`          | Selector Output | Layout 6 |
| 7 | `mygps-annual.html`          | Annual Analysis | Layout 7 |
| 8 | `mygps-datasheet.html`       | Datasheet | Layout 8 |

Alle Seiten teilen die existierenden Komponenten:
- `<header class="site-header">` — unverändert übernommen
- `<div class="step-wizard">` — neu konfiguriert mit den myGPS-Schritten
- `<div class="action-bar">` — Back / Reset / Next-Buttons im bestehenden Stil
- `<form>` mit `.form-group`, `.thermo-card`, `.select-integrated`-Pattern aus den vorhandenen Wizard-Seiten
- `<footer class="site-footer">` + Chatbot-Widget — unverändert übernommen

### 3.3 Design-Adaption (CI/CD-Mapping)
Das alte Layout der 7 PNGs nicht visuell übernehmen, sondern nur die Inhalte/Felder. Konkret:
- Tab-Reiter im alten Layout → ersetzt durch die bestehende `step-wizard`-Komponente oben auf der Seite.
- Graue Form-Hintergründe und uneinheitliche Schriften → ersetzt durch bestehendes Card-Layout mit weißen Cards und konsistenten Form-Komponenten.
- Bunte Buttons (blau gefüllt / grau / kursiv) → ersetzt durch `.btn .btn-primary`, `.btn .btn-outline`, `.btn .btn-text` aus der bestehenden Bibliothek.
- Eingabefelder und Selects → existierende Klassen (`.select-integrated`, `.form-group label`, etc.).
- Checkboxen und Radios → bestehende Stile.

### 3.4 Klick-Dummy-Verlinkung
- Vor-/Zurück-Navigation zwischen den Seiten exakt wie bei den anderen Wizards.
- Cards auf `index.html` → Step 1 des Wizards.
- Letzter Step → „Save / Generate Datasheet" als Dummy-Button (kein echtes Backend).

---

## 4. Was ich **nicht** anfasse (aktueller Plan)
- Kein React/Build-Setup (es bleibt bei Vanilla HTML/CSS/JS, wie der Rest des `frontend/`-Ordners).
- Keine Änderungen an bestehenden myGPC- oder Bare-Coils-Seiten.
- Keine neuen Bilder (außer ggf. fünf Kategorie-Bilder aus Layout 1, falls passende noch nicht da sind — siehe offene Frage).
- Kein RAG-, Build- oder Server-Code.

---

## 5. Geklärte Entscheidungen

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Pfad-Verzweigung (All Models vs Specific Model) | **Offen lassen — kategoriebasierte Flows.** Pro Kategorie/Unterkategorie kann sich die Step-Liste unterscheiden. MVP: vollständiger „Specific Model"-Pfad mit allen 8 Schritten für *Evaporative Products*. Architektur muss erlauben, pro Kategorie Steps hinzuzufügen, zu entfernen oder umzusortieren. |
| 2 | Anzahl der Steps | **8 Steps** (inkl. Annual Analysis). Datei-Reihenfolge im `mygps/`-Ordner ist führend. |
| 3 | Bilder für Kategorie-Cards | Bilder aus Layout 1 verwenden. **Pro Card unter dem Bild Buttons für Unterkategorien** (Vorbild: bestehende myGPC-Category-Cards mit z. B. „Condenser / Subcooler"). |
| 4 | Sprache | **Englisch** — wie der Rest der App. |
| 5 | Maßeinheiten | **Variabel über User-Profile-Settings.** Default: **US** (MBH, °F, ft, $). Implementierung: globaler Unit-System-Toggle (z. B. `data-unit-system="us"` auf `<html>` oder localStorage), Selects neben Zahlenfeldern lesen daraus. „Set all units of measure to…" und „Set Currency to…" als Page-Level-Shortcut. |
| 6 | Annual Analysis | **Voll integriert** (Layout 7 bereitgestellt). |
| 7 | Akkordeon-Position | **Position 2** — zwischen „By Category" und „By Application". |
| 8 | Bedeutung „myGPS" | **my Güntner Product Specificator** — als Subline unter der Akkordeon-Headline und im `<title>` der Wizard-Seiten. |

---

## 6. Architektur für kategorie-spezifische Flows

Damit pro Kategorie/Unterkategorie unterschiedliche Schritte möglich sind, ohne die Wizard-Seiten zu duplizieren:

### 6.1 Step-Konfiguration als JS-Datenstruktur
Eine zentrale Datei `frontend/mygps-flows.js` definiert pro Kategorie+Unterkategorie das Step-Set. Initial bekommen alle den vollständigen 7-Step-Pfad (Layouts 2–8); Abweichungen kommen später dazu, sobald geklärt.

```js
// frontend/mygps-flows.js — Vorschlag
const FULL_STEPS = ['projects', 'inputs', 'accessories', 'service', 'output', 'annual', 'datasheet'];

const MYGPS_FLOWS = {
  'evaporative': {
    label: 'Evaporative Products',
    image: 'images/mygps/cat-evaporative.jpg',  // crop aus Layout 1
    subcategories: {
      'condenser':    { label: 'Evaporative Condenser',     steps: FULL_STEPS },
      'fluid-cooler': { label: 'Evaporative Fluid Coolers', steps: FULL_STEPS }
    }
  },
  'adiabatic': {
    label: 'Adiabatic Products',
    image: 'images/mygps/cat-adiabatic.jpg',
    subcategories: {
      'condenser':       { label: 'Adiabatic Condensers',       steps: FULL_STEPS },
      'fluid-cooler':    { label: 'Adiabatic Fluid Coolers',    steps: FULL_STEPS },
      'co2-gas-cooler':  { label: 'Adiabatic CO2 Gas Coolers',  steps: FULL_STEPS }
    }
  },
  'high-density': {
    label: 'High-Density Products',
    image: 'images/mygps/cat-high-density.jpg',
    subcategories: {
      'fluid-cooler': { label: 'Adiabatic Fluid Coolers', steps: FULL_STEPS },
      'condenser':    { label: 'Adiabatic Condensers',    steps: FULL_STEPS }
    }
  },
  'dry': {
    label: 'Dry Products',
    image: 'images/mygps/cat-dry.jpg',
    subcategories: {
      'condenser': { label: 'DryCondensers', steps: FULL_STEPS }
    }
  },
  'air-cooler': {
    label: 'Air Cooler Products',  // Data Center
    image: 'images/mygps/cat-air-cooler.jpg',
    subcategories: null,  // direkt in den Wizard, kein Modal
    steps: FULL_STEPS
  }
};
```

### 6.2 Laufzeit-Verhalten
- Beim Klick auf eine Card auf `index.html` wird `?cat=evaporative&sub=condenser` mitgegeben.
- Jede Wizard-Seite liest die Query-Params, schlägt das Step-Set in `MYGPS_FLOWS` nach und rendert den Step-Wizard oben dynamisch (Steps anzeigen/ausblenden, Active-State setzen, Next-Link auf den nächsten Step im Set zeigen).
- Felder, die nur für bestimmte Unterkategorien relevant sind, bekommen `data-show-for="condenser fluid-cooler"` und werden via kleiner Visibility-Logik ein-/ausgeblendet.

### 6.3 MVP-Scope
- Vollständiger Flow nur für **Evaporative Products → Condenser** (alle 8 Steps, alle Felder).
- Die anderen 4 Kategorien bekommen funktionierende Cards/Buttons; ihr Step-Set kann initial identisch sein und später angepasst werden.

---

## 7. Maßeinheiten-System (variabel)

- Globaler State: `localStorage['mygps-unit-system']` mit Werten `'us'` (Default) oder `'si'`.
- Pro Eingabefeld: ein zugeordneter Einheiten-Select (`<select class="unit-select" data-quantity="capacity">`), dessen Optionen je nach Quantity-Typ generiert werden:
  - capacity: MBH, kW, tons
  - temperature: °F, °C
  - length: ft, m
  - currency-rate: $/1000 gal, $/m³
  - energy: $/kWh
- „Set all units of measure to…" auf der Inputs-Seite: setzt alle Unit-Selects einer Seite konsistent auf US oder SI.
- Später: User-Profile-Settings können Default überschreiben.

---

## 8. Nächste Schritte (Implementierungsreihenfolge)
1. **Akkordeon** auf `index.html` an Position 2 ergänzen — 5 Kategorie-Cards mit Bildern aus Layout 1 und Unterkategorie-Buttons.
2. **Flow-Konfiguration** `frontend/mygps-flows.js` mit der Step-Map aller 5 Kategorien.
3. **Step-Wizard-Renderer** als kleines JS-Snippet (liest Query-Params, baut die `.step-wizard`-Markup dynamisch).
4. **Skelett** der 7 neuen Wizard-HTML-Seiten anlegen (`mygps-projects/inputs/accessories/service/output/annual/datasheet.html`) — Header, dynamischer Step-Wizard, Action-Bar, Footer, Chatbot.
5. **Form-Inhalte** Step-für-Step aus den Layouts 2–8 ins bestehende CI/CD übersetzen (Cards, `.form-group`, `.select-integrated`, `.btn`).
6. **Unit-System-Toggle** + globaler localStorage-Read auf allen Seiten mit Eingaben.
7. **Klick-Dummy-Verlinkung** End-to-End durchgehen, Smoke-Test im Browser.
