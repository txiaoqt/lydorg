import { BarChart3, Bell, CalendarDays, ClipboardList, FileCheck2, FileText, Megaphone, Sparkles, Users } from "lucide-react";
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

export type RequiredDocumentType = {
  id: string;
  name: string;
  description: string;
  templateUrl: string;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
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
  },
  {
    id: "yorp-form-b",
    name: "2026 NYC YORP Registration Form (Form B)",
    description: "Use the current Form B template for the organization registration packet.",
    templateUrl: "#form-b-template",
    sortOrder: 2,
    isRequired: true,
    isActive: true,
  },
  {
    id: "yorp-officers-adviser",
    name: "2026 YORP Directory of Officers and Adviser",
    description: "List all officers and the organization adviser.",
    templateUrl: "#officers-adviser-template",
    sortOrder: 3,
    isRequired: true,
    isActive: true,
  },
  {
    id: "yorp-members",
    name: "2026 YORP List of Members in Good Standing",
    description: "Upload the current membership list in good standing.",
    templateUrl: "#members-template",
    sortOrder: 4,
    isRequired: true,
    isActive: true,
  },
  {
    id: "pcydo-form-a",
    name: "Pasig City YORP Registration Form (Form A)",
    description: "Official Pasig City Form A requirement.",
    templateUrl: "#form-a-template",
    sortOrder: 5,
    isRequired: true,
    isActive: true,
  },
  {
    id: "pcydo-data-request",
    name: "PCYDO YORP Data Request Form",
    description: "Current PCYDO data request form for the organization.",
    templateUrl: "#data-request-template",
    sortOrder: 6,
    isRequired: true,
    isActive: true,
  },
];

export const userNavigationGroups: PortalNavGroup[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    items: [
      { id: "dashboard", label: "Dashboard", icon: Sparkles },
      { id: "organization-profile", label: "Organization Profile", icon: Users },
    ],
  },
  {
    id: "compliance-workflow",
    label: "Compliance Workflow",
    items: [
      { id: "document-submission", label: "Document Submission", icon: FileText },
      { id: "budget-request", label: "Budget Request", icon: ClipboardList },
      { id: "liquidation-reporting", label: "Liquidation and Reporting", icon: CalendarDays },
    ],
  },
  {
    id: "updates",
    label: "Updates",
    items: [
      { id: "news-releases", label: "News Releases", icon: Megaphone },
      { id: "notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    id: "status",
    label: "Status",
    items: [{ id: "compliance-status", label: "Compliance Status", icon: FileCheck2 }],
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
};

export const adminNavigationGroups: PortalNavGroup[] = [
  {
    id: "monitoring",
    label: "Monitoring",
    items: [
      { id: "overview", label: "Overview", icon: Sparkles },
      { id: "registrations", label: "Registrations", icon: Users },
      { id: "users", label: "Users", icon: Users },
    ],
  },
  {
    id: "review",
    label: "Review",
    items: [
      { id: "budget-utilization", label: "Budget Utilization", icon: ClipboardList },
      { id: "liquidation-monitoring", label: "Liquidation Monitoring", icon: CalendarDays },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { id: "news-releases", label: "News Releases", icon: Megaphone },
      { id: "budget-monitoring", label: "Budget Monitoring", icon: BarChart3 },
      { id: "templates", label: "Templates", icon: FileText },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [{ id: "notifications-activity", label: "Notifications / Activity Logs", icon: Bell }],
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
  goSignalAt: string;
  hardCopySubmittedAt: string;
  createdAt: string;
  updatedAt: string;
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
};

export type NewsRelease = {
  id: string;
  title: string;
  description: string;
  facebookPostUrl: string;
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
  templates: TemplateRecord[];
};

const nowIso = new Date().toISOString();

export const seedState: LydoSeedState = {
  organizationProfiles: [],
  documentSubmissions: [],
  documentSubmissionFiles: [],
  budgetRequests: [],
  budgetRequestFiles: [],
  liquidationReports: [],
  liquidationReportFiles: [],
  newsReleases: [],
  transparencyPosts: [],
  complianceRemarks: [],
  notifications: [],
  activityLogs: [],
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
  approved_for_ftf_green: "Approved for FTF Submission",
  hard_copy_submitted: "Hard Copy Submitted",
  budget_released: "Budget Released",
  completed: "Completed",
  pending_activity_completion: "Pending Activity Completion",
  completed_liquidated: "Completed / Liquidated",
  overdue: "Overdue",
  published: "Published",
  hidden: "Hidden",
  draft_visibility: "Draft",
};

export const complianceSummaryHighlights = [
  "Profile completion",
  "Document submission progress",
  "Budget request status",
  "Liquidation deadlines",
  "Admin remarks and consequences",
];
