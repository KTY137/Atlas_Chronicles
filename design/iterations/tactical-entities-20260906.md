# Taktische Kartenobjekte — Entwurf vom 6. September 2026

Status: **von Root am 2026-09-06 nach M8-Checkpoint b415f03 zur Umsetzung angenommen.**
Die zwei Runden sind eine nachvollziehbare Entwurfsprüfung; sie behaupten keine Nutzerstudie.
Root übernimmt die Konjunktion aus eigenem Ankerwissen und bekannter Region, den vollständigen
serverseitigen Vertrag und die zugängliche, durchsuchbare Outline mit 100 Einträgen pro Seite.
Der grafische Ausschnitt bleibt ausdrücklich auf20.000 bekannte Marker begrenzt; die Auswahl
aus der vollständigen Outline wird immer aufgenommen. Diese Entscheidung erweitert keine
Leistungsfreigabe. Rohassets und portable Packbytes folgen als eigener Integrationsvertrag.

## Auftrag und belegter Ausgangspunkt

M7 verlangt Regions-/Entity-Bindung, denselben Wissensentscheid wie das Wiki sowie
einen zugänglichen DOM-Pfad ([Implementierungsplan](../../docs/IMPLEMENTATION_PLAN.md),
M7). Das SceneDoc-Modell trennt anonyme Stamps ausdrücklich von einem menschlich
gesetzten MapAnchor. Ein Artikel kann auf mehreren Karten verankert sein, ohne
kopiert zu werden. Die Geometrie soll keine Wiki-Mutationen erzeugen
([Modell](../../packages/szene/src/model.ts), Abschnitt „Scene document and entity binding“;
[RB-20b](../research/RB-20b-machbarkeit.md), Abschnitte 1–2).

Die bestehende Speicherung reicht für diese Bindung aus:

| Vorhandener Vertrag | Tatsächliche Funktion und verbleibende Lücke |
| --- | --- |
| `SceneDoc v3` in `szene/model.ts` | `Stamp{id,a,x,y,s,r,l,t?,f?}` und `PlacePoint{id,x,y}`; weder Artikel noch Sichtentscheidung im Geometrieobjekt |
| `TacticalMapDocumentV1` | Geschlossene Geometrie, eigener Bildpixel-Rahmen, optionale skalare Höhen, unveränderter SceneDoc v3 |
| SQL011 `tactical_map_anchors` | Schlüssel `(map_id,map_revision,target_kind,target_id)`; `stamp`, `region`, `place`, kampagnengebundener Artikel und nullable Passage bereits vorhanden |
| `validateAnchors` / `mapCard` | Existenz des Geometrieziels und Artikel-/Passagenzugehörigkeit werden geprüft; Dokument und sortierte Anker sind gemeinsam gehasht |
| `tactical.project()` | Wertet derzeit ausschließlich Regionsanker aus; kein projiziertes Stamp-/Place-Objekt |
| `TacticalView`, `TacticalPreparation` | Live- und Vorbereitungsansicht übergeben derzeit `pins: []`; der Editor bindet nur Regionen |
| `ProjectedMapPin`, Renderer | Bereits vorhandene Punktposition, Label, optionaler Artikelverweis, Hit-Test, Auswahl und sichtbare Auswahlbeschriftung |
| Native V3, unverändert in V4 enthalten | Alle SQL011-Spalten, drei Ankerarten, Geometrieziele, Artikel-/Passagenreferenzen sowie Dokument-/Ankerhash werden bereits geprüft |

Maßgebliche Implementierungen: [Domain](../../packages/server/src/domain/tactical.ts),
[DTO](../../packages/protocol/src/tactical.ts), [SQL011](../../packages/server/src/db/migrations/011_tactical.sql),
[Native-Prüfung](../../packages/io/src/campaign-v3-tactical.ts),
[Renderer-Modell](../../packages/render/src/model.ts),
[Vorbereitung](../../packages/client/src/features/TacticalPreparation.tsx).

## Runde 1 — kleinster vollständiger Produktablauf

