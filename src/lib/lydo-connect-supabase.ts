import type {
  ActivityLog,
  BudgetRequest,
  BudgetRequestFile,
  ComplianceRemark,
  LiquidationReport,
  LiquidationReportFile,
  LydoSeedState,
  OrganizationProfile,
  NewsRelease,
  NotificationRecord,
  SubmissionFile,
  TemplateRecord,
  TransparencyPost,
  YPOPEntry,
  YPOPFile,
  YPOPPeriod,
  YPOPCityActivity,
} from "./lydo-connect-data";
import { createTemplateLocalId, legacyRemovedTemplateNames, requiredDocumentTypes } from "./lydo-connect-data";
import { readAdminSession } from "./admin-auth";
import { supabase } from "./supabase";

const ORGANIZATION_DOCUMENTS_BUCKET = "organization-documents";
const TEMPLATE_FILES_BUCKET = "template-files";
const BUDGET_REQUEST_FILES_BUCKET = "budget-request-files";
const LIQUIDATION_REPORT_FILES_BUCKET = "liquidation-report-files";
const YPOP_FILES_BUCKET = "ypop-files";
const STORAGE_URI_PREFIX = "storage://";

type RequiredDocumentTypeRow = {
  id: string;
  name: string;
  description: string | null;
  template_url: string | null;
  template_description: string | null;
  sort_order: number | null;
  is_required: boolean | null;
  is_active: boolean | null;
  updated_at?: string | null;
};

type OrganizationProfileRow = {
  id: string;
  user_id: string;
  organization_name: string;
  organization_email: string;
  contact_number: string;
  district: string;
  barangay: string;
  is_existing_organization: boolean | null;
  organization_identifier_number: string | null;
  major_classification: string | null;
  sub_classification: string | null;
  advocacies: string[] | null;
  adviser_name: string | null;
  representative_name: string | null;
  address: string | null;
  facebook_page_url: string | null;
  profile_status: OrganizationProfile["profileStatus"];
  verified_at: string | null;
  internal_notes: string | null;
  yorp_registered_year: number | null;
  yorp_renewed_year: number | null;
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
  created_at: string;
  updated_at: string;
};

type DocumentSubmissionFileRow = {
  id: string;
  submission_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  ocr_text: string | null;
  ocr_status: SubmissionFile["ocrStatus"];
  ocr_confidence: number | string | null;
  validation_status: SubmissionFile["validationStatus"];
  admin_status: SubmissionFile["adminStatus"];
  admin_remarks: string | null;
  ocr_metadata?: Record<string, unknown> | null;
  uploaded_at: string | null;
  reviewed_at: string | null;
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
  status: BudgetRequest["status"];
  remarks: string | null;
  go_signal_at: string | null;
  hard_copy_submitted_at: string | null;
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
};

type NewsReleaseRow = {
  id: string;
  title: string;
  description: string | null;
  facebook_post_url: string;
  date_posted: string;
  visibility_status: NewsRelease["visibilityStatus"];
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
  venue: string | null;
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

type AdminPortalSnapshot = {
  organization_profiles?: OrganizationProfileRow[];
  document_submissions?: DocumentSubmissionRow[];
  document_submission_files?: DocumentSubmissionFileRow[];
  budget_requests?: BudgetRequestRow[];
  budget_request_files?: BudgetRequestFileRow[];
  liquidation_reports?: LiquidationReportRow[];
  liquidation_report_files?: LiquidationReportFileRow[];
  news_releases?: NewsReleaseRow[];
  transparency_posts?: TransparencyPostRow[];
  compliance_remarks?: ComplianceRemarkRow[];
  notifications?: NotificationRow[];
  activity_logs?: ActivityLogRow[];
  templates?: RequiredDocumentTypeRow[];
  ypop_periods?: YpopPeriodRow[];
  ypop_city_activities?: YpopCityActivityRow[];
  ypop_entries?: YpopEntryRow[];
  ypop_files?: YpopFileRow[];
};

const localDocumentTypeByName = new Map(requiredDocumentTypes.map((documentType) => [documentType.name, documentType]));
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, "-");

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

