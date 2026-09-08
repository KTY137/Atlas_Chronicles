# Lesbare Karten und direktes Bauen

Stand: 08.09.2026. Nach unabhängigem Daten-/Sichtreview und Root-Prüfung angenommen,
mit den unten genannten verbindlichen Ergänzungen. Noch keine Implementierungsbehauptung.
Autorisiert ist die Umsetzung einer Kartenoptik mindestens auf dem Niveau der untersuchten
Watabou-Beispiele und eines Editors mit dem direkten Bauen und passenden Nachbarn von
Dorfromantik-/WFC-artigen Spielen. Der vorhandene LangGraph `map-visuals` führt Discovery,
Design, Prüfung und Builder zusammen. Dieses Dokument installiert keinen weiteren Runner.

## Ergebnis und Belege

Atlas bekommt vier verständliche Werkzeuge — Auswählen, Gelände, Straßen, Gebäude — auf einer
gemeinsamen, revisionsfähigen Karte. Platzierung zeigt vor dem Übernehmen ein gültiges Ergebnis;
Nachbarn passen wirklich zusammen. Gelungene Orte bleiben erhalten. Rückgängig und Wiederholen
gelten für vollständige Bearbeitungen einschließlich ihrer Referenzen.

Visuelle Grundlage ist [das Recherche-PDF](../../docs/research/map-generation-20260908.pdf),
mit dem lokalen [Quellbericht](../../.local/map-research-20260908/report-source.md).
Tatsächlich angesehen wurden [Watabou City](../../.local/map-research-20260908/images/watabou-city.png),
[Watabou Village](../../.local/map-research-20260908/images/watabou-village.png),
[Atlas Fantasy](../../.local/features-20260908/merged-browser-results/map-workshop-Kartenwerksta-7e35d-and-durable-typed-interiors/painted-city-desktop.png),
die mobile Stadtansicht sowie Atlas Science-Fiction aus demselben Browserlauf.
Die Referenzbilder sind Vergleichsmaterial, keine einzubauenden Spielassets.

Watabou ordnet den Ort durch Verkehrsachsen, kleine zur Straße ausgerichtete Häuser, Wasser,
Felder, Baumgruppen und Freiflächen. Atlas zeigt im geprüften Stand große schiefe Hauspolygone,
dominante Bodenstempel und zahlreiche Hausnamen. Daher sind Geometrie, Materialhierarchie und
Beschriftung gemeinsam zu verbessern. Eine neue Textur allein erfüllt den Auftrag nicht.

Bereits vorhanden und zu erhalten: Settings Fantasy/Gegenwart/Science-Fiction, Gebäudetypen,
passende dauerhafte Innenräume, durchsuchbare Objektpalette, Objektplatzierung und numerische
Transformation, Wissensverknüpfungen, private Entwürfe, Kartenrevisionen und native Sicherungen.

Technische Befunde im untersuchten Worktree:

- `MapEditor` in `TacticalPreparation.tsx` hält Dokument und Anker als Entwurf und speichert
  über `map.revise` mit `expectedVersion`. Ein Undo/Redo für Kartenbearbeitung fehlt.
- `TacticalCanvas.tsx` besitzt `onPoint`, `onSelect` und Figurenbewegung. Im Renderer wird ein
  anderer Drag derzeit zum Kameraschwenk. Ein Bauwerkzeug braucht eine ausdrücklich andere Geste.
- `betreten.ts` behandelt neue Siedlungsregionen ohne ursprüngliche Straßenidentität als
  Gebäude. `mapDocumentScene` zeichnet Regionen ohne Gebäudeknoten als Straßen. Gelände darf
  deshalb nicht einfach als untypisierte neue Region hinzukommen.
- `SceneDoc v3` und `TacticalMapDocumentV1` sind geschlossene Verträge. Der Parser meldet bei
  unbekannten Feldern ausdrücklich, dass eine Schema-Migration erforderlich ist.
- Native v13 ist bereits die aktuelle Fassade. Ihre Writer delegieren bei leeren neuen Tabellen
  an ältere Profile. `campaign-v3-tactical.ts` prüft transitiv weiterhin native Kartenquellen mit
  `format_version = "1"`, Originalbytes und Dokument-/Ankerhashes.

## Zwei tragfähige Varianten und Wahl

| Variante | Umsetzung | Stärken | Kosten und Konsequenzen |
| --- | --- | --- | --- |
| A: taktisches Kartendokument v2 | Kartografie wird Bestandteil eines ausdrücklich neuen `TacticalMapDocumentV2`; neue Import-/Exportprofile prüfen v1 und v2 getrennt. | Ein geschlossenes Dokument enthält Geometrie und Bedeutung; einfache atomare lokale Bearbeitung. | Neue Kartenquellen, Dokumenthashes, Importadapter und sämtliche transitiven taktischen Profilprüfungen brauchen eine versionierte Fortsetzung. Alte Prüfer dürfen nicht plötzlich v2 akzeptieren. Tragfähig bei einem umfassenden nächsten Kartenformat. |
| B: revisionsgebundene Kartografie v1 | Eine neue kanonische Tabelle bindet typisierte Attribute an genau eine vorhandene Kartenrevision und deren Regions-IDs. Polygone bleiben ausschließlich in `geometry.regions`. | Geschlossene Geometrieformate und bestehende Hashes bleiben unverändert. Native v14 ergänzt wie frühere Profile eine Tabelle. Die bestehende Revisionstransaktion bleibt der Speicherpfad. | Alle aktuellen Kartenleser müssen Geometrie und Kartografie gemeinsam laden; Revision und Kartografie müssen atomar entstehen. Eine serverseitige vollständige Referenzprüfung ist zwingend. |

