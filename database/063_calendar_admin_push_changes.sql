BEGIN;
ALTER TABLE church.push_event_deliveries
 ADD COLUMN event_version integer NOT NULL DEFAULT 0 CHECK(event_version>=0),
 ADD COLUMN kind text NOT NULL DEFAULT 'created' CHECK(kind IN ('created','updated','deleted')),
 ADD COLUMN admin_change boolean NOT NULL DEFAULT false;
ALTER TABLE church.push_event_deliveries DROP CONSTRAINT push_event_deliveries_pkey;
ALTER TABLE church.push_event_deliveries ADD PRIMARY KEY(event_id,subscription_id,event_version);
INSERT INTO church.schema_migrations(version) VALUES(63) ON CONFLICT DO NOTHING;
COMMIT;
