-- Migration: 20260913000000_fix_document_submissions_reviewed_by_fk.sql
-- Purpose: Align document_submissions.reviewed_by foreign key target with the
-- application's custom Admin authentication architecture.
--
-- In this application, administrator accounts and authentication are hand-rolled
-- and decoupled from Supabase Auth (auth.users). Admin accounts reside in
-- public.admin_accounts, with sessions in public.admin_sessions.
--
-- The legacy document_submissions_reviewed_by_fkey constraint erroneously referenced
-- auth.users(id), causing review mutations (e.g. update_admin_document_submission_file_review,
-- admin_request_renewal_revision, admin_reject_renewal, admin_approve_renewal) to fail
-- with foreign key violation code 23503 when writing the authenticated admin UUID.
--
-- This migration retargets the foreign key to public.admin_accounts(id) ON DELETE SET NULL,
-- matching the authoritative architecture used by organization_renewals.reviewed_by,
-- organization_accreditations.approved_by, and activity_logs.actor_user_id.

-- 1. Pre-flight data safety: defensively null only genuinely orphaned reviewer IDs
-- before applying the new constraint. Valid reviewer IDs in public.admin_accounts
-- are preserved.
UPDATE public.document_submissions
SET reviewed_by = NULL
WHERE reviewed_by IS NOT NULL
  AND reviewed_by NOT IN (
    SELECT id
    FROM public.admin_accounts
  );

-- 2. Drop the legacy foreign key constraint pointing to auth.users
ALTER TABLE public.document_submissions
DROP CONSTRAINT IF EXISTS document_submissions_reviewed_by_fkey;

-- 3. Create the correct foreign key constraint referencing public.admin_accounts(id)
ALTER TABLE public.document_submissions
ADD CONSTRAINT document_submissions_reviewed_by_fkey
FOREIGN KEY (reviewed_by)
REFERENCES public.admin_accounts(id)
ON DELETE SET NULL;

COMMENT ON CONSTRAINT document_submissions_reviewed_by_fkey ON public.document_submissions IS
  'References the reviewing administrator account in public.admin_accounts.';
