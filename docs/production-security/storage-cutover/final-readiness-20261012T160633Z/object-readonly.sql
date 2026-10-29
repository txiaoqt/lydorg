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
objects_assessed AS MATERIALIZED (
 SELECT o.id,o.bucket_id,o.name,o.owner,o.owner_id,o.created_at,o.updated_at,o.last_accessed_at,
  o.metadata->>'size' AS size,md5(o.metadata::text) AS metadata_md5,
  encode(sha256(convert_to(o.name,'UTF8')),'hex') AS path_sha256,
  ytrace_storage_private.parent_context(o.bucket_id,o.name) AS parent_context,
  (SELECT count(*) FROM ytrace_storage_private.resource_references(o.bucket_id,o.name)) AS supported_references,
  (SELECT count(*) FROM files f WHERE f.file_url='storage://'||o.bucket_id||'/'||o.name) AS current_file_references,
  (SELECT count(*) FROM public.document_submission_files f WHERE o.bucket_id='organization-documents' AND jsonb_path_exists(coalesce(f.revision_history,'[]'::jsonb),'$.** ? (@ == $url)',jsonb_build_object('url','storage://'||o.bucket_id||'/'||o.name))) AS history_references,
  EXISTS(SELECT 1 FROM auth.users u WHERE u.id::text=coalesce(o.owner_id,o.owner::text)) AS owner_auth_exists,
  (SELECT count(*) FROM public.organization_profiles p WHERE p.user_id::text=coalesce(o.owner_id,o.owner::text)) AS owner_organization_count,
  (SELECT coalesce(jsonb_agg(substr(encode(sha256(convert_to(p.id::text,'UTF8')),'hex'),1,16) ORDER BY p.id),'[]'::jsonb) FROM public.organization_profiles p WHERE p.user_id::text=coalesce(o.owner_id,o.owner::text)) AS owner_organization_aliases,
  EXISTS(SELECT 1 FROM public.organization_profiles p WHERE p.user_id::text=coalesce(o.owner_id,o.owner::text) AND p.is_renewal_test_account) AS owner_has_protected_legacy_test_marker
 FROM storage.objects o
 WHERE o.bucket_id IN ('organization-documents','budget-request-files','liquidation-report-files','ypop-files','move-files','template-files')
), projected AS MATERIALIZED (
 SELECT o.*,
  EXISTS(SELECT 1 FROM public.organization_profiles p WHERE p.id::text=o.parent_context->>'organization_id' AND p.user_id::text=coalesce(o.owner_id,o.owner::text) AND p.profile_status::text<>'suspended_inactive') AS ordinary_owner_read_eligible,
  ytrace_storage_private.is_public_avatar(o.bucket_id,o.name,(SELECT x.metadata->>'mimetype' FROM storage.objects x WHERE x.id=o.id),coalesce(o.owner_id,o.owner::text)) AS public_avatar_eligible
 FROM objects_assessed o
), priority AS (
 SELECT p.* FROM projected p WHERE id IN ('59b986c9-4292-4f60-b3f9-ce6245bced5f'::uuid,'4530c287-76ed-4ae3-8bf2-db54e6f38660'::uuid)
)
SELECT jsonb_build_object(
 'captured_at',clock_timestamp(),'read_only',current_setting('transaction_read_only'),
 'storage_inventory',(SELECT jsonb_build_object('objects',count(*),'content_fingerprint',md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),''))) FROM storage.objects t),
 'bucket_inventory',(SELECT jsonb_build_object('buckets',count(*),'content_fingerprint',md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),''))) FROM storage.buckets t),
 'by_bucket',(SELECT jsonb_agg(to_jsonb(x) ORDER BY bucket_id) FROM (
 SELECT bucket_id,count(*) AS objects,count(*) FILTER(WHERE supported_references>0) AS supported,
 count(*) FILTER(WHERE supported_references=0) AS unmatched,
 count(*) FILTER(WHERE supported_references>0 AND ordinary_owner_read_eligible) AS supported_owner_eligible,
 count(*) FILTER(WHERE supported_references>0 AND NOT ordinary_owner_read_eligible AND NOT public_avatar_eligible) AS supported_owner_denied,
 count(*) FILTER(WHERE supported_references=0 AND parent_context IS NOT NULL) AS unmatched_with_parent_context
 FROM projected GROUP BY bucket_id) x),
 'object_projection',(SELECT jsonb_agg(jsonb_build_object('id',id,'bucket_id',bucket_id,'path_sha256',path_sha256,'size',size,'metadata_md5',metadata_md5,'supported_references',supported_references,'current_file_references',current_file_references,'history_references',history_references,'owner_auth_exists',owner_auth_exists,'owner_organization_count',owner_organization_count,'owner_organization_aliases',owner_organization_aliases,'owner_has_protected_legacy_test_marker',owner_has_protected_legacy_test_marker,'parent_context_exists',parent_context IS NOT NULL,'ordinary_owner_read_eligible',ordinary_owner_read_eligible,'public_avatar_eligible',public_avatar_eligible) ORDER BY bucket_id,id) FROM projected),
 'priority_objects',(SELECT jsonb_agg(jsonb_build_object(
  'id',p.id,'bucket_id',p.bucket_id,'path_sha256',p.path_sha256,'created_at',p.created_at,'updated_at',p.updated_at,'metadata_md5',p.metadata_md5,
  'owner_auth_exists',p.owner_auth_exists,'owner_organization_count',p.owner_organization_count,'owner_organization_aliases',p.owner_organization_aliases,'legacy_test_marker',p.owner_has_protected_legacy_test_marker,
  'supported_references',p.supported_references,'current_file_references',p.current_file_references,'history_references',p.history_references,'parent_context_exists',p.parent_context IS NOT NULL,'ordinary_owner_read_eligible',p.ordinary_owner_read_eligible,
  'additional_reference_matches',(SELECT count(*) FROM tokens t WHERE t.reference='storage://'||p.bucket_id||'/'||p.name OR (t.reference LIKE 'https://mqqaykksadotbrghbexz.supabase.co/storage/v1/object/%' AND ytrace_storage_private.url_decode(regexp_replace(t.reference,'^https://mqqaykksadotbrghbexz[.]supabase[.]co/storage/v1/object/(public|authenticated|sign)/',''))=p.bucket_id||'/'||p.name)),
  'audit_exact_uri_matches',(SELECT count(*) FROM public.activity_logs a WHERE position('storage://'||p.bucket_id||'/'||p.name IN coalesce(a.description,'')||coalesce(a.metadata::text,''))>0),
  'audit_exact_path_matches',(SELECT count(*) FROM public.activity_logs a WHERE position(p.name IN coalesce(a.description,'')||coalesce(a.metadata::text,''))>0),
  'audit_owner_context_count',(SELECT count(*) FROM public.activity_logs a WHERE EXISTS(SELECT 1 FROM public.organization_profiles op WHERE op.id=a.organization_id AND op.user_id::text=coalesce(p.owner_id,p.owner::text))),
  'owner_context_is_not_proof_of_file_parent',true
 ) ORDER BY p.id) FROM priority p),
 'projection_only','Read-only metadata projection, not live authorization assertions; no JWT impersonation, signing, or file download was performed.'
) AS storage_readiness;
ROLLBACK;