const mapOrganizationProfile = (row: OrganizationProfileRow): OrganizationProfile => ({
  id: row.id,
  userId: row.user_id,
  organizationName: row.organization_name,
  organizationEmail: row.organization_email,
  contactNumber: row.contact_number,
  district: row.district,
  barangay: row.barangay,
  isExistingOrganization: Boolean(row.is_existing_organization),
  organizationIdentifierNumber: row.organization_identifier_number ?? "",
  majorClassification: (row.major_classification ?? "") as OrganizationProfile["majorClassification"],
  subClassification: (row.sub_classification ?? "") as OrganizationProfile["subClassification"],
  advocacies: (row.advocacies ?? []) as OrganizationProfile["advocacies"],
  adviserName: row.adviser_name ?? "",
  representativeName: row.representative_name ?? "",
  address: row.address ?? "",
  facebookPageUrl: row.facebook_page_url ?? "",
  profileStatus: row.profile_status,
  verifiedAt: row.verified_at ?? "",
  internalNotes: row.internal_notes ?? "",
  yorpRegisteredYear: row.yorp_registered_year ?? null,
  yorpRenewedYear: row.yorp_renewed_year ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapTemplate = (row: RequiredDocumentTypeRow): TemplateRecord | null => {
  const localDocumentType = localDocumentTypeByName.get(row.name);
  const localId = localDocumentType?.id ?? createTemplateLocalId(row.name);

  return {
    id: localId,
    databaseId: row.id,
    name: row.name,
    description: row.description ?? localDocumentType?.description ?? "",
    templateUrl: row.template_url ?? localDocumentType?.templateUrl ?? "",
    sortOrder: row.sort_order ?? localDocumentType?.sortOrder ?? 0,
    isRequired: row.is_required ?? localDocumentType?.isRequired ?? true,
    isActive: row.is_active ?? localDocumentType?.isActive ?? true,
    templateDescription: row.template_description ?? `Template for ${row.name}.`,
    templateActive: row.is_active ?? true,
    templateFileName: row.template_url ? getFileNameFromReference(row.template_url) : "",
    templateFileUrl: row.template_url ?? "",
    templateFileType: "",
    templateUploadedAt: row.updated_at ?? "",
  };
};

const mapDocumentFile = (row: DocumentSubmissionFileRow): SubmissionFile | null => {
  const related = Array.isArray(row.required_document_types) ? row.required_document_types[0] : row.required_document_types;
  const documentName = related?.name ?? "";
  const localDocumentType = localDocumentTypeByName.get(documentName);
  const localDocumentTypeId = localDocumentType?.id ?? createTemplateLocalId(documentName);
  if (!localDocumentTypeId) return null;

  return {
    id: row.id,
    submissionId: row.submission_id,
    documentTypeId: localDocumentTypeId,
    fileName: row.file_name,
    fileUrl: row.file_url,
    fileType: row.file_type,
    fileSize: row.file_size,
    ocrText: row.ocr_text ?? "",
    ocrStatus: row.ocr_status,
    ocrConfidence: Number(row.ocr_confidence ?? 0),
    validationStatus: row.validation_status,
    adminStatus: row.admin_status,
    adminRemarks: row.admin_remarks ?? "",
    ocrMetadata: row.ocr_metadata ?? null,
    uploadedAt: row.uploaded_at ?? "",
    reviewedAt: row.reviewed_at ?? "",
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
  status: row.status,
  remarks: row.remarks ?? "",
  goSignalAt: row.go_signal_at ?? "",
  hardCopySubmittedAt: row.hard_copy_submitted_at ?? "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapDocumentSubmission = (row: DocumentSubmissionRow) => ({
  id: row.id,
  organizationId: row.organization_id,
  submittedBy: row.submitted_by,
  status: row.status,
  userConfirmed: row.user_confirmed,
  submittedAt: row.submitted_at ?? "",
  reviewedBy: row.reviewed_by ?? "",
  reviewedAt: row.reviewed_at ?? "",
  overallRemarks: row.overall_remarks ?? "",
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
});

const mapNewsRelease = (row: NewsReleaseRow): NewsRelease => ({
  id: row.id,
  title: row.title,
  description: row.description ?? "",
  facebookPostUrl: row.facebook_post_url,
  datePosted: formatDateOnly(row.date_posted),
  visibilityStatus: row.visibility_status,
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

const mapActivityLog = (row: ActivityLogRow): ActivityLog => ({
  id: row.id,
  actorUserId: row.actor_user_id ?? "",
  organizationId: row.organization_id ?? "",
  action: row.action,
  relatedType: row.related_type,
  relatedId: row.related_id,
  description: row.description,
  createdAt: row.created_at,
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
  date: row.date ?? "",
  venue: row.venue ?? "",
  points: row.points,
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

const fetchOrganizationProfile = async (userId: string) => {
  const { data, error } = await supabase!
    .from("organization_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as OrganizationProfileRow | null) ?? null;
};

const fetchLatestSubmission = async (organizationId: string) => {
  const { data, error } = await supabase!
    .from("document_submissions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  return ((data as DocumentSubmissionRow[] | null) ?? [])[0] ?? null;
};

const fetchBudgetRequests = async (organizationId: string) => {
  const { data, error } = await supabase!
    .from("budget_requests")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as BudgetRequestRow[] | null) ?? [];
};

const fetchBudgetRequestFiles = async (budgetRequestIds: string[]) => {
  if (!budgetRequestIds.length) return [];
  const { data, error } = await supabase!
    .from("budget_request_files")
    .select("*")
    .in("budget_request_id", budgetRequestIds)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as BudgetRequestFileRow[] | null) ?? [];
};

const fetchLiquidationReports = async (organizationId: string) => {
  const { data, error } = await supabase!
    .from("liquidation_reports")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as LiquidationReportRow[] | null) ?? [];
};

const fetchLiquidationReportFiles = async (liquidationReportIds: string[]) => {
  if (!liquidationReportIds.length) return [];
  const { data, error } = await supabase!
    .from("liquidation_report_files")
    .select("*")
    .in("liquidation_report_id", liquidationReportIds)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as LiquidationReportFileRow[] | null) ?? [];
};

const fetchNewsReleases = async () => {
  const { data, error } = await supabase!
    .from("news_releases")
    .select("*")
    .order("date_posted", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as NewsReleaseRow[] | null) ?? [];
};

const fetchTransparencyPosts = async () => {
  const { data, error } = await supabase!
    .from("transparency_posts")
    .select("*")
    .order("post_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as TransparencyPostRow[] | null) ?? [];
};

const fetchNotifications = async () => {
  const { data, error } = await supabase!
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as NotificationRow[] | null) ?? [];
};

export const loadLydoConnectSupabaseState = async (): Promise<Partial<LydoSeedState> | null> => {
  if (!supabase) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  const { data: templateRows, error: templatesError } = await supabase!
    .from("required_document_types")
    .select("id,name,description,template_url,template_description,sort_order,is_required,is_active,updated_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (templatesError) throw new Error(templatesError.message);

  const mappedTemplates = ((templateRows as RequiredDocumentTypeRow[] | null) ?? [])
    .map(mapTemplate)
    .filter((template): template is TemplateRecord => Boolean(template) && !legacyRemovedTemplateNames.has(template.name));
  const [newsReleaseRows, transparencyPostRows, notificationRows] = await Promise.all([
    fetchNewsReleases(),
    fetchTransparencyPosts(),
    fetchNotifications(),
  ]);

  const organizationProfile = await fetchOrganizationProfile(session.user.id);
  const sharedState: Partial<LydoSeedState> = {
    templates: mappedTemplates,
    newsReleases: newsReleaseRows.map(mapNewsRelease),
    transparencyPosts: transparencyPostRows.map(mapTransparencyPost),
    notifications: notificationRows.map(mapNotification),
  };

  if (!organizationProfile) {
    return sharedState;
  }

  const remoteState: Partial<LydoSeedState> = {
    organizationProfiles: [mapOrganizationProfile(organizationProfile)],
    ...sharedState,
  };

  const [latestSubmission, budgetRows, liquidationRows, ypopPeriodRows, ypopActivityRows] = await Promise.all([
    fetchLatestSubmission(organizationProfile.id),
    fetchBudgetRequests(organizationProfile.id),
    fetchLiquidationReports(organizationProfile.id),
    supabase!.from("ypop_periods").select("*").order("created_at", { ascending: false }).then((r) => r.data ?? []),
    supabase!.from("ypop_city_activities").select("*").order("created_at", { ascending: true }).then((r) => r.data ?? []),
  ]);

  remoteState.budgetRequests = budgetRows.map(mapBudgetRequest);
  remoteState.liquidationReports = liquidationRows.map(mapLiquidationReport);
  remoteState.ypopPeriods = (ypopPeriodRows as YpopPeriodRow[]).map(mapYpopPeriod);
  remoteState.ypopCityActivities = (ypopActivityRows as YpopCityActivityRow[]).map(mapYpopCityActivity);

  const budgetRequestIds = budgetRows.map((row) => row.id);
  const liquidationReportIds = liquidationRows.map((row) => row.id);
  const [budgetFileRows, liquidationFileRows, ypopEntryRows, ypopFileRows] = await Promise.all([
    fetchBudgetRequestFiles(budgetRequestIds),
    fetchLiquidationReportFiles(liquidationReportIds),
    supabase!.from("ypop_entries").select("*").eq("organization_id", organizationProfile.id).order("created_at", { ascending: false }).then((r) => r.data ?? []),
    supabase!.from("ypop_files").select("*").eq("organization_id", organizationProfile.id).then((r) => r.data ?? []),
  ]);

  remoteState.budgetRequestFiles = budgetFileRows.map(mapBudgetRequestFile);
  remoteState.liquidationReportFiles = liquidationFileRows.map(mapLiquidationReportFile);
  remoteState.ypopEntries = (ypopEntryRows as YpopEntryRow[]).map(mapYpopEntry);
  remoteState.ypopFiles = (ypopFileRows as YpopFileRow[]).map(mapYpopFile);

  remoteState.documentSubmissions = [];
  remoteState.documentSubmissionFiles = [];

  if (!latestSubmission) {
    return remoteState;
  }

  remoteState.documentSubmissions = [mapDocumentSubmission(latestSubmission)];

  const { data: fileRows, error: filesError } = await supabase!
    .from("document_submission_files")
    .select("id,submission_id,file_url,file_name,file_type,file_size,ocr_text,ocr_status,ocr_confidence,validation_status,admin_status,admin_remarks,ocr_metadata,uploaded_at,reviewed_at,created_at,updated_at,required_document_types(id,name)")
    .eq("submission_id", latestSubmission.id);

  if (filesError) throw new Error(filesError.message);

  remoteState.documentSubmissionFiles = ((fileRows as DocumentSubmissionFileRow[] | null) ?? [])
    .map(mapDocumentFile)
    .filter((file): file is SubmissionFile => Boolean(file));

  return remoteState;
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

export const loadAdminPortalSupabaseState = async (): Promise<Partial<LydoSeedState> | null> => {
  if (!supabase) return null;

  const adminSession = readAdminSession();
  if (!adminSession?.sessionToken) return null;

  const { data, error } = await supabase.rpc("get_admin_portal_snapshot", {
    _session_token: adminSession.sessionToken,
  });

  if (error) {
    if (error.message?.includes("Admin account is not authorized")) {
      return null;
    }
    throw new Error(error.message);
  }
  if (!data || typeof data !== "object") return null;

  const snapshot = data as AdminPortalSnapshot;
  const remoteState: Partial<LydoSeedState> = {
    organizationProfiles: (snapshot.organization_profiles ?? []).map(mapOrganizationProfile),
    documentSubmissions: (snapshot.document_submissions ?? []).map(mapDocumentSubmission),
    documentSubmissionFiles: (snapshot.document_submission_files ?? [])
      .map(mapDocumentFile)
      .filter((file): file is SubmissionFile => Boolean(file)),
    budgetRequests: (snapshot.budget_requests ?? []).map(mapBudgetRequest),
    budgetRequestFiles: (snapshot.budget_request_files ?? []).map(mapBudgetRequestFile),
    liquidationReports: (snapshot.liquidation_reports ?? []).map(mapLiquidationReport),
    liquidationReportFiles: (snapshot.liquidation_report_files ?? []).map(mapLiquidationReportFile),
    newsReleases: (snapshot.news_releases ?? []).map(mapNewsRelease),
    transparencyPosts: (snapshot.transparency_posts ?? []).map(mapTransparencyPost),
    complianceRemarks: (snapshot.compliance_remarks ?? []).map(mapComplianceRemark),
    notifications: (snapshot.notifications ?? []).map(mapNotification),
    activityLogs: (snapshot.activity_logs ?? []).map(mapActivityLog),
    templates: (snapshot.templates ?? [])
      .map(mapTemplate)
      .filter((template): template is TemplateRecord => Boolean(template) && !legacyRemovedTemplateNames.has(template.name)),
    ypopPeriods: (snapshot.ypop_periods ?? []).map(mapYpopPeriod),
    ypopCityActivities: (snapshot.ypop_city_activities ?? []).map(mapYpopCityActivity),
    ypopEntries: (snapshot.ypop_entries ?? []).map(mapYpopEntry),
    ypopFiles: (snapshot.ypop_files ?? []).map(mapYpopFile),
  };

  return remoteState;
};

export const upsertOrganizationProfileInSupabase = async (profile: OrganizationProfile) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) throw new Error("Please sign in with your organization account first.");

  const payload = {
    user_id: session.user.id,
    organization_name: profile.organizationName.trim(),
    organization_email: profile.organizationEmail.trim(),
    contact_number: profile.contactNumber.trim(),
    district: profile.district.trim(),
    barangay: profile.barangay.trim(),
    is_existing_organization: profile.isExistingOrganization,
    organization_identifier_number: profile.isExistingOrganization ? profile.organizationIdentifierNumber.trim() : "",
    major_classification: profile.majorClassification || null,
    sub_classification: profile.subClassification || null,
    advocacies: profile.advocacies,
    adviser_name: profile.adviserName.trim() || null,
    representative_name: profile.representativeName.trim() || null,
    address: profile.address.trim() || null,
    facebook_page_url: profile.facebookPageUrl.trim() || null,
    profile_status: profile.profileStatus,
    verified_at: profile.verifiedAt.trim() || null,
    internal_notes: profile.internalNotes.trim() || null,
  };

  const { data, error } = await supabase
    .from("organization_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("id,user_id,organization_name,organization_email,contact_number,district,barangay,is_existing_organization,organization_identifier_number,major_classification,sub_classification,advocacies,adviser_name,representative_name,address,facebook_page_url,profile_status,verified_at,internal_notes,yorp_registered_year,yorp_renewed_year,created_at,updated_at")
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
    _admin_remarks: params.adminRemarks?.trim() || null,
  });

  const updatedRow = Array.isArray(data) ? data[0] : null;
  if (error || !updatedRow) throw new Error(error?.message ?? "Failed to update the document file review.");
  return mapDocumentFile(updatedRow as DocumentSubmissionFileRow);
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
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create document submission.");
  return data as DocumentSubmissionRow;
};

const fetchRequiredDocumentTypeRowByName = async (name: string) => {
  const { data, error } = await supabase!
    .from("required_document_types")
    .select("id,name,description,template_url,template_description,sort_order,is_required,is_active,updated_at")
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

export const submitOrganizationDocumentToSupabase = async (params: {
  documentTypeName: string;
  file: File;
  ocrText: string;
  ocrConfidence: number;
  validationStatus: SubmissionFile["validationStatus"];
  adminRemarks?: string;
  ocrMetadata?: Record<string, unknown> | null;
}) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) throw new Error("Please sign in with your organization account first.");

  const [organizationProfile, documentTypeRow] = await Promise.all([
    fetchOrganizationProfile(session.user.id),
    fetchRequiredDocumentTypeRowByName(params.documentTypeName),
  ]);

  if (!organizationProfile) {
    throw new Error("No organization profile was found for this account.");
  }

  const submission = await ensureDocumentSubmission(organizationProfile.id, session.user.id);
  const { data: existingRows, error: existingRowsError } = await supabase!
    .from("document_submission_files")
    .select("id,file_url")
    .eq("submission_id", submission.id)
    .eq("document_type_id", documentTypeRow.id);

  if (existingRowsError) throw new Error(existingRowsError.message);

  const safeFileName = sanitizeFileName(params.file.name);
  const objectPath = `${organizationProfile.id}/${documentTypeRow.id}/${Date.now()}-${safeFileName}`;

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
        ocr_text: params.ocrText.trim(),
        ocr_status: "completed",
        ocr_confidence: params.ocrConfidence,
        validation_status: params.validationStatus,
        admin_status: "under_admin_review",
        admin_remarks: params.adminRemarks?.trim() || "Awaiting admin review.",
        ocr_metadata: params.ocrMetadata ?? null,
        uploaded_at: submittedAt,
        reviewed_at: null,
      },
      {
        onConflict: "submission_id,document_type_id",
      },
    )
    .select("id,submission_id,file_url,file_name,file_type,file_size,ocr_text,ocr_status,ocr_confidence,validation_status,admin_status,admin_remarks,ocr_metadata,uploaded_at,reviewed_at,created_at,updated_at,required_document_types(id,name)")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to save the uploaded document.");

  const existingFiles = ((existingRows as Array<{ id: string; file_url: string }> | null) ?? []).filter(
    (entry) => entry.file_url && entry.file_url !== storageUri,
  );
  if (existingFiles.length) {
    await removeStorageObjects(existingFiles.map((entry) => entry.file_url));
  }

  await supabase
    .from("document_submissions")
    .update({
      status: "under_admin_review",
      user_confirmed: true,
      submitted_at: submittedAt,
      updated_at: submittedAt,
    })
    .eq("id", submission.id);

  const mappedFile = mapDocumentFile(data as DocumentSubmissionFileRow);
  if (!mappedFile) throw new Error("The uploaded document could not be mapped to the portal.");

  return {
    submissionId: submission.id,
    file: mappedFile,
  };
};

