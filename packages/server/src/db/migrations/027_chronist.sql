-- Chronist runs retain original requests, answers and decisions across restore.
CREATE TABLE chronist_laeufe (
  id text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES campaigns(id),
  created_by text NOT NULL REFERENCES users(id),
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  version integer NOT NULL CHECK(version >= 1),
  state text NOT NULL CHECK(state IN ('running','paused','partial','completed')),
  mode text NOT NULL CHECK(mode IN ('prosa','sitzung','abriss')),
  session_id text REFERENCES game_sessions(id),
  start_command_id text NOT NULL,
  start_request jsonb NOT NULL,
  request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
  start_ack jsonb NOT NULL,
  snapshot jsonb NOT NULL,
  provider jsonb NOT NULL,
  evidence jsonb NOT NULL,
  checkpoints jsonb NOT NULL,
  stop_reason text,
  cancel_requested boolean NOT NULL DEFAULT false,
  fence integer NOT NULL CHECK(fence >= 1),
  lease_owner text,
  lease_until bigint,
  UNIQUE(campaign_id,created_by,start_command_id),
  UNIQUE(campaign_id,id)
);
-- statement
CREATE UNIQUE INDEX chronist_one_active_campaign ON chronist_laeufe(campaign_id) WHERE state='running';
-- statement
CREATE TABLE chronist_vorschlaege (
  id text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES campaigns(id),
  run_id text NOT NULL,
  unit_id text NOT NULL,
  candidate_key text NOT NULL,
  version integer NOT NULL CHECK(version >= 1),
  original jsonb NOT NULL,
  original_hash text NOT NULL CHECK(original_hash ~ '^[a-f0-9]{64}$'),
  blocks jsonb NOT NULL,
  draft_hash text NOT NULL CHECK(draft_hash ~ '^[a-f0-9]{64}$'),
  dependencies jsonb NOT NULL,
  state text NOT NULL CHECK(state IN ('offen','eingereicht','verworfen')),
  updated_by text NOT NULL REFERENCES users(id),
  updated_at bigint NOT NULL,
  accepted_by text REFERENCES users(id),
  submission_command_id text,
  submission_request jsonb,
  submission_request_hash text CHECK(submission_request_hash ~ '^[a-f0-9]{64}$'),
  submission_ack jsonb,
  FOREIGN KEY(campaign_id,run_id) REFERENCES chronist_laeufe(campaign_id,id),
  UNIQUE(run_id,unit_id,candidate_key),
  UNIQUE(campaign_id,accepted_by,submission_command_id),
  CHECK((state='eingereicht') = (accepted_by IS NOT NULL AND submission_command_id IS NOT NULL
    AND submission_request IS NOT NULL AND submission_request_hash IS NOT NULL AND submission_ack IS NOT NULL))
);
-- statement
CREATE INDEX chronist_suggestions_campaign ON chronist_vorschlaege(campaign_id,id);
