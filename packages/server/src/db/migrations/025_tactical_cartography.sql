-- Add meaning to exactly one retained geometry revision. Existing geometry/hash contracts stay v1.
CREATE TABLE tactical_map_cartography (
  map_id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id), map_revision integer NOT NULL CHECK(map_revision>0),
  map_version integer NOT NULL CHECK(map_version>=map_revision),
  document jsonb NOT NULL, content_hash text NOT NULL CHECK(content_hash ~ '^[a-f0-9]{64}$'),
  PRIMARY KEY(map_id,map_revision), UNIQUE(map_id,map_version),
  FOREIGN KEY(map_id,campaign_id,map_revision) REFERENCES tactical_map_revisions(map_id,campaign_id,revision)
);
-- statement
CREATE TRIGGER protect_tactical_map_cartography BEFORE UPDATE OR DELETE ON tactical_map_cartography
  FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
