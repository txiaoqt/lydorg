-- Staging-only: Public schema policies as captured; test only with synthetic identities.
SET search_path = pg_catalog, public, extensions, auth, storage;

CREATE POLICY "Allow service role full access to activity_announcements" ON "public"."activity_announcements" AS PERMISSIVE FOR ALL TO "service_role"
USING (true)
WITH CHECK (true);
CREATE POLICY "activity_logs_admin_only" ON "public"."activity_logs" AS PERMISSIVE FOR ALL TO PUBLIC
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());
CREATE POLICY "activity_logs_organization_read" ON "public"."activity_logs" AS PERMISSIVE FOR SELECT TO PUBLIC
USING ((EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = activity_logs.organization_id) AND (op.user_id = auth.uid())))));
CREATE POLICY "admin_accounts_admin_manage" ON "public"."admin_accounts" AS PERMISSIVE FOR ALL TO PUBLIC
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());
CREATE POLICY "admin_sessions_admin_manage" ON "public"."admin_sessions" AS PERMISSIVE FOR ALL TO PUBLIC
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());
CREATE POLICY "Public read non-sensitive system settings" ON "public"."admin_system_settings" AS PERMISSIVE FOR SELECT TO "anon", "authenticated"
USING ((is_sensitive = false));
CREATE POLICY "Allow read annual_budget_allocations" ON "public"."annual_budget_allocations" AS PERMISSIVE FOR SELECT TO PUBLIC
USING (true);
CREATE POLICY "barangays_admin_manage" ON "public"."barangays" AS PERMISSIVE FOR ALL TO PUBLIC
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());
CREATE POLICY "barangays_public_read" ON "public"."barangays" AS PERMISSIVE FOR SELECT TO PUBLIC
USING (true);
CREATE POLICY "Allow read budget_purpose_categories" ON "public"."budget_purpose_categories" AS PERMISSIVE FOR SELECT TO PUBLIC
USING (true);
CREATE POLICY "budget_request_files_self_or_admin" ON "public"."budget_request_files" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM (budget_requests br
     JOIN organization_profiles op ON ((op.id = br.organization_id)))
  WHERE ((br.id = budget_request_files.budget_request_id) AND ((op.user_id = auth.uid()) OR (br.submitted_by = auth.uid())))))))
WITH CHECK ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM (budget_requests br
     JOIN organization_profiles op ON ((op.id = br.organization_id)))
  WHERE ((br.id = budget_request_files.budget_request_id) AND ((op.user_id = auth.uid()) OR (br.submitted_by = auth.uid())))))));
CREATE POLICY "budget_requests_self_or_admin" ON "public"."budget_requests" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = budget_requests.organization_id) AND (op.user_id = auth.uid()))))))
WITH CHECK ((current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = budget_requests.organization_id) AND (op.user_id = auth.uid()))))));
CREATE POLICY "compliance_remarks_admin_manage" ON "public"."compliance_remarks" AS PERMISSIVE FOR ALL TO PUBLIC
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());
CREATE POLICY "compliance_remarks_self_or_admin" ON "public"."compliance_remarks" AS PERMISSIVE FOR SELECT TO PUBLIC
USING ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = compliance_remarks.organization_id) AND (op.user_id = auth.uid()))))));
CREATE POLICY "disclosure_documents_admin_manage" ON "public"."disclosure_documents" AS PERMISSIVE FOR ALL TO PUBLIC
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());
CREATE POLICY "disclosure_documents_public_read" ON "public"."disclosure_documents" AS PERMISSIVE FOR SELECT TO PUBLIC
USING (true);
CREATE POLICY "document_submission_files_self_or_admin" ON "public"."document_submission_files" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM (document_submissions ds
     JOIN organization_profiles op ON ((op.id = ds.organization_id)))
  WHERE ((ds.id = document_submission_files.submission_id) AND ((op.user_id = auth.uid()) OR (ds.submitted_by = auth.uid())))))))
