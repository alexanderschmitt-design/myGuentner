# Planning Phase 5 — Grafisch gestützte Konfigurationsfragen

Stand 15.09.2026 · Sprintziel für myGPC Guided Assistant (Günther) · Ein Sprint, MVP-Schnitt

## Sprintziel

Am Ende des Sprints sind die Antwortoptionen der Guided-Q&A-Dialoge nicht mehr rein textlich, sondern jede Antwortkarte trägt ein eigenes, fachlich passendes Icon. Diese Icons sind über die bestehende Admin-Oberfläche unter `/admin/guided-flows` pflegbar, werden dort in einer Live-Vorschau so dargestellt wie sie später im Chat erscheinen, und werden zur Laufzeit pro Anwendungsfall korrekt ausgespielt. Der vorgelagerte Basis-Flow aus dem Entwurf wird in diesem Sprint konzipiert und datenbankseitig vorbereitet, aber noch nicht verkettet.

## Ausgangslage im Code

Die Datenhaltung steht bereits. Die Tabelle `guided_entry_flows` hält sieben Zeilen, vier unter `tab_id = 'application'` und drei unter `tab_id = 'refrigerant'`, mit den Fragen als JSONB. Der Laufzeit-Loader `nuxt/composables/useGuidedEntryFlows.ts` bevorzugt die Datenbankzeilen gegenüber dem Code-Fallback in `nuxt/data/homeEntryFlows.ts`. Die Admin-Oberfläche existiert mit `nuxt/components/admin/GuidedFlowEditor.vue` und `ParamsEditor.vue`, geschrieben wird über `server/api/admin/guided-flows/[entryId].put.ts` hinter `requireAdmin()`.

Die Lücke sitzt an genau einer Stelle. Das Choice-Objekt kennt heute nur `label`, `detail` und `params`, und `ChatDock.vue` rendert deshalb ab Zeile 1092 für jede einzelne Antwortoption dasselbe fest verdrahtete SVG, ein Rechteck mit Trennlinie. Der Entwurf zeigt stattdessen pro Antwort ein eigenes Piktogramm. Es fehlt also ein Feld im Datenmodell, ein Auswahlwerkzeug im Admin und eine Auflösung beim Rendern — drei kleine Eingriffe an drei klar benannten Stellen, kein Umbau.

## AP 1 — Icon-Registry

Es entsteht `nuxt/data/choiceIcons.ts` nach demselben Muster wie `entryParamFields.ts`: eine kuratierte Liste von rund vierzig Icons, jedes mit stabilem Schlüssel, deutschsprachigem Label, einer Gruppe und einem SVG-Pfad für eine 16×16-Viewbox im Stroke-Stil, damit sie sich optisch in die bestehenden Chat-Karten einfügen. Die Gruppen orientieren sich an den fachlichen Achsen des Konfigurators: Gebäude und Anwendung, Kapazität, Kältemittel, Temperaturniveau, Aufstellung und Umgebung, Sicherheit und Regulatorik, Abtauung, Betriebsweise. Ergänzt wird ein Lookup-Helper `findChoiceIcon(key)` und ein neutrales Fallback-Icon, damit eine Choice ohne gepflegtes Icon nie leer rendert. Das Vorgehen ist bewusst dasselbe wie bei den Parametern: Wer ein Icon ergänzen will, trägt einen Eintrag in dieser Datei nach, und der Admin-Picker kennt es automatisch.

## AP 2 — Datenmodell und Validierung

Das Choice-Objekt bekommt das optionale Feld `icon`, das einen Registry-Schlüssel hält. Weil `questions` als JSONB gespeichert ist, braucht es dafür keine Schemaänderung; anzupassen sind die Typdefinitionen an den drei Stellen, an denen sie heute dupliziert sind, nämlich `EntryChoice` in `homeEntryFlows.ts`, `GuidedSuggestion` in `guidedFlows.ts` und das lokale `Choice`-Interface in `GuidedFlowEditor.vue`. Diese Dreifachhaltung ist eine bestehende Schwachstelle und sollte bei der Gelegenheit zu einem gemeinsamen Typ zusammengeführt werden.

