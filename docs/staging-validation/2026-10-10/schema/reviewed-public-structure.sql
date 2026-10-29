-- Executable structure phase, captured read-only from production (2026-10-10); no row data.
SET search_path = pg_catalog, public, extensions, auth, storage;
CREATE TYPE public."activity_action" AS ENUM ('created_profile', 'updated_profile', 'submitted_documents', 'reviewed_documents', 'submitted_budget_request', 'reviewed_budget_request', 'submitted_liquidation_report', 'reviewed_liquidation_report', 'published_news_release', 'published_transparency_post', 'added_remark', 'resolved_remark');
CREATE TYPE public."app_role_code" AS ENUM ('admin', 'organization_user', 'youth', 'super_admin');
CREATE TYPE public."budget_request_status" AS ENUM ('draft', 'submitted', 'under_review', 'needs_revision', 'approved_for_ftf_green', 'rejected_red', 'hard_copy_submitted', 'budget_released', 'completed', 'awaiting_release');
CREATE TYPE public."compliance_remark_status" AS ENUM ('open', 'resolved');
CREATE TYPE public."document_file_validation_status" AS ENUM ('correct', 'needs_reupload', 'missing', 'mismatch');
CREATE TYPE public."document_submission_status" AS ENUM ('not_started', 'draft', 'uploaded', 'ocr_processing', 'ready_for_review', 'submitted', 'under_admin_review', 'needs_revision', 'approved_green', 'rejected_red');
CREATE TYPE public."inquiry_status" AS ENUM ('pending_review', 'reviewed', 'closed', 'in_review', 'responded', 'resolved');
CREATE TYPE public."liquidation_report_status" AS ENUM ('pending_activity_completion', 'not_started', 'draft', 'submitted', 'under_review', 'needs_revision', 'approved_for_ftf_green', 'rejected_red', 'hard_copy_submitted', 'completed_liquidated', 'overdue');
CREATE TYPE public."move_application_status" AS ENUM ('draft', 'submitted', 'under_review', 'needs_revision', 'approved_for_ftf_green', 'rejected_red', 'completed');
CREATE TYPE public."notification_type" AS ENUM ('document_revision', 'document_green', 'document_red', 'budget_go_signal', 'budget_revision', 'budget_released', 'liquidation_go_signal', 'liquidation_revision', 'overdue', 'completed', 'news_release', 'renewal_window_opened', 'renewal_window_urgent', 'accreditation_expired', 'rejected', 'inquiry_responded', 'inquiry_closed', 'ypop_verified', 'ypop_needs_revision', 'ypop_qualified', 'ypop_not_qualified');
CREATE TYPE public."ocr_status" AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE public."profile_status" AS ENUM ('incomplete', 'pending_review', 'verified', 'needs_update', 'suspended_inactive');
CREATE TYPE public."registration_type" AS ENUM ('new_organization', 'existing_urn');
CREATE TYPE public."renewal_application_status" AS ENUM ('draft', 'submitted', 'under_review', 'needs_revision', 'resubmitted', 'approved', 'rejected');
CREATE TYPE public."urn_review_status" AS ENUM ('not_applicable', 'pending', 'verified', 'needs_correction', 'rejected');
CREATE TYPE public."verification_method" AS ENUM ('documents', 'urn');
CREATE TYPE public."visibility_status" AS ENUM ('draft', 'published', 'hidden');
CREATE TYPE public."ypop_entry_status" AS ENUM ('draft', 'submitted', 'under_review', 'needs_revision', 'qualified', 'not_qualified', 'pending_evaluation');
CREATE TYPE public."ypop_event_participation_status" AS ENUM ('pending_verification', 'verified', 'needs_revision', 'rejected', 'confirmed', 'draft', 'pending_evaluation');
CREATE TYPE public."ypop_org_activity_status" AS ENUM ('draft', 'submitted', 'under_review', 'needs_revision', 'approved', 'rejected', 'pending_evaluation');
CREATE TYPE public."ypop_period_status" AS ENUM ('draft', 'open', 'closed');

CREATE OR REPLACE FUNCTION public.normalize_organization_identity_name(_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO 'pg_catalog'
AS $function$
  select trim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    regexp_replace(lower(normalize(_value, NFKC)), '[^[:alnum:]]+', ' ', 'g'),
    '\morg\M', 'organization', 'g'), '\massoc\M', 'association', 'g'),
    '\minc\M', 'incorporated', 'g'), '\s+', ' ', 'g'));
$function$;

CREATE OR REPLACE FUNCTION public.organization_identity_name_anchor(_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select split_part(public.normalize_organization_identity_name(_value),' ',1) || ' ' ||
    split_part(public.normalize_organization_identity_name(_value),' ',2);
$function$;

CREATE TABLE public."activity_announcements" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "activity_id" uuid NOT NULL,
  "sent_by" uuid,
  "recipient_count" integer DEFAULT 0 NOT NULL,
  "successful_count" integer DEFAULT 0 NOT NULL,
  "failed_count" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "error_message" text,
  "idempotency_key" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "sent_at" timestamp with time zone
);

CREATE TABLE public."activity_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid,
  "organization_id" uuid,
  "action" text NOT NULL,
  "related_type" text NOT NULL,
  "related_id" uuid,
  "description" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE public."admin_accounts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "username" citext NOT NULL,
  "password_hash" text NOT NULL,
  "email" citext NOT NULL,
  "display_name" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "role_id" smallint,
  "unit_id" smallint,
  "is_password_set" boolean DEFAULT true NOT NULL
);

CREATE TABLE public."admin_portal_change_versions" (
  "resource_key" text NOT NULL,
  "version" bigint DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."admin_sessions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "admin_id" uuid NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."admin_system_settings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "setting_key" text NOT NULL,
  "category" text NOT NULL,
  "value_json" jsonb NOT NULL,
  "data_type" text NOT NULL,
  "description" text,
  "is_sensitive" boolean DEFAULT false NOT NULL,
  "is_editable" boolean DEFAULT true NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."admin_template_categories" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "normalized_name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."admin_ypop_deletion_jobs" (
  "id" uuid NOT NULL,
  "admin_id" uuid NOT NULL,
  "period_id" uuid NOT NULL,
  "organization_ids" uuid[] NOT NULL,
  "storage_paths" text[] DEFAULT '{}'::text[] NOT NULL,
  "result" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "cleaned_at" timestamp with time zone,
  "cleanup_error" text
);

CREATE TABLE public."annual_budget_allocations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "fiscal_year" integer NOT NULL,
  "total_amount" numeric(14,2) NOT NULL,
  "statutory_baseline_notes" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."barangays" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."budget_purpose_categories" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."budget_request_files" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "budget_request_id" uuid NOT NULL,
  "file_url" text NOT NULL,
  "file_name" text NOT NULL,
  "file_type" text NOT NULL,
  "file_size" bigint DEFAULT 0 NOT NULL,
  "uploaded_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "admin_status" text DEFAULT 'submitted'::text NOT NULL,
  "admin_remarks" text DEFAULT ''::text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT clock_timestamp()
);

CREATE TABLE public."budget_requests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "submitted_by" uuid NOT NULL,
  "activity_title" text NOT NULL,
  "activity_description" text DEFAULT ''::text NOT NULL,
  "activity_date" date,
  "venue" text NOT NULL,
  "requested_amount" numeric(14,2) DEFAULT 0 NOT NULL,
  "approved_amount" numeric(14,2) DEFAULT 0 NOT NULL,
  "released_amount" numeric(14,2) DEFAULT 0 NOT NULL,
  "release_date" date,
  "purpose_category" text DEFAULT ''::text NOT NULL,
  "status" budget_request_status DEFAULT 'draft'::budget_request_status NOT NULL,
  "remarks" text,
  "go_signal_at" timestamp with time zone,
  "hard_copy_submitted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "admin_remarks" text DEFAULT ''::text NOT NULL,
  "user_note" text DEFAULT ''::text NOT NULL,
  "revision_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "budget_request_type" text DEFAULT 'regular'::text NOT NULL,
  "ypop_entry_id" uuid,
  "fiscal_year" integer,
  "revision_requested_at" timestamp with time zone,
  "revision_due_at" timestamp with time zone,
  "revision_locked_at" timestamp with time zone,
  "revision_locked" boolean DEFAULT false NOT NULL,
  "revision_unlocked_at" timestamp with time zone,
  "revision_unlocked_by" text,
  "is_seeded_sample_data" boolean DEFAULT false NOT NULL,
  "seed_batch" text
);

