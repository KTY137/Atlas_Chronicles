# Native Kampagnensicherung v18

V18 ergänzt Migration `030_regelpaket_archiv.sql` um das Modul `regelarchiv` und
`regelarchivSchemaVersion: 1`. Die eingefrorenen Tabellen, Hashregeln und Parser von
V1–V17 bleiben unverändert. Die aktuelle Fassade liegt in
`packages/io/src/native-v18/current.ts`. Solange keine Kampagne ein Regelpaket aus
ihrer Bibliothek genommen hat, delegiert sie an V17 und dessen bisherige
datenabhängige Formatwahl — eine Kampagne ohne genommene Pakete bekommt also keine
neue Formatnummer aufgedrängt.

| Tabelle | Gespeicherte Daten |
| --- | --- |
| `rule_package_archiv` | Welche Paketfassung (Kampagne, Kennung, Version) aus der Bibliothek genommen wurde, wann und von wem |

Bigints bleiben dezimale Zeichenketten. Das Modul und der Gesamthash enthalten die
Originalzeilen. Export liest einen konsistenten Datenbankstand.

## Warum eine eigene Zeile und kein Feld am Paket

Eine installierte Paketfassung ist unveränderlich; ein Feld `archiviert` an
`rule_packages` hätte genau diese Zusage gebrochen. Die Aussage „aus der Bibliothek
genommen" betrifft ohnehin nicht das Paket, sondern die Ansicht darauf: sie ist
umkehrbar, und ohne die Zeile ist alles wieder so, wie es war. Deshalb eine eigene
Tabelle mit dem zusammengesetzten Fremdschlüssel auf `rule_packages(campaign_id,
package_id, version)` und demselben Primärschlüssel.

Kein Ereignisbuch nach dem Muster von `028_figurantrag.sql`: dort trug jeder Befehl
eine Entscheidung über den Antrag eines anderen Menschen und musste als Beleg
überdauern. Hier ist die Archivzeile selbst der Beleg des Nehmens, das Zurücknehmen
löscht genau sie wieder, und ein endgültiges Löschen ist nur möglich, wenn nichts mehr
auf das Paket zeigt — es bleibt also nichts zurück, dem ein Eintrag noch etwas erklären
müsste. Alle drei Wege sind von sich aus wiederholbar; eine `command_id` hätte nichts
zu schützen.

## Der Trigger auf `rule_packages`

Bis V17 hing an `rule_packages` ein `BEFORE UPDATE OR DELETE`-Trigger auf
`deny_history_mutation()`. `030` ersetzt ihn durch einen `BEFORE UPDATE`-Trigger auf
dieselbe, unveränderte Funktion. Der **Inhalt** einer installierten Fassung bleibt
damit genauso unveränderlich wie zuvor — auch mit rohem SQL. Das Löschen einer Zeile
bewachen ab jetzt die vier Fremdschlüssel, die es ohnehin schon gab:
`campaign_rule_pins`, `actor_sheets`, `action_vollmachten` und `action_rolls` zeigen
alle ohne `ON DELETE CASCADE` auf `rule_packages`. Sie sagen genauer, was los ist als
der Trigger es konnte: nicht „Historie", sondern „diese Zeile wird gebraucht"
(SQLSTATE 23503).

Ein zweiter, engerer Trigger **zusätzlich** zum bestehenden wäre kein Ersatz gewesen:
Trigger wirken konjunktiv, jeder einzelne darf abbrechen, keiner kann die Entscheidung
eines anderen aufheben. Und `deny_history_mutation()` selbst zu lockern hätte den
Riegel für 23 weitere Historientabellen mitgeöffnet.

## Was Native beim Einlesen nachrechnet

- Jede Archivzeile gehört zur exportierten Kampagne.
- Jede Archivzeile zeigt auf eine Paketfassung, die es in dieser Kampagne wirklich
  gibt — Kennung **und** Version zusammen, genau wie der Fremdschlüssel aus `030`.
- `archived_at` ist eine dezimale Zeitzahl, `archived_by` eine bekannte Identität.
  Wer die Kampagne inzwischen verlassen hat, wird trotzdem mitexportiert; sonst ließe
  sich die Sicherung nicht wieder einspielen.
- Kennung, Version und Kampagne zusammen kommen höchstens einmal vor.

## Wiederherstellen und Löschen

Restore legt `rule_package_archiv` ganz zuletzt an: die Zeile zeigt auf genau die
Paketfassung, die sie meint, und `rule_packages` steht weiter oben in `restoreOrder`.
Ein Blatt, auf das niemand zeigt.

Die vollständige Kampagnenlöschung räumt die Tabelle unmittelbar vor
`campaign_rule_pins` und `rule_packages`. `rule_package_archiv` trägt keinen
Historienriegel; sie ist eine umkehrbare Aussage über die Ansicht, keine Chronik.

Die gezielten Regressionen liegen in `packages/server/test/regelpaket-archiv.test.ts`,
`packages/server/test/regelpaket-archiv-http.test.ts`,
`packages/io/test/native-v18-roundtrip.test.ts`, `deletion.test.ts` und
`restore-order.test.ts`.
