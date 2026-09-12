# Vier weitere Kunstdurchgänge — 2026-09-12

Owner-Korrektur: mehr Mühe, Vorschauen schneiden mitten im Motiv ab, mehr
Detail, flüssigere und deutlichere Animation. Ausdrücklicher Auftrag:
„iterier die einfach 4 mal“.

Vier weitere Durchgänge werden als vier aufeinanderfolgende Repair-/Verification-
Zyklen im vorhandenen LangGraph mit demselben SQLite-Checkpoint geführt.
Jeder Durchgang enthält eine tatsächliche Änderung und Sichtprüfung; die vier
Durchgänge werden nicht rückwirkend aus der vorherigen Arbeit gezählt.

1. Vollständige, größere Panoramavorschauen statt zentralem Ausschnitt;
   durchgehende Horizonte und weichere Übergänge in der Kopfzeile.
2. Eigenständige, handgezeichnete Nebenszenen je Welt, reichere Materialien,
   Lichtreflexe und klar lesbare kleine Geschichten in allen 25 Hauptmotiven.
3. Sichtbare und flüssige Handlungen, Gelenkpunkte, zeitlich versetzte Abläufe,
   weiche Richtungswechsel und überprüfte Schleifen.
4. Abschließende Sichtprüfung aller Motive und Bildränder in mehreren Größen,
   daraus abgeleiteter Feinschliff und Browsernachweis am finalen Build.

Nachweise und konkrete Änderungen je Durchgang folgen in dieser Datei und im
Graph-Evidence-Protokoll. Quelldateien bleiben nach Zuständigkeit getrennt:
Fantasy/Industrie, Future, Discoveries und gemeinsame Darstellung.

## Durchgang 1 — abgeschlossen

Einspaltige, größere vollständige Panoramen; SVG passt unverzerrt in seine
Vorschau. Der Übergang in breiten Kopfzeilen umfasst 48px statt 16px; Horizonte
und Bodenfarben von Küste, Labor, Datenstrom und Häfen laufen durch.
Der erste responsive Wettertest reproduzierte acht fehlerhafte Endframes bei
halben Pixelhöhen. Breiten werden deshalb auf 20px-Schritte eingerastet:
exakte n/32-Skalierung und ganzzahlige 3n-Pixelhöhe, höchstens 19px zusätzlicher
Rand, keinerlei Motivbeschnitt. Danach bestanden alle zwölf Wetterfälle bei drei
Breiten mit identischen echten Endframes. Vollständiger Kontaktbogen aller 25
Szenen visuell geprüft. Belege: `round1-weather-scaling-fixed.json` und
`contact-sheet-1800.png` unter `.local/pixel-banners-living`.

## Durchgang 2 — abgeschlossen

50 unterschiedliche handgezeichnete Nebenszenen ersetzen leere bzw. repetitive
Ränder innerhalb der jeweiligen 640×96-Komposition. Sie sind bereits in den
Vorschauen sichtbar und werden im Header nicht erneut außen kopiert.

Beispiele: Fährmann und Schrein, Lavaaltar und Fossilrippen, Eisangler und
Signalposten, Bienenhäuser und Solargarten, Korallenwrack und Thermalquelle,
Stegcafé und Gezeitentümpel, Sternbibliothek und Teetasse mit Katze. Auch die
Hauptaktionen sind größer und ausgearbeitet: Frachtaufzug, Gießarm, schlagender
Hammer, umblätterndes Buch, öffnende Schatztruhe und kochender Marktstand.
Kontaktbogen aller 25 vollständigen Kompositionen bei 0 und 1800ms gesichtet;
Renderer ohne Browserfehler. Eine fehlerhafte JSX-Schachtelung in der
Stahlwerk-Nebenszene wurde vor diesem Nachweis korrigiert.

## Durchgang 3 — abgeschlossen

