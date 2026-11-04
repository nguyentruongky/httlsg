-- Single-church schema. Apply to a fresh database with psql -v ON_ERROR_STOP=1.
-- The historical multi-tenant demonstration schema is not used by this backend.
BEGIN;
CREATE SCHEMA church;
REVOKE ALL ON SCHEMA church FROM PUBLIC;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE TABLE church.roles (
 id text PRIMARY KEY CHECK (id IN ('admin','secretary','deacon','board','user')),
 name text NOT NULL UNIQUE
);
CREATE TABLE church.permissions (id text PRIMARY KEY);
CREATE TABLE church.role_permissions (
 role_id text NOT NULL REFERENCES church.roles(id),
 permission_id text NOT NULL REFERENCES church.permissions(id),
 PRIMARY KEY(role_id,permission_id)
);
CREATE INDEX role_permissions_permission ON church.role_permissions(permission_id);
INSERT INTO church.roles VALUES ('admin','Admin'),('secretary','Thư ký'),('deacon','Chấp sự'),('board','Ban điều hành'),('user','User');
INSERT INTO church.permissions VALUES ('dashboard'),('members.read.all'),('members.write.all'),('members.delete'),('access.manage'),('departments.manage'),('families.manage'),('audit.read'),('members.write.department'),('members.read.family'),('members.write.family');
INSERT INTO church.role_permissions
 SELECT r.id,p.id FROM church.roles r CROSS JOIN church.permissions p WHERE r.id IN ('admin','secretary');