WITH CHECK ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM (document_submissions ds
     JOIN organization_profiles op ON ((op.id = ds.organization_id)))
  WHERE ((ds.id = document_submission_files.submission_id) AND ((op.user_id = auth.uid()) OR (ds.submitted_by = auth.uid())))))));
CREATE POLICY "document_submissions_self_or_admin" ON "public"."document_submissions" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = document_submissions.organization_id) AND (op.user_id = auth.uid()))))))
WITH CHECK ((current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = document_submissions.organization_id) AND (op.user_id = auth.uid()))))));
CREATE POLICY "events_admin_manage" ON "public"."events" AS PERMISSIVE FOR ALL TO PUBLIC
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());
CREATE POLICY "events_public_read" ON "public"."events" AS PERMISSIVE FOR SELECT TO PUBLIC
USING (true);
CREATE POLICY "inquiries_self_or_admin" ON "public"."inquiries" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = inquiries.organization_id) AND (op.user_id = auth.uid()))))))
WITH CHECK ((current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = inquiries.organization_id) AND (op.user_id = auth.uid()))))));
CREATE POLICY "liquidation_report_files_self_or_admin" ON "public"."liquidation_report_files" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM (liquidation_reports lr
     JOIN organization_profiles op ON ((op.id = lr.organization_id)))
  WHERE ((lr.id = liquidation_report_files.liquidation_report_id) AND ((op.user_id = auth.uid()) OR (lr.submitted_by = auth.uid())))))))
WITH CHECK ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM (liquidation_reports lr
     JOIN organization_profiles op ON ((op.id = lr.organization_id)))
  WHERE ((lr.id = liquidation_report_files.liquidation_report_id) AND ((op.user_id = auth.uid()) OR (lr.submitted_by = auth.uid())))))));
CREATE POLICY "liquidation_reports_self_or_admin" ON "public"."liquidation_reports" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = liquidation_reports.organization_id) AND (op.user_id = auth.uid()))))))
WITH CHECK ((current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = liquidation_reports.organization_id) AND (op.user_id = auth.uid()))))));
CREATE POLICY "move_applications_self_or_admin" ON "public"."move_applications" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = move_applications.organization_id) AND (op.user_id = auth.uid()))))))
WITH CHECK ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = move_applications.organization_id) AND (op.user_id = auth.uid()))))));
CREATE POLICY "move_files_self_or_admin" ON "public"."move_files" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = move_files.organization_id) AND (op.user_id = auth.uid()))))))
WITH CHECK ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = move_files.organization_id) AND (op.user_id = auth.uid()))))));
CREATE POLICY "Allow read news_categories" ON "public"."news_categories" AS PERMISSIVE FOR SELECT TO PUBLIC
USING (true);
CREATE POLICY "news_releases_admin_manage" ON "public"."news_releases" AS PERMISSIVE FOR ALL TO PUBLIC
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());
CREATE POLICY "news_releases_read_published" ON "public"."news_releases" AS PERMISSIVE FOR SELECT TO PUBLIC
USING (((visibility_status = 'published'::visibility_status) OR current_user_is_admin()));
CREATE POLICY "notifications_self_or_admin" ON "public"."notifications" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (user_id = auth.uid())))
WITH CHECK ((current_user_is_admin() OR (user_id = auth.uid())));
CREATE POLICY "organization_accreditations_select_owner" ON "public"."organization_accreditations" AS PERMISSIVE FOR SELECT TO PUBLIC
USING ((EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_accreditations.organization_id) AND (op.user_id = auth.uid())))));
CREATE POLICY "organization_accreditations_select_public_active" ON "public"."organization_accreditations" AS PERMISSIVE FOR SELECT TO PUBLIC
USING ((status = 'active'::text));
CREATE POLICY "organization_contacts_admin_all" ON "public"."organization_contacts" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((EXISTS ( SELECT 1
   FROM admin_accounts aa
  WHERE (aa.id = auth.uid()))));
