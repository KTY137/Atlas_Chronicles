CREATE TABLE users (
  id text PRIMARY KEY, display_name text NOT NULL, created_at bigint NOT NULL
);
-- statement
CREATE TABLE credentials (
  id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id),
  kind text NOT NULL CHECK (kind IN ('guest','cookie','passkey')),
  token_hash text UNIQUE, label text NOT NULL, created_at bigint NOT NULL,
  expires_at bigint NOT NULL, revoked_at bigint, last_used_at bigint,
  public_key jsonb, counter bigint NOT NULL DEFAULT 0 CHECK (counter >= 0)
);
-- statement
CREATE TABLE auth_challenges (
  id text PRIMARY KEY, credential_id text REFERENCES credentials(id), user_id text REFERENCES users(id),
  purpose text NOT NULL, challenge text NOT NULL UNIQUE, expires_at bigint NOT NULL, consumed_at bigint
);
-- statement
CREATE TABLE universes (
  id text PRIMARY KEY, owner_user_id text NOT NULL REFERENCES users(id), name text NOT NULL
);
-- statement
CREATE TABLE campaigns (
  id text PRIMARY KEY, universe_id text NOT NULL REFERENCES universes(id),
  owner_user_id text NOT NULL REFERENCES users(id), name text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0), created_at bigint NOT NULL
);
-- statement
CREATE TABLE actors (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id),
  user_id text NOT NULL REFERENCES users(id), name text NOT NULL,
  UNIQUE(id,campaign_id), UNIQUE(id,campaign_id,user_id)
);
-- statement
CREATE TABLE campaign_memberships (
  campaign_id text NOT NULL REFERENCES campaigns(id), user_id text NOT NULL REFERENCES users(id),
  role text NOT NULL CHECK (role IN ('leitung','spieler','beobachter')),
  display_name text NOT NULL, name_skeleton text NOT NULL, actor_id text,
  PRIMARY KEY(campaign_id,user_id), UNIQUE(campaign_id,name_skeleton),
  FOREIGN KEY(actor_id,campaign_id,user_id) REFERENCES actors(id,campaign_id,user_id)
);
-- statement
CREATE TABLE invitations (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id), code_hash text NOT NULL UNIQUE,
  created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL,
  expires_at bigint NOT NULL, revoked_at bigint, UNIQUE(id,campaign_id)
);
-- statement
CREATE TABLE join_requests (
  id text PRIMARY KEY, invitation_id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id),
  user_id text NOT NULL REFERENCES users(id), display_name text NOT NULL, name_skeleton text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','approved','rejected','expired')),
  poll_token_hash text NOT NULL UNIQUE, created_at bigint NOT NULL, expires_at bigint NOT NULL,
  approved_at bigint, claimed_at bigint,
  FOREIGN KEY(invitation_id,campaign_id) REFERENCES invitations(id,campaign_id)
);
-- statement
CREATE UNIQUE INDEX pending_name_unique ON join_requests(campaign_id,name_skeleton) WHERE status='pending';
-- statement
CREATE TABLE pairing_codes (
  id text PRIMARY KEY, code_hash text NOT NULL UNIQUE, campaign_id text NOT NULL REFERENCES campaigns(id),
  user_id text NOT NULL, minted_by text NOT NULL REFERENCES users(id),
  expires_at bigint NOT NULL, used_at bigint, revoked_at bigint,
  FOREIGN KEY(campaign_id,user_id) REFERENCES campaign_memberships(campaign_id,user_id)
);
-- statement
CREATE TABLE entries (
  id text PRIMARY KEY, universe_id text NOT NULL REFERENCES universes(id),
  campaign_id text NOT NULL REFERENCES campaigns(id), slug text NOT NULL, title text NOT NULL,
  art text NOT NULL DEFAULT 'sonstiges', version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  current_revision_id text NOT NULL, created_by text NOT NULL REFERENCES users(id),
  UNIQUE(campaign_id,slug), UNIQUE(id,campaign_id)
);
-- statement
CREATE TABLE revisions (
  id text PRIMARY KEY, entry_id text NOT NULL REFERENCES entries(id), seq integer NOT NULL,
  author_user_id text NOT NULL REFERENCES users(id), content_hash text NOT NULL,
  UNIQUE(entry_id,seq), UNIQUE(id,entry_id)
);
-- statement
ALTER TABLE entries ADD CONSTRAINT current_revision_fk FOREIGN KEY(current_revision_id,id)
  REFERENCES revisions(id,entry_id) DEFERRABLE INITIALLY DEFERRED;