INSERT INTO church.role_permissions VALUES ('deacon','members.read.all'),('board','members.read.all'),('board','members.write.department'),('user','members.read.family'),('user','members.write.family');
CREATE TABLE church.users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text CHECK (email IS NULL OR (email=lower(btrim(email)) AND length(email)<=254 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
 -- Null credentials permit imported member profiles without creating login accounts.
 password_hash text CHECK(password_hash IS NULL OR password_hash ~ '^\$argon2id\$v=19\$'),
 full_name text NOT NULL CHECK(length(btrim(full_name)) BETWEEN 2 AND 100),
 phone text CHECK(phone IS NULL OR length(phone)<=30),
 role_id text NOT NULL DEFAULT 'user' REFERENCES church.roles(id),
 enabled boolean NOT NULL DEFAULT true,
 date_of_birth date CHECK(date_of_birth IS NULL OR date_of_birth<=CURRENT_DATE),
 address text NOT NULL DEFAULT '' CHECK(length(address)<=300),
 occupation text NOT NULL DEFAULT '' CHECK(length(occupation)<=100),
 bio text NOT NULL DEFAULT '' CHECK(length(bio)<=2000),
 area text CHECK(area IS NULL OR area ~ '^KV([1-9]|1[0-3])$'),
 location text,
 church_status text CHECK(church_status IN ('Trung tín','Không trung tín','Không đi nhóm','Chuyển hội','Đi nước ngoài')),
 faith_date date CHECK(faith_date IS NULL OR faith_date<=CURRENT_DATE),
 baptism_date date CHECK(baptism_date IS NULL OR baptism_date<=CURRENT_DATE),
 preferred_name text NOT NULL DEFAULT '', gender text NOT NULL DEFAULT '', household_role text NOT NULL DEFAULT '',
 source jsonb, is_test_account boolean NOT NULL DEFAULT false,
 version integer NOT NULL DEFAULT 0 CHECK(version>=0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
 CHECK(password_hash IS NULL OR email IS NOT NULL)
);
CREATE UNIQUE INDEX users_email_unique ON church.users(lower(email)) WHERE email IS NOT NULL;
CREATE INDEX users_role ON church.users(role_id);
CREATE INDEX users_name ON church.users(full_name,id) WHERE deleted_at IS NULL;
CREATE INDEX users_area_location ON church.users(area,location) WHERE deleted_at IS NULL;
CREATE INDEX users_birth ON church.users(date_of_birth) WHERE deleted_at IS NULL;
CREATE TABLE church.departments (
 id text PRIMARY KEY CHECK(id ~ '^[a-z0-9-]+$'), name text NOT NULL UNIQUE CHECK(length(name) BETWEEN 2 AND 100),
 created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO church.departments(id,name) VALUES
 ('lao-nien','Ban Lão niên'),('trung-nien','Ban Trung niên'),('trang-nien','Ban Tráng niên'),('thanh-trang','Ban Thanh tráng'),('thanh-nien','Ban Thanh niên'),('thieu-nien','Ban Thiếu niên'),('thieu-nhi','Ban Thiếu nhi'),('au-nhi','Ban Ấu nhi'),('tham-vieng','Ban Thăm viếng'),('truyen-giang','Ban Truyền giảng'),('truong-chua-nhat','Ban Trường Chúa nhật'),('truyen-thong','Ban Truyền thông'),('giu-xe','Ban Giữ xe');
CREATE TABLE church.department_members (
 department_id text NOT NULL REFERENCES church.departments(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES church.users(id) ON DELETE CASCADE,
 position text NOT NULL DEFAULT '' CHECK(length(position)<=100),
 PRIMARY KEY(department_id,user_id)
);
CREATE INDEX department_members_user ON church.department_members(user_id,department_id);
-- Board oversight is granted separately from ordinary departmental membership.
CREATE TABLE church.department_managers (
 user_id uuid NOT NULL REFERENCES church.users(id) ON DELETE CASCADE,
 department_id text NOT NULL REFERENCES church.departments(id) ON DELETE CASCADE,
 PRIMARY KEY(user_id,department_id)
);
CREATE INDEX department_managers_department ON church.department_managers(department_id,user_id);
CREATE TABLE church.households (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE church.household_members (
 user_id uuid PRIMARY KEY REFERENCES church.users(id) ON DELETE CASCADE,
 household_id uuid NOT NULL REFERENCES church.households(id) ON DELETE CASCADE,
 relationship text NOT NULL DEFAULT 'Thành viên' CHECK(length(relationship) BETWEEN 1 AND 60)
);
CREATE INDEX household_members_household ON church.household_members(household_id,user_id);
CREATE TABLE church.notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES church.users(id) ON DELETE CASCADE,
 author_id uuid REFERENCES church.users(id) ON DELETE SET NULL,
 text text NOT NULL CHECK(length(btrim(text)) BETWEEN 1 AND 4000), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notes_member_recent ON church.notes(member_id,created_at DESC,id);
CREATE INDEX notes_author ON church.notes(author_id);
CREATE TABLE church.visits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES church.users(id) ON DELETE CASCADE,
 author_id uuid REFERENCES church.users(id) ON DELETE SET NULL,
 visited_on date NOT NULL CHECK(visited_on<=CURRENT_DATE), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX visits_member_recent ON church.visits(member_id,visited_on DESC,created_at DESC,id);
CREATE INDEX visits_author ON church.visits(author_id);
CREATE TABLE church.sessions (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES church.users(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE CHECK(length(token_hash)=64),
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, revoked_at timestamptz,
 CHECK(expires_at>created_at)
);
CREATE INDEX sessions_user ON church.sessions(user_id);
CREATE INDEX sessions_expiry ON church.sessions(expires_at) WHERE revoked_at IS NULL;
CREATE TABLE church.login_limits (
 key_hash text PRIMARY KEY, attempts integer NOT NULL CHECK(attempts>0), window_start timestamptz NOT NULL
);
CREATE INDEX login_limits_window ON church.login_limits(window_start);
CREATE TABLE church.audit_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES church.users(id) ON DELETE SET NULL,
 subject_id uuid REFERENCES church.users(id) ON DELETE SET NULL, action text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_recent ON church.audit_log(created_at DESC,id);
CREATE INDEX audit_actor ON church.audit_log(actor_id);
CREATE INDEX audit_subject ON church.audit_log(subject_id);
CREATE FUNCTION church.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON church.users FOR EACH ROW EXECUTE FUNCTION church.touch_updated_at();
-- Runtime access is server-only. Configure a dedicated login, never use a superuser.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='church_runtime') THEN
  CREATE ROLE church_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
 END IF;
END $$;
GRANT USAGE ON SCHEMA church TO church_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON church.users,church.departments,church.department_members,church.department_managers,church.households,church.household_members,church.notes,church.visits,church.sessions,church.login_limits TO church_runtime;
GRANT SELECT ON church.roles,church.permissions,church.role_permissions TO church_runtime;
GRANT SELECT,INSERT ON church.audit_log TO church_runtime;
COMMIT;
