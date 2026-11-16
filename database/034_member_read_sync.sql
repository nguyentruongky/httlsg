BEGIN;

-- A transactional counter preserves commit order; sequence values alone can
-- let a client skip a transaction that commits after a newer sequence value.
CREATE TABLE church.member_sync_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  epoch uuid NOT NULL DEFAULT gen_random_uuid(),
  revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0)
);
INSERT INTO church.member_sync_state(singleton) VALUES(true);
CREATE TABLE church.member_sync_changes (
  member_id uuid PRIMARY KEY,
  revision bigint NOT NULL
);
CREATE INDEX member_sync_changes_revision ON church.member_sync_changes(revision);

CREATE FUNCTION church.mark_member_read_changed(member uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,church AS $$
DECLARE next_revision bigint;
BEGIN
  IF member IS NULL THEN RETURN; END IF;
  UPDATE church.member_sync_state SET revision=revision+1 WHERE singleton
    RETURNING revision INTO next_revision;
  INSERT INTO church.member_sync_changes(member_id,revision) VALUES(member,next_revision)
    ON CONFLICT(member_id) DO UPDATE SET revision=EXCLUDED.revision;
END $$;
REVOKE ALL ON FUNCTION church.mark_member_read_changed(uuid) FROM PUBLIC;

CREATE FUNCTION church.track_member_read_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,church AS $$
DECLARE before_row jsonb; after_row jsonb; member uuid; relative uuid; household uuid; department text;
BEGIN
  IF TG_OP<>'INSERT' THEN before_row=to_jsonb(OLD); END IF;
  IF TG_OP<>'DELETE' THEN after_row=to_jsonb(NEW); END IF;
  IF TG_OP='UPDATE' AND before_row=after_row THEN RETURN NULL; END IF;
  -- Board history is stored by department, rather than by member.
  IF TG_ARGV[0]='department_id' THEN
    department=COALESCE(after_row->>'department_id',before_row->>'department_id');
    FOR member IN
      SELECT dm.user_id FROM church.department_members dm WHERE dm.department_id=department
      UNION SELECT (entry->>'id')::uuid FROM jsonb_array_elements(COALESCE(before_row->'members','[]'::jsonb)) entry
      UNION SELECT (entry->>'id')::uuid FROM jsonb_array_elements(COALESCE(after_row->'members','[]'::jsonb)) entry
    LOOP PERFORM church.mark_member_read_changed(member); END LOOP;
    RETURN NULL;
  END IF;
  member=COALESCE((after_row->>TG_ARGV[0])::uuid,(before_row->>TG_ARGV[0])::uuid);
  PERFORM church.mark_member_read_changed(member);
  IF TG_OP='UPDATE' AND (before_row->>TG_ARGV[0]) IS DISTINCT FROM (after_row->>TG_ARGV[0]) THEN
    PERFORM church.mark_member_read_changed((before_row->>TG_ARGV[0])::uuid);
  END IF;
  -- Family names and relationships also affect related profiles' displays.
  IF TG_TABLE_NAME='member_profiles' OR TG_TABLE_NAME='household_members' THEN
    household=COALESCE((after_row->>'household_id')::uuid,(before_row->>'household_id')::uuid);
    FOR relative IN SELECT hm.user_id FROM church.household_members hm
      WHERE hm.user_id<>member AND (hm.household_id=household OR hm.household_id IN(
        SELECT mine.household_id FROM church.household_members mine WHERE mine.user_id=member))
    LOOP PERFORM church.mark_member_read_changed(relative); END LOOP;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION church.track_member_read_change() FROM PUBLIC;

-- Record revisions at commit, after normal profile locks and writes finish.
-- This keeps the counter lock brief and avoids reversing application row-lock order.
CREATE CONSTRAINT TRIGGER member_profiles_read_sync AFTER INSERT OR UPDATE OR DELETE ON church.member_profiles DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION church.track_member_read_change('id');
CREATE CONSTRAINT TRIGGER users_read_sync AFTER INSERT OR UPDATE OR DELETE ON church.users DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION church.track_member_read_change('id');
CREATE CONSTRAINT TRIGGER department_members_read_sync AFTER INSERT OR UPDATE OR DELETE ON church.department_members DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION church.track_member_read_change('user_id');
CREATE CONSTRAINT TRIGGER member_roles_read_sync AFTER INSERT OR UPDATE OR DELETE ON church.member_roles DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION church.track_member_read_change('member_id');
CREATE CONSTRAINT TRIGGER department_leaders_read_sync AFTER INSERT OR UPDATE OR DELETE ON church.department_leaders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION church.track_member_read_change('user_id');
CREATE CONSTRAINT TRIGGER department_managers_read_sync AFTER INSERT OR UPDATE OR DELETE ON church.department_managers DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION church.track_member_read_change('user_id');
CREATE CONSTRAINT TRIGGER personnel_missions_read_sync AFTER INSERT OR UPDATE OR DELETE ON church.personnel_missions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION church.track_member_read_change('member_id');
CREATE CONSTRAINT TRIGGER household_members_read_sync AFTER INSERT OR UPDATE OR DELETE ON church.household_members DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION church.track_member_read_change('user_id');
CREATE CONSTRAINT TRIGGER member_status_read_sync AFTER INSERT OR UPDATE OR DELETE ON church.member_church_status_history DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION church.track_member_read_change('member_id');
CREATE CONSTRAINT TRIGGER notes_read_sync AFTER INSERT OR UPDATE OR DELETE ON church.notes DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION church.track_member_read_change('member_id');
CREATE CONSTRAINT TRIGGER visits_read_sync AFTER INSERT OR UPDATE OR DELETE ON church.visits DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION church.track_member_read_change('member_id');
CREATE CONSTRAINT TRIGGER department_board_read_sync AFTER INSERT OR UPDATE OR DELETE ON church.department_board_history DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION church.track_member_read_change('department_id');

GRANT SELECT ON church.member_sync_state,church.member_sync_changes TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(34);
COMMIT;
