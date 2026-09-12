-- Original raster bytes belong to the actor and travel with the campaign backup.
-- Clearing a portrait retains its revision, preventing stale uploads from reviving it.
CREATE TABLE actor_portraits (
  actor_id text NOT NULL, campaign_id text NOT NULL,
  version integer NOT NULL CHECK(version BETWEEN 1 AND 2147483647),
  mime text CHECK(mime IN ('image/png','image/jpeg','image/webp','image/gif')),
  sha256 text CHECK(sha256 ~ '^[a-f0-9]{64}$'),
  bytes bigint CHECK(bytes BETWEEN 1 AND 8388608),
  breite integer CHECK(breite BETWEEN 1 AND 4096), hoehe integer CHECK(hoehe BETWEEN 1 AND 4096),
  daten text,
  updated_by text NOT NULL REFERENCES users(id), updated_at bigint NOT NULL CHECK(updated_at>=0),
  PRIMARY KEY(actor_id,campaign_id),
  FOREIGN KEY(actor_id,campaign_id) REFERENCES actors(id,campaign_id) ON DELETE CASCADE,
  CHECK((mime IS NULL) = (sha256 IS NULL) AND (mime IS NULL) = (bytes IS NULL)
    AND (mime IS NULL) = (breite IS NULL) AND (mime IS NULL) = (hoehe IS NULL) AND (mime IS NULL) = (daten IS NULL))
);
