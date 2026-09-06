CREATE TABLE media_rooms (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id), session_id text NOT NULL,
  kind text NOT NULL CHECK(kind IN ('table','whisper')), provider_room text NOT NULL UNIQUE,
  created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL, closed_at bigint,
  generation integer NOT NULL DEFAULT 1 CHECK(generation > 0),
  FOREIGN KEY(session_id,campaign_id) REFERENCES game_sessions(id,campaign_id), UNIQUE(id,campaign_id)
);
-- statement
CREATE UNIQUE INDEX media_one_table ON media_rooms(session_id) WHERE kind='table' AND closed_at IS NULL;
-- statement
CREATE TABLE media_whisper_members (
  room_id text NOT NULL, campaign_id text NOT NULL, user_id text NOT NULL REFERENCES users(id),
  PRIMARY KEY(room_id,user_id), FOREIGN KEY(room_id,campaign_id) REFERENCES media_rooms(id,campaign_id)
);
-- statement
CREATE TABLE media_presence (
  campaign_id text NOT NULL REFERENCES campaigns(id), user_id text NOT NULL REFERENCES users(id), room_id text NOT NULL,
  generation integer NOT NULL, state text NOT NULL CHECK(state IN ('joining','connected')), updated_at bigint NOT NULL,
  PRIMARY KEY(campaign_id,user_id), FOREIGN KEY(room_id,campaign_id) REFERENCES media_rooms(id,campaign_id)
);
-- statement
CREATE TABLE media_blocks (
  campaign_id text NOT NULL REFERENCES campaigns(id), user_id text NOT NULL REFERENCES users(id),
  blocked_by text NOT NULL REFERENCES users(id), blocked_at bigint NOT NULL, PRIMARY KEY(campaign_id,user_id)
);
-- statement
CREATE TABLE media_cleanup (
  provider_room text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id), queued_at bigint NOT NULL
);
