BEGIN;
ALTER TABLE church.worship_contributions
  DROP CONSTRAINT worship_contributions_service_number_check;
ALTER TABLE church.worship_contributions
  ADD CONSTRAINT worship_contributions_service_number_check CHECK (service_number >= 1);
INSERT INTO church.schema_migrations(version) VALUES(43);
COMMIT;
