# myGPC ↔ GPC.EU API Field Mapping

> **Status:** Phase 1 (Cold-Side) — review-ready, mit Live-UI-Verifikation (Evap DX). Warm-Side kommt in Phase 3.
> **Stand:** 2026-05-22 · **API-Spec:** `rag/gpceu_swagger.json` (Version 2026.9-318)
> **Plan:** `C:\Users\aschmitt\.claude\plans\image-1-1-select-declarative-gosling.md`
> **API-Property-Referenz (NEU):** `rag/gpc-parameters.md` / `rag/gpc-parameters.json` — kanonische Doku aller 222 `UnitInputData`-Properties aus `UnitInputData_Documentation_2026.1.pdf` (Version GPC.EU Customer 2026.1-310). Generiert per `node rag/build-gpc-parameters.js`.

Dieses Dokument ist die **Single Source of Truth** für die Verknüpfung zwischen den HTML-Form-Elementen in `frontend/thermodynamics.html` + `frontend/unit-selection.html` und den Properties im GPC.EU-API-Schema `UnitInputData` (233 Felder im Swagger, 222 Properties dokumentiert in der PDF). Es entsteht durch:

1. **Statische Inventur** der HTML-Form-IDs in den Vanilla-Pages (`frontend/thermodynamics.html`, `frontend/unit-selection.html`)
2. **Live-UI-Vergleich** mit 4 Screenshots der echten myGPC-Web-App (Evaporator DX) vom 2026-05-20
3. **Live-API-Discovery** über `GET /defaultinputdata?productcategory=N` und `POST /unitgroup` (probegestützt)
4. **Hand-Mapping** semantisch korrespondierender Felder
5. **PDF-Property-Doku** aus `layouts/UnitInputData_Documentation_2026.1.pdf` — schließt seit 2026-05-22 die meisten "Open Questions" aus Section 7

Die OpenAPI-Spec liefert nur Types ohne Descriptions — die Bedeutung der Properties wurde aus Default-Werten + Live-UI-Labels rekonstruiert, **ergänzt durch die offizielle PDF-Doku** (siehe `rag/gpc-parameters.md`).

**Wichtige Diskrepanzen Live-UI vs. statisches HTML (`frontend/thermodynamics.html`):**
- Statisches HTML hat `field-capacity` Default `60` kW. **Live-UI zeigt `10` kW** für Evap DX — die Live-UI populated alle Defaults aus `defaultinputdata` pro Kategorie, nicht aus statischen HTML-Values.
- Statisches HTML hat "Capacity including humidity factor" Checkbox prominent. **Live-UI hat sie unter einem "OPTIONS"-Button-Dialog** versteckt (siehe Screenshot 1, neben Air pressure).
- Statisches HTML Defaults stimmen nicht generell — sie sind nur Placeholder; die API-Defaults sind authoritativ.

---

## 1. Step 1 — Kategorie-Mapping (UI-Cards ↔ API-IDs)

`frontend/index.html` zeigt 6 Marketing-Cards mit Sub-Tabs. Die API hat 15 `productCategories` über 2 `productSection`s. Mapping für **productSection=1** (Unit-Section, Cold + Warm):

| UI-Card | Sub-Tab | `productSection` | `productCategory` | Seite |
|---|---|---|---|---|
| Evaporator | DX | 1 | **0** | Cold |
| Evaporator | Pump | 1 | **1** | Cold |
| Air cooler | Coolant | 1 | **2** | Cold |
| Condenser | Condenser | 1 | 3 | Warm |
| Condenser | Subcooler | 1 | 5 | Warm |
| Dry cooler | Dry cooler | 1 | 4 | Warm |
| Dry cooler | Oil Cooler | 1 | 6 | Warm |
| Gas cooler | CO2 | 1 | 10 | Warm |

`productSection=2` (Bare-Coil) hat die gleichen Kategorien-IDs, geht aber durch `defaultcoilinputdata` + `findcoils` — out of scope für diesen Plan.

---

## 2. Step 2 — Thermodynamics (Cold-Side)

**Datei:** `frontend/thermodynamics.html`
**Trigger:** Beim Wechsel auf diese Seite: `GET /api/gpc-eu/defaultinputdata?productcategory={cat}` aufrufen, Response-`content` als Wizard-State stashen, alle Felder darauf binden.

### 2.1 Capacity Card (immer sichtbar)

| HTML-ID | Label | Live-Default (Evap DX) | UI-Einheit | API-Property | API-Default (cat=0) | Konvertierung | Bemerkung |
|---|---|---|---|---|---|---|---|
| *(no id, select)* | Calculation mode | "State fixed capacity (adjust surface reserve)" | enum | `inputModeCapacity` | `0` | 0=fixed-capacity, 1=calculate capacity | **Verifiziert über `GET /inputcapacitymodes`**: `content=[{0:"State fixed capacity (adjust surface reserve)"}, {1:"Calculate capacity"}]` |
| `field-capacity` | Capacity | **`10`** | kW | `thermalCapacity` | `10000` | **÷1000 W→kW** | Hauptfeld. Live-UI zeigt `10`. Sowohl Cold- als auch Warm-Side benutzen `thermalCapacity` (ohne `_2`-Suffix) — Korrektur der ursprünglichen Annahme. |
| `field-min-reserve` | min. surface reserve | `-10` | % | `tC_Tolerance_L` | `-10` | 1:1 | |
| `field-max-reserve` | max. surface reserve | `50` | % | `tC_Tolerance_H` | `50` | 1:1 | |
| `field-frost-thickness` *(Expert)* | Frost thickness | `0` | mm | `frostThickness` | `0` | 1:1 | In Live-UI prominent rechts neben Capacity, nicht versteckt unter Expert-Toggle |

### 2.2 Medium Card

Im Live-UI direkt sichtbar (Evap DX, kein Expert-Toggle nötig — die Felder sind alle direkt rendered, nur `max. pressure drop` und `Dew point/Mean` sind **disabled** bei Default-Setup):

| HTML-ID | Label | Live-Default | UI-Einheit | API-Property | API-Default (cat=0) | Konvertierung | Bemerkung |
|---|---|---|---|---|---|---|---|
| `field-medium` | Medium (select) | CO2 (R744) (GWP 1 \| A1) [Impact-Label] | enum | `fluidID` | `2010` | **Dropdown dynamisch aus `GET /fluids?languageID=2&productCategory={cat}` füllen** — content[] enthält `{fluidID, fluidName, hasImpact}` | Cold- UND Warm-Side benutzen `fluidID` (ohne `_2`-Suffix). `hasImpact=true` triggert die grüne Impact-Leaf-Badge. |
| `field-evap-temp` | Evaporation temp. | `-8` | °C | `fluidTempInlet` | `-7.9` | 1:1 | Live-UI zeigt `-8`, API-Default ist `-7.9` (Live-UI-Default vermutlich auf ganze Zahl gerundet). Es existiert auch `fluidTempEvap=-8` mit dem ganzzahligen Wert — wahrscheinlich ist `fluidTempEvap` das primäre Feld und `fluidTempInlet` der berechnete Wert. **Open Question:** Welches Feld setzt die UI? |
| `inlet-dewpoint` / `inlet-mean` (radio) | Dew point at inlet (DIN EN328) / Mean | dew-point **(disabled-look in Live-UI)** | enum | `fluidInputMode` | `3` | 3=dewpoint(DIN EN328). Andere Werte: zu verifizieren über `GET /fluidinputmode` | In Live-UI sehen beide Radios disabled aus (grau), aber "Dew point" ist gefüllt — vermutlich nur bei "Inlet state by temp. and pressure"-Checkbox aktivierbar. |
| `field-superheating` | Superheating | `5` | K | `fluidSuperHeating` | `5` | 1:1 | In Live-UI direkt sichtbar, nicht versteckt |
| `inlet-state` (checkbox) | Inlet state by temp. and pressure | unchecked | bool | `?` | — | — | **Open Question:** Vermutet setzt es `fluidInputMode` auf einen anderen Wert (statt 3) und aktiviert das Mean/Dewpoint-Radio. |
| `field-cond-temp` | Cond. temp. | `5` | °C | `fluidTempCond` | `5` | 1:1 | |
| `field-subcooling` | Subcooling | `1` | K | `fluidSubCooling` | `1` | 1:1 | |
| `field-pressure-drop` | max. pressure drop in coil | `5` **(disabled in Live-UI, weil AUTO ☑)** | K | `fluidPressureDropMax` | `5` | 1:1 | Feld ist disabled solange `isMaxFluidPressureDropAuto=true`. UI-Einheit "K" entspricht "äquivalente Temp-Spreizung" — gpcversion-Eigenheit. |
| `auto-medium` (checkbox, neben pressure drop) | AUTO | **checked** | bool | `isMaxFluidPressureDropAuto` | `true` | 1:1 | Bei `true` wird `fluidPressureDropMax`-Input deaktiviert. |

### 2.3 Air Card

| HTML-ID | Label | Live-Default | UI-Einheit | API-Property | API-Default (cat=0) | Konvertierung |
|---|---|---|---|---|---|---|
| `field-air-temp` | Inlet temp. | `0` | °C | `airTemperature` | `0` | 1:1 |
| `field-air-pressure` | Air pressure | `1013` | mbar | `airPressure` | `1013` | 1:1 |
| *(no UI field directly)* | Air rel. humidity | — | % | `airRelHumidity` | `85` (cat=0/1), `77` (cat=2) | Live-UI zeigt das nicht direkt. Datasheet zeigt "Rel. humidity: auto (%)". Vermutlich gesteuert über `isAirRelHumidityAuto=true`. |
| *(Button "OPTIONS")* | Air OPTIONS-Modal | — | — | — | — | **Wichtig:** Live-UI hat einen "OPTIONS"-Button rechts neben Air pressure. Vermutlich öffnet er ein Modal mit zusätzlichen Air-Settings (rel. humidity, altitude, etc.). Inhalt nicht aus den Screenshots ersichtlich. **Open Question:** Modal-Inhalte ermitteln. |

### 2.4 Humidity Card (NICHT in Live-UI sichtbar als Card)

| HTML-ID | Label | Default | API-Property | API-Default | Konvertierung |
|---|---|---|---|---|---|
| `capacity-humidity-factor` (checkbox) | Capacity including humidity factor | `checked` | `capacitySensibleHeatOnly` | `false` | **Invertiert** — UI-checked = API-false (humidity factor included = NOT sensible-heat-only) |

**Hinweis:** Im statischen `frontend/thermodynamics.html` ist diese Card prominent unten links. **In der Live-UI fehlt sie ganz** — wahrscheinlich in den `OPTIONS`-Modal-Dialog verschoben. Verifikation nötig.

---

## 3. Step 3 — Unit Selection (Cold-Side)

**Datei:** `frontend/unit-selection.html` · Drei Sections: Limitations, Impact Product Life Cycle, Options, Terminal Box

### 3.1 Series-Auswahl (Linke Spalte) — **API-getrieben über `POST /unitgroup`**

**MAJOR FINDING aus Live-Probe:** Die Series-Liste kommt aus `POST /api/gpc-eu/unitgroup?languageID=2` mit dem kompletten **UnitInputData** als Body. Response liefert ein Array von Series-Objekten mit allen Display-Daten — kein Hand-Mapping nötig.

**Response-Schema pro Series-Item (Auszug aus Probe für cat=0 DX mit Default-Inputs):**
```json
{
  "serieName": "Cubic COMPACT - GACC CX",
  "serieDescription": "Air cooler – cubic design, compact",
  "image": "https://webgpc.blob.core.windows.net/images/GPCData/EU/Daten/Grt/Guentner/EvapDry/GACC_CX_3E_WS_KDB.jpg",
  "mrNameWithSuffix": "GACC CX",
  "unitGroupID": "GACC_CX_3E_WS_KDB",
  "validationResult": true,
  "validationInfos": {
    "protocolDescription": null  // bei false: "Series 'X' is not suitable.\nNot suitable for current fluid!"
  },
  "productDesign": 3,
  "orderIndex": 2,
  "visible": true,
  "defrostingConstraint": 1,
  // + viele technische Felder wie baseUnitID, finConinID, noInletNipples, etc.
}
```

**Probe-Ergebnis für cat=0 Evap DX (CO2 R744 Default):** 18 Series total, davon 6 mit `validationResult=true` (entsprechen den 6 in der Live-UI sichtbaren Series-Cards mit grünen Dots).

| UI-Element (Live-Screenshot 2) | API-Quelle | Bemerkung |
|---|---|---|
| 6 sichtbare Series-Cards: Mini/Slim/Dual/Cubic COMPACT, Cubic VARIO, Process APPLICATION | `POST /unitgroup` Response — alle Items mit `visible=true` | UI-Card mit Bild aus `image`, Title aus `serieName`, Untertitel aus `serieDescription` |
| Roter/Grüner Dot pro Card | `validationResult` (bool) | true=grün (verfügbar), false=rot (nicht passend für Inputs) |
| Hover-Tooltip "Series 'X' is not suitable. Not suitable for current fluid" | `validationInfos.protocolDescription` | Erklärung der roten Dots |
| ✓ neben "Cubic COMPACT - GACC CX" und "Cubic VARIO - GACV CX" | `units[]` aus `defaultinputdata.content` | Pre-Selection: die zwei Series, deren `unitGroupID` im `units[]`-Array steht |

| UI-Element (Calculate Single Unit Tab) | Default | API-Property | API-Default (cat=0) | Bemerkung |
|---|---|---|---|---|
| Series-Dropdown (GAMC/GASC/GADC/GACC/GACV/GADP) | erste aus `units[]` | `unitSelectionMode` umschalten | — | Tab-Wechsel → `unitSelectionMode = 1` |
| Model filter (text) | leer | `unitFilterList[]` | `[]` | Filter auf `mtNameExternal` |
| Model-Tabelle | Liste aus `POST /unitgroup` → einzelne `mtNameExternal` pro Series, oder via `GET /unitmodels?productCategory=0&unitGroup=GACC&fluidID=2010&languageID=2` | `unitModel[]` | — | `unitmodels`-Endpoint liefert pro `unitGroup` alle Varianten mit `mtNameExternal`, `baseUnitID`, `conceptName`. |
| Passes (AUTO, 1, 2, 3, 4) | AUTO | `noOfPasses` | `6` (cat=0), `60` (cat=1), `24` (cat=2) | AUTO ↔ vermutlich `0`. **Open Question:** Default-Werte 6/60/24 sind keine UI-Werte sondern kategorie-spezifische API-Defaults für Backend-Berechnungen. |

### 3.2 Limitations Section

| HTML-Element (label) | UI-Default | UI-Einheit | API-Property | API-Default | Konvertierung |
|---|---|---|---|---|---|
| Max. installation L | `12` | m | `unitLengthMax` | `12` | 1:1 (m). Einheits-Select erlaubt mm/ft. |
| Max. installation W | `10` | m | `unitWidthMax` | `10` | 1:1 |
| Max. installation H | `20` | m | `unitHeightMax` | `20` | 1:1 |
| Fin Specifications (select: Fin spacing / Fin thickness) | Fin spacing | enum | `finSpacingInputMode` | `0` | 0=spacing, 1=thickness (zu verifizieren) |
| Min Fin | `1.5` | mm | `finPitch0Min` | `1.5` | 1:1 |
| Max Fin | `15` | mm | `finPitch0Max` | `15` | 1:1 |
| Sound specifications (select: Max. sound pressure / power) | pressure | enum | `maxSoundInputMode` | `1` | 1=pressure, vermutlich 0=power |
| Maximum sound | `99` | dB(A) | `soundPressureMax` | `99` | 1:1 |
| Distance for sound | `3` | m | `soundPressureDistance` | `3` | 1:1 |
| Tolerance *(Expert)* | `3` | dB(A) | `maxSoundTolerance` | `3` | 1:1 |
| Min. no. of fans *(Expert)* | `1` | — | `noOfFans` | `1` | 1:1 |
| Delivery time (select) | Only available units | enum | `deliveryTimeFilter` | `-1` | -1=only available, andere zu verifizieren |
| `stock-items-only` (checkbox) | unchecked | bool | `onlyStockUnits` | `false` | 1:1 |

