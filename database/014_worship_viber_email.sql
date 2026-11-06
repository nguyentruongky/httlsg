BEGIN;
-- Separate intent: the original request and a phone-ready draft email must not
-- deduplicate or trigger one another. The existing unique index includes type.
ALTER TABLE church.notification_history DROP CONSTRAINT notification_history_type_check;
ALTER TABLE church.notification_history ADD CONSTRAINT notification_history_type_check CHECK(type IN ('worship_information_request','worship_viber_draft'));
INSERT INTO church.schema_migrations(version) VALUES(14);
COMMIT;
