# Native Kampagnensicherung v15

V15 ergänzt Migration `026_map_lifecycle.sql`: Karten aus der aktiven Bibliothek entfernen,
ihren bestätigten Unterbaum stilllegen und einen freigegebenen Eingang wieder belegen.
Quellen, Kartenrevisionen, Knoten, ursprüngliche Verbindungen, Sitzungen und Quittungen
bleiben gespeichert. V1–V14 und ihre Hashregeln bleiben unverändert.

Die aktuelle Fassade ist `packages/io/src/native-v15/current.ts`. Ohne Lebenszyklusereignisse
delegiert sie an die vorherige Fassade und behält deren datenabhängige Formatwahl. Ein GET
oder eine Vorschau schreibt keine Ereignisse. V15 ergänzt `mapLifecycleSchemaVersion: 1`
und das Modul `map-lifecycle`; dessen Zeilen gehen unverändert in Modul- und Gesamthash ein.

| Spalte in `map_lifecycle_events` | Bedeutung |
| --- | --- |
| `seq` | Globale Identitätsfolge, im nativen Format dezimale Bigint-Zeichenkette |
| `command_id` | Eindeutiger dauerhafter Befehlsschlüssel |
| `campaign_id`, `actor_user_id` | Kampagne und historische menschliche Identität |
| `operation` | `map.delete`, `map.enter` oder `map.revise` |
| `request_hash`, `request` | Ursprüngliche Anfrage und kanonischer SHA-256 einschließlich Akteur/Kampagne/Operation bzw. Referenz |
| `payload` | Geschlossenes, operationsabhängiges Beweisobjekt mit `schemaVersion: 1` |
| `ack` | Unveränderte ursprüngliche Antwort |
| `created_at` | Belegzeit als dezimale Bigint-Zeichenkette |

Die Tabelle besitzt einen Append-only-Wächter. Normale Kartenlöschung nutzt keinen
Kampagnenlösch-Schalter. Nur die ausdrücklich autorisierte vollständige Kampagnenlöschung
entfernt auch diese Geschichte. Restore schreibt Originalzeilen und setzt die Identitätsfolge
transaktional auf das folgende freie `seq`; ein Fehler rollt Daten und Sequenz zurück.

## Löschen und erneutes Betreten

`map.delete` bewahrt die bestätigte Vorschau mit vollständigem Unterbaum, Karten- und
Eltern-CAS, betroffenen Szenenvorbereitungen und Hash. Zusätzlich wird jede abgelöste
Verbindung einschließlich ihrer damaligen Elternrevision festgehalten. Taktische Eingänge
müssen in genau dieser unveränderlichen Revision existieren; Atlas-Eingänge müssen auf
den gespeicherten Atlas-Knoten zeigen. Jede aus der alten V6-Validierungsansicht entfernte
Kante und Betreten-Quittung wird so ausdrücklich geprüft. Danach darf die freie Region aus
einer späteren Elternrevision entfernt werden.

Der Writer sperrt Kampagne und GM-Mitgliedschaft, leitet die Vorschau unter derselben Sperre
neu ab und verlangt den exakten bestätigten Unterbaum. Ein aktiver Tisch ist ein konkreter
Konflikt und verhindert alle Teiländerungen. Jede gelöschte Karte und die überlebende äußere
Elternkarte erhalten eine neue CAS-Version. Die gespeicherte Elternregion, Knotenmetadaten
und Kindkeime bleiben unverändert. Ein identischer autorisierter Retry liefert den originalen
Delete-ACK auch nach einer späteren Ersatzkarte; andere Eingaben zum selben Befehl werden
abgewiesen. Ein alter Betreten-Retry auf ein gelöschtes Ziel liefert einen Konflikt.

