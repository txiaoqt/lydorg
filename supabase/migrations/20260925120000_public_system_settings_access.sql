-- Migration: 20260925120000_public_system_settings_access.sql
-- Purpose: Expose non-sensitive public system settings to public/anonymous users
--          so that Admin System Settings -> General is the authoritative runtime source
--          for public contact information (address, contact number, official email, etc.).

CREATE OR REPLACE FUNCTION public.get_public_system_settings()
RETURNS TABLE (
  setting_key text,
  category text,
  value_json jsonb,
  data_type text,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.setting_key,
    s.category,
    s.value_json,
    s.data_type,
    s.updated_at
  FROM public.admin_system_settings s
  WHERE s.is_sensitive = false
    AND (
      s.category = 'general'
      OR s.setting_key IN (
        'email.reply_to_email',
        'email.sender_name',
        'budget.currency_symbol',
        'budget.currency'
      )
    )
  ORDER BY s.setting_key ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_system_settings() TO anon, authenticated, service_role;

-- Grant public read access to non-sensitive rows via RLS policy
DROP POLICY IF EXISTS "Public read non-sensitive system settings" ON public.admin_system_settings;
CREATE POLICY "Public read non-sensitive system settings"
ON public.admin_system_settings
FOR SELECT
TO anon, authenticated
USING (is_sensitive = false);
