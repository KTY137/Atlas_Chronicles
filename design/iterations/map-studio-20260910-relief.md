# Kartenstudio Stufe 10 — Relief, Landschaft, Höhenwerkzeug (2026-09-10)

Auftrag (Kaya): „mach die Kartengenerierung/editing noch besser, wir sind auf lvl1, lass uns auf
lvl10 gehen." Entschieden ohne Rückfrage (Kayas Vorgabe vom 2026-09-08). Spec:
`docs/superpowers/specs/2026-09-10-kartenstudio-relief-design.md`. Branch
`feature/kartenstudio-relief`.

## Was gebaut wurde

**Datenmodell (unumkehrbar, deshalb zuerst und ganz).** `TacticalCartographyV1.relief` als
optionales, geschlossenes Profil: Abtastpunkte auf den Ecken der Konstruktionszellen, ganze
Stufen 0..255, `seaLevel`. Dokumente ohne Relief bleiben byte- und hashgleich; ein Relief ändert
den Hash. Grenzen 1025 je Achse, 65 536 Punkte. Neue Materialien `swamp`, `snow`. Flächenlimit
2048 → 4096 in Kartografie, Kartendokument, Raster und Bearbeitungspfad, weil eine Großstadt im
Moor sonst nicht mehr in eine Karte passt (gemessen: 88×64 Moor allein 1 315 Landschaftsflächen).
Gemeinsame Schwellen in `RELIEF_LEVELS` (Fels +118, Schnee +160, Linienabstand 12, Flachland +40).

**Generator (`forge/src/relief.ts`, Siedlung v7).** Höhenfeld aus gehashtem fBm-Rauschen, je
Standort geformt; daraus abgeleitet statt gezeichnet: stehendes Wasser (See, Meer, Moortümpel),
Fels, Strand, Sumpf, Wald (Feuchte = Rauschen + Nähe zu Wasser, im Ortskern gedämpft) und
Flüsse (Senken gefüllt, steilster Abstieg, Abfluss, bis zu vier Läufe, an der Quelle verjüngt,
zweimal geglättet). Alle Flächen sind konvexe Zellstücke (Marching Squares, Sattel → zwei
Dreiecke), volle Zellen zu Rechtecken verschmolzen. Der garantierte Fluss von `fluss` ist ein
eingegrabenes Tal, in das die Hydrologie ihre Nebenflüsse leitet. Straßen queren **jeden** Fluss
mit einer Brücke und enden an See, Meer und Fels; Häuser stehen nie im Wasser oder auf Fels.
Neue Standorte `huegel`, `moor`; Optionen `relief`, `bewaldung` (0..1) im Keimvektor.

**Bearbeitung (`cartography-edit.ts`).** Operation `relief` mit Anheben/Absenken/Glätten/
Einebnen, Radius, Stärke; ein Strich zählt je Punkt sein stärkstes Gewicht, nicht die Summe
seiner Zeigerereignisse. Karten ohne Relief bekommen ein flaches. Wasser malen senkt die Ecken der
Zelle unter den Meeresspiegel, Fels malen hebt sie über die Felsschwelle.

**Gemalte Projektion (`cartography-8`).** Beleuchtete Höhenlinien nach Tanaka: jede Linie trägt
auf der lichtabgewandten Seite einen dunklen, auf der zugewandten einen hellen Saum, breiter je
nach Ausrichtung — nichts stapelt sich über Flächen. Dazu die dünne Tuschelinie, jede fünfte
fester. Fels wird als letztes Gelände gemalt und das Relief davor, damit ein Massiv seine
gezeichneten Gipfel trägt statt Linien. Gipfel sitzen auf **einem globalen Gitter**, wachsen
mit der Höhe darunter, Schnee ab der Schneegrenze; Baumkronen ebenso auf einem globalen Gitter.
Sumpf mit Tümpeln und Schilf, Schnee mit blauen Wehen. Ansichtsoptionen `contours`, `shading`.

