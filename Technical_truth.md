# Technical Truth — myGPC / myGüntner
> Dieses Dokument ist die kanonische technische Referenz. Es wird nach jedem abgeschlossenen Feature-Block aktualisiert.
> **Zuletzt aktualisiert:** 2026-09-18

---

## 1. Projekt-Überblick

**myGPC** (my Güntner Product Configurator) — Nuxt-3-Web-App für die Konfiguration von Güntner Wärmetauschern. 5-Schritt-Wizard: Kategorie → Thermodynamik → Unit Selection → Coil Geometry → Results/Datasheet.

**Chatbot „Günther"** — integrierter KI-Assistent (Claude Sonnet 4.6) mit RAG, Streaming, Guided Flows und Template-Empfehlungen.

---

## 2. Tech Stack

| Schicht | Technologie |
|---|---|
| Framework | Nuxt 3 (SSR, Vue 3, TypeScript) |
| Styling | Custom CSS Variables (kein Tailwind), `DM Sans` + `DM Mono` |
| State | `useState` (Nuxt), `useConfigStore` (custom) |
| Backend | Nitro (Nuxt Server Routes) |
| Datenbank | Supabase (Postgres, Auth, Storage) |
| LLM | Anthropic Claude Sonnet 4.6 (`claude-sonnet-4-6`) |
| Deployment | Vercel (Serverless Functions) |
| RAG | Eigener Vector Store (TF-IDF 384-dim, lokal) oder Gemini 1536-dim |
| DMS | d.velop d.3one (Bearer Auth gegen `dms-prod.guentner.com`) |

---

## 3. Deployment & Umgebung

- **Produktion:** `myguentner.vercel.app` (Vercel, auto-deploy aus `main`)
- **Supabase Region:** `eu-west-1` — nur über Pooler erreichbar (`aws-0-eu-west-1.pooler.supabase.com:6543`)
- **Direktverbindung** (`db.xvtjgfwpowzbfojcgsxw.supabase.co`) schlägt fehl (ENOTFOUND)
- **Migration lokal:** `node scripts/run-migration.mjs supabase/migrations/<file>.sql`
- **Vercel Deployment Protection** ist aktiv → SSR-interne `$fetch`-Calls müssen `useRequestFetch()` verwenden, sonst 401

### Pflicht-Env-Vars (Vercel + lokal)
```
ANTHROPIC_API_KEY          # Claude API
SUPABASE_URL               # https://xvtjgfwpowzbfojcgsxw.supabase.co
SUPABASE_SECRET_KEY        # service_role key
SUPABASE_PUBLISHABLE_KEY   # anon key
GEMINI_API_KEY             # für Embeddings (aktiv genutzt)
```

---

## 4. Architektur-Übersicht

```
Browser
  └─ Nuxt SSR (Vercel Serverless)
       ├─ plugins/app-settings.ts      # lädt Feature-Flags via useRequestFetch()
       ├─ composables/useFeatureFlags  # reaktiv, Supabase-backed
       ├─ composables/useViewMode      # Basic/Expert, localStorage
       ├─ composables/useGuidedFlow    # Guided-Q&A-State
       ├─ composables/useConfigStore   # Wizard-Parameter-Store
       └─ server/api/...               # Nitro-Routen → Supabase
```

### Wichtige Datenflüsse
- **Feature-Flags:** Supabase `app_settings` → `GET /api/app-settings` → `useState('app-settings')` → alle Composables
- **Chat:** Browser → `POST /api/chat` (SSE-Stream) → Anthropic Claude → Browser
- **Guided Flow:** Admin erstellt in `/admin/guided-flows` → Supabase → `useGuidedFlow` → Chatbot rendert als `ConfigQuestionCard`
- **Templates:** Admin pflegt via `/admin/system-templates` → Supabase → `RecommendedProducts` zeigt nach Guided-Flow-Abschluss

---

## 5. Schlüssel-Dateien

