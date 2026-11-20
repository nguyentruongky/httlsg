BEGIN;
GRANT SELECT,INSERT,UPDATE ON church.calendar_contributions TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(42);
COMMIT;
