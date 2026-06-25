import { BarChart3, Bell, Building2, CalendarCheck, CalendarDays, ClipboardCheck, ClipboardList, FileCheck2, FileText, LayoutDashboard, Mail, Medal, Megaphone, PlaneTakeoff, Wallet } from "lucide-react";
import type { ComponentType } from "react";

export type ProfileStatus =
  | "incomplete"
  | "pending_review"
  | "verified"
  | "needs_update"
  | "suspended_inactive";

export type DocumentSubmissionStatus =
  | "not_started"
  | "draft"
  | "uploaded"
  | "ocr_processing"
  | "ready_for_review"
  | "submitted"
  | "under_admin_review"
  | "needs_revision"
  | "approved_green"
  | "rejected_red";

export type BudgetRequestStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_revision"
  | "approved_for_ftf_green"
  | "rejected_red"
  | "hard_copy_submitted"
  | "budget_released"
  | "completed";

export type LiquidationStatus =
  | "pending_activity_completion"
  | "not_started"
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_revision"
  | "approved_for_ftf_green"
  | "rejected_red"
  | "hard_copy_submitted"
  | "completed_liquidated"
  | "overdue";

export type VisibilityStatus = "draft" | "published" | "hidden";

export type YPOPStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_revision"
  | "qualified"
  | "not_qualified";

export type InquiryStatus = "pending_review" | "reviewed" | "closed";

const getReferenceDateSegment = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(safeDate);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
};

export const buildPublicRecordCode = <T extends { id: string; createdAt: string }>(
  prefix: string,
  record: T | null | undefined,
  records: T[],
) => {
  if (!record) return `${prefix}-PENDING`;
  const dateSegment = getReferenceDateSegment(record.createdAt);
  const sameDayRecords = [...records]
    .filter((item) => getReferenceDateSegment(item.createdAt) === dateSegment)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
  const index = sameDayRecords.findIndex((item) => item.id === record.id);
  const suffix = sameDayRecords.length > 1 && index >= 0 ? `-${String(index + 1).padStart(2, "0")}` : "";
  return `${prefix}-${dateSegment}${suffix}`;
};

export type YPOPEntry = {
  id: string;
  organizationId: string;
  submittedBy: string;
  semester: string;
  semesterLabel: string;
  pointsEarned: number;
  pointsRequired: number;
  totalPoints: number;
  status: YPOPStatus;
  adminRemarks: string;
  submissionNote: string;
  validationDeadline: string;
  submittedAt: string;
  validatedAt: string;
  revisionHistory?: Array<{ action: string; adminRemarks: string; changedAt: string }>;
  orgLedProjectCount?: number;
  cityLedAttendance?: Array<{ activityId: string; attended: boolean }>;
  createdAt: string;
  updatedAt: string;
};

export type YPOPFile = {
  id: string;
  ypopEntryId: string;
  organizationId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
};

export type YPOPEventParticipationStatus =
  | "pending_verification"
  | "verified"
  | "needs_revision"
  | "rejected";

export type YPOPEventParticipation = {
  id: string;
  organizationId: string;
  activityId: string;
  activityName: string;
  activityDate: string;
  venue: string;
  status: YPOPEventParticipationStatus;
  adminRemarks: string;
  joinedAt: string;
  proofSubmittedAt: string;
  verifiedAt: string;
  revisionHistory?: Array<{ action: string; adminRemarks: string; changedAt: string }>;
  createdAt: string;
  updatedAt: string;
};

export type YPOPEventFile = {
  id: string;
  participationId: string;
  organizationId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
};

export type YPOPOrgActivityStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_revision"
  | "approved"
  | "rejected";

export type YPOPOrgActivity = {
  id: string;
  ypopEntryId: string;
  organizationId: string;
  submittedBy: string;
  activityName: string;
  activityDate: string;
  venue: string;
  narrativeReport: string;
  status: YPOPOrgActivityStatus;
  adminRemarks: string;
  submittedAt: string;
  approvedAt: string;
  revisionHistory?: Array<{ action: string; adminRemarks: string; changedAt: string }>;
  createdAt: string;
  updatedAt: string;
};

export type YPOPOrgActivityFile = {
  id: string;
  orgActivityId: string;
  organizationId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
};

export type YPOPCityActivityCategory = "mandatory" | "invitational" | "partnership";

export const YPOP_CITY_LED_CATEGORY_POINTS: Record<YPOPCityActivityCategory, number> = {
  mandatory: 4,
  invitational: 3,
  partnership: 2,
};

export const YPOP_CITY_LED_CATEGORY_LABELS: Record<YPOPCityActivityCategory, string> = {
  mandatory: "Mandatory",
  invitational: "Invitational",
  partnership: "Partnership",
};

export const resolveYpopCityLedCategory = (
  category?: string | null,
  points?: number,
): YPOPCityActivityCategory => {
  if (category === "mandatory" || category === "invitational" || category === "partnership") {
    return category;
  }

  const normalizedPoints = Math.max(0, Number.isFinite(points) ? Number(points) : 0);
  if (normalizedPoints >= YPOP_CITY_LED_CATEGORY_POINTS.mandatory) {
    return "mandatory";
  }
  if (normalizedPoints >= YPOP_CITY_LED_CATEGORY_POINTS.invitational) {
    return "invitational";
  }
  return "partnership";
};

export const getYpopCityLedPoints = (
  category?: string | null,
  fallbackPoints?: number,
) => YPOP_CITY_LED_CATEGORY_POINTS[resolveYpopCityLedCategory(category, fallbackPoints)];

export type YPOPCityActivity = {
  id: string;
  semesterKey: string;
  name: string;
  date: string;
  venue: string;
  category?: YPOPCityActivityCategory;
  points: number;
  createdAt: string;
};

export type YPOPPeriodStatus = "draft" | "open" | "closed";

export type YPOPOrgLedTier = {
  minProjects: number;
  bonus: number;
};

export const YPOP_CITY_LED_MAX_POINTS = 4;
export const YPOP_SCORE_THRESHOLD = 70;
export const YPOP_BASE_TOTAL_POINTS = 100;

export const DEFAULT_ORG_LED_TIERS: YPOPOrgLedTier[] = [
  { minProjects: 1, bonus: 10 },
  { minProjects: 4, bonus: 15 },
  { minProjects: 7, bonus: 20 },
  { minProjects: 10, bonus: 25 },
];

export const normalizeYpopCityLedPoints = (value: number, category?: string | null) =>
  Math.min(YPOP_CITY_LED_MAX_POINTS, Math.max(0, getYpopCityLedPoints(category, value)));

export type YPOPPeriod = {
  id: string;
  semesterKey: string;
  semesterLabel: string;
  validationDeadline: string;
  status: YPOPPeriodStatus;
  orgLedTiers?: YPOPOrgLedTier[];
  createdAt: string;
  updatedAt: string;
};

export type MOVEApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_revision"
  | "approved_for_ftf_green"
  | "rejected_red"
  | "completed";

export type MOVEOpportunityType =
  | "international_delegation"
  | "national_delegation"
  | "seminar_internship_sports"
  | "academic_research"
  | "cultural_exchange";

export type MOVERequirementPhase = "pre_application" | "post_program";

export type MOVERequirementKey =
  | "move_form"
  | "valid_id"
  | "parent_consent"
  | "expected_expenditures"
  | "barangay_residency"
  | "invitation_letter"
  | "acceptance_letter"
  | "endorsement_letter"
  | "good_moral"
  | "kk_profiling"
  | "post_delegation_report";

export type MOVERequirementDefinition = {
  key: MOVERequirementKey;
  label: string;
  description: string;
  required: boolean;
  phase: MOVERequirementPhase;
};

