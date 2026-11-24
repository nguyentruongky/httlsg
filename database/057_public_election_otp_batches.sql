BEGIN;
CREATE TABLE church.election_public_otps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL REFERENCES church.election_public_sessions(id),
 batch_id uuid NOT NULL,
 pin_hash text NOT NULL UNIQUE,
 encrypted_pin text NOT NULL,
 consumed_browser_hash text,
 consumed_at timestamptz,
 created_by uuid NOT NULL REFERENCES church.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((consumed_browser_hash IS NULL) = (consumed_at IS NULL))
);
CREATE INDEX election_public_otps_session_batch ON church.election_public_otps(session_id,created_at,id);
CREATE INDEX election_public_otps_batch ON church.election_public_otps(batch_id);
GRANT SELECT,INSERT,UPDATE ON church.election_public_otps TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(57);
COMMIT;
