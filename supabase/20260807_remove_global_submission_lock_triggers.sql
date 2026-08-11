-- Execute this script in Supabase SQL Editor to remove old database triggers
-- that block individual document file uploads while parent submission status is under review.

DROP TRIGGER IF EXISTS document_submission_files_workflow_guard ON public.document_submission_files;
DROP TRIGGER IF EXISTS document_submissions_workflow_guard ON public.document_submissions;
DROP TRIGGER IF EXISTS liquidation_report_files_workflow_guard ON public.liquidation_report_files;
DROP TRIGGER IF EXISTS liquidation_reports_workflow_guard ON public.liquidation_reports;

DROP FUNCTION IF EXISTS public.enforce_document_submission_file_workflow();
DROP FUNCTION IF EXISTS public.enforce_document_submission_status_workflow();
DROP FUNCTION IF EXISTS public.enforce_liquidation_file_workflow();
DROP FUNCTION IF EXISTS public.enforce_liquidation_status_workflow();
