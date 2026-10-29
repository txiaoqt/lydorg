BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='10s';
WITH target AS (SELECT o.*,ytrace_storage_private.parent_context(o.bucket_id,o.name) ctx FROM storage.objects o WHERE id='d60a9a20-5ed2-443f-aef8-2a5468ca7840'::uuid)
SELECT jsonb_build_object('captured_at',clock_timestamp(),'read_only',current_setting('transaction_read_only'),
'object_id',o.id,'path_sha256',encode(sha256(convert_to(o.name,'UTF8')),'hex'),
'context_kind',o.ctx->>'kind','context_status',o.ctx->>'status',
'context_organization_exists',EXISTS(SELECT 1 FROM public.organization_profiles op WHERE op.id::text=o.ctx->>'organization_id'),
'context_owner_matches_storage_owner',EXISTS(SELECT 1 FROM public.organization_profiles op WHERE op.id::text=o.ctx->>'organization_id' AND op.user_id::text=coalesce(o.owner_id,o.owner::text)),
'context_organization_suspended',EXISTS(SELECT 1 FROM public.organization_profiles op WHERE op.id::text=o.ctx->>'organization_id' AND op.profile_status::text='suspended_inactive'),
'linked_metadata',(SELECT jsonb_agg(jsonb_build_object('resource_kind',r.resource_kind,'reviewable',r.reviewable,'resource_organization_matches_path',r.organization_id::text=o.ctx->>'organization_id','resource_owner_matches_storage_owner',EXISTS(SELECT 1 FROM public.organization_profiles op WHERE op.id=r.organization_id AND op.user_id::text=coalesce(o.owner_id,o.owner::text)),'resource_organization_suspended',EXISTS(SELECT 1 FROM public.organization_profiles op WHERE op.id=r.organization_id AND op.profile_status::text='suspended_inactive'))) FROM ytrace_storage_private.resource_references(o.bucket_id,o.name) r)
) AS owner_access_exception FROM target o;
ROLLBACK;