### 3.3 Impact Product Life Cycle Section

Master-Toggle: `impact-plc` Checkbox ↔ `impactProductLifeCycle` (bool).

| HTML-ID/Label | UI-Default | UI-Einheit | API-Property | API-Default | Konvertierung |
|---|---|---|---|---|---|
| Operation Life | `15` | a (years) | `impactOperationLife` | `15` | 1:1 |
| Planning Factor | `120` | % | `impactPlanningFactor` | `120` | 1:1 |
| Fan Usage Profile | `100` | % | `impactFanUsageProfile` | `75` (cat=0) | 1:1 |
| Energy Costs | `0.3` | €/kWh | `impactElectricityPrice` | `0.3` | 1:1 |
| `impact-location` (select) | Germany | enum | `impactCountryID` | `37` (vermutlich Germany) | Liste der Country-IDs via `GET /GetCountryEmissionData` — Open Question |
| Energy CO₂ Emissions | `380` | g CO₂/kWh | `impactEmissionFactor` | `380` | 1:1 |
| `defrost-per-day` | `0` | — | `impactDefrostPerDay` | `-1` | -1 = "use prediction model" |
| `defrost-duration` | `0` | min | `impactMaxDefrostDuration` | `-1` | analog |
| `prediction-defrost` (checkbox) | unchecked | bool | `impactUsePredictionModelDefrost` | `0` | 0/1 |

### 3.4 Options Section

Reihenfolge wie in Live-UI (Screenshots 4 bottom, 3, 2 von oben nach unten). **Wichtig:** Live-UI hat keinen Basic/Expert-Toggle bei diesen Feldern — alle direkt rendered. Der Static-HTML hatte einen, der live wegfällt.

| Live-Label (Screenshot) | Live-Default (Evap DX) | UI-Type | API-Property | API-Default (cat=0) | Konvertierung / Enum |
|---|---|---|---|---|---|
| Only units compliant with ErP | **☑ checked** | checkbox | `erP_Compliant` | `true` | 1:1 |
| Power supply | "All 50Hz" | select | `powerSupply` | `3001` | 3001=All 50Hz (verifiziert: anderer Werte via `GET /properties1ph`). |
| Motor technology | **"Cost-optimised"** [Impact-Leaf] | select | `motorTechnology` | `-3` | -3 = Cost-optimised (Live-UI-Verifikation). Andere Werte: EC, AC — über `properties1ph` enumerierbar. **Korrektur:** Static-HTML hatte "EC Technology" als Default; Live verwendet "Cost-optimised". |
| Minimum energy efficiency class | "No" [Impact-Leaf] | select | `efficiencyClass` | `"--"` (string) | "No" = `"--"`. Andere: "A+", "A", "B", "C". |
| Max. operating pressure | "Standard" | select | `maxOperatingPressure` | `0` | **Neu** (nicht in Static-HTML). Enum unklar. |
| Core tube material | "All" | select | `coreTubeMaterial` | `0` | **Neu** (nicht in Static-HTML). "All" = `0`, andere zu enumerieren. |
| Air blow direction | "Standard" | select | `airBlowOffType` | `10001` | 10001 = Standard. Andere: Reverse. |
| Defrosting | **"Air defrost"** [Impact-Leaf] | select | `defrosting` | `80` | **Korrektur:** `80` = Air defrost (Live-UI-Verifikation). Andere Werte für Electric, Hotgas, Water sind zu enumerieren. Static-HTML hatte fälschlich "Hotgas defrost" als Default. |
| Hot gas interconnecting tubing | unchecked, "with check valve" (greyed) | checkbox + select | `defrostingHotGasFeed` | `0` | Combo: Checkbox aktiviert das Select. Wenn Defrosting != Hotgas → disabled. |
| Air velocity | "All" | select | `airVelocityClass` | `10001` | 10001 = All. Andere: High/Medium/Low. **Korrektur:** Static-HTML hatte Checkbox + 3-Option-Select; Live hat nur einen 4-Option-Select (All + 3 levels). |
| ESP (External static pressure) | unchecked, `0 Pa` (greyed) | checkbox + number | `externalPressing` / `espMin` / `espMax` | `0` / `0` / `0` | Combo |
| Epoxy coated fins | ☐ | checkbox | `epoxy_Fins` | `0` | bool-as-int (0/1) |
| Air sock connection incl. Güntner Streamer | ☐ | checkbox | `airHoseConnectionInclStreamer` | `0` | bool-as-int |
| Coil Defender (HX fully powder-coated incl. connection system) | ☐ | checkbox | `coil_Defender` | `0` | **Neu** (nicht in Static-HTML). bool-as-int |
| Repair switch | ☐, 3 greyed dropdowns: "Preferably one per fan" / "Single-speed" / "At side" | checkbox + 3 selects | `repairSwitch` + 3 sub-properties | — | **Neu** (Static-HTML hatte nur Checkbox). Bei aktiviertem Switch werden 3 Optionen wählbar. Sub-properties: Position, Type, Mounting-Location — **Open Question**, Property-Namen nicht sicher. |
| Wiring to terminal box | ☐ | checkbox | `wiring_To_Terminal_Box` | `0` | bool-as-int |
| Fan ring heater | ☐, "Standard" (greyed) | checkbox + select | `heatingStrapsAtAirOutlet` + sub | — | **Open Question:** API-Property genauer prüfen |
| Double tray with 20 mm insulation | ☐ | checkbox | `doubleTrayInsulated` | `0` | bool-as-int. Static-HTML hatte "10 mm insulation"; Live zeigt "20 mm" — entweder Text-Update oder anderes Property. |
| Casing and simple tray made of stainless steel | ☐ | checkbox | `casingAndSimplyTray` | `0` | bool-as-int |
| Casing and double tray made of stainless steel | ☐ | checkbox | `casingAndDoubleTray` | `0` | bool-as-int |
| Hinged fan units | ☐ | checkbox | `hingedFanPlate` | `0` | bool-as-int |
| Design for evaporation temp. t0<-40°C | ☐ | checkbox | (?) | — | **Open Question:** Property-Name unklar. Setzt vermutlich `fluidTempInlet`-Minimum auf -40°C und filtert Series. Live-UI Label ist "t0<-40°C", Static-HTML hatte "60/-40°C". |
| Connections in air flow direction left | ☐ | checkbox | `wiring_To_Junction_Box_At_Side` ? | — | **Open Question:** Property-Name unklar |
| Inlet hood | ☐ | checkbox | `inletHood` | `0` | bool-as-int |
| Louvre (with drive) made of galvanised steel | ☐ | checkbox | `adjustableFlapWithDrive` ? | — | **Open Question:** Property-Name unklar |
| Güntner Streamer (for an increased air throw) | ☐ [Impact-Leaf] | checkbox | `airHoseConnection` ? | — | **Open Question:** Property-Name unklar. Static-HTML hatte "checked" als Default; Live hat unchecked. |

### 3.5 Terminal Box Section

Live-UI Header: "TERMINAL BOX [WITH OPTIONS]" — Master-Checkbox **☑ checked** (default an), expandiert. Title hat Impact-Leaf-Badge.

| Live-Label (Screenshot 2 unten) | Live-Default | UI-Type | API-Property | Bemerkung |
|---|---|---|---|---|
| Terminal Box Master | **☑ checked** | checkbox + accordion | `switchCabinet` ? | Bei `false` wird die ganze Section ausgegraut |
| Motor Technology | **"Cost-optimised"** | select | `switchCabinetMotorTechnology` | Enum: "Cost-optimised" / "EC Technology" |
| **PRESELECTION** (radio group, 5 Optionen) | "Wiring to terminal box" **selected**, andere 4 greyed | radio | `switchCabinetType` ? | **Open Question:** Property-Name nicht sicher. Greyed-Out-Verhalten kommt vermutlich aus Motor-Technology-Wahl (Cost-optimised = AC → EC-Optionen disabled). Werte vermutlich int-IDs: 0=Controller(EC), 1=Switch/Fuse-Box, 2=Control-Panel(AC), 3=Wiring-only (Default), 4=Fuse-Box-with-Signals. |
| ↳ Controller (EC) | ○ (greyed) | radio | — | Verfügbar bei Motor-Technology=EC |
| ↳ Switch cabinet (AC) or fuse box (EC) with control | ○ (greyed) | radio | — | |
| ↳ Control panel (AC) with fans wired to contactor (slave control) | ○ (greyed) | radio | — | |
| ↳ Wiring to terminal box (electrical connection and control signals) | **● selected** | radio | — | Default — funktioniert für AC und EC |
| ↳ Fuse box with circuit breaker + signals (EC) / Motor start protection + thermo contact (AC) | ○ (greyed) | radio | — | |
| 0-10V signal required (only EC!) | ☐ [Impact-Leaf] | checkbox | `manualSpeedController` ? oder `controllerInterface` ? | **Open Question** |
| Wiring | "In groups/in series" | select | `wiring_To_Junction_Box_At_Side` ? | **Open Question.** Neu (Static-HTML hatte ein zweites "Motor technology"-Dropdown statt "Wiring"). |

**Hinweis:** Die Static-HTML-Version hatte ein "0-10V signal" oben UND ein zweites "Motor technology"-Select unten — wirkt wie ein historischer Mockup-Stand. Live-UI hat eindeutiges Layout: ein Master-MotorTech, Radio-Group, dann 0-10V-Checkbox, dann Wiring-Select. **Static-HTML braucht hier ein Refresh.**

---

## 4. Step 4 — Results Table Columns

**Datei:** `frontend/results.html` · Spalten kommen aus `POST /findunits` → `foundUnits[]` → `FindUnitsResultOutputData`.

| Spalten-Header | API-Property | Konvertierung | Bemerkung |
|---|---|---|---|
| Unit Key | `unitKey` | 1:1 | z.B. `GACV CX 031.1FE/4A-70.A-18VU.0CHM` |
| Similarity Score | *(nicht im Schema)* | — | **UI-only**, vermutlich client-berechnet aus `surfaceReserve` |
| Capacity (kW) | `thermalCapacity` | W→kW falls in W; sonst 1:1 | Verify: Schema-Type ist `number` |
| Surface Reserve (%) | `surfaceReserve` | 1:1 | |
| Surface (m²) | `surface` | string mit Einheit ("34.2") | Schon formatiert |
| Tube Volume (L) | *(nicht direkt — vermutlich aus `tubeRows` o.ä.)* | — | Open Question |
| Pressure Drop (bar/K) | `fluidPressureDrop` / `capacityTempDiff` | Combo | |
| Air (m³/h) | `airVolumeFlow` | 1:1 | |
| Motor Technology | (aus `motorTechnology`-Code → label) | Lookup | "AC" oder "EC" |
| L / W / H | `unitLength` / `unitWidth` / `unitHeight` | strings mit "mm" | |
| Delivery Time (W) | `deliveryTime` | string ("8 weeks") | |
| Price (EUR) | *(nicht im Schema)* | — | **UI-only oder anderer Endpoint** — Open Question |

---

## 5. Step 5 — Datasheet Display

**Datei:** `frontend/datasheet.html` · Renderfelder kommen aus dem in Step 4 ausgewählten Unit + `POST /unitfeatures` + `POST /unitbidtext` (RTF).

| Datasheet-Label | API-Quelle | Bemerkung |
|---|---|---|
| Product title ("Evaporator") | `gpcProductCategoryName` (aus Step 1) | |
| Subtitle (Unit-Modell-String) | `selectedUnit.unitModelID_MRNameExternal` + `unitModelID_MTNameExternal` | |
| Capacity / Surface reserve / Air volume / Air velocity / Air throw | `selectedUnit.thermalCapacity` / `surfaceReserve` / `airVolumeFlow` / ... | |
| Refrigerant / Evap temp / Feed rate / Air temp / Rel. humidity / Frost thickness | Aus `UnitInputData` (vom User in Step 2 gesetzt) | |
| Fans / Data per fan / Speed / Motor | `selectedUnit.fanCapacityDescription` + Verwandte | |
| Noise pressure / Noise power / Max. current / Nominal current | `soundPressure` / `soundPowerLevel` / weitere Felder | |
| Casing / Materials (Tubes, Fins, Distributor, Tray) | `coreTubeMaterialCode` / `finMaterialCode` / weitere | |
| Dimensions | `unitLength` / `unitWidth` / `unitHeight` | |
| Bid text (lange Beschreibung) | `/unitbidtext` POST mit MFC-binaries | RTF, muss in Plaintext umgewandelt werden |

---

## 6. API-Default-Werte pro Cold-Side-Kategorie

Aus `GET /defaultinputdata?productcategory=N` extrahiert:

| Property | cat=0 (DX) | cat=1 (Pump) | cat=2 (Air cooler) |
|---|---|---|---|
| `thermalCapacity` (W) | 10000 | 5000 | 5000 |
| `tC_Tolerance_L` (%) | -10 | -10 | -10 |
| `tC_Tolerance_H` (%) | 50 | 50 | 50 |
| `fluidID` | 2010 (CO2) | 2009 (NH3) | 4 (Ethylene glycol) |
| `fluidTempInlet` (°C) | -7.9 | 35 (!) | -5 |
| `fluidTempCond` (°C) | 5 | 40 | 40 |
| `fluidSuperHeating` (K) | 5 | — | — |
| `fluidSubCooling` (K) | 1 | 5 | 5 |
| `airTemperature` (°C) | 0 | 0 | 8 |
| `airRelHumidity` (%) | 85 | 85 | 77 |
| `airPressure` (mbar) | 1013 | 1013 | 1013 |
| `altitude` (m) | 2 | 2 | 2 |
| `defrosting` | 80 (Hotgas) | 80 | 80 |
| `soundPressureMax` | 99 | 99 | 99 |
| `units[]` (Series) | GACC_CX_3E_WS_KDB, GACV_CX_4E | GACV_AP_4E | GACC_FP_2E_WS_KDB, GACV_FP_4E |
| Fluids-Liste (Count) | 42 (Refrigerants) | 44 (Refrigerants + NH3) | 5 (Coolants) |

**Beobachtungen:**
- cat=1 (Pump) hat ungewöhnliche Default-Temperaturen (Inlet=35°C, Cond=40°C) — sieht aus wie eine andere Konvention, evtl. Brine-Temperaturen statt Refrigerant-Temperaturen
- cat=2 (Air cooler) hat ganz andere Fluid-Welt: Wasser, Glykole, Thermogen (keine Phasen-Wechsel-Refrigerants)
- `units[]` Liste ist **kategorie-spezifisch** und sollte die UI-Series-Liste füllen

---

## 6.C.1 — Evaporator-Pump-Variante (cat=1)

Verifiziert anhand 4 Screenshots vom 2026-05-20 (Evap Pump default state) + `defaultinputdata?productcategory=1`-Probe. Evap Pump ist Cold-Side, hat aber **andere Form-Felder** als Evap DX — die Medium Card ist **schlanker** (keine DX-spezifischen Felder wie Superheating/Subcooling), aber dafür gibt es **pump-spezifische Felder**.

### 6.C.1.1 — Thermodynamics Unterschiede zu Evap DX

**Capacity Card:** identisch zu Evap DX, nur Capacity-Default `5` kW statt `10` (matched API `thermalCapacity=5000`).

**Medium Card** — deutliche Vereinfachung:

