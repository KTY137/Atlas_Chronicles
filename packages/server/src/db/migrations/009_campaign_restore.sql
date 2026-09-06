-- Construction-time cycles are checked when the complete restored graph is present.
ALTER TABLE vollmachten ALTER CONSTRAINT consumed_roll_fk DEFERRABLE INITIALLY IMMEDIATE;
-- statement
ALTER TABLE action_vollmachten ALTER CONSTRAINT action_vollmacht_consumed_roll DEFERRABLE INITIALLY IMMEDIATE;
-- statement
ALTER TABLE week_baselines ALTER CONSTRAINT week_baselines_session_id_campaign_id_fkey DEFERRABLE INITIALLY IMMEDIATE;
-- statement
CREATE OR REPLACE FUNCTION capture_week_baseline() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- The administrator restore transaction supplies immutable historical baselines.
  -- Sessions predating migration 006 must retain their honest absence of a baseline.
  -- This local construction marker never disables UPDATE/DELETE evidence guards.
  IF current_setting('chronicle.restore',true)='on' THEN RETURN NEW; END IF;
  INSERT INTO week_baselines(session_id,campaign_id,captured_at,knowledge,lineage_seq)
  SELECT NEW.id,NEW.campaign_id,NEW.started_at,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('actorId',r.actor_id,'passageId',r.passage_id,'quelle',r.quelle,'grantedAt',r.granted_at))
      FROM revelations r WHERE r.campaign_id=NEW.campaign_id AND r.revoked_at IS NULL),'[]'::jsonb),
    COALESCE((SELECT max(l.seq) FROM lineage_events l JOIN entries e ON e.id=l.entry_id WHERE e.campaign_id=NEW.campaign_id),0)
  ON CONFLICT(session_id) DO NOTHING;
  RETURN NEW;
END;
$$;
