-- Upgrade 001_church.sql without losing profiles with shared/missing contacts.
BEGIN;
CREATE TABLE IF NOT EXISTS church.schema_migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
INSERT INTO church.schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
ALTER TABLE church.roles DROP CONSTRAINT roles_id_check;
ALTER TABLE church.roles ADD CONSTRAINT roles_id_check CHECK(id IN ('admin','secretary','deacon','board','user','leader'));
INSERT INTO church.roles VALUES('leader','Trưởng Ban ngành');
ALTER TABLE church.permissions ADD COLUMN code text, ADD COLUMN name text;
UPDATE church.permissions SET code=id,name=CASE id WHEN 'dashboard' THEN 'Mở trang quản trị' WHEN 'members.read.all' THEN 'Xem toàn bộ danh sách' WHEN 'members.write.all' THEN 'Sửa toàn bộ hồ sơ' WHEN 'members.delete' THEN 'Xóa thành viên' WHEN 'access.manage' THEN 'Quản lý tài khoản và quyền' WHEN 'departments.manage' THEN 'Quản lý Ban ngành' WHEN 'families.manage' THEN 'Quản lý liên kết gia đình' WHEN 'audit.read' THEN 'Xem nhật ký' WHEN 'members.write.department' THEN 'Sửa hồ sơ trong Ban ngành' WHEN 'members.read.family' THEN 'Xem hồ sơ gia đình' WHEN 'members.write.family' THEN 'Sửa hồ sơ gia đình' ELSE id END;
ALTER TABLE church.permissions ALTER COLUMN code SET NOT NULL, ALTER COLUMN name SET NOT NULL, ADD UNIQUE(code);
INSERT INTO church.permissions(id,code,name) VALUES('leader.otps.read','leader.otps.read','Xem mã OTP của Ban ngành'),('members.read.department','members.read.department','Xem thành viên trong Ban ngành');
INSERT INTO church.role_permissions SELECT r.id,p.id FROM church.roles r CROSS JOIN church.permissions p WHERE r.id IN ('admin','secretary') ON CONFLICT DO NOTHING;
INSERT INTO church.role_permissions VALUES('leader','leader.otps.read'),('leader','members.read.department');
CREATE FUNCTION church.normalize_phone(value text) RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$
 SELECT CASE WHEN p ~ '^0[0-9]{8,10}$' THEN '+84'||substr(p,2) WHEN p ~ '^84[0-9]{8,10}$' THEN '+'||p WHEN p ~ '^\+[1-9][0-9]{7,14}$' THEN p ELSE NULL END FROM (SELECT regexp_replace(btrim(value),'[[:space:]().-]','','g') p) cleaned