**Wahl: B.** Die zusätzliche Tabelle ist kanonische Bedeutung zu vorhandener Geometrie, kein
zweiter Kartenentwurf und kein zweiter Satz Hauspolygone. Die räumliche Identität bleibt
`(mapId, regionId)`; eine konkrete Darstellung ist durch `mapRevision` festgelegt.
Die Entscheidung folgt der Migrationsregel aus `CLAUDE.md`: Der irreversible Datenvertrag wird
jetzt vollständig benannt; die ersetzbare Oberfläche bleibt überschaubar.

Ein reiner Stempel-Editor ohne Rollen und Nachbarschaftsregeln wurde ebenfalls betrachtet. Er
wäre eine brauchbare Erweiterung des vorhandenen Objektkatalogs, erfüllt aber Gelände-/Straßen-
Bearbeitung, geschützte Teilneugenerierung und verständliche Gebäudezugänge nicht.

## Kanonischer Vertrag und Versionierung

Neu in `packages/szene/src/cartography.ts`: geschlossener `TacticalCartographyV1`, Parser,
kanonischer Serializer und geometrieunabhängige Typen. `szene` kennt keine Wissensentscheidung,
keine Datenbank und keinen Solver. Bestehende `SceneDoc`-/Tactical-v1-Parser werden nicht erweitert.

```ts
type CartographyRole = "generic" | "terrain" | "water" | "road" | "lot" | "building" | "room";
interface TacticalCartographyV1 {
  schemaVersion: 1;
  kind: "tactical-cartography";
  // Modulraster der Bearbeitung, unabhängig vom sichtbaren taktischen Spielraster.
  construction: { cellSize: number; origin: readonly [number, number] };
  regions: readonly CartographyRegionV1[];
}
// Als geschlossene diskriminierte Union auszuführen, nicht als beliebiger Property-Beutel.
interface CartographyRegionCommon {
  regionId: string;
  role: CartographyRole;
  authored: boolean;
  locked: boolean;
  provenance: Weltkeim | null;
}
```

Pro Region existiert genau ein Datensatz, einschließlich explizitem `generic`. Rollen besitzen
nur sinnvolle Zusatzfelder: Gelände `material` aus `grass|earth|forest|field|rock|sand`, Wasser
`river|lake|sea`, Straße `path|street|square|bridge`, Grundstück keine weiteren Pflichtfelder,
Gebäude optionale Referenzen `lotRegionId`, `streetRegionId` und `attachedStampIds`. Raum und
Generic haben keine implizite Straßensemantik. Dachfarben/-formen folgen Rolle, Setting und
bestehendem Gebäudetyp; kein zweiter Gebäudetyp in dieser Tabelle. Weitere Materialwerte
verlangen eine ausdrücklich versionierte Vertragsentscheidung.

Keine Polygone, Mittelpunkte, Gebäudenamen, Kindkarten-IDs, Benutzerrechte oder Asset-URLs in
der Kartografie. Auch keine zweite dauerhaft gespeicherte WFC-Zellenwelt. Der Solver kann eine
temporäre Rasteransicht ableiten; sein Ergebnis wird wieder zu der einen kanonischen Geometrie.
`attachedStampIds` ordnet grafische Teile einem Haus zu, damit Ziehen/Löschen sie atomar erfasst;
ein Stempel gehört höchstens zu einer Region. Deren Position bleibt ausschließlich im Stamp.

Grenzen: höchstens 2.048 Rollensätze, exakt so viele wie vorhandene Regionen; höchstens 50.000
Stempelreferenzen insgesamt, eindeutige existierende IDs; höchstens 1 MiB Kartografie-JSON;
positive endliche `cellSize` bis 32.768; endlicher Ursprung im bestehenden Koordinatenbudget.
Polygon- und Dokumentgrenzen bleiben zusätzlich wirksam, insbesondere das engere serverseitige
Budget von 20.000 Regionspunkten. Grundstück-/Straßenreferenzen müssen die passende Rolle in
derselben Revision haben. Zyklen durch Eigentumsreferenzen sind ausgeschlossen.

Neue Migration `025_tactical_cartography.sql` (vor Anwendung auf weiterhin freien Namen prüfen):
`tactical_map_cartography(map_id, campaign_id, map_revision, map_version, document, content_hash)`, Primärschlüssel
`(map_id, map_revision)`, FK auf dieselbe Kampagnenkarte und genau diese Revision. Zeilen sind wie
Revisionen unveränderlich. `content_hash` ist der kanonische Hash allein dieser Kartografie.
Leseantworten liefern zusätzlich einen `compositionHash` über Dokument-/Ankerhash und
Kartografiehash; bestehende Revisionshashes werden nicht neu berechnet. Caches für kartografische
Darstellung müssen den vollständigen Pin verwenden.

