# Kartenstudio Stufe 11 — Optik über Inkarnate hinaus, und das Haus hinter der Tür

Datum 2026-09-10, zweite Runde nach dem Relief. Auftrag (Kaya): „wir wollen noch besser und
krasser werden, lass uns auch visuell Inkarnate und so in den Schatten stellen; guck im Internet
nach, wie map generators/editors aussehen; und lass uns den Bug beheben, dass Unterkarten von
Häusern erst ab der zweiten verschachtelten Unterkarte gut aussehen." Entschieden ohne
Rückfrage (Kayas Vorgabe). Branch `feature/kartenstudio-relief`, aufbauend auf `a7d81b9`.

## 1. Recherche: was die Vorbilder visuell tragen

Gelesen am 2026-09-10 (Websuche und Seitenabruf):

- **Inkarnate** (inkarnate.com/updates, X-Ankündigung): Stile „Parchment" und neu „Parchment
  2.0", Aquarell-Städte, Texturen und Stempel mit Schatten; Export bis 16K. Die Wirkung kommt
  aus Papier, Textur und gestempelten Objekten, nicht aus einem Algorithmus.
- **Azgaar** (GitHub-Wiki Knowledge Base): Höhenlinien aus der Heightmap, Küstenlinie und
  Ozeanzellen, Reliefsymbole in drei Sätzen, Biom-Färbung, Beschriftungen mit Google-Fonts,
  Textur-Overlay per Bild, **Vignette**, Stilvorlagen als JSON.
- **Watabou** (Procgen Arcana News): „the ground is now drawn shaded: sun-facing slopes are
  highlighted and the opposite ones are darkened"; Berge als Kämme statt Einzelgipfel; Flüsse
  „used to look like slightly bent stripes. Now they meander", Nebenflüsse; Dächer „Simple,
  Detailed, Hidden"; gebogene Beschriftungen; Bezirksnamen.
- **Wonderdraft / Dungeondraft** (LegendKeeper-Vergleich, D&D-Beyond-Forum): Wonderdraft
  organisch für Welt und Region, Dungeondraft für Schlachtkarten mit Pfad- und Füllwerkzeugen,
  „irregular shapes and tweakable map generators".

Was davon in eine Polygon-Projektion passt, die überall gleich aussehen muss (Editor, Spieler-
Kacheln, PNG-Export): Papier und Vignette, Küstenstufen, Reliefsymbole, gemischter Wald,
Straßenkanten, Kartusche. Was nicht passt und deshalb nicht gebaut wird: Bildtexturen (der
Renderer darf keine Netzquellen nennen, und Kacheln entstehen serverseitig aus Polygonen),
gebogene Beschriftungen (Maskenentscheidung im Spielerbild steht aus), 30 000 Stempel.

## 2. Der Fehler: Häuser sehen erst ab Ebene 2 gut aus

Reproduziert im echten Browser (Studio-Wirt, `.local/nested-probe/probe.ts`): Haus, Taverne
und Kirche direkt unter der Siedlung, dann ein Raum darunter. Befund im Bild, den kein Test sah:

- **Ebene 1 bekam die freie Grundrissleinwand 40×30.** Ein Bauernhaus wurde zu vier Sälen von
  17×11 Zellen, in jedem ein verlorener Stuhl. Ursache: `GRUNDRISS_STANDARD.zellen` gilt für
  jedes Profil, und weder Client noch `betreten` setzten eine Gebäudegröße.
- **Räume schwebten im Freien.** Das Bauprogramm lässt eine Zellenlücke zwischen den Räumen,
  die Türen standen in der Leere, das Haus hatte keine Außenwand und keine Haustür; die
  Eingangsmarke stand irgendwo im Hauptraum.
- **Ebene 2 ist ein Dungeon** (Streuung, Gänge, Türen) und sah deshalb „richtig" aus.

Entscheidungen:

1. **Größe nach Gebäudetyp** (`BAUWERK_AUSDEHNUNG` in `bauprogramme.ts`, z. B. Haus 14×12,
   Kirche 18×24, Krankenhaus 32×24) als Standard, wenn der Aufruf keine `zellen` nennt.
2. **Größe nach Umriss:** `betreten` misst das Gebäude auf der Stadtkarte (Hüllbox in
   Konstruktionszellen) und skaliert mit 4,5 Innenzellen je Stadtzelle (`bauwerkAusdehnung`),
   begrenzt auf 12..40 × 12..30. Klassische Häuser dürfen auf 75 % ihres Standards schrumpfen;
   ein Programmgebäude (Polizei, Klinik) hat eine feste Raumliste und behält seine volle Größe.
   Eine vom Nutzer gewählte Größe gewinnt immer. Der Server liefert `gebaeude` in den
   Standardwerten, damit die Oberfläche die richtige Größe als Vorgabe zeigt.
