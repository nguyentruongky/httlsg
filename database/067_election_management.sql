BEGIN;
ALTER TABLE church.election_contests
  ADD COLUMN version integer NOT NULL DEFAULT 0 CHECK(version>=0),
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN deleted_by uuid REFERENCES church.users(id);
CREATE INDEX election_contests_visible ON church.election_contests(id DESC) WHERE deleted_at IS NULL;
CREATE OR REPLACE FUNCTION church.validate_public_election_vote() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE election integer; live_session integer;
BEGIN
 SELECT s.election_id,r.id INTO election,live_session
 FROM church.election_public_admissions a JOIN church.election_public_sessions s ON s.id=a.session_id
 JOIN church.election_contests e ON e.id=s.election_id JOIN church.election_rounds r ON r.election_id=e.id
 WHERE a.id=NEW.admission_id AND s.enabled AND e.online_voting_enabled AND e.status<>'archived' AND e.deleted_at IS NULL AND r.status='open' AND r.phase='online'
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
-- Protect paper entry even if a caller bypasses the application service.
CREATE OR REPLACE FUNCTION church.validate_election_paper_phase() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM church.election_rounds r JOIN church.election_contests e ON e.id=r.election_id
    WHERE r.id=NEW.round_id AND r.status='open' AND r.phase='checking' AND e.status<>'archived' AND e.deleted_at IS NULL
    FOR SHARE OF r,e;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paper ballots require manual checking phase'; END IF;
  RETURN NEW;
END $$;
INSERT INTO church.schema_migrations(version) VALUES(67) ON CONFLICT DO NOTHING;
COMMIT;
