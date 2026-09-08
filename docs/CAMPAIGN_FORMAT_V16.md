# Native Kampagnensicherung v16

V16 ergänzt Migration `027_chronist.sql` um das Modul `chronist` und
`chronistSchemaVersion: 1`. Die eingefrorenen Tabellen, Hashregeln und Parser von
V1–V15 bleiben unverändert. Die aktuelle Fassade liegt in
`packages/io/src/native-v16/current.ts`. Solange beide Chronist-Tabellen leer sind,
delegiert sie an V15 und dessen bisherige datenabhängige Formatwahl.

| Tabelle | Gespeicherte Daten |
| --- | --- |
| `chronist_laeufe` | Ursprüngliche Startanfrage und ACK, unveränderlicher Quellsnapshot, öffentliches Providerprofil, explizite menschliche Start-/Resume-Entscheidungen, Ausführungsintervalle, Unitpläne, vollständige Dispatchdaten, Callbelege, Verbrauch und echte LangGraph-Checkpoints |
| `chronist_vorschlaege` | Unveränderlicher geprüfter Originalvorschlag und Hash, bearbeitbarer Entwurf und Hash, sämtliche Quellenabhängigkeiten, Version und Entscheidung; nach Einreichen die ursprüngliche Anfrage und das ursprüngliche ACK |

Bigints bleiben dezimale Zeichenketten. Das Modul und der Gesamthash enthalten die
Originalzeilen. Export liest einen konsistenten Datenbankstand. Er enthält keine
Zugangsdaten, Header, Prozessumgebung oder Providerfehlertexte. Der gespeicherte
Dispatch enthält nur den vom festen Profil berechneten Requestbody. Zugangsdaten
und Transportaktivierung gehören zur lokalen Laufzeitkonfiguration.

## Quellen, Zustimmung und Verbrauch

Ein Snapshot bindet Artikel, Passage, Revision, kanonischen Blockhash, damaligen
Titel und die feste Textabbildung `plain-block-1`. Quellen sind nach
`entryId/passageId/revisionId/contentHash` mit UTF-16-Codeunit-Vergleich geordnet.
Der Scopehash bindet zusätzlich Modus, gewählte echte Spielsitzung, Budget,
deterministischen Plan und Provider-ID, Ort, Modell, Profil und Fingerprint. Die
Planrezeptur verwendet Elternindizes statt ihrer vom Lauf abhängigen Unit-IDs;
der Hash enthält weder sich selbst noch einen zyklischen abgeleiteten Hash.

Sitzungsnotizen müssen vorher als gewöhnliche Notizpassagen gespeichert und
ausdrücklich ausgewählt sein. Die paginierte Sitzungshilfe enthält ausschließlich
sichtbare Szenenmetadaten und bestätigte, erneut geprüfte Würfelergebnisse.
Chats, rohe Receipts und deren Wissenskontext werden nicht automatisch übernommen.
Jeder externe Start und jedes externe Resume benötigt die Zustimmung zum exakten
Scopehash. Alle dabei beteiligten menschlichen Identitäten werden auch nach dem
Austritt aus der Kampagne exportiert.

### Freigabebeleg

Die Zustimmung zu externer Verarbeitung ist keine Behauptung der Oberfläche. Die
Vorschau stellt serverseitig eine Freigabe aus: ein mit dem Anwendungsgeheimnis
signiertes Einmal-Token über Kampagne, Person, Scopehash, Providerfingerprint,
Modell und Ablauf, gültig fünf Minuten. Start und Resume verlangen je ein eigenes,
frisches Token; nur die kanonische base64url-Schreibweise gilt.

Der Beleg in `controlEvidence` enthält **niemals das Token**, sondern zwei Felder:

| Feld | Bedeutung |
| --- | --- |
| `freigabeAblaufAt` | Ablaufzeitpunkt der verbrauchten Freigabe in Millisekunden, nie kleiner als `decidedAt` |
| `freigabeHash` | SHA-256 über die dekodierten Tokenbytes, 64 Hexzeichen |

Bei `location: "lokal"` sind beide `null`; ein Token ist dort verboten. Bei
`location: "fremd"` sind beide gesetzt und nie `null`. **Altbestand:** Belege, die
vor Einführung dieser Felder geschrieben wurden, führen sie gar nicht; sie gelten
dann als `null` und bleiben importierbar. Fehlt nur eines der beiden Felder, oder
steht in einem fremden Beleg ausdrücklich `null`, wird der Export abgewiesen.

Der Verbrauch ist dauerhaft, nicht prozesslokal: Start und Resume prüfen unter der
globalen Dispatch-Sperre, ob irgendein Lauf diesen Abdruck bereits trägt. Migration
`029_chronist_freigabe.sql` trägt dafür einen GIN-Index über `controlEvidence` und
einen partiellen Unique-Index über den Startabdruck als strukturellen Rückhalt; sie
ändert weder Tabellen noch Spalten und lässt `027_chronist.sql` unberührt.

Callbelege folgen `reserved → dispatched → returned/failed/unknown`. Der
Transport verbraucht das Permit unmittelbar vor I/O einmalig per CAS. Ein CLI-
Bridgepfad prüft denselben bereits verbrauchten Dispatch unmittelbar vor seinem
Upstream-I/O erneut, einschließlich aktueller Rechte, Quellen, Abbruch, Fence und
Deadline. Datenbanktransaktionen bleiben während Provider-I/O geschlossen.

