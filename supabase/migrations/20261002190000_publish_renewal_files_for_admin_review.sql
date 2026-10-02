-- Renewal uploads stay in draft until the renewal packet is submitted.
-- Promote those files so the admin review queue can see and act on them.
CREATE OR REPLACE FUNCTION public.promote_renewal_submission_files_for_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.submission_scope = 'renewal'
    AND NEW.status::text IN ('submitted', 'resubmitted')
    AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.document_submission_files
    SET
      admin_status = 'under_admin_review',
      reviewed_at = NULL,
      updated_at = clock_timestamp()
    WHERE submission_id = NEW.id
      AND admin_status = 'draft'
      AND NULLIF(trim(file_url), '') IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_renewal_files_for_admin_review
  ON public.document_submissions;
CREATE TRIGGER trg_promote_renewal_files_for_admin_review
AFTER UPDATE OF status ON public.document_submissions
FOR EACH ROW
EXECUTE FUNCTION public.promote_renewal_submission_files_for_review();

-- Repair already-submitted renewal packets whose files remained marked as drafts.
UPDATE public.document_submission_files file
SET
  admin_status = 'under_admin_review',
  reviewed_at = NULL,
  updated_at = clock_timestamp()
FROM public.document_submissions submission
WHERE submission.id = file.submission_id
  AND submission.submission_scope = 'renewal'
  AND submission.status::text IN ('submitted', 'resubmitted')
  AND file.admin_status = 'draft'
  AND NULLIF(trim(file.file_url), '') IS NOT NULL;
