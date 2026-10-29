BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Rename a custom Forms & Templates category and its assignments as one
-- transaction. System category keys remain fixed because application workflows
-- depend on those identifiers.
CREATE OR REPLACE FUNCTION public.admin_rename_template_category(
  _session_token text,
  _current_normalized_name text,
  _next_normalized_name text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  _current text := lower(regexp_replace(btrim(_current_normalized_name), '[[:space:]-]+', '_', 'g'));
  _next text := lower(regexp_replace(btrim(_next_normalized_name), '[[:space:]-]+', '_', 'g'));
BEGIN
  PERFORM public.authorize_admin_template_category_registry(_session_token, true);

  IF _current IS NULL OR _current = '' OR _next IS NULL OR _next = '' THEN
    RAISE EXCEPTION 'Category name cannot be empty.';
  END IF;
  IF _current IN ('yorp', 'ypop', 'move', 'data_form')
     OR _next IN ('yorp', 'ypop', 'move', 'data_form') THEN
    RAISE EXCEPTION 'System categories cannot be renamed.';
  END IF;

  -- Keep category assignment writes serialized with template mutations and
  -- other category changes while checking collisions and updating both tables.
  LOCK TABLE public.required_document_types IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE public.admin_template_categories IN SHARE ROW EXCLUSIVE MODE;

  PERFORM 1
  FROM public.admin_template_categories AS category
  WHERE category.normalized_name = _current
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category was not found.';
  END IF;

  IF _current = _next THEN
    RETURN _current;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.admin_template_categories AS category
    WHERE category.normalized_name = _next
  ) OR EXISTS (
    SELECT 1
    FROM public.required_document_types AS document_type
    CROSS JOIN LATERAL unnest(COALESCE(document_type.template_category, ARRAY[]::text[])) AS category(value)
    WHERE lower(regexp_replace(btrim(category.value), '[[:space:]-]+', '_', 'g')) = _next
  ) THEN
    RAISE EXCEPTION 'A category with that name already exists.';
  END IF;

  UPDATE public.required_document_types AS document_type
  SET template_category = ARRAY(
        SELECT CASE
          WHEN lower(regexp_replace(btrim(category.value), '[[:space:]-]+', '_', 'g')) = _current
            THEN _next
          ELSE category.value
        END
        FROM unnest(COALESCE(document_type.template_category, ARRAY[]::text[]))
          WITH ORDINALITY AS category(value, ordinal)
        ORDER BY category.ordinal
      ),
      updated_at = now()
  WHERE EXISTS (
    SELECT 1
    FROM unnest(COALESCE(document_type.template_category, ARRAY[]::text[])) AS category(value)
    WHERE lower(regexp_replace(btrim(category.value), '[[:space:]-]+', '_', 'g')) = _current
  );

  UPDATE public.admin_template_categories AS category
  SET normalized_name = _next,
      updated_at = now()
  WHERE category.normalized_name = _current;

  RETURN _next;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_rename_template_category(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_rename_template_category(text, text, text)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
