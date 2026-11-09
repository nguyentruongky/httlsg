BEGIN;
CREATE TABLE church.reception_team (
 member_id uuid PRIMARY KEY REFERENCES church.member_profiles(id),
 eligibility text NOT NULL CHECK(eligibility IN ('male_deacon','male','female')),
 created_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,
 updated_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reception_team_creator ON church.reception_team(created_by);
CREATE INDEX reception_team_updater ON church.reception_team(updated_by);
GRANT SELECT,INSERT,UPDATE,DELETE ON church.reception_team TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(20);
COMMIT;
