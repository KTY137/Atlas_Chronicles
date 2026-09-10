# Kartenstudio Stufe 11 — Optik und das Haus hinter der Tür (2026-09-10, Runde 2)

Auftrag (Kaya): visuell an Inkarnate und Co. vorbei, mit Recherche; und der Fehler, dass
Hausinnenräume erst ab der zweiten Verschachtelungsebene gut aussehen. Spec:
`docs/superpowers/specs/2026-09-10-kartenstudio-optik-und-innenraum-design.md`.

## Der Fehler, im Bild gefunden

`.local/nested-probe/probe.ts` erzeugt ein Gebirgsdorf, betritt Haus, Kirche und Taverne über
den echten `/betreten`-Pfad und fotografiert jede Karte im Studio-Wirt (Edge, pixi-webgl), dann
einen Raum eine Ebene tiefer. Vorher: Ebene 1 auf 40×30 Zellen, vier Säle von 17×11, Möbel als
Punkte, Lücken statt Flur, Türen in der Leere, keine Außenwand, keine Haustür. Ebene 2 ein
Dungeon mit Gängen — „gut". Nachher: Haus 12×12 Zellen (aus dem Umriss auf der Stadtkarte),
Kirche 14×18, Taverne 14×12; Flur zwischen den Räumen, Außenwand rundum, Haustür unten mit
Eingangsmarke dahinter, Steinwände mit Schatten und Saum, Pergament drumherum.

Zweiter echter Fehler unterwegs, nur im Browser sichtbar: das Atlas-Betreten meldete „Bitte
Eingaben prüfen." — die HTTP-Schemas der Siedlungsoptionen kannten `relief` und `bewaldung`
aus Runde 1 nicht, die Oberfläche schickte sie aber mit. `e2e/nested-maps` hat es gefangen.

## Optik

Alle neun Standorte erneut als PNG durch `renderCartographyImage` (`.local/relief-probe/png/`)
und angesehen: Hügelkuppen auf dem Hügelland, Fichten im Bergwald, Radspuren auf Wegen,
Tuschekante am Straßennetz, Küstenstufen im Meer, Pergament um Innenräume. Verworfen nach
Ansicht in Runde 1 und hier nicht wiederholt: flache Schattierungsquadrate, Terrassenschatten.

## Nachweise

- forge `bauwerke.test.ts` 29/29 (neu: sechs Gebäudetypen mit Standardgröße, Flur, Haustür an
  der Unterkante, Eingangsmarke in der Zelle dahinter; Umriss-Skalierung mit Mindest- und
  Höchstmaß; gewählte Größe und freie Leinwand unverändert), `grundriss`, `verschachtelung`,
  `kette`, `interior-edit` (Version 8) grün.
- server `betreten.test.ts` 27/27 (neu: Innenraum nach Umriss, gewählte Größe gewinnt, Umriss
  bleibt intern), `siedlung-integration` 16/16 (Erwartung des Kindkeims folgt der Umrissgröße),
  `map-settings` 9/9 (Programmgebäude behalten ihre Raumliste), `map-workshop`, `map-standort`,
  `cartography-integration`, `cartography-raster`.
- szene `cartography-projection.test.ts` (neu: Pergament zuerst und Vignette zuletzt,
  nichts auf einem Bild, Wassertiefe nur unter Wasser, Hügel auf Anstieg und nicht auf Feldern,
  Fichten mit der Höhe, Straßenkante und Radspuren — **Korrektur 2026-09-10, Runde 4:** dieser
  Block war wegen eines abgebrochenen Shell-Befehls nie in der Datei gelandet; die Zahl 18 oben
  war falsch, die Fälle sind seit Runde 4 vorhanden und grün); render `renderer-lifecycle` 32/32 (neu:
  Kartusche nur mit Zeichnung und Titel, Steinwand aus drei Strichen, Tür zwei Pixel).
- client `map-generation` 30/30 (Gebäudegröße als Vorgabe), übrige Kartensuiten grün.
- Browser: `e2e/nested-maps` 1/1 (ERON-Ort → Siedlung → Raum, mobil), `e2e/map-studio` 3/3,
  `e2e/map-editor-cartography` 3/3.
- Gates: Typecheck, Build, `gate:sprache`, `gate:boundaries`, `gate:version`.

## Runde 3 — Licht, Schatten, Tusche, Flickenfelder

