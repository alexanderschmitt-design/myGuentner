# Planning — myGPC / myGüntner
> Lebendiges Planungsdokument. Wird nach jedem abgeschlossenen Sprint ergänzt.
> **Zuletzt aktualisiert:** 2026-10-12

---

## Aktiver Status

**Phase 6 abgeschlossen — Chatbot Wizard-Guide** ✅ deployed 2026-10-09

- `assistantMode: 'parameter-guide'` auf Thermodynamics + Unit Selection — direkter Fachberater statt RAG-Only
- `assistantMode: 'results-guide'` auf Results/Search — Ergebnis-Navigator, statischer Orientierungstext
- Guided Flow: Abschluss-Steps mit „Continue to Unit Selection →" und „Show Results →" CTAs
- Neuer `unitSelectionFlow` in `guidedFlows.ts`
- Fix: Produktbilder im Katalog (404 auf Vercel, `.webp`-Pfade)

**Nächste Phase — offen** (kein aktiver Sprint)

---

## Abgeschlossene Phasen

| Phase | Schwerpunkt | Dokument |
|---|---|---|
| Phase 1–2 | Grundgerüst Wizard, GPC-EU Engine | — |
| Phase 3 | RAG + DMS + Bella-Pipeline | `Planning-Phase3.md` |
| Phase 4 | Redesign, Admin-Panel, Feature-Flags | `Planning-Phase4-Redesign.md` |
| Phase 5 | Chatbot-Icons, Basic/Expert, Chat-Design | `Planning-Phase5-Chatbot-Icons.md` |
| Phase 6 | Chatbot Wizard-Guide: Parameter-Modus + Results-Assist | `Planning-Phase6-Chatbot-Wizard-Guide.md` |

---

## Backlog — Priorisierte Feature-Liste

### 🔴 Hoch (nächster Sprint)

#### Guided Flows — Custom Icons vollständig
- Custom-Icon-Upload (SVG/PNG) im Admin unter `/admin/guided-flows`
- Icon-Registry in `useChoiceIcon.ts` erweitern
- Laufzeit-Rendering in `ConfigQuestionCard.vue`
- Status: Konzept in `Planning-Phase5-Chatbot-Icons.md`, Code teilweise vorhanden

#### Sales-Kontakt — E-Mail-Benachrichtigung
- `POST /api/contact-sales` speichert in Supabase ✅
- Fehlend: E-Mail-Benachrichtigung an Güntner-Sales wenn neue Anfrage eingeht
- Optionen: Resend/Sendgrid API, Supabase Edge Function, Webhook
- Admin-Ansicht der eingegangenen Anfragen unter `/admin/contact-requests`

#### Results-Seite: Produktdaten im Chatbot-Kontext
- Aktuell: `results-guide`-Modus kennt Konfigurationsparameter, aber keine Zeilen aus der Ergebnistabelle
- Ziel: ausgewählte/top-N Unit-Keys aus dem Results-Store in `buildUserContext()` einspeisen
- Dann kann Günther konkret über „Einheit X in Zeile 3" sprechen

### 🟡 Mittel

#### Guided Flow — Basis-Flow vor Kategorie-Auswahl
- Vorgelagerter Flow der BEVOR die Kategorie gewählt wird läuft
- Ziel: Güntner-Anwendungsfall erfassen (Kühlraum, Prozess, HVAC…)
- Führt zu kontextbewusster Kategorie-Empfehlung
- Konzept: in `Planning-Phase5-Chatbot-Icons.md` als „Konzept für Basis-Flow"
- DB-Migration: `guided_entry_flows_tab_check` um Wert `basic` erweitern

#### Basic/Expert — Mehr Felder schützen
- Thermodynamics: aktuell nur 2 Felder im Basic-Mode versteckt
- Unit-Selection: viele Felder bereits versteckt
- Review mit User: welche weiteren Felder in Basic versteckt werden sollen

#### Admin-Ansicht: Contact Requests
- Neue Admin-Seite `/admin/contact-requests`
- Zeigt alle Anfragen aus `contact_requests` Tabelle
- Felder: Name, E-Mail, Nachricht, Produkt-Empfehlungen, Zeitpunkt
- Export als CSV

#### Results-Seite: Quick-Prompts für Chatbot
- Aktuell: keine Preset-Buttons auf der Results-Seite
- Sinnvolle Prompts: „Vergleiche die 3 besten Treffer", „Erkläre die Spalten", „Welche Einheit für Außenaufstellung?"
- Implementierung analog zu `paramGuideQuickPrompts`

