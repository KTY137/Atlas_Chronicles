# Freier Kartenbau, Innenräume und Standortwahl

Auftrag: vollständiger Rework des Kartenbaus. Nutzerentscheidung: freies Bauen wie
Inkarnate/Dungeondraft mit einfachen Raum- und Gebäudevorlagen; Orte gezielt in
Bergen, am Fluss, Meer usw. ansiedeln.

## Recherche und Runde 1

Primärquellen (2026-09-08): https://inkarnate.com/ beschreibt Linien/Formen,
texturierte Räume und Objektkatalog; https://dungeondraft.net/ beschreibt intuitive
Werkzeuge, Landschaftsmalen und schnelle Arbeitsabläufe. Keine Behauptung einer
vollständigen Produktparität oder Übernahme fremder Assets.

1. Nur Generatorregler und mehr Assets: verworfen. Räume/Wände/Türen bleiben kaum
   bearbeitbar, jeder weitere Generatorlauf ersetzt die Absicht des Nutzers.
2. Ausschließlich feste Landschaftskacheln: verworfen nach Nutzerentscheidung.
   Leicht zu beginnen, aber zu eng für individuelle Innenräume.
3. Gemeinsamer freier Editor mit Vorlagen, direktem Zeichnen und echter
   Standortgeometrie: angenommen und nach Integritätsprüfung präzisiert.

## Angriff und Runde 2

Unabhängige Codeprüfung: bisher nur select/terrain/road/building; Siedlung v5
erzeugt immer einen Fluss. Räume, Wandgeometrie, Türbilder und Bodenstamps sind
getrennt. Geometrisches Raten der Eigentümerschaft würde beim Verschieben fremde
Einrichtung oder angrenzende Räume verändern. Bloßes Verschieben der Region
würde hingegen Wände und Türen zurücklassen.

Entscheidung: TacticalMapDocumentV1 bleibt einzige Geometriequelle. Raumgruppen
erhalten explizite optionale Referenzen in der bestehenden Kartografie. Alte
Dokumente und ihre Hashes bleiben unverändert; strikte Leser verweigern unbekannte
Profile statt Daten zu verlieren. Generatoren schreiben Beziehungen an ihrer
Quelle. Keine stille Übernahme geometrisch geratener Beziehungen bei Altkarten.
Geteilte Wände/Türen müssen bei Transformationen ausdrücklich geschützt sein.
Neue Räume erhalten Boden, Wände und optionale Einrichtung atomar. Änderungen
bleiben in derselben Revision mit Undo/Redo, Berechtigungs- und Versionsprüfung.

## Umsetzung

- Innenraumwerkzeuge: Raum aufziehen, Vorlagen, Wand ziehen, Tür an Wand setzen,
  Auswahl bewegen/drehen/löschen, explizite Eigentümerschaft berücksichtigen.
- Editor: Werkzeugleiste, kontextuelle Einstellungen, neben der Karte erreichbarer
  Einrichtungskatalog, direkte Übernahme einer fertigen Geste mit Undo, optionaler
  bestätigter Vorschau; Einrasten, Tastaturkürzel und mobile Erreichbarkeit.
- Standort: Ebene, Wald, Gebirge, Fluss, See, Küste und Insel als deterministische
  Generierungsoptionen; Wasser/Fels beeinflussen tatsächliche Bauflächen.
- Verifikation: Vertrags-/Geometrieregessionen, Speichern/Reload, native Daten,
  echte Browsergesten, schmale Ansicht, Grenzen/Version/Assets/Typecheck/Build.

Koordination: vorhandener LangGraph StateGraph, Modus `map-studio`, lokaler
SQLite-Checkpointer, LangGraph 1.2.11, Tracing aus. Knoten komponieren;
Workspace-Tools führen Effekte aus. Keine externen Veröffentlichungen.

## Nachweise

