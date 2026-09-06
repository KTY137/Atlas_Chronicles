CREATE FUNCTION protect_action_roll_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Roll evidence is append-only' USING ERRCODE = '42501';
  END IF;
  IF (to_jsonb(NEW) - ARRAY['status','confirmed_at','confirmation']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status','confirmed_at','confirmation']) THEN
    RAISE EXCEPTION 'Roll evidence is immutable' USING ERRCODE = '42501';
  END IF;
  IF OLD.status <> 'ausstehend' AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN
    RAISE EXCEPTION 'Final roll state is immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
-- statement
CREATE TRIGGER action_roll_evidence_guard BEFORE UPDATE OR DELETE ON action_rolls FOR EACH ROW EXECUTE FUNCTION protect_action_roll_evidence();
-- statement
ALTER TABLE action_rolls ADD CONSTRAINT confirmed_action_has_receipt CHECK(
  (status='ausstehend' AND confirmed_at IS NULL AND confirmation IS NULL)
  OR (status='bestaetigt' AND confirmed_at IS NOT NULL AND confirmation IS NOT NULL)
  OR status='verworfen'
);
-- statement
CREATE FUNCTION protect_action_vollmacht_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Authorization history is append-only' USING ERRCODE = '42501';
  END IF;
  IF (to_jsonb(NEW) - ARRAY['status','consumed_roll_id','revoked_at','version']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status','consumed_roll_id','revoked_at','version']) THEN
    RAISE EXCEPTION 'Authorization scope is immutable' USING ERRCODE = '42501';
  END IF;
  IF OLD.status IN ('widerrufen','verfallen') AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN
    RAISE EXCEPTION 'Closed authorization is immutable' USING ERRCODE = '42501';
  END IF;
  IF OLD.status='eingeloest' AND NEW.status NOT IN ('eingeloest','widerrufen') THEN
    RAISE EXCEPTION 'Consumed authorization cannot reopen' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
-- statement
CREATE TRIGGER action_vollmacht_scope_guard BEFORE UPDATE OR DELETE ON action_vollmachten FOR EACH ROW EXECUTE FUNCTION protect_action_vollmacht_scope();
