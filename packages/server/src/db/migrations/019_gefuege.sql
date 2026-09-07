-- Das Gefüge: Stammbaum und Politogramm als EIN passagenverankertes Kantenmodell.
--
-- Die Kante hängt an `passage_id`, nicht am Eintrag. Wer die Passage nicht hält, für den gibt
-- es diese Kante nicht — dieselbe Existenzgrenze wie bei jeder anderen Aussage der Chronik.
-- `graph` und `gerichtet` werden aus `art` abgeleitet und deshalb NICHT gespeichert: zwei
-- Spalten, die dasselbe sagen, können sich widersprechen.
CREATE TABLE beziehungen (
  id text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES campaigns(id),
  passage_id text NOT NULL,
  von_entry_id text NOT NULL,
  nach_entry_id text NOT NULL,
  art text NOT NULL CHECK (art IN ('elternteil_von','verheiratet_mit','geschwister_von','buendnis_mit','feindschaft_mit','lehen_von','mitglied_von')),
  rolle text CHECK (rolle IS NULL OR length(rolle) <= 160),
  created_at bigint NOT NULL,
  created_by text NOT NULL REFERENCES users(id),
  -- Zurückziehen löscht nicht: eine Kante, die einmal galt, bleibt als Zeile erhalten.
  withdrawn_at bigint,
  withdrawn_by text REFERENCES users(id),
  CHECK (von_entry_id <> nach_entry_id),
  FOREIGN KEY(passage_id,campaign_id) REFERENCES passages(id,campaign_id),
  FOREIGN KEY(von_entry_id,campaign_id) REFERENCES entries(id,campaign_id),
  FOREIGN KEY(nach_entry_id,campaign_id) REFERENCES entries(id,campaign_id),
  UNIQUE(id,campaign_id)
);
-- statement
CREATE INDEX beziehungen_campaign_offen ON beziehungen(campaign_id) WHERE withdrawn_at IS NULL;
-- statement
CREATE INDEX beziehungen_passage ON beziehungen(campaign_id,passage_id);
-- statement
CREATE INDEX beziehungen_von ON beziehungen(campaign_id,von_entry_id);
-- statement
CREATE INDEX beziehungen_nach ON beziehungen(campaign_id,nach_entry_id);
