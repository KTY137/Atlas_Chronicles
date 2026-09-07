-- Bis hier wies deny_history_mutation() jede Mutation ausnahmslos ab (002_documents.sql:58).
-- Das schützt die Chronik und machte zugleich das Löschen einer Kampagne unmöglich — auch mit
-- rohem SQL, weil der Trigger an 24 Tabellen hängt (design/10-hosted-betrieb-und-auslieferung.md
-- §1.1). Ein bezahlter Dienst muss löschen können, was ein Nutzer zu löschen verlangt.
--
-- Der Riegel bleibt und bekommt genau ein Schlüsselloch: DELETE ist erlaubt, wenn die laufende
-- Transaktion `chronicle.deleting_campaign` auf genau die Kampagne der betroffenen Zeile gesetzt
-- hat. Gesetzt wird ausschließlich per SET LOCAL, der Schlüssel endet also mit der Transaktion
-- und kann eine Verbindung nicht überdauern.
--
-- Warum an die campaign_id gebunden und nicht als Ja/Nein-Schalter (§7.1): So bleibt das Löschen
-- einer EINZELNEN Zeile weiterhin unmöglich. Löschbar ist nur eine ganze Kampagne, und nur die,
-- für die der Schlüssel gesetzt ist. Ein Schalter hätte die Append-only-Zusage für jede Zeile
-- aufgehoben; diese Bedingung hebt sie für genau eine Kampagne auf, die ohnehin verschwindet.
--
-- UPDATE bleibt ausnahmslos verboten. Eine Historie wird gelöscht oder sie bleibt — sie wird nie
-- umgeschrieben.
--
-- to_jsonb(OLD) statt fester Spaltennamen, weil dieselbe Funktion an 24 Tabellen hängt: 22 tragen
-- campaign_id direkt, revisions und lineage_events erreichen sie über entry_id -> entries. Beide
-- werden in der Löschreihenfolge vor `entries` geräumt, solange der Umweg also noch trägt.
--
-- Erweiternd im Sinne von §1.4: alter Code löscht an keiner Stelle, für ihn ändert die
-- zusätzliche Erlaubnis nichts. Die Migration ist damit rolling-update-fähig.
CREATE OR REPLACE FUNCTION deny_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  bereich text := nullif(current_setting('chronicle.deleting_campaign', true), '');
  zeile jsonb;
BEGIN
  IF TG_OP = 'DELETE' AND bereich IS NOT NULL THEN
    zeile := to_jsonb(OLD);
    IF zeile ? 'campaign_id' THEN
      IF zeile ->> 'campaign_id' = bereich THEN RETURN OLD; END IF;
    ELSIF zeile ? 'entry_id' THEN
      IF EXISTS (SELECT 1 FROM entries e WHERE e.id = zeile ->> 'entry_id' AND e.campaign_id = bereich)
      THEN RETURN OLD; END IF;
    END IF;
  END IF;
  RAISE EXCEPTION 'History is append-only' USING ERRCODE = '42501';
END;
$$;
-- statement
-- Die Quittung überlebt die Kampagne und darf deshalb keinen Fremdschlüssel auf sie tragen.
-- Sie belegt, dass gelöscht wurde und wie viel dabei verschwand — ohne einen einzigen Inhalt
-- aufzubewahren, denn genau den soll die Löschung ja entfernen.
CREATE TABLE campaign_deletions (
  campaign_id text PRIMARY KEY,
  campaign_name text NOT NULL,
  deleted_by text NOT NULL REFERENCES users(id),
  deleted_at bigint NOT NULL,
  row_counts jsonb NOT NULL
);
