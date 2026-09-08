# Karten und Unterkarten löschen · 2026-09-08

Vom Nutzer ausdrücklich angefordert: Karten sollen auch mit Unterkarten löschbar sein,
erreichbar über ein Rechtsklick-Menü. Die Spielleitung soll einen Innenraum entfernen und
an demselben Eingang später wieder eine neue Unterkarte anlegen können.

Root hat folgenden Vertrag nach Prüfung von `betreten.ts`, Migrationen 013/014 und dem
unabhängigen Daten-Intake zur Umsetzung freigegeben. Er erweitert den laufenden
Kartenauftrag; Chronist und freier NPC-Generator bleiben vollständig im Gesamtziel.
Die Arbeit läuft in den bestehenden LangGraph-Arbeitspaketen; deren abschließende
Kartenverifikation muss diesen zusätzlichen Lebenszyklus ebenfalls belegen.

## Produktverhalten

- Kartenbibliotheken zeigen direkt bedienbare Kartenzeilen mit Öffnen und einem sichtbaren
  Drei-Punkte-Menü. Rechtsklick und Tastatur öffnen dasselbe Menü. Auf Touch bleibt es erreichbar.
- Das Menü bietet die vorhandenen Öffnen-/Bearbeiten-Wege und „Karte löschen …“.
  Bei einem Gebäude mit Innenraum gilt die Löschaktion ausdrücklich der Unterkarte, nicht
  dem Gebäude, seinem Wiki-Eintrag oder seiner Figur.
- Der Bestätigungsdialog lädt eine aktuelle serverseitige Vorschau. Er nennt die ausgewählte
  Karte, jede mitbetroffene Unterkarte und vorbereitete Szenen, die eine neue Karte benötigen.
  Eine Kaskade ist nur mit genau dieser angezeigten vollständigen Menge zulässig.
- Wird eine betroffene Karte gerade am Tisch verwendet, verhindert ein konkreter Hinweis
  die Löschung. Ein Konflikt aktualisiert den Dialog; er löst keine automatische zweite Löschung aus.
- Nach erfolgreichem Löschen sind Karten aus aktiven Listen, Betreten und Bearbeitung entfernt.
  Ein überlebender Elterneingang ist wieder frei. Die Oberfläche wechselt zur noch bestehenden
  Elternkarte oder zur Bibliothek. Ungespeicherte Entwürfe behalten ihren bisherigen Schutz.
- Frühere gespielte Szenen behalten ihre tatsächlichen historischen Kartenrevisionen.
  Vorbereitete Szenen zeigen „Karte gelöscht – neue Karte auswählen“; ihre alten Quittungen
  werden nicht umgeschrieben. Neue Sitzungen können eine gelöschte Karte nicht übernehmen.

## Warum ein eigener Lebenszyklus erforderlich ist

`betreten_karten` ist bislang unveränderlich und besitzt genau eine Verbindung je Eingang.
Native V6 verlangt zu jeder alten Betreten-Quittung die passende dauerhafte Kante und eine
belegte Elternregion. Ein direktes DELETE, eine Mutation historischer Zeilen oder ein bloß
gelockerter Primärschlüssel würde Wiederherstellung und gespeicherte Quittungen beschädigen.

Migration **026**, native **V15** ergänzen deshalb `map_lifecycle_events`. Unveränderliche
Löschereignisse halten die bestätigte Kartenmenge, Pins, abgelöste Verbindung, betroffene
Pläne und den ursprünglichen ACK fest. Spätere Ersatzverbindungen und ihre Betreten-Quittungen
werden ebenfalls als Ereignisse gespeichert. Die aktuelle Hierarchie ergibt sich aus
Baseline-Verbindungen und neuen Verbindungen abzüglich gelöschter Karten. Die alten Tabellen
bleiben bytegleich; der Sonderzugang zum Löschen ganzer Kampagnen wird nicht verwendet.

V15 prüft jede historische abgelöste Kante und zugehörige Quittung selbst gegen eine belegte
frühere Elternrevision. Nur die so geprüften historischen Verbindungen werden aus der
Validierungsprojektion für den eingefrorenen V6-Kern ausgenommen. Die exportierten Daten
werden dabei nicht ersetzt. Der freigegebene Eingang darf anschließend auch geometrisch
entfernt werden. Die Reader V1–V14 bleiben unverändert. Migration **027** und native **V16**
sind damit für den späteren Chronisten reserviert.

### Unabhängige Gegenprüfung und notwendige Ergänzung

