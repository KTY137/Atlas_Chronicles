-- Additive actor/item storage. The historical v1 actors and membership bindings stay intact.
CREATE TABLE actor_templates (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id),
  head_revision integer NOT NULL DEFAULT 1 CHECK(head_revision > 0),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL, archived_at bigint,
  UNIQUE(id,campaign_id)
);
-- statement
CREATE TABLE actor_template_revisions (
  template_id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id),
  revision integer NOT NULL CHECK(revision > 0), definition jsonb NOT NULL CHECK(jsonb_typeof(definition)='object'),
  content_hash text NOT NULL CHECK(content_hash ~ '^[a-f0-9]{64}$'),
  created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL,
  PRIMARY KEY(template_id,revision), UNIQUE(template_id,campaign_id,revision),
  FOREIGN KEY(template_id,campaign_id) REFERENCES actor_templates(id,campaign_id)
);
-- statement
ALTER TABLE actor_templates ADD CONSTRAINT actor_template_head FOREIGN KEY(id,campaign_id,head_revision)
  REFERENCES actor_template_revisions(template_id,campaign_id,revision) DEFERRABLE INITIALLY DEFERRED;
-- statement
CREATE TRIGGER protect_actor_template_revisions BEFORE UPDATE OR DELETE ON actor_template_revisions
  FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
CREATE TABLE actor_profiles (
  actor_id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id),
  kind text NOT NULL CHECK(kind IN ('player_character','npc','creature','companion','vehicle','unspecified')),
  template_id text, template_revision integer, lore_entry_id text,
  version integer NOT NULL DEFAULT 1 CHECK(version > 0), archived_at bigint,
  created_by text REFERENCES users(id), created_at bigint,
  UNIQUE(actor_id,campaign_id), FOREIGN KEY(actor_id,campaign_id) REFERENCES actors(id,campaign_id),
  FOREIGN KEY(template_id,campaign_id,template_revision) REFERENCES actor_template_revisions(template_id,campaign_id,revision),
  FOREIGN KEY(lore_entry_id,campaign_id) REFERENCES entries(id,campaign_id),
  CHECK((template_id IS NULL) = (template_revision IS NULL)),
  CHECK((created_by IS NULL) = (created_at IS NULL))
);
-- statement
CREATE TABLE actor_controllers (
  actor_id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id), user_id text NOT NULL REFERENCES users(id),
  permission text NOT NULL DEFAULT 'control' CHECK(permission='control'),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  granted_by text REFERENCES users(id), granted_at bigint, revoked_at bigint,
  PRIMARY KEY(actor_id,user_id), FOREIGN KEY(actor_id,campaign_id) REFERENCES actor_profiles(actor_id,campaign_id),
  CHECK((granted_by IS NULL) = (granted_at IS NULL))
);
-- statement
CREATE INDEX actor_controllers_member ON actor_controllers(campaign_id,user_id) WHERE revoked_at IS NULL;
-- statement
CREATE TABLE reader_perspectives (
  campaign_id text NOT NULL, user_id text NOT NULL, actor_id text,
  version integer NOT NULL DEFAULT 1 CHECK(version > 0), updated_at bigint,
  PRIMARY KEY(campaign_id,user_id), FOREIGN KEY(campaign_id,user_id) REFERENCES campaign_memberships(campaign_id,user_id) ON DELETE CASCADE,
  FOREIGN KEY(actor_id,campaign_id) REFERENCES actor_profiles(actor_id,campaign_id)
);
-- statement
CREATE TABLE item_templates (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id),
  head_revision integer NOT NULL DEFAULT 1 CHECK(head_revision > 0),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL, archived_at bigint,
  UNIQUE(id,campaign_id)
);
-- statement
CREATE TABLE item_template_revisions (
  template_id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id),
  revision integer NOT NULL CHECK(revision > 0), definition jsonb NOT NULL CHECK(jsonb_typeof(definition)='object'),
  content_hash text NOT NULL CHECK(content_hash ~ '^[a-f0-9]{64}$'),
  created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL,
  PRIMARY KEY(template_id,revision), UNIQUE(template_id,campaign_id,revision),
  FOREIGN KEY(template_id,campaign_id) REFERENCES item_templates(id,campaign_id)
);
-- statement
ALTER TABLE item_templates ADD CONSTRAINT item_template_head FOREIGN KEY(id,campaign_id,head_revision)
  REFERENCES item_template_revisions(template_id,campaign_id,revision) DEFERRABLE INITIALLY DEFERRED;
-- statement
CREATE TRIGGER protect_item_template_revisions BEFORE UPDATE OR DELETE ON item_template_revisions
  FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
CREATE TABLE item_instances (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id),
  template_id text NOT NULL, template_revision integer NOT NULL, holder_actor_id text,
  state jsonb NOT NULL CHECK(jsonb_typeof(state)='object'),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL, archived_at bigint,
  UNIQUE(id,campaign_id),
  FOREIGN KEY(template_id,campaign_id,template_revision) REFERENCES item_template_revisions(template_id,campaign_id,revision),
  FOREIGN KEY(holder_actor_id,campaign_id) REFERENCES actor_profiles(actor_id,campaign_id)
);
-- statement
CREATE INDEX item_instances_holder ON item_instances(campaign_id,holder_actor_id) WHERE archived_at IS NULL;
-- statement
CREATE TABLE actor_inventory_events (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id), actor_user_id text NOT NULL REFERENCES users(id),
  operation text NOT NULL CHECK(operation IN (
    'actor.template.create','actor.template.revise','actor.template.archive','actor.instantiate','actor.update','actor.archive',
    'actor.controller.grant','actor.controller.revoke','reader.perspective',
    'item.template.create','item.template.revise','item.template.archive','item.instantiate','item.update','item.transfer','item.archive')),
  subject_id text NOT NULL, command_id text NOT NULL, request jsonb NOT NULL CHECK(jsonb_typeof(request)='object'),
  request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
  before_state jsonb, after_state jsonb, result jsonb NOT NULL, reason text, created_at bigint NOT NULL,
  UNIQUE(actor_user_id,command_id)
);
-- statement
CREATE TRIGGER protect_actor_inventory_events BEFORE UPDATE OR DELETE ON actor_inventory_events
  FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
-- statement
-- Unknown historical creator/time remain unknown; the original custodian is not claimed as creator.
INSERT INTO actor_profiles(actor_id,campaign_id,kind)
  SELECT a.id,a.campaign_id,CASE WHEN EXISTS(SELECT 1 FROM campaign_memberships m WHERE m.campaign_id=a.campaign_id AND m.actor_id=a.id)
    THEN 'player_character' ELSE 'unspecified' END FROM actors a;
-- statement
-- Preserve exactly the old player authorization, rather than all actors sharing a user_id.
INSERT INTO actor_controllers(actor_id,campaign_id,user_id)
  SELECT a.id,a.campaign_id,a.user_id FROM actors a JOIN campaign_memberships m
    ON m.campaign_id=a.campaign_id AND m.user_id=a.user_id AND m.actor_id=a.id WHERE m.role='spieler';
-- statement
INSERT INTO reader_perspectives(campaign_id,user_id,actor_id)
  SELECT campaign_id,user_id,CASE WHEN role='spieler' THEN actor_id ELSE NULL END FROM campaign_memberships;
