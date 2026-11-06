BEGIN;
-- Registered phone accounts can sign in even without a department assignment.
DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT conname FROM pg_constraint WHERE conrelid='church.otps'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%otp_ciphertext%' LOOP
  EXECUTE format('ALTER TABLE church.otps DROP CONSTRAINT %I',item.conname);
 END LOOP;
END $$;
ALTER TABLE church.otps ADD CONSTRAINT otps_channel_payload CHECK (
 (type='EMAIL' AND otp_ciphertext IS NULL AND expires_at<=created_at+interval '10 minutes') OR
 (type='PHONE_LEADER' AND otp_ciphertext IS NOT NULL)
);
CREATE OR REPLACE FUNCTION church.notify_team_otp() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item record;
BEGIN
 IF TG_OP='DELETE' THEN item:=OLD; ELSE item:=NEW; END IF;
 PERFORM pg_notify('church_team_events',json_build_object('department_id',item.department_id,'kind','otps','id',item.id,'removed',TG_OP='DELETE' OR item.is_used OR item.attempts>=5 OR item.expires_at<=now())::text);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
INSERT INTO church.schema_migrations(version) VALUES(7);
COMMIT;
