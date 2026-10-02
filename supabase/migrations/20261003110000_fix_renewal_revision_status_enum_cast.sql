-- Cast the CASE branches explicitly so Postgres assigns a document status enum
-- instead of resolving the expression as text.
CREATE OR REPLACE FUNCTION public.user_replace_document_submission_file(
  _file_id uuid,
  _new_file_url text,
  _new_file_name text,
  _new_file_type text,
  _new_file_size numeric DEFAULT NULL,
  _submit_for_review boolean DEFAULT true
)
RETURNS public.document_submission_files
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_file record;
  _submission record;
  _owner_id uuid;
  _history jsonb;
  _history_entry jsonb;
  _updated_row public.document_submission_files;
BEGIN
  SELECT * INTO _old_file
  FROM public.document_submission_files
  WHERE id = _file_id;

  IF _old_file.id IS NULL THEN
    RAISE EXCEPTION 'Document file not found.';
  END IF;

  SELECT * INTO _submission
  FROM public.document_submissions
  WHERE id = _old_file.submission_id;

  IF _submission.id IS NULL THEN
    RAISE EXCEPTION 'Parent document submission not found.';
  END IF;

  SELECT user_id INTO _owner_id
  FROM public.organization_profiles
  WHERE id = _submission.organization_id;

  IF _owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own this submission.';
  END IF;

  _history_entry := jsonb_build_object(
    'action', 'replaced',
    'previousFileName', _old_file.file_name,
    'previousFileUrl', _old_file.file_url,
    'previousFileType', _old_file.file_type,
    'previousFileSize', _old_file.file_size,
    'previousStatus', _old_file.admin_status,
    'adminRemarks', _old_file.admin_remarks,
    'reviewedAt', _old_file.reviewed_at,
    'replacedAt', clock_timestamp()
  );

  _history := coalesce(_old_file.revision_history, '[]'::jsonb) || jsonb_build_array(_history_entry);

  UPDATE public.document_submission_files
  SET
    file_url = _new_file_url,
    file_name = _new_file_name,
    file_type = _new_file_type,
    file_size = coalesce(_new_file_size, _old_file.file_size),
    admin_status = CASE
      WHEN _submit_for_review THEN 'submitted'::public.document_submission_status
      ELSE 'draft'::public.document_submission_status
    END,
    admin_remarks = NULL,
    reviewed_at = NULL,
    uploaded_at = clock_timestamp(),
    updated_at = clock_timestamp(),
    revision_history = _history
  WHERE id = _file_id
  RETURNING * INTO _updated_row;

  RETURN _updated_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_replace_document_submission_file(uuid, text, text, text, numeric, boolean)
  TO authenticated, anon, service_role;
