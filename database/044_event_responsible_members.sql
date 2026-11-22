BEGIN;
CREATE TABLE church.event_responsible_members (
  event_id uuid NOT NULL REFERENCES church.events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES church.users(id) ON DELETE CASCADE,
  PRIMARY KEY(event_id,member_id)
);
CREATE INDEX event_responsible_members_member ON church.event_responsible_members(member_id,event_id);
GRANT SELECT,INSERT,UPDATE,DELETE ON church.event_responsible_members TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(44);
COMMIT;
