BEGIN;
CREATE TABLE church.election_connection_checks (
 id uuid PRIMARY KEY,
 election_id integer NOT NULL REFERENCES church.election_contests(id),
 session_id uuid NOT NULL REFERENCES church.election_public_sessions(id),
 admission_id uuid NOT NULL REFERENCES church.election_public_admissions(id),
 started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','success','invalid')),
 reason text,
 client_reason text,
 ack_request_ids uuid[] NOT NULL DEFAULT '{}' CHECK(cardinality(ack_request_ids)<=2),
 cookie_accepted boolean NOT NULL DEFAULT true,
 latency_ms integer CHECK(latency_ms BETWEEN 0 AND 120000),
 client_ack_count integer CHECK(client_ack_count BETWEEN 0 AND 2),
 location_supported boolean,
 location_permission text
);
CREATE INDEX election_connection_checks_log ON church.election_connection_checks(election_id,started_at DESC);
GRANT SELECT,INSERT,UPDATE ON church.election_connection_checks TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(61);
COMMIT;