CREATE TABLE public."compliance_remarks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "related_type" text NOT NULL,
  "related_id" uuid,
  "remark_type" text NOT NULL,
  "consequence_type" text NOT NULL,
  "message" text NOT NULL,
  "status" compliance_remark_status DEFAULT 'open'::compliance_remark_status NOT NULL,
  "created_by" uuid,
  "resolved_by" uuid,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."disclosure_documents" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "doc_code" text NOT NULL,
  "title" text NOT NULL,
  "document_type" text NOT NULL,
  "fiscal_year" integer,
  "quarter" text,
  "published_date" date,
  "public_url" text,
  "storage_path" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."document_submission_files" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "submission_id" uuid NOT NULL,
  "document_type_id" uuid,
  "file_url" text NOT NULL,
  "file_name" text NOT NULL,
  "file_type" text NOT NULL,
  "file_size" bigint DEFAULT 0 NOT NULL,
  "validation_status" document_file_validation_status DEFAULT 'missing'::document_file_validation_status NOT NULL,
  "admin_status" document_submission_status DEFAULT 'draft'::document_submission_status NOT NULL,
  "admin_remarks" text,
  "uploaded_at" timestamp with time zone,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revision_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "revision_requested_at" timestamp with time zone,
  "revision_due_at" timestamp with time zone,
  "revision_locked" boolean DEFAULT false NOT NULL,
  "revision_unlocked_at" timestamp with time zone,
  "revision_unlocked_by" text,
  "is_seeded_sample_data" boolean DEFAULT false NOT NULL,
  "seed_batch" text,
  "revision_locked_at" timestamp with time zone
);

CREATE TABLE public."document_submissions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "submitted_by" uuid NOT NULL,
  "status" document_submission_status DEFAULT 'not_started'::document_submission_status NOT NULL,
  "user_confirmed" boolean DEFAULT false NOT NULL,
  "submitted_at" timestamp with time zone,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "overall_remarks" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "submission_scope" text DEFAULT 'registration'::text NOT NULL,
  "renewal_id" uuid,
  "revision_requested_at" timestamp with time zone,
  "revision_due_at" timestamp with time zone,
  "revision_locked_at" timestamp with time zone,
  "revision_locked" boolean DEFAULT false NOT NULL,
  "revision_unlocked_at" timestamp with time zone,
  "revision_unlocked_by" text,
  "is_seeded_sample_data" boolean DEFAULT false NOT NULL,
  "seed_batch" text
);

CREATE TABLE public."events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "status" text DEFAULT 'upcoming'::text NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."inquiries" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "submitted_by" uuid NOT NULL,
  "submitter_name" text NOT NULL,
  "organization_name" text NOT NULL,
  "email" citext NOT NULL,
  "subject" text NOT NULL,
  "description" text NOT NULL,
  "status" inquiry_status DEFAULT 'pending_review'::inquiry_status NOT NULL,
  "admin_remarks" text DEFAULT ''::text NOT NULL,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."liquidation_report_files" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "liquidation_report_id" uuid NOT NULL,
  "file_url" text NOT NULL,
  "file_name" text NOT NULL,
  "file_type" text NOT NULL,
  "file_size" bigint DEFAULT 0 NOT NULL,
  "uploaded_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "admin_status" text DEFAULT 'submitted'::text NOT NULL,
  "admin_remarks" text DEFAULT ''::text NOT NULL
);

CREATE TABLE public."liquidation_reports" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "budget_request_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "submitted_by" uuid NOT NULL,
  "status" liquidation_report_status DEFAULT 'pending_activity_completion'::liquidation_report_status NOT NULL,
  "remarks" text,
  "go_signal_at" timestamp with time zone,
  "deadline_at" timestamp with time zone,
  "hard_copy_submitted_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revision_requested_at" timestamp with time zone,
  "revision_due_at" timestamp with time zone,
  "revision_locked_at" timestamp with time zone,
  "revision_locked" boolean DEFAULT false NOT NULL,
  "revision_unlocked_at" timestamp with time zone,
  "revision_unlocked_by" text,
  "is_seeded_sample_data" boolean DEFAULT false NOT NULL,
  "seed_batch" text
);

CREATE TABLE public."move_applications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "submitted_by" uuid,
  "program_title" text DEFAULT ''::text NOT NULL,
  "opportunity_type" text DEFAULT 'international_delegation'::text NOT NULL,
  "organizer_name" text DEFAULT ''::text NOT NULL,
  "location" text DEFAULT ''::text NOT NULL,
  "invitation_source" text DEFAULT ''::text NOT NULL,
  "start_date" date,
  "end_date" date,
  "expected_expense_total" numeric(12,2) DEFAULT 0 NOT NULL,
  "approved_assistance_percent" numeric(5,2),
  "status" move_application_status DEFAULT 'draft'::move_application_status NOT NULL,
  "admin_remarks" text DEFAULT ''::text NOT NULL,
  "applicant_note" text DEFAULT ''::text NOT NULL,
  "submitted_at" timestamp with time zone,
  "reviewed_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "revision_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public."move_files" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "requirement_key" text NOT NULL,
  "requirement_phase" text NOT NULL,
  "file_name" text NOT NULL,
  "file_url" text NOT NULL,
  "file_type" text DEFAULT ''::text NOT NULL,
  "file_size" bigint,
  "uploaded_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public."news_categories" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "normalized_name" text NOT NULL,
  "is_system" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."news_releases" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "facebook_post_url" text NOT NULL,
  "date_posted" date NOT NULL,
  "visibility_status" visibility_status DEFAULT 'draft'::visibility_status NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "preview_image_url" text DEFAULT ''::text NOT NULL,
  "category" text
);

CREATE TABLE public."notifications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "organization_id" uuid,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "type" notification_type NOT NULL,
  "related_type" text NOT NULL,
  "related_id" uuid,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."organization_accreditations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "term_number" integer NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "certificate_urn" text DEFAULT ''::text NOT NULL,
  "status" text DEFAULT 'active'::text NOT NULL,
  "is_legacy_inferred" boolean DEFAULT false NOT NULL,
  "approved_by" uuid,
  "approved_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "revoked_at" timestamp with time zone,
  "revocation_reason" text
);

CREATE TABLE public."organization_contacts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "contact_type" text NOT NULL,
  "value" text NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

CREATE TABLE public."organization_profiles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "organization_name" text NOT NULL,
  "organization_email" citext NOT NULL,
  "contact_number" text NOT NULL,
  "barangay" text NOT NULL,
  "organization_type" text,
  "adviser_name" text,
  "representative_name" text,
  "address" text,
  "facebook_page_url" text,
  "profile_status" profile_status DEFAULT 'incomplete'::profile_status NOT NULL,
  "internal_notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "major_classification" text DEFAULT ''::text NOT NULL,
  "sub_classification" text DEFAULT ''::text NOT NULL,
  "advocacies" text[] DEFAULT '{}'::text[] NOT NULL,
  "verified_at" timestamp with time zone,
  "district" text DEFAULT ''::text NOT NULL,
  "yorp_registered_year" smallint,
  "yorp_renewed_year" smallint,
  "is_existing_organization" boolean DEFAULT false NOT NULL,
  "organization_identifier_number" text DEFAULT ''::text NOT NULL,
  "profile_image_url" text,
  "directory_visibility" boolean DEFAULT false NOT NULL,
  "directory_show_representative" boolean DEFAULT false NOT NULL,
  "directory_show_adviser" boolean DEFAULT false NOT NULL,
  "directory_visibility_initialized" boolean DEFAULT true NOT NULL,
  "registration_type" registration_type DEFAULT 'new_organization'::registration_type NOT NULL,
  "urn" text,
  "urn_normalized" text,
  "urn_review_status" urn_review_status DEFAULT 'not_applicable'::urn_review_status NOT NULL,
  "urn_admin_remarks" text,
  "urn_reviewed_by" uuid,
  "urn_reviewed_at" timestamp with time zone,
  "verification_method" verification_method,
  "reference_id" text,
  "current_accreditation_id" uuid,
  "accreditation_start_date" date,
  "accreditation_expires_at" timestamp with time zone,
  "is_renewal_test_account" boolean DEFAULT false NOT NULL,
  "representative_first_name" text,
  "representative_middle_name" text,
  "representative_last_name" text,
  "representative_suffix" text,
  "adviser_first_name" text,
  "adviser_middle_name" text,
  "adviser_last_name" text,
  "adviser_suffix" text,
  "address_unit_building" text,
  "address_street" text,
  "address_subdivision" text,
  "address_barangay" text,
  "address_city" text DEFAULT 'Pasig City'::text,
  "address_province" text DEFAULT 'Metro Manila'::text,
  "address_zip_code" text,
  "additional_emails" text[] DEFAULT '{}'::text[] NOT NULL,
  "additional_contact_numbers" text[] DEFAULT '{}'::text[] NOT NULL,
  "is_seeded_sample_data" boolean DEFAULT false NOT NULL,
  "seed_batch" text,
  "seed_source_year" integer,
  "seed_source_record_number" integer,
  "identity_name_key" text GENERATED ALWAYS AS (normalize_organization_identity_name(organization_name)) STORED,
  "identity_name_anchor" text GENERATED ALWAYS AS (organization_identity_name_anchor(organization_name)) STORED
);

