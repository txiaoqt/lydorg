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
