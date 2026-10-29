-- Staging-only: Realtime publication table membership.
SET search_path = pg_catalog, public, extensions, auth, storage;

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

