# Moderne Stadt und Kolonie (Kartenstudio, Teil 2 von 3) — Design

Stand 2026-09-23, Zweig `feature/stadt-zukunft` (von `main` 0af77d8, Teil 1 gemergt).
Auftrag Kaya: „Sci-Fi-Karten sehen noch zu mittelalterlich aus." Reihenfolge 1 → 2 → 3 von Kaya
bestätigt, Start von Teil 2 mit „jo". Entscheidungen hier hat Claude getroffen (Kartenstudio-Regel:
allgemeinere Variante wählen, begründen, nicht nachfragen); jede ist mit „E" nummeriert und einzeln
kippbar. Teil 1: `2026-09-23-stadtgenerator-viertel-design.md`.

## 1. Ausgangslage (angesehen, nicht vermutet)

Probe `.local/stadt-probe/render.ts`, Bilder `png/vorher-stadt-gegenwart-fluss.png` und
`png/vorher-stadt-scifi-kueste.png` (Stadt, 224 Gebäude, v8).

- **Gegenwart** ist ein starres Quadratraster: 8 × 6 gleiche Blöcke, in jedem 4–8 gleich große
  Kästen am Rand. Der Fluss läuft *unter* Blöcken und Straßen hindurch; eine Diagonale aus dem
  Hauptstraßenbaum schneidet schräg über das Raster. Kein Zentrum, kein Park, kein Gewerbe.
- **Sci-Fi** ist dasselbe Raster mit versetzter Reihe (Zickzack), dunklerer Palette und
  gestreiften Dächern. Es liest als „Neubaugebiet in Grau", nicht als Kolonie.
- **Optik**: Gegenwart und Sci-Fi zeichnen jedes Dach gleich (Flachdach, 2 bzw. 4 Fugen). Die
  Kartografie weiß nicht, welches Gebäude sie zeichnet — die Rolle `building` trägt keinen Typ.
- **Regionskarte**: das Ortssymbol `ort` zeichnet immer eine Kirche mit Kreuz und bei Städten eine
  Steinmauer mit Ecktürmen — auch in der Zukunft.
- Code: der v8-Rumpf steckt noch in `siedlung.ts` (Z. 337–849) und bedient Gegenwart/Sci-Fi samt
  Zonenplan (v9) und Straßenplan (v10). Fantasy läuft über `stadt/viertel/` (v11).

## 2. Vorbilder (nur Verfahren, kein Code)

- **Moderne Städte**: Hauptstraßen zwischen Stadtteilen, in jedem Stadtteil ein eigenes, gedrehtes
  Straßenraster (wie gewachsene Städte mit Gründerzeit- und Nachkriegsvierteln); Blockrand-
  bebauung mit Innenhof im Zentrum, Zeilenbauten, Einfamilienhäuser am Rand, Gewerbegebiete mit
  Hallen. Verfahren wie bei Parish & Müller (2001) und citygen (MIT, t-mw), vereinfacht auf
  „Raster je Stadtteil".
- **Kolonien**: Nabe mit Ringen und Speichen (klassisches Raumstation-/Arkologie-Bild), Kuppeln,
  Landefelder, Hydrokultur. Kein fremder Code nötig.

**E1 — Keine neue Abhängigkeit.** `polygon.ts` hat Halbebenenschnitt, konvexen Schnitt,
Einwärtsversatz und Halbieren; Raster und Ringe sind Schnitte konvexer Polygone.

## 3. Ziel und Abgrenzung

**Ziel:** Eine Gegenwartsstadt liest auf den ersten Blick als heutige Stadt: breite
Hauptverkehrsstraßen mit Mittellinie, ein Stadtring, Stadtteile mit eigenen Straßenrastern,
Hochhäuser in der Innenstadt, Blockrand mit grünen Höfen, Zeilenbauten, Einfamilienhäuser mit
Gärten am Rand, Gewerbehallen, Parks. Eine Sci-Fi-Siedlung liest als Kolonie: eine Nabe mit
Kommandozentrale, Ringstraßen und Speichen, Wohnkuppeln, Fertigungshallen, Landefelder,
Hydrokultur- und Solarfelder, ein leuchtender Schutzzaun statt einer Steinmauer. Dorf und Weiler
beider Settings bekommen dieselbe Sorgfalt. Das Ortssymbol auf der Regionskarte passt zum Setting.

