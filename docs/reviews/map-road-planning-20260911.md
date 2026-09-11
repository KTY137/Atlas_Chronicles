# Straßenplanung — Roadmap 06 — 2026-09-11

Basis: `c510c73a1ece794f6789707b1918e35bd6efe135` (Zonen und Expeditionsassets).
Auftrag: TODO-Liste #3 fortsetzen, geprüfte Arbeit nach main integrieren.

## Entscheidung und Grenzen

Ein editierbarer **Vorgabegraph vor der Erzeugung** ergänzt die automatische Siedlung.
Wegpunkte, Zugänge und Plätze werden per Maus, Pfeiltasten oder Prozentkoordinaten bearbeitet;
Verbindungen erhalten Hauptstraßen-/Gassenbreite und einzeln eine Flussbrückenerlaubnis.
Die bereits vorhandene Vorschau dient als ausdrücklich markierter Hintergrund. Der Graph
ist ein geschlossener, versionierter Bestandteil des Generatorvektors, kein zweiter
Karten- oder Geometriespeicher. Die Ausgabe sind normale editierbare Straßenregionen,
Platzflächen, echte Brückenschnittflächen und die bestehenden Durchlässe der Stadtmauer.

Verworfene Abkürzung: eine Linie zwischen zwei Punkten nur zeichnen und „verbunden“ nennen.
Verworfene Alternative: alte Straßen beim Laden automatisch ersetzen; das würde manuelle
Arbeit und bestehende Knotenadressen gefährden. Bereits gespeicherte Karten bleiben daher
unverändert. Das Werkzeug liegt in der freien Kartenwerkstatt für gewöhnliche Siedlungen,
nicht im kompakten Eingangsdialog ohne Vorschau und nicht bei Burg/Schloss/Region/Höhle.

