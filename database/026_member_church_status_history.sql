BEGIN;
ALTER TABLE church.users
  ADD COLUMN chuyen_hoi_den text CHECK(chuyen_hoi_den IS NULL OR length(chuyen_hoi_den)<=200);

CREATE TABLE church.member_church_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES church.users(id) ON DELETE CASCADE,
  previous_status text CHECK(previous_status IS NULL OR previous_status IN ('Trung tín','Không trung tín','Không đi nhóm','Chuyển hội','Đi nước ngoài')),
  new_status text NOT NULL CHECK(new_status IN ('Trung tín','Không trung tín','Không đi nhóm','Chuyển hội','Đi nước ngoài')),
  destination text CHECK(destination IS NULL OR length(destination)<=200),
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES church.users(id) ON DELETE SET NULL
);
CREATE INDEX member_church_status_history_member ON church.member_church_status_history(member_id, changed_at DESC);
CREATE INDEX member_church_status_history_changed_at ON church.member_church_status_history(changed_at DESC);

INSERT INTO church.schema_migrations(version) VALUES(26);
COMMIT;