| Datei | Zweck |
|---|---|
| `nuxt/plugins/app-settings.ts` | Hydratisiert Feature-Flags beim App-Start |
| `nuxt/composables/useFeatureFlags.ts` | Feature-Flag-Composable (FEATURES-Array) |
| `nuxt/composables/useViewMode.ts` | Basic/Expert-Toggle, localStorage |
| `nuxt/composables/useGuidedFlow.ts` | Guided-Pass-State-Machine |
| `nuxt/composables/useConfigStore.ts` | Wizard-Parameter (zentral) |
| `nuxt/components/ChatDock.vue` | Chatbot-Drawer (FAB + Slide-in, ~2200 LOC) |
| `nuxt/components/ConfigQuestionCard.vue` | Guided-Q&A-Kachel |
| `nuxt/components/RecommendedProducts.vue` | Template-Empfehlungen + Sales-Kontakt |
| `nuxt/components/ViewModeToggle.vue` | Basic/Expert Segment-Control |
| `nuxt/pages/mygpc/[catId]/thermodynamics.vue` | Wizard Schritt 2 |
| `nuxt/pages/mygpc/[catId]/unit-selection.vue` | Wizard Schritt 3 |
| `nuxt/pages/admin/features.vue` | Feature-Flag-Admin inkl. Diagnose-Panel |
| `nuxt/server/utils/app-settings.ts` | Supabase-KV-Store, 30s In-Process-Cache |
| `nuxt/server/utils/supabase.ts` | Service + Anon Client |
| `nuxt/server/api/admin/debug/app-settings.get.ts` | Debug-Endpoint (cache-bypass) |
| `nuxt/data/guidedFlows.ts` | TypeScript-Typen für Guided Flows |

---

## 6. Datenbank-Schema (Supabase)

| Tabelle | Zweck | Wichtige Felder |
|---|---|---|
| `app_settings` | Feature-Flags + Section-Visibility | `key` (z.B. `feature.chatbot`), `value` (bool), `updated_by` |
| `guided_flows` | Guided-Q&A-Flow-Definitionen | `id`, `title`, `category_slug`, `steps` (jsonb), `is_active` |
| `templates` | User-erstellte Konfigurations-Templates | `id`, `name`, `category_slug`, `configuration` (jsonb) |
| `system_templates` | Güntner-kuratierte Templates | wie templates + `is_system=true`, `match_fields` |
| `chat_messages` | Persistierte Chat-Verläufe | `id`, `session_id`, `role`, `content`, `sources` |
| `chat_feedback` | 👍/👎 Feedback auf Antworten | `message_id`, `rating`, `correction_text` |
| `custom_icons` | Eigene Icons für Guided-Flow-Choices | `key`, `svg_content` / `img_url` |
| `contact_requests` | Sales-Kontakt-Formular aus Chatbot | `name`, `email`, `message`, `template_names[]`, `context` (jsonb) |
| `documents` | RAG-Dokumente | `id`, `title`, `content_hash`, `provider` |
| `embeddings` | Vektor-Embeddings für RAG | `document_id`, `embedding` (vector), `metadata` |

---

## 7. API-Endpunkte (Nitro)

### Öffentlich
| Methode | Route | Beschreibung |
|---|---|---|
| GET | `/api/app-settings` | Feature-Flags + Section-Visibility (30s gecacht) |
| POST | `/api/chat` | SSE-Streaming-Chat via Claude |
| POST | `/api/contact-sales` | Sales-Kontakt-Formular speichern |

### Admin (auth-gated via `requireAdmin`)
| Methode | Route | Beschreibung |
|---|---|---|
| PUT | `/api/admin/app-settings` | Feature-Flag setzen |
| GET/POST | `/api/admin/guided-flows` | Guided Flows lesen/erstellen |
| PUT/DELETE | `/api/admin/guided-flows/[entryId]` | Guided Flow aktualisieren/löschen |
| GET/PUT | `/api/admin/templates/...` | System-Templates verwalten |
| GET | `/api/admin/users` | User-Liste |
| POST/PUT/DELETE | `/api/admin/users/...` | User-Verwaltung |
| POST/DELETE | `/api/admin/custom-icons/...` | Custom-Icons für Guided Flows |
| GET | `/api/admin/debug/app-settings` | Debug: Supabase direkt abfragen (cache-bypass) |

---

## 8. Feature Flags

Verwaltet unter `/admin/features`. Gespeichert in `app_settings` unter `feature.*`.

