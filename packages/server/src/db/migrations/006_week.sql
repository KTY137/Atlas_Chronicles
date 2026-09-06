CREATE TABLE week_clocks (
  campaign_id text PRIMARY KEY REFERENCES campaigns(id), day integer NOT NULL CHECK(day BETWEEN 0 AND 1000000),
  label text NOT NULL, post_days integer NOT NULL DEFAULT 0 CHECK(post_days BETWEEN 0 AND 365),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0), updated_at bigint NOT NULL, updated_by text NOT NULL REFERENCES users(id)
);
-- statement
CREATE TABLE letters (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id), from_actor_id text NOT NULL,
  sent_by text NOT NULL REFERENCES users(id), command_id text NOT NULL, request_hash text NOT NULL,
  note text NOT NULL, snapshots jsonb NOT NULL, seal text NOT NULL,
  sent_at bigint NOT NULL, sent_day integer NOT NULL, sent_label text NOT NULL,
  arrival_day integer NOT NULL CHECK(arrival_day >= sent_day),
  FOREIGN KEY(from_actor_id,campaign_id) REFERENCES actors(id,campaign_id),
  UNIQUE(id,campaign_id), UNIQUE(campaign_id,sent_by,command_id)
);
-- statement
CREATE TRIGGER protect_letters BEFORE UPDATE OR DELETE ON letters FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
CREATE TABLE letter_recipients (
  letter_id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id), actor_id text NOT NULL,
  delivered_at bigint, delivered_day integer, delivered_label text, read_at bigint, read_day integer,
  PRIMARY KEY(letter_id,actor_id), FOREIGN KEY(letter_id,campaign_id) REFERENCES letters(id,campaign_id),
  FOREIGN KEY(actor_id,campaign_id) REFERENCES actors(id,campaign_id),
  CHECK((delivered_at IS NULL AND delivered_day IS NULL AND delivered_label IS NULL AND read_at IS NULL AND read_day IS NULL)
    OR (delivered_at IS NOT NULL AND delivered_day IS NOT NULL AND delivered_label IS NOT NULL)),
  CHECK((read_at IS NULL AND read_day IS NULL) OR (read_at IS NOT NULL AND read_day IS NOT NULL))
);
-- statement
CREATE TABLE letter_delivery_receipts (
  letter_id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id), actor_id text NOT NULL,
  proof jsonb NOT NULL, seal text NOT NULL, delivered_at bigint NOT NULL,
  PRIMARY KEY(letter_id,actor_id), FOREIGN KEY(letter_id,actor_id) REFERENCES letter_recipients(letter_id,actor_id),
  FOREIGN KEY(letter_id,campaign_id) REFERENCES letters(id,campaign_id),
  FOREIGN KEY(actor_id,campaign_id) REFERENCES actors(id,campaign_id)
);
-- statement
CREATE TRIGGER protect_letter_delivery_receipts BEFORE UPDATE OR DELETE ON letter_delivery_receipts FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
CREATE TABLE reading_watermarks (
  campaign_id text NOT NULL REFERENCES campaigns(id), reader_user_id text NOT NULL REFERENCES users(id),
  actor_id text, entry_id text NOT NULL, projected_hashes jsonb NOT NULL, read_at bigint NOT NULL,
  PRIMARY KEY(campaign_id,reader_user_id,entry_id),
  FOREIGN KEY(actor_id,campaign_id) REFERENCES actors(id,campaign_id),
  FOREIGN KEY(entry_id,campaign_id) REFERENCES entries(id,campaign_id)
);
-- statement
CREATE TABLE week_baselines (
  session_id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id), captured_at bigint NOT NULL,
  knowledge jsonb NOT NULL, lineage_seq bigint NOT NULL,
  FOREIGN KEY(session_id,campaign_id) REFERENCES game_sessions(id,campaign_id)
);
-- statement
CREATE TRIGGER protect_week_baselines BEFORE UPDATE OR DELETE ON week_baselines FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
CREATE FUNCTION capture_week_baseline() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO week_baselines(session_id,campaign_id,captured_at,knowledge,lineage_seq)
  SELECT NEW.id,NEW.campaign_id,NEW.started_at,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('actorId',r.actor_id,'passageId',r.passage_id,'quelle',r.quelle,'grantedAt',r.granted_at))
      FROM revelations r WHERE r.campaign_id=NEW.campaign_id AND r.revoked_at IS NULL),'[]'::jsonb),
    COALESCE((SELECT max(l.seq) FROM lineage_events l JOIN entries e ON e.id=l.entry_id WHERE e.campaign_id=NEW.campaign_id),0);
  RETURN NEW;
END;
$$;
-- statement
CREATE TRIGGER capture_week_at_session_start AFTER INSERT ON game_sessions FOR EACH ROW EXECUTE FUNCTION capture_week_baseline();
-- statement
CREATE FUNCTION protect_letter_recipient_state() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Envelope history is append-only' USING ERRCODE='42501'; END IF;
  IF NEW.letter_id IS DISTINCT FROM OLD.letter_id OR NEW.campaign_id IS DISTINCT FROM OLD.campaign_id OR NEW.actor_id IS DISTINCT FROM OLD.actor_id THEN
    RAISE EXCEPTION 'Envelope ownership is immutable' USING ERRCODE='42501';
  END IF;
  IF OLD.delivered_at IS NOT NULL AND (NEW.delivered_at IS DISTINCT FROM OLD.delivered_at OR NEW.delivered_day IS DISTINCT FROM OLD.delivered_day OR NEW.delivered_label IS DISTINCT FROM OLD.delivered_label) THEN
    RAISE EXCEPTION 'Delivery is immutable' USING ERRCODE='42501';
  END IF;
  IF OLD.read_at IS NOT NULL AND (NEW.read_at IS DISTINCT FROM OLD.read_at OR NEW.read_day IS DISTINCT FROM OLD.read_day) THEN
    RAISE EXCEPTION 'Read receipt is immutable' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
-- statement
CREATE TRIGGER letter_recipient_state_guard BEFORE UPDATE OR DELETE ON letter_recipients FOR EACH ROW EXECUTE FUNCTION protect_letter_recipient_state();
