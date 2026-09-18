# Planning — myGPC / myGüntner
> Lebendiges Planungsdokument. Wird nach jedem abgeschlossenen Sprint ergänzt.
> **Zuletzt aktualisiert:** 2026-09-18

---

## Aktiver Status

**Phase 5 — Chatbot-Qualität & UX-Polish**
- Guided Flows mit Custom Icons (siehe `Planning-Phase5-Chatbot-Icons.md`)
- Basic/Expert View Toggle ✅ deployed
- Chat-Design-Überarbeitung ✅ deployed
- Sales-Kontakt-Formular ✅ deployed

---

## Abgeschlossene Phasen

| Phase | Schwerpunkt | Dokument |
|---|---|---|
| Phase 1–2 | Grundgerüst Wizard, GPC-EU Engine | — |
| Phase 3 | RAG + DMS + Bella-Pipeline | `Planning-Phase3.md` |
| Phase 4 | Redesign, Admin-Panel, Feature-Flags | `Planning-Phase4-Redesign.md` |
| Phase 5 | Chatbot-Icons, Basic/Expert, Chat-Design | `Planning-Phase5-Chatbot-Icons.md` |

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

#### Basic/Expert — Mehr Felder schützen
- Thermodynamics: aktuell nur 2 Felder im Basic-Mode versteckt
- Unit-Selection: viele Felder bereits versteckt
- Review mit User: welche weiteren Felder in Basic versteckt werden sollen

### 🟡 Mittel

#### Guided Flow — Basis-Flow vor Kategorie-Auswahl
- Vorgelagerter Flow der BEVOR die Kategorie gewählt wird läuft
- Ziel: Güntner-Anwendungsfall erfassen (Kühlraum, Prozess, HVAC…)
- Führt zu kontextbewusster Kategorie-Empfehlung
- Konzept: in `Planning-Phase5-Chatbot-Icons.md` als "Konzept für Basis-Flow"

#### Admin-Ansicht: Contact Requests
- Neue Admin-Seite `/admin/contact-requests`
- Zeigt alle Anfragen aus `contact_requests` Tabelle
- Felder: Name, E-Mail, Nachricht, Produkt-Empfehlungen, Zeitpunkt
- Export als CSV

#### Learn Mode — Produktivitäts-Features
- Notizen können aktuell nur im Browser-Storage gespeichert werden
- Ziel: Notizen in Supabase persistieren (pro Admin-User)
- Admin-Übersicht aller Notizen

#### Performance: Guided Flow Icons
- Custom-Icon-Bilder per CDN/Supabase Storage statt Base64 in DB
- Lazy Loading für Icon-Grid in Admin

### 🟢 Niedrig / Ideen

#### Chatbot: Gesprächs-Verlauf persistieren
- Aktuell: Chat-History nur im Browser-Speicher (verloren bei Refresh)
- Option: anonyme Session-ID → Supabase `chat_sessions`
- Option: Login-basiert (für eingeloggte User automatisch)

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

---

## Technische Schulden

| Schuld | Priorität | Notiz |
|---|---|---|
| ChatDock.vue ~2200 LOC | Mittel | Aufteilen in Sub-Komponenten (GuidedSection, RecSection…) |
| Doppelte CSS-Klassen in ChatDock für Child-Components | Niedrig | Refactor: `:deep()` oder Child-Props statt Root-Override |
| `guided_flow_custom_icons` Migration nicht idempotent | Niedrig | `IF NOT EXISTS` ergänzen |
| DMS-Mapping (238 Properties → 5 Filter-Dropdowns) | Mittel | Steht noch aus, Volltextsuche funktioniert |
| Test-Suite fehlt komplett | Hoch (langfristig) | Kein Test-Framework konfiguriert |

---

## Wichtige Kontakte & Ressourcen

- **Supabase Projekt:** `xvtjgfwpowzbfojcgsxw` (eu-west-1)
- **DMS Repository-UUID:** `cffcc398-5466-586f-921f-4655e26f70e0`
- **Vercel Deployment:** `myguentner.vercel.app`
- **Anthropic Console:** https://console.anthropic.com/settings/keys
- **Admin Login:** Nur Güntner-interne User (über Supabase Auth)