1. Die Spielleitung öffnet eine importierte Karte unter „Karte & Vorbereitung“.
   Neben Regionen gibt es „Orte & Kartenobjekte“. Vorhandene PlacePoints und Stamps
   lassen sich über eine Liste auswählen; ein bereits verknüpftes Objekt trägt den
   Artikeltitel, ein ungebundenes einen neutralen Typ und seine Position. Ein privater
   Asset-Verweis darf im GM-Inspektor erscheinen, ist aber kein Ortsname.
2. Für eine reine Raster-/UVTT-Karte ohne PlacePoints kann die Spielleitung bewusst
   „Ort markieren“ wählen und X/Y eingeben oder einen Punkt anklicken. Das erzeugt
   einen PlacePoint mit einmal vergebener ID im lokalen Kartenentwurf. Es entstehen
   weder Artikelstumpf noch Wissensfreigabe. Ein vorhandener Stamp wird durch
   Auswahl und Bindung zum Kartenobjekt; sein Asset und seine Geometrie bleiben erhalten.
3. „Mit Wissen verknüpfen“ wählt einen vorhandenen Artikel und optional eine konkrete
   Passage. Der Editor erklärt getrennt: Die Verknüpfung bestimmt, welches Wissen den
   Marker erlaubt; die Lage in einer bekannten Region bestimmt, ob er auf dieser
   Szenenkarte erscheint. Eine Bindung gewährt selbst kein Wissen.
4. „Kartenrevision speichern“ verwendet den bestehenden GM-Command mit Dokument,
   vollständigen Ankern und `expectedVersion`. Die Szene übernimmt diese Revision
   ausdrücklich in ihren Plan. Der bestehende Start pinnt sie; ein aktiver Abend
   behält seine begonnene Revision.
5. Eine berechtigte Spielfigur sieht den Marker auf der Karte und denselben Eintrag
   in „Bekannte Orte & Kartenobjekte“. Auswahl fokussiert ihn; „Artikel öffnen“ führt
   durch die bestehende Wiki-Navigation zum aktuell projizierten Artikel. Eine zweite
   Figur ohne den passenden Wissensstand erhält weder Marker noch Listenplatz.

Der erste Vorschlag, einen gefilterten `Stamp` unmittelbar an den Spieler zu senden
und `a` im Browser aufzulösen, wird verworfen: Er überträgt unnötige Packnamen,
Transformations-/Layerdaten und erfordert einen bislang fehlenden Asset-Liefervertrag.
Ebenso verworfen werden automatisch erzeugte Artikel, die Vereinigung kontrollierter
Figurenkenntnis und die automatische Freigabe einer Region durch einen bekannten Marker.

## Runde 2 — konkret zur Annahme vorgeschlagener Vertrag

### Darstellung und DTO

Die erste Ausbaustufe zeigt **semantische Marker**, keine nachgeladenen Stamp-Sprites.
Sie vervollständigt die Entity-Bindung auch auf einem vorhandenen Raster. Ein
Grundriss ohne Hintergrundbild bleibt eine schematische Geometrieansicht; die
Tusche-Assets werden damit nicht als bereits ausgelieferte Battlemap-Grafik behauptet.

Additive Laufzeitantwort, keine neue Persistenz:

```ts
interface TacticalEntity {
  id: string;                 // identisch zur stabilen Geometrie-ID
  kind: "stamp" | "place";
  x: number; y: number;       // lokale Bildpixel, kein erneuter Rahmenwechsel
  entryId: string;            // ausschließlich nach positivem Wissensentscheid
  label: string;              // aktueller Titel desselben erlaubten Wiki-Artikels
}
// TacticalView erhält immer entities: TacticalEntity[] — auch wenn leer.
```

Die Antwort enthält keine Passage-ID, Quelle, Packreferenz, Asset-URL, Lizenz,
Ankerhistorie, Zahl versteckter Objekte oder globale Kartenrevision. Ein Marker ist
in diesem Schritt kein bewegliches Liveobjekt; deshalb erhält er auch keinen CAS-
Zähler oder Token-Command. Ein optionaler späterer Sprung zu einer konkreten Passage
muss deren aktuelle Nachfolger eigens projizieren, statt einen alten PID durchzureichen.

