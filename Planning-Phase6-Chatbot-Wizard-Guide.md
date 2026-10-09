# Planning Phase 6 — Chatbot-Wizard-Integration: Parameter-Guide & Results-Assist

Stand 2026-10-09 · Sprint-Abschluss

---

## Sprintziel

Günther begleitet den User durch den gesamten Konfigurations-Wizard aktiv: von der Thermodynamik-Parametereingabe über die Gerätewahl bis hin zur Ergebnisinterpretation. Statt als generischer RAG-Only-Assistent zu fungieren, passt er Modus, Prompt und UI kontextspezifisch an — automatisch, basierend auf der aktuellen Route.

---

## Was wurde gebaut

### 1. Produktbilder-Fix im Katalog (Vercel-404)

**Problem:** Der Produktkatalog unter `/admin/products/catalog` zeigte für alle Produkte 404-Fehler. Die Funktion `getCatalogProductImagePath()` in `nuxt/utils/productImagePath.ts` prüfte zuerst, ob `product.image_path` gesetzt ist — und gab diesen Wert direkt zurück. Die DB-Spalte enthielt aber veraltete Dateinamen (`.jpg`/`.png`), die nie auf den Server hochgeladen wurden.

**Fix:** Der frühe `if (product.image_path) return product.image_path`-Block wurde entfernt. Die Funktion fällt nun immer in die namensbasierten Regeln durch und liefert den Pfad zum committeten `.webp`-Hero-Bild. Alle `SERIES_IMAGE_MAP`- und `CATALOG_IMAGE_RULES`-Einträge wurden auf `.webp` aktualisiert.

`CatalogProductSlider.vue` wurde gleichzeitig korrigiert: der `v-if="p.image_path"`-Guard — der bei `null` ein Platzhalter-SVG anzeigte — wurde durch einen immer aufrufenden `getCatalogProductImagePath(p)`-Call ersetzt.

---

### 2. Parameter-Guide-Modus (Thermodynamics & Unit Selection)

