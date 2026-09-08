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

Umsetzung und Prüfergebnisse werden nach tatsächlichem Lauf ergänzt.