export const removeOrganizationDocumentFromSupabase = async (fileId: string) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  await getAuthenticatedOrganizationContext();

  const { data: existingRow, error: existingError } = await supabase!
    .from("document_submission_files")
    .select("id,submission_id,file_url")
    .eq("id", fileId)
    .single();

  if (existingError || !existingRow) throw new Error(existingError?.message ?? "The uploaded document could not be found.");

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

  const nextStatus: DocumentSubmission["status"] =
    !remainingStatuses.length
      ? "draft"
      : remainingStatuses.includes("rejected_red")
        ? "rejected_red"
        : remainingStatuses.includes("needs_revision")
          ? "needs_revision"
          : remainingStatuses.every((status) => status === "approved_green")
            ? "approved_green"
            : "under_admin_review";

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

const getAuthenticatedOrganizationContext = async () => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) throw new Error("Please sign in with your organization account first.");

  const organizationProfile = await fetchOrganizationProfile(session.user.id);
  if (!organizationProfile) throw new Error("No organization profile was found for this account.");

  return { session, organizationProfile };
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

export const createBudgetRequestInSupabase = async (params: {
  budgetRequest: Omit<BudgetRequest, "id" | "createdAt" | "updatedAt" | "organizationId" | "submittedBy">;
  file?: File | null;
}) => {
  const { session, organizationProfile } = await getAuthenticatedOrganizationContext();

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
    purpose_category: params.budgetRequest.purposeCategory.trim(),
    status: params.budgetRequest.status,
    remarks: params.budgetRequest.remarks.trim() || null,
    go_signal_at: params.budgetRequest.goSignalAt || null,
    hard_copy_submitted_at: params.budgetRequest.hardCopySubmittedAt || null,
  };

  const { data, error } = await supabase!
    .from("budget_requests")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create the budget request.");

  const createdBudget = mapBudgetRequest(data as BudgetRequestRow);
  if (params.file) {
    await replaceBudgetRequestFileInSupabase(createdBudget.id, params.file);
  }

  return createdBudget;
};