**Nicht in Teil 2:** Eisenbahn und Straßenbahn (bräuchte ein neues Straßenmaterial durch alle
Editoren), Straßennamen, Verkehr/Fahrzeuge, neue Gebäudetypen, Innenräume der Gebäude (die
vorhandenen Bauprogramme der Typen gelten), Weltkarte (Teil 3). Fantasy bleibt Byte für Byte v11.

## 4. Entscheidungen

- **E2 — Version 12 für Gegenwart und Sci-Fi, der v8-Rumpf entfällt.** `setting !== "fantasy"`
  erzeugt Version `"12"`, auch mit Zonen- oder Straßenplan (die Pläne stehen im Keim, wie bei v11).
  Die Versionen 8/9/10 werden nicht mehr erzeugt; gespeicherte Karten sind Dokumente und bleiben
  unberührt, nur Neuerzeugungen mit gleichem Keim ergeben eine andere Stadt (wie in Teil 1, E2).
- **E3 — Fantasy wird vor jedem Umbau festgenagelt.** Neuer Gold-Test
  `siedlung-gold-fantasy.test.ts` (Weiler/Dorf/Stadt × fünf Standorte, Stadt mit Zonen- und mit
  Straßenplan) hält v11 per Hash fest. Jeder Umbau in `stadt/**` muss diese Hashes unverändert
  lassen.
- **E4 — Eine Pipeline, drei Stile.** Die Viertel-Pipeline (`viertel/index.ts`) wird nicht
  kopiert, sondern bekommt einen `StadtStil` (`stadt/stil.ts`). Der Stil liefert, was sich
  unterscheidet: die Flecken (Spirale/Voronoi oder Ringsektoren), die Befestigung (Mauer mit
  Türmen, Schutzzaun, Stadtring als Straße, keine), Straßenbreiten, die Bebauung eines Flecks,
  Typtabellen, Sonderbauten, Titel, Viertelnamen, Flurstreifen, Dachform. Alles andere — Rollen
  samt Zonenplan, Hauptstraßen, Straßenbänder, Flussquerung, Budget, Flur, Wasser und Brücken,
  Stege, Ausstattung, Beschriftung, Dokument, Bericht — ist gemeinsamer Code. Fantasy ist der
  Stil `FANTASY` mit genau den heutigen Werten in derselben Zufallsreihenfolge (E3 prüft).
- **E5 — Zwei neue Stile** neben `stadt/viertel/`: `stadt/modern/` (Gegenwart: Flecken wie
  Fantasy, größer; Raster und Blockbebauung je Stadtteil) und `stadt/kolonie/` (Sci-Fi:
  Ringsektoren; Kuppeln, Hallen, Landefelder). Da Ringsektoren eine echte Zerlegung der Karte
  sind, entstehen Ringstraßen und Speichen von selbst aus dem Kantengraph. `siedlung.ts` wählt
  den Stil nach Setting; es bleibt ein Generator (`kartenwerk.ts`). Kreise und Ringe ohne
  `Math.sin/cos` (`polygon.ts`, Regel 2): Richtungen über Halbwinkel mit `Math.sqrt`.
- **E6 — Dachform als Kartografie-Feld.** Die Rolle `building` bekommt ein optionales Feld
  `dach` aus `CARTOGRAPHY_DACHFORMEN = ["giebel", "flach", "halle", "kuppel", "plattform"]`.
  Fehlt es, gilt die Vorgabe des Settings (Fantasy Giebel, sonst Flachdach) — alte Karten und
  Fantasy v11 schreiben es nicht und ändern ihren Hash nicht. Der Parser nimmt es optional an; die
  Editoren reichen es beim Kopieren einer Region unverändert durch. Der Bauwerkstyp selbst bleibt
  im Knoten (keine Doppelung): `dach` sagt nur, *wie* das Dach aussieht.