-- statement
CREATE TABLE passages (
  id text PRIMARY KEY, entry_id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id),
  revision_id text NOT NULL, ord integer NOT NULL CHECK(ord >= 0), path jsonb NOT NULL,
  content jsonb NOT NULL, ast_version integer NOT NULL DEFAULT 1 CHECK(ast_version=1),
  FOREIGN KEY(entry_id,campaign_id) REFERENCES entries(id,campaign_id),
  FOREIGN KEY(revision_id,entry_id) REFERENCES revisions(id,entry_id),
  UNIQUE(id,campaign_id), UNIQUE(entry_id,ord)
);
-- statement
CREATE TABLE vollmachten (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id),
  actor_id text NOT NULL, passage_id text NOT NULL, issued_by text NOT NULL REFERENCES users(id),
  target_slug text NOT NULL, threshold integer NOT NULL CHECK(threshold BETWEEN 1 AND 20),
  expires_at bigint NOT NULL, issued_at bigint NOT NULL, repeatable boolean NOT NULL DEFAULT false,
  budget_kind text NOT NULL CHECK (budget_kind IN ('player','floating')),
  status text NOT NULL DEFAULT 'offen' CHECK(status IN ('offen','eingeloest','verfallen','widerrufen')),
  consumed_roll_id text, version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  package_pin text NOT NULL DEFAULT 'kern@1.0.0',
  FOREIGN KEY(actor_id,campaign_id) REFERENCES actors(id,campaign_id),
  FOREIGN KEY(passage_id,campaign_id) REFERENCES passages(id,campaign_id),
  UNIQUE(id,campaign_id)
);
-- statement
CREATE TABLE rolls (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id), vollmacht_id text NOT NULL,
  seed text NOT NULL, expression text NOT NULL CHECK(expression='1d20'), result integer NOT NULL CHECK(result BETWEEN 1 AND 20),
  threshold integer NOT NULL CHECK(threshold BETWEEN 1 AND 20), package_pin text NOT NULL,
  status text NOT NULL CHECK(status IN ('ausstehend','bestaetigt','verworfen')),
  rolled_at bigint NOT NULL, confirmed_at bigint, confirmation jsonb,
  FOREIGN KEY(vollmacht_id,campaign_id) REFERENCES vollmachten(id,campaign_id), UNIQUE(id,vollmacht_id)
);
-- statement
CREATE UNIQUE INDEX one_pending_roll ON rolls(vollmacht_id) WHERE status='ausstehend';
-- statement
ALTER TABLE vollmachten ADD CONSTRAINT consumed_roll_fk FOREIGN KEY(consumed_roll_id,id) REFERENCES rolls(id,vollmacht_id);
-- statement
CREATE TABLE revelations (
  campaign_id text NOT NULL REFERENCES campaigns(id), actor_id text NOT NULL, passage_id text NOT NULL,
  granted_at bigint NOT NULL, granted_by text NOT NULL REFERENCES users(id), vollmacht_id text,
  PRIMARY KEY(actor_id,passage_id),
  FOREIGN KEY(actor_id,campaign_id) REFERENCES actors(id,campaign_id),
  FOREIGN KEY(passage_id,campaign_id) REFERENCES passages(id,campaign_id),
  FOREIGN KEY(vollmacht_id,campaign_id) REFERENCES vollmachten(id,campaign_id)
);
-- statement
CREATE TABLE commands (
  user_id text NOT NULL REFERENCES users(id), command_id text NOT NULL,
  campaign_id text NOT NULL REFERENCES campaigns(id), request_hash text NOT NULL, response jsonb NOT NULL,
  created_at bigint NOT NULL, PRIMARY KEY(user_id,command_id)
);
-- statement
CREATE TABLE event_cursors (
  user_id text NOT NULL REFERENCES users(id), campaign_id text NOT NULL REFERENCES campaigns(id),
  last_seq bigint NOT NULL DEFAULT 0, PRIMARY KEY(user_id,campaign_id)
);
-- statement
CREATE TABLE events (
  user_id text NOT NULL REFERENCES users(id), campaign_id text NOT NULL REFERENCES campaigns(id),
  seq bigint NOT NULL, payload jsonb NOT NULL, created_at bigint NOT NULL,
  PRIMARY KEY(user_id,campaign_id,seq)
);
-- statement
CREATE TABLE audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, campaign_id text REFERENCES campaigns(id),
  actor_user_id text REFERENCES users(id), kind text NOT NULL, data jsonb NOT NULL, created_at bigint NOT NULL
);
-- statement
CREATE TABLE access_incidents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id),
  user_id text REFERENCES users(id), vollmacht_id text NOT NULL, created_at bigint NOT NULL,
  FOREIGN KEY(vollmacht_id,campaign_id) REFERENCES vollmachten(id,campaign_id)
);
