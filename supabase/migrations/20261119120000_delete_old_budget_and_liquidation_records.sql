-- One-time cleanup before budget requests switch to the proposal template form:
-- remove every non-sample budget request and liquidation report with their file rows.
-- Lifecycle, identity and immutability triggers are switched off only for this delete.
-- Storage objects are removed separately with the Storage API (SQL cannot delete them).

ALTER TABLE public.liquidation_report_files DISABLE TRIGGER USER;
ALTER TABLE public.liquidation_reports DISABLE TRIGGER USER;
ALTER TABLE public.budget_request_files DISABLE TRIGGER USER;
ALTER TABLE public.budget_requests DISABLE TRIGGER USER;

DELETE FROM public.liquidation_report_files f
USING public.liquidation_reports lr
WHERE f.liquidation_report_id = lr.id AND coalesce(lr.is_seeded_sample_data, false) = false;

DELETE FROM public.liquidation_reports WHERE coalesce(is_seeded_sample_data, false) = false;

DELETE FROM public.budget_request_files f
USING public.budget_requests br
WHERE f.budget_request_id = br.id AND coalesce(br.is_seeded_sample_data, false) = false;

DELETE FROM public.budget_requests WHERE coalesce(is_seeded_sample_data, false) = false;

ALTER TABLE public.liquidation_report_files ENABLE TRIGGER USER;
ALTER TABLE public.liquidation_reports ENABLE TRIGGER USER;
ALTER TABLE public.budget_request_files ENABLE TRIGGER USER;
ALTER TABLE public.budget_requests ENABLE TRIGGER USER;
