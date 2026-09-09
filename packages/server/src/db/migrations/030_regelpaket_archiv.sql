-- Ein Regelpaket soll aus der Bibliothek verschwinden koennen: erst „aus der Bibliothek nehmen"
-- (umkehrbar, immer erlaubt), und wenn nichts mehr darauf verweist auch „endgueltig loeschen".
--
-- Die Trigger-Entscheidung. `rule_packages` trug bis hier `protect_rule_packages BEFORE UPDATE OR
-- DELETE ... deny_history_mutation()` (004_gameplay.sql:7). Drei Wege waren denkbar:
--
--   1. Die Funktion `deny_history_mutation()` lockern. Verworfen: sie haengt an 24 Tabellen
--      (002_documents.sql:58, 017_campaign_deletion.sql). Eine Lockerung dort loest den Riegel
--      fuer die Chronik mit, und genau der soll bleiben.
--   2. Einen zweiten, engeren Trigger DAZU legen. Geht nicht: Trigger wirken konjunktiv. Jeder
--      einzelne darf abbrechen, keiner kann die Entscheidung eines anderen aufheben. Ein
--      zusaetzlicher Trigger kann nur mehr verbieten, nie weniger.
--   3. Den bestehenden Trigger durch einen engeren ERSETZEN. Gewaehlt.
--
-- Der neue Trigger ruft dieselbe unveraenderte Funktion, feuert aber nur noch BEFORE UPDATE. Die
-- Zusage der Oberflaeche — „Installierte Versionen bleiben unveraenderlich" — gilt damit
-- unveraendert weiter: der INHALT eines Pakets laesst sich nach wie vor nicht umschreiben, weder
-- ueber die Domain noch mit rohem SQL.
--
-- Fuer DELETE uebernehmen die vier Fremdschluessel den Schutz, die es ohnehin schon gab:
-- `campaign_rule_pins`, `actor_sheets`, `action_vollmachten` und `action_rolls` verweisen alle
-- ohne ON DELETE CASCADE auf `rule_packages`. Ein benutztes Paket weist die Datenbank also von
-- sich aus ab (SQLSTATE 23503), und zwar genauer als der Trigger es je konnte: nicht „Historie",
-- sondern „diese Zeile wird gebraucht". Die vier Fremdschluessel bleiben unangetastet.
--
-- Die Kampagnenloeschung aus 017 verliert nichts: sie durfte `rule_packages` schon vorher mit
-- gesetztem `chronicle.deleting_campaign` raeumen, jetzt braucht sie den Schluessel dafuer nicht
-- mehr. Erweiternd im Sinne von design/10 §1.4: alter Code loescht hier nirgends, fuer ihn
-- aendert die zusaetzliche Erlaubnis nichts.
DROP TRIGGER protect_rule_packages ON rule_packages;
-- statement
CREATE TRIGGER protect_rule_packages BEFORE UPDATE ON rule_packages FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
-- „Aus der Bibliothek genommen" ist eine eigene Zeile, kein Feld an `rule_packages`: das Paket
-- selbst bleibt unveraenderlich, und ohne die Zeile ist es wieder da, wo es war. Der Eintrag
-- nennt, wer es genommen hat und wann — mehr braucht eine umkehrbare Entscheidung nicht.
--
-- Kein Ereignisbuch nach dem Muster von 028: dort trug jeder Befehl eine Entscheidung ueber einen
-- fremden Antrag und musste als Beleg ueberdauern. Hier ist die Archivzeile selbst schon der
-- Beleg des Nehmens, das Zuruecknehmen loescht genau sie wieder, und ein endgueltiges Loeschen
-- ist nur moeglich, wenn nichts mehr auf das Paket zeigt — es bleibt also nichts zurueck, dem ein
-- Eintrag noch etwas erklaeren muesste. Alle drei Wege sind von sich aus wiederholbar; eine
-- `command_id` haette nichts zu schuetzen.
CREATE TABLE rule_package_archiv (
  campaign_id text NOT NULL REFERENCES campaigns(id),
  package_id text NOT NULL,
  version text NOT NULL,
  archived_at bigint NOT NULL,
  archived_by text NOT NULL REFERENCES users(id),
  PRIMARY KEY(campaign_id,package_id,version),
  FOREIGN KEY(campaign_id,package_id,version) REFERENCES rule_packages(campaign_id,package_id,version)
);
