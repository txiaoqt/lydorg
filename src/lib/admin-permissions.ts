export type AdminPermissionItem = {
  code: string;
  label: string;
  description: string;
};

export type AdminPermissionGroup = {
  code: string;
  label: string;
  items: AdminPermissionItem[];
};

export const ADMIN_PERMISSION_GROUPS: AdminPermissionGroup[] = [
  {
    code: "organizations",
    label: "ORGANIZATIONS",
    items: [
      {
        code: "registrations_management",
        label: "Registrations Management",
        description: "Review and process incoming YORP accreditation submissions.",
      },
      {
        code: "yorp_registry_view",
        label: "YORP Registry View",
        description: "View organizations that have completed YORP accreditation.",
      },
    ],
  },
  {
    code: "programs",
    label: "PROGRAMS",
    items: [
      {
        code: "ypop_validation_review",
        label: "YPOP Validation & Review",
        description: "Review YPOP submissions and evaluate grant eligibility.",
      },
    ],
  },
  {
    code: "budget_management",
    label: "BUDGET MANAGEMENT",
    items: [
      {
        code: "budget_requests_review",
        label: "Budget Requests Review",
        description: "Review funding requests submitted for YPOP-approved projects.",
      },
      {
        code: "liquidation_reports_review",
        label: "Liquidation Reports Review",
        description: "Review financial accountability documents submitted for released funds.",
      },
      {
        code: "budget_monitoring_view",
        label: "Budget Monitoring View",
        description: "Track the budget lifecycle from request through release and liquidation.",
      },
    ],
  },
  {
    code: "content",
    label: "CONTENT",
    items: [
      {
        code: "news_releases_management",
        label: "News Releases Management",
        description: "Manage announcements published to the Organization Portal.",
      },
      {
        code: "forms_templates_management",
        label: "Forms & Templates Management",
        description: "Manage downloadable forms and templates published to the Organization Portal.",
      },
    ],
  },
  {
    code: "communication",
    label: "COMMUNICATION",
    items: [
      {
        code: "inquiries_management",
        label: "Inquiries Management",
        description: "Manage questions and inquiries submitted by organization users.",
      },
    ],
  },
  {
    code: "administration",
    label: "ADMINISTRATION",
    items: [
      {
        code: "administrators_management",
        label: "Administrators Management",
        description: "Manage administrator accounts, roles, and permissions.",
      },
      {
        code: "activity_logs_view",
        label: "Activity Logs View",
        description: "Review the system-wide history of administrative actions.",
      },
    ],
  },
];

export const ADMIN_PERMISSION_TOTAL_COUNT = ADMIN_PERMISSION_GROUPS.reduce(
  (total, group) => total + group.items.length,
  0,
);

// Maps admin portal sidebar nav item ids (AdminPortal.tsx's sidebarGroups) to
// the permission code required to see/access that section. Items absent from
// this map (e.g. "overview") require no permission and are always visible.
export const ADMIN_NAV_PERMISSION_MAP: Record<string, string> = {
  registrations: "registrations_management",
  "yorp-registry": "yorp_registry_view",
  "ypop-validation": "ypop_validation_review",
  "budget-utilization": "budget_requests_review",
  "liquidation-monitoring": "liquidation_reports_review",
  "budget-monitoring": "budget_monitoring_view",
  "news-releases": "news_releases_management",
  templates: "forms_templates_management",
  inquiries: "inquiries_management",
  administrators: "administrators_management",
  "activity-logs": "activity_logs_view",
};

export const hasAdminNavPermission = (permissionCodes: string[] | undefined, navItemId: string): boolean => {
  const requiredCode = ADMIN_NAV_PERMISSION_MAP[navItemId];
  if (!requiredCode) return true;
  return (permissionCodes ?? []).includes(requiredCode);
};
