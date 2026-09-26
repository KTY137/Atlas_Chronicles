<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->

# Atlas-Look im Produkt — 2026-09-26

Zweig `feature/kartenlook`, Spec `docs/superpowers/specs/2026-09-26-atlas-look-design.md`.

## Befund, der den Anfang gemacht hat

Spieler sehen am Tisch nur Serverkacheln. Die trugen in Innenräumen nur den Boden: Wände, Türen und
Möbel zeichnete ausschließlich der Live-Renderer der Spielleitung. Die neuen Häuser mit Keller,
Erdgeschoss und Obergeschoss wären für die Runde leere Grundrisse gewesen.

## Was jetzt gezeichnet wird

- **Einrichtung in den Spielerkacheln** (`tactical-overlay.ts`, `tactical-sprites.ts`):
  - Stempel und Raumwände kommen in die Kachel. Die Sichtmaske beschneidet sie wie den Boden.
  - Paket-Assets werden einmal zu Bitmaps gerastert, in doppelter Eigengröße und mit sha256 gegen
    das Manifest geprüft.
  - Eine SVG muss reine Zeichnung sein. Die Regel steht jetzt einmal in `szene/svg-zeichnung.ts` und
    gilt für Gate und Server.
  - Eingesetzt wird in reinem JS (Drehung, Maßstab, Mipmaps, Möbelschatten, Mondlicht). Nie geht
    ein zusammengesetztes SVG an libvips.
  - Marken, Figuren und Stücke mit `verborgen`, `geheim` oder `falle` bleiben draußen.
  - `rasterDigest` folgt nur dem, was Spieler sehen können.
- **Atlas-Runde über Ortskarten** (`tactical-atlas.ts`): Die Pixelrunde der Entwürfe läuft je Kachel
  mit Rand.
  - Wasser nach Tiefe, mit Kräusel, Schaum und Glanz.
  - Pflaster je Setting:
    - Fantasy: Kopfstein.
    - Gegenwart: Asphalt mit Gehweg, Bordstein und Mittellinie, nur auf Straßen; Plätze bekommen
      Platten.
    - Sci-Fi: Platten mit Leuchtkante.
  - Kontaktschatten an Hausfüßen, Ufersaum, Bodenfleckung.
  - Schlagschatten aus einer Lichtrichtung, von Häusern, Mauern und Brückendecks. Wälder haben eine
    eigene, weiche Schicht.
  - Brücken bleiben Deck.
  - Farben wirken relativ zum Grundbild, also bleiben Nacht und Winter die der Projektion.
  - Beim Herauszoomen bleiben Wasser und Schatten, nur Kleinmuster (unter sechs Pixeln je Zelle)
    und Straßenlinien (unter zehn) fallen weg.
- **Innenräume** (`paintInnen`):
  - Der Boden dunkelt zum Fuß jeder Wand hin ab und ist leicht gefleckt.
  - Das gilt für Häuser, Verliese und Höhlen.
- **Wer sieht was**:
  - Der Spieltisch zeigt auch der Leitung die Kacheln. Ihre Möbel, Wände, Namen und Treppen
    zeichnet Pixi darüber.
  - Die Unterkarten-Ansicht der Leitung holt fertige Atlas-Kacheln; der Kartenbau bleibt flach und
    schnell.
  - Treppen heißen überall gleich: „Treppe hinauf: Obergeschoss".
- **Hausgenerator**: Teppiche und Läufer liegen auf Ebene −50, unter allen Möbeln und ohne Schatten.
- Die Version `atlas-2` steht im Digest jeder Kachel.

## Bilder angesehen

Stadtbilder aller drei Settings, jeweils flach und mit Atlas-Runde, am Probedorf „Fluss". Gefunden
und behoben:

- Brücken wurden wie Wasser eingefärbt.
- Waldschatten fielen treppig und als Balken über Bäche.
- Plätze bekamen weiße Gehweg-Winkel und eine Mittellinie.
- Die Probe fand außerdem einen echten Fehler: Das Arbeitsbudget der Auflage zählte Möbel außerhalb
  der Kachel mit (negative Breite mal negative Höhe ergab eine positive Fläche). Eine eingerichtete
  Taverne sprengte so das Budget. Möbel außerhalb der Kachel kosten jetzt nichts; ein Test mit
  19.000 fernen Stücken sichert das ab.
- Spielerkachel der Taverne (Erdgeschoss) angesehen: Tische, Stühle, Theke, Kamin, Treppe,
  Fenster, Türen, Wände, Möbelschatten und Wandsaum sind da.
- Herausgezoomt: Die Straßen sind ruhig, Wasser und Schatten bleiben.

## Grün gesehen

- Server:
  - `tactical-overlay` 8/8.
  - `tactical`, `tactical-raster`, `tactical-integration`, `tactical-v3-review`: grün.
  - `betreten`, `session-floors`, `grundriss`: 43/43.
  - `map-settings`, `map-workshop`, `map-floors-fog`: grün. Der Archivtest lief unter Last über
    sein festes 30-s-Limit und allein in 15,9 s grün.
- forge: `haus` 10/10.
- Client: `map-workshop-review`, `sprache-P4`, `sprache-P5`, `tactical-drafts-review`,
  `tactical-entities-review`: grün.
- Typprüfung, Client-Build und `gate:sprache` grün.

Nicht gelaufen: keine volle Suite, kein e2e-Lauf, kein Desktop-Smoke. `gate-assets` läuft im
Hauptcheckout nach dem Zusammenführen.
