-- Wo eine laufende Szene spielt, wenn die Spielleitung sie über eine Treppe in ein anderes Geschoss führt.
--
-- Eine eigene Tabelle statt neuer Spalten an `session_tactical_states`: jene Zeile hält den
-- eingefrorenen Anfang der Szene, und ihre Türzustände, Rücknahmen und Belege gehören zu der Karte,
-- auf der die Szene begann (native-v3 prüft genau das). Kein Profil kann Spalten an eine bestehende
-- Tabelle anhängen; dasselbe Muster wie `kampf_karten` neben `kampf_teilnehmer`.
--
-- Keine Zeile heißt: die Szene spielt noch auf ihrer ersten Karte. Mit Zeile spielt sie auf
-- `map_id`; ist das wieder die erste Karte, bleibt `portal_states` leer, denn deren Türen stehen
-- weiter in `session_tactical_states`. `parked` hält die Türen der übrigen besuchten Geschosse je
-- Karte, damit eine offene Tür offen ist, wenn die Runde zurückkommt.
--
-- Die letzte Anweisung (Wechsel oder Tür) steht mit Prüfsumme und Antwort in der Zeile: eine
-- Wiederholung bekommt dieselbe Antwort, jede spätere Änderung geht über `version`.
CREATE TABLE session_floor_states (
  session_id text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES campaigns(id),
  map_id text NOT NULL,
  map_revision integer NOT NULL CHECK (map_revision > 0),
  portal_states jsonb NOT NULL,
  parked jsonb NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  command_id text NOT NULL CHECK (length(command_id) BETWEEN 1 AND 128),
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  ack jsonb NOT NULL,
  updated_by text NOT NULL REFERENCES users(id),
  updated_at bigint NOT NULL CHECK (updated_at >= 0),
  FOREIGN KEY (session_id, campaign_id) REFERENCES session_tactical_states(session_id, campaign_id),
  FOREIGN KEY (map_id, campaign_id, map_revision) REFERENCES tactical_map_revisions(map_id, campaign_id, revision)
);
-- statement
CREATE INDEX session_floor_states_campaign_idx ON session_floor_states(campaign_id);