3. **Flur statt Lücke:** jede Zelle mit Raum auf beiden Seiten (waagrecht oder senkrecht) wird
   Flurboden, danach die Kreuzungen solcher Flure. **Nicht die Hüllbox** — die Ecken neben dem
   schmalen Altarraum einer Kirche bleiben draußen. Die Außenwand entsteht damit von selbst,
   jede Tür öffnet ins Haus.
4. **Haustür** in der Unterkante des Hauses, möglichst unter der Mitte des Hauptraums; die
   Eingangsmarke steht in der Zelle dahinter. Der Flur trägt den Boden des Hauptraums, nicht den
   feuchten Kerkergang.
5. `GRUNDRISS_VERSION` 7 → 8: eine andere Karte für denselben Keim ist eine Migration.

## 3. Optik-Paket (`cartography-9`)

- **Pergament:** Flecken von einem globalen Gitter (Deckkraft 0,24), zuerst gezeichnet; ein
  Bild als Untergrund bleibt unberührt. **Vignette:** vier Stufen am Rand, zuletzt gezeichnet.
  Beides über `view.paper` abschaltbar (Tests, die breit Polygone zählen).
- **Wassertiefe:** unter dem Meeresspiegel drei Stufen im Linienabstand, je eine Spur dunkler;
  liegt nur dort, wo das Land unter der Wasserlinie liegt. Ein riesiges Meer behält eine Stufe.
- **Hügel:** kleine gezeichnete Kuppen auf Land zwischen Flachland+16 und Felsgrenze−4, dichter
  je höher, auf einem globalen Gitter, nicht auf Feldern.
- **Nadelbäume:** Fichten oberhalb Flachland+36 und ein Fünftel überall; Laubkronen bleiben.
- **Straßen:** Tusche entlang der Außenkante des ganzen Netzes (`regionBanks`), Wege mit zwei
  Radspuren, Straßen und Plätze mit Pflastersteinen von einem globalen Gitter.
- **Reihenfolge:** Boden → Relief (Hügel, Wassertiefe, Tanaka-Linien) → Wald → Fels. Ein
  Hügel unter Kronen verschwindet unter dem Wald, wie er soll.
- **Renderer:** unbemalte Wände (Linien ohne Farbe) als Stein — Schlagschatten nach Südost,
  Körper 11 % der Zelle, heller Saum; farbige Linien (Türen) behalten exakt zwei
  Bildschirmpixel. **Kartusche** mit dem Kartennamen in Serifen im Kartenzier-Container, nur
  auf einer gezeichneten Karte; `scene.title` ist Präsentation und wird geprüft (≤ 200 Zeichen).

## 4. Runde 3 — „richtig sexy" (`cartography-10`, Renderer)

Kayas dritter Auftrag am selben Tag: weiterentwickeln, es soll richtig gut aussehen. Wieder nur
Präsentation, keine Daten geändert; jede Wirkung kommt aus dem, was die Karte schon weiß.

- **Licht** (`scene.lights`, aus `document.lights`): jede Lichtquelle wird zu drei ineinander
  liegenden Pools plus hellem Kern, additiv gemischt, über Boden und Möbeln, unter Wänden und
  Figuren. Kein Sichtsystem, kein Nebel — ein Bild, das die Fackel im Raum zeigt.
- **Möbelschatten** auf gezeichneten Karten: alles auf den Ebenen −10..10 (Aufbauten, Möbel,
  Gefäße, Figuren, Lampen) wirft eine weiche Ellipse nach Südost; Böden (−100), Türen, Wände
  und Marken nicht.
- **Beschriftung in Tusche:** auf einer gezeichneten Karte stehen Ortsnamen kursiv in Serifen,
  dunkle Tusche mit Papiersaum; auf Bildkarten bleibt die helle Beschriftung.
- **Projektion:** Bodenfleckung auf offenem Land (zwei Wiesentöne von einem globalen Gitter,
  vor Relief und Wald, nie unter Fels oder Wald, `openOwner`), Felder als Flickenteppich (jung
  grün, reif gold, gepflügt), Schornstein mit Schatten auf den meisten Dächern, Fels blasser
  zur Höhe (Mittelpunkt des Stücks im Relief).

## 5. Nachweis
Siehe `design/iterations/map-studio-20260910-optik.md`.