export const updateBudgetRequestInSupabase = async (
  budgetRequestId: string,
  patch: Partial<Omit<BudgetRequest, "id" | "createdAt" | "updatedAt" | "organizationId" | "submittedBy">>,
) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const adminSession = readAdminSession();
  if (adminSession?.sessionToken) {
    const { data, error } = await supabase.rpc("update_admin_budget_request", {
      _session_token: adminSession.sessionToken,
      _budget_request_id: budgetRequestId,
      _status: patch.status ?? null,
      _approved_amount: patch.approvedAmount ?? null,
      _released_amount: patch.releasedAmount ?? null,
      _release_date: patch.releaseDate || null,
      _remarks: patch.remarks?.trim() || null,
      _go_signal_at: patch.goSignalAt || null,
      _hard_copy_submitted_at: patch.hardCopySubmittedAt || null,
    });

    const updatedRow = Array.isArray(data) ? data[0] : null;
    if (error || !updatedRow) throw new Error(error?.message ?? "Failed to update the budget request.");
    return mapBudgetRequest(updatedRow as BudgetRequestRow);
  }

  await getAuthenticatedOrganizationContext();

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
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.remarks !== undefined) payload.remarks = patch.remarks.trim() || null;
  if (patch.goSignalAt !== undefined) payload.go_signal_at = patch.goSignalAt || null;
  if (patch.hardCopySubmittedAt !== undefined) payload.hard_copy_submitted_at = patch.hardCopySubmittedAt || null;

  const { data, error } = await supabase!
    .from("budget_requests")
    .update(payload)
    .eq("id", budgetRequestId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update the budget request.");
  return mapBudgetRequest(data as BudgetRequestRow);
};

