BEGIN;
-- Leaders may edit their own team by default; Settings can revoke this feature.
INSERT INTO church.role_permissions(role_id,permission_id) VALUES('leader','members.write.department') ON CONFLICT DO NOTHING;
CREATE INDEX IF NOT EXISTS member_roles_department ON church.member_roles(department_id,member_id);
CREATE FUNCTION church.notify_team_otp() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item record;
BEGIN
 IF TG_OP='DELETE' THEN item:=OLD; ELSE item:=NEW; END IF;
 IF item.department_id IS NOT NULL THEN
  PERFORM pg_notify('church_team_events',json_build_object('department_id',item.department_id,'kind','otps','id',item.id,'removed',TG_OP='DELETE' OR item.is_used OR item.attempts>=5 OR item.expires_at<=now())::text);
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER otp_team_events AFTER INSERT OR UPDATE OR DELETE ON church.otps FOR EACH ROW EXECUTE FUNCTION church.notify_team_otp();
CREATE FUNCTION church.notify_team_member() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE department text;
BEGIN
 FOR department IN SELECT department_id FROM church.department_members WHERE user_id=NEW.id LOOP
  PERFORM pg_notify('church_team_events',json_build_object('department_id',department,'kind','members')::text);
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER profile_team_events AFTER UPDATE ON church.member_profiles FOR EACH ROW EXECUTE FUNCTION church.notify_team_member();
CREATE FUNCTION church.notify_auth_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
 IF TG_TABLE_NAME='users' THEN target:=NEW.id;
 ELSIF TG_OP='DELETE' THEN target:=OLD.user_id;
 ELSE target:=NEW.user_id; END IF;
 PERFORM pg_notify('church_auth_events',json_build_object('user_id',target)::text);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER account_auth_events AFTER UPDATE OF auth_version,enabled,deleted_at ON church.users FOR EACH ROW EXECUTE FUNCTION church.notify_auth_change();
CREATE TRIGGER session_auth_events AFTER UPDATE OF revoked_at ON church.sessions FOR EACH ROW EXECUTE FUNCTION church.notify_auth_change();
CREATE TRIGGER leader_auth_events AFTER INSERT OR UPDATE OR DELETE ON church.department_leaders FOR EACH ROW EXECUTE FUNCTION church.notify_auth_change();
INSERT INTO church.schema_migrations(version) VALUES(4);
COMMIT;
