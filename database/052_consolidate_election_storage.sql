BEGIN;

-- Preserve stable team identity and empty teams without retaining a team table.
ALTER TABLE church.election_contests ADD COLUMN scrutineer_teams jsonb NOT NULL DEFAULT '[]'
  CHECK(jsonb_typeof(scrutineer_teams)='array');
LOCK TABLE church.election_scrutineer_teams,church.election_scrutineer_members,
  church.election_round_scrutineers,church.election_tickets,
  church.election_ticket_selections IN ACCESS EXCLUSIVE MODE;
UPDATE church.election_contests e SET scrutineer_teams=COALESCE((
  SELECT jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'sort_order',t.sort_order,'created_at',t.created_at) ORDER BY t.sort_order,t.id)
  FROM church.election_scrutineer_teams t WHERE t.election_id=e.id),'[]');

CREATE TABLE church.election_scrutineers (
  id serial PRIMARY KEY,
  election_id integer NOT NULL REFERENCES church.election_contests(id) ON DELETE CASCADE,
  round_id integer REFERENCES church.election_rounds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES church.member_profiles(id),
  code text,
  team_id uuid,
  team_name text,
  team_sort_order integer NOT NULL DEFAULT 0 CHECK(team_sort_order>=0),
  position integer CHECK(position>=0),
  pending_count integer NOT NULL DEFAULT 0 CHECK(pending_count>=0),
  heartbeat_at timestamptz,
  added_by uuid REFERENCES church.users(id),
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(election_id,round_id,user_id),
  CHECK((team_id IS NULL)=(team_name IS NULL)),
  CHECK((team_id IS NULL)=(position IS NULL)),
  CHECK(round_id IS NULL OR code IS NOT NULL)
);
CREATE UNIQUE INDEX election_scrutineer_roster_user ON church.election_scrutineers(election_id,user_id) WHERE round_id IS NULL;
CREATE UNIQUE INDEX election_scrutineer_round_user ON church.election_scrutineers(round_id,user_id) WHERE round_id IS NOT NULL;
CREATE UNIQUE INDEX election_scrutineer_round_code ON church.election_scrutineers(round_id,code) WHERE round_id IS NOT NULL;
CREATE UNIQUE INDEX election_scrutineer_roster_position ON church.election_scrutineers(election_id,team_id,position) WHERE round_id IS NULL;
CREATE INDEX election_scrutineers_user_round ON church.election_scrutineers(user_id,round_id);

INSERT INTO church.election_scrutineers(election_id,user_id,team_id,team_name,team_sort_order,position,added_by,added_at)
SELECT m.election_id,m.member_id,m.team_id,t.name,COALESCE(t.sort_order,0),m.position,m.added_by,m.added_at
FROM church.election_scrutineer_members m LEFT JOIN church.election_scrutineer_teams t ON t.id=m.team_id;
INSERT INTO church.election_scrutineers(election_id,round_id,user_id,code,team_id,team_name,team_sort_order,position,pending_count,heartbeat_at,added_by,added_at)
SELECT r.election_id,s.round_id,s.user_id,s.code,m.team_id,t.name,COALESCE(t.sort_order,0),m.position,s.pending_count,s.heartbeat_at,m.added_by,COALESCE(m.added_at,now())
FROM church.election_round_scrutineers s JOIN church.election_rounds r ON r.id=s.round_id
LEFT JOIN church.election_scrutineer_members m ON m.election_id=r.election_id AND m.member_id=s.user_id
LEFT JOIN church.election_scrutineer_teams t ON t.id=m.team_id;

-- Array backfill is the one allowed rewrite of immutable ballot storage.
ALTER TABLE church.election_tickets ADD COLUMN candidate_ids integer[] NOT NULL DEFAULT '{}';
ALTER TABLE church.election_tickets DISABLE TRIGGER election_ticket_immutable;
UPDATE church.election_tickets t SET candidate_ids=COALESCE((
  SELECT array_agg(candidate_id ORDER BY candidate_id) FROM church.election_ticket_selections s WHERE s.ticket_id=t.id),'{}');
ALTER TABLE church.election_tickets ENABLE TRIGGER election_ticket_immutable;
CREATE INDEX idx_election_tickets_round_status ON church.election_tickets(round_id,status);

