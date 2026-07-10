# myGPC — Setup & Quickstart

Güntner Product Configurator mit RAG-Wissensdatenbank, d.velop-DMS-Anbindung
und Bella (Anthropic Claude Sonnet 4.6) als technischer Assistent.

---

## In 5 Minuten zum laufenden System

### 1. Voraussetzungen

- **Node.js 18+** (auf 26 entwickelt — `node --version`)
- **API-Keys**:
  - **Anthropic** — Bella-LLM. Holen unter https://console.anthropic.com/settings/keys
  - **OpenAI** *(optional)* — nur wenn man auf OpenAI-Embeddings statt lokales TF-IDF wechseln will
- **DMS-Zugang** — Bearer-Token + Repository-UUID vom Güntner DMS-Admin

### 2. Dependencies installieren

```bash
npm install
```

### 3. Konfiguration

```bash
cp .env.example .env
# .env in Editor öffnen und füllen:
#   ANTHROPIC_API_KEY=sk-ant-...
#   DMS_REPOSITORY_ID=cffcc398-5466-586f-921f-4655e26f70e0
#   DMS_API_KEY=<bearer token vom DMS-Admin>
```

### 4. Verbindungen prüfen

```bash
# Anthropic-Key gültig?
npm run test-bella

# DMS erreichbar?
npm run probe-dms
```

Beide Probes geben einen klaren `[OK]`/`[FAIL]`-Report.

### 5. Server starten

```bash
npm start
```

Browser auf <http://localhost:3001/admin-documents.html>.

### 6. (Optional) Nuxt-Frontend starten

Die Phase-3-Nuxt-App lebt im `nuxt/`-Ordner und wird über den Express-Proxy
unter `/app/*` ausgeliefert.

```bash
npm run nuxt:install            # einmalig
npm run nuxt:types              # generiert types/gpceu.d.ts aus der OpenAPI-Spec
npm run dev:all                 # Express :3001 + Nuxt :3002 parallel
```

Browser auf <http://localhost:3001/app/> → Landing der Nuxt-App. Debug-Page
unter <http://localhost:3001/app/_debug>.

Für Production:

```bash
npm run nuxt:build
npm run start:all
```

### Ohne GPC.EU-Credentials entwickeln (Mock-Modus)

Bis ein Service-Account verfügbar ist, kann der Wizard end-to-end gegen
lokalen Fixture-Daten laufen:

```bash
# in .env setzen:
GPCEU_MOCK=1

npm run dev:all
```

Der Proxy short-circuits alle `/api/gpc-eu/*`-Calls nach `rag/gpceu-mock.js`.
Sichtbares Indiz: Health-Response enthält `mock: true`, der Server-Log zeigt
`[GPCEU-MOCK] ...` statt `[GPCEU] ...`.

Mit `GPCEU_MOCK=0` (oder Zeile entfernen) schaltet der Proxy zurück auf den
echten Upstream — keine Frontend-Änderungen nötig.

---

## Erste Schritte im UI

1. **Dokumente importieren**: „Fetch DMS Information" → suchen → auswählen → „Add to RAG"
2. **Indexierung läuft** im Hintergrund (Job-Polling alle 1,5 s in der Statusleiste)
3. **Chatbot öffnen** (rechts unten) → freie Frage stellen → Bella antwortet mit Quellenangaben

---

## NPM-Skripte — Übersicht

| Befehl | Was es macht |
|---|---|
| `npm start` | Startet den RAG-Server auf Port 3001 |
| `npm run dev` | Alias für `start` |
| `npm run build-db` | Baut `frontend/database/products.json` aus den CSV/XLSX in `/products/` |
| `npm run probe-dms` | Reverse-Engineering-Probe gegen DMS — testet alle Auth-Modes & URL-Patterns |
| `npm run probe-dms-2` | Vertieftes Schema-Probe (Source, Search, HAL-Links) |
| `npm run probe-gpceu` | 4-Stufen-Probe gegen GPC.EU: ENV → Login → /gpcversion → Smoke-Calls (skipped Stufe 2 im Mock-Modus) |
| `npm run test-bella` | Health-Check gegen Anthropic — verifiziert Key & Modell |
| `npm run test-ingestion` | End-to-End-Test: lädt `dmsId=P002925864` aus DMS, jagt es durch die Pipeline |
| `npm run smoke` | Sanity-Check der wichtigsten API-Endpoints (Server muss laufen) |
| `npm run nuxt:install` | Installiert Nuxt-Dependencies im `nuxt/`-Ordner |
| `npm run nuxt:types` | Generiert `nuxt/types/gpceu.d.ts` aus `rag/gpceu_custromer.json` |
| `npm run nuxt:dev` | Startet Nitro-Dev-Server auf Port 3002 (HMR aktiv) |
| `npm run nuxt:build` | Production-Build der Nuxt-App in `nuxt/.output/` |
| `npm run nuxt:preview` | Startet den gebauten Nitro-Server auf Port 3002 |
| `npm run dev:all` | Express + Nuxt-Dev parallel — myGPC unter http://localhost:3001/app/ |
| `npm run start:all` | Express + Nitro-Preview parallel (für lokalen Production-Smoketest) |

### Verbose-Probe (Plattform-spezifisch)