Wichtiger als das Feld selbst ist die serverseitige Prüfung. Der PUT-Endpunkt reicht `questions` heute als Ganzes durch, ohne den Inhalt zu validieren. Es wird eine Prüfung ergänzt, die jeden `icon`-Wert gegen die Registry hält und einen unbekannten Schlüssel mit einer sprechenden Fehlermeldung zurückweist, statt ihn in die Datenbank zu lassen. Ohne diese Prüfung sammelt sich nach der ersten Redaktionsrunde Müll an, den niemand mehr zuordnen kann.

## AP 3 — Icon-Picker im Admin

Jede Choice-Zeile im `GuidedFlowEditor` erhält links vor dem Label-Feld eine Schaltfläche, die das aktuell gewählte Icon zeigt. Ein Klick öffnet ein Popover mit einem Raster aller Registry-Icons, gruppiert nach den oben genannten Achsen und mit einem Suchfeld über Label und Schlüssel. Das Muster ist bewusst an den bestehenden `ParamsEditor` angelehnt, damit die Oberfläche sich nicht fremd anfühlt. Zusätzlich wird die bestehende Validierung erweitert, sodass eine Choice ohne Icon zwar speicherbar bleibt, im Editor aber sichtbar als unvollständig markiert wird.

## AP 4 — Gemeinsame Karten-Komponente und Live-Vorschau

Die Frage-Karte wird aus `ChatDock.vue` in eine eigene Komponente `ConfigQuestionCard.vue` herausgelöst, mitsamt ihrem CSS. Der Editor rendert damit rechts neben dem Formular eine Vorschau, die exakt dem Laufzeitbild entspricht, und der Chat nutzt dieselbe Komponente. Das ist der eigentliche Hebel dieses Arbeitspakets: Ohne gemeinsame Komponente driften Vorschau und Auslieferung binnen weniger Wochen auseinander, und die Redaktion pflegt gegen ein Bild, das es im Produkt so nicht gibt.

Das ist zugleich das größte Risiko im Sprint. `ChatDock.vue` ist mit rund 83 Kilobyte gewachsen, und die Frage-Karte teilt sich ihre CSS-Klassen mit der Empfehlungs-Karte im Zweig darüber. Die Extraktion muss beide Varianten weiter bedienen, sonst bricht der Recommendations-Pfad. Dafür ist eine halbe Entwicklertag an Puffer eingeplant.

## AP 5 — Laufzeit-Rendering

`ChatDock` löst den Icon-Schlüssel jeder Antwortoption über die Registry auf und rendert das zugehörige SVG statt des heutigen festen Pfads. Fehlt der Schlüssel oder ist er unbekannt, greift das Fallback-Icon. Der Guided-Dialog hängt weiterhin am Feature-Flag `guided_pass`, das damit auch für die Icons der Schalter bleibt; ein Rollout ohne Flag ist nicht Teil dieses Sprints.

## AP 6 — Redaktion der bestehenden Fragen

Die sieben produktiven Flows umfassen zweiundzwanzig Fragen mit achtundsiebzig Antwortoptionen. Jede dieser Optionen bekommt ein Icon zugewiesen. Das ist reine Fleißarbeit und wird regelmäßig unterschätzt; realistisch ist ein voller Arbeitstag, weil bei jeder zweiten Option die Diskussion aufkommt, ob das gewählte Piktogramm die Aussage trägt. Die Zuweisung erfolgt über den neuen Admin-Picker, nicht über eine Datenmigration, damit der Redaktionsweg gleich mitgetestet wird.

Aus dem Entwurf kommen darüber hinaus die Fragen der Gruppen By Refrigerant, Energy & Process Cooling und Industrial Refrigeration, die über den heutigen Stand hinausgehen, etwa Flammability und Toxicity, Füllmenge im Sinne der F-Gas-Verordnung, Neuanlage gegen Retrofit, Freikühlung ganzjährig oder saisonal, Nähe zu Wohnbebauung sowie Abtaumethode und Raummaße. Diese werden in die bestehenden Flows eingepflegt, soweit sie inhaltlich dorthin gehören.

