BEGIN;
-- Keep the submitted vote immutable; cancellation is an append-only decision.
CREATE TABLE church.election_public_vote_voids (
 vote_id uuid PRIMARY KEY REFERENCES church.election_public_votes(id),
 voided_by uuid NOT NULL REFERENCES church.users(id),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
 voided_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT ON church.election_public_vote_voids TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(62) ON CONFLICT DO NOTHING;
COMMIT;
