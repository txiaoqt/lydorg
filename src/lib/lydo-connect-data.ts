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
  organizationProfiles: [
    {
      id: "org-demo-001",
      userId: "user-demo-001",
      organizationName: "San Jose Youth Alliance",
      organizationEmail: "sjya@example.com",
      contactNumber: "09171234567",
      district: "District 1",
      barangay: "San Jose",
      isExistingOrganization: true,
      organizationIdentifierNumber: "SJ-YO-2024-001",
      majorClassification: "Youth Organization",
      subClassification: "community-based",
      advocacies: ["education", "health", "active citizenship"],
      adviserName: "Ms. Grace Tan",
      representativeName: "Juan dela Cruz",
      address: "123 Rizal St., San Jose, Pasig City",
      facebookPageUrl: "https://facebook.com/sjya",
      profileStatus: "verified",
      verifiedAt: "2026-03-15T08:00:00.000Z",
      internalNotes: "Verified during Q1 2026 registration drive.",
      createdAt: "2026-02-01T09:00:00.000Z",
      updatedAt: "2026-03-15T08:00:00.000Z",
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
  documentSubmissionFiles: [],
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
    },
  ],
  liquidationReportFiles: [],
  newsReleases: [
    {
      id: "news-demo-001",
      title: "LYDO Launches 2026 Youth Organization Registration Drive",
      description: "The Local Youth Development Office officially opens the 2026 registration season for all youth organizations in Pasig City. Organizations are encouraged to submit their documents early.",
      facebookPostUrl: "https://facebook.com/lydo",
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
      datePosted: "2026-03-10",
      visibilityStatus: "published",
      createdBy: "admin-demo",
      createdAt: "2026-03-10T09:00:00.000Z",
      updatedAt: "2026-03-10T09:00:00.000Z",
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