Native **v14** ergänzt Tabelle und Modul `cartography` mit `cartographySchemaVersion: 1`.
`native-v14/current.ts` ist die einzige aktuelle Reader-/Writer-Fassade. Sie normalisiert alte
Tabellenansichten durch eine leere Kartografietabelle, schreibt bei vorhandenen Kartografiezeilen
v14 und delegiert sonst unverändert an v13/current. Das ist der nachgelesene bestehende Vertrag;
kein pauschales Hochstufen alter Umschläge allein wegen einer neu installierten App.
V1–V13-Reader und ihre akzeptierten Felder/Prüfsummen bleiben eingefroren. V14 prüft zuerst den
unveränderten v13-Kern und danach neue Referenzen und Hashes. Alte Archive, Originalquellen und
historische Revisionen werden weder beim Lesen noch beim Restore neu generiert oder umgeschrieben.

Legacy-Abbildung ist eine benannte reine Funktion mit expliziter Evidenz:

- Gebäudeknoten plus vorhandene Region ergeben `building`; Raumknoten ergeben `room`.
- Nachweisbare ursprüngliche Generatorstraßen ergeben `road`; die Generatorquelle und
  bekannte Gebäude-IDs müssen dazu gemeinsam passen.
- Unbekannte importierte Polygone ergeben `generic`. Fehlende Gebäudeknoten allein beweisen
  keine Straße. Name, Arrayposition oder Polygonform beweisen ebenfalls keinen Gebäudetyp.
- Bekannte bereits verbundene Legacy-Eingänge bleiben über ihre gespeicherte Adresse
  betretbar. Neue generische Flächen werden erst durch die ausdrückliche Gebäude-/Raumaktion
  zu neuen Eingängen. Die Übergangsregel muss ausdrücklich im Children-Reader stehen.
- Die Legacy-Abbildung ist zunächst ein Lese-/Editorentwurf. Erst Speichern erzeugt die neue
  Revision samt Kartografie; bloßes Öffnen verändert keine Daten und keinen Exportumschlag.

Historische Szenen lesen Kartografie ausschließlich für ihre gepinnte `mapRevision`.
Aktuelle Children-Antworten dürfen diese Rollen nicht überschreiben. Gebäudenamen und
Beschreibungen bleiben entsprechend dem bestehenden Metadatenvertrag aktuell, werden aber
nur an vorhandene und bereits sichtbare IDs dieser Revision angefügt. Historische Geometrie,
Materialien und Samen bleiben unverändert. Gebäudetypen zur aktuellen Auswahl/Innenraumaktion
dürfen nicht als Ersatz für historische Rollendaten dienen.

Sichtbare Vektorkartografie muss auch ohne Hintergrundbild gerendert werden. Ihr Raster-/Cache-Pin
enthält mindestens gepinnte Revision, `compositionHash`, Zeichnerfassung und die aktuelle
autorisierte Sichtmaske. Ein allein vom Hintergrundbild abhängiges `hatRaster` reicht dafür
nicht. Rechteentzug verwirft vorhandene Texte, Geometrie, Stempel und Raster desselben Scopes.

## Reiner örtlicher Constraint-/WFC-Kern

`packages/forge/src/cartography-edit.ts` und `cartography-patterns.ts` enthalten einen tatsächlichen
lokalen Solver. Keine Modellaufrufe, Dateizugriffe, DB-Zugriffe, versteckte Systemzeit oder
`Math.random`. Die endliche Sucharbeit ist ein Fachalgorithmus innerhalb eines Graphknotens,
kein zusätzlicher Agenten-Runner.

```ts
type EditResult =
  | { ok: true; document: TacticalMapDocumentV1; cartography: TacticalCartographyV1;
      addedBuildings: readonly BuildingIntent[]; removedRegionIds: readonly string[];
      changedRegionIds: readonly string[]; diagnostics: readonly string[] }
  | { ok: false; code: "contradiction" | "budget" | "protected" | "invalid";
      regionIds: readonly string[]; message: string };
applyCartographyEdit(input: {
  document: TacticalMapDocumentV1;
  cartography: TacticalCartographyV1;
  protectedRegionIds: readonly string[];
  operation: CartographyEditOperation;
  seed: string;
  operationId: string;
  limits: EditLimits;
}): EditResult;
```

Operationen: Gelände-Pinselzug, Straßen-Pinselzug, Gebäude setzen/transformieren/entfernen,
Gebiet variieren. Die Payload hält abgeschlossene Geometrieabsichten in Kartenpixeln, feste
Material-/Typwerte und ausdrücklich gewählte Variante. Zufalls-ID und Variantenkeim werden
einmal beim Beginn der Benutzeraktion erzeugt und bleiben über Vorschau, Bestätigung und Redo
identisch. Gebäude-Intents enthalten nur neue Region-ID, gewünschten Titel und Gebäudetyp;
keine vom Client vorgegebene Herkunft oder Kindkarte.

Der Kern muss folgende Arbeit wirklich ausführen:

1. Wirkungsgebiet plus höchstens einen Modulring ermitteln; vollständig außerhalb liegende
   Geometrie nicht einmal ersetzen. Ein über den Rand reichendes geschütztes Objekt bleibt
   als Ganzes fest. Bestehende manuelle/gesperrte Gebäude und Gebäude mit Kindkarte sind feste
   Randbedingungen. Straßen außerhalb bleiben angeschlossene Ports.
2. Kandidaten aus einem versionierten endlichen Musterkatalog wählen. Jedes Muster besitzt
   N/O/S/W-Schnittstellen für Boden, Wasser und Straße; Gegenkanten müssen kompatibel sein.
Eine Straße endet am Gebietsrande nur an einem vorhandenen Anschluss oder einem explizit
   gesetzten Endpunkt. Wasser und Straße kreuzen sich nur als Brückenmuster. Gebäude benötigen
   trockenen gültigen Baugrund und einen Zugang zum erreichbaren Straßennetz.
