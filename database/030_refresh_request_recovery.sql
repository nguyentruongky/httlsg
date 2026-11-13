BEGIN;
-- Request metadata only: refresh credentials continue to be stored as hashes.
ALTER TABLE church.refresh_tokens ADD COLUMN rotation_request_id uuid;
INSERT INTO church.schema_migrations(version) VALUES(30);
COMMIT;
