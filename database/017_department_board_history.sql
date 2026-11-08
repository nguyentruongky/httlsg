BEGIN;
CREATE TABLE church.department_board_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 department_id text REFERENCES church.departments(id) ON DELETE SET NULL,
 department_name text NOT NULL,
 year integer NOT NULL CHECK(year BETWEEN 1900 AND 2200),
 revision integer NOT NULL CHECK(revision > 0),
 members jsonb NOT NULL CHECK(jsonb_typeof(members)='array'),
 created_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(department_id,year,revision)
);
CREATE INDEX department_board_history_lookup ON church.department_board_history(department_id,year DESC,revision DESC);
-- Historical snapshots are append-only, including member names/titles at that time.
GRANT SELECT,INSERT ON church.department_board_history TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(17);
COMMIT;