CREATE POLICY "organization_contacts_delete_owner" ON "public"."organization_contacts" AS PERMISSIVE FOR DELETE TO PUBLIC
USING ((EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_contacts.organization_id) AND (op.user_id = auth.uid())))));
CREATE POLICY "organization_contacts_insert_owner" ON "public"."organization_contacts" AS PERMISSIVE FOR INSERT TO PUBLIC
WITH CHECK ((EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_contacts.organization_id) AND (op.user_id = auth.uid())))));
CREATE POLICY "organization_contacts_select_owner" ON "public"."organization_contacts" AS PERMISSIVE FOR SELECT TO PUBLIC
USING ((EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_contacts.organization_id) AND (op.user_id = auth.uid())))));
CREATE POLICY "organization_contacts_update_owner" ON "public"."organization_contacts" AS PERMISSIVE FOR UPDATE TO PUBLIC
USING ((EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_contacts.organization_id) AND (op.user_id = auth.uid())))))
WITH CHECK ((EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_contacts.organization_id) AND (op.user_id = auth.uid())))));
CREATE POLICY "organization_profiles_self_or_admin" ON "public"."organization_profiles" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (auth.uid() = user_id)))
WITH CHECK ((current_user_is_admin() OR (auth.uid() = user_id)));
CREATE POLICY "organization_renewals_insert_owner" ON "public"."organization_renewals" AS PERMISSIVE FOR INSERT TO PUBLIC
WITH CHECK (((status = 'draft'::text) AND (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_renewals.organization_id) AND (op.user_id = auth.uid()))))));
CREATE POLICY "organization_renewals_select_owner" ON "public"."organization_renewals" AS PERMISSIVE FOR SELECT TO PUBLIC
USING ((EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_renewals.organization_id) AND (op.user_id = auth.uid())))));
CREATE POLICY "organization_renewals_update_owner" ON "public"."organization_renewals" AS PERMISSIVE FOR UPDATE TO PUBLIC
USING (((status = ANY (ARRAY['draft'::text, 'needs_revision'::text])) AND (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_renewals.organization_id) AND (op.user_id = auth.uid()))))))
WITH CHECK (((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'resubmitted'::text])) AND (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_renewals.organization_id) AND (op.user_id = auth.uid()))))));
CREATE POLICY "organizations_admin_manage" ON "public"."organizations" AS PERMISSIVE FOR ALL TO PUBLIC
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());
CREATE POLICY "organizations_public_read" ON "public"."organizations" AS PERMISSIVE FOR SELECT TO PUBLIC
USING (true);
CREATE POLICY "active_policy_versions_read" ON "public"."policy_versions" AS PERMISSIVE FOR SELECT TO PUBLIC
USING (((is_active = true) OR current_user_is_admin()));
CREATE POLICY "policy_versions_manage_admin" ON "public"."policy_versions" AS PERMISSIVE FOR ALL TO PUBLIC
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());
CREATE POLICY "programs_admin_manage" ON "public"."programs" AS PERMISSIVE FOR ALL TO PUBLIC
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());
CREATE POLICY "programs_public_read" ON "public"."programs" AS PERMISSIVE FOR SELECT TO PUBLIC
USING (true);
CREATE POLICY "required_document_types_admin_manage" ON "public"."required_document_types" AS PERMISSIVE FOR ALL TO PUBLIC
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());
CREATE POLICY "required_document_types_read" ON "public"."required_document_types" AS PERMISSIVE FOR SELECT TO PUBLIC
USING (true);
CREATE POLICY "admin_manage_roles" ON "public"."roles" AS PERMISSIVE FOR ALL TO PUBLIC
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());
CREATE POLICY "transparency_posts_admin_manage" ON "public"."transparency_posts" AS PERMISSIVE FOR ALL TO PUBLIC
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());
CREATE POLICY "transparency_posts_read_published" ON "public"."transparency_posts" AS PERMISSIVE FOR SELECT TO PUBLIC
USING (((visibility_status = 'published'::visibility_status) OR current_user_is_admin()));
CREATE POLICY "organization reads own urn history" ON "public"."urn_review_history" AS PERMISSIVE FOR SELECT TO "authenticated"
USING ((EXISTS ( SELECT 1
   FROM organization_profiles p
  WHERE ((p.id = urn_review_history.organization_id) AND (p.user_id = auth.uid())))));
