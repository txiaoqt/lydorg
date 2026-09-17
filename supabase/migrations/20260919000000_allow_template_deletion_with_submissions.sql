-- Migration: Allow Permanent Template Deletion When Submissions Exist (ON DELETE SET NULL)
-- File: 20260919000000_allow_template_deletion_with_submissions.sql
--
-- Purpose:
--   1. Change foreign key on document_submission_files(document_type_id) to ON DELETE SET NULL.
--   2. Ensure document_submission_files.document_type_id is nullable.
--   3. Update hard_delete_admin_template_document RPC to remove the blocking file count check,
--      allowing admins to permanently delete any supported-status template without breaking
--      historical registration/renewal document submission files.
--   4. Preserve all submitted evidence files, file URLs, review statuses, and admin remarks.

-- ==============================================================================
-- 1. FOREIGN KEY AND NULLABILITY ADJUSTMENT
-- ==============================================================================

DO $$
DECLARE
    _fk_name text;
BEGIN
    -- Find and drop any existing FK constraint referencing required_document_types(id)
    FOR _fk_name IN (
        SELECT tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'document_submission_files'
          AND kcu.column_name = 'document_type_id'
          AND ccu.table_name = 'required_document_types'
    ) LOOP
        EXECUTE 'ALTER TABLE public.document_submission_files DROP CONSTRAINT ' || quote_ident(_fk_name);
    END LOOP;
END $$;

-- Ensure document_type_id column in document_submission_files is nullable
ALTER TABLE public.document_submission_files
    ALTER COLUMN document_type_id DROP NOT NULL;

-- Re-create the foreign key with ON DELETE SET NULL
ALTER TABLE public.document_submission_files
    ADD CONSTRAINT document_submission_files_document_type_id_fkey
    FOREIGN KEY (document_type_id)
    REFERENCES public.required_document_types(id)
    ON DELETE SET NULL;

-- ==============================================================================
-- 2. REDEFINE HARD DELETE ADMIN TEMPLATE DOCUMENT RPC
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.hard_delete_admin_template_document(
  _session_token text,
  _template_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_id uuid;
BEGIN
  -- Authenticate admin session
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  -- Ensure any referencing submitted files are safely disassociated (document_type_id set to NULL)
  -- while preserving original file names, file URLs, review statuses, and remarks
  UPDATE public.document_submission_files
  SET document_type_id = NULL
  WHERE document_submission_files.document_type_id = _template_id;

  -- Permanently delete the required document type record
  DELETE FROM public.required_document_types
  WHERE required_document_types.id = _template_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hard_delete_admin_template_document(text, uuid) TO anon, authenticated, service_role;
