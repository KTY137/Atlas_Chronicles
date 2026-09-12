# Lebendige Pixelpanoramen — 2026-09-12

Owner-Folgeauftrag: Alle 25 Banner stärker und sichtbar animieren, die mehrfache
Wiederholung desselben Hauptmotivs in breiten Kopfzeilen entfernen und die Welten
weiter ausarbeiten. Grundlage ist der Banner-Commit 04578e1, auf dem aktuellen
Main als f8f52f6 übernommen.

## Ergebnis

Ein direkt gezeichnetes SVG ersetzt das gekachelte Hauptmotiv. Das zentrale
640×96-Bild erscheint genau einmal; links und rechts erweitern eigene,
deterministische Landschaften die Kopfzeile. Größere, einspaltige Vorschauen
zeigen jetzt das vollständige Panorama unverzerrt; die Kopfzeile bleibt bei
64px Höhe. Keine SVG-Pattern-Instanzen, die trotz
laufender Quellanimation einen alten Bildstand behalten können.

Jede Szene besitzt mehrere thematische Bewegungen. Beispiele: Segel und Fahnen
vor der Mondburg; Feen, Blätter und Wasserfall im Glühwald; Flügelschlag und
Feueratem beim Drachen; arbeitender Hammer und flüssiges Metall im Stahlwerk;
Zeiger und Pendel in der Uhrwerkstadt; Wal und Fischschwärme unter Wasser;
Fahrzeug und Straßenmarkierungen im Sonnenraster; Astronaut samt Halteleine im
Orbitalring; schwenkendes Teleskop und Armillarsphäre an der Sternwarte;
Glocke, Fahnen und Wasserfälle im Wolkenkloster; Laternen, Dampf, Papierboot
und kleine Feuerwerke auf dem Nachtmarkt.

Vier ausdrücklich verlangte weitere Kunstdurchgänge sind unter
`design/iterations/pixel-banners-four-passes-20260912.md` dokumentiert. Alle 25
Kompositionen enthalten zusätzlich je zwei unterschiedliche handgezeichnete
Nebengeschichten. Sie erscheinen bereits in der Vorschau und werden in der
Kopfzeile nicht ein zweites Mal kopiert. Durchgehende Horizonte und ein
48px-Übergang verbinden Hauptbild und Seitenlandschaft.

Die Bewegung bleibt in SVG/CSS ohne React-Frame-Timer. Feste Position und
bewegtes Teil sind getrennt, Drehungen haben lokale Gelenkpunkte, pendelnde
Objekte kehren stetig zurück und reisende Partikel setzen unsichtbar zurück.
Galerie und Kopfzeile folgen weiterhin denselben gespeicherten Einstellungen
für Animation, reduzierte Bewegung und sparsame Darstellung.

## Review

Alle 25 zentralen Szenen als Kontaktbogen zu zwei Zeitpunkten gesichtet.
Unabhängiger Quellreview fand globale statt lokaler Palmenkoordinaten in den
neuen Seitenlandschaften; die ersten Panoramen belegten außerdem zu regelmäßige
Seitenformen. Palmen sind nun vollständig lokal positioniert. Variierte Baum-,
Korallen-, Dach-, Fels- und Wolkenformen lösen die regelmäßigen Reihen auf.
Beide Schildkrötenflossen besitzen eigene Gelenkpunkte statt einer gemeinsamen
Drehung um den Körper. Die LangGraph-Verification wechselte hierfür in den
Repair-Knoten und anschließend zurück zur Prüfung.

Der Palmenfehler wurde am alten HTML im Browser reproduziert: Einzelgruppen
spannten sich über 4116 beziehungsweise 4117 Zeichenpixel. Die neue Regression
verlangt bei jeder einzelnen Seitendekoration weniger als 400 Pixel Breite.
Große Hintergrund- und Wetterfelder liegen außerhalb dieser Dekogruppen.
Die abschließenden Panoramen aller 25 Szenen wurden erneut visuell geprüft.

React-Review: stabile Motiv-IDs, wiederverwendete Szenenbäume, memoisiertes
Banner und Seitenpanorama, rein dekorative SVGs, unveränderte Auswahl und
Zugänglichkeit. Kein React-Neuaufbau unveränderter Galeriebanner bei der Auswahl.

