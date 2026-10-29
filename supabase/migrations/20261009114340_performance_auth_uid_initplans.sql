-- Local proposal only. DO NOT APPLY without a separate deployment approval.
-- Evidence: docs/performance/2026-10-09/{baseline.md,database-evidence.json}.
-- Only row-independent auth.uid() calls become scalar InitPlans. Preserve all
-- ownership joins, status checks, admin helpers, target roles and command types.
-- No policies are merged/dropped; no grants, helper functions or indexes change.
-- Abort on definition drift rather than overwriting a newer authorization rule.
-- Short lock/statement timeouts bound deployment risk; a timeout requires review.
SET LOCAL lock_timeout = '1s';
SET LOCAL statement_timeout = '30s';
DO $performance_uid$
DECLARE
  expected record;
  actual record;
  clauses text;
BEGIN
  FOR expected IN
    SELECT * FROM (VALUES
    ('public', 'urn_review_history', 'organization reads own urn history', 'SELECT', 'PERMISSIVE', '["authenticated"]', '(EXISTS ( SELECT 1
   FROM organization_profiles p
  WHERE ((p.id = urn_review_history.organization_id) AND (p.user_id = auth.uid()))))', NULL),
    ('public', 'user_roles', 'user_roles_read_admin', 'SELECT', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (auth.uid() = user_id))', NULL),
    ('public', 'user_profiles', 'user_profiles_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (auth.uid() = user_id))', '(current_user_is_admin() OR (auth.uid() = user_id))'),
    ('public', 'document_submissions', 'document_submissions_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = document_submissions.organization_id) AND (op.user_id = auth.uid())))))', '(current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = document_submissions.organization_id) AND (op.user_id = auth.uid())))))'),
    ('public', 'organization_profiles', 'organization_profiles_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (auth.uid() = user_id))', '(current_user_is_admin() OR (auth.uid() = user_id))'),
    ('public', 'user_policy_acceptance', 'user_policy_acceptance_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '((auth.uid() = user_id) OR current_user_is_admin())', '((auth.uid() = user_id) OR current_user_is_admin())'),
    ('public', 'document_submission_files', 'document_submission_files_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM (document_submissions ds
     JOIN organization_profiles op ON ((op.id = ds.organization_id)))
  WHERE ((ds.id = document_submission_files.submission_id) AND ((op.user_id = auth.uid()) OR (ds.submitted_by = auth.uid()))))))', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM (document_submissions ds
     JOIN organization_profiles op ON ((op.id = ds.organization_id)))
  WHERE ((ds.id = document_submission_files.submission_id) AND ((op.user_id = auth.uid()) OR (ds.submitted_by = auth.uid()))))))'),
    ('public', 'activity_logs', 'activity_logs_organization_read', 'SELECT', 'PERMISSIVE', '["public"]', '(EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = activity_logs.organization_id) AND (op.user_id = auth.uid()))))', NULL),
    ('public', 'budget_requests', 'budget_requests_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = budget_requests.organization_id) AND (op.user_id = auth.uid())))))', '(current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = budget_requests.organization_id) AND (op.user_id = auth.uid())))))'),
    ('public', 'liquidation_reports', 'liquidation_reports_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = liquidation_reports.organization_id) AND (op.user_id = auth.uid())))))', '(current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = liquidation_reports.organization_id) AND (op.user_id = auth.uid())))))'),
    ('public', 'liquidation_report_files', 'liquidation_report_files_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM (liquidation_reports lr
     JOIN organization_profiles op ON ((op.id = lr.organization_id)))
  WHERE ((lr.id = liquidation_report_files.liquidation_report_id) AND ((op.user_id = auth.uid()) OR (lr.submitted_by = auth.uid()))))))', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM (liquidation_reports lr
     JOIN organization_profiles op ON ((op.id = lr.organization_id)))
  WHERE ((lr.id = liquidation_report_files.liquidation_report_id) AND ((op.user_id = auth.uid()) OR (lr.submitted_by = auth.uid()))))))'),
    ('public', 'budget_request_files', 'budget_request_files_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM (budget_requests br
     JOIN organization_profiles op ON ((op.id = br.organization_id)))
  WHERE ((br.id = budget_request_files.budget_request_id) AND ((op.user_id = auth.uid()) OR (br.submitted_by = auth.uid()))))))', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM (budget_requests br
     JOIN organization_profiles op ON ((op.id = br.organization_id)))
  WHERE ((br.id = budget_request_files.budget_request_id) AND ((op.user_id = auth.uid()) OR (br.submitted_by = auth.uid()))))))'),
    ('public', 'compliance_remarks', 'compliance_remarks_self_or_admin', 'SELECT', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = compliance_remarks.organization_id) AND (op.user_id = auth.uid())))))', NULL),
    ('public', 'notifications', 'notifications_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (user_id = auth.uid()))', '(current_user_is_admin() OR (user_id = auth.uid()))'),
    ('public', 'ypop_entries', 'ypop_entries_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_entries.organization_id) AND (op.user_id = auth.uid())))))', '(current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_entries.organization_id) AND (op.user_id = auth.uid())))))'),
    ('public', 'ypop_submission_deletion_receipts', 'organization_reads_own_ypop_deletions', 'SELECT', 'PERMISSIVE', '["authenticated"]', '(EXISTS ( SELECT 1
   FROM organization_profiles o
  WHERE ((o.id = ypop_submission_deletion_receipts.organization_id) AND (o.user_id = auth.uid()))))', NULL),
    ('public', 'ypop_files', 'ypop_files_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_files.organization_id) AND (op.user_id = auth.uid())))))', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_files.organization_id) AND (op.user_id = auth.uid())))))'),
    ('public', 'ypop_event_participations', 'ypop_event_participations_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_event_participations.organization_id) AND (op.user_id = auth.uid())))))', '(current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_event_participations.organization_id) AND (op.user_id = auth.uid())))))'),
    ('public', 'move_applications', 'move_applications_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = move_applications.organization_id) AND (op.user_id = auth.uid())))))', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = move_applications.organization_id) AND (op.user_id = auth.uid())))))'),
    ('public', 'move_files', 'move_files_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = move_files.organization_id) AND (op.user_id = auth.uid())))))', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = move_files.organization_id) AND (op.user_id = auth.uid())))))'),
    ('public', 'inquiries', 'inquiries_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = inquiries.organization_id) AND (op.user_id = auth.uid())))))', '(current_user_is_admin() OR (submitted_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = inquiries.organization_id) AND (op.user_id = auth.uid())))))'),
    ('public', 'ypop_org_activities', 'ypop_org_activities_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_org_activities.organization_id) AND (op.user_id = auth.uid())))))', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_org_activities.organization_id) AND (op.user_id = auth.uid())))))'),
    ('public', 'ypop_org_activity_files', 'ypop_org_activity_files_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_org_activity_files.organization_id) AND (op.user_id = auth.uid())))))', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_org_activity_files.organization_id) AND (op.user_id = auth.uid())))))'),
    ('public', 'ypop_event_files', 'ypop_event_files_self_or_admin', 'ALL', 'PERMISSIVE', '["public"]', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_event_files.organization_id) AND (op.user_id = auth.uid())))))', '(current_user_is_admin() OR (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = ypop_event_files.organization_id) AND (op.user_id = auth.uid())))))'),
    ('public', 'organization_renewals', 'organization_renewals_insert_owner', 'INSERT', 'PERMISSIVE', '["public"]', NULL, '((status = ''draft''::text) AND (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_renewals.organization_id) AND (op.user_id = auth.uid())))))'),
    ('public', 'organization_renewals', 'organization_renewals_select_owner', 'SELECT', 'PERMISSIVE', '["public"]', '(EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_renewals.organization_id) AND (op.user_id = auth.uid()))))', NULL),
    ('public', 'organization_renewals', 'organization_renewals_update_owner', 'UPDATE', 'PERMISSIVE', '["public"]', '((status = ANY (ARRAY[''draft''::text, ''needs_revision''::text])) AND (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_renewals.organization_id) AND (op.user_id = auth.uid())))))', '((status = ANY (ARRAY[''draft''::text, ''submitted''::text, ''resubmitted''::text])) AND (EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_renewals.organization_id) AND (op.user_id = auth.uid())))))'),
    ('public', 'organization_accreditations', 'organization_accreditations_select_owner', 'SELECT', 'PERMISSIVE', '["public"]', '(EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_accreditations.organization_id) AND (op.user_id = auth.uid()))))', NULL),
    ('public', 'organization_contacts', 'organization_contacts_admin_all', 'ALL', 'PERMISSIVE', '["public"]', '(EXISTS ( SELECT 1
   FROM admin_accounts aa
  WHERE (aa.id = auth.uid())))', NULL),
    ('public', 'organization_contacts', 'organization_contacts_delete_owner', 'DELETE', 'PERMISSIVE', '["public"]', '(EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_contacts.organization_id) AND (op.user_id = auth.uid()))))', NULL),
    ('public', 'organization_contacts', 'organization_contacts_insert_owner', 'INSERT', 'PERMISSIVE', '["public"]', NULL, '(EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_contacts.organization_id) AND (op.user_id = auth.uid()))))'),
    ('public', 'organization_contacts', 'organization_contacts_select_owner', 'SELECT', 'PERMISSIVE', '["public"]', '(EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_contacts.organization_id) AND (op.user_id = auth.uid()))))', NULL),
    ('public', 'organization_contacts', 'organization_contacts_update_owner', 'UPDATE', 'PERMISSIVE', '["public"]', '(EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_contacts.organization_id) AND (op.user_id = auth.uid()))))', '(EXISTS ( SELECT 1
   FROM organization_profiles op
  WHERE ((op.id = organization_contacts.organization_id) AND (op.user_id = auth.uid()))))')
    ) AS p(schema_name, table_name, policy_name, command_name, permissiveness, roles_json, old_using, old_check)
  LOOP
    SELECT * INTO actual FROM pg_policies
      WHERE schemaname = expected.schema_name AND tablename = expected.table_name
        AND policyname = expected.policy_name;
    IF NOT FOUND OR actual.cmd IS DISTINCT FROM expected.command_name
      OR actual.permissive IS DISTINCT FROM expected.permissiveness
      OR to_jsonb(actual.roles) IS DISTINCT FROM expected.roles_json::jsonb
      OR actual.qual IS DISTINCT FROM expected.old_using
      OR actual.with_check IS DISTINCT FROM expected.old_check THEN
      RAISE EXCEPTION 'RLS definition drift for %.% policy %; review before applying',
        expected.schema_name, expected.table_name, expected.policy_name;
    END IF;
    clauses := '';
    IF expected.old_using IS NOT NULL THEN
      clauses := clauses || ' USING (' || replace(expected.old_using, 'auth.uid()', '(SELECT auth.uid())') || ')';
    END IF;
    IF expected.old_check IS NOT NULL THEN
      clauses := clauses || ' WITH CHECK (' || replace(expected.old_check, 'auth.uid()', '(SELECT auth.uid())') || ')';
    END IF;
    EXECUTE format('ALTER POLICY %I ON %I.%I%s', expected.policy_name,
      expected.schema_name, expected.table_name, clauses);
  END LOOP;
END
$performance_uid$;
