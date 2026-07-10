# myGPC Datasheet (Step 5) — Field Mapping

> **Status:** Review-ready für Implementierung — Open Questions durch Live-Probe (2026-05-22, cat=0) aufgelöst.
> **Stand:** 2026-05-22 · **Quell-Page:** `frontend/datasheet.html`
> **Verwandte Docs:** `rag/gpc-field-mapping.md` (Input-Page-Mapping), `rag/gpc-parameters.md` (UnitInputData-Referenz)
> **Probe-Quelle:** `rag/probe-datasheet-0-findunits.json` (selectedUnit Sample, cat=0 DX) und `rag/probe-datasheet-0-features.json` (42 Features). Reproduzieren via `npm run probe-datasheet`.

Dieses Dokument ist die **Single Source of Truth** für die dynamische Befüllung der Step-5-Datasheet aus dem GPC.EU-API-Output. Pro statisches Datasheet-Feld dokumentiert es:
- Aktueller hardcoded Wert in der HTML (zur Orientierung)
- Ziel-API-Quelle (`selectedUnit` / `unitInputData` / `unitfeatures` / `unitbidtext` / `productCategoryName` / statisch)
- API-Property
- Konvertierung (W↔kW, °C-Suffix, Number-Formatierung)
- Bemerkung

**State-Quellen (alle live aus `MyGPC.state.snapshot()`):**
- `s.selectedUnit` — Single Unit aus `foundUnits[i]` (Schema: `FindUnitsResultOutputData`, ~120 Felder, hauptsächlich Output-Daten)
- `s.unitInputData` — User-Inputs aus Step 2 (alle UnitInputData-Properties, `fluidID`, `fluidTempEvap`, `frostThickness`, …)
- `s.productCategoryName` — Aus Step 1
- `s.inputDataMFCBinary` — Aus `/findunits`-Response — wird für `/unitbidtext` gebraucht
- `s.selectedUnit.unitOutPutMFCBinary` + `signature` — Aus `selectedUnit` — wird für `/unitbidtext` gebraucht

**API-Endpoints (zusätzlich zu den schon genutzten):**
- `POST /unitfeatures` → `UnitGroupOptionListResultWithValidationInfo` mit `content: UnitGroupOption[]` (key, itemValue, description, info, value[]) — für Material- und Option-Labels
- `GET /fluids?productCategory=N` → Liste mit `{fluidID, fluidName, hasImpact}` — für Refrigerant-Name-Lookup (falls `selectedUnit.thermoCircuits[0].fluidName` nicht ausreicht)

---

## 1. Product Header (oben) — ✅ schon live

| HTML-Element | ID | Aktueller Wert (Mockup) | API-Quelle | API-Property | Status |
|---|---|---|---|---|---|
| Produkt-Titel | `mygpc-ds-title` | "Evaporator" | `s.productCategoryName` | (UI-State) | ✅ live |
| Produkt-Subtitle | `mygpc-ds-subtitle` | "GACV AP 080.2HN/2E-A0.B" | `s.selectedUnit` | `unitModelID_MRNameExternal` + ` ` + `unitModelID_MTNameExternal` | ✅ live |
| Add-to-cart-Button | `ds-add-cart-btn` | — | (kein API-Bezug, UI-only) | — | static |
| Favorite / Download / Print-Buttons | — | — | (kein API-Bezug) | — | static |

---

## 2. Key Specs Grid — 4 Spalten, 2 Bereiche

**Layout:** Links Air-Side-Specs (6 Werte) · Rechts Refrigerant-Side-Specs (6 Werte). HTML-Block: `frontend/datasheet.html:115-148`.

### 2.1 Air-Side (linke 2 Spalten) — ✅ alle aufgelöst durch Probe

| Label | Aktueller Wert | API-Quelle | API-Property | Konvertierung | Bemerkung |
|---|---|---|---|---|---|
| Capacity | `10.0 kW` | `selectedUnit` | `thermalCapacity` | `.toFixed(1) + ' kW'` | **Verifiziert:** Output ist bereits in **kW** (Probe-Wert `10`, nicht `10000`). KEINE Konvertierung W→kW nötig (anders als bei UnitInputData!). |
| Surface reserve | `-8.5 %` | `selectedUnit` | `surfaceReserve` | `.toFixed(1) + ' %'` | direkt, Probe `7` |
| Air volume | `6,200 m³/h` | `selectedUnit` | `airVolumeFlow` | `.toLocaleString() + ' m³/h'` | direkt, Probe `6233` |
| Air velocity | `2.4 m/s` | `selectedUnit` | `airVelocity` | `.toFixed(1) + ' m/s'` | direkt, Probe `2.6` |
| Air throw | `18 m` | `selectedUnit` | `airthrow` | string direkt verwenden | Probe `"approx. 13 m"` — kommt bereits **inkl. "approx." Prefix und " m" Suffix** vom Backend |
| Air quality | `L / W / H` | — | — | — | **Aufgelöst: Mockup-Reste.** Property gibt es nicht in der API (weder findunits noch unitfeatures). **Empfehlung:** Zeile aus dem Datasheet entfernen, oder mit "—" füllen. Phase-2-Klärung mit Maike, ob das gebraucht wird. |