CREATE TABLE public."organization_reference_counters" (
  "year" text NOT NULL,
  "last_value" integer DEFAULT 0 NOT NULL
);

CREATE TABLE public."organization_renewals" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "cycle_number" integer NOT NULL,
  "current_accreditation_id" uuid NOT NULL,
  "status" text DEFAULT 'draft'::text NOT NULL,
  "submitted_at" timestamp with time zone,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "admin_remarks" text,
  "created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  "revision_requested_at" timestamp with time zone,
  "revision_due_at" timestamp with time zone,
  "revision_locked_at" timestamp with time zone,
  "revision_locked" boolean DEFAULT false NOT NULL,
  "revision_unlocked_at" timestamp with time zone,
  "revision_unlocked_by" text,
  "certificate_urn" text
);

CREATE TABLE public."organization_urn_counters" (
  "year" text NOT NULL,
  "last_value" integer DEFAULT 0 NOT NULL
);

CREATE TABLE public."organizations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "focus" text DEFAULT ''::text NOT NULL,
  "status" text DEFAULT 'active'::text NOT NULL,
  "source_post_url" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."policy_versions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "version" text NOT NULL,
  "title" text NOT NULL,
  "terms_content" text NOT NULL,
  "privacy_content" text NOT NULL,
  "is_active" boolean DEFAULT false NOT NULL,
  "effective_date" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."programs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "status" text DEFAULT 'published'::text NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."required_document_types" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "required_year" integer,
  "is_required" boolean DEFAULT true NOT NULL,
  "template_url" text,
  "template_description" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "template_scope" text DEFAULT 'document_submission'::text NOT NULL,
  "template_category" text[],
  "template_file_size" bigint,
  "scope" text DEFAULT 'both'::text NOT NULL
);

CREATE TABLE public."roles" (
  "id" smallint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "code" app_role_code NOT NULL,
  "label" text NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "permission_codes" text[] DEFAULT '{}'::text[] NOT NULL
);

CREATE TABLE public."transparency_posts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "category" text NOT NULL,
  "attachment_url" text,
  "visibility_status" visibility_status DEFAULT 'draft'::visibility_status NOT NULL,
  "post_date" date NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."units" (
  "id" smallint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "code" text NOT NULL,
  "label" text NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."urn_review_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "event_type" text NOT NULL,
  "urn_value" text,
  "actor_id" uuid,
  "previous_status" urn_review_status,
  "new_status" urn_review_status NOT NULL,
  "admin_remarks" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."user_policy_acceptance" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "policy_version_id" uuid NOT NULL,
  "accepted_terms" boolean DEFAULT true NOT NULL,
  "accepted_privacy" boolean DEFAULT true NOT NULL,
  "accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "accepted_ip" text,
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."user_profiles" (
  "user_id" uuid NOT NULL,
  "email" citext NOT NULL,
  "full_name" text,
  "display_name" text,
  "contact_number" text,
  "municipality" text,
  "barangay" text,
  "avatar_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."user_roles" (
  "user_id" uuid NOT NULL,
  "role_id" smallint NOT NULL,
  "assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
  "assigned_by" uuid
);

CREATE TABLE public."yorp_sample_document_assets" (
  "document_type_id" uuid NOT NULL,
  "bucket_id" text DEFAULT 'registration-seed-file'::text NOT NULL,
  "object_name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."ypop_city_activities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "semester_key" text NOT NULL,
  "name" text NOT NULL,
  "date" text,
  "venue" text,
  "points" integer DEFAULT 5 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "start_date" text,
  "end_date" text
);

CREATE TABLE public."ypop_entries" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "submitted_by" uuid,
  "semester" text NOT NULL,
  "semester_label" text NOT NULL,
  "points_earned" integer DEFAULT 0 NOT NULL,
  "points_required" integer DEFAULT 70 NOT NULL,
  "total_points" integer DEFAULT 100 NOT NULL,
  "status" ypop_entry_status DEFAULT 'draft'::ypop_entry_status NOT NULL,
  "admin_remarks" text DEFAULT ''::text NOT NULL,
  "submission_note" text DEFAULT ''::text NOT NULL,
  "validation_deadline" timestamp with time zone,
  "submitted_at" timestamp with time zone,
  "validated_at" timestamp with time zone,
  "revision_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "org_led_project_count" integer DEFAULT 0 NOT NULL,
  "city_led_attendance" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revision_requested_at" timestamp with time zone,
  "revision_due_at" timestamp with time zone,
  "revision_locked_at" timestamp with time zone,
  "revision_locked" boolean DEFAULT false NOT NULL,
  "revision_unlocked_at" timestamp with time zone,
  "revision_unlocked_by" text
);

CREATE TABLE public."ypop_event_files" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "participation_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "file_name" text NOT NULL,
  "file_url" text DEFAULT ''::text NOT NULL,
  "file_type" text DEFAULT ''::text NOT NULL,
  "file_size" bigint,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."ypop_event_participations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "submitted_by" uuid,
  "activity_id" uuid NOT NULL,
  "activity_name" text NOT NULL,
  "activity_date" text,
  "venue" text,
  "status" ypop_event_participation_status DEFAULT 'pending_verification'::ypop_event_participation_status NOT NULL,
  "admin_remarks" text DEFAULT ''::text NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  "proof_submitted_at" timestamp with time zone,
  "verified_at" timestamp with time zone,
  "revision_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revision_requested_at" timestamp with time zone,
  "revision_due_at" timestamp with time zone,
  "revision_locked_at" timestamp with time zone,
  "revision_locked" boolean DEFAULT false NOT NULL,
  "revision_unlocked_at" timestamp with time zone,
  "revision_unlocked_by" text
);

CREATE TABLE public."ypop_files" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ypop_entry_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "file_name" text NOT NULL,
  "file_url" text DEFAULT ''::text NOT NULL,
  "file_type" text DEFAULT ''::text NOT NULL,
  "file_size" bigint,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."ypop_org_activities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ypop_entry_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "submitted_by" uuid,
  "activity_name" text DEFAULT ''::text NOT NULL,
  "activity_date" text DEFAULT ''::text NOT NULL,
  "venue" text DEFAULT ''::text NOT NULL,
  "narrative_report" text DEFAULT ''::text NOT NULL,
  "status" ypop_org_activity_status DEFAULT 'draft'::ypop_org_activity_status NOT NULL,
  "admin_remarks" text DEFAULT ''::text NOT NULL,
  "submitted_at" timestamp with time zone,
  "approved_at" timestamp with time zone,
  "revision_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "revision_requested_at" timestamp with time zone,
  "revision_due_at" timestamp with time zone,
  "revision_locked_at" timestamp with time zone,
  "revision_locked" boolean DEFAULT false NOT NULL,
  "revision_unlocked_at" timestamp with time zone,
  "revision_unlocked_by" text,
  "total_attendees" integer,
  "girls_attendees" integer,
  "boys_attendees" integer
);

