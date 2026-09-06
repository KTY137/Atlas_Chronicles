-- Tactical source evidence, immutable plans/revisions, and a bounded session undo window.
CREATE TABLE tactical_sources (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id),
  format text NOT NULL CHECK(format IN ('uvtt','native')), format_version text NOT NULL CHECK(format_version IN ('0.2','0.3','1')),
  source_text text NOT NULL, source_hash text NOT NULL CHECK(source_hash ~ '^[a-f0-9]{64}$'), source_bytes bigint NOT NULL CHECK(source_bytes>0),
  image_base64 text, image_meta jsonb, provenance jsonb NOT NULL, fidelity jsonb NOT NULL,
  created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL,
  UNIQUE(id,campaign_id), CHECK(format='native' OR image_base64 IS NULL),
  CHECK(format<>'native' OR (image_base64 IS NULL)=(image_meta IS NULL))
);
-- statement
CREATE TRIGGER protect_tactical_sources BEFORE UPDATE OR DELETE ON tactical_sources FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
CREATE TABLE tactical_maps (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id), name text NOT NULL,
  head_revision integer NOT NULL DEFAULT 1 CHECK(head_revision>0), version integer NOT NULL DEFAULT 1 CHECK(version>0),
  created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL, UNIQUE(id,campaign_id)
);
-- statement
CREATE TABLE tactical_map_revisions (
  map_id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id), revision integer NOT NULL CHECK(revision>0),
  source_id text NOT NULL, document jsonb NOT NULL, content_hash text NOT NULL CHECK(content_hash ~ '^[a-f0-9]{64}$'),
  created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL,
  PRIMARY KEY(map_id,revision), UNIQUE(map_id,campaign_id,revision),
  FOREIGN KEY(map_id,campaign_id) REFERENCES tactical_maps(id,campaign_id),
  FOREIGN KEY(source_id,campaign_id) REFERENCES tactical_sources(id,campaign_id)
);
-- statement
ALTER TABLE tactical_maps ADD CONSTRAINT tactical_map_head FOREIGN KEY(id,campaign_id,head_revision)
  REFERENCES tactical_map_revisions(map_id,campaign_id,revision) DEFERRABLE INITIALLY DEFERRED;
-- statement
CREATE TRIGGER protect_tactical_map_revisions BEFORE UPDATE OR DELETE ON tactical_map_revisions FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
CREATE TABLE tactical_map_anchors (
  map_id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id), map_revision integer NOT NULL,
  target_kind text NOT NULL CHECK(target_kind IN ('stamp','region','place')), target_id text NOT NULL,
  entry_id text NOT NULL, passage_id text,
  PRIMARY KEY(map_id,map_revision,target_kind,target_id),
  FOREIGN KEY(map_id,campaign_id,map_revision) REFERENCES tactical_map_revisions(map_id,campaign_id,revision),
  FOREIGN KEY(entry_id,campaign_id) REFERENCES entries(id,campaign_id),
  FOREIGN KEY(passage_id,campaign_id) REFERENCES passages(id,campaign_id)
);
-- statement
CREATE TRIGGER protect_tactical_map_anchors BEFORE UPDATE OR DELETE ON tactical_map_anchors FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
CREATE TABLE scene_tactical_plans (
  scene_id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id), map_id text NOT NULL, map_revision integer NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK(version>0), updated_by text NOT NULL REFERENCES users(id), updated_at bigint NOT NULL,
  UNIQUE(scene_id,campaign_id), FOREIGN KEY(scene_id,campaign_id) REFERENCES scenes(id,campaign_id),
  FOREIGN KEY(map_id,campaign_id,map_revision) REFERENCES tactical_map_revisions(map_id,campaign_id,revision)
);
-- statement
CREATE TABLE scene_token_plans (
  scene_id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id), token_id text NOT NULL, actor_id text NOT NULL,
  x double precision NOT NULL CHECK(x BETWEEN -1000000000 AND 1000000000), y double precision NOT NULL CHECK(y BETWEEN -1000000000 AND 1000000000),
  elevation double precision NOT NULL CHECK(elevation BETWEEN -1000000000 AND 1000000000),
  rotation double precision NOT NULL CHECK(rotation BETWEEN -1000000000 AND 1000000000), scale double precision NOT NULL CHECK(scale>0 AND scale<=1000000),
  PRIMARY KEY(scene_id,token_id), FOREIGN KEY(scene_id,campaign_id) REFERENCES scene_tactical_plans(scene_id,campaign_id),
  FOREIGN KEY(actor_id,campaign_id) REFERENCES actor_profiles(actor_id,campaign_id)
);
-- statement
CREATE TABLE session_tactical_states (
  session_id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id), scene_id text NOT NULL,
  map_id text NOT NULL, map_revision integer NOT NULL,
  initial_snapshot jsonb NOT NULL, initial_hash text NOT NULL CHECK(initial_hash ~ '^[a-f0-9]{64}$'),
  undo_base_snapshot jsonb NOT NULL, undo_base_hash text NOT NULL CHECK(undo_base_hash ~ '^[a-f0-9]{64}$'),
  base_seq bigint NOT NULL DEFAULT 0 CHECK(base_seq>=0), last_transition_seq bigint NOT NULL DEFAULT 0 CHECK(last_transition_seq>=base_seq),
  portal_states jsonb NOT NULL, captured_by text NOT NULL REFERENCES users(id), captured_at bigint NOT NULL,
  UNIQUE(session_id,campaign_id), FOREIGN KEY(session_id,campaign_id) REFERENCES game_sessions(id,campaign_id),
  FOREIGN KEY(scene_id,campaign_id) REFERENCES scenes(id,campaign_id),
  FOREIGN KEY(map_id,campaign_id,map_revision) REFERENCES tactical_map_revisions(map_id,campaign_id,revision)
);
-- statement
CREATE FUNCTION protect_tactical_initial_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Tactical initial snapshot is append-only'; END IF;
  IF ROW(NEW.session_id,NEW.campaign_id,NEW.scene_id,NEW.map_id,NEW.map_revision,NEW.initial_snapshot,NEW.initial_hash,NEW.captured_by,NEW.captured_at)
    IS DISTINCT FROM ROW(OLD.session_id,OLD.campaign_id,OLD.scene_id,OLD.map_id,OLD.map_revision,OLD.initial_snapshot,OLD.initial_hash,OLD.captured_by,OLD.captured_at)
    THEN RAISE EXCEPTION 'Tactical initial snapshot is append-only'; END IF;
  RETURN NEW;
