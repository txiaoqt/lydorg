-- DRAFT FOR SEPARATE REVIEW/AUTHORIZATION. Not installed. Not an automatic rollout.
-- Production control-plane target: mqqaykksadotbrghbexz; independently verify endpoint.
-- Requires foundation, deployed gateway, compatible frontend, access checks and
-- signed records-owner decisions for this reviewed unmatched-object inventory.
-- app.storage_remediation_validated is operator attestation, NOT an auth boundary.
-- Do not set it until those prerequisites have actually passed.
BEGIN;
SET LOCAL lock_timeout='1s';SET LOCAL statement_timeout='30s';
DO $storage_cutover_pre$ DECLARE _catalog jsonb; _actual jsonb;
BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres' OR session_user<>'postgres' THEN RAISE EXCEPTION 'Unexpected installation identity'; END IF;
 _catalog := (jsonb_build_object(
 'captured_at',clock_timestamp(),'read_only',current_setting('transaction_read_only'),
 'database',current_database(),'current_user',current_user,'session_user',session_user,
 'migration_history',(SELECT jsonb_build_object('count',count(*),'latest',max(version),'complete_md5',md5(coalesce(jsonb_agg(to_jsonb(m) ORDER BY version),'[]'::jsonb)::text)) FROM supabase_migrations.schema_migrations m),
 'foundation_present',to_regnamespace('ytrace_storage_private') IS NOT NULL,
 'gateway_rpc_present',to_regprocedure('public.admin_authorize_storage_operation(text,text,text,text,uuid,text)') IS NOT NULL,
 'function_fingerprints',(SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definition_md5',md5(pg_get_functiondef(p.oid)),'source_md5',md5(p.prosrc),'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'volatility',p.provolatile,'config',p.proconfig,'acl',p.proacl::text) ORDER BY p.oid::regprocedure::text COLLATE "C") FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prokind='f' AND n.nspname IN ('public','ytrace_identity','ytrace_document_mutation','ytrace_production_containment') AND p.proname<>'admin_authorize_storage_operation'),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('table',n.nspname||'.'||c.relname,'name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid,true)) ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C",t.tgname COLLATE "C") FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname IN ('public','storage','ytrace_identity') AND t.tgname NOT IN ('ytrace_remember_template_asset','ytrace_remember_news_asset','ytrace_budget_cleanup','ytrace_liquidation_cleanup','ytrace_ypop_cleanup','ytrace_event_cleanup','ytrace_activity_cleanup','ytrace_move_cleanup')),
 'table_structure_md5',(SELECT md5(coalesce(string_agg(n.nspname||'.'||c.relname||':'||pg_get_userbyid(c.relowner)||':'||c.relrowsecurity||':'||c.relforcerowsecurity||':'||coalesce(c.relacl::text,'')||':'||
 coalesce((SELECT string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),''),E'\n' ORDER BY a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),'')||':'||
 coalesce((SELECT string_agg(con.conname||':'||pg_get_constraintdef(con.oid),E'\n' ORDER BY con.conname COLLATE "C") FROM pg_constraint con WHERE con.conrelid=c.oid),''),E'\n' ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C"),'')) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname IN ('public','storage','ytrace_identity')),
 'all_policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY schemaname COLLATE "C",tablename COLLATE "C",policyname COLLATE "C") FROM pg_policies p),
 'default_privileges',(SELECT jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(d.defaclrole),'schema',coalesce(n.nspname,'<global>'),'kind',d.defaclobjtype,'acl',d.defaclacl::text) ORDER BY pg_get_userbyid(d.defaclrole) COLLATE "C",coalesce(n.nspname,'') COLLATE "C",d.defaclobjtype) FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace),
 'buckets',(SELECT jsonb_agg(jsonb_build_object('id',b.id,'public',b.public,'size_limit',b.file_size_limit,'mime_types',b.allowed_mime_types) ORDER BY b.id COLLATE "C") FROM storage.buckets b),
 'roles',(SELECT jsonb_agg(jsonb_build_object('code',r.code,'permissions',r.permission_codes) ORDER BY r.code::text COLLATE "C") FROM public.roles r)
)
);
 IF NOT (_catalog->>'foundation_present')::boolean OR NOT (_catalog->>'gateway_rpc_present')::boolean THEN RAISE EXCEPTION 'Production foundation not installed'; END IF;
 IF encode(sha256(convert_to((_catalog - ARRAY['captured_at','read_only','database','current_user','session_user','foundation_present','gateway_rpc_present'])::text,'UTF8')),'hex') <> 'e189e64d9291386c8c90cb885ec283f92b1fa582b92717dac477fce2cfdebc1f' THEN RAISE EXCEPTION 'Exact reviewed production catalog drifted'; END IF;
 SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'source_md5',md5(p.prosrc),'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'volatility',p.provolatile,'config',p.proconfig,'acl',p.proacl::text) ORDER BY p.oid::regprocedure::text COLLATE "C") INTO _actual FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='ytrace_storage_private' OR (n.nspname='public' AND p.proname='admin_authorize_storage_operation');
 IF _actual IS DISTINCT FROM (SELECT jsonb_agg(x ORDER BY x->>'signature' COLLATE "C") FROM jsonb_array_elements($reviewed_functions$[{"signature":"admin_authorize_storage_operation(text,text,text,text,uuid,text)","source_md5":"bc17ff58b1bcc636d0d6320ccc2e3b33","owner":"postgres","security_definer":true,"volatility":"v","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,service_role=X/postgres}"},{"signature":"ytrace_storage_private.asset_reference_audit()","source_md5":"34e12e0f511faa800891c31d1051a18e","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,service_role=X/postgres}"},{"signature":"ytrace_storage_private.backfill_asset_bindings()","source_md5":"37d337efe6e9bf27b6887b5f84dbf382","owner":"postgres","security_definer":true,"volatility":"v","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.is_active_template(text)","source_md5":"d2727112234d5be6252328dc87983d54","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}"},{"signature":"ytrace_storage_private.is_public_avatar(text,text,text,text)","source_md5":"ba4aa5d6994ee930ebeb1ef7b3faa672","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}"},{"signature":"ytrace_storage_private.is_published_news_image(text)","source_md5":"c41320784f654b0cf194728c0ba69c14","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}"},{"signature":"ytrace_storage_private.organization_object_access(text,text,text)","source_md5":"0fa5031b24cf2ad3495dbd97d1ebdc92","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,authenticated=X/postgres}"},{"signature":"ytrace_storage_private.parent_context(text,text)","source_md5":"80e71dc4d74feab05144426185e344b2","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.public_asset_reference(text,text)","source_md5":"9f49fdee112932949b326c54bad4d70c","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.register_trusted_storage_origin(text,text)","source_md5":"573bad51dd3c2b654a28ad35c736ca1a","owner":"postgres","security_definer":true,"volatility":"v","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,service_role=X/postgres}"},{"signature":"ytrace_storage_private.remember_asset_binding()","source_md5":"41e656072cb78d5ba312fff57966d2e3","owner":"postgres","security_definer":true,"volatility":"v","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.remember_draft_cleanup()","source_md5":"bd447d36f28a8a771749f6d204499cd7","owner":"postgres","security_definer":true,"volatility":"v","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.resource_references(text,text)","source_md5":"528a6ea2e05c53505dd0106bf91081a7","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.url_decode(text)","source_md5":"fced7f9df7e65a9f48c3382e360819e6","owner":"postgres","security_definer":false,"volatility":"i","config":["search_path=pg_catalog"],"acl":"{postgres=X/postgres}"}]$reviewed_functions$::jsonb) x) THEN RAISE EXCEPTION 'Foundation source/security/grant mismatch'; END IF;

 IF (SELECT array_agg(origin ORDER BY origin) FROM ytrace_storage_private.trusted_storage_origins) IS DISTINCT FROM ARRAY['https://mqqaykksadotbrghbexz.supabase.co'] THEN RAISE EXCEPTION 'Unexpected trusted origin'; END IF;