Bewegte Objekte werden zwischen Pixelpositionen gezeichnet, während die
ruhende Kulisse und die periodischen Wetterfelder scharfe Pixel behalten.
Zug und Auto bewegen sich mit weichen Richtungswechseln; die Straßenbahn
fährt über einen größeren Bereich. Eigenständige Drehpunkte halten Flossen,
Flügel, Zeiger und Werkzeugarme an ihren Objekten. Der Nachtmarkt-Kanal wurde
bis x=146 erweitert: Der bewegte Bootsbug erreicht höchstens x=143.

Regen und Schnee werden nach allen Nebenszenen als Vordergrund gezeichnet.
Der Produktionsbuild einschließlich Client-Typprüfung bestand; Kontaktbogen
zu zwei Zeiten und breite Panoramen erneut gesichtet, keine Browserfehler.
Unabhängiger Quellreview der fünf Discovery-Welten ohne verbleibenden Befund.

## Durchgang 4 — abgeschlossen

Die unabhängige Sichtprüfung aller Kompositionen fand drei konkrete Restfehler:
eine zeitweise oben abgeschnittene Drachenspitze auf den Himmelsinseln, eine
rechteckige Farbgrenze im Wasser am Burgsteg und eine Angelschnur, deren Haken
aus dem Eisloch wanderte. Alle drei Stellen wurden korrigiert: Der Drachen
bleibt einschließlich Pendeln und Inselhub mindestens rund 5,52px innerhalb
des Bildes; Wasserfarbe und -höhe stimmen überein und ein abgestuftes Ufer
verbindet die Szenen; die bewegte Rute erhält eine getrennte Schnur mit festem
Endpunkt bei (94,88) im Eisloch. Die synchronisierte Bewegung bleibt auch bei
abgeschalteter Animation als stimmiges Standbild erhalten.

Unveränderte Banner werden bei der Auswahl dank Memoisierung nicht erneut
durch React aufgebaut. Finaler Produktionsbuild und aktualisierte Architektur-
und Sprachprüfung bestanden. Der endgültige Kontaktbogen und die breiten
Panoramen wurden von Root und unabhängigem Künstler geprüft, ohne verbleibende
klare Sichtbefunde. Der abschließende Browserlauf prüft
zusätzlich alle 50 bewegten Flächen, die vollständigen Vorschauen bei mehreren
Breiten, echte Wetter-Endframes, Auswahl/Speicherung und abgeschaltete Bewegung.

Die technische Abnahme nach dem vierten Kunstdurchgang fand noch eine minimale
Header-Rundung: 426,666px werden auf 426,65625px gelayoutet; `meet` machte daraus
63,9984375px Wetterperiode und 65 abweichende Schnee-Endpixel. Der Header passt
jetzt mit `slice` exakt auf 64px Höhe. Das unabhängige SVG-Repro bestätigt vier
bytegleiche Wetter-Endframes; vollständige Vorschauen bleiben bei `meet`.
Außerdem wurde die Testaufzeichnung entlastet: Die Messung aller 50 bewegten
Flächen behält ihre drei echten Bilder je Fläche, aber verzichtet auf redundante
vollständige DOM-Abbilder. Die Motion-Spec hat einen eigenen Review-Port und
bewahrt Action-/Quelltraces sowie alle 150 PNGs auf.

Der gezielte finale Nachlauf bestand vollständig: alle 50 bewegten Flächen
in rund 1,6 Minuten, responsive Galerie/Kopfzeile in 40,8s und alle 20
endlichen Wetterloops in 58,7s. Mit den vier bereits bestandenen Fällen sind
alle sieben Szenarien geprüft. Die Bildränder aller 25 Vorschauen wurden bei
390, 820 und 1440px geprüft; die Kopfzeile zusätzlich bei 3440px.
Der separate, unveränderte Desktop-Unit-Timeout bleibt im Review und STATUS
ausdrücklich dokumentiert; keine vollständige grüne Unit-Suite behauptet.