- **E7 — Optik `cartography-13`**, alles nur für Gegenwart/Sci-Fi oder für gesetzte `dach`-Felder:
  - Dächer nach `dach`: *giebel* wie Fantasy ohne Schornstein, in den Farben des Settings;
    *flach* mit Attika (Innenkante) und 1–3 Dachaufbauten (Lüftung, bei Sci-Fi Paneele);
    *halle* als Sheddach (quer gestreift); *kuppel* als Kreis mit zwei helleren Ringen und
    Glanzpunkt, bei Sci-Fi mit leuchtendem Rand; *plattform* als dunkles Landefeld mit Ring,
    Mittelmarke und vier Positionslichtern.
  - Straßen: Gegenwart-Hauptstraßen mit gestrichelter weißer Mittellinie, Sci-Fi-Straßen mit zwei
    schmalen türkis leuchtenden Randlinien.
  - Plätze: Gegenwart großformatige Platten, Sci-Fi Deckplatten (globales Gitter, wie Teil 1).
  - Felder in Sci-Fi: je Parzelle Solarfeld (dunkelblau mit Gitter) oder Hydrokultur (grüne
    Beete unter hellen Glasstreifen).
  - Mauern in Sci-Fi: Schutzzaun als dunkle Linie mit türkis leuchtender Mitte.
  - **Ortssymbol** je Setting: Gegenwart flache Dächer im rechtwinkligen Gitter, dunkle Hochhaus-
    gruppe in der Mitte, bei Städten ein Stadtring (Straßenfarbe) statt Mauer; Sci-Fi eine große
    Kuppel in der Mitte, kleine Kuppeln im Ring, bei Städten ein Landefeld und ein leuchtender Zaun.
    Die Kirche bleibt Fantasy.
- **E8 — Optionen.** Keine neuen Optionsnamen. `mauer` gilt künftig auch für Sci-Fi und heißt
  dort in der Oberfläche „Schutzzaun mit Toren" (Vorgabe Stadt ja, sonst nein); in der Gegenwart
  bleibt es aus und wird nicht angezeigt (der Stadtring ist eine Straße, keine Option). `burg`
  bleibt Fantasy. Validierung an allen drei Stellen unverändert (Wahrheitswert), der Keim nimmt
  `mauer` für Sci-Fi auf.
- **E9 — Beschriftungen je Setting.** Zonenplaner, Übernahme der Viertel, Viertelnamen auf der
  Karte und Gebäudetitel sprechen die Sprache des Settings (Tabelle Abschnitt 7). Alles Klartext,
  jede neue Zeichenkette steht im Sprachkatalog.
- **E10 — Budget wie in Teil 1**: `bauwerkeMax` 512, Stadt-Vorgabe 320 gilt jetzt auch für
  Gegenwart/Sci-Fi, „Großstadt" 480 für alle Settings. Regionen ≤ 4096, Kartografie ≤ 1 MiB,
  Nachweis per Test.

## 5. Gegenwart v12 (`stadt/modern/`)

Einheiten sind Zellen. Alle Züge aus dem Layout-Keim, Reihenfolgen über Geometrie (I8).

1. **Stadtteile.** Flecken auf der Spirale wie Fantasy (`flecken.ts`), aber weniger und größer:
   Zielzahl innen ≈ Gebäude / 22 (Stadt), / 14 (Dorf), / 6 (Weiler), mindestens 3. Kern = innere
   ~60 % (nur Stadt), der Rest Außenbezirk.
2. **Hauptverkehrsstraßen** auf den Kanten zwischen Stadtteilen (Breite 1,3), Ausfallstraßen von
   den Toren zum Kartenrand (1,1). **Stadtring** (nur Stadt): die Außenkantenschleife des Kerns
   (`mauerKanten`) als Hauptstraße (1,3) statt Mauer. Tore = Anschlussstellen am Ring. Fluss:
   Hauptstraßen dürfen queren (Brücken wie heute), Nebenstraßen enden am Ufer.
3. **Raster je Stadtteil.** Winkel θ = Richtung der längsten angrenzenden Hauptstraße (bei Gleichstand
   die zur Mitte). Maschenweite nach Rolle: Innenstadt 6,5 × 6,5, Blockrand 7 × 9, Zeilenbau 9 × 12,
   Einfamilienhaus 5,5 × 11, Gewerbe 11 × 13, Villen 9 × 11. Phase aus `zoneDraw`. Rasterlinien
   werden am um die halbe Hauptstraßenbreite eingerückten Stadtteil geschnitten und sind
   Nebenstraßen (0,7); Blöcke = Stadtteil ∩ Rasterzelle (konvex). Blöcke unter 40 % der Masche
   werden Grünfläche; ein Block, der mehr als 12 % Wasser schneidet, entfällt.
