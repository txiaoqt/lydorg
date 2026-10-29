BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='10s';
WITH targets AS (
 SELECT o.*,split_part(o.name,'/',1) prefix
 FROM storage.objects o WHERE id IN ('59b986c9-4292-4f60-b3f9-ce6245bced5f'::uuid,'4530c287-76ed-4ae3-8bf2-db54e6f38660'::uuid)
)
SELECT jsonb_build_object('captured_at',clock_timestamp(),'read_only',current_setting('transaction_read_only'),'priority_parent_evidence',
 (SELECT jsonb_agg(jsonb_build_object('object_id',o.id,'path_prefix_is_owner_auth_id',o.prefix=coalesce(o.owner_id,o.owner::text),
 'path_prefix_matches_owner_organization',EXISTS(SELECT 1 FROM public.organization_profiles p WHERE p.id::text=o.prefix AND p.user_id::text=coalesce(o.owner_id,o.owner::text)),
 'budget_parent_prefix_matches',(SELECT count(*) FROM public.budget_requests b WHERE b.id::text=o.prefix),
 'liquidation_parent_prefix_matches',(SELECT count(*) FROM public.liquidation_reports l WHERE l.id::text=o.prefix),
 'audit_related_prefix_matches',(SELECT count(*) FROM public.activity_logs a WHERE a.related_id::text=o.prefix),
 'audit_organization_prefix_matches',(SELECT count(*) FROM public.activity_logs a WHERE a.organization_id::text=o.prefix),
 'prefix_occurs_in_audit_metadata',(SELECT count(*) FROM public.activity_logs a WHERE length(o.prefix)>8 AND position(o.prefix IN coalesce(a.metadata::text,''))>0),
 'owner_context_actions',(SELECT jsonb_agg(to_jsonb(g) ORDER BY action,related_type) FROM (
   SELECT a.action,a.related_type,count(*) AS records,min(a.created_at) AS first_at,max(a.created_at) AS last_at
   FROM public.activity_logs a WHERE EXISTS(SELECT 1 FROM public.organization_profiles p WHERE p.id=a.organization_id AND p.user_id::text=coalesce(o.owner_id,o.owner::text))
   GROUP BY a.action,a.related_type
 ) g)) ORDER BY o.id) FROM targets o)) AS priority_parent_review;
ROLLBACK;
