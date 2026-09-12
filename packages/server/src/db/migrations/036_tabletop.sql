-- Private GM adventure documents. Narrative scenes and choices never join a player projection.
CREATE TABLE adventure_trees (
  campaign_id text PRIMARY KEY REFERENCES campaigns(id),
  version integer NOT NULL CHECK(version > 0),
  document jsonb NOT NULL,
  current_node_id text,
  updated_by text NOT NULL REFERENCES users(id),
  updated_at bigint NOT NULL CHECK(updated_at >= 0)
);