CREATE TABLE public."ypop_org_activity_files" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "org_activity_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "file_name" text NOT NULL,
  "file_url" text NOT NULL,
  "file_type" text DEFAULT ''::text NOT NULL,
  "file_size" bigint,
  "uploaded_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public."ypop_periods" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "semester_key" text NOT NULL,
  "semester_label" text NOT NULL,
  "validation_deadline" timestamp with time zone,
  "status" ypop_period_status DEFAULT 'draft'::ypop_period_status NOT NULL,
  "org_led_tiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."ypop_submission_deletion_receipts" (
  "operation_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "semester" text NOT NULL,
  "entry_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "participation_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "org_activity_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "deleted_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."activity_announcements" ADD CONSTRAINT "activity_announcements_idempotency_key_key" UNIQUE (idempotency_key);
ALTER TABLE public."activity_announcements" ADD CONSTRAINT "activity_announcements_pkey" PRIMARY KEY (id);
ALTER TABLE public."activity_logs" ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY (id);
ALTER TABLE public."admin_accounts" ADD CONSTRAINT "admin_accounts_email_key" UNIQUE (email);
ALTER TABLE public."admin_accounts" ADD CONSTRAINT "admin_accounts_pkey" PRIMARY KEY (id);
ALTER TABLE public."admin_accounts" ADD CONSTRAINT "admin_accounts_username_key" UNIQUE (username);
ALTER TABLE public."admin_portal_change_versions" ADD CONSTRAINT "admin_portal_change_versions_pkey" PRIMARY KEY (resource_key);
ALTER TABLE public."admin_sessions" ADD CONSTRAINT "admin_sessions_pkey" PRIMARY KEY (id);
ALTER TABLE public."admin_sessions" ADD CONSTRAINT "admin_sessions_token_hash_key" UNIQUE (token_hash);
ALTER TABLE public."admin_system_settings" ADD CONSTRAINT "admin_system_settings_pkey" PRIMARY KEY (id);
ALTER TABLE public."admin_system_settings" ADD CONSTRAINT "admin_system_settings_setting_key_key" UNIQUE (setting_key);
ALTER TABLE public."admin_template_categories" ADD CONSTRAINT "admin_template_categories_normalized_name_key" UNIQUE (normalized_name);
ALTER TABLE public."admin_template_categories" ADD CONSTRAINT "admin_template_categories_pkey" PRIMARY KEY (id);
ALTER TABLE public."admin_ypop_deletion_jobs" ADD CONSTRAINT "admin_ypop_deletion_jobs_pkey" PRIMARY KEY (id);
ALTER TABLE public."annual_budget_allocations" ADD CONSTRAINT "annual_budget_allocations_fiscal_year_key" UNIQUE (fiscal_year);
ALTER TABLE public."annual_budget_allocations" ADD CONSTRAINT "annual_budget_allocations_pkey" PRIMARY KEY (id);
ALTER TABLE public."barangays" ADD CONSTRAINT "barangays_name_key" UNIQUE (name);
ALTER TABLE public."barangays" ADD CONSTRAINT "barangays_pkey" PRIMARY KEY (id);
ALTER TABLE public."budget_purpose_categories" ADD CONSTRAINT "budget_purpose_categories_name_key" UNIQUE (name);
ALTER TABLE public."budget_purpose_categories" ADD CONSTRAINT "budget_purpose_categories_pkey" PRIMARY KEY (id);
ALTER TABLE public."budget_request_files" ADD CONSTRAINT "budget_request_files_pkey" PRIMARY KEY (id);
ALTER TABLE public."budget_requests" ADD CONSTRAINT "budget_requests_pkey" PRIMARY KEY (id);
ALTER TABLE public."compliance_remarks" ADD CONSTRAINT "compliance_remarks_pkey" PRIMARY KEY (id);
ALTER TABLE public."disclosure_documents" ADD CONSTRAINT "disclosure_documents_doc_code_key" UNIQUE (doc_code);
ALTER TABLE public."disclosure_documents" ADD CONSTRAINT "disclosure_documents_pkey" PRIMARY KEY (id);
ALTER TABLE public."document_submission_files" ADD CONSTRAINT "document_submission_files_pkey" PRIMARY KEY (id);
ALTER TABLE public."document_submission_files" ADD CONSTRAINT "uq_document_submission_file" UNIQUE (submission_id, document_type_id);
ALTER TABLE public."document_submissions" ADD CONSTRAINT "document_submissions_pkey" PRIMARY KEY (id);
ALTER TABLE public."events" ADD CONSTRAINT "events_pkey" PRIMARY KEY (id);
ALTER TABLE public."events" ADD CONSTRAINT "events_slug_key" UNIQUE (slug);
ALTER TABLE public."inquiries" ADD CONSTRAINT "inquiries_pkey" PRIMARY KEY (id);
ALTER TABLE public."liquidation_report_files" ADD CONSTRAINT "liquidation_report_files_pkey" PRIMARY KEY (id);
ALTER TABLE public."liquidation_reports" ADD CONSTRAINT "liquidation_reports_budget_request_id_key" UNIQUE (budget_request_id);
ALTER TABLE public."liquidation_reports" ADD CONSTRAINT "liquidation_reports_pkey" PRIMARY KEY (id);
ALTER TABLE public."move_applications" ADD CONSTRAINT "move_applications_pkey" PRIMARY KEY (id);
ALTER TABLE public."move_files" ADD CONSTRAINT "move_files_pkey" PRIMARY KEY (id);
ALTER TABLE public."news_categories" ADD CONSTRAINT "news_categories_normalized_name_key" UNIQUE (normalized_name);
ALTER TABLE public."news_categories" ADD CONSTRAINT "news_categories_pkey" PRIMARY KEY (id);
ALTER TABLE public."news_releases" ADD CONSTRAINT "news_releases_pkey" PRIMARY KEY (id);
ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY (id);
ALTER TABLE public."organization_accreditations" ADD CONSTRAINT "organization_accreditations_pkey" PRIMARY KEY (id);
ALTER TABLE public."organization_accreditations" ADD CONSTRAINT "uq_organization_term_number" UNIQUE (organization_id, term_number);
ALTER TABLE public."organization_contacts" ADD CONSTRAINT "organization_contacts_pkey" PRIMARY KEY (id);
ALTER TABLE public."organization_profiles" ADD CONSTRAINT "organization_profiles_pkey" PRIMARY KEY (id);
ALTER TABLE public."organization_profiles" ADD CONSTRAINT "organization_profiles_user_id_key" UNIQUE (user_id);
ALTER TABLE public."organization_reference_counters" ADD CONSTRAINT "organization_reference_counters_pkey" PRIMARY KEY (year);
ALTER TABLE public."organization_renewals" ADD CONSTRAINT "organization_renewals_pkey" PRIMARY KEY (id);
ALTER TABLE public."organization_renewals" ADD CONSTRAINT "uq_organization_renewal_cycle" UNIQUE (organization_id, cycle_number);
ALTER TABLE public."organization_urn_counters" ADD CONSTRAINT "organization_urn_counters_pkey" PRIMARY KEY (year);
ALTER TABLE public."organizations" ADD CONSTRAINT "organizations_pkey" PRIMARY KEY (id);
ALTER TABLE public."organizations" ADD CONSTRAINT "organizations_slug_key" UNIQUE (slug);
ALTER TABLE public."policy_versions" ADD CONSTRAINT "policy_versions_pkey" PRIMARY KEY (id);
ALTER TABLE public."policy_versions" ADD CONSTRAINT "policy_versions_version_key" UNIQUE (version);
ALTER TABLE public."programs" ADD CONSTRAINT "programs_pkey" PRIMARY KEY (id);
ALTER TABLE public."programs" ADD CONSTRAINT "programs_slug_key" UNIQUE (slug);
ALTER TABLE public."required_document_types" ADD CONSTRAINT "required_document_types_name_key" UNIQUE (name);
ALTER TABLE public."required_document_types" ADD CONSTRAINT "required_document_types_pkey" PRIMARY KEY (id);
ALTER TABLE public."roles" ADD CONSTRAINT "roles_code_key" UNIQUE (code);
ALTER TABLE public."roles" ADD CONSTRAINT "roles_pkey" PRIMARY KEY (id);
ALTER TABLE public."transparency_posts" ADD CONSTRAINT "transparency_posts_pkey" PRIMARY KEY (id);
ALTER TABLE public."units" ADD CONSTRAINT "units_code_key" UNIQUE (code);
ALTER TABLE public."units" ADD CONSTRAINT "units_pkey" PRIMARY KEY (id);
ALTER TABLE public."urn_review_history" ADD CONSTRAINT "urn_review_history_pkey" PRIMARY KEY (id);
ALTER TABLE public."user_policy_acceptance" ADD CONSTRAINT "uq_user_policy_acceptance" UNIQUE (user_id, policy_version_id);
ALTER TABLE public."user_policy_acceptance" ADD CONSTRAINT "user_policy_acceptance_pkey" PRIMARY KEY (id);
ALTER TABLE public."user_profiles" ADD CONSTRAINT "user_profiles_email_key" UNIQUE (email);
ALTER TABLE public."user_profiles" ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."user_roles" ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY (user_id, role_id);
ALTER TABLE public."yorp_sample_document_assets" ADD CONSTRAINT "yorp_sample_document_assets_bucket_id_object_name_key" UNIQUE (bucket_id, object_name);
ALTER TABLE public."yorp_sample_document_assets" ADD CONSTRAINT "yorp_sample_document_assets_pkey" PRIMARY KEY (document_type_id);
ALTER TABLE public."ypop_city_activities" ADD CONSTRAINT "ypop_city_activities_pkey" PRIMARY KEY (id);
ALTER TABLE public."ypop_entries" ADD CONSTRAINT "ypop_entries_pkey" PRIMARY KEY (id);
ALTER TABLE public."ypop_event_files" ADD CONSTRAINT "ypop_event_files_pkey" PRIMARY KEY (id);
ALTER TABLE public."ypop_event_participations" ADD CONSTRAINT "ypop_event_participations_org_activity_unique" UNIQUE (organization_id, activity_id);
ALTER TABLE public."ypop_event_participations" ADD CONSTRAINT "ypop_event_participations_pkey" PRIMARY KEY (id);
ALTER TABLE public."ypop_files" ADD CONSTRAINT "ypop_files_pkey" PRIMARY KEY (id);
ALTER TABLE public."ypop_org_activities" ADD CONSTRAINT "ypop_org_activities_pkey" PRIMARY KEY (id);
ALTER TABLE public."ypop_org_activity_files" ADD CONSTRAINT "ypop_org_activity_files_pkey" PRIMARY KEY (id);
ALTER TABLE public."ypop_periods" ADD CONSTRAINT "ypop_periods_pkey" PRIMARY KEY (id);
ALTER TABLE public."ypop_periods" ADD CONSTRAINT "ypop_periods_semester_key_key" UNIQUE (semester_key);
ALTER TABLE public."ypop_submission_deletion_receipts" ADD CONSTRAINT "ypop_submission_deletion_receipts_pkey" PRIMARY KEY (operation_id, organization_id);
ALTER TABLE public."activity_announcements" ADD CONSTRAINT "activity_announcements_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'partial_failure'::text, 'failed'::text]));
ALTER TABLE public."admin_portal_change_versions" ADD CONSTRAINT "admin_portal_change_versions_resource_key_check" CHECK (resource_key = ANY (ARRAY['registration'::text, 'renewals'::text, 'budgets'::text, 'liquidations'::text, 'ypop_city_led'::text, 'ypop_org_led'::text]));
ALTER TABLE public."admin_portal_change_versions" ADD CONSTRAINT "admin_portal_change_versions_version_check" CHECK (version >= 0);
ALTER TABLE public."admin_system_settings" ADD CONSTRAINT "admin_system_settings_data_type_check" CHECK (data_type = ANY (ARRAY['string'::text, 'number'::text, 'boolean'::text, 'json'::text, 'array'::text]));
ALTER TABLE public."admin_template_categories" ADD CONSTRAINT "admin_template_categories_normalized_name_check" CHECK (normalized_name <> ''::text AND normalized_name = lower(regexp_replace(btrim(normalized_name), '[[:space:]-]+'::text, '_'::text, 'g'::text)));
ALTER TABLE public."annual_budget_allocations" ADD CONSTRAINT "check_fiscal_year_range" CHECK (fiscal_year >= 2000 AND fiscal_year <= 2100);
ALTER TABLE public."annual_budget_allocations" ADD CONSTRAINT "check_total_amount_nonnegative" CHECK (total_amount >= 0::numeric);
ALTER TABLE public."budget_requests" ADD CONSTRAINT "budget_requests_approved_amount_check" CHECK (approved_amount >= 0::numeric);
ALTER TABLE public."budget_requests" ADD CONSTRAINT "budget_requests_released_amount_check" CHECK (released_amount >= 0::numeric);
ALTER TABLE public."budget_requests" ADD CONSTRAINT "check_budget_requests_fiscal_year" CHECK (fiscal_year IS NULL OR fiscal_year >= 2000 AND fiscal_year <= 2100);
ALTER TABLE public."document_submissions" ADD CONSTRAINT "document_submissions_submission_scope_check" CHECK (submission_scope = ANY (ARRAY['registration'::text, 'renewal'::text]));
ALTER TABLE public."move_files" ADD CONSTRAINT "move_files_requirement_phase_check" CHECK (requirement_phase = ANY (ARRAY['pre_application'::text, 'post_program'::text]));
ALTER TABLE public."organization_accreditations" ADD CONSTRAINT "chk_accreditation_dates" CHECK (end_date > start_date);
ALTER TABLE public."organization_accreditations" ADD CONSTRAINT "chk_accreditation_revocation_consistency" CHECK (status <> 'revoked'::text AND revoked_at IS NULL OR status = 'revoked'::text);
ALTER TABLE public."organization_accreditations" ADD CONSTRAINT "organization_accreditations_status_check" CHECK (status = ANY (ARRAY['active'::text, 'superseded'::text, 'revoked'::text]));
ALTER TABLE public."organization_accreditations" ADD CONSTRAINT "organization_accreditations_term_number_check" CHECK (term_number >= 1);
ALTER TABLE public."organization_contacts" ADD CONSTRAINT "organization_contacts_contact_type_check" CHECK (contact_type = ANY (ARRAY['email'::text, 'phone'::text]));
ALTER TABLE public."organization_contacts" ADD CONSTRAINT "organization_contacts_value_check" CHECK (TRIM(BOTH FROM value) <> ''::text);
ALTER TABLE public."organization_profiles" ADD CONSTRAINT "organization_profiles_contact_number_check" CHECK (contact_number ~ '^09[0-9]{9}$'::text);
ALTER TABLE public."organization_renewals" ADD CONSTRAINT "organization_renewals_cycle_number_check" CHECK (cycle_number >= 2);
ALTER TABLE public."organization_renewals" ADD CONSTRAINT "organization_renewals_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'under_review'::text, 'needs_revision'::text, 'resubmitted'::text, 'approved'::text, 'rejected'::text]));
ALTER TABLE public."required_document_types" ADD CONSTRAINT "required_document_types_scope_check" CHECK (scope = ANY (ARRAY['registration'::text, 'renewal'::text, 'both'::text]));
ALTER TABLE public."required_document_types" ADD CONSTRAINT "required_document_types_template_scope_check" CHECK (template_scope = ANY (ARRAY['document_submission'::text, 'move'::text, 'other'::text]));
ALTER TABLE public."urn_review_history" ADD CONSTRAINT "urn_review_history_event_type_check" CHECK (event_type = ANY (ARRAY['urn_submitted'::text, 'urn_updated'::text, 'urn_marked_needs_correction'::text, 'urn_rejected'::text, 'urn_verified'::text, 'urn_verification_revoked'::text]));
ALTER TABLE public."yorp_sample_document_assets" ADD CONSTRAINT "yorp_sample_document_assets_bucket_id_check" CHECK (bucket_id = 'registration-seed-file'::text);
ALTER TABLE public."ypop_org_activities" ADD CONSTRAINT "chk_ypop_org_activities_attendance" CHECK (total_attendees IS NULL AND girls_attendees IS NULL AND boys_attendees IS NULL OR total_attendees >= 0 AND girls_attendees >= 0 AND boys_attendees >= 0 AND (girls_attendees + boys_attendees) = total_attendees);
ALTER TABLE public."activity_announcements" ADD CONSTRAINT "activity_announcements_activity_id_fkey" FOREIGN KEY (activity_id) REFERENCES ypop_city_activities(id) ON DELETE CASCADE;
ALTER TABLE public."activity_announcements" ADD CONSTRAINT "activity_announcements_sent_by_fkey" FOREIGN KEY (sent_by) REFERENCES admin_accounts(id) ON DELETE SET NULL;
ALTER TABLE public."activity_logs" ADD CONSTRAINT "activity_logs_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES admin_accounts(id) ON DELETE SET NULL;
ALTER TABLE public."activity_logs" ADD CONSTRAINT "activity_logs_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."admin_accounts" ADD CONSTRAINT "admin_accounts_role_id_fkey" FOREIGN KEY (role_id) REFERENCES roles(id);
ALTER TABLE public."admin_accounts" ADD CONSTRAINT "admin_accounts_unit_id_fkey" FOREIGN KEY (unit_id) REFERENCES units(id);
ALTER TABLE public."admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_fkey" FOREIGN KEY (admin_id) REFERENCES admin_accounts(id) ON DELETE CASCADE;
ALTER TABLE public."admin_system_settings" ADD CONSTRAINT "admin_system_settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES admin_accounts(id) ON DELETE SET NULL;
ALTER TABLE public."budget_request_files" ADD CONSTRAINT "budget_request_files_budget_request_id_fkey" FOREIGN KEY (budget_request_id) REFERENCES budget_requests(id) ON DELETE CASCADE;
ALTER TABLE public."budget_requests" ADD CONSTRAINT "budget_requests_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."budget_requests" ADD CONSTRAINT "budget_requests_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."budget_requests" ADD CONSTRAINT "budget_requests_ypop_entry_id_fkey" FOREIGN KEY (ypop_entry_id) REFERENCES ypop_entries(id) ON DELETE SET NULL;
ALTER TABLE public."compliance_remarks" ADD CONSTRAINT "compliance_remarks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."compliance_remarks" ADD CONSTRAINT "compliance_remarks_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."compliance_remarks" ADD CONSTRAINT "compliance_remarks_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."disclosure_documents" ADD CONSTRAINT "disclosure_documents_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."document_submission_files" ADD CONSTRAINT "document_submission_files_document_type_id_fkey" FOREIGN KEY (document_type_id) REFERENCES required_document_types(id) ON DELETE SET NULL;
ALTER TABLE public."document_submission_files" ADD CONSTRAINT "document_submission_files_submission_id_fkey" FOREIGN KEY (submission_id) REFERENCES document_submissions(id) ON DELETE CASCADE;
ALTER TABLE public."document_submissions" ADD CONSTRAINT "document_submissions_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."document_submissions" ADD CONSTRAINT "document_submissions_renewal_id_fkey" FOREIGN KEY (renewal_id) REFERENCES organization_renewals(id) ON DELETE SET NULL;
ALTER TABLE public."document_submissions" ADD CONSTRAINT "document_submissions_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES admin_accounts(id) ON DELETE SET NULL;
ALTER TABLE public."document_submissions" ADD CONSTRAINT "document_submissions_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."inquiries" ADD CONSTRAINT "inquiries_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."inquiries" ADD CONSTRAINT "inquiries_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."liquidation_report_files" ADD CONSTRAINT "liquidation_report_files_liquidation_report_id_fkey" FOREIGN KEY (liquidation_report_id) REFERENCES liquidation_reports(id) ON DELETE CASCADE;
ALTER TABLE public."liquidation_reports" ADD CONSTRAINT "liquidation_reports_budget_request_id_fkey" FOREIGN KEY (budget_request_id) REFERENCES budget_requests(id) ON DELETE CASCADE;
ALTER TABLE public."liquidation_reports" ADD CONSTRAINT "liquidation_reports_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."liquidation_reports" ADD CONSTRAINT "liquidation_reports_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."move_applications" ADD CONSTRAINT "move_applications_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."move_applications" ADD CONSTRAINT "move_applications_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."move_files" ADD CONSTRAINT "move_files_application_id_fkey" FOREIGN KEY (application_id) REFERENCES move_applications(id) ON DELETE CASCADE;
ALTER TABLE public."move_files" ADD CONSTRAINT "move_files_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."news_releases" ADD CONSTRAINT "news_releases_created_by_fkey" FOREIGN KEY (created_by) REFERENCES admin_accounts(id) ON DELETE SET NULL;
ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."organization_accreditations" ADD CONSTRAINT "organization_accreditations_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES admin_accounts(id) ON DELETE SET NULL;
ALTER TABLE public."organization_accreditations" ADD CONSTRAINT "organization_accreditations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."organization_contacts" ADD CONSTRAINT "organization_contacts_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."organization_profiles" ADD CONSTRAINT "organization_profiles_current_accreditation_id_fkey" FOREIGN KEY (current_accreditation_id) REFERENCES organization_accreditations(id) ON DELETE SET NULL;
ALTER TABLE public."organization_profiles" ADD CONSTRAINT "organization_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."organization_renewals" ADD CONSTRAINT "organization_renewals_current_accreditation_id_fkey" FOREIGN KEY (current_accreditation_id) REFERENCES organization_accreditations(id) ON DELETE SET NULL;
ALTER TABLE public."organization_renewals" ADD CONSTRAINT "organization_renewals_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."organization_renewals" ADD CONSTRAINT "organization_renewals_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES admin_accounts(id) ON DELETE SET NULL;
ALTER TABLE public."organizations" ADD CONSTRAINT "organizations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."programs" ADD CONSTRAINT "programs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."transparency_posts" ADD CONSTRAINT "transparency_posts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."urn_review_history" ADD CONSTRAINT "urn_review_history_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."user_policy_acceptance" ADD CONSTRAINT "user_policy_acceptance_policy_version_id_fkey" FOREIGN KEY (policy_version_id) REFERENCES policy_versions(id) ON DELETE RESTRICT;
ALTER TABLE public."user_policy_acceptance" ADD CONSTRAINT "user_policy_acceptance_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."user_roles" ADD CONSTRAINT "user_roles_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;
ALTER TABLE public."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."yorp_sample_document_assets" ADD CONSTRAINT "yorp_sample_document_assets_document_type_id_fkey" FOREIGN KEY (document_type_id) REFERENCES required_document_types(id) ON DELETE CASCADE;
ALTER TABLE public."ypop_city_activities" ADD CONSTRAINT "ypop_city_activities_semester_key_fkey" FOREIGN KEY (semester_key) REFERENCES ypop_periods(semester_key) ON DELETE CASCADE;
ALTER TABLE public."ypop_entries" ADD CONSTRAINT "ypop_entries_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."ypop_entries" ADD CONSTRAINT "ypop_entries_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."ypop_event_files" ADD CONSTRAINT "ypop_event_files_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."ypop_event_files" ADD CONSTRAINT "ypop_event_files_participation_id_fkey" FOREIGN KEY (participation_id) REFERENCES ypop_event_participations(id) ON DELETE CASCADE;
ALTER TABLE public."ypop_event_participations" ADD CONSTRAINT "ypop_event_participations_activity_id_fkey" FOREIGN KEY (activity_id) REFERENCES ypop_city_activities(id) ON DELETE CASCADE;
ALTER TABLE public."ypop_event_participations" ADD CONSTRAINT "ypop_event_participations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."ypop_event_participations" ADD CONSTRAINT "ypop_event_participations_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."ypop_files" ADD CONSTRAINT "ypop_files_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."ypop_files" ADD CONSTRAINT "ypop_files_ypop_entry_id_fkey" FOREIGN KEY (ypop_entry_id) REFERENCES ypop_entries(id) ON DELETE CASCADE;
ALTER TABLE public."ypop_org_activities" ADD CONSTRAINT "ypop_org_activities_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."ypop_org_activities" ADD CONSTRAINT "ypop_org_activities_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public."ypop_org_activities" ADD CONSTRAINT "ypop_org_activities_ypop_entry_id_fkey" FOREIGN KEY (ypop_entry_id) REFERENCES ypop_entries(id) ON DELETE CASCADE;
ALTER TABLE public."ypop_org_activity_files" ADD CONSTRAINT "ypop_org_activity_files_org_activity_id_fkey" FOREIGN KEY (org_activity_id) REFERENCES ypop_org_activities(id) ON DELETE CASCADE;
ALTER TABLE public."ypop_org_activity_files" ADD CONSTRAINT "ypop_org_activity_files_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;
ALTER TABLE public."ypop_submission_deletion_receipts" ADD CONSTRAINT "ypop_submission_deletion_receipts_operation_id_fkey" FOREIGN KEY (operation_id) REFERENCES admin_ypop_deletion_jobs(id);
ALTER TABLE public."ypop_submission_deletion_receipts" ADD CONSTRAINT "ypop_submission_deletion_receipts_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organization_profiles(id) ON DELETE CASCADE;

