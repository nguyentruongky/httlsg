BEGIN;
CREATE TABLE church.calendar_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  event_id uuid REFERENCES church.events(id),
  event_date date NOT NULL,
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
CREATE INDEX calendar_contributions_pending ON church.calendar_contributions(created_at) WHERE status='pending';
CREATE INDEX calendar_contributions_event ON church.calendar_contributions(event_id);
GRANT SELECT,INSERT,UPDATE ON church.calendar_contributions TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(41);
COMMIT;
