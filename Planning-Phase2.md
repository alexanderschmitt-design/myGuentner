# Planning — Phase 2: Hauptnavigations-Seiten

> Status: **Vor-Implementierung — Klärung offen**
> Erstellt: 2026-04-27

## 1. Aufgabe (so wie ich sie verstehe)

Sieben neue Seiten, alle über die Hauptnavigation erreichbar:

| # | Seite | Datei | Layout-Quelle |
|---|---|---|---|
| 1 | **Overview** (Startseite) | `overview.html` | `images/mygps/Overview.png` |
| 2 | **Spare Parts — Listing** | `spareparts.html` | *kein Layout* — analog Documents-/Result-Listing |
| 3 | **Spare Part — Detail** | `sparepart-detail.html` | `Spare part - detail page.png` |
| 4 | **Projects — Übersicht** | `projects.html` | `Projects.png` |
| 5 | **Project — Detail** | `project-detail.html` | `Project detail page.png` |
| 6 | **Favorites** | `favorites.html` | reuse vom Project-Detail-Layout |
| 7 | **Documents** | `documents.html` | `myDocuments.png` |

Plus: gemeinsames **Data-Grid-Pattern** etablieren (aus myDocuments-Layout) und auf alle bestehenden Listings konsistent ausrollen.

---

## 2. Status der bestehenden Tabellen / Listings

| Datei | Tabellen-Klasse | Stil |
|---|---|---|
| `frontend/results.html` | `.data-table` | klassisch, mit Sort-Pfeilen `▲`, ohne Filter pro Spalte |
| `frontend/coil-result-grid.html` | (vermutlich `.data-table`) | analog |
| `frontend/mygps-output.html` | `.mygps-table` (neu) | minimalistisch, ohne Filter |
| `frontend/admin-documents.html` | `.catalog-table` | Admin-Variante mit Pagination |

→ Keine dieser Tabellen entspricht dem AG-Grid-Look aus dem `myDocuments.png`-Layout (Filter-Icons + Three-Dot pro Spalte, Hover-Highlight, sticky Header).

---

## 3. Soll-Pattern: einheitliches Data-Grid

Aus `myDocuments.png` und `Project detail page.png` ableitbar:

- **Spalten-Header:** Label · Filter-Icon (≡) · Three-Dot-Menu (⋮)
- **Resizable Columns** (Trennlinien zwischen Headern)
- **Row-Hover:** dezentes Grau
- **Selected-Row:** leichter Blau-Tint
- **Sticky Header** beim Scrollen
- **Search-Input** top-right über der Tabelle
- **Compact rows**, dünne Trennlinien, kein Zebra
- **First-Column-Style:** Icon + Link/Title in Primary-Blau

**Plan:** neue Klasse `.dg` (oder `.data-grid`) in `styles.css`, plus minimaler JS für Filter-Popovers und Column-Menü. Bestehende Listings später auf `.dg` migrieren (im selben Step oder als Folge-Task).

---

## 4. Layout-Beobachtungen pro Seite

### 4.1 Overview (Homepage)
- **Header neu:** *Overview · myGPC · mySpareParts · myTools ▾ · myServices · Documents* + ★ + 🔔 + Cart + Avatar
- **Hero-Banner:** dunkles Lighthouse-Bild, links Karte „myDatastream — Welcome to Ubique" mit „Try Now"-Button, rechts „Project Management made easy" mit „Enter Service"-Button und kleine Karte „mySphere — Your 24/7 Spare Part Online Shop" mit „Find Your Spare Part"-Button.
- **Support-Section** (dunkler Block) mit 2 Cards: „FAQ" + „Report a Claim".

### 4.2 Spare Parts — Listing (kein Layout, analog ableiten)
- Headline „Spare Parts" + Subline („Find original Güntner spare parts" o. ä.)
- Search rechts
- Data-Grid mit Spalten: *Image · Part Number · Title · Brand · Price · Stock · Action*
- Klick auf Zeile → `sparepart-detail.html?id=…`

### 4.3 Spare Part Detail
- **Linke Spalte:** großes Hauptbild + Thumbnails-Galerie
- **Rechte Spalte:**
  - Breadcrumbs (Homepage / Spare Parts / Heating / KIT VALVE 7…)
  - Title (groß, uppercase) + Brand-Badge
  - Preis (groß) mit Streichpreis
  - Beschreibung (2 Absätze)
  - Specs-Grid (Direction, Technology, Air Flow Direction, Mounting Type, …)
  - Helper-Tooltip-Box rechts
  - Inputs: Quantity Type, Performance, Availability & Shipping, Documentation
  - „Add to Cart"-Button + „Save to favourites"-Link
- **Included Parts (7)** — horizontaler Card-Slider
- **You may also need…** — horizontaler Card-Slider mit Preis
- **Documents** — Card-Liste (Manuals)
- **Works with** — Tabelle (Product / Part Name / Quantity)

### 4.4 Projects — Übersicht
- Headline „PROJECTS" (uppercase, leichte Schrift)
- Tabs: *All Projects · My Projects · Shared Projects*
- „Create Project +"-Button rechts (primary, blau)
- Card-Grid 4×2 — Card mit Title (multiline), 3-Dot-Menu, „X Products"-Badge