Im Studio-Wirt angesehen (`.local/nested-probe/town-zoom.png`, `level1-haus.png`): Ortsnamen
kursiv in Tusche mit Papiersaum, Kartusche, warme Lichtpools um Laternen und Fackeln (nach
dem ersten Blick von .05/.09/.14 auf .04/.07/.11 zurückgenommen), Möbelschatten, Flickenfelder,
Schornsteine, gefleckter Boden, heller Felsgrat. Nachweise: render `renderer-lifecycle` 35/35
(neu: Lichtpools additiv und mit der Szene gelöscht, Schatten nur unter Mobiliar auf gezeichneten
Karten, Tusche- gegen Nachtbeschriftung), szene `cartography-projection` 21/21 (neu: drei
Feldfarben, Schornstein mit Kappe, Fleckung vor Wald und Wasser und nur auf offenem Boden, Fels
blasser mit der Höhe), client `map-generation` 31/31 (Lichter erreichen die Szene, Szene bleibt
gültig). Gesamt 96 Dateien, 1302 Fälle; `e2e` 7/7 (vor den letzten beiden Detailkorrekturen:
Fleckung nur auf offenem Boden, Lichter bei Fixtures ohne `lights`).

## Runde 4 — Stimmung und Ebenenleiste

Angesehen als Rasterbilder (`.local/relief-probe/moods.ts`, Dorf am Fluss in allen vier
Stimmungen und mit Wasser und Gebäuden ausgeblendet): Nacht anfangs zu grau mit leuchtend
blauem Fluss (Multiplikator .5/.56/.76), dann auf .34/.4/.6 plus 18 % Tiefblau vertieft — jetzt
Nachtblau mit dunklem Fluss und dunklen Dächern; Winter zeigte reifes Gold auf Feldern unter
Schnee, korrigiert; Herbst war anfangs ganz ocker (Papier .3 → .15, Wiese .55 → .45). Nachweise:
szene `cartography` (Stimmung: nur nacht/winter/herbst, nie tag, gehasht, serialisiert) und
`cartography-projection` 26/26 (Nacht senkt jede Farbe und behält jedes Polygon, Winter/Herbst
Paletten, `hide` je Ebene und für die Stadtmauer), render `renderer-lifecycle` (nachts 5 Pools
mit 2,5-facher Stärke, Mondtusche, Mondtönung der Möbel) und `geometry` (Stimmung geprüft),
client `map-layers` 5/5 (Reihen, Umschalten, Sperren, Ansicht, Szene) und `map-generation`
(Stimmung erreicht die Szene, Vorschau überschreibt); gesamt in den sechs Suiten 170 Fälle,
dazu forge/server/client-Kartensuiten 80/80. Typecheck, Build, `gate:sprache`, `gate:boundaries`
grün. Browser: `map-studio` (neu: Stimmung speichern und nach Neuladen sehen, Wasser
ausblenden, Ebene sperren, Leiste schließen; die Schalter sind `role="switch"`, weil `getByRole("button", { name: "Gelände" })` sonst Werkzeug und Ebene traf), `map-editor-cartography`, `nested-maps`: 8/8 in 6,5 min, Bild `night-layers-studio.png` angesehen.

## Runde 4, Punkt 3 — Streupinsel und Naturpaket

Kontaktbogen `.local/relief-probe/kontaktbogen-natur.ts` (16 Motive auf Wiesengrund, 3×)
angesehen: Laubkronen anfangs gezackt und die Blattballen kaum sichtbar → gelappter Umriss
(jede zweite Ecke innen) und kräftigere Ballen. Im Studio (`scatter-studio.png`): ein Strich
Laubbäume am Südrand der Küstenstadt, in Größe und Drehung verschieden, mit gebackenem Schatten
auf der gemalten Wiese, im Maßstab der gemalten Kronen. Nachweise: client `map-scatter` 4/4
(gleichmäßig ohne Zufall, gebunden mit Zufall, gleicher Keim gleiches Ergebnis, Klick/stiller
Strich/Grenzfälle, Stempel geklemmt/benannt/im Budget), `gate:assets` GREEN mit 6 Paketen und
587 Assets, alle aus der Quelle reproduziert; server `packs`/`map-settings` 24/24;
`gate:sprache`, `gate:boundaries`, Typecheck. Browser `map-studio` „scatter brush": Strich auf
dem leeren Blatt → mehr als 8 Bäume in mindestens 4 Drehungen, Rückgängig nimmt alle,
Wiederholen bringt alle, dann derselbe Strich auf der Küstenstadt mit Bild. Erste Fassung des
Specs wollte nach dem Speichern rückgängig machen; nach dem Speichern ist die Historie leer,
also erst rückgängig, dann wiederholen, dann speichern.

## Offen, nicht behauptet
Gebogene Ortsbeschriftungen und freie Texte (Maskenentscheidung), Bildtexturen, Streupinsel
für Außenobjekte, Möbel an die Wand rücken (Möbel stehen frei im Raum). Desktop nicht neu gebaut.
