CREATE TABLE campaign_messages (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id),
  user_id text NOT NULL REFERENCES users(id), author_name text NOT NULL, body text NOT NULL CHECK(length(body) BETWEEN 1 AND 8000),
  parent_id text, kind text NOT NULL CHECK(kind IN ('letter','table')), session_id text,
  created_at bigint NOT NULL, expires_at bigint, removed_at bigint,
  FOREIGN KEY(session_id,campaign_id) REFERENCES game_sessions(id,campaign_id),
  UNIQUE(id,campaign_id), FOREIGN KEY(parent_id,campaign_id) REFERENCES campaign_messages(id,campaign_id),
  CHECK((kind='letter' AND expires_at IS NULL AND session_id IS NULL) OR (kind='table' AND expires_at IS NOT NULL AND session_id IS NOT NULL))
);
-- statement
CREATE INDEX campaign_messages_view ON campaign_messages(campaign_id,kind,created_at,id);
-- statement
ALTER TABLE event_cursors ADD COLUMN projection_hash text;
