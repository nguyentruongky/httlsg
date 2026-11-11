BEGIN;
ALTER TABLE church.events
  ADD COLUMN end_date date,
  ADD COLUMN category text NOT NULL DEFAULT 'activities',
  ADD COLUMN color text,
  ADD COLUMN style text NOT NULL DEFAULT 'outlined',
  ADD COLUMN icon text,
  ADD COLUMN status text,
  ADD COLUMN assignees text[] NOT NULL DEFAULT '{}',
  ADD COLUMN is_all_day boolean NOT NULL DEFAULT false;

UPDATE church.events SET end_date=event_date WHERE end_date IS NULL;

ALTER TABLE church.events
  ALTER COLUMN end_date SET NOT NULL,
  ADD CONSTRAINT events_date_range CHECK(end_date>=event_date),
  ADD CONSTRAINT events_visual_style CHECK(style IN ('filled','outlined')),
  ADD CONSTRAINT events_color_format CHECK(color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT events_status_value CHECK(status IS NULL OR status IN ('pending','completed'));

CREATE INDEX events_date_span ON church.events(event_date,end_date) WHERE deleted_at IS NULL;
INSERT INTO church.schema_migrations(version) VALUES(24);
COMMIT;