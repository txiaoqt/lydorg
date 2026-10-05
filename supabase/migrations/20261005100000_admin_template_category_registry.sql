-- Persist standalone Forms & Templates categories independently of browser state.
-- Existing categories assigned to a required document type are backfilled below.

CREATE TABLE IF NOT EXISTS public.admin_template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_template_categories_normalized_name_check CHECK (
    normalized_name <> ''
    AND normalized_name = lower(regexp_replace(btrim(normalized_name), '[[:space:]-]+', '_', 'g'))
  )
);

COMMENT ON TABLE public.admin_template_categories IS
  'Persistent registry for standalone custom categories in the Admin Portal Forms & Templates page.';

ALTER TABLE public.admin_template_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_template_categories FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.admin_template_categories TO service_role;

-- Preserve categories that already exist only through template assignments.
INSERT INTO public.admin_template_categories (normalized_name)
SELECT DISTINCT normalized.category
FROM public.required_document_types AS document_type
CROSS JOIN LATERAL unnest(COALESCE(document_type.template_category, ARRAY[]::text[])) AS category(value)
CROSS JOIN LATERAL (
  SELECT lower(regexp_replace(btrim(category.value), '[[:space:]-]+', '_', 'g')) AS category
) AS normalized
WHERE normalized.category <> ''
  AND normalized.category NOT IN ('yorp', 'ypop', 'move', 'data_form')
ON CONFLICT (normalized_name) DO NOTHING;

-- The helper centralizes token validation, active-account checks, and the existing
-- Forms & Templates page permission policy. Mutations additionally require the
-- dedicated forms_templates_management permission.
CREATE OR REPLACE FUNCTION public.authorize_admin_template_category_registry(
  _session_token text,
  _require_manage_permission boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  _admin_id uuid;
  _role_code text;
  _permission_codes text[];
BEGIN
  SELECT validated.admin_id, role.code, COALESCE(role.permission_codes, ARRAY[]::text[])
    INTO _admin_id, _role_code, _permission_codes
  FROM public.validate_admin_session_token(_session_token) AS validated
  JOIN public.admin_accounts AS account
    ON account.id = validated.admin_id
   AND account.is_active = true
  JOIN public.roles AS role ON role.id = account.role_id
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin session is invalid or expired.';
  END IF;

  IF _role_code <> 'super_admin' AND (
    (_require_manage_permission AND NOT ('forms_templates_management' = ANY(_permission_codes)))
    OR (NOT _require_manage_permission AND NOT (
      'forms_templates_management' = ANY(_permission_codes)
      OR 'registrations_management' = ANY(_permission_codes)
      OR 'renewals_manage' = ANY(_permission_codes)
    ))
  ) THEN
    RAISE EXCEPTION 'You do not have permission to manage template categories.' USING ERRCODE = '42501';
  END IF;

  RETURN _admin_id;
END;
$$;
REVOKE ALL ON FUNCTION public.authorize_admin_template_category_registry(text, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_template_categories(_session_token text)
RETURNS TABLE (normalized_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  PERFORM public.authorize_admin_template_category_registry(_session_token, false);
  RETURN QUERY
  SELECT category.normalized_name
  FROM public.admin_template_categories AS category
  ORDER BY category.normalized_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_template_category(
  _session_token text,
  _normalized_name text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  _normalized text;
BEGIN
  PERFORM public.authorize_admin_template_category_registry(_session_token, true);
  _normalized := lower(regexp_replace(btrim(_normalized_name), '[[:space:]-]+', '_', 'g'));

  IF _normalized IS NULL OR _normalized = '' THEN
    RAISE EXCEPTION 'Category name cannot be empty.';
  END IF;
  IF _normalized IN ('yorp', 'ypop', 'move', 'data_form') THEN
    RAISE EXCEPTION 'System categories cannot be added as custom categories.';
  END IF;

  INSERT INTO public.admin_template_categories (normalized_name)
  VALUES (_normalized)
  ON CONFLICT (normalized_name) DO NOTHING;

  RETURN _normalized;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_template_category(
  _session_token text,
  _normalized_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  _normalized text;
  _usage_count bigint;
BEGIN
  PERFORM public.authorize_admin_template_category_registry(_session_token, true);
  _normalized := lower(regexp_replace(btrim(_normalized_name), '[[:space:]-]+', '_', 'g'));

  IF _normalized IN ('yorp', 'ypop', 'move', 'data_form') THEN
    RAISE EXCEPTION 'System categories cannot be deleted.';
  END IF;

  -- Serialize category deletion with template writes while the usage check runs.
  LOCK TABLE public.required_document_types IN SHARE ROW EXCLUSIVE MODE;

  PERFORM 1
  FROM public.admin_template_categories AS category
  WHERE category.normalized_name = _normalized
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category was not found.';
  END IF;

  SELECT count(*)
    INTO _usage_count
  FROM public.required_document_types AS document_type
  CROSS JOIN LATERAL unnest(COALESCE(document_type.template_category, ARRAY[]::text[])) AS category(value)
  WHERE lower(regexp_replace(btrim(category.value), '[[:space:]-]+', '_', 'g')) = _normalized;

  IF _usage_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete this category because it is assigned to % template(s).', _usage_count;
  END IF;

  DELETE FROM public.admin_template_categories AS category
  WHERE category.normalized_name = _normalized;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_template_categories(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_template_categories(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_create_template_category(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_template_category(text, text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_delete_template_category(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_template_category(text, text) TO anon, authenticated, service_role;

-- Tighten the search paths on SECURITY DEFINER functions from the immediately
-- preceding section-state migration without rewriting an already-applied file.
ALTER FUNCTION public.admin_get_portal_section_state(text, text)
  SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.admin_set_template_file_size(text, uuid, bigint)
  SET search_path = pg_catalog, public, pg_temp;

NOTIFY pgrst, 'reload schema';
