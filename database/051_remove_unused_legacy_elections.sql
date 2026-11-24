BEGIN;

-- These belong to the retired voting system, not the current election module.
-- Lock before checking emptiness so concurrent inserts cannot be lost.
DO $$
DECLARE legacy_table text; populated boolean;
BEGIN
  FOREACH legacy_table IN ARRAY ARRAY['election_votes','election_candidates','elections'] LOOP
    IF to_regclass(format('church.%I',legacy_table)) IS NOT NULL THEN
      EXECUTE format('LOCK TABLE church.%I IN ACCESS EXCLUSIVE MODE',legacy_table);
      EXECUTE format('SELECT EXISTS(SELECT 1 FROM church.%I)',legacy_table) INTO populated;
      IF populated THEN
        RAISE EXCEPTION 'Refusing to remove nonempty legacy table church.%',legacy_table;
      END IF;
    END IF;
  END LOOP;
END $$;

-- RESTRICT is intentional: unexpected dependent objects must stop the migration.
DROP TABLE IF EXISTS church.election_votes RESTRICT;
DROP TABLE IF EXISTS church.election_candidates RESTRICT;
DROP TABLE IF EXISTS church.elections RESTRICT;

INSERT INTO church.schema_migrations(version) VALUES(51) ON CONFLICT DO NOTHING;
COMMIT;
