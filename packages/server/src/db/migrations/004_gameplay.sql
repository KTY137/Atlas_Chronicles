CREATE TABLE rule_packages (
  campaign_id text NOT NULL REFERENCES campaigns(id), package_id text NOT NULL, version text NOT NULL,
  document jsonb NOT NULL, content_hash text NOT NULL, installed_by text NOT NULL REFERENCES users(id), installed_at bigint NOT NULL,
  PRIMARY KEY(campaign_id,package_id,version)
);
-- statement
CREATE TRIGGER protect_rule_packages BEFORE UPDATE OR DELETE ON rule_packages FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
CREATE TABLE campaign_rule_pins (
  campaign_id text PRIMARY KEY REFERENCES campaigns(id), package_id text NOT NULL, package_version text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  FOREIGN KEY(campaign_id,package_id,package_version) REFERENCES rule_packages(campaign_id,package_id,version)
);
-- statement
CREATE TABLE actor_sheets (
  actor_id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id),
  package_id text NOT NULL, package_version text NOT NULL, fields jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK(version > 0), defeat_pending boolean NOT NULL DEFAULT false,
  defeated_at bigint, updated_at bigint NOT NULL,
  PRIMARY KEY(actor_id,campaign_id), FOREIGN KEY(actor_id,campaign_id) REFERENCES actors(id,campaign_id),
  FOREIGN KEY(campaign_id,package_id,package_version) REFERENCES rule_packages(campaign_id,package_id,version)
);
-- statement
CREATE TABLE scenes (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id), name text NOT NULL,
  entry_ids jsonb NOT NULL, fiction_date text NOT NULL, status text NOT NULL DEFAULT 'prepared' CHECK(status IN ('prepared','active','ended')),
  created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL, version integer NOT NULL DEFAULT 1,
  UNIQUE(id,campaign_id)
);
-- statement
CREATE UNIQUE INDEX one_active_scene ON scenes(campaign_id) WHERE status='active';
-- statement
CREATE TABLE game_sessions (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id), scene_id text NOT NULL,
  started_at bigint NOT NULL, ended_at bigint, started_by text NOT NULL REFERENCES users(id),
  FOREIGN KEY(scene_id,campaign_id) REFERENCES scenes(id,campaign_id), UNIQUE(id,campaign_id)
);
-- statement
CREATE UNIQUE INDEX one_active_game_session ON game_sessions(campaign_id) WHERE ended_at IS NULL;
-- statement
CREATE TABLE action_vollmachten (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id), actor_id text NOT NULL, passage_id text NOT NULL,
  passage_hash text NOT NULL, package_id text NOT NULL, package_version text NOT NULL, action_id text NOT NULL,
  threshold double precision NOT NULL CHECK(threshold BETWEEN -1000000000000 AND 1000000000000),
  fixed_input jsonb NOT NULL, fiction_date text NOT NULL, issued_by text NOT NULL REFERENCES users(id),
  issued_at bigint NOT NULL, expires_at bigint NOT NULL CHECK(expires_at > issued_at),
  repeatable boolean NOT NULL, budget_kind text NOT NULL CHECK(budget_kind IN ('player','floating')),
  status text NOT NULL DEFAULT 'offen' CHECK(status IN ('offen','eingeloest','verfallen','widerrufen')),
  consumed_roll_id text, revoked_at bigint, version integer NOT NULL DEFAULT 1,
  command_id text NOT NULL, request_hash text NOT NULL,
  FOREIGN KEY(actor_id,campaign_id) REFERENCES actors(id,campaign_id),
  FOREIGN KEY(passage_id,campaign_id) REFERENCES passages(id,campaign_id),
  FOREIGN KEY(campaign_id,package_id,package_version) REFERENCES rule_packages(campaign_id,package_id,version),
  UNIQUE(id,campaign_id), UNIQUE(campaign_id,issued_by,command_id)
);
-- statement
CREATE INDEX action_vollmacht_weekly_budget ON action_vollmachten(campaign_id,issued_at,actor_id,budget_kind);
-- statement
CREATE TABLE action_rolls (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id), actor_id text NOT NULL,
  prepared_by text NOT NULL REFERENCES users(id), command_id text NOT NULL, request_hash text NOT NULL,
  package_id text NOT NULL, package_version text NOT NULL, action_id text NOT NULL,
  receipt jsonb NOT NULL, receipt_hash text NOT NULL, target_passage_id text, target_passage_hash text,
  vollmacht_id text, fiction_date text NOT NULL, prepared_at bigint NOT NULL, confirmed_at bigint,
  status text NOT NULL DEFAULT 'ausstehend' CHECK(status IN ('ausstehend','bestaetigt','verworfen')),
  confirmation jsonb, scene_id text, session_id text,
  FOREIGN KEY(actor_id,campaign_id) REFERENCES actors(id,campaign_id),
  FOREIGN KEY(target_passage_id,campaign_id) REFERENCES passages(id,campaign_id),
  FOREIGN KEY(vollmacht_id,campaign_id) REFERENCES action_vollmachten(id,campaign_id),
  FOREIGN KEY(campaign_id,package_id,package_version) REFERENCES rule_packages(campaign_id,package_id,version),
  FOREIGN KEY(scene_id,campaign_id) REFERENCES scenes(id,campaign_id),
  FOREIGN KEY(session_id,campaign_id) REFERENCES game_sessions(id,campaign_id),
  UNIQUE(id,campaign_id), UNIQUE(id,vollmacht_id), UNIQUE(campaign_id,prepared_by,command_id)
);
-- statement
CREATE UNIQUE INDEX one_pending_action_vollmacht ON action_rolls(vollmacht_id) WHERE status='ausstehend';
-- statement
ALTER TABLE action_vollmachten ADD CONSTRAINT action_vollmacht_consumed_roll FOREIGN KEY(consumed_roll_id,id) REFERENCES action_rolls(id,vollmacht_id);
-- statement
CREATE TABLE confirmed_mints (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id),
  kind text NOT NULL CHECK(kind IN ('wurf','gesprochen','ratifikation','berichtigung','vollmacht')),
  passage_id text NOT NULL, revision_id text NOT NULL REFERENCES revisions(id), roll_id text,
  user_id text NOT NULL REFERENCES users(id), command_id text NOT NULL,
  provenance jsonb NOT NULL, seal text NOT NULL, confirmed_at bigint NOT NULL,
  FOREIGN KEY(passage_id,campaign_id) REFERENCES passages(id,campaign_id),
  FOREIGN KEY(roll_id,campaign_id) REFERENCES action_rolls(id,campaign_id),
  UNIQUE(campaign_id,user_id,command_id), UNIQUE(roll_id)
);
-- statement
CREATE TRIGGER protect_confirmed_mints BEFORE UPDATE OR DELETE ON confirmed_mints FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