CREATE POLICY "user_policy_acceptance_self_or_admin" ON "public"."user_policy_acceptance" AS PERMISSIVE FOR ALL TO PUBLIC
USING (((auth.uid() = user_id) OR current_user_is_admin()))
WITH CHECK (((auth.uid() = user_id) OR current_user_is_admin()));
CREATE POLICY "user_profiles_self_or_admin" ON "public"."user_profiles" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (auth.uid() = user_id)))
WITH CHECK ((current_user_is_admin() OR (auth.uid() = user_id)));
CREATE POLICY "user_roles_manage_admin" ON "public"."user_roles" AS PERMISSIVE FOR ALL TO PUBLIC
USING (current_user_is_admin())
WITH CHECK (current_user_is_admin());
CREATE POLICY "user_roles_read_admin" ON "public"."user_roles" AS PERMISSIVE FOR SELECT TO PUBLIC
USING ((current_user_is_admin() OR (auth.uid() = user_id)));
CREATE POLICY "ypop_activities_admin_all" ON "public"."ypop_city_activities" AS PERMISSIVE FOR ALL TO PUBLIC
USING (current_user_is_admin());
CREATE POLICY "ypop_activities_read_all" ON "public"."ypop_city_activities" AS PERMISSIVE FOR SELECT TO PUBLIC
USING (true);
CREATE POLICY "ypop_entries_self_or_admin" ON "public"."ypop_entries" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_entries.organization_id) AND (op.user_id = auth.uid()))))))
WITH CHECK ((current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_entries.organization_id) AND (op.user_id = auth.uid()))))));
CREATE POLICY "ypop_event_files_self_or_admin" ON "public"."ypop_event_files" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_event_files.organization_id) AND (op.user_id = auth.uid()))))))
WITH CHECK ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_event_files.organization_id) AND (op.user_id = auth.uid()))))));
CREATE POLICY "ypop_event_participations_self_or_admin" ON "public"."ypop_event_participations" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_event_participations.organization_id) AND (op.user_id = auth.uid()))))))
WITH CHECK ((current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_event_participations.organization_id) AND (op.user_id = auth.uid()))))));
CREATE POLICY "ypop_files_self_or_admin" ON "public"."ypop_files" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_files.organization_id) AND (op.user_id = auth.uid()))))))
WITH CHECK ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_files.organization_id) AND (op.user_id = auth.uid()))))));
CREATE POLICY "ypop_org_activities_self_or_admin" ON "public"."ypop_org_activities" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_org_activities.organization_id) AND (op.user_id = auth.uid()))))))
WITH CHECK ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_org_activities.organization_id) AND (op.user_id = auth.uid()))))));
CREATE POLICY "ypop_org_activity_files_self_or_admin" ON "public"."ypop_org_activity_files" AS PERMISSIVE FOR ALL TO PUBLIC
USING ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_org_activity_files.organization_id) AND (op.user_id = auth.uid()))))))
WITH CHECK ((current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_org_activity_files.organization_id) AND (op.user_id = auth.uid()))))));
CREATE POLICY "ypop_periods_admin_all" ON "public"."ypop_periods" AS PERMISSIVE FOR ALL TO PUBLIC
USING (current_user_is_admin());
CREATE POLICY "ypop_periods_read_all" ON "public"."ypop_periods" AS PERMISSIVE FOR SELECT TO PUBLIC
USING (true);
CREATE POLICY "organization_reads_own_ypop_deletions" ON "public"."ypop_submission_deletion_receipts" AS PERMISSIVE FOR SELECT TO "authenticated"
USING ((EXISTS ( SELECT 1
   FROM organization_profiles o
  WHERE ((o.id = ypop_submission_deletion_receipts.organization_id) AND (o.user_id = auth.uid())))));

