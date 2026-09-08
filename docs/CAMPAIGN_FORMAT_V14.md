# Native Kampagnensicherung v14

V14 ergänzt die revisionsgebundene Kartografie aus Migration `025_tactical_cartography.sql`.
Die Geometrie bleibt `TacticalMapDocumentV1` mit `SceneDoc` v3. Kein alter Dokument-, Quellen-,
Revisions- oder Sitzungshash wird neu berechnet. V1–V13 behalten ihre bisherigen Leser.

Die aktuelle Fassade ist `packages/io/src/native-v14/current.ts`. Enthält eine Kampagne keine
Kartografiezeile, delegiert der Writer an v13/current und behält dessen datenabhängige ältere
Formatwahl. Das Öffnen einer alten Karte und ihre reine Legacy-Inferenz erzeugen keine Zeilen.
Alte Raum-/Gebäuderollen werden nur aus ursprünglichen Generatorknoten mit passender Quelle,
Version und ursprünglicher Regions-ID abgeleitet. Später angelegte Namensmetadaten dürfen eine
fest angefragte historische Revision nicht umtypisieren; unbelegte Polygone bleiben generisch.

V14 ergänzt das Manifestfeld `cartographySchemaVersion: 1` und das Modul `cartography` mit
Anzahl und SHA-256 über die zusätzliche Tabelle. Der vollständige Tabellenbestand geht weiterhin
in `manifest.contentHash` ein. Die neue Tabelle lautet:

| Spalte | Bedeutung |
| --- | --- |
| `map_id` | Bestehende taktische Karte |
| `campaign_id` | Dieselbe Kampagne wie Karte und Revision |
| `map_revision` | Konkrete Geometrierevision, Primärschlüssel mit `map_id` |
| `map_version` | CAS-Version bei Entstehung dieser Revision, eindeutig je Karte |
| `document` | Geschlossenes `TacticalCartographyV1` |
| `content_hash` | Kanonischer SHA-256 ausschließlich der Kartografie |

Der zusammengesetzte Fremdschlüssel referenziert `(map_id,campaign_id,revision)` in
`tactical_map_revisions`. Die Zeilen sind unveränderliche Historie. Jeder Region der zugehörigen
Geometrie entspricht genau ein Rollensatz; Grundstücks-, Straßen- und Stempelverweise müssen
innerhalb derselben Revision existieren. Nach der ersten Kartografiezeile einer Karte darf keine
spätere Revision ohne Sidecar folgen. Die Grenzen sind 2.048 Rollen, 50.000 Stempelzuordnungen und
1 MiB Kartografie-JSON; die bestehenden Geometrie- und Servergrenzen gelten zusätzlich.

Die CAS-Zuordnung ist ausdrücklich versioniert: Eine Gebäudemetadatenänderung oder Childverbindung
erhöht `tactical_maps.version`, ohne eine Geometrierevision zu erzeugen. Deshalb kann die quittierte
CAS-Version einer späteren `map.revise` größer sein als deren Revisionsnummer. Der eingefrorene
V3-Prüfer setzt diese Zahlen noch gleich. V14 prüft vor der Kernvalidierung die eindeutige,
streng wachsende Zuordnung `map_revision → map_version`, `map_version >= map_revision` und
`map_version <= tactical_maps.version`. Revision 1 entsteht mit Version 1. Jede weitere Sidecarzeile
benötigt genau einen passenden ursprünglichen `map.revise`-Beleg.

Ausschließlich für die unveränderte V13-Kernprüfung ersetzt eine flüchtige Validierungsansicht die
zugeordneten `ack.version` durch `map_revision`. Unzugeordnete alte Quittungen bleiben unverändert;
neuere Quittungen ohne eindeutige Zuordnung werden abgelehnt. Die ursprünglichen Quittungen werden
unverändert in die V14-Tabellen, Modulhashes und den Gesamthash aufgenommen. Restore schreibt genau
diese ursprünglichen Quittungen zurück; ein erneuter identischer Befehl erhält dieselbe CAS-Antwort.
Es gibt weder synthetische Revisionen noch eine Lockerung älterer Formatprüfer.

