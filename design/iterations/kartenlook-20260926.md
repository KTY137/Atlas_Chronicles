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
  - Beim Herauszoomen bleiben Wasser und Schatten, nur das Kleinmuster fällt unter vier Pixeln je
    Zelle weg.
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