Die erste Verbindung an einer bislang freien Adresse nutzt weiterhin die unveränderte
Baseline `betreten_karten`. Ein Ersatz an einer bereits historisch belegten Adresse schreibt
`map.enter`: konkrete Kante, `createdEdge`, historische Elternrevision und CAS vor/nach dem
Befehl. Die ursprüngliche Baseline wird nicht überschrieben. V15 spielt die Ereignisse nach
`seq` ab und prüft danach die vollständige aktive Hierarchie mit den eingefrorenen V6-Regeln:
vorhandene aktuelle Elternregion, eindeutiger Elternteil und keine Kreise. Ein nur historisch
belegter Eingang reicht für eine noch aktive Ersatzverbindung nicht aus.

Aktive Bibliotheks-, Editor-, Quell-, Bild-, Export- und Kachelpfade verweigern gelöschte
Karten auch bei ausdrücklich angefragter Revision. Gesondert autorisierte historische
Sessionansichten bleiben lesbar; die bisherige Wissensmaskierung gilt weiter. Ihre
Geometrie, Revisionen, Raster und Tokenzustände bleiben unverändert. GM-Ansichten zeigen
weiterhin die aktuelle Karten-CAS; der Sitzungsstatus wechselt beim Szenenende regulär.
Vorbereitungen behalten Version und frühere Quittungen und liefern `unavailable:"map-deleted"`.
Ein neuer Szenenstart damit scheitert mit verständlicher Fehlermeldung; die gesamte
Starttransaktion einschließlich eines vorherigen Sitzungswechsels wird zurückgerollt.

## Alte Revisionsbefehle nach zusätzlichen CAS-Schritten

Ein realer V1-Revisionssave nach Unterkartenanlage und -löschung erzeugt etwa Geometrierevision
2 mit ACK-Version 4. Der eingefrorene V3-Prüfer setzt beide Zahlen noch gleich. Deshalb
schreibt derselbe Revisionsbefehl zusätzlich `map.revise`, wenn eine alte Karte ohne Sidecar
eine abweichende CAS-Version quittiert: `{schemaVersion:1,mapId,mapRevision,mapVersion,
contentHash}`. Revision, ursprüngliche Quittung und Zuordnung committen atomar.

V15 prüft passende unveränderliche Revision, Inhalt, Anker, Autor, Belegzeit, Originalanfrage,
Originalquittung und eindeutige monoton wachsende Zuordnung. V2-Revisionsbefehle behalten
die vorhandene Sidecar-Zuordnung aus V14. Nur eine flüchtige Validierungsansicht ersetzt den
belegten V1-ACK durch seine Revisionsnummer; die exportierten Originalquittungen, Hashes
und Antworten nach Restore werden niemals umgeschrieben.

## Öffentlicher Löschvertrag

GM-only: `GET /api/campaigns/:campaignId/maps/:kind/:mapId/deletion-preview`,
`kind=atlas|tactical`. Ergebnis: `{root,maps,incoming,affectedPlans,blockers,confirmationHash}`.
Kartenpins sind `{kind,id,name,version}`; die eingehende Verbindung enthält zusätzlich
`parentName` und `knotenId`.

`POST` auf denselben Basispfad plus `/delete` erhält
`{commandId,expectedVersion,confirmationHash,confirmedMapIds}`. Die bestätigten IDs sind
die vollständigen qualifizierten Schlüssel `${kind}:${id}`; höchstens 10.000 Karten.
ACK: `{commandId,root,deletedMaps,parent,affectedSceneIds,deletedAt}`.
Konflikte heißen `map-in-use`, `deletion-preview-changed`, `map-deleted` oder `conflict`.
Rollen- und Existenzfehler verwenden die bestehende einheitliche 404-Grenze.

Gezielte Nachweise: `map-lifecycle.test.ts`, `map-lifecycle-review.test.ts`,
`map-lifecycle-native-review.test.ts` und `restore-order.test.ts` im Server-Testverzeichnis.
Sie prüfen unter anderem Teilbestätigungen, veraltete Unterbäume, Rollback, Rechte, Atlas-
Reimport, Quittungswiederholung, historische Sitzungen und manipulierte native Verbindungen.
Der nächste für den Chronisten vorgesehene Slot ist Migration 027 / native V16.