### 2.2 Refrigerant-Side (rechte 2 Spalten)

| Label | Aktueller Wert | API-Quelle | API-Property | Konvertierung | Bemerkung |
|---|---|---|---|---|---|
| Refrigerant | `R134a` | `selectedUnit` | `thermoCircuits[0].fluidName` | direkt | **Verifiziert:** Probe liefert `"CO2 (R744)"` als Klartext (bei Default-fluidID=2010). Direkt verwenden. |
| Evaporation temp | `-8 °C` | `selectedUnit` | `evaporationTemp` | `.toFixed(1) + ' °C'` | direkt, Probe `-8` |
| Feed rate / Superheating | `5 K` | `selectedUnit` | **kategorie-abhängig** | s. Bemerkung | **Aufgelöst:** Bei **DX (cat=0)**: `superHeating=5` → Label "Superheating: 5 K". Bei **Pump (cat=1)**: `feedRateValue` → Label "Feed rate: X". Backend liefert auch `feedRateDescription` als komplettes Label (Probe: `"Feed rate (gravity flooded):"`). **Empfehlung:** Label dynamisch aus `feedRateDescription`, Wert aus `superHeating` (DX) oder `feedRateValue` (Pump). |
| Air temp | `32 °C` | `selectedUnit` | `airTempInlet` | `.toFixed(0) + ' °C'` | direkt, Probe `0` |
| Rel. humidity | `auto (%)` | `selectedUnit` | `airInletRelHumidity` | string direkt (mit "%") | **Verifiziert:** Probe liefert `"85 %"` als formatierter String. Bei AUTO-Modus vermutlich `"auto (%)"`. |
| Frost thickness | `0 mm` | `selectedUnit` | `frost` | `.toString() + ' mm'` | **Verifiziert:** Probe `0` (number). Bei Probe-Sample war frostThickness=0, also keine Validierung der Einheit. Annahme: Output in mm direkt. Falls in m: ×1000. **Mit nicht-Null-Frost-Sample nachprüfen.** |

---

## 3. Fan Data Grid — 4 Spalten, 2 Bereiche

HTML-Block: `frontend/datasheet.html:153-182`. **Wichtig:** Mockup-Label sagt `Fans (AC)` — das `(AC)` ist motor-tech-abhängig.

### 3.1 Fan Spec (linke 2 Spalten) — Korrekturen aus Probe

| Label | Aktueller Wert | API-Quelle | API-Property | Konvertierung | Bemerkung |
|---|---|---|---|---|---|
| Fans (AC/EC) | `2 Piece(s)` | `selectedUnit` | `fanNumber` + `motor_technology` (string Label) | `${fanNumber} Piece(s)`; Label dynamisch `Fans (${motor_technology})` | **Verifiziert:** Probe liefert `fanNumber=2`, `motor_technology="AC"`. |
| Data per fan | `1~230V 50Hz` | `selectedUnit` | **`fanConnectionType`** (string, bereits formatiert) | direkt | **Korrektur:** Probe zeigt `fanConnectionType="2 Piece(s) 1~230V 50Hz"` — **kommt bereits vollständig formatiert vom Backend**, NICHT aus 3 Feldern bauen. Achtung: Enthält schon Count, dh. das "Fans"-Feld könnte mit "Data per fan" zusammengelegt werden. |
| Speed | `780 RPM` | `selectedUnit` | `fanSpeed` | `${fanSpeed} RPM` | direkt, Probe `1310` |
| Motor | `1 x MFT (780 RPM)` | `selectedUnit` | `fanCapacityDescription` + `fanSpeed` | `${fanCapacityDescription} (${fanSpeed} RPM)` | **Aufgelöst:** Probe liefert `fanCapacityDescription="0.10 kW/0.19 kW"` — das ist Shaft/EL-Power-Combo, NICHT der "MFT"-Motortyp aus dem Mockup. **Mockup-Wert "1 x MFT" ist nicht aus der API ableitbar** → Phase-2-Klärung mit Maike, ob das Motor-Type-Kürzel aus einem anderen Endpoint kommt (z.B. `singleunitmodels`). |
| Motor acceleration | `Direct` | — | — | — | **Aufgelöst: Mockup-Rest.** Property existiert nicht. Property `fanConnectionType` enthält etwas anderes (Voltage/Frequency-Combo). **Empfehlung:** Zeile entfernen oder mit "—" füllen. |
| Air volume | `6,200 m³/h` | `selectedUnit` | `airVolumeFlow` | wie Section 2.1 | redundant zu Key Specs — könnte hier entfernt werden |

