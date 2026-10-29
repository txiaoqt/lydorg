-- Intentionally reproduces pre-cutover Storage policies for the isolated staging drift-gate baseline.
-- These legacy rules are vulnerable; do not expose staging or add real/private data before the secure cutover.
SET search_path = pg_catalog, public, extensions, auth, storage;
CREATE POLICY "budget_request_files_manage_own" ON "storage"."objects" AS PERMISSIVE FOR ALL TO PUBLIC
  USING (((bucket_id = 'budget-request-files'::text) AND (current_user_is_admin() OR (owner = auth.uid()))))
  WITH CHECK (((bucket_id = 'budget-request-files'::text) AND (current_user_is_admin() OR (owner = auth.uid()))));

CREATE POLICY "budget_request_files_read_portal" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ((bucket_id = 'budget-request-files'::text));

CREATE POLICY "liquidation_report_files_manage_own" ON "storage"."objects" AS PERMISSIVE FOR ALL TO PUBLIC
  USING (((bucket_id = 'liquidation-report-files'::text) AND (current_user_is_admin() OR (owner = auth.uid()))))
  WITH CHECK (((bucket_id = 'liquidation-report-files'::text) AND (current_user_is_admin() OR (owner = auth.uid()))));

CREATE POLICY "liquidation_report_files_read_portal" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ((bucket_id = 'liquidation-report-files'::text));

CREATE POLICY "move_files_manage_own" ON "storage"."objects" AS PERMISSIVE FOR ALL TO PUBLIC
  USING (((bucket_id = 'move-files'::text) AND (current_user_is_admin() OR (owner = auth.uid()))))
  WITH CHECK (((bucket_id = 'move-files'::text) AND (current_user_is_admin() OR (owner = auth.uid()))));

CREATE POLICY "move_files_read_portal" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ((bucket_id = 'move-files'::text));

CREATE POLICY "news_release_images_admin_manage" ON "storage"."objects" AS PERMISSIVE FOR ALL TO PUBLIC
  USING ((bucket_id = 'news-release-images'::text))
  WITH CHECK ((bucket_id = 'news-release-images'::text));

CREATE POLICY "organization_documents_manage_own" ON "storage"."objects" AS PERMISSIVE FOR ALL TO PUBLIC
  USING (((bucket_id = 'organization-documents'::text) AND (current_user_is_admin() OR (owner = auth.uid()))))
  WITH CHECK (((bucket_id = 'organization-documents'::text) AND (current_user_is_admin() OR (owner = auth.uid()))));

CREATE POLICY "organization_documents_read_portal" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ((bucket_id = 'organization-documents'::text));

CREATE POLICY "template_files_admin_manage" ON "storage"."objects" AS PERMISSIVE FOR ALL TO PUBLIC
  USING ((bucket_id = 'template-files'::text))
  WITH CHECK ((bucket_id = 'template-files'::text));

CREATE POLICY "transparency_attachments_admin_manage" ON "storage"."objects" AS PERMISSIVE FOR ALL TO PUBLIC
  USING (((bucket_id = 'transparency-attachments'::text) AND current_user_is_admin()))
  WITH CHECK (((bucket_id = 'transparency-attachments'::text) AND current_user_is_admin()));

CREATE POLICY "transparency_attachments_read_public" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ((bucket_id = 'transparency-attachments'::text));

CREATE POLICY "yorp_sample_seed_assets_read" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO "anon", "authenticated"
  USING (((bucket_id = 'registration-seed-file'::text) AND (name = ANY (ARRAY['Constitution and By-Laws.pdf'::text, 'Endorsement.pdf'::text, 'NYC YORP Registration Form (Form B).pdf'::text, 'Pasig City YORP Registration Form (Form A).pdf'::text, 'YORP Directory of Officers and Adviser.pdf'::text, 'YORP List of Members in Good Standing.pdf'::text]))));

CREATE POLICY "ypop_files_manage_own" ON "storage"."objects" AS PERMISSIVE FOR ALL TO PUBLIC
  USING (((bucket_id = 'ypop-files'::text) AND (current_user_is_admin() OR (owner = auth.uid()))))
  WITH CHECK (((bucket_id = 'ypop-files'::text) AND (current_user_is_admin() OR (owner = auth.uid()))));

CREATE POLICY "ypop_files_read_portal" ON "storage"."objects" AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ((bucket_id = 'ypop-files'::text));
