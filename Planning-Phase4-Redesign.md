# Planning — Phase 4: myGPC Redesign Sprint (Vanilla-Wizard)

> Status: **Sprint-Plan — bereit zur Umsetzung**
> Erstellt: 2026-07-01
> Bezug: Vier neue Layouts vom 2026-07-01 in `/layouts/` + ein Datasheet-Layout (nachgereicht 15:01)
>
> Grenzt sich ab zu: `Planning-Phase3.md` (Nuxt-Migration des **myGPS**-Wizards). Diese Phase betrifft ausschließlich den **myGPC**-Vanilla-Wizard, der laut G1 aus `~/.claude/projects/…/memory/project_phase3_decisions.md` als produktives Vanilla-System weiterläuft, bis Nuxt-Pendants live sind. Redesigns an HTML/CSS sind vom Freeze **nicht** betroffen — der Freeze bezog sich auf die `mygpc-*.js`-Wiring-Layer.

---

## 0. Ausgangslage

Fünf neue Layouts (2026-07-01) definieren den Ziel-Look der myGPC-Wizard-Pages:

| Layout | Datei | Zielt auf |
|---|---|---|
| Category | `myGPC - Category - Internal user - Desktop (Default).png` | `frontend/index.html` |
| Thermodynamics (Evaporator DX) | `myGPC - Thermodynamics - Evaporator [DX} - Internal user - Desktop (Default).png` | `frontend/thermodynamics.html` |
| Unit Selection | `myGPC - Unit selection - Internal user - Desktop (Default).png` | `frontend/unit-selection.html` |
| Results | `myGPC - Results - Internal user - Desktop (Default).png` | `frontend/results.html` |
| Datasheet | `myGPC - Datasheet - Internal user - Desktop (Default).png` | `frontend/datasheet.html` |

Zusätzlich: **Admin-Toggle-Feature** für vier verbleibende Startseiten-Accordions.

---

## 1. Grundsatz-Entscheidungen (User-Antworten 2026-07-01)

| # | Entscheidung |
|---|---|
| **R1** | Startseite wird **Hybrid**: Category-Grid oben (kein Accordion mehr), darunter 4 klappbare Accordions |
| **R2** | Admin-Toggles landen in der **bestehenden Feature-Flags-Seite** (`admin.html`) als neue Sektion — kein separates Sidebar-Menü |
| **R3** | Persistenz via **localStorage** (Muster: `mygpc_region`), Key-Vorschlag: `mygpc_home_accordions` |
| **R4** | **Vier Accordions** sind toggle-bar: By Category (GPS), By Application, Bare Coils, API & MCP Services |
| **R5** | Sprint-Reihenfolge: **Wizard-Reihenfolge** (Category → Thermodynamics → Unit Selection → Results → Datasheet) |

---

## 2. Startseiten-Umbau: Ist vs. Ziel

### Ist (aktuelles `index.html`)
Fünf Accordions in einem Container:
1. `acc-category` — enthält bereits das 6-Kachel-Category-Grid + Upload-Button
2. `acc-mygps-block` — By Category (GPS), Region-only NLA/EN
3. `acc-application` — By Application
4. `acc-coils` — Bare Coils
5. `acc-api-services-block` — API & MCP Services

### Ziel
- **Category-Grid direkt in `.container`**, kein Accordion-Wrapper mehr
- Darunter: **vier Accordions** in fester Reihenfolge (mygps-block, application, coils, api-services)
- **Jede der vier Accordions** wird nur gerendert, wenn im Admin ihr Toggle aktiv ist
- **Region-Gating** für `acc-mygps-block` (data-region-only="NLA/EN") bleibt zusätzlich zur Toggle-Steuerung erhalten — der Toggle ist eine zweite Sichtbarkeits-Schicht darüber

### Delta-Aufwand
Sehr klein am HTML — der Grid existiert schon. Effektiv: 6 Zeilen Wrapper entfernen (der `.index-accordion open`-Block um den Grid), 8 Zeilen am Ende schließen. Upload-Section rutscht direkt unter den Grid.

---

## 3. Admin-Toggle-Feature — Feature-Flags-Seite

### 3.1 UI-Sektion in `admin.html`
Neue Sektion unter den bestehenden Feature-Cards. Titel: **„Homepage Accordions"**. Vier Toggle-Cards (gleiches Muster wie `.feature-card` für „AI Learn Mode"):

| Card | Accordion-ID | Default |
|---|---|---|
| „By Category (GPS)" | `acc-mygps-block` | ON |
| „By Application" | `acc-application` | ON |
| „Bare Coils" | `acc-coils` | ON |
| „API & MCP Services" | `acc-api-services-block` | ON |

