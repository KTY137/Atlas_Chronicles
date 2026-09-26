<!-- SPDX-License-Identifier: BUSL-1.1 -->
<!-- Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE. -->

# Atlas-Look im Produkt — Entwurf 2026-09-26

Grundlage sind die Kartenentwürfe (Artefakt „Kartenlook", Runden 1–4) und der Rechercheauszug
`.local/stadt-probe/kartenlook-recherche.md`. Kaya hat auf die Entwürfe mit „zieh durch auf main"
geantwortet. Entscheidungen fallen nach der Regel „entscheide selbst, allgemeinste Option" und
stehen deshalb hier, damit sie sich kippen lassen.

## Ausgangslage

- Die Kartenprojektion (`szene/cartography-projection.ts`, `cartography-13`) liefert **flache
  Farbpolygone**. Der Server rastert sie mit einem eigenen, begrenzten Scanline-Verfahren
  (`server/domain/tactical-raster.ts`). Der Client zeichnet dieselben Polygone mit Pixi.
- Spieler sehen am Tisch nur **Serverkacheln**, maskiert auf die Räume, die sie kennen. Stempel
  (Möbel, Türen) und Wandlinien zeichnet ausschließlich der Live-Renderer der Spielleitung.
- **Folge für Innenräume:** Spieler sehen in Häusern, Höhlen und Verliesen den Boden, aber keine
  Wände, Türen oder Möbel. Die neuen Häuser (Einrichtung mit 36 neuen Möbeln) wären für die Runde
  leer.
- Die Entwürfe zeichnen den Atlas-Look pro Pixel: Distanzfelder je Materialmaske, Wasser mit Tiefe
  und Schaum, Pflaster (Worley), Kontaktschatten, weiche Schlagschatten. Darüber liegen
  Vektorschichten: Dächer im Licht, Baumkronen, Mauern, Namen mit Halo, Rahmen und Kompass.

## Grundsatz: ein Zeichner für das Bild der Runde

Der Server ist der Zeichner dessen, was die Runde sieht. Die Spielerkacheln tragen das ganze Bild
eines bekannten Raums, der Client zeichnet darüber nur Bewegliches (Figuren, Marker, Nebel). Der
Live-Renderer der Spielleitung bleibt das Werkzeug zum Bearbeiten.

## Baustein 1 — Einrichtung in den Spielerkacheln

- `getTile` gibt für Spielerperspektiven eine **Auflage** mit: Stempel (Mitte, Drehung, Maßstab,
  Ebene, Tönung) und, bei Raumkarten, die Wandlinien.
- **Kein SVG an libvips aus Nutzerhand.** Der Grundsatz „Projection is numeric data" bleibt.
  - Nur Paket-Assets werden gerastert: Sie sind per sha256 gepinnt (`packs.readAsset`), vom
    Betreiber installiert und durch `gate-assets` als reine Zeichnung geprüft.
  - Der Server prüft dieselben Verbotsmuster zur Laufzeit noch einmal. Die Regel liegt einmal in
    `szene` und wird vom Gate mitbenutzt.
  - Jedes Asset wird einmal zu einer Bitmap in doppelter Eigengröße gerastert und zwischengespeichert.
- Das Einsetzen in die Kachel geschieht in reinem JS: inverse Abbildung je Zielpixel, bilinear,
  mit Arbeitsbudget und Pausen wie `paintDrawing`.
- Die Darstellung gleicht der der Spielleitung:
  - Weicher Möbelschatten auf gemalten Karten (Ebenen −10..10).
  - Nachtfarbe `0x8a93b3` bei `nacht`, sonst die Stempeltönung.
  - Wände wie im Renderer: Schatten, Körper `0x3b2f25`, heller Grat.
- **Wissen:**
  - Die Auflage entsteht vor der Sichtmaske, alles außerhalb bekannter Räume fällt weg.
  - Marken, Figuren und Stücke mit den Schlagworten `verborgen`, `geheim` oder `falle` kommen
    nie in eine Spielerkachel.
  - Die Spielleitung erhält keine Auflage, bei ihr zeichnet Pixi.
- `rasterDigest` nimmt die Auflage auf, also werden geänderte Möbel zu neuen Kacheln.

## Baustein 2 — Atlas-Look der Städte (nach Baustein 1)

- Neue Zeichnerversion `cartography-14`. Die Pixelrunde der Entwürfe läuft je Kachel mit Rand
  (Distanzfelder brauchen Umgebung):
  - Wasser mit Tiefe, Schaum und Kräusel.
  - Pflaster je Setting: Kopfstein (Worley), Asphalt mit Gehweg, Kolonieplatten.
  - Kontaktschatten an Hausfüßen und Ufersaum.
  - Bodenfleckung.
- Schlagschatten aus einer Lichtrichtung, einmal multipliziert. Dächer zweifarbig nach Licht,
  Baumkronen als Cluster mit Schatten. Namen mit Halo, Rahmen, Kompass, Maßstab.
- Stimmungen: Tag, Abend, Nacht, Winter, Regen.
- Bewegung und Requisiten aus Runde 2/3 sind **nicht** Teil davon; sie folgen als Client-Ebenen.

## Prüfung

- Rasterdienst:
  - Auflage wird gezeichnet.
  - Unbekannte Räume bleiben leer.
  - Budgets und Eingabeprüfung greifen.
  - Ein SVG mit verbotenem Inhalt wird abgewiesen.
- Server: Spielerkachel eines Hauses zeigt Möbelpixel, keine Marken. `rasterDigest` ändert sich,
  wenn ein Möbel bewegt wird.
- Browser: Spielerblick auf die Taverne mit Einrichtung. Bilder ansehen.
