# `assets/` — Assetpakete

Hier liegt der **Referent von `SceneDoc.stamps[].a`**. Ein Stamp verweist paket-qualifiziert
(`pk.grundriss/truhe`) und ausdrücklich **nie** über eine URL. Das Format dieses Referenten ist
[`packages/szene/src/assetpaket.ts`](../packages/szene/src/assetpaket.ts); es ist die einzige
Stelle, an der ein Manifest gelesen wird.

## Aufbau eines Pakets

```
assets/packs/<paket-id>/
  paket.json     Manifest — schlüsselsortiert, jede Datei mit sha256 und Bytezahl
  lizenz.txt     der tatsächlich mitgelieferte Lizenztext; sein sha256 steht im Manifest
  <art>/<name>.svg
```

Regeln, die das Format erzwingt und die nicht verhandelbar sind:

- **Pfade sind paketrelativ und kleingeschrieben.** Kein `..`, kein `.`, kein Backslash, kein
  absoluter Pfad, keine URL. Ein Paket zeigt niemals aus sich heraus.
- **Jedes Asset trägt eine auflösbare Lizenz** — die des Pakets oder eine eigene Überschreibung.
  Fremde Herkunft (`herkunft: "extern"`) verlangt zwingend eine benannte Quelle.
- **Eine Lizenz ist ein gehashter Text, kein Bezeichner.** `spdx` allein ist eine Behauptung;
  `textSha256` über die mitgelieferte Datei ist der Beleg. Grund: RB-21d §6.1 — GitHub meldet für
  Azgaars Lizenz `spdx_id: NOASSERTION`, weil MIT dort einen eingefügten Zusatz trägt. Ein
  Bezeichner ohne Textbeleg ist in beide Richtungen falsch.
- **Unbekannte Eigenschaften werden zurückgewiesen**, nicht ignoriert. Ein neues Feld ist eine
  Migration.

## Das Gate

`npm run gate:assets` ([`tools/gate-assets.mjs`](../tools/gate-assets.mjs)) prüft, was der reine
Parser strukturell nicht kann, weil er den Datenträger nicht sehen darf:

1. jede `sha256`/`bytes`-Zeile gegen die echte Datei, und jeden Lizenztext gegen `textSha256`;
2. **keine verwaisten Dateien** — eine Datei ohne Manifestzeile ist ein Asset ohne Lizenz;
3. **kein SVG mit Skript, Ereignisbehandler, externer Referenz, eingebettetem Raster, Doctype oder
   Entity** — ein Paket-Asset ist eine Zeichnung, nie ein Programm und nie ein Abruf;
4. dass ein generiertes Paket sich aus seinem Quellskript exakt reproduziert.

Das Gate ruft dafür denselben `parseAssetpaket` auf, den die Anwendung benutzt. Es gibt bewusst
keinen zweiten Validator in einer zweiten Sprache.

## Vorhandene Pakete

| Id | Assets | Lizenz | Herkunft |
|---|---:|---|---|
| `pk.grundriss` 1.2.0 | 84 | CC0-1.0 | vollständig in diesem Repository erzeugt — [`tools/assets/erzeuge-grundrisspaket.mjs`](../tools/assets/erzeuge-grundrisspaket.mjs) |
| `pk.atlas` 1.1.0 | 32 | CC0-1.0 | vollständig in diesem Repository erzeugt — [`tools/assets/erzeuge-atlaspaket.mjs`](../tools/assets/erzeuge-atlaspaket.mjs) |
| `pk.gemalt` 1.1.0 | 55 | CC0-1.0 | vollständig in diesem Repository erzeugt — [`tools/assets/erzeuge-gemaltpaket.mjs`](../tools/assets/erzeuge-gemaltpaket.mjs) |

`pk.grundriss` sind **schematische Grundriss-Symbole in einer Tuschesprache**, lesbar bei 64 px.
Es ist ausdrücklich keine gemalte Battlemap-Kunst; das steht so im Pakettitel, damit niemand es am
Tisch herausfinden muss. 1.1.0 ergänzte neun natürliche Symbole, damit neben dem gebauten auch der
gefundene Ort bedient ist.