export const deleteBudgetRequestInSupabase = async (budgetRequestId: string) => {
  await getAuthenticatedOrganizationContext();
  const { data: fileRows, error: fileRowsError } = await supabase!
    .from("budget_request_files")
    .select("*")
    .eq("budget_request_id", budgetRequestId);

  if (fileRowsError) throw new Error(fileRowsError.message);

  const { error } = await supabase!.from("budget_requests").delete().eq("id", budgetRequestId);
  if (error) throw new Error(error.message);

  const existingFiles = (fileRows as BudgetRequestFileRow[] | null) ?? [];
  if (existingFiles.length) {
    await removeStorageObjects(existingFiles.map((entry) => entry.file_url));
  }
};

const replaceBudgetRequestFileInSupabase = async (budgetRequestId: string, file: File) => {
  await getAuthenticatedOrganizationContext();
  const { data: existingRows, error: existingError } = await supabase!
    .from("budget_request_files")
    .select("*")
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
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to save the budget request file.");

  if (existingFiles.length) {
    await supabase!.from("budget_request_files").delete().in(
      "id",
      existingFiles.map((entry) => entry.id),
    );
    await removeStorageObjects(existingFiles.map((entry) => entry.file_url));
  }

  return mapBudgetRequestFile(data as BudgetRequestFileRow);
};