| Live-Label | Live-Default | API-Property | API-Default (cat=1) | Bemerkung |
|---|---|---|---|---|
| Medium [Impact-Leaf] | "NH3 / ammonia (R717) (GWP 0 \| B2L)" | `fluidID` | `2009` (NH3) | Fluid-Dropdown via `GET /fluids?productCategory=1` — 44 fluids verfügbar, R717 NH3 ist Default. |
| Evaporation temp. | `-8` °C | **`fluidTempEvap`** | `-8` | **Wichtig:** Bei Pump mapping auf `fluidTempEvap`, NICHT `fluidTempInlet` wie bei DX. Verifiziert via Probe. |
| ☐ gravity flooded | unchecked | `fluidPumpMode` | `0` | **Pump-spezifisch.** `0` = pump-fed (default), checked vermutlich = gravity-flooded (anderer Wert). |
| **Feed rate** | `3.5` | `fluidPumpRate` | `3.5` | **Pump-spezifisch**, exakt verifiziert. Multiplikator-Verhältnis (Refrigerant-Massenstrom-Reserve im Pumpensystem). |
| max. pressure drop in coil | `5` K (disabled, AUTO ☑) | `fluidPressureDropMax` | `5` | → wie DX |
| ☑ AUTO | checked | `isMaxFluidPressureDropAuto` | `true` | → wie DX |

**Fehlende Felder gegenüber Evap DX** (NICHT im Pump-UI):
- ✗ Cond. temp. — DX-only (Superheating + Subcooling-Berechnung)
- ✗ Superheating — DX-only
- ✗ Subcooling — DX-only
- ✗ Dew point at inlet / Mean Radio — DX-only
- ✗ Inlet state by temp. and pressure Checkbox — DX-only

API hat diese Felder trotzdem (`fluidTempCond=40`, `fluidSuperHeating=5`, `fluidSubCooling=5` als API-Defaults), aber das UI rendert sie für Pump nicht. Vermutlich werden sie vom Backend auto-berechnet aus den Pump-Parametern.

**Air Card:** identisch zu DX (Inlet temp. + Air pressure).

**Bottom Card — Cold-Side-Humidity-Faktor:**

| Live-Label | Live-Default | API-Property | API-Default (cat=1) | Bemerkung |
|---|---|---|---|---|
| ☑ **Capacity including Humidity Factor** | **checked** | `capacitySensibleHeatOnly` | `false` | **Pump-Page zeigt die Checkbox prominent** — Evap-DX-Page hat sie nicht direkt sichtbar (vermutlich im OPTIONS-Modal versteckt). Invertiert: UI-checked = API-false. |

### 6.C.1.2 — Unit Selection Unterschiede zu Evap DX

**Series-Liste** (nur **2 sichtbare Series** für Pump vs. 6 bei DX):

| `unitGroupID` | Display-Name | Beschreibung |
|---|---|---|
| `ADHN_…` (NH3-spezifisch) | Dual VARIO - ADHN | Dual discharge NH3 evaporators (stainless steel/al.) |
| `GACV_AP_4E` | Cubic VARIO - GACV AP | Air cooler – cubic design, variable ← Default-Selected (✓) |

Pump-Series-Auswahl ist deutlich beschränkter, weil NH3-Pump-Systeme nur bestimmte Hardware unterstützen.

**LIMITATIONS, OPTIONS und TERMINAL BOX:** strukturell identisch zu Evap DX, **bis auf zwei Unterschiede**:

| Feld | DX (cat=0) | Pump (cat=1) |
|---|---|---|
| **Coil Defender** Checkbox | vorhanden | **fehlt** |
| **Legs for floor mounting** Checkbox + "Galv. Steel"-Select | fehlt | **vorhanden** |

`Legs for floor mounting` ist also Pump-spezifisch (vermutlich weil NH3-Pump-Anlagen oft bodenmontiert sind). API-Property dafür noch unbekannt — Open Question. "Galv. Steel" ist ein Material-Select für die Beine.

### 6.C.2 — Air Cooler Coolant-Variante (cat=2)

Verifiziert anhand 5 Screenshots vom 2026-05-20 (Air Cooler Coolant default state) + `defaultinputdata?productcategory=2`-Probe. Cold-Side, aber **fluidtechnisch grundlegend anders** (sekundäres Kühlmittel statt Refrigerant), entsprechend andere Felder.

### 6.C.2.1 — Thermodynamics Unterschiede zu DX/Pump

**Capacity Card:** identisch zu DX/Pump, Capacity-Default `5` kW.

**Medium Card** — eigene Variante (NICHT DX-style, NICHT Pump-style):

| Live-Label | Live-Default | API-Property | API-Default (cat=2) | Bemerkung |
|---|---|---|---|---|
| Medium [Impact-Leaf] | "Ethylene glycol" | `fluidID` | `4` | Coolant-Dropdown via `GET /fluids?productCategory=2` — nur **5 Fluids** (Wasser, Ethanol, Ethylene/Propylene Glycol, Thermogen). Keine Refrigerants. |
| **Concentration** | `34` Vol.% | `fluidVolConcentration` | `34` | **Coolant-spezifisch.** Glykol/Wasser-Mischungsverhältnis in Volumenprozent. |
| **Parameter mode** | "Inlet/Outlet temperature" | `fluidInputMode` | `0` | **Coolant-spezifisch.** Aus `GET /fluidinputmode` enum: 0="Inlet/Outlet temperature" (default), 1="Inlet temp./Volume flow", 2="Outlet temp./Volume flow", 5="Inlet temp./Mass flow", 6="Outlet temp./Mass flow". Wahl bestimmt, welche zwei Felder unten dann angezeigt werden. |
| **Inlet temp.** | `-5` °C | `fluidTempInlet` | `-5` | **Coolant-Inlet** (kühle Seite, ins Coil rein) |
| **Outlet temp.** | `0` °C | `fluidTempCond` | `40` (!) | **Diskrepanz:** API-Default `40`, Live-UI-Default `0`. Vermutlich überschreibt UI das default. Mapping: `fluidTempCond` ist das Outlet-Temp-Feld (auch wenn Name "Cond" suggeriert). Coolant erwärmt sich um 5 K im Coil (von -5 auf 0). |
| **max. pressure drop in coil** | `1` **bar** (nicht greyed, AUTO unchecked) | `fluidPressureDropMax` | `1000` | **Einheit-Mismatch:** API in mbar (`1000`), UI in bar (`1`). Konversion: `÷1000 mbar→bar`. Vs. DX/Pump in K (Temperatur-Spreizung). |
| ☐ AUTO (neben pressure drop) | **unchecked** | `isMaxFluidPressureDropAuto` | `false` | **Wichtig:** Bei Coolant ist AUTO standardmäßig AUS, bei DX/Pump AN. |

**Fehlende Felder gegenüber Evap DX**:
- ✗ Evaporation temp. (keine Phase-Change → kein Verdampfungspunkt)
- ✗ Cond. temp. / Superheating / Subcooling / Dew point Radio / Inlet state Checkbox
- ✗ gravity flooded / Feed rate (kein Pump-Sub-System)

**Air Card:** identisch zu DX (Inlet temp. + Air pressure). Cat=2 default `airTemperature=8` °C (vs. DX `0` °C).

**Bottom Card** — Cold-Side-Humidity-Faktor:

| Live-Label | Live-Default | API-Property | API-Default (cat=2) | Bemerkung |
|---|---|---|---|---|
| ☑ Capacity including Humidity Factor | **checked** | `capacitySensibleHeatOnly` | `false` | **Sichtbar** (wie bei Pump). Invertiert. |

### 6.C.2.2 — Unit Selection Unterschiede zu DX/Pump

**Series-Liste** — **8 Series** mit `_FP_`-Suffix (Coolant-spezifische Hardware):

| `unitGroupID`-Prefix | Display-Name | Beschreibung |
|---|---|---|
| `GASC_FP_*` | Slim COMPACT - GASC FP | Air cooler – slimline design |
| `GADC_FP_*` | Dual COMPACT - GADC FP | Air cooler – dual discharge, compact |
| `GACC_FP_*` | Cubic COMPACT - GACC FP | Air cooler – cubic design, compact ← Pre-Selected ✓ |
| `DGN_*` | Dual VARIO - DGN | Dual discharge glycol unit coolers |
| `GACV_FP_*` | Cubic VARIO - GACV FP | Air cooler – cubic design, variable ← Pre-Selected ✓ |
| `GADP_FP_*` | Process APPLICATION - GADP FP | Air cooler – for processing rooms, draught-reduced |
| `GGBK_*` | Process APPLICATION - GGBK | Processing room glycol unit coolers |
| `GACA_FP_*` | Agri APPLICATION - GACA FP | Air cooler – fruit and vegetable cooling, blow-through |

**LIMITATIONS, OPTIONS und TERMINAL BOX:** strukturell identisch zu DX, mit folgenden Unterschieden:

| Feld | DX (cat=0) | Pump (cat=1) | Coolant (cat=2) |
|---|---|---|---|
| Coil Defender | ✓ | ✗ | ✓ |
| Legs for floor mounting + Material-Select | ✗ | ✓ | ✓ |
| Hot gas interconnecting tubing | ✓ (greyed) | ✓ (greyed) | ✗ (nicht im UI) |
| **THREAD/FLANGE CONNECTIONS** section | ✗ | ✗ | **✓ (NEU)** |

### 6.C.2.3 — THREAD/FLANGE CONNECTIONS (NEU, nur Coolant)

| Live-Label | Live-Default | UI-Type | API-Property | Bemerkung |
|---|---|---|---|---|
| THREAD/FLANGE CONNECTIONS Master | ☑ checked | checkbox + accordion | (?) | Coolant-spezifisch — Pipe-/Flansch-Konfiguration für Brine-Anschluss |
| Connection type | "Lapped flanges" | select | `connectionType` | Andere Werte aus enum zu enumerieren |
| Info-Text | "Incl. counter flange (Welding neck flange DIN EN 1092-1), screws and gaskets are intended for transport only and must be replaced" | static text | — | UI-only |
| ● With brazing neck PN10 | selected | radio | (?) | Brazing-Verbindungs-Variante |

**Open Question:** API-Properties für Connection type Enum und brazing-neck-Radio sind nicht aus dem Default-Dump ersichtlich.

---

## 6.W. Warm-Side — Live-UI-Verifikation Condenser (cat=3)

Verifiziert anhand 6 Screenshots vom 2026-05-20 (Condenser default state) + `defaultinputdata?productcategory=3`-Probe. Die Warm-Side-Form ist **deutlich umfangreicher** als Cold-Side. Bare-Felder/Felder gleich wie Cold sind unten als "→ wie Cold" markiert.

**Major Finding — Korrektur der `_2`-Suffix-Annahme:**
Cat=3 Condenser benutzt im Default ebenfalls `thermalCapacity`/`fluidID`/`fluidTempInlet`/`fluidTempCond` (alle **ohne** `_2`-Suffix). Die `_2`-Felder (`thermalCapacity_2=0`, `fluidID_2=0`, …) sind im Default-State alle Null. Vermutete Bedeutung: `_2`-Felder werden nur bei "Multiple circuits" (`noOfCircuitsThermo>1`) bzw. mehrstufigen/kaskadierten Setups aktiv. Phase 1 schreibt das so nieder; Verifikation kommt in Phase 2.

### 6.W.1 — Thermodynamics (Condenser)

**Calculation Mode Label-Variante:** Das gleiche `inputModeCapacity=0` zeigt unterschiedliche Labels per Kategorie:
- Cold-Side: "State fixed capacity (adjust **surface reserve**)"
- Warm-Side: "State fixed capacity (adjust **condensation temperature**)"

Beide werden vom selben Property gesteuert — Label ist UI-side abhängig von Kategorie (oder die Live-UI fragt ein noch nicht entdecktes Endpoint). **Hinweis:** API gibt cat=3-Default `inputModeCapacity=3` zurück, aber `GET /inputcapacitymodes` listet nur 0 und 1. **Open Question:** evtl. erwartet `inputcapacitymodes` einen `productCategory`-Query-Param, der nicht im Spec dokumentiert ist.

#### Capacity Card

| Live-Label | Live-Default | API-Property | API-Default (cat=3) | Bemerkung |
|---|---|---|---|---|
| Calculation mode | "State fixed capacity (adjust condensation temperature)" | `inputModeCapacity` | `3` (!) | Wert `3` nicht im `GET /inputcapacitymodes`-enum — Open Question |
| Capacity | `100` kW | `thermalCapacity` | `100000` (W) | ÷1000 W→kW (gleich wie Cold) |
| min. surface reserve | `-10` % | `tC_Tolerance_L` | `-10` | → wie Cold |
| max. surface reserve | `50` % | `tC_Tolerance_H` | `50` | → wie Cold |
| *(Frost thickness fehlt)* | — | — | — | Warm-Side hat **kein** Frost-Feld (correct: kein Frost bei Wärmeabgabe) |

#### Medium Card

| Live-Label | Live-Default | API-Property | API-Default (cat=3) | Bemerkung |
|---|---|---|---|---|
| ☐ Multiple circuits | unchecked | `noOfCircuitsThermo` | `1` | **Neu auf Warm-Side.** Checked → vermutlich `noOfCircuitsThermo=2` und aktiviert die `_2`-Suffix-Felder (zu verifizieren) |
| Medium (select) | R404A (GWP 3922 \| A1) | `fluidID` | `2012` | Dropdown via `GET /fluids?productCategory=3` (43 fluids für Condenser) |
| Hot gas temp. | `75` °C **(disabled, AUTO ☑)** | `fluidTempInlet` | `75` | **Neu auf Warm-Side.** Bei Condenser = Hot gas (heißer Gas-Eintritt), bei Evap = Verdampfungs-Temp. Gleiches Feld, anderer Kontext. |
| AUTO (neben Hot gas temp) | ☑ checked | `isHotGasAuto` | `true` | Bei `true` wird Hot gas temp deaktiviert (vom System berechnet). |
| Cond. temp. | `45` °C | `fluidTempCond` | `45` | **Neu auf Warm-Side**, zentrale Designtemperatur für Verflüssiger. |
| ● Dew point at inlet (DIN EN327) | selected | `fluidInputMode` | `3` | **Achtung:** DIN EN**327** (Condensers) statt EN**328** (Evaporators) — der Standard wechselt UI-side per Kategorie. API-Wert ist gleich (3). |
| ○ Mean | not selected | `fluidInputMode` | (other value) | Open Question |
| max. pressure drop in coil | `2` K **(disabled, AUTO ☑)** | `fluidPressureDropMax` | `2` | Warm-Side default `2`, Cold-Side default `5` |
| AUTO (neben pressure drop) | ☑ checked | `isMaxFluidPressureDropAuto` | `true` | → wie Cold |

#### Air Card

| Live-Label | Live-Default | API-Property | API-Default (cat=3) | Bemerkung |
|---|---|---|---|---|
| Air temp. | `32` °C | `airTemperature` | `32` | Warm-Side Default ist Außenluft-Sommer-Auslegungstemperatur, vs. Cold-Side `0` °C (Kühlraumumgebung) |
| Rel. humidity | `40` % | `airRelHumidity` | `40` | **Direkt sichtbar auf Warm-Side** (Cold-Side hat das im OPTIONS-Modal versteckt) |
| Altitude | `0` m | `altitude` | `0` | **Direkt sichtbar auf Warm-Side** (Cold-Side `2` m default und versteckt) |
| Button "OPTIONS" | — | — | — | → wie Cold |

### 6.W.2 — Unit Selection LIMITATIONS (Condenser)

