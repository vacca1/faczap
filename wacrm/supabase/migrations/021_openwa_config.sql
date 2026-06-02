-- Migration 021: Replace Meta Cloud API config with OpenWA config
--
-- Drops the Meta-specific columns (phone_number_id, waba_id, access_token,
-- verify_token, registration timestamps) and adds OpenWA session fields.
-- The whatsapp_config table keeps its primary key, account_id, user_id,
-- status, and audit timestamps unchanged.

ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS api_key TEXT,
  ADD COLUMN IF NOT EXISTS openwa_base_url TEXT DEFAULT 'http://openwa:2785/api';

-- Remove Meta-specific columns (safe to drop — replaced by OpenWA fields above)
ALTER TABLE whatsapp_config
  DROP COLUMN IF EXISTS phone_number_id,
  DROP COLUMN IF EXISTS waba_id,
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS verify_token,
  DROP COLUMN IF EXISTS registered_at,
  DROP COLUMN IF EXISTS subscribed_apps_at,
  DROP COLUMN IF EXISTS last_registration_error;

-- message_templates table is no longer used with OpenWA (no Meta approval flow)
-- Drop it to keep the schema clean. Broadcast and automations now use plain text.
DROP TABLE IF EXISTS message_templates CASCADE;

COMMENT ON COLUMN whatsapp_config.session_id IS 'OpenWA session identifier (e.g. "default")';
COMMENT ON COLUMN whatsapp_config.api_key IS 'OpenWA API key (plaintext — stored server-side only)';
COMMENT ON COLUMN whatsapp_config.openwa_base_url IS 'Base URL of the OpenWA REST API';
