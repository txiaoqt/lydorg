BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='10s';
WITH refs AS (SELECT substr(file_url,length('storage://registration-seed-file/')+1) object_name FROM public.document_submission_files WHERE file_url LIKE 'storage://registration-seed-file/%')
SELECT jsonb_build_object('captured_at',clock_timestamp(),'read_only',current_setting('transaction_read_only'),'sample_reference_rows',count(*),'distinct_objects',count(DISTINCT object_name),
'allowed_by_retained_exact_name_policy',count(*) FILTER(WHERE object_name=ANY(ARRAY['Constitution and By-Laws.pdf','Endorsement.pdf','NYC YORP Registration Form (Form B).pdf','Pasig City YORP Registration Form (Form A).pdf','YORP Directory of Officers and Adviser.pdf','YORP List of Members in Good Standing.pdf'])),
'all_objects_exist',bool_and(EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='registration-seed-file' AND o.name=refs.object_name))) AS sample_reference_review FROM refs;
ROLLBACK;
