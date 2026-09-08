# Kartenwerkstatt und begehbare Städte

Auftrag: Stadtkarten mit einstellbarer Größe und Stil, überarbeitete Erstellung, Editor und Viewer. Präzisierung: anklickbare Gebäude mit bearbeitbaren Namen und Gebäudetypen; eine Kirche führt zu einem Kircheninneren, ein Haus zu einem Wohnhaus.

## Entscheidung

1. Adoptieren: den vorhandenen Siedlungsgenerator durch dieselben HTTP-, Persistenz- und Nested-Map-Pfade wie Grundrisse führen. Gebäudemetadaten bleiben am vorhandenen Knoten, Karteninhalt bleibt TacticalMapDocumentV1. Namen sind Knoten.titel; optionales bauwerk trägt typ und beschreibung. Native Bundle-Validierung wird ausdrücklich erweitert.
2. Verworfen: nur Größen- und Farbregler. Das behebt weder die fehlende Siedlungsroute noch typabhängige Innenräume.
3. Verworfen: neues Kartenformat oder ein zweiter Editor. Bestehende Revisionen, Wissensanker und dauerhafte Unterkarten müssten doppelt verwaltet werden.

## Prüfung vor Bau

Die Siedlung erzeugt bereits Straßen, Parzellen und Bauwerksknoten, ist aber in der Produkterzeugung nicht auswählbar. Betreten erlaubt nur Grundriss oder Höhle. Der Viewer nennt sämtliche Regionen Räume und behandelt dadurch auch Straßen wie potentielle Innenräume. Gebäudetypen und Namen fehlen.

Beibehalten: serverseitige Kindkeime, Autorisierung der Spielleitung, atomare Änderungen, Versionsprüfung und idempotente Befehle. Bearbeitung von Labels und Typen erzeugt vorhandene Unterkarten niemals neu. Keine implizite Wissensvergabe. Vorschauen schreiben keine Karte.

## Arbeitsflächen

- Forge und Vertrag: Gebäudetypen, benannte Stadtgebäude, typabhängige Grundrisse, native Knotenvalidierung und Regressionen.
- Server: Erzeugungsoptionen und Stile, Vorschau mit echtem Dokument, persistente Metadatenbearbeitung, Typweitergabe beim Betreten und Regressionen.
- Oberfläche: Kartenwerkstatt, Vorschau, Größenprofile, Suche und Gebäudeinspektor, Darstellungsregler, Navigation und Browserprüfung.

Arbeitskoordination: lokaler LangGraph StateGraph mit Checkpointer unter `.local/map-rework`, LangGraph `>=1.2,<2`, Tracing aus. Effekte laufen ausschließlich über autorisierte Workspace-Tools.

## Umsetzung und Vertragsprüfung

Die sechs Bauwerkstypen `haus`, `kirche`, `taverne`, `schmiede`, `lager`, `turm` sind browserrein
im Szenenvertrag exportiert. `Knoten.bauwerk` bleibt optional für bestehende Karten; wenn vorhanden,
enthält es ausschließlich `typ` und die höchstens 2.000 Zeichen lange `beschreibung`. Der Name
bleibt `Knoten.titel`. Grundriss v5 nimmt `profil: frei | BauwerkTyp` an; fehlende Altwerte werden
zu `frei`. Die Profile steuern Geometrie, Raumthemen, Titel und Möblierung über dieselbe Boden-,
Wand- und Türmechanik. Siedlung v3 benennt und typisiert Gebäude, ohne Artikel anzulegen.

Migration 024 löst die pauschale Updatesperre ausschließlich für Namen und Gebäudemetadaten.
Identität, Raumbezüge, Herkunft, Kindkeime und Löschhistorie bleiben geschützt. Bearbeitung erfolgt
mit Spielleitungsautorisierung, Kartenversionsprüfung und dauerhaftem Befehlsbeleg. Beim ersten
Betreten bestimmt der gespeicherte Gebäudetyp das Grundrissprofil; bestehende Adressen gewinnen
immer vor einer neuen Erzeugung. Native Export-/Restore-Prüfungen erhalten diese Beziehungen.

