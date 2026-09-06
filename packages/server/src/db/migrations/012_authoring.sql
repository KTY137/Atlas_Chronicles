-- Explicit immutable theme revisions and publication decisions; anonymous delivery
-- also requires the separate local host gate, which is never restored from SQL.
CREATE TABLE theme_presets (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id),
  head_revision integer NOT NULL DEFAULT 1 CHECK(head_revision>0), version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL CHECK(created_at>=0), UNIQUE(id,campaign_id)
);
-- statement
CREATE TABLE theme_preset_revisions (
  theme_id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id), revision integer NOT NULL CHECK(revision>0),
  manifest jsonb NOT NULL, content_hash text NOT NULL CHECK(content_hash ~ '^[a-f0-9]{64}$'), accessibility_report jsonb NOT NULL,
  created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL CHECK(created_at>=0),
  PRIMARY KEY(theme_id,revision), UNIQUE(theme_id,campaign_id,revision),
  FOREIGN KEY(theme_id,campaign_id) REFERENCES theme_presets(id,campaign_id)
);
-- statement
ALTER TABLE theme_presets ADD CONSTRAINT theme_preset_head FOREIGN KEY(id,campaign_id,head_revision)
  REFERENCES theme_preset_revisions(theme_id,campaign_id,revision) DEFERRABLE INITIALLY DEFERRED;
-- statement
CREATE TRIGGER protect_theme_revisions BEFORE UPDATE OR DELETE ON theme_preset_revisions FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
CREATE TABLE campaign_theme_pins (
  campaign_id text PRIMARY KEY REFERENCES campaigns(id), theme_id text NOT NULL, theme_revision integer NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK(version>0), updated_by text NOT NULL REFERENCES users(id), updated_at bigint NOT NULL CHECK(updated_at>=0),
  FOREIGN KEY(theme_id,campaign_id,theme_revision) REFERENCES theme_preset_revisions(theme_id,campaign_id,revision)
);
-- statement
CREATE TABLE campaign_publications (
  campaign_id text PRIMARY KEY REFERENCES campaigns(id), public_key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false, world_slug text NOT NULL, title text NOT NULL, description text NOT NULL,
  locale text NOT NULL CHECK(locale IN ('de','en')), content_warnings jsonb NOT NULL,
  theme_id text, theme_revision integer, version integer NOT NULL DEFAULT 1 CHECK(version>0),
  updated_by text NOT NULL REFERENCES users(id), updated_at bigint NOT NULL CHECK(updated_at>=0),
  CHECK((theme_id IS NULL)=(theme_revision IS NULL)),
  FOREIGN KEY(theme_id,campaign_id,theme_revision) REFERENCES theme_preset_revisions(theme_id,campaign_id,revision)
);
-- statement
CREATE FUNCTION protect_publication_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.campaign_id,NEW.public_key) IS DISTINCT FROM ROW(OLD.campaign_id,OLD.public_key)
    THEN RAISE EXCEPTION 'Publication identity is immutable'; END IF;
  RETURN NEW;
END;
$$;
-- statement
CREATE TRIGGER protect_publication_identity BEFORE UPDATE ON campaign_publications FOR EACH ROW EXECUTE FUNCTION protect_publication_identity();
-- statement
CREATE TABLE entry_publications (
  entry_id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id), revision_id text NOT NULL,
  passage_ids jsonb NOT NULL, public_slug text NOT NULL, public_metadata jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK(version>0), published_by text NOT NULL REFERENCES users(id), published_at bigint NOT NULL CHECK(published_at>=0),
  UNIQUE(campaign_id,public_slug), FOREIGN KEY(entry_id,campaign_id) REFERENCES entries(id,campaign_id),
  FOREIGN KEY(revision_id,entry_id) REFERENCES revisions(id,entry_id)
);
-- statement
CREATE TABLE publication_routes (
  campaign_id text NOT NULL REFERENCES campaigns(id), kind text NOT NULL CHECK(kind IN ('world','article','legacy')),
  route text NOT NULL, entry_id text, source_url text,
  created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL CHECK(created_at>=0),
  PRIMARY KEY(campaign_id,kind,route), FOREIGN KEY(entry_id,campaign_id) REFERENCES entries(id,campaign_id),
  CHECK((kind='world' AND entry_id IS NULL AND source_url IS NULL) OR
    (kind='article' AND entry_id IS NOT NULL AND source_url IS NULL) OR
    (kind='legacy' AND entry_id IS NOT NULL AND source_url IS NOT NULL))
);
-- statement
CREATE UNIQUE INDEX publication_legacy_host_path ON publication_routes(route) WHERE kind='legacy';
-- statement
CREATE TABLE authoring_events (
  command_id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id), actor_user_id text NOT NULL REFERENCES users(id),
  operation text NOT NULL CHECK(operation IN ('theme.create','theme.revise','theme.pin','publication.configure','entry.publish','entry.unpublish','route.add','route.remove')),
  subject_id text NOT NULL, request jsonb NOT NULL, request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
  before_state jsonb, after_state jsonb NOT NULL, ack jsonb NOT NULL, created_at bigint NOT NULL CHECK(created_at>=0)
);
-- statement
CREATE TRIGGER protect_authoring_events BEFORE UPDATE OR DELETE ON authoring_events FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
