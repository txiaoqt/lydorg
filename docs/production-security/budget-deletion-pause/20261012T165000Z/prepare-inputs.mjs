// Local preparation only. Reads captured metadata; no environment files or network.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const dir = 'docs/production-security/budget-deletion-pause/20261012T165000Z';
const sha = b => createHash('sha256').update(b).digest('hex');
const read = p => readFile(p, 'utf8');
const save = (p, v) => writeFile(`${dir}/${p}`, typeof v === 'string' ? v : JSON.stringify(v, null, 2)+'\n');
await mkdir(dir, {recursive:true});
const paths = ['src/lib/lydo-connect-supabase.ts', 'src/admin/AdminPortal.tsx', 'src/admin/components/BudgetRequestsTable.tsx', 'src/lib/admin-budget-request-deletion.test.ts', 'src/admin/components/BudgetRequestsTableSelection.test.tsx'];
const base = [];
for (const p of paths) {
 const bytes=await readFile(p); base.push({path:p,sha256:sha(bytes),bytes:bytes.length});
 const dest=`${dir}/original-local/${p}`; await mkdir(dest.slice(0,dest.lastIndexOf('/')),{recursive:true}); await copyFile(p,dest);
}
await save('original-local-identities.json', base);
const trace=JSON.parse(await read('.agent/security/production-storage-review/20261011T113322Z/object-trace.json'));
const old=trace.organizations.map(o=>({id:o.id,user_id:o.user_id,created_at:o.created_at,profile_status:o.profile_status,directory_visibility:o.directory_visibility,avatar_sha256:o.profile_image_url?sha(o.profile_image_url):null}));
const literal = v => "'"+v.replaceAll("'","''")+"'";
await save('profile-reconciliation-readonly.sql', `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='20s';
WITH old AS (SELECT * FROM jsonb_to_recordset(${literal(JSON.stringify(old))}::jsonb) AS x(id uuid,user_id uuid,created_at timestamptz,profile_status text,directory_visibility boolean,avatar_sha256 text)),
added AS (SELECT p.* FROM public.organization_profiles p LEFT JOIN old o USING(id) WHERE o.id IS NULL)
SELECT jsonb_build_object(
 'captured_at',clock_timestamp(),'read_only',current_setting('transaction_read_only'),
 'original_count',(SELECT count(*) FROM old),'current_count',(SELECT count(*) FROM public.organization_profiles),
 'missing_original_profiles',(SELECT count(*) FROM old o LEFT JOIN public.organization_profiles p USING(id) WHERE p.id IS NULL),
 'original_identity_changes',(SELECT count(*) FROM old o JOIN public.organization_profiles p USING(id) WHERE o.user_id IS DISTINCT FROM p.user_id OR o.created_at IS DISTINCT FROM p.created_at),
 'original_reviewed_field_changes',(SELECT count(*) FROM old o JOIN public.organization_profiles p USING(id) WHERE o.profile_status IS DISTINCT FROM p.profile_status::text OR o.directory_visibility IS DISTINCT FROM p.directory_visibility OR o.avatar_sha256 IS DISTINCT FROM CASE WHEN p.profile_image_url IS NULL THEN NULL ELSE encode(sha256(convert_to(p.profile_image_url,'UTF8')),'hex') END),
 'added_profiles',(SELECT coalesce(jsonb_agg(jsonb_build_object(
   'profile_alias',left(encode(sha256(convert_to(p.id::text,'UTF8')),'hex'),16),
   'owner_alias',left(encode(sha256(convert_to(p.user_id::text,'UTF8')),'hex'),16),
   'created_at',p.created_at,'updated_at',p.updated_at,'profile_status',p.profile_status,
   'identity_fields_complete',p.organization_name IS NOT NULL AND p.organization_email IS NOT NULL,
   'test_marker',p.is_renewal_test_account,'seed_marker',p.is_seeded_sample_data,'urn_present',p.urn IS NOT NULL,
   'accreditation_present',p.current_accreditation_id IS NOT NULL,
   'auth', (SELECT jsonb_build_object('exists',true,'created_at',u.created_at,'updated_at',u.updated_at,'last_sign_in_at',u.last_sign_in_at,'aud',u.aud,'role',u.role,'super_admin',u.is_super_admin,'banned',u.banned_until>now(),'deleted',u.deleted_at IS NOT NULL,'providers',u.raw_app_meta_data->'providers','provider',u.raw_app_meta_data->>'provider') FROM auth.users u WHERE u.id=p.user_id),
   'identities',(SELECT jsonb_agg(jsonb_build_object('provider',i.provider,'created_at',i.created_at,'updated_at',i.updated_at,'last_sign_in_at',i.last_sign_in_at,'email_matches_auth',i.email IS NOT DISTINCT FROM u.email)) FROM auth.identities i JOIN auth.users u ON u.id=i.user_id WHERE i.user_id=p.user_id),
   'user_profile',(SELECT jsonb_build_object('created_at',u.created_at,'updated_at',u.updated_at,'email_matches_auth',u.email IS NOT DISTINCT FROM a.email) FROM public.user_profiles u JOIN auth.users a ON a.id=u.user_id WHERE u.user_id=p.user_id),
   'roles',(SELECT jsonb_agg(jsonb_build_object('code',r.code,'assigned_at',ur.assigned_at,'assigned_by_self',ur.assigned_by=p.user_id)) FROM public.user_roles ur JOIN public.roles r ON r.id=ur.role_id WHERE ur.user_id=p.user_id),
   'admin_account_linked',EXISTS(SELECT 1 FROM public.admin_accounts a JOIN auth.users u ON u.id=p.user_id WHERE a.id=u.id OR a.email::text=u.email),
   'policy_acceptance',(SELECT jsonb_agg(jsonb_build_object('accepted_terms',a.accepted_terms,'accepted_privacy',a.accepted_privacy,'accepted_at',a.accepted_at,'created_at',a.created_at)) FROM public.user_policy_acceptance a WHERE a.user_id=p.user_id),
   'application_audits',(SELECT jsonb_agg(jsonb_build_object('action',a.action,'related_type',a.related_type,'created_at',a.created_at,'actor_matches_owner',a.actor_user_id=p.user_id,'organization_matches',a.organization_id=p.id,'metadata_keys',(SELECT jsonb_agg(k) FROM jsonb_object_keys(coalesce(a.metadata,'{}'::jsonb)) k))) FROM public.activity_logs a WHERE a.organization_id=p.id OR a.actor_user_id=p.user_id),
   'auth_audits',(SELECT jsonb_agg(jsonb_build_object('action',a.payload->>'action','created_at',a.created_at,'provider',a.payload->>'provider','type',a.payload->>'type')) FROM auth.audit_log_entries a WHERE a.payload->>'actor_id'=p.user_id::text)
 )), '[]'::jsonb) FROM added p)
) AS reconciliation;
ROLLBACK;
`);
console.log(JSON.stringify({status:'LOCAL_INPUTS_PREPARED',originalProfiles:old.length,sourceSnapshots:base.length,dir}));
