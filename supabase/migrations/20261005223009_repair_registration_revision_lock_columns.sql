-- The replacement RPC clears this timestamp, but the original deadline
-- migration omitted it on document_submission_files.
alter table public.document_submission_files
  add column if not exists revision_locked_at timestamptz default null;

notify pgrst, 'reload schema';