**Editor.** Werkzeug „Höhe" (E) mit vier Karten in Klartext, Radius, Stärke; Materialkarten
Sumpf und Schnee; Bühnenschalter „Höhenlinien" und „Schattierung", sobald die Karte ein Relief
trägt. Generator: Standortkarten Hügelland und Moor, Regler Relief und Bewaldung mit Wortstufen.
Sprachpaket um 31 Sätze ergänzt.

## Was die Bilder zeigten, das kein Test sah

Alle neun Standorte wurden als PNG durch die echte Rasterpipeline gezogen und angesehen
(`renderCartographyImage`, `.local/relief-probe/png/`). Drei Befunde, alle behoben:

1. **Mosaik.** Flach beleuchtete Quadrate je Zelle lasen sich als Fliesenspiegel. Erst durch
   Terrassen ersetzt — die stapelten ihre Schatten über jede höhere Fläche und verdunkelten die
   ganze Karte, weil die Terrasse selbst fast durchsichtig war. Dann Tanaka-Linien: kein Stapeln.
2. **Gitter je Polygon.** Wald und Fels kommen jetzt als viele Zellstücke; ein Kronen- oder
   Gipfelgitter je Stück druckte die Tessellierung als dunkle Blöcke mit Zwergbäumen und als
   Felder aus Zwerggipfeln. Beide sitzen jetzt auf einem globalen Gitter (dieselbe Regel wie bei
   Kräuseln und Halmen).
3. **Quellen und Kreise.** Flüsse begannen in voller Breite mitten im Land; der See war eine
   Ellipse. Verjüngung an der Quelle, zwei Glättungsrunden, doppelter Uferwarp.

## Nachweise

- szene: `cartography.test.ts` 50/50 (Relief-Parser, Hash, Bilinear, flaches Relief),
  `cartography-projection.test.ts` 14/14 (Schattierung nur mit Relief, hell/dunkel je Flanke,
  nichts unter Wasser, Ansichtsoptionen, Gipfel folgen der Höhe, Schnee erst ab Schneegrenze,
  Sumpf/Schnee), übrige szene-Suiten grün.
- forge: `siedlung-standort.test.ts` 19/19 neu geschrieben (neun Standorte, Relief auf jeder
  Karte, Brücke an jeder Flussquerung, Häuser nie im Wasser/Fels, Regler ändern den Keim und
  weisen 0..1 ab), `siedlung-cartography.test.ts` 6/6 auf v7, `cartography-edit.test.ts` 25/25
  (vier neue Fälle für das Höhenwerkzeug und die Kopplung), Keim/Settings/Muster/UVTT/Bauwerke/
  Stiltausch/Zeitwelten/Genre/Grundriss/Verschachtelung grün (331 Fälle in 14 Dateien).
- server: `map-standort` 10/10 (neun Standorte über HTTP und Persistenz), `siedlung-integration`
  16/16, `map-workshop` 11/11, `map-settings` 9/9 — darunter das native Archiv mit Relief.
- client: `map-relief-tool` 3/3 neu, `map-location` 11/11 (neun Karten, Regler),
  `map-generation` 29/29, `map-edit-history`, `tactical-entities-review` 19/19.
- render + io: 124 Fälle grün (Renderer-Lebenszyklus, native Rundläufe V16–V19).
- Browser: `e2e/map-studio` (drei Fälle, darunter neu: Höhenwerkzeug auf einer Karte ohne Relief,
  Speichern, Neuladen, Schalter) und `e2e/map-editor-cartography` 3/3.
- Gates: Typecheck, `gate:sprache` (3060 Schlüssel, 0 Verstöße), `gate:boundaries` (642 Dateien).
- Laufzeit: Dorf 36×28 je Standort 94–192 ms zeichnen, 0,55–0,86 s rastern; Stadt 56×44
  erzeugen 330–430 ms; Landschaft allein 10–33 ms.

## Offen, ausdrücklich nicht behauptet

Beschriftungen als freier Text (Maskenentscheidung), Streupinsel für Außenobjekte (keine
Baum-Assets), Erosion, Nachbarkarten. Desktop-Paket und Installation nicht neu gebaut. Der
Produktionsbuild (`npm run build`) und `gate:version` stehen im STATUS.
