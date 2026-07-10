# Planning — Phase 3: Nuxt-Migration & GPC.EU-API-Anbindung

> Status: **Entscheidungen geklärt — bereit zur Implementierung**
> Erstellt: 2026-05-15 · Aktualisiert: 2026-05-15
>
> Knüpft an: `Planning.md` (myGPS-Wizard), `Planning-Phase2.md` (Hauptnavigations-Seiten), `CLAUDE.md` (3-Ebenen-Architektur, State-Modell, Design-System).

---

## 0. Ausgangslage

Der Backend-Proxy zur **GPC.EU Customer API** (Spec `rag/gpceu_custromer.json`, Version 2026.8-317, 32 Endpoints) ist seit Phase 1 fertig und produktiv:

- `rag/gpceu-proxy.js` — Reverse-Proxy mit JWT-Injection, Retry-Logik, 401-Auto-Refresh, Stream-Pass-Through
- `rag/gpceu-auth.js` — Auto-Login via `POST /identity/login`, Token-Cache, `exp`-Claim-Parsing, Inflight-Dedup
- Express-Mount: `GET /api/gpc-eu/health` und `ALL /api/gpc-eu/*` in `rag-server.js:1283–1294`
- Code-Kommentar: „Phase 1 der Nuxt-Migration" — der Proxy ist explizit als Brücke für eine kommende Nuxt-App gebaut

**Aber:** Es existiert noch keine Nuxt-App. Das aktuelle Frontend sind 39 HTML-Seiten + 8 JS-Files + 5 CSS-Files Vanilla. Kein einziger Aufruf gegen `/api/gpc-eu/*` aus dem Frontend.

Diese Phase 3 schließt die Lücke.

---

## 1. Ziel & Scope

**Ziel:** Einen produktiv lauffähigen myGPS-Wizard als Nuxt-3-Anwendung gegen die GPC.EU-API liefern — als erste Vue-basierte Seite neben dem bestehenden Vanilla-Frontend.

**Im Scope:**
- Nuxt-3-Setup **mit SSR** unter `/nuxt` (eigener Top-Level-Ordner, Nitro-Server)
- Express als Reverse-Proxy für `/app/*` → Nitro
- TypeScript-Client aus OpenAPI-Spec generiert
- `useGpceu()`-Composable mit allen 32 Endpoints
- 3-Ebenen-Architektur aus `CLAUDE.md` (Technischer Weg · Anwendersicht · Standort)
- myGPS-Wizard als 8 Vue-Pages (Kategoriewahl bis Datasheet)
- Pinia-Store als zentraler Configuration-State
- Production-Build wird vom Express-Server unter `/app/*` mit ausgeliefert

**Nicht im Scope (Folge-Phasen):**
- Migration von Admin-Seiten, myGPC-Wizard, Bare-Coils-Wizard, Cart/Shipping/Payment
- User-Authentifizierung der Nuxt-App selbst (Annahme: läuft hinter VPN oder offen; siehe Klärung F5)
- DMS-/Bella-Anbindung in Vue (bleibt im Vanilla-Frontend, weil dort live)

---

## 2. Strategie: Co-Existenz statt Big-Bang

Nuxt wird **neben** dem Vanilla-Frontend aufgesetzt, nicht statt. Begründung:

- 39 HTML-Seiten + viele Inline-`<script>`-Blöcke + globale CSS-Selektoren ohne Build-System: eine Komplett-Migration in einem Schritt ist unrealistisch und blockiert laufende Wizard-Arbeit
- Der myGPS-Wizard ist Greenfield (Planning.md noch nicht umgesetzt) — der ideale Ort, um Vue/Nuxt einzuführen, ohne bestehende Logik anzufassen
- Sobald Nuxt-Pattern etabliert sind, lassen sich Folge-Wizards Schritt für Schritt nachziehen

**Route-Layout:**
- `http://localhost:3001/` und `/<seite>.html` → unverändert Vanilla (Express `express.static('frontend')`)
- `http://localhost:3001/app/*` → Nuxt-App
- `http://localhost:3001/api/*` → bleibt der Express-API-Layer (Proxy, Chat, DMS, RAG)

