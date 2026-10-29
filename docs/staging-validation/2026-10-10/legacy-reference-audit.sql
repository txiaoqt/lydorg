-- READ-ONLY aggregate legacy Storage reference audit. Counts only: no object
-- names, paths, URLs, organization names, emails or signed links are returned.
-- Run inside a read-only transaction. Safe for production and staging.
begin transaction read only;
with
uuid_re as (select '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text as re),
asset_refs as (
  select 'news' as kind, 'news-release-images' as bucket, preview_image_url as url, visibility_status::text='published' as live_flag from public.news_releases
  union all select 'template','template-files',template_url,is_active from public.required_document_types
),
asset_summary as (
  select kind, live_flag,
    case when nullif(btrim(coalesce(url,'')),'') is null then 'empty'
         when url like 'storage://'||bucket||'/%' then 'canonical'
         when url like 'storage://%' then 'canonical-wrong-bucket'
         when url ~ ('^https://[a-z]{20}\.supabase\.co/storage/v1/object/public/'||bucket||'/') then
           case when substring(url from '^https://([a-z]{20})\.supabase\.co') = 'mqqaykksadotbrghbexz' then 'legacy-public-url:this-project' else 'legacy-public-url:other-project' end
         when url ~ '/storage/v1/object/(sign|authenticated)/' then 'legacy-signed-or-auth-url'
         when url ~ '/storage/v1/' then 'other-storage-url'
         when url ~ '%[0-9A-Fa-f]{2}' then 'external-encoded'
         else 'external' end as form,
    count(*) as total,
    count(*) filter (where url ~ '%[0-9A-Fa-f]{2}') as percent_encoded
  from asset_refs group by 1,2,3
),
private_refs as (
  select 'registration' as kind, 'organization-documents' as bucket, f.file_url as url, ds.organization_id as org, op.user_id as owner_user, f.admin_status::text as state
    from public.document_submission_files f join public.document_submissions ds on ds.id=f.submission_id join public.organization_profiles op on op.id=ds.organization_id
    where coalesce(ds.submission_scope,'')<>'renewal'
  union all select 'renewal','organization-documents',f.file_url,ds.organization_id,op.user_id,f.admin_status::text
    from public.document_submission_files f join public.document_submissions ds on ds.id=f.submission_id join public.organization_profiles op on op.id=ds.organization_id
    where ds.submission_scope='renewal'
  union all select 'profile-image','organization-documents',op.profile_image_url,op.id,op.user_id,op.profile_status::text from public.organization_profiles op where op.profile_image_url is not null and op.profile_image_url<>''
  union all select 'budget','budget-request-files',f.file_url,b.organization_id,op.user_id,b.status::text
    from public.budget_request_files f join public.budget_requests b on b.id=f.budget_request_id join public.organization_profiles op on op.id=b.organization_id
  union all select 'liquidation','liquidation-report-files',f.file_url,l.organization_id,op.user_id,l.status::text
    from public.liquidation_report_files f join public.liquidation_reports l on l.id=f.liquidation_report_id join public.organization_profiles op on op.id=l.organization_id
  union all select 'ypop-entry','ypop-files',f.file_url,e.organization_id,op.user_id,e.status::text
    from public.ypop_files f join public.ypop_entries e on e.id=f.ypop_entry_id join public.organization_profiles op on op.id=e.organization_id
  union all select 'ypop-city-proof','ypop-files',f.file_url,p.organization_id,op.user_id,p.status::text
    from public.ypop_event_files f join public.ypop_event_participations p on p.id=f.participation_id join public.organization_profiles op on op.id=p.organization_id
  union all select 'ypop-org-activity','ypop-files',f.file_url,a.organization_id,op.user_id,a.status::text
    from public.ypop_org_activity_files f join public.ypop_org_activities a on a.id=f.org_activity_id join public.organization_profiles op on op.id=a.organization_id
  union all select 'move','move-files',f.file_url,a.organization_id,op.user_id,a.status::text
    from public.move_files f join public.move_applications a on a.id=f.application_id join public.organization_profiles op on op.id=a.organization_id
),
private_parsed as (
  select r.*,
    case when r.url like 'storage://'||r.bucket||'/%' then substr(r.url,length('storage://'||r.bucket||'/')+1) end as object_name
  from private_refs r
),
private_joined as (
  select p.*, o.id is not null as object_exists, coalesce(o.owner_id,o.owner::text) as obj_owner, o.owner_id is null as owner_id_null,
    (o.owner is not null and o.owner_id is not null and o.owner::text<>o.owner_id) as owner_fields_disagree
  from private_parsed p left join storage.objects o on o.bucket_id=p.bucket and o.name=p.object_name
),
private_summary as (
  select kind,
    count(*) as references_total,
    count(*) filter (where url like 'storage://%') as canonical,
    count(*) filter (where url ~ '^https?://') as http_reference,
    count(*) filter (where url not like 'storage://%' and url !~ '^https?://') as other_form,
    count(*) filter (where object_name is not null and object_exists) as object_exists,
    count(*) filter (where object_name is not null and not object_exists) as object_missing,
    count(*) filter (where object_exists and obj_owner = owner_user::text) as owner_matches_parent_org_user,
    count(*) filter (where object_exists and obj_owner is distinct from owner_user::text) as owner_mismatch,
    count(*) filter (where object_exists and obj_owner is null) as owner_null,
    count(*) filter (where object_exists and owner_id_null) as owner_id_null_legacy_owner_only,
    count(*) filter (where owner_fields_disagree) as owner_owner_id_disagree,
    count(*) filter (where object_name is not null and kind in ('budget','liquidation','ypop-entry','ypop-city-proof','ypop-org-activity','move')
      and split_part(object_name,'/',1) !~ (select re from uuid_re)) as non_uuid_parent_prefix,
    count(*) filter (where object_name is not null and kind in ('registration','renewal','profile-image') and split_part(object_name,'/',1) <> org::text) as wrong_org_prefix
  from private_joined
  group by kind
),
state_summary as (
  select kind, state, count(*) as total from private_refs group by 1,2
),
ambiguous as (
  select bucket, object_name, count(distinct org) as orgs, count(*) as refs from private_parsed where object_name is not null group by 1,2
),
revision_refs as (
  select count(*) as rows_with_history,
    sum(jsonb_array_length(case when jsonb_typeof(f.revision_history)='array' then f.revision_history else '[]'::jsonb end)) as history_entries,
    count(*) filter (where f.revision_history::text ~ 'https?://') as rows_with_http_in_history,
    count(*) filter (where f.revision_history::text like '%storage://organization-documents/%') as rows_with_canonical_in_history
  from public.document_submission_files f where f.revision_history is not null and f.revision_history::text <> '[]'
),
object_summary as (
  select o.bucket_id,
    count(*) as objects,
    count(*) filter (where o.owner_id is null and o.owner is null) as unowned,
    count(*) filter (where o.owner_id is null and o.owner is not null) as legacy_owner_only,
    count(*) filter (where o.owner is not null and o.owner_id is not null and o.owner::text<>o.owner_id) as owner_disagree,
    count(*) filter (where not exists (select 1 from private_parsed p where p.bucket=o.bucket_id and p.object_name=o.name)
                       and not exists (select 1 from asset_refs a where a.bucket=o.bucket_id and (a.url='storage://'||o.bucket_id||'/'||o.name or a.url like '%/storage/v1/object/public/'||o.bucket_id||'/'||o.name))) as unreferenced
  from storage.objects o
  where o.bucket_id in ('organization-documents','budget-request-files','liquidation-report-files','ypop-files','move-files','template-files','news-release-images')
  group by 1
)
select json_build_object(
  'captured_at', now(),
  'asset_references', (select json_agg(a order by kind, live_flag, form) from asset_summary a),
  'private_references', (select json_agg(p order by kind) from private_summary p),
  'private_reference_states', (select json_agg(s order by kind, state) from state_summary s),
  'ambiguous_cross_org_objects', (select count(*) from ambiguous where orgs>1),
  'objects_referenced_more_than_once', (select count(*) from ambiguous where refs>1),
  'registration_revision_history', (select row_to_json(r) from revision_refs r),
  'objects_by_bucket', (select json_agg(o order by bucket_id) from object_summary o),
  'profile_images_published_candidates', (select count(*) from public.organization_profiles op where op.profile_status::text='verified' and op.directory_visibility and op.profile_image_url like 'storage://organization-documents/%'),
  'profile_images_published_with_image_mime', (select count(*) from public.organization_profiles op join storage.objects o on o.bucket_id='organization-documents' and 'storage://organization-documents/'||o.name=op.profile_image_url
     where op.profile_status::text='verified' and op.directory_visibility and o.metadata->>'mimetype' in ('image/jpeg','image/png','image/webp') and split_part(o.name,'/',2)='profile' and split_part(o.name,'/',1)=op.id::text and coalesce(o.owner_id,o.owner::text)=op.user_id::text),
  'suspended_organizations', (select count(*) from public.organization_profiles where profile_status::text='suspended_inactive')
) as audit;
commit;