Die vierte Sichtprüfung korrigierte zusätzlich Drachenspitze, Wasseranschluss
am Burgsteg und feste Angelschnur im Eisloch. Root und unabhängiger Künstler
haben den endgültigen Kontaktbogen und die breiten Panoramen ohne verbleibende
klare Sichtbefunde geprüft.

## Nachweise

Finaler Produktionsbuild einschließlich Client-Typprüfung bestanden; Root-Typen,
Version, Boundary, Sprache (4880 Schlüssel, keine Verstöße), Assets (611 Assets,
sieben Pakete) und 119 gezielte Unit-Prüfungen bestanden. Der Gesamt-Unitlauf
endete nach 1729,18s mit 3097 bestandenen, zehn fehlgeschlagenen und 63
übersprungenen Tests (272/8/11 Dateien). Alle zehn Fehler sind Zeitlimits;
ihre weitergehende Ursache ist damit nicht nachgewiesen. Im Nachlauf nur
dieser Fälle mit einem Worker und unveränderten Zeitlimits bestanden neun.
Der Desktop-Fall `squirrel-lifecycle.test.ts:43` zur Installation/Aktualisierung
einer Verknüpfung überschritt sein 5000ms-Limit erneut, auch einzeln nach
5147ms. Dieser Test lädt zweimal die unveränderten Desktop-/Servermodule;
der umfangreiche Import ist ein plausibler, nicht profilierter Zeitfaktor.
Installeraktionen sind gemockt. Keine Desktop-Änderung oder Timeout-Erhöhung
für diesen Bannerauftrag; die vollständige Unit-Suite ist ausdrücklich
nicht grün. Logs: `unit-full.log`, `unit-failed-only.log`,
`unit-desktop-isolated.log` unter dem lokalen Belegverzeichnis.
Im finalen Browserlauf bestanden zunächst Auswahl/Struktur/Speicherung aller
25 Motive, tatsächlicher Stillstand bei abgeschalteter und reduzierter Bewegung
sowie Tastatur und Synchronisierung zwischen zwei Fenstern. Die Pixelmessung
erreichte nach 38 von 50 vollständig bestandenen Flächen ihr 180s-Limit.
Der Trace belegt 924 komplette DOM-Snapshots mit 41,2s Erfassungszeit sowie
234 Locator-Warteaufrufe mit 21,8s; die 116 Bildaufnahmen selbst benötigten
60,5s. Der gezielte Nachlauf verzichtet nur in dieser Messung auf zusätzliche
DOM-Snapshots und bewahrt die 150 expliziten PNGs neben dem JSON-Bericht auf.
Keine reduzierte Szenenzahl, gelockerten Erwartungen oder höheren Zeitlimits.
Der vollständige Siebenerlauf endete mit vier bestandenen Fällen (Auswahl,
Bewegungsvorgaben, Tastatur/Synchronisierung, Englisch) und drei Befunden:
das Zeitlimit der Pixelmessung, die Stabilitätswartezeit beim sehr großen
animierten Galeriebild und ein echter Schnee-Endframe-Unterschied im Header.
Beim Schnee änderten sich 65 Pixel im zentralen Headerbereich, meist um einen
Kanalwert; alle Effekte waren fertig pausiert und nur die geprüfte Ebene
bewegte sich. Die nominell 426,666px breite SVG-Fläche wird auf 426,65625px
gelayoutet. `meet` skaliert deshalb auch die Höhe knapp unter die beabsichtigten
64px. Ein unabhängiges SVG-Repro bestätigt die CTM-Skalierung 0,666650390625
und eine Wetterperiode von 63,9984375px. Der Header verwendet deshalb jetzt
`slice`: exakt 2/3 und 64px Periode, im Repro vier bytegleiche Endframes bei
sichtbar unterschiedlichen Zwischenframes. Vorschauen behalten `meet` für das
vollständige Motiv. Beleg: `header-snow-seam-diagnosis.json`,
`check-header-seam.mjs`. Produktionsbuild nach dieser Korrektur bestanden.
Der gezielte Nachlauf der drei fehlgeschlagenen Fälle verwendet die entlastete
Messaufzeichnung; vollständige Szenenzahl und strenge Vergleiche bleiben
erhalten. Die 50-Flächen-Messung bestand im Nachlauf in rund 1,6 Minuten:
25/25 Vorschauen mit 893–13539 veränderten RGB-Pixeln bei einer Schwelle von 57;
25/25 Header mit 404–5371 bei einer Schwelle von 19. Die Sterne sind eingefroren,
der maskierte Übergangsrand zählt nicht mit. Alle 150 tatsächlichen PNGs liegen
unter `rendered-motion-frames/`; `rendered-motion.json` und
`rendered-motion-summary.json` enthalten die vollständigen Werte.
Auch die beiden restlichen Fälle bestanden: responsive Galerie/Kopfzeile in
40,8s und alle 20 strengen Wetterloops in 58,7s. Der gezielte Dreier-Nachlauf
endete mit Exitcode 0 nach rund 3,5 Minuten. Zusammen mit den vier zuvor
bestandenen Fällen sind alle sieben Szenarien geprüft. Es wurde nur die
fehlgeschlagene Prüfung nach den jeweiligen Änderungen wiederholt.

