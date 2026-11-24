# Local database performance review

Reviewed the local production copy on 2026-11-23 using PostgreSQL table statistics,
relation sizes, index definitions, foreign keys, and application query patterns.
Production was not modified.

At the initial review the church schema contained 67 tables. Its largest table, member_profiles, uses
approximately 2 MB including indexes. Sequential scans on tiny tables are normal;
partitioning, global memory tuning, and blanket foreign-key indexes are not
justified by this dataset.

Migration 050 adds four indexes for existing election access paths:

| Index                          | Purpose                                                         |
| ------------------------------ | --------------------------------------------------------------- |
| election_scrutineer_user_round | Find rounds assigned to a user without scanning all assignments |
| election_ticket_valid_round    | Restrict tallies to valid tickets in the requested round        |
| election_ticket_round_received | Read a round's tickets in newest-first order across operators   |
| election_log_round             | Restrict round reports to that round's audit records            |

The tally query starts from the requested round's valid tickets rather than
joining each candidate to selections from every round. Average selections per
valid ticket uses aggregate totals instead of a correlated count per ticket.
Zero-vote candidates, ties, blank ballots, and void exclusions retain their
existing meaning.

Election GET requests use shared row locks. Concurrent readers can proceed
together, while write requests keep exclusive locks to preserve consistency
across the summary, candidate totals, and operator progress queries. See
[PostgreSQL row locks](https://www.postgresql.org/docs/17/explicit-locking.html#LOCKING-ROWS).

Apply with `npm run db:migrate` against the intended DATABASE_URL. The migration
does not rewrite members, team IDs, team positions, or ballots. Index creation
takes ordinary transactional table locks; schedule migration during a quiet
period for a large deployed database. Index maintenance adds some write cost.

No benchmarks or tests were run for migration 050. These changes reduce identifiable query work;
no measured latency improvement is claimed. Accent-insensitive substring member
search still scans profiles; a normalized trigram search index is a separate
future change if query-volume evidence warrants its write and storage overhead.

## Retired tables

Migration 051 removes the old `church.elections`, `church.election_candidates`,
and `church.election_votes` tables. Inspection found all three empty, with no
application references or dependent views, and foreign keys only between those
tables or pointing to the active users table. The current election module uses
contests, nominees, and tickets instead.

The migration locks the legacy tables before checking emptiness and aborts if
any contains records. Drops use RESTRICT so unexpected dependencies stop removal.
Their schema definitions were backed up locally before removal. This simplifies
the schema; dropping empty tables does not imply a measurable query speedup.

## Consolidation (migration 052)

Three scrutineer tables are replaced by `election_scrutineers`, with separate
partial uniqueness rules for election-wide roster rows and round-specific rows.
Stable team identity and empty teams are kept in contest JSON metadata. The old
assignment reverse index is replaced by `election_scrutineers_user_round`.
Ticket selections move to `election_tickets.candidate_ids`; tallies expand arrays
only after filtering valid tickets by round. A `(round_id,status)` index supports
that filter; array GIN indexing is unnecessary for unnest-based aggregation.
Unused paper columns and reconciliation UI/API/report logic are removed.

The local pre-migration backup is private in `.local-data/`. The local application
verified unchanged fingerprints for contests (excluding new team metadata),
nominees, rounds (excluding removed paper values), round candidates, tickets
(excluding new arrays), and action logs. Migration SQL additionally verifies
memberships, teams, round sync state, and selection equivalence. Populated
migration fixtures and backend/DOM checks are described in `docs/election.md`.
