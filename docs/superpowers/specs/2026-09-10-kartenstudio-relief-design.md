# Kartenstudio Stufe 10 — Relief, Landschaft, Höhenwerkzeug

Datum 2026-09-10. Auftrag (Kaya): „mach die Kartengenerierung/editing noch besser, wir sind auf
lvl1, lass uns auf lvl10 gehen." Entschieden ohne Rückfrage nach Kayas Vorgabe vom 2026-09-08
(allgemeinste, mächtigste Variante wählen, Entscheidungen sichtbar protokollieren). Pfad:
architektonisch — es kommt eine neue Datenschicht (Relief) unter die vorhandene Kartografie.

## 1. Befund: wo Stufe 1 aufhört

Die Kartografie kennt Flächen mit Rollen (Gelände in sechs Materialien, Wasser in drei Arten,
Straßen, Grundstücke, Gebäude, Räume). Die Landschaft ist **flach**: es gibt keine Höhe. Der
Siedlungsgenerator v6 setzt für jeden Standort **handgelegte Ellipsen und Polygone** (See als
Ellipse, Küste als gewellte Linie, Gebirge als drei feste Dreiecke, Wald als zwei Ellipsen); der
Fluss ist eine Bézierkurve, die nicht bergab fließt, weil es kein Bergab gibt. Der Renderer malt
Fels als Gipfelgitter (offener Punkt: „echte Kammlinien statt Gipfelgitter"), und die Karte hat
weder Höhenlinien noch Schattierung. Der Editor kann Material malen, aber nicht formen.

Inkarnate, Wonderdraft und Azgaar ziehen ihre Wirkung aus genau der Schicht, die fehlt:
Höhe → Wasser fließt bergab, Küsten haben Buchten, Berge sind Kämme, das Papier ist
schattiert. Das ist die eine Investition, die alles andere hebt.

## 2. Ziel

Eine **Reliefschicht** als erstklassiger Teil der Kartografie, ein **Landschaftsgenerator**, der
aus dem Relief Wasser, Fels, Strand, Wald und Sumpf ableitet (statt sie zu zeichnen), eine
**gemalte Projektion** mit Schattierung, Höhenlinien und reliefgeführten Kämmen, und ein
**Höhenwerkzeug** im Editor, das Hügel und Täler formt. Dazu zwei neue Materialien (Sumpf,
Schnee) und zwei neue Standorte (Hügelland, Moor).

## 3. Entscheidungen nach Umkehrbarkeit (Kayas Migrationsregel)

**Unumkehrbar, deshalb maximal:** das Datenmodell des Reliefs.

- `TacticalCartographyV1` erhält ein optionales Feld `relief: CartographyReliefV1`.
  ```ts
  interface CartographyReliefV1 {
    readonly schemaVersion: 1;
    readonly columns: number;   // ≥ 2, Abtastpunkte je Zeile
    readonly rows: number;      // ≥ 2
    readonly seaLevel: number;  // ganze Zahl 0..255
    readonly heights: readonly number[]; // columns*rows ganze Zahlen 0..255, zeilenweise
  }
  ```
- Die Abtastpunkte liegen auf den **Ecken der Konstruktionszellen**: Punkt (i, j) bei
  `construction.origin + (i·cellSize, j·cellSize)`. Damit ist das Relief unabhängig von der
  Kartengröße in Pixeln, folgt dem Raster, das der Editor ohnehin benutzt, und lässt sich mit
  Marching Squares je Zelle in Höhenlinien und Konturflächen übersetzen.
- Grenzen: `columns, rows ≤ 1025`, `columns·rows ≤ 65 536` (die größte Siedlung 192×192 braucht
  193² = 37 249). Der Parser bleibt geschlossen: unbekannte Eigenschaften werden abgewiesen.
- **Alte Dokumente bleiben byte- und hashgleich.** Ohne `relief` ändert sich weder
  Serialisierung noch `tacticalCartographyHash`. Ein Dokument mit Relief hat einen anderen Hash;
  ältere Leser weisen es mit „explizite Migration nötig" ab, wie für jedes neue Profil vorgesehen.
- Kein zweiter Geometriespeicher: das Relief ist eine Schattierungs- und Formschicht. Was Wasser
  oder Fels *ist*, sagen weiterhin die Rollen der Flächen. Der Generator leitet die Flächen aus
  dem Relief ab; der Editor koppelt beide an einer Stelle (Wasser malen senkt das Land, Fels malen
  hebt es), damit Höhenlinien nicht durch einen See laufen.
- Materialien `CARTOGRAPHY_TERRAIN_MATERIALS` += `swamp`, `snow`. Additiv; alte Dokumente
  unverändert.

**Umkehrbar, deshalb schlank:** Rauschfunktion, Standortformen, Schattierungsfarben,
Höhenlinienabstand, Werkzeugoberfläche. Alles hinter `rendererVersion` bzw. `SIEDLUNG_VERSION`.

## 4. Bauteile

### 4.1 `@chronicle/szene` — Datenmodell
- `cartography.ts`: Typ, Parser (Länge, Ganzzahl, Bereich, Grenzen), Export der Grenzen
  `TACTICAL_CARTOGRAPHY_LIMITS.reliefSamples`. Hilfsfunktion `reliefHeightAt(relief,
  construction, x, y)` (bilinear, in Pixeln) und `reliefLevels` (Fels- und Schneeschwelle
  relativ zum Meeresspiegel) als gemeinsame Konstanten für Generator, Editor und Projektion.

### 4.2 `@chronicle/forge` — Landschaft
- Neu `relief.ts`:
  - `erzeugeRelief({ breite, hoehe, standort, keimHash, relief })` → Höhenfeld (breite+1 ×
    hoehe+1) aus wertbasiertem fBm-Rauschen (5 Oktaven, gehasht aus dem Keim, ohne Iterations-
    reihenfolge), geformt je Standort: Ebene sanft; Hügelland wellig; Wald wie Ebene mit hoher
    Feuchte; Gebirge Massiv an einer Seite mit ridged noise, Ortsmitte flach; Fluss ein
    eingegrabenes Tal längs der bisherigen Bézier-Achse mit Gefälle; See ein Becken unter dem
    Meeresspiegel; Moor flach und nass; Küste ein Gefälle ins Meer mit verrauschter Uferlinie;
    Insel radialer Abfall. Der Regler `relief` (0..1) skaliert die Amplitude.
  - `reliefFlaechen(relief, test)`: konvexe Stücke je Zelle für `test(h)` (Marching Squares mit
    linearer Interpolation; ein Quadrat, geschnitten von einer Geraden, ist konvex; Sattel liefert
    zwei konvexe Stücke). Volle Zellen werden zeilenweise zu Rechtecken verschmolzen; nur
    Randzellen bleiben klein. So bleiben Flächenzahl und Hindernisprüfungen in Budget.
  - `reliefHydrologie(relief)`: D8-Fließrichtung (steilster Abstieg, Senken vorher aufgefüllt),
    Abflussakkumulation in topologischer Reihenfolge, Flussläufe als Polylinien ab Schwelle,
    Bänder als konvexe Vierecke je Segment, Breite wächst mit Akkumulation.
  - `reliefFeuchte(relief, wasserzellen)`: Feuchte aus Abstand zu Wasser und zweitem Rauschen →
    Waldzellen (bewaldung-Regler), Sumpfzellen (Moor: nass und flach).
- `siedlung.ts` → **v7**: die handgelegten Standortformen fallen weg; Wasser, Fels, Strand,
  Schnee, Sumpf und der große Waldgürtel kommen aus `relief.ts`. Die Siedlungsmechanik (Voronoi,
  Gassen, Parzellen, Häuser, Markt, Mauer) bleibt und sieht dieselben `bauHindernisse`, jetzt
  mit Hüllen-Vorfilter in den heißen Schleifen. Neue Optionen `relief` und `bewaldung` (0..1,
  Standard .5) im Keimvektor; neue Standorte `huegel`, `moor`. `cartography.relief` wird
  ausgegeben. Der Fluss bleibt für `fluss` garantiert (Tal gräbt, Hydrologie folgt); Brücken
  entstehen wie bisher an Straßenkreuzungen mit dem Fluss.
- `cartography-patterns.ts`: Muster `terrain:swamp`, `terrain:snow`.
- `cartography-edit.ts`: Operation
  `{ kind: "relief", points, radius, mode: "raise"|"lower"|"smooth"|"level", strength }`.
  Wirkt auf Abtastpunkte im Radius mit weichem Abfall; „Einebnen" zieht auf die Höhe des ersten
  Punkts. Fehlt ein Relief, wird eines angelegt (flach, Meeresspiegel + 40), damit das Werkzeug
  auf jeder Karte funktioniert. Beim Gelände-Pinsel: Wasser senkt betroffene Ecken auf
  Meeresspiegel − 6, Fels hebt auf Felsschwelle; alle anderen Materialien lassen das Relief.
  Alle anderen Operationen reichen `relief` unverändert durch.

### 4.3 `@chronicle/szene` — gemalte Projektion (`cartography-8`)
- **Schattierung und Höhenlinien** aus denselben Isolinien-Segmenten (Marching Squares je Zelle
  auf Stufen über dem Meeresspiegel): beleuchtete Höhenlinien nach Tanaka — jede Linie trägt
  auf der lichtabgewandten Seite (Südost) einen dunklen, auf der zugewandten (Nordwest) einen
  hellen Saum, breiter je nach Ausrichtung; darüber die dünne Tuschelinie, jede fünfte fester.
  Unter Wasser keine Linien. **Entschieden gegen** flach beleuchtete Quadrate je Zelle (lasen
  sich im Bild als Mosaik) und gegen Terrassen mit versetztem Schatten (stapelten sich über
  jede höhere Fläche und verdunkelten die Karte) — beides gebaut, angesehen, verworfen.
- **Reihenfolge:** Fels ist das letzte Gelände, das Relief liegt davor; ein Massiv trägt seine
  gezeichneten Gipfel, Wiese, Feld und Wald tragen die Linien.
- **Globales Gitter** für Baumkronen und Gipfel: der Generator liefert Wald und Fels als viele
  Zellstücke; ein Gitter je Stück druckte die Tessellierung als Blöcke.
- **Kämme:** Gipfel sitzen dort, wo das Relief hoch ist, und werden mit der Höhe größer; am
  Saum eines Massivs bleiben nur Schutt und Kanten; Schnee ab der Schneegrenze. Ohne Relief
  bleibt das bisherige Verhalten (alte Karten sehen aus wie gestern).
- **Sumpf** (dunkles Grün-Blau, Schilfstriche, Wasserlachen) und **Schnee** (helles Weiß mit
  blauem Schatten, keine Halme).
- Optionen `{ contours, shading }` für die Ansicht im Editor; Standard beides an; Server-Raster
  und UVTT-Export nutzen den Standard.
- Schattierungs- und Linienpolygone hängen an der Geländefläche, die ihren Mittelpunkt enthält
  (Szenenprüfung verlangt vorhandene Flächen-IDs; die Wissensmaske arbeitet pixelweise).

### 4.4 `@chronicle/client` — Editor und Generator
- Werkzeug **„Höhe"** (Taste E) in der Gruppe Landschaft: vier Karten „Anheben", „Absenken",
  „Glätten", „Einebnen" mit je einem Satz Klartext, Radius in Zellen, Stärke als Regler.
  Werkzeughinweis: „Über die Landschaft streichen, um Hügel und Täler zu formen."
- Gelände-Pinsel: Materialkarten + „Sumpf", „Schnee".
- Bühnenleiste: Schalter „Höhenlinien" und „Schattierung" (Ansicht, nicht Daten).
- Generator: Standortkarten „Hügelland — Sanfte Hügel & weite Sicht" und „Moor — Sumpf, Schilf
  & stilles Wasser"; Feineinstellungen: Regler „Relief" (Flach ↔ Gebirgig) und „Bewaldung".
- Sprachpaket: jede neue Zeichenkette bekommt einen englischen Eintrag in `i18n/en/P5.json`
  (Kartenpaket), `gate:sprache` bleibt grün.

### 4.5 `@chronicle/server`
- `validateKartenOptionen`: Schlüssel `relief`, `bewaldung` für Siedlungen; Standortliste kommt
  aus `SIEDLUNG_STANDORTE`. Revision (PUT V3) und Speicherung parsen die Kartografie mit Relief
  ohne weitere Änderung; `validateAuthoredCartography` prüft Flächen, nicht das Relief — ein
  geändertes Relief ist eine gewöhnliche Bearbeitung der Spielleitung.

## 5. Datenfluss
Generator: Keim → Relief → Hydrologie/Feuchte → Flächen (konvex, gebündelt) → Siedlung wie
bisher → Dokument + Kartografie (mit Relief). Editor: Geste → `applyCartographyEdit` (Relief-
Operation oder Gelände mit Reliefkopplung) → Vorschau/Verlauf → PUT Revision. Anzeige:
`cartographyDraw(document, cartography, setting, view)` → Polygone → Pixi/Raster.

## 6. Fehlerbehandlung
Parserfehler in Klartext an der bekannten Stelle (`TacticalCartographyValidationError`).
Reliefoperation außerhalb der Karte, Radius > 16 Zellen oder mehr als 4096 Punkte → `invalid`.
Generatorbudget: Flächen ≤ 4096 (angehoben von 2048 in Kartografie, Kartendokument, Raster und
Bearbeitungspfad — eine Großstadt im Moor braucht rund 2 200), Eckpunkte ≤ 20 000 (bestehende
Serverprüfung); die Verschmelzung voller Zellen hält den Generator darunter, gemessen je Standort.

## 7. Nachweis
- szene: Parser (gültig, falsche Länge, Bereich, Hash mit/ohne Relief, Legacy unverändert),
  Projektion (Schattierung und Linien nur mit Relief, keine Linien unter Wasser, Kammgipfel
  folgen der Höhe, Sumpf/Schnee malen, Ansichtsoptionen).
- forge: Relief deterministisch und standortgeformt, Flüsse fallen monoton, Konturstücke konvex
  und in ihrer Zelle, alle neun Standorte bauen trocken (bestehender Test erweitert), Relief-
  operation formt nur im Radius, Wasser senkt/Fels hebt, andere Operationen reichen durch.
- client: Höhenwerkzeug sichtbar und verdrahtet, neun Standorte, neue Optionen im Auftrag.
- server: Standort-Test über neun Standorte, Optionsprüfung.
- Browser: `e2e/map-studio` und `map-editor-cartography` grün; neuer Fall: Höhenwerkzeug
  streicht, Höhenlinien erscheinen, Speichern, Neuladen erhält das Relief.
- Bild: `renderCartographyImage` je Standort als PNG angesehen, nicht behauptet.
- Gates: Typecheck, Build, `gate:sprache`, `gate:boundaries`, `gate:version`.

## 8. Offen, ausdrücklich nicht in diesem Paket
Beschriftungen als freier Text (braucht Maskenentscheidung im Spielerbild), Streupinsel für
Außenobjekte (es gibt keine Baum-Assets; der Wald bleibt gemalt), Erosion, Nachbarkarten.