---

## 3. Tech-Stack-Entscheidungen

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Framework | **Nuxt 3** (latest stable, **SSR-Mode**) | File-based Routing, Composition API, Vite-Build. SSR ist gesetzt — Server-Render beim ersten Request, Hydration im Client. Nitro-Server läuft auf eigenem Port, Express proxied `/app/*` durch |
| Sprache | **TypeScript** | OpenAPI-Spec → typisierter Client via `openapi-typescript`. 32 Endpoints ohne Typsicherheit wären fehleranfällig |
| State | **Pinia** | Vue-Pendant zu Zustand (in `CLAUDE.md` als Referenz genannt). Stores per Setup-Style API |
| HTTP | **`useFetch` / `useAsyncData`** (Nuxt-built-in) | SSR-fähig (Daten werden serverseitig geholt, im Payload zum Client transportiert, vermeidet doppelte Calls). Reines `$fetch` nur für client-only Interaktionen (z. B. Form-Submits) |
| CSS | **CSS Custom Properties + CSS Modules** | Kein Tailwind/Framework — gemäß `CLAUDE.md` „Custom design system, no off-the-shelf UI library". Tokens aus `frontend/styles.css` extrahieren |
| Forms | **Native Vue** (keine Form-Library) | Konfigurator-Inputs sind nicht komplex genug, um Vuelidate/zod zu rechtfertigen |
| Charts | (offen) | Erst relevant für Annual-Analysis-Step. Vorschlag: Chart.js oder ECharts, Entscheidung verschoben |
| i18n | **`@nuxtjs/i18n`** | DE/EN/FR — primäre Sprachen laut `CLAUDE.md` |
| Build | **Vite** (via Nuxt) | Standard, keine Custom-Konfiguration nötig |

---

## 4. Verzeichnis-Struktur

```
nuxt/                          # neuer Top-Level-Ordner neben /frontend
├── nuxt.config.ts             # baseURL=/app, devProxy /api/* → :3001
├── package.json               # eigene deps, eigenes lock-file
├── tsconfig.json
├── app.vue                    # Root mit globalem Layout
├── layouts/
│   └── default.vue            # Header, Footer, Chatbot-Slot, SyncPanel
├── pages/
│   ├── index.vue              # Landing (verlinkt zu Wizards)
│   └── mygps/
│       ├── index.vue          # Step 1 — Kategoriewahl
│       ├── projects.vue       # Step 2 — Project Info
│       ├── inputs.vue         # Step 3 — Selector Inputs
│       ├── accessories.vue    # Step 4 — Options & Accessories
│       ├── service.vue        # Step 5 — Service & Pricing
│       ├── output.vue         # Step 6 — Selector Output
│       ├── annual.vue         # Step 7 — Annual Analysis
│       └── datasheet.vue      # Step 8 — Datasheet
├── components/
│   ├── StepWizard.vue
│   ├── ActionBar.vue
│   ├── PerspectiveSwitcher.vue
│   ├── ParameterInput.vue     # perspective-aware (CLAUDE.md §3)
│   ├── SyncPanel.vue          # Cross-Perspective Mirror (CLAUDE.md §6)
│   ├── DataGrid.vue           # entspricht `.dg`-Pattern aus Planning-Phase2.md
│   ├── RefrigerantAdvisor.vue # CLAUDE.md §4
│   └── UnitToggle.vue         # US/SI Switch (Planning.md §7)
├── composables/
│   ├── useGpceu.ts            # API-Client, Abschnitt 5
│   ├── usePerspective.ts      # aktive Ebene (technical|application|location)
│   ├── useUnits.ts            # US/SI Umrechnung
│   └── useFlows.ts            # Step-Konfiguration aus mygps-flows.js portiert
├── stores/
│   └── configuration.ts       # Pinia — entspricht ConfigurationState aus CLAUDE.md
├── types/
│   └── gpceu.d.ts             # GENERIERT — nicht von Hand editieren
└── assets/css/
    ├── tokens.css             # Brand-Farben, Spacing, Typo (aus frontend/styles.css)
    └── components.css         # Buttons, Cards, Form-Elemente
```

