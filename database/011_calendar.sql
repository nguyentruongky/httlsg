BEGIN;
INSERT INTO church.permissions(id,code,name) VALUES
 ('calendar.read','calendar.read','Xem lịch sinh hoạt'),('calendar.write','calendar.write','Quản lý sinh hoạt'),
 ('calendar.export','calendar.export','Xuất lịch Word'),('calendar.groups','calendar.groups','Quản lý nhóm email'),('calendar.notify','calendar.notify','Gửi thông báo sinh hoạt');
INSERT INTO church.role_permissions SELECT 'admin',id FROM church.permissions WHERE id LIKE 'calendar.%';
INSERT INTO church.role_permissions VALUES('secretary','calendar.read'),('secretary','calendar.export');
CREATE TABLE church.events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_date date NOT NULL CHECK(event_date BETWEEN '1900-01-01' AND '2100-12-31'),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 300), time_text text, start_time time, end_time time,
 details text NOT NULL, original_text text NOT NULL CHECK(length(original_text) BETWEEN 1 AND 50000),
 request_id uuid NOT NULL UNIQUE, request_hash text NOT NULL,
 version integer NOT NULL DEFAULT 0 CHECK(version>=0), created_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,
 updated_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),deleted_at timestamptz,
 CHECK((time_text IS NULL)=(start_time IS NULL)), CHECK(end_time IS NULL OR (start_time IS NOT NULL AND end_time>start_time))
);
CREATE INDEX events_date ON church.events(event_date,start_time,created_at,id) WHERE deleted_at IS NULL;
CREATE INDEX events_creator ON church.events(created_by);
CREATE INDEX events_updater ON church.events(updated_by);
CREATE TABLE church.email_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 150),description text NOT NULL DEFAULT '' CHECK(length(description)<=2000),version integer NOT NULL DEFAULT 0 CHECK(version>=0),
 created_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,updated_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),deleted_at timestamptz
);
CREATE UNIQUE INDEX email_groups_name ON church.email_groups(lower(name)) WHERE deleted_at IS NULL;
CREATE INDEX email_groups_creator ON church.email_groups(created_by);
CREATE INDEX email_groups_updater ON church.email_groups(updated_by);
CREATE TABLE church.email_group_members (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),group_id uuid NOT NULL REFERENCES church.email_groups(id),
 email text NOT NULL CHECK(email=lower(btrim(email)) AND length(email)<=254 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(group_id,email)
);
CREATE TABLE church.event_email_groups (
 event_id uuid NOT NULL REFERENCES church.events(id),group_id uuid NOT NULL REFERENCES church.email_groups(id),PRIMARY KEY(event_id,group_id)
);
CREATE INDEX event_email_groups_group ON church.event_email_groups(group_id);
CREATE TABLE church.event_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_id uuid NOT NULL REFERENCES church.events(id),request_id uuid NOT NULL UNIQUE,
 kind text NOT NULL CHECK(kind IN ('created','updated')),snapshot jsonb NOT NULL,group_names text[] NOT NULL,group_ids uuid[] NOT NULL DEFAULT '{}',
 created_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_notifications_event ON church.event_notifications(event_id,created_at DESC);
CREATE INDEX event_notifications_creator ON church.event_notifications(created_by);
CREATE TABLE church.event_notification_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),notification_id uuid NOT NULL REFERENCES church.event_notifications(id),email text NOT NULL CHECK(email=lower(btrim(email)) AND length(email)<=254),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed','uncertain','cancelled')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),claimed_at timestamptz,last_attempted_at timestamptz,sent_at timestamptz,safe_error text,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(notification_id,email)
);
CREATE INDEX event_deliveries_pending ON church.event_notification_deliveries(created_at,id) WHERE status='pending';
CREATE INDEX event_deliveries_status ON church.event_notification_deliveries(notification_id,status);
CREATE TABLE church.event_notification_retries (
 request_id uuid PRIMARY KEY,notification_id uuid NOT NULL REFERENCES church.event_notifications(id),count integer NOT NULL CHECK(count>=0),
 created_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notification_retries_batch ON church.event_notification_retries(notification_id);
CREATE INDEX notification_retries_creator ON church.event_notification_retries(created_by);
GRANT SELECT,INSERT,UPDATE,DELETE ON church.events,church.email_groups,church.email_group_members,church.event_email_groups,church.event_notifications,church.event_notification_deliveries,church.event_notification_retries TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(11);
COMMIT;
