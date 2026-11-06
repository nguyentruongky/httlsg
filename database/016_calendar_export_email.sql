BEGIN;
CREATE TABLE church.calendar_export_emails (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL,
 created_by uuid NOT NULL REFERENCES church.member_profiles(id),
 recipient text NOT NULL CHECK(recipient IN ('btt.httlsaigon@gmail.com','nguyentruongky33@gmail.com')),
 request_hash text NOT NULL CHECK(length(request_hash)=64),
 from_date date NOT NULL,
 to_date date NOT NULL CHECK(to_date>=from_date AND to_date-from_date<=366),
 preview_text text NOT NULL CHECK(length(preview_text)<=500000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed','uncertain')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 claimed_at timestamptz,
 sent_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(request_id,recipient)
);
CREATE INDEX calendar_export_emails_author ON church.calendar_export_emails(created_by,created_at DESC);
GRANT SELECT,INSERT,UPDATE,DELETE ON church.calendar_export_emails TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(16);
COMMIT;
