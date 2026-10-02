-- Use the project's actual admin schema: administrators are stored in
-- admin_accounts and permissions are assigned through roles.
CREATE OR REPLACE FUNCTION public.admin_get_organization_renewals(
  _session_token text
)
RETURNS SETOF public.organization_renewals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
BEGIN
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin session is invalid or expired.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_accounts aa
    JOIN public.roles r ON r.id = aa.role_id
    WHERE aa.id = _admin_id
      AND aa.is_active = true
      AND (r.code = 'super_admin' OR 'renewals_manage' = ANY(r.permission_codes))
  ) THEN
    RAISE EXCEPTION 'You do not have permission to view renewal applications.';
  END IF;

  RETURN QUERY
  SELECT renewal.*
  FROM public.organization_renewals renewal
  ORDER BY renewal.submitted_at DESC NULLS LAST, renewal.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_organization_renewals(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_organization_renewals(text) TO anon, authenticated, service_role;