3. Kandidatenmengen propagieren, die kleinste verbleibende Menge wählen, deterministische
   Gleichstandsauflösung durch Zellordnung und gehashten Variantenkeim verwenden. Bei leerer
   Menge begrenzt zurücksetzen/backtracken; keine Endlosschleife und kein heimlicher globaler
   Neustart. Auch die Reihenfolge der Meldungen und Ergebnisobjekte ist stabil.
4. Zusammenhängende kompatible Boden-/Straßenflächen zu einfachen Polygonen verdichten.
   Keine zusätzliche persistierte Kachelmatrix, keine Haus-ID aus später sortierter Arrayposition.
   Ein unverändertes Haus behält seine Region-ID, Herkunft und Kindkeim. Neues Dekor verwendet
   IDs aus Operation-ID, stabiler räumlicher Adresse und lokalem Objektpfad.
5. Die fertige Geometrie auf Kollision, Wasserquerungen, Erreichbarkeit, freie Plätze und
   sämtliche Referenz-/Größenbudgets prüfen. Erst dann `ok:true`; eine unlösbare Operation
   liefert niemals ein halbfertiges erfolgreiches Dokument.

Startbudgets pro Benutzeroperation: höchstens 1.024 variable Module, 64 Muster pro Modul,
100.000 Propagationsschritte und 512 Rücksetzschritte. Der vorhandene 144-Megapixel-
Dokumentrahmen bleibt unabhängig davon. Das Ergebnisbudget wird vor Übernahme geprüft;
eine größere freie Auswahl verlangt eine kleinere Auswahl, nicht automatisch mehrere verdeckte
Teilspeicherungen. Die Erfolgsentscheidung hängt von Zählern ab, nicht von Rechnergeschwindigkeit.
Abbruch einer Hintergrundberechnung verwirft deren Ergebnis und setzt keine weitere Variante.

Ein neuer Siedlungsgeneratorstand benutzt denselben Kern für Geländeübergänge und anschließbare
Module, behält aber seinen übergeordneten Straßen-/Grundstücksentwurf. Kleine rechteckige oder
L-förmige Hauskörper liegen mit Abstand in Grundstücken und richten sich nach der zugeordneten
Straße aus. Eine Stadt bekommt Gelände und Ortsrand, ein Dorf Felder/Baumgruppen/Freiräume.
Die neue Generatorversion ist neue Provenienz, keine Aktualisierung gespeicherter alter Orte.

## Editor und atomare Speicherung

Desktop: Werkzeugleiste neben der großen Karte, Inspector rechts, stets erreichbare Aktionen
Rückgängig/Wiederholen/Speichern und lesbarer Entwurfsstatus. Mobile: Karte und Werkzeugblatt
umschaltbar, keine verkleinerte komplette Desktopspalte. Vier Werkzeuge:

| Werkzeug | Direkt auf der Karte | Inspector |
| --- | --- | --- |
| Auswählen | Haus/Fläche/Asset auswählen, ausgewähltes Objekt ziehen; separate Hand-/Pan-Geste | Name/Typ, Verbindung, Sperre, Drehen, Entfernen; vorhandener Assetkatalog als Einrichtung |
| Gelände | Pinselzug mit sichtbarem Umriss und Materialvorschau | Wiese/Wald/Feld/Erde/Fels/Sand/Wasser, Pinselgröße |
| Straßen | Pfad ziehen, Anschlüsse und Brücken vor Übernahme sehen | Weg/Straße/Platz, Breite, Start-/Endpunkt |
| Gebäude | Grundriss als Vorschau setzen, drehen, verschieben | Typ, Hausgröße, Name, Zugang; danach Innenraum betreten |

Auswahl variieren ist eine benannte Inspectoraktion mit Wirkungsgebiet; sie erhält Straßen,
wenn „Bebauung variieren“ gewählt ist. Einrichtungen variieren erhalten Räume. Schutz und
manuelle Bearbeitung werden nicht durch einen Variationsklick zurückgesetzt.

`map-edit-history.ts` hält `{baseline, past, present, future, gesture}`. `present` umfasst
Dokument, Kartografie, Anker und ausstehende neue Gebäude-Intents. Ein abgeschlossener Pinselzug,
ein Drag oder eine Variantenübernahme ist ein atomarer History-Eintrag. Pointermove erzeugt nur
flüchtige Vorschau. Undo/Redo übernimmt auch Zuordnungen und entfernte Höhen-/Wissensreferenzen.
Escape bricht nur die laufende Geste ab. Strg/Cmd+Z bzw. Umschalt+Z greifen bei fokussierter Karte;
Textfelder behalten ihre Texteingabe. History wird nach erfolgreichem Speichern auf die neue
Baseline gesetzt; ältere gespeicherte Revisionen bleiben erhalten, werden aber nicht mit
Figuren-/Portal-Undo vermischt. Begrenzung 100 Schritte und 32 MiB gespeicherte Änderungen;
bei Erreichen entfällt nur der älteste rücknehmbare Schritt, niemals die gespeicherte Baseline.

`TacticalCanvas` erhält eine optionale ausdrücklich aktive Editor-Interaktion mit Begin/Move/
Commit/Cancel in Kartenkoordinaten. Ohne diese Option bleibt das bestehende Figuren-/Pan-
Verhalten identisch. Gestenvorschau, Auswahl und Kamera erzeugen keine DOM-fremde Geometriequelle.
Rendererwechsel, Rechteverlust, Mapwechsel und Unmount beenden aktive Gesten.