| Live-Label | Live-Default | API-Property | API-Default (cat=3) | Bemerkung |
|---|---|---|---|---|
| Max. installation dimensions L × W × H | `20 m × 10 m × 20 m` | `unitLengthMax`/`unitWidthMax`/`unitHeightMax` | `20`/`10`/`20` | Warm-Side default `L=20` (Cold: `L=12`). |
| ☐ Transport by container (≤11.8m × 2.3m × 2.55m) | unchecked | `isContainerTransport` | `false` | **Neu auf Warm-Side.** Triggert vermutlich `containerTransportRail` und Dimensions-Validation. |
| Fin Specifications (select) | "Fin spacing:" | `finSpacingInputMode` | `0` | → wie Cold |
| Minimum / Maximum | `2 mm / 3 mm` | `finPitch0Min` / `finPitch0Max` | `2` / `3` | **Cold default ist 1.5/15, Warm default ist 2/3** — engerer Bereich für Condenser |
| Sound specifications (select) | "Max. sound pressure:" | `maxSoundInputMode` | `1` | → wie Cold |
| Maximum sound | `99 dB(A)` | `soundPressureMax` | `99` | → wie Cold |
| in | `10 m` | `soundPressureDistance` | `10` | **Warm-Side default `10 m`** (Cold: `3 m`) — größere Mess-Distanz für Außengeräte |
| tol. of max. sound pressure level | `3 dB(A)` | `maxSoundTolerance` | `3` | → wie Cold |
| min. no. of fans | `1` | `noOfFans` | `1` | → wie Cold |
| Delivery time | "Only available units" | `deliveryTimeFilter` | `-1` | → wie Cold |

### 6.W.3 — Unit Selection OPTIONS (Condenser)

Reihenfolge wie in Screenshots 3+4. **Wichtig:** Cold-Side hatte separate "Defrosting"-Optionen, die hier fehlen (`defrosting=0` auf Warm-Side). Stattdessen kommen Casing-, Subcooler-, Korrosionsschutz-Felder hinzu.

| Live-Label | Live-Default | UI-Type | API-Property | API-Default (cat=3) | Bemerkung |
|---|---|---|---|---|---|
| Only units compliant with ErP | ☑ | checkbox | `erP_Compliant` | `true` | → wie Cold |
| Power supply | "All 50Hz" | select | `powerSupply` | `3001` | → wie Cold |
| Motor technology [Impact-Leaf] | "Cost-optimised" | select | `motorTechnology` | `-3` | → wie Cold |
| Minimum energy efficiency class [Impact-Leaf] | "No" | select | `efficiencyClass` | `"--"` | → wie Cold |
| Max. operating pressure | "Standard" | select | `maxOperatingPressure` | `0` | → wie Cold |
| ☐ Special varnishing | unchecked | checkbox | `defaultIndoorVarnishing` / `defaultOutdoorVarnishing` | `0` / `0` | **Neu auf Warm-Side.** Triggert RAL-Feld. |
| RAL | `9003` (greyed, nur bei Special varnishing aktiv) | number | `ralNumber` | `9003` | RAL Farb-Code, vermutlich aus globaler RAL-Tabelle |
| Core tube material | "All" | select | `coreTubeMaterial` | `0` | → wie Cold |
| ☐ ESP | unchecked, `0 Pa` (greyed) | checkbox + number | `externalPressing` etc. | `0` | → wie Cold |
| ☐ Epoxy coated fins | unchecked | checkbox | `epoxy_Fins` | `0` | → wie Cold |
| ☐ Repair switch + 3 Sub-Selects | unchecked, "Preferably one per fan" / "Single-speed" / **"Near fan if possible"** | checkbox + 3 selects | `repairSwitch` + sub | — | **Sub-Option-Werte unterscheiden sich:** Cold-Side dritter Wert ist "At side", Warm-Side ist "Near fan if possible". |
| ☐ Wiring to terminal box | unchecked | checkbox | `wiring_To_Terminal_Box` | `0` | → wie Cold |
| ☐ Vibration Dampers | unchecked | checkbox | (?) | — | **Neu auf Warm-Side.** Für große/schwere Condenser-Aufstellung. Property-Name unbekannt — Open Question. |
| ☐ 1 set reduced legs | unchecked | checkbox | (?) | — | **Neu.** Open Question. |
| ☐ 1 set extended legs + "600 mm" | unchecked + select | checkbox + select | (?) | — | **Neu.** Open Question. |
| ☐ Inspection cover | unchecked | checkbox | (?) | — | **Neu.** Open Question. |
| ☐ Header cover | unchecked | checkbox | (?) | — | **Neu.** Open Question. |
| ☐ Multiple circuits | unchecked (greyed, weil oben in Thermodynamics gesteuert) | checkbox | `noOfCircuitsThermo` | `1` | Verlinkt zu Multiple circuits in Step 2 |
| ☐ Subcooler(s) integrated + "minimum required subcooling: 3 K" | unchecked + number | checkbox + number | (Subcooler-Property) + `miniumRequiredSubcooling` | — / `3` | **Neu auf Warm-Side.** `miniumRequiredSubcooling=3` ist der Default-K-Wert. |
| ☐ Tubing of integrated subcooler with syphon | unchecked (greyed außer wenn Subcooler aktiv) | checkbox | (?) | — | **Neu.** Open Question, Property-Name unbekannt. |
| ☐ Hinged fan plate | unchecked | checkbox | `hingedFanPlate` | `0` | → wie Cold (Cold heißt "Hinged fan units" — UI-Label-Variante) |
| ☐ Corrosion protection + "Güntner Protection 4" | unchecked + select | checkbox + select | `corrosionProtectionClass` | `0` | **Neu auf Warm-Side.** Mehrere Schutz-Stufen wählbar. |

### 6.W.4 — CONTROL/WIRING Section (Warm-Side ist deutlich umfangreicher als Cold-Side "Terminal Box")

Cold-Side hatte unter "TERMINAL BOX [WITH OPTIONS]" nur Motor-Tech + 5-Option-Radio + 0-10V-Checkbox + Wiring-Dropdown.
**Warm-Side hat eine sehr viel reichere "CONTROL/WIRING"-Section mit drei Unter-Sektionen:** Switch Cabinet/EC Fuse Box, Controller, Accessories/Options.

#### CONTROL/WIRING Master + Preselection

| Live-Label (Screenshots 4+5) | Live-Default | UI-Type | API-Property | Bemerkung |
|---|---|---|---|---|
| CONTROL/WIRING Master | ☑ checked [Impact-Leaf] | checkbox + accordion | `switchCabinet` ? | Bei `false` Section disabled |
| Motor Technology | "Cost-optimised" | select | `switchCabinetMotorTechnology` | → wie Cold |
| PRESELECTION Radio-Group (5 Optionen) | **"Switch cabinet (AC) or fuse box (EC) with control"** selected (other 4 NOT greyed in Warm-Side!) | radio | `switchCabinetType` ? | **Default unterscheidet sich von Cold-Side**: Cold default = "Wiring to terminal box", Warm default = "Switch cabinet ...". Außerdem: Warm hat alle 5 Optionen aktiv, Cold hatte nur "Wiring" aktiv. |
| ↳ Controller (EC) | ○ | radio | — | |
| ↳ Switch cabinet (AC) or fuse box (EC) with control | **● selected** | radio | — | Default |
| ↳ Control panel (AC) with fans wired to contactor (slave control) | ○ | radio | — | |
| ↳ Wiring to terminal box (electrical connection and control signals) | ○ | radio | — | |
| ↳ Fuse box with circuit breaker + signals (EC) / Motor start protection + thermo contact (AC) | ○ | radio | — | |
| ☑ Switch cabinet and controller respectively have to be mountable to unit | checked | checkbox | (?) | **Neu** Open Question |
| ☑ Mounted and wired at factory | checked | checkbox | `mountedAndWired` | **Neu** |

#### SWITCH CABINET / EC FUSE BOX Sub-Section

| Live-Label | Live-Default | UI-Type | API-Property |
|---|---|---|---|
| ☐ Bypass for continuous controller required | unchecked | checkbox | `controllerByPassObligatory` ? |
| ☐ Fuse box / control cabinet with main switch instead of power terminals | unchecked | checkbox | `ecJunctionBoxWithMainSwitch` ? |
| allocation | "AUTO" | select | `controllerAllocation` ? |
| system | "AUTO" | select | (?) |
| fan protection | "Group connection" | select | `fanFuseSpec` ? |

#### CONTROLLER Sub-Section

| Live-Label | Live-Default | UI-Type | API-Property |
|---|---|---|---|
| ☐ for noise-sensitive applications | unchecked | checkbox | (?) |
| ☐ For energy-saving application | unchecked | checkbox | (?) |
| allocation | "Per unit one controller" | select | `controllerAllocation` ? |
| controller type [Impact-Leaf] | "Speed control" | select | `controllerType` |

#### ACCESSORIES/OPTIONS Sub-Section

| Live-Label | Live-Default | UI-Type | API-Property |
|---|---|---|---|
| Thermal contact | "AUTO" | select | (?) |
| Temperature sensor | "AUTO" | select | (?) |
| interface | "No interface" | select | `controllerInterface` |
| ☐ aicore™ link (IoT module) | unchecked | checkbox | (?) |

### 6.W.5 — EMPTY CASING Section (nur auf Warm-Side, optional)

Master-Checkbox aktiviert ein Empty-Casing/Gehäuse-Bestell-Modul. Wenn aktiv, werden manche der Series-Cards rot (Filter-Inkompatibilität).

| Live-Label (Screenshot 6) | Live-Default | UI-Type | API-Property | API-Default (cat=3) |
|---|---|---|---|---|
| EMPTY CASING Master | ☑ checked | checkbox + accordion | (?) | — |
| Casing length | "1000 mm" | select | `emptyCasingLength` | `0` |
| Casing height | "1050 mm" | select | `emptyCasingHeight` | `0` |
| ☐ With sound insulation | unchecked | checkbox | (?) | — |
| ☐ With bottom sheet | unchecked | checkbox | (?) | — |

**Hinweis:** Master-Toggle aktiviert wechselt die Series-Filter-Logik — sichtbare Series werden zu nicht-validen reduziert, weil Empty-Casing ein bestimmtes Series-Set verlangt.

### 6.W.6 — Series-Liste (Condenser)

`POST /unitgroup` mit cat=3-Default-Body liefert **9 Series**, davon 8 sichtbar (`visible=true`) und alle 8 mit `validationResult=true`:

| `unitGroupID` | Display-Name | Beschreibung |
|---|---|---|
| `GCHC_3E` | Flat COMPACT - GCHC | Condenser – horizontal design, compact |
| `GCVC_3E` | Vertical COMPACT - GCVC | Condenser – vertical design, compact |
| `GCDC_2E` | V-shape COMPACT - GCDC | Condenser – V-shape, compact |
| `GCHV_3E` | Flat VARIO - GCHV | Condenser – horizontal design, variable |
| `GCVV_3E` | Vertical VARIO - GCVV | Condenser – vertical design, variable |
| `GVW_4E` | V-shape VARIO - GVW | W aircooled condensers |
| `GVD_5E` | V-shape VARIO - GVD | Aircooled condensers (V-shape) |
| `GCDV_1E` | V-shape VARIO - GCDV | Condenser – V-shape, variable |

Pre-Selected (✓ in Live-UI) sind die zwei aus `defaultinputdata.units = ["GCHC_3E", "GCHV_3E"]`.

---

## 6.W.D — Dry cooler-Variante (cat=4) — Hybrid Coolant + Warm-Side

Verifiziert anhand 6 Screenshots vom 2026-05-20 + `defaultinputdata?productcategory=4`-Probe. **Architektur-Hybrid:** Coolant-Medium-Konfiguration (wie Air Cooler Coolant cat=2) kombiniert mit Warm-Side-Air und Warm-Side-Options (wie Condenser cat=3).

**Anwendungsfall:** Sekundärer Glykol-Kreislauf wird zur Außenluft hin gekühlt. Brine kommt warm rein (45 °C), geht etwas kühler raus (40 °C) — Wärmeabgabe an Außenluft (32 °C).

### 6.W.D.1 — Thermodynamics (Dry cooler)

**Capacity Card:**

| Live-Label | Live-Default | API-Property | API-Default (cat=4) | Bemerkung |
|---|---|---|---|---|
| Calculation mode | **"State fixed capacity (adjust surface reserve)"** | `inputModeCapacity` | (zu verifizieren) | **Wichtig:** zurück zum Cold-Style-Label "adjust surface reserve" — nicht "adjust condensation temperature" wie bei Condenser! Dry cooler funktioniert über Surface-Reserve, nicht Kondensationstemperatur. |
| Capacity | **`300`** kW | `thermalCapacity` | `300000` | ÷1000 W→kW. Sehr hoch (vs. Condenser 100 kW, Cold-Side 5-10 kW). |
| min/max surface reserve | -10/50 % | `tC_Tolerance_L`/`H` | -10/50 | → wie alle |
| *(kein Frost thickness)* | — | — | — | Warm-Side hat kein Frost |

**Medium Card** — Coolant-Style (wie Air Cooler Coolant cat=2):

| Live-Label | Live-Default | API-Property | API-Default (cat=4) | Bemerkung |
|---|---|---|---|---|
| Medium [Impact-Leaf] | "Ethylene glycol" | `fluidID` | `4` | Coolant-Liste (5 Fluids: Wasser, Ethanol, Ethylene/Propylene Glycol, Thermogen) — **gleiche Liste wie cat=2** |
| Concentration | `34` Vol.% | `fluidVolConcentration` | `34` | → wie cat=2 |
| Parameter mode | "Inlet/Outlet temperature" | `fluidInputMode` | `0` | → wie cat=2 |
| Inlet temp. | `45` °C | `fluidTempInlet` | `45` | **Warm-Brine-Eintritt** (kommt heiß aus dem Kühlkreislauf) |
| Outlet temp. | `40` °C | `fluidTempCond` | `40` | **Bestätigt:** `fluidTempCond` = "Outlet temp." (auch für Coolant-Flows). Cat=4 gibt API-Default `40` zurück, was zum Live-UI passt — bestätigt die Mapping-Hypothese aus Coolant cat=2 (dort war API=`40`, UI=`0`, vermutlich Live-UI-Override). |
| max. pressure drop in coil | `1` bar (disabled, AUTO ☑) | `fluidPressureDropMax` | `1000` | API in mbar, UI in bar (÷1000) — wie cat=2 |
| ☑ AUTO | **checked** | `isMaxFluidPressureDropAuto` | `true` | Wie DX/Pump, anders als cat=2 (dort unchecked) |

**Air Card** — Warm-Side-Layout (alle drei Felder sichtbar):

| Live-Label | Live-Default | API-Property | API-Default (cat=4) | Bemerkung |
|---|---|---|---|---|
| Air temp | `32` °C | `airTemperature` | `32` | → wie Condenser |
| Rel. humidity | `40` % | `airRelHumidity` | `40` | **Direkt sichtbar** wie Warm-Side |
| Altitude | `0` m | `altitude` | `0` | **Direkt sichtbar** wie Warm-Side |
| OPTIONS-Button | — | — | — | → wie alle |

**Keine Bottom-Card-Humidity-Faktor** (Warm-Side hat das nicht).

### 6.W.D.2 — Unit Selection LIMITATIONS (Dry cooler)

| Live-Label | Live-Default | API-Property | API-Default (cat=4) | Bemerkung |
|---|---|---|---|---|
| Max. installation L × W × H | `20 × 10 × 20` m | `unitLengthMax`/`unitWidthMax`/`unitHeightMax` | `20`/`10`/`20` | Warm-Side L=20 |
| ☐ Transport by container (≤11.8m × 2.3m × 2.55m) | unchecked | `isContainerTransport` | `false` | → wie Condenser |
| Fin Specifications | "Fin spacing:" | `finSpacingInputMode` | `0` | → wie alle |
| Min / Max Fin | `1.5 / 8 mm` | `finPitch0Min` / `finPitch0Max` | `1.5` / `8` | **Dry cooler eigene Range** (DX: 1.5/15, Condenser: 2/3, Dry: 1.5/8) |
| Sound specifications | "Max. sound pressure:" / `99 dB(A)` / `10 m` | `soundPressureMax`/`soundPressureDistance` | `99` / `10` | → wie Condenser |
| tol. of max. sound pressure level | `3 dB(A)` | `maxSoundTolerance` | `3` | → wie alle |
| min. no. of fans | `1` | `noOfFans` | `1` | → wie alle |
| ☐ **Connections on one side** | unchecked | (?) | — | **Neu, NUR für Dry cooler.** Property unbekannt — Open Question. |
| Delivery time | "Only available units" | `deliveryTimeFilter` | `-1` | → wie alle |

