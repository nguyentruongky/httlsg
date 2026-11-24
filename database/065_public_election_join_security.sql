BEGIN;

ALTER TABLE church.election_public_admissions ADD COLUMN entry_credential_hash text;
-- Preserve the earliest known admission credential on devices used before this rule.
UPDATE church.election_public_admissions a
SET entry_credential_hash=COALESCE(
  (SELECT o.pin_hash FROM church.election_public_otps o
   WHERE o.session_id=a.session_id AND o.consumed_browser_hash=a.browser_hash
   ORDER BY o.consumed_at,o.id LIMIT 1),
  (SELECT s.pin_hash FROM church.election_public_sessions s
   WHERE s.id=a.session_id AND s.consumed_browser_hash=a.browser_hash)
);

CREATE TABLE church.election_public_join_guards (
  browser_hash text PRIMARY KEY,
  failures integer NOT NULL DEFAULT 0 CHECK(failures BETWEEN 0 AND 3),
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE church.election_public_join_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  browser_hash text NOT NULL,
  outcome text NOT NULL CHECK(outcome IN ('accepted','invalid','locked','duplicate_device')),
  reason text NOT NULL,
  failure_count integer NOT NULL CHECK(failure_count BETWEEN 0 AND 3),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX election_public_join_attempts_browser
  ON church.election_public_join_attempts(browser_hash,created_at DESC);
CREATE INDEX election_public_join_attempts_time
  ON church.election_public_join_attempts(created_at DESC);
GRANT SELECT,INSERT,UPDATE ON church.election_public_join_guards TO church_runtime;
GRANT SELECT,INSERT ON church.election_public_join_attempts TO church_runtime;

INSERT INTO church.schema_migrations(version) VALUES(65) ON CONFLICT DO NOTHING;
COMMIT;
