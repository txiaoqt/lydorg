-- PREPARATION ONLY. Separately authorize this exact file/hash before installation.
-- Fixed control-plane project: mqqaykksadotbrghbexz. Independently verify its endpoint.
-- SQL catalog matching cannot authenticate the control-plane project by itself.
-- Standalone foundation ONLY: no policy cutover, gateway deployment or business repair.
BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='30s';
DO $storage_preflight$
DECLARE _catalog jsonb;
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
 IF (_catalog->>'foundation_present')::boolean OR (_catalog->>'gateway_rpc_present')::boolean THEN RAISE EXCEPTION 'Storage foundation already exists; do not retry'; END IF;
 IF encode(sha256(convert_to((_catalog - ARRAY['captured_at','read_only','database','current_user','session_user','foundation_present','gateway_rpc_present'])::text,'UTF8')),'hex') <> 'eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5' THEN RAISE EXCEPTION 'Exact reviewed production catalog drifted'; END IF;
END $storage_preflight$;
-- BEGIN unchanged reviewed foundation source; original migration is not edited.
-- REVIEW CANDIDATE, UNAPPLIED. Do not combine with the separate InitPlan migration.
-- Foundation only: policy cutover is a separately gated migration.
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '30s';
CREATE SCHEMA ytrace_storage_private;
REVOKE ALL ON SCHEMA ytrace_storage_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA ytrace_storage_private TO anon,authenticated,service_role;

-- A caller cannot mint or modify these server-created upload reservations.
CREATE TABLE ytrace_storage_private.admin_asset_uploads (
  bucket_id text NOT NULL CHECK (bucket_id IN ('template-files','news-release-images')),
  object_name text NOT NULL,
  admin_id uuid NOT NULL REFERENCES public.admin_accounts(id),
  resource_id uuid,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '2 hours',
  PRIMARY KEY (bucket_id, object_name)
);
ALTER TABLE ytrace_storage_private.admin_asset_uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ytrace_storage_private.admin_asset_uploads FROM PUBLIC, anon, authenticated;

-- Keep authoritative asset associations after replacement, so cleanup can verify
-- a legacy image without accepting an arbitrary object name from the browser.
CREATE TABLE ytrace_storage_private.asset_bindings (
  bucket_id text NOT NULL, object_name text NOT NULL, resource_id uuid NOT NULL,
  PRIMARY KEY(bucket_id,object_name,resource_id)
);
ALTER TABLE ytrace_storage_private.asset_bindings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ytrace_storage_private.asset_bindings FROM PUBLIC,anon,authenticated;

-- Legacy public HTTP asset URLs are honored only for Storage origins registered
-- by the deployment for THIS environment. No hostname is embedded in this file:
-- production, staging and local stacks each register their own origin through
-- register_trusted_storage_origin() as a server-side step. Ordinary roles cannot
-- read or change the registry, and a URL host supplied by a browser is never
-- trusted. storage://bucket/path remains the canonical, environment-neutral form.
CREATE TABLE ytrace_storage_private.trusted_storage_origins (
  origin text PRIMARY KEY CHECK (origin ~ '^https?://[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:[0-9]{1,5})?$'),
  registered_at timestamptz NOT NULL DEFAULT now(),
  note text
);
ALTER TABLE ytrace_storage_private.trusted_storage_origins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ytrace_storage_private.trusted_storage_origins FROM PUBLIC,anon,authenticated;

