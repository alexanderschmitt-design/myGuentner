# templates/mygpc-guided-assistant

Fester Ablageort für alle HTML-Seiten, Grafiken und Frage-Sets, die für den
myGPC Guided Assistant entwickelt werden.

Hintergrund: Bis September 2026 sind diese Dateien in wechselnden
Arbeitsverzeichnissen entstanden — teilweise in Cloud-Sessions, deren Container
nach Sitzungsende verworfen wurden. Dabei ist unter anderem
`chatbot-graphics-all-questions.html` mit 25 gebündelten Fragen verloren
gegangen. Dieser Ordner existiert, damit das nicht noch einmal passiert.

## Konvention

Alles, was zum Guided Assistant gehört, wird hier abgelegt und nirgendwo sonst.
Der fachlich zugehörige Seed-Code liegt in `../../scripts/seed-guided-flows.mjs`.

Die Namensgebung folgt dem bisherigen Muster: `chatbot-graphics-questions-N.html`
für einzelne Frage-Blöcke, `chatbot-graphics-all-questions.html` für die
kumulierte Übersicht über alle Blöcke. Themenbezogene Ergänzungen bekommen einen
sprechenden Suffix statt einer laufenden Nummer.

## Arbeitsregel

Eine Seite gilt erst dann als gesichert, wenn sie hier im Repository liegt und
committed ist. Eine Datei, die nur in einer Session-Umgebung existiert, ist
verloren, sobald die Session endet. Wer in einer Cloud-Session arbeitet, verbindet
vorher diesen Ordner oder lässt das Ergebnis am Ende ausdrücklich hierher
zurückschreiben.

Fertige Seiten, die wiederholt angesehen oder geteilt werden sollen, werden
zusätzlich als Artifact veröffentlicht. Die Artefakt-Galerie liegt unter
`claude.ai/code/artifacts`; die dortige URL gehört in die Kopfzeile der jeweiligen
Datei, damit die Zuordnung später nachvollziehbar bleibt.