Der neue HTTP-Revisionsbody ist `{schemaVersion:2,commandId,expectedVersion,document,anchors,
cartography,addedBuildings}`. Er nutzt dieselbe `map.revise`-Transaktion für Geometrie, Kartografie,
Anker, neue Gebäudeknoten und Befehlsbeleg. Der alte Body bleibt für noch nicht umgestellte Karten
gültig. Danach wird er ausdrücklich abgelehnt, statt Rollendaten stillschweigend zu verlieren.
Neue Gebäudeintents enthalten nur Regions-ID, Titel und Gebäudetyp. Der Server bestimmt ihre
dauerhafte Herkunft und ihren Kindkeim. Bearbeitete Flächen tragen `authored:true` und keine
behauptete Generatorherkunft; unveränderte Flächen bewahren ihre gespeicherte Herkunft.
Ein neues Gebäude verlangt eine neu hinzugefügte Region samt Intent; bloßes Umtypisieren eines
vorhandenen generischen Polygons darf die atomare Knotenerzeugung nicht umgehen. HTTP-Import
und Revisionsbody werden ohne mutierendes Entfernen unbekannter Felder validiert, damit der
geschlossene Legacy-Zweig keine V2-Felder verschlucken kann.

`compositionHash` bindet den vorhandenen Dokument-/Ankerhash und Kartografiehash, ohne den alten
Hash zu ersetzen. `rasterDigest` bindet zusätzlich Revision, Zeichnerversion und Setting; in der
Spielersicht kommen Perspektive und Wissensmaske hinzu. Spieler erhalten keine vollständigen
Rollensätze, Seeds, Sperren oder privaten Gebäudedaten. Laufende Szenen lesen weiterhin exakt ihre
gepinnten Revisionen; `initial_snapshot.map` bleibt bei `id`, `revision` und `contentHash`.

Der ausschließlich für die Spielleitung zugängliche Map-Tilepfad akzeptiert `layer=background`.
Er liefert das ursprüngliche Bild ohne Kartografie und prüft denselben `revision`-/`rasterDigest`-
Pin vor und nach der Berechnung. Fehlt ein Originalbild, antwortet er mit 400. Die Antwort trägt
`X-Tactical-Layer: background` beziehungsweise `composite` und bleibt `private, no-store`.
Client-Texturidentitäten müssen die Ebene zusätzlich zum Pin enthalten. Der private Servercache
enthält ausschließlich dekodierte, maskierte Originalbytes vor dem Zeichnen, keine fertigen
komponierten Tiles. Der Sitzungspfad besitzt keinen Hintergrundmodus und zeichnet für Spieler
weiterhin alle freigegebenen Flächen hinter der Wissensmaske.

Restore erfolgt weiterhin ausschließlich in eine leere Zieldatenbank: Revisionen vor Sidecars,
anschließend abhängige Daten, vollständige FK-Prüfung und Semantic-Diff vor Commit. IDs werden
unverändert übernommen. Die vorhandene Kampagnenlöschung löscht Sidecars vor Revisionen und
berücksichtigt sie im Löschbeleg; der Historientrigger erlaubt das nur im bestehenden Löschkontext.

UVTT erhält die sichtbare Kartografie als gebackenes Bild. Der Fidelity-Bericht benennt den Verlust
der Rollen-, Sperr- und Bearbeitungssemantik. Der Bildexport bleibt auf 16 Megapixel beschränkt;
größere Vektorkarten bleiben nativ verlustfrei sicherbar. Es entsteht kein Vollraster mit dem
größeren nativen Geometriebudget.

Regressionen: `packages/szene/test/cartography.test.ts` und
`packages/server/test/cartography-integration.test.ts` prüfen geschlossene Verträge, atomaren
Rollback bei spätem Schreibfehler, Herkunft, Rechte, Pixelmaskierung, historische Pins,
CAS nach Metadaten/Childverbindung, identische Quittungen nach Restore und vollständiges Löschen.
