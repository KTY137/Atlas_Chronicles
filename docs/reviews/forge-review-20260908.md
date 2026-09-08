# Review · Schmiede, Figuren und Lootkarten · 2026-09-08

## Befunde und Umsetzung

| Priorität | Befund | Ergebnis |
| --- | --- | --- |
| P1 Bedienbarkeit | Lootkarten waren unter Tisch → Figuren → Gegenstandsvorlagen verborgen; die Schmiede bot keinen Eingang. | Aufgabenübersicht und direkte Lootkarten-Werkstatt, zusätzlich Verweise von Heute und Tisch. Vorhandene Bearbeitung wiederverwendet. |
| P2 Bedienbarkeit | Vorlagenbau, konkrete Exemplare und Vergabe wirkten wie ein einziger Verwaltungsvorgang. | Zwei benannte Aufgaben, Erläuterung der gebundenen Fassung und direkter nächster Schritt nach Speichern. |
| P2 Entwurfsverlust | Kartenbilder hochladen erforderte Verlassen der Vorlagenerstellung. Ausgewählte Dateien meldeten keinen Dirty-Zustand. | Bestehender Bildbestand im Karteneditor hält den Entwurf; Medienauswahl und laufende Aufgabe melden Dirty an den bestehenden Navigationsschutz. |
| P2 Eingabeverlust | Unvollständige Kartenzeilen wurden still aus dem gespeicherten Vertrag gefiltert. | Speichern ist bis zum Ergänzen oder Entfernen gesperrt; der fehlende Schritt steht direkt an den Zeilen. |
| P2 Entwurfsverlust | Inventar aggregierte nur Gegenstandsentwürfe, Änderungen am Geldzähler fehlten im Navigationsschutz. | Getrennte Dirty-Anteile für Gegenstand und Geld; gemeinsamer Geldzähler meldet seinen Entwurf. Inventarwechsel setzt beide nach bestätigtem Verwerfen zurück. |
| P2 Entwurfsverlust | Sammelübergabe konnte einen gerade bearbeiteten Gegenstand schließen. | Sammelübergabe ist während eines Gegenstandsentwurfs gesperrt. |
| P2 Status | Einzelübergabe setzte nur das übergeordnete Dirty-Flag zurück, ohne die gespeicherte Fassung in den Editor zu übernehmen. | Der Editor übernimmt die zurückgegebene `ItemCard` einschließlich Version und leert den Änderungsgrund. |

## Geprüfte Grenzen

Kein neuer Gegenstands-, Inventar-, Bild-, Geld- oder Kartenvertrag. Keine Änderung an Serverberechtigungen durch diese GUI-Arbeit. Vorlagenrevisionen und vorhandene Exemplare bleiben getrennt. `useTemplateDraft` und seine Entwurfsepochen bleiben im gemeinsamen Editor erhalten. Globale Wechsel werden in App bewacht, interne Werkstattwechsel lokal; ein einzelner Wechsel öffnet keinen zweiten Bestätigungsdialog.

Die React-Prüfung folgt dem gelesenen `vercel:react-best-practices`-Skill: Hook-Aufrufe bleiben unbedingt, Komponenten auf Modulebene, lokale Eingaben werden nicht aus aktualisierten Listen zurückgesetzt, Fachwerkzeuge laden abschnittsweise. Schaltflächen und Formularfelder behalten sichtbare Beschriftungen und Fokuszustände.

## Messung

Client-TypeScript-Prüfung grün; bestehende Lootkarten-, Beute- und Speicherstats-Suiten **17/17 grün**. `git diff --check` zeigte nur Git-Hinweise zu LF/CRLF, keine Whitespace-Fehler. Die sechs bearbeiteten Oberflächen-/Stildateien plus Navigation wurden nach einer korrigierten PowerShell-ASCII-Ausgabe erneut auf beschädigte Umlaute geprüft; Treffer waren nur legitime `?revision`-URLs.

Die übergeordnete Arbeit besitzt vollständigen Build, Server-Typecheck und angepasste E2E-Prüfungen. Deren spätere Ergebnisse gehören in das gemeinsame Abschlussprotokoll; hier werden sie nicht vorweggenommen.
