# GUI und Regressionen · 2026-09-08

Ausgangspunkt: `9086cdb`, Branch `experimental/featureliste-20260907` im bisherigen
Worktree `.claude/worktrees/featureliste`. Auftrag: die gesamte Anwendung auf Regressionen
prüfen und ihre Funktionen, insbesondere Schmiede und Lootkarten, verständlich ordnen.

## Oberfläche

- Die Hauptnavigation gruppiert **Spielen**, **Eure Welt** und **Vorbereiten & verwalten**.
  Kurze Beschreibungen erklären die Bereiche. Auf dem Telefon öffnet ein beschrifteter
  Menüknopf alle Bereiche; verdeckter Inhalt ist dort nicht per Tastatur erreichbar.
- **Heute** führt direkt zu Spieltisch, Figuren, Kampf sowie Lootkarte, NPC, Karte und
  Bild-Upload. Artikel stehen unter „Aus eurer Chronik“; die Reihenfolge wird nicht mehr
  als jüngste Aktivität ausgegeben.
- Die **Schmiede** startet mit einer Aufgabenübersicht: Lootkarten, Figuren & NPCs,
  Karten, Bilder, Regeln, Aussehen und Veröffentlichung.
- **Lootkarten** unterscheiden gestaltete Vorlagen und erzeugte Exemplare. Vorschau,
  Suche, optional aufgeklappte Werte und der Schritt zum Vorrat sind sichtbar. Der bestehende
  Bildbestand lässt sich im Karteneditor öffnen; der Kartenentwurf bleibt dabei erhalten.
- **Figuren & NPCs** trennen Vorlagen einschließlich Beutetabelle und das Erschaffen einer
  konkreten Figur. Bestehende Kontrolle, Charakterbögen und Inventare bleiben am Tisch.
- Der Kampf bietet **Inventar öffnen** am Teilnehmer. **Ich** bietet **Zum Inventar**,
  damit Besitz auch bei langen Charakterbögen direkt erreichbar ist.
- Die vorhandenen Editoren, Upload-, Besitz- und Generierungsbefehle werden wiederverwendet.
  Es gibt keine zweite Karten-, Inventar- oder Vorlagendatenhaltung.
- Werkstattabschnitte und Tischansichten behalten ihre Auswahl in der URL. Alte
  Artikellinks ohne expliziten Bereich öffnen weiterhin die Chronik.

Entscheidung, Alternativen und Gegenprüfung stehen in
[der Designiteration](../../design/iterations/gui-20260908.md).

## Wichtige behobene Regressionen

| Bereich | Vorher | Korrektur |
| --- | --- | --- |
| Sicherungen | Gültige Loot-/NPC-Kartenvorlagen unter Standardregeln wählten einen zu alten Exportleser. | Der bestehende neuere Leser wird anhand aller benötigten gespeicherten Definitionen gewählt. |
| NPC-Beute | Umgekehrte Mengen oder fehlende Vorlagenverweise wurden gespeichert und verhinderten spätere Nutzung oder Sicherung. | Prüfung vor dem Schreiben einer unveränderlichen Revision. |
| Geld | Ein Betrag ohne benannte Währung war speicherbar, aber nicht exportierbar. | Server lehnt das ab; UI erklärt die erforderliche Benennung und bietet vorher keine Betragseingabe an. |
| Bilder | Historisch freigegebene, inzwischen entfernte Bildpassagen erlaubten noch den Dateiabruf. | Bildfreigabe folgt dem wirksamen Wissen und lebenden Bildreferenzen. |
| Kampf | Entfernen des letzten aktiven Teilnehmers und spätere Nachbesetzung konnten Runden oder den aktiven Zug verlieren. | Konsistente Reihenfolge, Rundenzählung und Wiederaufnahme. |
| Kampf | Derselbe verspätete Zugbefehl konnte in der nächsten Runde erneut wirken. | Vorhandene HTTP-Route verlangt nun Teilnehmer **und Runde**; veraltete Befehle erhalten 409. |
| Entwürfe | Saubere Geschwisterfelder, Figurenwechsel und entfernte Antworten konnten Entwürfe oder ihren Schutz überschreiben. | Zusammengesetzte Dirty-Signale, passende Komponentenidentität und ursprüngliche Versionsbasis. |
| Navigation | Ein Kampflink öffnete Aktionen; alte Schnellzugriffsanfragen konnten eine explizite Vollmacht überstimmen. | Gemeinsame Tab-Auflösung, bereinigte Anfragen und Vorrang der expliziten Vollmacht. |
| Karteneditor | Eine einzelne geänderte Breite oder Höhe wurde still ignoriert. | Die andere Dimension wird aus den Generatorvorgaben ergänzt. |
| Looteditor | Eine halb ausgefüllte Wertezeile verschwand beim Speichern ohne Erklärung. | Fehlende Angabe wird angezeigt; erst vervollständigen oder Zeile entfernen. |
| Orientierung | Das Appearance-Theme überstimmte die aktive Werkstattmarkierung; der neue Inventarsprung scrollte auch das äußere Dokument. | Markierung gezielt gegen Theme-Regeln abgesichert; Sprung scrollt ausschließlich die Inhaltsfläche. Kleine Karten geben dem Titel eine eigene Zeile. |
| Darstellung | Bestehende Würfe animierten beim ersten Laden; entfernte Kartenassets blieben im Grafikspeicher. | Geladene Historie als Ausgangsstand; Freigabe nicht mehr verwendeter Ressourcen. |

