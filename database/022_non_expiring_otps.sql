BEGIN;
SELECT pg_advisory_xact_lock(74298331);
-- Retire expired/locked requests instead of making old codes valid again.
UPDATE church.otps SET is_used=true,used_at=COALESCE(used_at,now())
WHERE NOT is_used AND (attempts>=5 OR expires_at<=now());
WITH ranked AS (
 SELECT id,row_number() OVER (PARTITION BY user_id ORDER BY created_at DESC,id DESC) rank
 FROM church.otps WHERE NOT is_used
)
UPDATE church.otps o SET is_used=true,used_at=now()
FROM ranked r WHERE o.id=r.id AND r.rank>1;

-- Replace historical lifetime/channel checks with nullable expiry support.
DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT conname FROM pg_constraint
 WHERE conrelid='church.otps'::regclass AND contype='c'
 AND pg_get_constraintdef(oid) LIKE '%expires_at%' LOOP
  EXECUTE format('ALTER TABLE church.otps DROP CONSTRAINT %I',item.conname);
 END LOOP;
END $$;
ALTER TABLE church.otps ALTER COLUMN expires_at DROP NOT NULL;
UPDATE church.otps SET expires_at=NULL WHERE NOT is_used;
ALTER TABLE church.otps ADD CONSTRAINT otps_optional_expiry
 CHECK(expires_at IS NULL OR expires_at>created_at);
ALTER TABLE church.otps ADD CONSTRAINT otps_channel_payload
 CHECK((type='EMAIL' AND otp_ciphertext IS NULL) OR (type='PHONE_LEADER' AND otp_ciphertext IS NOT NULL));
DROP INDEX church.otps_one_active;
CREATE UNIQUE INDEX otps_one_active ON church.otps(user_id) WHERE NOT is_used;

CREATE OR REPLACE FUNCTION church.notify_team_otp() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item record;
BEGIN
 IF TG_OP='DELETE' THEN item:=OLD; ELSE item:=NEW; END IF;
 PERFORM pg_notify('church_team_events',json_build_object('department_id',item.department_id,'kind','otps','id',item.id,'removed',TG_OP='DELETE' OR item.is_used OR item.attempts>=5 OR (item.expires_at IS NOT NULL AND item.expires_at<=now()))::text);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
INSERT INTO church.schema_migrations(version) VALUES(22);
COMMIT;