**Nicht behauptet:** automatischer Neuaufbau der ganzen Parzellierung entlang eigener Wege,
nachträglicher Graphimport aus bearbeiteter Geometrie, Teil-Neugenerierung (#10), physikalische
Straßenbausimulation oder Druck-/VTT-Auslieferung. Vorhandene Straßen bleiben mit den
bisherigen Kartenwerkzeugen editierbar; der neue Vorgabegraph lebt in der Generierungsphase.
Die neuen Plätze reservieren Bebauungsfläche, schreiben aber keine Wiki-Einträge oder
Wissensfreigaben. Ein Zugang ist eine bewusste Planvorgabe, keine Spielberechtigung.

## Tragefähige Verträge

- `RoadPlan` v1: höchstens 24 benannte Knoten und 32 ungerichtete Verbindungen; keine
  Selbstverbindungen, doppelten Kanten, fehlenden Endpunkte, fremden Felder oder ungültigen
  Koordinaten. Leere Zwischenwerte bleiben im Editor bearbeitbar, sind nicht erzeugbar.
- Gemeinsame Grenzen für HTTP und Domäne; Serverfähigkeit `strassenplanung:1` verhindert
  scheinbar funktionierende Optionen gegen ältere Hosts. Importierte Vorlagen mit einem
  nicht unterstützten Graphen werden abgelehnt, nicht stillschweigend entkernt.
- Bounded A* auf dem Konstruktionsraster mit deterministischen Tie-Breaks. Ganze Straßenbreite
  und Gelenkflächen statt nur Mittellinie prüfen. Seen/Meer/Fels sind immer gesperrt; Flüsse
  nur ohne ausdrückliche Brückenerlaubnis. Endpunkte und Plätze müssen trocken liegen.
- Höhenwechsel: Roh-Höhenstufen pro Rasterzelle, **keine Prozentsteigung**. Viertelzellproben
  prüfen Zwischenanstiege. Glättung entfernt Rastertreppen nur nach denselben vollständigen
  Hindernis- und Höhenprüfungen. Die Sucharbeit ist pro Graph auf 200.000 Knoten, Glättung auf
  512 Sichtprüfungen und Ausgabe auf 512 Straßen-/Platzflächen begrenzt. Auch die unveränderten
  Karten-/Kartografie-Bytebudgets gelten; große Vorgabegraphen mit vielen Gebäuden können sie
  erreichen. Kein Budget wird für die Funktion hochgesetzt.
- Straßen/Plätze vor Gebäuden reservieren; echte Dachüberschneidungen werden verhindert.
  Bestehende Fluss-/Brücken- und Mauerdurchlass-Erzeugung wiederverwenden. Relief bleibt gleich.
- Geometrische Zusammenhangsprüfung nennt getrennte Netze und Gebäude/Wegpunkte ohne Zugang.
  Die ausgewiesenen einzelnen Verbindungen ohne Alternative betreffen **nur den eigenen
  Vorgabegraphen**, nicht angebliche Engpässe des gesamten automatischen Straßennetzes.
- Keine falsche Erfolgsmeldung: fehlgeschlagene Verbindungen bleiben als Diagnosen in der
  Vorschau; Speicherung wird im Client und unabhängig davon in der Domäne verweigert.
- Ohne/mit leerem Straßenplan bleiben bestehende v8-/Zonen-v9-Ergebnisse vollständig gleich,
  einschließlich IDs. Nur aktive Straßenpläne erhalten v10. Native Speicherung, Innenräume,
  Vorlagendatei, Generatorherkunft und Sicherung/Wiederherstellung verwenden dieselben Verträge.

## Tatsächlich ausgeführte lokale Prüfung

**1.142 Vitest-Fälle in 65 Dateien bestanden**, 0 Fehler, 0 übersprungen. Die gesamte Auswahl
entspricht dem erweiterten `map-studio`-Workflow (Forge, Szene, Renderer, relevante Client- und
Serverfälle). Darin **66 neue Fälle**: 23 Graphvertrag, 19 Routing/Zusammenhang/Budget,
7 Generatorintegration, 12 Client/Vorlagen, 5 reale HTTP-/Speicher-/Berechtigungsabläufe.
Root-Typecheck, Client-Typecheck/Produktionsbuild, Sprach-/Boundary-Gates und zehn
Expeditions-Assetprüfungen ebenfalls bestanden.

Zwei wichtige rote Nachweise: Die neue HTTP-Suite wies den zunächst fehlenden Schemaanschluss
zurück, obwohl direkte Generatoraufrufe schon funktionierten. Die Schnittprüfung wies eine
rechtwinklige Kreuzung ohne innenliegende Eckpunkte zunächst als zwei Netze aus. Beides wurde
behoben; die Fachassertionen bleiben bestehen. Die alte Polygon-Hilfsfunktion wurde nicht
global umgedeutet, damit alte Generatorergebnisse nicht unversioniert wechseln.

Die native Sicherung wurde in eine neue Testdatenbank eingespielt und semantisch verglichen.
Idempotenz, vorhandene Innenräume, Ablehnung unbrauchbarer Pläne ohne Schreibnebenwirkungen,
Spielerrechte, schmale Flüsse zwischen Rasterpunkten und globale Suchbudgets sind getestet.

## Browserabnahme

Zwei neue echte Playwright-Abläufe ergänzen die vier vorhandenen Burg-/Schloss-/Zonen-/Asset-
Abläufe: Graph per Tastatur und Maus bearbeiten, echte Reservierungen prüfen, Vorlage
herunterladen/hochladen und identischen Vorschauhash erhalten, speichern/neuladen;
Flussverbindung ohne Brückenerlaubnis ablehnen, mit Erlaubnis tatsächlich überbrücken.
Beide verlangen eine leere JavaScript-Fehlerliste. Der erste prüft auch 390-Pixel-Breite.

Lokaler Versuch mit vorhandenem Chromium: `ERR_BLOCKED_BY_ADMINISTRATOR` beim Aufruf des
Testservers. Keine Umgehung und keine behauptete lokale Browserabnahme. Die Browserprüfung
läuft im bestehenden GitHub-Kartenworkflow vor dem Merge; der Abschlussreview und Issue #3
halten den tatsächlich geprüften Commit und Lauf fest.

Das globale Gate hatte bereits auf main die 41 dokumentierten Loot-Reproduktionsabweichungen.
Diese Arbeit ändert keine Loot-Dateien, Prüfbedingungen oder Branch-Schutzregeln.
Kein Windows-Installer, installierter Desktop-Smoke oder Abschluss aller 20 Punkte behauptet.
