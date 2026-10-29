BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL statement_timeout='20s';
WITH roots AS (SELECT 'activity_announcements'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."activity_announcements" t
UNION ALL
SELECT 'admin_template_categories'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."admin_template_categories" t
UNION ALL
SELECT 'admin_ypop_deletion_jobs'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."admin_ypop_deletion_jobs" t
UNION ALL
SELECT 'annual_budget_allocations'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."annual_budget_allocations" t
UNION ALL
SELECT 'barangays'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."barangays" t
UNION ALL
SELECT 'budget_purpose_categories'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."budget_purpose_categories" t
UNION ALL
SELECT 'budget_request_files'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."budget_request_files" t
UNION ALL
SELECT 'budget_requests'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."budget_requests" t
UNION ALL
SELECT 'compliance_remarks'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."compliance_remarks" t
UNION ALL
SELECT 'disclosure_documents'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."disclosure_documents" t
UNION ALL
SELECT 'document_submission_files'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."document_submission_files" t
UNION ALL
SELECT 'document_submissions'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."document_submissions" t
UNION ALL
SELECT 'events'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."events" t
UNION ALL
SELECT 'inquiries'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."inquiries" t
UNION ALL
SELECT 'liquidation_report_files'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."liquidation_report_files" t
UNION ALL
SELECT 'liquidation_reports'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."liquidation_reports" t
UNION ALL
SELECT 'move_applications'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."move_applications" t
UNION ALL
SELECT 'move_files'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."move_files" t
UNION ALL
SELECT 'news_categories'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."news_categories" t
UNION ALL
SELECT 'news_releases'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."news_releases" t
UNION ALL
SELECT 'notifications'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."notifications" t
UNION ALL
SELECT 'organization_accreditations'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."organization_accreditations" t
UNION ALL
SELECT 'organization_contacts'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."organization_contacts" t
UNION ALL
SELECT 'organization_profiles'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."organization_profiles" t
UNION ALL
SELECT 'organization_reference_counters'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."organization_reference_counters" t
UNION ALL
SELECT 'organization_renewals'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."organization_renewals" t
UNION ALL
SELECT 'organization_urn_counters'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."organization_urn_counters" t
UNION ALL
SELECT 'organizations'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."organizations" t
UNION ALL
SELECT 'programs'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."programs" t
UNION ALL
SELECT 'required_document_types'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."required_document_types" t
UNION ALL
SELECT 'transparency_posts'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."transparency_posts" t
UNION ALL
SELECT 'units'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."units" t
UNION ALL
SELECT 'urn_review_history'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."urn_review_history" t
UNION ALL
SELECT 'yorp_sample_document_assets'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."yorp_sample_document_assets" t
UNION ALL
SELECT 'ypop_city_activities'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."ypop_city_activities" t
UNION ALL
SELECT 'ypop_entries'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."ypop_entries" t
UNION ALL
SELECT 'ypop_event_files'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."ypop_event_files" t
UNION ALL
SELECT 'ypop_event_participations'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."ypop_event_participations" t
UNION ALL
SELECT 'ypop_files'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."ypop_files" t
UNION ALL
SELECT 'ypop_org_activities'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."ypop_org_activities" t
UNION ALL
SELECT 'ypop_org_activity_files'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."ypop_org_activity_files" t
UNION ALL
SELECT 'ypop_periods'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."ypop_periods" t
UNION ALL
SELECT 'ypop_submission_deletion_receipts'::text AS source, to_jsonb(t)->>'id' AS row_id,to_jsonb(t)->>'organization_id' AS organization_id, to_jsonb(t)->>'status' AS status,to_jsonb(t) AS payload FROM public."ypop_submission_deletion_receipts" t),
tokens AS (
 SELECT DISTINCT r.source,r.row_id,r.organization_id,r.status,
 split_part(split_part(j.v #>> '{}','?',1),'#',1) AS reference
 FROM roots r CROSS JOIN LATERAL jsonb_path_query(r.payload,'$.** ? (@.type() == "string")') AS j(v)
 WHERE (j.v #>> '{}') LIKE 'storage://%' OR (j.v #>> '{}') LIKE '%/storage/v1/%'
),
parents AS (
 SELECT 'document_submissions'::text AS source,ds.id,ds.organization_id,ds.status::text AS status,ds.created_at,ds.updated_at,
 jsonb_build_object('scope',ds.submission_scope,'renewal_id',ds.renewal_id,'revision_locked',ds.revision_locked,'revision_locked_at',ds.revision_locked_at,'revision_due_at',ds.revision_due_at,'revision_unlocked_at',ds.revision_unlocked_at) AS details FROM public.document_submissions ds
 UNION ALL SELECT 'budget_requests',b.id,b.organization_id,b.status::text,b.created_at,b.updated_at,'{}'::jsonb FROM public.budget_requests b
 UNION ALL SELECT 'liquidation_reports',l.id,l.organization_id,l.status::text,l.created_at,l.updated_at,jsonb_build_object('budget_request_id',l.budget_request_id) FROM public.liquidation_reports l
 UNION ALL SELECT 'ypop_entries',e.id,e.organization_id,e.status::text,e.created_at,e.updated_at,'{}'::jsonb FROM public.ypop_entries e
 UNION ALL SELECT 'ypop_event_participations',e.id,e.organization_id,e.status::text,e.joined_at,e.updated_at,'{}'::jsonb FROM public.ypop_event_participations e
 UNION ALL SELECT 'ypop_org_activities',e.id,e.organization_id,e.status::text,e.created_at,e.updated_at,jsonb_build_object('ypop_entry_id',e.ypop_entry_id) FROM public.ypop_org_activities e
 UNION ALL SELECT 'move_applications',e.id,e.organization_id,e.status::text,e.created_at,e.updated_at,'{}'::jsonb FROM public.move_applications e
),
files AS (
 SELECT 'document_submission_files'::text AS source,f.id,f.submission_id AS parent_id,ds.organization_id,
 f.file_url,f.file_name,f.admin_status::text AS status,
 jsonb_build_object('document_type_id',f.document_type_id,'scope',ds.submission_scope,'renewal_id',ds.renewal_id,'revision_history',f.revision_history,'parent_status',ds.status,'revision_locked',f.revision_locked,'revision_locked_at',f.revision_locked_at,'revision_due_at',f.revision_due_at,'revision_unlocked_at',f.revision_unlocked_at) AS details
 FROM public.document_submission_files f LEFT JOIN public.document_submissions ds ON ds.id=f.submission_id
 UNION ALL SELECT 'budget_request_files',f.id,f.budget_request_id,b.organization_id,f.file_url,f.file_name,b.status::text,'{}'::jsonb FROM public.budget_request_files f LEFT JOIN public.budget_requests b ON b.id=f.budget_request_id
 UNION ALL SELECT 'liquidation_report_files',f.id,f.liquidation_report_id,b.organization_id,f.file_url,f.file_name,b.status::text,'{}'::jsonb FROM public.liquidation_report_files f LEFT JOIN public.liquidation_reports b ON b.id=f.liquidation_report_id
 UNION ALL SELECT 'ypop_files',f.id,f.ypop_entry_id,f.organization_id,f.file_url,f.file_name,b.status::text,jsonb_build_object('parent_organization_id',b.organization_id) FROM public.ypop_files f LEFT JOIN public.ypop_entries b ON b.id=f.ypop_entry_id
 UNION ALL SELECT 'ypop_event_files',f.id,f.participation_id,f.organization_id,f.file_url,f.file_name,b.status::text,jsonb_build_object('parent_organization_id',b.organization_id) FROM public.ypop_event_files f LEFT JOIN public.ypop_event_participations b ON b.id=f.participation_id
 UNION ALL SELECT 'ypop_org_activity_files',f.id,f.org_activity_id,f.organization_id,f.file_url,f.file_name,b.status::text,jsonb_build_object('parent_organization_id',b.organization_id) FROM public.ypop_org_activity_files f LEFT JOIN public.ypop_org_activities b ON b.id=f.org_activity_id
 UNION ALL SELECT 'move_files',f.id,f.application_id,f.organization_id,f.file_url,f.file_name,b.status::text,jsonb_build_object('parent_organization_id',b.organization_id) FROM public.move_files f LEFT JOIN public.move_applications b ON b.id=f.application_id
),
normalized AS (
 SELECT f.source,f.id,f.organization_id,
 CASE WHEN f.file_url LIKE 'storage://%' THEN 'canonical'
 WHEN f.file_url ~ '^https://mqqaykksadotbrghbexz[.]supabase[.]co/storage/v1/object/(public|sign|authenticated)/' THEN 'trusted-legacy-http'
 WHEN nullif(btrim(f.file_url),'') IS NULL THEN 'empty' ELSE 'external-or-other' END form,
 CASE WHEN f.file_url LIKE 'storage://%' THEN substr(f.file_url,11)
 WHEN f.file_url ~ '^https://mqqaykksadotbrghbexz[.]supabase[.]co/storage/v1/object/(public|sign|authenticated)/'
 THEN ytrace_storage_private.url_decode(regexp_replace(split_part(split_part(f.file_url,'?',1),'#',1),'^https://mqqaykksadotbrghbexz[.]supabase[.]co/storage/v1/object/(public|sign|authenticated)/',''))
 ELSE NULL END ref
 FROM files f
), links AS (
 SELECT n.*,split_part(n.ref,'/',1) bucket,substr(n.ref,position('/' IN n.ref)+1) object_name
 FROM normalized n
), checked AS (
 SELECT l.*,o.id AS object_id,o.bucket_id IS NOT NULL AS object_exists,
 CASE WHEN o.bucket_id IN ('organization-documents','budget-request-files','liquidation-report-files','ypop-files','move-files')
 THEN EXISTS(SELECT 1 FROM ytrace_storage_private.resource_references(o.bucket_id,o.name) r WHERE r.organization_id=l.organization_id)
 ELSE NULL END private_metadata_supported,
 CASE WHEN o.bucket_id='registration-seed-file' THEN EXISTS(SELECT 1 FROM pg_policies p WHERE p.schemaname='storage' AND p.tablename='objects' AND p.policyname='yorp_sample_seed_assets_read') ELSE NULL END sample_policy_retained
 FROM links l LEFT JOIN storage.objects o ON o.bucket_id=l.bucket AND o.name=l.object_name
)
SELECT jsonb_build_object('captured_at',clock_timestamp(),'read_only',current_setting('transaction_read_only'),
 'current_file_rows',(SELECT count(*) FROM checked),
 'reference_groups',(SELECT jsonb_agg(to_jsonb(g) ORDER BY source,form,bucket,object_exists) FROM (
 SELECT source,form,bucket,object_exists,private_metadata_supported,sample_policy_retained,count(*) AS rows
 FROM checked GROUP BY source,form,bucket,object_exists,private_metadata_supported,sample_policy_retained) g),
 'current_existing_private_links_unsupported',(SELECT count(*) FROM checked WHERE object_exists AND bucket IN ('organization-documents','budget-request-files','liquidation-report-files','ypop-files','move-files') AND private_metadata_supported IS DISTINCT FROM true),
 'existing_current_avatar_links',(SELECT jsonb_agg(jsonb_build_object('canonical_reference',p.profile_image_url='storage://organization-documents/'||o.name,'published_eligible',ytrace_storage_private.is_public_avatar(o.bucket_id,o.name,o.metadata->>'mimetype',coalesce(o.owner_id,o.owner::text)),'owner_matches',p.user_id::text=coalesce(o.owner_id,o.owner::text),'profile_suspended',p.profile_status::text='suspended_inactive')) FROM public.organization_profiles p JOIN storage.objects o ON o.bucket_id='organization-documents' AND (p.profile_image_url='storage://organization-documents/'||o.name OR p.profile_image_url='https://mqqaykksadotbrghbexz.supabase.co/storage/v1/object/public/organization-documents/'||o.name))
) AS current_reference_review;
ROLLBACK;