**1.2.0 legt 43 Assets nach (41 → 84), und der Anlass war eine Messung, kein Geschmack.** Von den
40 `(art, schlagwort)`-Anfragen, die `grundriss`, `hoehle` und `siedlung` tatsächlich an das Paket
stellen, hatten **26 genau einen** Kandidaten. `r.waehle` über eine einelementige Liste ist eine
Konstante und keine Wahl: jede Halle bekam denselben Tisch, jede Kammer dasselbe Bett, jede Tür
dasselbe Blatt. Nachgelegt sind darum

- **Gegenstände** — Waffenständer, Rüstungsständer, Schildwand, Waffenhaufen, Schleifstein,
  Münzhaufen, Bücherstapel, Schriftrollen sowie Flasche, Phiole, Amphore, Kessel, Weinschlauch und
  Kelch. Ohne Schemamigration: `gefaess` heisst wörtlich Gefäss, und `moebel` heisst in diesem
  Paket seit `amboss` „Ding, das im Raum steht". Eine zehnte `art` zu erfinden hiesse die
  irreversible Schicht für eine Frage der Ablage anzufassen.
- **Zweite Antworten** auf die dünnsten Anfragen — Ziegel-, Mosaik-, Sand- und Altdielenboden,
  Steintür, Wendeltreppe, Säulenstumpf, Brunnen, Statue, Wandkette, Wandfackel, Laterne,
  Kandelaber. Nicht auf `marke/eingang`: eine Eingangsmarke ist eine Aussage, keine
  Geschmacksfrage, und Vielfalt gehört auf Möbel und Böden, nicht auf ein Symbol, das etwas
  Bestimmtes behauptet.
- **Die beiden leeren Arten.** `ASSET_ARTEN` deklarierte `wand` und `figur` seit dem ersten Tag,
  `EBENE` in `kartenwerk.ts` hielt ihnen die Ebenen 25 und 5 frei, und das Paket hatte von
  beiden **null**. Jetzt fünf Wandsegmente und sechs Figurenmarken. Die Wände sind Handsatz: der
  Erzeuger liefert Wände weiter als Geometrie, wie `AUSGELASSEN_BASIS` es zusagt.

Jedes neue Stück trägt mindestens ein Schlagwort, das ohnehin abgefragt wird — ein Asset, das keine
Anfrage erreicht, ist totes Gewicht. Waffen, Rüstung und Schilde bekamen zusätzlich einen Ort:
das Thema `waffenkammer` in [`packages/forge/src/grundriss.ts`](../packages/forge/src/grundriss.ts).

`pk.atlas` ist das erste Paket für die Karte, auf die man **hinunter**sieht statt auf ihr zu
stehen: Gelände, Landmarken, Siedlungen und Kartenmarken als Pictogramme im Massstab eines
Tagesmarschs. Es füllt eine gemessene Lücke — `forge/src/azgaar.ts` und `forge/src/eron-map.ts`
liefern beide `stamps: []`, die Weltkarte hatte Regionen, Orte und **kein einziges Symbol**. Ein
eigenes Paket statt weiterer Zeilen in `pk.grundriss`, weil die beiden verschiedene Fragen
beantworten: ein Grundrisssymbol ist im Massstab eines Menschen gezeichnet, ein Atlassymbol im
Massstab einer Landschaft. Unter einer Id wäre `Stamp.a` mehrdeutig über den Massstab, und
`zellgroesse` löge eines von beiden an.

`pk.gemalt` ist die **gemalte Schwester von `pk.grundriss`**: gleiche Namen, gleiche Footprints,
andere Hand. Weil `Stamp.a` paketqualifiziert ist, ist der Stilwechsel ein Tausch der Paket-Id und
sonst nichts — `pk.grundriss/truhe` und `pk.gemalt/truhe` sind dieselbe Truhe an derselben Stelle.
Die Tusche bleibt richtig, wo ein Symbol bei 16 px lesbar sein muss (Übersichtskarte, Legende,
Auswahlliste); gemalt ist richtig, wo man auf den Tisch zoomt.

Der Look kommt aus drei Mitteln, die das Assetgate ausdrücklich erlaubt — verboten ist `url(`
**ohne** `#`, also jeder Abruf nach draussen, nicht der Verweis in dieselbe Datei:

- **Verlauf** für die Form (Wölbung eines Fasses, Tiefe einer Grube),
- **`feTurbulence`** für das Korn — das ist der ganze Unterschied zwischen „Fläche in Steinfarbe"
  und „gemalter Stein",
