# Gegenwart, Science-Fiction und 100 Kartenassets

Auftrag: weitere passende Innenräume auch jenseits von Fantasy, passende Stadtkarten und 100 neue Assets.

## Entscheidung

Die vorhandenen Generatoren, verschachtelten Adressen und Paketverträge bleiben die Grundlage.
Die Settings `fantasy`, `gegenwart`, `scifi` bestimmen Gebäudemischung, Raumprogramme und
Stadtgestaltung. Das Setting geht in den Weltkeim ein. Dauerhafte Quelle ist genau ein optionales
Feld `provenance.setting` in der unveränderlichen Kartenquelle; UVTT- und Native-Validierung
akzeptieren nur die drei Werte. Altquellen ohne Feld bedeuten Fantasy. Beim Betreten wird der
Wert vererbt. Bereits erzeugte Kinder behalten ihre gespeicherte Identität und Karte.

22 neue Gebäudetypen ergänzen die bisherigen sechs: Wohnblock, Büro, Café, Restaurant,
Supermarkt, Krankenhaus, Polizei, Feuerwache, Schule, Hotel, Fabrik, Bahnhof, Labor,
Raumhafen, Raumstation, Medstation, Kommandozentrale, Reaktor, Bibliothek, Museum, Bank
und Werkstatt. Gemeinsame Typen bleiben auch außerhalb ihres typischen Settings auswählbar.

Ein neues eigenständiges Paket `pk.zeitwelten` enthält exakt 100 neue SVG-Zeichnungen mit
korrekten Footprints, Ankern, Schlagworten und gehashten Lizenz-/Dateibelegen. Die Assets
werden reproduzierbar durch den vorhandenen Paketautor erzeugt und durch `gate:assets`
geprüft. Sie sind im Editor platzierbar und über semantische Anfragen im Generator nutzbar.
Der neue Kartenstil `zeitwelten` ergänzt `grundriss` und `gemalt`.

Verworfen: 100 bloße Farbvarianten, isolierte Bilddateien ohne Paketmanifest, zufällige
Fantasy-Einrichtung in modernen Räumen und ein zweiter Karten- oder Persistenzpfad.

## Arbeit und Prüfung

Lokaler LangGraph StateGraph mit Checkpointer unter `.local/map-expansion`, Pin
`langgraph>=1.2,<2`, Tracing aus. Die parallelen Arbeitspakete sind Assetkunst, Generatoren
mit gemeinsamem Vertrag sowie Serverintegration; die Hauptrolle integriert die Oberfläche.
Danach: Paket-/Referenzprüfung, Erreichbarkeit und Determinismus der Innenräume,
Settingvererbung und Native-Archiv, Browserprüfung samt visueller Sichtung.

## Umsetzung

Grundriss v6 und Siedlung v4. Vier neue architektonische Organisationsformen bilden
Servicebereiche, Empfangsflügel, Produktionshallen und radiale Stationskerne. Bibliothek,
Museum, Bank und Werkstatt bekommen im Fantasy-Setting klassische Einrichtung aus den
vorhandenen Paketen. Moderne Städte haben geplante Blöcke und breite Straßen; futuristische
Orte versetzte Modulblöcke. Beide verwenden zeitgemäße Fahrzeuge und Beleuchtung ohne
mittelalterliche Ringmauer. Flach- und Technikdächer bleiben Darstellung derselben Footprints.

Das neue Paket umfasst **12 Böden, 3 Wände, 3 Türen, 23 Aufbauten/Fahrzeuge, 1 Marke,
3 Lichter, 50 Einrichtungsobjekte und 5 Behälter**. Alle 100 Zeichnungen sind eigenständig;
kein bestehendes Paket wurde umgefärbt oder verändert. Der Autor und ein Kontaktbogenwerkzeug
liegen unter `tools/assets/`. Die Paketprüfung umfasst Geometrieunterschiede, eindeutige
SVG-IDs, alle Rasterisierungen bei 64/128 Pixeln und vollständig deckende Bodenkacheln.

Im Editor zeigt der neue Assetkatalog Vorschaubilder, Kategorie-/Settingfilter und Suche.
Platzierungen verwenden die echte Paketgröße im Kartenmaßstab und passen bei der Anlage
vollständig auf die Kartenfläche. Verschieben, Drehen, Skalieren und Entfernen sind
Kartenentwürfe bis zum Speichern der Revision. Entfernen löst auch die zugehörigen
Wissens- und Höhenreferenzen, andere Ziele bleiben erhalten. Dachaufbauten mit Ebene 40
werden über den Stadtgebäudeflächen gezeichnet.

## Befunde aus der Prüfung

- Eine Science-Fiction-Schotttür ist eine Schiebetür. Der Generator fragt im passenden
  Paket danach; er etikettiert das Asset nicht als Drehtür. Nicht zum Setting passende
  Assets sind von der Kandidatenwahl ausgeschlossen, ungetaggte Objekte bleiben neutral.