END $storage_cutover_pre$;
-- BEGIN unchanged cutover body.
-- UNAPPLIED cutover. Requires foundation, deployed gateway and compatible frontend.
DO $$ BEGIN
  IF current_setting('app.storage_remediation_validated', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Storage remediation requires isolated authorization and legacy-path validation before cutover';
  END IF;
END $$;
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '30s';
-- Foundation dependency check: the environment-neutral helpers must exist.
DO $deps$ BEGIN
  IF to_regprocedure('ytrace_storage_private.is_published_news_image(text)') IS NULL
    OR to_regprocedure('ytrace_storage_private.is_active_template(text)') IS NULL
    OR to_regprocedure('ytrace_storage_private.is_public_avatar(text,text,text,text)') IS NULL
    OR to_regprocedure('ytrace_storage_private.organization_object_access(text,text,text)') IS NULL THEN
    RAISE EXCEPTION 'Storage foundation migration 20261009145634 (environment-neutral revision) must be applied first';
  END IF;
END $deps$;
-- Legacy-reference gate: every published news image / active template that
-- references Storage by URL must resolve through this environment's registered
-- trusted origin. External (non-Storage) URLs are unaffected by object policies
-- and are not counted. Fix by registering the origin, not by removing the gate.
DO $legacy$ DECLARE _unresolved integer; BEGIN
  SELECT count(*) INTO _unresolved FROM (
    SELECT 1 FROM public.news_releases n WHERE n.visibility_status::text='published'
      AND (n.preview_image_url LIKE 'storage://%' OR n.preview_image_url ~ '/storage/v1/')
      AND ytrace_storage_private.public_asset_reference('news-release-images',n.preview_image_url) IS NULL
    UNION ALL
    SELECT 1 FROM public.required_document_types t WHERE t.is_active
      AND (t.template_url LIKE 'storage://%' OR t.template_url ~ '/storage/v1/')
      AND ytrace_storage_private.public_asset_reference('template-files',t.template_url) IS NULL
  ) x;
  IF _unresolved>0 THEN
    RAISE EXCEPTION '% published/active Storage asset reference(s) do not resolve to a trusted origin; register this environment origin via ytrace_storage_private.register_trusted_storage_origin() and review ytrace_storage_private.asset_reference_audit() before cutover', _unresolved;
  END IF;
END $legacy$;
-- Abort on any policy drift, including a newly added permissive override.
DO $drift$ DECLARE _actual jsonb; BEGIN
  SELECT jsonb_agg(jsonb_build_object('policyname',policyname,'roles',roles,'cmd',cmd,'permissive',permissive,'qual',qual,'with_check',with_check) ORDER BY policyname)
  INTO _actual FROM pg_policies WHERE schemaname='storage' AND tablename='objects';
  IF _actual IS DISTINCT FROM $expected$[
  {
    "policyname": "budget_request_files_manage_own",
    "roles": [
      "public"
    ],
    "cmd": "ALL",
    "permissive": "PERMISSIVE",
    "qual": "((bucket_id = 'budget-request-files'::text) AND (current_user_is_admin() OR (owner = auth.uid())))",
    "with_check": "((bucket_id = 'budget-request-files'::text) AND (current_user_is_admin() OR (owner = auth.uid())))"
  },
  {
    "policyname": "budget_request_files_read_portal",
    "roles": [
      "public"
    ],
    "cmd": "SELECT",
    "permissive": "PERMISSIVE",
    "qual": "(bucket_id = 'budget-request-files'::text)",
    "with_check": null
  },
  {
    "policyname": "liquidation_report_files_manage_own",
    "roles": [
      "public"
    ],
    "cmd": "ALL",
    "permissive": "PERMISSIVE",
    "qual": "((bucket_id = 'liquidation-report-files'::text) AND (current_user_is_admin() OR (owner = auth.uid())))",
    "with_check": "((bucket_id = 'liquidation-report-files'::text) AND (current_user_is_admin() OR (owner = auth.uid())))"
  },
  {
    "policyname": "liquidation_report_files_read_portal",
    "roles": [
      "public"
    ],
    "cmd": "SELECT",
    "permissive": "PERMISSIVE",
    "qual": "(bucket_id = 'liquidation-report-files'::text)",
    "with_check": null
  },
  {
    "policyname": "move_files_manage_own",
    "roles": [
      "public"
    ],
    "cmd": "ALL",
    "permissive": "PERMISSIVE",
    "qual": "((bucket_id = 'move-files'::text) AND (current_user_is_admin() OR (owner = auth.uid())))",
    "with_check": "((bucket_id = 'move-files'::text) AND (current_user_is_admin() OR (owner = auth.uid())))"
  },
  {
    "policyname": "move_files_read_portal",
    "roles": [
      "public"
    ],
    "cmd": "SELECT",
    "permissive": "PERMISSIVE",
    "qual": "(bucket_id = 'move-files'::text)",
    "with_check": null
  },
  {
    "policyname": "news_release_images_admin_manage",
    "roles": [
      "public"
    ],
    "cmd": "ALL",
    "permissive": "PERMISSIVE",
    "qual": "(bucket_id = 'news-release-images'::text)",
    "with_check": "(bucket_id = 'news-release-images'::text)"
  },
  {
    "policyname": "organization_documents_manage_own",
    "roles": [
      "public"
    ],
    "cmd": "ALL",
    "permissive": "PERMISSIVE",
    "qual": "((bucket_id = 'organization-documents'::text) AND (current_user_is_admin() OR (owner = auth.uid())))",
    "with_check": "((bucket_id = 'organization-documents'::text) AND (current_user_is_admin() OR (owner = auth.uid())))"
  },
  {
    "policyname": "organization_documents_read_portal",
    "roles": [
      "public"
    ],
    "cmd": "SELECT",
    "permissive": "PERMISSIVE",
    "qual": "(bucket_id = 'organization-documents'::text)",
    "with_check": null
  },
  {
    "policyname": "template_files_admin_manage",
    "roles": [
      "public"
    ],
    "cmd": "ALL",
    "permissive": "PERMISSIVE",
    "qual": "(bucket_id = 'template-files'::text)",
    "with_check": "(bucket_id = 'template-files'::text)"
  },
  {
    "policyname": "transparency_attachments_admin_manage",
    "roles": [
      "public"
    ],
    "cmd": "ALL",
    "permissive": "PERMISSIVE",
    "qual": "((bucket_id = 'transparency-attachments'::text) AND current_user_is_admin())",
    "with_check": "((bucket_id = 'transparency-attachments'::text) AND current_user_is_admin())"
  },
  {
    "policyname": "transparency_attachments_read_public",
    "roles": [
      "public"
    ],
    "cmd": "SELECT",
    "permissive": "PERMISSIVE",
    "qual": "(bucket_id = 'transparency-attachments'::text)",
    "with_check": null
  },
  {
    "policyname": "yorp_sample_seed_assets_read",
    "roles": [
      "anon",
      "authenticated"
    ],
    "cmd": "SELECT",
    "permissive": "PERMISSIVE",
    "qual": "((bucket_id = 'registration-seed-file'::text) AND (name = ANY (ARRAY['Constitution and By-Laws.pdf'::text, 'Endorsement.pdf'::text, 'NYC YORP Registration Form (Form B).pdf'::text, 'Pasig City YORP Registration Form (Form A).pdf'::text, 'YORP Directory of Officers and Adviser.pdf'::text, 'YORP List of Members in Good Standing.pdf'::text])))",
    "with_check": null
  },
  {
    "policyname": "ypop_files_manage_own",
    "roles": [
      "public"
    ],
    "cmd": "ALL",
    "permissive": "PERMISSIVE",
    "qual": "((bucket_id = 'ypop-files'::text) AND (current_user_is_admin() OR (owner = auth.uid())))",
    "with_check": "((bucket_id = 'ypop-files'::text) AND (current_user_is_admin() OR (owner = auth.uid())))"
  },
  {
    "policyname": "ypop_files_read_portal",
    "roles": [
      "public"
    ],
    "cmd": "SELECT",
    "permissive": "PERMISSIVE",
    "qual": "(bucket_id = 'ypop-files'::text)",
    "with_check": null
  }
]$expected$::jsonb THEN
    RAISE EXCEPTION 'Storage policy definitions drifted; recapture and review before cutover';
  END IF;
END $drift$;

-- Remove both permissive SELECT and ALL policies; OR-combination would defeat
-- narrower additions. No ordinary JWT role is substituted for custom Admin auth.
DROP POLICY organization_documents_read_portal ON storage.objects;
DROP POLICY organization_documents_manage_own ON storage.objects;
DROP POLICY budget_request_files_read_portal ON storage.objects;
DROP POLICY budget_request_files_manage_own ON storage.objects;
DROP POLICY liquidation_report_files_read_portal ON storage.objects;
DROP POLICY liquidation_report_files_manage_own ON storage.objects;
DROP POLICY ypop_files_read_portal ON storage.objects;
DROP POLICY ypop_files_manage_own ON storage.objects;
DROP POLICY move_files_read_portal ON storage.objects;
DROP POLICY move_files_manage_own ON storage.objects;
DROP POLICY template_files_admin_manage ON storage.objects;
DROP POLICY news_release_images_admin_manage ON storage.objects;
CREATE POLICY ytrace_private_organization_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('organization-documents','budget-request-files','liquidation-report-files','ypop-files','move-files')
    AND coalesce(owner_id,owner::text)=(SELECT auth.uid())::text AND ytrace_storage_private.organization_object_access(bucket_id,name,'read'));
