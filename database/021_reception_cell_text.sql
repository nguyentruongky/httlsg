BEGIN;
ALTER TABLE church.schedule_responsibilities ADD COLUMN display_text text CHECK(display_text IS NULL OR length(display_text)<=4000);
INSERT INTO church.schema_migrations(version) VALUES(21);
COMMIT;