export const uploadBudgetRequestFileToSupabase = replaceBudgetRequestFileInSupabase;

export const createLiquidationReportFileInSupabase = async (params: {
  liquidationReportId: string;
  file: File;
}) => {
  await getAuthenticatedOrganizationContext();
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
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to save the liquidation file.");
  return mapLiquidationReportFile(data as LiquidationReportFileRow);
};

export const createNewsReleaseInSupabase = async (params: {
  title: string;
  description: string;
  facebookPostUrl: string;
  datePosted: string;
  visibilityStatus: NewsRelease["visibilityStatus"];
}) => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("create_admin_news_release", {
    _session_token: adminSession.sessionToken,
    _title: params.title.trim(),
    _description: params.description.trim(),
    _facebook_post_url: params.facebookPostUrl.trim(),
    _date_posted: params.datePosted,
    _visibility_status: params.visibilityStatus,
  });

  const createdRow = Array.isArray(data) ? data[0] : null;
  if (error || !createdRow) throw new Error(error?.message ?? "Failed to create the news release.");
  return mapNewsRelease(createdRow as NewsReleaseRow);
};

export const updateNewsReleaseInSupabase = async (
  newsReleaseId: string,
  patch: Partial<Pick<NewsRelease, "title" | "description" | "facebookPostUrl" | "datePosted" | "visibilityStatus">>,
) => {
  const adminSession = getAuthenticatedAdminSession();

  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title.trim();
  if (patch.description !== undefined) payload.description = patch.description.trim();
  if (patch.facebookPostUrl !== undefined) payload.facebook_post_url = patch.facebookPostUrl.trim();
  if (patch.datePosted !== undefined) payload.date_posted = patch.datePosted;
  if (patch.visibilityStatus !== undefined) payload.visibility_status = patch.visibilityStatus;

  const { data, error } = await supabase!.rpc("update_admin_news_release", {
    _session_token: adminSession.sessionToken,
    _news_release_id: newsReleaseId,
    _title: payload.title ?? null,
    _description: payload.description ?? null,
    _facebook_post_url: payload.facebook_post_url ?? null,
    _date_posted: payload.date_posted ?? null,
    _visibility_status: payload.visibility_status ?? null,
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
}) => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("create_admin_activity_log", {
    _session_token: adminSession.sessionToken,
    _organization_id: params.organizationId || null,
    _action: params.action.trim(),
    _related_type: params.relatedType.trim(),
    _related_id: params.relatedId || null,
    _description: params.description.trim(),
  });

  const createdRow = Array.isArray(data) ? data[0] : null;
  if (error || !createdRow) throw new Error(error?.message ?? "Failed to create the activity log.");
  return mapActivityLog(createdRow as ActivityLogRow);
};

