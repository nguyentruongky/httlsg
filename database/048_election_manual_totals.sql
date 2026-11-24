BEGIN;
ALTER TABLE church.election_rounds
 ADD COLUMN paper_valid_count integer CHECK (paper_valid_count >= 0),
 ADD COLUMN paper_invalid_count integer CHECK (paper_invalid_count >= 0),
 ADD COLUMN paper_blank_count integer CHECK (paper_blank_count >= 0);
INSERT INTO church.schema_migrations(version) VALUES (48);
COMMIT;