| ID | Label | Default | Beschreibung |
|---|---|---|---|
| `chatbot` | Chatbot (Günther) | **ON** | Floating Chatbot global |
| `guided_pass` | Guided Pass | **ON** | Guided-Q&A-Scripting via Chatbot |
| `basic_expert_toggle` | Basic / Expert View | OFF | Umschalter in Thermodynamics + Unit Selection |
| `learn_mode` | Learn Mode | OFF | Admin-Annotationsystem |

**Kritisch:** Feature-Flags werden via `useRequestFetch()` im Plugin geladen (nicht `$fetch`), weil Vercel Deployment Protection sonst 401 zurückgibt.

---

## 9. Admin-Panel (`/admin`)

| Seite | Route | Funktion |
|---|---|---|
| Overview | `/admin` | Dashboard |
| Documents | `/admin/documents` | RAG-Dokumente hochladen/verwalten |
| RAG Settings | `/admin/rag-settings` | Embedding-Provider (Gemini aktiv), Modell-Auswahl |
| RAG Test | `/admin/rag-test` | Vektor-Suche testen |
| DMS | `/admin/dms` | d.velop DMS Verbindung + Suche |
| System | `/admin/system` | System-Status (`/api/system/status`) |
| Users | `/admin/users` | User anlegen/deaktivieren |
| Features | `/admin/features` | Feature-Flags + Diagnose-Panel |
| Home Sections | `/admin/home-sections` | Landing-Page-Sektionen ein-/ausblenden |
| Guided Flows | `/admin/guided-flows` | Q&A-Flows erstellen/bearbeiten (Live-Preview) |
| System Templates | `/admin/system-templates` | Güntner-kuratierte Templates |

---

## 10. Chat-Design (aktueller Stand)

- **Hintergrund Chat-Bereich:** `#F4F4F6` (hellgrau)
- **Assistent-Bubbles:** weiß mit `var(--c-border-card)` Rand
- **User-Bubbles:** `var(--c-brand-blue)` mit weißem Text
- **ConfigQuestionCard:** weiß, blauer Linksrand (4px), KI-Disclaimer am Ende
- **RecommendedProducts-Karte:** weiß, blauer Linksrand (4px), blauer Header
- **Sales-Kontakt-Sektion:** am Ende der RecommendedProducts-Karte

---

## 11. Bekannte Constraints & Eigenheiten

| Problem | Ursache | Lösung |
|---|---|---|
| SSR-internal `$fetch` → 401 auf Vercel | Vercel Deployment Protection | `useRequestFetch()` statt `$fetch` im Plugin |
| Supabase direkt-URL nicht erreichbar | eu-west Pooler-only | `npm run migrate` nutzt Pooler-Fallback |
| Parent Scoped CSS überschreibt Kind-Root | Vue 3 Scoping: Parent-Styles gelten für Root-Element des Kind-Components | Alle Styles in ChatDock.vue für Child-Root-Klassen synchron halten |
| Serverless: kein shared In-Memory-Cache | Jede Vercel Function-Instanz startet frisch | 30s Cache ist pro-Instanz (praktisch kein Cache in Serverless) |
| `guided_flow_custom_icons` Migration | Tabelle existiert bereits | Ignorieren (idempotente Migration nötig) |

---

## 12. Änderungslog

| Datum | Was |
|---|---|
| 2026-09-18 | Basic/Expert View Toggle: vollständig implementiert + deployed |
| 2026-09-18 | Fix: `useRequestFetch()` in `app-settings` Plugin (Vercel 401) |
| 2026-09-18 | Debug: Diagnose-Panel in `/admin/features` + `/api/admin/debug/app-settings` |
| 2026-09-18 | Chat-Design: hellgrauer Body, weiße Kacheln, KI-Disclaimer |
| 2026-09-18 | Sales-Kontakt-Formular in RecommendedProducts + `contact_requests` Tabelle |
| 2026-09-18 | Alle grünen rec-card Styles → blau (konsistentes Farbschema) |
| 2026-09-18 | Post-Template-Pick: Serien-Erklärung + Folgefragen nach Template-Wahl im Guided Flow |
