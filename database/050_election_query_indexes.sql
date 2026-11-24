BEGIN;

-- Reverse lookup for the scrutineer's assigned-round landing page.
CREATE INDEX election_scrutineer_user_round
  ON church.election_round_scrutineers(user_id,round_id);

-- Tally only the current round's valid ballots, then join selections by ticket_id.
CREATE INDEX election_ticket_valid_round
  ON church.election_tickets(round_id,id) WHERE status='valid';

-- Admin ticket lists are ordered across all operators in a round.
CREATE INDEX election_ticket_round_received
  ON church.election_tickets(round_id,received_at DESC,id DESC);

-- Round reports must not scan the entire election history.
CREATE INDEX election_log_round
  ON church.election_action_log(round_id,id) WHERE round_id IS NOT NULL;

-- No membership rows, team IDs, positions, or ballot records are rewritten.
INSERT INTO church.schema_migrations(version) VALUES(50) ON CONFLICT DO NOTHING;
COMMIT;
