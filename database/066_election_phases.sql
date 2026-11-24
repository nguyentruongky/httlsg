BEGIN;
ALTER TABLE church.election_rounds ADD COLUMN phase text;
UPDATE church.election_rounds r SET phase=CASE
  WHEN r.status='draft' THEN 'draft'
  WHEN r.status='closed' THEN 'closed'
  WHEN EXISTS(SELECT 1 FROM church.election_contests e WHERE e.id=r.election_id AND e.online_voting_enabled)
    THEN 'online' ELSE 'checking' END;
ALTER TABLE church.election_rounds ALTER COLUMN phase SET DEFAULT 'draft';
ALTER TABLE church.election_rounds ALTER COLUMN phase SET NOT NULL;
ALTER TABLE church.election_rounds ADD CONSTRAINT election_round_phase_state CHECK (
  (status='draft' AND phase='draft') OR
  (status='open' AND phase IN ('online','checking')) OR
  (status='closed' AND phase='closed')
);
CREATE OR REPLACE FUNCTION church.validate_public_election_vote() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE election integer; live_session integer;
BEGIN
 SELECT s.election_id,r.id INTO election,live_session
 FROM church.election_public_admissions a JOIN church.election_public_sessions s ON s.id=a.session_id
 JOIN church.election_contests e ON e.id=s.election_id JOIN church.election_rounds r ON r.election_id=e.id
 WHERE a.id=NEW.admission_id AND s.enabled AND e.online_voting_enabled AND e.status<>'archived' AND r.status='open' AND r.phase='online'
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
CREATE FUNCTION church.validate_election_paper_phase() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM church.election_rounds r JOIN church.election_contests e ON e.id=r.election_id
    WHERE r.id=NEW.round_id AND r.status='open' AND r.phase='checking' AND e.status<>'archived'
    FOR SHARE OF r,e;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paper ballots require manual checking phase'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER election_paper_phase_valid BEFORE INSERT ON church.election_tickets
  FOR EACH ROW EXECUTE FUNCTION church.validate_election_paper_phase();

INSERT INTO church.schema_migrations(version) VALUES(66) ON CONFLICT DO NOTHING;
COMMIT;
