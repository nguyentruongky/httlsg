BEGIN;
-- Optional provenance only: final event text remains authoritative and editable.
ALTER TABLE church.events ADD COLUMN preset_id text CHECK(length(preset_id) BETWEEN 1 AND 80);
UPDATE church.events SET preset_id='worship-program' WHERE original_text ~ '^[[:space:]]*LỊCH TRỰC NGÀY ' AND original_text ~ 'Chủ đề[[:space:]]*:';
CREATE TABLE church.notification_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL UNIQUE,
 event_id uuid NOT NULL REFERENCES church.events(id),
 event_version integer NOT NULL CHECK(event_version>=0),
 created_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,
 type text NOT NULL CHECK(type='worship_information_request'),
 recipient text NOT NULL CHECK(recipient='nguyentruongky33@gmail.com'),
 preview_hash text NOT NULL CHECK(length(preview_hash)=64),
 message text NOT NULL,
 missing_fields jsonb NOT NULL CHECK(jsonb_typeof(missing_fields)='array'),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','sending','sent','failed','uncertain')),
 safe_error text,
 claimed_at timestamptz,
 sent_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX notification_history_one_active_version ON church.notification_history(event_id,event_version,type) WHERE status IN ('pending','sending','sent','uncertain');
CREATE INDEX notification_history_event ON church.notification_history(event_id);
CREATE INDEX notification_history_creator ON church.notification_history(created_by,created_at);
GRANT SELECT,INSERT,UPDATE,DELETE ON church.notification_history TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(13);
COMMIT;