Stand `dcbf449` („new version", 2026-09-08 15:45) plus Reparatur vom selben Nachmittag.
Der Codex-Thread brach vor seiner Abschlussprüfung ab; der committete Stand war nicht
übersetzbar (`interior-edit.ts`: `along` im Türzweig zweimal deklariert, einmal als
Mittelpunkt auf der Wand, einmal als Projektion auf die Türachse). Die Zahl heißt jetzt
`center`; Typecheck und die beiden davon abhängigen Suiten sind wieder grün.

- Forge: `interior-edit` 12 Fälle (Raum mit Wänden/Einrichtung, Tür schneidet jede
  deckungsgleiche Wand, Verschieben mit Kindidentität, geteilte Wände geschützt, L-Form,
  Grenzen), `siedlung-standort` 15 Fälle, `cartography-edit`, `siedlung-cartography`.
- Server: `map-studio` 5 Fälle (V3-Revision mit Raumidentitäten, Native-Archiv, Spieler
  abgewiesen, Replay unter alter Revision), `map-standort` 8, `map-settings` 9.
- Client/Render/Szene: `map-location` 9 Fälle (sieben Standorte sichtbar vor den
  Feineinstellungen), `stamp-hit`, `cartography`, `map-generation`, `map-edit-history`.
- Echter Browser (`e2e/map-studio.spec.ts`, 2/2): Raum aufziehen, speichern, Tür an die
  Wand, Möbel aus `pk.gemalt` platzieren, per Auswahl verschieben, Raum mit Tür und Möbel
  verschieben, Rückgängig/Wiederholen, speichern, neu laden — Raum-, Tür- und Möbel-IDs
  bleiben dieselben; schmale Ansicht ohne horizontales Scrollen; Gebirge und Insel
  rendern. Die Spec adressierte die Katalogfelder mit `getByLabel`, das beim umschließenden
  `<label>` die Optionstexte mitliest; jetzt `getByRole("combobox")` wie in den
  Schwester-Specs.
- Regressionen des Commits in bestehenden Suiten: `mapDocumentScene` zeichnet Türen und
  liest `document.portals`; drei Test-Fixtures ohne `portals` ergänzt. Der Renderer meldet
  beim Drag-Start zusätzlich die getroffene Stempel-ID; der Lifecycle-Test erwartet das
  dritte Argument.
- Konsumenten des Editors im echten Browser (`map-editor-cartography`, `map-context-menu`,
  `map-workshop`, `siedlung-workshop` mobil): grün. Die Gesten-Spec prüft den bestätigten
  Vorschau-Pfad und freie Platzierung; seit diesem Umbau sind direkte Übernahme und
  Einrasten Standard, die Spec schaltet beides vorher ab. Der Fokus-Fall des
  Kontextmenüs fiel nur unter paralleler Last, allein 2/2 grün.
- Unabhängiger Korrektheits-Review des Umbaus fand einen echten Fehler: die
  Stempel-Trefferprüfung (`render/src/stamp-hit.ts`) entschied Gleichstände in derselben
  Ebene nach Array-Reihenfolge, das Zeichnen sortiert nach Ebene und ID. Bei zwei
  überlappenden Möbeln derselben Ebene wurde das verdeckte gewählt. Behoben; neuer Fall
  war gegen die alte Implementierung rot.
- Gates: Typecheck, Produktionsbuild, Version, Paketgrenzen grün.

Offen und nicht behauptet: neun Fälle in `client/test/tactical-entities-review.test.ts`
waren schon vor diesem Umbau rot (Harness erwartet `MapEditor` in
`TacticalPreparation.tsx` und prüft Bedienelemente des alten Editors wie „Region
zeichnen"); sie brauchen eine Neuschreibung gegen den neuen Editor. Ebenfalls schon am
Elterncommit `8350764` rot, im Integrations-Worktree gegengeprüft: `e2e/genre-assets`
und `e2e/map-settings` erwarten den Objektkatalog direkt nach „Karte bearbeiten", der
Abschnitt ist aber zugeklappt, bis „Möbel & Objekte" gedrückt wird; `e2e/siedlung-workshop`
erwartet eine Auswahl „Szenenkarte", die es im Client nicht mehr gibt. Desktop-Paket und
Installation stehen auf `ca3898b`, nicht auf diesem Stand. PDF-Parität ist nicht geprüft.

## Gemalte Landschaft, Kartenzier und Wasserart — 2026-09-08 abends

Kayas Auftrag: Kartenerzeugung und Karteneditor weiter Richtung Inkarnate/WorldAnvil
und Dorfromantik entwickeln. Drei Pakete, alle innerhalb der vorhandenen Architektur.

**1. Gemalte Landschaft** (`szene/src/cartography-projection.ts`, `rendererVersion`
`cartography-6` → `cartography-7`, damit jeder Rasterschlüssel neu zieht).

- Die Kantenschau `waterBanks` heißt jetzt `regionBanks` und wird für jede Materialgruppe
  benutzt, nicht nur für Wasser. Das ist der tragende Punkt: der Generator zerlegt einen
  Wald, ein Massiv oder einen See in viele Polygone, und nur die äußere Silhouette der
  Gruppe ist eine echte Kante. Ein Saum je Polygon hätte die Tessellierung als Netz von
  Nähten sichtbar gemacht — derselbe Fehler, den der vorhandene Kommentar bei den
  Wasserkräuseln beschreibt.
- Fels wird gezeichnetes Relief: Gipfel mit Licht- und Schattenflanke, Schlagschatten,
  Tuschesilhouette, Firstlinie und Schneekappe auf den hohen. Größe, Ton und Schultern
  variieren je Gipfel; ein grobes zweites Gitter hebt ganze Schultern des Zugs an, damit
  Gipfel sich zu Kämmen gruppieren. Dazu ein heller Schuttsaum entlang der Gruppenkante.
- See und Meer bekommen den gezeichneten Halo (drei nach außen abklingende Uferlinien)
  und einen Flachwassersaum nach innen. Ein Fluss bekommt beides nicht: seine zwei Ufer
  liegen zu nah beieinander, die Halos würden zu einem Schmier verlaufen. Stehendes
  Wasser trägt die doppelte Welle, der Fluss die einfache Kräusel.
- Offener Boden bekommt Textur: drei gezeichnete Halme auf Wiese, Kiesel auf Erde,
  Dünenstriche auf Sand — abgetastet von **einem globalen Gitter**, aus demselben Grund
  wie die Kräusel. Feldergruppen bekommen eine Hecke entlang ihrer Außenkante.

**2. Kartenzier** (`render/src/renderer.ts`). Kompassrose und Maßstabsleiste als
Bildschirm-Beiwerk in einem eigenen Container `chrome`, nicht als Polygone der Zeichnung:
`validateMapScene` lässt in `drawing.polygons` nur Regionen zu, die es in der Szene
wirklich gibt (`geometry.ts:138`), und ein erfundenes `regionId` wäre genau der Griff an
der Wissensmaske vorbei. Die Zier erscheint nur, wenn die Szene tatsächlich eine
Kartografie-Zeichnung trägt; Kampfkarten ohne Zeichnung bleiben frei. Der Maßstab zählt
in Rasterfeldern (Hex über den Inkreis-Abstand) und wählt eine runde Zahl, die zwischen
60 und 260 Bildschirmpunkten landet; ohne Raster zählt er Bildpunkte. Rose und Leiste
werden nur neu gezeichnet, wenn Sichtfenster bzw. Beschriftung sich ändern — sonst
entstünde ein Dutzend Pfade je Kameraschritt für ein Stück Papier, das stillsteht.
Die Ebenen `geography` und `chrome` tragen jetzt Pixis eigenes `label`.

**3. Wasserart im Editor.** `CartographyEditOperation` „terrain" trägt zusätzlich
`water?: CartographyWaterMaterial`. Bisher wurde jedes gemalte Gewässer als `river`
eingetragen, ein See ließ sich also nicht malen. Die Ergänzung ist additiv: fehlt sie,
bleibt es ein Fluss. Die Modulnachbarschaft ändert sich nicht — für den Musterlöser ist
Wasser Wasser. In der Oberfläche erscheint beim Werkzeug „Gelände" mit Material „Wasser"
eine Auswahl Fluss / See / Meer, jede mit einem Satz Klartext dazu.

### Nachweise

- Neu und gegen Mutationen geprüft (jede Mutation genau vom zuständigen Fall gefangen):
  `szene/test/cartography-projection.test.ts` 10/10 — Relief über die **ganze** Ausdehnung
  (die Obergrenze weitet jetzt das Gitter, statt Zeilen abzuschneiden; die abgeschnittene
  Fassung ließ die untere Hälfte eines hohen Massivs kahl), Gruppensilhouette statt Naht
  zwischen zwei Felspolygonen, Halo nur bei stehendem Wasser, globales Gitter für die
  Bodentextur (eine neu zerlegte Wiese darf keinen Halm verschieben).
  `forge/test/cartography-edit.test.ts` 21/21 — gemalte Wasserart landet in der Karte,
  fehlende bleibt `river`, unbekannte wird abgewiesen statt eingetragen.
  `render/test/renderer-lifecycle.test.ts` 30/30 — Zier liegt außerhalb der Weltebene,
  fehlt ohne Zeichnung, Maßstabsbeschriftung folgt dem Zoom.
- Der vorhandene Fall „submits shared ordered polygon colors" prüfte Füllungen und Striche
  über die ganze Bühne. Er ist jetzt auf die Ebene `geography` geschärft: Kartenzier kann
  eine Aussage über die eingereichte Kartografie weder erfüllen noch brechen.
- Gezielt gegengeprüft: 26 Dateien, 348 Fälle grün (szene, forge, render, server-Raster,
  `client/test/tactical-entities-review.test.ts`).
- **Echte Browser-Specs, nachgereicht:** `e2e/map-studio.spec.ts` und
  `e2e/map-editor-cartography.spec.ts` zusammen **5/5 grün** — allerdings nur mit den beiden
  Korrekturen von `project-atlas-54` (Locale-Pin und statt `import.meta.glob` eine feste
  Dateiliste), die ich zur Gegenprobe vorübergehend lokal gesetzt und danach exakt
  zurückgenommen habe (`git checkout` auf `i18n.ts`, temporäre Konfiguration gelöscht,
  Arbeitsbaum unverändert bei denselben zwölf Dateien). Die Locale-Zeile allein **reicht auf
  diesem Stand nicht**: ohne den i18n-Teil mountet die Seite weiterhin nicht.
- Dieser Studio-Screenshot deckte einen Fehler auf, den kein Unit-Test hatte: die
  Maßstabsleiste schrieb „10 Bildpunkte" unter einen Balken, der 1.000 Kartenpixel misst.
  Ohne Raster zählen die Stufen Hundert-Pixel-Einheiten, die Beschriftung nannte aber die
  Stufe. Zweiter Fall derselben Sorte im selben Code: die gezeichnete Länge war auf 260
  Bildschirmpunkte gekappt, die Beschriftung nicht — der Balken log über seine eigene Länge.
  Beides behoben (die größte runde Stufe, die wirklich passt, wird gewählt und exakt so
  gezeichnet), mit Fall und Mutationsprobe. Im Studio steht jetzt „1.000 Bildpunkte".
- Eigener Renderer-Pfad: der Renderer wurde in Edge 152 mit **pixi-webgl** gegen eine echt
  erzeugte Gebirgssiedlung montiert und abgelichtet; Kompassrose, Maßstabsleiste
  („5 Felder"), Relief, Bodentextur und Waldkronen sind im Bild. Laufzeit von
  `cartographyDraw` an denselben drei Zellgrößen wie der Galerietest gemessen:
  197/187/138 ms gegen 272/217/173 ms vorher, also keine Verlangsamung.
- Gates: Typecheck, Produktionsbuild, `gate:version`, `gate:boundaries` grün.

### Nachgereicht: die Revisionsanzeige in der Überschrift

`project-atlas-54` meldete aus dem Desktop-Smoke, dass die Kartenrevision in der Überschrift
des Kartenstudios fehlt. Selbst nachgeprüft und bestätigt: `git show dcbf449^` zeigt dort
`Kartenrevision {baseline.revision}. …`, seit dem Umbau steht nur noch die Tagline
„Landschaft gestalten. Räume bauen. Geschichten einrichten." Der Wegfall war keine Absicht —
direkt daneben sitzt der Knopf **„Kartenrevision speichern"**, und eine Seite, die zum
Speichern einer Revision auffordert, muss zeigen, welche gerade offen ist. Dazu hing
`desktop/tools/smoke.mjs:162` daran als benutzersichtbarer Beleg, dass ein Speichern
angekommen ist, und lief in einen 30-Sekunden-Timeout.

Zurückgeholt als eigene Zeile unter der Tagline, in Klartext statt der alten Fassung:
„Kartenrevision *n*. Jedes Speichern legt eine neue Fassung an; eine laufende Szene behält die
Fassung, mit der sie begonnen hat." Belegt durch einen Fall in
`client/test/tactical-entities-review.test.ts` (19/19), der die Überschrift als Ganzes prüft —
Revisionsnummer **und** Speicherknopf im selben Block; die Mutation „Zeile wieder entfernt"
fällt darauf. Zusätzlich im echten Browser gegengeprüft: ein Wegwerf-Spec wertete genau das
Prädikat aus `smoke.mjs:162` gegen das laufende Studio aus und bekam `true`; der Smoke findet
seinen Beleg also wieder. Bildschirmfoto der Überschrift gesehen, Spec danach gelöscht.

### Offen und nicht behauptet

- **Vorbestehender Blocker für alle Browser-Specs, nicht von dieser Arbeit — inzwischen von
  `project-atlas-54` auf `experimental/featureliste-20260907` behoben, hier aber noch nicht
  vorhanden:** am unveränderten `1b5b7d1` ist `e2e/map-studio.spec.ts` 2/2 rot, per `git stash`
  gegengeprüft. Die Seite mountet nicht, `body` bleibt `<main id="root"></main>`,
  Browserkonsole `(intermediate value).glob is not a function`. Ursache:
  `client/src/i18n.ts:34-35` nutzt `import.meta.glob` (eine Vite-Transformation), der
  e2e-Wirt `e2e/helpers/map-studio-host.ts` bündelt den Client aber mit esbuild. Der
  Produktionsbuild über Vite ist nicht betroffen. Gemeldet an die Sitzung, der die
  i18n-Fläche gehört; hier dauerhaft nicht angefasst. Sie fand dazu eine zweite Ursache:
  Playwright startet mit englischer Browsersprache, seit dem Sprachpaket folgt die Oberfläche
  dem, und alle deutschen Text-Locator gingen ins Leere; ihre `playwright.config.ts` pinnt
  jetzt `locale: "de-DE"`. **Beide** Korrekturen werden gebraucht — mit nur einer bleiben die
  Specs rot. Solange ihr Stand nicht gemergt ist, laufen die Kartenspecs hier nicht.
- Die drei schweren Fälle in `forge/test/siedlung-cartography.test.ts` bauen je drei bis
  sechs vollständige Städte und liefen schon am Elterncommit ins 5-s-Standardlimit (dort
  sogar 3 rot). Sie tragen jetzt ein ausdrückliches Budget von 30 s, wie der vorhandene
  Präzedenzfall bei den langen Burst-Tests. Kein globales Limit geändert.
- Die Gipfel stehen weiterhin auf einem versetzten Gitter. Echte Kammlinien aus einem
  Skelett des Massivs wären der nächste Schritt und sind hier nicht gemacht.
- PDF-Parität, Desktop-Paket und Installation stehen unverändert auf `ca3898b`.