CREATE POLICY ytrace_published_profile_avatar_read ON storage.objects FOR SELECT TO anon,authenticated
  USING (ytrace_storage_private.is_public_avatar(bucket_id,name,metadata->>'mimetype',coalesce(owner_id,owner::text)));
CREATE POLICY ytrace_private_organization_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('organization-documents','budget-request-files','liquidation-report-files','ypop-files','move-files')
    AND coalesce(owner_id,owner::text)=(SELECT auth.uid())::text AND ytrace_storage_private.organization_object_access(bucket_id,name,'insert'));
CREATE POLICY ytrace_private_organization_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('organization-documents','budget-request-files','liquidation-report-files','ypop-files','move-files')
    AND coalesce(owner_id,owner::text)=(SELECT auth.uid())::text AND ytrace_storage_private.organization_object_access(bucket_id,name,'delete'));
-- No UPDATE: uploaded bytes cannot be overwritten/renamed after review.
CREATE POLICY ytrace_active_templates_read ON storage.objects FOR SELECT TO anon,authenticated
  USING (bucket_id='template-files' AND ytrace_storage_private.is_active_template(name));
-- Bucket is public already; this does not make any private bucket public.
-- Legacy HTTP references resolve only through the registered trusted origin.
CREATE POLICY ytrace_news_images_read ON storage.objects FOR SELECT TO anon,authenticated
  USING (bucket_id='news-release-images' AND ytrace_storage_private.is_published_news_image(name));