HTTP bleibt bei `PUT /tactical/maps/:id/revision`, Operation `map.revise`. Der neue ausdrücklich
versionierte Body lautet `{schemaVersion:2, commandId, expectedVersion, document, anchors,
cartography, addedBuildings}`. Der geschlossene bisherige Body bleibt für Karten ohne
gespeicherte Kartografie als Legacy-Variante lesbar. Sobald die Karte Kartografie besitzt,
weist der Server einen Legacy-Revisionbody mit einem klaren `TacticalValidationError` zurück:
„Diese Karte benötigt den aktuellen Karteneditor.“ Damit kann ein alter Client keine
Rollendaten unbemerkt weglassen oder falsch fortschreiben. Dies ist kein Aufruf des Generators
auf jedem Server-Save.

Neue Leseverträge: MapCard liefert optionale `cartography` samt `cartographyHash` und
`compositionHash`; Generate-Preview liefert die Kartografie ihrer sichtbaren Geometrie.
Ein fehlendes Feld bedeutet Legacy und wird nur durch den benannten Adapter interpretiert.
Der Client trifft keine Entscheidungen über native Exportversionen.

Die Servertransaktion prüft aktuelle Rolle, map-CAS, Dokument, Rollen, Sperren und bestehende
Kindkarten erneut. Eine Geometry-, Kartografie-, neue Knoten- oder Ankeränderung scheitert als
Ganzes. Neue Gebäude-Intents dürfen nur gerade hinzugefügte Gebäude-Regionen adressieren;
vorhandene Knoten/Herkunft sind keine überschreibbare Clientpayload. Kindkeime neuer manueller
Gebäude werden serverseitig einmalig von ihrer stabilen Adresse abgeleitet und gespeichert.
Neue Knoten, Kartenrevision, Kartografie, Anker und Command-Receipt entstehen in derselben
Transaktion. Wiederholung derselben Command-ID bleibt idempotent, abweichende Payload kollidiert.
`expectedVersion` umfasst weiterhin auch Änderungen der vorhandenen Gebäudemetadaten.

Schutz hat zwei ausdrücklich verschiedene Zwecke: Automatische Variation erhält manuell
bearbeitete/gesperrte Objekte und sämtliche Kindkartenzugänge. Die bewusste manuelle Verschiebung
oder Drehung eines Hauses darf dagegen seinen vorhandenen Innenraum behalten; sie ändert weder
ID noch Rolle oder Herkunft. Löschen beziehungsweise Umwandeln eines Kindkartenzugangs bleibt
verboten. Ein bewusst aufgehobenes `locked` darf weitere manuelle Bearbeitung im selben Entwurf
erlauben. Der Server prüft den resultierenden vollständigen Vertrag; `authored` und `locked`
sind Bearbeitungsabsichten der Spielleitung, keine Ersatzberechtigungen. Der Solver erhält
deshalb abhängig von der Operation unterschiedliche festzuhaltende Elemente.

Gemeinsame Material-/Geometrieprojektion bleibt browserrein in `szene` oder in einem bereits
erlaubten reinen Forge-Modul. Der Server importiert keinen Pixi-/DOM-Renderer und erweitert
nicht die bestehende Sharp-Eingangsgrenze auf frei gelieferte SVG-Dateien. Baked-Export und
Spielerprojektion konsumieren nur intern erzeugte, bereits autorisierte Zeichenprimitive.

Entwurfsschutz umfasst Geometrie, Kartografie, Anker, Gebäude-Intents, aktive Geste und laufende
Berechnung/Speicherung. Ein Konflikt übernimmt niemals den neueren Serverstand hinter den
Benutzereingaben. Abgelehnte Navigation erhält den gesamten Entwurf. Asynchrones Ergebnis
wird nur für denselben Map-/Baseline-/Eingabe-Fingerprint übernommen.

## Identitäten, Löschen, Restore und Sicht

- **Restore:** vorhandene Kampagnen-, Karten-, Regions-, Knoten- und Kind-IDs werden identisch
  in die bestehende leere Zieldatenbank übertragen. Kein Remapping, keine Regenerierung.
  Neue Tabelle in Schemaabdeckung, Collection, Normalisierung, Semantic-Diff und Restorebericht
  aufnehmen. Reihenfolge: Eltern/Kartenquellen/Kartenrevisionen vor Kartografie, anschließend
  Knoten und Kindadressen; FK-Prüfung und abschließender vollständiger Semantic-Diff vor Commit.
- **Neue Kartenvariante:** ist ausdrücklich eine neue Karte. Wenn Geometrie-IDs neu vergeben
  werden, eine einzige vollständige bijektive ID-Tabelle für Regionen, Stempel, Orte, Wände,
  Portale und Lichter erzeugen. Rollen, Grundstück-/Straßenreferenzen, angehängte Stempel,
  Höhenbezüge und Anker werden daraus gemeinsam abgebildet. Alte Kindkarten nicht automatisch
  kopieren oder umhängen. Bestehende zugehörige Knoten nur auf ausdrücklichem Kopierpfad neu
  anlegen, niemals gespeicherte Herkunft als neu erzeugte Tatsache ausgeben.
