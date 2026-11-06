BEGIN;
-- Persist save receipts so an edit retried after a lost HTTP response does not
-- advance the event version or create/send the notification a second time.
CREATE TABLE church.event_save_requests (
 request_id uuid PRIMARY KEY,
 event_id uuid NOT NULL REFERENCES church.events(id),
 created_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,
 operation text NOT NULL CHECK(operation IN ('created','updated')),
 request_hash text NOT NULL CHECK(length(request_hash)=64),
 notification_id uuid REFERENCES church.event_notifications(id),
 applied_version integer NOT NULL CHECK(applied_version>=0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_save_requests_event ON church.event_save_requests(event_id);
CREATE INDEX event_save_requests_creator ON church.event_save_requests(created_by);
CREATE INDEX event_save_requests_notification ON church.event_save_requests(notification_id);
CREATE INDEX event_deliveries_sending ON church.event_notification_deliveries(claimed_at) WHERE status='sending';
GRANT SELECT,INSERT,UPDATE,DELETE ON church.event_save_requests TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(12);
COMMIT;
