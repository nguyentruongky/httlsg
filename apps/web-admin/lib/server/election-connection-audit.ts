import type { DB } from "./db";
// Count a browser/device once per election, using its latest check. Keep the
// underlying attempts intact for diagnostics; a retry can recover its status.
const checks = `SELECT DISTINCT ON(a.browser_hash) c.*,
  count(*) OVER(PARTITION BY a.browser_hash)::int attempt_count,
  CASE WHEN c.status='pending' AND c.started_at<now()-interval '60 seconds' THEN 'invalid' ELSE c.status END effective_status
  FROM church.election_connection_checks c
  JOIN church.election_public_admissions a ON a.id=c.admission_id
  WHERE c.election_id=$1
  ORDER BY a.browser_hash,c.started_at DESC,c.id DESC`;
export async function electionConnectionAudit(db: DB, electionId: number) {
  const summary = (
    await db.query(
      `WITH checks AS (${checks}) SELECT count(*)::int total,
    count(*) FILTER(WHERE effective_status='success')::int valid,
    count(*) FILTER(WHERE effective_status='invalid')::int invalid,
    count(*) FILTER(WHERE effective_status='invalid' AND started_at>now()-interval '15 minutes')::int invalid_recent,
    count(*) FILTER(WHERE effective_status='pending')::int pending FROM checks`,
      [electionId],
    )
  ).rows[0];
  const items = (
    await db.query(
      `SELECT c.id,c.started_at,c.finished_at,c.device_number,
    CASE WHEN c.status='pending' AND c.started_at<now()-interval '60 seconds' THEN 'invalid' ELSE c.status END status,
    CASE WHEN c.status='pending' AND c.started_at<now()-interval '60 seconds' THEN 'timeout' ELSE c.reason END reason,
    cardinality(ack_request_ids) server_acks,client_ack_count,latency_ms,cookie_accepted,location_supported,location_permission,client_reason,attempt_count
    FROM (SELECT c.*, count(*) OVER(PARTITION BY a.browser_hash)::int attempt_count,
      dense_rank() OVER(ORDER BY a.browser_hash)::int device_number
      FROM church.election_connection_checks c
      JOIN church.election_public_admissions a ON a.id=c.admission_id WHERE c.election_id=$1) c
    ORDER BY c.started_at DESC,c.id DESC LIMIT 1000`,
      [electionId],
    )
  ).rows;
  return { summary, items };
}
