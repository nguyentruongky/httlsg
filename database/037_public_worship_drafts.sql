BEGIN;
CREATE TABLE church.worship_contributions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL UNIQUE,
 event_date date NOT NULL,
 service_number integer NOT NULL CHECK (service_number IN (1,2)),
 base_event_id uuid REFERENCES church.events(id),
 base_version integer,
 base_text text NOT NULL,
 proposed_text text NOT NULL CHECK (length(proposed_text) BETWEEN 1 AND 50000),
 contributor_name text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','merged','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz,
 reviewed_by uuid REFERENCES church.member_profiles(id),
 merged_event_id uuid REFERENCES church.events(id)
);
CREATE INDEX worship_contributions_pending ON church.worship_contributions(created_at) WHERE status='pending';
INSERT INTO church.schema_migrations(version) VALUES(37);
COMMIT;
