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