### 3.2 Noise & Current (rechte 2 Spalten) — alle aufgelöst

| Label | Aktueller Wert | API-Quelle | API-Property | Konvertierung | Bemerkung |
|---|---|---|---|---|---|
| Noise pressure level | `54 dB(A) in 3 m` | `selectedUnit` | `soundPressure` + `soundPressureDistance` | `${soundPressure.toFixed(1)} dB(A) in ${soundPressureDistance} m` | **Verifiziert:** Probe `soundPressure=54.231050422809886` → `.toFixed(1)` zwingend, sonst lange Floats |
| Noise power level | `73 dB(A)` | `selectedUnit` | `soundPowerLevel` | `.toFixed(1) + ' dB(A)'` | direkt, Probe `76` |
| Max. current | `1.8 A` | — | — | — | **Aufgelöst: Mockup-Rest.** Property nicht im Schema, nicht in `unitfeatures`. Nur `fanCurrentNominal` existiert. **Empfehlung:** Zeile entfernen oder "Nominal current" doppelt zeigen. |
| Nominal current | `1.2 A` | `selectedUnit` | `fanCurrentNominal` | `.toFixed(1) + ' A'` | **Verifiziert:** Probe `0.85` |

---

## 4. Materials Grid — 4 Spalten, 2 Bereiche

HTML-Block: `frontend/datasheet.html:185-222`. **14 Werte gesamt** — meiste sind Strings aus `selectedUnit` oder aus `unitfeatures`-Lookup.

### 4.1 Casing/Surface (linke 2 Spalten) — Aufgelöst

| Label | Aktueller Wert | API-Quelle | API-Property | Bemerkung |
|---|---|---|---|---|
| Casing | `AlMg, RAL 9003` | `selectedUnit` | `casing` (string, bereits formatiert) | **Verifiziert:** Probe `"AlMg, Powder-coated RAL 9003"` — enthält bereits Coating-Info inline. |
| Surface | `34 m²` | `selectedUnit` | `surface` (string ohne Einheit!) | **Korrektur:** Probe `"35.7"` — KEIN " m²" enthalten, manuell anhängen: `surface + ' m²'`. |
| Tube material | `Copper` | `selectedUnit` | `tubes` direkt | **Korrektur:** **NICHT** `coreTubeMaterialCode` (Probe liefert `"R"`, das ist nicht in PDF-Enum!) — stattdessen `tubes="Copper"` direkt als Klartext nutzen. PDF-Doku-Bug für CoreTubeMaterial-Codes (oder GPC.EU verwendet anderes Schema als die Doku besagt). |
| Fin material | `Aluminum` | `selectedUnit` | `fins` direkt | **Korrektur:** analog — `fins="Aluminium"` direkt nutzen, NICHT via `finMaterialCode="A"`-Lookup. |
| Distr. pipes | `Copper` | — | — | **Aufgelöst: Mockup-Rest.** Property nicht in API/`unitfeatures`. **Empfehlung:** Aus dem Datasheet entfernen (oder mit `tubes`-Wert duplizieren als Annäherung, da Distributor-Pipes meistens gleiches Material wie Coil-Tubes haben). |
| Connections | `Solder 22 mm` | `selectedUnit` | `inletOuterDiameter` (string mit Einheit) | **Verifiziert:** Probe `"16 * 1.00 mm"` — String enthält Wandstärke + Einheit. Direkt nutzen. (Bei Coolant kann auch via `connectionType`-Enum-Lookup formatiert werden.) |
| Net weight | `68 kg` | `selectedUnit` | `unitWeight` (string mit "kg") | **Verifiziert:** Probe `"46 kg"` — direkt nutzen. |
| Coating | `Standard` | `unitfeatures` | Lookup auf `key="DefaultIndoorVarnishing"` / `"SpecialVarnishing"` falls vorhanden, sonst aus `casing`-String parsen | **Teil-aufgelöst:** Kein direkter `key="coating"` in `unitfeatures`-Response. **Aber:** `casing` enthält "Powder-coated RAL 9003" als String → Coating kann mit Regex `/Powder-coated|Special varnishing|Standard/` aus `casing` extrahiert werden. Phase-2-Klärung. |

