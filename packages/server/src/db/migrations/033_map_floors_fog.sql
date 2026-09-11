-- Floor metadata references ordinary revisioned maps, never duplicates their content.
CREATE TABLE map_floor_stacks (
  root_map_id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id),
  version integer NOT NULL CHECK(version>0), document jsonb NOT NULL,
  created_by text NOT NULL REFERENCES users(id), created_at bigint NOT NULL,
  updated_by text NOT NULL REFERENCES users(id), updated_at bigint NOT NULL,
  FOREIGN KEY(root_map_id,campaign_id) REFERENCES tactical_maps(id,campaign_id)
);
-- statement
CREATE INDEX map_floor_stack_members ON map_floor_stacks USING gin ((document->'floors'));
-- statement
-- Exploration is pinned to geometry revision: edits cannot silently reveal a different room.
CREATE TABLE map_room_fog (
  map_id text NOT NULL, campaign_id text NOT NULL REFERENCES campaigns(id), map_revision integer NOT NULL,
  version integer NOT NULL CHECK(version>0), document jsonb NOT NULL,
  updated_by text NOT NULL REFERENCES users(id), updated_at bigint NOT NULL,
  PRIMARY KEY(map_id,map_revision),
  FOREIGN KEY(map_id,campaign_id,map_revision) REFERENCES tactical_map_revisions(map_id,campaign_id,revision)
);
-- statement
CREATE TABLE map_studio_commands (
  command_id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id),
  actor_user_id text NOT NULL REFERENCES users(id), scope_id text NOT NULL,
  operation text NOT NULL CHECK(operation IN ('floor.add','floor.link','floor.unlink','floor.rename','floor.detach','fog.set')),
  request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
  request jsonb NOT NULL, ack jsonb NOT NULL, created_at bigint NOT NULL,
  FOREIGN KEY(scope_id,campaign_id) REFERENCES tactical_maps(id,campaign_id)
);
-- statement
CREATE TRIGGER protect_map_studio_commands BEFORE UPDATE OR DELETE ON map_studio_commands
  FOR EACH ROW EXECUTE FUNCTION deny_history_mutation();