4. **Bebauung je Rolle** (Blöcke um 0,3 eingerückt, Häuser an einer Straße):
   - *markt* → **Innenstadt**: je Block ein bis zwei große Baukörper (Büro, Hotel, Bank, Kaufhaus
     = `supermarkt`), der Block am Markt wird Platz (Plattenbelag) mit Rathaus an einer Seite.
   - *wohnen* (Kern) → **Blockrand**: die Blockkante wird in Häuser von 4–7 Zellen Länge und 2,2
     Tiefe geteilt, Ecken als Winkel; der Hof bleibt Rasen (Los).
   - *wohnen* (Außenbezirk) und Weiler → **Einfamilienhäuser**: Halbieren in Parzellen an der
     Straße, Haus 2–3 Zellen mit Giebeldach, Garten dahinter.
   - *arm* → **Zeilenbau**: parallele Riegel (8–12 × 2,4) mit Rasen dazwischen, Wohnblock.
   - *adel* → **Villen**: große Parzellen, ein Haus mit Giebeldach, Bäume.
   - *handwerk* → **Gewerbe**: Hallen (Fabrik, Lager, Werkstatt, Sheddach), Hof als Platz.
   - *hafen* → Lagerhallen am Ufer, Kaje als Platz, Stege wie heute.
   - *tempel* → **Schule & Klinik**: ein großer Bau (Schule oder Krankenhaus) und ein Sportplatz
     (Rasenfläche mit Laufbahn aus zwei Wegflächen).
   - *burg* (nur über Zonenplan) → **Rathaus & Ämter**: Rathaus, Polizei, Feuerwache um einen Platz.
   - *frei* → **Park**: Rasen, Baumgruppen (Wald), zwei sich kreuzende Wege.
5. **Außen**: große rechteckige Felder (`flurStreifen` mit 2–4 Streifen), Wald wie heute, an der
   Ausfallstraße einzelne Höfe (Bauernhof).
6. **Pflichtbauten**: Stadt — Rathaus, Krankenhaus, Polizei, Feuerwache, Schule, Bahnhof am Rand
   der Innenstadt (als Gebäude, ohne Gleise); Dorf — Supermarkt, Schule, Feuerwache, Kirche; Weiler
   — keine.
7. Dachform: Giebel für `haus`/`bauernhof`/`kirche`, Halle für `fabrik`/`lager`/`werkstatt`,
   sonst flach.

## 6. Sci-Fi v12 (`stadt/kolonie/`)

1. **Nabe, Ringe, Speichen.** Mitte = trockener Punkt nahe der Kartenmitte (wie heute). Ringe:
   Weiler 1, Dorf 2, Stadt 3, Radien gleichmäßig bis zum Stadtradius (Stadt 0,42 × kurze Seite,
   Dorf 0,32, Weiler 0,2); Speichen: 6 / 8 / 12, Startwinkel aus dem Keim. Ringe als Vielecke aus
   Sehnen (keine Trigonometrie im Ergebnis: Ecken werden wie überall quantisiert).
2. **Sektoren** = Trapeze zwischen zwei Ringen und zwei Speichen, lange Sektoren zusätzlich im
   Winkel geteilt (Sehne ≤ 12 Zellen). Jeder Sektor ist ein Fleck für `rollen.ts`. Sektoren in
   Wasser oder Fels entfallen; ein Sektor mit mehr als 12 % Fluss entfällt.
3. **Straßen**: Ringstraßen (1,1), Speichen (1,3), die Nabe ist ein runder Platz (Deckplatten)
   mit der Kommandozentrale in der Mitte. Speichen laufen über den äußersten Ring hinaus als
   Zufahrten zum Kartenrand. Über den Fluss führen nur Speichen (Brücken).