---

## 5. API-Anbindung — `useGpceu()` Composable

### 5.1 Endpoint-Inventar (alle 32 aus der Spec, gruppiert)

**Setup / Defaults / Metadata**
- `gpcversion` — Version-Check (schon für Health verwendet)
- `productcategories` — Kategorien-Liste für Step 1
- `inputcapacitymodes` — Wahl des Calculation-Mode
- `defaultinputdata`, `defaultcoilinputdata` — Defaults pro Kategorie/Coil
- `GetInputData`, `GetInputDataCoil`, `GetInputString` — Input-Definitionen
- `properties1ph` — 1-Phasen-Eigenschaften
- `getairconfiguration` — Luft-Setup
- `getdefaultpartloadconfig` — Part-Load-Defaults für Annual-Analysis

**Refrigerants / Fluids**
- `fluids` — Refrigerant-Liste
- `fluidinputmode` — Eingabe-Modus
- `fluidsconfiguration` — Config-Validierung

**Unit Search & Models**
- `findunits` — Haupt-Such-Endpoint für Selector-Output
- `findcoils` — Coil-Suche (Bare-Coils-Pfad)
- `unitgroup`, `unitmodels`, `singleunitmodels` — Hierarchie der Modelle
- `coilgeometry` — Geometrie-Optionen
- `getinsertionfortubes` — Rohr-Einfügungen

**Recalc / Validate**
- `RecalculateUnit` — Neu-Berechnung einer Unit
- `RecalculationInputData` — Recalc-Eingabe-Schema
- `validateunitconfiguration` — Vor-Submit-Validierung

**Output / Datasheet**
- `unitfeatures` — Feature-Liste für Datasheet
- `unitbidtext` — Bid-Text für Datenblatt

**Annual Analysis**
- `partloadcalculation` — Hauptberechnung Annual-Analysis
- `impactrating` — Umwelt-Impact (GWP etc.)
- `GetCountryEmissionData` — Länderspezifische Emissionen

**File Handling**
- `getgpcfilecontent`, `GetNativeContents` — Datei-Download (Datasheet-PDF, Drawing)
- `uploadfile` — Upload (User-Bilder, Custom-Daten)

### 5.2 Codegen

```bash
npx openapi-typescript rag/gpceu_custromer.json -o nuxt/types/gpceu.d.ts
```

Als `npm run gen:gpceu-types` in der Root-`package.json` verankern, damit Type-Drift bei API-Updates leicht erkennbar ist.

### 5.3 Composable-Skizze

SSR-Hinweis: Daten, die schon beim ersten Render gebraucht werden (z. B. `productCategories` für Step 1), werden über `useFetch`/`useAsyncData` geholt — Nuxt führt den Call serverseitig aus und serialisiert das Ergebnis ins `__NUXT__`-Payload. Imperative Calls (Submit, Recalc) nutzen direkt `$fetch`.

