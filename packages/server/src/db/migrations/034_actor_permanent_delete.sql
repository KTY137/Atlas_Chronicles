-- Endgueltiges Loeschen fuer unbenutzte Figuren und Figurvorlagen.
--
-- Actor-/Inventarereignisse und Vorlagenrevisionen sind absichtlich append-only. Ein einfaches
-- DELETE wuerde nicht nur am Trigger scheitern: der native Export prueft die historischen Karten
-- auch gegen die noch vorhandene Figur bzw. Vorlagenrevision. Darum bekommt nur der neue,
-- transaktionale Loeschpfad ein enges Schluesselloch. UPDATE bleibt immer verboten.
--
-- Die GUCs tragen die konkrete Objektkennung. Damit kann eine Transaktion, die Figur A loescht,
-- weder Ereignisse von Figur B noch irgendeine andere Vorlagenhistorie entfernen. Die bestehende
-- Kampagnenloeschung bleibt ebenfalls erlaubt und unveraendert.
CREATE FUNCTION protect_actor_inventory_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  kampagne text := nullif(current_setting('chronicle.deleting_campaign', true), '');
  figur text := nullif(current_setting('chronicle.deleting_actor', true), '');
  vorlage text := nullif(current_setting('chronicle.deleting_actor_template', true), '');
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF kampagne IS NOT NULL AND OLD.campaign_id = kampagne THEN RETURN OLD; END IF;
    IF figur IS NOT NULL AND OLD.subject_id = figur
      AND OLD.operation IN ('actor.instantiate','actor.update','actor.archive','actor.controller.grant','actor.controller.revoke')
    THEN RETURN OLD; END IF;
    IF vorlage IS NOT NULL AND OLD.subject_id = vorlage
      AND OLD.operation IN ('actor.template.create','actor.template.revise','actor.template.archive')
    THEN RETURN OLD; END IF;
  END IF;
  RAISE EXCEPTION 'History is append-only' USING ERRCODE = '42501';
END;
$$;
-- statement
DROP TRIGGER protect_actor_inventory_events ON actor_inventory_events;
-- statement
CREATE TRIGGER protect_actor_inventory_events BEFORE UPDATE OR DELETE ON actor_inventory_events
  FOR EACH ROW EXECUTE FUNCTION protect_actor_inventory_history();
-- statement
CREATE FUNCTION protect_actor_template_revision_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  kampagne text := nullif(current_setting('chronicle.deleting_campaign', true), '');
  vorlage text := nullif(current_setting('chronicle.deleting_actor_template', true), '');
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF kampagne IS NOT NULL AND OLD.campaign_id = kampagne THEN RETURN OLD; END IF;
    IF vorlage IS NOT NULL AND OLD.template_id = vorlage THEN RETURN OLD; END IF;
  END IF;
  RAISE EXCEPTION 'History is append-only' USING ERRCODE = '42501';
END;
$$;
-- statement
DROP TRIGGER protect_actor_template_revisions ON actor_template_revisions;
-- statement
CREATE TRIGGER protect_actor_template_revisions BEFORE UPDATE OR DELETE ON actor_template_revisions
  FOR EACH ROW EXECUTE FUNCTION protect_actor_template_revision_history();
