ALTER TABLE users ADD COLUMN platform_role text NOT NULL DEFAULT 'gast' CHECK(platform_role IN ('gast','leitung'));
-- statement
ALTER TABLE credentials ADD COLUMN parent_id text REFERENCES credentials(id);
-- statement
ALTER TABLE entries ADD COLUMN kanonstatus text NOT NULL DEFAULT 'geruecht';
-- statement
ALTER TABLE entries ADD COLUMN public boolean NOT NULL DEFAULT false;
-- statement
ALTER TABLE entries ADD COLUMN parent_entry_id text REFERENCES entries(id);
-- statement
ALTER TABLE revisions ADD COLUMN document jsonb NOT NULL DEFAULT '{}';
-- statement
ALTER TABLE revisions ADD COLUMN created_at bigint NOT NULL DEFAULT 0;
-- statement
ALTER TABLE passages DROP CONSTRAINT passages_entry_id_ord_key;
-- statement
ALTER TABLE passages ADD COLUMN retired_at_revision text REFERENCES revisions(id);
-- statement
ALTER TABLE passages ADD COLUMN gen integer NOT NULL DEFAULT 1 CHECK(gen > 0);
-- statement
ALTER TABLE passages ADD COLUMN geltung text NOT NULL DEFAULT 'notiz' CHECK(geltung IN ('notiz','antrag','kanon'));
-- statement
ALTER TABLE passages ADD COLUMN praegung jsonb;
-- statement
ALTER TABLE passages ADD COLUMN tags jsonb NOT NULL DEFAULT '[]';
-- statement
ALTER TABLE passages ADD COLUMN provenance jsonb;
-- statement
ALTER TABLE revelations ADD COLUMN quelle jsonb NOT NULL DEFAULT '{"art":"gesprochen","sitzung":"manuelle-freigabe"}';
-- statement
ALTER TABLE revelations ADD COLUMN revoked_at bigint;
-- statement
CREATE TABLE lineage_events (
  seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entry_id text NOT NULL REFERENCES entries(id), revision_id text NOT NULL REFERENCES revisions(id),
  event jsonb NOT NULL, created_at bigint NOT NULL
);
-- statement
CREATE TABLE entry_aliases (
  campaign_id text NOT NULL REFERENCES campaigns(id), slug text NOT NULL,
  entry_id text NOT NULL, PRIMARY KEY(campaign_id,slug),
  FOREIGN KEY(entry_id,campaign_id) REFERENCES entries(id,campaign_id)
);
-- statement
CREATE TABLE universe_memberships (
  universe_id text NOT NULL REFERENCES universes(id), user_id text NOT NULL REFERENCES users(id),
  role text NOT NULL CHECK(role IN ('besitzer','verwalter','autor','leser')),
  PRIMARY KEY(universe_id,user_id)
);
-- statement
CREATE TABLE artifacts (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id),
  kind text NOT NULL, source_hash text NOT NULL, source jsonb NOT NULL, report jsonb NOT NULL,
  created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL,
  UNIQUE(campaign_id,kind,source_hash)
);
-- statement
CREATE FUNCTION deny_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'History is append-only' USING ERRCODE = '42501'; END;
$$;
-- statement
CREATE TRIGGER protect_revisions BEFORE UPDATE OR DELETE ON revisions FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
CREATE TRIGGER protect_lineage BEFORE UPDATE OR DELETE ON lineage_events FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
CREATE TRIGGER protect_audit BEFORE UPDATE OR DELETE ON audit FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