```ts
// nuxt/composables/useGpceu.ts
import type { paths, components } from '~/types/gpceu';

type Schema<K extends keyof components['schemas']> = components['schemas'][K];

// Base-URL kommt aus runtimeConfig:
//   - server-side: http://localhost:3001/api (interner Loopback zum Express)
//   - client-side: /api (über Express auf gleicher Origin)
function apiBase() {
  const { apiBase, public: { apiBase: publicBase } } = useRuntimeConfig();
  return import.meta.server ? apiBase : publicBase;
}

export function useGpceu() {
  const base = apiBase();
  const get = <T>(path: string, query?: Record<string, any>) =>
    $fetch<T>(`${base}/gpc-eu/${path}`, { query });
  const post = <T>(path: string, body: any, query?: Record<string, any>) =>
    $fetch<T>(`${base}/gpc-eu/${path}`, { method: 'POST', body, query });

  return {
    version:                () => get<Schema<'GpcVersion'>>('gpcversion'),
    productCategories:      (languageID = 2) => get<Schema<'ProductCategory'>[]>('productcategories', { languageID }),
    inputCapacityModes:     () => get<Schema<'CapacityMode'>[]>('inputcapacitymodes'),
    defaultInputData:       (body: Schema<'DefaultInputRequest'>) => post('defaultinputdata', body),
    findUnits:              (body: Schema<'FindUnitsRequest'>) => post('findunits', body),
    findCoils:              (body: Schema<'FindCoilsRequest'>) => post('findcoils', body),
    recalculateUnit:        (body: Schema<'RecalcRequest'>) => post('RecalculateUnit', body),
    validateUnitConfig:     (body: Schema<'ValidationRequest'>) => post('validateunitconfiguration', body),
    unitFeatures:           (body: Schema<'UnitFeaturesRequest'>) => post('unitfeatures', body),
    unitBidText:            (body: Schema<'UnitBidTextRequest'>) => post('unitbidtext', body),
    fluids:                 (languageID = 2) => get<Schema<'Fluid'>[]>('fluids', { languageID }),
    fluidsConfiguration:    (body: Schema<'FluidsConfigRequest'>) => post('fluidsconfiguration', body),
    partLoadCalculation:    (body: Schema<'PartLoadRequest'>) => post('partloadcalculation', body),
    impactRating:           (body: Schema<'ImpactRatingRequest'>) => post('impactrating', body),
    countryEmissionData:    (countryCode: string) => get<Schema<'EmissionData'>>('GetCountryEmissionData', { countryCode }),
    getFileContent:         (fileId: string) => get<Blob>('getgpcfilecontent', { fileId }),
    uploadFile:             (form: FormData) => $fetch('/api/gpc-eu/uploadfile', { method: 'POST', body: form }),
    // ... weitere 14 Endpoints analog
  };
}
```

### 5.4 Error-Handling-Vertrag

Der Proxy liefert deterministische Fehler-Objekte (`PROXY_CONFIG_MISSING`, `PROXY_AUTH_MISSING`, `PROXY_AUTH_FAILED`, `PROXY_AUTH_REFRESH_FAILED`, `PROXY_TIMEOUT`, `PROXY_UPSTREAM_FAIL`). Eine zentrale `useGpceuError()`-Funktion mappt diese auf UI-freundliche Hinweise:

| Code | UI-Hinweis |
|---|---|
| `PROXY_CONFIG_MISSING` | „API-URL nicht konfiguriert. Bitte Administrator kontaktieren." |
| `PROXY_AUTH_MISSING` | „Authentifizierung fehlt. Bitte Administrator kontaktieren." |
| `PROXY_AUTH_FAILED` | „Login zur GPC-API fehlgeschlagen. Bitte Administrator kontaktieren." |
| `PROXY_TIMEOUT` | „GPC-API antwortet nicht. Bitte später erneut versuchen." |
| `PROXY_UPSTREAM_FAIL` | „GPC-API-Fehler. Bitte erneut versuchen." |

### 5.5 Dev- und Production-Routing (SSR)

**Architektur:** Express bleibt auf `:3001` (Public-Endpoint, hat `/api/*` + Vanilla-Frontend). Nitro läuft auf eigenem Port (`:3002` per Default — über `NUXT_PORT` konfigurierbar). Express proxied alle Requests auf `/app/*` zu Nitro durch — Nitro liefert SSR-HTML und Hydration-Bundles aus.

**`nuxt.config.ts`:**
```ts
export default defineNuxtConfig({
  ssr: true,
  app: { baseURL: '/app/' },
  runtimeConfig: {
    // server-only — wird beim SSR-Call genutzt (interner Loopback)
    apiBase: process.env.NUXT_API_BASE_INTERNAL || 'http://localhost:3001/api',
    public: {
      // im Browser sichtbar — relativ, läuft via Express auf gleicher Origin
      apiBase: '/api',
    },
  },
  nitro: {
    // Dev-Proxy nicht nötig — server-side Calls gehen direkt an apiBase (server-only)
  },
});
```

