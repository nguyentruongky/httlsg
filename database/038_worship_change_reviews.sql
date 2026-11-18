BEGIN;
ALTER TABLE church.worship_contributions
  ADD COLUMN change_reviews jsonb NOT NULL DEFAULT '[]'::jsonb;
INSERT INTO church.schema_migrations(version) VALUES(38);
COMMIT;