Beschreibung pro Card ~1 Satz („Zeigt/Versteckt den Accordion auf der Startseite"). Toggle-Switch rechts.

### 3.2 Persistenz
localStorage-Key `mygpc_home_accordions` — JSON-Object:
```json
{
  "acc-mygps-block": true,
  "acc-application": true,
  "acc-coils": true,
  "acc-api-services-block": true
}
```
Default (falls Key fehlt): alle vier `true`.

### 3.3 Frontend-Wiring in `index.html`
Neuer kleiner Script-Block analog zum bestehenden Region-Gating (Zeilen 725-744):
```javascript
(function() {
  var defaults = { 'acc-mygps-block': true, 'acc-application': true, 'acc-coils': true, 'acc-api-services-block': true };
  var stored;
  try { stored = JSON.parse(localStorage.getItem('mygpc_home_accordions') || '{}'); } catch(e) { stored = {}; }
  var state = Object.assign({}, defaults, stored);
  Object.keys(state).forEach(function(id) {
    var el = document.getElementById(id);
    if (el && !state[id]) el.hidden = true;
  });
})();
```

Region-Gating und Toggle-Gating sind additiv — beide können ein Element verstecken, sichtbar ist nur wer beide Filter besteht.

---

## 4. Sprint-Etappen (Wizard-Reihenfolge)

Jede Etappe endet mit einem sichtbaren Smoketest (Server starten, Page laden, Optik gegen Layout prüfen), bevor die nächste beginnt.

### Etappe 4A — Category-Page + Admin-Toggle-Feature
**Files:** `frontend/index.html`, `frontend/admin.html`, `frontend/admin.css` (falls neue CSS-Klassen nötig)

Konkrete Änderungen:
1. In `index.html`: `.index-accordion open`-Wrapper um den Grid entfernen (Zeilen ~104-109 + schließende Tags)
2. Upload-Section direkt in `.container` verschieben (Zeilen ~233-239 aus dem Accordion-Body)
3. Impact-Sterne-Toolbar hinzufügen (falls im Layout, war bisher nicht auf der Startseite)
4. Vier verbleibende Accordions bleiben strukturell — nur der Toggle-Wiring-Script wird ergänzt
5. In `admin.html`: neue Sektion „Homepage Accordions" mit 4 Toggle-Cards
6. Toggle-State-Persistence-Script in `admin.html`

**Verifikation:** 
- `admin.html` öffnen, alle 4 Toggles auf OFF → `index.html` öffnen → nur Category-Grid + Upload sichtbar
- Einzelne Toggles wieder ON → entsprechende Accordions kommen zurück
- Region auf NLA/EN wechseln → By Category (GPS) sichtbar (falls Toggle ON), By Category-Grid bleibt sichtbar (kein Region-Gate mehr)

### Etappe 4B — Thermodynamics-Page
**Files:** `frontend/thermodynamics.html`, `frontend/styles.css` (bzw. neue thermodynamics.css)

Konkrete Änderungen basierend auf Layout-Vergleich:
- Progress-Stepper oben (falls nicht schon so): Category ✓ · Thermodynamics ● · Unit Selection ○ · Results ○ · Datasheet ○
- Toolbar-Zeile: `← Back` · `Reset to default` · `Templates` · Impact-Sterne (1.7, zwei grüne + drei graue) · `Next →`
- Zwei-Spalten-Layout: Calculation-Mode-Panel (mit Frost thickness) + Air-Panel (Inlet temp / Rel. humidity / Air pressure + Options-Button)
- Medium-Panel unten links (CO2 R744 etc., Dew point/Mean Radio, Superheating, Cond. temp., Subcooling, Max. pressure drop in coil mit Auto-Checkbox)
- „Inlet state by temperature and pressure"-Checkbox
- „Capacity including humidity factor"-Checkbox mit Info-Icon unten

**Achtung:** thermodynamics.html hat aktuell 93 `data-gpc-*`-Attribute — bei jedem Element sicherstellen, dass der Redesign den Vanilla-JS-Layer nicht bricht (nur CSS/Struktur, keine `data-gpc-*` entfernen).

**Verifikation:** Page laden, Category-Selection persistiert vom Grid, Impact-Sterne aktualisieren sich beim Refrigerant-Wechsel.

### Etappe 4C — Unit-Selection-Page
**Files:** `frontend/unit-selection.html`, ggf. eigene CSS

Konkrete Änderungen:
- Progress-Stepper: Category ✓ · Thermodynamics ✓ · Unit Selection ● · Results ○ · Datasheet ○
- Toolbar: `← Back` · `Reset configuration` · `Configuration templates` · Impact-Sterne · `Next →`
- Zwei-Panel-Layout:
  - Links: Series-Panel mit Tabs „Search Units" / „Calculate Single Unit"; darunter Series-Liste mit 7 Einträgen (Radio-Selection, Farbmarkierung für aktive Series, Availability-Dot vor Bild)
  - Rechts: Unit-Details-Panel als Accordion — Limitations (offen), Options, Defrosting: Air Defrost, Terminal Box (mit Checkbox)
- Limitations-Content: Length/Width/Height inputs, Fin specifications (Fin spacing + Min/Max mm), Sound specifications (Max. sound pressure + dB(A) + in), Tol. of max. sound pressure level, Min. no. of fans, Delivery time (Dropdown mit Info-Icon)

**Achtung:** unit-selection.html hat 11 `data-gpc-*`-Attribute — erhalten.

### Etappe 4D — Results-Page
**Files:** `frontend/results.html`, ggf. eigene CSS

Konkrete Änderungen (basierend auf verkleinertem Layout — Details evtl. beim Umsetzen präzisieren):
- Progress-Stepper mit Unit Selection ✓ + Results ●
- Header-Bar mit „EVAPORATOR [DX]" + Search-Field rechts
- Datentabelle mit Spalten: Unit Name · Capacity · Surface · Tube in · Pressure · Air on · Speed · MPT · MPT (2) · Delivery time · Total Price (EUR)
- Delivery-Time-Chips (grün/gelb/rot je nach Status)
- Zeilenauswahl mit Detail-Panel-Overlay (Zeichnung + Daten)
- „Number of results" Selector unten

### Etappe 4E — Datasheet-Page
**Files:** `frontend/datasheet.html`, ggf. eigene CSS

Konkrete Änderungen (basierend auf nachgeliefertem Layout 15:01):
- Progress-Stepper: alle ✓ bis Datasheet ●
- Kopfzeile: `EVAPORATOR [dx]` mit Icon
- Unit-Bezeichnung: `GACC CX 040-2/2 WN/DJA4A.UNNN`
- Zwei Warnhinweise (Attention) am Anfang
- **Zwei-Spalten-Layout:**
  - Links: Datenblatt-Content
    - Capacities-Tabelle: Capacity/Surface area/Static heat/Air in/Air out/Air pressure UND Refrigerant/Evaporation temp/Bubble temp/Cond. temp/Subcooling/Superheating/Frost
    - Total air pressure production · Energy efficiency class · SP-Value
    - Casing/Weight/Fin details (Aluminum, Steel, Copper, Aluminium)
    - Dimensions (Length/Width/Height/Air flow)
    - Product code · List price incl. VAT · Delivery time
    - Long text „Our general terms of sales and delivery apply"
    - Zeichnung (4-Panel Blueprint)
    - Product photo
    - Impact Rating (1.7, drei grüne Sterne)
    - „Important remarks" Fließtext-Block
  - Rechts (Action-Sidebar, sticky):
    - Back to results · Recalculate · Input data · Datasheet PDF · Datasheet DOCX · GPC file webgpc · Bid text RTF · Available spare parts · Available documents · Material recommendation baseline

---

## 5. CSS-Strategie

Aktuell: eine große `frontend/styles.css` mit gemeinsamen Utility-Klassen + page-spezifische CSS (`admin-documents.css` bereits als Pattern).

Vorschlag: für jede neu gestaltete Page bei Bedarf eine eigene CSS-Datei anlegen (z.B. `frontend/datasheet.css`), verlinkt zusätzlich zur `styles.css`. Nur wo Page-Layout-spezifische Regeln nötig sind. Design-Tokens (Colors, Spacing, Radii) bleiben in `styles.css` als Custom Properties.

---

## 6. Testing / Verifikation

Nach jeder Etappe manuell:
1. Server starten: `node rag-server.js` (Port 3001)
2. Page im Browser laden: `http://localhost:3001/<page>.html`
3. Layout-Screenshot nebeneinander gegen das Ziel-Layout aus `/layouts/` vergleichen
4. Wizard-Durchlauf durchklicken bis zur nächsten noch nicht redesignten Page — sicherstellen, dass Category-State erhalten bleibt
5. Impact-Sterne prüfen (falls auf der Page): sollten sich mit `mygpc-impact.js`-Rules aktualisieren
6. Bei Toggle-Feature (Etappe 4A): alle 16 Toggle-Kombinationen mental durchspielen, mindestens 4-5 tatsächlich testen

Kein automatisierter Test-Setup — reines Manual-QA gegen die Layouts.

---

## 7. Nicht im Sprint-Scope

- Nuxt-App (`nuxt/`) — separate Roadmap in `Planning-Phase3.md`
- Backend-Änderungen (`rag-server.js`, `rag/*.js`) — Persistenz läuft rein clientseitig
- DMS/Bella-Chatbot — bleibt unverändert
- Andere Admin-Seiten (`admin-products.html`, `admin-spareparts.html`, `admin-documents.html`, `admin-rag-*.html`) — nicht in dieser Phase

---

## 8. Referenzen

- Layouts: `/layouts/myGPC - *.png` (fünf Files vom 2026-07-01)
- Aktuelle Startseite: `frontend/index.html` (Zeilen 100-748)
- Region-Gating-Vorbild: `frontend/index.html:725-744`
- Admin-Feature-Card-Muster: `frontend/admin.html:83-` (Feature-Cards-Sektion)
- Impact-Score-Rules: `frontend/mygpc-impact.js` (unverändert, wird nur konsumiert)
- Vanilla-Layer-Freeze-Kontext: `~/.claude/projects/…/memory/project_phase3_decisions.md` (G1 — betrifft `mygpc-*.js`, NICHT HTML/CSS)
