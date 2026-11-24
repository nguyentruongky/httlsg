BEGIN;
CREATE OR REPLACE FUNCTION church.validate_public_election_vote() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE election integer; live_session integer;
BEGIN
 SELECT s.election_id,r.id INTO election,live_session
 FROM church.election_public_admissions a JOIN church.election_public_sessions s ON s.id=a.session_id
 JOIN church.election_contests e ON e.id=s.election_id JOIN church.election_rounds r ON r.election_id=e.id
 WHERE a.id=NEW.admission_id AND s.enabled AND e.online_voting_enabled AND e.status<>'archived' AND r.status='open'
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
ALTER TABLE church.election_public_sessions DROP COLUMN expires_at;
INSERT INTO church.schema_migrations(version) VALUES(60);
COMMIT;
