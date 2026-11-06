BEGIN;
-- Bind both notification channels to the same durable save receipt. A replay
-- uses these exact snapshots even if the event has since been edited again.
ALTER TABLE church.event_save_requests ADD COLUMN worship_notification_id uuid REFERENCES church.notification_history(id);
CREATE INDEX event_save_requests_worship_notification ON church.event_save_requests(worship_notification_id);
INSERT INTO church.schema_migrations(version) VALUES(15);
COMMIT;