- **weiche dunkle Fugen plus Lichtkante oben links** für Dicke.

Die Malgriffe stehen in [`tools/assets/pinsel.mjs`](../tools/assets/pinsel.mjs).

**Ein Stilpaket ist ein Paket oder es ist Dekoration.** Die Generatoren nennen nie ein Asset beim
Namen; sie fragen nach einer `art` mit einem `schlagwort`. Ein Stilpaket, das eine dieser
Anfragen nicht beantwortet, erzeugt leise eine Karte mit Löchern. `pk.gemalt` 1.0.0 bediente
gemessen **34 von 47** Anfragen; 1.1.0 bedient alle. Bewiesen wird das nicht durch Zählen, sondern
indem [`packages/forge/test/stiltausch.test.ts`](../packages/forge/test/stiltausch.test.ts) mit
jedem Stilpaket **echte Karten erzeugt** und `bericht.nichtBedient` gegen `[]` prüft.

Ein Nachtrag, den derselbe Test erzwungen hat: der Stiltausch ist **keine Umlackierung**. Die
Paketidentität geht in den `Weltkeim` ein, der Keim sät den Zufall — dieselbe Anfrage gegen ein
anderes Stilpaket ergibt also ein anderes *Layout*, nicht dieselbe Karte in anderer Farbe. Der
Stil ist eine Entscheidung beim Erzeugen, nicht danach.

**Warum Vektor und nicht gemalte Rasterbilder.** Unter [`assets/generated/painted-dungeon-v1/`](generated/painted-dungeon-v1/)
liegen drei sehr gute, mit einem Bildmodell erzeugte PNGs. Ihr eigenes README nennt den Grund,
warum sie nicht als Paket registriert sind: *"Distribution grant: pending the project's licensing
decision."* Der Paketvertrag verlangt pro Asset eine auflösbare Lizenz mit **gehashtem Text**
(RB-21d §6.1), und `herkunft: "eigen"` heisst „in diesem Repository erzeugt". Ein Paket aus einem
Fremdwerkzeug mit offener Rechtelage kann beides nicht behaupten. `pk.gemalt` erzeugt denselben
Eindruck aus Funktionen, die hier stehen: reproduzierbar unter `--pruefe`, CC0 ohne Vorbehalt,
auflösungsfrei statt auf 1254 px festgenagelt — und über alle Assets hinweg **konsistent**, was
bei einzeln erzeugten Bildern die eigentliche Schwierigkeit ist.

Die drei PNGs bleiben, wo sie sind, und dienen als Stilvorlage. Sobald die Lizenzfrage entschieden
ist, ist ihre Registrierung eine eigene Entscheidung, kein Nebeneffekt dieses Pakets.

Alle drei Pakete zeichnen mit derselben Feder: Palette, Rauschen, Striche und die Baumaschinerie
stehen in [`tools/assets/tusche.mjs`](../tools/assets/tusche.mjs). Extrahiert wurde sie, als das
zweite Paket kam, und keinen Tag früher — eine Abstraktion mit einem Nutzer ist Spekulation. Dass
die Extraktion nichts an der Kunst verändert hat, ist kein Versprechen, sondern eine Gate-Zeile:
`pk.grundriss` reproduziert aus der neuen Struktur **bytegleich**.

Der Versionssprung ist kein Formalismus: die Paketidentität steckt im `Weltkeim`-Optionsvektor,
also ist jede aus 1.2.0 erzeugte Karte eine **andere** Karte als dieselbe Anfrage gegen 1.1.0. Genau
das soll passieren — eine andere Assetbasis ist eine andere Karte, kein stiller Austausch.

## Ein fremdes Paket einbinden

Der Vertrag kennt `herkunft: "extern"` seit dem ersten Tag — aber bis hierher konnte nichts so
ein Paket **bauen**, und damit war jede freie Sammlung im Netz praktisch unerreichbar, egal wie
klar ihre Lizenz war. [`tools/assets/importiere-fremdpaket.mjs`](../tools/assets/importiere-fremdpaket.mjs)
ist der fehlende Weg:

```
node tools/assets/importiere-fremdpaket.mjs \
  --quelle .local/kenney-scribble-dungeon \
  --id pk.kenney.kritzel --titel "Scribble Dungeon" --urheber "Kenney" \
  --spdx CC0-1.0 --herkunft-url https://kenney.nl/assets/scribble-dungeons \
  --lizenz .local/kenney-scribble-dungeon/License.txt --art aufbau
npm run gate:assets
```

