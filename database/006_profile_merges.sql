BEGIN;
-- Permanent aliases prevent retired profile IDs from being reimported.
CREATE TABLE church.profile_merges (
 source_id uuid PRIMARY KEY,
 target_id uuid NOT NULL REFERENCES church.member_profiles(id),
 merged_by uuid REFERENCES church.member_profiles(id) ON DELETE SET NULL,
 merged_at timestamptz NOT NULL DEFAULT now(),
 merge_token text NOT NULL CHECK(length(merge_token)=64),
 snapshot jsonb NOT NULL,
 CHECK(source_id<>target_id)
);
CREATE INDEX profile_merges_target ON church.profile_merges(target_id);
CREATE INDEX profile_merges_actor ON church.profile_merges(merged_by);
GRANT SELECT,INSERT,UPDATE ON church.profile_merges TO church_runtime;
-- Only identity references may be canonicalized; audit actions/timestamps stay immutable.
GRANT UPDATE(actor_id,subject_id) ON church.audit_log TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(6);
COMMIT;