### 6.W.D.3 — Unit Selection OPTIONS (Dry cooler)

Subset / Variation der Condenser-Optionen. Unterschiede gegenüber Condenser:

| Feld | Condenser (cat=3) | Dry cooler (cat=4) |
|---|---|---|
| Special varnishing + RAL | ✓ | ✓ → wie Condenser |
| Core tube material | ✓ (sichtbar) | **✗ (nicht im Screenshot)** |
| Air blow direction | ✓ (Standard) | **✗ (nicht im Screenshot)** |
| Defrosting | ✗ (Warm) | ✗ (Warm) |
| Vibration Dampers | ✓ | ✓ |
| 1 set reduced/extended legs | ✓ | ✓ |
| Inspection cover / Header cover | ✓ | ✓ |
| Multiple circuits | ☐ aktiv | ☐ **greyed** — bei Dry cooler nicht wählbar |
| Subcooler integrated | ✓ | **✗** (Dry cooler hat keine Subcooler-Option) |
| Tubing of integrated subcooler with syphon | ✓ | **✗** |
| Hinged fan plate | ✓ | ✓ |
| ☐ **Ball valve 1/2" for ventilation/drain** | ✗ | **✓ NEU** — Coolant-Loop braucht Entlüftungs-/Entwässerungs-Ventil. Property unbekannt. |
| Corrosion protection | ✓ | ✓ |
| Air sock / Coil Defender | ✗ | ✗ |

Repair switch Sub-Option (dritte): "Near fan if possible" wie Condenser (nicht "At side" wie Cold).

### 6.W.D.4 — THREAD/FLANGE CONNECTIONS (Dry cooler)

**Identisch zur Air Cooler Coolant cat=2** (logisch: beide haben Coolant-Brine-Anschluss):

| Live-Label | Live-Default | API-Property | Bemerkung |
|---|---|---|---|
| THREAD/FLANGE CONNECTIONS Master | ☑ checked | (?) | |
| Connection type | "Lapped flanges" | `connectionType` ? | |
| ● With brazing neck PN10 | selected | (?) | |

### 6.W.D.5 — CONTROL/WIRING (Dry cooler) — Volle 3-Sub-Section-Struktur wie Condenser

**Identisch zu Condenser cat=3 — alle 3 Sub-Sektionen** (Switch Cabinet/EC Fuse Box, Controller, Accessories/Options) mit gleichen Defaults. Inkl. PRESELECTION-Radio default "Switch cabinet (AC) or fuse box (EC) with control".

### 6.W.D.6 — EMPTY CASING — fehlt

Dry cooler hat **kein** EMPTY CASING — nur Condenser hat das (bisher).

### 6.W.D.7 — Series-Liste (Dry cooler)

**7 Series, alle `GF*` Präfix** (Fluid cooler), `defaultinputdata.units = ["GFHC_2E", "GFHV_3E"]`:

| `unitGroupID`-Prefix | Display-Name | Beschreibung |
|---|---|---|
| `GFHC_2E` | Flat COMPACT - GFHC | Fluid cooler – horizontal design, compact ← ✓ |
| `GFVC_*` | Vertical COMPACT - GFVC | Fluid cooler – vertical design, compact |
| `GFDC_*` | V-shape COMPACT - GFDC | Fluid cooler – V-shape, compact |
| `GFHV_3E` | Flat VARIO - GFHV | Fluid cooler – horizontal design, variable ← ✓ |
| `GFVV_*` | Vertical VARIO - GFVV | Fluid cooler – vertical design, variable |
| `GFW_*` | V-shape VARIO - GFW | W dry coolers |
| `GFD_*` | V-shape VARIO - GFD | Dry coolers (V-shape coil) |
| `GFDV_*` | V-shape VARIO - GFDV | Fluid cooler – V-shape, variable |

---

## 6.W.O — Oil cooler-Variante (cat=6) — Klasse-E mit Oil-Fluid

Verifiziert anhand 6 Screenshots vom 2026-05-20 + `defaultinputdata?productcategory=6`-Probe. **Klasse E (Coolant-Warm)** wie Dry cooler, aber mit **Oil-Fluid-Subset** statt Glykol — entsprechend fehlt das Concentration-Feld, und die OPTIONS sind reduziert.

**Anwendungsfall:** Kühlung von Maschinen-Schmieröl (Kompressor-Öl, Hydraulik-Öl) an die Außenluft. Sehr heiße Öl-Temperaturen (80 °C rein, 70 °C raus).

### 6.W.O.1 — Thermodynamics (Oil cooler)

**Capacity Card:**

| Live-Label | Live-Default | API-Property | API-Default (cat=6) | Bemerkung |
|---|---|---|---|---|
| Calculation mode | "State fixed capacity (adjust surface reserve)" | `inputModeCapacity` | (zu verifizieren) | → wie Dry cooler |
| Capacity | **`20`** kW | `thermalCapacity` | `20000` | ÷1000 W→kW. Kleiner als Condenser (100) / Dry cooler (300) |

**Medium Card** — Oil-Variante:

| Live-Label | Live-Default | API-Property | API-Default (cat=6) | Bemerkung |
|---|---|---|---|---|
| Medium [Impact-Leaf] | "Bitzer BSE 170" | `fluidID` | `1002` | **Oil-Fluid-Liste** statt Glykol. 7 Fluids verfügbar: `1000` Bitzer B100, `1001` Bitzer B150 SH, `1002` Bitzer BSE 170 (default), `1003` ISO VG46, `1004` ISO VG32, `1005` Shell T46, `1006` ISO VG68. Alle fluidIDs in der `1xxx`-Range (vs. `2xxx` für Refrigerants, `1`-`19` für Coolants). |
| *(KEIN Concentration-Feld)* | — | `fluidVolConcentration` | `34` (legacy) | **Oil cooler zeigt das Feld NICHT** — weil Öl nicht mit Wasser gemischt wird. API hat trotzdem den Default-Wert `34`, der einfach ignoriert wird. |
| Parameter mode | "Inlet/Outlet temperature" | `fluidInputMode` | `0` | → wie Dry cooler |
| Inlet temp. | `80` °C | `fluidTempInlet` | `80` | **Sehr heiß** — kompressor-warmes Öl |
| Outlet temp. | `70` °C | `fluidTempCond` | `40` (UI-Override) | Default-API ist `40` (wie immer), UI override auf `70` (Δ=10K Kühlung) |
| max. pressure drop in coil | `1` bar (disabled, AUTO ☑) | `fluidPressureDropMax` | `1000` | → wie Dry cooler |
| ☑ AUTO | checked | `isMaxFluidPressureDropAuto` | (zu verifizieren) | → wie Dry cooler |

**Air Card** — Warm-Side:

| Live-Label | Live-Default | API-Property | API-Default (cat=6) | Bemerkung |
|---|---|---|---|---|
| Air temp. | `35` °C | `airTemperature` | `35` | **`35` °C statt `32` °C** — Oil cooler oft in industriellen Umgebungen mit höherer Umgebungstemperatur |
| Rel. humidity | `40` % | `airRelHumidity` | `40` | → wie Warm-Side |
| Altitude | `0` m | `altitude` | (zu verifizieren) | → wie Warm-Side |

### 6.W.O.2 — Unit Selection LIMITATIONS (Oil cooler)

Identisch zu Dry cooler:
- L × W × H: 20 × 10 × 20 m
- Transport by container (unchecked)
- Fin Specifications: Min 1.5 mm / Max **8 mm** (wie Dry cooler)
- Sound: 99 dB(A) / 10 m (greyed)
- tol.: 3 dB(A), min. fans: 1
- ☐ **Connections on one side** (wie Dry cooler)
- Delivery time: Only available units

### 6.W.O.3 — Unit Selection OPTIONS (Oil cooler) — **Reduziert vs. Dry cooler**

| Feld | Dry cooler (cat=4) | Oil cooler (cat=6) |
|---|---|---|
| Only units compliant with ErP | ✓ | ✓ |
| Power supply | ✓ | ✓ |
| Motor technology | ✓ | ✓ |
| Min energy efficiency class | ✓ | ✓ |
| Max operating pressure | ✓ | ✓ |
| Special varnishing + RAL | ✓ | ✓ |
| ESP | ✓ | ✓ |
| Epoxy coated fins | ✓ | ✓ |
| Repair switch + 3 Sub-Selects | "Preferably **one per fan**" / "Single-speed" / "Near fan **if possible**" | "Preferably **wired in pairs**" / "Single-speed" / "**Near fan**" |
| Wiring to terminal box | ✓ | ✓ |
| Vibration Dampers | ✓ | ✓ |
| 1 set reduced/extended legs | ✓ | ✓ |
| Inspection cover | ✓ | **✗ fehlt** |
| Header cover | ✓ | **✗ fehlt** |
| Multiple circuits | ✓ (greyed) | ✓ (greyed) |
| Hinged fan plate | ✓ | **✗ fehlt** |
| Ball valve 1/2" for ventilation/drain | ✓ | **✗ fehlt** |
| Corrosion protection + Schutz-Klasse | ✓ | **✗ fehlt** |
| Subcooler | ✗ | ✗ |
| Tubing of integrated subcooler with syphon | ✗ | ✗ |

**Oil-cooler hat ~6 OPTIONS weniger als Dry cooler.** Vermutete Erklärung: kleinere Bauformen (nur 2 Series), kompakte Hardware ohne Bedarf für Spezial-Optionen wie Hinged-fan-plate oder Ball-valve.

### 6.W.O.4 — THREAD/FLANGE CONNECTIONS + CONTROL/WIRING

**Beide identisch zu Dry cooler / Condenser** (PRESELECTION default: "Switch cabinet (AC) or fuse box (EC) with control", 3-Sub-Section-Struktur, Mounted+Wired-at-factory checked).

### 6.W.O.5 — Series-Liste (Oil cooler)

**Nur 2 Series** (sehr beschränkte Hardware), `defaultinputdata.units = ["GOHC_2E"]`:

| `unitGroupID` | Display-Name | Beschreibung |
|---|---|---|
| `GOHC_2E` | Flat COMPACT - GOHC | Oil cooler – horizontal design, compact ← ✓ Pre-Selected |
| `GOVC_*` | Vertical COMPACT - GOVC | Oil cooler – vertical design, compact |

Series-Prefix `GO*` = Oil cooler-spezifisch (nur 2 Bauformen verfügbar).

### 6.W.O.6 — EMPTY CASING — fehlt (wie Dry cooler)

---

## 6.W.S — Subcooler-Variante (cat=5) — Hybrid Refrigerant + Inlet/Outlet

Verifiziert anhand 5 Screenshots vom 2026-05-20 + `defaultinputdata?productcategory=5`-Probe. **Architektur-Hybrid:** Refrigerant-Fluid (wie Condenser cat=3), aber **Coolant-Style Parameter mode + Inlet/Outlet temperatures** statt Phase-Change-Setup. Reduzierte OPTIONS-Liste (wie Oil cooler). **Keine THREAD/FLANGE-Section** (weil Refrigerant-Anschluss, kein Brine-Brazing).

**Anwendungsfall:** Nachkühlung von Refrigerant nach dem Verflüssiger — reine Sensible-Heat-Abgabe ohne Phasenwechsel.

### 6.W.S.1 — Thermodynamics (Subcooler)

**Capacity Card:**

| Live-Label | Live-Default | API-Property | API-Default (cat=5) | Bemerkung |
|---|---|---|---|---|
| Calculation mode | "State fixed capacity (adjust surface reserve)" | `inputModeCapacity` | (zu verifizieren) | Wie Cold-Style (NICHT "adjust condensation temperature" wie Condenser) |
| Capacity | **`50`** kW | `thermalCapacity` | `50000` | ÷1000 W→kW. Mittlere Größe (zwischen Oil cooler 20 und Condenser 100). |

**Medium Card** — Hybrid:

| Live-Label | Live-Default | API-Property | API-Default (cat=5) | Bemerkung |
|---|---|---|---|---|
| Medium [Impact-Leaf] | "R404A (GWP 3922 \| A1)" | `fluidID` | `2012` | **Refrigerant-Liste** (41 Fluids in 2xxx-ID-Range) — wie Condenser. Aber: |
| Parameter mode | **"Inlet/Outlet temperature"** | `fluidInputMode` | `0` | **Coolant-Style** statt Refrigerant-Dew-Point — entscheidende Architektur-Variante. Refrigerant durchläuft den Subcooler ohne Phasenwechsel (kondensiert nicht). |
| Inlet temp. | `45` °C | `fluidTempInlet` | `45` | Heiße Refrigerant-Seite (kommt vom Condenser-Output) |
| Outlet temp. | `40` °C | `fluidTempCond` | `40` | Gekühlte Seite (gleicher Wert wie API-Default!) — Subcooler kühlt um 5 K |
| max. pressure drop in coil | `0.5` bar (disabled, AUTO ☑) | `fluidPressureDropMax` | `500` | **API in mbar `500` = UI `0.5` bar.** Default niedriger als bei Dry/Oil cooler (`1000`). |
| ☑ AUTO | checked | `isMaxFluidPressureDropAuto` | (true zu verifizieren) | → wie Dry cooler |

**Fehlende Felder gegenüber Condenser (cat=3):**
- ✗ Multiple circuits Checkbox (`noOfCircuitsThermo=1` immer)
- ✗ Hot gas temp / AUTO (kein Phasenwechsel)
- ✗ Cond. temp.
- ✗ Dew point / Mean Radio
- ✗ DIN EN327-Label

**Air Card** — Warm-Side:

| Live-Label | Live-Default | API-Property | API-Default (cat=5) | Bemerkung |
|---|---|---|---|---|
| Air temp. | `32` °C | `airTemperature` | `32` | → wie Condenser |
| Rel. humidity | `40` % | `airRelHumidity` | `40` | → wie Warm-Side (direkt sichtbar) |
| Altitude | `0` m | `altitude` | `0` | → wie Warm-Side |

### 6.W.S.2 — Unit Selection LIMITATIONS (Subcooler)

Identisch zu Oil cooler:
- L × W × H: 20 × 10 × 20 m
- ☐ Transport by container
- Fin Specifications: Min 1.5 / Max **8 mm** (wie Oil/Dry, NICHT 2/3 wie Condenser)
- Sound: 99 dB(A) / 10 m (greyed)
- tol.: 3 dB(A), min. fans: 1
- ☐ **Connections on one side** (wie Dry/Oil cooler)

### 6.W.S.3 — Unit Selection OPTIONS — Reduziert wie Oil cooler