export type MOVEApplication = {
  id: string;
  organizationId: string;
  submittedBy: string;
  programTitle: string;
  opportunityType: MOVEOpportunityType;
  organizerName: string;
  location: string;
  invitationSource: string;
  startDate: string;
  endDate: string;
  expectedExpenseTotal: number;
  approvedAssistancePercent: number | null;
  status: MOVEApplicationStatus;
  adminRemarks: string;
  applicantNote: string;
  submittedAt: string;
  reviewedAt: string;
  completedAt: string;
  revisionHistory?: Array<{ action: string; adminRemarks: string; changedAt: string }>;
  createdAt: string;
  updatedAt: string;
};

export type MOVEFile = {
  id: string;
  applicationId: string;
  organizationId: string;
  requirementKey: MOVERequirementKey;
  requirementPhase: MOVERequirementPhase;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
};

export const MOVE_OPPORTUNITY_LABELS: Record<MOVEOpportunityType, string> = {
  international_delegation: "International Delegation",
  national_delegation: "National Delegation / NCR",
  seminar_internship_sports: "Seminar / Internship / Sports Representative",
  academic_research: "Academic / Research Work",
  cultural_exchange: "Cultural Exchange Delegation",
};

export const MOVE_REQUIREMENTS: MOVERequirementDefinition[] = [
  {
    key: "move_form",
    label: "Accomplished MOVE Application Form (PDF)",
    description: "Download the official MOVE form, accomplish it, then upload the scanned or soft-copy PDF here.",
    required: true,
    phase: "pre_application",
  },
];

export const computeMoveAssistanceBracket = (expectedExpenseTotal: number) => {
  if (expectedExpenseTotal >= 500001) {
    return { label: "10%", minPercent: 10, maxPercent: 10 };
  }
  if (expectedExpenseTotal >= 100001) {
    return { label: "10% - 20%", minPercent: 10, maxPercent: 20 };
  }
  return { label: "20% - 30%", minPercent: 20, maxPercent: 30 };
};

export type BudgetRequestType = "regular" | "ypop_incentive";

export type RequiredDocumentType = {
  id: string;
  name: string;
  description: string;
  templateUrl: string;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
  templateScope: "document_submission" | "move" | "other";
};

export const templateScopeLabelMap: Record<RequiredDocumentType["templateScope"], string> = {
  document_submission: "Document Submissions",
  move: "MOVE Template",
  other: "Other Templates",
};

export const createTemplateLocalId = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "template";

export const legacyRemovedTemplateNames = new Set([
  "Additional Requirement 1 / Supporting Document",
  "Additional Requirement 2 / Supporting Document",
]);

export type PortalNavItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export type PortalNavGroup = {
  id: string;
  label: string;
  items: PortalNavItem[];
};

export function computeYpopScore(
  attendance: Array<{ activityId: string; attended: boolean }>,
  activities: YPOPCityActivity[],
  orgLedProjectCount: number,
  orgLedTiers?: YPOPOrgLedTier[],
): {
  cityLedEarned: number;
  cityLedMax: number;
  cityLedPercent: number;
  cityLedWeightedScore: number;
  orgLedBonus: number;
  totalScore: number;
} {
  const tiers = orgLedTiers?.length ? orgLedTiers : DEFAULT_ORG_LED_TIERS;
  const sorted = [...tiers].sort((a, b) => b.minProjects - a.minProjects);
  const matched = sorted.find((t) => orgLedProjectCount >= t.minProjects);
  const orgLedBonus = matched?.bonus ?? 0;
  const cityLedMax = activities.reduce(
    (sum, activity) => sum + normalizeYpopCityLedPoints(activity.points, activity.category),
    0,
  );
  const cityLedEarned = attendance
    .filter((a) => a.attended)
    .reduce((sum, attendanceItem) => {
      const activity = activities.find((item) => item.id === attendanceItem.activityId);
      return sum + normalizeYpopCityLedPoints(activity?.points ?? 0, activity?.category);
    }, 0);
  const cityLedPercent = cityLedMax > 0 ? Math.round((cityLedEarned / cityLedMax) * 100) : 0;
  const cityLedWeightedScore = cityLedPercent;
  return { cityLedEarned, cityLedMax, cityLedPercent, cityLedWeightedScore, orgLedBonus, totalScore: Math.round(cityLedPercent + orgLedBonus) };
}

export function getApprovedYpopOrgActivityCount(
  activities: YPOPOrgActivity[],
  entryId: string,
  fallbackCount = 0,
) {
  const approvedCount = activities.filter((activity) => activity.ypopEntryId === entryId && activity.status === "approved").length;
  return approvedCount > 0 ? approvedCount : fallbackCount;
}

export const majorClassificationOptions = ["Youth Organization", "Youth-Serving Organization"] as const;
export type MajorClassification = (typeof majorClassificationOptions)[number];

export const subClassificationOptions = ["community-based", "school-based", "faith-based", "consortium/federation"] as const;
export type SubClassification = (typeof subClassificationOptions)[number];
export const subClassificationLabelMap: Record<SubClassification, string> = {
  "community-based": "Community-based",
  "school-based": "School-based",
  "faith-based": "Faith-based",
  "consortium/federation": "Consortium/Federation",
};

export const formatSubClassificationLabel = (value: string) =>
  (value in subClassificationLabelMap ? subClassificationLabelMap[value as SubClassification] : value)
    .split("/")
    .map((part) =>
      part
        .split("-")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join("-"),
    )
    .join("/");

export const advocacyOptions = [
  "education",
  "environment",
  "health",
  "peace building and security",
  "governance",
  "active citizenship",
  "global mobility",
  "social inclusion and equity",
  "economic empowerment",
  "agriculture",
] as const;
export type Advocacy = (typeof advocacyOptions)[number];

export const requiredDocumentTypes: RequiredDocumentType[] = [
  {
    id: "constitution-bylaws",
    name: "Constitution and By-Laws",
    description: "Upload the signed constitution and by-laws in PDF format.",
    templateUrl: "#constitution-bylaws-template",
    sortOrder: 1,
    isRequired: true,
    isActive: true,
    templateScope: "document_submission",
  },
  {
    id: "yorp-form-b",
    name: "2026 NYC YORP Registration Form (Form B)",
    description: "Use the current Form B template for the organization registration packet.",
    templateUrl: "#form-b-template",
    sortOrder: 2,
    isRequired: true,
    isActive: true,
    templateScope: "document_submission",
  },
  {
    id: "yorp-officers-adviser",
    name: "2026 YORP Directory of Officers and Adviser",
    description: "List all officers and the organization adviser.",
    templateUrl: "#officers-adviser-template",
    sortOrder: 3,
    isRequired: true,
    isActive: true,
    templateScope: "document_submission",
  },
  {
    id: "yorp-members",
    name: "2026 YORP List of Members in Good Standing",
    description: "Upload the current membership list in good standing.",
    templateUrl: "#members-template",
    sortOrder: 4,
    isRequired: true,
    isActive: true,
    templateScope: "document_submission",
  },
  {
    id: "pcydo-form-a",
    name: "Pasig City YORP Registration Form (Form A)",
    description: "Official Pasig City Form A requirement.",
    templateUrl: "#form-a-template",
    sortOrder: 5,
    isRequired: true,
    isActive: true,
    templateScope: "document_submission",
  },
  {
    id: "pcydo-data-request",
    name: "PCYDO YORP Data Request Form",
    description: "Current PCYDO data request form for the organization.",
    templateUrl: "#data-request-template",
    sortOrder: 6,
    isRequired: true,
    isActive: true,
    templateScope: "document_submission",
  },
];

