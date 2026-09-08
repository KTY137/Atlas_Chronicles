# Native Kampagnensicherung v17

V17 ergänzt Migration `028_figurantrag.sql` um das Modul `figurantrag` und
`figurantragSchemaVersion: 1`. Die eingefrorenen Tabellen, Hashregeln und Parser von
V1–V16 bleiben unverändert. Die aktuelle Fassade liegt in
`packages/io/src/native-v17/current.ts`. Solange alle drei Antragstabellen leer sind,
delegiert sie an V16 und dessen bisherige datenabhängige Formatwahl — eine Kampagne
ohne Anträge bekommt also keine neue Formatnummer aufgedrängt.

| Tabelle | Gespeicherte Daten |
| --- | --- |
| `figurvorlagen_freigaben` | Welche Figurvorlage für Spieler wählbar ist, wer sie freigegeben hat, wann, ob sie wieder entzogen wurde, und die Version dieser Entscheidung |
| `figurantraege` | Antragsteller, gebundene Vorlagenrevision, gewünschter Name, die geprüfte **Abweichung** von den Vorlagenwerten, Zustand (`offen`, `bestaetigt`, `abgelehnt`, `zurueckgezogen`), Version, Entscheidungszeitpunkt und -person, Ablehnungsgrund und die bei der Bestätigung entstandene Figur |
| `figurantrag_events` | Ursprüngliche Anfrage, ihr Hash, der Zustand davor und danach und das ausgelieferte ACK jeder einzelnen Entscheidung |

Bigints bleiben dezimale Zeichenketten. Das Modul und der Gesamthash enthalten die
Originalzeilen. Export liest einen konsistenten Datenbankstand.

## Der Antrag ist ein eigenes Objekt

Eine Figur entsteht **erst bei der Bestätigung**, über denselben
`actor.instantiate`-Befehl, den die Spielleitung auch sonst benutzt — mit
`created_by` gleich Antragsteller und genau einem automatischen Kontrollgrant an ihn.
Es gibt nie eine unbestätigte Figur, und deshalb bleiben `authorizeActor` und seine
acht Aufrufer Zeile für Zeile unverändert. Eine Ablehnung, eine Zurücknahme und ein
abgewiesener Bestätigungsversuch hinterlassen keine Zeile in `actors`.

Der Antrag bindet die **Vorlagenrevision**, nicht die Vorlage: eine Revision ist
unveränderlich und inhaltsgehasht, während „die jeweils neueste Fassung" sich
zwischen Antrag und Entscheidung ändern könnte.

Je Person, Vorlage und Kampagne gibt es höchstens **einen offenen** Antrag
(partieller Unique-Index `figurantraege_ein_offener`). Zwei gleichzeitig offene
Anträge derselben Person auf dieselbe Vorlage sind ein Doppelklick, kein zweiter
Wunsch — und sie zwängen die Spielleitung zu zwei Entscheidungen über dieselbe Sache.
Ein Verstoß ist ein Konflikt; nach Rücknahme, Ablehnung oder Bestätigung ist der Weg
wieder frei.

## Anfangswerte sind eine Abweichung, kein Bogen

`anfangswerte` nennt **nur die Felder, die anders sein sollen**. Ein vollständiger
Bogen im Antrag hätte die Vorlage stillschweigend ersetzt: was der Spieler nicht
nennt, wäre auf den Paketstandard zurückgefallen, und die Spielleitung hätte einen
Bogen bestätigt, den sie nie so entworfen hat. Bei der Bestätigung entsteht der Bogen
deshalb als Vorlagenrevision, darüber die bestätigten Abweichungen, einmal durch
`validatePackageFields`. Ein nicht genanntes Vorlagenfeld bleibt unverändert stehen.
`actor_sheets.version` steigt dabei wie bei jedem anderen Schreiber auf diesen Bogen.

Ein Feld, das das Regelpaket nicht kennt, wird beim Antrag mit 400 abgewiesen statt
stillschweigend verworfen. Die `FigurantragCard` führt die Abweichung mit — auch in
`liste` —, damit die Spielleitung nicht blind bestätigt.

## Freigabe und Paketbindung

Eine Figurvorlage ist Werkstattmaterial; erst eine ausdrückliche Freigabe macht sie
für Spieler wählbar. Die Freigabe ist widerrufbar und trägt ihre eigene Version. Ein
Antrag auf eine nicht freigegebene Vorlage wird wie jeder unbekannte Verweis
beantwortet (410), nicht als Konflikt.