| Feld | Condenser (3) | Subcooler (5) |
|---|---|---|
| Only units compliant with ErP | ✓ | ✓ |
| Power supply, Motor tech, Min efficiency, Max op pressure | ✓ | ✓ |
| Special varnishing + RAL | ✓ | ✓ |
| Core tube material | ✓ | **✗** |
| Air blow direction | ✓ | **✗** |
| ESP | ✓ | ✓ |
| Epoxy coated fins | ✓ | ✓ |
| Repair switch + 3 Sub | "Prefer one per fan" / "Single-speed" / "Near fan if possible" | "Prefer **wired in pairs**" / "Single-speed" / "**Near fan**" |
| Wiring to terminal box | ✓ | ✓ |
| Vibration Dampers | ✓ | ✓ |
| 1 set reduced/extended legs | ✓ | ✓ |
| Multiple circuits | ✓ (aktiv) | ✓ (**greyed**, immer 1) |
| Inspection cover | ✓ | **✗** |
| Header cover | ✓ | **✗** |
| Subcooler integrated | ✓ | **✗ (logisch — IST der Subcooler)** |
| Tubing of integrated subcooler with syphon | ✓ | **✗** |
| Hinged fan plate | ✓ | **✗** |
| Corrosion protection | ✓ | **✗** |
| Ball valve 1/2" | ✗ | **✗** |

Repair-Switch-Sub-Options identisch zu Oil cooler ("Preferably wired in pairs" / "Single-speed" / "Near fan"). Subcooler-OPTIONS-Set ist eine echte Untermenge von Oil cooler — alle Oil-fehlenden Felder fehlen auch im Subcooler, plus noch Core tube material und Air blow direction.

### 6.W.S.4 — THREAD/FLANGE CONNECTIONS — **fehlt komplett**

Im Gegensatz zu Dry cooler / Oil cooler / Air Cooler Coolant: **Subcooler hat keine THREAD/FLANGE CONNECTIONS-Section.** Logisch — Subcooler arbeitet mit Refrigerant-Leitungen (Bördel/Hartlöten), nicht mit Brine-Flanschen.

### 6.W.S.5 — CONTROL/WIRING (Subcooler) — Volle 3-Sub-Section-Struktur

**Identisch zu Condenser / Dry cooler / Oil cooler** — alle drei Sub-Sektionen (Switch Cabinet/EC Fuse Box, Controller, Accessories/Options) mit gleichen Defaults. PRESELECTION-Default: "Switch cabinet (AC) or fuse box (EC) with control".

### 6.W.S.6 — EMPTY CASING — fehlt

Wie Dry/Oil cooler, kein EMPTY CASING.

### 6.W.S.7 — Series-Liste (Subcooler)

**Nur 2 Series**, `defaultinputdata.units = ["GSHC_3E"]`:

| `unitGroupID` | Display-Name | Beschreibung |
|---|---|---|
| `GSHC_3E` | Flat COMPACT - GSHC | Subcooler – horizontal design, compact ← ✓ Pre-Selected |
| `GSVC_*` | Vertical COMPACT - GSVC | Subcooler – vertical design, compact |

Series-Prefix `GS*` = Subcooler-spezifisch.

---

## 6.W.G — CO2 Gas Cooler-Variante (cat=10) — Klasse F: Dual-Mode (Supercritic + Subcritic)

Verifiziert anhand 6 Screenshots vom 2026-05-20 + `defaultinputdata?productcategory=10`-Probe. **Einzigartige Architektur:** Die Thermodynamics-Page zeigt **zwei komplett unabhängige Operating Modes** parallel, beide gleichzeitig konfigurierbar via separate Master-Checkboxen.

**Anwendungsfall:** Transkritischer CO2-Zyklus, der je nach Außentemperatur sub- oder superkritisch fährt:
- **Supercritic Mode** (warm): Ambient > ~25 °C, CO2 ist überhalb seines kritischen Punktes (~31 °C/74 bar). Kein klassisches Kondensieren, nur Sensible-Heat-Abgabe bei hohem Druck.
- **Subcritic Mode** (kalt): Ambient < ~25 °C, CO2 kondensiert normal wie ein klassischer Condenser.

### 6.W.G.0 — `_2`-Suffix-Mystery aufgelöst ✓

Aus cat=10-Probe ergibt sich endgültig: Die `_2`-Suffix-Felder sind **NICHT** für Multiple-circuits / Dual-Fluid-Cascade (wie ursprünglich vermutet), sondern **redundante Duplikate der `subcritic*`-Felder** speziell für die CO2-Dual-Mode-Operation. Werte sind 1:1 identisch:

| `_2`-Suffix | `subcritic*` | Wert (cat=10) | Bedeutung |
|---|---|---|---|
| `thermalCapacity_2 = 130000` | `subcriticThermalCapacity = 130000` | Beide gleich | Subcritic Capacity |
| `fluidTempInlet_2 = 58` | `subcriticFluidTempInlet = 58` | Beide gleich | Subcritic Hot gas temp |
| `fluidTempCond_2 = 15` | `subcriticFluidTempCond = 15` | Beide gleich | Subcritic Cond. temp |
| `fluidID_2 = 2010` | — | CO2 (R744) | Underlying-Fluid-Referenz |

In allen anderen Kategorien (cat=0,1,2,3,4,5,6) sind alle `_2`-Felder im Default-State **`0`** — sie werden nicht genutzt. Vermutet: API hält `_2`-Felder aus Legacy-Gründen, der eigentliche Subcritic-Datenfluss läuft über `subcritic*`-Felder.

### 6.W.G.1 — Thermodynamics SUPERCRITIC MODE (oberer Bereich)

**Master-Toggle:** ☑ "Gascooler / supercritic" — checked (steuert vermutlich `isSupercritic`).

| Live-Label | Live-Default | API-Property | API-Default (cat=10) | Bemerkung |
|---|---|---|---|---|
| Calculation mode | "State fixed capacity (adjust surface reserve)" | `inputModeCapacity` | (zu verifizieren) | Wie Cold/Subcooler-Style |
| min/max surface reserve | -10 / 50 % | `tC_Tolerance_L/H` | -10 / 50 | → wie alle |
| ☑ **Gascooler / supercritic** Master | checked | `isSupercritic` | `true` | **Neu, nur cat=10.** Wenn unchecked: Supercritic-Felder deaktivieren. |
| Capacity | `180` kW | `thermalCapacity` | `180000` | ÷1000 W→kW. Höchste Capacity aller Kategorien. |
| Medium [Impact-Leaf] | "CO2 (R744)" (**greyed**) | `fluidID` | `41` (!) | **Sonderfall:** `fluidID=41` ist KEINE Standard-Refrigerant-ID. Vermutlich Pseudo-ID für "CO2 supercritic mode". Underlying-Refrigerant via `fluidID_2=2010` (R744). Dropdown ist disabled — keine Auswahl. |
| **Pressure** | `92000` mbar (= 92 bar) | `fluidPressure` | `92000` | **Neu, nur Supercritic.** Hochdruck-Eingangsdruck — bei CO2-Supercritic typisch 80-120 bar. Einheit mbar (÷1000 für bar). |
| Inlet temp. | `120` °C | `fluidTempInlet` | `120` | **Sehr heiß** — Kompressor-Output bei CO2-Supercritic |
| Outlet temp. | `36` °C | `fluidTempCond` | `40` (UI-Override) | API-Default 40, UI zeigt 36 — UI-Override |
| max. pressure drop in coil | `2.5` bar | `fluidPressureDropMax` | `2500` | mbar → bar (÷1000). Höher als andere Kategorien wegen Hochdruck-CO2. |
| ☐ AUTO (neben pressure drop) | **unchecked** | `isMaxFluidPressureDropAuto` | (false zu verifizieren) | Standardmäßig AUS bei Supercritic |
| `fluidInputMode` | (implizit) | `fluidInputMode` | `0` | "Inlet/Outlet temperature" Mode |

**Air Card (Supercritic):**

| Live-Label | Live-Default | API-Property | API-Default | Bemerkung |
|---|---|---|---|---|
| Air temp. | `34` °C | `airTemperature` | `34` | Sommer-Auslegungstemp (>kritisch) |
| Rel. humidity | `40` % | `airRelHumidity` | `40` | → wie Warm-Side |
| Altitude | `0` m | `altitude` | `0` | → wie Warm-Side |

### 6.W.G.2 — Thermodynamics SUBCRITIC MODE (unterer Bereich)

**Master-Toggle:** ☑ "Condenser / subcritic" — checked (steuert vermutlich `isSubcritic`).

| Live-Label | Live-Default | API-Property | API-Default (cat=10) | Bemerkung |
|---|---|---|---|---|
| ☑ **Condenser / subcritic** Master | checked | `isSubcritic` | `true` | **Neu, nur cat=10.** |
| Capacity | `130` kW | `subcriticThermalCapacity` | `130000` | Sub-Capacity ist eigenes Feld! |
| Medium | "CO2 (R744)" (greyed) | (gleich wie supercritic) | — | Implizit CO2 |
| Hot gas temp. | `58` °C (disabled, AUTO ☑) | `subcriticFluidTempInlet` | `58` | → analog zu Condenser, aber eigenes Subcritic-Feld |
| ☑ AUTO (neben Hot gas temp) | checked | `subcriticIsHotGasAuto` | `true` | → wie Condenser |
| Cond. temp. | `15` °C | `subcriticFluidTempCond` | `15` | **Niedriger als bei Condenser** (Condenser default = 45 °C) — Subcritic-CO2 kondensiert bei niedrigerem Temp |
| max. pressure drop in coil | `0` K (disabled) | `subcriticFluidPressureDropMax` | `0` | Default 0, mit AUTO |
| ☑ AUTO (neben pressure drop) | checked | `isSubcriticMaxFluidPressureDropAuto` | `true` | |

**Air Card (Subcritic):**

| Live-Label | Live-Default | API-Property | API-Default | Bemerkung |
|---|---|---|---|---|
| Air temp. | `5` °C | `subcriticAirTemperature` | `5` | **Winter-Bedingung** (vs. Supercritic 34 °C). Bei kalter Außenluft fährt CO2 sub-kritisch. |
| Rel. humidity | `40` % | `subcriticAirRelHumidity` | `40` | Eigenes Subcritic-Feld |
| Altitude | `0` m | (gleich wie supercritic?) | `0` | Vermutlich gleicher Wert für beide Modi |
| OPTIONS-Button | — | — | — | |

### 6.W.G.3 — Unit Selection LIMITATIONS (CO2 Gas cooler)

| Feld | Default | Bemerkung |
|---|---|---|
| Max. installation L × W × H | 20 × 10 × 20 m | → wie alle Warm-Side |
| ☐ Transport by container | unchecked | → wie alle Warm-Side |
| Fin Specifications | Fin spacing / 1.5 / 8 mm | → wie Dry/Oil/Subcooler |
| Sound | 99 dB(A) / 10 m | → wie alle Warm-Side |
| tol., min fans | 3 dB(A), 1 | → wie alle |
| **KEIN "Connections on one side"** | — | **Unterschied zu Dry/Oil/Subcooler.** CO2-Hochdruck-Anlagen brauchen das nicht. |

### 6.W.G.4 — Unit Selection OPTIONS (CO2 Gas cooler) — Unique Mix

| Feld | Default | Bemerkung |
|---|---|---|
| Only units compliant with ErP | ☑ | → wie alle |
| Power supply, Motor tech, Max op pressure, Min efficiency, Special varnishing + RAL | (Standard) | → wie Condenser |
| **Connection tube material** | "Standard" | **Neu, nur cat=10.** Andere Bezeichnung als "Core tube material" (Condenser). Hochdruck-Tube-Material-Wahl. |
| ESP, Epoxy coated fins, Wiring, Vibration Dampers, 1 set reduced/extended legs | (Standard) | → wie Condenser |
| Repair switch + 3 Sub | "Preferably one per fan" / "Single-speed" / "Near fan if possible" | → wie Condenser/Dry cooler (NICHT wie Oil/Subcooler) |
| ☑ **HBLK valve + "Standard Quantity"** | **checked default** | **Neu, nur cat=10.** HBLK = Hochdruck-Block-Valve für CO2-Anlagen. Kritischer Bestandteil bei Supercritic-Betrieb. Property unbekannt — Open Question. |
| Inspection cover, Header cover | unchecked | → wie Condenser |
| Multiple circuits | greyed | Bei cat=10 nicht wählbar |
| Hinged fan plate, Corrosion protection | unchecked | → wie Condenser |
| **KEIN Subcooler integriert** | — | Logisch — Gas cooler IST kein Condenser |
| **KEIN Ball valve** | — | → wie Subcooler/Condenser (nur Dry cooler hat das) |
| **KEINE THREAD/FLANGE-Section** | — | CO2-Hochdruckleitungen nutzen spezielle Verbindungen, nicht die Brine-Flansche |
| **KEIN EMPTY CASING** | — | → wie Dry/Oil/Subcooler |

### 6.W.G.5 — CONTROL/WIRING — Volle 3-Sub-Section-Struktur

Identisch zu Condenser/Dry/Oil/Subcooler. PRESELECTION-Default "Switch cabinet (AC) or fuse box (EC) with control", Mounted+Wired-at-factory checked.

### 6.W.G.6 — Series-Liste (CO2 Gas cooler)

**5 Series**, `defaultinputdata.units = ["GGHC_2E", "GGHV_4E"]`:

| `unitGroupID`-Prefix | Display-Name | Beschreibung |
|---|---|---|
| `GGHC_2E` | Flat COMPACT - GGHC | Gas cooler – horizontal design, compact ← ✓ |
| `GGVC_*` | Vertical COMPACT - GGVC | Gas cooler – vertical design, compact |
| `GGDC_*` | V-shape COMPACT - GGDC | Gas cooler – V-shape, compact |
| `GGHV_4E` | Flat VARIO - GGHV | Gas cooler – horizontal design, variable ← ✓ |
| `GGVV_*` | Vertical VARIO - GGVV | Gas cooler – vertical design, variable |

Series-Prefix `GG*` = Gas-Cooler-spezifisch.

---

## 7. Open Questions (vor Phase 4 / UI-Wiring zu klären)