## AP 7 — Basis-Flow, Konzept und Vorbereitung

Die Gruppen Allgemein, Facility & Sizing und System-Auslegung aus dem Entwurf sind fachlich ein vorgelagerter, anwendungsübergreifender Fragenblock: kalte oder warme Seite, Gebäudeart, Kühlleistung, Kältemittel oder Medium, Aufstellbedingungen, Kühlkonzept, Redundanzstufe, Vorlauftemperatur, Aufstellungsort mit Wetter- und Lärmschutz, Klimazone mit Frostschutz und Glykolanteil. Dieser Block läuft vor dem anwendungsspezifischen Flow und schreibt in denselben Parameter-Store.

Im MVP wird dieser Block nicht verkettet. Vorbereitet werden zwei Dinge. Erstens eine Migration, die den Check-Constraint `guided_entry_flows_tab_check` um den Wert `basic` erweitert, weil er heute ausschließlich `application` und `refrigerant` zulässt und jeden neuen Flow ohne Migration blockiert. Zweitens ein Konzeptabschnitt, der festhält, wie die Verkettung in `useGuidedFlow` aussehen soll, wie ein Überspringen funktioniert und wie verhindert wird, dass eine Basisfrage erneut gestellt wird, obwohl die angeklickte Home-Karte die Antwort bereits impliziert. Die Umsetzung ist der erste Kandidat für den Folgesprint.

## AP 8 — Verifikation

Zur Definition of Done gehört ein Playwright-Smoke, der jeden der sieben Flows durchklickt und prüft, dass keine Antwortoption mehr das Fallback-Icon zeigt, ein Roundtrip-Test über Speichern und erneutes Laden im Admin, der belegt, dass die Icon-Schlüssel die Datenbank unverändert passieren, sowie eine neu erzeugte Druckübersicht unter `templates/mygpc-guided-assistant/chatbot-graphics-all-questions.html`, die den erreichten Stand mit Icons abbildet.

## Offene Punkte und Risiken

Der Seed-Pfad ist die größte strukturelle Schwachstelle. `scripts/seed-guided-flows.mjs` enthält laut eigenem Kommentar eine Handkopie der Konfigurationen aus `nuxt/data/homeEntryFlows.ts`, die manuell synchron gehalten werden muss, und genau diese Abweichung war bereits Ursache dafür, dass die frühere Fragenübersicht nicht mehr zum Systemstand passte. Mit dem zusätzlichen Icon-Feld wächst die Divergenzgefahr. Empfohlen wird, im Sprint zu entscheiden, ob der Code-Fallback mittelfristig entfällt und die Datenbank alleinige Wahrheit wird, oder ob das Seed-Script die TypeScript-Quelle zur Buildzeit einliest statt sie zu kopieren.

Zweitens ist die Sprachfrage ungeklärt. Der Entwurf mischt deutsche und englische Fragetexte, die laufende Anwendung ist durchgängig englisch, und ein Sprachkonzept für die Guided-Texte existiert nicht. Solange das so bleibt, muss die Redaktion sich auf eine Sprache festlegen, sonst entsteht im Dialog ein sichtbarer Bruch.

Drittens erlaubt die Row-Level-Security auf `guided_entry_flows` das Lesen nur für authentifizierte Nutzer. Falls der Basis-Flow künftig auch anonymen Besuchern angeboten werden soll, ist das eine eigene Entscheidung mit eigener Migration.

## Aufwand

Der Sprint ist auf zehn Arbeitstage für eine Entwicklerin oder einen Entwickler geschnitten. Registry und Datenmodell zusammen etwa anderthalb Tage, der Admin-Picker einen Tag, die Extraktion der Karten-Komponente samt Vorschau zweieinhalb Tage, das Laufzeit-Rendering einen halben Tag, die Redaktion einen Tag, Basis-Flow-Konzept und Migration einen Tag, Verifikation und Druckübersicht einen Tag, Rest als Puffer. Die Extraktion in AP 4 ist der Posten, der am ehesten überläuft.