-- Asset writes use only server-authorized, unique-path signed uploads/cleanup.
-- Existing brand-logo, seed fixtures and transparency policies are unchanged.

-- END unchanged cutover body.
DO $storage_cutover_post$ DECLARE _catalog jsonb; _actual jsonb; _restored_policies jsonb;
BEGIN
 SELECT jsonb_agg(to_jsonb(p) ORDER BY policyname COLLATE "C") INTO _actual FROM pg_policies p WHERE schemaname='storage' AND tablename='objects';
 IF _actual IS DISTINCT FROM (SELECT jsonb_agg(p ORDER BY p->>'policyname' COLLATE "C") FROM jsonb_array_elements($newpolicies$[{"cmd":"ALL","qual":"((bucket_id = 'transparency-attachments'::text) AND current_user_is_admin())","roles":["public"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"transparency_attachments_admin_manage","schemaname":"storage","with_check":"((bucket_id = 'transparency-attachments'::text) AND current_user_is_admin())"},{"cmd":"SELECT","qual":"(bucket_id = 'transparency-attachments'::text)","roles":["public"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"transparency_attachments_read_public","schemaname":"storage","with_check":null},{"cmd":"SELECT","qual":"((bucket_id = 'registration-seed-file'::text) AND (name = ANY (ARRAY['Constitution and By-Laws.pdf'::text, 'Endorsement.pdf'::text, 'NYC YORP Registration Form (Form B).pdf'::text, 'Pasig City YORP Registration Form (Form A).pdf'::text, 'YORP Directory of Officers and Adviser.pdf'::text, 'YORP List of Members in Good Standing.pdf'::text])))","roles":["anon","authenticated"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"yorp_sample_seed_assets_read","schemaname":"storage","with_check":null},{"cmd":"SELECT","qual":"((bucket_id = 'template-files'::text) AND ytrace_storage_private.is_active_template(name))","roles":["anon","authenticated"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"ytrace_active_templates_read","schemaname":"storage","with_check":null},{"cmd":"SELECT","qual":"((bucket_id = 'news-release-images'::text) AND ytrace_storage_private.is_published_news_image(name))","roles":["anon","authenticated"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"ytrace_news_images_read","schemaname":"storage","with_check":null},{"cmd":"DELETE","qual":"((bucket_id = ANY (ARRAY['organization-documents'::text, 'budget-request-files'::text, 'liquidation-report-files'::text, 'ypop-files'::text, 'move-files'::text])) AND (COALESCE(owner_id, (owner)::text) = (( SELECT auth.uid() AS uid))::text) AND ytrace_storage_private.organization_object_access(bucket_id, name, 'delete'::text))","roles":["authenticated"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"ytrace_private_organization_delete","schemaname":"storage","with_check":null},{"cmd":"INSERT","qual":null,"roles":["authenticated"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"ytrace_private_organization_insert","schemaname":"storage","with_check":"((bucket_id = ANY (ARRAY['organization-documents'::text, 'budget-request-files'::text, 'liquidation-report-files'::text, 'ypop-files'::text, 'move-files'::text])) AND (COALESCE(owner_id, (owner)::text) = (( SELECT auth.uid() AS uid))::text) AND ytrace_storage_private.organization_object_access(bucket_id, name, 'insert'::text))"},{"cmd":"SELECT","qual":"((bucket_id = ANY (ARRAY['organization-documents'::text, 'budget-request-files'::text, 'liquidation-report-files'::text, 'ypop-files'::text, 'move-files'::text])) AND (COALESCE(owner_id, (owner)::text) = (( SELECT auth.uid() AS uid))::text) AND ytrace_storage_private.organization_object_access(bucket_id, name, 'read'::text))","roles":["authenticated"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"ytrace_private_organization_read","schemaname":"storage","with_check":null},{"cmd":"SELECT","qual":"ytrace_storage_private.is_public_avatar(bucket_id, name, (metadata ->> 'mimetype'::text), COALESCE(owner_id, (owner)::text))","roles":["anon","authenticated"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"ytrace_published_profile_avatar_read","schemaname":"storage","with_check":null}]$newpolicies$::jsonb) p) THEN RAISE EXCEPTION 'Exact restrictive policy set mismatch'; END IF;
 _catalog := (jsonb_build_object(
 'captured_at',clock_timestamp(),'read_only',current_setting('transaction_read_only'),
 'database',current_database(),'current_user',current_user,'session_user',session_user,
 'migration_history',(SELECT jsonb_build_object('count',count(*),'latest',max(version),'complete_md5',md5(coalesce(jsonb_agg(to_jsonb(m) ORDER BY version),'[]'::jsonb)::text)) FROM supabase_migrations.schema_migrations m),
 'foundation_present',to_regnamespace('ytrace_storage_private') IS NOT NULL,
 'gateway_rpc_present',to_regprocedure('public.admin_authorize_storage_operation(text,text,text,text,uuid,text)') IS NOT NULL,
 'function_fingerprints',(SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definition_md5',md5(pg_get_functiondef(p.oid)),'source_md5',md5(p.prosrc),'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'volatility',p.provolatile,'config',p.proconfig,'acl',p.proacl::text) ORDER BY p.oid::regprocedure::text COLLATE "C") FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prokind='f' AND n.nspname IN ('public','ytrace_identity','ytrace_document_mutation','ytrace_production_containment') AND p.proname<>'admin_authorize_storage_operation'),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('table',n.nspname||'.'||c.relname,'name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid,true)) ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C",t.tgname COLLATE "C") FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname IN ('public','storage','ytrace_identity') AND t.tgname NOT IN ('ytrace_remember_template_asset','ytrace_remember_news_asset','ytrace_budget_cleanup','ytrace_liquidation_cleanup','ytrace_ypop_cleanup','ytrace_event_cleanup','ytrace_activity_cleanup','ytrace_move_cleanup')),
 'table_structure_md5',(SELECT md5(coalesce(string_agg(n.nspname||'.'||c.relname||':'||pg_get_userbyid(c.relowner)||':'||c.relrowsecurity||':'||c.relforcerowsecurity||':'||coalesce(c.relacl::text,'')||':'||
 coalesce((SELECT string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),''),E'\n' ORDER BY a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),'')||':'||
 coalesce((SELECT string_agg(con.conname||':'||pg_get_constraintdef(con.oid),E'\n' ORDER BY con.conname COLLATE "C") FROM pg_constraint con WHERE con.conrelid=c.oid),''),E'\n' ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C"),'')) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname IN ('public','storage','ytrace_identity')),
 'all_policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY schemaname COLLATE "C",tablename COLLATE "C",policyname COLLATE "C") FROM pg_policies p),
 'default_privileges',(SELECT jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(d.defaclrole),'schema',coalesce(n.nspname,'<global>'),'kind',d.defaclobjtype,'acl',d.defaclacl::text) ORDER BY pg_get_userbyid(d.defaclrole) COLLATE "C",coalesce(n.nspname,'') COLLATE "C",d.defaclobjtype) FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace),
 'buckets',(SELECT jsonb_agg(jsonb_build_object('id',b.id,'public',b.public,'size_limit',b.file_size_limit,'mime_types',b.allowed_mime_types) ORDER BY b.id COLLATE "C") FROM storage.buckets b),
 'roles',(SELECT jsonb_agg(jsonb_build_object('code',r.code,'permissions',r.permission_codes) ORDER BY r.code::text COLLATE "C") FROM public.roles r)
)
);
 SELECT jsonb_agg(p ORDER BY p->>'schemaname' COLLATE "C",p->>'tablename' COLLATE "C",p->>'policyname' COLLATE "C") INTO _restored_policies FROM (
  SELECT p FROM jsonb_array_elements(_catalog->'all_policies') p WHERE NOT (p->>'schemaname'='storage' AND p->>'tablename'='objects')
  UNION ALL SELECT p FROM jsonb_array_elements($oldpolicies$[{"cmd":"ALL","qual":"((bucket_id = 'budget-request-files'::text) AND (current_user_is_admin() OR (owner = auth.uid())))","roles":["public"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"budget_request_files_manage_own","schemaname":"storage","with_check":"((bucket_id = 'budget-request-files'::text) AND (current_user_is_admin() OR (owner = auth.uid())))"},{"cmd":"SELECT","qual":"(bucket_id = 'budget-request-files'::text)","roles":["public"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"budget_request_files_read_portal","schemaname":"storage","with_check":null},{"cmd":"ALL","qual":"((bucket_id = 'liquidation-report-files'::text) AND (current_user_is_admin() OR (owner = auth.uid())))","roles":["public"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"liquidation_report_files_manage_own","schemaname":"storage","with_check":"((bucket_id = 'liquidation-report-files'::text) AND (current_user_is_admin() OR (owner = auth.uid())))"},{"cmd":"SELECT","qual":"(bucket_id = 'liquidation-report-files'::text)","roles":["public"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"liquidation_report_files_read_portal","schemaname":"storage","with_check":null},{"cmd":"ALL","qual":"((bucket_id = 'move-files'::text) AND (current_user_is_admin() OR (owner = auth.uid())))","roles":["public"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"move_files_manage_own","schemaname":"storage","with_check":"((bucket_id = 'move-files'::text) AND (current_user_is_admin() OR (owner = auth.uid())))"},{"cmd":"SELECT","qual":"(bucket_id = 'move-files'::text)","roles":["public"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"move_files_read_portal","schemaname":"storage","with_check":null},{"cmd":"ALL","qual":"(bucket_id = 'news-release-images'::text)","roles":["public"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"news_release_images_admin_manage","schemaname":"storage","with_check":"(bucket_id = 'news-release-images'::text)"},{"cmd":"ALL","qual":"((bucket_id = 'organization-documents'::text) AND (current_user_is_admin() OR (owner = auth.uid())))","roles":["public"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"organization_documents_manage_own","schemaname":"storage","with_check":"((bucket_id = 'organization-documents'::text) AND (current_user_is_admin() OR (owner = auth.uid())))"},{"cmd":"SELECT","qual":"(bucket_id = 'organization-documents'::text)","roles":["public"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"organization_documents_read_portal","schemaname":"storage","with_check":null},{"cmd":"ALL","qual":"(bucket_id = 'template-files'::text)","roles":["public"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"template_files_admin_manage","schemaname":"storage","with_check":"(bucket_id = 'template-files'::text)"},{"cmd":"ALL","qual":"((bucket_id = 'transparency-attachments'::text) AND current_user_is_admin())","roles":["public"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"transparency_attachments_admin_manage","schemaname":"storage","with_check":"((bucket_id = 'transparency-attachments'::text) AND current_user_is_admin())"},{"cmd":"SELECT","qual":"(bucket_id = 'transparency-attachments'::text)","roles":["public"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"transparency_attachments_read_public","schemaname":"storage","with_check":null},{"cmd":"SELECT","qual":"((bucket_id = 'registration-seed-file'::text) AND (name = ANY (ARRAY['Constitution and By-Laws.pdf'::text, 'Endorsement.pdf'::text, 'NYC YORP Registration Form (Form B).pdf'::text, 'Pasig City YORP Registration Form (Form A).pdf'::text, 'YORP Directory of Officers and Adviser.pdf'::text, 'YORP List of Members in Good Standing.pdf'::text])))","roles":["anon","authenticated"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"yorp_sample_seed_assets_read","schemaname":"storage","with_check":null},{"cmd":"ALL","qual":"((bucket_id = 'ypop-files'::text) AND (current_user_is_admin() OR (owner = auth.uid())))","roles":["public"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"ypop_files_manage_own","schemaname":"storage","with_check":"((bucket_id = 'ypop-files'::text) AND (current_user_is_admin() OR (owner = auth.uid())))"},{"cmd":"SELECT","qual":"(bucket_id = 'ypop-files'::text)","roles":["public"],"tablename":"objects","permissive":"PERMISSIVE","policyname":"ypop_files_read_portal","schemaname":"storage","with_check":null}]$oldpolicies$::jsonb) p
 ) baseline_policy_projection;
 _catalog := jsonb_set(_catalog,'{all_policies}',_restored_policies);
 IF encode(sha256(convert_to((_catalog - ARRAY['captured_at','read_only','database','current_user','session_user','foundation_present','gateway_rpc_present'])::text,'UTF8')),'hex') <> 'e189e64d9291386c8c90cb885ec283f92b1fa582b92717dac477fce2cfdebc1f' THEN RAISE EXCEPTION 'Unrelated catalog changed during cutover'; END IF;
 SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'source_md5',md5(p.prosrc),'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'volatility',p.provolatile,'config',p.proconfig,'acl',p.proacl::text) ORDER BY p.oid::regprocedure::text COLLATE "C") INTO _actual FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='ytrace_storage_private' OR (n.nspname='public' AND p.proname='admin_authorize_storage_operation');
 IF _actual IS DISTINCT FROM (SELECT jsonb_agg(x ORDER BY x->>'signature' COLLATE "C") FROM jsonb_array_elements($reviewed_functions$[{"signature":"admin_authorize_storage_operation(text,text,text,text,uuid,text)","source_md5":"bc17ff58b1bcc636d0d6320ccc2e3b33","owner":"postgres","security_definer":true,"volatility":"v","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,service_role=X/postgres}"},{"signature":"ytrace_storage_private.asset_reference_audit()","source_md5":"34e12e0f511faa800891c31d1051a18e","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,service_role=X/postgres}"},{"signature":"ytrace_storage_private.backfill_asset_bindings()","source_md5":"37d337efe6e9bf27b6887b5f84dbf382","owner":"postgres","security_definer":true,"volatility":"v","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.is_active_template(text)","source_md5":"d2727112234d5be6252328dc87983d54","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}"},{"signature":"ytrace_storage_private.is_public_avatar(text,text,text,text)","source_md5":"ba4aa5d6994ee930ebeb1ef7b3faa672","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}"},{"signature":"ytrace_storage_private.is_published_news_image(text)","source_md5":"c41320784f654b0cf194728c0ba69c14","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}"},{"signature":"ytrace_storage_private.organization_object_access(text,text,text)","source_md5":"0fa5031b24cf2ad3495dbd97d1ebdc92","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,authenticated=X/postgres}"},{"signature":"ytrace_storage_private.parent_context(text,text)","source_md5":"80e71dc4d74feab05144426185e344b2","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.public_asset_reference(text,text)","source_md5":"9f49fdee112932949b326c54bad4d70c","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.register_trusted_storage_origin(text,text)","source_md5":"573bad51dd3c2b654a28ad35c736ca1a","owner":"postgres","security_definer":true,"volatility":"v","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,service_role=X/postgres}"},{"signature":"ytrace_storage_private.remember_asset_binding()","source_md5":"41e656072cb78d5ba312fff57966d2e3","owner":"postgres","security_definer":true,"volatility":"v","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.remember_draft_cleanup()","source_md5":"bd447d36f28a8a771749f6d204499cd7","owner":"postgres","security_definer":true,"volatility":"v","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.resource_references(text,text)","source_md5":"528a6ea2e05c53505dd0106bf91081a7","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.url_decode(text)","source_md5":"fced7f9df7e65a9f48c3382e360819e6","owner":"postgres","security_definer":false,"volatility":"i","config":["search_path=pg_catalog"],"acl":"{postgres=X/postgres}"}]$reviewed_functions$::jsonb) x) THEN RAISE EXCEPTION 'Foundation source/security/grant mismatch'; END IF;

END $storage_cutover_post$;
COMMIT;