Die Bindung an das aktive Regelpaket (`campaign_rule_pins`) wird **zweimal** geprüft.
Beim Antrag freundlich: eine Vorlage aus einem anderen Paket erscheint in der Auswahl
gar nicht erst, und wer sie doch nennt, bekommt sofort einen Konflikt. Bei der
Bestätigung autoritativ: zwischen Antrag und Entscheidung kann die Spielleitung das
Paket gewechselt haben, und dann entsteht keine Figur. Ebenso muss die Freigabe im
Moment der Bestätigung noch stehen — ein Entzug dazwischen ist die Aussage, dass aus
dieser Vorlage keine neuen Figuren mehr entstehen. Der Antrag bleibt offen; die
Spielleitung kann ihn ablehnen oder die Freigabe erneuern.

## Spielerprojektion der Vorlage

`freigegebeneVorlagen` liefert ausschließlich `id`, `name`, `art`, `anfangswerte` und
`version`. Zwei Angaben fehlen bewusst:

- **`beute`** ist Spielleitungswissen. Die Beutetabelle verriete vorab, was an einer
  Figur hängt; sie wird beim Erschaffen ausgewürfelt, nicht angekündigt.
- **`loreEntryId`** wird für Spieler **immer** weggelassen — auch dann, wenn der
  Artikel im Wissensblick läge. Das ist die einfachste sichere Regel: die Alternative
  bräuchte für jede einzelne Vorlagenkarte eine zweite Wissensabfrage, und ein
  vergessener Pfad wäre ein stiller Hinweis auf einen Artikel, den niemand
  freigegeben hat. Wer den Artikel kennen darf, findet ihn im Wiki; die
  Vorlagenkarte ist nicht der Weg dorthin.

Auch `package` und `schemaVersion` fallen weg: beides ist Werkstattbuchhaltung. Die
Spielleitung sieht ihre Vorlagen über `getActorTemplate` unverändert vollständig.

## Was Native beim Einlesen nachrechnet

Geschlossene Feldmengen für jede Zeile, jede Anfrage, jede Nutzlast und jedes ACK;
ein unbekanntes Feld ist ein Migrationsfall, kein Detail. Zusätzlich:

- Jede Freigabe zeigt auf eine existierende Figurvorlage derselben Kampagne, und ein
  Entzug liegt nie vor seiner Freigabe.
- Jeder Antrag zeigt auf eine existierende Vorlagenrevision; die Aussagen der
  `CHECK`-Bedingungen aus 028 gelten hier noch einmal: nur ein offener Antrag ist
  unentschieden, genau ein bestätigter hat eine Figur, nur ein abgelehnter hat einen
  Grund. Die genannte Figur muss es geben.
- Anfangswerte sind Skalare mit Paketfeldnamen, höchstens 64 Stück — nie ein
  verschachteltes Dokument.
- `request_hash` wird nachgerechnet, nicht geglaubt. Der ACK-Zustand muss zur
  Operation passen, die Version zur genannten Erwartung, und die Befehls-ID eines
  Antrags zur ID im Ereignisbuch. Ein Ereignisbuch ohne seinen Antrag ist die
  Quittung von nichts und wird abgewiesen.
- Alle beteiligten menschlichen Identitäten werden exportiert, auch nach dem Austritt
  aus der Kampagne: sonst ließe sich die Sicherung nicht wieder einspielen.

## Wiederherstellen und Löschen

Restore legt die drei Tabellen zuletzt an — erst die Freigabe (sie zeigt auf ihre
Vorlage), dann der Antrag (er zeigt zusätzlich auf die Vorlagenrevision und auf die
bei der Bestätigung entstandene Figur), zuletzt das Ereignisbuch. Die
Identitätssequenz von `figurantrag_events.seq` wird wie die der anderen
Ereignisbücher transaktional zurückgesetzt.

Die vollständige Kampagnenlöschung räumt in der umgekehrten Reihenfolge: Ereignisbuch,
Anträge, Freigaben — alle drei vor Vorlage, Revision und Figur. `figurantrag_events`
trägt `deny_history_mutation`; `UPDATE` bleibt ausnahmslos verboten, `DELETE` nur mit
dem transaktionslokalen Kampagnenschlüssel aus 017.

Die gezielten Regressionen liegen in `packages/server/test/figurantrag.test.ts`,
`packages/io/test/native-v17-roundtrip.test.ts`, `deletion.test.ts` und
`restore-order.test.ts`.
