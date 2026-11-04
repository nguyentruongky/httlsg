-- A member may hold several management roles at once. Each departmental role
-- (Ban điều hành / Trưởng Ban ngành) carries its own Ban ngành.
BEGIN;
CREATE TABLE church.member_roles (
 member_id uuid NOT NULL REFERENCES church.member_profiles(id) ON DELETE CASCADE,
 role_id text NOT NULL REFERENCES church.roles(id) CHECK(role_id<>'user'),
 department_id text REFERENCES church.departments(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((role_id IN ('board','leader'))=(department_id IS NOT NULL))
);
-- '' can never be a department id, so it stands in for "no Ban ngành" here.
CREATE UNIQUE INDEX member_roles_unique ON church.member_roles(member_id,role_id,coalesce(department_id,''));
CREATE INDEX member_roles_role ON church.member_roles(role_id,department_id,member_id);
-- Leaders can now serve several Ban ngành, mirroring department_managers.
ALTER TABLE church.department_leaders DROP CONSTRAINT department_leaders_pkey;
ALTER TABLE church.department_leaders ADD PRIMARY KEY(user_id,department_id);
-- Carry existing single-role assignments over to the new table.
INSERT INTO church.member_roles(member_id,role_id,department_id)
 SELECT p.id,p.role_id,CASE WHEN p.role_id IN ('board','leader') THEN u.department_id END
 FROM church.member_profiles p JOIN church.users u ON u.id=p.id
 WHERE p.role_id<>'user' AND p.deleted_at IS NULL
  AND (p.role_id NOT IN ('board','leader') OR u.department_id IS NOT NULL)
ON CONFLICT DO NOTHING;
GRANT SELECT,INSERT,UPDATE,DELETE ON church.member_roles TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(3);
COMMIT;