Ein echter API-/Exportfall zeigte: Auch alte Karten ohne Kartografie haben nach Betreten,
Löschen und Ersetzen unterschiedliche Karten-CAS und Geometrierevisionen. Ein weiterer
V1-Revisionssave lieferte deshalb beim Export `tactical_map_revisions: missing same-campaign
reference`: der eingefrorene V3-Prüfer deutet die ACK-Version als Revisionsnummer. Für
diesen belegten Fall ergänzt 026/V15 `map.revise` in derselben Ereignistabelle. Das Ereignis
enthält die konkrete Revision, CAS, Inhaltshash und unveränderten Original-Request/ACK;
es wird mit Revision und Quittung gemeinsam gespeichert. V15 prüft die eindeutige monotone Zuordnung und
alle ursprünglichen Referenzen, bevor ausschließlich die Validierungsprojektion den alten
ACK in eine Revisionsnummer übersetzt. Originalbytes und V1–V14 bleiben unverändert.
V2-Revisionssaves verwenden weiterhin ihre vorhandene Kartografie-Zuordnung.

Die zweite echte rote Gegenprobe verwendete einen korrekt erzeugten Ersatzinnenraum und
eine spätere Elternrevision: Ein neu versiegelter Import ohne den aktuell benötigten Eingang
wurde zunächst angenommen. V15 muss zusätzlich nach dem Ereignis-Replay die vollständige
aktive Hierarchie mit den eingefrorenen V6-Regeln prüfen. Historisch belegte Eingänge dürfen
nach vollständiger Löschung fehlen; aktive Ersatzverbindungen benötigen einen heutigen
Elternknoten. Beide positiven Restore-Abläufe bestehen im unabhängigen Review bereits.
Nachweis: `packages/server/test/map-lifecycle-native-review.test.ts`.

## HTTP-Vertrag

GM-only, sowohl `kind=atlas` als auch `kind=tactical`:

`GET /api/campaigns/:campaignId/maps/:kind/:mapId/deletion-preview`

```ts
{
  root,
  maps: [{ kind, id, name, version }],
  incoming: { parentKind, parentMapId, knotenId, parentVersion } | null,
  affectedPlans: [{ sceneId, name, version, mapId }],
  blockers: [{ sessionId, sceneId, name, mapId }],
  confirmationHash
}
```

`POST /api/campaigns/:campaignId/maps/:kind/:mapId/delete`

```ts
{ commandId, expectedVersion, confirmationHash, confirmedMapIds }
// confirmedMapIds: exakt sortierte Vollmenge qualifizierter Schlüssel `${kind}:${id}`.
// Dauerhafter ACK:
{ commandId, root, deletedMaps, parent: { kind, id, version } | null, affectedSceneIds }
```

Der Server sperrt Kampagne und menschliche GM-Mitgliedschaft und leitet die Vorschau in
derselben Transaktion neu ab. Alle Karten-/Eltern-/Planversionen, Hash und bestätigte Menge
müssen übereinstimmen. Aktive Tischverwendung erzeugt `409 map-in-use`, ohne Teileffekt.
Betroffene Karten-CAS und gegebenenfalls die überlebende Eltern-CAS steigen; der äußere
Elternknoten bleibt unverändert. Unveränderlicher ACK und Ereignisse committen gemeinsam.

Ein identischer autorisierter Delete-Retry liefert den ursprünglichen ACK auch nach späterer
Neubelegung des Eingangs. Ein anderer Request mit gleicher `commandId` ist ein Konflikt.
Ein alter Betreten-Retry darf weder die gelöschte Karte öffnen noch die neue Karte als
angeblich ursprüngliches Ergebnis zurückgeben.

Beliebige historische `getMap`-/Kachelparameter öffnen keine gelöschte Karte wieder im
Editor. Der gesondert autorisierte historische Sessionpfad bleibt lesbar und wissensmaskiert.
Beim Atlas werden auch Bildabruf und Import-Deduplizierung angepasst, damit ein identischer
erneuter Import nicht versehentlich ein gelöschtes Kartenobjekt zurückgibt.

## Schreibflächen und Abnahme

Daten-Builder: Protocol-Verträge, Migration/IO V15/Restore/Löschabdeckung,
`domain/{tactical,betreten,atlas,bundles,deletion}` und zugehörige HTTP-Grenzen.
UI-Builder: Kontextmenü, Kartenzeilen in den beiden Bibliotheken, Unterkarteneinträge,
Dialog und Navigation, vorbereitete Szenen mit gelöschter Karte.
Root: unabhängiger Integritäts-/Browserreview und Lieferung.

Nachweise müssen echte Löschung und erneutes Anlegen am selben Eingang, mehrstufige
Unterkarten, veraltete Vorschau, parallele Änderungen, Rollen-/Kampagnengrenzen,
aktive Tischverwendung, ursprüngliche Delete-/Betreten-Quittungen, unveränderte historische
Sessionansichten und Native Export/Restore samt Folgebearbeitung prüfen. Im Browser werden
Rechtsklick, Tastatur, Touch, Abbruch und erfolgreicher Bestätigungsdialog geprüft.
Gezielte betroffene Tests und Konsumenten; keine vollständige Suite.