Eine globale PostgreSQL-Advisory-Sperre, Kampagnensperre und Run-Fence schützen
kampagnenübergreifende Parallelität und kumulative Reservierungen auch bei mehreren
Serverprozessen. Bekannte Teilverbräuche bleiben erhalten; bei unbekanntem Ausgang
bleibt der übrige Output gebunden. Eine neue Ausführung setzt kein Budget zurück.
Ein abgelaufener reservierter Call ist nachweislich nicht versandt; ein abgelaufener
versandter Call bleibt unbekannt. Nur ein ausdrückliches Resume darf einen weiteren
Attempt auslösen. Späte Belege können den ursprünglichen Call ergänzen und müssen
Verbrauchszähler monoton fortschreiben.

## Fester Checkpoint-Codec

`ChronistCheckpointSaver` ist ein tatsächlicher `BaseCheckpointSaver` für die
gepinnten Pakete LangGraph 1.4.14 und Checkpoint 1.1.5. Er speichert `getTuple`,
`list`, `put`, `putWrites` und deren Parent-/Pending-Write-Semantik. Pro Namespace
bleiben die letzten zwei vollständigen Checkpoints erhalten; die explizite
Pruninggrenze erklärt frühere Eltern. Ein gezielt angefragter entfernter Checkpoint
wird niemals durch einen neueren ersetzt. Verschachtelte `work:<task-id>`-
Namespaces bleiben getrennt; fachliche Call-, Ergebnis- und Entscheidungsbelege
werden beim Pruning nicht entfernt.

`chronist-checkpoint-json-1` ist ein geschlossenes Tagformat für JSON-Werte,
`undefined`, Arrays, gewöhnliche Objekte, den neutralen Fehler `graph-error` und
genau einen fest definierten Send-Umschlag. Ein Send enthält ausschließlich das
bekannte Ziel `work`, `{runId, unitId, attempt}` und eine begrenzte optionale
Timeoutdauer. Native liest diesen Umschlag als Daten und prüft ihn gegen den Plan.
Nur der Laufzeitsaver rekonstruiert danach die eine statisch importierte,
versionierte Framework-Send-Form. Bytes wählen keine Klassen, Module oder
Konstruktoren. Getter, fremde Prototypen, Symbole, gefährliche Objektschlüssel,
unbekannte Tags, Duplicate-Keys und DeltaSnapshots werden abgewiesen.

Native prüft außerdem die festen Kanal-, Node-, Namespace-, Metadaten- und
Pending-Write-Formen. `done` ist nur mit der passenden gespeicherten Antwort,
erneut abgeleiteten Kandidaten/Ablehnungen und persistierten Originalen zulässig.
Ein manipulierter Status darf eine nicht aufgerufene Unit nicht überspringen.
Worker-Unit, Attempt, Antwort und Kandidaten müssen zusammengehören. Dauerhafte
Dispatchdaten ohne einen zugehörigen Parent-Checkpoint sind ungültig.

## Einreichen und Wiederherstellen

Einreichen sperrt Vorschlag, Kampagne und Zielversion. Neue menschlich verfasste
Passagen erhalten `geltung: antrag`, `praegung: null` und neue IDs. Der gemeinsame
Dokumentwriter erhält existierende Passagen, Tags, Autoren und historischen Kanon
unverändert. Dokumentrevision, Originalanfrage und ACK werden gemeinsam committed
oder gemeinsam zurückgerollt. Ein identischer autorisierter Retry gibt das
ursprüngliche ACK auch nach späteren Revisionen oder Prägungen zurück. Dieselbe
Command-ID mit anderen Daten führt zu einem Konflikt.

Die bekannte Migration-002-Ausnahme bleibt eng: Nur ein leerer erster
Revisionssnapshot mit `created_at: "0"` besitzt keine älteren Snapshotbytes.
Sein erster vollständiger Nachfolger erhält die vorhandenen Passage-IDs und
erfindet keine frühere menschliche oder Actor-Autorschaft. Andere fehlende
Vorgängersnapshots werden nicht ergänzt.

Restore legt zuerst die bisherigen Fachdaten, anschließend Läufe und zuletzt
Vorschläge an. Nach der normalen semantischen Vergleichsprüfung invalidiert es
ausdrücklich die alte Laufzeit: `lease_owner` und `lease_until` werden `NULL`,
`fence` wird um eins erhöht. Nur diese drei Laufzeitfelder unterscheiden sich beim
erneuten Export; Requests, ACKs, Snapshots, Calls, Verbrauch, Entscheidungen und
Checkpoints bleiben unverändert und erneut V16-validierbar. Import, Restore,
Lesen und Export lösen keinen Modellaufruf und kein automatisches Resume aus.
Ein altes gespeichertes `running` wird ohne gültige Lease als pausiert angezeigt.

Vollständige Kampagnenlöschung entfernt Vorschläge vor Läufen und beide vor ihren
Wiki-/Sitzungsreferenzen. Normale Artikelbearbeitung oder ein Quellwechsel löscht
keine Chronist-Geschichte. Spieler erhalten Vorschläge nur bei aktueller Sicht auf
alle Abhängigkeiten und unverändertem Quellstand; Leitungen können veraltete
Vorschläge weiterhin prüfen, aber nicht einreichen.

Die gezielten Regressionen liegen in `chronist-runs.test.ts`,
`chronist-concurrency.pg.test.ts`, `chronist.test.ts`, `deletion.test.ts` und
`restore-order.test.ts`. Dazu gehören tatsächlicher Fan-out mit DB-Schließen/
Öffnen/Resume, manipulierter Native-Import, historische Submit-Retries und echte
Parallelität über zwei getrennte PostgreSQL-Verbindungen.