-- Percent-decoding for public URLs produced by storage-js (encodeURI). Invalid
-- escapes stay literal; invalid UTF-8 fails closed to NULL (no match).
CREATE FUNCTION ytrace_storage_private.url_decode(_value text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
BEGIN
  IF _value IS NULL OR position('%' IN _value)=0 THEN RETURN _value; END IF;
  RETURN (SELECT convert_from(decode(string_agg(CASE WHEN length(m[1])=3 THEN substr(m[1],2) ELSE encode(convert_to(m[1],'UTF8'),'hex') END,''),'hex'),'UTF8')
    FROM regexp_matches(_value,'%[0-9a-fA-F]{2}|.','g') AS r(m));
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION ytrace_storage_private.url_decode(text) FROM PUBLIC,anon,authenticated;

-- Resolves an asset reference to an exact object name in the given public-asset
-- bucket, or NULL. Accepts storage://<bucket>/<name> or
-- <trusted origin>/storage/v1/object/public/<bucket>/<name>[?query][#fragment].
-- Unknown hosts, other buckets, signed/authenticated paths and empty names fail.
CREATE FUNCTION ytrace_storage_private.public_asset_reference(_bucket text,_url text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE _origin text; _rest text; _marker text;
BEGIN
  IF _bucket NOT IN ('template-files','news-release-images') OR _url IS NULL THEN RETURN NULL; END IF;
  IF _url LIKE 'storage://'||_bucket||'/%' THEN RETURN nullif(substr(_url,length('storage://'||_bucket||'/')+1),''); END IF;
  _origin:=lower(substring(_url from '(?i)^(https?://[^/?#]+)'));
  IF _origin IS NULL OR NOT EXISTS (SELECT 1 FROM ytrace_storage_private.trusted_storage_origins t WHERE t.origin=_origin) THEN RETURN NULL; END IF;
  _marker:='/storage/v1/object/public/'||_bucket||'/';
  _rest:=substr(_url,length(_origin)+1);
  IF left(_rest,length(_marker))<>_marker THEN RETURN NULL; END IF;
  _rest:=split_part(split_part(substr(_rest,length(_marker)+1),'?',1),'#',1);
  RETURN nullif(ytrace_storage_private.url_decode(_rest),'');
END $$;
REVOKE ALL ON FUNCTION ytrace_storage_private.public_asset_reference(text,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION ytrace_storage_private.backfill_asset_bindings()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE _count integer;
BEGIN
  WITH refs AS (
    SELECT 'template-files' AS bucket_id, ytrace_storage_private.public_asset_reference('template-files',t.template_url) AS object_name, t.id FROM public.required_document_types t
    UNION ALL
    SELECT 'news-release-images', ytrace_storage_private.public_asset_reference('news-release-images',n.preview_image_url), n.id FROM public.news_releases n
  ), inserted AS (
    INSERT INTO ytrace_storage_private.asset_bindings SELECT bucket_id,object_name,id FROM refs WHERE object_name IS NOT NULL
    ON CONFLICT DO NOTHING RETURNING 1
  ) SELECT count(*) INTO _count FROM inserted;
  RETURN _count;
END $$;
REVOKE ALL ON FUNCTION ytrace_storage_private.backfill_asset_bindings() FROM PUBLIC,anon,authenticated;

-- Deployment-only configuration entry point (migration owner or service_role).
-- Registers one environment origin and binds legacy references at that origin.
-- Returns the number of newly bound assets. Never exposed to anon/authenticated.
CREATE FUNCTION ytrace_storage_private.register_trusted_storage_origin(_origin text,_note text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  INSERT INTO ytrace_storage_private.trusted_storage_origins(origin,note) VALUES(lower(rtrim(btrim(_origin),'/')),_note)
  ON CONFLICT(origin) DO UPDATE SET note=coalesce(EXCLUDED.note,trusted_storage_origins.note);
  RETURN ytrace_storage_private.backfill_asset_bindings();
END $$;
REVOKE ALL ON FUNCTION ytrace_storage_private.register_trusted_storage_origin(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION ytrace_storage_private.register_trusted_storage_origin(text,text) TO service_role;

-- Aggregate legacy-reference audit for operators: counts only, no row content.
-- "unresolved" rows look like Storage URLs but match no trusted origin/bucket.
CREATE FUNCTION ytrace_storage_private.asset_reference_audit()
RETURNS TABLE(resource_kind text, origin text, form text, published boolean, resolvable boolean, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  WITH refs AS (
    SELECT 'news' AS resource_kind,'news-release-images' AS bucket_id,n.preview_image_url AS url,n.visibility_status::text='published' AS published FROM public.news_releases n
    UNION ALL
    SELECT 'template','template-files',t.template_url,t.is_active FROM public.required_document_types t
  )
  SELECT resource_kind,
    CASE WHEN url LIKE 'storage://%' THEN 'storage://' ELSE lower(substring(url from '(?i)^(https?://[^/?#]+)')) END,
    CASE WHEN nullif(btrim(coalesce(url,'')),'')IS NULL THEN 'empty' WHEN url LIKE 'storage://%' THEN 'canonical'
      WHEN url ~ '/storage/v1/object/public/' THEN 'legacy-public-url' WHEN url ~ '/storage/v1/' THEN 'other-storage-url' ELSE 'external' END,
    published, ytrace_storage_private.public_asset_reference(bucket_id,url) IS NOT NULL, count(*)
  FROM refs GROUP BY 1,2,3,4,5 ORDER BY 1,2,3,4,5
$$;
REVOKE ALL ON FUNCTION ytrace_storage_private.asset_reference_audit() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION ytrace_storage_private.asset_reference_audit() TO service_role;

CREATE FUNCTION ytrace_storage_private.remember_asset_binding()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE _bucket text; _name text;
BEGIN
  _bucket:=CASE TG_TABLE_NAME WHEN 'required_document_types' THEN 'template-files' ELSE 'news-release-images' END;
  _name:=ytrace_storage_private.public_asset_reference(_bucket,
    CASE TG_TABLE_NAME WHEN 'required_document_types' THEN to_jsonb(NEW)->>'template_url' ELSE to_jsonb(NEW)->>'preview_image_url' END);
  IF _name IS NOT NULL THEN INSERT INTO ytrace_storage_private.asset_bindings VALUES(_bucket,_name,NEW.id) ON CONFLICT DO NOTHING; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION ytrace_storage_private.remember_asset_binding() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER ytrace_remember_template_asset AFTER INSERT OR UPDATE OF template_url ON public.required_document_types
FOR EACH ROW EXECUTE FUNCTION ytrace_storage_private.remember_asset_binding();
CREATE TRIGGER ytrace_remember_news_asset AFTER INSERT OR UPDATE OF preview_image_url ON public.news_releases
FOR EACH ROW EXECUTE FUNCTION ytrace_storage_private.remember_asset_binding();
-- Canonical storage:// references bind now; legacy HTTP references bind when the
-- deployment registers this environment's origin. Production metadata is not rewritten.
SELECT ytrace_storage_private.backfill_asset_bindings();

-- Bounded cleanup authorization survives successful draft-parent deletion. It
-- never permits deleting reviewed bytes and is issued by a BEFORE DELETE guard.
CREATE TABLE ytrace_storage_private.cleanup_receipts (
  bucket_id text NOT NULL, object_name text NOT NULL, user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes',
  PRIMARY KEY(bucket_id,object_name,user_id)
);
ALTER TABLE ytrace_storage_private.cleanup_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ytrace_storage_private.cleanup_receipts FROM PUBLIC,anon,authenticated;

-- Exact metadata-to-parent relationships, not a browser-provided ownership claim.
-- Shared YPOP metadata must agree with its authoritative parent's organization.
CREATE FUNCTION ytrace_storage_private.resource_references(_bucket text, _name text)
RETURNS TABLE(organization_id uuid, parent_id uuid, resource_kind text, permissions text[], reviewable boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT ds.organization_id, ds.id, CASE WHEN ds.submission_scope='renewal' THEN 'renewal' ELSE 'registration' END,
    CASE WHEN ds.submission_scope='renewal' THEN ARRAY['renewals_manage','registrations_management']
      WHEN op.profile_status::text='verified' AND f.admin_status::text='approved_green'
        THEN ARRAY['registrations_management','yorp_registry_view'] ELSE ARRAY['registrations_management'] END, f.admin_status::text<>'draft'
  FROM public.document_submission_files f JOIN public.document_submissions ds ON ds.id=f.submission_id
    JOIN public.organization_profiles op ON op.id=ds.organization_id
  WHERE _bucket='organization-documents' AND (f.file_url='storage://'||_bucket||'/'||_name
    OR jsonb_path_exists(coalesce(f.revision_history,'[]'::jsonb), '$.** ? (@ == $url)',
      jsonb_build_object('url','storage://'||_bucket||'/'||_name)))
    AND (ds.submission_scope IS DISTINCT FROM 'renewal' OR EXISTS (
      SELECT 1 FROM public.organization_renewals r WHERE r.id=ds.renewal_id AND r.organization_id=ds.organization_id))
  UNION ALL
  SELECT op.id,op.id,'profile',ARRAY['registrations_management','yorp_registry_view'],true
  FROM public.organization_profiles op WHERE _bucket='organization-documents' AND op.profile_image_url='storage://'||_bucket||'/'||_name
  UNION ALL
  SELECT b.organization_id,b.id,'budget',ARRAY['budget_requests_review'],b.status::text<>'draft'
  FROM public.budget_request_files f JOIN public.budget_requests b ON b.id=f.budget_request_id
  WHERE _bucket='budget-request-files' AND f.file_url='storage://'||_bucket||'/'||_name
  UNION ALL
  SELECT l.organization_id,l.id,'liquidation',ARRAY['liquidation_reports_review'],l.status::text IN ('submitted','under_review','needs_revision','approved_for_ftf_green','hard_copy_submitted','completed_liquidated','rejected_red')
  FROM public.liquidation_report_files f JOIN public.liquidation_reports l ON l.id=f.liquidation_report_id
    JOIN public.budget_requests b ON b.id=l.budget_request_id AND b.organization_id=l.organization_id
  WHERE _bucket='liquidation-report-files' AND f.file_url='storage://'||_bucket||'/'||_name
  UNION ALL
  SELECT e.organization_id,e.id,'ypop-entry',ARRAY['ypop_validation_review'],e.status::text<>'draft'
  FROM public.ypop_files f JOIN public.ypop_entries e ON e.id=f.ypop_entry_id AND e.organization_id=f.organization_id
  WHERE _bucket='ypop-files' AND f.file_url='storage://'||_bucket||'/'||_name
  UNION ALL
  SELECT e.organization_id,e.id,'ypop-event',ARRAY['ypop_validation_review'],e.status::text NOT IN ('draft','confirmed')
  FROM public.ypop_event_files f JOIN public.ypop_event_participations e ON e.id=f.participation_id AND e.organization_id=f.organization_id
  WHERE _bucket='ypop-files' AND f.file_url='storage://'||_bucket||'/'||_name
  UNION ALL
  SELECT a.organization_id,a.id,'ypop-activity',ARRAY['ypop_validation_review'],a.status::text<>'draft'
  FROM public.ypop_org_activity_files f JOIN public.ypop_org_activities a ON a.id=f.org_activity_id AND a.organization_id=f.organization_id
    JOIN public.ypop_entries e ON e.id=a.ypop_entry_id AND e.organization_id=a.organization_id
  WHERE _bucket='ypop-files' AND f.file_url='storage://'||_bucket||'/'||_name
  UNION ALL
  -- MOVE has no dedicated permission in the current custom Admin registry.
  -- Empty permissions means super_admin only; do not invent an authorization grant.
  SELECT a.organization_id,a.id,'move',ARRAY[]::text[],a.status::text<>'draft'
  FROM public.move_files f JOIN public.move_applications a ON a.id=f.application_id AND a.organization_id=f.organization_id
  WHERE _bucket='move-files' AND f.file_url='storage://'||_bucket||'/'||_name
  UNION ALL
  SELECT NULL::uuid,t.id,'template',ARRAY['forms_templates_management','registrations_management','renewals_manage'],true
  FROM public.required_document_types t WHERE _bucket='template-files'
    AND ytrace_storage_private.public_asset_reference(_bucket,t.template_url)=_name
  UNION ALL
  SELECT NULL::uuid,n.id,'news',ARRAY['news_releases_management'],true
  FROM public.news_releases n WHERE _bucket='news-release-images'
    AND ytrace_storage_private.public_asset_reference(_bucket,n.preview_image_url)=_name
$$;
REVOKE ALL ON FUNCTION ytrace_storage_private.resource_references(text,text) FROM PUBLIC, anon, authenticated;

-- Policy predicates for public assets. Environment-neutral: canonical references
-- and legacy URLs at this environment's registered origin only.
CREATE FUNCTION ytrace_storage_private.is_active_template(_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT EXISTS (SELECT 1 FROM public.required_document_types t WHERE t.is_active
    AND ytrace_storage_private.public_asset_reference('template-files',t.template_url)=_name)
$$;
REVOKE ALL ON FUNCTION ytrace_storage_private.is_active_template(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION ytrace_storage_private.is_active_template(text) TO anon,authenticated;
CREATE FUNCTION ytrace_storage_private.is_published_news_image(_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT EXISTS (SELECT 1 FROM public.news_releases n WHERE n.visibility_status::text='published'
    AND ytrace_storage_private.public_asset_reference('news-release-images',n.preview_image_url)=_name)
$$;
REVOKE ALL ON FUNCTION ytrace_storage_private.is_published_news_image(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION ytrace_storage_private.is_published_news_image(text) TO anon,authenticated;

-- Directory avatars are intentionally published, not registration documents.
-- Require consent, verified status, exact registered profile path AND Storage's
-- actual MIME metadata. A profile URL cannot publish another private PDF.
CREATE FUNCTION ytrace_storage_private.is_public_avatar(_bucket text,_name text,_mime text,_owner text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT _bucket='organization-documents' AND split_part(_name,'/',2)='profile'
  AND _mime IN ('image/jpeg','image/png','image/webp') AND EXISTS(
    SELECT 1 FROM public.organization_profiles op WHERE op.id::text=split_part(_name,'/',1)
      AND op.user_id::text=_owner AND op.profile_status::text='verified' AND op.directory_visibility
      AND op.profile_image_url='storage://organization-documents/'||_name)
$$;
REVOKE ALL ON FUNCTION ytrace_storage_private.is_public_avatar(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION ytrace_storage_private.is_public_avatar(text,text,text,text) TO anon,authenticated;

-- Parent lookup for upload-before-metadata. A UUID path is only an identifier:
-- authorization additionally joins a real parent to its real organization/user.
CREATE FUNCTION ytrace_storage_private.parent_context(_bucket text, _name text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE _id uuid; _org uuid; _row jsonb; _submission jsonb; _renewal_context jsonb; _kind text; _type uuid; _renewal uuid;
BEGIN
  IF split_part(_name,'/',1) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR _name LIKE '%/../%' OR _name LIKE '%/./%' THEN RETURN NULL; END IF;
  _id := split_part(_name,'/',1)::uuid;
  CASE _bucket
    WHEN 'organization-documents' THEN
      _org:=_id;
      IF split_part(_name,'/',2)='profile' THEN
        RETURN jsonb_build_object('organization_id',_org,'parent_id',_id,'status','draft','kind','profile');
      END IF;
      BEGIN
        IF split_part(_name,'/',2)='renewal' THEN
          _renewal:=split_part(_name,'/',3)::uuid; _type:=split_part(_name,'/',4)::uuid;
        ELSE _type:=split_part(_name,'/',2)::uuid; END IF;
      EXCEPTION WHEN invalid_text_representation THEN RETURN NULL; END;
      IF NOT EXISTS (SELECT 1 FROM public.required_document_types WHERE id=_type) THEN RETURN NULL; END IF;
      SELECT to_jsonb(ds) INTO _row FROM public.document_submissions ds
      WHERE ds.organization_id=_org AND (CASE WHEN _renewal IS NULL THEN ds.submission_scope IS DISTINCT FROM 'renewal'
        ELSE ds.submission_scope='renewal' AND ds.renewal_id=_renewal AND EXISTS (
          SELECT 1 FROM public.organization_renewals r WHERE r.id=_renewal AND r.organization_id=_org ) END)
      ORDER BY ds.created_at DESC LIMIT 1;
      IF _row IS NULL THEN RETURN NULL; END IF;
      _submission:=_row;
      -- Per-requirement lock takes precedence over submission-level status.
      SELECT to_jsonb(f) || jsonb_build_object('organization_id',_org,'parent_id',_row->>'id','status',f.admin_status::text)
      INTO _row FROM public.document_submission_files f WHERE f.submission_id=(_row->>'id')::uuid AND f.document_type_id=_type;
      IF _row IS NULL THEN _row:=jsonb_build_object('organization_id',_org,'status','draft'); END IF;
      _row:=_row || jsonb_build_object('parent_revision_blocked',
        _submission->>'status'='rejected_red' OR (_submission->>'revision_unlocked_at' IS NULL AND (
          coalesce((_submission->>'revision_locked')::boolean,false) OR _submission->>'revision_locked_at' IS NOT NULL OR
          (_submission->>'revision_due_at' IS NOT NULL AND (_submission->>'revision_due_at')::timestamptz<=now()))));
      IF _renewal IS NOT NULL THEN
        SELECT to_jsonb(r) INTO _renewal_context FROM public.organization_renewals r WHERE r.id=_renewal;
        _row:=_row || jsonb_build_object('renewal_status',_renewal_context->>'status','renewal_revision_blocked',
          _renewal_context->>'revision_unlocked_at' IS NULL AND (
            coalesce((_renewal_context->>'revision_locked')::boolean,false) OR _renewal_context->>'revision_locked_at' IS NOT NULL OR
            (_renewal_context->>'revision_due_at' IS NOT NULL AND (_renewal_context->>'revision_due_at')::timestamptz<=now())));
      END IF;
      _kind:='document';
    WHEN 'budget-request-files' THEN SELECT to_jsonb(b),b.organization_id INTO _row,_org FROM public.budget_requests b WHERE b.id=_id; _kind:='budget';
    WHEN 'liquidation-report-files' THEN
      SELECT to_jsonb(l),l.organization_id INTO _row,_org FROM public.liquidation_reports l JOIN public.budget_requests b
        ON b.id=l.budget_request_id AND b.organization_id=l.organization_id WHERE l.id=_id; _kind:='liquidation';
    WHEN 'ypop-files' THEN
      SELECT to_jsonb(e),e.organization_id INTO _row,_org FROM public.ypop_entries e WHERE e.id=_id; _kind:='ypop';
      IF _row IS NULL THEN SELECT to_jsonb(e),e.organization_id INTO _row,_org FROM public.ypop_event_participations e WHERE e.id=_id; END IF;
      IF _row IS NULL THEN SELECT to_jsonb(a) || jsonb_build_object('semester',e.semester),a.organization_id INTO _row,_org
        FROM public.ypop_org_activities a JOIN public.ypop_entries e ON e.id=a.ypop_entry_id AND e.organization_id=a.organization_id WHERE a.id=_id; END IF;
    WHEN 'move-files' THEN SELECT to_jsonb(a),a.organization_id INTO _row,_org FROM public.move_applications a WHERE a.id=_id; _kind:='move';
    ELSE RETURN NULL;
  END CASE;
  IF _row IS NULL OR _org IS NULL THEN RETURN NULL; END IF;
  RETURN _row || jsonb_build_object('organization_id',_org,'kind',_kind);
END $$;
REVOKE ALL ON FUNCTION ytrace_storage_private.parent_context(text,text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION ytrace_storage_private.organization_object_access(_bucket text, _name text, _operation text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE _ctx jsonb; _uid uuid := auth.uid(); _status text;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  IF _operation IN ('read','delete') AND EXISTS (
    SELECT 1 FROM ytrace_storage_private.cleanup_receipts c JOIN public.organization_profiles op ON op.id=c.organization_id AND op.user_id=c.user_id
    WHERE c.bucket_id=_bucket AND c.object_name=_name AND c.user_id=_uid AND c.expires_at>now()
      AND op.profile_status::text<>'suspended_inactive') THEN RETURN true; END IF;
  _ctx:=ytrace_storage_private.parent_context(_bucket,_name);
  IF _ctx IS NULL OR NOT EXISTS (SELECT 1 FROM public.organization_profiles op
    WHERE op.id=(_ctx->>'organization_id')::uuid AND op.user_id=_uid AND op.profile_status::text<>'suspended_inactive') THEN RETURN false; END IF;
  IF _operation='read' THEN RETURN true; END IF;
  IF coalesce((_ctx->>'parent_revision_blocked')::boolean,false) OR coalesce((_ctx->>'renewal_revision_blocked')::boolean,false) THEN RETURN false; END IF;
  IF _ctx->>'renewal_status' IN ('approved','rejected','submitted','resubmitted','under_review') THEN RETURN false; END IF;
  _status:=_ctx->>'status';
  IF _status NOT IN ('draft','not_started','needs_revision','pending_activity_completion','overdue','confirmed')
    AND NOT (_ctx->>'kind'='liquidation' AND _status='rejected_red') THEN RETURN false; END IF;
  IF _ctx->>'revision_unlocked_at' IS NULL AND
     (coalesce((_ctx->>'revision_locked')::boolean,false) OR _ctx->>'revision_locked_at' IS NOT NULL) THEN RETURN false; END IF;
  IF _ctx->>'revision_due_at' IS NOT NULL AND (_ctx->>'revision_due_at')::timestamptz<=now()
     AND _ctx->>'revision_unlocked_at' IS NULL THEN RETURN false; END IF;
  IF _ctx->>'kind'='ypop' AND _ctx->>'semester' IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.ypop_periods p WHERE p.semester_key=_ctx->>'semester' AND p.status::text='open') THEN RETURN false; END IF;
  -- Existing requested revisions may be replaced via a NEW object, never erased.
  IF _operation='delete' AND _ctx->>'kind'='document' AND EXISTS (SELECT 1 FROM ytrace_storage_private.resource_references(_bucket,_name))
     AND _status='needs_revision' THEN RETURN false; END IF;
  RETURN _operation IN ('insert','delete');
END $$;
REVOKE ALL ON FUNCTION ytrace_storage_private.organization_object_access(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ytrace_storage_private.organization_object_access(text,text,text) TO authenticated;

CREATE FUNCTION ytrace_storage_private.remember_draft_cleanup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE _bucket text; _url text;
BEGIN
  IF auth.uid() IS NULL OR OLD.status::text NOT IN ('draft','not_started','needs_revision','confirmed','pending_activity_completion','overdue') THEN RETURN OLD; END IF;
  DELETE FROM ytrace_storage_private.cleanup_receipts WHERE user_id=auth.uid() AND expires_at<=now();
  FOR _bucket,_url IN
    SELECT 'budget-request-files',f.file_url FROM public.budget_request_files f WHERE TG_TABLE_NAME='budget_requests' AND f.budget_request_id=OLD.id
    UNION ALL SELECT 'liquidation-report-files',f.file_url FROM public.liquidation_report_files f WHERE TG_TABLE_NAME='liquidation_reports' AND f.liquidation_report_id=OLD.id
    UNION ALL SELECT 'ypop-files',f.file_url FROM public.ypop_files f WHERE TG_TABLE_NAME='ypop_entries' AND f.ypop_entry_id=OLD.id
    UNION ALL SELECT 'ypop-files',f.file_url FROM public.ypop_event_files f WHERE TG_TABLE_NAME='ypop_event_participations' AND f.participation_id=OLD.id
    UNION ALL SELECT 'ypop-files',f.file_url FROM public.ypop_org_activity_files f WHERE TG_TABLE_NAME='ypop_org_activities' AND f.org_activity_id=OLD.id
    UNION ALL SELECT 'move-files',f.file_url FROM public.move_files f WHERE TG_TABLE_NAME='move_applications' AND f.application_id=OLD.id
  LOOP
    IF _url LIKE 'storage://'||_bucket||'/%' THEN
      _url:=substr(_url,length('storage://'||_bucket||'/')+1);
      IF ytrace_storage_private.organization_object_access(_bucket,_url,'delete') THEN
        INSERT INTO ytrace_storage_private.cleanup_receipts(bucket_id,object_name,user_id,organization_id) VALUES(_bucket,_url,auth.uid(),OLD.organization_id)
          ON CONFLICT(bucket_id,object_name,user_id) DO UPDATE SET expires_at=EXCLUDED.expires_at;
      END IF;
    END IF;
  END LOOP;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION ytrace_storage_private.remember_draft_cleanup() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER ytrace_budget_cleanup BEFORE DELETE ON public.budget_requests FOR EACH ROW EXECUTE FUNCTION ytrace_storage_private.remember_draft_cleanup();
CREATE TRIGGER ytrace_liquidation_cleanup BEFORE DELETE ON public.liquidation_reports FOR EACH ROW EXECUTE FUNCTION ytrace_storage_private.remember_draft_cleanup();
CREATE TRIGGER ytrace_ypop_cleanup BEFORE DELETE ON public.ypop_entries FOR EACH ROW EXECUTE FUNCTION ytrace_storage_private.remember_draft_cleanup();
CREATE TRIGGER ytrace_event_cleanup BEFORE DELETE ON public.ypop_event_participations FOR EACH ROW EXECUTE FUNCTION ytrace_storage_private.remember_draft_cleanup();
CREATE TRIGGER ytrace_activity_cleanup BEFORE DELETE ON public.ypop_org_activities FOR EACH ROW EXECUTE FUNCTION ytrace_storage_private.remember_draft_cleanup();
CREATE TRIGGER ytrace_move_cleanup BEFORE DELETE ON public.move_applications FOR EACH ROW EXECUTE FUNCTION ytrace_storage_private.remember_draft_cleanup();

-- Only the server's service role can invoke this RPC. Custom tokens are still
-- independently validated: service access is NOT itself Admin authorization.
CREATE FUNCTION public.admin_authorize_storage_operation(_session_token text,_operation text,_bucket text,_object_name text,_resource_id uuid DEFAULT NULL,_file_name text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE _admin uuid; _role text; _permissions text[]; _allowed boolean:=false; _name text;
BEGIN
  SELECT a.id,r.code,coalesce(r.permission_codes,ARRAY[]::text[]) INTO _admin,_role,_permissions
  FROM public.validate_admin_session_token(_session_token) v JOIN public.admin_accounts a ON a.id=v.admin_id AND a.is_active
    JOIN public.roles r ON r.id=a.role_id LIMIT 1;
  IF _admin IS NULL THEN RAISE EXCEPTION 'Admin session is invalid or expired.' USING ERRCODE='42501'; END IF;
  IF _operation NOT IN ('sign','upload','delete') OR _bucket NOT IN ('organization-documents','budget-request-files','liquidation-report-files','ypop-files','move-files','template-files','news-release-images') THEN
    RAISE EXCEPTION 'Storage access denied.' USING ERRCODE='42501'; END IF;
  IF _operation='sign' THEN
    SELECT EXISTS(SELECT 1 FROM ytrace_storage_private.resource_references(_bucket,_object_name) ref
      WHERE ref.reviewable AND (_role='super_admin' OR ref.permissions && _permissions) AND (ref.organization_id IS NULL OR EXISTS(
        SELECT 1 FROM storage.objects o JOIN public.organization_profiles op ON op.user_id::text=coalesce(o.owner_id,o.owner::text) AND op.id=ref.organization_id
        WHERE o.bucket_id=_bucket AND o.name=_object_name))) INTO _allowed;
    -- Reject ambiguous cross-organization associations instead of guessing.
    IF (SELECT count(DISTINCT organization_id) FROM ytrace_storage_private.resource_references(_bucket,_object_name))>1 THEN _allowed:=false; END IF;
    _name:=_object_name;
  ELSE
    IF _bucket NOT IN ('template-files','news-release-images') THEN RAISE EXCEPTION 'Storage access denied.' USING ERRCODE='42501'; END IF;
    _allowed:=_role='super_admin' OR (CASE _bucket WHEN 'template-files' THEN 'forms_templates_management' ELSE 'news_releases_management' END)=ANY(_permissions);
    IF _allowed AND _operation='upload' THEN
      DELETE FROM ytrace_storage_private.admin_asset_uploads WHERE admin_id=_admin AND expires_at<=now();
      IF _bucket='template-files' AND NOT EXISTS(SELECT 1 FROM public.required_document_types WHERE id=_resource_id) THEN _allowed:=false;
      ELSE
        _name:=CASE WHEN _bucket='template-files' THEN _resource_id::text ELSE 'news-releases' END || '/' || gen_random_uuid()::text || '-' ||
          left(regexp_replace(coalesce(nullif(_file_name,''),CASE WHEN _bucket='template-files' THEN 'template.pdf' ELSE 'image' END),'[^a-zA-Z0-9._-]+','_','g'),160);
        INSERT INTO ytrace_storage_private.admin_asset_uploads(bucket_id,object_name,admin_id,resource_id) VALUES(_bucket,_name,_admin,_resource_id);
      END IF;
    ELSIF _allowed AND _operation='delete' THEN
      -- Referenced assets are removed only through their existing metadata workflow;
      -- this endpoint supports cleanup of this Admin's unattached failed upload.
      _name:=_object_name;
      _allowed:=(EXISTS(SELECT 1 FROM ytrace_storage_private.admin_asset_uploads u WHERE u.bucket_id=_bucket AND u.object_name=_name
        AND u.admin_id=_admin AND u.expires_at>now()) OR EXISTS(
          SELECT 1 FROM ytrace_storage_private.asset_bindings b WHERE b.bucket_id=_bucket AND b.object_name=_name))
        AND NOT EXISTS(SELECT 1 FROM ytrace_storage_private.resource_references(_bucket,_name));
    END IF;
  END IF;
  IF NOT _allowed OR _name IS NULL OR _name='' THEN RAISE EXCEPTION 'Storage access denied.' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('bucket_id',_bucket,'object_name',_name);
END $$;
REVOKE ALL ON FUNCTION public.admin_authorize_storage_operation(text,text,text,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_authorize_storage_operation(text,text,text,text,uuid,text) TO service_role;

-- END unchanged reviewed foundation source.
SELECT ytrace_storage_private.register_trusted_storage_origin('https://mqqaykksadotbrghbexz.supabase.co','Production foundation; separately approved deployment');
DO $storage_postflight$
DECLARE _catalog jsonb; _actual jsonb;
BEGIN
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
 IF encode(sha256(convert_to((_catalog - ARRAY['captured_at','read_only','database','current_user','session_user','foundation_present','gateway_rpc_present'])::text,'UTF8')),'hex') <> 'eeda91fe5fcecb55724d162715eef3e094ae5e445eece0957f11eff4c4ef5eb5' THEN RAISE EXCEPTION 'Unrelated catalog or permissions changed'; END IF;
 IF NOT (_catalog->>'foundation_present')::boolean OR NOT (_catalog->>'gateway_rpc_present')::boolean THEN RAISE EXCEPTION 'Missing foundation'; END IF;
 SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'source_md5',md5(p.prosrc),'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'volatility',p.provolatile,'config',p.proconfig,'acl',p.proacl::text) ORDER BY p.oid::regprocedure::text COLLATE "C") INTO _actual FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='ytrace_storage_private' OR (n.nspname='public' AND p.proname='admin_authorize_storage_operation');
 IF _actual IS DISTINCT FROM (SELECT jsonb_agg(x ORDER BY x->>'signature' COLLATE "C") FROM jsonb_array_elements($reviewed_functions$[{"signature":"admin_authorize_storage_operation(text,text,text,text,uuid,text)","source_md5":"bc17ff58b1bcc636d0d6320ccc2e3b33","owner":"postgres","security_definer":true,"volatility":"v","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,service_role=X/postgres}"},{"signature":"ytrace_storage_private.asset_reference_audit()","source_md5":"34e12e0f511faa800891c31d1051a18e","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,service_role=X/postgres}"},{"signature":"ytrace_storage_private.backfill_asset_bindings()","source_md5":"37d337efe6e9bf27b6887b5f84dbf382","owner":"postgres","security_definer":true,"volatility":"v","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.is_active_template(text)","source_md5":"d2727112234d5be6252328dc87983d54","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}"},{"signature":"ytrace_storage_private.is_public_avatar(text,text,text,text)","source_md5":"ba4aa5d6994ee930ebeb1ef7b3faa672","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}"},{"signature":"ytrace_storage_private.is_published_news_image(text)","source_md5":"c41320784f654b0cf194728c0ba69c14","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}"},{"signature":"ytrace_storage_private.organization_object_access(text,text,text)","source_md5":"0fa5031b24cf2ad3495dbd97d1ebdc92","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,authenticated=X/postgres}"},{"signature":"ytrace_storage_private.parent_context(text,text)","source_md5":"80e71dc4d74feab05144426185e344b2","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.public_asset_reference(text,text)","source_md5":"9f49fdee112932949b326c54bad4d70c","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.register_trusted_storage_origin(text,text)","source_md5":"573bad51dd3c2b654a28ad35c736ca1a","owner":"postgres","security_definer":true,"volatility":"v","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres,service_role=X/postgres}"},{"signature":"ytrace_storage_private.remember_asset_binding()","source_md5":"41e656072cb78d5ba312fff57966d2e3","owner":"postgres","security_definer":true,"volatility":"v","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.remember_draft_cleanup()","source_md5":"bd447d36f28a8a771749f6d204499cd7","owner":"postgres","security_definer":true,"volatility":"v","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.resource_references(text,text)","source_md5":"528a6ea2e05c53505dd0106bf91081a7","owner":"postgres","security_definer":true,"volatility":"s","config":["search_path=pg_catalog, public"],"acl":"{postgres=X/postgres}"},{"signature":"ytrace_storage_private.url_decode(text)","source_md5":"fced7f9df7e65a9f48c3382e360819e6","owner":"postgres","security_definer":false,"volatility":"i","config":["search_path=pg_catalog"],"acl":"{postgres=X/postgres}"}]$reviewed_functions$::jsonb) x) THEN RAISE EXCEPTION 'Foundation source/security/grant mismatch'; END IF;
 IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ytrace_storage_private' AND c.relkind='r' AND c.relrowsecurity)=4 IS NOT TRUE THEN RAISE EXCEPTION 'Private foundation table/RLS mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN (VALUES('anon'),('authenticated')) r(role_name) WHERE n.nspname='ytrace_storage_private' AND c.relkind='r' AND (has_table_privilege(r.role_name,c.oid,'SELECT') OR has_table_privilege(r.role_name,c.oid,'INSERT') OR has_table_privilege(r.role_name,c.oid,'UPDATE') OR has_table_privilege(r.role_name,c.oid,'DELETE'))) THEN RAISE EXCEPTION 'Unexpected browser access to private tables'; END IF;
 IF (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal AND t.tgenabled='O' AND t.tgname IN ('ytrace_remember_template_asset','ytrace_remember_news_asset','ytrace_budget_cleanup','ytrace_liquidation_cleanup','ytrace_ypop_cleanup','ytrace_event_cleanup','ytrace_activity_cleanup','ytrace_move_cleanup'))<>8 THEN RAISE EXCEPTION 'Foundation trigger mismatch'; END IF;
 IF (SELECT array_agg(origin ORDER BY origin) FROM ytrace_storage_private.trusted_storage_origins) IS DISTINCT FROM ARRAY['https://mqqaykksadotbrghbexz.supabase.co'] THEN RAISE EXCEPTION 'Unexpected trusted origin'; END IF;
 IF EXISTS(SELECT 1 FROM ytrace_storage_private.asset_reference_audit() WHERE published AND form NOT IN ('empty','external') AND NOT resolvable) THEN RAISE EXCEPTION 'Active public asset reference does not resolve'; END IF;
END $storage_postflight$;
COMMIT;
