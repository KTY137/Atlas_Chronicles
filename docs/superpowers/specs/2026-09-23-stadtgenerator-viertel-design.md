# Stadtgenerator mit Vierteln (Kartenstudio, Teil 1 von 3) — Design

Stand 2026-09-23, Sitzung `project-atlas-22`, Zweig `feature/stadt-viertel`.
Auftrag Kaya: „Map generation besser machen — Städte brauchen mehr Arbeit, Sci-Fi sieht zu
mittelalterlich aus, große Karten wie Andaria selbst bauen können; schauen, wie andere es
machen und ob es gute MIT-Freeware zum Integrieren gibt." Aufteilung und Reihenfolge von Kaya
bestätigt: **1 Stadt mit Vierteln (Fantasy) → 2 eigene Sci-Fi-/Moderne-Stadt → 3 Weltkarten-Baukasten.**
Entscheidungen in diesem Dokument hat Claude getroffen (Kartenstudio-Regel: allgemeinere Variante
wählen, begründen, nicht nachfragen); jede ist mit „E" nummeriert und einzeln kippbar.

## 1. Ausgangslage (gemessen, nicht vermutet)

Probe `.local/stadt-probe/render.ts` (Hauptcheckout), Bilder `png/vorher-*.png`, Stadt 56×44,
224 Gebäude, Zellgröße für die Probe halbiert (Rasterlimit 16 MP).

- **Straßen** sind die geteilten Kanten eines einzigen Voronoi-Musters (ein Viertel = eine Zelle =
  ein Block), Hauptstraßen der Breitensuchbaum vom Zentrum. Ergebnis: große, halb leere Blöcke,
  einzelne Kästen darin, kein Gassengewirr.
- **Viertel** haben keine Rolle. Der Gebäudetyp folgt dem Größenrang der Parzelle (größte = Kirche,
  zweitgrößte = Taverne …), nicht dem Ort in der Stadt.
- **Mauer**: versetzte Linie ohne Türme, Tore sind bloße Lücken; im Bild praktisch unsichtbar.
- **Markt**: ein kleines Rechteck, im Bild kaum zu finden.
- **Felder**: zwei fest eingetragene Gruppen an Kartenpositionen (`siedlung.ts:883-886`).
- **Sci-Fi/Gegenwart** laufen durch dieselbe Pipeline; jede zweite Punktreihe ist versetzt, das
  erzeugt ein Zickzack-Raster. (Gehört zu Teil 2, hier nur festgehalten.)
- Es gibt schon einen **Zonenplan** (`SettlementPlan`, Nutzungen wohnen/markt/handwerk/hafen/adel/
  arm/frei, `MapZonePlanner.tsx`) und einen **Straßenplan** (`RoadPlan`, `MapRoadPlanner.tsx`). Beide
  wirken heute nur als Filter über dem fertigen Layout.

## 2. Wie andere es machen, und was wir übernehmen dürfen

Lizenzen an den echten LICENSE-Dateien geprüft (Recherche 2026-09-23):

