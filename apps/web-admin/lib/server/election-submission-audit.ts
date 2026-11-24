import type { DB } from "./db";

// Persisted ballots are the submission log: one entry per accepted ticket,
// including offline sync and historical online votes, without logging retries.
const submissions = `
 SELECT 'paper:'||t.id::text id,'paper'::text source,t.received_at submitted_at,
   t.status,t.invalid_reason,cardinality(t.candidate_ids) selection_count,
   t.team_ticket_no ticket_number,u.full_name scrutineer_name,
   COALESCE(team.team_name,'Tổ chưa đặt tên') team_name
 FROM church.election_tickets t
 LEFT JOIN church.users u ON u.id=t.scrutineer_id
 LEFT JOIN LATERAL (
   SELECT s.team_name FROM church.election_scrutineers s
   WHERE s.election_id=t.election_id AND s.team_id=t.team_id
   ORDER BY (s.round_id=t.round_id) DESC NULLS LAST,s.id LIMIT 1
 ) team ON true
 WHERE t.election_id=$1
 UNION ALL
 SELECT 'online:'||v.id::text,'online',v.submitted_at,
   CASE WHEN x.vote_id IS NOT NULL THEN 'void' WHEN cardinality(v.candidate_ids)=0 THEN 'invalid' ELSE 'valid' END,
   CASE WHEN cardinality(v.candidate_ids)=0 THEN 'blank' ELSE NULL END,
   cardinality(v.candidate_ids),
   row_number() OVER(ORDER BY v.submitted_at,v.id)::int,NULL::text,NULL::text
 FROM church.election_public_votes v
 LEFT JOIN church.election_public_vote_voids x ON x.vote_id=v.id
 JOIN church.election_public_admissions a ON a.id=v.admission_id
 JOIN church.election_public_sessions s ON s.id=a.session_id
 WHERE s.election_id=$1`;

export async function electionSubmissionAudit(db: DB, electionId: number) {
  const summary = (
    await db.query(
      `WITH counts AS (
        SELECT (SELECT count(*)::int FROM church.election_tickets WHERE election_id=$1) paper,
          (SELECT count(*)::int FROM church.election_public_votes v
           JOIN church.election_public_admissions a ON a.id=v.admission_id
           JOIN church.election_public_sessions s ON s.id=a.session_id
           WHERE s.election_id=$1) online
       ) SELECT paper+online total,paper,online FROM counts`,
      [electionId],
    )
  ).rows[0];
  const items = (
    await db.query(
      `WITH submissions AS (${submissions}) SELECT * FROM submissions
       ORDER BY submitted_at DESC,id DESC LIMIT 1000`,
      [electionId],
    )
  ).rows;
  return { summary, items };
}
