-- Production inspection only. No mutation RPCs, raw identities or session tokens.
-- Cutoff is the preserved baseline's captured_at, not a newly accepted baseline.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='20s';
SELECT clock_timestamp() AS captured_at, current_setting('transaction_read_only') AS read_only,
jsonb_agg(to_jsonb(x) ORDER BY relation COLLATE "C") AS preexisting_data FROM (
SELECT 'public.activity_logs' AS relation,count(*) AS row_count,md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM public.activity_logs t WHERE t.created_at <= '2026-10-11 12:35:21.363922+00'::timestamptz
UNION ALL
SELECT 'public.admin_sessions' AS relation,count(*) AS row_count,md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM public.admin_sessions t WHERE t.created_at <= '2026-10-11 12:35:21.363922+00'::timestamptz
UNION ALL
SELECT 'public.user_profiles' AS relation,count(*) AS row_count,md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM public.user_profiles t WHERE t.created_at <= '2026-10-11 12:35:21.363922+00'::timestamptz
UNION ALL
SELECT 'public.user_roles' AS relation,count(*) AS row_count,md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM public.user_roles t WHERE t.assigned_at <= '2026-10-11 12:35:21.363922+00'::timestamptz
UNION ALL
SELECT 'public.user_policy_acceptance' AS relation,count(*) AS row_count,md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'')) AS content_fingerprint FROM public.user_policy_acceptance t WHERE t.created_at <= '2026-10-11 12:35:21.363922+00'::timestamptz
UNION ALL
SELECT 'auth.users_inventory' AS relation,count(*) AS row_count,md5(coalesce(string_agg(jsonb_build_object('id',id,'email_md5',md5(email),'created_at',created_at,'updated_at',updated_at,'email_confirmed_at',email_confirmed_at,'banned_until',banned_until,'app_metadata_md5',md5(raw_app_meta_data::text),'user_metadata_md5',md5(raw_user_meta_data::text))::text,E'\n' ORDER BY id),'')) AS content_fingerprint FROM auth.users WHERE created_at <= '2026-10-11 12:35:21.363922+00'::timestamptz
UNION ALL
SELECT 'auth.identities_inventory' AS relation,count(*) AS row_count,md5(coalesce(string_agg(jsonb_build_object('id',id,'user_id',user_id,'provider',provider,'provider_id_md5',md5(provider_id),'created_at',created_at,'updated_at',updated_at,'identity_data_md5',md5(identity_data::text))::text,E'\n' ORDER BY id),'')) AS content_fingerprint FROM auth.identities WHERE created_at <= '2026-10-11 12:35:21.363922+00'::timestamptz
) x;
WITH cutoff AS (SELECT '2026-10-11 12:35:21.363922+00'::timestamptz AS at),
new_users AS (
 SELECT u.id,u.email,u.created_at,u.updated_at,u.last_sign_in_at,u.email_confirmed_at,u.role,u.aud,u.is_anonymous,u.banned_until,u.raw_app_meta_data,u.raw_user_meta_data,
 'new-user-'||row_number() OVER (ORDER BY u.created_at,u.id) AS alias
 FROM auth.users u,cutoff WHERE u.created_at>cutoff.at
),
new_sessions AS (
 SELECT s.id,s.admin_id,s.created_at,s.expires_at,s.last_used_at,s.revoked_at
 FROM public.admin_sessions s,cutoff WHERE s.created_at>cutoff.at
),
new_logs AS (SELECT l.* FROM public.activity_logs l,cutoff WHERE l.created_at>cutoff.at)
SELECT clock_timestamp() AS captured_at,current_setting('transaction_read_only') AS read_only,
jsonb_build_object(
 'new_users',(SELECT jsonb_agg(jsonb_build_object(
  'alias',u.alias,'created_at',u.created_at,'updated_at',u.updated_at,'last_sign_in_at',u.last_sign_in_at,
  'email_confirmed_at',u.email_confirmed_at,'authenticated_role',u.role='authenticated','authenticated_audience',u.aud='authenticated',
  'anonymous',u.is_anonymous,'banned',coalesce(u.banned_until>now(),false),
  'app_metadata_provider',CASE WHEN u.raw_app_meta_data->>'provider' IN ('email','google','apple','azure','facebook','github','discord') THEN u.raw_app_meta_data->>'provider' ELSE '<unrecognized>' END,
  'unexpected_app_metadata_fields',EXISTS(SELECT 1 FROM jsonb_object_keys(coalesce(u.raw_app_meta_data,'{}'::jsonb)) k WHERE k NOT IN ('provider','providers')),
  'has_authorization_metadata',u.raw_app_meta_data ?| ARRAY['role','roles','permissions','is_admin','admin','super_admin'],
  'identity_count',(SELECT count(*) FROM auth.identities i WHERE i.user_id=u.id),
  'organization_count',(SELECT count(*) FROM public.organization_profiles o WHERE o.user_id=u.id),
  'admin_account_link',EXISTS(SELECT 1 FROM public.admin_accounts a WHERE a.id=u.id OR lower(a.email::text)=lower(u.email)),
  'profile_count',(SELECT count(*) FROM public.user_profiles p WHERE p.user_id=u.id),
  'role_count',(SELECT count(*) FROM public.user_roles r WHERE r.user_id=u.id)
 ) ORDER BY u.created_at) FROM new_users u),
 'new_identities',(SELECT jsonb_agg(jsonb_build_object(
  'user_alias',coalesce(u.alias,'pre-existing-user'),'created_at',i.created_at,'updated_at',i.updated_at,
  'provider',CASE WHEN i.provider IN ('email','google','apple','azure','facebook','github','discord') THEN i.provider ELSE '<unrecognized>' END,
  'linked_user_exists',a.id IS NOT NULL,'email_matches_user',lower(i.identity_data->>'email')=lower(a.email),
  'provider_email_verified',coalesce(i.identity_data->>'email_verified','false')='true'
 ) ORDER BY i.created_at) FROM auth.identities i LEFT JOIN auth.users a ON a.id=i.user_id LEFT JOIN new_users u ON u.id=i.user_id,cutoff WHERE i.created_at>cutoff.at),
 'new_profiles',(SELECT jsonb_agg(jsonb_build_object(
  'user_alias',coalesce(u.alias,'pre-existing-user'),'created_at',p.created_at,'updated_at',p.updated_at,'linked_user_exists',a.id IS NOT NULL,
  'email_matches_user',lower(p.email::text)=lower(a.email),
  'full_name_matches_signup',p.full_name IS NOT DISTINCT FROM coalesce(a.raw_user_meta_data->>'full_name',''),
  'display_name_matches_signup',p.display_name IS NOT DISTINCT FROM coalesce(a.raw_user_meta_data->>'display_name',''),
  'contact_matches_signup',p.contact_number IS NOT DISTINCT FROM nullif(trim(a.raw_user_meta_data->>'contact_number'),''),
  'creation_seconds_from_auth',round(extract(epoch FROM p.created_at-a.created_at)::numeric,3)
 ) ORDER BY p.created_at) FROM public.user_profiles p LEFT JOIN auth.users a ON a.id=p.user_id LEFT JOIN new_users u ON u.id=p.user_id,cutoff WHERE p.created_at>cutoff.at),
 'new_roles',(SELECT jsonb_agg(jsonb_build_object(
  'user_alias',coalesce(u.alias,'pre-existing-user'),'assigned_at',r.assigned_at,'linked_user_exists',a.id IS NOT NULL,
  'role',role.code,'permissions',role.permission_codes,'assigned_by_is_null',r.assigned_by IS NULL,
  'matches_signup_default',role.code='youth' AND cardinality(role.permission_codes)=0 AND r.assigned_by IS NULL,
  'assignment_seconds_from_auth',round(extract(epoch FROM r.assigned_at-a.created_at)::numeric,3)
 ) ORDER BY r.assigned_at) FROM public.user_roles r LEFT JOIN auth.users a ON a.id=r.user_id LEFT JOIN new_users u ON u.id=r.user_id JOIN public.roles role ON role.id=r.role_id,cutoff WHERE r.assigned_at>cutoff.at),
 'new_consent',(SELECT jsonb_agg(jsonb_build_object(
  'user_alias',coalesce(u.alias,'pre-existing-user'),'created_at',c.created_at,'accepted_at',c.accepted_at,
  'linked_user_exists',a.id IS NOT NULL,'linked_policy_exists',v.id IS NOT NULL,'active_policy',v.is_active,
  'accepted_terms',c.accepted_terms,'accepted_privacy',c.accepted_privacy,
  'after_auth_creation',c.created_at>=a.created_at,'user_agent_present',nullif(c.user_agent,'') IS NOT NULL
 ) ORDER BY c.created_at) FROM public.user_policy_acceptance c LEFT JOIN auth.users a ON a.id=c.user_id LEFT JOIN new_users u ON u.id=c.user_id LEFT JOIN public.policy_versions v ON v.id=c.policy_version_id,cutoff WHERE c.created_at>cutoff.at),
 'auth_events',(SELECT jsonb_agg(event ORDER BY created_at) FROM (
  SELECT l.created_at,jsonb_build_object('user_alias',u.alias,'created_at',l.created_at,
   'action',CASE WHEN l.payload->>'action' IN ('user_signedup','user_repeated_signup','login','logout','token_refreshed','user_updated','user_modified','user_confirmed','user_confirmation_requested','user_recovery_requested','user_invited','user_deleted','user_reauthenticated','identity_linked') THEN l.payload->>'action' ELSE '<unrecognized>' END,
   'actor_matches_user',l.payload->>'actor_id'=u.id::text,
   'provider',CASE WHEN l.payload->'traits'->>'provider' IN ('email','google','apple','azure','facebook','github','discord') THEN l.payload->'traits'->>'provider' ELSE NULL END
  ) AS event FROM auth.audit_log_entries l JOIN new_users u ON l.payload->>'actor_id'=u.id::text OR l.payload->>'user_id'=u.id::text OR l.payload->'traits'->>'user_id'=u.id::text,cutoff WHERE l.created_at>cutoff.at ORDER BY l.created_at LIMIT 100
 ) events),
 'new_sessions',(SELECT jsonb_agg(jsonb_build_object(
  'created_at',s.created_at,'expires_at',s.expires_at,'last_used_at',s.last_used_at,'revoked_at',s.revoked_at,
  'linked_admin_exists',a.id IS NOT NULL,'admin_active',a.is_active,'admin_password_set',a.is_password_set,'admin_role',r.code,
  'admin_preexisting',a.created_at<=cutoff.at,'configured_timeout_minutes',(SELECT value_json FROM public.admin_system_settings WHERE setting_key='security.admin_session_timeout_minutes'),
  'actual_duration_minutes',round((extract(epoch FROM s.expires_at-s.created_at)/60)::numeric,3),
  'matching_signin_audits',(SELECT count(*) FROM new_logs l WHERE l.actor_user_id=s.admin_id AND l.action='admin_sign_in' AND l.created_at=s.created_at)
 ) ORDER BY s.created_at) FROM new_sessions s LEFT JOIN public.admin_accounts a ON a.id=s.admin_id LEFT JOIN public.roles r ON r.id=a.role_id,cutoff),
 'new_activity_logs',(SELECT jsonb_agg(jsonb_build_object(
  'created_at',l.created_at,'action',CASE WHEN l.action IN ('admin_sign_in','admin_sign_out','user_sign_in','user_sign_out') THEN l.action ELSE '<unrecognized>' END,
  'actor_is_existing_admin',a.id IS NOT NULL AND a.created_at<=cutoff.at,'actor_is_new_auth_user',u.id IS NOT NULL,
  'organization_is_null',l.organization_id IS NULL,'related_type_is_admin_session',l.related_type='admin_session',
  'related_id_matches_actor',l.related_id=l.actor_user_id,
  'description_matches_login_format',l.description='Administrator signed in: '||coalesce(a.display_name,a.username::text),
  'matching_new_sessions',(SELECT count(*) FROM new_sessions s WHERE s.admin_id=l.actor_user_id AND s.created_at=l.created_at)
 ) ORDER BY l.created_at) FROM new_logs l LEFT JOIN public.admin_accounts a ON a.id=l.actor_user_id LEFT JOIN new_users u ON u.id=l.actor_user_id,cutoff)
) AS redacted_activity;
COMMIT;

