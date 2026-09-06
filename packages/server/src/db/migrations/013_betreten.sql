-- The address the corpus's own gap analysis names directly: a generated child world had "no id,
-- no parent edge, no coordinate frame, no permission and no persistence" (kette.test.ts header).
-- This table is that address and nothing else — one child tactical map per source node, minted
-- once. It does not duplicate `atlas_nodes` (the node itself lives there already) or
-- `tactical_maps` (the generated map lives there, via the same canonical `importMap` path
-- `grundriss.ts` already uses); it only names the durable edge between the two, so a second
-- entry finds the first map instead of minting a second one.
CREATE TABLE betreten_karten (
  campaign_id text NOT NULL REFERENCES campaigns(id), knoten_id text NOT NULL,
  map_id text NOT NULL, keim_hash text NOT NULL CHECK(keim_hash ~ '^[a-f0-9]{64}$'),
  created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL,
  PRIMARY KEY(campaign_id,knoten_id), UNIQUE(map_id,campaign_id),
  FOREIGN KEY(map_id,campaign_id) REFERENCES tactical_maps(id,campaign_id)
);
-- statement
CREATE TRIGGER protect_betreten_karten BEFORE UPDATE OR DELETE ON betreten_karten FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
