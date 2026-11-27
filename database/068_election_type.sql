BEGIN;
ALTER TABLE church.election_contests
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'church'
    CHECK (type IN ('church', 'department'));
COMMIT;