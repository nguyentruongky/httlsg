BEGIN;

CREATE TABLE church.event_assignment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES church.events(id),
  member_id uuid NOT NULL REFERENCES church.users(id),
  event_version integer NOT NULL,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id,member_id,event_version)
);
CREATE INDEX event_assignment_notifications_member
  ON church.event_assignment_notifications(member_id,created_at DESC,id DESC);
GRANT SELECT,INSERT,UPDATE,DELETE ON church.event_assignment_notifications TO church_runtime;

-- Retain current assignments when introducing the notification center.
INSERT INTO church.event_assignment_notifications(event_id,member_id,event_version,title,created_at)
  SELECT e.id,rm.member_id,e.version,e.title,e.updated_at
  FROM church.event_responsible_members rm JOIN church.events e ON e.id=rm.event_id
  WHERE e.deleted_at IS NULL ON CONFLICT DO NOTHING;

INSERT INTO church.schema_migrations(version) VALUES(64) ON CONFLICT DO NOTHING;
COMMIT;