export const updateLiquidationReportInSupabase = async (
  liquidationReportId: string,
  patch: Partial<Omit<LiquidationReport, "id" | "createdAt" | "updatedAt" | "organizationId" | "submittedBy" | "budgetRequestId">>,
) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const adminSession = readAdminSession();
  if (adminSession?.sessionToken) {
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

    const updatedRow = Array.isArray(data) ? data[0] : null;
    if (error || !updatedRow) throw new Error(error?.message ?? "Failed to update the liquidation report.");
    return mapLiquidationReport(updatedRow as LiquidationReportRow);
  }

  await getAuthenticatedOrganizationContext();

  const payload: Record<string, unknown> = {};
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.remarks !== undefined) payload.remarks = patch.remarks.trim() || null;
  if (patch.goSignalAt !== undefined) payload.go_signal_at = patch.goSignalAt || null;
  if (patch.deadlineAt !== undefined) payload.deadline_at = patch.deadlineAt || null;
  if (patch.hardCopySubmittedAt !== undefined) payload.hard_copy_submitted_at = patch.hardCopySubmittedAt || null;
  if (patch.completedAt !== undefined) payload.completed_at = patch.completedAt || null;

  const { data, error } = await supabase!
    .from("liquidation_reports")
    .update(payload)
    .eq("id", liquidationReportId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update the liquidation report.");
  return mapLiquidationReport(data as LiquidationReportRow);
};

