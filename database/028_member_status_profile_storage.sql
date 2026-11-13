-- Correct migration 026 without changing an already-applied migration.
-- Version 027 is already recorded in deployed databases.
BEGIN;

ALTER TABLE church.member_profiles
  ADD COLUMN chuyen_hoi_den text CHECK(chuyen_hoi_den IS NULL OR length(chuyen_hoi_den)<=200);

-- Preserve destinations previously stored on login accounts.
UPDATE church.member_profiles p
SET chuyen_hoi_den=u.chuyen_hoi_den
FROM church.users u
WHERE u.id=p.id AND u.chuyen_hoi_den IS NOT NULL;

-- Every member has a profile, but many members have no login account.
ALTER TABLE church.member_church_status_history
  DROP CONSTRAINT member_church_status_history_member_id_fkey,
  DROP CONSTRAINT member_church_status_history_changed_by_fkey,
  ADD CONSTRAINT member_church_status_history_member_id_fkey
    FOREIGN KEY(member_id) REFERENCES church.member_profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT member_church_status_history_changed_by_fkey
    FOREIGN KEY(changed_by) REFERENCES church.member_profiles(id) ON DELETE SET NULL;

GRANT SELECT,INSERT ON church.member_church_status_history TO church_runtime;

INSERT INTO church.schema_migrations(version) VALUES(28);
COMMIT;