END;
$$;
-- statement
CREATE TRIGGER protect_tactical_initial BEFORE UPDATE OR DELETE ON session_tactical_states FOR EACH ROW EXECUTE FUNCTION protect_tactical_initial_snapshot();
-- statement
CREATE TABLE tactical_token_states (
  session_id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id), token_id text NOT NULL, actor_id text NOT NULL,
  x double precision NOT NULL CHECK(x BETWEEN -1000000000 AND 1000000000), y double precision NOT NULL CHECK(y BETWEEN -1000000000 AND 1000000000),
  elevation double precision NOT NULL CHECK(elevation BETWEEN -1000000000 AND 1000000000),
  rotation double precision NOT NULL CHECK(rotation BETWEEN -1000000000 AND 1000000000), scale double precision NOT NULL CHECK(scale>0 AND scale<=1000000),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  PRIMARY KEY(session_id,token_id), FOREIGN KEY(session_id,campaign_id) REFERENCES session_tactical_states(session_id,campaign_id),
  FOREIGN KEY(actor_id,campaign_id) REFERENCES actor_profiles(actor_id,campaign_id)
);
-- statement
CREATE TABLE tactical_command_receipts (
  command_id text PRIMARY KEY, actor_user_id text NOT NULL REFERENCES users(id), campaign_id text NOT NULL REFERENCES campaigns(id),
  scope_kind text NOT NULL CHECK(scope_kind IN ('campaign','map','scene','session')), scope_id text NOT NULL,
  subject_kind text NOT NULL CHECK(subject_kind IN ('map','plan','token','portal')), subject_id text NOT NULL,
  operation text NOT NULL CHECK(operation IN ('map.import','map.revise','plan.save','token.move','portal.set','undo')),
  request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'), ack jsonb NOT NULL, created_at bigint NOT NULL,
  UNIQUE(command_id,campaign_id)
);
-- statement
CREATE TRIGGER protect_tactical_command_receipts BEFORE UPDATE OR DELETE ON tactical_command_receipts FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
CREATE TABLE tactical_transitions (
  session_id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id), seq bigint NOT NULL CHECK(seq>0),
  command_id text NOT NULL UNIQUE, subject_kind text NOT NULL CHECK(subject_kind IN ('token','portal')), subject_id text NOT NULL,
  before_state jsonb NOT NULL, after_state jsonb NOT NULL, compensates_command_id text, created_at bigint NOT NULL,
  PRIMARY KEY(session_id,seq), FOREIGN KEY(session_id,campaign_id) REFERENCES session_tactical_states(session_id,campaign_id),
  FOREIGN KEY(command_id,campaign_id) REFERENCES tactical_command_receipts(command_id,campaign_id) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(compensates_command_id,campaign_id) REFERENCES tactical_command_receipts(command_id,campaign_id)
);
-- statement
CREATE TRIGGER protect_tactical_transition_updates BEFORE UPDATE ON tactical_transitions FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