export const uploadOrganizationDocumentToSupabase = submitOrganizationDocumentToSupabase;

export const uploadTemplateDocumentToSupabase = async (params: {
  documentTypeName: string;
  file: File;
}) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const documentTypeRow = await fetchRequiredDocumentTypeRowByName(params.documentTypeName);
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

  const mappedTemplate = mapTemplate(updatedRow as RequiredDocumentTypeRow);
  if (!mappedTemplate) throw new Error("The uploaded template could not be mapped to the portal.");

  return mappedTemplate;
};

export const createTemplateRecordInSupabase = async (params: {
  name: string;
  description: string;
  templateDescription: string;
}) => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession) throw new Error("Please sign in with the seeded admin account first.");

  const { data, error } = await supabase.rpc("create_admin_template_document", {
    _session_token: adminSession.sessionToken,
    _name: params.name.trim(),
    _description: params.description.trim(),
    _template_description: params.templateDescription.trim(),
  });

  const createdRow = Array.isArray(data) ? data[0] : null;
  if (error || !createdRow) throw new Error(error?.message ?? "Failed to create the template.");

  const mappedTemplate = mapTemplate(createdRow as RequiredDocumentTypeRow);
  if (!mappedTemplate) throw new Error("The new template could not be mapped to the portal.");
  return mappedTemplate;
};

export const updateTemplateRecordInSupabase = async (params: {
  databaseId: string;
  lookupName: string;
  name: string;
  description: string;
  templateDescription: string;
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
  });

  const updatedRow = Array.isArray(data) ? data[0] : null;
  if (error || !updatedRow) throw new Error(error?.message ?? "Failed to update the template.");

  const mappedTemplate = mapTemplate(updatedRow as RequiredDocumentTypeRow);
  if (!mappedTemplate) throw new Error("The updated template could not be mapped to the portal.");
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

export const resolveSupabaseFileUrl = async (value: string) => {
  if (!supabase || !value) return value;

  const parsed = parseStorageUri(value);
  if (!parsed) return value;

  const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, 3600);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Failed to create a file URL.");
  return data.signedUrl;
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
    .select("*")
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
    .select("*")
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
    .select("*")
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
    _date: activity.date || null,
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
    _date: patch.date ?? null,
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

export const adminUpdateYpopEntryInSupabase = async (
  id: string,
  patch: Partial<YPOPEntry>,
): Promise<YPOPEntry> => {
  const adminSession = getAuthenticatedAdminSession();
  const { data, error } = await supabase!.rpc("admin_update_ypop_entry", {
    _session_token: adminSession.sessionToken,
    _entry_id: id,
    _status: patch.status ?? null,
    _admin_remarks: patch.adminRemarks ?? null,
    _points_earned: patch.pointsEarned ?? null,
    _org_led_project_count: patch.orgLedProjectCount ?? null,
    _city_led_attendance: patch.cityLedAttendance ?? null,
    _revision_history: patch.revisionHistory ?? null,
    _validated_at: patch.validatedAt || null,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) throw new Error("No data returned from admin_update_ypop_entry.");
  return mapYpopEntry(row as YpopEntryRow);
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