-- Fail atomically if the transformation loses or changes any source relationship.
DO $$ BEGIN
 IF EXISTS(SELECT election_id,member_id,team_id,position,added_by,added_at FROM church.election_scrutineer_members
   EXCEPT SELECT election_id,user_id,team_id,position,added_by,added_at FROM church.election_scrutineers WHERE round_id IS NULL)
 OR (SELECT count(*) FROM church.election_scrutineer_members)<>(SELECT count(*) FROM church.election_scrutineers WHERE round_id IS NULL)
 THEN RAISE EXCEPTION 'Roster migration mismatch'; END IF;
 IF EXISTS(SELECT round_id,user_id,code,pending_count,heartbeat_at FROM church.election_round_scrutineers
   EXCEPT SELECT round_id,user_id,code,pending_count,heartbeat_at FROM church.election_scrutineers WHERE round_id IS NOT NULL)
 OR (SELECT count(*) FROM church.election_round_scrutineers)<>(SELECT count(*) FROM church.election_scrutineers WHERE round_id IS NOT NULL)
 THEN RAISE EXCEPTION 'Round assignment migration mismatch'; END IF;
 IF EXISTS(SELECT ticket_id,candidate_id FROM church.election_ticket_selections
   EXCEPT SELECT id,unnest(candidate_ids) FROM church.election_tickets)
 OR EXISTS(SELECT id,unnest(candidate_ids) FROM church.election_tickets
   EXCEPT SELECT ticket_id,candidate_id FROM church.election_ticket_selections)
 THEN RAISE EXCEPTION 'Ballot selection migration mismatch'; END IF;
 IF EXISTS(SELECT t.id FROM church.election_scrutineer_teams t JOIN church.election_contests e ON e.id=t.election_id
   WHERE NOT e.scrutineer_teams @> jsonb_build_array(jsonb_build_object('id',t.id,'name',t.name,'sort_order',t.sort_order,'created_at',t.created_at)))
 THEN RAISE EXCEPTION 'Team definition migration mismatch'; END IF;
END $$;

-- Preserve candidate referential integrity despite using an array instead of a join table.
CREATE FUNCTION church.validate_election_ticket_candidates() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM unnest(NEW.candidate_ids) c(id) WHERE c.id IS NULL OR NOT EXISTS(
   SELECT 1 FROM church.election_round_candidates rc WHERE rc.round_id=NEW.round_id AND rc.candidate_id=c.id))
 OR cardinality(NEW.candidate_ids)<>(SELECT count(DISTINCT id) FROM unnest(NEW.candidate_ids) c(id))
 THEN RAISE EXCEPTION 'Invalid or duplicate ballot candidate'; END IF;
 NEW.candidate_ids=ARRAY(SELECT id FROM unnest(NEW.candidate_ids) c(id) ORDER BY id);
 RETURN NEW;
END $$;
CREATE TRIGGER election_ticket_candidates_valid BEFORE INSERT ON church.election_tickets
 FOR EACH ROW EXECUTE FUNCTION church.validate_election_ticket_candidates();
CREATE FUNCTION church.validate_election_scrutineer() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.round_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM church.election_rounds r JOIN church.users u ON u.id=NEW.user_id WHERE r.id=NEW.round_id AND r.election_id=NEW.election_id)
 THEN RAISE EXCEPTION 'Round assignment requires matching election and account'; END IF;
 IF NEW.team_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM church.election_contests e,
   jsonb_array_elements(e.scrutineer_teams) t WHERE e.id=NEW.election_id AND t->>'id'=NEW.team_id::text AND t->>'name'=NEW.team_name AND (t->>'sort_order')::int=NEW.team_sort_order)
 THEN RAISE EXCEPTION 'Team assignment does not match saved team'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER election_scrutineer_valid BEFORE INSERT OR UPDATE ON church.election_scrutineers
 FOR EACH ROW EXECUTE FUNCTION church.validate_election_scrutineer();
GRANT SELECT,INSERT,UPDATE,DELETE ON church.election_scrutineers TO church_runtime;
GRANT USAGE,SELECT ON SEQUENCE church.election_scrutineers_id_seq TO church_runtime;

DROP TABLE church.election_round_scrutineers RESTRICT;
DROP TABLE church.election_scrutineer_members RESTRICT;
DROP TABLE church.election_scrutineer_teams RESTRICT;
DROP TABLE church.election_ticket_selections RESTRICT;
ALTER TABLE church.election_rounds DROP COLUMN paper_count,DROP COLUMN paper_valid_count,
  DROP COLUMN paper_invalid_count,DROP COLUMN paper_blank_count;
INSERT INTO church.schema_migrations(version) VALUES(52);
COMMIT;
