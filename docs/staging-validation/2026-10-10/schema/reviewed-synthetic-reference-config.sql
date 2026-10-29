-- Staging-only non-sensitive reference configuration.
-- Values are limited to role codes/permission labels, budget category labels, and required-document metadata.
-- Do not copy production URLs, templates, user rows, or Storage metadata.
INSERT INTO public.roles (id, code, label, permission_codes) VALUES
  (1, 'admin'::public.app_role_code, 'Admin', ARRAY['registrations_management','yorp_registry_view','news_releases_management']::text[]),
  (2, 'organization_user'::public.app_role_code, 'Organization User', ARRAY[]::text[]),
  (3, 'youth'::public.app_role_code, 'Youth', ARRAY[]::text[]),
  (4, 'super_admin'::public.app_role_code, 'Super Admin', ARRAY['registrations_management','yorp_registry_view','ypop_validation_review','budget_requests_review','liquidation_reports_review','budget_monitoring_view','news_releases_management','forms_templates_management','inquiries_management','administrators_management','activity_logs_view','system_settings_view','system_settings_manage','backup_recovery_view','backup_recovery_manage']::text[])
;
INSERT INTO public.budget_purpose_categories (name, sort_order, is_active) VALUES
  ('Leadership & Governance', 1, TRUE),
  ('Sports, Fitness & Recreation', 2, TRUE),
  ('Arts, Culture & Heritage', 3, TRUE),
  ('Environmental Protection & Climate Action', 4, TRUE),
  ('Education, Digital Literacy & Technology', 5, TRUE),
  ('Health, Mental Wellness & Anti-Drug Advocacy', 6, TRUE),
  ('Community Outreach & Social Inclusion', 7, TRUE),
  ('Economic Empowerment & Livelihood', 8, TRUE)
;
INSERT INTO public.required_document_types
  (name, required_year, is_required, sort_order, is_active, template_scope, template_category, scope)
VALUES
  ('Constitution and By-Laws', 2026, TRUE, 1, TRUE, 'document_submission', ARRAY['yorp']::text[], 'both'),
  ('NYC YORP Registration Form (Form B)', 2026, TRUE, 2, TRUE, 'document_submission', ARRAY['yorp']::text[], 'both'),
  ('YORP Directory of Officers and Adviser', 2026, TRUE, 3, TRUE, 'document_submission', ARRAY['yorp']::text[], 'both'),
  ('Pasig City YORP Registration Form (Form A)', 2026, TRUE, 5, TRUE, 'document_submission', ARRAY['yorp']::text[], 'both'),
  ('PCYDO YORP Data Request Form', 2026, FALSE, 6, TRUE, 'document_submission', ARRAY['data_form']::text[], 'registration'),
  ('MOVE Guidelines', 2026, FALSE, 10, TRUE, 'other', ARRAY['move']::text[], 'both'),
  ('MOVE Registration Form', 2026, FALSE, 11, TRUE, 'other', ARRAY['move']::text[], 'both'),
  ('YORP Annual Report Template', 2026, FALSE, 16, TRUE, 'other', ARRAY['yorp']::text[], 'both'),
  ('PCYDO KK Profiling Data Request Form', 2026, FALSE, 17, TRUE, 'other', ARRAY['data_form']::text[], 'both'),
  ('Guidelines for YPOP Program', 2026, FALSE, 18, TRUE, 'other', ARRAY['ypop']::text[], 'both'),
  ('Patnubay para sa Programang YPOP', 2026, FALSE, 19, TRUE, 'other', ARRAY['ypop']::text[], 'both'),
  ('YORP List of Members in Good Standing', 2026, TRUE, 20, TRUE, 'document_submission', ARRAY['yorp']::text[], 'both'),
  ('Endorsement', 2026, TRUE, 21, TRUE, 'document_submission', ARRAY['yorp']::text[], 'both')
;
INSERT INTO public.ypop_periods (semester_key, semester_label, status, org_led_tiers)
VALUES ('STAGING-2026-SAMPLE', 'Synthetic Staging Period 2026', 'draft'::public.ypop_period_status, '[]'::jsonb);