Die Spielleitung erhält zusätzlich weiterhin ihren bestehenden vollständigen
Kartenvertrag. `entities` enthält für sie alle **gebundenen** Stamps/Places mit
Artikeltitel. Ungebundene Objekte bleiben ausschließlich Teil ihrer Vorbereitung;
sie bekommen keine erfundene Wiki-Verknüpfung. Gleiche Artikel dürfen mehrere
Geometrie-IDs haben, auch auf verschiedenen Karten.

Der Host bildet freigegebene Entitäten auf `ProjectedMapPin` ab. Objekte und Tokens
werden über `MapHit.kind` getrennt ausgewählt. Symbolform/Typtext und Beschriftung
tragen die Bedeutung auch ohne Farbe oder Kampagnenkunst. Die DOM-Liste hat dieselben
Objekte und dieselbe Aktion wie die Grafik. `TableView.onOpenEntry` wird durch
`TacticalView` bis zum LiveBoard weitergereicht; es entsteht kein zweiter Reader.

### Ein Wissensentscheid plus eine Ortsgrenze

Für einen Spieler gilt genau folgende Konjunktion:

1. Aktuelle Mitgliedschaft und der aktuell gewählte, weiterhin ausdrücklich erlaubte
   Reader-Actor werden serverseitig aufgelöst. `docs.held(campaignId, actorId)` bleibt
   die Quelle. Mehrere Control-Grants verändern die Wissensmenge nicht.
2. Das Objekt hat in der **gepinnten Kartenrevision** einen Anker auf einen vorhandenen
   Artikel dieser Kampagne. Ohne Anker bleibt es vollständig abwesend.
3. Bei `passageId:null` genügt wie im Wiki und bei bisherigen Regionsankern wenigstens
   eine gehaltene aktive Passage des Artikels. Bei einer konkreten Passage werden
   ihre Lineage-Nachfolger aufgelöst: mindestens ein Nachfolger muss existieren und
   **alle** müssen aktiv und gehalten sein. Ein bekannter Teil einer später geteilten
   Passage genügt nicht für das gesamte ursprünglich gebundene Objekt.
4. Der Bezugspunkt `(x,y)` liegt innerhalb der Kartengröße und wenigstens einer bereits
   erlaubten Region. Die vorhandene `visiblePoint`-/Polygonentscheidung einschließlich
   Randpunkten wird wiederverwendet. Nicht der Stamp-Footprint, seine Skalierung oder
   das Bildrechteck entscheidet. Marker kennen keine zusätzliche Höhen-/LOS-Regel.

Erst danach werden ID, Koordinate und Artikeltitel in die Antwort geschrieben.
Ungebundene Regionen bleiben privat. Ein bekannter Artikel macht seinen außerhalb
bekannter Regionen liegenden Marker nicht sichtbar; eine bekannte Region macht den
darin verankerten unbekannten Artikel nicht bekannt. Für GM-Ansichten gilt der
bestehende vollständige Kartenblick. Dies erweitert keine private Briefperspektive.

Der Voll-Digest enthält die stabil nach UTF-16-ID sortierte `entities`-Projektion.
Der Raster-Digest bleibt unverändert: Marker, Titel und ihre Verknüpfungen sind nicht
in das Hintergrundbild eingebrannt. Verborgenes Stamp-Asset, seine Rotation oder eine
unbekannte Artikeländerung dürfen den Spieler-Digest nicht ändern. Ein sichtbarer
Artikeltitel darf ihn ändern, weil das Wiki denselben Titel bereits ausgibt.
Bei Perspektivwechsel, Widerruf oder terminalem Ladefehler verschwinden alte Marker,
Liste, Auswahl und Detaildaten gemeinsam. Eine spätere Antwort einer alten Perspektive
darf sie nicht wieder einsetzen. Artikelöffnen prüft aktuelle Rechte erneut.

### Quellen, Assetpakete und ausdrücklich offene Liefergrenze

Die parallel entstandenen [Assetpakete](../../packages/szene/src/assetpaket.ts) speichern
Referenzen, Dateihashes, Maße/Anker und gehashte Lizenztexte. Das vorhandene
[Asset-Gate](../../assets/README.md) prüft echte Dateien und sichere SVGs. Der
[Grundriss-Generator](../../packages/forge/src/grundriss.ts) erzeugt ein gültiges
TacticalMapDocument, Knoten und einen Bericht; seine [SVG-Vorschauen](../spikes/grundriss/README.md)
sind ausdrücklich Diagnoseartefakte. In den gelesenen Server-/Client-/Renderer-Dateien
ist noch kein Assetpaket- oder Grundriss-Lieferpfad vorhanden.