**Express-Routing (`rag-server.js`):**
```js
// http-proxy-middleware-Variante:
const { createProxyMiddleware } = require('http-proxy-middleware');
const NUXT_TARGET = process.env.NUXT_TARGET || 'http://localhost:3002';
app.use('/app', createProxyMiddleware({ target: NUXT_TARGET, changeOrigin: true, ws: true }));
// SSR-Hydration lädt `/app/_nuxt/*`-Assets — die müssen auch zu Nitro proxied werden,
// deshalb genügt ein Prefix-Proxy auf `/app` (Nuxt baseURL = `/app/`)
```

`http-proxy-middleware` als neue Root-Dependency (Lightweight, ~1 MB).

**Produktion-Workflow:**
```bash
# nuxt/ — eigener Build
cd nuxt && npm run build       # erzeugt nuxt/.output/server/index.mjs
# Root: zwei Prozesse starten
node rag-server.js              # Express :3001
node nuxt/.output/server/index.mjs   # Nitro :3002 (oder via PM2/systemd)
```

Optional als `npm run start:all` in der Root-`package.json` via `concurrently`.

---

## 6. Drei-Ebenen-Architektur (Umsetzung)

Gemäß `CLAUDE.md` muss jede UI-Komponente die drei Perspektiven (Technischer Weg · Anwendersicht · Standort) gleichzeitig kennen und reaktiv reflektieren. Konkrete Umsetzung in Vue:

### 6.1 State (`stores/configuration.ts`)

```ts
export const useConfigStore = defineStore('configuration', () => {
  const activePerspective = ref<'technical' | 'application' | 'location'>('application');
  const parameters = reactive<ConfigurationParameters>({ /* aus CLAUDE.md */ });
  const validationWarnings = ref<ValidationWarning[]>([]);
  const selectedProducts = ref<ProductSelection[]>([]);

  function setPerspective(p: typeof activePerspective.value) {
    activePerspective.value = p;
  }

  return { activePerspective, parameters, validationWarnings, selectedProducts, setPerspective };
});
```

### 6.2 Parameter-Definitionen

Eine zentrale Datei `nuxt/composables/parameterDefinitions.ts` bündelt die `ConfigParameter`-Struktur aus `CLAUDE.md` § 3 (Labels, Hints, Priority pro Perspektive). Jeder `<ParameterInput :id="..." />` zieht sich seine Darstellung aus dieser Quelle.

### 6.3 PerspectiveSwitcher

Drei-Button-Komponente im Header. Aktive Perspektive setzt CSS-Variable `--accent-color` (`#003865` / `#0078BE` / `#5B8C5A`) im `<html>`-Element — eine CSS-Transition animiert den Mode-Wechsel app-weit.

### 6.4 SyncPanel

Rechte Sidebar, sticky, zeigt die jeweils zwei **inaktiven** Perspektiven der selben Daten. Klick auf einen Parameter im SyncPanel jumpt zum jeweiligen Step in der aktiven Perspektive.

---

## 7. Geklärte Entscheidungen (2026-05-15)

| # | Frage | Entscheidung | Konsequenz |
|---|---|---|---|
| **F1** | Rendering-Mode | **SSR** (`ssr: true`) | Nitro-Server auf eigenem Port; Express proxied `/app/*` durch. SSR-Daten via `useFetch`/`useAsyncData`. Siehe Abschnitt 5.5. |
| **F2** | Route-Präfix | **`/app`** als Subpfad | `app.baseURL = '/app/'` in `nuxt.config.ts`; ein einziger `createProxyMiddleware`-Mount in Express. |
| **F3** | myGPS-Wizard-Strategie | **Direkt in Vue** | Die in `Planning.md` skizzierten HTML-Files (`mygps-projects.html` etc.) werden **nicht** in Vanilla gebaut. Stattdessen entstehen die Vue-Pages aus Abschnitt 4. `mygps-flows.js` wird zu `nuxt/composables/useFlows.ts` portiert. |
| **F4** | Configuration-Persistenz | **`localStorage` (MVP)** | Pinia-Store mit `pinia-plugin-persistedstate`. Server-Side `/api/projects` ist eigene Folge-Phase. |
| **F5** | User-Authentifizierung | **Offen lassen wie bisher** | Keine Login-Mechanik im MVP. SSO/AD-Anbindung als eigene Phase. |
| **F6** | i18n-Sprachen | **EN-only (MVP)** | `@nuxtjs/i18n` einbinden, aber nur `en.json` füllen. Strings nicht hartkodieren — DE/FR sind später ein Datei-Add, kein Code-Refactor. |
| **F7** | `Global myGPC/`-Ordner | **Löschen** | Wird im ersten Implementierungsschritt entfernt (siehe Abschnitt 8 Schritt 0). |
| **F8** | `GPCEU_*`-ENV-Sektion | **Ja, nachreichen** | `.env.example` ergänzen + neues `npm run probe-gpceu` analog zu `probe-dms`. |

