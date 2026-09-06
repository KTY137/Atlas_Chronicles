CREATE TABLE atlas_maps (
  id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES campaigns(id),
  artifact_id text NOT NULL REFERENCES artifacts(id), title text NOT NULL,
  width double precision NOT NULL CHECK(width>0), height double precision NOT NULL CHECK(height>0),
  version integer NOT NULL DEFAULT 1, created_at bigint NOT NULL, UNIQUE(id,campaign_id)
);
-- statement
CREATE TABLE atlas_nodes (
  map_id text NOT NULL REFERENCES atlas_maps(id), id text NOT NULL, campaign_id text NOT NULL,
  data jsonb NOT NULL, entry_id text, PRIMARY KEY(map_id,id),
  FOREIGN KEY(map_id,campaign_id) REFERENCES atlas_maps(id,campaign_id),
  FOREIGN KEY(entry_id,campaign_id) REFERENCES entries(id,campaign_id)
);
-- statement
CREATE TABLE atlas_revelations (
  map_id text NOT NULL, node_id text NOT NULL, campaign_id text NOT NULL, actor_id text NOT NULL,
  knowledge text NOT NULL CHECK(knowledge IN ('benannt','erschlossen')),
  granted_by text NOT NULL REFERENCES users(id), granted_at bigint NOT NULL,
  PRIMARY KEY(map_id,node_id,actor_id),
  FOREIGN KEY(map_id,node_id) REFERENCES atlas_nodes(map_id,id),
  FOREIGN KEY(map_id,campaign_id) REFERENCES atlas_maps(id,campaign_id),
  FOREIGN KEY(actor_id,campaign_id) REFERENCES actors(id,campaign_id)
);
-- statement
CREATE TABLE import_acceptances (
  artifact_id text NOT NULL REFERENCES artifacts(id), entry_id text NOT NULL REFERENCES entries(id),
  revision_id text NOT NULL REFERENCES revisions(id), accepted_by text NOT NULL REFERENCES users(id),
  accepted_at bigint NOT NULL, PRIMARY KEY(artifact_id,entry_id)
);
