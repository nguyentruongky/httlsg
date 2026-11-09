BEGIN;
CREATE TABLE church.schedule_categories (
 id text PRIMARY KEY,name text NOT NULL,description text NOT NULL DEFAULT '',is_active boolean NOT NULL DEFAULT true,
 settings jsonb NOT NULL DEFAULT '{}',version integer NOT NULL DEFAULT 0 CHECK(version>=0),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE church.schedule_responsibility_definitions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),category_id text NOT NULL REFERENCES church.schedule_categories(id),name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 100),description text NOT NULL DEFAULT '',sort_order integer NOT NULL DEFAULT 0,is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX schedule_definitions_category ON church.schedule_responsibility_definitions(category_id,sort_order);
INSERT INTO church.schedule_categories(id,name,description,settings) VALUES
 ('reception','Lịch tiếp tân','Phân công tiếp đón và hỗ trợ người tham dự.','{"layout":"table","weekdayTime":null,"sundayTime":null,"sessions":[]}'),
 ('prayer_guidance','Lịch hướng dẫn cầu nguyện','Phân công hướng dẫn cầu nguyện theo ngày.','{"layout":"weekday","weekdayTime":"05:30","sundayTime":"06:30","sessions":[]}'),
 ('program_guidance','Lịch hướng dẫn chương trình','Phân công phục vụ theo từng buổi chương trình.','{"layout":"sessions","weekdayTime":null,"sundayTime":null,"sessions":["Sáng Chúa Nhật","Chiều Chúa Nhật","Thứ Tư"]}'),
 ('communion_duty','Lịch trực tiệc thánh','Phân công phục vụ tiệc thánh theo nhu cầu của Hội Thánh.','{"layout":"table","weekdayTime":null,"sundayTime":null,"sessions":[]}');
INSERT INTO church.schedule_responsibility_definitions(category_id,name,sort_order) VALUES
 ('reception','Tiếp tân',0),('reception','Hỗ trợ tiếp đón',1),('reception','Hỗ trợ khách mới',2),('prayer_guidance','Người hướng dẫn cầu nguyện',0),
 ('program_guidance','HD. TP.',0),('program_guidance','HD. Hát.',1),('program_guidance','Nhóm Hát',2),('program_guidance','Ban Hát',3),('program_guidance','Ban nhạc',4),('program_guidance','Giữ xe',5);