Für diesen Schritt werden keine Packdateien angefordert, keine Lizenzinformationen
aus privaten Karten publiziert und keine SVGs aus Nutzereingaben ausgeführt. Die
Originalkarte, UVTT-Quelle und GM-Provenienz bleiben hinter den bestehenden GM-Routen;
Spieler erhalten weiterhin nur serverseitig geschützte Rasterkacheln und projizierte
Marker. Bereits im sichtbaren Hintergrundbild enthaltene Dekoration ist keine
eigenständig verborgene Entität. Die Objektbindung behauptet nicht, geheime Bilddetails
innerhalb einer erlaubten Region nachträglich entfernen zu können.

Ein späterer echter Stamp-Sprite-Pfad braucht Asset-Bytes, unveränderliche Packversionen,
auflösbare Lizenzbelege, einen autorisierten Liefer-/Maskenpfad und vollständige
Restore-Verfügbarkeit. SQL011 speichert heute nur `Stamp.a`, **nicht** diese Packbytes
oder Packmanifest-Snapshots. Native V4 trägt die Karte vollständig, kann aber daraus
keine fehlende Assetbibliothek wiederherstellen. Diese Lücke darf weder durch neue
Felder im geschlossenen TacticalMapDocument noch durch veränderliche lokale Dateipfade
verdeckt werden; sie gehört in eine gesonderte Entscheidung vor einer solchen Lieferung.

### Plan, Sitzung, Entwürfe und vorhandenes Native-Format

Bindung, Lösen, neuer PlacePoint und eine ausdrücklich bearbeitete Place-Position
bleiben lokale Änderungen eines Kartenentwurfs. Ein Save schreibt ausschließlich
die nächste Kartenrevision. Entfernen eines PlacePoints entfernt im selben Entwurf
seinen Anker und einen eventuell vorhandenen `geometryElevation`-Eintrag. Bindung lösen
lässt die Geometrie stehen. Anonymer Stamp-Masseneditor oder Terrain-Paint entsteht nicht.

Die vorhandenen Command-IDs/CAS-Bedingungen bleiben wirksam. Ungewisser Retry behält
seine Payload. Ein später Save-Ack darf einen inzwischen geöffneten anderen Karten-
oder Bindungsentwurf nicht überschreiben. Während eigener Übertragung sind die
zugehörigen Felder gesperrt; 409 erhält den Entwurf und bietet explizites Neuladen.

Die Szene pinnt weiterhin `mapId + mapRevision + contentHash`. Dieser Hash umfasst
bereits alle Anker. Geometrie und Bindung sind eingefroren; **aktuelles Wissen und
aktuelle Wiki-Titel bleiben Projektion**. Neue Freigaben können einen zuvor unbekannten
Marker der alten Karte sichtbar machen; spätere Plan-/Bindungsänderungen tauschen
ihn in einer laufenden Sitzung nicht aus. Aktive Start-Retries bleiben idempotent.

Weder SQL013 noch Native V5 sind für diesen Vorschlag nötig. Native V3/V4 enthalten
die erforderlichen Dokumente/Anker schon und dürfen in ihren veröffentlichten Bytes
unverändert bleiben. Hinzu kommen Roundtrip-Tests für tatsächlich benutzte stamp/place-
Bindungen. Der 50-Schritt-Live-Undo bleibt auf Tokens und Portale beschränkt; eine
Vorbereitungsrevision wird nicht nachträglich zu einem Live-Patch umgedeutet.

### Konkrete Mengengrenze vor Implementierung entscheiden

Ein gültiges TacticalMapDocument erlaubt 50.000 Stamps plus 20.000 Places. Das aktuelle
Renderer-Gate akzeptiert jedoch höchstens 20.000 Pins und erzeugt ein Graphics-Objekt
je Pin. Die bestehende Beispielkarte mit 20.000 **anonymen** Stamps beweist deshalb
noch keine 70.000 gebundenen interaktiven Kartenobjekte.

