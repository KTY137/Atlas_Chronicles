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
| `pk.grundriss` 1.1.0 | 41 | CC0-1.0 | vollständig in diesem Repository erzeugt — [`tools/assets/erzeuge-grundrisspaket.mjs`](../tools/assets/erzeuge-grundrisspaket.mjs) |

`pk.grundriss` sind **schematische Grundriss-Symbole in einer Tuschesprache**, lesbar bei 64 px.
Es ist ausdrücklich keine gemalte Battlemap-Kunst; das steht so im Pakettitel, damit niemand es am
Tisch herausfinden muss. Version 1.1.0 ergänzt neun natürliche Symbole (Felsboden, Stalagmit,
Tropfsteinsäule, Felsblock, Pilzgruppe, Wasserlache, Knochenhaufen, Spalte, Lagerfeuer), damit
neben dem gebauten auch der gefundene Ort bedient ist.

Der Versionssprung ist kein Formalismus: die Paketidentität steckt im `Weltkeim`-Optionsvektor,
also ist jede aus 1.1.0 erzeugte Karte eine **andere** Karte als dieselbe Anfrage gegen 1.0.0. Genau
das soll passieren — eine andere Assetbasis ist eine andere Karte, kein stiller Austausch.

## Ein Paket ändern

Generierte Pakete werden nie von Hand editiert:

```
npm run assets:erzeugen     # schreibt SVGs und Manifest neu
npm run gate:assets         # prüft Bytes, Lizenzen, SVG-Sicherheit und Reproduzierbarkeit
```

Ein geändertes Asset ändert seinen sha256, damit die Paketversion und damit — weil die
Paketidentität Teil des `Weltkeim`-Optionsvektors ist — **jede daraus erzeugte Karte**. Das ist
gewollt: eine andere Assetbasis ist eine andere Karte, kein stiller Austausch unter derselben Id.