**Im Review geschlossene Vertragsspalte:** Native V6 erlaubt Gebäudemetadaten ausdrücklich als
optionales Feld an Bauwerksknoten; unbekannte Felder oder Typen werden weiterhin abgewiesen.
Die bisherige Betreten-Quittung bleibt eine geschlossene Variante. Metadatenquittungen bilden
eine zweite geschlossene Variante mit `operation: knoten.metadata`, `parentMapId`, `knotenId`
und `version`; geprüft werden gespeicherter Knoten, gleiche Karte und eine Version zwischen 1
und der gespeicherten Kartenversion. `herkunft: null` bleibt für gezeichnete Knoten zulässig. Der
Daten-/Integritätsreview fand keine bestätigten Blocker.

## Aus der Verifikation korrigierte Entscheidungen

**Vektorfläche und Rasterallokation sind verschiedene Budgets.** Die Vorschau konnte eine gültige
Stadt zeigen, deren Speichern der Server unter dem bisherigen pauschalen 16-Millionen-Pixellimit
verweigerte. Das Limit gehört zum Dekodieren und Maskieren eines Hintergrundbildes. Reine
Vektordokumente folgen jetzt dem bestehenden nativen Budget von 144 Millionen Pixeln;
Hintergrundbilder bleiben bei 16 Millionen. Die Oberfläche prüft beide Dimensionen, die
Zellenzahl und das native Pixelbudget vor der Erzeugung. Ein separates Regressionsbeispiel hält
die nicht bearbeitete Dimension am tatsächlichen Serverdefault fest.

Erzeugung ist über **Atlas → Neue Karte** und **Tisch → Karte & Vorbereitung → Neue Karte**
erreichbar. Vorschau, bearbeitbare Gebäude, Unterkartennavigation und Suche verwenden denselben
Kartenpfad. Ein Verzeichnis im Atlas öffnet auch unabhängig erzeugte Karten nach der Rückkehr
wieder. Gebäude erhalten Dachflächen über den Bodenassets; Raster, Namen und große Ansicht
sind Darstellungsregler. Die Spielleitung sieht diese Assets auch im vollständigen Dokument der
laufenden Szene. Die Spielerprojektion übernimmt weder private Assets noch Gebäudemetadaten;
Rollenwechsel verwerfen den privaten Blick und stoppen dessen Knotenabfragen.

Der bestehende taktische Browsertest erwartete noch einen ID-basierten Exportnamen und ein
festes V4-Paket. Er verwendet jetzt den aktuellen Paketparser und prüft weiterhin Kampagnen-ID,
Importherkunft, Livezustand, Figuren und Wissensanker. Ein beim beschleunigten Mehrbrowserlauf
beobachtetes HTTP 429 beim abschließenden Plan-Lesen wird einmal anhand des Serverheaders
`Retry-After` abgewartet; das Produktionslimit bleibt aktiv.

## Abschließender Nachweisstand

- Erster Gesamtlauf: 168 Dateien, 1.588 Tests grün, 52 übersprungen, zwei Fehler am noch vor
  der Korrektur eingelesenen 16-Millionen-Limit. Die betroffene Datei besteht danach 11/11.
- Abschließende Client-/Renderer-Suite: 30 Dateien, 298 Tests grün; zuletzt ergänzte
  Live-/Rollenregressionen separat 16/16. Version-, Asset- und Boundary-Gates, Typecheck und
  Client-Build sind grün.
- Werkstatt-Browserprüfung und bestehende verschachtelte Navigation: 2/2 grün.
- Taktische Browserprüfungen auf isoliertem PostgreSQL: Asset-Entsorgung bei Sichtentzug
  **41,0 s grün**; abschließender UVTT-/Live-/Native-/Neustart-/Mobilablauf **1,3 min grün**.
  Die zwei Tests liefen getrennt. Nachweise unter `test-results/tactical-final/` (Security)
  und `test-results/tactical-final-verified/` (finaler Hauptablauf). Temporäres PostgreSQL
  danach ordnungsgemäß beendet.

Die lokale Übergabe enthält ausschließlich die Umsetzung und ihre Nachweise. Fremde Änderungen
unter `.claude/worktrees/` gehören nicht dazu. Ein neuer Desktop-Installer ist nicht Bestandteil
dieser Session.
