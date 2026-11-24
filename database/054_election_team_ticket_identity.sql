BEGIN;
LOCK TABLE church.election_contests,church.election_rounds,church.election_scrutineers,church.election_tickets IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT election_id FROM church.election_rounds GROUP BY election_id HAVING count(*)>1)
 THEN RAISE EXCEPTION 'Split existing multi-round elections into separate elections before applying migration 054'; END IF;
 IF EXISTS(SELECT 1 FROM church.election_tickets t LEFT JOIN church.election_scrutineers s ON s.round_id=t.round_id AND s.user_id=t.scrutineer_id WHERE s.team_id IS NULL)
 THEN RAISE EXCEPTION 'Existing tickets require explicit saved team assignments; migration will not guess teams'; END IF;
END $$;
-- Retain the session table as an internal API compatibility layer, one per election.
CREATE UNIQUE INDEX election_single_session ON church.election_rounds(election_id);
ALTER TABLE church.election_tickets
 ADD COLUMN election_id integer REFERENCES church.election_contests(id),
 ADD COLUMN team_id uuid,
 ADD COLUMN team_ticket_no integer CHECK(team_ticket_no>0),
 ADD COLUMN legacy_ticket_code text;
CREATE TEMP TABLE election_ticket_identity_snapshot ON COMMIT DROP AS
 SELECT id,ticket_code, to_jsonb(t)-ARRAY['ticket_code','election_id','team_id','team_ticket_no','legacy_ticket_code'] data FROM church.election_tickets t;
ALTER TABLE church.election_tickets DISABLE TRIGGER election_ticket_immutable;
WITH identities AS (
 SELECT t.id,r.election_id,s.team_id,
 row_number() OVER(PARTITION BY r.election_id,s.team_id ORDER BY t.received_at,t.id)::int ticket_no
 FROM church.election_tickets t JOIN church.election_rounds r ON r.id=t.round_id
 JOIN church.election_scrutineers s ON s.round_id=t.round_id AND s.user_id=t.scrutineer_id
)
UPDATE church.election_tickets t SET legacy_ticket_code=t.ticket_code,election_id=i.election_id,team_id=i.team_id,
 team_ticket_no=i.ticket_no,ticket_code='E'||i.election_id||'-T'||i.team_id||'-'||lpad(i.ticket_no::text,greatest(4,length(i.ticket_no::text)),'0')
FROM identities i WHERE t.id=i.id;
ALTER TABLE church.election_tickets ENABLE TRIGGER election_ticket_immutable;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM election_ticket_identity_snapshot old FULL JOIN church.election_tickets t ON t.id=old.id
   WHERE old.id IS NULL OR t.id IS NULL OR t.legacy_ticket_code IS DISTINCT FROM old.ticket_code
   OR (to_jsonb(t)-ARRAY['ticket_code','election_id','team_id','team_ticket_no','legacy_ticket_code']) IS DISTINCT FROM old.data)
 THEN RAISE EXCEPTION 'Ticket contents changed during identifier migration'; END IF;
END $$;
ALTER TABLE church.election_tickets ALTER COLUMN election_id SET NOT NULL,
 ALTER COLUMN team_id SET NOT NULL,ALTER COLUMN team_ticket_no SET NOT NULL,
 ADD CONSTRAINT election_ticket_team_number UNIQUE(election_id,team_id,team_ticket_no);
-- Operator codes are internal UUIDs; S01-style identifiers are retired.
UPDATE church.election_scrutineers SET code=user_id::text WHERE round_id IS NOT NULL;
CREATE FUNCTION church.validate_election_ticket_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM church.election_rounds r JOIN church.election_scrutineers s ON s.round_id=r.id AND s.user_id=NEW.scrutineer_id
   WHERE r.id=NEW.round_id AND r.election_id=NEW.election_id AND s.team_id=NEW.team_id)
 THEN RAISE EXCEPTION 'Ticket election/team does not match its saved assignment'; END IF;
 IF NEW.ticket_code IS DISTINCT FROM 'E'||NEW.election_id||'-T'||NEW.team_id||'-'||lpad(NEW.team_ticket_no::text,greatest(4,length(NEW.team_ticket_no::text)),'0')
 THEN RAISE EXCEPTION 'Invalid election/team ticket identifier'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER election_ticket_identity_valid BEFORE INSERT ON church.election_tickets FOR EACH ROW EXECUTE FUNCTION church.validate_election_ticket_identity();
INSERT INTO church.schema_migrations(version) VALUES(54);
COMMIT;
