# 25 ausgearbeitete Pixel-Banner — 2026-09-12

Alle 20 vorhandenen Motive wurden neu gezeichnet. Die fünf zusätzlichen Welten
heißen Sternwarte, Versunkener Tempel, Pilzdorf, Wolkenkloster und Nachtmarkt.
Jede Szene hat eine eigene Komposition mit mehreren Tiefenebenen, Materialtextur,
Lichtakzenten und kleinen Bewohnern oder versteckten Gegenständen.

Beispiele: Katze unter dem Regenschirm am Imbiss, Ritter vor dem Drachen,
fliegender Wal zwischen Himmelsinseln, Roboter mit Ente im Stahlwerk,
Pinguin neben der Eiswacht, Alien im Biolabor, Astronaut am Orbitalring,
Zauberer mit Sternkarte und Katze an der Sternwarte, Schildkröte und Oktopus
am versunkenen Tempel, Schneckenhaus und lesende Fee im Pilzdorf,
roter Panda am Wolkenkloster, Fuchsmaske und Papierboot auf dem Nachtmarkt.

## Darstellung und Bewegung

SVG-Panoramen mit 640×96 Zeichenpixeln. Die Galerie zeigt einen zentralen
Ausschnitt bei 1:1-Pixelgröße in 96px hohen Kacheln; breitere Kacheln zeigen
mehr Landschaft. Die Kopfzeile kachelt das vollständige
Panorama auf 64px Höhe. Alle 25 Motive bleiben gleichzeitig animiert.
Die SVG-Bäume sind auf Modulebene wiederverwendet, ohne React-Frame-Timer.

Regen und Schnee besitzen je zwei unterschiedlich schnelle Ebenen aus identischen
96px-Feldern mit Überstand über beide Bildränder. Der letzte Animationsframe
entspricht geometrisch dem ersten. Wasser, Schweben und Licht kehren stetig
zurück; Rauch, Blasen, Funken, Daten und Kometen wechseln ihre Ausgangsposition
bei vollständiger Transparenz. Der Zug vibriert leicht und pendelt nicht mehr
rückwärts über die Strecke. Individuell versetzte Lichter vermeiden Gleichschritt.

Bestehende Banner-IDs, V3-Speicherung, Sprachen, Tastaturwahl, Fenstersynchronisierung,
Standbildschalter und Zugänglichkeitsvorgaben bleiben erhalten. Keine neuen
Abhängigkeiten oder externen Medien; alle Zeichnungen werden lokal mitgeliefert.

## Prüfung

Finaler Produktionsbuild, Root- und Client-Typecheck sowie 119 Theme-/Präferenz-/
Sprachprüfungen bestanden. Alle sechs Browserfälle bestanden im abschließenden
Lauf (4,9 Minuten): alle 25 Motive/Vorschauen, Auswahl und Speicherung, Bewegung
und Zugänglichkeit, Tastatur/Fenstersynchronisierung/Reset, Fensterbreiten von
390 bis 3440px und Englisch.
Der nachfolgende Einzeltest für die vollständige Galerieaufnahme mit höherem
Screenshot-Fenster bestand ebenfalls (1/1, nativer Exitcode 0); Szene und
Funktionsprüfungen blieben unverändert.

Die endliche Regen-/Schneeprüfung bestätigt bei jeweils beiden Ebenen in Vorschau
und Kopfzeile sichtbare Bewegung zur Halbzeit und bytegleiche PNGs zwischen
erstem und echtem letztem Frame. Der Test lässt keine Endlosschleife automatisch
auf ihren Start zurückspringen. Er entdeckte die Rundungsabweichung der vorherigen
fractionalen Vorschauvergrößerung; die native Pixelgröße beseitigt sie.

Ein erster Browserlauf hatte zusätzlich einen Klick-Timeout unter hoher Last;
derselbe Fenstersynchronisierungstest bestand anschließend mit unverändertem
Zeitlimit sowohl einzeln als auch im vollständigen Schlusslauf.

Version-, Boundary-, Sprach- und Asset-Gates bestanden im Gesamtlauf. Die
Banner-Sprachprüfung erfasst 59 Schlüssel ohne Verstöße.

Alle 25 Motive als Kontaktbogen und die echte Kopfzeile visuell geprüft; nach
einem unabhängigen Quellreview sind Gießtropfen, Raketenfeuer und Monitorzeichen
korrigiert und erneut geprüft. Der native agent-browser-Transport scheiterte beim
Appzugriff mit OS10060; die Browserprüfung erfolgte erfolgreich mit Playwright/Edge.
Ein zusätzlicher separater Vorschau-Server lieferte einen Navigations-Timeout und
wurde geschlossen; die Nachweise stammen aus der erfolgreichen isolierten HTTP-App.

Belege unter `.local/pixel-banners-polish`: `contact-sheet.png`, `gallery-final.png`,
`header-final.png`, `loop-*-{start,half,end}.png`, Timing-JSONs, `unit.log`,
`build-final.log`, `e2e-final.log` und die getrennten früheren Fehlerläufe.

Die vollständige Projektsuite wurde gestartet und während des Unit-Teils nach
einem fremden Fehler in `packages/server/test/progression.test.ts` und mehreren
Zeitüberschreitungen bei Native-Restore-Prüfungen unter hoher paralleler Last
angehalten. Kein Anspruch auf eine bestandene vollständige Suite. Fremde
Figuren-/Releaseänderungen werden nicht in diese Bannerarbeit übernommen.

Entscheidungen: `design/iterations/pixel-banners-polish-20260912.md`.
Koordination: vorhandener LangGraph-StateGraph, eigener SQLite-Checkpoint unter
`.local/pixel-banners-polish`. Tracing bleibt ausgeschaltet.