### Bereits durch Live-UI / Probe verifiziert ✓
- **`inputModeCapacity`** — 0/1 (Cold) bzw. 3 (Warm) — UI-Label kategorie-abhängig ("surface reserve" vs "condensation temperature")
- **`defrosting=80`** — = "Air defrost" (Cold-Side Default; **Korrektur** zu früherer Hotgas-Annahme)
- **`motorTechnology=-3`** — = "Cost-optimised"
- **`airVelocityClass=10001`** — = "All"
- **`airBlowOffType=10001`** — = "Standard"
- **`powerSupply=3001`** — = "All 50Hz"
- **`deliveryTimeFilter=-1`** — = "Only available units"
- **`efficiencyClass="--"`** — = "No" Filter
- **Series-Liste-Quelle:** `POST /unitgroup` mit UnitInputData-Body — liefert komplettes `{serieName, serieDescription, image, validationResult, unitGroupID}`
- **`fluidPumpRate=3.5`** — = UI "Feed rate" (Pump-spezifisch)
- **`fluidTempEvap`** — = UI "Evaporation temp." bei Evap **Pump** (bei DX ist es `fluidTempInlet`)
- **`_2`-Suffix-Felder sind SPEZIFISCH FÜR CO2 GAS COOLER DUAL-MODE** — nicht für Multiple circuits oder Cascade wie ursprünglich vermutet. Bei allen anderen Kategorien (0,1,2,3,4,5,6) sind alle `_2`-Felder im Default-State `0` und werden ignoriert. Nur cat=10 hat sie aktiv, und dann als redundante Duplikate der `subcritic*`-Felder.
- **`fluidInputMode` Enum komplett aufgelöst** (via `GET /fluidinputmode`): `0`="Inlet/Outlet temperature" (Coolant-Default), `1`="Inlet temp./Volume flow", `2`="Outlet temp./Volume flow", `5`="Inlet temp./Mass flow", `6`="Outlet temp./Mass flow". Werte `3`/`4` sind nicht im Endpoint, aber Cat=0 DX-Default ist `3` (= "Dew point at inlet (DIN EN328)" laut Live-UI-Radio). `4` evtl. = "Mean".
- **`fluidVolConcentration=34`** — = UI "Concentration: 34 Vol.%" (Coolant-spezifisch).
- **`fluidPressureDropMax` Einheit ist kategorie-abhängig:** DX/Pump in K (Temperatur-Spreizung), **Coolant in mbar** (API) → bar (UI, ÷1000). Default cat=0/1 = `5` K, cat=2 = `1000` mbar.
- **Series-Suffixe pro Kategorie:** DX = `_CX_`, Pump = `_AP_` + `ADHN`, Coolant = `_FP_` + `DGN`/`GGBK`/`GACA`, Condenser = `GC*_3E`/`GC*_4E`/`GVW_4E`/`GVD_5E`/`GCDV_1E`, Dry cooler = `GF*_*E`. Bestimmt die Hardware-Bauform.
- **`fluidTempCond` = UI "Outlet temp."** für Coolant-Flows (cat=2, cat=4) bestätigt durch Dry cooler API-Default `40` matched Live-UI `40`. Cat=2 Live-UI zeigte `0` (Diskrepanz zur API), vermutlich UI-Override.
- **Kategorie-Architektur-Klassen entdeckt:**
  - **A. DX-Refrigerant-Cold** (cat=0): Phase-Change, Cond/Superheat/Subcool/Dew-Point
  - **B. Pump-Refrigerant-Cold** (cat=1): NH3-Pump, gravity flooded + Feed rate
  - **C. Coolant-Cold** (cat=2): Glykol/Brine + Concentration + Parameter mode + THREAD/FLANGE
  - **D. Refrigerant-Warm** (cat=3 Condenser, cat=5 Subcooler — verifiziert): Refrigerant-Fluids (2xxx-IDs)
    - **D1 Condenser:** Phase-Change-Setup (Hot gas temp, Cond temp, Dew point/Mean Radio, Multiple circuits, Subcooler integriert, EMPTY CASING)
    - **D2 Subcooler:** **Inlet/Outlet-temperature-Setup** (kein Phasenwechsel!), Multiple circuits *greyed*, reduzierte OPTIONS (kein Inspection/Header cover, kein Hinged fan plate, kein Corrosion protection), keine THREAD/FLANGE, kein EMPTY CASING, nur 2 Series GS*
  - **E. Coolant-Warm** (cat=4 Dry cooler, cat=6 Oil cooler — verifiziert): Glykol/Oil-Loop zur Außenluft + THREAD/FLANGE, KEIN Subcooler, KEIN EMPTY CASING.
    - **E1 Dry cooler:** Glykol-Fluids + Concentration-Feld + Ball valve + Hinged fan plate + Inspection/Header cover + Corrosion protection. Hohe Capacity (300 kW). 7 Series GF*.
    - **E2 Oil cooler:** Oil-Fluids (1000er-ID-Range) + **KEIN** Concentration + reduzierte OPTIONS (kein Ball valve, kein Hinged fan plate, kein Inspection/Header cover, kein Corrosion protection). Niedrige Capacity (20 kW). Nur 2 Series GO*. Repair-Switch-Sub-Options leicht abweichend ("Preferably wired in pairs" statt "Preferably one per fan").
  - **F. CO2-Gas-Cooler-Dual-Mode** (cat=10 — verifiziert): Einzigartige Architektur mit ZWEI parallelen Operating-Modes:
    - **Supercritic** (warm): `isSupercritic=true`, `thermalCapacity`/`fluidPressure`/`fluidTempInlet`/`fluidTempCond` aktiv. Pseudo-`fluidID=41` (greyed CO2), underlying `fluidID_2=2010` (R744). Pressure-Feld neu (92000 mbar = 92 bar).
    - **Subcritic** (kalt): `isSubcritic=true`, parallel aktiv. `subcriticThermalCapacity`/`subcriticFluidTempInlet` (Hot gas) / `subcriticFluidTempCond` (Cond. temp) / `subcriticAirTemperature` (5°C) / `subcriticIsHotGasAuto` (true).
    - Unique OPTIONS: **HBLK valve** (default checked, CO2-Hochdruckblock), **Connection tube material** (statt Core tube material).
    - **`_2`-Suffix-Felder** sind redundante Duplikate der `subcritic*`-Felder — kein eigener Bedeutungs-Slot.
    - KEIN Connections on one side, KEIN Ball valve, KEINE THREAD/FLANGE, KEIN EMPTY CASING, KEIN Subcooler integriert.
    - 5 Series GG*

### ✅ Durch `UnitInputData_Documentation_2026.1.pdf` geklärt (Stand 2026-05-22)

Die offizielle PDF-Doku (siehe `rag/gpc-parameters.md`) schließt fast alle der bisherigen Open Questions. **Wichtige Klarstellung:** Die Live-UI-Defaults (z. B. `powerSupply=3001`, `airBlowOffType=10001`, `airVelocityClass=10001`) widersprechen den dokumentierten Enums (`powerSupply ∈ {0,3..16,18,19}`, `airBlowOffType ∈ {0..4}`, `airVelocityClass ∈ {0..3}`). **Hypothese:** Die Live-Werte sind interne "ALL"-Sentinels (10001=class-all, 3001=supply-all) oder eine Versionsdifferenz GPC.EU vs. GPC.AM. Vor Phase 4 verifizieren durch Probe-Calls mit allen drei Werten.

#### Enum-Werte — jetzt vollständig dokumentiert

