BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='10s';
WITH targets AS (SELECT id,owner,owner_id,split_part(name,'/',1) prefix FROM storage.objects WHERE id IN ('59b986c9-4292-4f60-b3f9-ce6245bced5f'::uuid,'4530c287-76ed-4ae3-8bf2-db54e6f38660'::uuid))
SELECT jsonb_build_object('captured_at',clock_timestamp(),'read_only',current_setting('transaction_read_only'),
 'historical_parent_audits',(SELECT jsonb_agg(jsonb_build_object('object_id',o.id,'audits',coalesce((
  SELECT jsonb_agg(jsonb_build_object('action',a.action,'related_type',a.related_type,'created_at',a.created_at,
   'audit_organization_matches_current_owner',EXISTS(SELECT 1 FROM public.organization_profiles p WHERE p.id=a.organization_id AND p.user_id::text=coalesce(o.owner_id,o.owner::text)),
   'metadata_keys',(SELECT jsonb_agg(k ORDER BY k) FROM jsonb_object_keys(CASE WHEN jsonb_typeof(a.metadata)='object' THEN a.metadata ELSE '{}'::jsonb END) k),
   'metadata_references_other_priority_parent',EXISTS(SELECT 1 FROM targets other WHERE other.id<>o.id AND position(other.prefix IN coalesce(a.metadata::text,''))>0)
  ) ORDER BY a.created_at) FROM public.activity_logs a WHERE a.related_id::text=o.prefix
 ),'[]'::jsonb)) ORDER BY o.id) FROM targets o),
 'budget_delete_rpc',(SELECT jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'acl',p.proacl::text,'source_md5',md5(p.prosrc),'definition',pg_get_functiondef(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='admin_bulk_delete_budget_requests')
) AS cleanup_review;
ROLLBACK;
