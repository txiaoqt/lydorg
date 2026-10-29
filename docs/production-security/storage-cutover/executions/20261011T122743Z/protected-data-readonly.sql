BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='20s';
SELECT clock_timestamp() AS captured_at, current_setting('transaction_read_only') AS read_only, jsonb_agg(to_jsonb(x) ORDER BY relation COLLATE "C") AS preserved_data FROM (
SELECT 'public.activity_announcements' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."activity_announcements" t
UNION ALL
SELECT 'public.activity_logs' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."activity_logs" t
UNION ALL
SELECT 'public.admin_accounts' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."admin_accounts" t
UNION ALL
SELECT 'public.admin_portal_change_versions' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."admin_portal_change_versions" t
UNION ALL
SELECT 'public.admin_sessions' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."admin_sessions" t
UNION ALL
SELECT 'public.admin_system_settings' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."admin_system_settings" t
UNION ALL
SELECT 'public.admin_template_categories' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."admin_template_categories" t
UNION ALL
SELECT 'public.admin_ypop_deletion_jobs' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."admin_ypop_deletion_jobs" t
UNION ALL
SELECT 'public.annual_budget_allocations' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."annual_budget_allocations" t
UNION ALL
SELECT 'public.barangays' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."barangays" t
UNION ALL
SELECT 'public.budget_purpose_categories' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."budget_purpose_categories" t
UNION ALL
SELECT 'public.budget_request_files' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."budget_request_files" t
UNION ALL
SELECT 'public.budget_requests' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."budget_requests" t
UNION ALL
SELECT 'public.compliance_remarks' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."compliance_remarks" t
UNION ALL
SELECT 'public.disclosure_documents' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."disclosure_documents" t
UNION ALL
SELECT 'public.document_submission_files' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."document_submission_files" t
UNION ALL
SELECT 'public.document_submissions' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."document_submissions" t
UNION ALL
SELECT 'public.events' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."events" t
UNION ALL
SELECT 'public.inquiries' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."inquiries" t
UNION ALL
SELECT 'public.liquidation_report_files' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."liquidation_report_files" t
UNION ALL
SELECT 'public.liquidation_reports' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."liquidation_reports" t
UNION ALL
SELECT 'public.move_applications' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."move_applications" t
UNION ALL
SELECT 'public.move_files' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."move_files" t
UNION ALL
SELECT 'public.news_categories' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."news_categories" t
UNION ALL
SELECT 'public.news_releases' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."news_releases" t
UNION ALL
SELECT 'public.notifications' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."notifications" t
UNION ALL
SELECT 'public.organization_accreditations' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."organization_accreditations" t
UNION ALL
SELECT 'public.organization_contacts' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."organization_contacts" t
UNION ALL
SELECT 'public.organization_profiles' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."organization_profiles" t
UNION ALL
SELECT 'public.organization_reference_counters' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."organization_reference_counters" t
UNION ALL
SELECT 'public.organization_renewals' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."organization_renewals" t
UNION ALL
SELECT 'public.organization_urn_counters' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."organization_urn_counters" t
UNION ALL
SELECT 'public.organizations' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."organizations" t
UNION ALL
SELECT 'public.policy_versions' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."policy_versions" t
UNION ALL
SELECT 'public.programs' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."programs" t
UNION ALL
SELECT 'public.required_document_types' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."required_document_types" t
UNION ALL
SELECT 'public.roles' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."roles" t
UNION ALL
SELECT 'public.transparency_posts' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."transparency_posts" t
UNION ALL
SELECT 'public.units' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."units" t
UNION ALL
SELECT 'public.urn_review_history' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."urn_review_history" t
UNION ALL
SELECT 'public.user_policy_acceptance' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."user_policy_acceptance" t
UNION ALL
SELECT 'public.user_profiles' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."user_profiles" t
UNION ALL
SELECT 'public.user_roles' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."user_roles" t
UNION ALL
SELECT 'public.yorp_sample_document_assets' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."yorp_sample_document_assets" t
UNION ALL
SELECT 'public.ypop_city_activities' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."ypop_city_activities" t
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
SELECT 'public.ypop_periods' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."ypop_periods" t
UNION ALL
SELECT 'public.ypop_submission_deletion_receipts' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "public"."ypop_submission_deletion_receipts" t
UNION ALL
SELECT 'storage.buckets' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "storage"."buckets" t
UNION ALL
SELECT 'storage.objects' AS relation, count(*) AS row_count, md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM "storage"."objects" t
UNION ALL
SELECT 'auth.users_inventory' AS relation,count(*) AS row_count,md5(coalesce(string_agg(jsonb_build_object('id',id,'email_md5',md5(email),'created_at',created_at,'updated_at',updated_at,'email_confirmed_at',email_confirmed_at,'banned_until',banned_until,'app_metadata_md5',md5(raw_app_meta_data::text),'user_metadata_md5',md5(raw_user_meta_data::text))::text,E'\n' ORDER BY id),'')) AS content_fingerprint FROM auth.users
UNION ALL
SELECT 'auth.identities_inventory' AS relation,count(*) AS row_count,md5(coalesce(string_agg(jsonb_build_object('id',id,'user_id',user_id,'provider',provider,'provider_id_md5',md5(provider_id),'created_at',created_at,'updated_at',updated_at,'identity_data_md5',md5(identity_data::text))::text,E'\n' ORDER BY id),'')) AS content_fingerprint FROM auth.identities
) x;
COMMIT;
