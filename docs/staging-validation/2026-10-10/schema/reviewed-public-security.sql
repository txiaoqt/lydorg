-- ACL, RLS, public policies, application triggers, and Realtime table membership.
SET search_path = pg_catalog, public, extensions, auth, storage;
GRANT USAGE ON SCHEMA public TO PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, "anon", "authenticated", "service_role";
GRANT DELETE ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_sessions", "public"."admin_system_settings", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods" TO "anon";
GRANT INSERT ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_sessions", "public"."admin_system_settings", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods" TO "anon";
GRANT MAINTAIN ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_sessions", "public"."admin_system_settings", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods" TO "anon";
GRANT REFERENCES ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_sessions", "public"."admin_system_settings", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods" TO "anon";
GRANT SELECT ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_sessions", "public"."admin_system_settings", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods" TO "anon";
GRANT TRIGGER ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_sessions", "public"."admin_system_settings", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods" TO "anon";
GRANT TRUNCATE ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_sessions", "public"."admin_system_settings", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods" TO "anon";
GRANT UPDATE ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_sessions", "public"."admin_system_settings", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods" TO "anon";
GRANT DELETE ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_sessions", "public"."admin_system_settings", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods" TO "authenticated";
GRANT INSERT ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_sessions", "public"."admin_system_settings", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods" TO "authenticated";
GRANT MAINTAIN ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_sessions", "public"."admin_system_settings", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods" TO "authenticated";
GRANT REFERENCES ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_sessions", "public"."admin_system_settings", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods" TO "authenticated";
GRANT SELECT ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_sessions", "public"."admin_system_settings", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods", "public"."ypop_submission_deletion_receipts" TO "authenticated";
GRANT TRIGGER ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_sessions", "public"."admin_system_settings", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods" TO "authenticated";
GRANT TRUNCATE ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_sessions", "public"."admin_system_settings", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods" TO "authenticated";
GRANT UPDATE ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_sessions", "public"."admin_system_settings", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods" TO "authenticated";
GRANT DELETE ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_portal_change_versions", "public"."admin_sessions", "public"."admin_system_settings", "public"."admin_template_categories", "public"."admin_ypop_deletion_jobs", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."yorp_sample_document_assets", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods", "public"."ypop_submission_deletion_receipts" TO "service_role";
GRANT INSERT ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_portal_change_versions", "public"."admin_sessions", "public"."admin_system_settings", "public"."admin_template_categories", "public"."admin_ypop_deletion_jobs", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."yorp_sample_document_assets", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods", "public"."ypop_submission_deletion_receipts" TO "service_role";
GRANT MAINTAIN ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_portal_change_versions", "public"."admin_sessions", "public"."admin_system_settings", "public"."admin_template_categories", "public"."admin_ypop_deletion_jobs", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."yorp_sample_document_assets", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods", "public"."ypop_submission_deletion_receipts" TO "service_role";
GRANT REFERENCES ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_portal_change_versions", "public"."admin_sessions", "public"."admin_system_settings", "public"."admin_template_categories", "public"."admin_ypop_deletion_jobs", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."yorp_sample_document_assets", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods", "public"."ypop_submission_deletion_receipts" TO "service_role";
GRANT SELECT ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_portal_change_versions", "public"."admin_sessions", "public"."admin_system_settings", "public"."admin_template_categories", "public"."admin_ypop_deletion_jobs", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."yorp_sample_document_assets", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods", "public"."ypop_submission_deletion_receipts" TO "service_role";
GRANT TRIGGER ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_portal_change_versions", "public"."admin_sessions", "public"."admin_system_settings", "public"."admin_template_categories", "public"."admin_ypop_deletion_jobs", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."yorp_sample_document_assets", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods", "public"."ypop_submission_deletion_receipts" TO "service_role";
GRANT TRUNCATE ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_portal_change_versions", "public"."admin_sessions", "public"."admin_system_settings", "public"."admin_template_categories", "public"."admin_ypop_deletion_jobs", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."yorp_sample_document_assets", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods", "public"."ypop_submission_deletion_receipts" TO "service_role";
GRANT UPDATE ON TABLE "public"."activity_announcements", "public"."activity_logs", "public"."admin_accounts", "public"."admin_portal_change_versions", "public"."admin_sessions", "public"."admin_system_settings", "public"."admin_template_categories", "public"."admin_ypop_deletion_jobs", "public"."annual_budget_allocations", "public"."barangays", "public"."budget_purpose_categories", "public"."budget_request_files", "public"."budget_requests", "public"."compliance_remarks", "public"."disclosure_documents", "public"."document_submission_files", "public"."document_submissions", "public"."events", "public"."inquiries", "public"."liquidation_report_files", "public"."liquidation_reports", "public"."move_applications", "public"."move_files", "public"."news_categories", "public"."news_releases", "public"."notifications", "public"."organization_accreditations", "public"."organization_contacts", "public"."organization_profiles", "public"."organization_reference_counters", "public"."organization_renewals", "public"."organization_urn_counters", "public"."organizations", "public"."policy_versions", "public"."programs", "public"."required_document_types", "public"."roles", "public"."transparency_posts", "public"."units", "public"."urn_review_history", "public"."user_policy_acceptance", "public"."user_profiles", "public"."user_roles", "public"."yorp_sample_document_assets", "public"."ypop_city_activities", "public"."ypop_entries", "public"."ypop_event_files", "public"."ypop_event_participations", "public"."ypop_files", "public"."ypop_org_activities", "public"."ypop_org_activity_files", "public"."ypop_periods", "public"."ypop_submission_deletion_receipts" TO "service_role";
GRANT SELECT ON SEQUENCE "public"."roles_id_seq", "public"."units_id_seq" TO "anon";
GRANT UPDATE ON SEQUENCE "public"."roles_id_seq", "public"."units_id_seq" TO "anon";
GRANT USAGE ON SEQUENCE "public"."roles_id_seq", "public"."units_id_seq" TO "anon";
GRANT SELECT ON SEQUENCE "public"."roles_id_seq", "public"."units_id_seq" TO "authenticated";
GRANT UPDATE ON SEQUENCE "public"."roles_id_seq", "public"."units_id_seq" TO "authenticated";
GRANT USAGE ON SEQUENCE "public"."roles_id_seq", "public"."units_id_seq" TO "authenticated";
GRANT SELECT ON SEQUENCE "public"."roles_id_seq", "public"."units_id_seq" TO "service_role";
GRANT UPDATE ON SEQUENCE "public"."roles_id_seq", "public"."units_id_seq" TO "service_role";
GRANT USAGE ON SEQUENCE "public"."roles_id_seq", "public"."units_id_seq" TO "service_role";
REVOKE ALL PRIVILEGES ON TYPE public."activity_action" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."app_role_code" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."budget_request_status" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."compliance_remark_status" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."document_file_validation_status" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."document_submission_status" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."inquiry_status" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."liquidation_report_status" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."move_application_status" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."notification_type" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."ocr_status" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."profile_status" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."registration_type" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."renewal_application_status" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."urn_review_status" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."verification_method" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."visibility_status" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."ypop_entry_status" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."ypop_event_participation_status" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."ypop_org_activity_status" FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TYPE public."ypop_period_status" FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON TYPE public."activity_action" TO PUBLIC;
GRANT USAGE ON TYPE public."app_role_code" TO PUBLIC;
GRANT USAGE ON TYPE public."budget_request_status" TO PUBLIC;
GRANT USAGE ON TYPE public."compliance_remark_status" TO PUBLIC;
GRANT USAGE ON TYPE public."document_file_validation_status" TO PUBLIC;
GRANT USAGE ON TYPE public."document_submission_status" TO PUBLIC;
GRANT USAGE ON TYPE public."inquiry_status" TO PUBLIC;
GRANT USAGE ON TYPE public."liquidation_report_status" TO PUBLIC;
GRANT USAGE ON TYPE public."move_application_status" TO PUBLIC;
GRANT USAGE ON TYPE public."notification_type" TO PUBLIC;
GRANT USAGE ON TYPE public."ocr_status" TO PUBLIC;
GRANT USAGE ON TYPE public."profile_status" TO PUBLIC;
GRANT USAGE ON TYPE public."registration_type" TO PUBLIC;
GRANT USAGE ON TYPE public."renewal_application_status" TO PUBLIC;
GRANT USAGE ON TYPE public."urn_review_status" TO PUBLIC;
GRANT USAGE ON TYPE public."verification_method" TO PUBLIC;
GRANT USAGE ON TYPE public."visibility_status" TO PUBLIC;
GRANT USAGE ON TYPE public."ypop_entry_status" TO PUBLIC;
GRANT USAGE ON TYPE public."ypop_event_participation_status" TO PUBLIC;
GRANT USAGE ON TYPE public."ypop_org_activity_status" TO PUBLIC;
GRANT USAGE ON TYPE public."ypop_period_status" TO PUBLIC;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_approve_renewal(text,uuid,text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_approve_renewal_in_supabase(text,uuid,text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_backup_dispatch_guard(text,text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_broadcast_sidebar_refresh() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_bulk_delete_budget_requests(text,uuid[]) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_bulk_delete_ypop_submissions(text,uuid,uuid[],uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_bump_portal_change_version(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_check_organization_retention(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_cleanup_yorp_sample_dataset(text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_close_ypop_semester_and_evaluate(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_create_template_category(text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_create_ypop_city_activity(text,text,text,text,text,integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_create_ypop_city_activity(text,text,text,text,text,text,integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_create_ypop_entry(text,uuid,text,text,integer,integer,integer,text,text,text,timestamp with time zone,timestamp with time zone,timestamp with time zone,jsonb,integer,jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_create_ypop_period(text,text,text,timestamp with time zone,ypop_period_status,jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_delete_template_category(text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_delete_ypop_city_activity(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_delete_ypop_period(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_ensure_renewal_test_account_profile(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_activity_announcements(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_annual_budget_allocations(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_budget_monitoring_page(text,integer,date,date,timestamp with time zone,uuid,integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_budget_monitoring_summary(text,integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_budget_purpose_categories(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_budget_request_detail(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_dashboard_summary(text,integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_liquidation_report_detail(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_or_create_renewal_test_account(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_organization_identity_review(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_organization_renewals(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_portal_change_versions(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_portal_list_page(text,text,integer,integer,text,text,text,text,text,text,text,date,date,integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_portal_section_state(text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_recent_notifications(text,integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_registration_detail(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_renewal_queue_page(text,integer,integer,text,text,text,text,text,uuid[]) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_renewal_review_context(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_review_resource_page(text,text,integer,integer,text,text,text,text,text,text,text,date,date,integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_sidebar_counts(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_system_settings(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_template_categories(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_yorp_registration_documents(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_yorp_registry_ypop_detail(text,uuid,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_yorp_sample_dataset_status(text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_ypop_city_activities(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_ypop_entries(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_ypop_entry_review_detail(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_ypop_event_files(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_ypop_event_participations(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_ypop_org_activities(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_ypop_org_activity_files(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_ypop_period_city_activities(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_ypop_period_submissions_page(text,uuid,integer,integer,text,text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_ypop_periods(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_ypop_review_files(text,text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_get_ypop_validation_periods(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_mark_notifications_read(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_prepare_renewal_test_scenario(text,integer,date) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_refresh_session(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_reject_renewal(text,uuid,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_reject_renewal_in_supabase(text,uuid,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_request_renewal_revision(text,uuid,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_request_renewal_revision_in_supabase(text,uuid,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_reset_renewal_test_scenario(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_restore_renewal_test_scenario(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_review_organization_identity(text,uuid,uuid,text,text,text,integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_save_annual_budget_allocation(text,integer,numeric,text,boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_save_budget_purpose_category(text,text,text,integer,boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_save_system_settings(text,jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_save_system_settings(jsonb,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_seed_renewal_test_registration_documents(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_seed_yorp_sample_dataset(text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_seed_yorp_sample_dataset_core(text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_set_template_file_size(text,uuid,bigint) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_track_budget_version() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_track_document_file_version() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_track_document_submission_version() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_track_liquidation_version() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_track_organization_profile_version() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_track_renewal_version() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_track_ypop_child_version() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_track_ypop_city_activity_version() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_track_ypop_entry_version() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_track_ypop_period_version() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_unlock_submission_revision(text,text,uuid,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_update_budget_request_file_status(text,uuid,text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_update_inquiry(text,uuid,inquiry_status,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_update_liquidation_report_file_status(text,uuid,text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_update_move_application(text,uuid,move_application_status,text,numeric,timestamp with time zone,timestamp with time zone,jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_update_org_yorp_fields(text,uuid,smallint,smallint) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_update_ypop_city_activity(text,uuid,text,text,text,integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_update_ypop_city_activity(text,uuid,text,text,text,text,integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_update_ypop_entry(text,uuid,text,text,integer,integer,jsonb,jsonb,timestamp with time zone,integer,text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_update_ypop_event_participation(text,uuid,text,text,timestamp with time zone,timestamp with time zone,jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_update_ypop_org_activity(text,uuid,text,text,timestamp with time zone,jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.admin_update_ypop_period(text,uuid,text,timestamp with time zone,ypop_period_status,jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.authenticate_admin_account(text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.authorize_admin_template_category_registry(text,boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.calculate_organization_renewal_eligibility(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.check_organization_identity(text,text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.check_signup_email_status(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.create_admin_account(text,text,text,text,smallint,smallint) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.create_admin_activity_log(text,uuid,text,text,uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.create_admin_news_category(text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.create_admin_news_release(text,text,text,text,text,date,visibility_status) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.create_admin_news_release(text,text,text,text,text,date,visibility_status,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.create_admin_template_document(text,text,text,text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.create_admin_template_document(text,text,text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.create_admin_transparency_post(text,text,text,text,text,date,visibility_status) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.create_notification_record(text,text,text,text,text,text,text,text,timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.current_user_has_any_role(app_role_code[]) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.current_user_is_admin() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.deactivate_admin_template_document(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.delete_admin_account(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.delete_admin_inquiry(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.delete_admin_news_category(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.delete_admin_news_release(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.delete_admin_transparency_post(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.delete_organization_account_canonical(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.delete_unverified_registration_account_canonical(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.derive_accreditation_status(text,date,date) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.diversify_yorp_seed_projects_and_budgets() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_accreditation_immutability() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_budget_request_file_resubmission_lifecycle() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_budget_request_purpose_advocacy() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_budget_request_resubmission_lifecycle() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_budget_request_terminal_status() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_budget_request_ypop_eligibility() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_inquiry_authoritative_email() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_organization_profile_headquarters_location() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.enforce_renewal_terminal_immutability() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.ensure_admin_demo_session(text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.ensure_liquidation_report_for_budget() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.evaluate_accreditation_notification_events() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.evaluate_and_apply_automatic_registration_verification(uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.extract_audit_request_metadata() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.generate_organization_reference_id() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.generate_unique_urn(text,timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_admin_inquiries(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_admin_permission_context(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_admin_portal_snapshot(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_budget_purpose_categories() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_organization_portal_dashboard_summary(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_pasig_barangay_ordinal(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_pending_administrator_email(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_public_budget_barangay_allocations(integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_public_budget_monitoring_summary(integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_public_organization_profile(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_public_stats() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_public_system_settings() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_system_setting_bool(text,boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_system_setting_int(text,integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_system_setting_text(text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.get_yorp_quarterly_report(text,integer,integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.guard_historical_organization_owner() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.guard_organization_identity_financial_write() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.guard_organization_identity_privileges() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.guard_organization_identity_verification() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.guard_renewal_test_registration_packet_immutable() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.guard_retained_organization_deletion() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.guard_submitted_registration_document_edits() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.handle_organization_profile_urn_auto_gen() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.hard_delete_admin_template_document(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.is_audit_logging_enabled(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.is_development_or_test_environment() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.is_signup_email_registered(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.is_urn_registered(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.join_ypop_city_activity(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.list_admin_accounts_for_admin_portal(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.list_administrators_for_admin_portal(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.list_roles_for_admin_portal(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.list_units_for_admin_portal(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.normalize_organization_contact_arrays() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.normalize_organization_identity_name(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.normalize_pasig_barangay_name(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.normalize_urn(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.notify_budget_change() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.notify_budget_request_change() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.notify_inquiry_change() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.notify_liquidation_change() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.notify_organization_profile_review_change() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.notify_organization_profile_status_change() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.notify_submission_change() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.notify_urn_review_change() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.notify_ypop_activity_change() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.notify_ypop_entry_status_change() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.notify_ypop_event_participation_status_change() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.notify_ypop_org_activity_status_change() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.organization_identity_name_anchor(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.promote_renewal_submission_files_for_review() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.protect_urn_review_fields() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.reactivate_admin_template_document(text,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.rebalance_yorp_seed_reporting_quarters() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.repair_yorp_seeded_fixture_relationships(uuid,uuid,uuid,jsonb,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.resolve_pasig_district_from_barangay(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.resolve_yorp_sample_activity_category(text,text[]) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.resolve_yorp_seed_budget_category(text,text[]) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.resubmit_organization_urn(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.review_organization_urn(text,uuid,text,urn_review_status,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.revoke_admin_session_token(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.revoke_organization_accreditation(text,uuid,text,timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.search_public_organizations() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.set_admin_account_active(text,uuid,boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.set_budget_request_fiscal_year() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.set_initial_admin_password(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.sync_organization_accreditation_projection() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.sync_organization_contacts_from_profile() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.sync_organization_profile_structured_fields() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.sync_organization_urn() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.sync_ypop_city_activity_participations() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.touch_move_application_updated_at() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.touch_ypop_org_activity_updated_at() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.try_get_pasig_barangay_ordinal(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_admin_account(text,uuid,text,text,text,smallint,smallint) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_admin_budget_request(text,uuid,text,numeric,numeric,date,text,text,timestamp with time zone,timestamp with time zone,text,jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_admin_document_submission_file_review(text,uuid,document_submission_status,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_admin_document_submission_review(text,uuid,document_submission_status,text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_admin_liquidation_report(text,uuid,liquidation_report_status,text,timestamp with time zone,timestamp with time zone,timestamp with time zone,timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_admin_news_release(text,uuid,text,text,text,text,date,visibility_status) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_admin_news_release(text,uuid,text,text,text,text,date,visibility_status,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_admin_organization_profile_review(text,uuid,profile_status,timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_admin_template_category(text,uuid,text[]) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_admin_template_document(text,uuid,text,text,text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_admin_template_document(text,uuid,text,text,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_admin_template_file_url(text,uuid,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_admin_template_metadata(text,uuid,text[],bigint) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_admin_template_metadata(text,uuid,boolean,text,text,text,text[],bigint) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_admin_transparency_post(text,uuid,text,text,text,text,date,visibility_status) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_organization_directory_preferences(boolean,boolean,boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.update_role_permissions(text,smallint,text[]) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.user_replace_document_submission_file(uuid,text,text,text,numeric,boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.user_resubmit_renewal(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.user_resubmit_renewal_application(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.user_start_or_get_renewal_draft(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.user_submit_additional_renewal_documents(uuid,uuid[]) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.user_submit_renewal(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON FUNCTION public.validate_admin_session_token(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_approve_renewal(text,uuid,text,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_renewal(text,uuid,text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_approve_renewal(text,uuid,text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_approve_renewal(text,uuid,text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_approve_renewal_in_supabase(text,uuid,text,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_renewal_in_supabase(text,uuid,text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_approve_renewal_in_supabase(text,uuid,text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_approve_renewal_in_supabase(text,uuid,text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_backup_dispatch_guard(text,text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_broadcast_sidebar_refresh() TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_bulk_delete_budget_requests(text,uuid[]) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_bulk_delete_budget_requests(text,uuid[]) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_bulk_delete_budget_requests(text,uuid[]) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_bulk_delete_budget_requests(text,uuid[]) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_bulk_delete_ypop_submissions(text,uuid,uuid[],uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_bump_portal_change_version(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_check_organization_retention(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_check_organization_retention(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_check_organization_retention(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_cleanup_yorp_sample_dataset(text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_cleanup_yorp_sample_dataset(text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_cleanup_yorp_sample_dataset(text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_close_ypop_semester_and_evaluate(text,uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_close_ypop_semester_and_evaluate(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_close_ypop_semester_and_evaluate(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_close_ypop_semester_and_evaluate(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_create_template_category(text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_create_template_category(text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_create_template_category(text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_create_ypop_city_activity(text,text,text,text,text,integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_ypop_city_activity(text,text,text,text,text,integer) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_create_ypop_city_activity(text,text,text,text,text,integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_create_ypop_city_activity(text,text,text,text,text,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_create_ypop_city_activity(text,text,text,text,text,text,integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_ypop_city_activity(text,text,text,text,text,text,integer) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_create_ypop_city_activity(text,text,text,text,text,text,integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_create_ypop_city_activity(text,text,text,text,text,text,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_create_ypop_entry(text,uuid,text,text,integer,integer,integer,text,text,text,timestamp with time zone,timestamp with time zone,timestamp with time zone,jsonb,integer,jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_ypop_entry(text,uuid,text,text,integer,integer,integer,text,text,text,timestamp with time zone,timestamp with time zone,timestamp with time zone,jsonb,integer,jsonb) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_create_ypop_entry(text,uuid,text,text,integer,integer,integer,text,text,text,timestamp with time zone,timestamp with time zone,timestamp with time zone,jsonb,integer,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_create_ypop_entry(text,uuid,text,text,integer,integer,integer,text,text,text,timestamp with time zone,timestamp with time zone,timestamp with time zone,jsonb,integer,jsonb) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_create_ypop_period(text,text,text,timestamp with time zone,ypop_period_status,jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_ypop_period(text,text,text,timestamp with time zone,ypop_period_status,jsonb) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_create_ypop_period(text,text,text,timestamp with time zone,ypop_period_status,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_create_ypop_period(text,text,text,timestamp with time zone,ypop_period_status,jsonb) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_delete_template_category(text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_delete_template_category(text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_delete_template_category(text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_delete_ypop_city_activity(text,uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_ypop_city_activity(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_delete_ypop_city_activity(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_delete_ypop_city_activity(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_delete_ypop_period(text,uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_ypop_period(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_delete_ypop_period(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_delete_ypop_period(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_ensure_renewal_test_account_profile(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_ensure_renewal_test_account_profile(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_ensure_renewal_test_account_profile(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_ensure_renewal_test_account_profile(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_activity_announcements(text,uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_activity_announcements(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_activity_announcements(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_activity_announcements(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_annual_budget_allocations(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_annual_budget_allocations(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_annual_budget_allocations(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_annual_budget_allocations(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_budget_monitoring_page(text,integer,date,date,timestamp with time zone,uuid,integer) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_budget_monitoring_page(text,integer,date,date,timestamp with time zone,uuid,integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_budget_monitoring_page(text,integer,date,date,timestamp with time zone,uuid,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_budget_monitoring_summary(text,integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_budget_monitoring_summary(text,integer) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_budget_monitoring_summary(text,integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_budget_monitoring_summary(text,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_budget_purpose_categories(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_budget_purpose_categories(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_budget_purpose_categories(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_budget_purpose_categories(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_budget_request_detail(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_budget_request_detail(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_budget_request_detail(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_summary(text,integer) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_summary(text,integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_summary(text,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_liquidation_report_detail(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_liquidation_report_detail(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_liquidation_report_detail(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_or_create_renewal_test_account(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_or_create_renewal_test_account(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_or_create_renewal_test_account(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_or_create_renewal_test_account(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_organization_identity_review(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_organization_identity_review(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_organization_identity_review(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_organization_renewals(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_organization_renewals(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_organization_renewals(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_portal_change_versions(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_portal_change_versions(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_portal_change_versions(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_portal_list_page(text,text,integer,integer,text,text,text,text,text,text,text,date,date,integer) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_portal_list_page(text,text,integer,integer,text,text,text,text,text,text,text,date,date,integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_portal_list_page(text,text,integer,integer,text,text,text,text,text,text,text,date,date,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_portal_section_state(text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_portal_section_state(text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_portal_section_state(text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_recent_notifications(text,integer) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_recent_notifications(text,integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_recent_notifications(text,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_registration_detail(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_registration_detail(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_registration_detail(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_renewal_queue_page(text,integer,integer,text,text,text,text,text,uuid[]) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_renewal_queue_page(text,integer,integer,text,text,text,text,text,uuid[]) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_renewal_queue_page(text,integer,integer,text,text,text,text,text,uuid[]) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_renewal_review_context(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_renewal_review_context(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_renewal_review_context(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_review_resource_page(text,text,integer,integer,text,text,text,text,text,text,text,date,date,integer) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_review_resource_page(text,text,integer,integer,text,text,text,text,text,text,text,date,date,integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_review_resource_page(text,text,integer,integer,text,text,text,text,text,text,text,date,date,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_sidebar_counts(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_sidebar_counts(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_sidebar_counts(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_system_settings(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_system_settings(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_system_settings(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_system_settings(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_template_categories(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_template_categories(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_template_categories(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_yorp_registration_documents(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_yorp_registration_documents(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_yorp_registration_documents(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_yorp_registry_ypop_detail(text,uuid,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_yorp_registry_ypop_detail(text,uuid,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_yorp_registry_ypop_detail(text,uuid,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_yorp_sample_dataset_status(text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_yorp_sample_dataset_status(text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_yorp_sample_dataset_status(text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_city_activities(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_city_activities(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_city_activities(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_city_activities(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_entries(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_entries(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_entries(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_entries(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_entry_review_detail(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_entry_review_detail(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_entry_review_detail(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_event_files(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_event_files(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_event_files(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_event_files(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_event_participations(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_event_participations(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_event_participations(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_event_participations(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_org_activities(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_org_activities(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_org_activities(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_org_activities(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_org_activity_files(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_org_activity_files(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_org_activity_files(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_org_activity_files(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_period_city_activities(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_period_city_activities(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_period_city_activities(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_period_submissions_page(text,uuid,integer,integer,text,text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_period_submissions_page(text,uuid,integer,integer,text,text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_period_submissions_page(text,uuid,integer,integer,text,text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_periods(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_periods(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_periods(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_periods(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_review_files(text,text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_review_files(text,text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_review_files(text,text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_validation_periods(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_validation_periods(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_get_ypop_validation_periods(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_mark_notifications_read(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_mark_notifications_read(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_mark_notifications_read(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_prepare_renewal_test_scenario(text,integer,date) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_prepare_renewal_test_scenario(text,integer,date) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_prepare_renewal_test_scenario(text,integer,date) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_prepare_renewal_test_scenario(text,integer,date) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_refresh_session(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_refresh_session(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_refresh_session(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_reject_renewal(text,uuid,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_renewal(text,uuid,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_reject_renewal(text,uuid,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_reject_renewal(text,uuid,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_reject_renewal_in_supabase(text,uuid,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_renewal_in_supabase(text,uuid,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_reject_renewal_in_supabase(text,uuid,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_reject_renewal_in_supabase(text,uuid,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_request_renewal_revision(text,uuid,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_request_renewal_revision(text,uuid,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_request_renewal_revision(text,uuid,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_request_renewal_revision(text,uuid,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_request_renewal_revision_in_supabase(text,uuid,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_request_renewal_revision_in_supabase(text,uuid,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_request_renewal_revision_in_supabase(text,uuid,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_request_renewal_revision_in_supabase(text,uuid,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_reset_renewal_test_scenario(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_renewal_test_scenario(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_reset_renewal_test_scenario(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_reset_renewal_test_scenario(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_restore_renewal_test_scenario(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_restore_renewal_test_scenario(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_restore_renewal_test_scenario(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_restore_renewal_test_scenario(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_review_organization_identity(text,uuid,uuid,text,text,text,integer) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_review_organization_identity(text,uuid,uuid,text,text,text,integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_review_organization_identity(text,uuid,uuid,text,text,text,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_save_annual_budget_allocation(text,integer,numeric,text,boolean) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_annual_budget_allocation(text,integer,numeric,text,boolean) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_save_annual_budget_allocation(text,integer,numeric,text,boolean) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_save_annual_budget_allocation(text,integer,numeric,text,boolean) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_save_budget_purpose_category(text,text,text,integer,boolean) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_budget_purpose_category(text,text,text,integer,boolean) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_save_budget_purpose_category(text,text,text,integer,boolean) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_save_budget_purpose_category(text,text,text,integer,boolean) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_save_system_settings(text,jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_system_settings(text,jsonb) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_save_system_settings(text,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_save_system_settings(text,jsonb) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_save_system_settings(jsonb,uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_save_system_settings(jsonb,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_save_system_settings(jsonb,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_save_system_settings(jsonb,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_seed_renewal_test_registration_documents(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_seed_renewal_test_registration_documents(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_seed_yorp_sample_dataset(text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_seed_yorp_sample_dataset(text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_seed_yorp_sample_dataset_core(text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_set_template_file_size(text,uuid,bigint) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_set_template_file_size(text,uuid,bigint) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_set_template_file_size(text,uuid,bigint) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_track_budget_version() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_track_budget_version() TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_track_budget_version() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_track_budget_version() TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_track_document_file_version() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_track_document_file_version() TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_track_document_file_version() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_track_document_file_version() TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_track_document_submission_version() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_track_document_submission_version() TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_track_document_submission_version() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_track_document_submission_version() TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_track_liquidation_version() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_track_liquidation_version() TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_track_liquidation_version() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_track_liquidation_version() TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_track_organization_profile_version() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_track_organization_profile_version() TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_track_organization_profile_version() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_track_organization_profile_version() TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_track_renewal_version() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_track_renewal_version() TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_track_renewal_version() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_track_renewal_version() TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_track_ypop_child_version() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_track_ypop_child_version() TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_track_ypop_child_version() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_track_ypop_child_version() TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_track_ypop_city_activity_version() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_track_ypop_city_activity_version() TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_track_ypop_city_activity_version() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_track_ypop_city_activity_version() TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_track_ypop_entry_version() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_track_ypop_entry_version() TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_track_ypop_entry_version() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_track_ypop_entry_version() TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_track_ypop_period_version() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_track_ypop_period_version() TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_track_ypop_period_version() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_track_ypop_period_version() TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_unlock_submission_revision(text,text,uuid,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_unlock_submission_revision(text,text,uuid,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_unlock_submission_revision(text,text,uuid,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_unlock_submission_revision(text,text,uuid,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_update_budget_request_file_status(text,uuid,text,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_budget_request_file_status(text,uuid,text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_update_budget_request_file_status(text,uuid,text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_update_budget_request_file_status(text,uuid,text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_update_inquiry(text,uuid,inquiry_status,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_inquiry(text,uuid,inquiry_status,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_update_inquiry(text,uuid,inquiry_status,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_update_inquiry(text,uuid,inquiry_status,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_update_liquidation_report_file_status(text,uuid,text,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_liquidation_report_file_status(text,uuid,text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_update_liquidation_report_file_status(text,uuid,text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_update_liquidation_report_file_status(text,uuid,text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_update_move_application(text,uuid,move_application_status,text,numeric,timestamp with time zone,timestamp with time zone,jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_move_application(text,uuid,move_application_status,text,numeric,timestamp with time zone,timestamp with time zone,jsonb) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_update_move_application(text,uuid,move_application_status,text,numeric,timestamp with time zone,timestamp with time zone,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_update_move_application(text,uuid,move_application_status,text,numeric,timestamp with time zone,timestamp with time zone,jsonb) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_update_org_yorp_fields(text,uuid,smallint,smallint) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_org_yorp_fields(text,uuid,smallint,smallint) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_update_org_yorp_fields(text,uuid,smallint,smallint) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_update_org_yorp_fields(text,uuid,smallint,smallint) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_city_activity(text,uuid,text,text,text,integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_city_activity(text,uuid,text,text,text,integer) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_city_activity(text,uuid,text,text,text,integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_city_activity(text,uuid,text,text,text,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_city_activity(text,uuid,text,text,text,text,integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_city_activity(text,uuid,text,text,text,text,integer) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_city_activity(text,uuid,text,text,text,text,integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_city_activity(text,uuid,text,text,text,text,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_entry(text,uuid,text,text,integer,integer,jsonb,jsonb,timestamp with time zone,integer,text,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_entry(text,uuid,text,text,integer,integer,jsonb,jsonb,timestamp with time zone,integer,text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_entry(text,uuid,text,text,integer,integer,jsonb,jsonb,timestamp with time zone,integer,text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_entry(text,uuid,text,text,integer,integer,jsonb,jsonb,timestamp with time zone,integer,text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_event_participation(text,uuid,text,text,timestamp with time zone,timestamp with time zone,jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_event_participation(text,uuid,text,text,timestamp with time zone,timestamp with time zone,jsonb) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_event_participation(text,uuid,text,text,timestamp with time zone,timestamp with time zone,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_event_participation(text,uuid,text,text,timestamp with time zone,timestamp with time zone,jsonb) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_org_activity(text,uuid,text,text,timestamp with time zone,jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_org_activity(text,uuid,text,text,timestamp with time zone,jsonb) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_org_activity(text,uuid,text,text,timestamp with time zone,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_org_activity(text,uuid,text,text,timestamp with time zone,jsonb) TO "service_role";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_period(text,uuid,text,timestamp with time zone,ypop_period_status,jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_period(text,uuid,text,timestamp with time zone,ypop_period_status,jsonb) TO "anon";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_period(text,uuid,text,timestamp with time zone,ypop_period_status,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.admin_update_ypop_period(text,uuid,text,timestamp with time zone,ypop_period_status,jsonb) TO "service_role";
GRANT EXECUTE ON FUNCTION public.authenticate_admin_account(text,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.authenticate_admin_account(text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.authenticate_admin_account(text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.authenticate_admin_account(text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.authorize_admin_template_category_registry(text,boolean) TO "service_role";
GRANT EXECUTE ON FUNCTION public.calculate_organization_renewal_eligibility(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_organization_renewal_eligibility(uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.calculate_organization_renewal_eligibility(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.calculate_organization_renewal_eligibility(uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.check_organization_identity(text,text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.check_organization_identity(text,text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.check_organization_identity(text,text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.check_signup_email_status(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_signup_email_status(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.check_signup_email_status(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.check_signup_email_status(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.create_admin_account(text,text,text,text,smallint,smallint) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_admin_account(text,text,text,text,smallint,smallint) TO "anon";
GRANT EXECUTE ON FUNCTION public.create_admin_account(text,text,text,text,smallint,smallint) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.create_admin_account(text,text,text,text,smallint,smallint) TO "service_role";
GRANT EXECUTE ON FUNCTION public.create_admin_activity_log(text,uuid,text,text,uuid,text,text,jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_admin_activity_log(text,uuid,text,text,uuid,text,text,jsonb) TO "anon";
GRANT EXECUTE ON FUNCTION public.create_admin_activity_log(text,uuid,text,text,uuid,text,text,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.create_admin_activity_log(text,uuid,text,text,uuid,text,text,jsonb) TO "service_role";
GRANT EXECUTE ON FUNCTION public.create_admin_news_category(text,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_admin_news_category(text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.create_admin_news_category(text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.create_admin_news_category(text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.create_admin_news_release(text,text,text,text,text,date,visibility_status) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_admin_news_release(text,text,text,text,text,date,visibility_status) TO "anon";
GRANT EXECUTE ON FUNCTION public.create_admin_news_release(text,text,text,text,text,date,visibility_status) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.create_admin_news_release(text,text,text,text,text,date,visibility_status) TO "service_role";
GRANT EXECUTE ON FUNCTION public.create_admin_news_release(text,text,text,text,text,date,visibility_status,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_admin_news_release(text,text,text,text,text,date,visibility_status,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.create_admin_news_release(text,text,text,text,text,date,visibility_status,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.create_admin_news_release(text,text,text,text,text,date,visibility_status,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.create_admin_template_document(text,text,text,text,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_admin_template_document(text,text,text,text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.create_admin_template_document(text,text,text,text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.create_admin_template_document(text,text,text,text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.create_admin_template_document(text,text,text,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_admin_template_document(text,text,text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.create_admin_template_document(text,text,text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.create_admin_template_document(text,text,text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.create_admin_transparency_post(text,text,text,text,text,date,visibility_status) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_admin_transparency_post(text,text,text,text,text,date,visibility_status) TO "anon";
GRANT EXECUTE ON FUNCTION public.create_admin_transparency_post(text,text,text,text,text,date,visibility_status) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.create_admin_transparency_post(text,text,text,text,text,date,visibility_status) TO "service_role";
GRANT EXECUTE ON FUNCTION public.create_notification_record(text,text,text,text,text,text,text,text,timestamp with time zone) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification_record(text,text,text,text,text,text,text,text,timestamp with time zone) TO "anon";
GRANT EXECUTE ON FUNCTION public.create_notification_record(text,text,text,text,text,text,text,text,timestamp with time zone) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.create_notification_record(text,text,text,text,text,text,text,text,timestamp with time zone) TO "service_role";
GRANT EXECUTE ON FUNCTION public.current_user_has_any_role(app_role_code[]) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_has_any_role(app_role_code[]) TO "anon";
GRANT EXECUTE ON FUNCTION public.current_user_has_any_role(app_role_code[]) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.current_user_has_any_role(app_role_code[]) TO "service_role";
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO "anon";
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO "service_role";
GRANT EXECUTE ON FUNCTION public.deactivate_admin_template_document(text,uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.deactivate_admin_template_document(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.deactivate_admin_template_document(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.deactivate_admin_template_document(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.delete_admin_account(text,uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_admin_account(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.delete_admin_account(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.delete_admin_account(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.delete_admin_inquiry(text,uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_admin_inquiry(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.delete_admin_inquiry(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.delete_admin_inquiry(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.delete_admin_news_category(text,uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_admin_news_category(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.delete_admin_news_category(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.delete_admin_news_category(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.delete_admin_news_release(text,uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_admin_news_release(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.delete_admin_news_release(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.delete_admin_news_release(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.delete_admin_transparency_post(text,uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_admin_transparency_post(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.delete_admin_transparency_post(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.delete_admin_transparency_post(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.delete_organization_account_canonical(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.delete_organization_account_canonical(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.delete_organization_account_canonical(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.delete_unverified_registration_account_canonical(text,uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_unverified_registration_account_canonical(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.delete_unverified_registration_account_canonical(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.delete_unverified_registration_account_canonical(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.derive_accreditation_status(text,date,date) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.derive_accreditation_status(text,date,date) TO "anon";
GRANT EXECUTE ON FUNCTION public.derive_accreditation_status(text,date,date) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.derive_accreditation_status(text,date,date) TO "service_role";
GRANT EXECUTE ON FUNCTION public.diversify_yorp_seed_projects_and_budgets() TO "service_role";
GRANT EXECUTE ON FUNCTION public.enforce_accreditation_immutability() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_accreditation_immutability() TO "anon";
GRANT EXECUTE ON FUNCTION public.enforce_accreditation_immutability() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.enforce_accreditation_immutability() TO "service_role";
GRANT EXECUTE ON FUNCTION public.enforce_budget_request_file_resubmission_lifecycle() TO "service_role";
GRANT EXECUTE ON FUNCTION public.enforce_budget_request_purpose_advocacy() TO "anon";
GRANT EXECUTE ON FUNCTION public.enforce_budget_request_purpose_advocacy() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.enforce_budget_request_purpose_advocacy() TO "service_role";
GRANT EXECUTE ON FUNCTION public.enforce_budget_request_resubmission_lifecycle() TO "service_role";
GRANT EXECUTE ON FUNCTION public.enforce_budget_request_terminal_status() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_budget_request_terminal_status() TO "anon";
GRANT EXECUTE ON FUNCTION public.enforce_budget_request_terminal_status() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.enforce_budget_request_terminal_status() TO "service_role";
GRANT EXECUTE ON FUNCTION public.enforce_budget_request_ypop_eligibility() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_budget_request_ypop_eligibility() TO "anon";
GRANT EXECUTE ON FUNCTION public.enforce_budget_request_ypop_eligibility() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.enforce_budget_request_ypop_eligibility() TO "service_role";
GRANT EXECUTE ON FUNCTION public.enforce_inquiry_authoritative_email() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_inquiry_authoritative_email() TO "anon";
GRANT EXECUTE ON FUNCTION public.enforce_inquiry_authoritative_email() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.enforce_inquiry_authoritative_email() TO "service_role";
GRANT EXECUTE ON FUNCTION public.enforce_organization_profile_headquarters_location() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_organization_profile_headquarters_location() TO "anon";
GRANT EXECUTE ON FUNCTION public.enforce_organization_profile_headquarters_location() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.enforce_organization_profile_headquarters_location() TO "service_role";
GRANT EXECUTE ON FUNCTION public.enforce_renewal_terminal_immutability() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_renewal_terminal_immutability() TO "anon";
GRANT EXECUTE ON FUNCTION public.enforce_renewal_terminal_immutability() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.enforce_renewal_terminal_immutability() TO "service_role";
GRANT EXECUTE ON FUNCTION public.ensure_admin_demo_session(text,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_admin_demo_session(text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.ensure_admin_demo_session(text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.ensure_admin_demo_session(text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.ensure_liquidation_report_for_budget() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_liquidation_report_for_budget() TO "anon";
GRANT EXECUTE ON FUNCTION public.ensure_liquidation_report_for_budget() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.ensure_liquidation_report_for_budget() TO "service_role";
GRANT EXECUTE ON FUNCTION public.evaluate_accreditation_notification_events() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_accreditation_notification_events() TO "anon";
GRANT EXECUTE ON FUNCTION public.evaluate_accreditation_notification_events() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.evaluate_accreditation_notification_events() TO "service_role";
GRANT EXECUTE ON FUNCTION public.evaluate_and_apply_automatic_registration_verification(uuid,uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_and_apply_automatic_registration_verification(uuid,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.evaluate_and_apply_automatic_registration_verification(uuid,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.evaluate_and_apply_automatic_registration_verification(uuid,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.extract_audit_request_metadata() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.extract_audit_request_metadata() TO "anon";
GRANT EXECUTE ON FUNCTION public.extract_audit_request_metadata() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.extract_audit_request_metadata() TO "service_role";
GRANT EXECUTE ON FUNCTION public.generate_organization_reference_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_organization_reference_id() TO "anon";
GRANT EXECUTE ON FUNCTION public.generate_organization_reference_id() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.generate_organization_reference_id() TO "service_role";
GRANT EXECUTE ON FUNCTION public.generate_unique_urn(text,timestamp with time zone) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_unique_urn(text,timestamp with time zone) TO "anon";
GRANT EXECUTE ON FUNCTION public.generate_unique_urn(text,timestamp with time zone) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.generate_unique_urn(text,timestamp with time zone) TO "service_role";
GRANT EXECUTE ON FUNCTION public.get_admin_inquiries(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_inquiries(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.get_admin_inquiries(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.get_admin_inquiries(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.get_admin_permission_context(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_permission_context(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.get_admin_permission_context(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.get_admin_permission_context(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.get_admin_portal_snapshot(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_portal_snapshot(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.get_admin_portal_snapshot(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.get_admin_portal_snapshot(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.get_budget_purpose_categories() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_budget_purpose_categories() TO "anon";
GRANT EXECUTE ON FUNCTION public.get_budget_purpose_categories() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.get_budget_purpose_categories() TO "service_role";
GRANT EXECUTE ON FUNCTION public.get_organization_portal_dashboard_summary(uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.get_organization_portal_dashboard_summary(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.get_organization_portal_dashboard_summary(uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.get_pasig_barangay_ordinal(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pasig_barangay_ordinal(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.get_pasig_barangay_ordinal(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.get_pasig_barangay_ordinal(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.get_pending_administrator_email(text,uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pending_administrator_email(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.get_pending_administrator_email(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.get_pending_administrator_email(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.get_public_budget_barangay_allocations(integer) TO "anon";
GRANT EXECUTE ON FUNCTION public.get_public_budget_barangay_allocations(integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.get_public_budget_barangay_allocations(integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.get_public_budget_monitoring_summary(integer) TO "anon";
GRANT EXECUTE ON FUNCTION public.get_public_budget_monitoring_summary(integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.get_public_budget_monitoring_summary(integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.get_public_organization_profile(uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.get_public_organization_profile(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.get_public_organization_profile(uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO "anon";
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO "service_role";
GRANT EXECUTE ON FUNCTION public.get_public_system_settings() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_system_settings() TO "anon";
GRANT EXECUTE ON FUNCTION public.get_public_system_settings() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.get_public_system_settings() TO "service_role";
GRANT EXECUTE ON FUNCTION public.get_system_setting_bool(text,boolean) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_system_setting_bool(text,boolean) TO "anon";
GRANT EXECUTE ON FUNCTION public.get_system_setting_bool(text,boolean) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.get_system_setting_bool(text,boolean) TO "service_role";
GRANT EXECUTE ON FUNCTION public.get_system_setting_int(text,integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_system_setting_int(text,integer) TO "anon";
GRANT EXECUTE ON FUNCTION public.get_system_setting_int(text,integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.get_system_setting_int(text,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.get_system_setting_text(text,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_system_setting_text(text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.get_system_setting_text(text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.get_system_setting_text(text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.get_yorp_quarterly_report(text,integer,integer) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_yorp_quarterly_report(text,integer,integer) TO "anon";
GRANT EXECUTE ON FUNCTION public.get_yorp_quarterly_report(text,integer,integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.get_yorp_quarterly_report(text,integer,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.guard_historical_organization_owner() TO "service_role";
GRANT EXECUTE ON FUNCTION public.guard_organization_identity_financial_write() TO "service_role";
GRANT EXECUTE ON FUNCTION public.guard_organization_identity_privileges() TO "service_role";
GRANT EXECUTE ON FUNCTION public.guard_organization_identity_verification() TO "service_role";
GRANT EXECUTE ON FUNCTION public.guard_renewal_test_registration_packet_immutable() TO "service_role";
GRANT EXECUTE ON FUNCTION public.guard_retained_organization_deletion() TO "service_role";
GRANT EXECUTE ON FUNCTION public.guard_submitted_registration_document_edits() TO "service_role";
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO "anon";
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO "service_role";
GRANT EXECUTE ON FUNCTION public.handle_organization_profile_urn_auto_gen() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_organization_profile_urn_auto_gen() TO "anon";
GRANT EXECUTE ON FUNCTION public.handle_organization_profile_urn_auto_gen() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.handle_organization_profile_urn_auto_gen() TO "service_role";
GRANT EXECUTE ON FUNCTION public.hard_delete_admin_template_document(text,uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.hard_delete_admin_template_document(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.hard_delete_admin_template_document(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.hard_delete_admin_template_document(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.is_audit_logging_enabled(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_audit_logging_enabled(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.is_audit_logging_enabled(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.is_audit_logging_enabled(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.is_development_or_test_environment() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_development_or_test_environment() TO "anon";
GRANT EXECUTE ON FUNCTION public.is_development_or_test_environment() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.is_development_or_test_environment() TO "service_role";
GRANT EXECUTE ON FUNCTION public.is_signup_email_registered(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_signup_email_registered(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.is_signup_email_registered(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.is_signup_email_registered(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.is_urn_registered(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_urn_registered(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.is_urn_registered(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.is_urn_registered(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.join_ypop_city_activity(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_ypop_city_activity(uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.join_ypop_city_activity(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.join_ypop_city_activity(uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.list_admin_accounts_for_admin_portal(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_admin_accounts_for_admin_portal(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.list_admin_accounts_for_admin_portal(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.list_admin_accounts_for_admin_portal(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.list_administrators_for_admin_portal(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_administrators_for_admin_portal(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.list_administrators_for_admin_portal(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.list_administrators_for_admin_portal(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.list_roles_for_admin_portal(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_roles_for_admin_portal(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.list_roles_for_admin_portal(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.list_roles_for_admin_portal(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.list_units_for_admin_portal(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_units_for_admin_portal(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.list_units_for_admin_portal(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.list_units_for_admin_portal(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.normalize_organization_contact_arrays() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_organization_contact_arrays() TO "anon";
GRANT EXECUTE ON FUNCTION public.normalize_organization_contact_arrays() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.normalize_organization_contact_arrays() TO "service_role";
GRANT EXECUTE ON FUNCTION public.normalize_organization_identity_name(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_organization_identity_name(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.normalize_organization_identity_name(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.normalize_organization_identity_name(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.normalize_pasig_barangay_name(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_pasig_barangay_name(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.normalize_pasig_barangay_name(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.normalize_pasig_barangay_name(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.normalize_urn(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_urn(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.normalize_urn(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.normalize_urn(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.notify_budget_change() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_budget_change() TO "anon";
GRANT EXECUTE ON FUNCTION public.notify_budget_change() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.notify_budget_change() TO "service_role";
GRANT EXECUTE ON FUNCTION public.notify_budget_request_change() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_budget_request_change() TO "anon";
GRANT EXECUTE ON FUNCTION public.notify_budget_request_change() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.notify_budget_request_change() TO "service_role";
GRANT EXECUTE ON FUNCTION public.notify_inquiry_change() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_inquiry_change() TO "anon";
GRANT EXECUTE ON FUNCTION public.notify_inquiry_change() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.notify_inquiry_change() TO "service_role";
GRANT EXECUTE ON FUNCTION public.notify_liquidation_change() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_liquidation_change() TO "anon";
GRANT EXECUTE ON FUNCTION public.notify_liquidation_change() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.notify_liquidation_change() TO "service_role";
GRANT EXECUTE ON FUNCTION public.notify_organization_profile_review_change() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_organization_profile_review_change() TO "anon";
GRANT EXECUTE ON FUNCTION public.notify_organization_profile_review_change() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.notify_organization_profile_review_change() TO "service_role";
GRANT EXECUTE ON FUNCTION public.notify_organization_profile_status_change() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_organization_profile_status_change() TO "anon";
GRANT EXECUTE ON FUNCTION public.notify_organization_profile_status_change() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.notify_organization_profile_status_change() TO "service_role";
GRANT EXECUTE ON FUNCTION public.notify_submission_change() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_submission_change() TO "anon";
GRANT EXECUTE ON FUNCTION public.notify_submission_change() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.notify_submission_change() TO "service_role";
GRANT EXECUTE ON FUNCTION public.notify_urn_review_change() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_urn_review_change() TO "anon";
GRANT EXECUTE ON FUNCTION public.notify_urn_review_change() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.notify_urn_review_change() TO "service_role";
GRANT EXECUTE ON FUNCTION public.notify_ypop_activity_change() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_ypop_activity_change() TO "anon";
GRANT EXECUTE ON FUNCTION public.notify_ypop_activity_change() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.notify_ypop_activity_change() TO "service_role";
GRANT EXECUTE ON FUNCTION public.notify_ypop_entry_status_change() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_ypop_entry_status_change() TO "anon";
GRANT EXECUTE ON FUNCTION public.notify_ypop_entry_status_change() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.notify_ypop_entry_status_change() TO "service_role";
GRANT EXECUTE ON FUNCTION public.notify_ypop_event_participation_status_change() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_ypop_event_participation_status_change() TO "anon";
GRANT EXECUTE ON FUNCTION public.notify_ypop_event_participation_status_change() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.notify_ypop_event_participation_status_change() TO "service_role";
GRANT EXECUTE ON FUNCTION public.notify_ypop_org_activity_status_change() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_ypop_org_activity_status_change() TO "anon";
GRANT EXECUTE ON FUNCTION public.notify_ypop_org_activity_status_change() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.notify_ypop_org_activity_status_change() TO "service_role";
GRANT EXECUTE ON FUNCTION public.organization_identity_name_anchor(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.organization_identity_name_anchor(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.organization_identity_name_anchor(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.organization_identity_name_anchor(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.promote_renewal_submission_files_for_review() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_renewal_submission_files_for_review() TO "anon";
GRANT EXECUTE ON FUNCTION public.promote_renewal_submission_files_for_review() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.promote_renewal_submission_files_for_review() TO "service_role";
GRANT EXECUTE ON FUNCTION public.protect_urn_review_fields() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_urn_review_fields() TO "anon";
GRANT EXECUTE ON FUNCTION public.protect_urn_review_fields() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.protect_urn_review_fields() TO "service_role";
GRANT EXECUTE ON FUNCTION public.reactivate_admin_template_document(text,uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.reactivate_admin_template_document(text,uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.reactivate_admin_template_document(text,uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.reactivate_admin_template_document(text,uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.rebalance_yorp_seed_reporting_quarters() TO "service_role";
GRANT EXECUTE ON FUNCTION public.repair_yorp_seeded_fixture_relationships(uuid,uuid,uuid,jsonb,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint) TO "anon";
GRANT EXECUTE ON FUNCTION public.replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.replace_organization_document_file(uuid,uuid,timestamp with time zone,text,text,text,bigint) TO "service_role";
GRANT EXECUTE ON FUNCTION public.resolve_pasig_district_from_barangay(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.resolve_pasig_district_from_barangay(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.resolve_pasig_district_from_barangay(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.resolve_yorp_sample_activity_category(text,text[]) TO "service_role";
GRANT EXECUTE ON FUNCTION public.resolve_yorp_seed_budget_category(text,text[]) TO "anon";
GRANT EXECUTE ON FUNCTION public.resolve_yorp_seed_budget_category(text,text[]) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.resolve_yorp_seed_budget_category(text,text[]) TO "service_role";
GRANT EXECUTE ON FUNCTION public.resubmit_organization_urn(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.resubmit_organization_urn(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.resubmit_organization_urn(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.review_organization_urn(text,uuid,text,urn_review_status,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.review_organization_urn(text,uuid,text,urn_review_status,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.review_organization_urn(text,uuid,text,urn_review_status,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.revoke_admin_session_token(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_admin_session_token(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.revoke_admin_session_token(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.revoke_admin_session_token(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.revoke_organization_accreditation(text,uuid,text,timestamp with time zone) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_organization_accreditation(text,uuid,text,timestamp with time zone) TO "anon";
GRANT EXECUTE ON FUNCTION public.revoke_organization_accreditation(text,uuid,text,timestamp with time zone) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.revoke_organization_accreditation(text,uuid,text,timestamp with time zone) TO "service_role";
GRANT EXECUTE ON FUNCTION public.search_public_organizations() TO "anon";
GRANT EXECUTE ON FUNCTION public.search_public_organizations() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.search_public_organizations() TO "service_role";
GRANT EXECUTE ON FUNCTION public.set_admin_account_active(text,uuid,boolean) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_admin_account_active(text,uuid,boolean) TO "anon";
GRANT EXECUTE ON FUNCTION public.set_admin_account_active(text,uuid,boolean) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.set_admin_account_active(text,uuid,boolean) TO "service_role";
GRANT EXECUTE ON FUNCTION public.set_budget_request_fiscal_year() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_budget_request_fiscal_year() TO "anon";
GRANT EXECUTE ON FUNCTION public.set_budget_request_fiscal_year() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.set_budget_request_fiscal_year() TO "service_role";
GRANT EXECUTE ON FUNCTION public.set_initial_admin_password(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_initial_admin_password(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.set_initial_admin_password(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.set_initial_admin_password(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO "anon";
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO "service_role";
GRANT EXECUTE ON FUNCTION public.sync_organization_accreditation_projection() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_organization_accreditation_projection() TO "anon";
GRANT EXECUTE ON FUNCTION public.sync_organization_accreditation_projection() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.sync_organization_accreditation_projection() TO "service_role";
GRANT EXECUTE ON FUNCTION public.sync_organization_contacts_from_profile() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_organization_contacts_from_profile() TO "anon";
GRANT EXECUTE ON FUNCTION public.sync_organization_contacts_from_profile() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.sync_organization_contacts_from_profile() TO "service_role";
GRANT EXECUTE ON FUNCTION public.sync_organization_profile_structured_fields() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_organization_profile_structured_fields() TO "anon";
GRANT EXECUTE ON FUNCTION public.sync_organization_profile_structured_fields() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.sync_organization_profile_structured_fields() TO "service_role";
GRANT EXECUTE ON FUNCTION public.sync_organization_urn() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_organization_urn() TO "anon";
GRANT EXECUTE ON FUNCTION public.sync_organization_urn() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.sync_organization_urn() TO "service_role";
GRANT EXECUTE ON FUNCTION public.sync_ypop_city_activity_participations() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_ypop_city_activity_participations() TO "anon";
GRANT EXECUTE ON FUNCTION public.sync_ypop_city_activity_participations() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.sync_ypop_city_activity_participations() TO "service_role";
GRANT EXECUTE ON FUNCTION public.touch_move_application_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_move_application_updated_at() TO "anon";
GRANT EXECUTE ON FUNCTION public.touch_move_application_updated_at() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.touch_move_application_updated_at() TO "service_role";
GRANT EXECUTE ON FUNCTION public.touch_ypop_org_activity_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_ypop_org_activity_updated_at() TO "anon";
GRANT EXECUTE ON FUNCTION public.touch_ypop_org_activity_updated_at() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.touch_ypop_org_activity_updated_at() TO "service_role";
GRANT EXECUTE ON FUNCTION public.try_get_pasig_barangay_ordinal(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_get_pasig_barangay_ordinal(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.try_get_pasig_barangay_ordinal(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.try_get_pasig_barangay_ordinal(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.update_admin_account(text,uuid,text,text,text,smallint,smallint) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_admin_account(text,uuid,text,text,text,smallint,smallint) TO "anon";
GRANT EXECUTE ON FUNCTION public.update_admin_account(text,uuid,text,text,text,smallint,smallint) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.update_admin_account(text,uuid,text,text,text,smallint,smallint) TO "service_role";
GRANT EXECUTE ON FUNCTION public.update_admin_budget_request(text,uuid,text,numeric,numeric,date,text,text,timestamp with time zone,timestamp with time zone,text,jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_admin_budget_request(text,uuid,text,numeric,numeric,date,text,text,timestamp with time zone,timestamp with time zone,text,jsonb) TO "anon";
GRANT EXECUTE ON FUNCTION public.update_admin_budget_request(text,uuid,text,numeric,numeric,date,text,text,timestamp with time zone,timestamp with time zone,text,jsonb) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.update_admin_budget_request(text,uuid,text,numeric,numeric,date,text,text,timestamp with time zone,timestamp with time zone,text,jsonb) TO "service_role";
GRANT EXECUTE ON FUNCTION public.update_admin_document_submission_file_review(text,uuid,document_submission_status,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_admin_document_submission_file_review(text,uuid,document_submission_status,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.update_admin_document_submission_file_review(text,uuid,document_submission_status,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.update_admin_document_submission_file_review(text,uuid,document_submission_status,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.update_admin_document_submission_review(text,uuid,document_submission_status,text,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_admin_document_submission_review(text,uuid,document_submission_status,text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.update_admin_document_submission_review(text,uuid,document_submission_status,text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.update_admin_document_submission_review(text,uuid,document_submission_status,text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.update_admin_liquidation_report(text,uuid,liquidation_report_status,text,timestamp with time zone,timestamp with time zone,timestamp with time zone,timestamp with time zone) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_admin_liquidation_report(text,uuid,liquidation_report_status,text,timestamp with time zone,timestamp with time zone,timestamp with time zone,timestamp with time zone) TO "anon";
GRANT EXECUTE ON FUNCTION public.update_admin_liquidation_report(text,uuid,liquidation_report_status,text,timestamp with time zone,timestamp with time zone,timestamp with time zone,timestamp with time zone) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.update_admin_liquidation_report(text,uuid,liquidation_report_status,text,timestamp with time zone,timestamp with time zone,timestamp with time zone,timestamp with time zone) TO "service_role";
GRANT EXECUTE ON FUNCTION public.update_admin_news_release(text,uuid,text,text,text,text,date,visibility_status) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_admin_news_release(text,uuid,text,text,text,text,date,visibility_status) TO "anon";
GRANT EXECUTE ON FUNCTION public.update_admin_news_release(text,uuid,text,text,text,text,date,visibility_status) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.update_admin_news_release(text,uuid,text,text,text,text,date,visibility_status) TO "service_role";
GRANT EXECUTE ON FUNCTION public.update_admin_news_release(text,uuid,text,text,text,text,date,visibility_status,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_admin_news_release(text,uuid,text,text,text,text,date,visibility_status,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.update_admin_news_release(text,uuid,text,text,text,text,date,visibility_status,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.update_admin_news_release(text,uuid,text,text,text,text,date,visibility_status,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.update_admin_organization_profile_review(text,uuid,profile_status,timestamp with time zone) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_admin_organization_profile_review(text,uuid,profile_status,timestamp with time zone) TO "anon";
GRANT EXECUTE ON FUNCTION public.update_admin_organization_profile_review(text,uuid,profile_status,timestamp with time zone) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.update_admin_organization_profile_review(text,uuid,profile_status,timestamp with time zone) TO "service_role";
GRANT EXECUTE ON FUNCTION public.update_admin_template_category(text,uuid,text[]) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_admin_template_category(text,uuid,text[]) TO "anon";
GRANT EXECUTE ON FUNCTION public.update_admin_template_category(text,uuid,text[]) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.update_admin_template_category(text,uuid,text[]) TO "service_role";
GRANT EXECUTE ON FUNCTION public.update_admin_template_document(text,uuid,text,text,text,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_admin_template_document(text,uuid,text,text,text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.update_admin_template_document(text,uuid,text,text,text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.update_admin_template_document(text,uuid,text,text,text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.update_admin_template_document(text,uuid,text,text,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_admin_template_document(text,uuid,text,text,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.update_admin_template_document(text,uuid,text,text,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.update_admin_template_document(text,uuid,text,text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.update_admin_template_file_url(text,uuid,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_admin_template_file_url(text,uuid,text) TO "anon";
GRANT EXECUTE ON FUNCTION public.update_admin_template_file_url(text,uuid,text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.update_admin_template_file_url(text,uuid,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.update_admin_template_metadata(text,uuid,text[],bigint) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_admin_template_metadata(text,uuid,text[],bigint) TO "anon";
GRANT EXECUTE ON FUNCTION public.update_admin_template_metadata(text,uuid,text[],bigint) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.update_admin_template_metadata(text,uuid,text[],bigint) TO "service_role";
GRANT EXECUTE ON FUNCTION public.update_admin_template_metadata(text,uuid,boolean,text,text,text,text[],bigint) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_admin_template_metadata(text,uuid,boolean,text,text,text,text[],bigint) TO "anon";
GRANT EXECUTE ON FUNCTION public.update_admin_template_metadata(text,uuid,boolean,text,text,text,text[],bigint) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.update_admin_template_metadata(text,uuid,boolean,text,text,text,text[],bigint) TO "service_role";
GRANT EXECUTE ON FUNCTION public.update_admin_transparency_post(text,uuid,text,text,text,text,date,visibility_status) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_admin_transparency_post(text,uuid,text,text,text,text,date,visibility_status) TO "anon";
GRANT EXECUTE ON FUNCTION public.update_admin_transparency_post(text,uuid,text,text,text,text,date,visibility_status) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.update_admin_transparency_post(text,uuid,text,text,text,text,date,visibility_status) TO "service_role";
GRANT EXECUTE ON FUNCTION public.update_organization_directory_preferences(boolean,boolean,boolean) TO "anon";
GRANT EXECUTE ON FUNCTION public.update_organization_directory_preferences(boolean,boolean,boolean) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.update_organization_directory_preferences(boolean,boolean,boolean) TO "service_role";
GRANT EXECUTE ON FUNCTION public.update_role_permissions(text,smallint,text[]) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_role_permissions(text,smallint,text[]) TO "anon";
GRANT EXECUTE ON FUNCTION public.update_role_permissions(text,smallint,text[]) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.update_role_permissions(text,smallint,text[]) TO "service_role";
GRANT EXECUTE ON FUNCTION public.user_replace_document_submission_file(uuid,text,text,text,numeric,boolean) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_replace_document_submission_file(uuid,text,text,text,numeric,boolean) TO "anon";
GRANT EXECUTE ON FUNCTION public.user_replace_document_submission_file(uuid,text,text,text,numeric,boolean) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.user_replace_document_submission_file(uuid,text,text,text,numeric,boolean) TO "service_role";
GRANT EXECUTE ON FUNCTION public.user_resubmit_renewal(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_resubmit_renewal(uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.user_resubmit_renewal(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.user_resubmit_renewal(uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.user_resubmit_renewal_application(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_resubmit_renewal_application(uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.user_resubmit_renewal_application(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.user_resubmit_renewal_application(uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.user_start_or_get_renewal_draft(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_start_or_get_renewal_draft(uuid) TO "anon";
GRANT EXECUTE ON FUNCTION public.user_start_or_get_renewal_draft(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.user_start_or_get_renewal_draft(uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.user_submit_additional_renewal_documents(uuid,uuid[]) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.user_submit_additional_renewal_documents(uuid,uuid[]) TO "service_role";
GRANT EXECUTE ON FUNCTION public.user_submit_renewal(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.user_submit_renewal(uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.validate_admin_session_token(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_admin_session_token(text) TO "anon";
GRANT EXECUTE ON FUNCTION public.validate_admin_session_token(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION public.validate_admin_session_token(text) TO "service_role";
ALTER TABLE public."activity_announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."activity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."admin_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."admin_portal_change_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."admin_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."admin_system_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."admin_template_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."admin_ypop_deletion_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."annual_budget_allocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."barangays" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."budget_purpose_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."budget_request_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."budget_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."compliance_remarks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."disclosure_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."document_submission_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."document_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."inquiries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."liquidation_report_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."liquidation_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."move_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."move_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."news_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."news_releases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."organization_accreditations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."organization_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."organization_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."organization_reference_counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."organization_renewals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."organization_urn_counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."policy_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."programs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."required_document_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."transparency_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."urn_review_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_policy_acceptance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."yorp_sample_document_assets" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."ypop_city_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ypop_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ypop_event_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ypop_event_participations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ypop_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ypop_org_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ypop_org_activity_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ypop_periods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ypop_submission_deletion_receipts" ENABLE ROW LEVEL SECURITY;
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
CREATE TRIGGER trg_admin_accounts_updated_at BEFORE UPDATE ON admin_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_admin_sidebar_version_refresh AFTER UPDATE ON admin_portal_change_versions FOR EACH STATEMENT EXECUTE FUNCTION admin_broadcast_sidebar_refresh();
CREATE TRIGGER trg_admin_track_budget_file_version AFTER INSERT OR DELETE OR UPDATE ON budget_request_files FOR EACH ROW EXECUTE FUNCTION admin_track_budget_version();
CREATE TRIGGER trg_enforce_budget_request_file_resubmission BEFORE UPDATE ON budget_request_files FOR EACH ROW EXECUTE FUNCTION enforce_budget_request_file_resubmission_lifecycle();
CREATE TRIGGER budget_requests_enforce_purpose_advocacy BEFORE INSERT OR UPDATE OF organization_id, purpose_category ON budget_requests FOR EACH ROW EXECUTE FUNCTION enforce_budget_request_purpose_advocacy();
CREATE TRIGGER trg_admin_track_budget_version AFTER INSERT OR DELETE OR UPDATE ON budget_requests FOR EACH ROW EXECUTE FUNCTION admin_track_budget_version();
CREATE TRIGGER trg_budget_request_notify AFTER UPDATE ON budget_requests FOR EACH ROW WHEN (old.status IS DISTINCT FROM new.status) EXECUTE FUNCTION notify_budget_change();
CREATE TRIGGER trg_budget_request_status_sync AFTER INSERT OR UPDATE ON budget_requests FOR EACH ROW EXECUTE FUNCTION ensure_liquidation_report_for_budget();
CREATE TRIGGER trg_budget_request_ypop_eligibility BEFORE INSERT ON budget_requests FOR EACH ROW EXECUTE FUNCTION enforce_budget_request_ypop_eligibility();
CREATE TRIGGER trg_budget_requests_updated_at BEFORE UPDATE ON budget_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_enforce_budget_request_resubmission BEFORE UPDATE ON budget_requests FOR EACH ROW EXECUTE FUNCTION enforce_budget_request_resubmission_lifecycle();
CREATE TRIGGER trg_enforce_budget_request_terminal_status BEFORE INSERT OR UPDATE ON budget_requests FOR EACH ROW EXECUTE FUNCTION enforce_budget_request_terminal_status();
CREATE TRIGGER trg_identity_budget_write BEFORE INSERT OR UPDATE OF organization_id, status ON budget_requests FOR EACH ROW EXECUTE FUNCTION guard_organization_identity_financial_write();
CREATE TRIGGER trg_set_budget_request_fiscal_year BEFORE INSERT ON budget_requests FOR EACH ROW EXECUTE FUNCTION set_budget_request_fiscal_year();
CREATE TRIGGER trg_compliance_remarks_updated_at BEFORE UPDATE ON compliance_remarks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_admin_track_document_file_version AFTER INSERT OR DELETE OR UPDATE ON document_submission_files FOR EACH ROW EXECUTE FUNCTION admin_track_document_file_version();
CREATE TRIGGER trg_document_submission_files_updated_at BEFORE UPDATE ON document_submission_files FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_guard_submitted_registration_document_edits BEFORE DELETE OR UPDATE ON document_submission_files FOR EACH ROW EXECUTE FUNCTION guard_submitted_registration_document_edits();
CREATE TRIGGER trg_immutable_renewal_test_registration_file BEFORE INSERT OR DELETE OR UPDATE ON document_submission_files FOR EACH ROW EXECUTE FUNCTION guard_renewal_test_registration_packet_immutable();
CREATE TRIGGER trg_admin_track_document_submission_version AFTER INSERT OR DELETE OR UPDATE ON document_submissions FOR EACH ROW EXECUTE FUNCTION admin_track_document_submission_version();
CREATE TRIGGER trg_document_submission_notify AFTER UPDATE ON document_submissions FOR EACH ROW WHEN (old.status IS DISTINCT FROM new.status) EXECUTE FUNCTION notify_submission_change();
CREATE TRIGGER trg_document_submissions_updated_at BEFORE UPDATE ON document_submissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_identity_documents_owner BEFORE UPDATE OF organization_id ON document_submissions FOR EACH ROW EXECUTE FUNCTION guard_historical_organization_owner();
CREATE TRIGGER trg_immutable_renewal_test_registration_submission BEFORE DELETE OR UPDATE ON document_submissions FOR EACH ROW EXECUTE FUNCTION guard_renewal_test_registration_packet_immutable();
CREATE TRIGGER trg_promote_renewal_files_for_admin_review AFTER UPDATE OF status ON document_submissions FOR EACH ROW EXECUTE FUNCTION promote_renewal_submission_files_for_review();
CREATE TRIGGER trg_admin_sidebar_inquiry_refresh AFTER INSERT OR DELETE OR UPDATE ON inquiries FOR EACH STATEMENT EXECUTE FUNCTION admin_broadcast_sidebar_refresh();
CREATE TRIGGER trg_inquiry_authoritative_email BEFORE INSERT ON inquiries FOR EACH ROW EXECUTE FUNCTION enforce_inquiry_authoritative_email();
CREATE TRIGGER trg_inquiry_notify AFTER UPDATE OF status ON inquiries FOR EACH ROW WHEN (old.status IS DISTINCT FROM new.status) EXECUTE FUNCTION notify_inquiry_change();
CREATE TRIGGER trg_admin_track_liquidation_file_version AFTER INSERT OR DELETE OR UPDATE ON liquidation_report_files FOR EACH ROW EXECUTE FUNCTION admin_track_liquidation_version();
CREATE TRIGGER trg_admin_track_liquidation_version AFTER INSERT OR DELETE OR UPDATE ON liquidation_reports FOR EACH ROW EXECUTE FUNCTION admin_track_liquidation_version();
CREATE TRIGGER trg_identity_liquidation_owner BEFORE UPDATE OF organization_id ON liquidation_reports FOR EACH ROW EXECUTE FUNCTION guard_historical_organization_owner();
CREATE TRIGGER trg_liquidation_report_status_sync BEFORE INSERT OR UPDATE ON liquidation_reports FOR EACH ROW EXECUTE FUNCTION notify_liquidation_change();
CREATE TRIGGER trg_liquidation_reports_updated_at BEFORE UPDATE ON liquidation_reports FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_touch_move_application_updated_at BEFORE UPDATE ON move_applications FOR EACH ROW EXECUTE FUNCTION touch_move_application_updated_at();
CREATE TRIGGER trg_news_releases_updated_at BEFORE UPDATE ON news_releases FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_accreditation_immutability BEFORE DELETE OR UPDATE ON organization_accreditations FOR EACH ROW EXECUTE FUNCTION enforce_accreditation_immutability();
CREATE TRIGGER trg_admin_track_accreditation_version AFTER INSERT OR DELETE OR UPDATE ON organization_accreditations FOR EACH ROW EXECUTE FUNCTION admin_track_renewal_version();
CREATE TRIGGER trg_identity_accreditation_owner BEFORE UPDATE OF organization_id ON organization_accreditations FOR EACH ROW EXECUTE FUNCTION guard_historical_organization_owner();
CREATE TRIGGER trg_sync_organization_accreditation_projection AFTER INSERT OR UPDATE ON organization_accreditations FOR EACH ROW EXECUTE FUNCTION sync_organization_accreditation_projection();
CREATE TRIGGER trg_a_identity_privileges BEFORE INSERT OR UPDATE ON organization_profiles FOR EACH ROW EXECUTE FUNCTION guard_organization_identity_privileges();
CREATE TRIGGER trg_admin_track_organization_profile_version AFTER INSERT OR UPDATE ON organization_profiles FOR EACH ROW EXECUTE FUNCTION admin_track_organization_profile_version();
CREATE TRIGGER trg_generate_organization_reference_id BEFORE INSERT ON organization_profiles FOR EACH ROW EXECUTE FUNCTION generate_organization_reference_id();
CREATE TRIGGER trg_identity_retained_deletion BEFORE DELETE ON organization_profiles FOR EACH ROW EXECUTE FUNCTION guard_retained_organization_deletion();
CREATE TRIGGER trg_normalize_organization_contact_arrays BEFORE INSERT OR UPDATE ON organization_profiles FOR EACH ROW EXECUTE FUNCTION normalize_organization_contact_arrays();
CREATE TRIGGER trg_notify_urn_review_change AFTER UPDATE OF urn_review_status ON organization_profiles FOR EACH ROW WHEN (old.urn_review_status IS DISTINCT FROM new.urn_review_status) EXECUTE FUNCTION notify_urn_review_change();
CREATE TRIGGER trg_organization_profile_review_notify AFTER UPDATE ON organization_profiles FOR EACH ROW WHEN (old.profile_status IS DISTINCT FROM new.profile_status) EXECUTE FUNCTION notify_organization_profile_review_change();
CREATE TRIGGER trg_organization_profiles_updated_at BEFORE UPDATE ON organization_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_protect_urn_review_fields BEFORE UPDATE ON organization_profiles FOR EACH ROW EXECUTE FUNCTION protect_urn_review_fields();
CREATE TRIGGER trg_sync_organization_contacts_from_profile AFTER INSERT OR UPDATE ON organization_profiles FOR EACH ROW EXECUTE FUNCTION sync_organization_contacts_from_profile();
CREATE TRIGGER trg_sync_organization_profile_structured_fields BEFORE INSERT OR UPDATE ON organization_profiles FOR EACH ROW EXECUTE FUNCTION sync_organization_profile_structured_fields();
CREATE TRIGGER trg_sync_organization_urn BEFORE INSERT OR UPDATE OF registration_type, urn ON organization_profiles FOR EACH ROW EXECUTE FUNCTION sync_organization_urn();
CREATE TRIGGER trg_z_enforce_organization_profile_headquarters_location BEFORE INSERT OR UPDATE ON organization_profiles FOR EACH ROW EXECUTE FUNCTION enforce_organization_profile_headquarters_location();
CREATE TRIGGER trg_zz_identity_verification BEFORE INSERT OR UPDATE ON organization_profiles FOR EACH ROW EXECUTE FUNCTION guard_organization_identity_verification();
CREATE TRIGGER trigger_auto_generate_urn BEFORE INSERT ON organization_profiles FOR EACH ROW EXECUTE FUNCTION handle_organization_profile_urn_auto_gen();
CREATE TRIGGER trg_admin_track_renewal_version AFTER INSERT OR DELETE OR UPDATE ON organization_renewals FOR EACH ROW EXECUTE FUNCTION admin_track_renewal_version();
CREATE TRIGGER trg_identity_renewal_owner BEFORE UPDATE OF organization_id ON organization_renewals FOR EACH ROW EXECUTE FUNCTION guard_historical_organization_owner();
CREATE TRIGGER trg_renewal_terminal_immutability BEFORE DELETE OR UPDATE ON organization_renewals FOR EACH ROW EXECUTE FUNCTION enforce_renewal_terminal_immutability();
CREATE TRIGGER trg_policy_versions_updated_at BEFORE UPDATE ON policy_versions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_required_document_types_updated_at BEFORE UPDATE ON required_document_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_transparency_posts_updated_at BEFORE UPDATE ON transparency_posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_admin_track_ypop_city_activity_version AFTER INSERT OR DELETE OR UPDATE ON ypop_city_activities FOR EACH ROW EXECUTE FUNCTION admin_track_ypop_city_activity_version();
CREATE TRIGGER trg_sync_ypop_city_activity_participations AFTER UPDATE OF name, date, venue ON ypop_city_activities FOR EACH ROW EXECUTE FUNCTION sync_ypop_city_activity_participations();
CREATE TRIGGER trg_admin_track_ypop_entry_version AFTER INSERT OR DELETE OR UPDATE ON ypop_entries FOR EACH ROW EXECUTE FUNCTION admin_track_ypop_entry_version();
CREATE TRIGGER trg_identity_ypop_owner BEFORE UPDATE OF organization_id ON ypop_entries FOR EACH ROW EXECUTE FUNCTION guard_historical_organization_owner();
CREATE TRIGGER trg_ypop_entry_notify AFTER UPDATE OF status ON ypop_entries FOR EACH ROW EXECUTE FUNCTION notify_ypop_entry_status_change();
CREATE TRIGGER trg_admin_track_ypop_event_file_version AFTER INSERT OR DELETE OR UPDATE ON ypop_event_files FOR EACH ROW EXECUTE FUNCTION admin_track_ypop_child_version('ypop_city_led');
CREATE TRIGGER trg_admin_track_ypop_participation_version AFTER INSERT OR DELETE OR UPDATE ON ypop_event_participations FOR EACH ROW EXECUTE FUNCTION admin_track_ypop_child_version('ypop_city_led');
CREATE TRIGGER trg_identity_ypop_participation_owner BEFORE UPDATE OF organization_id ON ypop_event_participations FOR EACH ROW EXECUTE FUNCTION guard_historical_organization_owner();
CREATE TRIGGER trg_ypop_event_participation_notify AFTER UPDATE OF status ON ypop_event_participations FOR EACH ROW EXECUTE FUNCTION notify_ypop_event_participation_status_change();
CREATE TRIGGER trg_admin_track_ypop_org_activity_version AFTER INSERT OR DELETE OR UPDATE ON ypop_org_activities FOR EACH ROW EXECUTE FUNCTION admin_track_ypop_child_version('ypop_org_led');
CREATE TRIGGER trg_identity_ypop_activity_owner BEFORE UPDATE OF organization_id ON ypop_org_activities FOR EACH ROW EXECUTE FUNCTION guard_historical_organization_owner();
CREATE TRIGGER trg_touch_ypop_org_activity_updated_at BEFORE UPDATE ON ypop_org_activities FOR EACH ROW EXECUTE FUNCTION touch_ypop_org_activity_updated_at();
CREATE TRIGGER trg_ypop_org_activity_notify AFTER UPDATE OF status ON ypop_org_activities FOR EACH ROW EXECUTE FUNCTION notify_ypop_org_activity_status_change();
CREATE TRIGGER trg_admin_track_ypop_org_file_version AFTER INSERT OR DELETE OR UPDATE ON ypop_org_activity_files FOR EACH ROW EXECUTE FUNCTION admin_track_ypop_child_version('ypop_org_led');
CREATE TRIGGER trg_admin_track_ypop_period_version AFTER INSERT OR DELETE OR UPDATE ON ypop_periods FOR EACH ROW EXECUTE FUNCTION admin_track_ypop_period_version();
ALTER PUBLICATION supabase_realtime ADD TABLE public."budget_request_files";
ALTER PUBLICATION supabase_realtime ADD TABLE public."budget_requests";
ALTER PUBLICATION supabase_realtime ADD TABLE public."document_submission_files";
ALTER PUBLICATION supabase_realtime ADD TABLE public."document_submissions";
ALTER PUBLICATION supabase_realtime ADD TABLE public."inquiries";
ALTER PUBLICATION supabase_realtime ADD TABLE public."liquidation_report_files";
ALTER PUBLICATION supabase_realtime ADD TABLE public."liquidation_reports";
ALTER PUBLICATION supabase_realtime ADD TABLE public."organization_accreditations";
ALTER PUBLICATION supabase_realtime ADD TABLE public."organization_profiles";
ALTER PUBLICATION supabase_realtime ADD TABLE public."organization_renewals";
ALTER PUBLICATION supabase_realtime ADD TABLE public."ypop_city_activities";
ALTER PUBLICATION supabase_realtime ADD TABLE public."ypop_entries";
ALTER PUBLICATION supabase_realtime ADD TABLE public."ypop_event_files";
ALTER PUBLICATION supabase_realtime ADD TABLE public."ypop_event_participations";
ALTER PUBLICATION supabase_realtime ADD TABLE public."ypop_org_activities";
ALTER PUBLICATION supabase_realtime ADD TABLE public."ypop_org_activity_files";
ALTER PUBLICATION supabase_realtime ADD TABLE public."ypop_periods";