CREATE INDEX idx_activity_announcements_activity_id ON public.activity_announcements USING btree (activity_id);
CREATE INDEX idx_activity_announcements_idempotency ON public.activity_announcements USING btree (idempotency_key);
CREATE INDEX idx_activity_announcements_status ON public.activity_announcements USING btree (status);
CREATE INDEX idx_activity_logs_created_at_desc ON public.activity_logs USING btree (created_at DESC, id);
CREATE INDEX idx_activity_logs_org ON public.activity_logs USING btree (organization_id, created_at DESC);
CREATE UNIQUE INDEX uq_activity_logs_accreditation_expired ON public.activity_logs USING btree (organization_id, action, related_id) WHERE ((action = 'accreditation_expired'::text) AND (related_type = 'accreditation'::text));
CREATE INDEX idx_admin_accounts_username ON public.admin_accounts USING btree (username);
CREATE INDEX idx_admin_sessions_admin_id ON public.admin_sessions USING btree (admin_id, expires_at DESC);
CREATE INDEX idx_admin_system_settings_category ON public.admin_system_settings USING btree (category);
CREATE INDEX idx_admin_system_settings_key ON public.admin_system_settings USING btree (setting_key);
CREATE INDEX idx_budget_request_files_budget ON public.budget_request_files USING btree (budget_request_id);
CREATE INDEX budget_requests_monitoring_period_idx ON public.budget_requests USING btree (fiscal_year, created_at DESC, id DESC) WHERE (status <> 'draft'::budget_request_status);
CREATE INDEX idx_budget_requests_fiscal_year ON public.budget_requests USING btree (fiscal_year);
CREATE INDEX idx_budget_requests_org ON public.budget_requests USING btree (organization_id, created_at DESC);
CREATE INDEX idx_budget_requests_seeded_sample_data ON public.budget_requests USING btree (is_seeded_sample_data, seed_batch) WHERE (is_seeded_sample_data = true);
CREATE INDEX idx_budget_requests_status ON public.budget_requests USING btree (status);
CREATE INDEX idx_compliance_remarks_org ON public.compliance_remarks USING btree (organization_id, created_at DESC);
CREATE INDEX idx_document_submission_files_submission ON public.document_submission_files USING btree (submission_id);
CREATE INDEX idx_document_submissions_org ON public.document_submissions USING btree (organization_id, created_at DESC);
CREATE INDEX idx_document_submissions_renewal_id ON public.document_submissions USING btree (renewal_id);
CREATE INDEX idx_document_submissions_status ON public.document_submissions USING btree (status);
CREATE UNIQUE INDEX uq_document_submissions_single_renewal ON public.document_submissions USING btree (renewal_id) WHERE (renewal_id IS NOT NULL);
CREATE INDEX idx_inquiries_org ON public.inquiries USING btree (organization_id, created_at DESC);
CREATE INDEX idx_inquiries_status ON public.inquiries USING btree (status, created_at DESC);
CREATE INDEX idx_liquidation_report_files_report ON public.liquidation_report_files USING btree (liquidation_report_id);
CREATE INDEX idx_liquidation_reports_budget ON public.liquidation_reports USING btree (budget_request_id);
CREATE INDEX idx_liquidation_reports_seeded_sample_data ON public.liquidation_reports USING btree (is_seeded_sample_data, seed_batch) WHERE (is_seeded_sample_data = true);
CREATE INDEX idx_liquidation_reports_status ON public.liquidation_reports USING btree (status);
CREATE INDEX liquidation_reports_monitoring_latest_idx ON public.liquidation_reports USING btree (budget_request_id, updated_at DESC, created_at DESC);
CREATE INDEX idx_move_applications_organization_id ON public.move_applications USING btree (organization_id);
CREATE INDEX idx_move_applications_start_date ON public.move_applications USING btree (start_date);
CREATE INDEX idx_move_applications_status ON public.move_applications USING btree (status);
CREATE INDEX idx_move_files_application_id ON public.move_files USING btree (application_id);
CREATE INDEX idx_move_files_organization_id ON public.move_files USING btree (organization_id);
CREATE INDEX idx_news_releases_visibility ON public.news_releases USING btree (visibility_status, date_posted DESC);
CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, is_read, created_at DESC);
CREATE UNIQUE INDEX uq_notifications_time_driven_term ON public.notifications USING btree (organization_id, type, related_id) WHERE (related_type = 'accreditation'::text);
CREATE INDEX idx_accreditations_end_date ON public.organization_accreditations USING btree (end_date);
CREATE INDEX idx_accreditations_org_dates ON public.organization_accreditations USING btree (organization_id, start_date, end_date);
CREATE INDEX idx_accreditations_status ON public.organization_accreditations USING btree (status);
CREATE UNIQUE INDEX idx_org_single_active_accreditation ON public.organization_accreditations USING btree (organization_id) WHERE (status = 'active'::text);
CREATE INDEX idx_organization_contacts_org_order ON public.organization_contacts USING btree (organization_id, contact_type, display_order);
CREATE UNIQUE INDEX uq_org_contacts_email_unique ON public.organization_contacts USING btree (organization_id, lower(TRIM(BOTH FROM value))) WHERE (contact_type = 'email'::text);
CREATE UNIQUE INDEX uq_org_contacts_phone_unique ON public.organization_contacts USING btree (organization_id, regexp_replace(TRIM(BOTH FROM value), '\D'::text, ''::text, 'g'::text)) WHERE (contact_type = 'phone'::text);
CREATE INDEX idx_org_profiles_renewal_test_account ON public.organization_profiles USING btree (is_renewal_test_account) WHERE (is_renewal_test_account = true);
CREATE INDEX idx_org_profiles_seeded_sample_data ON public.organization_profiles USING btree (is_seeded_sample_data, seed_batch) WHERE (is_seeded_sample_data = true);
CREATE INDEX idx_organization_profiles_barangay ON public.organization_profiles USING btree (barangay);
CREATE INDEX idx_organization_profiles_created_at_desc ON public.organization_profiles USING btree (created_at DESC, id);
CREATE INDEX idx_organization_profiles_public_directory ON public.organization_profiles USING btree (organization_name) WHERE ((profile_status = 'verified'::profile_status) AND (directory_visibility = true));
CREATE INDEX idx_organization_profiles_status ON public.organization_profiles USING btree (profile_status);
CREATE INDEX organization_identity_anchor_location_idx ON public.organization_profiles USING btree (identity_name_anchor, barangay);
CREATE INDEX organization_identity_name_idx ON public.organization_profiles USING btree (identity_name_key);
CREATE INDEX organization_identity_name_trgm_idx ON public.organization_profiles USING gin (identity_name_key gin_trgm_ops);
CREATE UNIQUE INDEX organization_profiles_one_verified_urn_idx ON public.organization_profiles USING btree (urn_normalized) WHERE ((urn_review_status = 'verified'::urn_review_status) AND (urn_normalized IS NOT NULL));
CREATE UNIQUE INDEX uq_organization_profiles_reference_id ON public.organization_profiles USING btree (reference_id) WHERE (reference_id IS NOT NULL);
CREATE UNIQUE INDEX uq_organization_profiles_urn_col_normalized ON public.organization_profiles USING btree (upper(TRIM(BOTH FROM urn))) WHERE ((urn IS NOT NULL) AND (TRIM(BOTH FROM urn) <> ''::text));
CREATE UNIQUE INDEX uq_organization_profiles_urn_normalized ON public.organization_profiles USING btree (upper(TRIM(BOTH FROM organization_identifier_number))) WHERE ((organization_identifier_number IS NOT NULL) AND (TRIM(BOTH FROM organization_identifier_number) <> ''::text));
CREATE INDEX idx_renewals_current_accreditation ON public.organization_renewals USING btree (current_accreditation_id);
CREATE INDEX idx_renewals_org_status ON public.organization_renewals USING btree (organization_id, status);
CREATE UNIQUE INDEX idx_single_active_renewal_per_org ON public.organization_renewals USING btree (organization_id) WHERE (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'under_review'::text, 'needs_revision'::text, 'resubmitted'::text]));
CREATE UNIQUE INDEX uq_policy_versions_one_active ON public.policy_versions USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_required_document_types_sort_order ON public.required_document_types USING btree (sort_order);
CREATE INDEX idx_transparency_posts_visibility ON public.transparency_posts USING btree (visibility_status, post_date DESC);
CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);
CREATE INDEX idx_ypop_city_activities_semester_key ON public.ypop_city_activities USING btree (semester_key);
CREATE UNIQUE INDEX idx_ypop_entries_org_semester_unique ON public.ypop_entries USING btree (organization_id, semester);
CREATE INDEX idx_ypop_entries_organization_id ON public.ypop_entries USING btree (organization_id);
CREATE INDEX idx_ypop_entries_semester ON public.ypop_entries USING btree (semester);
CREATE INDEX idx_ypop_event_files_organization_id ON public.ypop_event_files USING btree (organization_id);
CREATE INDEX idx_ypop_event_files_participation_id ON public.ypop_event_files USING btree (participation_id);
CREATE INDEX idx_ypop_event_participations_activity_id ON public.ypop_event_participations USING btree (activity_id);
CREATE INDEX idx_ypop_event_participations_organization_id ON public.ypop_event_participations USING btree (organization_id);
CREATE INDEX idx_ypop_event_participations_status ON public.ypop_event_participations USING btree (status);
CREATE INDEX idx_ypop_files_organization_id ON public.ypop_files USING btree (organization_id);
CREATE INDEX idx_ypop_files_ypop_entry_id ON public.ypop_files USING btree (ypop_entry_id);
CREATE INDEX idx_ypop_org_activities_entry_id ON public.ypop_org_activities USING btree (ypop_entry_id);
CREATE INDEX idx_ypop_org_activities_org_id ON public.ypop_org_activities USING btree (organization_id);
CREATE INDEX idx_ypop_org_activities_status ON public.ypop_org_activities USING btree (status);
CREATE INDEX idx_ypop_org_activity_files_activity_id ON public.ypop_org_activity_files USING btree (org_activity_id);
CREATE INDEX idx_ypop_org_activity_files_org_id ON public.ypop_org_activity_files USING btree (organization_id);