Günther wechselt auf den Wizard-Seiten `/mygpc/[catId]/thermodynamics` und `/mygpc/[catId]/unit-selection` in einen direkten Fachberater-Modus statt im strikten RAG-Only-Modus zu bleiben. Das ist notwendig, weil Standardkonfigurationsfragen (z.B. „Welche Verdampfungstemperatur für Tiefkühlraum?") keine Güntner-Dokumente im RAG-Index benötigen — der Assistent soll den User produktiv begleiten, nicht bei jeder Frage auf fehlende Quellen verweisen.

**Implementierung:**

- **`nuxt/server/utils/llm.ts`** — `UserContext.assistantMode` erweitert um `'parameter-guide'`. `composeSystemPrompt()` prüft vor dem Standard-Prompt diesen Wert und gibt einen separaten Prompt-Text zurück (EN + DE). Der Parameter-Guide-Prompt:
  - Erlaubt direkten Einsatz von Thermodynamik-Fachwissen
  - Verbietet Template- und Produktempfehlungen
  - Fordert konkrete Werte mit Einheiten
  - Zitiert RAG-Quellen ergänzend, wenn verfügbar

- **`nuxt/composables/useChatStream.ts`** — `UserContext.assistantMode` im Client-Interface ergänzt.

- **`nuxt/server/api/chat.post.ts`** — `'assistantMode'` zur `USER_CONTEXT_SCALAR_KEYS`-Whitelist hinzugefügt (serverseitige Sanitization).

- **`nuxt/components/ChatDock.vue`**:
  - `isParameterGuideRoute` computed: `true` auf Thermodynamics + Unit Selection
  - `buildUserContext()`: setzt `assistantMode: 'parameter-guide'` auf diesen Routen
  - `startSubtitle`: zeigt parameterführende Beschriftung statt Standard-Slogan
  - `paramGuideQuickPrompts`: route-abhängige Quick-Prompt-Chips (Thermodynamics vs. Unit Selection)
  - Preset-Buttons: Kategorie-Presets (Air Cooler, Dry Cooler, …) werden auf Parameter-Guide-Routen ausgeblendet; stattdessen erscheinen die fachlichen Quick-Prompt-Chips
  - `RecommendedProducts`-Karte: unterdrückt auf Parameter-Guide-Routen (Guard in `v-else-if`)

---

### 3. Guided Multi-Step Flow: Thermo → Unit Selection → Results

Der Guided-Flow begleitet den User durch die drei Wizard-Phasen und bietet am Ende jeder Phase eine explizite Navigations-CTA statt stumm auf den nächsten Klick zu warten.

**Änderungen in `nuxt/data/guidedFlows.ts`:**

#### Abschluss-Step in Thermodynamik-Flows

Beide Thermodynamik-Flows (`thermoRefrigerantFlow`, `thermoLiquidFlow`) erhalten je einen abschließenden Step mit `kind: undefined` (kein Recommendation-Step), der:
- Bestätigt dass die Parameter gesetzt sind
- Eine „Continue to Unit Selection →"-Suggestion bietet, die per `ctx.push(...)` navigiert

```typescript
// Beispiel aus thermoRefrigerantFlow:
{
  id: 'r-continue-unit',
  message: 'Your thermodynamics parameters are set. ...',
  suggestions: [{
    label: 'Continue to Unit Selection →',
    apply: (ctx) => ctx.push(`/mygpc/${findCategoryIdBySlug(slug)}/unit-selection`)
  }]
}
```

**Auto-Skip der Recommendation-Steps:**

Ein Watcher in `ChatDock.vue` erkennt, wenn der aktive Guided-Step `kind === 'recommendations'` hat und die Route eine Parameter-Guide-Route ist — und überspringt diesen Step automatisch per `guided.advance()`. Die `RecommendedProducts`-Karte bleibt damit unsichtbar (doppelte Absicherung).

#### Neuer `unitSelectionFlow`

Ein neuer Flow `unit-selection-guide` mit `match: /^\/mygpc\/\d+\/unit-selection$/` wurde zur `GUIDED_FLOWS`-Registry hinzugefügt. Er enthält einen Orientierungs-Step der:
- Erklärt die drei Steuerungsmöglichkeiten im Unit-Selection-Panel (Serien, Motortyp, Einschränkungen)
- Eine „Show Results →"-Suggestion bietet, die zu `/mygpc/[catId]/search` navigiert

Der Flow sitzt in der Registry **vor** den Thermodynamik-Flows, damit `useGuidedFlow.reset()` die korrekte Matchpriorität trifft.

---

### 4. Results-Seite: Ergebnis-Assistenz-Modus

Auf der Ergebnisseite (`/mygpc/[catId]/search`) übernimmt Günther die Rolle eines Ergebnis-Navigators. Die Kategorie-Preset-Buttons werden ausgeblendet, und beim Landen auf der Seite erscheint stattdessen ein orientierender Willkommenstext.

**Implementierung:**

- **`nuxt/server/utils/llm.ts`** — `assistantMode` um `'results-guide'` erweitert. Separater Prompt (EN + DE):
  - Erklärt Ergebnisspalten (Leistung, Luftmenge, Abmessungen, Schallpegel, Options-Codes)
  - Hilft beim Vergleich (EC vs. AC, Leistungsreserve, Gewicht)
  - Schlägt Filterwege für lange Ergebnislisten vor
  - Verweist für Parameteränderungen zurück zur Thermodynamik
  - Zitiert RAG-Quellen wenn verfügbar

- **`nuxt/components/ChatDock.vue`**:
  - `isResultsRoute` computed: `true` auf `/mygpc/[catId]/search`
  - `buildUserContext()`: setzt `assistantMode: 'results-guide'` auf der Results-Route
  - `startSubtitle`: zeigt results-spezifischen Hilfetext
  - `performReset()`: injiziert beim Landen auf der Results-Route einen statischen Orientierungstext in die History (Spalten erklären / Modelle vergleichen / Liste eingrenzen) — kein Guided-Flow-Step, kein LLM-Call
  - Preset-Guard: `!isResultsRoute` ergänzt zu den Bedingungen für Standard-Presets

---

## Architektur-Entscheidungen

### Prompt-Modus via `userContext.assistantMode`

Der Modus-Schalter liegt im `UserContext`-Objekt, das bei jedem Chat-Request mitgeschickt wird. Das hat zwei Vorteile:

1. **Caching:** Der System-Prompt ist Anthropic-seitig ephemeral-gecacht. Der Moduswechsel passiert im `userContent`-Block (nicht in `systemBlocks`), sodass Cache-Hits nicht verloren gehen.
2. **Konsistenz:** Alle drei LLM-Adapter (Bella/Anthropic, Gemini, OpenRouter) rufen `composeSystemPrompt()` auf — der Moduswechsel wirkt sofort auf alle Provider.

### Doppelte Unterdrückung der Recommendation-Karte

Die `RecommendedProducts`-Karte ist auf Parameter-Guide-Routen auf zwei Wegen gesperrt:
- **Template-Ebene:** `v-else-if` mit `!isParameterGuideRoute`-Guard
- **Flow-Ebene:** Auto-Advance-Watcher überspringt Recommendation-Steps per `guided.advance()`

Beide Sperren zusammen verhindern, dass ein Edge-Case (z.B. Flow-State bei Page-Reload) die Karte doch noch durchlässt.

### `performReset()` als Einstiegspunkt für statische Nachrichten

Der Context-Reset-Watcher (`flowContextOf`-Logik) ruft `performReset()` bei jedem Routenwechsel in einen neuen Kontext. Die Results-Seite nutzt diesen Mechanismus, um beim Einsteigen sofort eine Orientierungsnachricht zu injizieren — ohne LLM-Call, ohne Guided-Flow, direkt in `history.value`. Das ist schneller als Streaming und garantiert, dass der Text beim ersten Öffnen des Chatbots sofort sichtbar ist.

---

## Geänderte Dateien

| Datei | Art der Änderung |
|---|---|
| `nuxt/utils/productImagePath.ts` | Entfernung Early Return, `.webp`-Update |
| `nuxt/components/CatalogProductSlider.vue` | `v-if`-Guard entfernt, `getCatalogProductImagePath` immer aufgerufen |
| `nuxt/server/utils/llm.ts` | `assistantMode`-Union erweitert, `results-guide`-Prompt-Branch (EN+DE) |
| `nuxt/composables/useChatStream.ts` | `assistantMode`-Typ aktualisiert |
| `nuxt/server/api/chat.post.ts` | `'assistantMode'` in Whitelist |
| `nuxt/components/ChatDock.vue` | `isResultsRoute`, `buildUserContext`, `performReset`, `startSubtitle`, Preset-Guards |
| `nuxt/data/guidedFlows.ts` | Abschluss-Steps in Thermo-Flows, neuer `unitSelectionFlow` |
| `nuxt/server/utils/llm-bella.ts` | `composeSystemPrompt`-Signatur (userContext übergeben) |
| `nuxt/server/utils/llm-gemini.ts` | dto. |
| `nuxt/server/utils/llm-openrouter.ts` | dto. |

---

## Bekannte Einschränkungen / Nächste Schritte

| Punkt | Beschreibung |
|---|---|
| Results-Seite ohne Produktdaten im Prompt | `assistantMode: 'results-guide'` gibt dem LLM den Konfigurationskontext (Params), aber keine Zeilen aus der Ergebnistabelle. Für „Erkläre Einheit X in Zeile 3" müsste der User den Typcode eintippen. Mittelfristig: ausgewählte Unit-Keys aus dem Results-Store in `buildUserContext()` einspeisen. |
| Quick-Prompts auf Results nicht implementiert | Die Results-Seite zeigt weder Parameter-Quick-Prompts noch Preset-Buttons. Der orientierungstext in `performReset()` ist der einzige Einstieg. Ein Set ergebnisbasierter Quick-Prompts (z.B. „Vergleiche die 3 besten Treffer") wäre eine sinnvolle Ergänzung. |
| `unitSelectionFlow` hat nur einen Step | Der Flow endet mit der „Show Results →"-CTA. Detailliertere Erklärungen zu Filteroptionen (EC/AC, Abmessungen, Schallpegel) könnten als weitere Steps folgen. |
| Kein automatisches Öffnen des Chatbots auf Results | Günther öffnet sich nicht automatisch, wenn der User die Results-Seite betritt. Der Orientierungstext ist nur sichtbar, wenn der Chatbot bereits offen ist oder aktiv geöffnet wird. |