$$;
ALTER TABLE church.users RENAME TO member_profiles;
-- Contacts on member profiles are descriptive data; identifiers on users are unique.
CREATE TABLE church.users (
 id uuid PRIMARY KEY REFERENCES church.member_profiles(id) ON DELETE CASCADE,
 email text UNIQUE CHECK(email IS NULL OR (email=lower(btrim(email)) AND length(email)<=254 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
 phone text UNIQUE CHECK(phone IS NULL OR (phone ~ '^\+[1-9][0-9]{7,14}$' AND phone=church.normalize_phone(phone))),
 full_name text NOT NULL CHECK(length(btrim(full_name)) BETWEEN 2 AND 100),
 password_hash text CHECK(password_hash IS NULL OR password_hash ~ '^\$argon2id\$v=19\$'),
 is_password_set boolean NOT NULL DEFAULT false,
 must_reset_password boolean NOT NULL DEFAULT false,
 temporary_password_expires_at timestamptz,
 role_id text NOT NULL DEFAULT 'user' REFERENCES church.roles(id),
 department_id text REFERENCES church.departments(id) ON DELETE SET NULL,
 enabled boolean NOT NULL DEFAULT true,auth_version integer NOT NULL DEFAULT 0 CHECK(auth_version>=0),
 password_changed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),deleted_at timestamptz,
 CHECK(email IS NOT NULL OR phone IS NOT NULL),
 CHECK(NOT is_password_set OR (password_hash IS NOT NULL AND NOT must_reset_password)),
 CHECK(NOT must_reset_password OR NOT is_password_set)
);
CREATE INDEX accounts_role ON church.users(role_id);
CREATE INDEX accounts_department ON church.users(department_id);
INSERT INTO church.users(id,email,full_name,password_hash,is_password_set,role_id,enabled,created_at,updated_at,deleted_at)
 SELECT id,email,full_name,password_hash,true,role_id,enabled,created_at,updated_at,deleted_at FROM church.member_profiles WHERE password_hash IS NOT NULL;
ALTER TABLE church.member_profiles DROP COLUMN password_hash CASCADE;
-- Profiles may share a contact email. Authentication identifiers may not.
DROP INDEX church.users_email_unique;
CREATE INDEX profile_contact_email ON church.member_profiles(lower(email)) WHERE email IS NOT NULL;
CREATE INDEX profile_contact_phone ON church.member_profiles(church.normalize_phone(phone)) WHERE phone IS NOT NULL;
CREATE FUNCTION church.sync_account_profile() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE church.users SET full_name=NEW.full_name,role_id=NEW.role_id,enabled=NEW.enabled,deleted_at=NEW.deleted_at,
 auth_version=auth_version+CASE WHEN OLD.role_id IS DISTINCT FROM NEW.role_id OR OLD.enabled IS DISTINCT FROM NEW.enabled OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN 1 ELSE 0 END WHERE id=NEW.id;
 RETURN NEW;
END $$;
CREATE TRIGGER profile_account_sync AFTER UPDATE OF full_name,role_id,enabled,deleted_at ON church.member_profiles FOR EACH ROW EXECUTE FUNCTION church.sync_account_profile();
CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON church.users FOR EACH ROW EXECUTE FUNCTION church.touch_updated_at();
ALTER TABLE church.sessions ADD COLUMN auth_version integer NOT NULL DEFAULT 0, ADD COLUMN purpose text NOT NULL DEFAULT 'access' CHECK(purpose IN ('access','password_setup'));
DELETE FROM church.sessions s WHERE NOT EXISTS(SELECT 1 FROM church.users u WHERE u.id=s.user_id);
ALTER TABLE church.sessions ADD FOREIGN KEY(user_id) REFERENCES church.users(id) ON DELETE CASCADE;
-- Existing cookies predate session purpose/version claims; require a new login.
UPDATE church.sessions SET revoked_at=now() WHERE revoked_at IS NULL;
CREATE TABLE church.department_leaders (
 user_id uuid PRIMARY KEY REFERENCES church.users(id) ON DELETE CASCADE,
 department_id text NOT NULL REFERENCES church.departments(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX department_leaders_department ON church.department_leaders(department_id,user_id);
CREATE TABLE church.otps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES church.users(id) ON DELETE CASCADE,
 otp_code text NOT NULL CHECK(length(otp_code)=64), -- keyed HMAC, never a plain numeric code
 otp_ciphertext text, -- authenticated encryption only for the scoped PHONE_LEADER display
 type text NOT NULL CHECK(type IN ('EMAIL','PHONE_LEADER')),
 department_id text REFERENCES church.departments(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,is_used boolean NOT NULL DEFAULT false,used_at timestamptz,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(expires_at>created_at AND expires_at<=created_at+interval '24 hours'),
 CHECK((type='EMAIL' AND otp_ciphertext IS NULL AND expires_at<=created_at+interval '10 minutes') OR (type='PHONE_LEADER' AND otp_ciphertext IS NOT NULL AND department_id IS NOT NULL))
);
CREATE INDEX otps_user ON church.otps(user_id,created_at DESC);
CREATE INDEX otps_department ON church.otps(department_id);
CREATE INDEX otps_department_pending ON church.otps(department_id,expires_at) WHERE NOT is_used;
CREATE UNIQUE INDEX otps_one_active ON church.otps(user_id,type) WHERE NOT is_used;
GRANT SELECT,INSERT,UPDATE,DELETE ON church.users,church.department_leaders,church.otps TO church_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON church.role_permissions TO church_runtime;
GRANT SELECT ON church.schema_migrations TO church_runtime;
GRANT EXECUTE ON FUNCTION church.normalize_phone(text) TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(2);
COMMIT;