export const userNavigationGroups: PortalNavGroup[] = [
  {
    id: "getting-started",
    label: "Home",
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    id: "compliance-workflow",
    label: "Compliance",
    items: [
      { id: "document-submission", label: "Document Submissions", icon: FileText },
      { id: "liquidation-reporting", label: "Liquidation Reports", icon: CalendarDays },
    ],
  },
  {
    id: "grants-incentives",
    label: "Grants & Incentives",
    items: [
      { id: "budget-request", label: "Budget Requests", icon: ClipboardList },
      { id: "ypop", label: "YPOP Incentive", icon: Medal },
    ],
  },
  {
    id: "templates",
    label: "Templates",
    items: [{ id: "templates", label: "Templates", icon: FileText }],
  },
  {
    id: "updates",
    label: "News Releases",
    items: [
      { id: "news-releases", label: "News Releases", icon: Megaphone },
    ],
  },
];

export const userNavigation = userNavigationGroups.flatMap((group) => group.items);

export const userRouteMap: Record<string, string> = {
  dashboard: "/dashboard",
  "organization-profile": "/organization-profile",
  "document-submission": "/document-submission",
  "budget-request": "/budget-request",
  "liquidation-reporting": "/liquidation-reporting",
  "news-releases": "/news-releases",
  "compliance-status": "/compliance-status",
  notifications: "/notifications",
  ypop: "/ypop",
  templates: "/templates",
};

export const adminNavigationGroups: PortalNavGroup[] = [
  {
    id: "main",
    label: "",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
    ],
  },
  {
    id: "organizations",
    label: "Organizations",
    items: [
      { id: "registrations", label: "Registration Review", icon: ClipboardCheck },
      { id: "yorp-registry", label: "YORP Registry", icon: ClipboardList },
    ],
  },
  {
    id: "budget-finance",
    label: "Budget & Finance",
    items: [
      { id: "budget-utilization", label: "Budget Requests", icon: Wallet },
      { id: "liquidation-monitoring", label: "Liquidation Reports", icon: CalendarCheck },
      { id: "budget-monitoring", label: "Budget Tracking", icon: BarChart3 },
    ],
  },
  {
    id: "incentives",
    label: "Grants & Incentives",
    items: [
      { id: "ypop-validation", label: "YPOP Validation", icon: Medal },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { id: "news-releases", label: "News Releases", icon: Megaphone },
      { id: "templates", label: "Templates", icon: FileText },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { id: "inquiries", label: "Inquiries", icon: Mail },
      { id: "notifications-activity", label: "Notifications / Activity Logs", icon: Bell },
    ],
  },
];

export const adminNavigation = adminNavigationGroups.flatMap((group) => group.items);

export type OrganizationProfile = {
  id: string;
  userId: string;
  organizationName: string;
  organizationEmail: string;
  contactNumber: string;
  district: string;
  barangay: string;
  isExistingOrganization: boolean;
  organizationIdentifierNumber: string;
  majorClassification: MajorClassification | "";
  subClassification: SubClassification | "";
  advocacies: Advocacy[];
  adviserName: string;
  representativeName: string;
  address: string;
  facebookPageUrl: string;
  profileStatus: ProfileStatus;
  verifiedAt: string;
  internalNotes: string;
  yorpRegisteredYear: number | null;
  yorpRenewedYear: number | null;
  createdAt: string;
  updatedAt: string;
};

