-- Der Zugangsvorfall, jetzt tatsächlich schreibbar.
--
-- `design/08-backend-architektur.md` §3 führt ihn als getragene Invariante, und
-- `CHAMPION.md:372-376` sagt wörtlich, was er ist: „the server logs an event whenever a device
-- presents no/expired credential against a character holding an open Vollmacht." Er ist das
-- Aussperrungssignal, das Gate W1 braucht, um einen roten Balken einer Ursache zuzuordnen
-- (Aussperrung) statt zweier ununterscheidbarer (Aussperrung oder Desinteresse).
--
-- Die Tabelle `access_incidents` aus 001 kann das nicht leisten, und das ist keine Meinung:
-- ihr Fremdschlüssel zeigt auf `vollmachten`, und in diese Tabelle schreibt der Produktionscode
-- nirgends — der einzige INSERT im Repo steht in einem Legacy-Fixture. Echte Türen entstehen
-- ausschließlich in `action_vollmachten` (`domain/gameplay.ts:394`). Ein Schreibpfad auf
-- `access_incidents` könnte im Betrieb nie feuern.
--
-- Warum eine neue Tabelle und nicht die alte erweitert: `access_incidents` steht im
-- Kampagnenformat (`campaign-schema.ts:70`), und die Formatgenerationen sind additiv gebaut —
-- v7 delegiert seine v6-Tabellen an v6, das jede zusätzliche Spalte strikt zurückweist. Eine
-- bestehende Tabelle umzuformen kämpft gegen diesen Entwurf; eine neue Tabelle folgt ihm.
-- `access_incidents` bleibt unverändert als das, was sie ist: die leere Altlast des v1-Profils.
--
-- Zwei nullbare Türspalten mit je echtem Fremdschlüssel plus ein CHECK auf genau eine — bei
-- einer neuen Tabelle geht das, was bei der alten am NOT NULL scheiterte. Referenzielle
-- Integrität für beide Türarten, ohne Textdiskriminator ohne Deckung.
CREATE TABLE zugangsvorfaelle (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES campaigns(id),
  user_id text NOT NULL REFERENCES users(id),
  dokument_vollmacht_id text,
  aktions_vollmacht_id text,
  created_at bigint NOT NULL,
  FOREIGN KEY (dokument_vollmacht_id, campaign_id) REFERENCES vollmachten(id, campaign_id),
  FOREIGN KEY (aktions_vollmacht_id, campaign_id) REFERENCES action_vollmachten(id, campaign_id),
  CONSTRAINT zugangsvorfaelle_genau_eine_tuer
    CHECK ((dokument_vollmacht_id IS NULL) <> (aktions_vollmacht_id IS NULL))
);
-- statement
-- Ein Gerät mit totem Credential fragt nicht einmal an, sondern in Schleife. Gate W1 braucht
-- die Aussage „hatte in diesem Fenster einen offenen Zugangsvorfall", nicht deren Anzahl —
-- eine Tür je Nutzer genügt, und der Schreibpfad verwirft Wiederholungen still.
CREATE UNIQUE INDEX zugangsvorfaelle_je_tuer_aktion
  ON zugangsvorfaelle(user_id, aktions_vollmacht_id) WHERE aktions_vollmacht_id IS NOT NULL;
-- statement
CREATE UNIQUE INDEX zugangsvorfaelle_je_tuer_dokument
  ON zugangsvorfaelle(user_id, dokument_vollmacht_id) WHERE dokument_vollmacht_id IS NOT NULL;
-- statement
-- Beweis, kein Zustand: derselbe Riegel wie über `audit`. Die kampagnengebundene Ausnahme aus
-- 017 trägt ihn mit, die Tabelle führt `campaign_id`.
CREATE TRIGGER protect_zugangsvorfaelle BEFORE UPDATE OR DELETE ON zugangsvorfaelle
  FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
