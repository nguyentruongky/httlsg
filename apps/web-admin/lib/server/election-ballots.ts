// $1 is the internal round ID. Keep both tally queries on the same normalized
// ballot sources; blank online ballots follow the existing paper classification.
export const electionBallotsSql = `
 SELECT t.status,t.invalid_reason,t.candidate_ids,'paper'::text source
 FROM church.election_tickets t WHERE t.round_id=$1
 UNION ALL
 SELECT CASE WHEN x.vote_id IS NOT NULL THEN 'void' WHEN cardinality(v.candidate_ids)=0 THEN 'invalid' ELSE 'valid' END,
   CASE WHEN cardinality(v.candidate_ids)=0 THEN 'blank' ELSE NULL END,
   v.candidate_ids,'online'::text
 FROM church.election_public_votes v
 LEFT JOIN church.election_public_vote_voids x ON x.vote_id=v.id
 JOIN church.election_public_admissions a ON a.id=v.admission_id
 JOIN church.election_public_sessions s ON s.id=a.session_id
 JOIN church.election_rounds r ON r.election_id=s.election_id
 WHERE r.id=$1
`;
