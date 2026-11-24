-- Legacy church.elections/election_candidates belong to the older voting system.
-- Use separate contest/nominee tables and preserve all legacy records.
BEGIN;
ALTER TABLE church.roles DROP CONSTRAINT roles_id_check;
ALTER TABLE church.roles ADD CONSTRAINT roles_id_check CHECK(id IN ('admin','secretary','deacon','board','user','leader','election_admin','election_scrutineer'));
INSERT INTO church.roles VALUES ('election_admin','Quản trị bầu cử'),('election_scrutineer','Kiểm phiếu viên');
CREATE TABLE church.election_contests (
 id serial PRIMARY KEY, code text GENERATED ALWAYS AS ('EL-'||lpad(id::text,greatest(4,length(id::text)),'0')) STORED UNIQUE,
 name text NOT NULL, description text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','archived')),
 created_by uuid NOT NULL REFERENCES church.users(id), created_at timestamptz NOT NULL DEFAULT now(), next_candidate_no integer NOT NULL DEFAULT 1
);
CREATE TABLE church.election_nominees (
 id serial PRIMARY KEY, election_id integer NOT NULL REFERENCES church.election_contests(id), member_id uuid REFERENCES church.member_profiles(id), candidate_no integer NOT NULL CHECK(candidate_no>0),
 full_name text NOT NULL, name_search text NOT NULL, extra jsonb NOT NULL DEFAULT '{}', included boolean NOT NULL DEFAULT true, retired boolean NOT NULL DEFAULT false,
 UNIQUE(election_id,candidate_no), UNIQUE(election_id,id)
);
CREATE TABLE church.election_rounds (
 id serial PRIMARY KEY, election_id integer NOT NULL REFERENCES church.election_contests(id), round_no integer NOT NULL, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','open','closed')),
 opened_at timestamptz, closed_at timestamptz, paper_count integer CHECK(paper_count>=0), UNIQUE(election_id,round_no)
);
CREATE UNIQUE INDEX election_one_open ON church.election_rounds(election_id) WHERE status='open';
CREATE TABLE church.election_round_candidates (
 round_id integer NOT NULL REFERENCES church.election_rounds(id), candidate_id integer NOT NULL REFERENCES church.election_nominees(id),
 source text NOT NULL CHECK(source IN ('initial','carry_over','manual')), carried_from_round integer REFERENCES church.election_rounds(id), carry_rule jsonb,
 PRIMARY KEY(round_id,candidate_id)
);
CREATE TABLE church.election_round_scrutineers (
 round_id integer NOT NULL REFERENCES church.election_rounds(id), user_id uuid NOT NULL REFERENCES church.users(id), code text NOT NULL,
 pending_count integer NOT NULL DEFAULT 0 CHECK(pending_count>=0), heartbeat_at timestamptz, PRIMARY KEY(round_id,user_id), UNIQUE(round_id,code)
);
CREATE TABLE church.election_tickets (
 id bigserial PRIMARY KEY, ticket_code text NOT NULL UNIQUE, client_uuid uuid NOT NULL UNIQUE, round_id integer NOT NULL REFERENCES church.election_rounds(id),
 scrutineer_id uuid NOT NULL REFERENCES church.users(id), seq_no integer NOT NULL CHECK(seq_no>0), status text NOT NULL CHECK(status IN ('valid','invalid','void')),
 invalid_reason text CHECK(invalid_reason IN ('over_limit','blank')), void_reason text, voided_by uuid REFERENCES church.users(id), void_requested_reason text,
 created_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), UNIQUE(round_id,scrutineer_id,seq_no),
 CHECK((status='valid' AND invalid_reason IS NULL) OR (status='invalid' AND invalid_reason IS NOT NULL) OR (status='void' AND voided_by IS NOT NULL AND void_reason IS NOT NULL AND length(btrim(void_reason))>0))
);
CREATE INDEX election_ticket_round ON church.election_tickets(round_id,scrutineer_id,received_at);
CREATE INDEX election_ticket_operator_time ON church.election_tickets(scrutineer_id,received_at);
CREATE TABLE church.election_ticket_selections (
 ticket_id bigint NOT NULL REFERENCES church.election_tickets(id), candidate_id integer NOT NULL REFERENCES church.election_nominees(id), PRIMARY KEY(ticket_id,candidate_id)
);
CREATE TABLE church.election_action_log (
 id bigserial PRIMARY KEY, election_id integer NOT NULL REFERENCES church.election_contests(id), round_id integer REFERENCES church.election_rounds(id), user_id uuid NOT NULL REFERENCES church.users(id),
 action text NOT NULL, payload jsonb NOT NULL DEFAULT '{}', ip text, user_agent text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX election_log ON church.election_action_log(election_id,id);
-- Ballots are immutable except for the explicit, reasoned void operation.
CREATE FUNCTION church.protect_election_ticket() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Tickets are append-only'; END IF;
 IF OLD.status='void' AND NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Void tickets are immutable'; END IF;
 IF (to_jsonb(NEW)-ARRAY['status','void_reason','voided_by','void_requested_reason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','void_reason','voided_by','void_requested_reason']) OR
 (NEW.status IS DISTINCT FROM OLD.status AND NOT (OLD.status<>'void' AND NEW.status='void' AND NEW.voided_by IS NOT NULL AND NEW.void_reason IS NOT NULL AND length(btrim(NEW.void_reason))>0)) THEN RAISE EXCEPTION 'Tickets are append-only'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER election_ticket_immutable BEFORE UPDATE OR DELETE ON church.election_tickets FOR EACH ROW EXECUTE FUNCTION church.protect_election_ticket();
GRANT SELECT,INSERT,UPDATE ON church.election_contests,church.election_nominees,church.election_rounds,church.election_round_candidates,church.election_round_scrutineers,church.election_tickets TO church_runtime;
GRANT DELETE ON church.election_round_candidates,church.election_round_scrutineers TO church_runtime;
GRANT SELECT,INSERT ON church.election_ticket_selections,church.election_action_log TO church_runtime;
GRANT USAGE,SELECT ON SEQUENCE church.election_contests_id_seq,church.election_nominees_id_seq,church.election_rounds_id_seq,church.election_tickets_id_seq,church.election_action_log_id_seq TO church_runtime;
-- Freeze ballot definitions at the database boundary as well as in the API.
CREATE FUNCTION church.protect_election_round_candidates() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r church.election_rounds%ROWTYPE; candidate_election integer;
BEGIN
 SELECT * INTO r FROM church.election_rounds WHERE id=COALESCE(NEW.round_id,OLD.round_id) FOR UPDATE;
 IF r.opened_at IS NOT NULL THEN RAISE EXCEPTION 'Ballot is frozen'; END IF;
 IF TG_OP<>'DELETE' THEN
  SELECT election_id INTO candidate_election FROM church.election_nominees WHERE id=NEW.candidate_id;
  IF candidate_election IS DISTINCT FROM r.election_id THEN RAISE EXCEPTION 'Candidate belongs to another election'; END IF;
  RETURN NEW;
 END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER election_round_candidates_frozen BEFORE INSERT OR UPDATE OR DELETE ON church.election_round_candidates FOR EACH ROW EXECUTE FUNCTION church.protect_election_round_candidates();
CREATE FUNCTION church.protect_election_candidates() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM id FROM church.election_contests WHERE id=COALESCE(NEW.election_id,OLD.election_id) FOR UPDATE;
 IF EXISTS(SELECT 1 FROM church.election_rounds WHERE election_id=COALESCE(NEW.election_id,OLD.election_id) AND opened_at IS NOT NULL) THEN RAISE EXCEPTION 'Candidates are frozen'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF TG_OP='UPDATE' AND (NEW.election_id<>OLD.election_id OR NEW.candidate_no<>OLD.candidate_no) THEN RAISE EXCEPTION 'Candidate numbers are permanent'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER election_candidates_frozen BEFORE INSERT OR UPDATE OR DELETE ON church.election_nominees FOR EACH ROW EXECUTE FUNCTION church.protect_election_candidates();

INSERT INTO church.schema_migrations(version) VALUES(47);
COMMIT;
