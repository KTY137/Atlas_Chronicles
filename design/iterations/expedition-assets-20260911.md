# Wildnis und Expeditionen — 2026-09-11

## Auftrag und Entscheidung

Kaya bittet um weitere Assets fuer Atlas Chronicles. Der vorhandene Bestand umfasst bereits
Grundriss, Atlas, Gemalt, Zeitwelten, Genre-Archiv und Natur. Diese Aenderung liefert **24 weitere
SVG-Kartenmotive** als additives Paket `pk.expedition` 1.0.0. Keine vorhandene Paketdatei wird
ueberschrieben; insbesondere bleiben deren Versionen, Referenzen und Weltkeim-Eingaben unveraendert.

Ein eigenes Zusatzpaket statt einer neuen Version von `pk.natur` vermeidet, dass eine kleine
Inhaltserweiterung bestehende Generatoridentitaeten veraendert. Die Zeichnungen sind kompakte
Vektorsymbole mit der unveraenderten Palette aus `tusche.mjs`, keine fotorealistischen Texturen.
Sie sind fuer manuelles Platzieren bestimmt, **kein neuer vollstaendiger Generator-Zeichenstil**.

## Inhalt

- Wald und Ufer: Farnbusch, Wurzelwerk, Dornenranke, Seerosen, Riesenblatt, Lianenbuendel,
  Wacholderbusch und Treibholz.
- Hoehlen und Ruinen: Kristalldruse, Stalagmitengruppe, Felsbogen, Schuttfaecher, Spinnennetz,
  Pilzring, Fossilienskelett und Runenplatte.
- Lager und Ausruestung: Expeditionszelt, Schlafrolle, Reiserucksack, Kochdreibein,
  Vorratsnetz, Brennholzstapel, Kletterseil und Lagerplane.

Alle Motive haben transparente Hintergruende, explizite 1x1-, 2x1-, 1x2- oder 2x2-Footprints,
Mittelanker, Suchschlagworte und paketqualifizierte Referenzen. Sie sind **nicht kachelbar**.
Es werden keine fremden Bilder, Texturen oder Schriftdateien mitgeliefert. Die generierten
Grafiken benutzen den vorhandenen CC0-Lizenzmechanismus samt gehashtem Lizenztext; der Quellcode
behaelt die Repository-Lizenz.

## Einbindung und Benutzung

Im Karteneditor: **Einrichtung & Kartenassets → Assetpaket → pk.expedition**.
Der Versuch, einen lesbaren Namen in `MapArtworkPalette.tsx` hinzuzufuegen, wurde
vom GitHub-Werkzeug blockiert. Diese UI-Datei bleibt deshalb unveraendert; der
bestehende Fallback zeigt die Paket-Id an. Das Manifest traegt den lesbaren Titel.
Die bestehende Server-Paketerkennung scannt den neuen Ordner automatisch. Suche und Kategorien,
Platzierung, Drehen, Skalieren und Speicherung verwenden unveraendert den vorhandenen Weg.
Ohne Settingtag bleiben die Objekte fuer die bestehenden Settingfilter neutral. Das Paket
setzt keine `genre_*`-Tags: die Genre-Anzeige verspricht sonst zwoelf vollstaendige Welten.

```sh
node tools/assets/erzeuge-expeditionspaket.mjs
node tools/assets/erzeuge-expeditionspaket.mjs --pruefe
node --test tools/test/expedition-assets.test.mjs
node tools/assets/expedition-kontaktbogen.mjs
```

Der letzte Befehl schreibt `.local/expedition-assets/galerie.html`: eine offline oeffenbare Galerie
mit Einzel-SVG-Downloads. Galerie und Vorschaubilder gehoeren bewusst nicht in den Paketordner;
dessen Dateien muessen ausnahmslos durch das Manifest gedeckt sein.

`assets:erzeugen` baut auch dieses Paket. `gate:assets` fuehrt die neuen Reproduktions- und
Manipulationspruefungen verpflichtend aus und prueft anschliessend auch dieses Manifest mit dem
vorhandenen kanonischen Parser. Keine zweite Implementierung des Paketformats.

## Pruefnachweise und Grenze

Lokal ausgefuehrt mit Node 22.16.0 und der per Git-Blob-SHA abgeglichenen Originaldatei
`tusche.mjs` (`acc9af6d9e2b5158a8e5279275c5938623fbbd9f`):

- **10/10 Node-Tests**: 24 eigenstaendige Geometrien, Bereichszuordnung, identische Wiederholung
  aller 26 Paketdateien, Hashes/UTF-8-Bytes/Footprints/Anker, CLI-Pruefung und vier negative
  Prueffalle (Manipulation, fehlendes Asset, fehlende Lizenz, verwaiste Datei).
- **24/24 XML-, Hash- und Groessenpruefungen**, **48/48 Rasterisierungen** mit CairoSVG bei
  64 und 128 Pixeln maximaler Kantenlaenge: keine leeren Bilder, transparente Raender auf allen
  Seiten. Ein angeschnittener Seerosenbogen wurde dabei gefunden und vor dem Commit korrigiert.
- Kontaktbogen visuell angesehen; eigenstaendige Geometrien und lesbare Silhouetten bestaetigt.

Geschrieben, aber hier **nicht ausgefuehrt**: drei Vitest-Integrationstests mit `createPacks`,
kanonischem Parser, echten Auslieferungsbytes und Ablehnung nicht deklarierter Pfade.
Der Arbeitscontainer konnte GitHub/npm nicht direkt erreichen; daher kein vollstaendiger
Repository-Checkout mit installierten Abhaengigkeiten, kein Gesamtgate, kein App-Build,
keine Browser-E2E und kein Desktop-Paketlauf. Die abgeglichenen Dateien wurden ueber den
GitHub-Connector gelesen. Das ist ein Asset-PR, kein veroeffentlichter Installer.

Vor Integration: `npm ci && npm run gate`, `npm run build` und den Karteneditor oeffnen:
Paket waehlen, alle 24 Vorschaubilder laden, ein schmales und ein 2x2-Motiv platzieren,
drehen, speichern und nach Neuladen kontrollieren.
