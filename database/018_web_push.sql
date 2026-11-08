BEGIN;
CREATE TABLE church.push_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES church.users(id) ON DELETE CASCADE,
 endpoint_hash text NOT NULL UNIQUE CHECK(length(endpoint_hash)=64),
 subscription_ciphertext text NOT NULL,
 refresh_family uuid NOT NULL,
 user_agent text NOT NULL DEFAULT '' CHECK(length(user_agent)<=500),
 device_label text NOT NULL DEFAULT '' CHECK(length(device_label)<=100),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),last_used_at timestamptz,revoked_at timestamptz
);
CREATE INDEX push_subscriptions_user ON church.push_subscriptions(user_id);
CREATE INDEX push_subscriptions_active ON church.push_subscriptions(user_id,refresh_family) WHERE revoked_at IS NULL;
CREATE TABLE church.push_event_deliveries (
 event_id uuid NOT NULL REFERENCES church.events(id),
 subscription_id uuid NOT NULL REFERENCES church.push_subscriptions(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed','uncertain','revoked','cancelled')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 next_attempt_at timestamptz NOT NULL DEFAULT now(),claimed_at timestamptz,sent_at timestamptz,safe_error text,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(event_id,subscription_id)
);
CREATE INDEX push_deliveries_subscription ON church.push_event_deliveries(subscription_id);
CREATE INDEX push_deliveries_ready ON church.push_event_deliveries(next_attempt_at) WHERE status IN ('pending','failed');
GRANT SELECT,INSERT,UPDATE,DELETE ON church.push_subscriptions,church.push_event_deliveries TO church_runtime;
INSERT INTO church.schema_migrations(version) VALUES(18);
COMMIT;
