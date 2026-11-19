BEGIN;
CREATE INDEX events_public_worship ON church.events(event_date, created_at, id) INCLUDE (original_text, version, preset_id) WHERE deleted_at IS NULL;
INSERT INTO church.schema_migrations(version) VALUES(39);
COMMIT;