### 4.2 Tubes/Fins (rechte 2 Spalten) — Aufgelöst

| Label | Aktueller Wert | API-Quelle | API-Property | Bemerkung |
|---|---|---|---|---|
| Tubes | `Copper` | `selectedUnit` | `tubes` (string) | **Verifiziert:** Probe `"Copper"` — Mockup-Wert redundant zu "Tube material" oben. |
| Fins | `Aluminum` | `selectedUnit` | `fins` (string) | **Verifiziert:** Probe `"Aluminium"` (BE-Schreibweise) |
| Distr.pipe material | `Copper` | — | — | **Aufgelöst: Mockup-Rest** (s.o.). |
| Tray | `Galvanized steel` | `unitfeatures` | `key="DoubleTrayInsulated"` / `"CasingAndSimplyTray"` / `"CasingAndDoubleTray"` | **Aufgelöst:** Drei mögliche Tray-Properties in `unitfeatures`-Liste (Probe-Werte 17/50/51). Welche aktiv ist → wenn `itemValue==1` oder ungleich Default. Oder direkt aus `unitInputData.casingAndSimplyTray`/`casingAndDoubleTray`/`doubleTrayInsulated` ableiten. **Standard-Tray** wenn keine Checkbox gesetzt → "Galvanized steel" als Fallback-Label. |
| Defrost | `Electric` | `s.unitInputData.defrosting` → PDF-Enum-Lookup | direkt aus uid, Code→Label-Map | **Aufgelöst:** Probe-Default `s.unitInputData.defrosting=80` → Lookup auf [PDF #49](gpc-parameters.md#defrosting): `80="Air defrost"`. Mockup-Wert "Electric" stimmt für Default-DX NICHT — sollte "Air defrost" sein. |
| Category | `Category D` | `selectedUnit` | `pedClassification` (string) | **Verifiziert:** Probe `"Art. 4(3)"` — **Mockup-Wert "Category D" ist falsch** für PED. Echte Werte sind "Art. 4(3)" oder "Category I/II/III/IV" (PED 2014/68/EU). Direkt nutzen. |

---

## 5. Dimensions — Liste + Drawing

HTML-Block: `frontend/datasheet.html:227-256`. Links 10 Maße (L,W,H,A-G), rechts SVG-Drawing.

| Label | Aktueller Wert | API-Quelle | API-Property | Konvertierung | Bemerkung |
|---|---|---|---|---|---|
| L = | `1871 mm` | `selectedUnit` | `unitLength` | direkt | **Verifiziert:** Probe `"1686 mm"` — String enthält Einheit. |
| W = | `600 mm` | `selectedUnit` | `unitWidth` | direkt | Probe `"560 mm"` |
| H = | `580 mm` | `selectedUnit` | `unitHeight` | direkt | Probe `"565 mm"` |
| A..G | div. mm-Werte | `selectedUnit` | **`sketchLegend`** — String mit allen Maßen | Parse mit Split `/;\s*/` und Regex `/^([A-Z])\s*=\s*(.+)$/` | **Aufgelöst:** Probe liefert `sketchLegend="L = 1686 mm; B = 560 mm; H = 565 mm; E = 1360 mm; F = 406 mm; C = 177 mm; A = 40…"` — alle Buchstaben-Maße kommen als ein Semikolon-separierter String. Client-side parsen in `{L, W?, H, A, B, C, D, E, F, G}`-Map. **Achtung:** Schema variiert pro Unit (manche haben nur L/B/H/E/F/C/A, andere mehr). Robust gegen fehlende Buchstaben sein. |
| SVG Drawing | (Inline-Mockup) | `selectedUnit` | **`sketchFileName`** = volle URL | `<img src="${sketchFileName}">` oder `<object data="..." type="image/svg+xml">` | **Aufgelöst:** Probe `sketchFileName="https://webgpc.blob.core.windows.net/sketches/gacc2_uni.svg"` — komplette Blob-Storage-URL, direkt embedbar. Cross-Origin könnte beim Direktladen Probleme machen → falls nötig via Proxy. `subSketchFileName` ist im Probe leerer Base-URL (Sub-Sketch nur bei manchen Units relevant). |
| Drain-Note | static text | `selectedUnit` | `sketchNote` | direkt anzeigen | **Aufgelöst:** Probe `sketchNote="Drain according to DIN ISO 228-1 with G-thread (flat gasket).\nAttention: Drawing…"` — bereits backend-formatiert. Direkt nutzen statt Mockup-Text "DIN EN 378". |

---

## 6. Model Designation

HTML-Block: `frontend/datasheet.html:261-266`.

| Label | Aktueller Wert | API-Quelle | API-Property | Bemerkung |
|---|---|---|---|---|
| Model code | `GACV AP 080.2HN/2E-A0.B-1922.0CH` | `selectedUnit` | `unitKey` (string) | identisch zu Step-4-Result-Spalte. Direkt verwenden. |
| Copy-Link | — | static | — | UI-only, optional JS copy-to-clipboard |

---

## 7. Pricing Section

HTML-Block: `frontend/datasheet.html:269-285`. Tabelle mit Mockup-leeren Zellen.

| Tabellen-Zeile | Aktueller Wert | API-Quelle | API-Property | Bemerkung |
|---|---|---|---|---|
| Unit price | leer | `selectedUnit` | `unitPrice` (number) | `.toFixed(0) + ' EUR'`. Wenn `priceOnDemand` truthy → "On request" statt Zahl |
| Accessories rows | leer | `selectedUnit` | `accessories[]: FindUnitsResultOutputDataAccessory[]` (name, count, singelPrice, price, priceOnRequest) | dynamisch pro Accessory eine `<tr>` rendern |
| Total (footer) | nicht im Mockup | `selectedUnit` | `total_price` (number) oder `listPrice_without_Surcharge` + `materialSurcharge` | optional eine `<tfoot>` mit Summe ergänzen |
| Material surcharge | nicht im Mockup | `selectedUnit` | `materialSurcharge` (number) | optionale eigene Zeile |

**Vorschlag:** Tabellen-Body komplett dynamisch rendern aus `accessories[]`. Header bleibt statisch. Footer mit `total_price` ergänzen.

---

## 8. Delivery

HTML-Block: `frontend/datasheet.html:290-293`.

| Label | Aktueller Wert | API-Quelle | API-Property | Bemerkung |
|---|---|---|---|---|
| Delivery time | `9 weeks` | `selectedUnit` | `deliveryTime` (string) | direkt — bereits formatiert mit Einheit |
| Delivery-Note | static text | static | — | Legal-Text bleibt statisch |

---

## 9. IMPACT Section — 4 Spalten, 2 Bereiche + Rating

HTML-Block: `frontend/datasheet.html:298-340`.

### 9.1 Performance-Werte (linke 2 Spalten)

| Label | Aktueller Wert | API-Quelle | API-Property | Konvertierung | Bemerkung |
|---|---|---|---|---|---|
| Total el. power consumption | `0.4 kW` | `selectedUnit` | `totalPowerConsumption` (number) | `.toFixed(2) + ' kW'` | **Verifiziert:** Probe `0.41` → bereits in **kW** (NICHT Watts). Direkt formatieren. |
| Air volume | `6,200 m³/h` | `selectedUnit` | `airVolumeFlow` | wie Section 2.1 | redundant |
| Fan el. (SFPint) | `230 W/(m³/s)` | — | — | — | **Aufgelöst: nicht in API.** `impactData`-Probe-Keys sind nur: `co2Footprint`, `co2FootprintPerYear`, `emissionFactor`, `energyCosts`, `energyCostsPerKWh`, `energyCostsPerYear`, `energyUse`, `energyUsePerYear`, `location`, `operationLife`, `operationLifeShort`. **Kein SFPint.** Mockup-Rest. Phase-2-Klärung mit Maike. |
| Energy efficiency class | `D (2014)` | `selectedUnit` | `energyEfficencyClass` (Tippfehler im Schema!) | direkt + Jahr-Suffix (statisch oder `selectedUnit.erp`-Wert) | **Verifiziert:** Probe `"D"` (nur Buchstabe). Jahr "(2014)" ist UI-Suffix, statisch anhängen, oder aus `erp`-Feld (ErP-Regelung-Jahr) wenn dort enthalten. |
| Defrost el. power | `0 kW` | `selectedUnit` | (kein direktes Feld) | — | **Aufgelöst: nicht in API.** Mockup-Rest. Bei `defrosting=80=Air defrost` ist el. Defrost-Power inhärent `0`. Für andere Defrost-Modi nicht direkt verfügbar. **Empfehlung:** Fall-spezifisch: bei `defrosting∈{0,80}` zeige `0 kW`, sonst "—" oder über Backend nachfragen. |
| COP_air (at full load) | `25.0` | — | — | — | **Aufgelöst: nicht in API.** Kein COP-Wert in `impactData`. **Empfehlung:** Aus `thermalCapacity / totalPowerConsumption` clientseitig berechnen — Probe: `10 / 0.41 = 24.4` → matched Mockup-Wert ~25.0. **Formel:** `(thermalCapacity / totalPowerConsumption).toFixed(1)`. |

### 9.2 Q_usable + Rating (rechte 2 Spalten)

| Label | Aktueller Wert | API-Quelle | API-Property | Konvertierung | Bemerkung |
|---|---|---|---|---|---|
| Useful cooling energy (Q_usable) | `10.0 kW` | `selectedUnit` | `thermalCapacity` | wie Section 2.1 | redundant zu "Capacity" oben |
| Surface Reserve | `-8.5 %` | `selectedUnit` | `surfaceReserve` | wie Section 2.1 | redundant |
| COP (full load) | `25.0` | (client-berechnet) | s.o. | s.o. | redundant zu COP_air — Mockup duplicated den Wert |
| IMPACT Rating (label + 5 stars) | `5.0` + 5× green star | `selectedUnit` | `impactRating` | Float rendern + Star-Count | **Verifiziert:** Probe `impactRating=2` (Integer, nicht 5.0). **Skala:** 1.0–5.0 (laut PDF-Doku), niedrigere Werte = effizienter (1=very good, 5=insufficient). **Korrektur Mockup:** Mockup zeigt 5 von 5 grünen Sternen für "5.0" — sollte umgekehrt sein (Wert=2 → 2 von 5 Sternen). Logik: `Math.round(rating)` volle Sterne füllen, Rest leer. |

---

## 10. IMPACT Product Life Cycle — 4 Spalten, 2 Bereiche

HTML-Block: `frontend/datasheet.html:344-369`. **Wichtig:** Alle 6 Werte sind primär **User-Inputs aus Step 3** (Unit-Selection-Page, Impact-Section). Backend liefert berechnete IMPACT-Werte zusätzlich in `selectedUnit.impactData`-dict.

| Label | Aktueller Wert | API-Quelle | API-Property | Bemerkung |
|---|---|---|---|---|
| Operation life | `15 years` | `selectedUnit.impactData.operationLife` ODER `s.unitInputData.impactOperationLife` | beide-string-formatiert | **Verifiziert:** `impactData["operationLife"]="15 years"` — direkt nutzen statt User-Input (Backend formatiert) |
| Energy costs | `0.30 €/kWh` | `selectedUnit.impactData.energyCostsPerKWh` | direkt | **Verifiziert:** `impactData["energyCostsPerKWh"]="0.30 EUR / kWh"` — bereits formatiert |
| Planning factor | `120 %` | `s.unitInputData` | `impactPlanningFactor` + " %" | **Verifiziert:** Probe `uid.impactPlanningFactor=120` — kein Pendant in `impactData`, also aus uid lesen |
| Energy CO² emissions | `380 g CO²/kWh` | `selectedUnit.impactData.emissionFactor` | direkt | **Verifiziert:** `impactData["emissionFactor"]="380 g CO2/kWh"` — bereits formatiert |
| Location | `Germany` | `selectedUnit.impactData.location` | direkt | **Verifiziert:** `impactData["location"]="Germany"` — **Backend macht den Country-ID→Name-Lookup bereits**. Kein eigener Lookup nötig. |
| Prediction model | `Active` | `s.unitInputData.impactUsePredictionModelDefrost` (0/1) → "Active"/"Inactive" | direkt | **Verifiziert:** Probe `uid.impactUsePredictionModelDefrost=0` → würde "Inactive" zeigen (Mockup zeigt "Active" — Mockup-Default war anders) |

**Bonus aus `impactData` (für eine erweiterte IMPACT-Section sinnvoll):**

| Optional-Label | API-Property | Wert (Probe) |
|---|---|---|
| CO2 Footprint (total) | `impactData["co2Footprint"]` | "17.0 t CO2" |
| CO2 Footprint per year | `impactData["co2FootprintPerYear"]` | "1.1 t CO2 / a" |
| Energy costs total (lifetime) | `impactData["energyCosts"]` | "13.387,49 EUR" |
| Energy costs per year | `impactData["energyCostsPerYear"]` | "892,50 EUR / a" |
| Energy use total | `impactData["energyUse"]` | "44.625 kWh" |
| Energy use per year | `impactData["energyUsePerYear"]` | "2.975 kWh / a" |

**Empfehlung:** Eine zusätzliche Sub-Sektion "Lifecycle Costs" mit diesen 6 Werten hinzufügen — die kommen kostenlos aus dem Backend und sind für den Anwender hochrelevant.

---

## 11. Important Remarks — bleibt static

HTML-Block: `frontend/datasheet.html:374-399`. **8 Absätze Legal-Text** (EU-Regulationen, EN-328-Hinweise, Disclaimer). Diese Texte sind nicht im API-Schema und bleiben statisch.

| Element | API-Quelle |
|---|---|
| §1–§8 Remarks-Absätze | static (Compliance/Legal-Text) |
| (Optional) Footnotes pro Wert | `selectedUnit.footNotes` (dict) + `selectedUnit.paramToFootNotes` (param→footnote-id-Array) — wenn man die Fußnoten dynamisch verlinken will. **Phase 2-Verbesserung.** |

---

## 12. Implementierungs-Plan (Strategie B, in-place)

**Empfohlene Vorgehensweise** (sequenziell, jeweils mit Test-Stop):

1. **Setup:** Code-Skelett in `datasheet.html` Script-Block — Helper-Funktionen `setText(id, val)`, `setHtml(id, html)`, `fmtNum(n, digits, suffix)`, `lookupEnum(map, val)`. Lookup-Maps importieren aus `gpc-parameters.json` (z.B. via fetch beim init) für `coreTubeMaterial`, `finMaterial`, `defrosting`, `motorTechnology`. Status-Update: "Loading datasheet…".
2. **Section 1+2 (Header + Key Specs):** 12 Felder auf IDs umstellen, JS-Befüllung schreiben.
3. **Section 3+4 (Fan + Materials):** 10+14 Felder. Hier kommen die Lookup-Map-Pattern stark zum Einsatz. Open Questions parallel klären durch Probe-Call mit echtem `selectedUnit`-Response.
4. **Section 5 (Dimensions):** L/W/H einfach, A-G offen → Phase 2 (eigenes Endpoint oder String-Parse).
5. **Section 6+7+8 (Model code + Pricing + Delivery):** Pricing-Tabelle dynamisch aus `accessories[]` rendern.
6. **Section 9 (IMPACT):** Dependt auf Probe-Verifikation der `impactData`-dict-Struktur.
7. **Section 10 (IMPACT PLC):** Aus `unitInputData` direkt. Einfach.
8. **Section 11:** unverändert lassen.
9. **`#mygpc-live-datasheet`-Sektion:** Hide-by-default oder ganz entfernen — Debug-Panel ist nicht mehr nötig wenn alle Felder live sind. Vorschlag: in `<details data-debug>`-Wrap packen, im Production-Build verbergen.

**Fail-safe-Strategie:** Wenn `s.selectedUnit` fehlt (User springt direkt auf datasheet.html ohne Step 4): klare Error-Meldung im Header + Link zurück zu Results. Aktuelle Logik macht das schon — beibehalten.

**Konvertierungs-Map sammeln:** Code-Pfade die mehrfach gebraucht werden (Lookup-Maps für coreTubeMaterial/finMaterial/defrosting/motorTechnology) als kleines Modul `mygpc-output-format.js` extrahieren — bevor sie copy-pasted werden.

---

## 13. Status der Open Questions (nach Probe-Lauf 2026-05-22)

**Probe-Skript:** `rag/probe-datasheet-mapping.js` — aufgerufen via `npm run probe-datasheet` gegen Live-API (cat=0 Evap DX, Sample `GACC CX 040.2/2WN/DJA4A.UNNN`).

### ✅ Aufgelöst (direkt aus API verfügbar)
- **`thermalCapacity` Einheit** — kW (NICHT Watts wie bei UnitInputData). Direkt formatieren mit `.toFixed(1) + ' kW'`.
- **`totalPowerConsumption` Einheit** — kW (Probe `0.41`). Direkt formatieren.
- **`feedRateValue` vs `superHeating`** — kategorie-abhängig. DX: `superHeating=5`. Pump: `feedRateValue` ≠ 0. Backend liefert auch `feedRateDescription` mit komplettem Label.
- **"Motor acceleration"** (Mockup "Direct") — **gibt es nicht in der API.** Mockup-Rest. Empfehlung: Zeile entfernen.
- **"Max. current"** (Mockup "1.8 A") — gibt es nicht. Nur `fanCurrentNominal`. Mockup-Rest. Zeile entfernen.
- **"Distr. pipes" / "Distr.pipe material"** — kein API-Pendant. Mockup-Rest. Zeile entfernen.
- **"Coating"** — extrahierbar aus `casing`-String (enthält "Powder-coated RAL 9003"). Kein separater Endpoint nötig.
- **Tray** — über `unitfeatures` Keys `DoubleTrayInsulated` / `CasingAndSimplyTray` / `CasingAndDoubleTray`. Standard-Tray "Galvanized steel" als Fallback.
- **A–G Dimensions** — kommen alle als ein Semikolon-separierter String in `sketchLegend`. Clientseitig parsen.
- **Drawing-SVG** — `sketchFileName` ist eine vollständige Blob-Storage-URL. Direkt embedbar.
- **IMPACT Werte** — `impactData`-dict liefert 11 Keys (`co2Footprint`, `co2FootprintPerYear`, `emissionFactor`, `energyCosts*`, `energyUse*`, `location`, `operationLife*`). Direkt nutzen.
- **COP_air / COP_full_load** — **NICHT in der API.** Clientseitig berechnen: `thermalCapacity / totalPowerConsumption`.
- **SFPint** — NICHT in der API. Mockup-Rest. Empfehlung: entfernen oder als "—" anzeigen.
- **Defrost el. power** — kein Feld. Bei `defrosting=80=Air defrost` → 0 kW. Sonst "—".
- **`impactCountryID` Lookup** — überflüssig. Backend liefert `impactData.location="Germany"` als Klartext.

### ⚠ Korrekturen Mockup → Realität
- **`coreTubeMaterialCode`** liefert `"R"` (im Live-API), aber PDF #43 sagt `C`/`F`/`V`/`W`/`Z`. **Doku- oder Live-API-Bug.** Workaround: Statt Code-Lookup direkt `tubes`-String (`"Copper"`) nutzen. Analog `finMaterialCode="A"` → `fins="Aluminium"`.
- **Mockup-Wert "1 x MFT (780 RPM)" für Motor** — `fanCapacityDescription` liefert `"0.10 kW/0.19 kW"`, NICHT die Motor-Type-Bezeichnung "MFT". Motor-Type-Kürzel kommt vermutlich aus einem anderen Endpoint (`singleunitmodels`?) — Phase-2-Klärung.
- **Mockup-Wert "Category D" für PED** — `pedClassification` liefert `"Art. 4(3)"`. Mockup-Wert falsch.
- **Mockup-Wert "Electric" für Defrost** — bei Default-DX ist `defrosting=80=Air defrost`. Mockup-Wert falsch.
- **Mockup-Wert "5.0" für IMPACT Rating** mit 5 grünen Sternen — Probe liefert `impactRating=2` (Skala 1–5, niedrig=besser). Mockup-Logik invertiert.
- **"sound pressure" Float-Präzision** — Probe-Wert `54.231050422809886` braucht zwingend `.toFixed(1)`.

### 🔄 Phase-2-Klärung mit Maike (nicht blocker, aber UI-Feinheit)
- **"Motor"-Type-Bezeichnung** ("MFT" o.ä.) — woher? Eigener Endpoint?
- **"Air quality"** (Mockup-Wert "L / W / H") — was sollte das semantisch sein? Wahrscheinlich Mockup-Reste.
- **"Distr. pipes"** — gibt es da bei Güntner ein API-Feld, das wir noch nicht kennen?
- **Footnotes-Anzeige** — `selectedUnit.footNotes` (dict) + `paramToFootNotes` enthalten technische Hinweise zu einzelnen Werten. Phase-2-Verbesserung: pro Wert ein "(1)"-Suffix mit Hover-Tooltip zur Footnote.
- **`impactCEI` / `impactDEI`** (Probe: -1) — was bedeuten diese Werte? Wenn -1 = "nicht berechnet" → kein UI-Feature. Sonst klären.

### Probe-Sample-Files
- `rag/probe-datasheet-0-findunits.json` (26.6 KB) — komplettes `selectedUnit` + `unitInputData` für cat=0
- `rag/probe-datasheet-0-features.json` (34.1 KB) — komplette `unitfeatures`-Response

**Re-Run gegen andere Kategorien:**
```bash
npm run probe-datasheet -- 1   # Evap Pump
npm run probe-datasheet -- 2   # Air cooler Coolant
npm run probe-datasheet -- 3   # Condenser
npm run probe-datasheet -- 10  # CO2 Gas cooler
```

Für die finale Implementierung sollte mindestens **cat=3 (Condenser)** zusätzlich gegen-geprobed werden, weil das Datasheet auch für Warm-Side genutzt wird und manche Properties dort anders heißen oder strukturiert sind (`thermoCircuits[]` für Multiple-circuit-Refrigerants z.B.).
