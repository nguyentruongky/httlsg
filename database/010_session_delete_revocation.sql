BEGIN;
-- A manual access-session deletion is also a persistent-session kill switch.
CREATE FUNCTION church.revoke_refresh_on_session_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.refresh_family IS NOT NULL THEN
  UPDATE church.refresh_tokens SET revoked=true,revoked_reason='security_change'
  WHERE family_id=OLD.refresh_family AND NOT revoked;
 END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER sessions_delete_refresh AFTER DELETE ON church.sessions
FOR EACH ROW EXECUTE FUNCTION church.revoke_refresh_on_session_delete();
INSERT INTO church.schema_migrations(version) VALUES(10);
COMMIT;