- `Zeitwelten` ist ein Paket für Gegenwart und Science-Fiction. Diese empfohlenen
  Kombinationen werden auf vollständige Anfragenabdeckung geprüft. Freie Kombinationen
  mit anderen Stilen bleiben möglich; fehlende Ausstattung wird sichtbar gemeldet.
- Der Browserdurchlauf mit 100 Katalogbildern verbrauchte das globale API-Budget auch
  durch statische Bild- und Modulabrufe. Dadurch scheiterten beim Kartenwechsel sogar
  Renderer-Imports mit HTTP 429. Statische Appdateien und begrenzte Paketabrufe erhalten
  deshalb getrennte Behandlung; das Budget für eigentliche API-Aktionen bleibt bestehen.
  Eine zeitliche Umgehung nur im Test würde diesen Benutzungsfehler erhalten.

- Der unabhängige Bedienreview fand eine konkurrierende Werkzeugauswahl: Ein numerisch
  hinzugefügter Polygonpunkt beendete einen aktiven Assetpinsel nicht. Die Regression
  scheiterte zuerst mit einem zusätzlich platzierten Schreibtisch; der Werkzeugwechsel
  beendet nun beide konkurrierenden Modi. Der vollständige Komponentenreview besteht mit
  **18/18** Tests.
- Der Renderer verwendete beim Aussortieren unsichtbarer Stamps feste 64×64-Pixelmaße.
  Ein 128×320-Pixel-Bus konnte bei hoher Vergrößerung trotz sichtbarer Bildkante verschwinden.
  Die Sichtbarkeitsberechnung verwendet jetzt die tatsächlichen Bitmapmaße. Drei Regressionen
  wurden zuerst rot nachgewiesen und bestehen jetzt: große Busgrafik, Schwenken/Zoom und
  Platzierung auf der Dachebene. Aufrufer ohne Bilddaten behalten den bisherigen Fallback.

## Nachweise

- Paketprüfung: **15/15 Tests**, vier Pakete mit **271 Assets / 271 gültigen Referenzen**,
  alle vier Pakete bytegleich reproduziert. Das neue Paket enthält exakt **100** Assets.
- Generatorabschluss: **115/115 Tests** für Setting-/Raumprogramme und echte Paketabdeckung.
  Zusätzlicher Platzierungsaudit: **30.904 Platzierungen**, keine außerhalb ihrer Raumfläche.
- Der breite Gesamtlauf über einen noch gleichzeitig bearbeiteten Generatorstand endete
  mit **161 Dateien / 1.725 Tests grün**, **10 Dateien / 52 Tests übersprungen** und
  **18 Fehlern in genau zwei Dateien** (`settings.test.ts`, `zeitwelten.test.ts`). Deren
  abgeschlossener Stand besteht danach mit den genannten **115/115** Tests. Das ist kein
  nachträglich behaupteter vollständig grüner Gesamtlauf.
- Abschließender Client-/Rendererlauf: **31 Dateien / 315 Tests grün**;
  Setting-Serverintegration **8/8**, bisherige Generierungs-/Betreten-/Werkstattfälle
  **50/50**, UVTT **30/30**. Version, Paketgrenzen, Typecheck und Client-Build bestanden.
- Budgetkorrektur: **27/27 Tests** (Static 7, Rate 5, Packs 15). Vorher rot nachgewiesen:
  280 Modulabrufe beziehungsweise Paketbursts bekamen HTTP 429. Jetzt verbrauchen öffentliche
  GET-/HEAD-Modulabrufe kein API-Budget; authentifizierte Paketabrufe haben je Routentyp ein
  eigenes begrenztes Budget von 1.200/min. Die übrige API bleibt bei 240/min. Moduldateien
  bekommen immutable Cache-Control, HTML bleibt no-store. Pfadgrenzen, Anmeldung und
  Manifest-/Hashprüfung bestehen. Unabhängiger Review ohne bestätigten Sicherheitsblocker.
- Visuelle Sichtung: Alle 100 Assets als Kontaktbogen, Bodenkacheln, echte Gegenwartsstadt,
  Polizeiwache und mobiler Katalog. Keine bestätigten Layoutblocker in den gesichteten Bildern.

- Vollständiger unveränderter Browserablauf nach den Korrekturen **grün (49,7 s;
  Gesamtlauf 54,2 s)**, ohne Test-Cooldown: Gegenwartsstadt → Polizeiwache, Sci-Fi-Stadt →
  Medstation, geerbte Settings, 100 reale Katalogobjekte, Computersuche/-platzierung,
  gespeicherte Revision nach Neuladen und unveränderte Unterkartenidentität beim Wiederbetreten.
  Desktop und 390-Pixel-Mobilansicht ohne horizontalen Überlauf; keine fehlgeschlagenen
  Assetabrufe oder Browserfehler. Isolierte PGlite/App/Browser werden im Fixture geschlossen.
  Sieben Screenshots unter `test-results/map-settings-verified/`, Laufprotokoll unter
  `.local/map-expansion/map-settings-e2e-final.log`. Sci-Fi-Stadt und beide Medstationsansichten
  zusätzlich von der Hauptrolle visuell gesichtet.