#### Learn Mode — Notizen in Supabase persistieren
- Aktuell: Notizen nur im Browser-Storage
- Ziel: Pro Admin-User in Supabase gespeichert
- Admin-Übersicht aller Notizen

### 🟢 Niedrig / Ideen

#### Chatbot: Gesprächs-Verlauf persistieren
- Aktuell: Chat-History nur im Browser-Speicher (verloren bei Refresh)
- Option: anonyme Session-ID → Supabase `chat_sessions`
- Option: Login-basiert (für eingeloggte User automatisch)

#### Chatbot: Automatisches Öffnen auf Results-Seite
- Günther öffnet sich nicht automatisch wenn User Results betritt
- Orientierungstext ist nur sichtbar wenn Chatbot manuell geöffnet wird
- Abwägen: UX-Mehrwert vs. Ablenkung

#### Thermodynamics: Weitere Unit-Systeme
- Aktuell: SI + Imperial im Toggle
- Ausbau: lokale Normen (US, JP)

#### Multi-Language
- Aktuell: Gemischt DE/EN im UI
- Ziel: vollständig DE + EN Umschaltbar
- Priorität: niedrig (interne Nutzung primär)

#### Verflüssiger / Kondensator Wizard-Pfad
- Eigene Thermodynamics-Parameter für Kondensatoren
- Separate Page oder Toggle in bestehendem Wizard

#### myGPS Integration
- Section `mygps` existiert (ausgeblendet via Feature-Flag)
- Konzept: GPS-basierte Standort-Auswahl → Klimazone vorbefüllen

---

## Design-Entscheidungen (Referenz)

| Entscheidung | Begründung |
|---|---|
| `useRequestFetch()` statt `$fetch` im Plugin | Vercel Deployment Protection blockt SSR-interne Requests |
| Guided Flows in Supabase statt hardcoded | Admin kann ohne Deployment neue Flows erstellen |
| Feature Flags in Supabase `app_settings` | Sofortige Wirkung ohne Deployment, optimistic UI-Update |
| Parent-Scoped CSS für Child-Root-Klassen synchron halten | Vue 3: Parent-Scoped-Styles gelten für Root-Element von Kind-Components |
| Chat-Body hellgrau `#F4F4F6`, Kacheln weiß | Klare visuelle Trennung Chat-Bereich / Karte |
| KI-Disclaimer in ConfigQuestionCard | Rechtliche Absicherung, Vertrauen aufbauen |
| Sales-Kontakt in RecommendedProducts | Kontextbezogen: User sieht Produkte → direkter Weg zum Berater |
| `assistantMode` im `userContext` statt eigenem Endpoint | Prompt-Wechsel ohne Cache-Verlust: systemBlocks bleiben gecacht, Modus liegt im variablen userContent-Block |
| `getCatalogProductImagePath()` ignoriert `image_path` aus DB | DB-Spalte enthält veraltete Dateinamen; namensbasierte Regeln sind die einzige verlässliche Quelle |
| `performReset()` als Einstiegspunkt für Results-Orientierungstext | Kein LLM-Call, sofort sichtbar beim ersten Öffnen des Chatbots auf der Results-Seite |

---

## Technische Schulden

| Schuld | Priorität | Notiz |
|---|---|---|
| ChatDock.vue ~2300 LOC | Mittel | Aufteilen in Sub-Komponenten (GuidedSection, RecSection, ResultsSection…) |
| Doppelte CSS-Klassen in ChatDock für Child-Components | Niedrig | Refactor: `:deep()` oder Child-Props statt Root-Override |
| `guided_flow_custom_icons` Migration nicht idempotent | Niedrig | `IF NOT EXISTS` ergänzen |
| DMS-Mapping (238 Properties → 5 Filter-Dropdowns) | Mittel | Steht noch aus, Volltextsuche funktioniert |
| Test-Suite fehlt komplett | Hoch (langfristig) | Kein Test-Framework konfiguriert |
| `unitSelectionFlow` hat nur einen Step | Niedrig | Detailliertere Schritte (EC/AC, Schall, Abmessungen) wären sinnvoll |
| `image_path`-Spalte in `products` ist verwaist | Niedrig | Wird nie ausgelesen; entweder befüllen oder Spalte droppen |

---

## Wichtige Kontakte & Ressourcen

- **Supabase Projekt:** `xvtjgfwpowzbfojcgsxw` (eu-west-1)
- **DMS Repository-UUID:** `cffcc398-5466-586f-921f-4655e26f70e0`
- **Vercel Deployment:** `myguentner.vercel.app`
- **Anthropic Console:** https://console.anthropic.com/settings/keys
- **Admin Login:** Nur Güntner-interne User (über Supabase Auth)