INSERT INTO church.permissions(id,code,name) SELECT 'schedule.'||id||'.manage','schedule.'||id||'.manage','Quản lý '||lower(name) FROM church.schedule_categories;
INSERT INTO church.permissions(id,code,name) VALUES('schedule.leaders.manage','schedule.leaders.manage','Quản lý người phụ trách lịch phân công');
-- General administration policy: Admin and Thư ký share non-calendar administrative access.
INSERT INTO church.role_permissions(role_id,permission_id) SELECT r.id,p.id FROM church.roles r CROSS JOIN church.permissions p WHERE r.id IN ('admin','secretary') AND p.id LIKE 'schedule.%';
CREATE TABLE church.schedule_manager_permissions (
 member_id uuid NOT NULL REFERENCES church.member_profiles(id),category_id text NOT NULL REFERENCES church.schedule_categories(id),is_active boolean NOT NULL DEFAULT true,
 created_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,updated_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(member_id,category_id)
);
CREATE INDEX schedule_managers_category ON church.schedule_manager_permissions(category_id,member_id);
CREATE INDEX schedule_managers_creator ON church.schedule_manager_permissions(created_by);
CREATE INDEX schedule_managers_updater ON church.schedule_manager_permissions(updated_by);
CREATE TABLE church.schedules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),category_id text NOT NULL REFERENCES church.schedule_categories(id),title text NOT NULL CHECK(length(btrim(title)) BETWEEN 2 AND 200),description text NOT NULL DEFAULT '',
 period_start date NOT NULL,period_end date NOT NULL CHECK(period_end>=period_start AND period_end-period_start<=366),settings jsonb NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','cancelled')),version integer NOT NULL DEFAULT 0 CHECK(version>=0),
 request_id uuid NOT NULL UNIQUE,request_hash text NOT NULL,copy_source_id uuid REFERENCES church.schedules(id) ON DELETE SET NULL,copy_request_hash text,
 created_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,updated_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,
 published_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,cancelled_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,
 published_at timestamptz,cancelled_at timestamptz,deleted_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status<>'published' OR published_at IS NOT NULL),CHECK(status<>'cancelled' OR cancelled_at IS NOT NULL)
);
CREATE INDEX schedules_category_period ON church.schedules(category_id,period_start,period_end) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX schedules_same_plan ON church.schedules(category_id,lower(btrim(title)),period_start,period_end) WHERE deleted_at IS NULL AND status<>'cancelled';
CREATE INDEX schedules_copy_source ON church.schedules(copy_source_id);
CREATE INDEX schedules_creator ON church.schedules(created_by);CREATE INDEX schedules_updater ON church.schedules(updated_by);CREATE INDEX schedules_publisher ON church.schedules(published_by);CREATE INDEX schedules_canceller ON church.schedules(cancelled_by);
CREATE TABLE church.schedule_events (
 id uuid PRIMARY KEY,schedule_id uuid NOT NULL REFERENCES church.schedules(id) ON DELETE CASCADE,event_date date NOT NULL,start_time time,end_time time,title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 200),description text NOT NULL DEFAULT '',location text NOT NULL DEFAULT '',session text NOT NULL DEFAULT '',sort_order integer NOT NULL,
 CHECK(end_time IS NULL OR (start_time IS NOT NULL AND end_time>start_time))
);
CREATE INDEX schedule_events_parent_date ON church.schedule_events(schedule_id,event_date,sort_order);
CREATE UNIQUE INDEX schedule_events_duplicate ON church.schedule_events(schedule_id,event_date,COALESCE(start_time,'00:00'::time),lower(session),lower(title));
CREATE FUNCTION church.check_schedule_event_period() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM church.schedules WHERE id=NEW.schedule_id AND NEW.event_date BETWEEN period_start AND period_end) THEN RAISE EXCEPTION 'Schedule event outside period' USING ERRCODE='23514'; END IF; RETURN NEW; END $$;
CREATE TRIGGER schedule_event_period BEFORE INSERT OR UPDATE ON church.schedule_events FOR EACH ROW EXECUTE FUNCTION church.check_schedule_event_period();
CREATE TABLE church.schedule_responsibilities (
 id uuid PRIMARY KEY,event_id uuid NOT NULL REFERENCES church.schedule_events(id) ON DELETE CASCADE,name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 100),description text NOT NULL DEFAULT '',sort_order integer NOT NULL
);
CREATE INDEX schedule_responsibilities_event ON church.schedule_responsibilities(event_id,sort_order);
CREATE TABLE church.schedule_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),responsibility_id uuid NOT NULL REFERENCES church.schedule_responsibilities(id) ON DELETE CASCADE,member_id uuid NOT NULL REFERENCES church.member_profiles(id),notes text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(responsibility_id,member_id)
);
CREATE INDEX schedule_assignments_member ON church.schedule_assignments(member_id,responsibility_id);
CREATE TABLE church.schedule_department_assignments (
 responsibility_id uuid NOT NULL REFERENCES church.schedule_responsibilities(id) ON DELETE CASCADE,department_key text NOT NULL,department_id text REFERENCES church.departments(id) ON DELETE SET NULL,department_name text NOT NULL,PRIMARY KEY(responsibility_id,department_key)
);
CREATE INDEX schedule_department_assignments_department ON church.schedule_department_assignments(department_id,responsibility_id);
CREATE TABLE church.schedule_member_state (
 schedule_id uuid NOT NULL REFERENCES church.schedules(id) ON DELETE CASCADE,member_id uuid NOT NULL REFERENCES church.member_profiles(id),signature text NOT NULL,version integer NOT NULL,PRIMARY KEY(schedule_id,member_id)
);
CREATE INDEX schedule_member_state_member ON church.schedule_member_state(member_id);
CREATE TABLE church.schedule_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),schedule_id uuid NOT NULL REFERENCES church.schedules(id),schedule_version integer NOT NULL,member_id uuid NOT NULL REFERENCES church.member_profiles(id),kind text NOT NULL CHECK(kind IN ('assigned','changed','removed','cancelled')),schedule_title text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(schedule_id,schedule_version,member_id)
);
CREATE INDEX schedule_notifications_member ON church.schedule_notifications(member_id,created_at DESC);
CREATE TABLE church.schedule_push_deliveries (
 notification_id uuid NOT NULL REFERENCES church.schedule_notifications(id),subscription_id uuid NOT NULL REFERENCES church.push_subscriptions(id) ON DELETE CASCADE,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed','uncertain','revoked','cancelled')),attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),next_attempt_at timestamptz NOT NULL DEFAULT now(),claimed_at timestamptz,sent_at timestamptz,safe_error text,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(notification_id,subscription_id)
);
CREATE INDEX schedule_push_subscription ON church.schedule_push_deliveries(subscription_id);
CREATE INDEX schedule_push_ready ON church.schedule_push_deliveries(next_attempt_at) WHERE status IN ('pending','failed');
GRANT SELECT,INSERT,UPDATE,DELETE ON church.schedule_categories,church.schedule_responsibility_definitions,church.schedule_manager_permissions,church.schedules,church.schedule_events,church.schedule_responsibilities,church.schedule_assignments,church.schedule_department_assignments,church.schedule_member_state,church.schedule_notifications,church.schedule_push_deliveries TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(19);
COMMIT;
