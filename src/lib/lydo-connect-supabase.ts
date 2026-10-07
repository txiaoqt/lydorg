import { validateZipCode } from "@/lib/organization-profile-domain";
import type {
  ActivityLog,
  AdminRoleRecord,
  AdministratorRecord,
  BudgetRequest,
  BudgetRequestFile,
  ComplianceRemark,
  DocumentSubmission,
  LiquidationReport,
  LiquidationReportFile,
  LydoSeedState,
  OrganizationPortalDashboardSummary,
  InquiryRecord,
  OrganizationAccreditationRecord,
  OrganizationProfile,
  OrganizationRenewalRecord,
  NewsRelease,
  NotificationRecord,
  SubmissionFile,
  TemplateRecord,
  TransparencyPost,
  YPOPEntry,
  YPOPEventFile,
  YPOPEventParticipation,
  YPOPFile,
  YPOPOrgActivity,
  YPOPOrgActivityFile,
  YPOPPeriod,
  YPOPCityActivity,
  YPOPStatus,
  PublicOrganizationActivity,
  PublicOrganizationDirectoryItem,
  PublicBudgetSource,
  PublicBudgetSnapshotSettings,
  AnnualBudgetAllocation,
  BudgetMonitoringSummary,
  PublicBudgetSummary,
  PublicBudgetBarangayAllocation,
  YorpQuarterlyReport,
  NewsCategoryRecord,
} from "./lydo-connect-data";
import {
  DEFAULT_ORG_LED_TIERS,
  INITIAL_NEWS_CATEGORIES,
  YPOP_SCORE_THRESHOLD,
  buildVerifiedYpopAttendance,
  computeYpopScore,
  createTemplateLocalId,
  deriveTemplateCategory,
  legacyRemovedTemplateNames,
  normalizeInquiryStatus,
  normalizeYpopCityLedPoints,
  otherDocumentTypes,
  requiredDocumentTypes,
  resolveYpopCityLedCategory,
  normalizeTemplateCategoryKey,
  isSystemTemplateCategory,
} from "./lydo-connect-data";
import { readAdminSession } from "./admin-auth";
import { type AuditCategory } from "./admin-system-settings";
import { getAdminAppUrl } from "./auth-redirect";
import { resolveBudgetEligibility, type BudgetEligibility } from "./budget-eligibility";
import { calculateRevisionDeadline, isRevisionExpired, isSubmissionRevisionLocked } from "./revision-deadline";
import { supabase, supabaseUrl } from "./supabase";
import { getPasigDistrictForBarangay } from "./pasig-districts";
import { isCanonicalPurposeCategory } from "./budget-category-colors";
import { isRegistrationRequirementTemplate, isRenewalRequirementTemplate } from "./user-workflow-eligibility";
import { fetchYpopDeletionReceipts } from "./ypop-submission-deletion";
import { queryClient, toQueryError } from "./query-client";

const ORGANIZATION_DOCUMENTS_BUCKET = "organization-documents";
const TEMPLATE_FILES_BUCKET = "template-files";
const BUDGET_REQUEST_FILES_BUCKET = "budget-request-files";
const LIQUIDATION_REPORT_FILES_BUCKET = "liquidation-report-files";
const YPOP_FILES_BUCKET = "ypop-files";
const NEWS_RELEASE_IMAGES_BUCKET = "news-release-images";
const STORAGE_URI_PREFIX = "storage://";
const ORGANIZATION_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

type RequiredDocumentTypeRow = {
  id: string;
  name: string;
  description: string | null;
  template_url: string | null;
  template_description: string | null;
  sort_order: number | null;
  is_required: boolean | null;
  is_active: boolean | null;
  scope?: "registration" | "renewal" | "both" | null;
  template_scope?: "document_submission" | "move" | "other" | null;
  template_category?: string[] | null;
  template_file_size?: number | null;
  updated_at?: string | null;
};

type OrganizationProfileRow = {
  id: string;
  reference_id?: string | null;
  user_id: string;
  organization_name: string;
  organization_email: string;
  additional_emails?: string[] | null;
  contact_number: string;
  additional_contact_numbers?: string[] | null;
  district: string;
  barangay: string;
  is_existing_organization: boolean | null;
  organization_identifier_number: string | null;
  registration_type?: OrganizationProfile["registrationType"] | null;
  urn?: string | null;
  urn_normalized?: string | null;
  urn_review_status?: OrganizationProfile["urnReviewStatus"] | null;
  urn_admin_remarks?: string | null;
  urn_reviewed_by?: string | null;
  urn_reviewed_at?: string | null;
  verification_method?: OrganizationProfile["verificationMethod"] | null;
  major_classification: string | null;
  sub_classification: string | null;
  advocacies: string[] | null;
  representative_first_name?: string | null;
  representative_middle_name?: string | null;
  representative_last_name?: string | null;
  representative_suffix?: string | null;
  adviser_first_name?: string | null;
  adviser_middle_name?: string | null;
  adviser_last_name?: string | null;
  adviser_suffix?: string | null;
  adviser_name: string | null;
  representative_name: string | null;
  address_unit_building?: string | null;
  address_street?: string | null;
  address_subdivision?: string | null;
  address_barangay?: string | null;
  address_city?: string | null;
  address_province?: string | null;
  address_zip_code?: string | null;
  address: string | null;
  facebook_page_url: string | null;
  profile_image_url?: string | null;
  directory_visibility?: boolean | null;
  directory_show_representative?: boolean | null;
  directory_show_adviser?: boolean | null;
  profile_status: OrganizationProfile["profileStatus"];
  verified_at: string | null;
  internal_notes: string | null;
  yorp_registered_year: number | null;
  yorp_renewed_year: number | null;
  current_accreditation_id?: string | null;
  accreditation_start_date?: string | null;
  accreditation_expires_at?: string | null;
  is_renewal_test_account?: boolean | null;
  is_seeded_sample_data?: boolean | null;
  seed_batch?: string | null;
  seed_source_year?: number | null;
  seed_source_record_number?: number | null;
  created_at: string;
  updated_at: string;
};

const ORGANIZATION_PROFILE_COLUMNS = "id,reference_id,user_id,organization_name,organization_email,additional_emails,contact_number,additional_contact_numbers,district,barangay,is_existing_organization,organization_identifier_number,registration_type,urn,urn_normalized,urn_review_status,urn_admin_remarks,urn_reviewed_by,urn_reviewed_at,verification_method,major_classification,sub_classification,advocacies,representative_first_name,representative_middle_name,representative_last_name,representative_suffix,adviser_first_name,adviser_middle_name,adviser_last_name,adviser_suffix,adviser_name,representative_name,address_unit_building,address_street,address_subdivision,address_barangay,address_city,address_province,address_zip_code,address,facebook_page_url,profile_image_url,directory_visibility,directory_show_representative,directory_show_adviser,profile_status,verified_at,internal_notes,yorp_registered_year,yorp_renewed_year,current_accreditation_id,accreditation_start_date,accreditation_expires_at,is_renewal_test_account,created_at,updated_at";
const DOCUMENT_SUBMISSION_COLUMNS = "id,organization_id,submitted_by,status,user_confirmed,submitted_at,reviewed_by,reviewed_at,overall_remarks,submission_scope,renewal_id,revision_requested_at,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at,revision_unlocked_by,created_at,updated_at";
const BUDGET_REQUEST_COLUMNS = "id,organization_id,submitted_by,activity_title,activity_description,activity_date,venue,requested_amount,approved_amount,released_amount,release_date,purpose_category,fiscal_year,status,remarks,admin_remarks,go_signal_at,hard_copy_submitted_at,user_note,revision_requested_at,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at,revision_unlocked_by,revision_history,created_at,updated_at";
const BUDGET_REQUEST_FILE_COLUMNS = "id,budget_request_id,file_url,file_name,file_type,file_size,uploaded_at,created_at,admin_status,admin_remarks";
const LIQUIDATION_REPORT_COLUMNS = "id,budget_request_id,organization_id,submitted_by,status,remarks,go_signal_at,deadline_at,hard_copy_submitted_at,completed_at,revision_requested_at,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at,revision_unlocked_by,created_at,updated_at";
const YPOP_PERIOD_COLUMNS = "id,semester_key,semester_label,validation_deadline,status,org_led_tiers,created_at,updated_at";
const YPOP_ENTRY_COLUMNS = "id,organization_id,submitted_by,semester,semester_label,points_earned,points_required,total_points,status,admin_remarks,submission_note,validation_deadline,submitted_at,validated_at,revision_requested_at,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at,revision_unlocked_by,revision_history,org_led_project_count,city_led_attendance,created_at,updated_at";
const YPOP_EVENT_PARTICIPATION_COLUMNS = "id,organization_id,activity_id,activity_name,activity_date,venue,status,admin_remarks,joined_at,proof_submitted_at,verified_at,revision_requested_at,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at,revision_unlocked_by,revision_history,created_at,updated_at";
const YPOP_ORG_ACTIVITY_COLUMNS = "id,ypop_entry_id,organization_id,submitted_by,activity_name,activity_date,venue,narrative_report,total_attendees,girls_attendees,boys_attendees,status,admin_remarks,submitted_at,approved_at,revision_requested_at,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at,revision_unlocked_by,revision_history,created_at,updated_at";
const INQUIRY_COLUMNS = "id,organization_id,submitted_by,submitter_name,organization_name,email,subject,description,status,admin_remarks,reviewed_at,created_at,updated_at";

export const assertOrganizationNotSuspended = (
  profile?: { profile_status?: string | null; profileStatus?: string | null } | null,
  actionName = "This action",
) => {
  const status = profile?.profile_status ?? profile?.profileStatus;
  if (status === "suspended_inactive") {
    throw new Error(`${actionName} is not permitted because this organization account is permanently suspended.`);
  }
};

type OrganizationAccreditationRow = {
  id: string;
  organization_id: string;
  term_number: number;
  start_date: string;
  end_date: string;
  certificate_urn: string;
  status: "active" | "superseded" | "revoked";
  is_legacy_inferred: boolean;
  approved_by: string | null;
  approved_at: string;
  created_at: string;
  revoked_at?: string | null;
  revocation_reason?: string | null;
};

type OrganizationRenewalRow = {
  id: string;
  organization_id: string;
  cycle_number: number;
  current_accreditation_id: string;
  certificate_urn?: string | null;
  status:
    | "draft"
    | "submitted"
    | "under_review"
    | "needs_revision"
    | "resubmitted"
    | "approved"
    | "rejected";
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_remarks: string | null;
  revision_requested_at?: string | null;
  revision_due_at?: string | null;
  revision_locked?: boolean | null;
  revision_locked_at?: string | null;
  revision_unlocked_at?: string | null;
  revision_unlocked_by?: string | null;
  created_at: string;
  updated_at: string;
};

type DocumentSubmissionRow = {
  id: string;
  organization_id: string;
  submitted_by: string;
  status: LydoSeedState["documentSubmissions"][number]["status"];
  user_confirmed: boolean;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  overall_remarks: string | null;
  submission_scope?: "registration" | "renewal" | null;
  renewal_id?: string | null;
  revision_requested_at?: string | null;
  revision_due_at?: string | null;
  revision_locked?: boolean | null;
  revision_locked_at?: string | null;
  revision_unlocked_at?: string | null;
  revision_unlocked_by?: string | null;
  created_at: string;
  updated_at: string;
};

type DocumentSubmissionFileRow = {
  id: string;
  submission_id: string;
  document_type_id?: string | null;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  validation_status: SubmissionFile["validationStatus"];
  admin_status: SubmissionFile["adminStatus"];
  admin_remarks: string | null;
  revision_history?: SubmissionFile["revisionHistory"] | null;
  uploaded_at: string | null;
  reviewed_at: string | null;
  revision_requested_at?: string | null;
  revision_due_at?: string | null;
  revision_locked?: boolean | null;
  revision_unlocked_at?: string | null;
  revision_unlocked_by?: string | null;
  created_at: string;
  updated_at: string;
  required_document_types?: {
    id?: string | null;
    name?: string | null;
  } | Array<{ id?: string | null; name?: string | null }> | null;
};

type BudgetRequestRow = {
  id: string;
  organization_id: string;
  submitted_by: string;
  activity_title: string;
  activity_description: string | null;
  activity_date: string;
  venue: string;
  requested_amount: number | string;
  approved_amount: number | string;
  released_amount: number | string;
  release_date: string | null;
  purpose_category: string | null;
  fiscal_year?: number | null;
  status: BudgetRequest["status"];
  remarks: string | null;
  admin_remarks: string | null;
  go_signal_at: string | null;
  hard_copy_submitted_at: string | null;
  user_note: string | null;
  revision_requested_at?: string | null;
  revision_due_at?: string | null;
  revision_locked?: boolean | null;
  revision_locked_at?: string | null;
  revision_unlocked_at?: string | null;
  revision_unlocked_by?: string | null;
  revision_history: unknown[] | null;
  is_seeded_sample_data?: boolean | null;
  seed_batch?: string | null;
  seed_source_year?: number | null;
  seed_source_record_number?: number | null;
  public_record_code?: string | null;
  created_at: string;
  updated_at: string;
};

type BudgetRequestFileRow = {
  id: string;
  budget_request_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number | string;
  uploaded_at: string | null;
  created_at: string;
  admin_status: string | null;
  admin_remarks: string | null;
};

type LiquidationReportRow = {
  id: string;
  budget_request_id: string;
  organization_id: string;
  submitted_by: string;
  status: LiquidationReport["status"];
  remarks: string | null;
  go_signal_at: string | null;
  deadline_at: string | null;
  hard_copy_submitted_at: string | null;
  completed_at: string | null;
  revision_requested_at?: string | null;
  revision_due_at?: string | null;
  revision_locked?: boolean | null;
  revision_locked_at?: string | null;
  revision_unlocked_at?: string | null;
  revision_unlocked_by?: string | null;
  is_seeded_sample_data?: boolean | null;
  seed_batch?: string | null;
  seed_source_year?: number | null;
  seed_source_record_number?: number | null;
  public_record_code?: string | null;
  created_at: string;
  updated_at: string;
};

type LiquidationReportFileRow = {
  id: string;
  liquidation_report_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number | string;
  uploaded_at: string | null;
  created_at: string;
  admin_status: string | null;
  admin_remarks: string | null;
};

type NewsReleaseRow = {
  id: string;
  title: string;
  description: string | null;
  facebook_post_url: string;
  preview_image_url: string | null;
  date_posted: string;
  visibility_status: NewsRelease["visibilityStatus"];
  category: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type TransparencyPostRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  attachment_url: string | null;
  visibility_status: TransparencyPost["visibilityStatus"];
  post_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ComplianceRemarkRow = {
  id: string;
  organization_id: string;
  related_type: string;
  related_id: string;
  remark_type: string | null;
  consequence_type: string | null;
  message: string;
  status: string;
  created_by: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type NotificationRow = {
  id: string;
  user_id: string;
  organization_id: string | null;
  title: string;
  message: string;
  type: string;
  related_type: string;
  related_id: string;
  is_read: boolean;
  created_at: string;
};

type ActivityLogRow = {
  id: string;
  actor_user_id: string | null;
  organization_id: string | null;
  action: string;
  related_type: string;
  related_id: string;
  description: string;
  created_at: string;
  organization_name?: string | null;
  metadata?: Record<string, unknown> | null;
};

type YpopPeriodRow = {
  id: string;
  semester_key: string;
  semester_label: string;
  validation_deadline: string | null;
  status: string;
  org_led_tiers: unknown[];
  created_at: string;
  updated_at: string;
};

type YpopCityActivityRow = {
  id: string;
  semester_key: string;
  name: string;
  date: string | null;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  category?: string | null;
  points: number;
  created_at: string;
};

type YpopEntryRow = {
  id: string;
  organization_id: string;
  submitted_by: string | null;
  semester: string;
  semester_label: string;
  points_earned: number;
  points_required: number;
  total_points: number;
  status: string;
  admin_remarks: string;
  submission_note: string;
  validation_deadline: string | null;
  submitted_at: string | null;
  validated_at: string | null;
  revision_requested_at?: string | null;
  revision_due_at?: string | null;
  revision_locked?: boolean | null;
  revision_locked_at?: string | null;
  revision_unlocked_at?: string | null;
  revision_unlocked_by?: string | null;
  revision_history: unknown[];
  org_led_project_count: number;
  city_led_attendance: unknown[];
  created_at: string;
  updated_at: string;
};

type YpopFileRow = {
  id: string;
  ypop_entry_id: string;
  organization_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  uploaded_at: string;
};

type YpopEventParticipationRow = {
  id: string;
  organization_id: string;
  activity_id: string;
  activity_name: string;
  activity_date: string | null;
  venue: string | null;
  status: string;
  admin_remarks: string;
  joined_at: string | null;
  proof_submitted_at: string | null;
  verified_at: string | null;
  revision_requested_at?: string | null;
  revision_due_at?: string | null;
  revision_locked?: boolean | null;
  revision_locked_at?: string | null;
  revision_unlocked_at?: string | null;
  revision_unlocked_by?: string | null;
  revision_history: unknown[];
  created_at: string;
  updated_at: string;
};

type YpopEventFileRow = {
  id: string;
  participation_id: string;
  organization_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  uploaded_at: string;
};

type YpopOrgActivityRow = {
  id: string;
  ypop_entry_id: string;
  organization_id: string;
  submitted_by: string | null;
  activity_name: string;
  activity_date: string | null;
  venue: string | null;
  narrative_report: string | null;
  total_attendees?: number | null;
  girls_attendees?: number | null;
  boys_attendees?: number | null;
  status: string;
  admin_remarks: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  revision_requested_at?: string | null;
  revision_due_at?: string | null;
  revision_locked?: boolean | null;
  revision_locked_at?: string | null;
  revision_unlocked_at?: string | null;
  revision_unlocked_by?: string | null;
  revision_history: unknown[];
  created_at: string;
  updated_at: string;
};

type YpopOrgActivityFileRow = {
  id: string;
  org_activity_id: string;
  organization_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  uploaded_at: string;
};

type InquiryRow = {
  id: string;
  organization_id: string;
  submitted_by: string;
  submitter_name: string;
  organization_name: string;
  email: string;
  subject: string;
  description: string;
  status: string;
  admin_remarks: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type AdminPortalSectionStateData = {
  organization_profiles?: OrganizationProfileRow[];
  document_submissions?: DocumentSubmissionRow[];
  document_submission_files?: DocumentSubmissionFileRow[];
  budget_requests?: BudgetRequestRow[];
  budget_request_files?: BudgetRequestFileRow[];
  liquidation_reports?: LiquidationReportRow[];
  liquidation_report_files?: LiquidationReportFileRow[];
  news_releases?: NewsReleaseRow[];
  news_categories?: NewsCategoryRow[];
  transparency_posts?: TransparencyPostRow[];
  compliance_remarks?: ComplianceRemarkRow[];
  notifications?: NotificationRow[];
  activity_logs?: ActivityLogRow[];
  templates?: RequiredDocumentTypeRow[];
  ypop_periods?: YpopPeriodRow[];
  ypop_city_activities?: YpopCityActivityRow[];
  ypop_entries?: YpopEntryRow[];
  ypop_files?: YpopFileRow[];
  ypop_event_participations?: YpopEventParticipationRow[];
  ypop_event_files?: YpopEventFileRow[];
  ypop_org_activities?: YpopOrgActivityRow[];
  ypop_org_activity_files?: YpopOrgActivityFileRow[];
  inquiries?: InquiryRow[];
};

const normalizeTemplateLookupKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^202[0-9]\s+/, "")
    .replace(/[^a-z0-9]/g, "");

const localDocumentTypes = [...requiredDocumentTypes, ...otherDocumentTypes];
const localDocumentTypeByName = new Map<string, (typeof localDocumentTypes)[number]>();
localDocumentTypes.forEach((docType) => {
  localDocumentTypeByName.set(docType.name, docType);
  localDocumentTypeByName.set(docType.name.replace(/^202[0-9]\s+/, ""), docType);
  localDocumentTypeByName.set(normalizeTemplateLookupKey(docType.name), docType);
  localDocumentTypeByName.set(docType.id, docType);
});
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, "-");

const editableLiquidationStatuses = new Set<LiquidationReport["status"]>([
  "pending_activity_completion",
  "not_started",
  "draft",
  "needs_revision",
  "overdue",
  "rejected_red",
]);

const assertPdfUpload = async (file: File, label: string, maxBytes?: number) => {
  if (file.type !== "application/pdf" || !/\.pdf$/i.test(file.name)) {
    throw new Error(`${label} must be a PDF file.`);
  }
  if (!file.size) throw new Error(`${label} cannot be empty.`);
  if (maxBytes && file.size > maxBytes) {
    throw new Error(`${label} must not exceed ${Math.round(maxBytes / (1024 * 1024))} MB.`);
  }

  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...signature) !== "%PDF-") {
    throw new Error(`${label} does not appear to be a valid PDF.`);
  }
};

const buildStorageUri = (bucket: string, path: string) => `${STORAGE_URI_PREFIX}${bucket}/${path}`;

const parseStorageUri = (value: string) => {
  if (!value.startsWith(STORAGE_URI_PREFIX)) return null;
  const remainder = value.slice(STORAGE_URI_PREFIX.length);
  const separatorIndex = remainder.indexOf("/");
  if (separatorIndex < 0) return null;
  return {
    bucket: remainder.slice(0, separatorIndex),
    path: remainder.slice(separatorIndex + 1),
  };
};

const getFileNameFromReference = (value: string) => {
  const source = parseStorageUri(value)?.path ?? value;
  const segments = source.split("/");
  return segments[segments.length - 1] || "";
};

const normalizeNumeric = (value: number | string | null | undefined) => Number(value ?? 0);

const formatDateOnly = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export const mapOrganizationProfile = (row: OrganizationProfileRow): OrganizationProfile => {
  const addressBarangay = row.address_barangay?.trim() || row.barangay || "";
  const barangay = addressBarangay || row.barangay;
  const district = getPasigDistrictForBarangay(barangay) || row.district;
  return ({
  id: row.id,
  referenceId: row.reference_id ?? "",
  userId: row.user_id,
  organizationName: row.organization_name,
  organizationEmail: row.organization_email,
  additionalEmails: Array.isArray(row.additional_emails) ? row.additional_emails : [],
  contactNumber: row.contact_number,
  additionalContactNumbers: Array.isArray(row.additional_contact_numbers) ? row.additional_contact_numbers : [],
  district,
  barangay,
  isExistingOrganization: Boolean(row.is_existing_organization),
  organizationIdentifierNumber: row.organization_identifier_number ?? "",
  registrationType: row.registration_type ?? (row.is_existing_organization ? "existing_urn" : "new_organization"),
  urn: row.urn ?? row.organization_identifier_number ?? "",
  urnNormalized: row.urn_normalized ?? "",
  urnReviewStatus: row.urn_review_status ?? (row.is_existing_organization ? "pending" : "not_applicable"),
  urnAdminRemarks: row.urn_admin_remarks ?? "",
  urnReviewedBy: row.urn_reviewed_by ?? "",
  urnReviewedAt: row.urn_reviewed_at ?? "",
  verificationMethod: row.verification_method ?? null,
  majorClassification: (row.major_classification ?? "") as OrganizationProfile["majorClassification"],
  subClassification: (row.sub_classification ?? "") as OrganizationProfile["subClassification"],
  advocacies: (row.advocacies ?? []) as OrganizationProfile["advocacies"],
  representativeFirstName: row.representative_first_name ?? "",
  representativeMiddleName: row.representative_middle_name ?? "",
  representativeLastName: row.representative_last_name ?? "",
  representativeSuffix: row.representative_suffix ?? "",
  adviserFirstName: row.adviser_first_name ?? "",
  adviserMiddleName: row.adviser_middle_name ?? "",
  adviserLastName: row.adviser_last_name ?? "",
  adviserSuffix: row.adviser_suffix ?? "",
  adviserName: row.adviser_name ?? "",
  representativeName: row.representative_name ?? "",
  addressUnitBuilding: row.address_unit_building ?? "",
  addressStreet: row.address_street ?? "",
  addressSubdivision: row.address_subdivision ?? "",
  addressBarangay,
  addressCity: row.address_city ?? "Pasig City",
  addressProvince: row.address_province ?? "Metro Manila",
  addressZipCode: row.address_zip_code ?? "",
  address: row.address ?? "",
  facebookPageUrl: row.facebook_page_url ?? "",
  profileImageUrl: row.profile_image_url ?? "",
  directoryVisibility: Boolean(row.directory_visibility),
  directoryShowRepresentative: Boolean(row.directory_show_representative),
  directoryShowAdviser: Boolean(row.directory_show_adviser),
  profileStatus: row.profile_status,
  verifiedAt: row.verified_at ?? "",
  internalNotes: row.internal_notes ?? "",
  yorpRegisteredYear: row.yorp_registered_year ?? null,
  yorpRenewedYear: row.yorp_renewed_year ?? null,
  currentAccreditationId: row.current_accreditation_id ?? null,
  accreditationStartDate: row.accreditation_start_date ?? null,
  accreditationExpiresAt: row.accreditation_expires_at ?? null,
  isRenewalTestAccount: Boolean(row.is_renewal_test_account),
  isSeededSampleData: Boolean(row.is_seeded_sample_data),
  seedBatch: row.seed_batch ?? null,
  seedSourceYear: row.seed_source_year ?? null,
  seedSourceRecordNumber: row.seed_source_record_number ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  });
};

export const mapTemplate = (row: RequiredDocumentTypeRow): TemplateRecord | null => {
  const localDocumentType =
    localDocumentTypeByName.get(row.name) ??
    localDocumentTypeByName.get(row.name.replace(/^202[0-9]\s+/, "")) ??
    localDocumentTypeByName.get(normalizeTemplateLookupKey(row.name)) ??
    localDocumentTypeByName.get(row.id);
  const localId = localDocumentType?.id ?? (row.id || createTemplateLocalId(row.name));

  return {
    id: localId,
    databaseId: row.id,
    name: row.name,
    description: row.description ?? localDocumentType?.description ?? "",
    templateUrl: row.template_url ?? localDocumentType?.templateUrl ?? "",
    sortOrder: row.sort_order ?? localDocumentType?.sortOrder ?? 0,
    isRequired: row.is_required ?? localDocumentType?.isRequired ?? (row.sort_order ? row.sort_order < 10 : true),
    isActive: row.is_active ?? localDocumentType?.isActive ?? true,
    scope: (row.scope ?? localDocumentType?.scope ?? "both") as "registration" | "renewal" | "both",
    templateScope: row.template_scope ?? localDocumentType?.templateScope ?? (row.sort_order && row.sort_order >= 10 ? "other" : "document_submission"),
    templateDescription: row.template_description ?? `Template for ${row.name}.`,
    templateActive: row.is_active ?? true,
    templateFileName: row.template_url ? getFileNameFromReference(row.template_url) : "",
    templateFileUrl: row.template_url ?? "",
    templateFileType: row.template_url?.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf",
    templateUploadedAt: row.updated_at ?? "",
    templateCategories: (() => {
      const raw = row.template_category;
      const list = Array.isArray(raw)
        ? raw
        : typeof raw === "string"
        ? raw.replace(/^\{|\}$/g, "").split(",").map((s) => s.trim().replace(/^"|"$/g, ""))
        : [];
      const cleaned = list.map((category) => category.trim().toLowerCase()).filter(Boolean);
      if (cleaned.length > 0) return cleaned;
      if (localDocumentType?.templateCategories && localDocumentType.templateCategories.length > 0) {
        return localDocumentType.templateCategories;
      }
      return [deriveTemplateCategory(row.name)];
    })(),
    templateFileSize: row.template_file_size ?? null,
  };
};

export const mapDocumentFile = (row: DocumentSubmissionFileRow): SubmissionFile | null => {
  const related = Array.isArray(row.required_document_types) ? row.required_document_types[0] : row.required_document_types;
  const documentName = related?.name ?? "";
  const localDocumentType = localDocumentTypeByName.get(documentName);
  const databaseId = row.document_type_id || related?.id;
  // Canonical persisted database UUID is authoritative whenever available.
  // Falls back to seeded localDocumentType.id or slug only when no database UUID exists (offline/mock).
  const canonicalDocumentTypeId = databaseId || localDocumentType?.id || (documentName ? createTemplateLocalId(documentName) : "");
  if (!canonicalDocumentTypeId) return null;

  return {
    id: row.id,
    submissionId: row.submission_id,
    documentTypeId: canonicalDocumentTypeId,
    documentTypeName: documentName || undefined,
    fileName: row.file_name,
    fileUrl: row.file_url,
    fileType: row.file_type,
    fileSize: row.file_size,
    validationStatus: row.validation_status,
    adminStatus: row.admin_status,
    adminRemarks: row.admin_remarks ?? "",
    revisionHistory: row.revision_history ?? [],
    uploadedAt: row.uploaded_at ?? "",
    reviewedAt: row.reviewed_at ?? "",
    revisionRequestedAt: row.revision_requested_at ?? null,
    revisionDueAt: row.revision_due_at ?? null,
    revisionLocked: Boolean(row.revision_locked),
    revisionUnlockedAt: row.revision_unlocked_at ?? null,
    revisionUnlockedBy: row.revision_unlocked_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const mapBudgetRequest = (row: BudgetRequestRow): BudgetRequest => ({
  id: row.id,
  organizationId: row.organization_id,
  submittedBy: row.submitted_by,
  activityTitle: row.activity_title,
  activityDescription: row.activity_description ?? "",
  activityDate: formatDateOnly(row.activity_date),
  venue: row.venue,
  requestedAmount: normalizeNumeric(row.requested_amount),
  approvedAmount: normalizeNumeric(row.approved_amount),
  releasedAmount: normalizeNumeric(row.released_amount),
  releaseDate: formatDateOnly(row.release_date),
  purposeCategory: row.purpose_category ?? "",
  fiscalYear: row.fiscal_year ?? (row.activity_date ? new Date(row.activity_date).getFullYear() : (row.created_at ? new Date(row.created_at).getFullYear() : 2026)),
  status: row.status,
  remarks: row.remarks ?? "",
  adminRemarks: row.admin_remarks ?? "",
  goSignalAt: row.go_signal_at ?? "",
  hardCopySubmittedAt: row.hard_copy_submitted_at ?? "",
  revisionRequestedAt: row.revision_requested_at ?? null,
  revisionDueAt: row.revision_due_at ?? null,
  revisionLocked: Boolean(row.revision_locked),
  revisionLockedAt: row.revision_locked_at ?? null,
  revisionUnlockedAt: row.revision_unlocked_at ?? null,
  revisionUnlockedBy: row.revision_unlocked_by ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  userNote: row.user_note ?? "",
  revisionHistory: (row.revision_history ?? []) as BudgetRequest["revisionHistory"],
  isSeededSampleData: Boolean(row.is_seeded_sample_data),
  seedBatch: row.seed_batch ?? null,
  seedSourceYear: row.seed_source_year ?? null,
  seedSourceRecordNumber: row.seed_source_record_number ?? null,
  publicRecordCode: row.public_record_code ?? undefined,
});

export const mapDocumentSubmission = (row: DocumentSubmissionRow): DocumentSubmission => ({
  id: row.id,
  organizationId: row.organization_id,
  submittedBy: row.submitted_by,
  status: row.status,
  userConfirmed: row.user_confirmed,
  submissionScope: (row.submission_scope ?? "registration") as "registration" | "renewal",
  renewalId: row.renewal_id ?? null,
  submittedAt: row.submitted_at ?? "",
  reviewedBy: row.reviewed_by ?? "",
  reviewedAt: row.reviewed_at ?? "",
  overallRemarks: row.overall_remarks ?? "",
  revisionRequestedAt: row.revision_requested_at ?? null,
  revisionDueAt: row.revision_due_at ?? null,
  revisionLocked: Boolean(row.revision_locked),
  revisionLockedAt: row.revision_locked_at ?? null,
  revisionUnlockedAt: row.revision_unlocked_at ?? null,
  revisionUnlockedBy: row.revision_unlocked_by ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapBudgetRequestFile = (row: BudgetRequestFileRow): BudgetRequestFile => ({
  id: row.id,
  budgetRequestId: row.budget_request_id,
  fileName: row.file_name,
  fileUrl: row.file_url,
  fileType: row.file_type,
  fileSize: normalizeNumeric(row.file_size),
  uploadedAt: row.uploaded_at ?? "",
  createdAt: row.created_at,
  adminStatus: (row.admin_status ?? "submitted") as BudgetRequestFile["adminStatus"],
  adminRemarks: row.admin_remarks ?? "",
});

const mapLiquidationReport = (row: LiquidationReportRow): LiquidationReport => ({
  id: row.id,
  budgetRequestId: row.budget_request_id,
  organizationId: row.organization_id,
  submittedBy: row.submitted_by,
  status: row.status,
  remarks: row.remarks ?? "",
  goSignalAt: row.go_signal_at ?? "",
  deadlineAt: row.deadline_at ?? "",
  hardCopySubmittedAt: row.hard_copy_submitted_at ?? "",
  completedAt: row.completed_at ?? "",
  revisionRequestedAt: row.revision_requested_at ?? null,
  revisionDueAt: row.revision_due_at ?? null,
  revisionLocked: Boolean(row.revision_locked),
  revisionLockedAt: row.revision_locked_at ?? null,
  revisionUnlockedAt: row.revision_unlocked_at ?? null,
  revisionUnlockedBy: row.revision_unlocked_by ?? null,
  isSeededSampleData: Boolean(row.is_seeded_sample_data),
  seedBatch: row.seed_batch ?? null,
  seedSourceYear: row.seed_source_year ?? null,
  seedSourceRecordNumber: row.seed_source_record_number ?? null,
  publicRecordCode: row.public_record_code ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapLiquidationReportFile = (row: LiquidationReportFileRow): LiquidationReportFile => ({
  id: row.id,
  liquidationReportId: row.liquidation_report_id,
  fileName: row.file_name,
  fileUrl: row.file_url,
  fileType: row.file_type,
  fileSize: normalizeNumeric(row.file_size),
  uploadedAt: row.uploaded_at ?? "",
  createdAt: row.created_at,
  adminStatus: (row.admin_status ?? "submitted") as LiquidationReportFile["adminStatus"],
  adminRemarks: row.admin_remarks ?? "",
});

const mapNewsRelease = (row: NewsReleaseRow): NewsRelease => ({
  id: row.id,
  title: row.title,
  description: row.description ?? "",
  facebookPostUrl: row.facebook_post_url,
  previewImageUrl: row.preview_image_url ?? "",
  datePosted: formatDateOnly(row.date_posted),
  visibilityStatus: row.visibility_status,
  category: row.category ?? null,
  createdBy: row.created_by ?? "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapTransparencyPost = (row: TransparencyPostRow): TransparencyPost => ({
  id: row.id,
  title: row.title,
  description: row.description ?? "",
  category: row.category ?? "",
  attachmentUrl: row.attachment_url ?? "",
  visibilityStatus: row.visibility_status,
  postDate: formatDateOnly(row.post_date),
  createdBy: row.created_by ?? "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapComplianceRemark = (row: ComplianceRemarkRow): ComplianceRemark => ({
  id: row.id,
  organizationId: row.organization_id,
  relatedType: row.related_type,
  relatedId: row.related_id,
  remarkType: row.remark_type ?? "",
  consequenceType: row.consequence_type ?? "",
  message: row.message,
  status: row.status,
  createdBy: row.created_by ?? "",
  resolvedBy: row.resolved_by ?? "",
  resolvedAt: row.resolved_at ?? "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapNotification = (row: NotificationRow): NotificationRecord => ({
  id: row.id,
  userId: row.user_id,
  organizationId: row.organization_id ?? "",
  title: row.title,
  message: row.message,
  type: row.type,
  relatedType: row.related_type,
  relatedId: row.related_id,
  isRead: row.is_read,
  createdAt: row.created_at,
});

export const mapActivityLog = (row: ActivityLogRow): ActivityLog => ({
  id: row.id,
  actorUserId: row.actor_user_id ?? "",
  organizationId: row.organization_id ?? "",
  action: row.action,
  relatedType: row.related_type,
  relatedId: row.related_id,
  description: row.description,
  createdAt: row.created_at,
  organizationName: row.organization_name ?? undefined,
  metadata: (row.metadata as Record<string, unknown>) ?? {},
});

export const mapInquiry = (row: InquiryRow): InquiryRecord => ({
  id: row.id,
  organizationId: row.organization_id,
  submittedBy: row.submitted_by,
  submitterName: row.submitter_name,
  organizationName: row.organization_name,
  email: row.email,
  subject: row.subject,
  description: row.description,
  status: normalizeInquiryStatus(row.status),
  adminRemarks: row.admin_remarks ?? "",
  reviewedAt: row.reviewed_at ?? "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapYpopPeriod = (row: YpopPeriodRow): YPOPPeriod => ({
  id: row.id,
  semesterKey: row.semester_key,
  semesterLabel: row.semester_label,
  validationDeadline: row.validation_deadline ?? "",
  status: row.status as YPOPPeriod["status"],
  orgLedTiers: (row.org_led_tiers ?? []) as YPOPPeriod["orgLedTiers"],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapYpopCityActivity = (row: YpopCityActivityRow): YPOPCityActivity => ({
  id: row.id,
  semesterKey: row.semester_key,
  name: row.name,
  date: row.date ?? row.start_date ?? "",
  startDate: row.start_date ?? "",
  endDate: row.end_date ?? row.start_date ?? "",
  venue: row.venue ?? "",
  category: resolveYpopCityLedCategory(row.category, row.points),
  points: normalizeYpopCityLedPoints(row.points, row.category),
  createdAt: row.created_at,
});

const mapYpopEntry = (row: YpopEntryRow): YPOPEntry => ({
  id: row.id,
  organizationId: row.organization_id,
  submittedBy: row.submitted_by ?? "",
  semester: row.semester,
  semesterLabel: row.semester_label,
  pointsEarned: row.points_earned,
  pointsRequired: row.points_required,
  totalPoints: row.total_points,
  status: row.status as YPOPEntry["status"],
  adminRemarks: row.admin_remarks,
  submissionNote: row.submission_note,
  validationDeadline: row.validation_deadline ?? "",
  submittedAt: row.submitted_at ?? "",
  validatedAt: row.validated_at ?? "",
  revisionRequestedAt: row.revision_requested_at ?? null,
  revisionDueAt: row.revision_due_at ?? null,
  revisionLockedAt: row.revision_locked_at ?? null,
  revisionHistory: (row.revision_history ?? []) as YPOPEntry["revisionHistory"],
  orgLedProjectCount: row.org_led_project_count,
  cityLedAttendance: (row.city_led_attendance ?? []) as YPOPEntry["cityLedAttendance"],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapYpopFile = (row: YpopFileRow): YPOPFile => ({
  id: row.id,
  ypopEntryId: row.ypop_entry_id,
  organizationId: row.organization_id,
  fileName: row.file_name,
  fileUrl: row.file_url,
  fileType: row.file_type,
  uploadedAt: row.uploaded_at,
});

const mapYpopEventParticipation = (row: YpopEventParticipationRow): YPOPEventParticipation => ({
  id: row.id,
  organizationId: row.organization_id,
  activityId: row.activity_id,
  activityName: row.activity_name,
  activityDate: row.activity_date ?? "",
  venue: row.venue ?? "",
  status: row.status as YPOPEventParticipation["status"],
  adminRemarks: row.admin_remarks,
  joinedAt: row.joined_at ?? "",
  proofSubmittedAt: row.proof_submitted_at ?? "",
  verifiedAt: row.verified_at ?? "",
  revisionRequestedAt: row.revision_requested_at ?? null,
  revisionDueAt: row.revision_due_at ?? null,
  revisionLocked: Boolean(row.revision_locked),
  revisionLockedAt: row.revision_locked_at ?? null,
  revisionUnlockedAt: row.revision_unlocked_at ?? null,
  revisionUnlockedBy: row.revision_unlocked_by ?? null,
  revisionHistory: (row.revision_history ?? []) as YPOPEventParticipation["revisionHistory"],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapYpopEventFile = (row: YpopEventFileRow): YPOPEventFile => ({
  id: row.id,
  participationId: row.participation_id,
  organizationId: row.organization_id,
  fileName: row.file_name,
  fileUrl: row.file_url,
  fileType: row.file_type,
  uploadedAt: row.uploaded_at,
});

const mapYpopOrgActivity = (row: YpopOrgActivityRow): YPOPOrgActivity => ({
  id: row.id,
  ypopEntryId: row.ypop_entry_id,
  organizationId: row.organization_id,
  submittedBy: row.submitted_by ?? "",
  activityName: row.activity_name,
  activityDate: row.activity_date ?? "",
  venue: row.venue ?? "",
  narrativeReport: row.narrative_report ?? "",
  totalAttendees: row.total_attendees !== null && row.total_attendees !== undefined ? Number(row.total_attendees) : null,
  girlsAttendees: row.girls_attendees !== null && row.girls_attendees !== undefined ? Number(row.girls_attendees) : null,
  boysAttendees: row.boys_attendees !== null && row.boys_attendees !== undefined ? Number(row.boys_attendees) : null,
  status: row.status as YPOPOrgActivity["status"],
  adminRemarks: row.admin_remarks ?? "",
  submittedAt: row.submitted_at ?? "",
  approvedAt: row.approved_at ?? "",
  revisionRequestedAt: row.revision_requested_at ?? null,
  revisionDueAt: row.revision_due_at ?? null,
  revisionLocked: Boolean(row.revision_locked),
  revisionLockedAt: row.revision_locked_at ?? null,
  revisionUnlockedAt: row.revision_unlocked_at ?? null,
  revisionUnlockedBy: row.revision_unlocked_by ?? null,
  revisionHistory: (row.revision_history ?? []) as YPOPOrgActivity["revisionHistory"],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapYpopOrgActivityFile = (row: YpopOrgActivityFileRow): YPOPOrgActivityFile => ({
  id: row.id,
  orgActivityId: row.org_activity_id,
  organizationId: row.organization_id,
  fileName: row.file_name,
  fileUrl: row.file_url,
  fileType: row.file_type,
  uploadedAt: row.uploaded_at,
});

const fetchOrganizationProfile = async (userId: string) => {
  const { data, error } = await supabase!
    .from("organization_profiles")
    .select(ORGANIZATION_PROFILE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as OrganizationProfileRow | null) ?? null;
};

export const fetchOrganizationProfileInSupabase = async (userId: string): Promise<OrganizationProfile | null> => {
  if (!supabase) return null;
  const row = await fetchOrganizationProfile(userId);
  if (!row) return null;
  return mapOrganizationProfile(row);
};

/** Minimal authenticated bootstrap. Feature records are loaded by their active screen. */
export const loadOrganizationBootstrapState = async (userId: string): Promise<Partial<LydoSeedState> | null> => {
  if (!supabase || !userId) return null;
  const profile = await fetchOrganizationProfileInSupabase(userId);
  return { organizationProfiles: profile ? [profile] : [] };
};

const fetchLatestSubmission = async (organizationId: string) => {
  const { data, error } = await supabase!
    .from("document_submissions")
    .select("id,organization_id,submitted_by,status,user_confirmed,submitted_at,reviewed_by,reviewed_at,overall_remarks,submission_scope,renewal_id,revision_requested_at,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at,revision_unlocked_by,created_at,updated_at")
    .eq("organization_id", organizationId)
    .eq("submission_scope", "registration")
    .is("renewal_id", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  return ((data as DocumentSubmissionRow[] | null) ?? [])[0] ?? null;
};

const fetchBudgetRequests = async (organizationId: string, limit = 100) => {
  const { data, error } = await supabase!
    .from("budget_requests")
    .select("id,organization_id,submitted_by,activity_title,activity_description,activity_date,venue,requested_amount,approved_amount,released_amount,release_date,purpose_category,fiscal_year,status,remarks,admin_remarks,go_signal_at,hard_copy_submitted_at,user_note,revision_requested_at,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at,revision_unlocked_by,revision_history,created_at,updated_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as BudgetRequestRow[] | null) ?? [];
};

const fetchBudgetRequestFiles = async (budgetRequestIds: string[]) => {
  if (!budgetRequestIds.length) return [];
  const { data, error } = await supabase!
    .from("budget_request_files")
    .select("id,budget_request_id,file_url,file_name,file_type,file_size,uploaded_at,created_at,admin_status,admin_remarks")
    .in("budget_request_id", budgetRequestIds)
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) throw new Error(error.message);
  return (data as BudgetRequestFileRow[] | null) ?? [];
};

const fetchLiquidationReports = async (organizationId: string, limit = 100) => {
  const { data, error } = await supabase!
    .from("liquidation_reports")
    .select("id,budget_request_id,organization_id,submitted_by,status,remarks,go_signal_at,deadline_at,hard_copy_submitted_at,completed_at,revision_requested_at,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at,revision_unlocked_by,created_at,updated_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as LiquidationReportRow[] | null) ?? [];
};

const fetchLiquidationReportFiles = async (liquidationReportIds: string[]) => {
  if (!liquidationReportIds.length) return [];
  const { data, error } = await supabase!
    .from("liquidation_report_files")
    .select("id,liquidation_report_id,file_url,file_name,file_type,file_size,uploaded_at,created_at,admin_status,admin_remarks")
    .in("liquidation_report_id", liquidationReportIds)
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) throw new Error(error.message);
  return (data as LiquidationReportFileRow[] | null) ?? [];
};

type AdminTemplateCategoryRow = {
  normalized_name: string;
};

const normalizeOrganizationPage = (options: import("./lydo-connect-data").OrganizationPortalPageOptions = {}) => {
  const pageSize = Math.min(50, Math.max(1, Math.floor(options.pageSize ?? 25)));
  const page = Math.max(1, Math.floor(options.page ?? 1));
  return { page, pageSize, offset: (page - 1) * pageSize };
};

export const invalidateOrganizationPortalHistoryCaches = async (
  organizationId: string,
  userId?: string,
  resources: Array<"budgets" | "liquidations" | "inquiries" | "activity" | "summary" | "notifications"> = ["budgets", "liquidations", "inquiries", "activity", "summary", "notifications"],
) => {
  const invalidations: Promise<void>[] = [];
  if (organizationId && resources.includes("budgets")) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "budget-page"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "budget-page-view"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "budget-page-pwa"] }).then(() => undefined),
    );
  }
  if (organizationId && resources.includes("liquidations")) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-page"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-page-view"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-page-pwa"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-page-files"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-page-files-view"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-detail"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-detail-view"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-files"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-files-view"] }).then(() => undefined),
    );
  }
  if (organizationId && resources.includes("inquiries")) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "inquiry-page"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "inquiry-page-pwa"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "inquiry-page-modal"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "inquiry-page-dashboard"] }).then(() => undefined),
    );
  }
  if (organizationId && resources.includes("activity")) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "activity-page"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "activity-page-pwa"] }).then(() => undefined),
    );
  }
  if (organizationId && resources.includes("summary")) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "dashboard-summary"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "dashboard-summary-view"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "dashboard-summary-liquidation-view"] }).then(() => undefined),
    );
  }
  if (userId && resources.includes("notifications")) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ["user", userId, "notification-page"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", userId, "notification-page-view"] }).then(() => undefined),
      queryClient.invalidateQueries({ queryKey: ["user", userId, "notification-page-pwa"] }).then(() => undefined),
    );
  }
  await Promise.all(invalidations);
};

const escapePostgrestSearch = (value: string) => value
  .replace(/\\/g, "\\\\")
  .replace(/[%_]/g, "\\$&")
  .replace(/[(),]/g, "\\$&");

export const loadOrganizationBudgetRequestPage = async (
  organizationId: string,
  options: import("./lydo-connect-data").OrganizationPortalPageOptions = {},
): Promise<import("./lydo-connect-data").OrganizationPortalPage<BudgetRequest>> => {
  const { page, pageSize, offset } = normalizeOrganizationPage(options);
  if (!supabase || !organizationId) return { rows: [], totalCount: 0, page, pageSize, totalPages: 0 };
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "budget-page", page, pageSize, options.search?.trim() ?? "", options.statuses ?? [], options.sortBy ?? "created_at", options.sortDirection ?? "desc"],
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase!.from("budget_requests").select("id,organization_id,submitted_by,activity_title,activity_description,activity_date,venue,requested_amount,approved_amount,released_amount,release_date,purpose_category,fiscal_year,status,remarks,admin_remarks,go_signal_at,hard_copy_submitted_at,user_note,revision_requested_at,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at,revision_unlocked_by,revision_history,created_at,updated_at", { count: "exact" })
        .eq("organization_id", organizationId);
      if (options.statuses?.length) query = query.in("status", options.statuses);
      const search = options.search?.trim();
      if (search) {
        const term = escapePostgrestSearch(search);
        query = query.or(`activity_title.ilike.%${term}%,purpose_category.ilike.%${term}%,venue.ilike.%${term}%,id.ilike.%${term}%`);
      }
      const sortColumn = options.sortBy === "requested_amount" ? "requested_amount" : options.sortBy === "updated_at" ? "updated_at" : "created_at";
      const { data, error, count } = await query.order(sortColumn, { ascending: options.sortDirection === "asc" })
        .order("id", { ascending: options.sortDirection === "asc" }).range(offset, offset + pageSize - 1);
      if (error) throw toQueryError(error);
      const totalCount = count ?? 0;
      return { rows: ((data as BudgetRequestRow[] | null) ?? []).map(mapBudgetRequest), totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) };
    },
  });
};

export const loadOrganizationBudgetRequestFiles = async (organizationId: string, budgetRequestId: string): Promise<BudgetRequestFile[]> => {
  if (!supabase || !organizationId || !budgetRequestId) return [];
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "budget-files", budgetRequestId],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase!.from("budget_request_files")
        .select("id,budget_request_id,file_url,file_name,file_type,file_size,uploaded_at,created_at,admin_status,admin_remarks")
        .eq("budget_request_id", budgetRequestId).order("created_at", { ascending: false });
      if (error) throw toQueryError(error);
      return ((data as BudgetRequestFileRow[] | null) ?? []).map(mapBudgetRequestFile);
    },
  });
};

/** Loads attachment metadata only for the currently visible, bounded budget-request page. */
export const loadOrganizationBudgetRequestFilesForPage = async (
  organizationId: string,
  budgetRequestIds: string[],
): Promise<BudgetRequestFile[]> => {
  const ids = [...new Set(budgetRequestIds.filter(Boolean))].slice(0, 50).sort();
  if (!supabase || !organizationId || ids.length === 0) return [];
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "budget-page-files", ids],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase!.from("budget_request_files")
        .select("id,budget_request_id,file_url,file_name,file_type,file_size,uploaded_at,created_at,admin_status,admin_remarks")
        .in("budget_request_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw toQueryError(error);
      return ((data as BudgetRequestFileRow[] | null) ?? []).map(mapBudgetRequestFile);
    },
  });
};

export const loadOrganizationBudgetRequestById = async (organizationId: string, budgetRequestId: string): Promise<BudgetRequest | null> => {
  if (!supabase || !organizationId || !budgetRequestId) return null;
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "budget-detail", budgetRequestId],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase!.from("budget_requests")
        .select("id,organization_id,submitted_by,activity_title,activity_description,activity_date,venue,requested_amount,approved_amount,released_amount,release_date,purpose_category,fiscal_year,status,remarks,admin_remarks,go_signal_at,hard_copy_submitted_at,user_note,revision_requested_at,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at,revision_unlocked_by,revision_history,created_at,updated_at")
        .eq("organization_id", organizationId).eq("id", budgetRequestId).maybeSingle();
      if (error) throw toQueryError(error);
      return data ? mapBudgetRequest(data as BudgetRequestRow) : null;
    },
  });
};

export const loadOrganizationLiquidationReportPage = async (
  organizationId: string,
  options: import("./lydo-connect-data").OrganizationPortalPageOptions = {},
): Promise<import("./lydo-connect-data").OrganizationPortalPage<LiquidationReport>> => {
  const { page, pageSize, offset } = normalizeOrganizationPage(options);
  if (!supabase || !organizationId) return { rows: [], totalCount: 0, page, pageSize, totalPages: 0 };
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "liquidation-page", page, pageSize, options.search?.trim() ?? "", options.statuses ?? [], options.sortBy ?? "created_at", options.sortDirection ?? "desc"],
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase!.from("liquidation_reports")
        .select("id,budget_request_id,organization_id,submitted_by,status,remarks,go_signal_at,deadline_at,hard_copy_submitted_at,completed_at,revision_requested_at,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at,revision_unlocked_by,created_at,updated_at,budget_requests!inner(id,activity_title,purpose_category,venue,released_amount,approved_amount)", { count: "exact" })
        .eq("organization_id", organizationId);
      if (options.statuses?.length) query = query.in("status", options.statuses);
      const search = options.search?.trim();
      if (search) {
        const term = escapePostgrestSearch(search);
        query = query.or(`activity_title.ilike.%${term}%,purpose_category.ilike.%${term}%,venue.ilike.%${term}%`, { referencedTable: "budget_requests" });
      }
      const sortColumn = options.sortBy === "deadline_at" ? "deadline_at" : "created_at";
      const { data, error, count } = await query.order(sortColumn, { ascending: options.sortDirection === "asc" })
        .order("id", { ascending: options.sortDirection === "asc" }).range(offset, offset + pageSize - 1);
      if (error) throw toQueryError(error);
      const totalCount = count ?? 0;
      const rows = ((data as unknown as (LiquidationReportRow & { budget_requests?: { id: string; activity_title: string | null; purpose_category: string | null; venue: string | null; released_amount: number | string | null; approved_amount: number | string | null } | Array<{ id: string; activity_title: string | null; purpose_category: string | null; venue: string | null; released_amount: number | string | null; approved_amount: number | string | null }> | null })[] | null) ?? [])
        .map((row) => {
          const relation = Array.isArray(row.budget_requests) ? row.budget_requests[0] : row.budget_requests;
          return {
          ...mapLiquidationReport(row),
          relatedBudget: relation ? {
            id: relation.id,
            activityTitle: relation.activity_title ?? "",
            purposeCategory: relation.purpose_category ?? "",
            venue: relation.venue ?? "",
            releasedAmount: normalizeNumeric(relation.released_amount),
            approvedAmount: normalizeNumeric(relation.approved_amount),
          } : null,
        };
        });
      return { rows, totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) };
    },
  });
};

export const loadOrganizationLiquidationReportFiles = async (organizationId: string, reportId: string): Promise<LiquidationReportFile[]> => {
  if (!supabase || !organizationId || !reportId) return [];
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "liquidation-files", reportId],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase!.from("liquidation_report_files")
        .select("id,liquidation_report_id,file_url,file_name,file_type,file_size,uploaded_at,created_at,admin_status,admin_remarks")
        .eq("liquidation_report_id", reportId).order("created_at", { ascending: false });
      if (error) throw toQueryError(error);
      return ((data as LiquidationReportFileRow[] | null) ?? []).map(mapLiquidationReportFile);
    },
  });
};

/** Loads attachment metadata only for the currently visible, bounded liquidation-report page. */
export const loadOrganizationLiquidationReportFilesForPage = async (
  organizationId: string,
  reportIds: string[],
): Promise<LiquidationReportFile[]> => {
  const ids = [...new Set(reportIds.filter(Boolean))].slice(0, 50).sort();
  if (!supabase || !organizationId || ids.length === 0) return [];
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "liquidation-page-files", ids],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase!.from("liquidation_report_files")
        .select("id,liquidation_report_id,file_url,file_name,file_type,file_size,uploaded_at,created_at,admin_status,admin_remarks")
        .in("liquidation_report_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw toQueryError(error);
      return ((data as LiquidationReportFileRow[] | null) ?? []).map(mapLiquidationReportFile);
    },
  });
};

export const loadOrganizationLiquidationReportById = async (organizationId: string, reportId: string): Promise<LiquidationReport | null> => {
  if (!supabase || !organizationId || !reportId) return null;
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "liquidation-detail", reportId],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase!.from("liquidation_reports")
        .select("id,budget_request_id,organization_id,submitted_by,status,remarks,go_signal_at,deadline_at,hard_copy_submitted_at,completed_at,revision_requested_at,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at,revision_unlocked_by,created_at,updated_at,budget_requests!inner(id,activity_title,purpose_category,venue,released_amount,approved_amount)")
        .eq("organization_id", organizationId).eq("id", reportId).maybeSingle();
      if (error) throw toQueryError(error);
      if (!data) return null;
      const row = data as unknown as LiquidationReportRow & { budget_requests?: { id: string; activity_title: string | null; purpose_category: string | null; venue: string | null; released_amount: number | string | null; approved_amount: number | string | null } | Array<{ id: string; activity_title: string | null; purpose_category: string | null; venue: string | null; released_amount: number | string | null; approved_amount: number | string | null }> | null };
      const relation = Array.isArray(row.budget_requests) ? row.budget_requests[0] : row.budget_requests;
      return {
        ...mapLiquidationReport(row),
        relatedBudget: relation ? {
          id: relation.id,
          activityTitle: relation.activity_title ?? "",
          purposeCategory: relation.purpose_category ?? "",
          venue: relation.venue ?? "",
          releasedAmount: normalizeNumeric(relation.released_amount),
          approvedAmount: normalizeNumeric(relation.approved_amount),
        } : null,
      };
    },
  });
};

export const loadOrganizationInquiryPage = async (
  organizationId: string,
  options: import("./lydo-connect-data").OrganizationPortalPageOptions = {},
) => {
  const { page, pageSize, offset } = normalizeOrganizationPage(options);
  if (!supabase || !organizationId) return { rows: [] as InquiryRecord[], totalCount: 0, page, pageSize, totalPages: 0 };
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "inquiry-page", page, pageSize, options.search?.trim() ?? "", options.statuses ?? []],
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase!.from("inquiries").select("id,organization_id,submitted_by,submitter_name,organization_name,email,subject,description,status,admin_remarks,reviewed_at,created_at,updated_at", { count: "exact" }).eq("organization_id", organizationId);
      if (options.statuses?.length) query = query.in("status", options.statuses);
      if (options.search?.trim()) {
        const term = escapePostgrestSearch(options.search.trim());
        query = query.or(`subject.ilike.%${term}%,description.ilike.%${term}%`);
      }
      const { data, error, count } = await query.order("created_at", { ascending: options.sortDirection === "asc" }).order("id", { ascending: false }).range(offset, offset + pageSize - 1);
      if (error) throw toQueryError(error);
      const totalCount = count ?? 0;
      return { rows: ((data as InquiryRow[] | null) ?? []).map(mapInquiry), totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) };
    },
  });
};

export const loadOrganizationActivityPage = async (
  organizationId: string,
  options: import("./lydo-connect-data").OrganizationPortalPageOptions & { relatedType?: string } = {},
) => {
  const { page, pageSize, offset } = normalizeOrganizationPage(options);
  if (!supabase || !organizationId) return { rows: [] as ActivityLog[], totalCount: 0, page, pageSize, totalPages: 0 };
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "activity-page", options.relatedType ?? "all", page, pageSize, options.search?.trim() ?? ""],
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase!.from("activity_logs").select("id,actor_user_id,organization_id,action,related_type,related_id,description,created_at", { count: "exact" }).eq("organization_id", organizationId);
      query = query.neq("action", "admin_notification_dispatched");
      if (options.relatedType) query = query.eq("related_type", options.relatedType);
      if (options.search?.trim()) {
        const term = escapePostgrestSearch(options.search.trim());
        query = query.or(`action.ilike.%${term}%,description.ilike.%${term}%,related_type.ilike.%${term}%`);
      }
      const { data, error, count } = await query.order("created_at", { ascending: options.sortDirection === "asc" }).order("id", { ascending: false }).range(offset, offset + pageSize - 1);
      if (error) throw toQueryError(error);
      const totalCount = count ?? 0;
      return { rows: ((data as ActivityLogRow[] | null) ?? []).map(mapActivityLog), totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) };
    },
  });
};

export const loadOrganizationNotificationPage = async (
  userId: string,
  options: import("./lydo-connect-data").OrganizationPortalPageOptions & { readState?: "all" | "unread" | "read" } = {},
) => {
  const { page, pageSize, offset } = normalizeOrganizationPage(options);
  if (!supabase || !userId) return { rows: [] as NotificationRecord[], totalCount: 0, page, pageSize, totalPages: 0 };
  return queryClient.fetchQuery({
    queryKey: ["user", userId, "notification-page", page, pageSize, options.search?.trim() ?? "", options.readState ?? "all"],
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase!.from("notifications").select("id,user_id,organization_id,title,message,type,related_type,related_id,is_read,created_at", { count: "exact" }).eq("user_id", userId);
      if (options.readState === "read") query = query.eq("is_read", true);
      if (options.readState === "unread") query = query.eq("is_read", false);
      if (options.search?.trim()) {
        const term = escapePostgrestSearch(options.search.trim());
        query = query.or(`title.ilike.%${term}%,message.ilike.%${term}%`);
      }
      const { data, error, count } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + pageSize - 1);
      if (error) throw toQueryError(error);
      const totalCount = count ?? 0;
      return { rows: ((data as NotificationRow[] | null) ?? []).map(mapNotification), totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) };
    },
  });
};

const fetchNewsReleases = async () => {
  const { data, error } = await supabase!
    .from("news_releases")
    .select("id,title,description,facebook_post_url,preview_image_url,date_posted,visibility_status,category,created_by,created_at,updated_at")
    .eq("visibility_status", "published")
    .order("date_posted", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) throw toQueryError(error);
  return (data as NewsReleaseRow[] | null) ?? [];
};

export type NewsCategoryRow = {
  id: string;
  name: string;
  normalized_name: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export const mapNewsCategory = (row: NewsCategoryRow): NewsCategoryRecord => ({
  id: row.id,
  name: row.name,
  normalizedName: row.normalized_name,
  isSystem: Boolean(row.is_system),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fetchNewsCategories = async (): Promise<NewsCategoryRecord[]> => {
  if (!supabase) return INITIAL_NEWS_CATEGORIES;
  const { data, error } = await supabase
    .from("news_categories")
    .select("id,name,normalized_name,is_system,created_at,updated_at")
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.warn("Failed to fetch news categories from Supabase; using defaults.", error.message);
    return INITIAL_NEWS_CATEGORIES;
  }
  return (data as NewsCategoryRow[]).map(mapNewsCategory);
};

const fetchTransparencyPosts = async () => {
  const { data, error } = await supabase!
    .from("transparency_posts")
    .select("id,title,description,category,attachment_url,visibility_status,post_date,created_by,created_at,updated_at")
    .eq("visibility_status", "published")
    .order("post_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) throw toQueryError(error);
  return (data as TransparencyPostRow[] | null) ?? [];
};

const fetchNotifications = async (userId: string, limit = 25) => {
  const { data, error } = await supabase!
    .from("notifications")
    .select("id,user_id,organization_id,title,message,type,related_type,related_id,is_read,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw toQueryError(error);
  return (data as NotificationRow[] | null) ?? [];
};

const fetchInquiries = async (organizationId: string, limit = 50) => {
  const query = supabase!.from("inquiries")
    .select("id,organization_id,submitted_by,submitter_name,organization_name,email,subject,description,status,admin_remarks,reviewed_at,created_at,updated_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const { data, error } = await query;
  if (error) throw toQueryError(error);
  return (data as InquiryRow[] | null) ?? [];
};

const fetchActivityLogs = async (organizationId: string, limit = 10) => {
  const { data, error } = await supabase!
    .from("activity_logs")
    .select("id,actor_user_id,organization_id,action,related_type,related_id,description,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw toQueryError(error);
  return (data as ActivityLogRow[] | null) ?? [];
};

export const loadOrganizationDocumentSubmissionState = async (
  userIdOverride?: string,
  preloadedOrgId?: string,
): Promise<Partial<LydoSeedState> | null> => {
  if (!supabase) return null;

  let orgId = preloadedOrgId;
  let organizationProfile: OrganizationProfileRow | null = null;

  if (!orgId) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const targetUserId = userIdOverride || session?.user?.id;
    if (!targetUserId) return null;

    organizationProfile = await fetchOrganizationProfile(targetUserId);
    if (!organizationProfile) {
      return {
        organizationProfiles: [],
        documentSubmissions: [],
        documentSubmissionFiles: [],
      };
    }
    orgId = organizationProfile.id;
  }

  const latestSubmission = await fetchLatestSubmission(orgId);
  if (!latestSubmission) {
    return {
      ...(organizationProfile ? { organizationProfiles: [mapOrganizationProfile(organizationProfile)] } : {}),
      documentSubmissions: [],
      documentSubmissionFiles: [],
    };
  }

  const { data: fileRows, error: filesError } = await supabase!
    .from("document_submission_files")
    .select("id,submission_id,document_type_id,file_url,file_name,file_type,file_size,validation_status,admin_status,admin_remarks,revision_history,uploaded_at,reviewed_at,created_at,updated_at,required_document_types(id,name)")
    .eq("submission_id", latestSubmission.id);

  if (filesError) throw toQueryError(filesError);

  const documentSubmissionFiles = ((fileRows as DocumentSubmissionFileRow[] | null) ?? [])
    .map(mapDocumentFile)
    .filter((file): file is SubmissionFile => Boolean(file));

  return {
    ...(organizationProfile ? { organizationProfiles: [mapOrganizationProfile(organizationProfile)] } : {}),
    documentSubmissions: [mapDocumentSubmission(latestSubmission)],
    documentSubmissionFiles,
  };
};

export const loadOrganizationBudgetSubmissionState = async (
  userIdOverride?: string,
  preloadedOrgId?: string,
): Promise<Partial<LydoSeedState> | null> => {
  if (!supabase) return null;

  let orgId = preloadedOrgId;
  let organizationProfile: OrganizationProfileRow | null = null;

  if (!orgId) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const targetUserId = userIdOverride || session?.user?.id;
    if (!targetUserId) return null;

    organizationProfile = await fetchOrganizationProfile(targetUserId);
    if (!organizationProfile) {
      return {
        organizationProfiles: [],
        budgetRequests: [],
        budgetRequestFiles: [],
      };
    }
    orgId = organizationProfile.id;
  }

  await invalidateOrganizationPortalHistoryCaches(orgId, undefined, ["budgets", "summary"]);
  const budgetPage = await loadOrganizationBudgetRequestPage(orgId, { page: 1, pageSize: 25, sortBy: "created_at", sortDirection: "desc" });

  return {
    ...(organizationProfile ? { organizationProfiles: [mapOrganizationProfile(organizationProfile)] } : {}),
    budgetRequests: budgetPage.rows,
    budgetRequestFiles: [],
  };
};

export const loadOrganizationLiquidationSubmissionState = async (
  userIdOverride?: string,
  preloadedOrgId?: string,
): Promise<Partial<LydoSeedState> | null> => {
  if (!supabase) return null;

  let orgId = preloadedOrgId;
  let organizationProfile: OrganizationProfileRow | null = null;

  if (!orgId) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const targetUserId = userIdOverride || session?.user?.id;
    if (!targetUserId) return null;

    organizationProfile = await fetchOrganizationProfile(targetUserId);
    if (!organizationProfile) {
      return {
        organizationProfiles: [],
        liquidationReports: [],
        liquidationReportFiles: [],
      };
    }
    orgId = organizationProfile.id;
  }

  await invalidateOrganizationPortalHistoryCaches(orgId, undefined, ["liquidations", "summary"]);
  const liquidationPage = await loadOrganizationLiquidationReportPage(orgId, { page: 1, pageSize: 25, sortBy: "created_at", sortDirection: "desc" });

  return {
    ...(organizationProfile ? { organizationProfiles: [mapOrganizationProfile(organizationProfile)] } : {}),
    liquidationReports: liquidationPage.rows,
    liquidationReportFiles: [],
  };
};

export const loadOrganizationYpopState = async (
  userIdOverride?: string,
  preloadedOrgId?: string,
): Promise<Partial<LydoSeedState> | null> => {
  if (!supabase) return null;

  let orgId = preloadedOrgId;
  let organizationProfile: OrganizationProfileRow | null = null;

  if (!orgId) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const targetUserId = userIdOverride || session?.user?.id;
    if (!targetUserId) return null;

    organizationProfile = await fetchOrganizationProfile(targetUserId);
    if (!organizationProfile) {
      return {
        organizationProfiles: [],
        ypopPeriods: [],
      };
    }
    orgId = organizationProfile.id;
  }

  // The section bootstrap is deliberately metadata-only. Historical submissions,
  // activities, and files are fetched from the selected-semester page loaders.
  const { data: ypopPeriodRows, error: ypopPeriodError } = await supabase
    .from("ypop_periods")
    .select(YPOP_PERIOD_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (ypopPeriodError) throw toQueryError(ypopPeriodError);

  return {
    ...(organizationProfile ? { organizationProfiles: [mapOrganizationProfile(organizationProfile)] } : {}),
    ypopPeriods: (ypopPeriodRows as YpopPeriodRow[]).map(mapYpopPeriod),
  };
};

export type OrganizationYpopEntryPage = import("./lydo-connect-data").OrganizationPortalPage<YPOPEntry>;
export type OrganizationYpopOrgActivityPage = import("./lydo-connect-data").OrganizationPortalPage<YPOPOrgActivity>;
export type OrganizationYpopSemesterData = {
  period: YPOPPeriod | null;
  entry: YPOPEntry | null;
  cityActivities: YPOPCityActivity[];
  participations: YPOPEventParticipation[];
  orgActivities: OrganizationYpopOrgActivityPage;
  orgActivitySummary: {
    totalCount: number;
    approvedCount: number;
    unreviewedCount: number;
    needsRevisionCount: number;
  };
  deletionReceipts: NonNullable<LydoSeedState["ypopDeletionReceipts"]>;
};

export const invalidateOrganizationYpopQueries = async (organizationId: string, semesterKey?: string, entryId?: string) => {
  if (!organizationId) return;
  const tasks = [queryClient.invalidateQueries({ queryKey: ["user", organizationId, "ypop", "entries-by-semesters"] })];
  if (semesterKey) {
    const semesterQueryKey = ["user", organizationId, "ypop", "semester", semesterKey];
    await queryClient.cancelQueries({ queryKey: semesterQueryKey, exact: true });
    tasks.push(queryClient.invalidateQueries({ queryKey: semesterQueryKey, exact: true }));
  }
  if (entryId) {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "ypop", "entry", entryId] }),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "ypop", "ppa-page", entryId] }),
      queryClient.invalidateQueries({ queryKey: ["user", organizationId, "ypop", "ppa", entryId] }),
    );
  }
  await Promise.all(tasks);
};

const normalizeYpopSearch = (value?: string) => value?.trim().replace(/[,%()\\]/g, " ").replace(/\s+/g, " ") ?? "";

/** Lightweight, organization-scoped semester entries for the currently visible selector page. */
export const loadOrganizationYpopEntriesForSemesters = async (
  organizationId: string,
  semesterKeys: string[],
): Promise<OrganizationYpopEntryPage> => {
  const keys = [...new Set(semesterKeys.filter(Boolean))].sort();
  const pageSize = Math.max(1, keys.length);
  if (!supabase || !organizationId || !keys.length) {
    return { rows: [], totalCount: 0, page: 1, pageSize, totalPages: 0 };
  }
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "ypop", "entries-by-semesters", keys],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error, count } = await supabase!
        .from("ypop_entries")
        .select(YPOP_ENTRY_COLUMNS, { count: "exact" })
        .eq("organization_id", organizationId)
        .in("semester", keys)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
      if (error) throw toQueryError(error);
      const rows = ((data as YpopEntryRow[] | null) ?? []).map(mapYpopEntry);
      return { rows, totalCount: count ?? rows.length, page: 1, pageSize, totalPages: 1 };
    },
  });
};

/**
 * Loads just one organization's selected semester. City activities are a small
 * period-scoped reference set; PPAs are always server-paginated. No file rows
 * are loaded here: detail dialogs request files only after they open.
 */
export const loadOrganizationYpopSemesterData = async (
  organizationId: string,
  semesterKey: string,
): Promise<OrganizationYpopSemesterData> => {
  const queryKey = ["user", organizationId, "ypop", "semester", semesterKey];
  const pageSize = 20;
  if (!supabase || !organizationId || !semesterKey) {
    return {
      period: null, entry: null, cityActivities: [], participations: [],
      orgActivities: { rows: [], totalCount: 0, page: 1, pageSize, totalPages: 0 },
      orgActivitySummary: { totalCount: 0, approvedCount: 0, unreviewedCount: 0, needsRevisionCount: 0 },
      deletionReceipts: [],
    };
  }
  return queryClient.fetchQuery({
    queryKey,
    staleTime: 10_000,
    queryFn: async () => {
      const [periodResponse, entryResponse] = await Promise.all([
        supabase!.from("ypop_periods").select(YPOP_PERIOD_COLUMNS).eq("semester_key", semesterKey).limit(1).maybeSingle(),
        supabase!.from("ypop_entries").select(YPOP_ENTRY_COLUMNS).eq("organization_id", organizationId).eq("semester", semesterKey)
          .order("updated_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (periodResponse.error) throw toQueryError(periodResponse.error);
      if (entryResponse.error) throw toQueryError(entryResponse.error);
      const periodRow = periodResponse.data as YpopPeriodRow | null;
      const entryRow = entryResponse.data as YpopEntryRow | null;
      const entry = entryRow ? mapYpopEntry(entryRow) : null;
      const period = periodRow ? mapYpopPeriod(periodRow) : null;
      if (!period) {
        return {
          period, entry, cityActivities: [], participations: [],
          orgActivities: { rows: [], totalCount: 0, page: 1, pageSize, totalPages: 0 },
          orgActivitySummary: { totalCount: 0, approvedCount: 0, unreviewedCount: 0, needsRevisionCount: 0 },
          deletionReceipts: await fetchYpopDeletionReceipts(organizationId, semesterKey) ?? [],
        };
      }

      const activityResponse = await supabase!
        .from("ypop_city_activities")
        .select("id,semester_key,name,date,start_date,end_date,venue,points,created_at")
        .eq("semester_key", semesterKey)
        .order("date", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true });
      if (activityResponse.error) throw toQueryError(activityResponse.error);
      const activityRows = (activityResponse.data as YpopCityActivityRow[] | null) ?? [];
      const activityIds = activityRows.map((row) => row.id);
      const participationPromise = activityIds.length
        ? supabase!.from("ypop_event_participations").select(YPOP_EVENT_PARTICIPATION_COLUMNS)
            .eq("organization_id", organizationId).in("activity_id", activityIds)
            .order("created_at", { ascending: false }).order("id", { ascending: false })
        : Promise.resolve({ data: [], error: null });
      const [participationResponse, ppaPage, approvedResponse, unreviewedResponse, revisionResponse, deletionReceipts] = await Promise.all([
        participationPromise,
        entry
          ? loadOrganizationYpopOrgActivityPage(organizationId, entry.id, { page: 1, pageSize })
          : Promise.resolve({ rows: [], totalCount: 0, page: 1, pageSize, totalPages: 0 }),
        entry ? supabase!.from("ypop_org_activities").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("ypop_entry_id", entry.id).eq("status", "approved") : Promise.resolve({ count: 0, error: null }),
        entry ? supabase!.from("ypop_org_activities").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("ypop_entry_id", entry.id).in("status", ["pending_evaluation", "submitted", "under_review"]) : Promise.resolve({ count: 0, error: null }),
        entry ? supabase!.from("ypop_org_activities").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("ypop_entry_id", entry.id).eq("status", "needs_revision") : Promise.resolve({ count: 0, error: null }),
        fetchYpopDeletionReceipts(organizationId, semesterKey),
      ]);
      for (const response of [participationResponse, approvedResponse, unreviewedResponse, revisionResponse]) {
        if (response.error) throw toQueryError(response.error);
      }
      const activeDeletionReceipts = deletionReceipts ?? [];
      const deletedEntryIds = new Set(activeDeletionReceipts.flatMap((receipt) => receipt.entryIds));
      const deletedParticipationIds = new Set(activeDeletionReceipts.flatMap((receipt) => receipt.participationIds));
      const deletedOrgActivityIds = new Set(activeDeletionReceipts.flatMap((receipt) => receipt.orgActivityIds));
      const visibleEntry = entry && !deletedEntryIds.has(entry.id) ? entry : null;
      const visibleParticipations = (((participationResponse.data as YpopEventParticipationRow[] | null) ?? []).map(mapYpopEventParticipation))
        .filter((participation) => !deletedParticipationIds.has(participation.id));
      const visibleOrgActivities = ppaPage.rows
        .filter((activity) => !deletedOrgActivityIds.has(activity.id) && !deletedEntryIds.has(activity.ypopEntryId));
      const totalCount = ppaPage.totalCount;
      return {
        period,
        entry: visibleEntry,
        cityActivities: activityRows.map(mapYpopCityActivity),
        participations: visibleParticipations,
        orgActivities: {
          rows: visibleOrgActivities, totalCount, page: 1, pageSize,
          totalPages: ppaPage.totalPages,
        },
        orgActivitySummary: {
          totalCount,
          approvedCount: approvedResponse.count ?? 0,
          unreviewedCount: unreviewedResponse.count ?? 0,
          needsRevisionCount: revisionResponse.count ?? 0,
        },
        deletionReceipts: activeDeletionReceipts,
      };
    },
  });
};

export const loadOrganizationYpopOrgActivityPage = async (
  organizationId: string,
  entryId: string,
  options: import("./lydo-connect-data").OrganizationPortalPageOptions = {},
): Promise<OrganizationYpopOrgActivityPage> => {
  const { page, pageSize, offset } = normalizeOrganizationPage(options);
  const search = normalizeYpopSearch(options.search);
  if (!supabase || !organizationId || !entryId) return { rows: [], totalCount: 0, page, pageSize, totalPages: 0 };
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "ypop", "ppa-page", entryId, { page, pageSize, search }],
    staleTime: 10_000,
    queryFn: async () => {
      let query = supabase!.from("ypop_org_activities").select(YPOP_ORG_ACTIVITY_COLUMNS, { count: "exact" })
        .eq("organization_id", organizationId).eq("ypop_entry_id", entryId);
      if (search) {
        const pattern = `%${search}%`;
        query = query.or(`activity_name.ilike.${pattern},venue.ilike.${pattern},narrative_report.ilike.${pattern}`);
      }
      const { data, count, error } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + pageSize - 1);
      if (error) throw toQueryError(error);
      const rows = ((data as YpopOrgActivityRow[] | null) ?? []).map(mapYpopOrgActivity);
      const totalCount = count ?? rows.length;
      return { rows, totalCount, page, pageSize, totalPages: Math.ceil(totalCount / pageSize) };
    },
  });
};

export const loadOrganizationYpopEntryById = async (organizationId: string, entryId: string): Promise<YPOPEntry | null> => {
  if (!supabase || !organizationId || !entryId) return null;
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "ypop", "entry", entryId], staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase!.from("ypop_entries").select(YPOP_ENTRY_COLUMNS)
        .eq("organization_id", organizationId).eq("id", entryId).limit(1).maybeSingle();
      if (error) throw toQueryError(error);
      return data ? mapYpopEntry(data as YpopEntryRow) : null;
    },
  });
};

export const loadOrganizationYpopOrgActivityById = async (
  organizationId: string,
  entryId: string,
  activityId: string,
): Promise<YPOPOrgActivity | null> => {
  if (!supabase || !organizationId || !entryId || !activityId) return null;
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "ypop", "ppa", entryId, activityId], staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase!.from("ypop_org_activities").select(YPOP_ORG_ACTIVITY_COLUMNS)
        .eq("organization_id", organizationId).eq("ypop_entry_id", entryId).eq("id", activityId).limit(1).maybeSingle();
      if (error) throw toQueryError(error);
      return data ? mapYpopOrgActivity(data as YpopOrgActivityRow) : null;
    },
  });
};

export const loadOrganizationYpopEventFiles = async (organizationId: string, participationId: string): Promise<YPOPEventFile[]> => {
  if (!supabase || !organizationId || !participationId) return [];
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "ypop", "event-files", participationId], staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase!.from("ypop_event_files")
        .select("id,participation_id,organization_id,file_name,file_url,file_type,file_size,uploaded_at")
        .eq("organization_id", organizationId).eq("participation_id", participationId).order("uploaded_at", { ascending: true }).order("id", { ascending: true });
      if (error) throw toQueryError(error);
      return ((data as YpopEventFileRow[] | null) ?? []).map(mapYpopEventFile);
    },
  });
};

export const loadOrganizationYpopOrgActivityFiles = async (organizationId: string, activityId: string): Promise<YPOPOrgActivityFile[]> => {
  if (!supabase || !organizationId || !activityId) return [];
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "ypop", "org-activity-files", activityId], staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase!.from("ypop_org_activity_files")
        .select("id,org_activity_id,organization_id,file_name,file_url,file_type,uploaded_at")
        .eq("organization_id", organizationId).eq("org_activity_id", activityId).order("uploaded_at", { ascending: true }).order("id", { ascending: true });
      if (error) throw toQueryError(error);
      return ((data as YpopOrgActivityFileRow[] | null) ?? []).map(mapYpopOrgActivityFile);
    },
  });
};

const addYpopFileToCachedList = async <T extends { id: string }>(queryKey: readonly unknown[], file: T): Promise<void> => {
  await queryClient.cancelQueries({ queryKey, exact: true });
  const files = queryClient.getQueryData<T[]>(queryKey);
  if (!files) return;
  queryClient.setQueryData<T[]>(queryKey, (files) => {
    const current = files ?? [];
    return current.some((item) => item.id === file.id) ? current : [...current, file];
  });
};

const removeYpopFileFromCachedList = async <T extends { id: string }>(queryKey: readonly unknown[], fileId: string): Promise<void> => {
  await queryClient.cancelQueries({ queryKey, exact: true });
  if (!queryClient.getQueryData<T[]>(queryKey)) return;
  queryClient.setQueryData<T[]>(queryKey, (files) => files?.filter((file) => file.id !== fileId) ?? []);
};

export const loadOrganizationYpopEntryFiles = async (organizationId: string, entryId: string): Promise<YPOPFile[]> => {
  if (!supabase || !organizationId || !entryId) return [];
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "ypop", "entry-files", entryId], staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase!.from("ypop_files")
        .select("id,ypop_entry_id,organization_id,file_name,file_url,file_type,file_size,uploaded_at")
        .eq("organization_id", organizationId).eq("ypop_entry_id", entryId).order("uploaded_at", { ascending: true }).order("id", { ascending: true });
      if (error) throw toQueryError(error);
      return ((data as YpopFileRow[] | null) ?? []).map(mapYpopFile);
    },
  });
};

export const loadOrganizationInquiriesState = async (
  userIdOverride?: string,
  preloadedOrgId?: string,
): Promise<Partial<LydoSeedState> | null> => {
  if (!supabase) return null;

  let orgId = preloadedOrgId;
  let organizationProfile: OrganizationProfileRow | null = null;

  if (!orgId) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const targetUserId = userIdOverride || session?.user?.id;
    if (!targetUserId) return null;

    organizationProfile = await fetchOrganizationProfile(targetUserId);
    if (!organizationProfile) {
      return {
        organizationProfiles: [],
        inquiries: [],
      };
    }
    orgId = organizationProfile.id;
  }

  const inquiryPage = await loadOrganizationInquiryPage(orgId, { page: 1, pageSize: 25 });

  return {
    ...(organizationProfile ? { organizationProfiles: [mapOrganizationProfile(organizationProfile)] } : {}),
    inquiries: inquiryPage.rows,
  };
};

export const loadOrganizationNotificationsState = async (
  userIdOverride?: string,
): Promise<Partial<LydoSeedState> | null> => {
  if (!supabase) return null;

  let targetUserId = userIdOverride;
  if (!targetUserId) {
    const { data: { session } } = await supabase.auth.getSession();
    targetUserId = session?.user?.id;
  }
  if (!targetUserId) return null;

  const [notificationPage, unreadResponse] = await Promise.all([
    loadOrganizationNotificationPage(targetUserId, { page: 1, pageSize: 25 }),
    supabase.from("notifications").select("id", { count: "exact", head: true })
      .eq("user_id", targetUserId).eq("is_read", false),
  ]);
  if (unreadResponse.error) throw toQueryError(unreadResponse.error);

  return {
    notifications: notificationPage.rows,
    unreadNotificationCount: unreadResponse.count ?? 0,
  };
};

export const loadOrganizationRequiredDocumentTypesState = async (): Promise<Partial<LydoSeedState> | null> => {
  if (!supabase) return null;
  return queryClient.fetchQuery({
    queryKey: ["public", "templates"],
    // Public templates are edited by admins and must become visible to users
    // promptly without requiring a full portal reload.
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase!.from("required_document_types")
        .select("id,name,description,template_url,template_description,sort_order,is_required,is_active,scope,template_scope,template_category,template_file_size,updated_at")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw toQueryError(error);
      const templates = ((data as RequiredDocumentTypeRow[] | null) ?? [])
        .map(mapTemplate)
        .filter((template): template is TemplateRecord => Boolean(template) && !legacyRemovedTemplateNames.has(template.name));
      return { templates };
    },
  });
};

const loadOrganizationNewsState = async (): Promise<Partial<LydoSeedState>> => {
  if (!supabase) return { newsReleases: [], newsCategories: INITIAL_NEWS_CATEGORIES };
  return queryClient.fetchQuery({
    queryKey: ["public", "news"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [newsReleases, newsCategories] = await Promise.all([fetchNewsReleases(), fetchNewsCategories()]);
      return { newsReleases: newsReleases.map(mapNewsRelease), newsCategories };
    },
  });
};

const loadOrganizationTransparencyState = async (): Promise<Partial<LydoSeedState>> => {
  if (!supabase) return { transparencyPosts: [] };
  return queryClient.fetchQuery({
    queryKey: ["public", "transparency"],
    staleTime: 5 * 60_000,
    queryFn: async () => ({ transparencyPosts: (await fetchTransparencyPosts()).map(mapTransparencyPost) }),
  });
};

export const loadOrganizationActivityState = async (
  organizationId: string,
  limit = 10,
): Promise<Partial<LydoSeedState>> => {
  if (!supabase || !organizationId) return { activityLogs: [] };
  if (limit >= 25) {
    const page = await loadOrganizationActivityPage(organizationId, { page: 1, pageSize: 25 });
    return { activityLogs: page.rows };
  }
  const rows = await fetchActivityLogs(organizationId, limit);
  return { activityLogs: rows.map(mapActivityLog) };
};

export const loadOrganizationDashboardState = async (
  userId: string,
  organizationId: string,
): Promise<Partial<LydoSeedState>> => {
  if (!supabase || !userId || !organizationId) return {};
  const [documents, templates, budgetRequests, liquidationReports, dashboardSummary, eligibility, notifications, activity, inquiries, news, transparency] = await Promise.all([
    loadOrganizationDocumentSubmissionState(userId, organizationId),
    loadOrganizationRequiredDocumentTypesState(),
    fetchBudgetRequests(organizationId, 5),
    fetchLiquidationReports(organizationId, 5),
    loadOrganizationDashboardSummary(organizationId),
    loadOrganizationBudgetEligibilityState(organizationId),
    loadOrganizationNotificationsState(userId),
    loadOrganizationActivityState(organizationId, 8),
    fetchInquiries(organizationId, 10),
    loadOrganizationNewsState(),
    loadOrganizationTransparencyState(),
  ]);
  return {
    ...(documents ?? {}),
    ...(templates ?? {}),
    budgetRequests: budgetRequests.map(mapBudgetRequest),
    liquidationReports: liquidationReports.map(mapLiquidationReport),
    organizationDashboardSummary: dashboardSummary,
    ...(eligibility ?? {}),
    ...(notifications ?? {}),
    ...(activity ?? {}),
    inquiries: inquiries.map(mapInquiry),
    ...(news ?? {}),
    ...(transparency ?? {}),
  };
};

type DashboardBudgetSummaryRow = {
  total_count: number;
  released_count: number;
  under_review_count: number;
  revision_count: number;
  draft_count: number;
  awaiting_release_count: number;
  released_amount: number;
  status_counts: Record<string, number>;
};
type DashboardLiquidationSummaryRow = {
  total_count: number;
  completed_count: number;
  under_review_count: number;
  revision_count: number;
  overdue_count: number;
  pending_upload_count: number;
  pending_action_count: number;
  next_deadline: string | null;
  status_counts: Record<string, number>;
};
type DashboardBudgetRecordRow = {
  id: string;
  activity_title: string;
  status: string;
  admin_remarks: string | null;
  created_at: string;
};
type DashboardLiquidationRecordRow = {
  id: string;
  budget_request_id: string;
  activity_title: string;
  status: string;
  remarks: string | null;
  deadline_at: string | null;
  created_at: string;
};
type OrganizationPortalDashboardSummaryRow = {
  budgets: DashboardBudgetSummaryRow;
  liquidations: DashboardLiquidationSummaryRow;
  latest_budget: DashboardBudgetRecordRow | null;
  latest_budget_revision: DashboardBudgetRecordRow | null;
  latest_awaiting_release_budget: DashboardBudgetRecordRow | null;
  latest_pending_budget: DashboardBudgetRecordRow | null;
  latest_attention_liquidation: DashboardLiquidationRecordRow | null;
  latest_unsubmitted_liquidation: { budget_request_id: string; activity_title: string; status: string } | null;
  latest_under_review_liquidation: DashboardLiquidationRecordRow | null;
};

const mapOrganizationPortalDashboardSummary = (
  row: OrganizationPortalDashboardSummaryRow,
): OrganizationPortalDashboardSummary => {
  const mapBudgetSummaryRecord = (record: DashboardBudgetRecordRow | null) => record ? ({
    id: record.id,
    activityTitle: record.activity_title,
    status: record.status,
    adminRemarks: record.admin_remarks,
    createdAt: record.created_at,
  }) : null;
  const mapLiquidationSummaryRecord = (record: DashboardLiquidationRecordRow | null) => record ? ({
    id: record.id,
    budgetRequestId: record.budget_request_id,
    activityTitle: record.activity_title,
    status: record.status,
    remarks: record.remarks,
    deadlineAt: record.deadline_at,
    createdAt: record.created_at,
  }) : null;
  return {
    budgets: {
      totalCount: row.budgets.total_count,
      releasedCount: row.budgets.released_count,
      underReviewCount: row.budgets.under_review_count,
      revisionCount: row.budgets.revision_count,
      draftCount: row.budgets.draft_count,
      awaitingReleaseCount: row.budgets.awaiting_release_count,
      releasedAmount: row.budgets.released_amount,
      statusCounts: row.budgets.status_counts,
    },
    liquidations: {
      totalCount: row.liquidations.total_count,
      completedCount: row.liquidations.completed_count,
      underReviewCount: row.liquidations.under_review_count,
      revisionCount: row.liquidations.revision_count,
      overdueCount: row.liquidations.overdue_count,
      pendingUploadCount: row.liquidations.pending_upload_count,
      pendingActionCount: row.liquidations.pending_action_count,
      nextDeadline: row.liquidations.next_deadline,
      statusCounts: row.liquidations.status_counts,
    },
    latestBudget: mapBudgetSummaryRecord(row.latest_budget),
    latestBudgetRevision: mapBudgetSummaryRecord(row.latest_budget_revision),
    latestAwaitingReleaseBudget: mapBudgetSummaryRecord(row.latest_awaiting_release_budget),
    latestPendingBudget: mapBudgetSummaryRecord(row.latest_pending_budget),
    latestAttentionLiquidation: mapLiquidationSummaryRecord(row.latest_attention_liquidation),
    latestUnsubmittedLiquidation: row.latest_unsubmitted_liquidation ? {
      id: row.latest_unsubmitted_liquidation.budget_request_id,
      budgetRequestId: row.latest_unsubmitted_liquidation.budget_request_id,
      activityTitle: row.latest_unsubmitted_liquidation.activity_title,
      status: row.latest_unsubmitted_liquidation.status,
    } : null,
    latestUnderReviewLiquidation: mapLiquidationSummaryRecord(row.latest_under_review_liquidation),
  };
};

export const loadOrganizationDashboardSummary = async (
  organizationId: string,
): Promise<OrganizationPortalDashboardSummary | null> => {
  if (!supabase || !organizationId) return null;
  return queryClient.fetchQuery({
    queryKey: ["user", organizationId, "dashboard-summary"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase!.rpc("get_organization_portal_dashboard_summary", {
        p_organization_id: organizationId,
      });
      if (error) {
        if (error.code === "PGRST202" || /get_organization_portal_dashboard_summary.*(not found|schema cache)/i.test(error.message)) {
          return null;
        }
        throw toQueryError(error);
      }
      if (!data || typeof data !== "object" || Array.isArray(data)) return null;
      return mapOrganizationPortalDashboardSummary(data as OrganizationPortalDashboardSummaryRow);
    },
  });
};

/** Dashboard budget eligibility needs only period/status records, never YPOP proof files. */
export const loadOrganizationBudgetEligibilityState = async (
  organizationId: string,
): Promise<Partial<LydoSeedState>> => {
  if (!supabase || !organizationId) return { ypopPeriods: [], ypopEntries: [] };
  const periodColumns = "id,semester_key,semester_label,validation_deadline,status,org_led_tiers,created_at,updated_at";
  const entryColumns = "id,organization_id,submitted_by,semester,semester_label,points_earned,points_required,total_points,status,admin_remarks,submission_note,validation_deadline,submitted_at,validated_at,revision_requested_at,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at,revision_unlocked_by,revision_history,org_led_project_count,city_led_attendance,created_at,updated_at";
  const { data: openPeriod, error: periodError } = await supabase.from("ypop_periods")
    .select(periodColumns).eq("status", "open")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (periodError) throw new Error(periodError.message);

  let selectedPeriod = openPeriod as YpopPeriodRow | null;
  let selectedEntry: YpopEntryRow | null = null;
  if (selectedPeriod) {
    const { data, error } = await supabase.from("ypop_entries").select(entryColumns)
      .eq("organization_id", organizationId).eq("semester", selectedPeriod.semester_key)
      .order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw toQueryError(error);
    selectedEntry = data as YpopEntryRow | null;
  } else {
    const { data, error } = await supabase.from("ypop_entries").select(entryColumns)
      .eq("organization_id", organizationId).eq("status", "qualified")
      .order("validated_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw toQueryError(error);
    selectedEntry = data as YpopEntryRow | null;
    if (selectedEntry) {
      const { data: period, error: selectedPeriodError } = await supabase.from("ypop_periods")
        .select(periodColumns).eq("semester_key", selectedEntry.semester).limit(1).maybeSingle();
      if (selectedPeriodError) throw new Error(selectedPeriodError.message);
      selectedPeriod = period as YpopPeriodRow | null;
    }
  }
  return {
    ypopPeriods: selectedPeriod ? [mapYpopPeriod(selectedPeriod)] : [],
    ypopEntries: selectedEntry ? [mapYpopEntry(selectedEntry)] : [],
  };
};

export const loadOrganizationProfileActivityState = async (
  organizationId: string,
): Promise<Partial<LydoSeedState>> => {
  if (!supabase || !organizationId) return { activityLogs: [], ypopEventParticipations: [] };
  const [activityRows, participationResponse] = await Promise.all([
    fetchActivityLogs(organizationId, 25),
    supabase.from("ypop_event_participations")
      .select("id,organization_id,activity_id,activity_name,activity_date,venue,status,admin_remarks,joined_at,proof_submitted_at,verified_at,revision_requested_at,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at,revision_unlocked_by,revision_history,created_at,updated_at")
      .eq("organization_id", organizationId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(4),
  ]);
  if (participationResponse.error) throw toQueryError(participationResponse.error);
  return {
    activityLogs: activityRows.map(mapActivityLog),
    // This is only the bounded recent-activity preview. The complete history is fetched by semester in YPOP.
    ypopEventParticipations: ((participationResponse.data as YpopEventParticipationRow[] | null) ?? []).map(mapYpopEventParticipation),
  };
};

export const loadOrganizationComplianceState = async (
  organizationId: string,
): Promise<Partial<LydoSeedState>> => {
  if (!supabase || !organizationId) return { complianceRemarks: [] };
  const { data, error } = await supabase.from("compliance_remarks")
    .select("id,organization_id,related_type,related_id,remark_type,consequence_type,message,status,created_by,resolved_by,resolved_at,created_at,updated_at")
    .eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(50);
  if (error) throw toQueryError(error);
  return { complianceRemarks: ((data as ComplianceRemarkRow[] | null) ?? []).map(mapComplianceRemark) };
};

/** Shared, query-keyed user portal loaders. A section refresh never reloads other sections. */
export const loadOrganizationPortalSectionState = async (
  section: string,
  userId: string,
  organizationId: string,
): Promise<Partial<LydoSeedState> | null> => {
  if (!supabase || !userId) return null;
  // Shared resources do not depend on an organization profile being loaded.
  if (section === "templates") return loadOrganizationRequiredDocumentTypesState();
  if (section === "news-releases") return loadOrganizationNewsState();
  if (!organizationId) return null;
  const normalizedSection = section === "inquiries" ? "organization-profile" : section;
  const staleTime = 0;
  return queryClient.fetchQuery({
    queryKey: ["user", userId, organizationId, normalizedSection],
    staleTime,
    queryFn: async () => {
      switch (normalizedSection) {
        case "dashboard":
          return loadOrganizationDashboardState(userId, organizationId);
        case "document-submission": {
          const [documents, templates, activity] = await Promise.all([
            loadOrganizationDocumentSubmissionState(userId, organizationId),
            loadOrganizationRequiredDocumentTypesState(),
            loadOrganizationActivityState(organizationId, 50),
          ]);
          return { ...(documents ?? {}), ...(templates ?? {}), ...(activity ?? {}) };
        }
        case "budget-request": {
          const [budgets, eligibility, documents, templates, profile] = await Promise.all([
            loadOrganizationBudgetSubmissionState(userId, organizationId),
            loadOrganizationBudgetEligibilityState(organizationId),
            loadOrganizationDocumentSubmissionState(userId, organizationId),
            loadOrganizationRequiredDocumentTypesState(),
            fetchOrganizationProfileInSupabase(userId),
          ]);
          return {
            ...(budgets ?? {}), ...eligibility, ...(documents ?? {}), ...(templates ?? {}),
            ...(profile?.id === organizationId ? { organizationProfiles: [profile] } : {}),
          };
        }
        case "liquidation-reporting": {
          const [budgets, liquidations, documents, templates, eligibility] = await Promise.all([
            loadOrganizationBudgetSubmissionState(userId, organizationId),
            loadOrganizationLiquidationSubmissionState(userId, organizationId),
            loadOrganizationDocumentSubmissionState(userId, organizationId),
            loadOrganizationRequiredDocumentTypesState(),
            loadOrganizationBudgetEligibilityState(organizationId),
          ]);
          return { ...(budgets ?? {}), ...(liquidations ?? {}), ...(documents ?? {}), ...(templates ?? {}), ...eligibility };
        }
        case "ypop":
          return loadOrganizationYpopState(userId, organizationId);
        case "notifications":
          return loadOrganizationNotificationsState(userId);
        case "public-transparency":
          return loadOrganizationTransparencyState();
        case "compliance-status":
          return loadOrganizationComplianceState(organizationId);
        case "organization-profile": {
          const [profileActivity, inquiries] = await Promise.all([
            loadOrganizationProfileActivityState(organizationId),
            loadOrganizationInquiriesState(userId, organizationId),
          ]);
          return { ...profileActivity, ...(inquiries ?? {}) };
        }
        case "organization-renewal":
        case "renewals":
          return loadOrganizationActivityState(organizationId, 50);
        case "activity":
          return loadOrganizationActivityState(organizationId, 50);
        default:
          return {};
      }
    },
  });
};

export type AdminPortalListResource = "registrations" | "inquiries" | "activity_logs";
export type AdminPortalListPage<T> = {
  rows: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  summary: Record<string, number>;
};
export type AdminPortalRegistrationListRow = {
  profile: OrganizationProfile;
  submittedDocumentCount: number;
};
export type AdminPortalListFilters = {
  resource: AdminPortalListResource;
  page: number;
  pageSize?: number;
  search?: string;
  status?: string;
  district?: string;
  barangay?: string;
  classification?: string;
  dateRange?: string;
  sort?: "newest" | "oldest";
  startDate?: string | null;
  endDateExclusive?: string | null;
  quarter?: number | null;
};

export type AdminReviewResource = "budgets" | "liquidations";
export type AdminReviewResourceFilters = {
  resource: AdminReviewResource;
  page: number;
  pageSize?: number;
  search?: string;
  status?: string;
  district?: string;
  barangay?: string;
  classification?: string;
  semester?: string;
  sort?: "newest" | "oldest";
  startDate?: string | null;
  endDateExclusive?: string | null;
  quarter?: number | null;
};
export type AdminReviewResourcePage<T> = {
  rows: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  summary: Record<string, number>;
};
export type AdminRenewalQueueRow = {
  renewal: OrganizationRenewalRecord;
  organization: OrganizationProfile;
  accreditation: OrganizationAccreditationRecord | null;
  submittedDocumentCount: number;
  linkedDocumentSubmissionId: string | null;
};
export type AdminBudgetReviewRow = { request: BudgetRequest; organization: OrganizationProfile };
export type AdminLiquidationReviewRow = {
  report: LiquidationReport;
  budgetRequest: Partial<BudgetRequest> & Pick<BudgetRequest, "id" | "organizationId" | "activityTitle">;
  organization: OrganizationProfile;
};
export type AdminPortalChangeResource = "registration" | "renewals" | "budgets" | "liquidations" | "ypop_city_led" | "ypop_org_led";
export type AdminPortalChangeVersions = Record<AdminPortalChangeResource, number>;
export const getChangedAdminPortalResources = (
  previous: AdminPortalChangeVersions | null,
  next: AdminPortalChangeVersions,
  activeResources: readonly AdminPortalChangeResource[],
): AdminPortalChangeResource[] => previous
  ? activeResources.filter((resource) => previous[resource] !== next[resource])
  : [];
export type AdminYpopPeriodSummary = { period: YPOPPeriod; submissionCount: number; activityCount: number };
export type AdminYpopSubmissionRow = {
  id: string;
  organizationId: string;
  organizationName: string;
  referenceId: string;
  majorClassification: string;
  status: "pending_evaluation" | "qualified" | "not_qualified";
};

const mapAdminReviewOrganization = (row: Record<string, unknown>): OrganizationProfile => ({
  id: String(row.id ?? ""),
  organizationName: String(row.organization_name ?? ""),
  referenceId: (row.reference_id as string | null) ?? null,
  urn: (row.urn as string | null) ?? null,
  district: String(row.district ?? ""),
  barangay: String(row.barangay ?? ""),
  addressBarangay: String(row.barangay ?? ""),
  majorClassification: String(row.major_classification ?? ""),
} as OrganizationProfile);

/** Fetch one authenticated, filtered Admin queue page. File URLs are never part of this payload. */
export const fetchAdminReviewResourcePage = async (
  filters: AdminReviewResourceFilters,
): Promise<AdminReviewResourcePage<AdminBudgetReviewRow | AdminLiquidationReviewRow>> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession?.sessionToken) throw new Error("Please sign in with the seeded admin account first.");
  const { data, error } = await supabase.rpc("admin_get_review_resource_page", {
    _session_token: adminSession.sessionToken,
    _resource: filters.resource,
    _page: filters.page,
    _page_size: filters.pageSize ?? 20,
    _search: filters.search?.trim() || null,
    _status: filters.status ?? "all",
    _district: filters.district ?? "all",
    _barangay: filters.barangay ?? "all",
    _classification: filters.classification ?? "all",
    _semester: filters.semester ?? "all",
    _sort: filters.sort ?? "newest",
    _start_date: filters.startDate ?? null,
    _end_date_exclusive: filters.endDateExclusive ?? null,
    ...(filters.quarter != null ? { _quarter: filters.quarter } : {}),
  });
  if (error) throw new Error(error.message || "Unable to load the Admin review queue.");
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("The Admin review queue response was invalid.");
  const response = data as { rows?: Array<Record<string, unknown>>; totalCount?: number; page?: number; pageSize?: number; summary?: Record<string, number> };
  const rows = (response.rows ?? []).flatMap((row) => {
    if (filters.resource === "budgets") {
      const request = row.request as BudgetRequestRow | undefined;
      const organization = row.organization as Record<string, unknown> | undefined;
      if (!request?.id || !organization?.id) return [];
      return [{ request: mapBudgetRequest(request), organization: mapAdminReviewOrganization(organization) }];
    }
    const report = row.report as LiquidationReportRow | undefined;
    const budget = row.budget_request as Record<string, unknown> | undefined;
    const organization = row.organization as Record<string, unknown> | undefined;
    if (!report?.id || !budget?.id || !organization?.id) return [];
    const mappedBudget = mapBudgetRequest({
      id: String(budget.id), organization_id: String(budget.organization_id ?? report.organization_id),
      submitted_by: "", activity_title: String(budget.activity_title ?? ""), activity_description: "",
      activity_date: "", venue: "", requested_amount: budget.requested_amount as number | string ?? 0,
      approved_amount: budget.approved_amount as number | string ?? 0, released_amount: budget.released_amount as number | string ?? 0,
      public_record_code: (budget.public_record_code as string | null | undefined) ?? null,
      release_date: null, purpose_category: "", status: "draft", remarks: null, admin_remarks: null,
      go_signal_at: null, hard_copy_submitted_at: null, user_note: null, revision_history: [], created_at: "", updated_at: "",
    });
    mappedBudget.activityTitle = String(budget.activity_title ?? "");
    return [{ report: mapLiquidationReport(report), budgetRequest: mappedBudget, organization: mapAdminReviewOrganization(organization) }];
  });
  return {
    rows,
    totalCount: Number(response.totalCount ?? 0),
    page: Number(response.page ?? filters.page),
    pageSize: Number(response.pageSize ?? filters.pageSize ?? 20),
    summary: Object.fromEntries(Object.entries(response.summary ?? {}).map(([key, value]) => [key, Number(value)])),
  };
};

export const fetchAdminPortalChangeVersions = async (): Promise<AdminPortalChangeVersions> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const session = readAdminSession();
  if (!session?.sessionToken) throw new Error("Admin session is unavailable.");
  const { data, error } = await supabase.rpc("admin_get_portal_change_versions", { _session_token: session.sessionToken });
  if (error) throw new Error(error.message || "Unable to read Admin change versions.");
  const value = (data ?? {}) as Record<string, unknown>;
  return {
    registration: Number(value.registration ?? 0), renewals: Number(value.renewals ?? 0),
    budgets: Number(value.budgets ?? 0), liquidations: Number(value.liquidations ?? 0),
    ypop_city_led: Number(value.ypop_city_led ?? 0), ypop_org_led: Number(value.ypop_org_led ?? 0),
  };
};

/** Loads a bounded, server-filtered renewal queue page with compact row metadata. */
export const fetchAdminRenewalQueuePage = async (filters: {
  page: number; pageSize?: number; search?: string; status?: string;
  district?: string; barangay?: string; classification?: string; requiredDocumentTypeIds?: string[];
}): Promise<AdminPortalListPage<AdminRenewalQueueRow>> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const session = readAdminSession();
  if (!session?.sessionToken) throw new Error("Admin session is unavailable.");
  const { data, error } = await supabase.rpc("admin_get_renewal_queue_page", {
    _session_token: session.sessionToken,
    _page: filters.page,
    _page_size: filters.pageSize ?? 10,
    _search: filters.search?.trim() || null,
    _status: filters.status ?? "all",
    _district: filters.district ?? "all",
    _barangay: filters.barangay ?? "all",
    _classification: filters.classification ?? "all",
    // Local fallback template IDs are slugs (for example, "constitution-bylaws").
    // The RPC compares document_type_id UUIDs, so only pass actual database UUIDs.
    _required_document_type_ids: (filters.requiredDocumentTypeIds ?? []).filter((id) => UUID_PATTERN.test(id)),
  });
  if (error) throw new Error(error.message || "Unable to load the renewal review queue.");
  const response = (data ?? {}) as {
    rows?: Array<Record<string, unknown>>; totalCount?: number; page?: number; pageSize?: number;
    summary?: Record<string, number>;
  };
  const rows = (response.rows ?? []).flatMap((item) => {
    const renewalRow = item.renewal as OrganizationRenewalRow | undefined;
    const organizationRow = item.organization as Record<string, unknown> | undefined;
    const accreditationRow = item.accreditation as OrganizationAccreditationRow | null | undefined;
    if (!renewalRow?.id || !organizationRow?.id) return [];
    return [{
      renewal: mapOrganizationRenewal(renewalRow),
      organization: {
        ...mapAdminReviewOrganization(organizationRow),
        userId: String(organizationRow.user_id ?? ""),
      } as OrganizationProfile,
      accreditation: accreditationRow?.id ? mapOrganizationAccreditation(accreditationRow) : null,
      submittedDocumentCount: Number(item.submitted_document_count ?? 0),
      linkedDocumentSubmissionId: (item.linked_document_submission_id as string | null) ?? null,
    }];
  });
  return {
    rows,
    totalCount: Number(response.totalCount ?? 0),
    page: Number(response.page ?? filters.page),
    pageSize: Number(response.pageSize ?? filters.pageSize ?? 10),
    summary: Object.fromEntries(Object.entries(response.summary ?? {}).map(([key, value]) => [key, Number(value)])),
  };
};

/** Opens just one renewal's organization/accreditation context; file metadata stays in the existing lazy packet flow. */
export const fetchAdminRenewalReviewContext = async (renewalId: string): Promise<Partial<LydoSeedState>> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const session = readAdminSession();
  if (!session?.sessionToken) throw new Error("Admin session is unavailable.");
  const { data, error } = await supabase.rpc("admin_get_renewal_review_context", {
    _session_token: session.sessionToken, _renewal_id: renewalId,
  });
  if (error) throw new Error(error.message || "Unable to load renewal review details.");
  const payload = (data ?? {}) as {
    organization?: OrganizationProfileRow; accreditation?: OrganizationAccreditationRow | null;
    renewal?: OrganizationRenewalRow;
    submission?: DocumentSubmissionRow | null; files?: DocumentSubmissionFileRow[];
  };
  return {
    ...(payload.organization?.id ? { organizationProfiles: [mapOrganizationProfile(payload.organization)] } : {}),
    ...(payload.accreditation?.id ? { organizationAccreditations: [mapOrganizationAccreditation(payload.accreditation)] } : {}),
    ...(payload.renewal?.id ? { organizationRenewals: [mapOrganizationRenewal(payload.renewal)] } : {}),
    ...(payload.submission?.id ? { documentSubmissions: [mapDocumentSubmission(payload.submission)] } : {}),
    documentSubmissionFiles: (payload.files ?? []).flatMap((row) => {
      const file = mapDocumentFile(row);
      return file ? [file] : [];
    }),
  };
};

export const fetchAdminBudgetRequestDetail = async (requestId: string): Promise<Partial<LydoSeedState>> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const session = readAdminSession();
  if (!session?.sessionToken) throw new Error("Admin session is unavailable.");
  const { data, error } = await supabase.rpc("admin_get_budget_request_detail", { _session_token: session.sessionToken, _request_id: requestId });
  if (error) throw new Error(error.message || "Unable to load budget request details.");
  const payload = data as { request?: BudgetRequestRow; files?: BudgetRequestFileRow[] } | null;
  if (!payload?.request) throw new Error("Budget request detail response was invalid.");
  return { budgetRequests: [mapBudgetRequest(payload.request)], budgetRequestFiles: (payload.files ?? []).map(mapBudgetRequestFile) };
};

export const fetchAdminLiquidationReportDetail = async (reportId: string): Promise<Partial<LydoSeedState>> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const session = readAdminSession();
  if (!session?.sessionToken) throw new Error("Admin session is unavailable.");
  const { data, error } = await supabase.rpc("admin_get_liquidation_report_detail", { _session_token: session.sessionToken, _report_id: reportId });
  if (error) throw new Error(error.message || "Unable to load liquidation details.");
  const payload = data as { report?: LiquidationReportRow; budget_request?: BudgetRequestRow; files?: LiquidationReportFileRow[] } | null;
  if (!payload?.report) throw new Error("Liquidation detail response was invalid.");
  if (payload.report.status === "draft") throw new Error("This liquidation report has not been submitted for review.");
  return {
    liquidationReports: [mapLiquidationReport(payload.report)],
    ...(payload.budget_request ? { budgetRequests: [mapBudgetRequest(payload.budget_request)] } : {}),
    liquidationReportFiles: ["not_started", "pending_activity_completion"].includes(payload.report.status)
      ? [] : (payload.files ?? []).map(mapLiquidationReportFile),
  };
};

export const fetchAdminYpopValidationPeriods = async (): Promise<AdminYpopPeriodSummary[]> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const session = readAdminSession();
  if (!session?.sessionToken) throw new Error("Admin session is unavailable.");
  const { data, error } = await supabase.rpc("admin_get_ypop_validation_periods", { _session_token: session.sessionToken });
  if (error) throw new Error(error.message || "Unable to load YPOP periods.");
  return ((data ?? []) as Array<{ period: YpopPeriodRow; submission_count: number; activity_count: number }>).flatMap((item) =>
    item?.period?.id ? [{ period: mapYpopPeriod(item.period), submissionCount: Number(item.submission_count ?? 0), activityCount: Number(item.activity_count ?? 0) }] : [],
  );
};

export const fetchAdminYpopPeriodCityActivities = async (periodId: string): Promise<YPOPCityActivity[]> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const session = readAdminSession();
  if (!session?.sessionToken) throw new Error("Admin session is unavailable.");
  const { data, error } = await supabase.rpc("admin_get_ypop_period_city_activities", {
    _session_token: session.sessionToken, _period_id: periodId,
  });
  if (error) throw new Error(error.message || "Unable to load YPOP period activities.");
  return ((data ?? []) as YpopCityActivityRow[]).map(mapYpopCityActivity);
};

export const fetchAdminYpopPeriodSubmissionPage = async (params: {
  periodId: string; page: number; pageSize?: number; search?: string; classification?: string; status?: string;
}): Promise<AdminPortalListPage<AdminYpopSubmissionRow>> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const session = readAdminSession();
  if (!session?.sessionToken) throw new Error("Admin session is unavailable.");
  const { data, error } = await supabase.rpc("admin_get_ypop_period_submissions_page", {
    _session_token: session.sessionToken, _period_id: params.periodId, _page: params.page,
    _page_size: params.pageSize ?? 20, _search: params.search?.trim() || null,
    _classification: params.classification ?? "all", _qualification_status: params.status ?? "all",
  });
  if (error) throw new Error(error.message || "Unable to load YPOP submissions.");
  const result = (data ?? {}) as { rows?: Array<Record<string, unknown>>; totalCount?: number; page?: number; pageSize?: number; summary?: Record<string, number> };
  const rows = (result.rows ?? []).flatMap((item) => {
    const organizationId = String(item.organization_id ?? "");
    if (!organizationId) return [];
    return [{
      id: String(item.id ?? ""), organizationId,
      organizationName: String(item.organization_name ?? "Unknown organization"),
      referenceId: String(item.reference_id ?? ""), majorClassification: String(item.major_classification ?? ""),
      status: String(item.qualification_status ?? "pending_evaluation") as AdminYpopSubmissionRow["status"],
    }];
  });
  return { rows, totalCount: Number(result.totalCount ?? 0), page: Number(result.page ?? params.page), pageSize: Number(result.pageSize ?? params.pageSize ?? 20), summary: Object.fromEntries(Object.entries(result.summary ?? {}).map(([key, value]) => [key, Number(value)])) };
};

export const fetchAdminYpopEntryReviewDetail = async (entryId: string): Promise<Partial<LydoSeedState>> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const session = readAdminSession();
  if (!session?.sessionToken) throw new Error("Admin session is unavailable.");
  const { data, error } = await supabase.rpc("admin_get_ypop_entry_review_detail", { _session_token: session.sessionToken, _entry_id: entryId });
  if (error) throw new Error(error.message || "Unable to load the YPOP review details.");
  const payload = (data ?? {}) as {
    entry?: YpopEntryRow;
    organization?: OrganizationProfileRow;
    period?: YpopPeriodRow;
    city_activities?: YpopCityActivityRow[];
    event_participations?: YpopEventParticipationRow[];
    event_files?: YpopEventFileRow[];
    org_activities?: YpopOrgActivityRow[];
    org_activity_files?: YpopOrgActivityFileRow[];
  };
  if (!payload.entry?.id) throw new Error("YPOP review detail response was invalid.");
  return {
    ypopEntries: [mapYpopEntry(payload.entry)],
    organizationProfiles: payload.organization ? [mapOrganizationProfile(payload.organization)] : [],
    ypopPeriods: payload.period ? [mapYpopPeriod(payload.period)] : [],
    ypopCityActivities: (payload.city_activities ?? []).map(mapYpopCityActivity),
    ypopEventParticipations: (payload.event_participations ?? []).map(mapYpopEventParticipation),
    ypopEventFiles: (payload.event_files ?? []).map(mapYpopEventFile),
    ypopOrgActivities: (payload.org_activities ?? []).map(mapYpopOrgActivity),
    ypopOrgActivityFiles: (payload.org_activity_files ?? []).map(mapYpopOrgActivityFile),
  };
};

/** Load only the YPOP activity rows needed by an organization in the YORP Registry drawer. */
export const fetchAdminYorpRegistryYpopDetail = async (
  organizationId: string,
  semesterKey: string,
): Promise<Partial<LydoSeedState>> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const session = readAdminSession();
  if (!session?.sessionToken) throw new Error("Admin session is unavailable.");
  const { data, error } = await supabase.rpc("admin_get_yorp_registry_ypop_detail", {
    _session_token: session.sessionToken,
    _organization_id: organizationId,
    _semester_key: semesterKey,
  });
  if (error) throw new Error(error.message || "Unable to load the organization's YPOP activities.");
  const payload = (data ?? {}) as {
    city_activities?: YpopCityActivityRow[];
    event_participations?: YpopEventParticipationRow[];
    org_activities?: YpopOrgActivityRow[];
  };
  return {
    ypopCityActivities: (payload.city_activities ?? []).map(mapYpopCityActivity),
    ypopEventParticipations: (payload.event_participations ?? []).map(mapYpopEventParticipation),
    ypopOrgActivities: (payload.org_activities ?? []).map(mapYpopOrgActivity),
  };
};

export const fetchAdminYpopReviewFiles = async (lane: "city_led" | "org_led", parentId: string): Promise<YPOPEventFile[] | YPOPOrgActivityFile[]> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const session = readAdminSession();
  if (!session?.sessionToken) throw new Error("Admin session is unavailable.");
  const { data, error } = await supabase.rpc("admin_get_ypop_review_files", { _session_token: session.sessionToken, _lane: lane, _parent_id: parentId });
  if (error) throw new Error(error.message || "Unable to load the selected YPOP submission files.");
  const rows = (data ?? []) as Array<YpopEventFileRow | YpopOrgActivityFileRow>;
  return lane === "city_led"
    ? (rows as YpopEventFileRow[]).map(mapYpopEventFile)
    : (rows as YpopOrgActivityFileRow[]).map(mapYpopOrgActivityFile);
};

export type OrganizationStatusRealtimeFeature = "registration" | "renewals" | "budgets" | "liquidations" | "inquiries" | "ypop_city_led" | "ypop_org_led";
export const subscribeToOrganizationStatusChangesInSupabase = (params: {
  organizationId: string;
  feature: OrganizationStatusRealtimeFeature;
  onChange: () => void;
  onOrganizationProfileChange?: () => void;
  detailId?: string | null;
  submissionId?: string | null;
  semesterKey?: string | null;
  activityIds?: string[];
  entryId?: string | null;
  onStatus?: (status: string, error?: Error | null) => void;
}): (() => void) => {
  if (!supabase || !params.organizationId) return () => undefined;
  const { organizationId, feature, onChange, onOrganizationProfileChange, detailId, submissionId, semesterKey, activityIds = [], entryId, onStatus } = params;
  const channel = supabase.channel(`organization-${feature}-${organizationId}-${detailId ?? "list"}`);
  let changeTimer: number | null = null;
  const pendingChangeKinds = new Set<"parent" | "file">();
  const handleRelevantChange = (kind: "parent" | "file" = "parent") => {
    pendingChangeKinds.add(kind);
    if (changeTimer !== null) return;
    changeTimer = window.setTimeout(() => {
      changeTimer = null;
      const kinds = [...pendingChangeKinds];
      pendingChangeKinds.clear();
      // A parent INSERT/UPDATE refresh includes its currently-open child rows.
      // Collapse a simultaneous file event into that refresh to avoid a second
      // list/detail request during a normal upload or review decision.
      const kindsToDispatch: Array<"parent" | "file"> = kinds.includes("parent") ? ["parent"] : kinds;
      for (const pendingKind of kindsToDispatch) {
        dispatchRelevantChange(pendingKind);
      }
    }, 60);
  };
  const handleParentChange = () => handleRelevantChange("parent");
  const dispatchRelevantChange = async (kind: "parent" | "file") => {
    if (feature === "inquiries") {
      if (kind === "parent") await invalidateOrganizationPortalHistoryCaches(organizationId, undefined, ["inquiries"]);
    } else if (feature === "budgets") {
      const refreshes: Promise<unknown>[] = [];
      if (kind === "parent") {
        refreshes.push(
          // The page queryFn delegates to a second cached query in the loader.
          // Invalidate both cache layers or the outer refetch can reuse a fresh,
          // but stale, page result after an admin status change.
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "budget-page"] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "budget-page-view"] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "budget-page-pwa"] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "dashboard-summary"] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "dashboard-summary-view"] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "dashboard-summary-liquidation-view"] }),
        );
      }
      if (detailId) refreshes.push(
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "budget-detail", detailId] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "budget-detail-view", detailId] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "budget-files", detailId] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "budget-files-view", detailId] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "budget-detail-pwa", detailId] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "budget-files-pwa", detailId] }),
      );
      if (refreshes.length) void Promise.all(refreshes);
    } else if (feature === "liquidations") {
      const refreshes: Promise<unknown>[] = [];
      if (kind === "parent") {
        refreshes.push(
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-page"] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-page-view"] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-page-pwa"] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-page-files"] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-page-files-view"] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "dashboard-summary"] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "dashboard-summary-view"] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "dashboard-summary-liquidation-view"] }),
        );
      }
      if (detailId) refreshes.push(
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-detail", detailId] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-detail-view", detailId] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-files", detailId] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-files-view", detailId] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-detail-pwa", detailId] }),
          queryClient.invalidateQueries({ queryKey: ["user", organizationId, "liquidation-files-pwa", detailId] }),
      );
      if (refreshes.length) void Promise.all(refreshes);
    } else if (feature === "ypop_city_led" || feature === "ypop_org_led") {
      const cancellations: Array<{ queryKey: readonly unknown[]; exact?: boolean }> = [];
      const refreshes: Array<{ queryKey: readonly unknown[]; exact?: boolean }> = [];
      if (kind === "parent" && semesterKey) {
        const key = ["user", organizationId, "ypop", "semester", semesterKey] as const;
        cancellations.push({ queryKey: key, exact: true });
        refreshes.push({ queryKey: key, exact: true });
      }
      if (kind === "parent") {
        refreshes.push({ queryKey: ["user", organizationId, "ypop", "entries-by-semesters"] });
        if (feature === "ypop_org_led" && entryId) {
          // The PPA table is server-paginated and has its own cache separate
          // from the semester summary and activity drawer.
          cancellations.push({ queryKey: ["user", organizationId, "ypop", "ppa-page", entryId] });
          refreshes.push({ queryKey: ["user", organizationId, "ypop", "ppa-page", entryId] });
          refreshes.push({ queryKey: ["user", organizationId, "ypop", "ppa", entryId] });
        }
      }
      if (detailId) {
        const fileKey = feature === "ypop_city_led" ? "event-files" : "org-activity-files";
        const key = ["user", organizationId, "ypop", fileKey, detailId] as const;
        cancellations.push({ queryKey: key, exact: true });
        refreshes.push({ queryKey: key, exact: true });
      }
      await Promise.all(cancellations.map((filters) => queryClient.cancelQueries(filters)));
      await Promise.all(refreshes.map((filters) => queryClient.invalidateQueries(filters)));
      if (kind === "parent") onChange();
      return;
    }
    if (kind === "parent") onChange();
  };
  const add = (table: string, filter: string, callback = onChange) => {
    channel.on("postgres_changes", { event: "INSERT", schema: "public", table, filter }, callback);
    channel.on("postgres_changes", { event: "UPDATE", schema: "public", table, filter }, callback);
  };
  if (feature === "registration") {
    // Default replica identity may send only the row's primary key in OLD.
    // Refresh the signed-in owner's registration projection on any profile row
    // update instead of comparing fields that Realtime might not include.
    add("organization_profiles", `id=eq.${organizationId}`, handleParentChange);
    add("document_submissions", `organization_id=eq.${organizationId}`, (payload) => {
      const row = payload.new as Record<string, unknown>;
      if ((row.submission_scope ?? "registration") === "registration" && !row.renewal_id) handleRelevantChange();
    });
    if (submissionId) add("document_submission_files", `submission_id=eq.${submissionId}`, handleParentChange);
  } else if (feature === "renewals") {
    add("organization_renewals", `organization_id=eq.${organizationId}`, handleParentChange);
    add("organization_accreditations", `organization_id=eq.${organizationId}`, handleParentChange);
    // Renewal approval updates the profile's authoritative accreditation dates.
    // Refresh that owner-scoped projection so renewal eligibility and the
    // current-cycle packet do not continue using the pre-approval expiry.
    if (onOrganizationProfileChange) {
      add("organization_profiles", `id=eq.${organizationId}`, onOrganizationProfileChange);
    }
    add("document_submissions", `organization_id=eq.${organizationId}`, (payload) => {
      const row = payload.new as Record<string, unknown>;
      if (row.submission_scope === "renewal" || row.renewal_id) handleRelevantChange();
    });
    if (submissionId) add("document_submission_files", `submission_id=eq.${submissionId}`, handleParentChange);
  } else if (feature === "budgets") {
    add("budget_requests", `organization_id=eq.${organizationId}`, handleParentChange);
    if (detailId) add("budget_request_files", `budget_request_id=eq.${detailId}`, () => handleRelevantChange("file"));
  } else if (feature === "liquidations") {
    add("liquidation_reports", `organization_id=eq.${organizationId}`, handleParentChange);
    if (detailId) add("liquidation_report_files", `liquidation_report_id=eq.${detailId}`, () => handleRelevantChange("file"));
  } else if (feature === "inquiries") {
    add("inquiries", `organization_id=eq.${organizationId}`, handleParentChange);
  } else if (feature === "ypop_city_led") {
    if (semesterKey) {
      add("ypop_periods", `semester_key=eq.${semesterKey}`, handleParentChange);
      add("ypop_city_activities", `semester_key=eq.${semesterKey}`, handleParentChange);
    }
    const selectedActivityIds = new Set(activityIds);
    add("ypop_event_participations", `organization_id=eq.${organizationId}`, (payload) => {
      const row = payload.new as Record<string, unknown>;
      if (!semesterKey || selectedActivityIds.has(String(row.activity_id ?? ""))) handleRelevantChange();
    });
    add("ypop_entries", `organization_id=eq.${organizationId}`, (payload) => {
      const row = payload.new as Record<string, unknown>;
      if (!semesterKey || row.semester === semesterKey) handleRelevantChange();
    });
    if (detailId) add("ypop_event_files", `participation_id=eq.${detailId}`, () => handleRelevantChange("file"));
  } else {
    add("ypop_org_activities", `organization_id=eq.${organizationId}`, (payload) => {
      const row = payload.new as Record<string, unknown>;
      if (!semesterKey || !entryId || row.ypop_entry_id === entryId) handleRelevantChange();
    });
    add("ypop_entries", `organization_id=eq.${organizationId}`, (payload) => {
      const row = payload.new as Record<string, unknown>;
      if (!semesterKey || row.semester === semesterKey) handleRelevantChange();
    });
    if (detailId) add("ypop_org_activity_files", `org_activity_id=eq.${detailId}`, () => handleRelevantChange("file"));
  }
  channel.subscribe((status, error) => onStatus?.(status, error));
  return () => {
    if (changeTimer !== null) window.clearTimeout(changeTimer);
    void supabase?.removeChannel(channel);
  };
};

/** Child renewal file rows are filtered by their parent packet and RLS ownership. */
export const subscribeToRenewalSubmissionFileChangesInSupabase = (
  submissionId: string,
  onChange: () => void,
  onStatus?: (status: string, error?: Error | null) => void,
): (() => void) => {
  if (!supabase || !submissionId) return () => undefined;
  const channel = supabase.channel(`organization-renewal-files-${submissionId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "document_submission_files", filter: `submission_id=eq.${submissionId}` }, onChange)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "document_submission_files", filter: `submission_id=eq.${submissionId}` }, onChange)
    .subscribe((status, error) => onStatus?.(status, error));
  return () => { void supabase?.removeChannel(channel); };
};

/** Subscribe only to files for the one YPOP proof/PPA currently open. The
 * parent foreign key is the Postgres Changes filter; the existing table RLS
 * policy remains the final organization-ownership boundary. */
export const subscribeToOrganizationYpopFileChangesInSupabase = (
  organizationId: string,
  lane: "city_led" | "org_led",
  parentId: string,
  onChange: () => void,
  onStatus?: (status: string, error?: Error | null) => void,
): (() => void) => {
  if (!supabase || !organizationId || !parentId) return () => undefined;
  const isCity = lane === "city_led";
  const table = isCity ? "ypop_event_files" : "ypop_org_activity_files";
  const parentColumn = isCity ? "participation_id" : "org_activity_id";
  const fileQueryKey = ["user", organizationId, "ypop", isCity ? "event-files" : "org-activity-files", parentId] as const;
  const refreshFiles = async () => {
    await queryClient.cancelQueries({ queryKey: fileQueryKey, exact: true });
    await queryClient.invalidateQueries({ queryKey: fileQueryKey, exact: true });
    onChange();
  };
  const channel = supabase.channel(`organization-ypop-${lane}-files-${organizationId}-${parentId}`);
  channel
    .on("postgres_changes", { event: "INSERT", schema: "public", table, filter: `${parentColumn}=eq.${parentId}` }, () => { void refreshFiles(); })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table, filter: `${parentColumn}=eq.${parentId}` }, () => { void refreshFiles(); })
    .subscribe((status, error) => onStatus?.(status, error));
  return () => { void supabase?.removeChannel(channel); };
};

export type AdminDashboardSummary = {
  summary: Record<string, number>;
  budgetTotals: { approved: number; released: number; liquidated: number };
  needsAttention: Array<{
    id: string;
    kind: "registration" | "budget" | "liquidation" | "inquiry" | string;
    organizationName: string;
    actionText: string;
    verb: "Submitted" | "Received";
    timestamp: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    description: string;
    createdAt: string;
  }>;
};

export type AdminRecentNotifications = {
  unreadCount: number;
  notifications: NotificationRecord[];
};

/** Small, permission-scoped counts for the persistent admin sidebar. */
export const fetchAdminSidebarCounts = async (): Promise<Record<string, number>> => {
  const session = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_get_sidebar_counts", { _session_token: session.sessionToken });
  if (error) throw new Error(error.message || "Unable to load sidebar counts.");
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid sidebar counts response.");
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, Number(value)]));
};

/** Broadcast contains only an empty invalidation signal, never records or counts.
 * Actual counts are fetched through the authenticated admin RPC. */
export const subscribeToAdminSidebarChanges = (onChange: () => void): (() => void) => {
  if (!supabase) return () => undefined;
  let timer: number | null = null;
  let disposed = false;
  const scheduleRefresh = () => {
    if (disposed || timer !== null) return;
    timer = window.setTimeout(() => {
      timer = null;
      if (!disposed) onChange();
    }, 150);
  };
  const channel = supabase.channel("admin-sidebar-refresh", { config: { private: false } })
    .on("broadcast", { event: "counts-changed" }, scheduleRefresh)
    .subscribe((status) => { if (status === "SUBSCRIBED") scheduleRefresh(); });
  return () => {
    disposed = true;
    if (timer !== null) window.clearTimeout(timer);
    void supabase!.removeChannel(channel);
  };
};

/** Fetch aggregate dashboard metrics and bounded recent activity. */
export const fetchAdminDashboardSummary = async (fiscalYear?: number): Promise<AdminDashboardSummary> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession?.sessionToken) throw new Error("Please sign in with the seeded admin account first.");

  const { data, error } = await supabase.rpc("admin_get_dashboard_summary", {
    _session_token: adminSession.sessionToken,
    _fiscal_year: fiscalYear ?? null,
  });
  if (error) throw new Error(error.message || "Unable to load the admin dashboard.");
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("The admin dashboard response was invalid.");
  }

  const response = data as Partial<AdminDashboardSummary>;
  const summary = Object.fromEntries(
    Object.entries(response.summary ?? {}).map(([key, value]) => [key, Number(value)]),
  );
  const budgetTotals = response.budgetTotals ?? { approved: 0, released: 0, liquidated: 0 };
  return {
    summary,
    budgetTotals: {
      approved: Number(budgetTotals.approved ?? 0),
      released: Number(budgetTotals.released ?? 0),
      liquidated: Number(budgetTotals.liquidated ?? 0),
    },
    needsAttention: Array.isArray(response.needsAttention) ? response.needsAttention : [],
    recentActivity: Array.isArray(response.recentActivity) ? response.recentActivity : [],
  };
};

/** Persist read status for the current admin's notifications, or one owned notification. */
export const markAdminNotificationsReadInSupabase = async (notificationId?: string): Promise<void> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = getAuthenticatedAdminSession();
  const { error } = await supabase.rpc("admin_mark_notifications_read", {
    _session_token: adminSession.sessionToken,
    _notification_id: notificationId ?? null,
  });
  if (error) throw new Error(error.message || "Unable to mark notifications as read.");
};

export const fetchAdminRecentNotifications = async (): Promise<AdminRecentNotifications> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession?.sessionToken) throw new Error("Please sign in with the seeded admin account first.");
  const { data, error } = await supabase.rpc("admin_get_recent_notifications", {
    _session_token: adminSession.sessionToken,
    _limit: 25,
  });
  if (error) throw new Error(error.message || "Unable to load admin notifications.");
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("The admin notification response was invalid.");
  }
  const response = data as { unreadCount?: number; notifications?: NotificationRow[] };
  return {
    unreadCount: Number(response.unreadCount ?? 0),
    notifications: (response.notifications ?? []).map(mapNotification),
  };
};

/** Load registration document metadata for one organization in the registry. */
export const fetchAdminYorpRegistrationDocuments = async (
  organizationId: string,
  signal: AbortSignal,
): Promise<SubmissionFile[]> => {
  const session = readAdminSession();
  if (!supabase || !session) throw new Error("Administrator sign-in is required.");
  const { data, error } = await supabase.rpc("admin_get_yorp_registration_documents", {
    _session_token: session.sessionToken,
    _organization_id: organizationId,
  }).abortSignal(signal);
  if (error) throw toQueryError(error);
  if (!data || typeof data !== "object" || !Array.isArray(data.files)) {
    throw new Error("The registry documents response was invalid.");
  }
  return (data.files as DocumentSubmissionFileRow[]).flatMap(row => {
    const file = mapDocumentFile(row);
    return file ? [file] : [];
  });
};

/** Load the private registration review payload only after a row is opened. */
export const fetchAdminRegistrationDetail = async (organizationId: string): Promise<Partial<LydoSeedState>> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession?.sessionToken) throw new Error("Please sign in with the seeded admin account first.");

  const { data, error } = await supabase.rpc("admin_get_registration_detail", {
    _session_token: adminSession.sessionToken,
    _organization_id: organizationId,
  });
  if (error) throw new Error(error.message || "Unable to load registration details.");
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("The registration detail response was invalid.");
  }
  const response = data as {
    profile?: OrganizationProfileRow | null;
    submission?: DocumentSubmissionRow | null;
    files?: DocumentSubmissionFileRow[];
    activity?: ActivityLogRow[];
    templates?: RequiredDocumentTypeRow[];
  };
  if (!response.profile?.id || !response.profile.user_id) {
    throw new Error("The registration detail response did not contain its profile.");
  }

  return {
    organizationProfiles: [mapOrganizationProfile(response.profile)],
    documentSubmissions: response.submission ? [mapDocumentSubmission(response.submission)] : [],
    documentSubmissionFiles: (response.files ?? []).flatMap((row) => {
      const file = mapDocumentFile(row);
      return file ? [file] : [];
    }),
    activityLogs: (response.activity ?? []).map(mapActivityLog),
    templates: (response.templates ?? [])
      .map(mapTemplate)
      .filter((template): template is TemplateRecord => Boolean(template) && !legacyRemovedTemplateNames.has(template.name)),
  };
};

/** Fetch one server-filtered and server-paginated admin list page. */
export const fetchAdminPortalListPage = async (
  filters: AdminPortalListFilters,
): Promise<AdminPortalListPage<AdminPortalRegistrationListRow | InquiryRecord | ActivityLog>> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession?.sessionToken) throw new Error("Please sign in with the seeded admin account first.");

  const { data, error } = await supabase.rpc("admin_get_portal_list_page", {
    _session_token: adminSession.sessionToken,
    _resource: filters.resource,
    _page: filters.page,
    _page_size: filters.pageSize ?? 10,
    _search: filters.search?.trim() || null,
    _status: filters.status ?? "all",
    _district: filters.district ?? "all",
    _barangay: filters.barangay ?? "all",
    _classification: filters.classification ?? "all",
    _date_range: filters.dateRange ?? "all",
    _sort: filters.sort ?? "newest",
    _start_date: filters.startDate ?? null,
    _end_date_exclusive: filters.endDateExclusive ?? null,
    ...(filters.quarter != null ? { _quarter: filters.quarter } : {}),
  });
  if (error) throw new Error(error.message || "Unable to load the admin list.");
  if (!data || typeof data !== "object" || Array.isArray(data) || !Array.isArray((data as { rows?: unknown }).rows)) {
    throw new Error("The admin list response was invalid.");
  }

  const response = data as {
    rows?: Array<Record<string, unknown>>;
    totalCount?: number;
    page?: number;
    pageSize?: number;
    summary?: Record<string, number>;
  };
  const rawRows = Array.isArray(response.rows) ? response.rows : [];
  const rows = filters.resource === "registrations"
    ? rawRows.flatMap((row) => {
        const summary = row.profile as Partial<OrganizationProfileRow> | null;
        if (!summary?.id || !summary.created_at || !summary.updated_at || !summary.organization_name || !summary.user_id) {
          return [];
        }
        const profile: OrganizationProfileRow = {
          id: summary.id,
          reference_id: summary.reference_id ?? null,
          user_id: summary.user_id,
          organization_name: summary.organization_name,
          organization_email: summary.organization_email ?? "",
          contact_number: "",
          district: summary.district ?? "",
          barangay: summary.barangay ?? "",
          is_existing_organization: summary.is_existing_organization ?? false,
          organization_identifier_number: summary.organization_identifier_number ?? null,
          registration_type: summary.registration_type ?? null,
          urn: summary.urn ?? null,
          major_classification: summary.major_classification ?? null,
          sub_classification: null,
          advocacies: [],
          adviser_name: "",
          representative_name: "",
          address: "",
          facebook_page_url: "",
          profile_status: summary.profile_status ?? "pending_review",
          verified_at: null,
          internal_notes: null,
          yorp_registered_year: null,
          yorp_renewed_year: null,
          created_at: summary.created_at,
          updated_at: summary.updated_at,
        };
        return [{
          profile: mapOrganizationProfile(profile),
          submittedDocumentCount: Number(row.submitted_document_count ?? 0),
        }];
      })
    : filters.resource === "inquiries"
      ? rawRows.map((row) => mapInquiry(row as unknown as InquiryRow))
      : rawRows.map((row) => mapActivityLog(row as unknown as ActivityLogRow));

  return {
    rows,
    totalCount: Number(response.totalCount ?? 0),
    page: Number(response.page ?? filters.page),
    pageSize: Number(response.pageSize ?? filters.pageSize ?? 10),
    summary: Object.fromEntries(
      Object.entries(response.summary ?? {}).map(([key, value]) => [key, Number(value)]),
    ),
  };
};

/** Retrieve matching activity pages only for an explicit export action. */
export const fetchAllAdminActivityLogs = async (filters: {
  search?: string;
  category?: string;
  dateRange?: string;
  startDate?: string | null;
  endDateExclusive?: string | null;
  quarter?: number | null;
}): Promise<ActivityLog[]> => {
  const pageSize = 50;
  const firstPage = await fetchAdminPortalListPage({
    resource: "activity_logs",
    page: 0,
    pageSize,
    search: filters.search,
    status: filters.category,
    dateRange: filters.dateRange,
    startDate: filters.startDate,
    endDateExclusive: filters.endDateExclusive,
    quarter: filters.quarter,
  });
  const firstRows = firstPage.rows.filter((row): row is ActivityLog => "action" in row);
  const totalPages = Math.ceil(firstPage.totalCount / pageSize);
  const rows = [...firstRows];
  for (let page = 1; page < totalPages; page += 1) {
    const nextPage = await fetchAdminPortalListPage({
      resource: "activity_logs",
      page,
      pageSize,
      search: filters.search,
      status: filters.category,
      dateRange: filters.dateRange,
      startDate: filters.startDate,
      endDateExclusive: filters.endDateExclusive,
    quarter: filters.quarter,
    });
    rows.push(...nextPage.rows.filter((row): row is ActivityLog => "action" in row));
  }
  return rows;
};

/** Only called by Generate Export. These temporary metadata rows never enter the portal store. */
export const fetchAllAdminReviewResourceRows = async (
  filters: Omit<AdminReviewResourceFilters, "page" | "pageSize">,
): Promise<Array<AdminBudgetReviewRow | AdminLiquidationReviewRow>> => {
  const sessionToken = readAdminSession()?.sessionToken;
  const pageSize = 50; // Same ceiling enforced by the RPC.
  const first = await fetchAdminReviewResourcePage({ ...filters, page: 0, pageSize });
  const rows = [...first.rows];
  const pages = Math.ceil(first.totalCount / pageSize);
  for (let page = 1; page < pages; page += 1) {
    if (readAdminSession()?.sessionToken !== sessionToken) throw new Error("Administrator session changed.");
    const next = await fetchAdminReviewResourcePage({ ...filters, page, pageSize });
    if (!next.rows.length) break; // Queue may shrink while export is running.
    rows.push(...next.rows);
  }
  if (readAdminSession()?.sessionToken !== sessionToken) throw new Error("Administrator session changed.");
  return [...new Map(rows.map(row => ["request" in row ? row.request.id : row.report.id, row])).values()];
};

const adminPortalSectionStateKeys = new Set([
  "renewals",
  "budget-utilization",
  "liquidation-monitoring",
  "budget-monitoring",
  "news-releases",
  "templates",
  "yorp-registry",
  "ypop-validation",
]);

/** Complete totals for one reporting period, loaded in bounded metadata pages.
 * Kept in the page query cache, never merged into the portal-wide store. */
export const loadAdminBudgetMonitoringPeriod = async (
  period: { mode: "fiscal_year" | "custom" | "all" | "quarter_all_years"; fiscalYear: number; startDate?: string; endDate?: string; quarter?: number },
  signal: AbortSignal,
): Promise<Partial<LydoSeedState> & { fiscalYears: number[] }> => {
  const session = readAdminSession();
  if (!supabase || !session) throw new Error("Administrator sign-in is required.");
  const budgets = new Map<string, BudgetRequest>();
  const organizations = new Map<string, OrganizationProfile>();
  const liquidations = new Map<string, LiquidationReport>();
  let cursor: { created_at: string; id: string } | null = null;
  let fiscalYears: number[] = [];
  do {
    signal.throwIfAborted();
    if (readAdminSession()?.sessionToken !== session.sessionToken) throw new Error("Administrator session changed.");
    const { data, error } = await supabase.rpc("admin_get_budget_monitoring_page", {
      _session_token: session.sessionToken,
      _fiscal_year: period.mode === "all" || period.mode === "quarter_all_years" ? null : period.fiscalYear,
      ...(period.mode === "quarter_all_years" ? { _quarter: period.quarter } : {}),
      _start_date: period.mode === "custom" ? period.startDate : null,
      _end_date: period.mode === "custom" ? period.endDate : null,
      _after_created_at: cursor?.created_at ?? null,
      _after_id: cursor?.id ?? null,
    }).abortSignal(signal);
    if (error) throw toQueryError(error);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid Budget Monitoring response.");
    const page = data as AdminPortalSectionStateData & {
      next_cursor: { created_at: string; id: string } | null;
      fiscal_years: number[];
    };
    for (const row of page.budget_requests ?? []) budgets.set(row.id, mapBudgetRequest(row));
    for (const row of page.organization_profiles ?? []) organizations.set(row.id, mapOrganizationProfile(row));
    for (const row of page.liquidation_reports ?? []) liquidations.set(row.id, mapLiquidationReport(row));
    if (!cursor) fiscalYears = page.fiscal_years ?? [];
    if (page.next_cursor && cursor?.id === page.next_cursor.id) throw new Error("Budget Monitoring cursor did not advance.");
    cursor = page.next_cursor;
  } while (cursor);
  return {
    budgetRequests: [...budgets.values()], organizationProfiles: [...organizations.values()],
    liquidationReports: [...liquidations.values()], budgetRequestFiles: [], liquidationReportFiles: [],
    fiscalYears,
  };
};

/** Fetch only the data required by one admin section; never hydrate the portal-wide snapshot. */
export const loadAdminPortalSectionState = async (
  section: string,
): Promise<Partial<LydoSeedState> | null> => {
  if (!supabase || !adminPortalSectionStateKeys.has(section)) return null;

  const adminSession = readAdminSession();
  if (!adminSession?.sessionToken) return null;

  const sectionStateRequest = supabase.rpc("admin_get_portal_section_state", {
    _session_token: adminSession.sessionToken,
    _section: section,
  });
  const categoriesRequest = section === "templates"
    ? supabase.rpc("admin_get_template_categories", { _session_token: adminSession.sessionToken })
    : Promise.resolve(null);
  const [{ data, error }, categoriesResult] = await Promise.all([sectionStateRequest, categoriesRequest]);
  if (error) {
    console.warn(`Admin section state RPC failed for ${section}:`, error.message);
    return null;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  const sectionData = data as AdminPortalSectionStateData;
  const state: Partial<LydoSeedState> = {};
  if (Array.isArray(sectionData.organization_profiles)) state.organizationProfiles = sectionData.organization_profiles.map(mapOrganizationProfile);
  if (Array.isArray(sectionData.document_submissions)) state.documentSubmissions = sectionData.document_submissions.map(mapDocumentSubmission);
  if (Array.isArray(sectionData.document_submission_files)) {
    state.documentSubmissionFiles = sectionData.document_submission_files
      .map(mapDocumentFile)
      .filter((file): file is SubmissionFile => Boolean(file));
  }
  if (Array.isArray(sectionData.budget_requests)) state.budgetRequests = sectionData.budget_requests.map(mapBudgetRequest);
  if (Array.isArray(sectionData.budget_request_files)) state.budgetRequestFiles = sectionData.budget_request_files.map(mapBudgetRequestFile);
  if (Array.isArray(sectionData.liquidation_reports)) state.liquidationReports = sectionData.liquidation_reports.map(mapLiquidationReport);
  if (Array.isArray(sectionData.liquidation_report_files)) state.liquidationReportFiles = sectionData.liquidation_report_files.map(mapLiquidationReportFile);
  if (Array.isArray(sectionData.news_releases)) state.newsReleases = sectionData.news_releases.map(mapNewsRelease);
  if (Array.isArray(sectionData.news_categories)) state.newsCategories = sectionData.news_categories.map(mapNewsCategory);
  if (Array.isArray(sectionData.transparency_posts)) state.transparencyPosts = sectionData.transparency_posts.map(mapTransparencyPost);
  if (Array.isArray(sectionData.compliance_remarks)) state.complianceRemarks = sectionData.compliance_remarks.map(mapComplianceRemark);
  if (Array.isArray(sectionData.activity_logs)) state.activityLogs = sectionData.activity_logs.map(mapActivityLog);
  if (Array.isArray(sectionData.templates)) {
    state.templates = sectionData.templates
      .map(mapTemplate)
      .filter((template): template is TemplateRecord => Boolean(template) && !legacyRemovedTemplateNames.has(template.name));
  }
  if (section === "templates") {
    if (categoriesResult?.error) {
      console.warn("Admin template category registry RPC failed:", categoriesResult.error.message);
    } else if (Array.isArray(categoriesResult?.data)) {
      state.customTemplateCategories = (categoriesResult.data as AdminTemplateCategoryRow[])
        .map((row) => normalizeTemplateCategoryKey(row.normalized_name ?? ""))
        .filter((category) => Boolean(category) && !isSystemTemplateCategory(category));
    }
  }
  if (Array.isArray(sectionData.ypop_periods)) state.ypopPeriods = sectionData.ypop_periods.map(mapYpopPeriod);
  if (Array.isArray(sectionData.ypop_city_activities)) state.ypopCityActivities = sectionData.ypop_city_activities.map(mapYpopCityActivity);
  if (Array.isArray(sectionData.ypop_entries)) state.ypopEntries = sectionData.ypop_entries.map(mapYpopEntry);
  if (Array.isArray(sectionData.ypop_files)) state.ypopFiles = sectionData.ypop_files.map(mapYpopFile);
  if (Array.isArray(sectionData.ypop_event_participations)) {
    state.ypopEventParticipations = sectionData.ypop_event_participations
      .map(mapYpopEventParticipation)
      .filter((participation) => participation.status && participation.status !== "draft");
  }
  if (Array.isArray(sectionData.ypop_event_files)) {
    const reviewableIds = new Set((state.ypopEventParticipations ?? []).map((participation) => participation.id));
    state.ypopEventFiles = sectionData.ypop_event_files.map(mapYpopEventFile).filter((file) => reviewableIds.has(file.participationId));
  }
  if (Array.isArray(sectionData.ypop_org_activities)) {
    state.ypopOrgActivities = sectionData.ypop_org_activities
      .map(mapYpopOrgActivity)
      .filter((activity) => activity.status && activity.status !== "draft");
  }
  if (Array.isArray(sectionData.ypop_org_activity_files)) {
    const reviewableIds = new Set((state.ypopOrgActivities ?? []).map((activity) => activity.id));
    state.ypopOrgActivityFiles = sectionData.ypop_org_activity_files.map(mapYpopOrgActivityFile).filter((file) => reviewableIds.has(file.orgActivityId));
  }
  return state;
};

/** Persist the standalone Forms & Templates category registry through admin-session RPCs. */
export const createAdminTemplateCategoryInSupabase = async (category: string): Promise<string> => {
  const normalized = normalizeTemplateCategoryKey(category);
  if (!normalized) throw new Error("Category name cannot be empty.");
  if (isSystemTemplateCategory(normalized)) throw new Error("System categories cannot be added as custom categories.");
  if (!supabase) return normalized;

  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase.rpc("admin_create_template_category", {
    _session_token: adminSession.sessionToken,
    _normalized_name: normalized,
  });
  if (error) throw new Error(error.message);
  const persistedName = typeof data === "string" ? data : null;
  if (!persistedName) throw new Error("The category could not be saved.");
  return normalizeTemplateCategoryKey(persistedName);
};

export const deleteAdminTemplateCategoryInSupabase = async (category: string): Promise<void> => {
  const normalized = normalizeTemplateCategoryKey(category);
  if (!normalized) throw new Error("Category name is invalid.");
  if (isSystemTemplateCategory(normalized)) throw new Error("System categories cannot be deleted.");
  if (!supabase) return;

  const adminSession = getAuthenticatedAdminSession();
  const { error } = await supabase.rpc("admin_delete_template_category", {
    _session_token: adminSession.sessionToken,
    _normalized_name: normalized,
  });
  if (error) throw new Error(error.message);
};

export const loadAdminYpopState = async (): Promise<Partial<LydoSeedState> | null> => {
  if (!supabase) return null;
  const periods = await fetchAdminYpopValidationPeriods();
  return { ypopPeriods: periods.map(({ period }) => period) };
};

export const markNotificationReadInSupabase = async (notificationId: string) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) throw new Error("Please sign in with your organization account first.");

  const { error } = await supabase!
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", session.user.id);

  if (error) throw new Error(error.message);
};

export const markAllNotificationsReadInSupabase = async () => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) throw new Error("Please sign in with your organization account first.");

  const { error } = await supabase!
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", session.user.id)
    .eq("is_read", false);

  if (error) throw new Error(error.message);
};

export const upsertOrganizationProfileInSupabase = async (profile: OrganizationProfile) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const zipError = validateZipCode(profile.addressZipCode);
  if (zipError) throw new Error(zipError);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) throw new Error("Please sign in with your organization account first.");

  const headquartersBarangay = profile.addressBarangay?.trim() || profile.barangay.trim();
  const headquartersDistrict = getPasigDistrictForBarangay(headquartersBarangay);
  if (!headquartersDistrict) {
    throw new Error("Select a valid Pasig City headquarters Barangay before saving.");
  }

  const existingProfile = await fetchOrganizationProfile(session.user.id);
  if (existingProfile) {
    assertOrganizationNotSuspended(existingProfile, "Profile update");
  }

  const isGoogleUser =
    session.user.app_metadata?.provider === "google" ||
    (session.user.app_metadata?.providers as string[] | undefined)?.includes("google") ||
    session.user.identities?.some((id) => id.provider === "google");

  const authoritativeEmail =
    isGoogleUser && session.user.email
      ? session.user.email.trim().toLowerCase()
      : profile.organizationEmail.trim() || session.user.email?.trim() || "";

  const payload = {
    user_id: session.user.id,
    organization_name: profile.organizationName.trim(),
    organization_email: authoritativeEmail,
    additional_emails: (profile.additionalEmails ?? []).map((e) => e.trim()).filter(Boolean),
    contact_number: profile.contactNumber.trim(),
    additional_contact_numbers: (profile.additionalContactNumbers ?? []).map((c) => c.trim()).filter(Boolean),
    district: headquartersDistrict,
    barangay: headquartersBarangay,
    is_existing_organization: Boolean(profile.isExistingOrganization),
    organization_identifier_number: profile.isExistingOrganization || profile.profileStatus === "verified"
      ? (profile.organizationIdentifierNumber?.trim() || profile.urn?.trim() || "")
      : "",
    registration_type: profile.registrationType,
    urn: profile.isExistingOrganization || profile.profileStatus === "verified"
      ? (profile.urn?.trim() || (profile.isExistingOrganization ? profile.organizationIdentifierNumber?.trim() : null) || null)
      : null,
    major_classification: profile.majorClassification || null,
    sub_classification: profile.subClassification || null,
    advocacies: profile.advocacies,
    representative_first_name: profile.representativeFirstName?.trim() || null,
    representative_middle_name: profile.representativeMiddleName?.trim() || null,
    representative_last_name: profile.representativeLastName?.trim() || null,
    representative_suffix: profile.representativeSuffix?.trim() || null,
    adviser_first_name: profile.adviserFirstName?.trim() || null,
    adviser_middle_name: profile.adviserMiddleName?.trim() || null,
    adviser_last_name: profile.adviserLastName?.trim() || null,
    adviser_suffix: profile.adviserSuffix?.trim() || null,
    address_unit_building: profile.addressUnitBuilding?.trim() || null,
    address_street: profile.addressStreet?.trim() || null,
    address_subdivision: profile.addressSubdivision?.trim() || null,
    address_barangay: headquartersBarangay,
    address_city: profile.addressCity?.trim() || "Pasig City",
    address_province: profile.addressProvince?.trim() || "Metro Manila",
    address_zip_code: profile.addressZipCode?.trim() || null,
    adviser_name: profile.adviserName.trim() || null,
    representative_name: profile.representativeName.trim() || null,
    address: profile.address.trim() || null,
    facebook_page_url: profile.facebookPageUrl.trim() || null,
    profile_image_url: profile.profileImageUrl?.trim() || null,
    directory_visibility: Boolean(profile.directoryVisibility),
    directory_show_representative: Boolean(profile.directoryShowRepresentative),
    directory_show_adviser: Boolean(profile.directoryShowAdviser),
    profile_status: profile.profileStatus,
    verified_at: profile.verifiedAt.trim() || null,
    internal_notes: profile.internalNotes.trim() || null,
  };

  const { data, error } = await supabase
    .from("organization_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select(ORGANIZATION_PROFILE_COLUMNS)
    .single();

  if (error || !data) {
    if (
      error?.message?.includes("organization_profiles") &&
      [
        "advocacies",
        "is_existing_organization",
        "organization_identifier_number",
        "major_classification",
        "sub_classification",
        "district",
        "profile_image_url",
        "profile_status",
      ].some((columnName) => error.message.includes(columnName))
    ) {
      throw new Error(
        "The database schema is outdated. Run supabase/repair_organization_profiles_schema.sql in Supabase, then try saving the organization profile again.",
      );
    }

    throw new Error(error?.message ?? "Failed to save organization profile.");
  }

  return mapOrganizationProfile(data as OrganizationProfileRow);
};

export const saveOrganizationProfileInSupabase = upsertOrganizationProfileInSupabase;

export const updateOrganizationProfileReviewInSupabase = async (
  organizationProfileId: string,
  patch: Pick<OrganizationProfile, "profileStatus" | "verifiedAt">,
) => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("update_admin_organization_profile_review", {
    _session_token: adminSession.sessionToken,
    _organization_profile_id: organizationProfileId,
    _profile_status: patch.profileStatus,
    _verified_at: patch.verifiedAt || null,
  });

  const updatedRow = Array.isArray(data) ? data[0] : null;
  if (error || !updatedRow) throw new Error(error?.message ?? "Failed to update the organization review status.");
  return mapOrganizationProfile(updatedRow as OrganizationProfileRow);
};

export const updateDocumentSubmissionFileReviewInSupabase = async (params: {
  fileId: string;
  status: DocumentSubmission["status"];
  adminRemarks?: string;
}) => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("update_admin_document_submission_file_review", {
    _session_token: adminSession.sessionToken,
    _file_id: params.fileId,
    _status: params.status,
    // An empty string deliberately clears stale submission placeholders for
    // statuses that are not actionable admin feedback, including on databases
    // running the earlier RPC.
    _admin_remarks:
      params.status === "needs_revision" || params.status === "rejected_red"
        ? params.adminRemarks?.trim() || null
        : "",
  });

  const updatedRow = Array.isArray(data) ? data[0] : null;
  if (error || !updatedRow) throw new Error(error?.message ?? "Failed to update the document file review.");
  return mapDocumentFile(updatedRow as DocumentSubmissionFileRow);
};

export const reviewOrganizationUrnInSupabase = async (params: {
  organizationId: string;
  expectedUrn: string;
  decision: "verified" | "needs_correction" | "rejected";
  remarks?: string;
}) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase.rpc("review_organization_urn", {
    _session_token: adminSession.sessionToken,
    _organization_id: params.organizationId,
    _expected_urn: params.expectedUrn,
    _decision: params.decision,
    _remarks: params.remarks?.trim() || null,
  });
  if (error || !data) throw new Error(error?.message ?? "The URN review could not be saved.");
  return mapOrganizationProfile((Array.isArray(data) ? data[0] : data) as OrganizationProfileRow);
};

export const resubmitOrganizationUrnInSupabase = async (urn: string) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("resubmit_organization_urn", { _urn: urn });
  if (error || !data) throw new Error(error?.message ?? "The corrected URN could not be submitted.");
  return mapOrganizationProfile(data as OrganizationProfileRow);
};

const deriveDocumentSubmissionStatus = (
  statuses: DocumentSubmission["status"][],
  submitMode: "draft" | "review" = "review",
): DocumentSubmission["status"] => {
  if (!statuses.length) return submitMode === "draft" ? "draft" : "not_started";
  if (statuses.includes("rejected_red")) return "rejected_red";
  if (statuses.includes("needs_revision")) return "needs_revision";
  if (statuses.every((status) => status === "approved_green")) return "approved_green";
  if (statuses.some((status) => status === "under_admin_review" || status === "submitted" || status === "ready_for_review")) {
    return "under_admin_review";
  }
  if (statuses.some((status) => status === "uploaded")) return "uploaded";
  if (statuses.some((status) => status === "draft")) return "draft";
  return submitMode === "draft" ? "draft" : "under_admin_review";
};

export type BatchOrganizationDocumentUploadInput = {
  documentTypeId?: string;
  documentTypeName: string;
  file: File;
  validationStatus?: SubmissionFile["validationStatus"];
  adminRemarks?: string;
};

export type BatchOrganizationDocumentUploadResult = {
  documentTypeId: string;
  documentTypeName: string;
  fileName: string;
  success: boolean;
  submissionId?: string;
  file?: SubmissionFile;
  error?: string;
};

export type BatchDocumentReviewDecision = {
  fileId: string;
  status: DocumentSubmission["status"];
  adminRemarks?: string;
  expectedUpdatedAt?: string;
};

export type BatchDocumentReviewResult = {
  fileId: string;
  success: boolean;
  file?: SubmissionFile;
  error?: string;
};

const ensureDocumentSubmission = async (organizationId: string, userId: string) => {
  const existingSubmission = await fetchLatestSubmission(organizationId);
  if (existingSubmission) return existingSubmission;

  const { data, error } = await supabase!
    .from("document_submissions")
    .insert({
      organization_id: organizationId,
      submitted_by: userId,
      status: "draft",
      user_confirmed: false,
    })
    .select(DOCUMENT_SUBMISSION_COLUMNS)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create document submission.");
  return data as DocumentSubmissionRow;
};

const fetchRequiredDocumentTypeRowByName = async (name: string) => {
  const { data, error } = await supabase!
    .from("required_document_types")
    .select("id,name,description,template_url,template_description,sort_order,is_required,is_active,template_scope,updated_at")
    .eq("name", name)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Required document type not found for ${name}.`);
  return data as RequiredDocumentTypeRow;
};

const resolveTemplateDatabaseId = async (databaseId: string, name?: string) => {
  if (UUID_PATTERN.test(databaseId)) return databaseId;
  if (name?.trim()) {
    const row = await fetchRequiredDocumentTypeRowByName(name.trim());
    return row.id;
  }
  return databaseId;
};

export interface OrganizationDocumentUploadContext {
  session?: { user: { id: string } } | null;
  organizationProfile?: OrganizationProfileRow | null;
  documentTypeRow?: RequiredDocumentTypeRow;
  submission?: DocumentSubmissionRow;
  revisionSubmitMode?: "draft" | "review";
}

export const submitOrganizationDocumentToSupabase = async (params: {
  documentTypeId?: string;
  documentTypeName: string;
  file: File;
  validationStatus?: SubmissionFile["validationStatus"];
  adminRemarks?: string;
  submitMode?: "draft" | "review";
  context?: OrganizationDocumentUploadContext;
}) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  await assertPdfUpload(params.file, "Document submission", ORGANIZATION_DOCUMENT_MAX_BYTES);

  const session =
    params.context?.session !== undefined
      ? params.context.session
      : (await supabase.auth.getSession()).data.session;

  if (!session?.user) throw new Error("Please sign in with your organization account first.");

  const organizationProfile =
    params.context?.organizationProfile !== undefined
      ? params.context.organizationProfile
      : await fetchOrganizationProfile(session.user.id);

  if (!organizationProfile) {
    throw new Error("No organization profile was found for this account.");
  }

  assertOrganizationNotSuspended(organizationProfile, "Document submission");

  let documentTypeRow: RequiredDocumentTypeRow;
  if (params.context?.documentTypeRow) {
    documentTypeRow = params.context.documentTypeRow;
  } else if (params.documentTypeId) {
    const resolvedId = await resolveTemplateDatabaseId(params.documentTypeId, params.documentTypeName);
    const { data, error } = await supabase!
      .from("required_document_types")
      .select("id,name,description,template_url,template_description,sort_order,is_required,is_active,template_scope,updated_at")
      .eq("id", resolvedId)
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? `Required document type not found for ${params.documentTypeName}.`);
    }
    documentTypeRow = data as RequiredDocumentTypeRow;
  } else {
    documentTypeRow = await fetchRequiredDocumentTypeRowByName(params.documentTypeName);
  }

  const submission =
    params.context?.submission !== undefined
      ? params.context.submission
      : await ensureDocumentSubmission(organizationProfile.id, session.user.id);

  if (submission.status === "rejected_red") {
    throw new Error("This organization account is permanently suspended due to a rejected registration document.");
  }

  const { data: existingRows, error: existingRowsError } = await supabase!
    .from("document_submission_files")
    .select("id,file_url,admin_status,updated_at")
    .eq("submission_id", submission.id)
    .eq("document_type_id", documentTypeRow.id);

  if (existingRowsError) throw new Error(existingRowsError.message);

  const existingTargetFile = existingRows?.[0];
  if (existingTargetFile) {
    const fileStatus = existingTargetFile.admin_status;
    if (fileStatus === "rejected_red") {
      throw new Error("This rejected document cannot be re-uploaded. The organization account is permanently suspended.");
    }
    if (["under_admin_review", "submitted", "ready_for_review", "under_review"].includes(fileStatus)) {
      throw new Error("This specific document is currently under admin review and cannot be modified until the review is complete.");
    }
    if (["approved", "approved_green"].includes(fileStatus)) {
      throw new Error("This approved document is locked from modification.");
    }
    if (fileStatus === "needs_revision") {
      if ((params.context?.revisionSubmitMode ?? params.submitMode ?? "review") === "draft") {
        throw new Error("Submit the corrected document for review to replace a file needing revision. The reviewed file cannot be overwritten as a draft.");
      }
      const correctedRow = await replaceOrganizationDocumentFileInSupabase({
        fileId: existingTargetFile.id,
        documentTypeId: documentTypeRow.id,
        expectedUpdatedAt: existingTargetFile.updated_at,
        file: params.file,
      });
      const correctedFile = mapDocumentFile({
        ...correctedRow,
        required_document_types: { id: documentTypeRow.id, name: documentTypeRow.name },
      } as DocumentSubmissionFileRow);
      if (!correctedFile) throw new Error("The corrected document could not be mapped to the portal.");
      return { submissionId: submission.id, file: correctedFile };
    }
  }

  const safeFileName = sanitizeFileName(params.file.name);
  const objectPath = `${organizationProfile.id}/${documentTypeRow.id}/${Date.now()}-${safeFileName}`;
  const submitMode = params.submitMode ?? "review";

  const { error: uploadError } = await supabase.storage
    .from(ORGANIZATION_DOCUMENTS_BUCKET)
    .upload(objectPath, params.file, {
      upsert: true,
      contentType: params.file.type || "application/octet-stream",
    });

  if (uploadError) throw new Error(uploadError.message);

  const storageUri = buildStorageUri(ORGANIZATION_DOCUMENTS_BUCKET, objectPath);
  const submittedAt = new Date().toISOString();

  const { data, error } = await supabase!
    .from("document_submission_files")
    .upsert(
      {
        submission_id: submission.id,
        document_type_id: documentTypeRow.id,
        file_url: storageUri,
        file_name: params.file.name,
        file_type: params.file.type || "application/octet-stream",
        file_size: params.file.size,
        validation_status: params.validationStatus || "correct",
        admin_status: submitMode === "draft" ? "draft" : "under_admin_review",
        // This field is reserved for actual admin feedback. Pending/draft
        // messaging is derived from the status in the UI.
        admin_remarks: params.adminRemarks?.trim() || null,
        uploaded_at: submittedAt,
        reviewed_at: null,
      },
      {
        onConflict: "submission_id,document_type_id",
      },
    )
    .select("id,submission_id,document_type_id,file_url,file_name,file_type,file_size,validation_status,admin_status,admin_remarks,revision_history,uploaded_at,reviewed_at,created_at,updated_at,required_document_types(id,name)")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to save the uploaded document.");

  const existingFiles = ((existingRows as Array<{ id: string; file_url: string }> | null) ?? []).filter(
    (entry) => entry.file_url && entry.file_url !== storageUri,
  );
  if (existingFiles.length) {
    await removeStorageObjects(existingFiles.map((entry) => entry.file_url));
  }

  const firstSubmittedAt = submission.submitted_at ?? (submitMode === "review" ? submittedAt : null);

  const { data: currentFiles, error: currentFilesError } = await supabase
    .from("document_submission_files")
    .select("admin_status")
    .eq("submission_id", submission.id);
  if (currentFilesError) throw new Error(currentFilesError.message);
  const overallStatus = deriveDocumentSubmissionStatus(
    (currentFiles ?? []).map((entry) => entry.admin_status), submitMode,
  );

  const { error: submissionUpdateError } = await supabase
    .from("document_submissions")
    .update({
      status: overallStatus,
      user_confirmed: submitMode === "review",
      submitted_at: firstSubmittedAt,
      updated_at: submittedAt,
    })
    .eq("id", submission.id);
  if (submissionUpdateError) throw new Error(submissionUpdateError.message);

  const mappedFile = mapDocumentFile(data as DocumentSubmissionFileRow);
  if (!mappedFile) throw new Error("The uploaded document could not be mapped to the portal.");

  return {
    submissionId: submission.id,
    file: mappedFile,
  };
};

export const replaceOrganizationDocumentFileInSupabase = async (params: {
  fileId: string;
  documentTypeId: string;
  expectedUpdatedAt: string;
  file: File;
}) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  await assertPdfUpload(params.file, "Replacement document", ORGANIZATION_DOCUMENT_MAX_BYTES);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Please sign in with your organization account first.");

  const organizationProfile = await fetchOrganizationProfile(session.user.id);
  if (!organizationProfile) throw new Error("No organization profile was found for this account.");

  assertOrganizationNotSuspended(organizationProfile, "Document replacement");

  const { data: existingFile, error: existingFileError } = await supabase
    .from("document_submission_files")
    .select("id,submission_id,admin_status")
    .eq("id", params.fileId)
    .single();
  if (existingFileError || !existingFile) {
    throw new Error(existingFileError?.message ?? "The document to replace could not be found.");
  }
  const { data: submission, error: submissionError } = await supabase
    .from("document_submissions")
    .select("id,status")
    .eq("id", existingFile.submission_id as string)
    .eq("organization_id", organizationProfile.id)
    .single();
  if (submissionError || !submission) throw new Error("The document submission could not be verified.");
  if (submission.status === "rejected_red" || (existingFile as any).admin_status === "rejected_red") {
    throw new Error("This rejected document cannot be replaced. The organization account is permanently suspended.");
  }
  if (existingFile.admin_status !== "needs_revision") {
    throw new Error("A document can only be replaced after the admin requests a revision.");
  }

  const documentTypeId = await resolveTemplateDatabaseId(params.documentTypeId);
  const safeFileName = sanitizeFileName(params.file.name);
  const objectPath = `${organizationProfile.id}/${documentTypeId}/revisions/${Date.now()}-${safeFileName}`;
  const storageUri = buildStorageUri(ORGANIZATION_DOCUMENTS_BUCKET, objectPath);

  const { error: uploadError } = await supabase.storage
    .from(ORGANIZATION_DOCUMENTS_BUCKET)
    .upload(objectPath, params.file, {
      upsert: false,
      contentType: params.file.type || "application/octet-stream",
    });
  if (uploadError) throw new Error(uploadError.message);

  try {
    const { data, error } = await supabase.rpc("replace_organization_document_file", {
      _file_id: params.fileId,
      _document_type_id: documentTypeId,
      _expected_updated_at: params.expectedUpdatedAt,
      _file_url: storageUri,
      _file_name: params.file.name,
      _file_type: params.file.type || "application/octet-stream",
      _file_size: params.file.size,
    });
    if (error) throw new Error(error.message);

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("The corrected document was not saved.");

    void dispatchAdminNotificationInSupabase({
      eventType: "revision_resubmission",
      organizationId: organizationProfile.id,
      organizationName: organizationProfile.organization_name,
      referenceId: params.fileId,
      subject: `Corrected Registration Document: ${params.file.name}`,
    });

    return row;
  } catch (error) {
    await removeStorageObjects([storageUri]).catch(() => undefined);
    throw error;
  }
};

export const submitDocumentSubmissionForReviewInSupabase = async (
  submissionId: string,
  targetFileIds?: string[],
  contextOrganizationProfile?: OrganizationProfileRow,
) => {
  const organizationProfile =
    contextOrganizationProfile || (await getAuthenticatedOrganizationContext()).organizationProfile;

  assertOrganizationNotSuspended(organizationProfile, "Document submission");

  const { data: submission, error: submissionError } = await supabase!
    .from("document_submissions")
    .select("id,status,submitted_at")
    .eq("id", submissionId)
    .eq("organization_id", organizationProfile.id)
    .single();
  if (submissionError || !submission) throw new Error("The document submission could not be verified.");
  if (submission.status === "rejected_red") {
    throw new Error("This organization account is permanently suspended due to a rejected registration document.");
  }

  const { data: attachedFiles, error: filesQueryError } = await supabase!
    .from("document_submission_files")
    .select("id,file_name,file_type")
    .eq("submission_id", submissionId);
  if (filesQueryError) throw new Error(filesQueryError.message);
  const hasPdfFile = ((attachedFiles as Array<{ file_name: string; file_type: string }> | null) ?? []).some(
    (file) => file.file_type === "application/pdf" && /\.pdf$/i.test(file.file_name),
  );
  if (!hasPdfFile) {
    throw new Error("Attach a PDF document before submitting documents for review.");
  }

  const submittedAt = new Date().toISOString();
  let filesQuery = supabase!
    .from("document_submission_files")
    .update({ admin_status: "under_admin_review", reviewed_at: null, updated_at: submittedAt })
    .eq("submission_id", submissionId)
    .eq("admin_status", "draft");

  if (targetFileIds && targetFileIds.length > 0) {
    filesQuery = filesQuery.in("id", targetFileIds);
  }

  const { error: filesError } = await filesQuery;
  if (filesError) throw new Error(filesError.message);

  const firstSubmittedAt = submission.submitted_at || submittedAt;

  const { data: currentFiles, error: currentFilesError } = await supabase!
    .from("document_submission_files")
    .select("admin_status")
    .eq("submission_id", submissionId);
  if (currentFilesError) throw new Error(currentFilesError.message);
  const overallStatus = deriveDocumentSubmissionStatus(
    (currentFiles ?? []).map((entry) => entry.admin_status),
  );

  const { error: updateError } = await supabase!
    .from("document_submissions")
    .update({ status: overallStatus, user_confirmed: true, submitted_at: firstSubmittedAt, updated_at: submittedAt })
    .eq("id", submissionId);
  if (updateError) throw new Error(updateError.message);

  void dispatchAdminNotificationInSupabase({
    eventType: submission.status === "needs_revision" ? "revision_resubmission" : "new_registration",
    organizationId: organizationProfile.id,
    organizationName: organizationProfile.organization_name,
    referenceId: submissionId,
    subject: `Accreditation Registration Documents (${organizationProfile.organization_name || "Organization"})`,
  });
};

const BATCH_UPLOAD_CONCURRENCY_LIMIT = 3;

export const submitOrganizationDocumentsBatchToSupabase = async (params: {
  documents: BatchOrganizationDocumentUploadInput[];
  submitMode?: "draft" | "review";
}) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const submitMode = params.submitMode ?? "review";
  const seenDocumentKeys = new Set<string>();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Please sign in with your organization account first.");

  const organizationProfile = await fetchOrganizationProfile(session.user.id);
  if (!organizationProfile) throw new Error("No organization profile was found for this account.");

  assertOrganizationNotSuspended(organizationProfile, "Batch document submission");

  const submission = await ensureDocumentSubmission(organizationProfile.id, session.user.id);
  if (submission.status === "rejected_red") {
    throw new Error("This organization account is permanently suspended due to a rejected registration document.");
  }

  // Preload all active required document types in a single query
  let templateMapById = new Map<string, RequiredDocumentTypeRow>();
  let templateMapByName = new Map<string, RequiredDocumentTypeRow>();
  try {
    const { data: allTemplateRows, error: templatesError } = await supabase!
      .from("required_document_types")
      .select("id,name,description,template_url,template_description,sort_order,is_required,is_active,template_scope,updated_at")
      .eq("is_active", true);

    if (!templatesError && allTemplateRows) {
      for (const row of allTemplateRows as RequiredDocumentTypeRow[]) {
        templateMapById.set(row.id, row);
        templateMapByName.set(row.name.trim().toLowerCase(), row);
      }
    }
  } catch {
    // Fall back to per-item lookup if bulk fetch fails
  }

  interface PreparedBatchItem {
    document: BatchOrganizationDocumentUploadInput;
    dedupeKey: string;
    immediateError?: string;
    documentTypeRow?: RequiredDocumentTypeRow;
  }

  const preparedItems: PreparedBatchItem[] = [];

  for (const document of params.documents) {
    const dedupeKey = document.documentTypeId?.trim() || document.documentTypeName.trim().toLowerCase();
    if (!document.file) {
      preparedItems.push({
        document,
        dedupeKey,
        immediateError: "No file was selected.",
      });
      continue;
    }
    if (seenDocumentKeys.has(dedupeKey)) {
      preparedItems.push({
        document,
        dedupeKey,
        immediateError: "This document type was selected more than once in the same batch.",
      });
      continue;
    }
    seenDocumentKeys.add(dedupeKey);

    let matchedRow: RequiredDocumentTypeRow | undefined;
    if (document.documentTypeId && UUID_PATTERN.test(document.documentTypeId)) {
      matchedRow = templateMapById.get(document.documentTypeId);
    }
    if (!matchedRow && document.documentTypeName?.trim()) {
      matchedRow = templateMapByName.get(document.documentTypeName.trim().toLowerCase());
    }

    preparedItems.push({
      document,
      dedupeKey,
      documentTypeRow: matchedRow,
    });
  }

  const results: BatchOrganizationDocumentUploadResult[] = new Array(preparedItems.length);

  let nextIndex = 0;
  const workerCount = Math.min(BATCH_UPLOAD_CONCURRENCY_LIMIT, preparedItems.length);

  const workers = Array.from({ length: Math.max(1, workerCount) }, async () => {
    while (nextIndex < preparedItems.length) {
      const index = nextIndex++;
      const item = preparedItems[index];

      if (item.immediateError || !item.document.file) {
        results[index] = {
          documentTypeId: item.document.documentTypeId ?? "",
          documentTypeName: item.document.documentTypeName,
          fileName: item.document.file?.name ?? "",
          success: false,
          error: item.immediateError ?? "No file was selected.",
        };
        continue;
      }

      try {
        const uploadResult = await submitOrganizationDocumentToSupabase({
          documentTypeId: item.document.documentTypeId,
          documentTypeName: item.document.documentTypeName,
          file: item.document.file,
          validationStatus: item.document.validationStatus ?? "correct",
          adminRemarks: item.document.adminRemarks,
          submitMode: submitMode === "review" ? "draft" : submitMode,
          context: {
            session,
            organizationProfile,
            documentTypeRow: item.documentTypeRow,
            submission,
            revisionSubmitMode: submitMode,
          },
        });

        results[index] = {
          documentTypeId: uploadResult.file.documentTypeId,
          documentTypeName: item.document.documentTypeName,
          fileName: item.document.file.name,
          success: true,
          submissionId: uploadResult.submissionId,
          file: uploadResult.file,
        };
      } catch (error) {
        results[index] = {
          documentTypeId: item.document.documentTypeId ?? "",
          documentTypeName: item.document.documentTypeName,
          fileName: item.document.file.name,
          success: false,
          error: error instanceof Error ? error.message : "The document could not be uploaded.",
        };
      }
    }
  });

  await Promise.all(workers);

  if (submitMode === "review") {
    const successfulUploadedFileIds = results
      .filter((result) => result.success && result.file?.adminStatus === "draft")
      .map((result) => result.file!.id);
    const submissionIds = [...new Set(results.filter((result) => result.success && result.file?.adminStatus === "draft" && result.submissionId).map((result) => result.submissionId!))];
    
    await Promise.all(
      submissionIds.map(async (submissionId) => {
        try {
          await submitDocumentSubmissionForReviewInSupabase(
            submissionId,
            successfulUploadedFileIds,
            organizationProfile,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "The selected documents could not be submitted for review.";
          results.forEach((result) => {
            if (result.submissionId === submissionId && result.success && result.file?.adminStatus === "draft") {
              result.success = false;
              result.error = message;
            }
          });
        }
      }),
    );
  }

  return {
    submitMode,
    results,
    successCount: results.filter((result) => result.success).length,
    failureCount: results.filter((result) => !result.success).length,
  };
};

export const submitDocumentReviewBatchToSupabase = async (params: {
  decisions: BatchDocumentReviewDecision[];
}) => {
  const decisions = params.decisions.filter((decision) => decision.fileId.trim());
  if (!decisions.length) {
    return {
      results: [] as BatchDocumentReviewResult[],
      successCount: 0,
      failureCount: 0,
    };
  }

  const results: BatchDocumentReviewResult[] = [];
  for (const decision of decisions) {
    try {
      // Admins authenticate with the custom admin session token rather than a
      // Supabase Auth user. Reading these rows directly is therefore blocked by
      // RLS in production. The security-definer RPC validates the admin token,
      // updates the file, and derives the parent submission status atomically.
      const updatedFile = await updateDocumentSubmissionFileReviewInSupabase({
        fileId: decision.fileId,
        status: decision.status,
        adminRemarks: decision.adminRemarks,
      });
      results.push({
        fileId: decision.fileId,
        success: true,
        file: updatedFile,
      });
    } catch (error) {
      results.push({
        fileId: decision.fileId,
        success: false,
        error: error instanceof Error ? error.message : "The review decision could not be saved.",
      });
    }
  }

  return {
    results,
    successCount: results.filter((result) => result.success).length,
    failureCount: results.filter((result) => !result.success).length,
  };
};

export const removeOrganizationDocumentFromSupabase = async (fileId: string) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { organizationProfile } = await getAuthenticatedOrganizationContext();
  assertOrganizationNotSuspended(organizationProfile, "Document removal");

  const { data: existingRow, error: existingError } = await supabase!
    .from("document_submission_files")
    .select("id,submission_id,file_url,admin_status")
    .eq("id", fileId)
    .single();

  if (existingError || !existingRow) throw new Error(existingError?.message ?? "The uploaded document could not be found.");

  const { data: submission, error: submissionError } = await supabase
    .from("document_submissions")
    .select("id,status")
    .eq("id", existingRow.submission_id as string)
    .eq("organization_id", organizationProfile.id)
    .single();
  if (submissionError || !submission) throw new Error("The document submission could not be verified.");
  if (submission.status === "rejected_red" || (existingRow as any).admin_status === "rejected_red") {
    throw new Error("This document cannot be removed because the organization account is permanently suspended.");
  }
  if (!["draft", "needs_revision"].includes(submission.status as string)) {
    throw new Error("Documents cannot be removed while the submission is under admin review.");
  }
  if (existingRow.admin_status !== "draft") {
    throw new Error("Only draft documents can be removed. Submitted documents are locked; documents needing revision must use the replacement flow.");
  }

  const submissionId = existingRow.submission_id as string;
  const fileUrl = existingRow.file_url as string;

  const { error: deleteError } = await supabase!.from("document_submission_files").delete().eq("id", fileId);
  if (deleteError) throw new Error(deleteError.message);

  if (fileUrl) {
    await removeStorageObjects([fileUrl]);
  }

  const { data: remainingRows, error: remainingError } = await supabase!
    .from("document_submission_files")
    .select("admin_status")
    .eq("submission_id", submissionId);

  if (remainingError) throw new Error(remainingError.message);

  const remainingStatuses = ((remainingRows as Array<{ admin_status: SubmissionFile["adminStatus"] }> | null) ?? []).map(
    (row) => row.admin_status,
  );

  const nextStatus: DocumentSubmission["status"] = deriveDocumentSubmissionStatus(remainingStatuses, "draft");

  const submissionUpdatePayload: Record<string, unknown> = {
    status: nextStatus,
    user_confirmed: remainingStatuses.length > 0,
    overall_remarks: remainingStatuses.length ? null : "",
    updated_at: new Date().toISOString(),
  };
  if (!remainingStatuses.length) {
    submissionUpdatePayload.reviewed_at = null;
  }

  const { error: submissionUpdateError } = await supabase!
    .from("document_submissions")
    .update(submissionUpdatePayload)
    .eq("id", submissionId);

  if (submissionUpdateError) throw new Error(submissionUpdateError.message);
};

const getAuthenticatedOrganizationContext = async (options?: { allowSuspended?: boolean }) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) throw new Error("Please sign in with your organization account first.");

  const organizationProfile = await fetchOrganizationProfile(session.user.id);
  if (!organizationProfile) throw new Error("No organization profile was found for this account.");

  if (!options?.allowSuspended) {
    assertOrganizationNotSuspended(organizationProfile);
  }

  return { session, organizationProfile };
};

export const getAuthenticatedBudgetEligibilityInSupabase = async (): Promise<BudgetEligibility> => {
  const { organizationProfile } = await getAuthenticatedOrganizationContext();
  const { data: periodRows, error: periodError } = await supabase!
    .from("ypop_periods")
    .select(YPOP_PERIOD_COLUMNS)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1);

  if (periodError) throw new Error(periodError.message);
  const periods = ((periodRows as YpopPeriodRow[] | null) ?? []).map(mapYpopPeriod);
  const activePeriod = periods[0] ?? null;
  if (!activePeriod) {
    return resolveBudgetEligibility({
      organizationId: organizationProfile.id,
      periods: [],
      entries: [],
    });
  }

  const { data: entryRows, error: entryError } = await supabase!
    .from("ypop_entries")
    .select(YPOP_ENTRY_COLUMNS)
    .eq("organization_id", organizationProfile.id)
    .eq("semester", activePeriod.semesterKey)
    .order("updated_at", { ascending: false });

  if (entryError) throw new Error(entryError.message);
  return resolveBudgetEligibility({
    organizationId: organizationProfile.id,
    periods,
    entries: ((entryRows as YpopEntryRow[] | null) ?? []).map(mapYpopEntry),
  });
};

const getAuthenticatedAdminSession = () => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");
  return adminSession;
};

const uploadFileToStorage = async (bucket: string, pathPrefix: string, file: File) => {
  const safeFileName = sanitizeFileName(file.name);
  const objectPath = `${pathPrefix}/${Date.now()}-${safeFileName}`;
  const { error: uploadError } = await supabase!.storage.from(bucket).upload(objectPath, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (uploadError) throw new Error(uploadError.message);
  return buildStorageUri(bucket, objectPath);
};

const removeStorageObjects = async (values: string[]) => {
  const parsed = values.map(parseStorageUri).filter((item): item is { bucket: string; path: string } => Boolean(item));
  for (const bucket of new Set(parsed.map((item) => item.bucket))) {
    const paths = parsed.filter((item) => item.bucket === bucket).map((item) => item.path);
    if (!paths.length) continue;
    await supabase!.storage.from(bucket).remove(paths);
  }
};

export const ORGANIZATION_PROFILE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const ORGANIZATION_PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const uploadOrganizationProfileImageInSupabase = async (file: File) => {
  const { session, organizationProfile } = await getAuthenticatedOrganizationContext();
  if (!ORGANIZATION_PROFILE_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }
  if (file.size <= 0 || file.size > ORGANIZATION_PROFILE_IMAGE_MAX_BYTES) {
    throw new Error("The profile image must be smaller than 5 MB.");
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectPath = `${organizationProfile.id}/profile/${Date.now()}-profile.${extension}`;
  const storageUri = buildStorageUri(ORGANIZATION_DOCUMENTS_BUCKET, objectPath);
  const { error: uploadError } = await supabase!.storage
    .from(ORGANIZATION_DOCUMENTS_BUCKET)
    .upload(objectPath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase!
    .from("organization_profiles")
    .update({ profile_image_url: storageUri })
    .eq("id", organizationProfile.id)
    .eq("user_id", session.user.id)
    .select(ORGANIZATION_PROFILE_COLUMNS)
    .single();

  if (error || !data) {
    await removeStorageObjects([storageUri]);
    if (error?.message.includes("profile_image_url")) {
      throw new Error("Profile images are not enabled yet. Run supabase/repair_organization_profile_image.sql, then try again.");
    }
    throw new Error(error?.message ?? "The profile image could not be saved.");
  }

  const previousImage = organizationProfile.profileImageUrl?.trim();
  if (previousImage && previousImage !== storageUri) {
    try {
      await removeStorageObjects([previousImage]);
    } catch {
      // The database already points to the new image. Old-object cleanup can
      // safely be retried by an administrator without hiding the saved image.
    }
  }
  return mapOrganizationProfile(data as OrganizationProfileRow);
};

export const removeOrganizationProfileImageInSupabase = async () => {
  const { session, organizationProfile } = await getAuthenticatedOrganizationContext();
  const previousImage = organizationProfile.profileImageUrl?.trim();
  const { data, error } = await supabase!
    .from("organization_profiles")
    .update({ profile_image_url: null })
    .eq("id", organizationProfile.id)
    .eq("user_id", session.user.id)
    .select(ORGANIZATION_PROFILE_COLUMNS)
    .single();

  if (error || !data) throw new Error(error?.message ?? "The profile image could not be removed.");
  if (previousImage) {
    try {
      await removeStorageObjects([previousImage]);
    } catch {
      // The profile no longer references the object, so storage cleanup may be retried later.
    }
  }
  return mapOrganizationProfile(data as OrganizationProfileRow);
};

export const createBudgetRequestInSupabase = async (params: {
  budgetRequest: Omit<BudgetRequest, "id" | "createdAt" | "updatedAt" | "organizationId" | "submittedBy">;
  file?: File | null;
}) => {
  const { session, organizationProfile } = await getAuthenticatedOrganizationContext();
  const eligibility = await getAuthenticatedBudgetEligibilityInSupabase();
  if (!eligibility.eligible) {
    throw new Error("A qualified YPOP validation in the active period is required before creating a budget request.");
  }

  if (params.budgetRequest.requestedAmount > 100000) {
    throw new Error("Requested budget amount cannot exceed ₱100,000.");
  }

  const orgAdvocacies = Array.isArray(organizationProfile.advocacies) ? organizationProfile.advocacies : [];
  if (orgAdvocacies.length === 0) {
    throw new Error("Your organization does not have any Centers of Youth Participation configured in its profile. Please update your profile before creating a budget request.");
  }
  const submittedCategory = params.budgetRequest.purposeCategory.trim();
  if (!orgAdvocacies.includes(submittedCategory)) {
    throw new Error("Selected Purpose & Category must be one of your organization's configured Centers of Youth Participation.");
  }

  const payload = {
    organization_id: organizationProfile.id,
    submitted_by: session.user.id,
    activity_title: params.budgetRequest.activityTitle.trim(),
    activity_description: params.budgetRequest.activityDescription.trim(),
    activity_date: params.budgetRequest.activityDate,
    venue: params.budgetRequest.venue.trim(),
    requested_amount: params.budgetRequest.requestedAmount,
    approved_amount: params.budgetRequest.approvedAmount,
    released_amount: params.budgetRequest.releasedAmount,
    release_date: params.budgetRequest.releaseDate || null,
    purpose_category: submittedCategory,
    fiscal_year: params.budgetRequest.fiscalYear || (params.budgetRequest.activityDate ? new Date(params.budgetRequest.activityDate).getFullYear() : new Date().getFullYear()),
    status: params.budgetRequest.status,
    remarks: params.budgetRequest.remarks ? params.budgetRequest.remarks.trim() || null : null,
    admin_remarks: params.budgetRequest.adminRemarks?.trim() || "",
    go_signal_at: params.budgetRequest.goSignalAt || null,
    hard_copy_submitted_at: params.budgetRequest.hardCopySubmittedAt || null,
    user_note: params.budgetRequest.userNote?.trim() || "",
    revision_history: params.budgetRequest.revisionHistory ?? [],
  };

  const { data, error } = await supabase!
    .from("budget_requests")
    .insert(payload)
    .select(BUDGET_REQUEST_COLUMNS)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create the budget request.");

  const createdBudget = mapBudgetRequest(data as BudgetRequestRow);
  if (params.file) {
    await replaceBudgetRequestFileInSupabase(createdBudget.id, params.file);
  }

  if (params.budgetRequest.status === "submitted" || params.budgetRequest.status === "under_review") {
    void dispatchAdminNotificationInSupabase({
      eventType: "budget_request",
      organizationId: organizationProfile.id,
      organizationName: organizationProfile.organization_name,
      referenceId: createdBudget.id,
      subject: params.budgetRequest.activityTitle,
      amount: params.budgetRequest.requestedAmount,
      details: params.budgetRequest.activityDescription,
    });
  }

  return createdBudget;
};

export const updateBudgetRequestInSupabase = async (
  budgetRequestId: string,
  patch: Partial<Omit<BudgetRequest, "id" | "createdAt" | "updatedAt" | "organizationId" | "submittedBy">>,
) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const normalizedAdminRemarks =
    patch.adminRemarks !== undefined
      ? patch.adminRemarks.trim()
      : undefined;
  const normalizedUserNote =
    patch.userNote !== undefined
      ? patch.userNote.trim()
      : undefined;

  const adminSession = readAdminSession();
  if (adminSession?.sessionToken) {
    let finalRevisionHistory = patch.revisionHistory;
    let revisionRequestedAt: string | null = null;
    let revisionDueAt: string | null = null;

    if (patch.status === "needs_revision") {
      const deadline = calculateRevisionDeadline();
      revisionRequestedAt = deadline.requestedAt;
      revisionDueAt = deadline.dueAt;

      if (Array.isArray(finalRevisionHistory) && finalRevisionHistory.length > 0) {
        const lastIdx = finalRevisionHistory.length - 1;
        const lastItem = finalRevisionHistory[lastIdx];
        if (lastItem && typeof lastItem === "object") {
          finalRevisionHistory = [
            ...finalRevisionHistory.slice(0, lastIdx),
            { ...lastItem, revisionDueAt: deadline.dueAt },
          ];
        }
      }
    }

    const mappedStatus =
      patch.status === "approved" || patch.status === "awaiting_release"
        ? "awaiting_release"
        : patch.status === "rejected"
        ? "rejected_red"
        : patch.status ?? null;

    const { data, error } = await supabase.rpc("update_admin_budget_request", {
      _session_token: adminSession.sessionToken,
      _budget_request_id: budgetRequestId,
      _status: mappedStatus,
      _approved_amount: patch.approvedAmount ?? null,
      _released_amount: patch.releasedAmount ?? null,
      _release_date: patch.releaseDate || null,
      _remarks: patch.remarks?.trim() || null,
      _admin_remarks: normalizedAdminRemarks ?? null,
      _go_signal_at: patch.goSignalAt || null,
      _hard_copy_submitted_at: patch.hardCopySubmittedAt || null,
      _user_note: normalizedUserNote ?? null,
      _revision_history: finalRevisionHistory ?? null,
    });

    if (error) {
      console.error("update_admin_budget_request error:", error);
      throw new Error(error.message || "Failed to update the budget request.");
    }

    const updatedRow = Array.isArray(data) ? data[0] : null;
    if (!updatedRow) throw new Error("Failed to update the budget request: No data returned.");

    if (patch.status !== undefined) {
      const updatedBudget = mapBudgetRequest(updatedRow as BudgetRequestRow);
      const statusLabels: Record<string, string> = {
        submitted: "Submitted",
        under_review: "Under Review",
        needs_revision: "Needs Revision",
        awaiting_release: "Approved — Awaiting Release",
        rejected_red: "Rejected",
        budget_released: "Budget Released",
      };

      void dispatchOrgTransactionalEmailInSupabase({
        eventType: "budget_status_update",
        organizationId: updatedBudget.organizationId,
        referenceId: updatedBudget.id,
        itemName: updatedBudget.activityTitle,
        status: updatedBudget.status,
        statusLabel: statusLabels[updatedBudget.status] ?? updatedBudget.status.replace(/_/g, " "),
        remarks: updatedBudget.adminRemarks || undefined,
      });
    }

    // Best-effort secondary update for direct environments if supported
    if (patch.status === "needs_revision" && revisionDueAt) {
      try {
        await supabase
          .from("budget_requests")
          .update({
            revision_requested_at: revisionRequestedAt,
            revision_due_at: revisionDueAt,
            revision_locked_at: null,
          })
          .eq("id", budgetRequestId);
      } catch (directErr) {
        console.warn("Non-fatal secondary timestamp update skipped:", directErr);
      }
    }

    return mapBudgetRequest(updatedRow as BudgetRequestRow);
  }

  const { organizationProfile } = await getAuthenticatedOrganizationContext();

  const { data: existingBudget, error: fetchErr } = await supabase
    .from("budget_requests")
    .select("id,status,activity_title,purpose_category,requested_amount,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at")
    .eq("id", budgetRequestId)
    .eq("organization_id", organizationProfile.id)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!existingBudget) throw new Error("Budget request not found.");

  if (
    isSubmissionRevisionLocked({
      status: existingBudget.status,
      revisionDueAt: existingBudget.revision_due_at,
      revisionLocked: existingBudget.revision_locked,
      revisionLockedAt: existingBudget.revision_locked_at,
      revisionUnlockedAt: existingBudget.revision_unlocked_at,
    })
  ) {
    throw new Error("Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.");
  }

  if (patch.requestedAmount !== undefined && patch.requestedAmount > 100000) {
    throw new Error("Requested budget amount cannot exceed ₱100,000.");
  }

  if (patch.purposeCategory !== undefined) {
    const orgAdvocacies: string[] = Array.isArray(organizationProfile.advocacies) ? organizationProfile.advocacies : [];
    const submittedCategory = patch.purposeCategory.trim();
    if (orgAdvocacies.length > 0 && !orgAdvocacies.includes(submittedCategory) && existingBudget.purpose_category !== submittedCategory) {
      throw new Error("Selected Purpose & Category must be one of your organization's configured Centers of Youth Participation.");
    }
  }

  const payload: Record<string, unknown> = {};
  if (patch.activityTitle !== undefined) payload.activity_title = patch.activityTitle.trim();
  if (patch.activityDescription !== undefined) payload.activity_description = patch.activityDescription.trim();
  if (patch.activityDate !== undefined) payload.activity_date = patch.activityDate;
  if (patch.venue !== undefined) payload.venue = patch.venue.trim();
  if (patch.requestedAmount !== undefined) payload.requested_amount = patch.requestedAmount;
  if (patch.approvedAmount !== undefined) payload.approved_amount = patch.approvedAmount;
  if (patch.releasedAmount !== undefined) payload.released_amount = patch.releasedAmount;
  if (patch.releaseDate !== undefined) payload.release_date = patch.releaseDate || null;
  if (patch.purposeCategory !== undefined) payload.purpose_category = patch.purposeCategory.trim();
  if (patch.fiscalYear !== undefined) payload.fiscal_year = patch.fiscalYear;
  if (patch.status !== undefined) {
    payload.status = patch.status;
    if (patch.status === "submitted") {
      payload.revision_requested_at = null;
      payload.revision_due_at = null;
      payload.revision_locked_at = null;
    }
  }
  if (patch.remarks !== undefined) payload.remarks = patch.remarks.trim() || null;
  if (patch.adminRemarks !== undefined) payload.admin_remarks = normalizedAdminRemarks ?? "";
  if (patch.goSignalAt !== undefined) payload.go_signal_at = patch.goSignalAt || null;
  if (patch.hardCopySubmittedAt !== undefined) payload.hard_copy_submitted_at = patch.hardCopySubmittedAt || null;
  if (patch.userNote !== undefined) payload.user_note = normalizedUserNote ?? "";
  if (patch.revisionHistory !== undefined) payload.revision_history = patch.revisionHistory;

  const { data, error } = await supabase!
    .from("budget_requests")
    .update(payload)
    .eq("id", budgetRequestId)
    .select(BUDGET_REQUEST_COLUMNS)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update the budget request.");

  if (patch.status === "submitted") {
    void dispatchAdminNotificationInSupabase({
      eventType: existingBudget.status === "needs_revision" ? "revision_resubmission" : "budget_request",
      organizationId: organizationProfile.id,
      organizationName: organizationProfile.organization_name,
      referenceId: budgetRequestId,
      subject: patch.activityTitle || existingBudget.activity_title,
      amount: patch.requestedAmount || existingBudget.requested_amount,
    });
  }

  return mapBudgetRequest(data as BudgetRequestRow);
};

export const deleteBudgetRequestInSupabase = async (budgetRequestId: string) => {
  await getAuthenticatedOrganizationContext();
  const { data: fileRows, error: fileRowsError } = await supabase!
    .from("budget_request_files")
    .select(BUDGET_REQUEST_FILE_COLUMNS)
    .eq("budget_request_id", budgetRequestId);

  if (fileRowsError) throw new Error(fileRowsError.message);

  const { error } = await supabase!.from("budget_requests").delete().eq("id", budgetRequestId);
  if (error) throw new Error(error.message);

  const existingFiles = (fileRows as BudgetRequestFileRow[] | null) ?? [];
  if (existingFiles.length) {
    await removeStorageObjects(existingFiles.map((entry) => entry.file_url));
  }
};

const extractPublicStoragePath = (value: string, bucket: string) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
};

export const uploadNewsReleasePreviewImageToSupabase = async (file: File) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  getAuthenticatedAdminSession();
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPG, PNG, or WebP thumbnail image.");
  }
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
    throw new Error("The thumbnail image must be smaller than 5 MB.");
  }

  const safeFileName = sanitizeFileName(file.name);
  const objectPath = `news-releases/${Date.now()}-${safeFileName}`;
  const { error: uploadError } = await supabase.storage.from(NEWS_RELEASE_IMAGES_BUCKET).upload(objectPath, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from(NEWS_RELEASE_IMAGES_BUCKET).getPublicUrl(objectPath);
  if (!data?.publicUrl) throw new Error("Failed to create the news release image URL.");
  return data.publicUrl;
};

export const deleteNewsReleasePreviewImageFromSupabase = async (value: string) => {
  if (!supabase || !value) return;
  getAuthenticatedAdminSession();

  const publicPath = extractPublicStoragePath(value, NEWS_RELEASE_IMAGES_BUCKET);
  if (publicPath) {
    await supabase.storage.from(NEWS_RELEASE_IMAGES_BUCKET).remove([publicPath]);
    return;
  }

  await removeStorageObjects([value]);
};

export const createInquiryInSupabase = async (params: {
  submitterName: string;
  organizationName: string;
  email: string;
  subject: string;
  description: string;
}): Promise<InquiryRecord> => {
  const trimmedSubject = params.subject.trim();
  if (!trimmedSubject) {
    throw new Error("Subject is required.");
  }
  if (trimmedSubject.length > 120) {
    throw new Error("Subject must be 120 characters or fewer.");
  }

  const trimmedDescription = params.description.trim();
  if (!trimmedDescription) {
    throw new Error("Message / details are required.");
  }

  const { session, organizationProfile } = await getAuthenticatedOrganizationContext();

  const canonicalOrgName = organizationProfile.organization_name || params.organizationName.trim();
  const canonicalSubmitterName = params.submitterName.trim() || organizationProfile.representative_name || canonicalOrgName;
  const authoritativeEmail = (organizationProfile.organization_email || session.user.email || params.email || "").trim();
  if (!authoritativeEmail) {
    throw new Error("Authoritative account email is required.");
  }

  const { data, error } = await supabase!
    .from("inquiries")
    .insert({
      organization_id: organizationProfile.id,
      submitted_by: session.user.id,
      submitter_name: canonicalSubmitterName,
      organization_name: canonicalOrgName,
      email: authoritativeEmail,
      subject: trimmedSubject,
      description: trimmedDescription,
      status: "pending_review",
      admin_remarks: "",
      reviewed_at: null,
    })
    .select(INQUIRY_COLUMNS)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to submit the inquiry.");
  const createdInquiry = mapInquiry(data as InquiryRow);
  await invalidateOrganizationPortalHistoryCaches(organizationProfile.id, undefined, ["inquiries"]);

  void dispatchAdminNotificationInSupabase({
    eventType: "new_inquiry",
    organizationId: organizationProfile.id,
    organizationName: canonicalOrgName,
    referenceId: createdInquiry.id,
    subject: trimmedSubject,
    details: trimmedDescription,
  });

  return createdInquiry;
};

const replaceBudgetRequestFileInSupabase = async (budgetRequestId: string, file: File) => {
  const { organizationProfile } = await getAuthenticatedOrganizationContext();
  const { data: request, error: requestError } = await supabase!
    .from("budget_requests")
    .select("id,status,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at")
    .eq("id", budgetRequestId)
    .eq("organization_id", organizationProfile.id)
    .single();
  if (requestError || !request) throw new Error(requestError?.message ?? "Budget request not found.");
  if (["awaiting_release", "approved_for_ftf_green", "hard_copy_submitted", "budget_released", "completed"].includes(request.status)) {
    throw new Error("Approved budget requests can no longer be modified.");
  }
  if (isSubmissionRevisionLocked({
    status: request.status,
    revisionDueAt: request.revision_due_at,
    revisionLocked: request.revision_locked,
    revisionLockedAt: request.revision_locked_at,
    revisionUnlockedAt: request.revision_unlocked_at,
  })) {
    throw new Error("Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.");
  }
  const { data: existingRows, error: existingError } = await supabase!
    .from("budget_request_files")
    .select(BUDGET_REQUEST_FILE_COLUMNS)
    .eq("budget_request_id", budgetRequestId);

  if (existingError) throw new Error(existingError.message);
  const existingFiles = (existingRows as BudgetRequestFileRow[] | null) ?? [];
  const fileUrl = await uploadFileToStorage(BUDGET_REQUEST_FILES_BUCKET, budgetRequestId, file);
  const { data, error } = await supabase!
    .from("budget_request_files")
    .insert({
      budget_request_id: budgetRequestId,
      file_url: fileUrl,
      file_name: file.name,
      file_type: file.type || "application/octet-stream",
      file_size: file.size,
      uploaded_at: new Date().toISOString(),
    })
    .select(BUDGET_REQUEST_FILE_COLUMNS)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to save the budget request file.");

  if (existingFiles.length) {
    const { error: deleteError } = await supabase!.from("budget_request_files").delete().in(
      "id",
      existingFiles.map((entry) => entry.id),
    );
    if (deleteError) throw new Error(deleteError.message || "Unable to remove the previous budget proposal.");
    await removeStorageObjects(existingFiles.map((entry) => entry.file_url));
  }

  return mapBudgetRequestFile(data as BudgetRequestFileRow);
};

export const uploadBudgetRequestFileToSupabase = replaceBudgetRequestFileInSupabase;

export const createLiquidationReportFileInSupabase = async (params: {
  liquidationReportId: string;
  file: File;
}) => {
  await assertPdfUpload(params.file, "Liquidation attachment");
  const { organizationProfile } = await getAuthenticatedOrganizationContext();
  const { data: report, error: reportError } = await supabase!
    .from("liquidation_reports")
    .select("id,status,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at")
    .eq("id", params.liquidationReportId)
    .eq("organization_id", organizationProfile.id)
    .single();
  if (reportError || !report) throw new Error(reportError?.message ?? "The liquidation report could not be found.");
  if (
    isSubmissionRevisionLocked({
      status: report.status,
      revisionDueAt: report.revision_due_at,
      revisionLocked: report.revision_locked,
      revisionLockedAt: report.revision_locked_at,
      revisionUnlockedAt: report.revision_unlocked_at,
    })
  ) {
    throw new Error("Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.");
  }
  if (!editableLiquidationStatuses.has(report.status as LiquidationReport["status"])) {
    throw new Error("Files cannot be uploaded while this liquidation submission is under review.");
  }
  const fileUrl = await uploadFileToStorage(LIQUIDATION_REPORT_FILES_BUCKET, params.liquidationReportId, params.file);

  const { data, error } = await supabase!
    .from("liquidation_report_files")
    .insert({
      liquidation_report_id: params.liquidationReportId,
      file_url: fileUrl,
      file_name: params.file.name,
      file_type: params.file.type || "application/octet-stream",
      file_size: params.file.size,
      uploaded_at: new Date().toISOString(),
    })
    .select("id,liquidation_report_id,file_url,file_name,file_type,file_size,uploaded_at,created_at,admin_status,admin_remarks")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to save the liquidation file.");
  return mapLiquidationReportFile(data as LiquidationReportFileRow);
};

export const deleteLiquidationReportFileInSupabase = async (fileId: string, fileUrl: string) => {
  const { organizationProfile } = await getAuthenticatedOrganizationContext();
  const { data: file, error: fileError } = await supabase!
    .from("liquidation_report_files")
    .select("id,liquidation_report_id")
    .eq("id", fileId)
    .single();
  if (fileError || !file) throw new Error(fileError?.message ?? "The liquidation attachment could not be found.");

  const { data: report, error: reportError } = await supabase!
    .from("liquidation_reports")
    .select("id,status,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at")
    .eq("id", file.liquidation_report_id as string)
    .eq("organization_id", organizationProfile.id)
    .single();
  if (reportError || !report) throw new Error("The liquidation report could not be verified.");
  if (
    isSubmissionRevisionLocked({
      status: report.status,
      revisionDueAt: report.revision_due_at,
      revisionLocked: report.revision_locked,
      revisionLockedAt: report.revision_locked_at,
      revisionUnlockedAt: report.revision_unlocked_at,
    })
  ) {
    throw new Error("Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.");
  }
  if (!editableLiquidationStatuses.has(report.status as LiquidationReport["status"])) {
    throw new Error("Files cannot be removed while this liquidation submission is under review.");
  }

  const { error } = await supabase!
    .from("liquidation_report_files")
    .delete()
    .eq("id", fileId);

  if (error) throw new Error(error.message);
  await removeStorageObjects([fileUrl]);
};

export const createNewsReleaseInSupabase = async (params: {
  title: string;
  description: string;
  facebookPostUrl: string;
  previewImageUrl?: string;
  datePosted: string;
  visibilityStatus: NewsRelease["visibilityStatus"];
  category?: string;
}) => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("create_admin_news_release", {
    _session_token: adminSession.sessionToken,
    _title: params.title.trim(),
    _description: params.description.trim(),
    _facebook_post_url: params.facebookPostUrl.trim(),
    _preview_image_url: params.previewImageUrl?.trim() ?? "",
    _date_posted: params.datePosted,
    _visibility_status: params.visibilityStatus,
    _category: params.category?.trim() || null,
  });

  const createdRow = Array.isArray(data) ? data[0] : null;
  if (error || !createdRow) throw new Error(error?.message ?? "Failed to create the news release.");
  return mapNewsRelease(createdRow as NewsReleaseRow);
};

export const updateNewsReleaseInSupabase = async (
  newsReleaseId: string,
  patch: Partial<Pick<NewsRelease, "title" | "description" | "facebookPostUrl" | "previewImageUrl" | "datePosted" | "visibilityStatus" | "category">>,
) => {
  const adminSession = getAuthenticatedAdminSession();

  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title.trim();
  if (patch.description !== undefined) payload.description = patch.description.trim();
  if (patch.facebookPostUrl !== undefined) payload.facebook_post_url = patch.facebookPostUrl.trim();
  if (patch.previewImageUrl !== undefined) payload.preview_image_url = patch.previewImageUrl.trim();
  if (patch.datePosted !== undefined) payload.date_posted = patch.datePosted;
  if (patch.visibilityStatus !== undefined) payload.visibility_status = patch.visibilityStatus;
  if (patch.category !== undefined) payload.category = patch.category?.trim() || null;

  const { data, error } = await supabase!.rpc("update_admin_news_release", {
    _session_token: adminSession.sessionToken,
    _news_release_id: newsReleaseId,
    _title: payload.title ?? null,
    _description: payload.description ?? null,
    _facebook_post_url: payload.facebook_post_url ?? null,
    _preview_image_url: payload.preview_image_url ?? null,
    _date_posted: payload.date_posted ?? null,
    _visibility_status: payload.visibility_status ?? null,
    _category: payload.category ?? null,
  });

  const updatedRow = Array.isArray(data) ? data[0] : null;
  if (error || !updatedRow) throw new Error(error?.message ?? "Failed to update the news release.");
  return mapNewsRelease(updatedRow as NewsReleaseRow);
};

export const deleteNewsReleaseInSupabase = async (newsReleaseId: string) => {
  const adminSession = getAuthenticatedAdminSession();
  const { error } = await supabase!.rpc("delete_admin_news_release", {
    _session_token: adminSession.sessionToken,
    _news_release_id: newsReleaseId,
  });
  if (error) throw new Error(error.message);
};

export const createNewsCategoryInSupabase = async (name: string): Promise<NewsCategoryRecord> => {
  const adminSession = getAuthenticatedAdminSession();
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) throw new Error("Category name cannot be empty.");

  const { data, error } = await supabase!.rpc("create_admin_news_category", {
    _session_token: adminSession.sessionToken,
    _name: trimmed,
  });

  if (error) throw new Error(error.message);
  const createdRow = Array.isArray(data) ? data[0] : data;
  if (!createdRow) throw new Error("Failed to create category.");
  return mapNewsCategory(createdRow as NewsCategoryRow);
};

export const deleteNewsCategoryInSupabase = async (categoryId: string): Promise<{ success: boolean; error?: string }> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("delete_admin_news_category", {
    _session_token: adminSession.sessionToken,
    _category_id: categoryId,
  });

  if (error) throw new Error(error.message);
  const result = data as { success?: boolean; error?: string; deleted_id?: string; deleted_name?: string } | null;
  if (!result || result.success === false) {
    throw new Error(result?.error || "Failed to delete category.");
  }
  return { success: true };
};

export const createTransparencyPostInSupabase = async (params: {
  title: string;
  description: string;
  category: string;
  attachmentUrl: string;
  postDate: string;
  visibilityStatus: TransparencyPost["visibilityStatus"];
}) => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("create_admin_transparency_post", {
    _session_token: adminSession.sessionToken,
    _title: params.title.trim(),
    _description: params.description.trim(),
    _category: params.category.trim(),
    _attachment_url: params.attachmentUrl.trim(),
    _post_date: params.postDate,
    _visibility_status: params.visibilityStatus,
  });

  const createdRow = Array.isArray(data) ? data[0] : null;
  if (error || !createdRow) throw new Error(error?.message ?? "Failed to create the transparency post.");
  return mapTransparencyPost(createdRow as TransparencyPostRow);
};

export const updateTransparencyPostInSupabase = async (
  postId: string,
  patch: Partial<Pick<TransparencyPost, "title" | "description" | "category" | "attachmentUrl" | "postDate" | "visibilityStatus">>,
) => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("update_admin_transparency_post", {
    _session_token: adminSession.sessionToken,
    _post_id: postId,
    _title: patch.title?.trim() ?? null,
    _description: patch.description?.trim() ?? null,
    _category: patch.category?.trim() ?? null,
    _attachment_url: patch.attachmentUrl?.trim() ?? null,
    _post_date: patch.postDate ?? null,
    _visibility_status: patch.visibilityStatus ?? null,
  });

  const updatedRow = Array.isArray(data) ? data[0] : null;
  if (error || !updatedRow) throw new Error(error?.message ?? "Failed to update the transparency post.");
  return mapTransparencyPost(updatedRow as TransparencyPostRow);
};

export const deleteTransparencyPostInSupabase = async (postId: string) => {
  const adminSession = getAuthenticatedAdminSession();
  const { error } = await supabase!.rpc("delete_admin_transparency_post", {
    _session_token: adminSession.sessionToken,
    _post_id: postId,
  });
  if (error) throw new Error(error.message);
};

export const createAdminActivityLogInSupabase = async (params: {
  organizationId?: string;
  action: string;
  relatedType: string;
  relatedId?: string;
  description: string;
  category?: AuditCategory;
  metadata?: Record<string, unknown>;
}): Promise<ActivityLog | null> => {
  const adminSession = readAdminSession();
  if (!supabase || !adminSession) {
    return null;
  }
  const { data, error } = await supabase.rpc("create_admin_activity_log", {
    _session_token: adminSession.sessionToken,
    _organization_id: params.organizationId || null,
    _action: params.action.trim(),
    _related_type: params.relatedType.trim(),
    _related_id: params.relatedId || null,
    _description: params.description.trim(),
    _category: params.category || null,
    _metadata: params.metadata || {},
  });

  if (error) {
    console.warn("Unable to create admin activity log:", error.message);
    return null;
  }
  const createdRow = Array.isArray(data) && data.length > 0 ? data[0] : null;
  return createdRow ? mapActivityLog(createdRow as ActivityLogRow) : null;
};

export const getAdminAccountsInSupabase = async (): Promise<
  Record<string, { displayName: string; email: string; roleLabel: string | null }>
> => {
  try {
    const adminSession = readAdminSession();
    if (!supabase || !adminSession) throw new Error("Please sign in with the seeded admin account first.");

    const { data, error } = await supabase.rpc("list_admin_accounts_for_admin_portal", {
      _session_token: adminSession.sessionToken,
    });
    if (error || !data) throw error ?? new Error("No admin accounts returned.");
    const accountsById: Record<string, { displayName: string; email: string; roleLabel: string | null }> = {};
    for (const row of data as { id: string; display_name: string | null; email: string | null; role_label: string | null }[]) {
      accountsById[String(row.id)] = {
        displayName: row.display_name ?? "Admin User",
        email: row.email ?? "",
        roleLabel: row.role_label,
      };
    }
    return accountsById;
  } catch (error) {
    console.warn("Unable to load admin accounts; activity log actors will fall back to generic labels.", error);
    return {};
  }
};

type AdministratorRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  username: string | null;
  role_code: string | null;
  role_label: string | null;
  unit_code: string | null;
  unit_label: string | null;
  is_active: boolean | null;
  is_password_set: boolean | null;
  last_active_at: string | null;
};

const mapAdministrator = (row: AdministratorRow): AdministratorRecord => ({
  id: row.id,
  displayName: row.display_name ?? "",
  email: row.email ?? "",
  username: row.username ?? "",
  roleCode: row.role_code,
  roleLabel: row.role_label,
  unitCode: row.unit_code,
  unitLabel: row.unit_label,
  isActive: row.is_active ?? true,
  isPasswordSet: row.is_password_set ?? true,
  lastActiveAt: row.last_active_at,
});

export const getAdminPermissionContextInSupabase = async (
  sessionToken: string,
): Promise<{ roleCode: string; roleLabel: string; permissionCodes: string[] } | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_admin_permission_context", {
    _session_token: sessionToken,
  });
  if (error) {
    console.warn("Unable to load admin permission context.", error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return {
    roleCode: row.role_code,
    roleLabel: row.role_label,
    permissionCodes: row.permission_codes ?? [],
  };
};

export const getAdministratorRolesInSupabase = async (): Promise<AdminRoleRecord[]> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const { data, error } = await supabase.rpc("list_roles_for_admin_portal", {
    _session_token: adminSession.sessionToken,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: number; code: string; label: string; permission_codes: string[] | null }[]).map((row) => ({
    id: row.id,
    code: row.code,
    label: row.label,
    permissionCodes: row.permission_codes ?? [],
  }));
};

export const updateRolePermissionsInSupabase = async (roleId: number, permissionCodes: string[]): Promise<void> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const { data, error } = await supabase.rpc("update_role_permissions", {
    _session_token: adminSession.sessionToken,
    _role_id: roleId,
    _permission_codes: permissionCodes,
  });

  const updatedRow = Array.isArray(data) ? data[0] : null;
  if (error || !updatedRow) throw new Error(error?.message ?? "Failed to update role permissions.");
};

export const getAdministratorUnitsInSupabase = async (): Promise<{ id: number; code: string; label: string }[]> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const { data, error } = await supabase.rpc("list_units_for_admin_portal", {
    _session_token: adminSession.sessionToken,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: number; code: string; label: string }[]).map((row) => ({
    id: row.id,
    code: row.code,
    label: row.label,
  }));
};

export const getAdministratorsInSupabase = async (): Promise<AdministratorRecord[]> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const { data, error } = await supabase.rpc("list_administrators_for_admin_portal", {
    _session_token: adminSession.sessionToken,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as AdministratorRow[]).map(mapAdministrator);
};

export class DuplicateUsernameError extends Error {
  constructor() {
    super("That username is already taken.");
    this.name = "DuplicateUsernameError";
  }
}

export type AdminInviteErrorPayload = {
  error?: string;
  code?: string;
};

export const extractEdgeFunctionError = async (
  error: unknown,
  fallbackMessage: string,
): Promise<{ message: string; code?: string }> => {
  const context = (error as { context?: unknown })?.context;
  if (context instanceof Response) {
    try {
      const payload = (await context.clone().json()) as AdminInviteErrorPayload;
      if (payload?.error) {
        return { message: payload.error, code: payload.code };
      }
    } catch {
      // Body could not be parsed as JSON, fall through
    }
  }
  const directMessage = (error as Error)?.message;
  if (directMessage && !/non-2xx status code/i.test(directMessage)) {
    return { message: directMessage };
  }
  return { message: fallbackMessage };
};

const isDuplicateUsernameError = (error: { code?: string; message?: string } | null) =>
  error?.code === "username_exists" ||
  (Boolean(error) && /username/i.test(error?.message ?? "") && /duplicate/i.test(error?.message ?? ""));

const isDuplicateAdminEmailError = (error: { code?: string; message?: string } | null) =>
  error?.code === "admin_email_exists" ||
  (Boolean(error) && (error?.code === "23505" || /duplicate key value violates unique constraint/i.test(error?.message ?? "")));

export type AdminEmailCheckResult = {
  status: "available" | "user_exists" | "admin_exists" | "shadow_admin";
  message?: string;
};

export const checkAdminEmailAvailabilityInSupabase = async (
  email: string,
): Promise<AdminEmailCheckResult> => {
  if (!supabase) return { status: "available" };
  const adminSession = readAdminSession();
  if (!adminSession) return { status: "available" };

  try {
    const { data, error } = await supabase.functions.invoke("admin-invite", {
      body: {
        action: "check_email",
        session_token: adminSession.sessionToken,
        email: email.trim(),
      },
    });

    if (error) {
      const extracted = await extractEdgeFunctionError(error, "Unable to verify email.");
      return { status: "available", message: extracted.message };
    }

    return (data as AdminEmailCheckResult) ?? { status: "available" };
  } catch {
    return { status: "available" };
  }
};

export const createAdministratorInSupabase = async (params: {
  displayName: string;
  email: string;
  username: string;
  roleId: number;
  unitId: number;
}): Promise<AdministratorRecord> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const { data, error } = await supabase.functions.invoke("admin-invite", {
    body: {
      action: "create",
      session_token: adminSession.sessionToken,
      display_name: params.displayName.trim(),
      email: params.email.trim(),
      username: params.username.trim(),
      role_id: params.roleId,
      unit_id: params.unitId,
      redirect_origin: getAdminAppUrl(),
    },
  });

  if (error) {
    const extracted = await extractEdgeFunctionError(error, "Failed to create the administrator account.");
    if (isDuplicateUsernameError({ code: extracted.code, message: extracted.message })) {
      throw new DuplicateUsernameError();
    }
    if (isDuplicateAdminEmailError({ code: extracted.code, message: extracted.message })) {
      throw new Error("An administrator with that email already exists. Please use a different email address.");
    }
    throw new Error(extracted.message);
  }

  const responsePayload = data as { error?: string; code?: string; administrator?: AdministratorRow } | null;
  const responseError = responsePayload?.error;
  if (responseError) {
    if (isDuplicateUsernameError({ code: responsePayload?.code, message: responseError })) {
      throw new DuplicateUsernameError();
    }
    if (isDuplicateAdminEmailError({ code: responsePayload?.code, message: responseError })) {
      throw new Error("An administrator with that email already exists. Please use a different email address.");
    }
    throw new Error(responseError);
  }

  if (!responsePayload?.administrator) {
    throw new Error("Failed to create the administrator account.");
  }
  return mapAdministrator(responsePayload.administrator);
};

export const setInitialAdminPasswordInSupabase = async (newPassword: string): Promise<{ username: string }> => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase.rpc("set_initial_admin_password", {
    _new_password: newPassword,
  });

  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) throw new Error(error?.message ?? "This invite link is invalid or has expired.");
  return { username: row.username ?? "" };
};

export const finalizeAdminInviteInSupabase = async (): Promise<void> => {
  if (!supabase) return;
  try {
    await supabase.functions.invoke("admin-invite", { body: { action: "finalize" } });
  } catch {
    // Best-effort cleanup of the shadow auth.users row; a failure here is harmless.
  }
};

export const resendAdminInviteInSupabase = async (adminId: string): Promise<void> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const { data, error } = await supabase.functions.invoke("admin-invite", {
    body: {
      action: "resend",
      session_token: adminSession.sessionToken,
      admin_id: adminId,
      redirect_origin: getAdminAppUrl(),
    },
  });

  if (error) {
    const extracted = await extractEdgeFunctionError(error, "Failed to resend the invite.");
    throw new Error(extracted.message);
  }

  const responseError = (data as { error?: string } | null)?.error;
  if (responseError) throw new Error(responseError);
};

export const updateAdministratorInSupabase = async (params: {
  id: string;
  displayName: string;
  email: string;
  username: string;
  roleId: number;
  unitId: number;
}) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const { data, error } = await supabase.rpc("update_admin_account", {
    _session_token: adminSession.sessionToken,
    _admin_id_to_update: params.id,
    _display_name: params.displayName.trim(),
    _email: params.email.trim(),
    _username: params.username.trim(),
    _role_id: params.roleId,
    _unit_id: params.unitId,
  });

  if (error && isDuplicateNameError(error)) {
    throw new Error(`An administrator with that username or email already exists. Please use different details.`);
  }
  const updatedRow = Array.isArray(data) ? data[0] : null;
  if (error || !updatedRow) throw new Error(error?.message ?? "Failed to update the administrator account.");
  return mapAdministrator(updatedRow as AdministratorRow);
};

export const setAdministratorActiveInSupabase = async (id: string, isActive: boolean) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const { data, error } = await supabase.rpc("set_admin_account_active", {
    _session_token: adminSession.sessionToken,
    _admin_id_to_update: id,
    _is_active: isActive,
  });

  const updatedRow = Array.isArray(data) ? data[0] : null;
  if (error || !updatedRow) throw new Error(error?.message ?? "Failed to update the administrator's status.");
  return mapAdministrator(updatedRow as AdministratorRow);
};

export const deleteAdministratorInSupabase = async (id: string) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const { error } = await supabase.rpc("delete_admin_account", {
    _session_token: adminSession.sessionToken,
    _admin_id_to_delete: id,
  });

  if (error) throw new Error(error.message);
};

export const adminUpdateInquiryInSupabase = async (
  inquiryId: string,
  patch: Pick<InquiryRecord, "status" | "adminRemarks">,
): Promise<InquiryRecord> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_update_inquiry", {
    _session_token: adminSession.sessionToken,
    _inquiry_id: inquiryId,
    _status: patch.status,
    _admin_remarks: patch.adminRemarks,
  });

  const updatedRow = Array.isArray(data) ? data[0] : null;
  if (error || !updatedRow) throw new Error(error?.message ?? "Failed to update the inquiry.");
  return mapInquiry(updatedRow as InquiryRow);
};

export const deleteInquiryInSupabase = async (inquiryId: string): Promise<void> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = getAuthenticatedAdminSession();

  const { data, error } = await supabase.rpc("delete_admin_inquiry", {
    _session_token: adminSession.sessionToken,
    _inquiry_id: inquiryId,
  });

  if (error) {
    throw new Error(error.message || "Failed to delete inquiry.");
  }

  const res = data as { success?: boolean; error?: string } | null;
  if (res && res.success === false) {
    throw new Error(res.error || "Failed to delete inquiry.");
  }
};

export const updateLiquidationReportInSupabase = async (
  liquidationReportId: string,
  patch: Partial<Omit<LiquidationReport, "id" | "createdAt" | "updatedAt" | "organizationId" | "submittedBy" | "budgetRequestId">>,
) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const adminSession = readAdminSession();
  if (adminSession?.sessionToken) {
    let revisionRequestedAt: string | null = null;
    let revisionDueAt: string | null = null;

    if (patch.status === "needs_revision") {
      const deadline = calculateRevisionDeadline();
      revisionRequestedAt = deadline.requestedAt;
      revisionDueAt = deadline.dueAt;
    }

    const { data, error } = await supabase.rpc("update_admin_liquidation_report", {
      _session_token: adminSession.sessionToken,
      _liquidation_report_id: liquidationReportId,
      _status: patch.status ?? null,
      _remarks: patch.remarks?.trim() || null,
      _go_signal_at: patch.goSignalAt || null,
      _deadline_at: patch.deadlineAt || null,
      _hard_copy_submitted_at: patch.hardCopySubmittedAt || null,
      _completed_at: patch.completedAt || null,
    });

    if (patch.status === "needs_revision" && revisionDueAt) {
      await supabase
        .from("liquidation_reports")
        .update({
          revision_requested_at: revisionRequestedAt,
          revision_due_at: revisionDueAt,
          revision_locked_at: null,
        })
        .eq("id", liquidationReportId);
    }

    const updatedRow = Array.isArray(data) ? data[0] : null;
    if (error || !updatedRow) throw new Error(error?.message ?? "Failed to update the liquidation report.");
    const updatedReport = mapLiquidationReport(updatedRow as LiquidationReportRow);

    if (patch.status !== undefined) {
      const statusLabels: Record<string, string> = {
        pending_activity_completion: "Awaiting Activity Completion",
        not_started: "Not Started",
        draft: "Draft",
        submitted: "Submitted",
        under_review: "Under Review",
        needs_revision: "Needs Revision",
        approved_for_ftf_green: "Approved — Hard Copy Submission Required",
        rejected_red: "Rejected",
        hard_copy_submitted: "Hard Copy Submitted",
        completed_liquidated: "Liquidated",
        overdue: "Overdue",
      };

      void dispatchOrgTransactionalEmailInSupabase({
        eventType: "liquidation_status_update",
        organizationId: updatedReport.organizationId,
        referenceId: updatedReport.id,
        status: updatedReport.status,
        statusLabel: statusLabels[updatedReport.status] ?? updatedReport.status.replace(/_/g, " "),
        remarks: updatedReport.remarks || undefined,
      });
    }

    return updatedReport;
  }

  const { organizationProfile } = await getAuthenticatedOrganizationContext();

  const { data: report, error: reportError } = await supabase
    .from("liquidation_reports")
    .select("id,status,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at")
    .eq("id", liquidationReportId)
    .eq("organization_id", organizationProfile.id)
    .single();
  if (reportError || !report) throw new Error(reportError?.message ?? "The liquidation report could not be found.");

  if (
    isSubmissionRevisionLocked({
      status: report.status,
      revisionDueAt: report.revision_due_at,
      revisionLocked: report.revision_locked,
      revisionLockedAt: report.revision_locked_at,
      revisionUnlockedAt: report.revision_unlocked_at,
    })
  ) {
    throw new Error("Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.");
  }

  if (patch.status !== undefined) {
    if ((patch.status !== "submitted" && patch.status !== "draft") || !editableLiquidationStatuses.has(report.status as LiquidationReport["status"])) {
      throw new Error("This liquidation status can only be changed by an administrator.");
    }

    if (patch.status === "submitted") {
      const { data: files, error: filesError } = await supabase
        .from("liquidation_report_files")
        .select("file_name,file_type")
        .eq("liquidation_report_id", liquidationReportId);
      if (filesError) throw new Error(filesError.message);
      const hasPdf = ((files as Array<{ file_name: string; file_type: string }> | null) ?? []).some(
        (file) => file.file_type === "application/pdf" && /\.pdf$/i.test(file.file_name),
      );
      if (!hasPdf) throw new Error("Attach a PDF before submitting this liquidation report.");
    }
  }

  const payload: Record<string, unknown> = {};
  if (patch.status !== undefined) {
    payload.status = patch.status;
    if (patch.status === "submitted") {
      payload.revision_requested_at = null;
      payload.revision_due_at = null;
      payload.revision_locked_at = null;
    }
  }
  if (patch.remarks !== undefined) payload.remarks = patch.remarks.trim() || null;
  if (patch.goSignalAt !== undefined) payload.go_signal_at = patch.goSignalAt || null;
  if (patch.deadlineAt !== undefined) payload.deadline_at = patch.deadlineAt || null;
  if (patch.hardCopySubmittedAt !== undefined) payload.hard_copy_submitted_at = patch.hardCopySubmittedAt || null;
  if (patch.completedAt !== undefined) payload.completed_at = patch.completedAt || null;

  const { data, error } = await supabase!
    .from("liquidation_reports")
    .update(payload)
    .eq("id", liquidationReportId)
    .select(LIQUIDATION_REPORT_COLUMNS)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update the liquidation report.");

  if (patch.status === "submitted") {
    void dispatchAdminNotificationInSupabase({
      eventType: report.status === "needs_revision" ? "revision_resubmission" : "liquidation_report",
      organizationId: organizationProfile.id,
      organizationName: organizationProfile.organization_name,
      referenceId: liquidationReportId,
      subject: `Liquidation Report Submission (${organizationProfile.organization_name || "Organization"})`,
      details: patch.remarks || report.remarks || undefined,
    });
  }

  return mapLiquidationReport(data as LiquidationReportRow);
};

export const uploadOrganizationDocumentToSupabase = submitOrganizationDocumentToSupabase;

export const uploadTemplateDocumentToSupabase = async (params: {
  databaseId?: string;
  documentTypeName: string;
  file: File;
}) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const documentTypeRow = params.databaseId
    ? ({
        id: await resolveTemplateDatabaseId(params.databaseId, params.documentTypeName),
      } as RequiredDocumentTypeRow)
    : await fetchRequiredDocumentTypeRowByName(params.documentTypeName);
  const safeFileName = sanitizeFileName(params.file.name);
  const objectPath = `${documentTypeRow.id}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(TEMPLATE_FILES_BUCKET)
    .upload(objectPath, params.file, {
      upsert: true,
      contentType: params.file.type || "application/octet-stream",
    });

  if (uploadError) throw new Error(uploadError.message);

  const templateStorageUri = buildStorageUri(TEMPLATE_FILES_BUCKET, objectPath);
  const { data, error } = await supabase.rpc("update_admin_template_file_url", {
    _session_token: adminSession.sessionToken,
    _template_id: documentTypeRow.id,
    _template_url: templateStorageUri,
  });

  const updatedRow = Array.isArray(data) ? data[0] : null;
  if (error || !updatedRow) throw new Error(error?.message ?? "Failed to update the template record.");

  const { error: sizeError } = await supabase.rpc("admin_set_template_file_size", {
    _session_token: adminSession.sessionToken,
    _template_id: documentTypeRow.id,
    _file_size: params.file.size,
  });
  if (sizeError) {
    // The upload itself succeeded; keep the accurate local size and allow the
    // administrator to continue. The migration backfills this metadata once.
    console.warn("Could not persist uploaded template file size:", sizeError.message);
  }

  const mappedTemplate = mapTemplate({
    ...(updatedRow as RequiredDocumentTypeRow),
    template_file_size: params.file.size,
  });
  if (!mappedTemplate) throw new Error("The uploaded template could not be mapped to the portal.");

  return mappedTemplate;
};

const isDuplicateNameError = (error: { code?: string; message?: string } | null) =>
  error?.code === "23505" || /duplicate key value violates unique constraint/i.test(error?.message ?? "");

export const updateTemplateScopeInSupabase = async (
  databaseId: string,
  name: string | undefined,
  scope: "registration" | "renewal" | "both",
) => {
  if (!supabase) return;
  const resolvedId = await resolveTemplateDatabaseId(databaseId, name);
  try {
    const { error } = await supabase
      .from("required_document_types")
      .update({ scope })
      .eq("id", resolvedId);
    if (error) {
      console.warn("Direct scope update returned:", error.message);
    }
  } catch (err) {
    console.warn("Failed direct scope update:", err);
  }
};

export const createTemplateRecordInSupabase = async (params: {
  name: string;
  description: string;
  templateDescription: string;
  templateScope: "document_submission" | "other";
  scope?: "registration" | "renewal" | "both";
}) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const { data, error } = await supabase.rpc("create_admin_template_document", {
    _session_token: adminSession.sessionToken,
    _name: params.name.trim(),
    _description: params.description.trim(),
    _template_description: params.templateDescription.trim(),
    _template_scope: params.templateScope,
  });

  if (error && isDuplicateNameError(error)) {
    throw new Error(`A form or template named "${params.name.trim()}" already exists. Please use a different name.`);
  }
  const createdRow = Array.isArray(data) ? data[0] : null;
  if (error || !createdRow) throw new Error(error?.message ?? "Failed to create the template.");

  if (params.scope) {
    await updateTemplateScopeInSupabase(createdRow.id, params.name, params.scope);
    createdRow.scope = params.scope;
  }

  const mappedTemplate = mapTemplate(createdRow as RequiredDocumentTypeRow);
  if (!mappedTemplate) throw new Error("The new template could not be mapped to the portal.");
  if (params.scope) {
    mappedTemplate.scope = params.scope;
  }
  return mappedTemplate;
};

export const updateTemplateRecordInSupabase = async (params: {
  databaseId: string;
  lookupName: string;
  name: string;
  description: string;
  templateDescription: string;
  templateScope: "document_submission" | "other";
  scope?: "registration" | "renewal" | "both";
}) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const resolvedDatabaseId = await resolveTemplateDatabaseId(params.databaseId, params.lookupName);

  const { data, error } = await supabase.rpc("update_admin_template_document", {
    _session_token: adminSession.sessionToken,
    _template_id: resolvedDatabaseId,
    _name: params.name.trim(),
    _description: params.description.trim(),
    _template_description: params.templateDescription.trim(),
    _template_scope: params.templateScope,
  });

  if (error && isDuplicateNameError(error)) {
    throw new Error(`A form or template named "${params.name.trim()}" already exists. Please use a different name.`);
  }
  const updatedRow = Array.isArray(data) ? data[0] : null;
  if (error || !updatedRow) throw new Error(error?.message ?? "Failed to update the template.");

  if (params.scope) {
    await updateTemplateScopeInSupabase(resolvedDatabaseId, params.name, params.scope);
    updatedRow.scope = params.scope;
  }

  const mappedTemplate = mapTemplate(updatedRow as RequiredDocumentTypeRow);
  if (!mappedTemplate) throw new Error("The updated template could not be mapped to the portal.");
  if (params.scope) {
    mappedTemplate.scope = params.scope;
  }
  return mappedTemplate;
};

export const deleteTemplateRecordInSupabase = async (databaseId: string, name?: string) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const resolvedDatabaseId = await resolveTemplateDatabaseId(databaseId, name);

  const { error } = await supabase.rpc("deactivate_admin_template_document", {
    _session_token: adminSession.sessionToken,
    _template_id: resolvedDatabaseId,
  });

  if (error) throw new Error(error.message);
};

export const reactivateTemplateRecordInSupabase = async (databaseId: string, name?: string) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const resolvedDatabaseId = await resolveTemplateDatabaseId(databaseId, name);

  const { data, error } = await supabase.rpc("reactivate_admin_template_document", {
    _session_token: adminSession.sessionToken,
    _template_id: resolvedDatabaseId,
  });

  const updatedRow = Array.isArray(data) ? data[0] : null;
  if (error || !updatedRow) throw new Error(error?.message ?? "Failed to restore the template.");

  const mappedTemplate = mapTemplate(updatedRow as RequiredDocumentTypeRow);
  if (!mappedTemplate) throw new Error("The restored template could not be mapped to the portal.");
  return mappedTemplate;
};

export const updateTemplateCategoryInSupabase = async (databaseId: string, name: string | undefined, categories: string[]) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const resolvedDatabaseId = await resolveTemplateDatabaseId(databaseId, name);

  const { data, error } = await supabase.rpc("update_admin_template_category", {
    _session_token: adminSession.sessionToken,
    _template_id: resolvedDatabaseId,
    _template_category: categories,
  });

  const updatedRow = Array.isArray(data) ? data[0] : null;
  if (error || !updatedRow) throw new Error(error?.message ?? "Failed to update the template category.");

  const mappedTemplate = mapTemplate(updatedRow as RequiredDocumentTypeRow);
  if (!mappedTemplate) throw new Error("The updated template could not be mapped to the portal.");
  return mappedTemplate;
};

export const permanentlyDeleteTemplateRecordInSupabase = async (databaseId: string, name?: string) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const resolvedDatabaseId = await resolveTemplateDatabaseId(databaseId, name);

  const { error } = await supabase.rpc("hard_delete_admin_template_document", {
    _session_token: adminSession.sessionToken,
    _template_id: resolvedDatabaseId,
  });

  if (error) throw new Error(error.message);
};

const resolvedFileUrlCache = new Map<string, { url: string; expiresAt: number }>();
const pendingFileUrlResolutions = new Map<string, Promise<string>>();
const missingStorageObjectsCache = new Set<string>();

export const resolveSupabaseFileUrl = async (value: string): Promise<string> => {
  if (!supabase || !value) return value || "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  const parsed = parseStorageUri(trimmed);
  if (!parsed) {
    // If not a storage:// URI and not http/blob, don't return unresolvable storage scheme
    return trimmed.startsWith("storage://") ? "" : trimmed;
  }

  const cacheKey = `${parsed.bucket}/${parsed.path}`;

  // Check negative cache (known non-existent files)
  if (missingStorageObjectsCache.has(cacheKey)) {
    return "";
  }

  // Check valid active cache
  const cached = resolvedFileUrlCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now + 60000) {
    return cached.url;
  }

  const pendingResolution = pendingFileUrlResolutions.get(cacheKey);
  if (pendingResolution) return pendingResolution;

  const resolution = (async () => {
    try {
      const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 3600);
      if (error) {
        const msg = (error.message || "").toLowerCase();
        const code = String((error as { statusCode?: string | number }).statusCode || "");
        if (
          code === "404" ||
          code === "400" ||
          msg.includes("not found") ||
          msg.includes("not_found") ||
          msg.includes("object not found") ||
          msg.includes("does not exist") ||
          msg.includes("bucket not found")
        ) {
          missingStorageObjectsCache.add(cacheKey);
          return "";
        }
        // Attempt canonical public URL fallback
        const { data: pubData } = supabase.storage.from(parsed.bucket).getPublicUrl(parsed.path);
        if (pubData?.publicUrl) {
          resolvedFileUrlCache.set(cacheKey, { url: pubData.publicUrl, expiresAt: now + 3500000 });
          return pubData.publicUrl;
        }
        return "";
      }
      if (data?.signedUrl) {
        resolvedFileUrlCache.set(cacheKey, { url: data.signedUrl, expiresAt: now + 3500000 });
        return data.signedUrl;
      }
      return "";
    } catch (err) {
      console.warn(`Storage URL resolution exception for ${cacheKey}:`, err);
      return "";
    } finally {
      pendingFileUrlResolutions.delete(cacheKey);
    }
  })();
  pendingFileUrlResolutions.set(cacheKey, resolution);
  return resolution;
};

// ─── YPOP Org-side mutations ──────────────────────────────────

export const createYpopEntryInSupabase = async (
  params: Omit<YPOPEntry, "id" | "createdAt" | "updatedAt">,
): Promise<YPOPEntry> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { session, organizationProfile } = await getAuthenticatedOrganizationContext();

  const { data, error } = await supabase
    .from("ypop_entries")
    .insert({
      organization_id: organizationProfile.id,
      submitted_by: session.user.id,
      semester: params.semester,
      semester_label: params.semesterLabel,
      points_earned: params.pointsEarned ?? 0,
      points_required: params.pointsRequired ?? 70,
      total_points: params.totalPoints ?? 100,
      status: params.status ?? "draft",
      admin_remarks: params.adminRemarks ?? "",
      submission_note: params.submissionNote ?? "",
      validation_deadline: params.validationDeadline || null,
      submitted_at: params.submittedAt || null,
      validated_at: params.validatedAt || null,
      revision_history: params.revisionHistory ?? [],
      org_led_project_count: params.orgLedProjectCount ?? 0,
      city_led_attendance: params.cityLedAttendance ?? [],
    })
    .select(YPOP_ENTRY_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return mapYpopEntry(data as YpopEntryRow);
};

export const updateYpopEntryInSupabase = async (
  entryId: string,
  patch: Partial<Omit<YPOPEntry, "id" | "createdAt" | "updatedAt">>,
): Promise<YPOPEntry> => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.semester !== undefined) dbPatch.semester = patch.semester;
  if (patch.semesterLabel !== undefined) dbPatch.semester_label = patch.semesterLabel;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.submissionNote !== undefined) dbPatch.submission_note = patch.submissionNote;
  if (patch.submittedAt !== undefined) dbPatch.submitted_at = patch.submittedAt || null;
  if (patch.pointsEarned !== undefined) dbPatch.points_earned = patch.pointsEarned;
  if (patch.orgLedProjectCount !== undefined) dbPatch.org_led_project_count = patch.orgLedProjectCount;
  if (patch.cityLedAttendance !== undefined) dbPatch.city_led_attendance = patch.cityLedAttendance;
  if (patch.revisionHistory !== undefined) dbPatch.revision_history = patch.revisionHistory;

  const { data, error } = await supabase
    .from("ypop_entries")
    .update(dbPatch)
    .eq("id", entryId)
    .select(YPOP_ENTRY_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return mapYpopEntry(data as YpopEntryRow);
};

export const deleteYpopEntryFromSupabase = async (entryId: string): Promise<void> => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("ypop_entries").delete().eq("id", entryId);
  if (error) throw new Error(error.message);
};

export const uploadYpopFileToSupabase = async (params: {
  entryId: string;
  organizationId: string;
  file: File;
}): Promise<YPOPFile> => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const storageUri = await uploadFileToStorage(YPOP_FILES_BUCKET, params.entryId, params.file);

  const { data, error } = await supabase
    .from("ypop_files")
    .insert({
      ypop_entry_id: params.entryId,
      organization_id: params.organizationId,
      file_name: params.file.name,
      file_url: storageUri,
      file_type: params.file.type || "",
      file_size: params.file.size,
    })
    .select("id,ypop_entry_id,organization_id,file_name,file_url,file_type,file_size,uploaded_at")
    .single();

  if (error) throw new Error(error.message);
  return mapYpopFile(data as YpopFileRow);
};

export const deleteYpopFileFromSupabase = async (fileId: string, fileUrl: string): Promise<void> => {
  if (!supabase) throw new Error("Supabase is not configured.");

  await removeStorageObjects([fileUrl]);
  const { error } = await supabase.from("ypop_files").delete().eq("id", fileId);
  if (error) throw new Error(error.message);
};

export const createYpopEventParticipationInSupabase = async (
  params: Omit<YPOPEventParticipation, "id" | "createdAt" | "updatedAt" | "revisionHistory" | "verifiedAt" | "proofSubmittedAt"> & {
    status?: YPOPEventParticipationStatus;
    proofSubmittedAt?: string | null;
  },
): Promise<YPOPEventParticipation> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { organizationProfile } = await getAuthenticatedOrganizationContext();

  // Check if existing participation record exists to avoid duplicate records
  const { data: existing } = await supabase
    .from("ypop_event_participations")
    .select(YPOP_EVENT_PARTICIPATION_COLUMNS)
    .eq("activity_id", params.activityId)
    .eq("organization_id", organizationProfile.id)
    .maybeSingle();

  if (existing) {
    return mapYpopEventParticipation(existing as YpopEventParticipationRow);
  }

  const initialStatus = params.status ?? "draft";
  const now = new Date().toISOString();

  // Insert participation record directly in the requested initial status (defaults to draft)
  const { data: inserted, error: insertError } = await supabase
    .from("ypop_event_participations")
    .insert({
      organization_id: organizationProfile.id,
      activity_id: params.activityId,
      activity_name: params.activityName,
      activity_date: params.activityDate || null,
      venue: params.venue || null,
      status: initialStatus,
      admin_remarks: params.adminRemarks || "",
      joined_at: params.joinedAt || now,
      proof_submitted_at: params.proofSubmittedAt || null,
      verified_at: null,
      revision_history: [
        { action: initialStatus, adminRemarks: initialStatus === "draft" ? "Draft saved on proof upload." : "Submitted for evaluation.", changedAt: now },
      ],
    })
    .select(YPOP_EVENT_PARTICIPATION_COLUMNS)
    .single();

  if (insertError) {
    // If direct insert fails, try RPC fallback and ensure status matches initialStatus
    const { data: rpcData, error: rpcError } = await supabase.rpc("join_ypop_city_activity", {
      _activity_id: params.activityId,
    });
    const row = Array.isArray(rpcData) ? rpcData[0] : null;
    if (!rpcError && row) {
      if (row.status !== initialStatus) {
        const { data: updatedRow } = await supabase
          .from("ypop_event_participations")
          .update({ status: initialStatus, updated_at: now })
          .eq("id", row.id)
          .select(YPOP_EVENT_PARTICIPATION_COLUMNS)
          .single();
        if (updatedRow) return mapYpopEventParticipation(updatedRow as YpopEventParticipationRow);
      }
      return mapYpopEventParticipation(row as YpopEventParticipationRow);
    }
    throw new Error(insertError.message);
  }

  return mapYpopEventParticipation(inserted as YpopEventParticipationRow);
};

export const ensureYpopEventParticipationInSupabase = async (params: {
  activityId: string;
  activityName: string;
  activityDate?: string;
  venue?: string;
}): Promise<YPOPEventParticipation> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { organizationProfile } = await getAuthenticatedOrganizationContext();

  const { data: existing } = await supabase
    .from("ypop_event_participations")
    .select(YPOP_EVENT_PARTICIPATION_COLUMNS)
    .eq("activity_id", params.activityId)
    .eq("organization_id", organizationProfile.id)
    .maybeSingle();

  if (existing) {
    return mapYpopEventParticipation(existing as YpopEventParticipationRow);
  }

  return createYpopEventParticipationInSupabase({
    organizationId: organizationProfile.id,
    activityId: params.activityId,
    activityName: params.activityName,
    activityDate: params.activityDate,
    venue: params.venue,
    status: "draft",
    adminRemarks: "",
    joinedAt: new Date().toISOString(),
  });
};

export const updateYpopEventParticipationInSupabase = async (
  participationId: string,
  patch: Partial<Omit<YPOPEventParticipation, "id" | "organizationId" | "createdAt" | "updatedAt">>,
): Promise<YPOPEventParticipation> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { organizationProfile } = await getAuthenticatedOrganizationContext();

  const { data: existing, error: fetchErr } = await supabase
    .from("ypop_event_participations")
    .select("id,status,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at")
    .eq("id", participationId)
    .eq("organization_id", organizationProfile.id)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!existing) throw new Error("Event participation record not found.");

  if (
    isSubmissionRevisionLocked({
      status: existing.status,
      revisionDueAt: existing.revision_due_at,
      revisionLocked: existing.revision_locked,
      revisionLockedAt: existing.revision_locked_at,
      revisionUnlockedAt: existing.revision_unlocked_at,
    })
  ) {
    throw new Error("Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.");
  }

  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.activityName !== undefined) dbPatch.activity_name = patch.activityName;
  if (patch.activityDate !== undefined) dbPatch.activity_date = patch.activityDate || null;
  if (patch.venue !== undefined) dbPatch.venue = patch.venue || null;
  if (patch.status !== undefined) {
    dbPatch.status = patch.status;
    if (patch.status === "pending_verification" || patch.status === "submitted") {
      dbPatch.revision_requested_at = null;
      dbPatch.revision_due_at = null;
      dbPatch.revision_locked_at = null;
    }
  }
  if (patch.adminRemarks !== undefined) dbPatch.admin_remarks = patch.adminRemarks;
  if (patch.joinedAt !== undefined) dbPatch.joined_at = patch.joinedAt || null;
  if (patch.proofSubmittedAt !== undefined) dbPatch.proof_submitted_at = patch.proofSubmittedAt || null;
  if (patch.verifiedAt !== undefined) dbPatch.verified_at = patch.verifiedAt || null;
  if (patch.revisionHistory !== undefined) dbPatch.revision_history = patch.revisionHistory;

  const { data, error } = await supabase
    .from("ypop_event_participations")
    .update(dbPatch)
    .eq("id", participationId)
    .select(YPOP_EVENT_PARTICIPATION_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return mapYpopEventParticipation(data as YpopEventParticipationRow);
};

export const uploadYpopEventFileToSupabase = async (params: {
  participationId: string;
  organizationId: string;
  file: File;
}): Promise<YPOPEventFile> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { organizationProfile } = await getAuthenticatedOrganizationContext();

  const { data: existing, error: fetchErr } = await supabase
    .from("ypop_event_participations")
    .select("id,status,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at")
    .eq("id", params.participationId)
    .eq("organization_id", organizationProfile.id)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (
    existing &&
    isSubmissionRevisionLocked({
      status: existing.status,
      revisionDueAt: existing.revision_due_at,
      revisionLocked: existing.revision_locked,
      revisionLockedAt: existing.revision_locked_at,
      revisionUnlockedAt: existing.revision_unlocked_at,
    })
  ) {
    throw new Error("Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.");
  }

  const storageUri = await uploadFileToStorage(YPOP_FILES_BUCKET, params.participationId, params.file);
  const { data, error } = await supabase
    .from("ypop_event_files")
    .insert({
      participation_id: params.participationId,
      organization_id: params.organizationId,
      file_name: params.file.name,
      file_url: storageUri,
      file_type: params.file.type || "",
      file_size: params.file.size,
    })
    .select("id,participation_id,organization_id,file_name,file_url,file_type,file_size,uploaded_at")
    .single();

  if (error) throw new Error(error.message);
  const mapped = mapYpopEventFile(data as YpopEventFileRow);
  await addYpopFileToCachedList<YPOPEventFile>(
    ["user", params.organizationId, "ypop", "event-files", params.participationId], mapped,
  );

  void dispatchAdminNotificationInSupabase({
    eventType: "ypop_submission",
    organizationId: params.organizationId,
    organizationName: organizationProfile.organization_name,
    referenceId: params.participationId,
    subject: `Event Participation Proof: ${params.file.name}`,
  });

  return mapped;
};

export const deleteYpopEventFileFromSupabase = async (fileId: string, fileUrl?: string): Promise<void> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: file, error: fileError } = await supabase.from("ypop_event_files")
    .select("participation_id,organization_id").eq("id", fileId).maybeSingle();
  if (fileError) throw new Error(fileError.message);

  if (fileUrl) {
    await removeStorageObjects([fileUrl]).catch((err) => {
      console.warn("Storage deletion warning (non-fatal):", err);
    });
  }
  const { error } = await supabase.from("ypop_event_files").delete().eq("id", fileId);
  if (error) throw new Error(error.message);
  if (file) await removeYpopFileFromCachedList<YPOPEventFile>(
    ["user", file.organization_id, "ypop", "event-files", file.participation_id], fileId,
  );
};

export const createYpopOrgActivityInSupabase = async (
  params: Omit<YPOPOrgActivity, "id" | "createdAt" | "updatedAt" | "approvedAt" | "revisionHistory">,
): Promise<YPOPOrgActivity> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { session, organizationProfile } = await getAuthenticatedOrganizationContext();
  const { data: entry, error: entryError } = await supabase
    .from("ypop_entries")
    .select("id,semester,status")
    .eq("id", params.ypopEntryId)
    .eq("organization_id", organizationProfile.id)
    .maybeSingle();
  if (entryError) throw new Error(entryError.message);
  if (entry?.semester) {
    const { data: period } = await supabase
      .from("ypop_periods")
      .select("status")
      .eq("semester_key", entry.semester)
      .maybeSingle();
    if (period && period.status !== "open") {
      throw new Error("Organization PPAs can only be logged while the YPOP semester is open.");
    }
  }

  const initialStatus = params.status ?? "draft";
  const now = new Date().toISOString();
  const submittedAt =
    initialStatus === "draft"
      ? ""
      : params.submittedAt || now;
  const { data, error } = await supabase
    .from("ypop_org_activities")
    .insert({
      ypop_entry_id: params.ypopEntryId,
      organization_id: organizationProfile.id,
      submitted_by: session.user.id,
      activity_name: params.activityName,
      activity_date: params.activityDate || null,
      venue: params.venue || null,
      narrative_report: params.narrativeReport ?? "",
      total_attendees: params.totalAttendees !== undefined ? params.totalAttendees : null,
      girls_attendees: params.girlsAttendees !== undefined ? params.girlsAttendees : null,
      boys_attendees: params.boysAttendees !== undefined ? params.boysAttendees : null,
      status: initialStatus,
      admin_remarks: params.adminRemarks ?? "",
      submitted_at: submittedAt || null,
      approved_at: null,
      revision_history: [
        {
          action: initialStatus,
          adminRemarks:
            params.adminRemarks ??
            (initialStatus === "draft"
              ? "Organization created an organization-initiated activity draft."
              : "Organization submitted an organization-initiated activity log."),
          changedAt: submittedAt || now,
        },
      ],
    })
    .select(YPOP_ORG_ACTIVITY_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  const mapped = mapYpopOrgActivity(data as YpopOrgActivityRow);

  if (initialStatus === "pending_evaluation" || initialStatus === "submitted") {
    void dispatchAdminNotificationInSupabase({
      eventType: "ypop_submission",
      organizationId: organizationProfile.id,
      organizationName: organizationProfile.organization_name,
      referenceId: mapped.id,
      subject: `PPA Activity Log: ${params.activityName}`,
      details: params.narrativeReport,
    });
  }

  return mapped;
};

export const updateYpopOrgActivityInSupabase = async (
  activityId: string,
  patch: Partial<Omit<YPOPOrgActivity, "id" | "organizationId" | "createdAt" | "updatedAt">>,
): Promise<YPOPOrgActivity> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { organizationProfile } = await getAuthenticatedOrganizationContext();
  const { data: activity, error: activityError } = await supabase
    .from("ypop_org_activities")
    .select("id,ypop_entry_id,status,activity_name,activity_date,venue,narrative_report,total_attendees,girls_attendees,boys_attendees,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at")
    .eq("id", activityId)
    .eq("organization_id", organizationProfile.id)
    .maybeSingle();
  if (activityError) throw new Error(activityError.message);
  if (!activity) throw new Error("PPA submission not found.");
  if (
    isSubmissionRevisionLocked({
      status: activity.status,
      revisionDueAt: activity.revision_due_at,
      revisionLocked: activity.revision_locked,
      revisionLockedAt: activity.revision_locked_at,
      revisionUnlockedAt: activity.revision_unlocked_at,
    })
  ) {
    throw new Error("Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.");
  }
  if (activity.status !== "draft" && activity.status !== "needs_revision") {
    throw new Error("This PPA is locked while it is under review or after a final decision.");
  }
  const { data: entry, error: entryError } = await supabase
    .from("ypop_entries")
    .select("semester")
    .eq("id", activity.ypop_entry_id)
    .eq("organization_id", organizationProfile.id)
    .maybeSingle();
  if (entryError) throw new Error(entryError.message);
  if (entry?.semester) {
    const { data: period } = await supabase
      .from("ypop_periods")
      .select("status")
      .eq("semester_key", entry.semester)
      .maybeSingle();
    if (period && period.status !== "open") {
      throw new Error("PPA submissions can only be edited while the YPOP semester is open.");
    }
  }

  // Canonical submission validation at backend boundary
  if (patch.status === "pending_evaluation" || patch.status === "submitted") {
    const finalName = (patch.activityName !== undefined ? patch.activityName : activity.activity_name)?.trim();
    const finalDate = patch.activityDate !== undefined ? patch.activityDate : activity.activity_date;
    const finalVenue = (patch.venue !== undefined ? patch.venue : activity.venue)?.trim();
    const finalNarrative = (patch.narrativeReport !== undefined ? patch.narrativeReport : activity.narrative_report)?.trim();

    if (!finalName) throw new Error("Activity Title is required before submitting for review.");
    if (!finalDate) throw new Error("Date Conducted is required before submitting for review.");
    if (!finalVenue) throw new Error("Venue / Location is required before submitting for review.");
    if (!finalNarrative) throw new Error("Description is required before submitting for review.");

    const finalTotal = patch.totalAttendees !== undefined ? patch.totalAttendees : (activity.total_attendees !== null && activity.total_attendees !== undefined ? Number(activity.total_attendees) : null);
    const finalGirls = patch.girlsAttendees !== undefined ? patch.girlsAttendees : (activity.girls_attendees !== null && activity.girls_attendees !== undefined ? Number(activity.girls_attendees) : null);
    const finalBoys = patch.boysAttendees !== undefined ? patch.boysAttendees : (activity.boys_attendees !== null && activity.boys_attendees !== undefined ? Number(activity.boys_attendees) : null);

    if (finalTotal === null || finalTotal === undefined || finalGirls === null || finalGirls === undefined || finalBoys === null || finalBoys === undefined) {
      throw new Error("Attendee information is required before submitting for review.");
    }
    if (finalTotal < 1) {
      throw new Error("Total attendees must be at least 1.");
    }
    if (finalGirls < 0 || finalBoys < 0) {
      throw new Error("Attendee counts cannot be negative.");
    }
    if (finalGirls + finalBoys !== finalTotal) {
      throw new Error("Girls and boys counts must equal the total number of attendees.");
    }

    const { count, error: filesErr } = await supabase
      .from("ypop_org_activity_files")
      .select("id", { count: "exact", head: true })
      .eq("org_activity_id", activityId);
    if (filesErr) throw new Error(filesErr.message);
    if (!count || count === 0) {
      throw new Error("At least one supporting document must be attached before submitting for review.");
    }
  }

  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.activityName !== undefined) dbPatch.activity_name = patch.activityName;
  if (patch.activityDate !== undefined) dbPatch.activity_date = patch.activityDate || null;
  if (patch.venue !== undefined) dbPatch.venue = patch.venue || null;
  if (patch.narrativeReport !== undefined) dbPatch.narrative_report = patch.narrativeReport;
  if (patch.totalAttendees !== undefined) dbPatch.total_attendees = patch.totalAttendees;
  if (patch.girlsAttendees !== undefined) dbPatch.girls_attendees = patch.girlsAttendees;
  if (patch.boysAttendees !== undefined) dbPatch.boys_attendees = patch.boysAttendees;
  if (patch.status !== undefined) {
    dbPatch.status = patch.status;
    if (patch.status === "pending_evaluation" || patch.status === "submitted") {
      dbPatch.revision_requested_at = null;
      dbPatch.revision_due_at = null;
      dbPatch.revision_locked_at = null;
    }
  }
  if (patch.adminRemarks !== undefined) dbPatch.admin_remarks = patch.adminRemarks;
  if (patch.submittedAt !== undefined) dbPatch.submitted_at = patch.submittedAt || null;
  if (patch.approvedAt !== undefined) dbPatch.approved_at = patch.approvedAt || null;
  if (patch.revisionHistory !== undefined) dbPatch.revision_history = patch.revisionHistory;

  const { data, error } = await supabase
    .from("ypop_org_activities")
    .update(dbPatch)
    .eq("id", activityId)
    .select(YPOP_ORG_ACTIVITY_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  const mapped = mapYpopOrgActivity(data as YpopOrgActivityRow);

  if (patch.status === "pending_evaluation" || patch.status === "submitted") {
    void dispatchAdminNotificationInSupabase({
      eventType: activity.status === "needs_revision" ? "revision_resubmission" : "ypop_submission",
      organizationId: organizationProfile.id,
      organizationName: organizationProfile.organization_name,
      referenceId: activityId,
      subject: `PPA Activity Log: ${patch.activityName || activity.activity_name}`,
      details: patch.narrativeReport || activity.narrative_report,
    });
  }

  return mapped;
};

export const deleteYpopOrgActivityFromSupabase = async (activityId: string): Promise<void> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { session, organizationProfile } = await getAuthenticatedOrganizationContext();
  const { data: activity, error: activityLoadError } = await supabase
    .from("ypop_org_activities")
    .select("id,ypop_entry_id,status,activity_name,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at")
    .eq("id", activityId)
    .eq("organization_id", organizationProfile.id)
    .maybeSingle();
  if (activityLoadError) throw new Error(activityLoadError.message);
  if (!activity) {
    throw new Error("PPA submission not found.");
  }
  if (
    isSubmissionRevisionLocked({
      status: activity.status,
      revisionDueAt: activity.revision_due_at,
      revisionLocked: activity.revision_locked,
      revisionLockedAt: activity.revision_locked_at,
      revisionUnlockedAt: activity.revision_unlocked_at,
    })
  ) {
    throw new Error("Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.");
  }
  if (activity.status === "approved") {
    throw new Error("Approved PPA submissions cannot be deleted.");
  }
  if (!["draft", "submitted", "under_review", "needs_revision", "rejected"].includes(activity.status)) {
    throw new Error("This PPA can no longer be deleted.");
  }
  const { data: entry } = await supabase
    .from("ypop_entries")
    .select("semester")
    .eq("id", activity.ypop_entry_id)
    .eq("organization_id", organizationProfile.id)
    .maybeSingle();
  if (entry?.semester) {
    const { data: period } = await supabase
      .from("ypop_periods")
      .select("status")
      .eq("semester_key", entry.semester)
      .maybeSingle();
    if (period && period.status !== "open") {
      throw new Error("PPA submissions can only be deleted while the YPOP semester is open.");
    }
  }

  // 1. Fetch all associated files to clean up storage objects safely
  const { data: files } = await supabase
    .from("ypop_org_activity_files")
    .select("id,file_url")
    .eq("org_activity_id", activityId);

  if (files && files.length > 0) {
    const fileUrls = files.map((f) => f.file_url).filter(Boolean);
    if (fileUrls.length > 0) {
      await removeStorageObjects(fileUrls).catch((err) => {
        console.warn("Storage deletion warning during PPA removal (non-fatal):", err);
      });
    }
    await supabase.from("ypop_org_activity_files").delete().eq("org_activity_id", activityId);
  }

  // 2. Authoritative deletion of the activity
  const { error } = await supabase.from("ypop_org_activities").delete().eq("id", activityId);
  if (error) throw new Error(error.message);

  // 3. Log destructive organizational action to activity_logs
  try {
    await supabase.from("activity_logs").insert({
      organization_id: organizationProfile.id,
      actor_user_id: session.user.id,
      action: "ppa_deleted",
      related_type: "ypop_org_activity",
      related_id: activityId,
      description: `Organization deleted PPA: ${activity.activity_name || "Untitled Activity"}`,
    });
  } catch (logErr) {
    console.warn("Activity log insertion warning (non-fatal):", logErr);
  }
};

export const uploadYpopOrgActivityFileToSupabase = async (params: {
  orgActivityId: string;
  organizationId: string;
  file: File;
}): Promise<YPOPOrgActivityFile> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { organizationProfile } = await getAuthenticatedOrganizationContext();
  const { data: activity, error: activityError } = await supabase
    .from("ypop_org_activities")
    .select("id,ypop_entry_id,status,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at")
    .eq("id", params.orgActivityId)
    .eq("organization_id", organizationProfile.id)
    .maybeSingle();
  if (activityError) throw new Error(activityError.message);
  if (!activity || !["draft", "needs_revision"].includes(activity.status)) {
    throw new Error("This PPA no longer accepts file changes.");
  }
  if (
    isSubmissionRevisionLocked({
      status: activity.status,
      revisionDueAt: activity.revision_due_at,
      revisionLocked: activity.revision_locked,
      revisionLockedAt: activity.revision_locked_at,
      revisionUnlockedAt: activity.revision_unlocked_at,
    })
  ) {
    throw new Error("Submission is locked. The revision deadline has expired or the submission has not been unlocked by an administrator.");
  }
  const { data: entry } = await supabase
    .from("ypop_entries")
    .select("semester")
    .eq("id", activity.ypop_entry_id)
    .eq("organization_id", organizationProfile.id)
    .maybeSingle();
  if (entry?.semester) {
    const { data: period } = await supabase
      .from("ypop_periods")
      .select("status")
      .eq("semester_key", entry.semester)
      .maybeSingle();
    if (period && period.status !== "open") {
      throw new Error("PPA attachments can only be uploaded while the YPOP semester is open.");
    }
  }

  const storageUri = await uploadFileToStorage(YPOP_FILES_BUCKET, params.orgActivityId, params.file);
  const { data, error } = await supabase
    .from("ypop_org_activity_files")
    .insert({
      org_activity_id: params.orgActivityId,
      organization_id: params.organizationId,
      file_name: params.file.name,
      file_url: storageUri,
      file_type: params.file.type || "",
      file_size: params.file.size,
    })
    .select("id,org_activity_id,organization_id,file_name,file_url,file_type,file_size,uploaded_at")
    .single();

  if (error) throw new Error(error.message);
  const mapped = mapYpopOrgActivityFile(data as YpopOrgActivityFileRow);
  await addYpopFileToCachedList<YPOPOrgActivityFile>(
    ["user", params.organizationId, "ypop", "org-activity-files", params.orgActivityId], mapped,
  );
  return mapped;
};

export const deleteYpopOrgActivityFileFromSupabase = async (fileId: string, fileUrl: string): Promise<void> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { organizationProfile } = await getAuthenticatedOrganizationContext();
  const { data: file, error: fileError } = await supabase
    .from("ypop_org_activity_files")
    .select("id,org_activity_id,organization_id")
    .eq("id", fileId)
    .eq("organization_id", organizationProfile.id)
    .maybeSingle();
  if (fileError) throw new Error(fileError.message);
  const { data: activity, error: activityError } = file
    ? await supabase
      .from("ypop_org_activities")
      .select("status,ypop_entry_id")
      .eq("id", file.org_activity_id)
      .eq("organization_id", organizationProfile.id)
      .maybeSingle()
    : { data: null, error: null };
  if (activityError) throw new Error(activityError.message);
  if (!file || !activity || !["draft", "needs_revision"].includes(activity.status)) {
    throw new Error("This PPA attachment can no longer be removed.");
  }
  const { data: entry } = await supabase
    .from("ypop_entries")
    .select("semester")
    .eq("id", activity.ypop_entry_id)
    .eq("organization_id", organizationProfile.id)
    .maybeSingle();
  if (entry?.semester) {
    const { data: period } = await supabase
      .from("ypop_periods")
      .select("status")
      .eq("semester_key", entry.semester)
      .maybeSingle();
    if (period && period.status !== "open") {
      throw new Error("PPA attachments can only be deleted while the YPOP semester is open.");
    }
  }

  await removeStorageObjects([fileUrl]);
  const { error } = await supabase.from("ypop_org_activity_files").delete().eq("id", fileId);
  if (error) throw new Error(error.message);
  await removeYpopFileFromCachedList<YPOPOrgActivityFile>(
    ["user", organizationProfile.id, "ypop", "org-activity-files", file.org_activity_id], fileId,
  );
};

// ─── YPOP Admin mutations (SECURITY DEFINER RPCs) ────────────

export const adminCreateYpopPeriodInSupabase = async (
  period: Omit<YPOPPeriod, "id" | "createdAt" | "updatedAt">,
): Promise<YPOPPeriod> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_create_ypop_period", {
    _session_token: adminSession.sessionToken,
    _semester_key: period.semesterKey,
    _semester_label: period.semesterLabel,
    _validation_deadline: period.validationDeadline || null,
    _status: period.status,
    _org_led_tiers: period.orgLedTiers ?? [],
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) throw new Error("No data returned from admin_create_ypop_period.");
  return mapYpopPeriod(row as YpopPeriodRow);
};

export const adminUpdateYpopPeriodInSupabase = async (
  id: string,
  patch: Partial<YPOPPeriod>,
): Promise<YPOPPeriod> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_update_ypop_period", {
    _session_token: adminSession.sessionToken,
    _period_id: id,
    _semester_label: patch.semesterLabel ?? null,
    _validation_deadline: patch.validationDeadline || null,
    _status: patch.status ?? null,
    _org_led_tiers: patch.orgLedTiers ?? null,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) throw new Error("No data returned from admin_update_ypop_period.");
  return mapYpopPeriod(row as YpopPeriodRow);
};

export const adminDeleteYpopPeriodFromSupabase = async (id: string): Promise<void> => {
  const adminSession = getAuthenticatedAdminSession();
  const { error } = await supabase!.rpc("admin_delete_ypop_period", {
    _session_token: adminSession.sessionToken,
    _period_id: id,
  });
  if (error) throw new Error(error.message);
};

export const adminCreateYpopCityActivityInSupabase = async (
  activity: Omit<YPOPCityActivity, "id" | "createdAt">,
): Promise<YPOPCityActivity> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_create_ypop_city_activity", {
    _session_token: adminSession.sessionToken,
    _semester_key: activity.semesterKey,
    _name: activity.name,
    _start_date: activity.startDate || null,
    _end_date: activity.endDate || activity.startDate || null,
    _venue: activity.venue || null,
    _points: activity.points,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) throw new Error("No data returned from admin_create_ypop_city_activity.");
  return mapYpopCityActivity(row as YpopCityActivityRow);
};

export const adminUpdateYpopCityActivityInSupabase = async (
  id: string,
  patch: Partial<YPOPCityActivity>,
): Promise<YPOPCityActivity> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_update_ypop_city_activity", {
    _session_token: adminSession.sessionToken,
    _activity_id: id,
    _name: patch.name ?? null,
    _start_date: patch.startDate ?? null,
    _end_date: patch.endDate ?? null,
    _venue: patch.venue ?? null,
    _points: patch.points ?? null,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) throw new Error("No data returned from admin_update_ypop_city_activity.");
  return mapYpopCityActivity(row as YpopCityActivityRow);
};

export const adminDeleteYpopCityActivityFromSupabase = async (id: string): Promise<void> => {
  const adminSession = getAuthenticatedAdminSession();
  const { error } = await supabase!.rpc("admin_delete_ypop_city_activity", {
    _session_token: adminSession.sessionToken,
    _activity_id: id,
  });
  if (error) throw new Error(error.message);
};

export type ActivityAnnouncementRecipient = {
  organization_id?: string;
  organization_name: string;
  organization_email: string;
};

export type ActivityAnnouncementResult = {
  status: "sent" | "partial_failure" | "failed" | "already_sent" | "ready";
  recipient_count?: number;
  successful_count?: number;
  failed_count?: number;
  eligible_count?: number;
  recipients?: ActivityAnnouncementRecipient[];
  announcement_id?: string;
  message?: string;
  activity?: {
    id: string;
    name: string;
    startDate?: string;
    endDate?: string;
    venue?: string;
    points?: number;
  };
};

export const adminPreflightCityActivityAnnouncement = async (activityId: string): Promise<ActivityAnnouncementResult> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = getAuthenticatedAdminSession();

  const { data, error } = await supabase.functions.invoke("send-activity-announcement", {
    body: {
      action: "preflight",
      session_token: adminSession.sessionToken,
      activity_id: activityId,
      site_url: window.location.origin,
    },
  });

  if (error) {
    const extracted = await extractEdgeFunctionError(error, "Failed to run announcement preflight check.");
    throw new Error(extracted.message);
  }

  const result = data as ActivityAnnouncementResult;
  if (!result) {
    throw new Error("Unable to load eligible recipients from announcement service.");
  }
  return result;
};

export const adminSendCityActivityAnnouncement = async (
  activityId: string,
  idempotencyKey?: string,
): Promise<ActivityAnnouncementResult> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = getAuthenticatedAdminSession();

  const stableKey = idempotencyKey || `announcement-${activityId}`;

  const { data, error } = await supabase.functions.invoke("send-activity-announcement", {
    body: {
      action: "send",
      session_token: adminSession.sessionToken,
      activity_id: activityId,
      site_url: window.location.origin,
      idempotency_key: stableKey,
    },
  });

  if (error) {
    const extracted = await extractEdgeFunctionError(error, "Failed to dispatch activity announcement.");
    throw new Error(extracted.message);
  }

  const result = data as ActivityAnnouncementResult;
  if (!result) {
    throw new Error("No response received from announcement service.");
  }
  return result;
};

export const adminGetActivityAnnouncementsFromSupabase = async (
  activityId: string,
): Promise<Array<{
  id: string;
  activityId: string;
  sentBy: string | null;
  recipientCount: number;
  successfulCount: number;
  failedCount: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}>> => {
  if (!supabase) return [];
  const adminSession = getAuthenticatedAdminSession();
  try {
    const { data, error } = await supabase.rpc("admin_get_activity_announcements", {
      _session_token: adminSession.sessionToken,
      _activity_id: activityId,
    });
    if (error || !data) return [];
    return (data as any[]).map((row) => ({
      id: row.id,
      activityId: row.activity_id,
      sentBy: row.sent_by,
      recipientCount: row.recipient_count ?? 0,
      successfulCount: row.successful_count ?? 0,
      failedCount: row.failed_count ?? 0,
      status: row.status ?? "pending",
      errorMessage: row.error_message ?? null,
      createdAt: row.created_at,
      sentAt: row.sent_at,
    }));
  } catch {
    return [];
  }
};

export const ensureAdminSessionInSupabase = async (sessionToken: string, username = "lydoadmin"): Promise<void> => {
  if (!supabase) return;
  try {
    await supabase.rpc("ensure_admin_demo_session", {
      _session_token: sessionToken,
      _username: username,
    });
  } catch (err) {
    console.debug("ensure_admin_demo_session notice:", err);
  }
};

export const adminUpdateYpopEntryInSupabase = async (
  id: string,
  patch: Partial<YPOPEntry>,
): Promise<YPOPEntry> => {
  const adminSession = getAuthenticatedAdminSession();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  let finalRevisionHistory = patch.revisionHistory;
  let revisionRequestedAt: string | null = null;
  let revisionDueAt: string | null = null;

  if (patch.status === "needs_revision") {
    const deadline = calculateRevisionDeadline();
    revisionRequestedAt = deadline.requestedAt;
    revisionDueAt = deadline.dueAt;

    if (Array.isArray(finalRevisionHistory) && finalRevisionHistory.length > 0) {
      const lastIdx = finalRevisionHistory.length - 1;
      const lastItem = finalRevisionHistory[lastIdx];
      if (lastItem && typeof lastItem === "object") {
        finalRevisionHistory = [
          ...finalRevisionHistory.slice(0, lastIdx),
          { ...lastItem, revisionDueAt: deadline.dueAt },
        ];
      }
    }
  }

  if (isUuid) {
    const { data, error } = await supabase!.rpc("admin_update_ypop_entry", {
      _session_token: adminSession.sessionToken,
      _entry_id: id,
      _status: patch.status ?? null,
      _admin_remarks: patch.adminRemarks ?? null,
      _points_earned: patch.pointsEarned ?? null,
      _org_led_project_count: patch.orgLedProjectCount ?? null,
      _city_led_attendance: patch.cityLedAttendance ?? null,
      _revision_history: finalRevisionHistory ?? null,
      _validated_at: patch.validatedAt || null,
    });

    if (patch.status === "needs_revision" && revisionDueAt) {
      await supabase!
        .from("ypop_entries")
        .update({
          revision_requested_at: revisionRequestedAt,
          revision_due_at: revisionDueAt,
          revision_locked_at: null,
        })
        .eq("id", id);
    }

    if (!error) {
      const row = Array.isArray(data) ? data[0] : (data && typeof data === "object" ? data : null);
      if (row) {
        return mapYpopEntry(row as YpopEntryRow);
      }
      const { data: fetched } = await supabase!.from("ypop_entries").select("*").eq("id", id).maybeSingle();
      if (fetched) return mapYpopEntry(fetched as YpopEntryRow);
    } else {
      console.warn("admin_update_ypop_entry RPC warning:", error.message);
      const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.status !== undefined) updatePayload.status = patch.status;
      if (patch.adminRemarks !== undefined) updatePayload.admin_remarks = patch.adminRemarks;
      if (patch.pointsEarned !== undefined) updatePayload.points_earned = patch.pointsEarned;
      if (patch.orgLedProjectCount !== undefined) updatePayload.org_led_project_count = patch.orgLedProjectCount;
      if (patch.cityLedAttendance !== undefined) updatePayload.city_led_attendance = patch.cityLedAttendance;
      if (finalRevisionHistory !== undefined) updatePayload.revision_history = finalRevisionHistory;
      if (patch.validatedAt !== undefined) updatePayload.validated_at = patch.validatedAt || null;
      if (patch.status === "needs_revision" && revisionDueAt) {
        updatePayload.revision_requested_at = revisionRequestedAt;
        updatePayload.revision_due_at = revisionDueAt;
        updatePayload.revision_locked_at = null;
      }

      const { data: directData, error: directError } = await supabase!
        .from("ypop_entries")
        .update(updatePayload)
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (!directError && directData) {
        return mapYpopEntry(directData as YpopEntryRow);
      }
      throw new Error(error.message);
    }
  }

  return {
    id,
    organizationId: patch.organizationId ?? "",
    submittedBy: patch.submittedBy ?? "",
    semester: patch.semester ?? "",
    semesterLabel: patch.semesterLabel ?? "",
    pointsEarned: patch.pointsEarned ?? 0,
    pointsRequired: patch.pointsRequired ?? 70,
    totalPoints: patch.totalPoints ?? 100,
    status: patch.status ?? "draft",
    adminRemarks: patch.adminRemarks ?? "",
    submissionNote: patch.submissionNote ?? "",
    validationDeadline: patch.validationDeadline ?? "",
    submittedAt: patch.submittedAt ?? "",
    validatedAt: patch.validatedAt ?? "",
    revisionRequestedAt,
    revisionDueAt,
    revisionLockedAt: null,
    revisionHistory: finalRevisionHistory ?? [],
    orgLedProjectCount: patch.orgLedProjectCount ?? 0,
    cityLedAttendance: patch.cityLedAttendance ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const adminUpdateYpopEventParticipationInSupabase = async (
  id: string,
  patch: Partial<YPOPEventParticipation>,
): Promise<YPOPEventParticipation> => {
  if (patch.status === "rejected" || (patch.status as string) === "rejected_red") {
    throw new Error("Reject is no longer an available review decision. Only Verified and Needs Revision are allowed.");
  }
  if (patch.status === "needs_revision" && !patch.adminRemarks?.trim()) {
    throw new Error("A non-empty admin remark is required when requesting revision.");
  }
  const adminSession = getAuthenticatedAdminSession();

  let finalRevisionHistory = patch.revisionHistory;
  let revisionRequestedAt: string | null = null;
  let revisionDueAt: string | null = null;

  if (patch.status === "needs_revision") {
    const deadline = calculateRevisionDeadline();
    revisionRequestedAt = deadline.requestedAt;
    revisionDueAt = deadline.dueAt;

    if (Array.isArray(finalRevisionHistory) && finalRevisionHistory.length > 0) {
      const lastIdx = finalRevisionHistory.length - 1;
      const lastItem = finalRevisionHistory[lastIdx];
      if (lastItem && typeof lastItem === "object") {
        finalRevisionHistory = [
          ...finalRevisionHistory.slice(0, lastIdx),
          { ...lastItem, revisionDueAt: deadline.dueAt },
        ];
      }
    }
  }

  const { data, error } = await supabase!.rpc("admin_update_ypop_event_participation", {
    _session_token: adminSession.sessionToken,
    _participation_id: id,
    _status: patch.status ?? null,
    _admin_remarks: patch.adminRemarks ?? null,
    _proof_submitted_at: patch.proofSubmittedAt || null,
    _verified_at: patch.verifiedAt || null,
    _revision_history: finalRevisionHistory ?? null,
  });
  if (error) throw new Error(error.message);

  if (patch.status === "needs_revision" && revisionDueAt) {
    await supabase!
      .from("ypop_event_participations")
      .update({
        revision_requested_at: revisionRequestedAt,
        revision_due_at: revisionDueAt,
        revision_locked_at: null,
      })
      .eq("id", id);
  }

  const row = Array.isArray(data) ? data[0] : (data && typeof data === "object" ? data : null);
  if (!row) {
    const { data: fetched, error: fetchErr } = await supabase!
      .from("ypop_event_participations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetched && !fetchErr) {
      return mapYpopEventParticipation(fetched as YpopEventParticipationRow);
    }
    throw new Error("No data returned from admin_update_ypop_event_participation.");
  }

  if (patch.status && ["approved", "needs_revision", "rejected"].includes(patch.status)) {
    const updatedStatus = patch.status;
    void (async () => {
      try {
        const { data: part } = await supabase!
          .from("ypop_event_participations")
          .select("organization_id, ypop_city_activities(name)")
          .eq("id", id)
          .single();
        if (part?.organization_id) {
          const evType: OrgTransactionalEmailEventType =
            updatedStatus === "approved" ? "ypop_approved" : updatedStatus === "needs_revision" ? "ypop_needs_revision" : "ypop_rejected";
          const activityName = (part as unknown as { ypop_city_activities?: { name?: string } })?.ypop_city_activities?.name || "City-Led Activity";
          await dispatchOrgTransactionalEmailInSupabase({
            eventType: evType,
            organizationId: part.organization_id,
            referenceId: id,
            status: updatedStatus,
            remarks: patch.adminRemarks || undefined,
            itemName: `YPOP Activity: ${activityName}`,
          });
        }
      } catch (e) {
        console.warn("Non-fatal email dispatch error for YPOP participation update:", e);
      }
    })();
  }

  return mapYpopEventParticipation(row as YpopEventParticipationRow);
};

export const adminUpdateBudgetRequestFileStatusInSupabase = async (
  id: string,
  patch: Partial<BudgetRequestFile>,
): Promise<BudgetRequestFile> => {
  if (patch.adminStatus === "rejected_red" || (patch.adminStatus as string) === "rejected") {
    throw new Error("Reject is no longer an available review decision. Only Approved and Needs Revision are allowed.");
  }
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_update_budget_request_file_status", {
    _session_token: adminSession.sessionToken,
    _file_id: id,
    _admin_status: patch.adminStatus ?? null,
    _admin_remarks: patch.adminRemarks ?? null,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) throw new Error("No data returned from admin_update_budget_request_file_status.");

  if (patch.adminStatus && ["awaiting_release", "approved_green", "approved_for_ftf_green", "needs_revision", "rejected_red", "approved", "rejected"].includes(patch.adminStatus)) {
    const updatedStatus = patch.adminStatus;
    void (async () => {
      try {
        const { data: fileRow } = await supabase!
          .from("budget_request_files")
          .select("budget_request_id, file_name")
          .eq("id", id)
          .maybeSingle();
        if (fileRow?.budget_request_id) {
          const { data: reqRow } = await supabase!
            .from("budget_requests")
            .select("organization_id, activity_title")
            .eq("id", fileRow.budget_request_id)
            .maybeSingle();
          if (reqRow?.organization_id) {
            await dispatchOrgTransactionalEmailInSupabase({
              eventType: "budget_status_update",
              organizationId: reqRow.organization_id,
              referenceId: id,
              status: updatedStatus,
              remarks: patch.adminRemarks || undefined,
              itemName: `Budget Request: ${reqRow.activity_title || fileRow?.file_name || "Budget Proposal"}`,
            });
          }
        }
      } catch (e) {
        console.warn("Non-fatal email dispatch error for budget file status update:", e);
      }
    })();
  }

  return mapBudgetRequestFile(row as BudgetRequestFileRow);
};

type PublicBudgetSourceRow = {
  id: string;
  fiscal_year: number;
  amount: number | string;
  purpose: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const mapPublicBudgetSource = (row: PublicBudgetSourceRow): PublicBudgetSource => ({
  id: row.id,
  fiscalYear: row.fiscal_year,
  amount: normalizeNumeric(row.amount),
  purpose: row.purpose,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const adminGetPublicBudgetSourcesFromSupabase = async (fiscalYear: number): Promise<PublicBudgetSource[]> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_get_public_budget_sources", {
    _session_token: adminSession.sessionToken,
    _fiscal_year: fiscalYear,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as PublicBudgetSourceRow[]).map(mapPublicBudgetSource);
};

export const adminSavePublicBudgetSourcesInSupabase = async (
  fiscalYear: number,
  sources: Array<{ amount: number; purpose: string; sortOrder: number }>,
): Promise<PublicBudgetSource[]> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_save_public_budget_sources", {
    _session_token: adminSession.sessionToken,
    _fiscal_year: fiscalYear,
    _sources: sources,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as PublicBudgetSourceRow[]).map(mapPublicBudgetSource);
};

type PublicBudgetSnapshotSettingsRow = {
  default_fiscal_year: number | null;
  allow_fiscal_year_switch: boolean;
  show_utilization_progress: boolean;
  show_total_fy_budget: boolean;
  show_approved_budget: boolean;
  show_released_budget: boolean;
  show_liquidated_budget: boolean;
  show_allocation_breakdown: boolean;
  updated_at: string;
};

const mapPublicBudgetSnapshotSettings = (row: PublicBudgetSnapshotSettingsRow): PublicBudgetSnapshotSettings => ({
  defaultFiscalYear: row.default_fiscal_year,
  allowFiscalYearSwitch: row.allow_fiscal_year_switch,
  showUtilizationProgress: row.show_utilization_progress,
  showTotalFyBudget: row.show_total_fy_budget,
  showApprovedBudget: row.show_approved_budget,
  showReleasedBudget: row.show_released_budget,
  showLiquidatedBudget: row.show_liquidated_budget,
  showAllocationBreakdown: row.show_allocation_breakdown,
  updatedAt: row.updated_at,
});

export const adminGetPublicBudgetSnapshotSettingsFromSupabase = async (): Promise<PublicBudgetSnapshotSettings | null> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_get_public_budget_snapshot_settings", {
    _session_token: adminSession.sessionToken,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : null;
  return row ? mapPublicBudgetSnapshotSettings(row as PublicBudgetSnapshotSettingsRow) : null;
};

export const adminSavePublicBudgetSnapshotSettingsInSupabase = async (
  settings: PublicBudgetSnapshotSettings,
): Promise<PublicBudgetSnapshotSettings> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_save_public_budget_snapshot_settings", {
    _session_token: adminSession.sessionToken,
    _default_fiscal_year: settings.defaultFiscalYear,
    _allow_fiscal_year_switch: settings.allowFiscalYearSwitch,
    _show_utilization_progress: settings.showUtilizationProgress,
    _show_total_fy_budget: settings.showTotalFyBudget,
    _show_approved_budget: settings.showApprovedBudget,
    _show_released_budget: settings.showReleasedBudget,
    _show_liquidated_budget: settings.showLiquidatedBudget,
    _show_allocation_breakdown: settings.showAllocationBreakdown,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) throw new Error("No data returned from admin_save_public_budget_snapshot_settings.");
  return mapPublicBudgetSnapshotSettings(row as PublicBudgetSnapshotSettingsRow);
};

export const adminUpdateLiquidationReportFileStatusInSupabase = async (
  id: string,
  patch: Partial<LiquidationReportFile>,
): Promise<LiquidationReportFile> => {
  if (patch.adminStatus === "rejected_red" || (patch.adminStatus as string) === "rejected") {
    throw new Error("Reject is no longer an available review decision. Only Approved and Needs Revision are allowed.");
  }
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_update_liquidation_report_file_status", {
    _session_token: adminSession.sessionToken,
    _file_id: id,
    _admin_status: patch.adminStatus ?? null,
    _admin_remarks: patch.adminRemarks ?? null,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) throw new Error("No data returned from admin_update_liquidation_report_file_status.");

  if (patch.adminStatus && ["approved_for_ftf_green", "complete_green", "needs_revision", "rejected_red", "approved", "rejected"].includes(patch.adminStatus)) {
    const updatedStatus = patch.adminStatus;
    void (async () => {
      try {
        const { data: fileRow } = await supabase!
          .from("liquidation_report_files")
          .select("liquidation_report_id, file_name")
          .eq("id", id)
          .maybeSingle();
        if (fileRow?.liquidation_report_id) {
          const { data: reportRow } = await supabase!
            .from("liquidation_reports")
            .select("organization_id, budget_request_id")
            .eq("id", fileRow.liquidation_report_id)
            .maybeSingle();
          if (reportRow?.organization_id) {
            let itemName = `Liquidation: ${fileRow.file_name || "Liquidation Packet"}`;
            if (reportRow.budget_request_id) {
              const { data: budgetRow } = await supabase!
                .from("budget_requests")
                .select("activity_title")
                .eq("id", reportRow.budget_request_id)
                .maybeSingle();
              if (budgetRow?.activity_title) {
                itemName = `Liquidation: ${budgetRow.activity_title}`;
              }
            }
            await dispatchOrgTransactionalEmailInSupabase({
              eventType: "liquidation_status_update",
              organizationId: reportRow.organization_id,
              referenceId: id,
              status: updatedStatus,
              remarks: patch.adminRemarks || undefined,
              itemName,
            });
          }
        }
      } catch (e) {
        console.warn("Non-fatal email dispatch error for liquidation file status update:", e);
      }
    })();
  }

  return mapLiquidationReportFile(row as LiquidationReportFileRow);
};

export const adminUpdateYpopOrgActivityInSupabase = async (
  id: string,
  patch: Partial<YPOPOrgActivity>,
): Promise<YPOPOrgActivity> => {
  if (patch.status === "rejected" || (patch.status as string) === "rejected_red") {
    throw new Error("Reject is no longer an available review decision. Only Approved and Needs Revision are allowed.");
  }
  if (patch.status === "needs_revision" && !patch.adminRemarks?.trim()) {
    throw new Error("A non-empty admin remark is required when requesting revision.");
  }
  const adminSession = getAuthenticatedAdminSession();

  let finalRevisionHistory = patch.revisionHistory;
  let revisionRequestedAt: string | null = null;
  let revisionDueAt: string | null = null;

  if (patch.status === "needs_revision") {
    const deadline = calculateRevisionDeadline();
    revisionRequestedAt = deadline.requestedAt;
    revisionDueAt = deadline.dueAt;

    if (Array.isArray(finalRevisionHistory) && finalRevisionHistory.length > 0) {
      const lastIdx = finalRevisionHistory.length - 1;
      const lastItem = finalRevisionHistory[lastIdx];
      if (lastItem && typeof lastItem === "object") {
        finalRevisionHistory = [
          ...finalRevisionHistory.slice(0, lastIdx),
          { ...lastItem, revisionDueAt: deadline.dueAt },
        ];
      }
    }
  }

  const { data, error } = await supabase!.rpc("admin_update_ypop_org_activity", {
    _session_token: adminSession.sessionToken,
    _activity_id: id,
    _status: patch.status ?? null,
    _admin_remarks: patch.adminRemarks ?? null,
    _approved_at: patch.approvedAt || null,
    _revision_history: finalRevisionHistory ?? null,
  });
  if (error) throw new Error(error.message);

  if (patch.status === "needs_revision" && revisionDueAt) {
    await supabase!
      .from("ypop_org_activities")
      .update({
        revision_requested_at: revisionRequestedAt,
        revision_due_at: revisionDueAt,
        revision_locked_at: null,
      })
      .eq("id", id);
  }

  const row = Array.isArray(data) ? data[0] : (data && typeof data === "object" ? data : null);
  if (!row) {
    const { data: fetched, error: fetchErr } = await supabase!
      .from("ypop_org_activities")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetched && !fetchErr) {
      return mapYpopOrgActivity(fetched as YpopOrgActivityRow);
    }
    throw new Error("No data returned from admin_update_ypop_org_activity.");
  }

  if (patch.status && ["approved", "needs_revision", "rejected"].includes(patch.status)) {
    const updatedStatus = patch.status;
    void (async () => {
      try {
        const { data: act } = await supabase!
          .from("ypop_org_activities")
          .select("organization_id, name")
          .eq("id", id)
          .single();
        if (act?.organization_id) {
          const evType: OrgTransactionalEmailEventType =
            updatedStatus === "approved" ? "ypop_approved" : updatedStatus === "needs_revision" ? "ypop_needs_revision" : "ypop_rejected";
          await dispatchOrgTransactionalEmailInSupabase({
            eventType: evType,
            organizationId: act.organization_id,
            referenceId: id,
            status: updatedStatus,
            remarks: patch.adminRemarks || undefined,
            itemName: `Org-Led PPA: ${act.name || "Activity"}`,
          });
        }
      } catch (e) {
        console.warn("Non-fatal email dispatch error for YPOP org activity update:", e);
      }
    })();
  }

  return mapYpopOrgActivity(row as YpopOrgActivityRow);
};

// ─── Org YORP fields (admin) ─────────────────────────────────

export const adminUpdateOrgYorpFieldsInSupabase = async (
  orgId: string,
  registeredYear: number | null,
  renewedYear: number | null,
): Promise<void> => {
  const adminSession = getAuthenticatedAdminSession();
  const { error } = await supabase!.rpc("admin_update_org_yorp_fields", {
    _session_token: adminSession.sessionToken,
    _org_id: orgId,
    _registered_year: registeredYear,
    _renewed_year: renewedYear,
  });
  if (error) throw new Error(error.message);
};

type PublicOrganizationRow = {
  organization_id: string;
  organization_name: string;
  profile_image_url: string | null;
  major_classification: string | null;
  sub_classification: string | null;
  district: string | null;
  barangay: string | null;
  advocacies: string[] | null;
  facebook_page_url: string | null;
  verified_at: string | null;
  yorp_registered_year: number | null;
  representative_name: string | null;
  adviser_name: string | null;
};

const mapPublicOrganization = (row: PublicOrganizationRow): PublicOrganizationDirectoryItem => ({
  organizationId: row.organization_id,
  organizationName: row.organization_name,
  profileImageUrl: row.profile_image_url ?? "",
  majorClassification: row.major_classification ?? "",
  subClassification: row.sub_classification ?? "",
  district: row.district ?? "",
  barangay: row.barangay ?? "",
  advocacies: row.advocacies ?? [],
  facebookPageUrl: row.facebook_page_url ?? "",
  verifiedAt: row.verified_at ?? "",
  yorpRegisteredYear: row.yorp_registered_year ?? null,
  representativeName: row.representative_name ?? "",
  adviserName: row.adviser_name ?? "",
});

export const fetchPublicOrganizationDirectory = async (): Promise<PublicOrganizationDirectoryItem[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("search_public_organizations");
  if (error) throw new Error(error.message);
  return ((data ?? []) as PublicOrganizationRow[]).map(mapPublicOrganization);
};

export const fetchPublicOrganizationProfile = async (organizationId: string): Promise<{
  organization: PublicOrganizationDirectoryItem;
  activities: PublicOrganizationActivity[];
} | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_public_organization_profile", {
    _organization_id: organizationId,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : null) as (PublicOrganizationRow & { activities?: PublicOrganizationActivity[] | null }) | null;
  if (!row) return null;
  return { organization: mapPublicOrganization(row), activities: row.activities ?? [] };
};

export const updateOrganizationDirectoryPreferences = async (preferences: {
  visible: boolean;
  showRepresentative: boolean;
  showAdviser: boolean;
}): Promise<OrganizationProfile> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("update_organization_directory_preferences", {
    _visible: preferences.visible,
    _show_representative: preferences.showRepresentative,
    _show_adviser: preferences.showAdviser,
  });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) throw new Error(error?.message ?? "Directory preferences could not be saved.");
  return mapOrganizationProfile(row as OrganizationProfileRow);
};


export const adminCreateYpopEntryInSupabase = async (
  params: Omit<YPOPEntry, "id" | "createdAt" | "updatedAt">,
): Promise<YPOPEntry> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = getAuthenticatedAdminSession();

  // Try calling the secure Admin RPC first
  try {
    const { data, error } = await supabase.rpc("admin_create_ypop_entry", {
      _session_token: adminSession.sessionToken,
      _organization_id: params.organizationId,
      _semester: params.semester,
      _semester_label: params.semesterLabel,
      _points_earned: params.pointsEarned ?? 0,
      _points_required: params.pointsRequired ?? 70,
      _total_points: params.totalPoints ?? 100,
      _status: params.status ?? "draft",
      _admin_remarks: params.adminRemarks ?? "",
      _submission_note: params.submissionNote ?? "",
      _validation_deadline: params.validationDeadline || null,
      _submitted_at: params.submittedAt || null,
      _validated_at: params.validatedAt || null,
      _revision_history: params.revisionHistory ?? [],
      _org_led_project_count: params.orgLedProjectCount ?? 0,
      _city_led_attendance: params.cityLedAttendance ?? [],
    });

    if (!error) {
      const row = Array.isArray(data) ? data[0] : (data && typeof data === "object" ? data : null);
      if (row) {
        return mapYpopEntry(row as YpopEntryRow);
      }
    } else {
      console.warn("admin_create_ypop_entry RPC warning:", error.message);
    }
  } catch (rpcErr) {
    console.warn("admin_create_ypop_entry RPC dispatch error:", rpcErr);
  }

  // Fallback for environments / mocks where direct table operations are used
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("ypop_entries")
    .insert({
      organization_id: params.organizationId,
      submitted_by: params.submittedBy || null,
      semester: params.semester,
      semester_label: params.semesterLabel,
      points_earned: params.pointsEarned ?? 0,
      points_required: params.pointsRequired ?? 70,
      total_points: params.totalPoints ?? 100,
      status: params.status ?? "draft",
      admin_remarks: params.adminRemarks ?? "",
      submission_note: params.submissionNote ?? "",
      validation_deadline: params.validationDeadline || null,
      submitted_at: params.submittedAt || null,
      validated_at: params.validatedAt || null,
      revision_history: params.revisionHistory ?? [],
      org_led_project_count: params.orgLedProjectCount ?? 0,
      city_led_attendance: params.cityLedAttendance ?? [],
      created_at: now,
      updated_at: now,
    })
    .select(YPOP_ENTRY_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return mapYpopEntry(data as YpopEntryRow);
};

export const adminCloseYpopSemesterInSupabase = async (
  periodId: string,
  patch: Partial<Omit<YPOPPeriod, "id" | "createdAt" | "updatedAt">>,
): Promise<{ period: YPOPPeriod; evaluatedEntries: YPOPEntry[] }> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = getAuthenticatedAdminSession();

  // Try calling the atomic RPC if available
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_close_ypop_semester_and_evaluate", {
      _session_token: adminSession.sessionToken,
      _period_id: periodId,
    });
    if (!rpcErr && rpcRes) {
      console.log("Semester closed and evaluated via atomic RPC:", rpcRes);
    }
  } catch {
    // Ignore RPC failure and execute robust application-level evaluation below
  }

  // Update period to closed
  const updatedPeriod = await adminUpdateYpopPeriodInSupabase(periodId, {
    ...patch,
    status: "closed",
  });

  const semesterKey = updatedPeriod.semesterKey;
  const tiers = updatedPeriod.orgLedTiers?.length ? updatedPeriod.orgLedTiers : DEFAULT_ORG_LED_TIERS;

  // Fetch activities for this semester
  const { data: actsData } = await supabase
    .from("ypop_city_activities")
    .select("*")
    .eq("semester_key", semesterKey);
  const activities: YPOPCityActivity[] = ((actsData ?? []) as YpopCityActivityRow[]).map(mapYpopCityActivity);

  // Fetch participations for these activities
  const actIds = activities.map((a) => a.id);
  const { data: partsData } = actIds.length > 0
    ? await supabase.from("ypop_event_participations").select("*").in("activity_id", actIds)
    : { data: [] };
  const participations: YPOPEventParticipation[] = ((partsData ?? []) as YpopEventParticipationRow[]).map(mapYpopEventParticipation);

  // Fetch entries for this semester
  const { data: entriesData } = await supabase
    .from("ypop_entries")
    .select("*")
    .eq("semester", semesterKey);
  const entries: YPOPEntry[] = ((entriesData ?? []) as YpopEntryRow[]).map(mapYpopEntry);

  // Fetch PPAs for these entries
  const entryIds = entries.map((e) => e.id);
  const { data: orgActsData } = entryIds.length > 0
    ? await supabase.from("ypop_org_activities").select("*").in("ypop_entry_id", entryIds)
    : { data: [] };
  const orgActivities: YPOPOrgActivity[] = ((orgActsData ?? []) as YpopOrgActivityRow[]).map(mapYpopOrgActivity);

  // Collect all unique organization IDs involved in this semester
  const orgIds = new Set<string>();
  entries.forEach((e) => orgIds.add(e.organizationId));
  participations.forEach((p) => orgIds.add(p.organizationId));
  orgActivities.forEach((o) => orgIds.add(o.organizationId));

  const evaluatedEntries: YPOPEntry[] = [];
  const now = new Date().toISOString();

  for (const orgId of orgIds) {
    const orgParticipations = participations.filter((p) => p.organizationId === orgId);
    const verifiedAttendance = buildVerifiedYpopAttendance(activities, orgParticipations);

    const existingEntry = entries.find((e) => e.organizationId === orgId);
    const orgPpas = existingEntry
      ? orgActivities.filter((o) => o.ypopEntryId === existingEntry.id)
      : [];
    const approvedPpaCount = orgPpas.filter((o) => o.status === "approved").length;

    const score = computeYpopScore(verifiedAttendance, activities, approvedPpaCount, tiers);
    const finalStatus: YPOPStatus = score.totalScore >= YPOP_SCORE_THRESHOLD ? "qualified" : "not_qualified";

    if (existingEntry) {
      const updated = await adminUpdateYpopEntryInSupabase(existingEntry.id, {
        pointsEarned: score.totalScore,
        pointsRequired: YPOP_SCORE_THRESHOLD,
        totalPoints: 100,
        status: finalStatus,
        validatedAt: now,
        orgLedProjectCount: approvedPpaCount,
        cityLedAttendance: verifiedAttendance,
        revisionHistory: [
          ...(existingEntry.revisionHistory ?? []),
          {
            action: finalStatus,
            adminRemarks: "Final semester evaluation upon period closure.",
            changedAt: now,
          },
        ],
      });
      evaluatedEntries.push(updated);
    } else {
      // Create final entry for organization that had activity but no formal draft entry
      const created = await adminCreateYpopEntryInSupabase({
        organizationId: orgId,
        submittedBy: "",
        semester: semesterKey,
        semesterLabel: updatedPeriod.semesterLabel,
        pointsEarned: score.totalScore,
        pointsRequired: YPOP_SCORE_THRESHOLD,
        totalPoints: 100,
        status: finalStatus,
        adminRemarks: "Final semester evaluation upon period closure.",
        submissionNote: "",
        validationDeadline: updatedPeriod.validationDeadline,
        submittedAt: now,
        validatedAt: now,
        revisionHistory: [
          {
            action: finalStatus,
            adminRemarks: "Final semester evaluation upon period closure.",
            changedAt: now,
          },
        ],
        orgLedProjectCount: approvedPpaCount,
        cityLedAttendance: verifiedAttendance,
      });
      evaluatedEntries.push(created);
    }
  }

  return { period: updatedPeriod, evaluatedEntries };
};

// ==============================================================================
// PHASE 2 RENEWAL & ACCREDITATION WORKFLOW CLIENT WRAPPERS
// ==============================================================================

export const mapOrganizationAccreditation = (
  row: OrganizationAccreditationRow,
): OrganizationAccreditationRecord => ({
  id: row.id,
  organizationId: row.organization_id,
  termNumber: row.term_number,
  startDate: formatDateOnly(row.start_date),
  endDate: formatDateOnly(row.end_date),
  certificateUrn: row.certificate_urn,
  status: row.status,
  isLegacyInferred: Boolean(row.is_legacy_inferred),
  approvedBy: row.approved_by,
  approvedAt: row.approved_at,
  createdAt: row.created_at,
  revokedAt: row.revoked_at ?? null,
  revocationReason: row.revocation_reason ?? null,
});

export const mapOrganizationRenewal = (
  row: OrganizationRenewalRow,
): OrganizationRenewalRecord => ({
  id: row.id,
  organizationId: row.organization_id,
  cycleNumber: row.cycle_number,
  currentAccreditationId: row.current_accreditation_id,
  certificateUrn: row.certificate_urn ?? null,
  status: row.status,
  submittedAt: row.submitted_at ?? null,
  reviewedBy: row.reviewed_by ?? null,
  reviewedAt: row.reviewed_at ?? null,
  adminRemarks: row.admin_remarks ?? null,
  revisionRequestedAt: row.revision_requested_at ?? null,
  revisionDueAt: row.revision_due_at ?? null,
  revisionLocked: Boolean(row.revision_locked),
  revisionLockedAt: row.revision_locked_at ?? null,
  revisionUnlockedAt: row.revision_unlocked_at ?? null,
  revisionUnlockedBy: row.revision_unlocked_by ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Fetches all authoritative accreditation terms across all organizations (Admin).
 */
export const fetchAllOrganizationAccreditationsInSupabase = async (): Promise<OrganizationAccreditationRecord[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("organization_accreditations")
    .select("id,organization_id,term_number,start_date,end_date,certificate_urn,status,is_legacy_inferred,approved_by,approved_at,created_at,revoked_at,revocation_reason")
    .order("term_number", { ascending: true });

  if (error) {
    console.warn("fetchAllOrganizationAccreditationsInSupabase error:", error.message);
    return [];
  }
  return (data ?? []).map((row) => mapOrganizationAccreditation(row as OrganizationAccreditationRow));
};

/**
 * Fetches all authoritative accreditation terms for an organization.
 */
export const fetchOrganizationAccreditationsInSupabase = async (
  organizationId: string,
): Promise<OrganizationAccreditationRecord[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("organization_accreditations")
    .select("id,organization_id,term_number,start_date,end_date,certificate_urn,status,is_legacy_inferred,approved_by,approved_at,created_at,revoked_at,revocation_reason")
    .eq("organization_id", organizationId)
    .order("term_number", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapOrganizationAccreditation(row as OrganizationAccreditationRow));
};

/**
 * Authoritatively revokes an active accreditation term via admin RPC.
 */
export const revokeOrganizationAccreditationInSupabase = async (params: {
  accreditationId: string;
  reason?: string;
  revokedAt?: string;
}): Promise<OrganizationAccreditationRecord> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("revoke_organization_accreditation", {
    _session_token: adminSession.sessionToken,
    _accreditation_id: params.accreditationId,
    _revocation_reason: params.reason ?? null,
    _revoked_at: params.revokedAt ?? null,
  });

  if (error) throw new Error(error?.message ?? "Failed to revoke accreditation.");
  return mapOrganizationAccreditation(data as OrganizationAccreditationRow);
};

/**
 * Fetches the authoritative Section 35 YORP Quarterly Report from the database RPC.
 */
export const fetchYorpQuarterlyReportInSupabase = async (
  year: number,
  quarter: number,
): Promise<YorpQuarterlyReport> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("get_yorp_quarterly_report", {
    _session_token: adminSession.sessionToken,
    _year: year,
    _quarter: quarter,
  });

  if (error) throw new Error(error?.message ?? "Failed to fetch YORP quarterly report.");
  if (!data) throw new Error("No data returned from YORP quarterly report RPC.");

  return data as YorpQuarterlyReport;
};

/**
 * Fetches all renewal applications across all organizations (Admin).
 */
export const fetchAllOrganizationRenewalsInSupabase = async (): Promise<OrganizationRenewalRecord[]> => {
  if (!supabase) return [];
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase.rpc("admin_get_organization_renewals", {
    _session_token: adminSession.sessionToken,
  });

  if (error) {
    throw new Error(error.message || "Failed to load organization renewals.");
  }
  return ((data as OrganizationRenewalRow[] | null) ?? []).map(mapOrganizationRenewal);
};

/**
 * Fetches all historical renewal applications for an organization.
 */
export const fetchOrganizationRenewalsInSupabase = async (
  organizationId: string,
): Promise<OrganizationRenewalRecord[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("organization_renewals")
    .select("id,organization_id,cycle_number,current_accreditation_id,certificate_urn,status,submitted_at,reviewed_by,reviewed_at,admin_remarks,revision_requested_at,revision_due_at,revision_locked,revision_locked_at,revision_unlocked_at,revision_unlocked_by,created_at,updated_at")
    .eq("organization_id", organizationId)
    .order("cycle_number", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapOrganizationRenewal(row as OrganizationRenewalRow));
};

export const subscribeToOrganizationRenewalChangesInSupabase = (
  organizationId: string,
  onChange: () => void,
  onStatus?: (status: string, error?: Error | null) => void,
): (() => void) => {
  if (!supabase) return () => undefined;
  const channel = supabase
    .channel(`organization-renewals-${organizationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "organization_renewals",
        filter: `organization_id=eq.${organizationId}`,
      },
      onChange,
    )
    .subscribe((status, error) => onStatus?.(status, error));

  return () => {
    void supabase?.removeChannel(channel);
  };
};

/**
 * User RPC: Start or retrieve existing renewal draft.
 */
export const userStartOrGetRenewalDraftInSupabase = async (
  organizationId: string,
): Promise<{
  renewal: OrganizationRenewalRecord;
  submission: DocumentSubmission | null;
  isExisting: boolean;
}> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const { organizationProfile } = await getAuthenticatedOrganizationContext();
  assertOrganizationNotSuspended(organizationProfile, "Renewal draft");
  const { data, error } = await supabase.rpc("user_start_or_get_renewal_draft", {
    p_organization_id: organizationId,
  });

  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") throw new Error("Invalid response from user_start_or_get_renewal_draft.");

  const payload = data as {
    renewal: OrganizationRenewalRow;
    submission: DocumentSubmissionRow | null;
    is_existing: boolean;
  };

  return {
    renewal: mapOrganizationRenewal(payload.renewal),
    submission: payload.submission ? mapDocumentSubmission(payload.submission) : null,
    isExisting: Boolean(payload.is_existing),
  };
};

/**
 * User RPC: Submit drafted renewal application.
 */
export const userSubmitRenewalInSupabase = async (
  renewalId: string,
): Promise<{ success: boolean; renewalId: string; submittedAt: string }> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const { organizationProfile } = await getAuthenticatedOrganizationContext();
  assertOrganizationNotSuspended(organizationProfile, "Renewal submission");
  const { data, error } = await supabase.rpc("user_submit_renewal", {
    p_renewal_id: renewalId,
  });

  if (error) throw new Error(error.message);
  const payload = data as { success: boolean; renewal_id: string; submitted_at: string };

  void dispatchAdminNotificationInSupabase({
    eventType: "renewal_submitted",
    referenceId: renewalId,
    subject: "Accreditation Renewal Application Submitted",
  });

  return {
    success: payload.success,
    renewalId: payload.renewal_id,
    submittedAt: payload.submitted_at,
  };
};

/**
 * User RPC: Submit selected draft files for an already submitted renewal cycle.
 */
export const userSubmitAdditionalRenewalDocumentsInSupabase = async (
  renewalId: string,
  fileIds: string[],
): Promise<{ success: boolean; renewalId: string; submittedCount: number; submittedAt: string }> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  if (!fileIds.length) throw new Error("Select at least one renewal document to submit.");
  const { organizationProfile } = await getAuthenticatedOrganizationContext();
  assertOrganizationNotSuspended(organizationProfile, "Renewal document submission");
  const { data, error } = await supabase.rpc("user_submit_additional_renewal_documents", {
    p_renewal_id: renewalId,
    p_file_ids: fileIds,
  });

  if (error) throw new Error(error.message);
  const payload = data as { success: boolean; renewal_id: string; submitted_count: number; submitted_at: string };
  void dispatchAdminNotificationInSupabase({
    eventType: "renewal_submitted",
    referenceId: renewalId,
    subject: "Additional Renewal Documents Submitted",
  });

  return {
    success: payload.success,
    renewalId: payload.renewal_id,
    submittedCount: payload.submitted_count,
    submittedAt: payload.submitted_at,
  };
};

/**
 * User RPC: Resubmit renewal application after addressing revision remarks.
 */
export const userResubmitRenewalInSupabase = async (
  renewalId: string,
  submissionId?: string,
): Promise<{ success: boolean; renewalId: string; resubmittedAt: string }> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const { data, error } = await supabase.rpc("user_resubmit_renewal", {
    p_renewal_id: renewalId,
  });

  if (error) throw new Error(error.message);
  const payload = data as { success: boolean; renewal_id: string; resubmitted_at: string };

  const notificationSubmissionId = submissionId?.trim();
  if (notificationSubmissionId) {
    void dispatchAdminNotificationInSupabase({
      eventType: "revision_resubmission",
      referenceId: notificationSubmissionId,
      subject: "Accreditation Renewal Resubmitted",
    });
  }

  return {
    success: payload.success,
    renewalId: payload.renewal_id,
    resubmittedAt: payload.resubmitted_at,
  };
};

/**
 * User Helper: Replace document submission file while preserving revision history.
 */
export const userReplaceDocumentSubmissionFileInSupabase = async (params: {
  fileId: string;
  newFileUrl: string;
  newFileName: string;
  newFileType: string;
  newFileSize?: number;
  submitForReview?: boolean;
  notifyAdmin?: boolean;
}): Promise<SubmissionFile> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const submitForReview = params.submitForReview ?? true;
  const rpcParams = {
    _file_id: params.fileId,
    _new_file_url: params.newFileUrl,
    _new_file_name: params.newFileName,
    _new_file_type: params.newFileType,
    _new_file_size: params.newFileSize ?? null,
    // Older deployed databases only expose the five-argument RPC. Omitting
    // this defaulted argument preserves the normal submit-for-review path.
    ...(!submitForReview ? { _submit_for_review: false } : {}),
  };
  const { data, error } = await supabase.rpc("user_replace_document_submission_file", {
    ...rpcParams,
  });

  if (error || !data) throw new Error(error?.message ?? "Failed to replace document file.");
  const mapped = mapDocumentFile((Array.isArray(data) ? data[0] : data) as DocumentSubmissionFileRow)!;

  if (submitForReview && params.notifyAdmin !== false) {
    void dispatchAdminNotificationInSupabase({
      eventType: "revision_resubmission",
      referenceId: params.fileId,
      subject: `Corrected Document: ${params.newFileName}`,
    });
  }

  return mapped;
};

/**
 * Fetches the linked document submission packet and all uploaded files for a renewal.
 */
export const fetchRenewalPacketInSupabase = async (
  renewalId: string,
): Promise<{
  submission: DocumentSubmission | null;
  files: SubmissionFile[];
}> => {
  if (!supabase) return { submission: null, files: [] };
  const { data: submissionRow, error: submissionError } = await supabase
    .from("document_submissions")
    .select(DOCUMENT_SUBMISSION_COLUMNS)
    .eq("renewal_id", renewalId)
    .maybeSingle();

  if (submissionError) throw new Error(submissionError.message);
  if (!submissionRow) return { submission: null, files: [] };

  const submission = mapDocumentSubmission(submissionRow as DocumentSubmissionRow);

  const { data: fileRows, error: filesError } = await supabase
    .from("document_submission_files")
    .select("id,submission_id,document_type_id,file_url,file_name,file_type,file_size,validation_status,admin_status,admin_remarks,revision_history,uploaded_at,reviewed_at,created_at,updated_at,required_document_types(id,name)")
    .eq("submission_id", submission.id);

  if (filesError) throw new Error(filesError.message);

  const files = ((fileRows as DocumentSubmissionFileRow[] | null) ?? [])
    .map(mapDocumentFile)
    .filter((file): file is SubmissionFile => Boolean(file));

  return { submission, files };
};

/**
 * Keeps an open renewal workspace in sync with review decisions made by an admin.
 * Returns a cleanup function so the channel is removed when the workspace closes.
 */
export const subscribeToRenewalPacketChangesInSupabase = (
  renewalId: string,
  submissionId: string | null | undefined,
  onChange: () => void,
  onStatus?: (status: string, error?: Error | null) => void,
): (() => void) => {
  if (!supabase) return () => undefined;

  let channel = supabase.channel(`renewal-packet-${renewalId}-${submissionId ?? "pending"}`);
  if (submissionId) {
    channel = channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "document_submission_files",
        filter: `submission_id=eq.${submissionId}`,
      },
      onChange,
    );
  }
  channel
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "document_submissions",
        filter: `renewal_id=eq.${renewalId}`,
      },
      onChange,
    )
    .subscribe((status, error) => onStatus?.(status, error));

  return () => {
    void supabase?.removeChannel(channel);
  };
};

/**
 * Loads the mandatory required document types configured for renewal packets.
 */
export const fetchRenewalRequiredDocumentTypesInSupabase = async (
  options: { requireServerChecklist?: boolean } = {},
): Promise<TemplateRecord[]> => {
  const fallbackTemplates = requiredDocumentTypes
    .map((t) => ({
      ...t,
      databaseId: t.id,
      templateDescription: t.description,
      templateActive: t.isActive,
      templateFileName: t.name,
      templateFileUrl: t.templateUrl,
      templateFileType: "application/pdf",
      templateUploadedAt: new Date().toISOString(),
      templateFileSize: null,
      templateCategories: t.templateCategories?.length ? t.templateCategories : [deriveTemplateCategory(t.name)],
    }))
    .filter(isRenewalRequirementTemplate);

  if (!supabase) return fallbackTemplates;

  try {
    const { data: templateRows, error: templatesError } = await supabase
      .from("required_document_types")
      .select("id,name,description,template_url,template_description,sort_order,is_required,is_active,scope,template_scope,template_category,template_file_size,updated_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (templatesError) throw new Error(templatesError.message);

    const list = ((templateRows as RequiredDocumentTypeRow[] | null) ?? [])
      .map(mapTemplate)
      .filter((template): template is TemplateRecord => Boolean(template))
      .filter(isRenewalRequirementTemplate)
      .filter((template) => !legacyRemovedTemplateNames.has(template.name));

    // Use the active renewal-scoped template configuration as the checklist. Do
    // not fill gaps from a local hardcoded list: the submit and approval RPCs
    // validate the configured scope in this same table.
    return list;
  } catch (err) {
    if (options.requireServerChecklist) throw err;
    console.warn("fetchRenewalRequiredDocumentTypesInSupabase falling back to default:", err);
    return fallbackTemplates;
  }
};

/**
 * Loads the active registration requirements from the same metadata source used
 * by Forms & Templates. This intentionally does not resolve or sign template
 * files; the registration queue only needs the current requirement count.
 */
export const fetchRegistrationRequiredDocumentTypesInSupabase = async (): Promise<TemplateRecord[]> => {
  if (!supabase) {
    return requiredDocumentTypes
      .map((type) => ({
        ...type,
        databaseId: type.id,
        templateDescription: type.description,
        templateActive: type.isActive,
        templateFileName: type.name,
        templateFileUrl: type.templateUrl,
        templateFileType: "application/pdf",
        templateUploadedAt: "",
        templateFileSize: null,
        templateCategories: type.templateCategories?.length ? type.templateCategories : [deriveTemplateCategory(type.name)],
      }))
      .filter(isRegistrationRequirementTemplate);
  }

  const { data, error } = await supabase
    .from("required_document_types")
    .select("id,name,description,template_url,template_description,sort_order,is_required,is_active,scope,template_scope,template_category,template_file_size,updated_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data as RequiredDocumentTypeRow[] | null) ?? [])
    .map(mapTemplate)
    .filter((template): template is TemplateRecord => Boolean(template))
    .filter(isRegistrationRequirementTemplate)
    .filter((template) => !legacyRemovedTemplateNames.has(template.name));
};

/**
 * Uploads a document file for a renewal submission packet in draft mode.
 */
export const uploadRenewalDocumentFileInSupabase = async (params: {
  organizationId: string;
  renewalId: string;
  submissionId: string;
  documentTypeId: string;
  documentTypeName?: string;
  file: File;
}): Promise<SubmissionFile> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  await assertPdfUpload(params.file, "Renewal document", ORGANIZATION_DOCUMENT_MAX_BYTES);

  const documentTypeName = params.documentTypeName ?? requiredDocumentTypes.find((type) => type.id === params.documentTypeId)?.name;
  const resolvedTypeId = await resolveTemplateDatabaseId(params.documentTypeId, documentTypeName);
  if (!UUID_PATTERN.test(resolvedTypeId)) {
    throw new Error(`Could not find the configured renewal requirement${documentTypeName ? ` “${documentTypeName}”` : ""}. Refresh the page and try again.`);
  }
  const safeFileName = sanitizeFileName(params.file.name);
  const objectPath = `${params.organizationId}/renewal/${params.renewalId}/${resolvedTypeId}/${Date.now()}-${safeFileName}`;

  // Check if an existing file is already registered for this document type
  const { data: existingRows } = await supabase
    .from("document_submission_files")
    .select("id,file_url,admin_status")
    .eq("submission_id", params.submissionId)
    .eq("document_type_id", resolvedTypeId);

  const existingTargetFile = existingRows?.[0];
  if (existingTargetFile) {
    const fileStatus = existingTargetFile.admin_status;
    if (["under_admin_review", "submitted", "ready_for_review", "under_review"].includes(fileStatus)) {
      throw new Error("This specific document is currently under admin review and cannot be modified until the review is complete.");
    }
    if (["approved", "approved_green"].includes(fileStatus)) {
      throw new Error("This approved document is locked from modification.");
    }
  }

  const { error: uploadError } = await supabase.storage
    .from(ORGANIZATION_DOCUMENTS_BUCKET)
    .upload(objectPath, params.file, {
      upsert: true,
      contentType: params.file.type || "application/pdf",
    });

  if (uploadError) throw new Error(uploadError.message);

  const storageUri = buildStorageUri(ORGANIZATION_DOCUMENTS_BUCKET, objectPath);
  const submittedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("document_submission_files")
    .upsert(
      {
        submission_id: params.submissionId,
        document_type_id: resolvedTypeId,
        file_url: storageUri,
        file_name: params.file.name,
        file_type: params.file.type || "application/pdf",
        file_size: params.file.size,
        admin_status: "draft",
        admin_remarks: null,
        uploaded_at: submittedAt,
        reviewed_at: null,
      },
      {
        onConflict: "submission_id,document_type_id",
      },
    )
    .select("id,submission_id,document_type_id,file_url,file_name,file_type,file_size,validation_status,admin_status,admin_remarks,revision_history,uploaded_at,reviewed_at,created_at,updated_at,required_document_types(id,name)")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to save the uploaded renewal document.");

  // Clean up previous storage file when replacing a draft file
  if (existingTargetFile?.file_url && existingTargetFile.file_url !== storageUri) {
    await removeStorageObjects([existingTargetFile.file_url]).catch(() => undefined);
  }

  return mapDocumentFile(data as DocumentSubmissionFileRow)!;
};

/**
 * Replaces a flagged renewal document file in needs_revision mode, preserving revision history via RPC.
 */
export const replaceRenewalDocumentFileInSupabase = async (params: {
  organizationId: string;
  renewalId: string;
  fileId: string;
  documentTypeId: string;
  documentTypeName?: string;
  submitForReview?: boolean;
  file: File;
}): Promise<SubmissionFile> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  await assertPdfUpload(params.file, "Replacement document", ORGANIZATION_DOCUMENT_MAX_BYTES);

  const documentTypeName = params.documentTypeName ?? requiredDocumentTypes.find((type) => type.id === params.documentTypeId)?.name;
  const resolvedTypeId = await resolveTemplateDatabaseId(params.documentTypeId, documentTypeName);
  if (!UUID_PATTERN.test(resolvedTypeId)) {
    throw new Error(`Could not find the configured renewal requirement${documentTypeName ? ` “${documentTypeName}”` : ""}. Refresh the page and try again.`);
  }
  const safeFileName = sanitizeFileName(params.file.name);
  const objectPath = `${params.organizationId}/renewal/${params.renewalId}/${resolvedTypeId}/revisions/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(ORGANIZATION_DOCUMENTS_BUCKET)
    .upload(objectPath, params.file, {
      upsert: false,
      contentType: params.file.type || "application/pdf",
    });

  if (uploadError) throw new Error(uploadError.message);

  const storageUri = buildStorageUri(ORGANIZATION_DOCUMENTS_BUCKET, objectPath);

  return await userReplaceDocumentSubmissionFileInSupabase({
    fileId: params.fileId,
    newFileUrl: storageUri,
    newFileName: params.file.name,
    newFileType: params.file.type || "application/pdf",
    newFileSize: params.file.size,
    submitForReview: params.submitForReview ?? true,
    // Wait until the full renewal resubmission is complete before alerting admins.
    notifyAdmin: false,
  });
};

/**
 * Admin RPC: Request renewal revision with mandatory remarks.
 * Accepts either an object parameter `{ renewalId, adminRemarks }` or positional `(renewalId, adminRemarks)`.
 */
export const adminRequestRenewalRevisionInSupabase = async (
  paramsOrRenewalId: { renewalId: string; adminRemarks: string } | string,
  maybeAdminRemarks?: string,
): Promise<{ success: boolean; renewalId: string; status: string }> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const adminSession = getAuthenticatedAdminSession();
  const renewalId = typeof paramsOrRenewalId === "string" ? paramsOrRenewalId : paramsOrRenewalId.renewalId;
  const adminRemarks = typeof paramsOrRenewalId === "string" ? maybeAdminRemarks || "" : paramsOrRenewalId.adminRemarks;

  const { data, error } = await supabase.rpc("admin_request_renewal_revision", {
    p_session_token: adminSession.sessionToken,
    p_renewal_id: renewalId,
    p_admin_remarks: adminRemarks,
  });

  if (error) throw new Error(error.message);
  const payload = data as { success: boolean; renewal_id: string; status: string };

  void (async () => {
    try {
      const { data: ren } = await supabase!.from("organization_renewals").select("organization_id").eq("id", renewalId).single();
      if (ren?.organization_id) {
        await dispatchOrgTransactionalEmailInSupabase({
          eventType: "renewal_needs_revision",
          organizationId: ren.organization_id,
          referenceId: renewalId,
          remarks: adminRemarks || undefined,
          itemName: "Accreditation Renewal Packet",
        });
      }
    } catch (e) {
      console.warn("Non-fatal email dispatch error for renewal revision:", e);
    }
  })();

  return {
    success: payload.success,
    renewalId: payload.renewal_id,
    status: payload.status,
  };
};

/**
 * Admin RPC: Reject renewal application (terminal).
 * Accepts either an object parameter `{ renewalId, adminRemarks }` or positional `(renewalId, adminRemarks)`.
 */
export const adminRejectRenewalInSupabase = async (
  paramsOrRenewalId: { renewalId: string; adminRemarks: string } | string,
  maybeAdminRemarks?: string,
): Promise<{ success: boolean; renewalId: string; status: string }> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const adminSession = getAuthenticatedAdminSession();
  const renewalId = typeof paramsOrRenewalId === "string" ? paramsOrRenewalId : paramsOrRenewalId.renewalId;
  const adminRemarks = typeof paramsOrRenewalId === "string" ? maybeAdminRemarks || "" : paramsOrRenewalId.adminRemarks;

  const { data, error } = await supabase.rpc("admin_reject_renewal", {
    p_session_token: adminSession.sessionToken,
    p_renewal_id: renewalId,
    p_admin_remarks: adminRemarks,
  });

  if (error) throw new Error(error.message);
  const payload = data as { success: boolean; renewal_id: string; status: string };

  void (async () => {
    try {
      const { data: ren } = await supabase!.from("organization_renewals").select("organization_id").eq("id", renewalId).single();
      if (ren?.organization_id) {
        await dispatchOrgTransactionalEmailInSupabase({
          eventType: "renewal_rejected",
          organizationId: ren.organization_id,
          referenceId: renewalId,
          remarks: adminRemarks || undefined,
          itemName: "Accreditation Renewal Application",
        });
      }
    } catch (e) {
      console.warn("Non-fatal email dispatch error for renewal rejection:", e);
    }
  })();

  return {
    success: payload.success,
    renewalId: payload.renewal_id,
    status: payload.status,
  };
};

/**
 * Admin RPC: Atomically approve renewal application and issue next accreditation term.
 * Authoritative URN is generated server-side.
 * Accepts either an object parameter `{ renewalId, certificateUrn?, adminRemarks? }` or positional `(renewalId, certificateUrn?, adminRemarks?)`.
 */
export const adminApproveRenewalInSupabase = async (
  paramsOrRenewalId: {
    renewalId: string;
    certificateUrn?: string;
    adminRemarks?: string;
  } | string,
  maybeCertificateUrn?: string,
  maybeAdminRemarks?: string,
): Promise<{
  success: boolean;
  renewalId: string;
  accreditationId: string;
  termNumber: number;
  startDate: string;
  endDate: string;
  certificateUrn: string;
  previousUrn?: string;
}> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const adminSession = getAuthenticatedAdminSession();
  const renewalId = typeof paramsOrRenewalId === "string" ? paramsOrRenewalId : paramsOrRenewalId.renewalId;
  const certificateUrn = typeof paramsOrRenewalId === "string" ? maybeCertificateUrn || "" : paramsOrRenewalId.certificateUrn || "";
  const adminRemarks = typeof paramsOrRenewalId === "string" ? maybeAdminRemarks : paramsOrRenewalId.adminRemarks;

  const { data, error } = await supabase.rpc("admin_approve_renewal", {
    p_session_token: adminSession.sessionToken,
    p_renewal_id: renewalId,
    p_certificate_urn: certificateUrn || null,
    p_admin_remarks: adminRemarks?.trim() || null,
  });

  if (error) throw new Error(error.message);
  const payload = data as {
    success: boolean;
    renewal_id: string;
    accreditation_id: string;
    term_number: number;
    start_date: string;
    end_date: string;
    certificate_urn: string;
    previous_urn?: string;
  };

  void (async () => {
    try {
      const { data: ren } = await supabase!.from("organization_renewals").select("organization_id").eq("id", renewalId).single();
      if (ren?.organization_id) {
        await dispatchOrgTransactionalEmailInSupabase({
          eventType: "renewal_approved",
          organizationId: ren.organization_id,
          referenceId: renewalId,
          remarks: adminRemarks?.trim() || undefined,
          itemName: `Accreditation Renewal (URN: ${payload.certificate_urn})`,
        });
      }
    } catch (e) {
      console.warn("Non-fatal email dispatch error for renewal approval:", e);
    }
  })();

  return {
    success: payload.success,
    renewalId: payload.renewal_id,
    accreditationId: payload.accreditation_id,
    termNumber: payload.term_number,
    startDate: payload.start_date,
    endDate: payload.end_date,
    certificateUrn: payload.certificate_urn,
    previousUrn: payload.previous_urn,
  };
};

/**
 * Evaluates time-driven accreditation notification events idempotently.
 */
export const evaluateAccreditationNotificationEventsInSupabase = async (): Promise<{
  openedCount: number;
  urgentCount: number;
  expiredCount: number;
}> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const { data, error } = await supabase.rpc("evaluate_accreditation_notification_events");

  if (error) throw new Error(error.message);
  const payload = (data ?? {}) as {
    opened_count?: number;
    urgent_count?: number;
    expired_count?: number;
  };

  return {
    openedCount: payload.opened_count ?? 0,
    urgentCount: payload.urgent_count ?? 0,
    expiredCount: payload.expired_count ?? 0,
  };
};

/**
 * Annual Budget Allocations & Budget Monitoring RPC Helpers
 */
export const adminGetAnnualBudgetAllocationsFromSupabase = async (): Promise<AnnualBudgetAllocation[]> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_get_annual_budget_allocations", {
    _session_token: adminSession.sessionToken,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    fiscalYear: row.fiscal_year,
    totalAmount: normalizeNumeric(row.total_amount),
    statutoryBaselineNotes: row.statutory_baseline_notes ?? null,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

export const adminSaveAnnualBudgetAllocationInSupabase = async (params: {
  fiscalYear: number;
  totalAmount: number;
  statutoryBaselineNotes?: string | null;
  isActive?: boolean;
}): Promise<AnnualBudgetAllocation> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_save_annual_budget_allocation", {
    _session_token: adminSession.sessionToken,
    _fiscal_year: params.fiscalYear,
    _total_amount: params.totalAmount,
    _statutory_baseline_notes: params.statutoryBaselineNotes ?? null,
    _is_active: params.isActive ?? true,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as any;
  if (!row) throw new Error("Failed to save annual budget allocation.");
  return {
    id: row.id,
    fiscalYear: row.fiscal_year,
    totalAmount: normalizeNumeric(row.total_amount),
    statutoryBaselineNotes: row.statutory_baseline_notes ?? null,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const adminGetBudgetMonitoringSummaryFromSupabase = async (
  fiscalYear: number,
): Promise<BudgetMonitoringSummary> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_get_budget_monitoring_summary", {
    _session_token: adminSession.sessionToken,
    _fiscal_year: fiscalYear,
  });
  if (error) throw new Error(error.message);
  const res = (data ?? {}) as any;
  return {
    fiscalYear: res.fiscal_year ?? fiscalYear,
    isConfigured: Boolean(res.is_configured),
    totalFyBudget: res.total_fy_budget !== null && res.total_fy_budget !== undefined ? normalizeNumeric(res.total_fy_budget) : null,
    statutoryBaselineNotes: res.statutory_baseline_notes ?? null,
    approvedBudget: normalizeNumeric(res.approved_budget),
    releasedBudget: normalizeNumeric(res.released_budget),
    liquidatedBudget: normalizeNumeric(res.liquidated_budget),
    pendingDisbursement: normalizeNumeric(res.pending_disbursement),
    activeInField: normalizeNumeric(res.active_in_field),
    remainingHeadroom: res.remaining_headroom !== null && res.remaining_headroom !== undefined ? normalizeNumeric(res.remaining_headroom) : null,
    isDeficit: Boolean(res.is_deficit),
    deficitAmount: normalizeNumeric(res.deficit_amount),
    totalRequests: res.total_requests ?? 0,
    releasedRequests: res.released_requests ?? 0,
    liquidatedRequests: res.liquidated_requests ?? 0,
    categoryBreakdown: ((res.category_breakdown ?? []) as any[]).map((c) => ({
      category: c.category ?? "General / Uncategorized",
      approvedAmount: normalizeNumeric(c.approved_amount),
      releasedAmount: normalizeNumeric(c.released_amount),
      requestCount: c.request_count ?? 0,
    })),
  };
};

export const getBudgetPurposeCategoriesFromSupabase = async (): Promise<BudgetPurposeCategory[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_budget_purpose_categories");
  if (error) {
    const fallback = await supabase
      .from("budget_purpose_categories")
      .select("id,name,description,sort_order,is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (fallback.error) return [];
    return ((fallback.data ?? []) as any[]).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? null,
      sortOrder: r.sort_order ?? 0,
      isActive: Boolean(r.is_active),
    }));
  }
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    sortOrder: r.sort_order ?? 0,
    isActive: Boolean(r.is_active),
  }));
};

export const adminGetBudgetPurposeCategoriesFromSupabase = async (): Promise<BudgetPurposeCategory[]> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_get_budget_purpose_categories", {
    _session_token: adminSession.sessionToken,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    sortOrder: r.sort_order ?? 0,
    isActive: Boolean(r.is_active),
  }));
};

export const adminSaveBudgetPurposeCategoryInSupabase = async (params: {
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<BudgetPurposeCategory> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_save_budget_purpose_category", {
    _session_token: adminSession.sessionToken,
    _name: params.name,
    _description: params.description ?? null,
    _sort_order: params.sortOrder ?? 0,
    _is_active: params.isActive ?? true,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as any;
  if (!row) throw new Error("Failed to save budget purpose category.");
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    sortOrder: row.sort_order ?? 0,
    isActive: Boolean(row.is_active),
  };
};

export const getUnconfiguredPublicBudgetSummary = (targetYear: number): PublicBudgetSummary => ({
  fiscalYear: targetYear,
  isConfigured: false,
  annualBudget: null,
  approvedBudget: 0,
  releasedBudget: 0,
  liquidatedBudget: 0,
  remainingHeadroom: null,
  isDeficit: false,
  deficitAmount: 0,
  percentCommitted: null,
  percentReleased: null,
  percentLiquidated: null,
  purposeCategories: [],
  districtAllocations: [],
  unmappedPurposeAmount: 0,
  unassignedDistrictAmount: 0,
  availableFiscalYears: [],
  lastUpdated: new Date().toISOString(),
});

export const getPublicBudgetSummaryFromSupabase = async (
  fiscalYear?: number,
): Promise<PublicBudgetSummary> => {
  const currentYear = new Date().getFullYear();
  const targetYear = fiscalYear ?? currentYear;

  try {
    if (!supabase) {
      console.warn("Supabase client is not configured, returning safe fallback summary.");
      return getUnconfiguredPublicBudgetSummary(targetYear);
    }
    const { data, error } = await supabase.rpc("get_public_budget_monitoring_summary", {
      _fiscal_year: fiscalYear ?? null,
    });
    if (error) {
      console.warn("Failed to fetch public budget summary from RPC, returning safe fallback:", error.message);
      return getUnconfiguredPublicBudgetSummary(targetYear);
    }
    const res = (data ?? {}) as any;
    const approvedBudget = normalizeNumeric(res.approved_budget ?? res.approvedBudget);
    const rawPurposeCategories = (res.purpose_categories ?? res.purposeCategories ?? []) as any[];
    const purposeCategories = rawPurposeCategories
      .filter((category) => isCanonicalPurposeCategory(category?.category))
      .map((category) => ({
        category: category.category.trim(),
        amount: normalizeNumeric(category.amount),
        percentage: normalizeNumeric(category.percentage),
      }));
    const purposeTotal = purposeCategories.reduce((sum, category) => sum + category.amount, 0);
    const rawDistrictAllocations = (
      res.district_allocations ?? res.districtAllocations ?? res.district_breakdown ?? res.districtBreakdown ?? []
    ) as any[];
    const normalizeDistrict = (district?: string | null): "District I" | "District II" | null => {
      const normalized = district?.trim().toLowerCase().replace(/\s+/g, " ");
      if (["district i", "district 1", "dist 1", "d1"].includes(normalized ?? "")) return "District I";
      if (["district ii", "district 2", "dist 2", "d2"].includes(normalized ?? "")) return "District II";
      return null;
    };
    const mappedDistrictRows = rawDistrictAllocations.map((district) => ({
      district: normalizeDistrict(district?.district),
      amount: normalizeNumeric(district?.amount),
      percentage: normalizeNumeric(district?.percentage),
    }));
    const districtAllocations = mappedDistrictRows
      .filter((district): district is typeof district & { district: "District I" | "District II" } => Boolean(district.district))
      .map((district) => ({
        district: district.district,
        amount: district.amount,
        percentage: district.percentage,
      }));
    const unmappedPurposeAmount = res.unmapped_purpose_amount !== undefined || res.unmappedPurposeAmount !== undefined
      ? normalizeNumeric(res.unmapped_purpose_amount ?? res.unmappedPurposeAmount)
      : Math.max(approvedBudget - purposeTotal, 0);
    const unassignedDistrictAmount = res.unassigned_district_amount !== undefined || res.unassignedDistrictAmount !== undefined
      ? normalizeNumeric(res.unassigned_district_amount ?? res.unassignedDistrictAmount)
      : mappedDistrictRows
          .filter((district) => !district.district)
          .reduce((sum, district) => sum + district.amount, 0);
    return {
      fiscalYear: res.fiscal_year ?? res.fiscalYear ?? targetYear,
      isConfigured: Boolean(res.is_configured ?? res.isConfigured),
      annualBudget:
        res.annual_budget !== null && res.annual_budget !== undefined
          ? normalizeNumeric(res.annual_budget)
          : res.annualBudget !== null && res.annualBudget !== undefined
          ? normalizeNumeric(res.annualBudget)
          : null,
      approvedBudget,
      releasedBudget: normalizeNumeric(res.released_budget ?? res.releasedBudget),
      liquidatedBudget: normalizeNumeric(res.liquidated_budget ?? res.liquidatedBudget),
      remainingHeadroom:
        res.remaining_headroom !== null && res.remaining_headroom !== undefined
          ? normalizeNumeric(res.remaining_headroom)
          : res.remainingHeadroom !== null && res.remainingHeadroom !== undefined
          ? normalizeNumeric(res.remainingHeadroom)
          : null,
      isDeficit: Boolean(res.is_deficit ?? res.isDeficit),
      deficitAmount: normalizeNumeric(res.deficit_amount ?? res.deficitAmount),
      percentCommitted:
        res.percent_committed !== null && res.percent_committed !== undefined
          ? normalizeNumeric(res.percent_committed)
          : res.percentCommitted !== null && res.percentCommitted !== undefined
          ? normalizeNumeric(res.percentCommitted)
          : null,
      percentReleased:
        res.percent_released !== null && res.percent_released !== undefined
          ? normalizeNumeric(res.percent_released)
          : res.percentReleased !== null && res.percentReleased !== undefined
          ? normalizeNumeric(res.percentReleased)
          : null,
      percentLiquidated:
        res.percent_liquidated !== null && res.percent_liquidated !== undefined
          ? normalizeNumeric(res.percent_liquidated)
          : res.percentLiquidated !== null && res.percentLiquidated !== undefined
          ? normalizeNumeric(res.percentLiquidated)
          : null,
      purposeCategories,
      districtAllocations,
      unmappedPurposeAmount,
      unassignedDistrictAmount,
      availableFiscalYears: res.available_fiscal_years ?? res.availableFiscalYears ?? undefined,
      lastUpdated: res.last_updated ?? res.lastUpdated ?? new Date().toISOString(),
    };
  } catch (err: any) {
    console.warn("Unexpected exception fetching public budget summary, returning safe fallback:", err);
    return getUnconfiguredPublicBudgetSummary(targetYear);
  }
};

export const getPublicBudgetBarangayAllocationsFromSupabase = async (
  fiscalYear?: number,
): Promise<PublicBudgetBarangayAllocation[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("get_public_budget_barangay_allocations", {
    _fiscal_year: fiscalYear ?? null,
  });
  if (error) throw error;

  const response = (data ?? {}) as { allocations?: unknown };
  const rows = Array.isArray(response) ? response : response.allocations;
  if (!Array.isArray(rows)) return [];

  return rows.flatMap((row: any) => {
    const district = String(row?.district ?? "");
    const barangay = String(row?.barangay ?? "").trim();
    if (!barangay || (district !== "District I" && district !== "District II")) return [];
    const organizationCount = row.organization_count ?? row.organizationCount;
    const releasedBudgetCount = row.released_budget_count ?? row.releasedBudgetCount;
    return [{
      barangay,
      district,
      approvedAmount: normalizeNumeric(row.approved_amount ?? row.approvedAmount),
      releasedAmount: normalizeNumeric(row.released_amount ?? row.releasedAmount),
      liquidatedAmount: normalizeNumeric(row.liquidated_amount ?? row.liquidatedAmount),
      ...(organizationCount === undefined || organizationCount === null ? {} : { organizationCount: normalizeNumeric(organizationCount) }),
      ...(releasedBudgetCount === undefined || releasedBudgetCount === null ? {} : { releasedBudgetCount: normalizeNumeric(releasedBudgetCount) }),
    }];
  });
};

export interface AdminBudgetRequestsDeleteResult {
  deletedCount: number;
  storageWarning?: string;
  deletedRequestIds?: string[];
}

export const deleteAdminBudgetRequestsInSupabase = async (
  requestIds: string[]
): Promise<AdminBudgetRequestsDeleteResult> => {
  if (!requestIds || !requestIds.length) {
    return { deletedCount: 0 };
  }

  const adminSession = getAuthenticatedAdminSession();
  if (!adminSession?.sessionToken) {
    throw new Error("Admin session is invalid or expired. Please sign in again.");
  }

  const { data, error } = await supabase!.rpc("admin_bulk_delete_budget_requests", {
    _session_token: adminSession.sessionToken,
    _request_ids: requestIds,
  });

  if (error) {
    throw new Error(error.message || "Failed to delete budget requests.");
  }

  const deletedCount = Number(data?.deleted_count ?? 0);
  const budgetFilePaths = Array.isArray(data?.budget_file_paths) ? (data.budget_file_paths as string[]) : [];
  const liquidationFilePaths = Array.isArray(data?.liquidation_file_paths) ? (data.liquidation_file_paths as string[]) : [];
  const deletedRequestIds = Array.isArray(data?.deleted_request_ids) ? (data.deleted_request_ids as string[]) : [];

  let storageWarning: string | undefined;
  const failedCleanups: string[] = [];

  const cleanPathsOrUris = async (bucket: string, entries: string[]) => {
    if (!entries.length) return;
    const paths: string[] = [];
    for (const entry of entries) {
      if (!entry) continue;
      const parsed = parseStorageUri(entry);
      if (parsed) {
        paths.push(parsed.path);
      } else if (entry.startsWith("http://") || entry.startsWith("https://")) {
        const extracted = extractPublicStoragePath(entry, bucket);
        if (extracted) paths.push(extracted);
      } else {
        paths.push(entry);
      }
    }
    if (paths.length > 0) {
      try {
        const { error: storageError } = await supabase!.storage.from(bucket).remove(paths);
        if (storageError) {
          console.warn(`Storage removal error for bucket ${bucket}:`, storageError);
          failedCleanups.push(bucket);
        }
      } catch (storageErr) {
        console.warn(`Storage removal exception for bucket ${bucket}:`, storageErr);
        failedCleanups.push(bucket);
      }
    }
  };

  await cleanPathsOrUris(BUDGET_REQUEST_FILES_BUCKET, budgetFilePaths);
  await cleanPathsOrUris(LIQUIDATION_REPORT_FILES_BUCKET, liquidationFilePaths);

  if (failedCleanups.length > 0) {
    storageWarning = "Some stored files could not be removed and may require cleanup.";
  }

  return {
    deletedCount,
    storageWarning,
    deletedRequestIds,
  };
};

/**
 * Admin RPC: Explicitly unlock a locked submission in needs_revision state.
 * Sets revision_locked = false and tracks revision_unlocked_at while preserving original revision_due_at.
 */
export const adminUnlockSubmissionRevisionInSupabase = async (params: {
  entityType: "document_submission" | "renewal" | "budget_request" | "liquidation_report" | "ypop_event_participation" | "ypop_org_activity";
  entityId: string;
  organizationId?: string;
  remarks?: string;
}): Promise<{
  success: boolean;
  entityType: string;
  entityId: string;
  revisionLocked: boolean;
  revisionUnlockedAt: string;
  revisionDueAt: string | null;
}> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase.rpc("admin_unlock_submission_revision", {
    _session_token: adminSession.sessionToken,
    _entity_type: params.entityType,
    _entity_id: params.entityId,
    _remarks: params.remarks?.trim() || null,
  });

  if (error) throw new Error(error.message);
  const payload = (data ?? {}) as {
    success?: boolean;
    entity_type?: string;
    entity_id?: string;
    revision_locked?: boolean;
    revision_unlocked_at?: string;
    revision_due_at?: string | null;
  };

  if (params.organizationId) {
    void dispatchOrgTransactionalEmailInSupabase({
      eventType: "submission_unlocked",
      organizationId: params.organizationId,
      referenceId: params.entityId,
      title: "Submission Unlocked for Revision",
      status: "unlocked",
      statusLabel: "Unlocked by Admin",
      remarks: params.remarks?.trim() || "An administrator has unlocked this submission. You may now submit your revisions.",
      itemName: params.entityType.replace(/_/g, " "),
    });
  }

  return {
    success: payload.success ?? true,
    entityType: payload.entity_type ?? params.entityType,
    entityId: payload.entity_id ?? params.entityId,
    revisionLocked: Boolean(payload.revision_locked ?? false),
    revisionUnlockedAt: payload.revision_unlocked_at ?? new Date().toISOString(),
    revisionDueAt: payload.revision_due_at ?? null,
  };
};

export type AdminNotificationEventType =
  | "new_registration"
  | "renewal_submitted"
  | "ypop_submission"
  | "budget_request"
  | "liquidation_report"
  | "new_inquiry"
  | "revision_resubmission"
  | "accreditation_expiring"
  | "overdue_liquidation";

export interface DispatchAdminNotificationParams {
  eventType: AdminNotificationEventType;
  organizationId?: string;
  organizationName?: string;
  referenceId?: string;
  subject?: string;
  details?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Dispatches an administrative notification event to the server-side Edge Function.
 * The Edge Function dynamically reads general.support_email, validates gating, and delivers via Brevo.
 * This operation is non-blocking to prevent UI/submission disruption if email fails.
 */
export const dispatchAdminNotificationInSupabase = async (
  params: DispatchAdminNotificationParams,
): Promise<{
  success: boolean;
  event: string;
  emailSent?: boolean;
  recipient?: string;
  inAppCreated?: number;
  reason?: string;
}> => {
  if (!supabase) {
    return { success: false, event: params.eventType, reason: "supabase_not_configured" };
  }

  try {
    const customHeaders: Record<string, string> = {};
    const adminSession = readAdminSession();
    if (adminSession?.sessionToken) {
      customHeaders["x-admin-session-token"] = adminSession.sessionToken;
    }

    const { data, error } = await supabase.functions.invoke("send-admin-notification", {
      body: params,
      headers: customHeaders,
    });

    if (error) {
      console.warn("[dispatchAdminNotificationInSupabase] Edge function error (non-fatal):", error.message);
      return { success: false, event: params.eventType, reason: error.message };
    }

    return (data ?? { success: true, event: params.eventType }) as {
      success: boolean;
      event: string;
      emailSent?: boolean;
      recipient?: string;
      inAppCreated?: number;
      reason?: string;
    };
  } catch (err) {
    console.warn("[dispatchAdminNotificationInSupabase] Dispatch exception (non-fatal):", err);
    return {
      success: false,
      event: params.eventType,
      reason: err instanceof Error ? err.message : "network_error",
    };
  }
};

export type OrgTransactionalEmailEventType =
  | "registration_approved"
  | "registration_needs_revision"
  | "registration_rejected"
  | "renewal_approved"
  | "renewal_needs_revision"
  | "renewal_rejected"
  | "document_approved"
  | "document_needs_revision"
  | "document_rejected"
  | "ypop_approved"
  | "ypop_needs_revision"
  | "ypop_rejected"
  | "budget_status_update"
  | "liquidation_status_update"
  | "submission_unlocked";

export interface DispatchOrgTransactionalEmailParams {
  eventType: OrgTransactionalEmailEventType;
  organizationId: string;
  userId?: string;
  referenceId?: string;
  title?: string;
  subject?: string;
  status?: string;
  statusLabel?: string;
  remarks?: string;
  itemName?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Dispatches an organization transactional status/workflow email event to the server-side Edge Function.
 * Gated by 'email.send_workflow_emails'. Runs asynchronously and non-blockingly.
 */
export const dispatchOrgTransactionalEmailInSupabase = async (
  params: DispatchOrgTransactionalEmailParams,
): Promise<{
  success: boolean;
  event: string;
  emailSent?: boolean;
  recipient?: string;
  reason?: string;
}> => {
  if (!supabase) {
    return { success: false, event: params.eventType, reason: "supabase_not_configured" };
  }

  try {
    const customHeaders: Record<string, string> = {};
    const adminSession = readAdminSession();
    if (adminSession?.sessionToken) {
      customHeaders["x-admin-session-token"] = adminSession.sessionToken;
    }

    const { data, error } = await supabase.functions.invoke("send-org-transactional-email", {
      body: params,
      headers: customHeaders,
    });

    if (error) {
      console.warn("[dispatchOrgTransactionalEmailInSupabase] Edge function error (non-fatal):", error.message);
      return { success: false, event: params.eventType, reason: error.message };
    }

    return (data ?? { success: true, event: params.eventType }) as {
      success: boolean;
      event: string;
      emailSent?: boolean;
      recipient?: string;
      reason?: string;
    };
  } catch (err) {
    console.warn("[dispatchOrgTransactionalEmailInSupabase] Dispatch exception (non-fatal):", err);
    return {
      success: false,
      event: params.eventType,
      reason: err instanceof Error ? err.message : "network_error",
    };
  }
};

// ============================================================================
// RENEWAL TEST ENVIRONMENT CLIENT HELPERS (DEV/TEST ONLY)
// ============================================================================

export type RenewalTestAccountDetails = {
  isNew: boolean;
  credentials: {
    email: string;
    temporaryPassword?: string;
  };
  organization: {
    id: string;
    name: string;
    email: string;
    userId: string;
    barangay: string;
    district: string;
    contactNumber: string;
    profileStatus: string;
    urn: string;
    isRenewalTestAccount: boolean;
    representativeName?: string;
    adviserName?: string;
    address?: string;
    majorClassification?: string;
    subClassification?: string;
    advocacies?: string[];
    facebookPageUrl?: string;
  };
  accreditation: {
    id: string;
    termNumber: number;
    startDate: string;
    endDate: string;
    certificateUrn: string;
    status: string;
    derivedStatus: string;
  } | null;
  eligibility: {
    canDraft: boolean;
    canSubmit: boolean;
    windowStatus: "open" | "too_early" | "expired" | "lapsed";
    daysRemaining: number | null;
    daysUntilOpen?: number | null;
    daysPastExpiry?: number | null;
    expiresAt?: string | null;
  };
  activeRenewal: {
    id: string;
    cycleNumber: number;
    status: string;
    submittedAt: string | null;
    reviewedAt: string | null;
  } | null;
};

export type PrepareRenewalScenarioResult = {
  success: boolean;
  organizationId: string;
  accreditationId: string;
  startDate: string;
  endDate: string;
  derivedStatus: string;
  daysRemaining: number | null;
  eligibility: {
    canDraft: boolean;
    canSubmit: boolean;
    windowStatus: string;
    daysRemaining?: number | null;
    daysUntilOpen?: number | null;
    daysPastExpiry?: number | null;
  };
};

/**
 * Admin RPC: Get or create the dedicated Renewal Test Account (idempotent, dev/test only).
 */
export const adminGetOrCreateRenewalTestAccountInSupabase = async (): Promise<RenewalTestAccountDetails> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const adminSession = getAuthenticatedAdminSession();

  const { data, error } = await supabase.rpc("admin_get_or_create_renewal_test_account", {
    p_session_token: adminSession.sessionToken,
  });

  if (error) throw new Error(error.message);

  // Give the dedicated Renewal Test Organization a complete registration
  // packet for the Registrations queue. This seed is separate from renewal
  // applications and only fills requirements that have no uploaded file.
  const { error: seedError } = await supabase.rpc("admin_seed_renewal_test_registration_documents", {
    p_session_token: adminSession.sessionToken,
  });
  if (seedError) {
    console.warn("Could not seed renewal test registration files:", seedError.message);
  }

  return data as RenewalTestAccountDetails;
};

export type EnsureRenewalTestAccountProfileResult = {
  success: boolean;
  organizationId: string;
  organizationName: string;
  representativeName: string;
  adviserName: string;
  address: string;
  majorClassification: string;
  subClassification: string;
  advocacies: string[];
  facebookPageUrl: string;
  district: string;
  barangay: string;
  urn: string;
  profileStatus: string;
};

/**
 * Admin RPC: Ensure the dedicated Renewal Test Account has complete, authoritative profile data.
 */
export const adminEnsureRenewalTestAccountProfileInSupabase = async (): Promise<EnsureRenewalTestAccountProfileResult> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const adminSession = getAuthenticatedAdminSession();

  const { data, error } = await supabase.rpc("admin_ensure_renewal_test_account_profile", {
    p_session_token: adminSession.sessionToken,
  });

  if (error) throw new Error(error.message);
  return data as EnsureRenewalTestAccountProfileResult;
};

/**
 * Admin RPC: Prepare the test organization accreditation inside a test renewal window.
 */
export const adminPrepareRenewalTestScenarioInSupabase = async (params: {
  expirationDaysAhead?: number;
  customExpirationDate?: string;
}): Promise<PrepareRenewalScenarioResult> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const adminSession = getAuthenticatedAdminSession();

  const { data, error } = await supabase.rpc("admin_prepare_renewal_test_scenario", {
    p_session_token: adminSession.sessionToken,
    p_expiration_days_ahead: params.expirationDaysAhead ?? null,
    p_custom_expiration_date: params.customExpirationDate ?? null,
  });

  if (error) throw new Error(error.message);
  return data as PrepareRenewalScenarioResult;
};

/**
 * Admin RPC: Restore the test organization's accreditation to standard 3-year term.
 */
export const adminRestoreRenewalTestScenarioInSupabase = async (): Promise<{
  success: boolean;
  organizationId: string;
  endDate: string;
  derivedStatus: string;
}> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const adminSession = getAuthenticatedAdminSession();

  const { data, error } = await supabase.rpc("admin_restore_renewal_test_scenario", {
    p_session_token: adminSession.sessionToken,
  });

  if (error) throw new Error(error.message);
  return data as {
    success: boolean;
    organizationId: string;
    endDate: string;
    derivedStatus: string;
  };
};

/**
 * Admin RPC: Reset the test organization scenario to a clean Cycle 2 ready state for repeated testing.
 */
export const adminResetRenewalTestScenarioInSupabase = async (): Promise<{
  success: boolean;
  organizationId: string;
  termNumber: number;
  endDate: string;
  derivedStatus: string;
  eligibility: {
    canDraft: boolean;
    canSubmit: boolean;
    windowStatus: string;
    daysRemaining: number | null;
  };
}> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const adminSession = getAuthenticatedAdminSession();

  const { data, error } = await supabase.rpc("admin_reset_renewal_test_scenario", {
    p_session_token: adminSession.sessionToken,
  });

  if (error) throw new Error(error.message);
  return data as {
    success: boolean;
    organizationId: string;
    termNumber: number;
    endDate: string;
    derivedStatus: string;
    eligibility: {
      canDraft: boolean;
      canSubmit: boolean;
      windowStatus: string;
      daysRemaining: number | null;
    };
  };
};

export type SeedYorpSampleDatasetResult = {
  success: boolean;
  batch_name: string;
  total_records: number;
  created_count: number;
  updated_count: number;
  year_breakdown: {
    "2024": number;
    "2025": number;
    "2026": number;
  };
  organizations?: number;
  registration_packets?: number;
  document_records?: number;
  required_documents_per_organization?: number;
  organizations_document_complete?: number;
  missing_requirements?: number;
  duplicate_requirements?: number;
  budget_requests?: number;
  awaiting_release?: number;
  released?: number;
  liquidated?: number;
  renewal_test_organization_excluded?: boolean;
  timestamp: string;
};

export type CleanupYorpSampleDatasetResult = {
  success: boolean;
  batch_name: string;
  deleted_organizations: number;
  deleted_budget_requests: number;
  deleted_liquidations: number;
  deleted_users: number;
  storage_seed_assets_deleted?: number;
  renewal_test_organization_excluded?: boolean;
  timestamp: string;
};

export type YorpSampleDatasetStatus = {
  is_development_or_test_environment: boolean;
  seed_batch: string;
  total_seeded_organizations: number;
  expected_total: number;
  year_breakdown: {
    "2024": number;
    "2025": number;
    "2026": number;
  };
  budget_breakdown: {
    awaiting_release: number;
    budget_released: number;
    completed: number;
    liquidated_reports: number;
  };
  registration_breakdown?: {
    packets: number;
    document_records: number;
    required_documents_per_organization: number;
    organizations_complete: number;
    missing_requirements: number;
    duplicate_requirements: number;
    mapped_seed_assets: number;
    asset_mapping_complete: boolean;
    renewal_test_organization_excluded: boolean;
  };
  last_seeded_at: string | null;
};

/**
 * Admin RPC: Get current status and breakdown of seeded PCYDO YORP sample dataset.
 */
export const adminGetYorpSampleDatasetStatusInSupabase = async (
  batchName: string = "PCYDO-YORP-2024-2026"
): Promise<YorpSampleDatasetStatus> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const adminSession = getAuthenticatedAdminSession();

  const { data, error } = await supabase.rpc("admin_get_yorp_sample_dataset_status", {
    _session_token: adminSession.sessionToken,
    _batch_name: batchName,
  });

  if (error) throw error;
  return data as YorpSampleDatasetStatus;
};

const invokeYorpSeedBridge = async (action: "authorize" | "seed", sessionToken: string) => {
  if (!supabase) throw new Error("Supabase client is not configured.");

  const { data, error } = await supabase.functions.invoke("admin-seed-yorp-sample-dataset", {
    body: { action },
    headers: { "x-admin-session-token": sessionToken },
  });

  if (error) {
    let message = error.message || "The YORP seed service is unavailable.";
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      const body = await context.clone().json().catch(() => null) as {
        error?: unknown;
        code?: unknown;
        detail?: unknown;
      } | null;
      if (typeof body?.error === "string" && body.error.trim()) {
        const code = typeof body.code === "string" ? ` [${body.code}]` : "";
        const detail = typeof body.detail === "string" && body.detail.trim() ? ` ${body.detail}` : "";
        message = `${body.error}${code}${detail}`;
      }
    }
    throw new Error(message);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("The YORP seed service returned an invalid response.");
  }
  return data as Record<string, unknown>;
};

/** Verifies this custom admin session with the server-side YORP seed bridge without seeding. */
export const adminAuthorizeYorpSampleDatasetSeedInSupabase = async (): Promise<void> => {
  const adminSession = getAuthenticatedAdminSession();
  const data = await invokeYorpSeedBridge("authorize", adminSession.sessionToken);
  if (data.authorized !== true) throw new Error("This Super Admin session is not authorized to seed the YORP sample dataset.");
};

/**
 * Admin RPC: Execute bulk seeding of authoritative 84 PCYDO YORP sample organizations with verified state,
 * URNs, accreditations, contacts, and realistic budget requests.
 */
export const adminSeedYorpSampleDatasetInSupabase = async (): Promise<SeedYorpSampleDatasetResult> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const adminSession = getAuthenticatedAdminSession();
  const data = await invokeYorpSeedBridge("seed", adminSession.sessionToken);
  if (data.success !== true) throw new Error("The YORP sample dataset seed did not complete successfully.");
  return data as unknown as SeedYorpSampleDatasetResult;
};

/**
 * Admin RPC: Safely clean up all seeded sample data belonging to the specified batch.
 */
export const adminCleanupYorpSampleDatasetInSupabase = async (
  batchName: string = "PCYDO-YORP-2024-2026"
): Promise<CleanupYorpSampleDatasetResult> => {
  if (!supabase) throw new Error("Supabase client is not configured.");
  const adminSession = getAuthenticatedAdminSession();

  const { data, error } = await supabase.rpc("admin_cleanup_yorp_sample_dataset", {
    _session_token: adminSession.sessionToken,
    _batch_name: batchName,
  });

  if (error) throw new Error(error.message);
  return data as CleanupYorpSampleDatasetResult;
};