ALTER TABLE public."activity_announcements" OWNER TO postgres;
ALTER TABLE public."activity_logs" OWNER TO postgres;
ALTER TABLE public."admin_accounts" OWNER TO postgres;
ALTER TABLE public."admin_portal_change_versions" OWNER TO postgres;
ALTER TABLE public."admin_sessions" OWNER TO postgres;
ALTER TABLE public."admin_system_settings" OWNER TO postgres;
ALTER TABLE public."admin_template_categories" OWNER TO postgres;
ALTER TABLE public."admin_ypop_deletion_jobs" OWNER TO postgres;
ALTER TABLE public."annual_budget_allocations" OWNER TO postgres;
ALTER TABLE public."barangays" OWNER TO postgres;
ALTER TABLE public."budget_purpose_categories" OWNER TO postgres;
ALTER TABLE public."budget_request_files" OWNER TO postgres;
ALTER TABLE public."budget_requests" OWNER TO postgres;
ALTER TABLE public."compliance_remarks" OWNER TO postgres;
ALTER TABLE public."disclosure_documents" OWNER TO postgres;
ALTER TABLE public."document_submission_files" OWNER TO postgres;
ALTER TABLE public."document_submissions" OWNER TO postgres;
ALTER TABLE public."events" OWNER TO postgres;
ALTER TABLE public."inquiries" OWNER TO postgres;
ALTER TABLE public."liquidation_report_files" OWNER TO postgres;
ALTER TABLE public."liquidation_reports" OWNER TO postgres;
ALTER TABLE public."move_applications" OWNER TO postgres;
ALTER TABLE public."move_files" OWNER TO postgres;
ALTER TABLE public."news_categories" OWNER TO postgres;
ALTER TABLE public."news_releases" OWNER TO postgres;
ALTER TABLE public."notifications" OWNER TO postgres;
ALTER TABLE public."organization_accreditations" OWNER TO postgres;
ALTER TABLE public."organization_contacts" OWNER TO postgres;
ALTER TABLE public."organization_profiles" OWNER TO postgres;
ALTER TABLE public."organization_reference_counters" OWNER TO postgres;
ALTER TABLE public."organization_renewals" OWNER TO postgres;
ALTER TABLE public."organization_urn_counters" OWNER TO postgres;
ALTER TABLE public."organizations" OWNER TO postgres;
ALTER TABLE public."policy_versions" OWNER TO postgres;
ALTER TABLE public."programs" OWNER TO postgres;
ALTER TABLE public."required_document_types" OWNER TO postgres;
ALTER TABLE public."roles" OWNER TO postgres;
ALTER TABLE public."transparency_posts" OWNER TO postgres;
ALTER TABLE public."units" OWNER TO postgres;
ALTER TABLE public."urn_review_history" OWNER TO postgres;
ALTER TABLE public."user_policy_acceptance" OWNER TO postgres;
ALTER TABLE public."user_profiles" OWNER TO postgres;
ALTER TABLE public."user_roles" OWNER TO postgres;
ALTER TABLE public."yorp_sample_document_assets" OWNER TO postgres;
ALTER TABLE public."ypop_city_activities" OWNER TO postgres;
ALTER TABLE public."ypop_entries" OWNER TO postgres;
ALTER TABLE public."ypop_event_files" OWNER TO postgres;
ALTER TABLE public."ypop_event_participations" OWNER TO postgres;
ALTER TABLE public."ypop_files" OWNER TO postgres;
ALTER TABLE public."ypop_org_activities" OWNER TO postgres;
ALTER TABLE public."ypop_org_activity_files" OWNER TO postgres;
ALTER TABLE public."ypop_periods" OWNER TO postgres;
ALTER TABLE public."ypop_submission_deletion_receipts" OWNER TO postgres;
ALTER TYPE public."activity_action" OWNER TO postgres;
ALTER TYPE public."app_role_code" OWNER TO postgres;
ALTER TYPE public."budget_request_status" OWNER TO postgres;
ALTER TYPE public."compliance_remark_status" OWNER TO postgres;
ALTER TYPE public."document_file_validation_status" OWNER TO postgres;
ALTER TYPE public."document_submission_status" OWNER TO postgres;
ALTER TYPE public."inquiry_status" OWNER TO postgres;
ALTER TYPE public."liquidation_report_status" OWNER TO postgres;
ALTER TYPE public."move_application_status" OWNER TO postgres;
ALTER TYPE public."notification_type" OWNER TO postgres;
ALTER TYPE public."ocr_status" OWNER TO postgres;
ALTER TYPE public."profile_status" OWNER TO postgres;
ALTER TYPE public."registration_type" OWNER TO postgres;
ALTER TYPE public."renewal_application_status" OWNER TO postgres;
ALTER TYPE public."urn_review_status" OWNER TO postgres;
ALTER TYPE public."verification_method" OWNER TO postgres;
ALTER TYPE public."visibility_status" OWNER TO postgres;
ALTER TYPE public."ypop_entry_status" OWNER TO postgres;
ALTER TYPE public."ypop_event_participation_status" OWNER TO postgres;
ALTER TYPE public."ypop_org_activity_status" OWNER TO postgres;
ALTER TYPE public."ypop_period_status" OWNER TO postgres;