| Quelle | Lizenz | Nutzung hier |
|---|---|---|
| Watabou, Medieval Fantasy City Generator (TownGeneratorOS) | GPL-3.0; neuer Generator geschlossen | **nur Ideen**: Spiral-Flecken, Viertelrollen, Mauer aus Außenkanten mit Türmen, Tore an Hauptstraßen, Parzellen durch fortgesetztes Halbieren |
| Azgaar Fantasy Map Generator | MIT + ausdrückliche kommerzielle Erlaubnis | Teil 3 (Höhenvorlagen, Flüsse, Reiche) |
| Red Blob mapgen4 / mapgen2 | Apache-2.0 | Teil 3 (Zellnetz, Flüsse) |
| mewo2/terrain (O'Leary) | MIT | Teil 3 (Küsten, Beschriftung) |
| t-mw/citygen | MIT | Teil 2 (wachsende Straßennetze) |
| ProbableTrain MapGenerator | LGPL-3.0 | Teil 2, **nur das Verfahren** (Chen et al. 2008, Richtungsfelder) |
| delaunator, polylabel, earcut | ISC | bei Bedarf Teil 2/3 |
| simplex-noise, polygon-clipping | MIT | bei Bedarf Teil 2/3 |
| Kenney Space Station Kit u. a. | CC0 | Teil 2 (Grafiken) |
| straight-skeleton v2, phiresky/procedural-cities, Geomorph Shipyard | GPL/AGPL (CGAL in v2) | meiden |

**E1 — Teil 1 bringt keine neue Abhängigkeit.** `forge/src/polygon.ts` hat Voronoi, Lloyd,
Delaunay, Einwärtsversatz, Halbebenenschnitt und Außenkanten; mehr braucht die Stadt nicht. Eine
fremde Bibliothek für drei Zeilen Mathematik wäre Lizenz- und Wartungslast ohne Gewinn. Code von
Watabou wird **nicht** gelesen oder übernommen (GPL); übernommen wird das veröffentlichte Verfahren.

## 3. Ziel und Abgrenzung

**Ziel:** Eine Fantasy-Stadt liest auf den ersten Blick als Stadt mit Geschichte: dichte
Häuserzeilen an Gassen, ein großer Marktplatz mit Rathaus, ein Tempel- oder Dombezirk, eine Burg
am Rand, eine Mauer mit Türmen und Torbauten, Vorstädte an den Ausfallstraßen, Hafen und Mühlen am
Wasser, Felder in Streifen und Bauernhöfe draußen. Viertel tragen Namen auf der Karte. Dorf und
Weiler bekommen dieselbe Sorgfalt (Dorfplatz mit Kirche, Höfe mit Nebengebäuden).

**Nicht in Teil 1:** Sci-Fi und Gegenwart (bleiben byte-gleich auf ihren heutigen Versionen 8/9/10,
Teil 2 ersetzt sie); Weltkarte (Teil 3); Straßennamen; Bewohner; das Regionssymbol der Orte.

## 4. Entscheidungen

- **E2 — Neue Generatorversion nur für Fantasy.** `setting === "fantasy"` erzeugt Version `"11"`;
  Gegenwart/Sci-Fi behalten `8/9/10` samt aller Ids. Gespeicherte Karten sind Dokumente und ändern
  sich nicht; nur Neuerzeugungen mit gleichem Keim ergeben eine andere Stadt (bekannte Falle:
  Galerie-Keime würfeln neu, Heuristik-Tests prüfen statt blind nachziehen). Mit Zonen- oder
  Straßenplan bleibt Fantasy ebenfalls `"11"`; die Pläne stehen ohnehin im Keim.
- **E3 — `siedlung.ts` wird geteilt, nicht verdoppelt.** Gemeinsam bleiben Prüfung der Optionen,
  Keim, Landschaft/Fluss, Brücken, Stege, Stempel/Lichter, Dokument- und Knotenbau. Das Layout
  (Viertel, Straßen, Parzellen, Mauer, Felder) wird ein austauschbarer Baustein:
  `stadt/raster-v8.ts` (heutiger Code, unverändert verschoben, für Gegenwart/Sci-Fi) und
  `stadt/viertel/*.ts` (neu, Fantasy). Teil 2 steckt dort einen dritten Baustein ein. Ein zweiter
  Siedlungsgenerator daneben wäre der parallele Stack, den `kartenwerk.ts` verbietet.
- **E4 — Viertelrollen = die Nutzungen des Zonenplans, erweitert um `burg` und `tempel`.** Keine
  zweite Liste. `SETTLEMENT_USES` wird additiv `[…, "burg", "tempel"]`; alte Pläne bleiben gültig,
  der Zonenplaner bietet die zwei neuen Nutzungen an. Wo ein Zonenplan liegt, **gewinnt er** über die
  automatische Zuweisung (nicht mehr nur Filter): die Rolle eines Flecks ist die Nutzung der Zone,
  die seinen Schwerpunkt enthält (letzte gewinnt, `frei` hat Vorrang wie heute). Die Dichtewürfe
  je Dach (`zoneDraw`) bleiben.
- **E5 — Neue Gebäudetypen, additiv:** `burg`, `rathaus`, `muehle`, `bauernhof`, `kaserne`
  (`BAUWERK_TYPEN`, `BAUWERK_LABEL`, `BAUWERK_SETTINGS.fantasy`, je ein Bauprogramm in
  `bauprogramme.ts`). Präzedenz: `07e9245` hat Typen ebenso ergänzt. Der Typ folgt der Rolle des
  Viertels und der Lage, nicht mehr dem Größenrang.
- **E6 — Türme sind Gebäude.** Mauertürme und Torflanken sind `bauwerk`-Knoten vom Typ `turm` mit
  rundem Umriss (12-Eck) und damit betretbar. Sie brauchen eine Adresse: eine **Wallgasse** läuft
  innen an der Mauer entlang (wie in gewachsenen Städten) und ist ihre Straße. Die Invariante
  „jedes Gebäude liegt an einer Straße" bleibt ohne Ausnahme.
- **E7 — Neue Optionen** `mauer` und `burg` (Wahrheitswerte; Vorgabe Stadt ja/ja, Dorf nein/nein,
  Weiler nein/nein). Drei Stellen: `validateKartenOptionen` (Domain), TypeBox-Schema in
  `server/src/http/grundriss.ts`, Client-Optionen. Beide gehen in den Keim.
- **E8 — Mehr Gebäude möglich.** `bauwerkeMax` 256 → 512, Stadt-Vorgabe 224 → 320, Vorlage
  „Großstadt" 256 → 480. Budget nachgerechnet (Abschnitt 8) und als Test festgehalten.
- **E9 — Viertelnamen als Beschriftung** (`cartography.labels`, Ebene „Namen", ohnehin schaltbar).
  Keine Straßennamen in Teil 1.
- **E10 — „Viertel aus der Karte übernehmen"** im Zonenplaner: der Bericht enthält die erzeugten
  Viertel; ein Knopf macht daraus einen Zonenplan (gleiche Rollen zusammengefasst, höchstens 16
  Zonen à 32 Ecken, vereinfacht). Die Spielleitung verschiebt dann nur noch, statt von null zu malen.
- **E11 — Optik** bekommt `cartography-12`: runde Turmdächer, Torbauten, Pflaster und Marktstände
  auf großen Plätzen (globales Gitter), Kreuzgrundriss für Dom/Tempel, Streifenfurchen in Feldern.
  Kein Farbwechsel.

## 5. Pipeline Fantasy v11

Einheiten sind Zellen, wie heute. Alle Zufallszüge aus dem Layout-Keim; Reihenfolgen stabil über
Geometrie, nie über Indizes (I8).

1. **Landschaft, Fluss** — unverändert (`erzeugeLandschaft`, Bezierfluss bei `fluss`).
2. **Flecken** (`stadt/viertel/flecken.ts`). Punkte auf einer Spirale um die Mitte: Winkel wächst
   mit √i, Radius mit i (kleine Flecken innen, große außen). Anzahl innen ≈ Gebäudeziel/10 (Stadt)
   bzw. /8 (Dorf), dazu ein Außenring bis zum Kartenrand für die Flur. Voronoi im Kartenrahmen,
   zwei Lloyd-Runden nur für die inneren Flecken. Flecken, deren Schwerpunkt in See, Meer oder Fels
   liegt, sind Landschaft, nicht Stadt.
3. **Stadtgebiet und Mauer** (`mauer.ts`). Innere Flecken = die ersten N trockenen der Spirale.
   Mit `mauer`: ummauert wird der Kern (Flecken innerhalb ~70 % des Stadtradius), der Rest ist
   Vorstadt. Der Mauerring ist die geordnete Außenkantenschleife des Kerns (`aussenkanten` →
   Ring), an jeder Ecke ein Turm, auf langen Seiten zusätzliche Türme im Abstand von ~6 Zellen.
   Wo der Fluss die Mauer quert: Lücke mit zwei Flankentürmen (Wassertor).
4. **Tore und Hauptstraßen** (`wege.ts`). Tore sind Mauerecken, gewählt nach Winkel (möglichst
   gleichmäßig verteilt), 2 (Dorf ohne Mauer: Ortseingänge) bis 4 (Stadt). Hauptstraßen: A* über
   den Kantengraph der Flecken vom Tor zum Marktplatz; schon benutzte Kanten kosten die Hälfte
   (Straßen bündeln sich), Flussquerung kostet einen Brückenzuschlag. Außerhalb geht es vom Tor
   über die Außenflecken zum Kartenrand weiter (ersetzt die heutigen „Zufahrten"). Jede Kante
   zwischen zwei Stadtflecken ist eine Gasse; Hauptstraßen sind breiter. Dazu die Wallgasse (E6).
5. **Viertelrollen** (`rollen.ts`), in dieser Reihenfolge, jeweils nur unter freien Flecken:
   - `markt`: der trockene Fleck nächst der Mitte, an einer Hauptstraße. Ganz Platz; bei Stadt steht
     ein Rathaus darauf, bei Dorf ein Brunnen und die Kirche am Rand (Anger).
   - `tempel`: Nachbar des Marktes mit der größten Fläche. Dom mit Kreuzgrundriss, Domplatz.
   - `burg` (Option): Mauerfleck mit dem höchsten Relief, bevorzugt am Wasser. Eigene Innenmauer mit
     Ecktürmen, Bergfried (`burg`), Kaserne, Hof; ein Tor zur Stadt.
   - `hafen`: Flecken am Ufer von Fluss, See oder Meer (bis 3 bei Stadt). Lagerhäuser, Stege.
   - `adel`: Nachbarn von Markt/Burg auf hohem Grund. Große Lose, Gärten, wenige Gebäude.
   - `handwerk`: an Toren und am Fluss. Schmieden, Werkstätten, Mühle am Ufer.
   - `arm`: Vorstadtflecken nahe Toren und flussabwärts. Kleine, dichte, unregelmäßige Lose.
   - `frei`: ab Stadt ein kleiner Park oder Friedhof (Bäume) neben dem Tempel.
   - `wohnen`: alles Übrige.
   Ein Zonenplan überschreibt die Rolle je Fleck (E4). Der Bericht listet jedes Viertel mit Rolle,
   Namen und Umriss.
6. **Blöcke und Gassen** (`parzellen.ts`). Jeder Fleck wird rekursiv halbiert: Schnitt quer zur
   längsten Achse, Lage leicht gestreut. Die oberen Schnitte lassen eine schmale Gasse offen (eine
   Straße mit eigener Id und Adresse), bis die Blockfläche unter dem Rollenmaß liegt. Blöcke werden
   ohne Lücke weiter in Lose halbiert. Lose ohne Straßenfront werden Innenhof (Garten oder
   gestampfter Hof), nie ein adressloses Haus.
7. **Gebäude**. Je Rolle ein Parametersatz: Losgröße, Anteil bebaut, Gartenchance, Formen. Dicht
   (Markt, Wohnen, Arm, Handwerk): Haus = Los minus schmale Fuge → geschlossene Häuserzeilen.
   Locker (Adel, Vorstadt, Dorf): Haus an der Straßenfront, Garten dahinter; große Lose als
   L- oder U-Hofhaus. Sonderbauten nach Rolle: Rathaus, Dom/Kirche, Burg, Kaserne, Mühle,
   Bauernhof, Tavernen an Toren und am Markt, Lagerhäuser am Hafen. Namen aus rollenbezogenen Listen.
8. **Vorstadt**. Außerhalb der Mauer nur Lose, die an eine Hauptstraße grenzen: Bebauung wächst
   entlang der Ausfallstraßen, nicht als zweiter Ring.
9. **Flur** (`flur.ts`). Außenflecken, die nicht Wald, Wasser oder Fels sind, werden Felder: in
   lange Streifen quer zur nächsten Straße geteilt (Gewannflur); an manchen Straßenecken ein
   Bauernhof mit Scheune. Die fest eingetragenen Feldgruppen entfallen. Wald bleibt aus dem Relief.
10. **Namen** (`namen.ts`). Viertelnamen nach Rolle und Himmelsrichtung („Marktplatz",
    „Domfreiheit", „Burgberg", „Hafenviertel", „Gerbergasse", „Oberstadt", „Unterstadt",
    „Nordvorstadt" …), Schreibort im Inneren des Viertels.
11. **Gemeinsamer Rest** wie heute: Brücken, Stege, Stempel, Lichter, Dokument, Knoten.

**Dorf**: keine Mauer, keine Burg, `markt` wird Dorfplatz/Anger mit Kirche und Taverne,
Haufendorf um den Platz, Höfe mit Nebengebäuden am Rand. **Weiler**: 3–8 Bauernhöfe mit Scheune an
einer Kreuzung, Felder dicht am Ort.

## 6. Oberfläche

- „Stadt & Dorf": zwei Schalter mit Klartext, „Stadtmauer mit Türmen und Toren" und „Burg am
  Stadtrand", jeweils mit einer Zeile Erklärung darunter. Vorgaben je Ortsart.
- Zonenplaner: zwei neue Nutzungen „Burg" und „Tempelbezirk" mit Beschreibung; Knopf
  „Viertel aus der Karte übernehmen" (nur aktiv, wenn eine erzeugte Siedlung vorliegt), danach
  Hinweis „Du kannst die Viertel jetzt verschieben und neu erzeugen."
- Englisches Sprachpaket für jeden neuen Text (`i18n/en/P*.json`), Jargon-Sweep.

## 7. Fehlerverhalten

- Kein trockener Fleck für den Markt → Markt entfällt, Bericht nennt es (wie heute).
- Burg gewünscht, aber kein Mauerfleck → keine Burg, Eintrag in `bericht.ausgelassen`.
- Zu kleine Karte für Mauer (weniger als 5 Kernflecken) → keine Mauer, Eintrag im Bericht.
- Weniger Gebäude als angefordert bleibt erlaubt (`angefordert` vs. `bauwerke`), nie aufgefüllt.

## 8. Budget

Vorlage „Großstadt" 88×64, 480 Gebäude: Regionen ≈ 480 Häuser + 480 Lose + ~350 Gassen/Straßen +
~40 Türme + ~350 Landschaft + ~100 Kreuzungen/Brücken ≈ 1800 von 4096; Dokument deutlich unter
1 MiB. Erzeugungszeit Ziel < 2 s in Node für die Großstadt. Beides als Test.

## 9. Prüfung

- **Einheitentests** je Baustein: Spiralflecken deterministisch; Rollenregeln (Markt zentral,
  Tempel am Markt, Burg an der Mauer, Hafen am Ufer, Zonenplan gewinnt); Mauerring geschlossen,
  Tore dort, wo Hauptstraßen queren, Turmabstände; jedes Tor erreicht den Markt; halbierte Lose
  überlappen nicht.
- **Invarianten über viele Keime** (je Ortsart × alle Standorte × 40 Keime): jedes Gebäude an einer
  Straße, keine Dachüberlappung, nichts im Wasser/Fels/auf Straßen, alles im Kartenrahmen,
  Straßennetz zusammenhängend, 0 Abbrüche.
- **Unverändert-Nachweis**: Gegenwart und Sci-Fi serialisieren byte-gleich wie auf `main`.
- **Budget- und Zeittest** für die Großstadt.
- **Bilder ansehen** vorher/nachher (Stadt/Dorf/Weiler × Fluss/Küste/Hügel/Ebene/See), dazu ein
  Innenraum eines neuen Typs über `/betreten`.
- **Browser**: `e2e/map-studio.spec.ts` (Stadt erzeugen, Schalter, Zonenplaner-Übernahme).
- **Tore**: `npm run typecheck`, `npm run build`, `gate:sprache`, `gate:boundaries`, gezielte
  Suiten statt voller Suite (Kaya-Regel).

## 10. Ausblick Teil 2 und 3 (nur Richtung, eigene Specs folgen)

- **Teil 2 Sci-Fi/Moderne:** eigener Layoutbaustein mit Straßen aus Richtungsfeldern (Raster +
  Ringe, Stufen Schnellstraße → Gasse), Viertel Raumhafen/Industrie/Wohnblöcke/Parks/Arkologie,
  eigene Optik (dunkler Grund, Leuchtlinien, Schimmer), Regionssymbol je Setting, Kenney-CC0-Grafiken.
- **Teil 3 Weltkarten-Baukasten:** Zellnetz (Poisson-Punkte + Delaunay) mit Werten je Zelle,
  Höhenvorlagen (Kontinent, Inselgruppe, Urkontinent), Pinsel für Land/Meer/Gebirge, Flüsse live,
  Reiche und Provinzen malen, Städte setzen, Beschriftungen; Anschluss an Atlas und `betreten`.
  Azgaar-Import bleibt. Ein nachgebautes Andaria löst das Bildlizenzproblem der Desktop-Fassung,
  nicht die Rechte an der Welt selbst (Mitautoren, `design/fixtures/eron/media/LIESMICH.md`).
