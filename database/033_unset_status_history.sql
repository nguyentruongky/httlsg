BEGIN;
ALTER TABLE church.member_church_status_history ALTER COLUMN new_status DROP NOT NULL;
INSERT INTO church.schema_migrations(version) VALUES(33);
COMMIT;