Vorschlag: Der Server behält die vollständige erlaubte Projektion bis zur bestehenden
Geometriegrenze; Indizes für Ziele, Anker, Titel und Lineage vermeiden eine Abfrage pro
Marker. Die Outline verwendet Suche und eine feste Seite von 100 erlaubten Einträgen.
Die Karte zeigt einen ausdrücklich benannten, deterministisch gewählten Ausschnitt
von höchstens 20.000 erlaubten Markern; ein ausgewählter Outline-Eintrag wird darin
immer berücksichtigt. Die Anzeige nennt „N von M bekannten Objekten auf der Karte“,
wenn sie begrenzt. N und M zählen ausschließlich die schon erlaubte Projektion.
Es wird weder eine valide Archivdatei abgewiesen noch still ein Objekt aus der
zugänglichen Navigation entfernt. Alternativ kann Root den Renderer erst nach einem
gemessenen Lastnachweis auf die volle Vertragsgrenze erweitern. Keine Variante ist
durch diesen lesenden Entwurf bereits als performant nachgewiesen.

## Abnahme und Umsetzungsschnittstellen

| Prüfung | Konkreter Beleg |
| --- | --- |
| Positive Kette | Native/Rasterkarte → Place markieren oder importierten Stamp wählen → Artikel/Passage binden → Revision/Plan speichern → normal starten → Spielerpin und Outline → echter Wiki-Reader |
| Zwei unabhängige Grenzen | Bekanntes Objekt außerhalb bekannter Region, unbekanntes Objekt innerhalb bekannter Region, ungebundenes Objekt und passagengebundenes Objekt bei nur teilweise bekannten Nachfolgern bleiben abwesend |
| Wissenszwilling | Verborgenes Label/Asset/Position/Anker verändern weder Spielerantwort, Digest, Realtime-Sequenz noch DOM; fremde IDs liefern die bestehende einheitliche Verweigerung |
| Control/Perspektive | Zwei kontrollierte Figuren mit disjunktem Wissen, Wechsel und Grant-Widerruf; eine Control-Erteilung vereinigt ihre Kenntnisse nicht |
| Rechte-/Antwort-Rennen | Auswahl offen, dann Wissen widerrufen; alter Poll kommt spät; Marker, Beschriftung und Wiki-Aktion bleiben entfernt |
| Lebenszyklus | Kartenrevision B nach Start von A; A zeigt weiterhin die alte Bindung/Position. Neuer Abend verwendet erst den bewusst gespeicherten neuen Plan. Gleiche Start-ID setzt nichts zurück |
| Entwurfsrennen | Save-Ack verloren oder gehalten, danach andere Karte/Bindung gewählt; keine falsche Erfolgsmeldung, kein überschreibender Callback, Retry nur mit ursprünglicher Payload |
| Roundtrip | Aktive und beendete Sitzung mit allen drei Ankerarten durch realen Native-V4-Export/Restore; IDs, Hashes, Plan und Projektion bleiben gleich. Rehashte Fremdartikel-/Passagen-/fehlende Geometrieziele werden abgewiesen |
| DOM/Grafik | Identische erlaubte Objekte, Tastaturwahl und Artikelaktion, fehlendes WebGL, Überlagerung mehrerer Marker, Auswahlentfernung bei Scope-Wechsel; keine Drag-Aktion für Kartenobjekte |
| Grenzen | Punkt auf Regions-/Kartenrand, negative Punkte, UTF-16-Sortierung und vollständige Outline über 20.000 erlaubten Pins; verdeckte Gesamtzahlen sind nicht ableitbar |

Nach Annahme beschränkt sich der Produktänderungssatz auf
`protocol/src/tactical.ts`, `server/src/domain/tactical.ts`,
`client/src/features/TacticalPreparation.tsx`, `TacticalView.tsx`, `TableView.tsx`
und deren fokussierte Tests/CSS. `TacticalCanvas` und `render` werden nur angepasst,
falls Auswahl-/Mengengrenzen es konkret erfordern. Kein neuer Rechtepfad, keine neue
SQL-Tabelle und kein neuer Native-Formatindex werden für die Entity-Bindung eingeführt.

Dieser Entwurf beruht auf Quelltext- und Designdokumentprüfung. Es wurden dafür keine
Tests, Builds, Browser oder Dienste gestartet und keine Produktdateien geändert.