---

## 8. Implementierungsreihenfolge (nach Klärung)

0. **Aufräumen (F7)** — `Global myGPC/`-Ordner löschen (nur Spec-Duplikat).
1. **ENV-Sektion in `.env.example`** ergänzen (`GPCEU_BASE_URL`, `GPCEU_JWT` ODER `GPCEU_EMAIL`+`GPCEU_PASSWORD`, optional `GPCEU_LOGIN_URL`, `GPCEU_TIMEOUT_MS`, neu: `NUXT_TARGET`, `NUXT_API_BASE_INTERNAL`).
2. **`npm run probe-gpceu`** als Skript analog zu `probe-dms`.
3. **`nuxt/`-Ordner** anlegen mit `nuxt.config.ts` (SSR on, baseURL `/app/`, runtimeConfig), eigener `package.json`, leerer Landing-Page.
4. **Express-Proxy** `app.use('/app', createProxyMiddleware(...))` in `rag-server.js` ergänzen; `http-proxy-middleware` als Dependency.
5. **Codegen** `openapi-typescript rag/gpceu_custromer.json -o nuxt/types/gpceu.d.ts` als `npm run gen:gpceu-types`.
6. **`useGpceu()`** mit 2 Smoke-Endpoints (`version`, `productCategories`) + Test-Seite `/app/_debug`.
7. **Pinia-Store + 3-Ebenen-Layer** als Foundation; `@pinia/nuxt`, `pinia-plugin-persistedstate`.
8. **myGPS-Wizard Step 1** (Kategoriewahl, `productCategories` server-side via `useFetch`).
9. **myGPS-Wizard Step 3** (Selector Inputs, `defaultinputdata` + `fluids`).
10. **myGPS-Wizard Step 6** (Output, `findunits`).
11. **myGPS-Wizard Step 8** (Datasheet, `unitfeatures` + `unitbidtext` + `getgpcfilecontent`).
12. **Restliche Steps** (2, 4, 5, 7) auffüllen.
13. **Production-Build** + Doppel-Prozess-Start (Express + Nitro), End-to-End-Smoketest gegen Live-GPC-EU.
14. **Folge-Phase 4** planen: myGPC-Wizard und Bare-Coils nach Vue.

---

## 9. Was diese Phase nicht anfasst

- Backend-Code (`rag-server.js`, `rag/*.js`) — bis auf das `app.use('/app', ...)` am Ende
- Vanilla-Frontend (`frontend/*.html`, `frontend/*.js`, `frontend/*.css`) — keine Änderungen
- DMS-/RAG-/Bella-Pipelines — laufen unverändert weiter
- `Planning.md` und `Planning-Phase2.md` — bleiben gültig für die Vanilla-Roadmap; die dortigen Vanilla-Aufgaben (Spareparts, Documents, Overview) können parallel oder nach Phase 3 erledigt werden

---

## 10. Referenzen

- Spec: `rag/gpceu_custromer.json` (32 Endpoints, Version 2026.8-317)
- Backend-Vertrag: `rag/gpceu-proxy.js`, `rag/gpceu-auth.js`
- Routen-Mount: `rag-server.js:1283–1314`
- Architektur-Bibel: `CLAUDE.md` (3 Ebenen, ConfigurationState, Design-System, Content-Tone)
- Vorhergehende Phasen: `Planning.md`, `Planning-Phase2.md`
- Tokens-Quelle: `frontend/styles.css`
- Flow-Konfiguration (zu portieren): `frontend/mygps-flows.js`
