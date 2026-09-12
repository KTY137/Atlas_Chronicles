# Pixel-Banner: 25 ausgearbeitete Welten — 2026-09-12

Owner-Auftrag: alle 20 Motive schöner und detaillierter ausarbeiten, fehlerhafte
Animationsübergänge (besonders Regen) reparieren und fünf neue Motive ergänzen.

Entscheidung: die vorhandene lokale SVG/CSS-Grenze bleibt bestehen. Auf 640×96
Zeichenpixeln erhalten alle Szenen neue individuelle Kompositionen, mehrere
Tiefenebenen, Licht und Materialtexturen sowie versteckte kleine Geschichten.
Die Auswahl zeigt einen zentrierten Ausschnitt in nativer Pixelgröße mit 96px
Höhe; breitere Kacheln zeigen mehr Umgebung. Das vollständige Panorama wird in
der 64px hohen Kopfzeile skaliert gekachelt. Die Kacheln werden höher, damit die
zusätzlichen Details auch erkennbar sind. Bestehende IDs und Einstellungen bleiben
gültig; fünf weitere IDs erweitern den geschlossenen Katalog.

Abgewogen: Raster-Spritesheets bieten große künstlerische Freiheit, benötigen
aber zusätzliche Assetdateien und ein zweites Standbildverfahren. Kleine Zusätze
auf den alten Skizzen erfüllen den ausdrücklich umfassenden Auftrag nicht.
Vollständige SVG-Neuzeichnungen behalten Offlinebetrieb und Bewegungsvorrang,
erlauben dafür weniger weiche Lichtverläufe; abgestufte Pixel und Dithering lösen
das innerhalb des gewünschten Stils.

Regen und Schnee wiederholen identische vertikale 96px-Felder mit Überstand.
Verschiedene Ebenen besitzen unterschiedliche Geschwindigkeiten. Jede andere
Animation kehrt entweder stetig zurück, wiederholt geometrisch identischen
Inhalt oder blendet vor dem Positionswechsel vollständig aus. Statische
Positionierung liegt außerhalb der animierten Gruppe. Kein React-Frame-Timer,
keine externen Abrufe, keine festen SVG-IDs zwischen Instanzen.

Neue Welten: Sternwarte, Versunkener Tempel, Pilzdorf, Wolkenkloster, Nachtmarkt.
Prüfung: Katalog und Speicherung, alle 25 Motive im Browser, beide Sprachen,
Pause/Bewegungsvorgaben, Regen-Naht mit deterministisch gesetzter Animationszeit,
Galerie und Kopfzeile bei mehreren Fensterbreiten, Typecheck/Build und Gates.

Koordination: vorhandener LangGraph-StateGraph in tools/review/workflow.py,
isolierter SQLite-Checkpoint .local/pixel-banners-polish/workflow.sqlite.
LangGraph 1.2.11 geprüft; vorhandener Pin >=1.2,<2; Tracing ausgeschaltet.

Die endliche Browser-Loopprüfung fand trotz geometrisch periodischen Regens noch
177 abweichende Pixel bei einer 308px breiten Vorschau. Ein isoliertes SVG mit
`preserveAspectRatio="slice"` reproduzierte die Ursache: nicht ganzzahlige
Vergrößerung verändert die Rundung von `crispEdges` an den Feldgrenzen. Deshalb
nutzt die Vorschau jetzt ein zentriertes Muster bei 1:1-Pixelgröße. Die Kopfzeile
behält ihre ganzzahlige 64px-Periode. Die exakte Framegleichheit bleibt Testziel.

Der zusätzliche Review korrigierte drei Kontextanimationen: Wasser fällt aus
der Gießkanne abwärts, Raketenfeuer bleibt an der Düse verankert, Monitorzeichen
pulsieren innerhalb ihres kleinen Bildschirms.
