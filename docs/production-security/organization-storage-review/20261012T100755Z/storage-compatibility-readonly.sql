BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='20s';
WITH objects AS (
 SELECT o.id,o.bucket_id,
  encode(sha256(convert_to(o.name,'UTF8')),'hex') AS path_sha256,
  md5(o.metadata::text) AS metadata_md5,
  o.created_at,o.updated_at,
  md5(coalesce(o.owner_id,o.owner::text,'')) AS owner_alias,
  EXISTS(SELECT 1 FROM auth.users u WHERE u.id::text=coalesce(o.owner_id,o.owner::text)) AS owner_auth_exists,
  (SELECT count(*) FROM ytrace_storage_private.resource_references(o.bucket_id,o.name)) AS supported_references,
  (SELECT count(*) FROM public.document_submission_files f JOIN public.document_submissions ds ON ds.id=f.submission_id
   WHERE o.bucket_id='organization-documents' AND
    jsonb_path_exists(coalesce(f.revision_history,'[]'::jsonb),'$.** ? (@ == $url)',jsonb_build_object('url','storage://'||o.bucket_id||'/'||o.name))) AS history_references,
  (ytrace_storage_private.parent_context(o.bucket_id,o.name) IS NOT NULL) AS supported_path_parent,
  (SELECT count(*) FROM public.organization_profiles op WHERE op.user_id::text=coalesce(o.owner_id,o.owner::text)) AS owner_organization_count,
  EXISTS(SELECT 1 FROM public.organization_profiles op WHERE op.user_id::text=coalesce(o.owner_id,o.owner::text) AND op.is_renewal_test_account) AS legacy_test_owner,
  CASE WHEN o.bucket_id='template-files' THEN ytrace_storage_private.is_active_template(o.name)
   WHEN o.bucket_id='news-release-images' THEN ytrace_storage_private.is_published_news_image(o.name)
   ELSE false END AS active_public_reference
 FROM storage.objects o
), functions AS (
 SELECT n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' AS signature,
 md5(pg_get_functiondef(p.oid)) AS source_md5,r.rolname AS owner,p.prosecdef AS security_definer,p.provolatile AS volatility,p.proacl::text AS acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner
 WHERE n.nspname='ytrace_storage_private' OR (n.nspname='public' AND p.proname='admin_authorize_storage_operation')
)
SELECT jsonb_build_object(
 'captured_at',clock_timestamp(),'read_only',current_setting('transaction_read_only'),'database',current_database(),'server_version',current_setting('server_version'),
 'migration_count',(SELECT count(*) FROM supabase_migrations.schema_migrations),
 'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY policyname) FROM pg_policies p WHERE schemaname='storage' AND tablename='objects'),
 'buckets',(SELECT jsonb_agg(jsonb_build_object('id',id,'public',public) ORDER BY id) FROM storage.buckets),
 'objects',(SELECT jsonb_agg(to_jsonb(o) ORDER BY bucket_id,id) FROM objects o),
 'functions',(SELECT jsonb_agg(to_jsonb(f) ORDER BY signature) FROM functions f),
 'templates',(SELECT jsonb_build_object('total',count(*),'active',count(*) FILTER(WHERE is_active),'unresolved_active_storage_references',count(*) FILTER(WHERE is_active AND (template_url LIKE 'storage://%' OR template_url LIKE '%/storage/v1/%') AND ytrace_storage_private.public_asset_reference('template-files',template_url) IS NULL)) FROM public.required_document_types),
 'news',(SELECT jsonb_build_object('total',count(*),'published',count(*) FILTER(WHERE visibility_status::text='published'),'unresolved_published_storage_references',count(*) FILTER(WHERE visibility_status::text='published' AND (preview_image_url LIKE 'storage://%' OR preview_image_url LIKE '%/storage/v1/%') AND ytrace_storage_private.public_asset_reference('news-release-images',preview_image_url) IS NULL)) FROM public.news_releases),
 'business_fingerprints',(SELECT jsonb_agg(jsonb_build_object('table_name',table_name,'count',n,'md5',fingerprint) ORDER BY table_name) FROM (
  SELECT 'document_submission_files' AS table_name,count(*) AS n,md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]'::jsonb)::text) AS fingerprint FROM public.document_submission_files t
  UNION ALL SELECT 'document_submissions',count(*),md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]'::jsonb)::text) FROM public.document_submissions t
  UNION ALL SELECT 'organization_accreditations',count(*),md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]'::jsonb)::text) FROM public.organization_accreditations t
  UNION ALL SELECT 'organization_renewals',count(*),md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]'::jsonb)::text) FROM public.organization_renewals t
 ) s)
) AS storage_review;
COMMIT;
