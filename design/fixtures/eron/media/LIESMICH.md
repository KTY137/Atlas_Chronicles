# Eron-Bildmaterial — Herkunft, Erlaubnis und Grenzen

**Stand 2026-07-27.** Dieses Verzeichnis existiert auf **ausdrückliche Weisung des Stakeholders**
(Kaya, 2026-07-27: *„können wir auch die map von eron importieren und so?"*). Es steht damit
bewusst in Spannung zu einer Regel, die die Ernte-Beauftragte im übergeordneten
[`../README.md`](../README.md) §5 aufgestellt hat — *„no image from this fixture may be embedded,
downloaded or redistributed; media.json is an inventory for importer design, not an asset library."*

Kaya clarified the permission after this note was written: he and a colleague created Eron, he
states that it is freely accessible and usable, and he authorises its use in this project. The
blanket conflict is therefore resolved for material they control. Per-file provenance remains open
where an upload contains third-party art or a map-tool export.

## Was hier gilt

1. **Projektverwendung freigegeben; Weitergabe bleibt pro Datei prüfbar.** Die Eron-Karten und
   -Porträts dürfen in lokalen Spikes und in der Produktintegration verwendet werden. Vor einem
   öffentlichen kommerziellen Release wird die Zustimmung des Miturhebers im Provenienzpaket
   festgehalten und jedes Drittanbieter-/Werkzeug-Asset einzeln geklärt. Die Oberfläche muss auch
   ohne diese Dateien anständig degradieren.
2. **Provenienz ist dokumentiert, nicht behauptet.** [`manifest.json`](manifest.json) führt je
   Datei: Wiki-Titel, Quell-URL, Uploader, Zeitstempel, gemessene Maße, geliefertes Format.
3. **Lizenz: NICHT ANGEGEBEN.** Keine der 41 Dateien im Quell-Wiki trägt ein Lizenzfeld
   (`LicenseShortName`, `License`, `UsageTerms` sind sämtlich leer). Genau vier haben überhaupt eine
   Lizenzkategorie, darunter je eine `Bildzitat` und `Lizenz unbekannt` — **das Wiki erklärt damit
   selbst, dass ein Teil des Materials nicht von seinen Autoren stammt.** Invariante 7 verlangt
   nachverfolgte Herkunft; nachverfolgt heißt hier: *unbekannt, und als unbekannt markiert*.
4. **Offene Herkunftsfrage, für lokale Nutzung nicht blockierend:** die Andaria-Karten tragen die Signatur
   eines Karten-Editors (wiederkehrende Stempel, gestrichelte Wege — Inkarnate-/Wonderdraft-Klasse).
   **Solche Werkzeuge knüpfen an ihre Exporte eigene Nutzungsbedingungen**, die sich zwischen
   Gratis- und Bezahlstufe unterscheiden und kommerzielle Verwendung betreffen können. Für dieses
   lokale Fixture irrelevant; für alles Ausgelieferte entscheidend. Siehe
   [`RB-20c-kunstpipeline.md`](../../../research/RB-20c-kunstpipeline.md).

## Was hier liegt

| Zweck | Dateien |
| --- | --- |
| **Der Härtefall** | `Andaria_03.02.2024.webp` — 8192 × 8192 = 67,1 MPx, naiv dekodiert **256 MB RAM** |
| Die breite Karte | `Andaria_Karte_Komprimiert.webp` — 8190 × 4835 |
| Die Arbeitskarte | `Karte_von_Andaria.webp` — 2048 × 1310 |
| Gesichter (Tokens) | Bodin · Ormin · Song Kayn · Yal'it · Yunis · Irme · Shromus · Valor Saron |
| Wappen | `Haus_Paradon.webp` |
| **Die Kachelpyramide** | `kachelpyramide/z0..z5` + `pyramide.json` |

## Zwei Befunde, die aus diesem Verzeichnis stammen

**Fandom lügt über das Dateiformat.** Das CDN transkodiert Uploads still nach **WebP** und liefert
sie unter dem ursprünglichen `.jpg`/`.png`-Namen aus. Ein Importer, der der Endung traut, schreibt
falsch etikettierte Dateien. **Format immer aus den Magic Bytes bestimmen, nie aus dem Namen** —
gehört in den Migrationsvertrag (RB-12).

**Die Kachelpyramide ist gebaut und gemessen**, aus der echten 8192²-Karte: 6 Zoomstufen, 256-px-
Kacheln, WebP q82 → **1 365 Kacheln, 9,9 MB, 31,7 s Bauzeit**. Sichtfenster 1920 × 1080 ≈ 32
Kacheln ≈ **8 MB statt 256 MB (Faktor 32)**; erster sichtbarer Pixel **17 KB statt 10,4 MB
(Faktor 616)**. Damit ist ein Kernstück der taktischen Hälfte, die seit Runde 3 bepreist und nie
angefasst wurde, an echtem Material entrisikt.