| Szenario | Ergebnis |
| --- | --- |
| 25 Motive auswählen, speichern, ohne Motivkachelung | Bestanden |
| Echte Bewegung in 25 Vorschauen und 25 Headern, Sterne eingefroren | Bestanden; 150 PNGs |
| Abgeschaltete/reduzierte Bewegung, Kontrast und sparsame Darstellung | Bestanden; tatsächliche Standbilder |
| Tastatur, Zweifenster-Synchronisierung, kein Banner, Zurücksetzen | Bestanden |
| 25 vollständige Vorschauen bei 390/820/1440px, Header bis 3440px | Bestanden |
| Regen/Schnee: 20 endliche Layerloops, Mitte verschieden und Ende pixelgleich | Bestanden |
| Englische Galerie einschließlich der fünf neuen Motive | Bestanden |

Die Messung liegt in `e2e/pixel-banner-motion.spec.ts` mit eigenem Port 9744;
die sechs übrigen Fälle bleiben in `e2e/pixel-banners.spec.ts` auf Port 9743.
So kollidieren die isolierten Review-Apps auch in einem parallelen Gesamtlauf
nicht miteinander. Der kurzzeitig versuchte Trace-Override in `describe` wurde
von Playwright vor einem Browserstart abgewiesen und durch die separate Spec
ersetzt. Die endgültige Messung behält Source-/Action-Traces und verzichtet
nur auf die redundanten DOM-Snapshots.
Die neue Browserregression misst echte RGB-Pixeländerungen für alle 25 Szenen
in Vorschau und Kopfzeile bei 0, 800 und 2000ms. Sterne sind dabei eingefroren;
das zusätzliche Seitenpanorama zählt nicht als Nachweis für bewegte Hauptmotive.
Außerdem werden tatsächliche Standbilder bei abgeschalteter Animation und
Systemvorgabe sowie endliche Regen-/Schneeschleifen geprüft.

Der erste Browserlauf überschritt das 120s-Limit während der Auswahlprüfung;
bis dahin waren zwölf Szenen ohne Produktassertionsfehler geprüft. Der Trace
enthielt über 3200 fortlaufende Screencast-Bilder (45,9MB). Der Schlusslauf
verwendet DOM-/Quelltraces ohne kontinuierlichen Screencast, bündelt äquivalente
DOM-Abfragen und pausiert die Galerie nach dem Nachweis laufender Animationen
während reiner Auswahlprüfungen. Die gesonderte echte Pixelprüfung bleibt
vollständig; bestehende Zeitlimits und Erwartungen wurden nicht gelockert.

Lokale Belege: `.local/pixel-banners-living/`; Koordination: vorhandener
LangGraph-StateGraph mit eigenem SQLite-Checkpoint, LangGraph 1.2.11,
bestehender Pin `>=1.2,<2`, Tracing aus.