4. **Bebauung je Rolle:**
   - Nabe → Kommandozentrale (Achteck, flach) und Reaktor (Kuppel) — immer.
   - *markt* → **Marktdeck**: Platz mit Läden (Restaurant, Lager) an den Sektorkanten.
   - *wohnen* → **Wohnkuppeln**: runde Grundrisse (12-Eck, Radius 1,2–2,2), Raumstation, dicht an
     der Straße; Kuppeldach.
   - *adel* → **Wohntürme**: Achtecke, Wohnblock, flach.
   - *arm* → **Frachtquartier**: Reihen kleiner Container (Lager, Wohnblock), flach.
   - *handwerk* → **Fertigung**: Hallen (Fabrik, Werkstatt, Reaktor), Sheddach.
   - *hafen* → **Raumhafen**: im äußeren Ring, zwei bis vier Landefelder (16-Ecke, Radius 2,5–4)
     vom Typ Raumhafen mit Dach „plattform", dazu ein Lager — braucht kein Wasser.
   - *tempel* → **Forschung & Medizin**: Labor und Medstation.
   - *frei* → **Grünfläche**: Rasen mit Bäumen.
   Eine Sci-Fi-Stadt ohne Zonenplan bekommt automatisch einen Raumhafen-Sektor im äußeren Ring.
5. **Schutzzaun** (Option `mauer`): der äußerste Ring als Mauerlinie, an jeder Speiche ein Tor
   (Lücke). Keine Türme.
6. **Außen**: Flur als Solar- und Hydrokulturfelder (Material `field`, die Optik unterscheidet),
   Wald wie heute.
7. Dachform: Kuppel für Raumstation/Reaktor/Medstation, Plattform für Raumhafen, Halle für
   Fabrik/Werkstatt, sonst flach.

## 7. Beschriftungen

| Nutzung | Fantasy (heute) | Gegenwart | Sci-Fi |
| --- | --- | --- | --- |
| wohnen | Wohnviertel | Wohngebiet | Wohnkuppeln |
| markt | Marktviertel | Innenstadt | Marktdeck |
| handwerk | Handwerksviertel | Gewerbegebiet | Fertigung |
| hafen | Hafenviertel | Hafen | Raumhafen |
| adel | Adelsviertel | Villenviertel | Wohntürme |
| arm | Armenviertel | Wohnblöcke | Frachtquartier |
| frei | Freifläche | Park | Grünfläche |
| burg | Burg | Rathaus & Ämter | Kommandozentrale |
| tempel | Tempelbezirk | Schule & Klinik | Forschung & Medizin |

Viertelnamen auf der Karte: Gegenwart „Innenstadt", „Nordstadt", „Gewerbegebiet Süd",
„Parkviertel" usw. (Himmelsrichtung aus der Lage); Sci-Fi „Sektor A-3", „Kuppelring Nord",
„Raumhafen", „Kommandodeck". Gebäudetitel: Gegenwart „Wohnblock Parkallee 12", Sci-Fi
„Habitat Vega-7".

## 8. Tests und Nachweis

- **Gold Fantasy** (E3) vor jedem Umbau, danach unverändert grün.
- **Gold v12**: `siedlung-gold.test.ts` wird auf v12 umgestellt (neue Schnappschüsse, Version
  „12" auch mit Zonenplan).
- **Invarianten v12** (je Setting, Weiler/Dorf/Stadt × fünf Standorte, mehrere Keime, auf zwei
  Testdateien verteilt wegen des Vitest-RPC-Zeitlimits): jedes Gebäude hat eine Straße und berührt
  sie; kein Dach überlappt Straße, Wasser oder ein anderes Dach; alles im Bild; Regionen ≤ 4096;
  Kartografie ≤ 1 MiB und vom Parser angenommen; deterministisch; Gebäudezahl zwischen 60 % und
  100 % des Ziels bei Stadt/Dorf.
- **Struktur**: Gegenwart-Stadt hat einen Stadtring, mindestens zwei Rasterwinkel, einen Park,
  Blockrand mit Hof; Sci-Fi-Stadt hat Nabe, Ringe, Speichen, Kuppeln, Landefelder, Zaun mit Toren.
- **Optik**: Projektionstests für jede Dachform und das Ortssymbol je Setting (keine Kirche in
  Gegenwart/Sci-Fi), `cartography-13`.
- **Umgestellte Verträge**: `siedlung-plan`, `siedlung-traffic`, `siedlung-cartography`,
  `settings`, `zeitwelten` erwarten „12" statt 8/9/10 und prüfen dieselben Eigenschaften.
- **Bilder**: Probe rendert Stadt/Dorf/Weiler beider Settings, jedes Bild wird angesehen und in
  `design/iterations/stadt-zukunft-20260923.md` beschrieben.