### 4.5 Project — Detail
- Breadcrumbs (Homepage / myProjects / Alexa - Berlin, Alexanderplatz)
- **Big Title** uppercase + 3-Dot-Menu
- **Toolbar rechts:** Share · Download · Cart · Trash · „X Products"-Badge
- **Data-Grid** mit Zeilen:
  - Image | Product (Heading, ID, „successor for XXX" Hinweis) | Variant-Name (clickable + sub-Links: Information / Additional Products / Notes / Sketch / Accessories) | Specs (Capacity, Voltage, Imp, Weight) | Dimensions (Length, Width) | Stock + Delivery | Price (Streichpreis + neuer Preis + Discount-Badge)
  - Selected-Row mit Quantity-Stepper rechts

### 4.6 Favorites
- Identisch zu Project-Detail, andere Default-Inhalte und Toolbar leicht angepasst (kein Cart).

### 4.7 Documents
- Headline „Documents" + Subline
- Search rechts + zwei Icons (User, Layout)
- Data-Grid: *File · Brand · Region · Language · Product Level · Product Group · Product Family · Product Series · Type · Permission*
- Filter pro Spalte + Three-Dot-Menü pro Spalte

---

## 5. Header-Update (Auswirkung auf bestehende Seiten)

Das neue Layout zeigt einen **anderen Header** als aktuell:

| | Aktuell | Neu (Layout) |
|---|---|---|
| Nav-Links | Overview · myGPC · mySpareParts · Projects · Favorites · Documents | Overview · myGPC · mySpareParts · myTools ▾ · myServices · Documents |
| Rechts | Avatar | ★ · 🔔 · Cart · Avatar ▾ |

Optionen:
- **(a)** Header global auf neue Struktur umstellen (alle ~22 HTML-Files anfassen) — Projects & Favorites wandern ins „myTools"-Dropdown.
- **(b)** Header lokal nur auf Overview verwenden — andere Seiten unverändert.
- **(c)** Alte Nav-Links beibehalten, nur ★ · 🔔 · Cart · Avatar-Dropdown ergänzen.

→ **Klärung notwendig.**

---

## 6. Offene Fragen

### F1 — Header-Strategie
Welche der drei Optionen oben? Empfehlung: **(a)** — sonst wirken Overview und Rest-App inkonsistent. Wenn (a): wo gehören Projects & Favorites hin? Sub-Items im myTools-Dropdown? Was ist sonst in myTools / myServices?

### F2 — Spare Parts Listing — Spalten
Da kein Layout vorliegt: nehme ich diese Spalten an?
*Image · Part Number · Title · Brand · Price · Stock · Action*

Optional zusätzlich: Compatible With, Region/Language. OK so?

### F3 — Data-Grid-Pattern jetzt rollout?
Soll ich `results.html`, `coil-result-grid.html`, `mygps-output.html` und `admin-documents.html` direkt auf das neue `.dg`-Pattern migrieren — oder bleiben die für jetzt mit ihren alten Tabellen, und nur die neuen Seiten nutzen `.dg`?

### F4 — Filter-/Three-Dot-Funktionalität
Filter-Icons und Three-Dot-Menus aus dem Layout — sind das bloß **visuelle Klick-Dummies** (Klick öffnet Popover mit „demo")? Oder soll ich echte Client-Side-Filter implementieren (Text-Suche pro Spalte, Sort-Toggle)?

### F5 — Favorites
Layout = identisch zu Project-Detail. Bestätige bitte:
- Toolbar-Items (Share/Download/Trash – ja; Cart – nein?)
- Wie wird in Favorites etwas aufgenommen — von Listings via ★ Icon? Oder per Manage-Button auf Favorites selbst?

### F6 — Quelle der Bilder
Für Hero (Lighthouse), Spare-Part-Image (Stellantrieb), Project-Cards: nutze ich Platzhalter-Bilder von Unsplash (wie aktuell auf der By-Application-Section) oder lieferst du Assets nach? Im `images/`-Ordner sind keine passenden Fotos.

### F7 — Reihenfolge der Implementierung
Vorschlag:
1. Header-Update (global) — Voraussetzung für alle Seiten
2. CSS-Pattern `.dg` (Data-Grid)
3. Documents-Seite (am simpelsten, reines Listing)
4. Spare Parts — Listing → Detail
5. Projects — Übersicht → Detail → Favorites (Wiederverwendung)
6. Overview (Homepage) — als letztes, weil Hero-Bild nachgeliefert werden muss

OK so, oder andere Reihenfolge gewünscht?

---

## 7. Was ich nicht anfasse (vorerst)
- Bestehende myGPC- / Bare-Coils- / myGPS-Wizard-Pages (außer Header-Update bei F1=a)
- Backend / RAG / Server-Code
- Admin-Seiten

---

## 8. Vorgeschlagene nächste Schritte (nach Klärung)
1. Antworten zu F1–F7 in dieses Dokument einarbeiten.
2. Header-Komponente (falls Option a) aktualisieren — globale Suche/Replace.
3. CSS-Pattern `.dg` in `styles.css` ergänzen.
4. Die 7 neuen HTML-Seiten in der oben festgelegten Reihenfolge bauen.
5. Optional: bestehende Listings auf `.dg` migrieren.