- **Löschen im Entwurf:** Referenzen und zugeordnete grafische Elemente atomar behandeln.
  Ein Haus mit bestehender Kindkarte bleibt erhalten; diese erste Lieferung bietet keine
  kaskadierende Kindkartenlöschung. Neues/noch unverbundenes Haus darf entfernt werden; seine
  alten historischen Revisions-/Knotenevidenzen werden nicht nachträglich gelöscht.
- **Kampagnenlöschung:** Kartografie vor den referenzierten Revisionen löschen beziehungsweise
  dem vorhandenen kontrollierten Cascade-Pfad hinzufügen. Dry-run zählt sie mit. Kein verwaister
  Eintrag, keine Umgehung der Schutztrigger. Der Server-Builder prüft den vorhandenen tatsächlichen
  Löschpfad und dessen Schemaabdeckung, statt eine zusätzliche Löschroutine einzuführen.
- **Spielersicht:** Rollendaten sind keine Wissensfreigabe. GM-Entwurf enthält vollständige
  Kartografie; Player-Endpunkte liefern keine privaten Knoten, Namen, Seeds, Sperren oder
  Bearbeitungsrechte. Benötigte sichtbare Materialien werden erst nach Wissensprojektion in
  Raster/Draw-Daten übertragen. Ein Bild- oder Rollencache muss mit demselben vollständigen
  Sicht-/Revision-Pin invalidiert werden. Teilweise bekannte Flächen dürfen keine verdeckten
  Hauskonturen als Nebenprodukt einer ungefilterten Clientprojektion verraten.
- **UVTT:** bestehender V1-Export bleibt lesbar. Reine Kartografie darf nicht kommentarlos
  verschwinden: gemeinsame Darstellung für gebackenes Bild verwenden, semantische Verluste
  wie Sperren/Teilvariationen im Fidelity-Bericht nennen. Native Sicherung bleibt verlustfrei.

## Drei Builder und verbindliche Dateigrenzen

Der Root integriert Verträge und führt den unabhängigen Review. Agenten tauschen Änderungen
über den Root aus. Keine gemeinsame Schreibverantwortung an einer Datei.

| Builder | Exklusive Produktionsflächen | Vertrag, den andere konsumieren |
| --- | --- | --- |
| 1: Daten und Effekte | `packages/szene/src/cartography.ts` und `index.ts`; `packages/protocol/src/tactical.ts`; `packages/io/src/native-v14/{schema,validation,bundle,current,index}.ts`, IO-`index.ts`; `packages/server/src/db/migrations/025_tactical_cartography.sql`; Server `domain/{tactical,betreten,grundriss,bundles}.ts`, zuständige HTTP-Adapter und vorhandener Kampagnenlöschpfad; `docs/CAMPAIGN_FORMAT_V14.md` | Typen/Parser, `inferLegacyCartography` mit expliziter Evidenz, versionierte Revisionpayload, atomare Revision+Kartografie, zentrale v14-Fassade, GM-/Playersicht |
| 2: Generator und Constraint-Kern | `packages/forge/src/{cartography-edit,cartography-patterns}.ts`, `siedlung.ts`, benötigte bestehende Geometriehelfer und Forge-`index.ts`; eigene neue lizenzierte Kartenassets nur nach Abstimmung | `applyCartographyEdit` und versionierter Musterkatalog; neuer `erzeugeSiedlung`-Output ergänzt kanonische Kartografie, unveränderte bestehende Outputfelder bleiben vorhanden |
| 3: Darstellung und Editor | `packages/client/src/features/{MapEditor,MapEditTools}.tsx`, `map-edit-history.ts`, `map-generation.ts`, `TacticalPreparation.tsx`, `TacticalGenerate.tsx`, `NestedMapView.tsx`, `TacticalCanvas.tsx`, `TacticalView.tsx`, benötigte CSS; `packages/render/src/{model,renderer,geometry,stapel}.ts` | Darstellungsadapter nimmt optionale Kartografie zusätzlich zum bisherigen Dokument/Knotenvertrag; Editorgesten sind opt-in; Renderer bleibt reiner Darsteller ohne DB/Generierung |

Builder 1 benennt vor Verbraucheränderungen die endgültigen öffentlichen Typen und übernimmt
die oben festgelegte Legacy-Revisionbehandlung nach Review. Builder 2 liefert den reinen Solver und
Generatoroutput dagegen. Builder 3 beginnt mit bestehenden Dokumenten und fertig benannten
Verträgen; keine Ersatzpolygone oder eigene WFC-Implementierung im Renderer. Serverseitige
Spielerraster-Integration bleibt Builder 1, konsumiert eine von Builder 3 bereitgestellte reine
Draw-Beschreibung. Bestehende UVTT-Adapteränderungen gehören nach Root-Zuweisung zu Builder 2,
die API-/Fidelity-Integration zu Builder 1. Die Teilaufgaben laufen ausschließlich im vorhandenen
LangGraph; dieser Absatz ist die Arbeitsaufteilung, kein paralleler Control-Plane.

## Angenommene Ergänzungen aus dem unabhängigen Review

- `map_version` hält die CAS-Version beim Entstehen einer Kartografierevision fest. Der reale
  Gegenbeleg war Childverbindung → Metadatenänderung → Kartenrevision → Export: Der eingefrorene
  V3-Prüfer verwechselt dort `ack.version` mit einer Geometrierevision. V14 prüft eine eindeutige,
  streng monotone Zuordnung und übersetzt ACK-Versionen ausschließlich für die V13-Kernprüfung.
  Originalquittungen, ihre Bytes und exportierten Hashes bleiben unverändert. Keine synthetischen
  Revisionen und keine Lockerung älterer Reader; Einzelheiten in `docs/CAMPAIGN_FORMAT_V14.md`.

