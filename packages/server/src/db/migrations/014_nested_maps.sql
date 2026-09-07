-- A source address includes its map: content-derived room/node ids can legitimately recur in
-- separately imported maps. Existing 013 addresses are retained, with an explicit source scope.
ALTER TABLE betreten_karten ADD COLUMN parent_kind text NOT NULL DEFAULT 'atlas'
  CHECK(parent_kind IN ('atlas','tactical'));
-- statement
ALTER TABLE betreten_karten ADD COLUMN parent_map_id text;
-- statement
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM betreten_karten b WHERE
    (SELECT count(*) FROM atlas_nodes n WHERE n.campaign_id=b.campaign_id AND n.id=b.knoten_id) <> 1)
  THEN RAISE EXCEPTION 'Legacy map entrance has no unambiguous source map; resolve before migration 014'; END IF;
END $$;
-- statement
DROP TRIGGER protect_betreten_karten ON betreten_karten;
-- statement
UPDATE betreten_karten b SET parent_map_id=(SELECT n.map_id FROM atlas_nodes n
  WHERE n.campaign_id=b.campaign_id AND n.id=b.knoten_id);
-- statement
ALTER TABLE betreten_karten ALTER COLUMN parent_map_id SET NOT NULL;
-- statement
ALTER TABLE betreten_karten ALTER COLUMN keim_hash DROP NOT NULL;
-- statement
ALTER TABLE betreten_karten DROP CONSTRAINT betreten_karten_pkey;
-- statement
ALTER TABLE betreten_karten ADD PRIMARY KEY(campaign_id,parent_kind,parent_map_id,knoten_id);
-- statement
CREATE TRIGGER protect_betreten_karten BEFORE UPDATE OR DELETE ON betreten_karten
  FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
CREATE TABLE tactical_map_nodes (
  map_id text NOT NULL, knoten_id text NOT NULL, campaign_id text NOT NULL,
  data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
  PRIMARY KEY(map_id,knoten_id),
  FOREIGN KEY(map_id,campaign_id) REFERENCES tactical_maps(id,campaign_id)
);
-- statement
CREATE TRIGGER protect_tactical_map_nodes BEFORE UPDATE OR DELETE ON tactical_map_nodes
  FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
CREATE TABLE betreten_command_receipts (
  command_id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id),
  actor_user_id text NOT NULL REFERENCES users(id), request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
  response jsonb NOT NULL CHECK(jsonb_typeof(response)='object'), created_at bigint NOT NULL
);
-- statement
CREATE TRIGGER protect_betreten_command_receipts BEFORE UPDATE OR DELETE ON betreten_command_receipts
  FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
-- Polymorphic parent references are checked on insertion; the child FK remains the canonical
-- tactical map FK. The application serializes graph writes on the campaign row and rejects cycles.
CREATE FUNCTION check_betreten_parent() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF NEW.parent_kind='atlas' THEN
    IF NOT EXISTS(SELECT 1 FROM atlas_nodes WHERE campaign_id=NEW.campaign_id
      AND map_id=NEW.parent_map_id AND id=NEW.knoten_id) THEN
      RAISE EXCEPTION 'Missing atlas entrance parent' USING ERRCODE='23503';
    END IF;
  ELSIF NOT EXISTS(SELECT 1 FROM tactical_maps WHERE campaign_id=NEW.campaign_id AND id=NEW.parent_map_id) THEN
    RAISE EXCEPTION 'Missing tactical entrance parent' USING ERRCODE='23503';
  END IF;
  RETURN NEW;
END $$;
-- statement
CREATE TRIGGER check_betreten_parent BEFORE INSERT ON betreten_karten
  FOR EACH ROW EXECUTE FUNCTION check_betreten_parent();