Es **weigert sich** ohne mitgelieferten Lizenztext, ohne benannte Quelle und bei einer Quelladresse
mit Zugangsdaten — das sind die drei Zusagen, die fremde Herkunft überhaupt tragbar machen, und
[`tools/test/importiere-fremdpaket.test.mjs`](../tools/test/importiere-fremdpaket.test.mjs) prüft
jede einzeln. Abmessungen werden **gemessen**, nicht geglaubt: aus dem PNG-Kopf und aus der
SVG-`viewBox`. Seit 1.2.0 rechnet auch das Gate die PNG-Abmessungen gegen das Manifest nach; ein
Paket, das seine eigene Grösse falsch angibt, zeichnet der Renderer falsch skaliert, und das fällt
am Tisch auf statt im Diff.

Was das Skript ausdrücklich **nicht** tut: es lädt nichts herunter und es prüft keine Rechte. Die
Rechteprüfung bleibt eine menschliche Entscheidung; das Werkzeug hält nur fest, was entschieden
wurde, und macht die Entscheidung nachrechenbar.

### Quellen, die den Vertrag erfüllen

Geprüft im September 2026. **CC0 ist der einfache Fall**: keine Namensnennung, keine Bedingung, der
Lizenztext ist die CC0-Urkunde selbst.

| Quelle | Lizenz | Namensnennung | Anmerkung |
|---|---|---|---|
| [Kenney](https://kenney.nl/assets) | CC0 1.0 | nicht nötig | Eigene Aussage: *"all game assets on the asset pages are public domain licensed (CC0). You're free to use them, even in commercial projects."* Über 60 000 Assets, darunter Top-down-Kacheln. |
| [OpenGameArt, CC0-Sammlungen](https://opengameart.org/content/cc0-tiles-tilesets) | CC0 1.0 | nicht nötig | **Pro Einreichung prüfen.** OGA mischt Lizenzen; die Sammelseiten führen nur CC0-Einträge, aber die Lizenz steht am einzelnen Werk. |
| [game-icons.net](https://game-icons.net/) | CC BY 3.0 | **erforderlich** | Über 4 100 SVG-Symbole. Die Namensnennung ist im Format darstellbar (`lizenz.inhaber`, `lizenz.quelle`) — aber es gibt in der Anwendung **noch keine Stelle, die Credits anzeigt**. Bis es sie gibt, ist CC-BY hier nicht erfüllbar. |

Die dritte Zeile ist der Grund, warum diese Tabelle in dieser Datei steht und nicht in einem Ticket:
ein Paket einzubinden, dessen Bedingung die Anwendung nicht erfüllen kann, ist genau die RB-21c-Lage
in klein. Der Importeur kann CC-BY-Pakete bauen; ausliefern darf man sie erst, wenn die Credits
irgendwo stehen.

## Ein Paket ändern

Generierte Pakete werden nie von Hand editiert:

```
npm run assets:erzeugen     # schreibt SVGs und Manifeste aller Pakete neu
npm run gate:assets         # prüft Bytes, Lizenzen, SVG-Sicherheit und Reproduzierbarkeit
```

**Ein neues Asset wird angeschaut, bevor es als fertig gilt** — gerendert, nicht im Quelltext
gelesen, und kachelbare Böden zusätzlich 4×4 nebeneinander. Das ist keine Kür: dieser Durchgang
hat so drei Fehler gefunden, die alle Gates passiert hatten. Ein `<rect width="-1">`, das der
Browser wortlos verwirft; ein `baseFrequency="NaN"`, das den ganzen Filter fallen liess, sodass
fünf Holz-Assets flach aussahen statt zu fehlen; und zwei Assets mit derselben `id="woelbung"`,
von denen das zweite in einem gemeinsamen Dokument die Maserung des ersten bekam. Die ersten
beiden fängt das Gate jetzt ab, die dritte ist durch ein Namenspräfix je Asset ausgeschlossen.

Ein geändertes Asset ändert seinen sha256, damit die Paketversion und damit — weil die
Paketidentität Teil des `Weltkeim`-Optionsvektors ist — **jede daraus erzeugte Karte**. Das ist
gewollt: eine andere Assetbasis ist eine andere Karte, kein stiller Austausch unter derselben Id.