| Property | PDF-# | Enum-Werte (offiziell) |
|---|---|---|
| `fluidInputMode` | [#81](gpc-parameters.md#fluidinputmode) | 0=Inlet+Outlet temp, 1=Inlet temp+Volume flow, 2=Outlet temp+Volume flow, 3=Inlet temp+PressureDrop, 4=Outlet temp+PressureDrop, 5=Inlet+MassFlow, 6=Outlet+MassFlow. **Achtung:** Live-UI-Radio "Dew point at inlet" vs. "Mean" mappt **nicht** auf `fluidInputMode` (dort gibt es kein "Mean"), sondern auf `TCondInputMode` [#191](gpc-parameters.md#tcondinputmode) (0=dewpoint, 1=mean, 2=bubble). |
| `finSpacingInputMode` | [#78](gpc-parameters.md#finspacinginputmode) | 0=Min/Max fin spacing (mm), 1=Min/Max fins per inch |
| `maxSoundInputMode` | [#137](gpc-parameters.md#maxsoundinputmode) | Enum unter `SoundPressureMax` [#173](gpc-parameters.md#soundpressuremax): 0=Max sound power, 1=Max sound pressure |
| `defrosting` | [#49](gpc-parameters.md#defrosting) | 0=None, 80=Air defrost, 258=Electric kit (customer install), 263=Electric factory-installed, 264=Hot gas defrost, 265=Warm brine defrost, 339=Electric efficiency-optimised |
| `motorTechnology` | [#140](gpc-parameters.md#motortechnology) (Enum aus [#186](gpc-parameters.md#switchcabinetmotortechnology)) | -1=All, -2=Energy-optimised, -3=Cost-optimised, 1=AC, 2=EC |
| `coreTubeMaterial` | [#43](gpc-parameters.md#coretubematerial) | **String-codiert!** 0=no restriction, `C`=Copper, `F`=Hot dip galv steel, `V`=Stainless A, `W`=Stainless B, `Z`=Galvanized steel |
| `airBlowOffType` | [#2](gpc-parameters.md#airblowofftype) | 0=no restriction, 1=vertically up, 2=horizontally, 3=45° down, 4=vertically down |
| `airVelocityClass` | [#12](gpc-parameters.md#airvelocityclass) | 0=ALL, 1=standard, 2=high (low-temp only), 3=low (processing rooms) |
| `efficiencyClass` | [#57](gpc-parameters.md#efficiencyclass) | **String!** "No filter defined"/A/A+/A++/B/C/D/E (jeweils "or better") |
| `powerSupply` | [#158](gpc-parameters.md#powersupply) | 17 voltage/frequency-Kombos: 0=no constraint, 3=115V 1~60Hz, 4=208-230V 1~60Hz, … 9=400V 3~50Hz, 10=400V 3~60Hz, 14=230V 3~50Hz, 18=110V 1~50Hz, 19=110V 1~60Hz |
| `repairSwitch` | [#165](gpc-parameters.md#repairswitch) | 0=No, 233=selected |
| `RepairSwitchPosition` | [#166](gpc-parameters.md#repairswitchposition) | 0=Undefined, 1=Close to fan, 2=At front, 3=Standard ← Cold "At side" = vermutlich `3`, Warm "Near fan if possible" = vermutlich `1` |
| `RepairSwitchType` | [#167](gpc-parameters.md#repairswitchtype) | 0=Undefined, 1=Two-turn star/delta (9-pole), 2=Single-speed (7-pole) |
| `RepairSwitchWiring` | [#168](gpc-parameters.md#repairswitchwiring) | 0=Undefined, 1=Preferably individual, 2=Single per fan, 3=Preferably pairs, 4=Pairs fixed, 5=Preferably one for all, 6=One for all |
| `switchCabinetType` | [#187](gpc-parameters.md#switchcabinettype) | 14 Werte: 0=Undefined, 1=All, 2=Auto, 3=Small, 4..7=GIS/GWS/GSS/GKS, 8=EC junction box, 9=with panel, 10=stand cabinet, 11=terminal box, 12=0-10V terminal box, 13=Modbus Daisy Chain |
| `controllerType` | [#42](gpc-parameters.md#controllertype) | 2=Auto, 3=Continuous (EC/sinus/phase-cut), 4=Phase cut (AC), 6=Step (AC), 7=GMM EC, 8=GMM Sincon lite (AC), 9=GMM phase-cut lite (AC), 10=GMM EC with remote display |
| `controllerInterface` | [#41](gpc-parameters.md#controllerinterface) | 1=Undefined, 2=No interface, 3=Modbus RTU, 4=Profibus DP, 5=Profinet, 6=Bacnet IP, 7=Bacnet MS/TP |
| `controllerAllocation` | [#39](gpc-parameters.md#controllerallocation) | 1=Auto, 3=One per unit, 4=One per fluid circuit, 5=None |
| `switchCabinetAllocation` | [#185](gpc-parameters.md#switchcabinetallocation) | Identisch zu `controllerAllocation` (1/3/4/5) |
| `connectionType` | [#37](gpc-parameters.md#connectiontype) | 3=Lapped flanges, 4=Welding neck flanges, 5=Thread connection |
| `weldingNeckFlangeNominalPressure` | [#220](gpc-parameters.md#weldingneckflangenominalpressure) | 3=PN16 B1, 4=PN40 B1, 5=PN40 D+C, 7=PN10 (lapped, brazing neck) |
| `threadConnectionMaterial` | [#198](gpc-parameters.md#threadconnectionmaterial) | 0=Undefined, 1=Auto, 2=All, 3=Steel, 4=Red brass, 5=Stainless 304L, 6=Stainless 316L |
| `airHumidityInputMode` | [#6](gpc-parameters.md#airhumidityinputmode) | 0=AUTO, 1=AirRelHumidity set, 2=AirWetBulbTemp set |
| `airPressureInputMode` | [#8](gpc-parameters.md#airpressureinputmode) | 0=Air pressure direct, 1=Altitude (= geodetic height) |
| `airTemperatureMode` | [#11](gpc-parameters.md#airtemperaturemode) | 0=inlet temp, 1=room mean (in/out), 2=room LMTD (legacy, GPC.AM bis April 2010) |
| `tCondInputMode` | [#191](gpc-parameters.md#tcondinputmode) | 0=dew point (inlet), 1=mean (vapor quality 0.5), 2=bubble point (outlet) ← **Das ist der "Dew point at inlet (DIN EN328)" vs "Mean" Radio in der UI!** |
| `fluidPumpMode` | [#85](gpc-parameters.md#fluidpumpmode) | 0=Pump-driven, 1=Gravity / natural circulation |
| `fanFuseSpec` | [#72](gpc-parameters.md#fanfusespec) | 0=Undefined, 1=All types, 2=Best price, 3=High fail safe, 4=Individually fused, 5/6/7=Group sizes |
| `extendedLegs` | [#70](gpc-parameters.md#extendedlegs) | 6=600mm, 7=800mm, 8=1000mm, 213=1100mm, 214=1200mm |
| `swivelingFans` | [#188](gpc-parameters.md#swivelingfans) | 0=Not needed, 68=Yes (swiveling fans), 329=Yes (swiveling fan plate) |
| `corrosionProtectionClass` | [#44](gpc-parameters.md#corrosionprotectionclass) | 0=None, 335=Class 4, 336=Class 5 |
| `passNumberConstraint` | [#157](gpc-parameters.md#passnumberconstraint) | 0=All between min/max, 1=Only even, 2=Discrete values via DiscreteNumberOfPasses |
| `terminalBoxType` | [#193](gpc-parameters.md#terminalboxtype) | 1=AUTO, 2=All fans grouped, 4=Not grouped, individually connected |
| `thermoContactType` | [#196](gpc-parameters.md#thermocontacttype) | 0=Undefined, 1=All, 2=Auto, 3=Manual reset, 4=Remote reset |
| `thermosiphonOilCooling` | [#197](gpc-parameters.md#thermosiphonoilcooling) | 0=AUTO max ΔP=5.0 K, 1=AUTO max ΔP=0.3 K (NH3 condenser only) |
| `inputModeCapacity` | [#120](gpc-parameters.md#inputmodecapacity) | **Korrektur:** Endpoint `GET /inputcapacitymodes` listet nur 0/1 — die PDF dokumentiert **4 Werte**: 0=fixed (surface reserve adapts), 1=target value (per-device optimisation), 2=via air-side (coils only), 3=fixed (condensation temp adapts — **condenser coils only**). Das erklärt cat=3-Default `=3`. |
| `productCategory` | [#162](gpc-parameters.md#productcategory) | 0=DX evap, 1=Flooded evap, 2=Air cooler 1ph, 3=Condenser, 4=Brine cooler, 5=Sub cooler, 6=Oil cooler, 10=Gas cooler |
| `baseUnitFunction` | [#17](gpc-parameters.md#baseunitfunction) | **Anderer Enum-Satz als productCategory!** 0=DX Cold, 1=Flooded Cold, 2=Flooded Cold (Duplikat?!), 3=Condenser, 4=Brine/Dry, 5=Sub, 6=Oil, 7=Gas, 8=1ph aircooler heat-collector outdoor, 9=Flooded heat-collector outdoor, 10=DX heat-collector outdoor |
| `market` | [#134](gpc-parameters.md#market) | 101=EU, 201=APO (Asia/Pacific/Oceania), 401=NLA (North & Latin America) |
| `unitSelectionMode` | [#208](gpc-parameters.md#unitselectionmode) | 0=Unit search, 1=Recalculation of defined individual unit |
| `deliveryTimeFilter` | [#52](gpc-parameters.md#deliverytimefilter) | -2=In stock only, -1=Only available, 0=No filter, 1..6=Within N business days |
| `defrostingHotGasFeed` | [#50](gpc-parameters.md#defrostinghotgasfeed) | 0=Top feed, 1=Bottom feed, 2=Center feed (Eurasian market only) |
| `defrostingUserDefined` | [#51](gpc-parameters.md#defrostinguserdefined) | List`1: leer=Standard, sonst IDs (11=El coil standard, 12=El tray, 13=Hotgas coil, 14=Hotgas tray, 23=El combined, 73/74=El heavy für t0<-40°C, 261/262=Warm brine coil/tray, 264=Hotgas meta, 312=El coil light für t0≥-10°C, 338/340=El efficiency-opt) |
| `hotGasInterConnectingTubing` | [#113](gpc-parameters.md#hotgasinterconnectingtubing) | 34=with check valve, 66=without check valve |
| `hydroPad` | [#114](gpc-parameters.md#hydropad) | 234=hydroBLU required |
| `enableForMounting` | [#63](gpc-parameters.md#enableformounting) | **Dual-purpose property:** AirHeater → 0/1=mountable; AirCooler → 0/1 = **"0-10V signal required (only EC!)"** — das ist die UI-Checkbox unter Terminal Box! |

#### Property-Namen — jetzt aufgelöst

Alle bisher fragezeichenmarkierten Properties stehen in der PDF unter eindeutigen Namen. Die Mappings im Detail:

| UI-Label | API-Property | PDF-# |
|---|---|---|
| "Louvre (with drive) made of galvanised steel" | `AdjustableFlapWithDrive` | [#1](gpc-parameters.md#adjustableflapwithdrive) |
| "Güntner Streamer (for an increased air throw)" | `GuentnerStreamer` | [#109](gpc-parameters.md#guentnerstreamer) (NICHT `AirHoseConnection` — das ist die Air-Sock-Variante ohne Streamer, [#4](gpc-parameters.md#airhoseconnection)) |
| "Air sock connection incl. Güntner Streamer" | `AirHoseConnectionInclStreamer` | [#5](gpc-parameters.md#airhoseconnectioninclstreamer) |
| "Design for t0<-40°C" | `LowEvapTempDesign` | [#132](gpc-parameters.md#lowevaptempdesign) |
| "Connections in air flow direction left/right" | `InletPosLeft` / `InletPosRight` | [#117](gpc-parameters.md#inletposleft) / [#118](gpc-parameters.md#inletposright) |
| "Vibration Dampers" | `VibrationDampers` | [#212](gpc-parameters.md#vibrationdampers) |
| "1 set reduced legs" | `ReducedLegs` | [#164](gpc-parameters.md#reducedlegs) |
| "1 set extended legs" + Length-Select | `ExtendedLegs` (Enum 6/7/8/213/214) | [#70](gpc-parameters.md#extendedlegs) |
| "Legs for floor mounting" | `MountedLegs` + `MountedLegsGS` (Galv. Steel) / `MountedLegsSS` (Stainless Steel) | [#142](gpc-parameters.md#mountedlegs) / [#143](gpc-parameters.md#mountedlegsgs) / [#144](gpc-parameters.md#mountedlegsss) |
| "Inspection cover" | `InspectionCover` | [#121](gpc-parameters.md#inspectioncover) |
| "Header cover" | `ConnectionRoof` | [#35](gpc-parameters.md#connectionroof) |
| "Subcooler(s) integrated" | `Subcooler` + `MiniumRequiredSubcooling` | [#175](gpc-parameters.md#subcooler) + [#139](gpc-parameters.md#miniumrequiredsubcooling) |
| "Tubing of integrated subcooler with syphon" | `Tubing_Of_Integrated_Subcooler_With_Syphon` | [#199](gpc-parameters.md#tubing-of-integrated-subcooler-with-syphon) |
| "Special varnishing" + RAL | `SpecialVarnishing` + `RalNumber` (+ `DefaultIndoorVarnishing` / `DefaultOutdoorVarnishing` für Default-Farben) | [#174](gpc-parameters.md#specialvarnishing) / [#163](gpc-parameters.md#ralnumber) / [#46](gpc-parameters.md#defaultindoorvarnishing) / [#47](gpc-parameters.md#defaultoutdoorvarnishing) |
| "Corrosion protection + Güntner Protection 4" | `CorrosionProtectionClass` | [#44](gpc-parameters.md#corrosionprotectionclass) |
| "aicore™ link (IoT module)" | `IoTModule` | [#122](gpc-parameters.md#iotmodule) |
| "Transport by container" | `IsContainerTransport` (+ `ContainerTransportRail` für Schienen) | [#124](gpc-parameters.md#iscontainertransport) / [#38](gpc-parameters.md#containertransportrail) |
| "Multiple circuits" | `MultipleCircuits` + `NoOfCircuitsThermo` | [#145](gpc-parameters.md#multiplecircuits) + [#148](gpc-parameters.md#noofcircuitsthermo) |
| "Mounted and wired at factory" | `MountedAndWired` | [#141](gpc-parameters.md#mountedandwired) |
| "Switch cabinet mountable to unit" | `EnableForMounting` | [#63](gpc-parameters.md#enableformounting) |
| "Bypass for continuous controller required" | `ControllerByPassObligatory` | [#40](gpc-parameters.md#controllerbypassobligatory) |
| "EC junction box with main switch" | `ECJunctionBoxWithMainSwitch` | [#56](gpc-parameters.md#ecjunctionboxwithmainswitch) |
| "fan protection" (Switch Cabinet) | `FanFuseSpec` | [#72](gpc-parameters.md#fanfusespec) |
| "For noise-sensitive applications" | `ForNoiseUse` | [#98](gpc-parameters.md#fornoiseuse) |
| "For energy-saving application" | `ForEnergySavingController` | [#97](gpc-parameters.md#forenergysavingcontroller) |
| "Thermo contact" Select | `ThermoContactType` | [#196](gpc-parameters.md#thermocontacttype) |
| "controller type" | `ControllerType` | [#42](gpc-parameters.md#controllertype) |
| "controller interface" | `ControllerInterface` | [#41](gpc-parameters.md#controllerinterface) |
| "Manual speed controller" | `ManualSpeedController` | [#133](gpc-parameters.md#manualspeedcontroller) |
| "Pressure sensor" | `PressureSensor` | [#160](gpc-parameters.md#pressuresensor) |
| EMPTY CASING (Warm-Side, alle 5 Felder): Master / Length / Height / Isolation / Bottom sheet | `EmptyCasing` / `EmptyCasingLength` / `EmptyCasingHeight` / `EmptyCasingIsolation` / `EmptyCasingBottomSheet` | [#58](gpc-parameters.md#emptycasing) / [#62](gpc-parameters.md#emptycasinglength) / [#60](gpc-parameters.md#emptycasingheight) / [#61](gpc-parameters.md#emptycasingisolation) / [#59](gpc-parameters.md#emptycasingbottomsheet) |
| "HBLK valve" (cat=10 CO2) | `HBLKValve` | [#110](gpc-parameters.md#hblkvalve) |
| OPTIONS-Modal-Inhalt (Air pressure) | `AirRelHumidity` / `Altitude` / `IsAirRelHumidityAuto` / `CapacitySensibleHeatOnly` / `AirHumidityInputMode` / `AirPressureInputMode` / `AirWetBulbTemp` / `AirTemperatureMode` | [#9](gpc-parameters.md#airrelhumidity) / [#14](gpc-parameters.md#altitude) / [#123](gpc-parameters.md#isairrelhumidityauto) / [#23](gpc-parameters.md#capacitysensibleheatonly) / [#6](gpc-parameters.md#airhumidityinputmode) / [#8](gpc-parameters.md#airpressureinputmode) / [#13](gpc-parameters.md#airwetbulbtemp) / [#11](gpc-parameters.md#airtemperaturemode) |

### Noch offen — verbleibende Klärungspunkte

Nach Abgleich mit der PDF sind das die **einzigen** echt offenen Punkte:

1. **Live-API liefert Werte außerhalb des dokumentierten Enums** für `powerSupply=3001`, `airBlowOffType=10001`, `airVelocityClass=10001`, `efficiencyClass="--"`, `connectionType=0`. Hypothesen:
   - PDF ist für GPC.AM (US), GPC.EU benutzt erweiterte ALL-Sentinels (10001, 3001)
   - Oder: Default-Werte aus `defaultinputdata` werden vom Backend mit speziellen IDs codiert ("any" / "no constraint")
   - **Probe-Plan:** `findunits` mit jedem dokumentierten Wert vs. dem Live-Default-Wert testen, Anzahl `foundUnits` vergleichen.
2. **`impactCountryID` Enum** — nicht in der PDF (kein `UnitInputData`-Property). Liegt unter anderem Schema, vermutlich `GetCountryEmissionData`-Response. Eigene Probe nötig.
3. **`fluidInputMode=3` vs. Live-UI "Dew point at inlet (DIN EN328)"** — PDF dokumentiert `3` als "Inlet temp + PressureDrop". UI-Label "Dew point" stimmt mit `TCondInputMode=0` überein. **Hypothese:** Die UI-Card "Dew point at inlet" / "Mean" Radio bedient **TCondInputMode**, nicht `fluidInputMode`. Verifizieren.
4. **`Connections on one side`** (nur Dry cooler) — kein passender Name in PDF. Möglich: `InletPosLeft=1 + InletPosRight=0` (Kombi). Probe nötig.
5. **`fluidTempEvap` vs. `fluidTempInlet`** für Pump — PDF #91 sagt `FluidTempEvap` = "Fluid evaporation temperature at the inlet or in the middle. The dew point must be specified for fluids with temperature glide." → bestätigt Pump-Mapping auf `fluidTempEvap`.
6. **`thermalCapacity` Einheit:** PDF #194 dokumentiert "W" (Watts) — konsistent mit Live-Default `10000` für 10 kW. UI-Konvertierung ÷1000 ist korrekt.
7. **`_2`-Suffix-Aktivierung** — PDF zeigt `FluidID_2`, `FluidTempCond_2`, `FluidTempInlet_2`, `ThermalCapacity_2` (#80/#90/#93/#195) als "second circuit when multiple circuits option is selected". Triggers vermutlich via `MultipleCircuits=1` oder `NoOfCircuitsThermo>1`. **Verifizieren:** `defaultinputdata?multiplecircuits=true` testen.

### PDF-Doku-Bugs (zu flaggen bei Maike/Güntner)

- **#105 `Geo_MaxAirTemp_HydroPad`** — Unit = `m` in PDF, sollte `Degree_C` sein (Property heißt "MaxAirTemp", Beschreibung sagt "maximum air temperature"). Sister-Property #102 `Geo_AirTemp_HydroPad` hat korrekt `Degree_C`.
- **#17 `BaseUnitFunction`** — listet die ProductCategory-Werte **anders** als #162 `ProductCategory`: BaseUnitFunction hat zusätzliche Werte 7/8/9 für "Outdoor heat collectors" und doppelten Wert `2` (zweimal "Flooded evaporator"). Vermutlich nutzt das Backend `BaseUnitFunction` als interne Klassifikation und `ProductCategory` als API-Eingabe.
- **#136 `MaxOperatingPressure`** — Beschreibung "Indicates the maximum fluid pressure of the device", Datatype `Int32`, Unit `bar`. **Aber:** Live-UI Select hat Optionen "Standard" und vermutlich noch Werte. **Kein Enum in PDF** — hier fehlt die Doku.
- **#99 `FrostedCoil`** — Beschreibung erwähnt "Only in GPC.AM!" — vermutlich nicht relevant für EU.
- **`MotorTechnology` (#140)** — Property selbst hat keinen Enum-Block in der PDF (nur Description). Werte stehen unter #186 `SwitchCabinetMotorTechnology` — ich habe sie via Override in `gpc-parameters.json` dupliziert.

### UI-Felder ohne API-Pendant
- **"Similarity Score"** in Results-Tabelle — vermutlich client-seitig aus `surfaceReserve` berechnet
- **"Price (EUR)"** in Results — nicht in `FindUnitsResultOutputData`. Vermutlich aus zweitem Endpoint oder UI-Mock
- **Rating-Bar (1.7 ⭐⭐ usw.)** in beiden Pages — UI-only, Bedeutung?

### Strukturelle Diskrepanzen
- **`_2`-Suffix-Felder-Korrektur:** Sowohl Cold- als auch Warm-Side benutzen im Default-State die `thermalCapacity`/`fluidID`/`fluidTempInlet`/`fluidTempCond`-Felder **ohne** `_2`-Suffix. Die `_2`-Felder werden vermutlich aktiv, wenn die "Multiple circuits"-Checkbox in der Medium Card angehakt ist (`noOfCircuitsThermo>1`) — zu verifizieren in Phase 2 mit gezieltem Probe-Call.
- **`thermalCapacity` Einheit:** API liefert Watts (10000 für DX Cold, 100000 für Condenser Warm), UI zeigt kW (10 / 100). **Konvertierung W↔kW ist zwingend**. Zu klären, ob `unitSystem`-Query-Param (0=SI, 1=US) bei `findunits` die Einheit umstellt.
- **Boolean-Properties** in der API sind oft `integer` (0/1) statt `boolean`. Bei jeder Checkbox-Bindung Konvertierung beachten.
- **`inputModeCapacity` Inkonsistenz:** Cold-Default `0`, Warm-Default `3` — aber `GET /inputcapacitymodes` listet nur Werte 0 und 1. Live-UI zeigt category-spezifische Labels ("adjust surface reserve" vs. "adjust condensation temperature"). Vermutlich erwartet das Endpoint einen `productCategory`-Param der nicht im Spec dokumentiert ist, oder der Wert wird vom Backend kategorie-spezifisch interpretiert.
- **DIN-Standard-Variante:** Cold-Side Radio-Label zeigt "DIN EN328" (Evaporators), Warm-Side zeigt "DIN EN327" (Condensers). Gleiches API-Feld (`fluidInputMode=3`), UI-Label ist kategorie-spezifisch.
- **Form-Umfang per Kategorie:** Warm-Side hat **ca. 60% mehr Form-Elemente** als Cold-Side. Zusätzlich: Multiple circuits, Hot gas temp, Rel. humidity sichtbar, Altitude sichtbar, Container transport, Special varnishing + RAL, Vibration Dampers, Reduced/Extended legs, Inspection cover, Header cover, Multiple circuits, Subcooler + min subcooling, Corrosion protection, CONTROL/WIRING mit 3 Sub-Sections (Switch cabinet, Controller, Accessories), EMPTY CASING-Section.
- **Statisches HTML vs. Live-UI:** Das statische `frontend/thermodynamics.html` und `frontend/unit-selection.html` ist nicht 1:1 die Live-UI — Live hat zusätzliche Felder (Core tube material, Max. operating pressure, Coil Defender, Vibration Dampers, …), andere Defaults (10 kW vs. 60 kW, Cost-optimised vs. EC, Air defrost vs. Hotgas), und andere Layouts (kein Basic/Expert-Toggle in den Cards, OPTIONS-Modal bei Air). **Für Phase 4 muss entschieden werden: Static-HTML an Live-UI anpassen, oder Live-UI als Spec nehmen und Static-HTML ignorieren.**
- **Statisches HTML hat KEIN Warm-Side-spezifisches Form:** Die Felder Multiple circuits, Hot gas temp, Container transport, Special varnishing, Vibration Dampers, Reduced/Extended legs, Inspection/Header cover, Subcooler integrated, Corrosion protection, EMPTY CASING fehlen komplett im static HTML. Das HTML wurde nur für Cold-Side (Evaporator-Kontext) gebaut.

---

## 8. Empfohlene nächste Schritte

### Phase 2 — Cold-Side Validation (read-only)
1. Skript `rag/probe-mapping.js` schreiben, das:
   - `defaultinputdata` für cat=0,1,2 holt
   - die UI-Defaults aus dieser Mapping-Datei via Konvertierung einsetzt
   - `findunits` aufruft
   - Anzahl `foundUnits` und Plausibilität (`thermalCapacity` ≈ erwartet) protokolliert
2. Iterativ Diskrepanzen aus Abschnitt 7 lösen
3. Sobald alle drei Cold-Side-Kategorien einen sauberen Roundtrip liefern: Phase 1+2 als „done" markieren

### Phase 3 — Warm-Side erweitern
1. `defaultinputdata` für cat=3,4,5,6,10 diffen
2. `_2`-Suffix-Felder und `subcritic*`-Felder dokumentieren
3. CO2-Gas-Cooler-Special-Case (cat=10) ausführlich, weil `isSupercritic=true` und `fluidID_2` hart auf CO2

### Phase 4 — UI-Wiring (separater Plan)
Erst nach Review dieser Mapping-Datei und Phase 2/3-Verification.
