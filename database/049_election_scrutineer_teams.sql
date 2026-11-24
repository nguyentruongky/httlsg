BEGIN;
CREATE TABLE church.election_scrutineer_teams (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 election_id integer NOT NULL REFERENCES church.election_contests(id),
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 100),
 sort_order integer NOT NULL CHECK(sort_order>=0),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(election_id,id), UNIQUE(election_id,name), UNIQUE(election_id,sort_order)
);
CREATE TABLE church.election_scrutineer_members (
 election_id integer NOT NULL REFERENCES church.election_contests(id),
 member_id uuid NOT NULL REFERENCES church.member_profiles(id),
 team_id uuid,
 position integer CHECK(position>=0),
 added_by uuid REFERENCES church.users(id),
 added_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(election_id,member_id),
 FOREIGN KEY(election_id,team_id) REFERENCES church.election_scrutineer_teams(election_id,id),
 CHECK((team_id IS NULL)=(position IS NULL)),
 UNIQUE(team_id,position)
);
INSERT INTO church.election_scrutineer_teams(election_id,name,sort_order)
 SELECT e.id,'Tổ '||n,n FROM church.election_contests e CROSS JOIN generate_series(1,4) n;
-- The old application never recorded team IDs. Preserve known election members
-- as explicitly unassigned; never infer a team from alphabetical order or count.
WITH latest AS (
 SELECT DISTINCT ON(election_id,payload->>'memberId')
  election_id,payload->>'memberId' member_id,action,user_id,created_at
 FROM church.election_action_log
 WHERE action IN ('scrutineer_access_granted','scrutineer_access_revoked') AND payload ? 'memberId'
 ORDER BY election_id,payload->>'memberId',id DESC
)
INSERT INTO church.election_scrutineer_members(election_id,member_id,added_by,added_at)
 SELECT l.election_id,p.id,l.user_id,l.created_at FROM latest l
 JOIN church.member_profiles p ON p.id::text=lower(l.member_id)
 WHERE l.action='scrutineer_access_granted';
GRANT SELECT,INSERT,UPDATE ON church.election_scrutineer_teams TO church_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON church.election_scrutineer_members TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(49);
COMMIT;