- Vorhandene `initial_snapshot.map`-Felder bleiben exakt `id`, `revision`, `contentHash`.
  `compositionHash` wird separat aus der zugeordneten unveränderlichen Sidecar-Zeile abgeleitet.
  Nach der ersten Kartografie-Revision einer Karte muss jede spätere Revision eine passende
  Zeile besitzen; V14 validiert diese Vollständigkeit, damit Datenverlust nicht als Legacy gilt.
- Neue oder veränderte manuelle Flächen tragen `authored: true` und keine behauptete
  serverseitige Generatorherkunft. Der Server bewahrt vorhandene vertrauenswürdige Provenienz
  beziehungsweise schreibt sie beim eigenen Generatorpfad. Client-Weltkeime legitimieren
  weder Knotenherkunft noch fremde Originaldaten. Solver-Parameter sind eine Arbeitsanweisung.
- Nach erfolgreichem PUT bleibt ein fehlgeschlagenes GET ausdrücklich „gespeichert,
  Nachladen ausstehend“. Ein erneuter Ladeversuch erzeugt keine neue Revision. Währenddessen
  entstandene weitere Eingaben werden über Submit-/Baseline-Fingerprints erhalten und nicht
  durch einen beliebigen aktuellen Head ersetzt.
- Autorisierte Spielerkonturen werden durch die vorhandene Wissensmaske pixelgenau begrenzt;
  Sichtbarkeit eines Polygonmittelpunkts darf nicht das ganze Haus freigeben.
- Der UVTT-Bildexport respektiert das bestehende 16-Megapixel-Limit. Größere Vektorkarten
  bleiben nativ verlustfrei exportierbar; Bildexport bietet eine ausdrücklich gewählte passende
  Auflösung mit korrekt angepasstem Maßstab oder meldet die konkrete Grenze vor Berechnung.
  Es wird weder ein 144-Megapixel-Vollraster erzwungen noch still Semantik weggelassen.

Damit ist Variante B zur Ausführung freigegeben. Die Daten-/Sichtprüfung identifizierte keine
prinzipielle Sperre, sondern diese notwendigen Vertragsbedingungen. Die drei Implementierungen
werden anschließend zusammen gegen die aufgeführten Angriffsfragen und echte Browserbilder geprüft.

## Abnahme und Angriffsfragen

Nutzerkorrektur während der Umsetzung: Die installierte App zeigte noch den früheren
Kartenstand; auch die echten Worktree-Galerien lagen sichtbar unter den PDF-Referenzen.
Die geforderte größere Ambition wird an konkreter Komposition umgesetzt: Stadtstandard mit
224 tatsächlich erreichbaren Häusern, dichter Kern mit kleineren Straßenfront-Parzellen und
Gassen, größere Höfe am Rand, zusammenhängende natürlich begrenzte Gehölze und Feldgruppen,
breiterer mäandernder Fluss sowie eine organische Kernmauer mit Wasser-/Straßenaussparungen.
Root übernimmt die reine gemeinsame Projektion: stärkere Dachkonturen und Schatten,
lesbare Ufer ohne innere Reach-Nähte, dichte variierte Baumkronen, gerichtete Feldfurchen und
Steinmauern aus der bestehenden Wallgeometrie. Ordinary-Dachpins und doppelte Labels sollen
die Karte nicht überdecken. Die echten Zwischenstandsgalerien bleiben als Vergleich erhalten.
Die kleinere Funktionskarte belegt Bedienung, ausdrücklich keine visuelle Qualitätsabnahme.

Unabhängiger Projektionsreview von `cartography-4` fand drei reale Abweichungen: Browser-
Validierung kannte die neuen Wall-IDs nicht, dichtes Walddekor verbrauchte das Mauerbudget,
und ein zusätzlicher kollinearer Wasservertex erzeugte ein falsches inneres Ufer.
`cartography-5` behält echte Wall-Linienidentitäten mit `paint:false`, reserviert deren
notwendige Basisflächen vor optionalem Dekor und berechnet Ufer über einen Intervall-Sweep
auf den belegten Seiten kollinearer Kanten. Sehr große Wandmengen behalten den bestehenden
vollständigen Linienpfad. Der originale unabhängige Gegenbeleg ist als
`.local/projection-independent-review-before-fix.json` erhalten; der aktuelle Gegenbeleg
bestätigt Browserannahme, erhaltene Mauerflächen und null innere Uferbänder. Dauerhafte
Adapter-/Raster-/Budgetfälle und die betroffenen Rendererfälle sind gezielt geprüft.

Der anschließende echte Browser-Detailvergleich fand Mauerabschlüsse unmittelbar an
Dachkanten. Die Mittellinien lagen außerhalb, gezeichnete Steinbreite, Schatten und Kappen
überschnitten dennoch 45 Mauer-/Hauspaare. Der Generator erweitert die tatsächlichen
Hausgrundrisse nun vor dem Ausschneiden der Mauer um einen sichtbaren Abstand; konkave
L-Häuser werden dafür in ihre beiden konvexen Teile zerlegt. Die unabhängige Prüfung aller
gezeichneten Mauerflächen bestätigt null Überschneidungen bei drei Stadtseeds und zusätzlich
den Zellgrößen 16/192. Produktionshash und Gegenbeleg: `.local/map-visuals-20260908/wall-evidence.json`.

