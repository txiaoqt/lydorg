-- ==============================================================================
-- Migration: 20260925090000_set_default_reply_to_email.sql
-- Description: Sets the authoritative system default for email.reply_to_email to
--              'lydo@pasigcity.gov.ph'.
--              Migrates legacy defaults ('support@lydo.pasigcity.gov.ph',
--              'support@lydo.pasig.gov.ph', null, empty) while strictly preserving
--              any custom email address intentionally configured by administrators.
-- ==============================================================================

-- 1. Ensure email.reply_to_email row exists and set default to lydo@pasigcity.gov.ph if currently legacy default
INSERT INTO public.admin_system_settings (
  setting_key,
  category,
  value_json,
  data_type,
  description,
  is_sensitive,
  is_editable
)
VALUES (
  'email.reply_to_email',
  'email',
  '"lydo@pasigcity.gov.ph"'::jsonb,
  'string',
  'Default reply-to email address on outgoing system communications',
  false,
  true
)
ON CONFLICT (setting_key) DO UPDATE
SET value_json = '"lydo@pasigcity.gov.ph"'::jsonb,
    updated_at = now()
WHERE admin_system_settings.value_json IN (
  '"support@lydo.pasigcity.gov.ph"'::jsonb,
  '"support@lydo.pasig.gov.ph"'::jsonb,
  '""'::jsonb,
  'null'::jsonb
)
OR admin_system_settings.value_json IS NULL;

-- 2. Also migrate general.support_email if it still contains the legacy domain
UPDATE public.admin_system_settings
SET value_json = '"lydo@pasigcity.gov.ph"'::jsonb,
    updated_at = now()
WHERE setting_key = 'general.support_email'
  AND value_json IN (
    '"support@lydo.pasigcity.gov.ph"'::jsonb,
    '"support@lydo.pasig.gov.ph"'::jsonb
  );
