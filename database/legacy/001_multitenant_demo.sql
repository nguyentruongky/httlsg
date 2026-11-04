-- PostgreSQL 16+. Run once as a privileged migration owner, NOT app_runtime.
-- Use a separate trusted backend login granted app_runtime. Never expose it to a client.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE app_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA app;
CREATE SCHEMA private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
CREATE TYPE app.member_role AS ENUM ('admin','manager','member');
CREATE TYPE app.member_status AS ENUM ('active','invited','suspended');
CREATE TABLE app.organizations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK(length(name) BETWEEN 2 AND 100),
 slug text NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug)<=63),
 timezone text NOT NULL DEFAULT 'UTC', tier text NOT NULL DEFAULT 'free' CHECK(tier IN ('free','team','enterprise')),
 primary_color text NOT NULL DEFAULT '#316b59' CHECK(primary_color ~ '^#[0-9a-fA-F]{6}$'),
 logo_url text, allowed_domains text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app.users (
 id uuid PRIMARY KEY, -- stable ID mapped from verified identity-provider subject on the server
 name text NOT NULL CHECK(length(name) BETWEEN 2 AND 100), email text NOT NULL,
 avatar_url text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON app.users(lower(email));
CREATE TABLE app.memberships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES app.organizations(id),
 user_id uuid NOT NULL REFERENCES app.users(id), role app.member_role NOT NULL DEFAULT 'member',
 status app.member_status NOT NULL DEFAULT 'invited', joined_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,user_id)
);
CREATE INDEX memberships_actor ON app.memberships(user_id,organization_id) WHERE status='active';
CREATE TABLE app.tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES app.organizations(id),
 assignee_id uuid NOT NULL, title text NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=2000), kind text NOT NULL CHECK(kind IN ('task','check_in')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed')),
 due_at timestamptz NOT NULL, completed_at timestamptz, version integer NOT NULL DEFAULT 0 CHECK(version>=0),
 FOREIGN KEY(organization_id,assignee_id) REFERENCES app.memberships(organization_id,user_id),
 CHECK((status='completed')=(completed_at IS NOT NULL))
);
CREATE INDEX tasks_schedule ON app.tasks(organization_id,assignee_id,due_at);
CREATE TABLE app.activity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES app.organizations(id),
 actor_id uuid NOT NULL REFERENCES app.users(id), action text NOT NULL, subject_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_recent ON app.activity(organization_id,created_at DESC,id);
-- Missing actor context yields NULL: every tenant policy fails closed.
CREATE FUNCTION private.actor() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('app.user_id',true),'')::uuid
$$;
-- Owner is a migration-only role. Its membership read avoids recursive RLS policies.
CREATE FUNCTION private.role_in(org uuid) RETURNS app.member_role
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT role FROM app.memberships WHERE organization_id=org AND user_id=private.actor() AND status='active'
$$;
REVOKE ALL ON FUNCTION private.role_in(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA app,private TO app_runtime;
GRANT EXECUTE ON FUNCTION private.actor(),private.role_in(uuid) TO app_runtime;
ALTER TABLE app.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY organizations_read ON app.organizations FOR SELECT TO app_runtime USING(private.role_in(id) IS NOT NULL);
CREATE POLICY memberships_read ON app.memberships FOR SELECT TO app_runtime USING(private.role_in(organization_id) IS NOT NULL);
CREATE POLICY users_read ON app.users FOR SELECT TO app_runtime USING(id=private.actor() OR EXISTS(SELECT 1 FROM app.memberships m WHERE m.user_id=users.id AND private.role_in(m.organization_id) IS NOT NULL));
CREATE POLICY tasks_read ON app.tasks FOR SELECT TO app_runtime USING(private.role_in(organization_id) IN ('admin','manager') OR (private.role_in(organization_id)='member' AND assignee_id=private.actor()));
CREATE POLICY activity_read ON app.activity FOR SELECT TO app_runtime USING(private.role_in(organization_id) IN ('admin','manager') OR (private.role_in(organization_id)='member' AND actor_id=private.actor()));
GRANT SELECT ON ALL TABLES IN SCHEMA app TO app_runtime;
-- Mutations only via narrow procedures, with authorization checks inside.
CREATE FUNCTION app.complete_task(org uuid,task_id uuid,expected_version integer) RETURNS app.tasks
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result app.tasks;
BEGIN
 IF private.role_in(org) IS NULL THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 UPDATE app.tasks SET status='completed',completed_at=now(),version=version+1
 WHERE id=task_id AND organization_id=org AND assignee_id=private.actor() AND version=expected_version AND status='pending'
 RETURNING * INTO result;
 IF NOT FOUND THEN RAISE EXCEPTION 'Task missing or version conflict' USING ERRCODE='40001'; END IF;
 INSERT INTO app.activity(organization_id,actor_id,action,subject_id) VALUES(org,private.actor(),'Task completed',task_id);
 RETURN result;
END $$;
CREATE FUNCTION app.set_member_access(org uuid,member_ids uuid[],new_role app.member_role DEFAULT NULL,new_status app.member_status DEFAULT NULL) RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor_role app.member_role; matched integer;
BEGIN
 -- Serializes access changes, including concurrent removal of the last administrator.
 PERFORM 1 FROM app.organizations WHERE id=org FOR UPDATE;
 actor_role:=private.role_in(org);
 IF actor_role IS DISTINCT FROM 'admin'::app.member_role THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 IF cardinality(member_ids) IS NULL OR cardinality(member_ids)=0 OR cardinality(member_ids)>100 THEN RAISE EXCEPTION 'Select 1 to 100 members'; END IF;
 SELECT count(*) INTO matched FROM app.memberships WHERE organization_id=org AND id=ANY(member_ids);
 IF matched<>(SELECT count(DISTINCT x) FROM unnest(member_ids) x) THEN RAISE EXCEPTION 'Member missing'; END IF;
 IF EXISTS(SELECT 1 FROM app.memberships WHERE organization_id=org AND id=ANY(member_ids) AND user_id=private.actor()) THEN RAISE EXCEPTION 'Cannot change own access'; END IF;
 UPDATE app.memberships SET role=coalesce(new_role,role),status=coalesce(new_status,status) WHERE organization_id=org AND id=ANY(member_ids);
 IF NOT EXISTS(SELECT 1 FROM app.memberships WHERE organization_id=org AND role='admin' AND status='active') THEN RAISE EXCEPTION 'Active admin required'; END IF;
 INSERT INTO app.activity(organization_id,actor_id,action,subject_id) SELECT org,private.actor(),'Member access updated',user_id FROM app.memberships WHERE organization_id=org AND id=ANY(member_ids);
END $$;
REVOKE ALL ON FUNCTION app.complete_task(uuid,uuid,integer),app.set_member_access(uuid,uuid[],app.member_role,app.member_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.complete_task(uuid,uuid,integer),app.set_member_access(uuid,uuid[],app.member_role,app.member_status) TO app_runtime;
COMMIT;