Zusätzlich gehört der neu angeforderte Kartenlöschpfad mit Rechtsklick-/Touch-Menü,
Unterkarten-Vorschau und freiem Elterneingang zur Kartenabnahme:
[angenommener Lifecycle-Vertrag](map-lifecycle-20260908.md), Migration 026/native V15.

Vor Versand entsteht eine feste Galerie aus mindestens drei Seeds je Weiler/Dorf/Stadt;
zusätzlich Gegenwart und Science-Fiction sowie ein bestehendes importiertes Legacy-Dokument.
Jeweils Gesamtansicht, Gebäude-Detail, Innenraum und 390-Pixel-Bedienung. Dieselben Seeds bleiben
zwischen Versuchen fest; zusätzlich ein adversarial enger Platz, Wasserquerung und geschütztes Haus.
PDF-/Watabou-Referenzen stehen daneben, nicht als behaupteter automatisch gemessener Qualitätswert.

Visuelle Abnahme: Wege/Brücken/Wasser/Dächer auf Anhieb unterscheidbar, sichtbarer Ortsrand,
Grundstücke größer als ihre Hauskörper, freie Plätze, einheitliche Schattenrichtung, zurückhaltender
Boden. Gesamtansicht bevorzugt Landmarken; normale Hausnamen erscheinen bei geeignetem Zoom oder
Auswahl. Keine abgeschnittene aktive Aktion auf dem Telefon; Karte und Inspector bleiben erreichbar.
„Genauso gut oder besser“ wird erst nach unabhängiger Sichtung dieser echten gerenderten Galerie
beansprucht. Ein bereites Canvas ohne sichtbare passende Pixel ist keine Abnahme.

Fachliche Nachweise: echte kompatible Nachbarkanten und Brückenregeln, verbundene Eingänge,
keine überlappenden Hauskörper, gleiche Inputs ergeben gleiche Geometrie/IDs, außerhalb des
Bereichs byteidentische Objektwerte, unveränderte geschützte Bereiche, deterministischer
Widerspruch/Budgetabbruch ohne Teiländerung. Eine minimale ausgeschlossene Nachbarschaft muss
vor Implementierung des Fixes ein roter Regressionstest sein; kein bloßer Snapshot eines hübschen Seeds.

Gezielte Integration: Gelände setzen → Straße anschließen → Haus setzen/ziehen/drehen → Undo/Redo
→ speichern → Atlas/Innenraum öffnen → Neustart → native Export/Restore mit vollständigem
Semantic-Diff. Hinzu kommen bestehende drei Szenenansichten, Rechteentzug und unveränderte reale
Bildlimits. Tests in passenden betroffenen Dateien; keine pauschale Vollsuite. Root führt
Typecheck, Clientbuild und erforderliche Format-/Boundary-/Asset-Gates am integrierten Stand aus.

Kompakte Fragen für den unabhängigen Angriff:

1. Kann eine neue Wasser-/Straßenregion durch Legacy-Inferenz plötzlich ein Gebäude werden?
2. Kann eine Rolle auf fremde Karte, falsche Revision, fehlenden Stamp oder verdeckten Inhalt zeigen?
3. Kann eine alte Revision ohne ihre alte Kartografie angezeigt oder eine Sidecar-Zeile überschrieben werden?
4. Bleiben beim Entfernen/Undo/Redo Anker, Höhenbezüge und grafische Anhänge konsistent?
5. Wird eine verbundene Kindkarte jemals gelöscht, neu gesät, umgehängt oder unzugänglich gemacht?
6. Kann ein spätes Preview, Save oder Solverergebnis den Entwurf einer anderen Karte ersetzen?
7. Führt Ressourcenerschöpfung zu einer halben Änderung, nichtdeterministischer Variante oder endlosen Wiederholungen?
8. Bleiben V1–V13-Fixtures und ihre Prüfsummen identisch; prüft v14 jede zusätzliche dauerhafte Zeile?
9. Können Rollen/Material-/Assetdaten nach Rechteentzug aus einem alten Cache weiter sichtbar bleiben?
10. Ist die direkte Bearbeitung tatsächlich benutzbar und die Galerie sichtbar besser, oder wurde nur eine weitere Einstellungsseite gebaut?

Umsetzung ist bereits autorisiert. Nach dem unabhängigen Root-Review gehen die drei Builder
mit diesen Dateigrenzen in die Ausführung; daraus entsteht keine weitere Nutzer-Freigaberunde.

## Desktop-Gegenprobe: Öffnungszustand der Werkzeuge

Der tatsächliche Desktop aus `646bb58` fand beim Genrewechsel einen Bedienfehler:
`open={brush ? true : undefined}` schloss den vom Benutzer geöffneten Katalog, sobald
Genre-/Paketwechsel den Pinsel löschte. Dasselbe Muster betraf Zeichnen und Markieren.
Die drei Abschnitte führen jetzt ihren eigenen Öffnungszustand mit `onToggle`.
Neue Auswahl darf die passenden Werkzeuge zeigen; ihr Ende schließt keinen Abschnitt,
und bewusstes Schließen wird bis zur nächsten einschlägigen Auswahl erhalten.
Der exakte Browserfall war rot (`.local/map-editor-sections-red-2/`) und ist grün
(`.local/map-editor-sections-green/`, 42,7 s), einschließlich beider analogen Wechsel.
Das ursprüngliche Desktop-Paket wird vor Installation neu gebaut und erneut geprüft.