Die Details, konkreten Auslöser und vor dem Fix beobachteten roten Tests stehen in
[Server/Daten](data-review-20260908.md), [Gameplay/Karten/Renderer](play-review-20260908.md)
und [Schmiede](forge-review-20260908.md).

## Prüfbereich und Grenzen

Die Review deckt die Paket- und Workflowgrenzen von Server, Protokoll, Regeln, IO,
Core/Chronik/Projektion, Client, Generatoren, Szene, Renderer, Theme/UI und Desktop ab.
Die tiefsten Prüfungen gelten den neuen Feature-Verknüpfungen und den tatsächlich
gefundenen Defekten. Das ist keine Aussage, jede Zeile oder jeden möglichen Zustand
vollständig geprüft zu haben. Die gesamte Testsuite wurde auf ausdrücklichen Wunsch
nicht gestartet.

Die Browserprüfung verwendet die gebaute Anwendung mit echten HTTP-Routen, Sitzungen
und isoliertem PGlite. Sie nutzt keine produktiven Kampagnendaten. Geprüft wird auch der
vollständige Weg **PNG hochladen → Kartenentwurf behalten → Vorlage speichern → Exemplar
erzeugen → Beute übergeben → Spieler sieht Karte und Bild**. Browser-Tests halten keine
erfundenen Produktantworten vor; gezielt verzögerte echte Antworten prüfen Entwurfsschutz.

Reale PostgreSQL-Parallelität, ein neu gebauter Desktop-Installer, reale GPU-Leistungswerte
und eine vollständige Browsermatrix wurden nicht behauptet. Vorhandene ungültige historische
Beuterevisionen werden nicht nachträglich umgeschrieben.

Die Dorf-/Siedlungsauswahl und KI-Modellanbindung des Chronisten bleiben die bereits zuvor
offenen Features. Das GUI-Rework behauptet keine Implementierung dieser Anschlüsse.

## Ausführung und Nachweise

Die Reviewphasen laufen über `tools/review/workflow.py` als LangGraph-StateGraph mit
lokalem SQLite-Checkpointer. Der Graph fordert Arbeit an und hält Belege fest; Dateiedits,
Tools und Tests führt die autorisierte Sitzung aus. LangSmith-Tracing bleibt abgeschaltet.
Der Tooling-Pin liegt in `tools/review/pyproject.toml`.

Nachweise der einzelnen Reviewbereiche sind in den verlinkten Berichten festgehalten.
Die Ergebnisse der überlappenden Läufe werden nicht zu einer künstlichen Gesamtzahl addiert:

| Prüfung | Ergebnis |
| --- | --- |
| Server-/Datenreview einschließlich bestehender IO-, Regel- und Protokollkonsumenten | 314 verschiedene gezielte Fälle grün, Details im Datenbericht |
| Gameplay-/Generator-/Rendererreview einschließlich Szene, Theme und Desktop | 208 verschiedene gezielte Fälle grün, Details im Gameplaybericht |
| Gesamte betroffene Client-Tests (`vitest run packages/client/test --maxWorkers=1`) | 168/168 in 21 Dateien grün; enthält die neuen Entwurfs-/Navigationsfälle |
| Bestehende Browserkonsumenten in fünf Specs | 16 verschiedene Szenarien grün: neun im ersten Lauf, die sieben übrigen nach Selektorkorrekturen im separaten Lauf |
| Neue GUI-Browserfälle (`e2e/gui-navigation.spec.ts`) | 6/6 grün: Kampflink/Reload, Aufgabenwege, Mobilmenü, Spielerrechte, Bild/Loot/Übergabe, Entwurfsschutz |
| `npm run typecheck` und `npm run build` | beide erfolgreich; Build enthält Client-TypeScript und Vite |
| `gate:boundaries` | 466 Dateien, acht Regeln, keine Verletzung |
| `gate:assets` | zwölf Testfälle, drei Pakete, 171 Assets und 171 auflösbare Referenzen grün |
| `gate:version` | vier Testfälle grün; Root/Desktop 0.1.0 konsistent |
| `git diff --check` | keine Whitespacefehler |

Die ersten Bestandsbrowserläufe enthielten veraltete/mehrdeutige Selektoren und einen Fehler
durch gleichzeitig ersetzte Build-Artefakte. Diese Ursachen sind im Gameplaybericht
offengelegt. Für den Korrekturlauf blieben die gebauten Dateien unverändert; getrennte
Ausgabeordner verhindern, dass ein Lauf die Belege des anderen entfernt.

Nach dem gemeinsamen Lauf erfolgten nur die im visuellen Gegencheck entdeckten
Markierungs-/Kartenstile und die Begrenzung des Inventarsprungs auf die Inhaltsfläche.
Typecheck und Build wurden danach erneut erfolgreich ausgeführt. Der Browser zeigte vor
dem Sprungfix `window.scrollY=534` und Kopfzeile bei `top=-534`, danach beides bei null.
Die aktive Werkstatt hat jetzt die gemessene Akzentfarbe `rgb(230,165,90)` statt der
neutralen Theme-Randfarbe. Der zusätzliche Durchlauf des vollständigen Bild-/Lootfalls
ist **1/1 grün** und prüft auch, dass Inventar und Kopfzeile sichtbar bleiben und das
Fenster nicht scrollt. Der abschließende Screenshot wurde visuell gegengeprüft.

Visuelle Belege liegen lokal in `.local/review-20260908/`: `forge-desktop.png`,
`forge-mobile.png`, `loot-desktop.png` und `player-loot.png`. Sie enthalten ausschließlich
Testdaten. Sitzungszustand und Checkpoints bleiben lokal und werden nicht eingecheckt.
