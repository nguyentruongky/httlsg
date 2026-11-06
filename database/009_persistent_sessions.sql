BEGIN;
CREATE TABLE church.refresh_tokens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES church.users(id) ON DELETE CASCADE,
 family_id uuid NOT NULL,
 token_hash text NOT NULL UNIQUE CHECK(length(token_hash)=64),
 user_agent text NOT NULL DEFAULT '' CHECK(length(user_agent)<=512),
 expires_at timestamptz,
 revoked boolean NOT NULL DEFAULT false,
 revoked_reason text CHECK(revoked_reason IN ('rotated','logout','all_devices','security_change','replay')),
 auth_version integer NOT NULL,
 purpose text NOT NULL CHECK(purpose IN ('access','password_setup')),
 created_at timestamptz NOT NULL DEFAULT now(),
 last_used_at timestamptz,
 CHECK(purpose<>'password_setup' OR expires_at IS NOT NULL)
);
CREATE INDEX refresh_tokens_user ON church.refresh_tokens(user_id);
CREATE INDEX refresh_tokens_family ON church.refresh_tokens(family_id);
CREATE UNIQUE INDEX refresh_tokens_one_active ON church.refresh_tokens(family_id) WHERE NOT revoked;
ALTER TABLE church.sessions ADD COLUMN refresh_family uuid;
CREATE INDEX sessions_refresh_family ON church.sessions(refresh_family) WHERE refresh_family IS NOT NULL;
CREATE TABLE church.security_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES church.users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind='refresh_replay'),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX security_events_user ON church.security_events(user_id,created_at DESC);
-- All existing role/password/suspension/merge paths already revoke session rows.
-- Propagate those changes to the entire browser session family.
CREATE FUNCTION church.revoke_refresh_family() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL AND NEW.refresh_family IS NOT NULL THEN
  UPDATE church.refresh_tokens SET revoked=true,revoked_reason=COALESCE(revoked_reason,'security_change') WHERE family_id=NEW.refresh_family AND NOT revoked;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER sessions_revoke_refresh AFTER UPDATE OF revoked_at ON church.sessions FOR EACH ROW EXECUTE FUNCTION church.revoke_refresh_family();
CREATE FUNCTION church.revoke_refresh_on_security_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.auth_version<>OLD.auth_version OR NOT NEW.enabled OR NEW.deleted_at IS NOT NULL THEN
  UPDATE church.refresh_tokens SET revoked=true,revoked_reason='security_change' WHERE user_id=NEW.id AND NOT revoked;
  UPDATE church.sessions SET revoked_at=now() WHERE user_id=NEW.id AND revoked_at IS NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER account_revoke_refresh AFTER UPDATE OF auth_version,enabled,deleted_at ON church.users FOR EACH ROW EXECUTE FUNCTION church.revoke_refresh_on_security_change();
GRANT SELECT,INSERT,UPDATE,DELETE ON church.refresh_tokens,church.security_events TO church_runtime;
-- Old cookie access tokens are retired. A new login establishes the refresh flow.
UPDATE church.sessions SET revoked_at=now() WHERE revoked_at IS NULL;
INSERT INTO church.schema_migrations(version) VALUES(9);
COMMIT;
