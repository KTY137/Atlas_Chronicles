# Kartenstudio: kleine Änderungen ohne Vollaufbau — 2026-09-12

Auftrag: Karteneditor und Generator weiter verbessern, schöner und flüssiger machen.
Präzisierung: Schon kleine Edits sind langsam. Ausgangspunkt der Kartenquellen:
`4ed7b63`. Gleichzeitig werden andere Bereiche dieser Arbeitskopie bearbeitet;
Regelschmiede, Figuren, Steam und der vorhandene Review-Workflow sind fremde Arbeit.

## Entscheidung

Die Reaktionszeit hat Vorrang. Vergleichsmaßstab ist ein direkt bedienbares
Zeichenwerkzeug mit verständlicher Pinselgröße, stabiler Darstellung und wenig
Platzverbrauch durch Werkzeugleisten. [Dungeondraft](https://dungeondraft.net/)
nennt intuitive Werkzeuge, einen schnellen Arbeitsablauf, Landschaftsmalerei und
Objektstreuung als Kernfunktionen; eine pauschale Überlegenheit wird hier nicht
behauptet. Keine Auflösungsreduktion, keine Entfernung von Kartendetails.

Der vorhandene LangGraph `map-studio` steuert Erkundung, Entwurf, Daten-, Renderer-
und UI-Arbeit, Prüfung und Übergabe. Eigener SQLite-Checkpoint unter
`.local/map-performance-20260912/workflow.sqlite`, Thread `map-performance-20260912`.
LangGraph 1.2.11 geprüft, vorhandener Pin `>=1.2,<2`, Tracing aus. Der Graph
komponiert; Änderungen und Prüfungen erfolgen über die autorisierten Werkzeuge.

## Ursachen und Umsetzung

- Der Verlauf serialisierte bei jedem Schritt erneut alle zurückliegenden Karten.
  Unveränderliche JSON-Teilbäume, Vergleichsindizes und die exakten UTF-8-Größen
  werden nun über schwache Referenzen wiederverwendet. Die Grenzen von 100 Schritten
  und 32 MiB, Änderungsstatus, Rückgängig/Wiederholen und Speichernachlauf bleiben.
- Die Projektion berechnete Landschaft, Dächer und Texturen bei Möbelbewegungen neu.
  Jeder Editor besitzt jetzt genau einen eigenen Zeichnungscache. Änderungen an
  Geometrie, Material, Relief, Stimmung oder Sichtbarkeit aktualisieren ihn; Text,
  Möbel, Licht und Raster behalten ihre aktuellen Werte. Wandprüfung einmal je
  Projektion statt einmal pro Wand. Kein globaler Cache nach Karten-ID.
- Der Renderer baute bei jeder Aktualisierung Landschaft, Wände, Möbel und Marker
  neu. Die Darstellung aktualisiert nun die tatsächlich geänderten Ebenen, hält
  Möbelsprites und Schatten vor und setzt Textstile nur bei veränderten Farben neu.
  Jede Ersatzszene wird weiter validiert; Sichtentzug entfernt Raster sofort.
- Auswahl und Zeichenumrisse sind von der Landschaftsprojektion getrennt.
  Regionensuchen verwenden einen Index. Kameraänderungen berechnen die Assetliste
  nicht erneut. Ebenensperren verändern nur die Bedienbarkeit.
- Gelände-, Höhen- und Straßenpinsel zeigen eine mit dem Zoom skalierende Kontur.
  Zeigerbewegungen aktualisieren nur dieses DOM-Overlay pro Animationsframe.
  Es schreibt weder Karteninhalt noch Verlauf. Kontur verschwindet beim Verschieben,
  Werkzeugwechsel, Verlassen und Fokusverlust; überlappende Pan-Tasten sind geprüft.
  Stimmung und Ebenenschalter stehen in kompakten Zeilen statt übereinander.

## Messungen

Lokale Vorher/Nachher-Messungen; keine allgemeine Hardware- oder FPS-Zusage.

| Vorgang | Vorher | Nachher |
| --- | ---: | ---: |
| Browser: 15 Höhenwertänderungen, Median bis zum zweiten Animationsframe | 757 ms | 72 ms |
| Browser: langsamster der 15 Schritte | 1.253 ms | 130 ms |
| Verlauf: 30 Höhenwertänderungen einer Stadt, Median | 415,76 ms | 3,22 ms |
| Derselbe Verlauf, alle 30 Schritte zusammen | 13.165,6 ms | 254,3 ms |
| Stadtprojektion bei Möbelbewegung, Median | 111,55 ms | 1,11 ms |
| Dorfprojektion bei Möbelbewegung, Median | 37,02 ms | 0,40 ms |
| Unveränderte Pfade erneut an Pixi übergeben bei Figurenbewegung | 5.500 | 0 |
| Ersetzte Möbelsprites bei Bewegung eines von 800 Objekten | 800 | 0 |

Browser: Headless Edge, 1440×1000, echte React-/Renderer-/HTTP-Strecke,
`studio-gebirge`, 32 Gebäude, 440 Flächen, gleiche deterministische Karte.
Gemessen wird Playwright-Feldeingabe bis zum zweiten `requestAnimationFrame`,
einschließlich Transport und Darstellung, nicht nur React-Rechenzeit.
Verlauf: echte Stadt `gallery:river-1`, 1.028 Flächen, 762.658 Byte.
Projektion: echte Forge-Karten, drei Aufwärmschritte und 20 Möbelbewegungen.
Rendererzählungen verwenden die echte Rendererfabrik mit instrumentierter
Pixi-Grenze; sie sind keine GPU-Zeitmessung.

Rohdaten: `.local/map-performance-20260912/{before,after}-browser.json`,
`history/{before,after}.json`, `.local/map-projection-{baseline,cached}.json`.
Browserbilder und neue Konturprüfung liegen im gleichen lokalen Nachweisordner.

## Prüfung und Grenzen

Unabhängige Reviews von Renderer und React-Integration ohne offene Blocker.
Dabei gefundene Konturfehler bei Fokusverlust und gleichzeitig gehaltenem
Alt/Leertaste wurden korrigiert und mit ausführbarem Ereignisharness geprüft.

Bestätigt: 148 Renderertests, 75 Projektions-/Generierungstests und 15 Verlaufstests.
Alle acht Karten-Browserfälle bestanden (6,9 Minuten): Pinselkontur, Innenräume mit
Tür/Möbeln/Verschieben und mobile Ansicht, Gebirgsdorf/Insel, Stimmung/Ebenen,
Streupinsel, Beschriftungen, Region/Unterkarte und Höhenpinsel. Speichern und
Neuladen sind Teil der Abläufe. Der erweiterte Konturfall mit Fokusverlust und
überlappenden Pan-Tasten bestand abschließend erneut (1/1, 1,4 Minuten).
Root-Typecheck, abschließender Client-Produktionsbuild, Version, Architektur,
Sprache (4.952 Schlüssel, keine Verstöße) und Assets (611 Grafiken) bestanden.
Die abschließende gemeinsame Prüfung aller betroffenen Module bestand mit
**514/514 Tests in 30 Dateien**, einem Worker und unveränderten Zeitlimits
(22,69 Sekunden): Renderer, Szene sowie Kartenverlauf, Generierung, Ebenen,
Grafiken, Streuung, Beschriftung, Höhenwerkzeug, Werkstatt und Typauswahl.
Log: `.local/map-performance-20260912/unit-focused.log`.

Die vollständige Vitest-Suite wurde unter zwei gleichzeitig laufenden, unabhängig
beauftragten Gesamtprüfungen nicht abgeschlossen. Bei etwa 1 GiB freiem RAM von
16 GiB trat der bereits im STATUS dokumentierte Desktop-Verknüpfungs-Timeout auf;
dazu Zeitüberschreitungen in unveränderten nativen Sicherungs-/Datenbanktests
(`map-settings`, zwei `bundles-v3`-Fälle, `map-lifecycle`). Nur unser Lauf wurde
beendet: bis dahin 11 abgeschlossene Dateien, 72 bestanden, fünf fehlgeschlagen,
neun übersprungen; laufende Fälle sind darin nicht vollständig gezählt. Keine
Zeitlimits verändert, keine vollständige grüne Gesamtsuite behauptet. Der fremde
Lauf blieb unangetastet. Log: `.local/map-performance-20260912/unit.log`.
Der erste Sprachgate-Versuch traf gleichzeitig bearbeitete Übersetzungen außerhalb
der Kartenänderung; der spätere echte Gesamtlauf des Sprachgates ist grün.

Die erste kalte Verlaufsänderung kostet im gemessenen Stadtlauf noch 154,5 ms.
Tatsächliche Geländeänderungen bauen die Landschaftsebene weiterhin neu auf.
Forge-Eingangs-/Ausgangsparser prüfen beim Gelände- und Innenraumbau weiterhin die
vollständige Karte; diese Validierungsgrenze wurde nicht aufgeweicht. Neuer
Generatorstil, neue Kartentypen und eine allgemeine 60-FPS-Abnahme sind kein
Ergebnis dieses Patches. Kein Installer veröffentlicht oder installiert.
