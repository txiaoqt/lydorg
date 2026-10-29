BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='20s';
SELECT clock_timestamp() AS captured_at,current_setting('transaction_read_only') AS read_only,jsonb_agg(to_jsonb(x) ORDER BY relation COLLATE "C") AS preserved_data FROM (
SELECT 'public.budget_request_files' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."budget_request_files" t
UNION ALL
SELECT 'public.budget_requests' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."budget_requests" t
UNION ALL
SELECT 'public.document_submission_files' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."document_submission_files" t
UNION ALL
SELECT 'public.document_submissions' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."document_submissions" t
UNION ALL
SELECT 'public.liquidation_report_files' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."liquidation_report_files" t
UNION ALL
SELECT 'public.liquidation_reports' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."liquidation_reports" t
UNION ALL
SELECT 'public.move_applications' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."move_applications" t
UNION ALL
SELECT 'public.move_files' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."move_files" t
UNION ALL
SELECT 'public.news_releases' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."news_releases" t
UNION ALL
SELECT 'public.organization_accreditations' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."organization_accreditations" t
UNION ALL
SELECT 'public.organization_profiles' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."organization_profiles" t
UNION ALL
SELECT 'public.organization_renewals' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."organization_renewals" t
UNION ALL
SELECT 'public.required_document_types' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."required_document_types" t
UNION ALL
SELECT 'public.ypop_entries' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."ypop_entries" t
UNION ALL
SELECT 'public.ypop_event_files' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."ypop_event_files" t
UNION ALL
SELECT 'public.ypop_event_participations' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."ypop_event_participations" t
UNION ALL
SELECT 'public.ypop_files' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."ypop_files" t
UNION ALL
SELECT 'public.ypop_org_activities' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."ypop_org_activities" t
UNION ALL
SELECT 'public.ypop_org_activity_files' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."ypop_org_activity_files" t
UNION ALL
SELECT 'storage.buckets' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "storage"."buckets" t
UNION ALL
SELECT 'storage.objects' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "storage"."objects" t
) x;
ROLLBACK;
