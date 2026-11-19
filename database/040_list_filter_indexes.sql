BEGIN;
CREATE INDEX worship_contributions_date_service ON church.worship_contributions(event_date, service_number) WHERE status='pending';
CREATE INDEX email_group_members_email ON church.email_group_members(email);
INSERT INTO church.schema_migrations(version) VALUES(40);
COMMIT;