```bash
# Linux / macOS
PROBE_VERBOSE=1 npm run probe-dms

# Windows PowerShell
$env:PROBE_VERBOSE='1'; npm run probe-dms

# Windows CMD
set PROBE_VERBOSE=1 && npm run probe-dms
```

---

## Architektur-Übersicht

```
┌──────────────────────────────────────────────────────────────┐
│  Browser — Admin-UI + Chatbot                               │
│  /admin-documents.html, /admin-rag-settings.html, frontend/* │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      │   HTTP / SSE
                      ▼
┌──────────────────────────────────────────────────────────────┐
│  rag-server.js — Express auf Port 3001                       │
│                                                              │
│  /api/documents/*    Dokument-Verwaltung                     │
│  /api/rag/*          Vector-Store-Stats, Query, Settings     │
│  /api/dms/*          DMS-Suche & Bulk-Import                 │
│  /api/chat           Bella SSE-Streaming                     │
└──┬───────────────┬──────────────┬─────────────────────────────┘
   │               │              │
   ▼               ▼              ▼
┌─────────┐   ┌────────┐    ┌──────────────────┐
│ rag/    │   │ rag/   │    │ rag/             │
│ vector- │   │ dms-   │    │ llm-bella.js     │
│ store   │   │ conn-  │    │  → @anthropic-ai │
│ (JSON-  │   │ ector  │    │     /sdk         │
│ Files)  │   │   ↓    │    │                  │
└─────────┘   │  d.velop d.3one  │ Anthropic Claude
              │  prod.guentner   │ Sonnet 4.6
              └────────┘    └──────────────────┘
```

### Datenfluss „Frage stellen"

```
User-Frage
    ↓
POST /api/chat
    ↓
[1] retriever.retrieve(query)
       ↓ embeddings.generateEmbedding(query)
       ↓ vectorStore.search(emb, {filter, topK})
    ← Top-N Chunks mit Metadaten
    ↓
[2] bella.askBella(query, chunks)
       ↓ Anthropic Claude Sonnet 4.6 mit Streaming
    ← Tokens streamen
    ↓
SSE → Browser
    event: sources    (Quellenliste sofort)
    event: text       (für jedes Token)
    event: done       (mit usage/stopReason)
```

### Datenfluss „DMS-Dokument importieren"

```
DMS-Modal: User wählt dmsIds
    ↓
POST /api/dms/import {dmsIds}
    ↓ Job-ID zurückgeben (sofort)
    ↓ Background-Worker:
        Für jede dmsId:
          1. dmsConnector.searchDocuments(fulltext=dmsId)
          2. dmsConnector.downloadContent(hit) → Buffer
          3. uploads/dms_<id>_v<ver>.<ext> speichern
          4. _documents.json registrieren mit dmsMetadata
          5. processDocumentAsync(docId)
                ↓ extract → chunk → embed → store
    ↓
GET /api/dms/import/:jobId  ← Frontend pollt alle 1,5s
    ↓
Status: running → done
```

---

## Verzeichnisstruktur

```
myGPC/
├── rag-server.js            ← Hauptserver
├── package.json
├── .env                      ← Lokal, nicht im Git
├── .env.example              ← Template
├── build-db.js               ← Produkt-CSV → JSON
├── rag/
│   ├── document-processor.js   Text-Extraktion + Chunking
│   ├── embeddings.js           Local TF-IDF | OpenAI
│   ├── vector-store.js         File-basierter Vector-DB
│   ├── retriever.js            Retrieval + Prompt-Assembly
│   ├── dms-connector.js        d.velop d.3one Client
│   ├── llm-bella.js            Anthropic Claude Wrapper
│   ├── probe-dms.js            Connection-Discovery-Probe
│   ├── probe-dms-2.js          Schema-Probe
│   └── test-ingestion.js       E2E-Pipeline-Test
├── uploads/                  ← Dokument-Cache (auto)
├── vector-store/             ← Vector-DB-Files (auto)
├── frontend/
│   ├── admin-documents.html    Document Manager + DMS-Modal
│   ├── admin-rag-settings.html RAG-Konfiguration
│   ├── main.js                 Wizard + Chatbot + Bella-Streaming
│   └── …
├── products/                 ← Produkt-CSV/XLSX-Quellen
└── layouts/                  ← Layout-Vorlagen
```

---

## Häufige Probleme

### „401 invalid x-api-key" beim Chat

Anthropic-Key ist abgelaufen oder kompromittiert.
→ Auf https://console.anthropic.com/settings/keys neuen Key generieren,
   alten revoken, in `.env` ersetzen, Server neustarten.

### DMS-Test-URL gibt HTTP 503

`dms-test.guentner.com` war zur Implementierungszeit offline.
→ Mit `dms-prod.guentner.com` arbeiten oder Admin um Test-Zugang bitten.

### `npm run probe-dms` zeigt für alle URLs 302 (Redirect)

Auth-Token ist nicht korrekt gesetzt. d.velop antwortet bei fehlgeschlagener
Auth mit 302 zur Login-Seite.
→ `DMS_AUTH_MODE=bearer` und gültiges `DMS_API_KEY` in `.env` prüfen.

### TF-IDF liefert niedrige Scores für deutsche Fragen an englische/französische Dokumente

Lokale TF-IDF ist sprachspezifisch.
→ `RAG_EMBEDDING_MODE=openai` setzen + echten OpenAI-Key, dann
   im Admin-RAG-Settings „Alle neu indexieren" klicken.