export type SubmissionFile = {
  id: string;
  submissionId: string;
  documentTypeId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  ocrText: string;
  ocrStatus: "pending" | "processing" | "completed" | "failed";
  ocrConfidence: number;
  validationStatus: "correct" | "needs_reupload" | "missing" | "mismatch";
  adminStatus: DocumentSubmissionStatus;
  adminRemarks: string;
  userRemarks?: string;
  ocrMetadata?: Record<string, unknown> | null;
  uploadedAt: string;
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentSubmission = {
  id: string;
  organizationId: string;
  submittedBy: string;
  status: DocumentSubmissionStatus;
  userConfirmed: boolean;
  submittedAt: string;
  reviewedBy: string;
  reviewedAt: string;
  overallRemarks: string;
  createdAt: string;
  updatedAt: string;
};

export type BudgetRequestFile = {
  id: string;
  budgetRequestId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  createdAt: string;
};

export type BudgetRequest = {
  id: string;
  organizationId: string;
  submittedBy: string;
  activityTitle: string;
  activityDescription: string;
  activityDate: string;
  venue: string;
  requestedAmount: number;
  approvedAmount: number;
  releasedAmount: number;
  releaseDate: string;
  purposeCategory: string;
  status: BudgetRequestStatus;
  remarks: string;
  adminRemarks: string;
  goSignalAt: string;
  hardCopySubmittedAt: string;
  createdAt: string;
  updatedAt: string;
  userNote?: string;
  revisionHistory?: Array<{ action: string; adminRemarks: string; changedAt: string }>;
  budgetRequestType?: BudgetRequestType;
  ypopEntryId?: string;
};

export type LiquidationReportFile = {
  id: string;
  liquidationReportId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  createdAt: string;
};

export type LiquidationReport = {
  id: string;
  budgetRequestId: string;
  organizationId: string;
  submittedBy: string;
  status: LiquidationStatus;
  remarks: string;
  goSignalAt: string;
  deadlineAt: string;
  hardCopySubmittedAt: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
  revisionHistory?: Array<{ action: string; adminRemarks: string; changedAt: string }>;
};

export type NewsRelease = {
  id: string;
  title: string;
  description: string;
  facebookPostUrl: string;
  previewImageUrl?: string;
  datePosted: string;
  visibilityStatus: VisibilityStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TransparencyPost = {
  id: string;
  title: string;
  description: string;
  category: string;
  attachmentUrl: string;
  visibilityStatus: VisibilityStatus;
  postDate: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ComplianceRemark = {
  id: string;
  organizationId: string;
  relatedType: string;
  relatedId: string;
  remarkType: string;
  consequenceType: string;
  message: string;
  status: string;
  createdBy: string;
  resolvedBy: string;
  resolvedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationRecord = {
  id: string;
  userId: string;
  organizationId: string;
  title: string;
  message: string;
  type: string;
  relatedType: string;
  relatedId: string;
  isRead: boolean;
  createdAt: string;
};

export type ActivityLog = {
  id: string;
  actorUserId: string;
  organizationId: string;
  action: string;
  relatedType: string;
  relatedId: string;
  description: string;
  createdAt: string;
};

export type InquiryRecord = {
  id: string;
  organizationId: string;
  submittedBy: string;
  submitterName: string;
  organizationName: string;
  email: string;
  subject: string;
  description: string;
  status: InquiryStatus;
  adminRemarks: string;
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type TemplateRecord = RequiredDocumentType & {
  databaseId: string;
  templateDescription: string;
  templateActive: boolean;
  templateFileName: string;
  templateFileUrl: string;
  templateFileType: string;
  templateUploadedAt: string;
};

export type LydoSeedState = {
  organizationProfiles: OrganizationProfile[];
  documentSubmissions: DocumentSubmission[];
  documentSubmissionFiles: SubmissionFile[];
  budgetRequests: BudgetRequest[];
  budgetRequestFiles: BudgetRequestFile[];
  liquidationReports: LiquidationReport[];
  liquidationReportFiles: LiquidationReportFile[];
  newsReleases: NewsRelease[];
  transparencyPosts: TransparencyPost[];
  complianceRemarks: ComplianceRemark[];
  notifications: NotificationRecord[];
  activityLogs: ActivityLog[];
  inquiries: InquiryRecord[];
  templates: TemplateRecord[];
  ypopEntries: YPOPEntry[];
  ypopFiles: YPOPFile[];
  ypopEventParticipations: YPOPEventParticipation[];
  ypopEventFiles: YPOPEventFile[];
  ypopOrgActivities: YPOPOrgActivity[];
  ypopOrgActivityFiles: YPOPOrgActivityFile[];
  ypopCityActivities: YPOPCityActivity[];
  ypopPeriods: YPOPPeriod[];
  moveApplications: MOVEApplication[];
  moveFiles: MOVEFile[];
};

const nowIso = new Date().toISOString();

export const seedState: LydoSeedState = {
  organizationProfiles: [
    {
      id: "org-demo-001",
      userId: "user-demo-001",
      organizationName: "San Jose Youth Alliance",
      organizationEmail: "sjya@example.com",
      contactNumber: "",
      district: "",
      barangay: "",
      isExistingOrganization: false,
      organizationIdentifierNumber: "",
      majorClassification: "",
      subClassification: "",
      advocacies: [],
      adviserName: "",
      representativeName: "",
      address: "",
      facebookPageUrl: "",
      profileStatus: "verified",
      verifiedAt: "2026-03-15T08:00:00.000Z",
      internalNotes: "",
      yorpRegisteredYear: 2024,
      yorpRenewedYear: 2026,
      createdAt: "2026-02-01T09:00:00.000Z",
      updatedAt: "2026-02-01T09:00:00.000Z",
    },
    {
      id: "org-demo-002",
      userId: "user-demo-002",
      organizationName: "Malanday Youth Council",
      organizationEmail: "myc@example.com",
      contactNumber: "09189876543",
      district: "District 2",
      barangay: "Malanday",
      isExistingOrganization: true,
      organizationIdentifierNumber: "ML-YO-2024-007",
      majorClassification: "Youth Organization",
      subClassification: "school-based",
      advocacies: ["governance", "environment"],
      adviserName: "Mr. Roberto Aquino",
      representativeName: "Maria Santos",
      address: "456 Mabini Ave., Malanday, Pasig City",
      facebookPageUrl: "",
      profileStatus: "pending_review",
      verifiedAt: "",
      internalNotes: "",
      yorpRegisteredYear: 2024,
      yorpRenewedYear: null,
      createdAt: "2026-04-10T10:30:00.000Z",
      updatedAt: "2026-04-10T10:30:00.000Z",
    },
    {
      id: "org-demo-003",
      userId: "user-demo-003",
      organizationName: "Banaba SK Youth Federation",
      organizationEmail: "bskf@example.com",
      contactNumber: "09201112233",
      district: "District 1",
      barangay: "Banaba",
      isExistingOrganization: false,
      organizationIdentifierNumber: "",
      majorClassification: "Youth-Serving Organization",
      subClassification: "faith-based",
      advocacies: ["social inclusion and equity", "economic empowerment"],
      adviserName: "",
      representativeName: "Ana Reyes",
      address: "",
      facebookPageUrl: "",
      profileStatus: "incomplete",
      verifiedAt: "",
      internalNotes: "",
      yorpRegisteredYear: null,
      yorpRenewedYear: null,
      createdAt: "2026-05-20T14:00:00.000Z",
      updatedAt: "2026-05-20T14:00:00.000Z",
    },
  ],
  documentSubmissions: [
    {
      id: "docsub-demo-001",
      organizationId: "org-demo-001",
      submittedBy: "user-demo-001",
      status: "under_admin_review",
      userConfirmed: true,
      submittedAt: "2026-03-20T09:00:00.000Z",
      reviewedBy: "",
      reviewedAt: "",
      overallRemarks: "",
      createdAt: "2026-03-18T08:00:00.000Z",
      updatedAt: "2026-03-20T09:00:00.000Z",
    },
    {
      id: "docsub-demo-002",
      organizationId: "org-demo-002",
      submittedBy: "user-demo-002",
      status: "submitted",
      userConfirmed: true,
      submittedAt: "2026-04-12T11:00:00.000Z",
      reviewedBy: "",
      reviewedAt: "",
      overallRemarks: "",
      createdAt: "2026-04-11T09:00:00.000Z",
      updatedAt: "2026-04-12T11:00:00.000Z",
    },
  ],
  documentSubmissionFiles: [
    {
      id: "file-demo-001-1",
      submissionId: "docsub-demo-001",
      documentTypeId: "constitution-bylaws",
      fileName: "constitution-and-bylaws-sjya.pdf",
      fileUrl: "",
      fileType: "application/pdf",
      fileSize: 102400,
      ocrText: "",
      ocrStatus: "completed",
      ocrConfidence: 0,
      validationStatus: "correct",
      adminStatus: "approved_green",
      adminRemarks: "Compliant.",
      uploadedAt: "2026-03-18T08:10:00.000Z",
      reviewedAt: "2026-03-21T10:00:00.000Z",
      createdAt: "2026-03-18T08:10:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    },
    {
      id: "file-demo-001-2",
      submissionId: "docsub-demo-001",
      documentTypeId: "yorp-form-b",
      fileName: "form-b-sjya-2026.pdf",
      fileUrl: "",
      fileType: "application/pdf",
      fileSize: 86400,
      ocrText: "",
      ocrStatus: "completed",
      ocrConfidence: 0,
      validationStatus: "correct",
      adminStatus: "approved_green",
      adminRemarks: "Correct.",
      uploadedAt: "2026-03-18T08:15:00.000Z",
      reviewedAt: "2026-03-21T10:05:00.000Z",
      createdAt: "2026-03-18T08:15:00.000Z",
      updatedAt: "2026-03-21T10:05:00.000Z",
    },
    {
      id: "file-demo-001-3",
      submissionId: "docsub-demo-001",
      documentTypeId: "yorp-officers-adviser",
      fileName: "officers-adviser-list-sjya.pdf",
      fileUrl: "",
      fileType: "application/pdf",
      fileSize: 75000,
      ocrText: "",
      ocrStatus: "completed",
      ocrConfidence: 0,
      validationStatus: "correct",
      adminStatus: "approved_green",
      adminRemarks: "",
      uploadedAt: "2026-03-18T08:20:00.000Z",
      reviewedAt: "2026-03-21T10:10:00.000Z",
      createdAt: "2026-03-18T08:20:00.000Z",
      updatedAt: "2026-03-21T10:10:00.000Z",
    },
    {
      id: "file-demo-001-4",
      submissionId: "docsub-demo-001",
      documentTypeId: "yorp-members",
      fileName: "members-list-sjya-2026.pdf",
      fileUrl: "",
      fileType: "application/pdf",
      fileSize: 118000,
      ocrText: "",
      ocrStatus: "completed",
      ocrConfidence: 0,
      validationStatus: "needs_reupload",
      adminStatus: "needs_revision",
      adminRemarks: "Please update the membership list to include complete addresses for all members.",
      userRemarks: "Updated the membership list with complete addresses for all members. Sorry for the delay.",
      uploadedAt: "2026-03-18T08:25:00.000Z",
      reviewedAt: "2026-03-21T10:20:00.000Z",
      createdAt: "2026-03-18T08:25:00.000Z",
      updatedAt: "2026-03-21T10:20:00.000Z",
    },
    {
      id: "file-demo-001-6",
      submissionId: "docsub-demo-001",
      documentTypeId: "pcydo-data-request",
      fileName: "data-request-form-sjya.pdf",
      fileUrl: "",
      fileType: "application/pdf",
      fileSize: 68000,
      ocrText: "",
      ocrStatus: "completed",
      ocrConfidence: 0,
      validationStatus: "correct",
      adminStatus: "approved_green",
      adminRemarks: "",
      uploadedAt: "2026-03-18T08:35:00.000Z",
      reviewedAt: "2026-03-21T10:15:00.000Z",
      createdAt: "2026-03-18T08:35:00.000Z",
      updatedAt: "2026-03-21T10:15:00.000Z",
    },
    {
      id: "file-demo-002-1",
      submissionId: "docsub-demo-002",
      documentTypeId: "constitution-bylaws",
      fileName: "constitution-bylaws-myc.pdf",
      fileUrl: "",
      fileType: "application/pdf",
      fileSize: 98000,
      ocrText: "",
      ocrStatus: "completed",
      ocrConfidence: 0,
      validationStatus: "correct",
      adminStatus: "submitted",
      adminRemarks: "",
      uploadedAt: "2026-04-11T09:10:00.000Z",
      reviewedAt: "",
      createdAt: "2026-04-11T09:10:00.000Z",
      updatedAt: "2026-04-11T09:10:00.000Z",
    },
    {
      id: "file-demo-002-2",
      submissionId: "docsub-demo-002",
      documentTypeId: "yorp-form-b",
      fileName: "form-b-myc-2026.pdf",
      fileUrl: "",
      fileType: "application/pdf",
      fileSize: 84000,
      ocrText: "",
      ocrStatus: "completed",
      ocrConfidence: 0,
      validationStatus: "correct",
      adminStatus: "submitted",
      adminRemarks: "",
      uploadedAt: "2026-04-11T09:15:00.000Z",
      reviewedAt: "",
      createdAt: "2026-04-11T09:15:00.000Z",
      updatedAt: "2026-04-11T09:15:00.000Z",
    },
    {
      id: "file-demo-002-3",
      submissionId: "docsub-demo-002",
      documentTypeId: "yorp-officers-adviser",
      fileName: "officers-list-myc.pdf",
      fileUrl: "",
      fileType: "application/pdf",
      fileSize: 72000,
      ocrText: "",
      ocrStatus: "completed",
      ocrConfidence: 0,
      validationStatus: "correct",
      adminStatus: "submitted",
      adminRemarks: "",
      uploadedAt: "2026-04-11T09:20:00.000Z",
      reviewedAt: "",
      createdAt: "2026-04-11T09:20:00.000Z",
      updatedAt: "2026-04-11T09:20:00.000Z",
    },
  ],
  budgetRequests: [
    {
      id: "budget-demo-001",
      organizationId: "org-demo-001",
      submittedBy: "user-demo-001",
      activityTitle: "Youth Leadership Summit 2026",
      activityDescription: "A two-day leadership summit for youth leaders across all barangays.",
      activityDate: "2026-04-25T00:00:00.000Z",
      venue: "Pasig City Hall Function Room",
      requestedAmount: 25000,
      approvedAmount: 20000,
      releasedAmount: 20000,
      releaseDate: "2026-04-10T00:00:00.000Z",
      purposeCategory: "Capacity Building",
      status: "budget_released",
      remarks: "Approved with minor reduction. Hard copy submitted.",
      goSignalAt: "2026-04-08T00:00:00.000Z",
      hardCopySubmittedAt: "2026-04-09T00:00:00.000Z",
      createdAt: "2026-03-25T10:00:00.000Z",
      updatedAt: "2026-04-10T00:00:00.000Z",
      userNote: "I've added a complete itemized breakdown of all costs including materials, transportation, and venue fees. Sorry for the incomplete initial submission.",
      revisionHistory: [
        { action: "needs_revision", adminRemarks: "Please provide a more detailed budget breakdown with itemized costs for each expense.", changedAt: "2026-03-28T09:00:00.000Z" },
        { action: "approved_for_ftf_green", adminRemarks: "Approved with a minor reduction to PHP 20,000. Please submit hard copy to the office.", changedAt: "2026-04-08T08:30:00.000Z" },
        { action: "hard_copy_submitted", adminRemarks: "", changedAt: "2026-04-09T10:15:00.000Z" },
        { action: "budget_released", adminRemarks: "", changedAt: "2026-04-10T09:00:00.000Z" },
      ],
    },
    {
      id: "budget-demo-003",
      organizationId: "org-demo-001",
      submittedBy: "user-demo-001",
      activityTitle: "Community Sports Festival",
      activityDescription: "A day-long sports event open to all youth members in the barangay to promote health and camaraderie.",
      activityDate: "2026-07-12T00:00:00.000Z",
      venue: "Pasig City Sports Complex",
      requestedAmount: 15000,
      approvedAmount: 0,
      releasedAmount: 0,
      releaseDate: "",
      purposeCategory: "Sports and Recreation",
      status: "draft",
      remarks: "",
      goSignalAt: "",
      hardCopySubmittedAt: "",
      createdAt: "2026-06-01T08:30:00.000Z",
      updatedAt: "2026-06-01T08:30:00.000Z",
      userNote: "",
      revisionHistory: [],
    },
    {
      id: "budget-demo-004",
      organizationId: "org-demo-001",
      submittedBy: "user-demo-001",
      activityTitle: "Youth Skills Training Workshop",
      activityDescription: "A two-day skills training covering digital literacy, communication, and basic entrepreneurship for youth aged 15–24.",
      activityDate: "2026-08-05T00:00:00.000Z",
      venue: "LYDO Training Hall",
      requestedAmount: 18000,
      approvedAmount: 0,
      releasedAmount: 0,
      releaseDate: "",
      purposeCategory: "Capacity Building",
      status: "needs_revision",
      remarks: "Please provide a more detailed breakdown of training materials and facilitator fees.",
      goSignalAt: "",
      hardCopySubmittedAt: "",
      createdAt: "2026-05-10T09:00:00.000Z",
      updatedAt: "2026-05-20T14:00:00.000Z",
      userNote: "",
      revisionHistory: [
        { action: "submitted", adminRemarks: "", changedAt: "2026-05-10T09:00:00.000Z" },
        { action: "needs_revision", adminRemarks: "Please provide a more detailed breakdown of training materials and facilitator fees.", changedAt: "2026-05-20T14:00:00.000Z" },
      ],
    },
    {
      id: "budget-demo-005",
      organizationId: "org-demo-001",
      submittedBy: "user-demo-001",
      activityTitle: "Youth Sports Development Program",
      activityDescription: "A series of sports clinics and tournaments promoting health and teamwork among youth members. This activity is funded through the YPOP Project Grant incentive.",
      activityDate: "2026-08-20T00:00:00.000Z",
      venue: "Pasig City Sports Complex",
      requestedAmount: 25000,
      approvedAmount: 0,
      releasedAmount: 0,
      releaseDate: "",
      purposeCategory: "Sports and Recreation",
      status: "submitted",
      remarks: "",
      goSignalAt: "",
      hardCopySubmittedAt: "",
      createdAt: "2026-06-05T09:00:00.000Z",
      updatedAt: "2026-06-05T09:00:00.000Z",
      userNote: "This PPA is linked to our 2025 Second Semester YPOP qualification.",
      revisionHistory: [],
      budgetRequestType: "ypop_incentive",
      ypopEntryId: "ypop-demo-001",
    },
    {
      id: "budget-demo-002",
      organizationId: "org-demo-002",
      submittedBy: "user-demo-002",
      activityTitle: "Environmental Awareness Clean-Up Drive",
      activityDescription: "Community clean-up drive along the Pasig riverbanks.",
      activityDate: "2026-05-10T00:00:00.000Z",
      venue: "Malanday Riverbank Area",
      requestedAmount: 12000,
      approvedAmount: 12000,
      releasedAmount: 0,
      releaseDate: "",
      purposeCategory: "Environmental",
      status: "approved_for_ftf_green",
      remarks: "Approved. Awaiting hard copy submission.",
      goSignalAt: "2026-04-28T00:00:00.000Z",
      hardCopySubmittedAt: "",
      createdAt: "2026-04-15T11:00:00.000Z",
      updatedAt: "2026-04-28T00:00:00.000Z",
      revisionHistory: [
        { action: "approved_for_ftf_green", adminRemarks: "Approved. Please submit the hard copy to the LYDO office before the activity date.", changedAt: "2026-04-28T00:00:00.000Z" },
      ],
    },
  ],
  budgetRequestFiles: [],
  liquidationReports: [
    {
      id: "liq-demo-001",
      budgetRequestId: "budget-demo-001",
      organizationId: "org-demo-001",
      submittedBy: "user-demo-001",
      status: "overdue",
      remarks: "Deadline passed. Organization has been notified.",
      goSignalAt: "2026-04-08T00:00:00.000Z",
      deadlineAt: "2026-05-08T00:00:00.000Z",
      hardCopySubmittedAt: "",
      completedAt: "",
      createdAt: "2026-04-08T00:00:00.000Z",
      updatedAt: nowIso,
      revisionHistory: [
        { action: "submitted", adminRemarks: "", changedAt: "2026-04-09T08:00:00.000Z" },
        { action: "needs_revision", adminRemarks: "Please include complete expense receipts and a signed certification.", changedAt: "2026-04-18T10:00:00.000Z" },
        { action: "overdue", adminRemarks: "Deadline passed with no resubmission.", changedAt: "2026-05-09T09:00:00.000Z" },
      ],
    },
  ],
  liquidationReportFiles: [],
  newsReleases: [
    {
      id: "news-demo-001",
      title: "LYDO Launches 2026 Youth Organization Registration Drive",
      description: "The Local Youth Development Office officially opens the 2026 registration season for all youth organizations in Pasig City. Organizations are encouraged to submit their documents early.",
      facebookPostUrl: "https://facebook.com/lydo",
      previewImageUrl: "",
      datePosted: "2026-02-01",
      visibilityStatus: "published",
      createdBy: "admin-demo",
      createdAt: "2026-02-01T08:00:00.000Z",
      updatedAt: "2026-02-01T08:00:00.000Z",
    },
    {
      id: "news-demo-002",
      title: "Youth Leadership Summit 2026 — Applications Now Open",
      description: "The LYDO Youth Leadership Summit will be held on April 25, 2026 at Pasig City Hall. All registered youth organization representatives are invited to apply for the limited slots.",
      facebookPostUrl: "https://facebook.com/lydo",
      previewImageUrl: "",
      datePosted: "2026-03-10",
      visibilityStatus: "published",
      createdBy: "admin-demo",
      createdAt: "2026-03-10T09:00:00.000Z",
      updatedAt: "2026-03-10T09:00:00.000Z",
    },
    {
      id: "news-demo-003",
      title: "2026 Kabataan Awards — Nomination Period Now Open",
      description: "LYDO is accepting nominations for the 2026 Kabataan Awards recognizing outstanding youth leaders in Pasig City. Deadline for submissions is June 30, 2026.",
      facebookPostUrl: "https://facebook.com/lydo",
      previewImageUrl: "",
      datePosted: "2026-06-01",
      visibilityStatus: "draft",
      createdBy: "admin-demo",
      createdAt: "2026-06-01T08:00:00.000Z",
      updatedAt: "2026-06-01T08:00:00.000Z",
    },
  ],
  transparencyPosts: [
    {
      id: "transp-demo-001",
      title: "Q1 2026 SK Budget Utilization Report",
      description: "Summary of budget utilization across all 16 barangays for the first quarter of 2026.",
      category: "Financial",
      attachmentUrl: "",
      visibilityStatus: "published",
      postDate: "2026-04-05",
      createdBy: "admin-demo",
      createdAt: "2026-04-05T10:00:00.000Z",
      updatedAt: "2026-04-05T10:00:00.000Z",
    },
    {
      id: "transp-demo-002",
      title: "2026 LYDO Annual Investment Plan",
      description: "The approved Annual Investment Plan for LYDO covering youth programs, capacity building, and community engagement activities for 2026.",
      category: "Planning",
      attachmentUrl: "",
      visibilityStatus: "published",
      postDate: "2026-01-20",
      createdBy: "admin-demo",
      createdAt: "2026-01-20T08:00:00.000Z",
      updatedAt: "2026-01-20T08:00:00.000Z",
    },
  ],
  complianceRemarks: [],
  notifications: [
    {
      id: "notif-admin-001",
      userId: "admin-demo",
      organizationId: "org-demo-001",
      title: "New Registration Submitted",
      message: "Bagong Araw Youth Association has submitted a new registration application and is awaiting review.",
      type: "info",
      relatedType: "organization_profile",
      relatedId: "org-demo-001",
      isRead: false,
      createdAt: "2026-04-10T08:30:00.000Z",
    },
    {
      id: "notif-admin-002",
      userId: "admin-demo",
      organizationId: "org-demo-002",
      title: "Document Submission Needs Review",
      message: "Rizal Youth Circle submitted compliance documents for the 2026 registration cycle. Please review and approve.",
      type: "info",
      relatedType: "document_submission",
      relatedId: "docsub-demo-002",
      isRead: false,
      createdAt: "2026-04-11T09:15:00.000Z",
    },
    {
      id: "notif-admin-003",
      userId: "admin-demo",
      organizationId: "org-demo-001",
      title: "Budget Request Awaiting Approval",
      message: "Bagong Araw Youth Association submitted a budget request of PHP 20,000 for Youth Leadership Summit 2026 and is pending your approval.",
      type: "warning",
      relatedType: "budget_request",
      relatedId: "budget-demo-001",
      isRead: false,
      createdAt: "2026-04-12T10:00:00.000Z",
    },
    {
      id: "notif-admin-004",
      userId: "admin-demo",
      organizationId: "org-demo-001",
      title: "Liquidation Report Overdue",
      message: "The liquidation report for Youth Leadership Summit 2026 from Bagong Araw Youth Association is past its deadline. Please follow up.",
      type: "warning",
      relatedType: "liquidation_report",
      relatedId: "liq-demo-001",
      isRead: false,
      createdAt: nowIso,
    },
    {
      id: "notif-admin-005",
      userId: "admin-demo",
      organizationId: "org-demo-002",
      title: "Registration Approved",
      message: "Rizal Youth Circle's registration was reviewed and approved. Their profile is now active in the system.",
      type: "info",
      relatedType: "organization_profile",
      relatedId: "org-demo-002",
      isRead: true,
      createdAt: "2026-03-15T14:00:00.000Z",
    },
    {
      id: "notif-demo-001",
      userId: "user-demo-002",
      organizationId: "org-demo-002",
      title: "Document Submission Received",
      message: "Your document submission has been received and is now under admin review. You will be notified once the review is complete.",
      type: "info",
      relatedType: "document_submission",
      relatedId: "docsub-demo-002",
      isRead: false,
      createdAt: "2026-04-12T11:05:00.000Z",
    },
    {
      id: "notif-demo-002",
      userId: "user-demo-001",
      organizationId: "org-demo-001",
      title: "Liquidation Report Overdue",
      message: "Your liquidation report for Youth Leadership Summit 2026 is now overdue. Please submit immediately to avoid compliance issues.",
      type: "warning",
      relatedType: "liquidation_report",
      relatedId: "liq-demo-001",
      isRead: false,
      createdAt: nowIso,
    },
    {
      id: "notif-user-001",
      userId: "user-demo-001",
      organizationId: "org-demo-001",
      title: "Budget Released",
      message: "The admin has released the budget for Youth Leadership Summit 2026 (PHP 20,000). You may now proceed with the activity and prepare your liquidation documents.",
      type: "info",
      relatedType: "budget_request",
      relatedId: "budget-demo-001",
      isRead: true,
      createdAt: "2026-04-10T00:30:00.000Z",
    },
    {
      id: "notif-user-002",
      userId: "user-demo-001",
      organizationId: "org-demo-001",
      title: "Welcome to Y-TRACE",
      message: "Your account has been set up. Please complete your organization profile to begin the compliance workflow.",
      type: "info",
      relatedType: "organization_profile",
      relatedId: "org-demo-001",
      isRead: true,
      createdAt: "2026-02-01T09:05:00.000Z",
    },
  ],
  activityLogs: [
    {
      id: "log-demo-001",
      actorUserId: "admin-demo",
      organizationId: "org-demo-001",
      action: "verify_organization_profile",
      relatedType: "organization_profile",
      relatedId: "org-demo-001",
      description: "Admin verified the organization profile for San Jose Youth Alliance.",
      createdAt: "2026-03-15T08:05:00.000Z",
    },
    {
      id: "log-demo-002",
      actorUserId: "admin-demo",
      organizationId: "org-demo-001",
      action: "release_budget",
      relatedType: "budget_request",
      relatedId: "budget-demo-001",
      description: "Budget released for Youth Leadership Summit 2026 (₱20,000).",
      createdAt: "2026-04-10T00:30:00.000Z",
    },
    {
      id: "log-demo-003",
      actorUserId: "admin-demo",
      organizationId: "org-demo-002",
      action: "approve_document_submission",
      relatedType: "document_submission",
      relatedId: "docsub-demo-001",
      description: "Admin approved the accreditation documents submitted by Pasig Youth Council.",
      createdAt: "2026-04-18T02:15:00.000Z",
    },
    {
      id: "log-demo-004",
      actorUserId: "admin-demo",
      organizationId: "org-demo-001",
      action: "create_news_release",
      relatedType: "news_release",
      relatedId: "news-demo-001",
      description: "Admin published news release: Youth Development Program 2026 Kick-off.",
      createdAt: "2026-05-02T01:00:00.000Z",
    },
    {
      id: "log-demo-005",
      actorUserId: "admin-demo",
      organizationId: "org-demo-002",
      action: "reject_budget_request",
      relatedType: "budget_request",
      relatedId: "budget-demo-002",
      description: "Budget request rejected for Cultural Night 2026. Reason: Insufficient supporting documentation.",
      createdAt: "2026-05-15T05:30:00.000Z",
    },
    {
      id: "log-demo-006",
      actorUserId: "admin-demo",
      organizationId: "org-demo-001",
      action: "review_liquidation_report",
      relatedType: "liquidation_report",
      relatedId: "liq-demo-001",
      description: "Admin reviewed and accepted the liquidation report for Youth Leadership Summit 2026.",
      createdAt: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "log-demo-007",
      actorUserId: "user-demo-001",
      organizationId: "org-demo-001",
      action: "submit_document_submission",
      relatedType: "document_submission",
      relatedId: "docsub-demo-001",
      description: "San Jose Youth Alliance submitted compliance documents for the 2026 registration cycle.",
      createdAt: "2026-03-20T10:00:00.000Z",
    },
    {
      id: "log-demo-008",
      actorUserId: "admin-demo",
      organizationId: "org-demo-001",
      action: "needs_revision",
      relatedType: "document_submission",
      relatedId: "docsub-demo-001",
      description: "Admin requested revision on Members List — complete addresses required.",
      createdAt: "2026-03-25T14:30:00.000Z",
    },
  ],
  templates: requiredDocumentTypes.map((documentType) => ({
    ...documentType,
    databaseId: documentType.id,
    templateDescription: `Template for ${documentType.name}.`,
    templateActive: true,
    templateFileName: "",
    templateFileUrl: "",
    templateFileType: "",
    templateUploadedAt: "",
  })),
  ypopEntries: [
    {
      id: "ypop-demo-001",
      organizationId: "org-demo-001",
      submittedBy: "user-demo-001",
      semester: "2025-S2",
      semesterLabel: "2025 Second Semester",
      pointsEarned: 72,
      pointsRequired: 70,
      totalPoints: 100,
      status: "qualified" as YPOPStatus,
      adminRemarks: "Good participation record across all LYDO activities this semester.",
      submissionNote: "We have participated in 6 out of 8 LYDO activities this semester and ran 6 org-led projects.",
      validationDeadline: "2025-12-05T00:00:00.000Z",
      submittedAt: "2025-11-28T09:00:00.000Z",
      validatedAt: "2025-12-10T10:00:00.000Z",
      revisionHistory: [
        { action: "submitted", adminRemarks: "", changedAt: "2025-11-28T09:00:00.000Z" },
        { action: "qualified", adminRemarks: "Good participation record across all LYDO activities this semester.", changedAt: "2025-12-10T10:00:00.000Z" },
      ],
      orgLedProjectCount: 6,
      cityLedAttendance: [
        { activityId: "ypop-act-001", attended: true },
        { activityId: "ypop-act-002", attended: true },
        { activityId: "ypop-act-003", attended: false },
        { activityId: "ypop-act-004", attended: true },
        { activityId: "ypop-act-005", attended: true },
        { activityId: "ypop-act-006", attended: true },
        { activityId: "ypop-act-007", attended: false },
        { activityId: "ypop-act-008", attended: true },
      ],
      createdAt: "2025-11-01T08:00:00.000Z",
      updatedAt: "2025-12-10T10:00:00.000Z",
    },
    {
      id: "ypop-demo-002",
      organizationId: "org-demo-001",
      submittedBy: "user-demo-001",
      semester: "2026-S1",
      semesterLabel: "2026 First Semester",
      pointsEarned: 0,
      pointsRequired: 70,
      totalPoints: 100,
      status: "draft" as YPOPStatus,
      adminRemarks: "",
      submissionNote: "",
      validationDeadline: "2026-06-30T00:00:00.000Z",
      submittedAt: "",
      validatedAt: "",
      revisionHistory: [],
      createdAt: "2026-05-01T08:00:00.000Z",
      updatedAt: "2026-05-01T08:00:00.000Z",
    },
  ],
  ypopFiles: [
    {
      id: "ypop-file-001",
      ypopEntryId: "ypop-demo-001",
      organizationId: "org-demo-001",
      fileName: "sjya-activity-attendance-s2-2025.pdf",
      fileUrl: "",
      fileType: "application/pdf",
      uploadedAt: "2025-11-28T08:30:00.000Z",
    },
    {
      id: "ypop-file-002",
      ypopEntryId: "ypop-demo-001",
      organizationId: "org-demo-001",
      fileName: "sjya-certificates-participation-s2-2025.pdf",
      fileUrl: "",
      fileType: "application/pdf",
      uploadedAt: "2025-11-28T08:35:00.000Z",
    },
    {
      id: "ypop-file-003",
      ypopEntryId: "ypop-demo-002",
      organizationId: "org-demo-001",
      fileName: "sjya-activity-records-q1-2026.pdf",
      fileUrl: "",
      fileType: "application/pdf",
      uploadedAt: "2026-06-03T10:45:00.000Z",
    },
  ],
  ypopEventParticipations: [
    {
      id: "ypop-participation-001",
      organizationId: "org-demo-001",
      activityId: "ypop-act-005",
      activityName: "Digital Power-Up! Mastering Skills for a Career-Ready Future",
      activityDate: "October 26, 2025",
      venue: "Google Meet",
      status: "verified" as YPOPEventParticipationStatus,
      adminRemarks: "Attendance and post-event proof matched the submitted participant list.",
      joinedAt: "2025-10-20T08:00:00.000Z",
      proofSubmittedAt: "2025-10-27T09:30:00.000Z",
      verifiedAt: "2025-10-29T14:20:00.000Z",
      revisionHistory: [
        { action: "pending_verification", adminRemarks: "Organization joined the YPOP event.", changedAt: "2025-10-20T08:00:00.000Z" },
        { action: "verified", adminRemarks: "Attendance and post-event proof matched the submitted participant list.", changedAt: "2025-10-29T14:20:00.000Z" },
      ],
      createdAt: "2025-10-20T08:00:00.000Z",
      updatedAt: "2025-10-29T14:20:00.000Z",
    },
    {
      id: "ypop-participation-002",
      organizationId: "org-demo-001",
      activityId: "ypop-act-006",
      activityName: "Cyber Youth Empowerment Orientation",
      activityDate: "October 29, 2025",
      venue: "Astoria Plaza",
      status: "needs_revision" as YPOPEventParticipationStatus,
      adminRemarks: "Please re-upload clearer photo documentation and include the narrative report.",
      joinedAt: "2025-10-22T08:00:00.000Z",
      proofSubmittedAt: "2025-10-30T11:00:00.000Z",
      verifiedAt: "",
      revisionHistory: [
        { action: "pending_verification", adminRemarks: "Organization joined the YPOP event.", changedAt: "2025-10-22T08:00:00.000Z" },
        { action: "needs_revision", adminRemarks: "Please re-upload clearer photo documentation and include the narrative report.", changedAt: "2025-10-31T15:00:00.000Z" },
      ],
      createdAt: "2025-10-22T08:00:00.000Z",
      updatedAt: "2025-10-31T15:00:00.000Z",
    },
    {
      id: "ypop-participation-003",
      organizationId: "org-demo-001",
      activityId: "ypop-act-008",
      activityName: "PLP Youth Summit 2025",
      activityDate: "November 25, 2025",
      venue: "PLP Auditorium",
      status: "pending_verification" as YPOPEventParticipationStatus,
      adminRemarks: "",
      joinedAt: "2025-11-10T09:00:00.000Z",
      proofSubmittedAt: "",
      verifiedAt: "",
      revisionHistory: [
        { action: "pending_verification", adminRemarks: "Organization joined the YPOP event.", changedAt: "2025-11-10T09:00:00.000Z" },
      ],
      createdAt: "2025-11-10T09:00:00.000Z",
      updatedAt: "2025-11-10T09:00:00.000Z",
    },
  ],
  ypopEventFiles: [
    {
      id: "ypop-event-file-001",
      participationId: "ypop-participation-001",
      organizationId: "org-demo-001",
      fileName: "sjya-digital-power-up-photo-docs.pdf",
      fileUrl: "",
      fileType: "application/pdf",
      uploadedAt: "2025-10-27T09:10:00.000Z",
    },
    {
      id: "ypop-event-file-002",
      participationId: "ypop-participation-001",
      organizationId: "org-demo-001",
      fileName: "sjya-digital-power-up-narrative-report.pdf",
      fileUrl: "",
      fileType: "application/pdf",
      uploadedAt: "2025-10-27T09:15:00.000Z",
    },
    {
      id: "ypop-event-file-003",
      participationId: "ypop-participation-002",
      organizationId: "org-demo-001",
      fileName: "sjya-cyber-youth-photo-docs.pdf",
      fileUrl: "",
      fileType: "application/pdf",
      uploadedAt: "2025-10-30T10:55:00.000Z",
    },
  ],
  ypopOrgActivities: [],
  ypopOrgActivityFiles: [],
  ypopCityActivities: [
    { id: "ypop-act-001", semesterKey: "2025-S2", name: "Seminar on Responsible Parenthood and Reproductive Health", date: "August 5, 2025", venue: "Tanghalang Pasigueño", category: "invitational", points: 3, createdAt: "2025-08-01T00:00:00.000Z" },
    { id: "ypop-act-002", semesterKey: "2025-S2", name: "SEATED! Youth Participation in Local Governance", date: "August 23, 2025", venue: "Zoom", category: "partnership", points: 2, createdAt: "2025-08-01T00:00:00.000Z" },
    { id: "ypop-act-003", semesterKey: "2025-S2", name: "Jobstart Philippines Program", date: "August 26–27, 2025", venue: "PESO", category: "partnership", points: 2, createdAt: "2025-08-01T00:00:00.000Z" },
    { id: "ypop-act-004", semesterKey: "2025-S2", name: "Youthnified: Youth for Inclusive and Gender-Fair Community (Gender Sensitivity Training)", date: "October 3–5, 2025", venue: "Laurel, Batangas", category: "invitational", points: 3, createdAt: "2025-08-01T00:00:00.000Z" },
    { id: "ypop-act-005", semesterKey: "2025-S2", name: "Digital Power-Up! Mastering Skills for a Career-Ready Future", date: "October 26, 2025", venue: "Google Meet", category: "partnership", points: 2, createdAt: "2025-08-01T00:00:00.000Z" },
    { id: "ypop-act-006", semesterKey: "2025-S2", name: "Cyber Youth Empowerment Orientation", date: "October 29, 2025", venue: "Astoria Plaza", category: "invitational", points: 3, createdAt: "2025-08-01T00:00:00.000Z" },
    { id: "ypop-act-007", semesterKey: "2025-S2", name: "Galing Kabataan Awards Application", date: "November 15, 2025", venue: "Temporary Pasig City Hall", category: "invitational", points: 3, createdAt: "2025-08-01T00:00:00.000Z" },
    { id: "ypop-act-008", semesterKey: "2025-S2", name: "PLP Youth Summit 2025", date: "November 25, 2025", venue: "PLP Auditorium", category: "invitational", points: 3, createdAt: "2025-08-01T00:00:00.000Z" },
  ],
  ypopPeriods: [
    {
      id: "ypop-period-001",
      semesterKey: "2025-S2",
      semesterLabel: "2025 Second Semester",
      validationDeadline: "2025-12-05T00:00:00.000Z",
      status: "closed" as YPOPPeriodStatus,
      createdAt: "2025-08-01T00:00:00.000Z",
      updatedAt: "2025-12-10T00:00:00.000Z",
    },
    {
      id: "ypop-period-002",
      semesterKey: "2026-S1",
      semesterLabel: "2026 First Semester",
      validationDeadline: "2026-06-30T00:00:00.000Z",
      status: "open" as YPOPPeriodStatus,
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    },
  ],
  moveApplications: [],
  moveFiles: [],
  inquiries: [],
};

export const statusToneMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  incomplete: "destructive",
  pending_review: "secondary",
  verified: "default",
  needs_update: "outline",
  suspended_inactive: "destructive",
  not_started: "outline",
  draft: "secondary",
  uploaded: "secondary",
  ocr_processing: "outline",
  ready_for_review: "secondary",
  submitted: "secondary",
  under_admin_review: "outline",
  needs_revision: "destructive",
  approved_green: "default",
  rejected_red: "destructive",
  under_review: "outline",
  approved_for_ftf_green: "default",
  hard_copy_submitted: "secondary",
  budget_released: "default",
  completed: "default",
  pending_activity_completion: "secondary",
  completed_liquidated: "default",
  overdue: "destructive",
  published: "default",
  hidden: "outline",
  qualified: "default",
  not_qualified: "destructive",
  pending_verification: "secondary",
  approved: "default",
  rejected: "destructive",
  reviewed: "default",
  closed: "outline",
};

export const statusLabelMap: Record<string, string> = {
  incomplete: "Incomplete Profile",
  pending_review: "Pending Review",
  verified: "Verified",
  needs_update: "Needs Update",
  suspended_inactive: "Suspended/Inactive",
  not_started: "Not Started",
  draft: "Draft",
  uploaded: "Uploaded",
  ocr_processing: "OCR Processing",
  ready_for_review: "Ready for Review",
  submitted: "Submitted",
  under_admin_review: "Under Admin Review",
  needs_revision: "Needs Revision",
  approved_green: "Approved",
  rejected_red: "Rejected",
  under_review: "Under Review",
  approved_for_ftf_green: "Submit Onsite",
  hard_copy_submitted: "Hardcopy Submitted",
  budget_released: "Budget Released",
  completed: "Completed",
  pending_activity_completion: "Pending Activity Completion",
  completed_liquidated: "Liquidated",
  overdue: "Overdue",
  published: "Published",
  hidden: "Hidden",
  draft_visibility: "Draft",
  qualified: "Qualified",
  not_qualified: "Not Qualified",
  pending_verification: "Pending Verification",
  approved: "Approved",
  rejected: "Rejected",
  reviewed: "Reviewed",
  closed: "Closed",
};

export const complianceSummaryHighlights = [
  "Profile completion",
  "Document submission progress",
  "Budget request status",
  "Liquidation deadlines",
  "Admin remarks and consequences",
];
