-- ==============================================================================
-- Migration: 20260925100000_update_general_system_settings_rules.sql
-- Description:
--   1. Enforces read-only status (is_editable = false) on general.system_name ('Y-TRACE')
--      and general.office_acronym ('PCYDO / LYDO').
--   2. Updates authoritative default for general.office_name to 'Pasig City Youth Development Office'
--      (migrating legacy 'Pasig City Local Youth Development Office').
--   3. Updates authoritative default for general.office_address to
--      '3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City'
--      (migrating legacy 'Pasig City Hall Complex, Caruncho Ave, Pasig, Metro Manila').
-- ==============================================================================

-- 1. System Name: Read-Only System Managed Setting
INSERT INTO public.admin_system_settings (
  setting_key, category, value_json, data_type, description, is_sensitive, is_editable
) VALUES (
  'general.system_name',
  'general',
  '"Y-TRACE"'::jsonb,
  'string',
  'Primary system title displayed across portal headers, breadcrumbs, and exported notices.',
  false,
  false
) ON CONFLICT (setting_key) DO UPDATE
SET is_editable = false,
    value_json = '"Y-TRACE"'::jsonb,
    updated_at = now();

-- 2. Office Acronym: Read-Only System Managed Setting
INSERT INTO public.admin_system_settings (
  setting_key, category, value_json, data_type, description, is_sensitive, is_editable
) VALUES (
  'general.office_acronym',
  'general',
  '"PCYDO / LYDO"'::jsonb,
  'string',
  'Official abbreviated acronyms shown in chips, badges, and document headers.',
  false,
  false
) ON CONFLICT (setting_key) DO UPDATE
SET is_editable = false,
    value_json = '"PCYDO / LYDO"'::jsonb,
    updated_at = now();

-- 3. Office Name: Default 'Pasig City Youth Development Office' (Editable)
INSERT INTO public.admin_system_settings (
  setting_key, category, value_json, data_type, description, is_sensitive, is_editable
) VALUES (
  'general.office_name',
  'general',
  '"Pasig City Youth Development Office"'::jsonb,
  'string',
  'Official local government office or department administering youth organization programs.',
  false,
  true
) ON CONFLICT (setting_key) DO UPDATE
SET value_json = '"Pasig City Youth Development Office"'::jsonb,
    updated_at = now()
WHERE admin_system_settings.value_json IN (
  '"Pasig City Local Youth Development Office"'::jsonb,
  '""'::jsonb,
  'null'::jsonb
) OR admin_system_settings.value_json IS NULL;

-- 4. Office Address: Default '3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City' (Editable)
INSERT INTO public.admin_system_settings (
  setting_key, category, value_json, data_type, description, is_sensitive, is_editable
) VALUES (
  'general.office_address',
  'general',
  '"3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City"'::jsonb,
  'string',
  'Physical location for on-site document submission and official appointments.',
  false,
  true
) ON CONFLICT (setting_key) DO UPDATE
SET value_json = '"3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City"'::jsonb,
    updated_at = now()
WHERE admin_system_settings.value_json IN (
  '"Pasig City Hall Complex, Caruncho Ave, Pasig, Metro Manila"'::jsonb,
  '""'::jsonb,
  'null'::jsonb
) OR admin_system_settings.value_json IS NULL;
