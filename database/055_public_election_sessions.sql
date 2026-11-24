BEGIN;
CREATE TABLE church.election_public_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 election_id integer NOT NULL UNIQUE REFERENCES church.election_contests(id),
 pin_hash text NOT NULL UNIQUE,
 qr_token_hash text NOT NULL UNIQUE,
 enabled boolean NOT NULL DEFAULT true,
 latitude double precision NOT NULL CHECK(latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 radius_meters integer NOT NULL CHECK(radius_meters BETWEEN 20 AND 10000),
 maximum_accuracy_meters integer NOT NULL CHECK(maximum_accuracy_meters BETWEEN 1 AND 1000 AND maximum_accuracy_meters<=radius_meters),
 expires_at timestamptz NOT NULL,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_by uuid NOT NULL REFERENCES church.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE church.election_public_admissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL REFERENCES church.election_public_sessions(id),
 browser_hash text NOT NULL,
 joined_version integer NOT NULL,
 verified_version integer NOT NULL DEFAULT 0,
 verified_at timestamptz,
 distance_meters double precision,
 accuracy_meters double precision,
 location_nonce text NOT NULL,
 nonce_expires_at timestamptz NOT NULL,
 joined_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(session_id,browser_hash)
);
CREATE TABLE church.election_public_votes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 admission_id uuid NOT NULL UNIQUE REFERENCES church.election_public_admissions(id),
 request_id uuid NOT NULL UNIQUE,
 -- Database mirror of core MAX_ELECTION_SELECTIONS; application validation imports that constant.
 candidate_ids integer[] NOT NULL CHECK(cardinality(candidate_ids)<=10),
 submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION church.validate_public_election_vote() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE election integer; live_session integer;
BEGIN
 SELECT s.election_id,r.id INTO election,live_session
 FROM church.election_public_admissions a JOIN church.election_public_sessions s ON s.id=a.session_id
 JOIN church.election_contests e ON e.id=s.election_id JOIN church.election_rounds r ON r.election_id=e.id
 WHERE a.id=NEW.admission_id AND s.enabled AND s.expires_at>now() AND e.status<>'archived' AND r.status='open'
 AND a.joined_version=s.version AND a.verified_version=s.version AND a.verified_at>now()-interval '15 minutes'
 FOR SHARE OF e,s,r;
 IF election IS NULL THEN RAISE EXCEPTION 'Public voting is unavailable or location was not verified'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(NEW.candidate_ids) c(id) WHERE c.id IS NULL OR NOT EXISTS(
   SELECT 1 FROM church.election_round_candidates rc WHERE rc.round_id=live_session AND rc.candidate_id=c.id))
 OR cardinality(NEW.candidate_ids)<>(SELECT count(DISTINCT id) FROM unnest(NEW.candidate_ids) c(id))
 THEN RAISE EXCEPTION 'Invalid public candidate selection'; END IF;
 NEW.candidate_ids=ARRAY(SELECT id FROM unnest(NEW.candidate_ids) c(id) ORDER BY id);
 RETURN NEW;
END $$;
CREATE TRIGGER public_election_vote_valid BEFORE INSERT ON church.election_public_votes FOR EACH ROW EXECUTE FUNCTION church.validate_public_election_vote();
CREATE FUNCTION church.protect_public_election_vote() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Public votes are immutable'; END $$;
CREATE TRIGGER public_election_vote_immutable BEFORE UPDATE OR DELETE ON church.election_public_votes FOR EACH ROW EXECUTE FUNCTION church.protect_public_election_vote();
GRANT SELECT,INSERT,UPDATE ON church.election_public_sessions,church.election_public_admissions TO church_runtime;
GRANT SELECT,INSERT ON church.election_public_votes TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(55);
COMMIT;
