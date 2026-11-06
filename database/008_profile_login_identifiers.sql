BEGIN;
ALTER TABLE church.users ADD COLUMN requires_admin_email_otp boolean NOT NULL DEFAULT false;
-- The requested identifier can be a unique contact alias on the linked profile.
ALTER TABLE church.otps ADD COLUMN identifier text CHECK(identifier IS NULL OR length(identifier)<=254);
UPDATE church.otps o SET identifier=CASE WHEN o.type='EMAIL' THEN u.email ELSE u.phone END FROM church.users u WHERE u.id=o.user_id;
CREATE INDEX otps_identifier_pending ON church.otps(identifier,created_at DESC) WHERE NOT is_used;
INSERT INTO church.schema_migrations(version) VALUES(8);
COMMIT;
