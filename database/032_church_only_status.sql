BEGIN;

ALTER TABLE church.member_profiles
  DROP CONSTRAINT IF EXISTS users_church_status_check,
  DROP CONSTRAINT IF EXISTS member_profiles_church_status_check,
  ADD CONSTRAINT member_profiles_church_status_check
    CHECK(church_status IN ('Trung tín','Chỉ nhóm Hội Thánh','Không trung tín','Không đi nhóm','Chuyển hội','Đi nước ngoài'));

ALTER TABLE church.member_church_status_history
  DROP CONSTRAINT member_church_status_history_previous_status_check,
  DROP CONSTRAINT member_church_status_history_new_status_check,
  ADD CONSTRAINT member_church_status_history_previous_status_check
    CHECK(previous_status IS NULL OR previous_status IN ('Trung tín','Chỉ nhóm Hội Thánh','Không trung tín','Không đi nhóm','Chuyển hội','Đi nước ngoài')),
  ADD CONSTRAINT member_church_status_history_new_status_check
    CHECK(new_status IN ('Trung tín','Chỉ nhóm Hội Thánh','Không trung tín','Không đi nhóm','Chuyển hội','Đi nước ngoài'));

INSERT INTO church.schema_migrations(version) VALUES(32);
COMMIT;
