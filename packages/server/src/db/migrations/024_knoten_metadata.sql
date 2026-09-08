-- Generated identity and provenance remain immutable. Names and building descriptions are
-- authored metadata on the same node, guarded by map CAS and an append-only command receipt.
CREATE FUNCTION protect_tactical_node_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.map_id IS DISTINCT FROM OLD.map_id
    OR NEW.knoten_id IS DISTINCT FROM OLD.knoten_id
    OR NEW.campaign_id IS DISTINCT FROM OLD.campaign_id
    OR (NEW.data - 'titel' - 'bauwerk') IS DISTINCT FROM (OLD.data - 'titel' - 'bauwerk')
  THEN RAISE EXCEPTION 'Tactical node identity and provenance are immutable' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
-- statement
DROP TRIGGER protect_tactical_map_nodes ON tactical_map_nodes;
-- statement
CREATE TRIGGER protect_tactical_map_nodes BEFORE DELETE ON tactical_map_nodes
  FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
CREATE TRIGGER protect_tactical_node_identity BEFORE UPDATE ON tactical_map_nodes
  FOR EACH ROW EXECUTE FUNCTION protect_tactical_node_identity();
