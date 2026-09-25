import { readAdminSession } from "./admin-auth";
import { supabase } from "./supabase";

export type AdminSystemSettingCategory =
  | "general"
  | "notifications"
  | "workflow"
  | "programs"
  | "budget_finance"
  | "security"
  | "email"
  | "audit_records";

export type AdminSystemSettingDataType = "string" | "number" | "boolean" | "json" | "array";

export type AdminSystemSettingKey =
  // General
  | "general.system_name"
  | "general.office_name"
  | "general.office_acronym"
  | "general.support_email"
  | "general.contact_number"
  | "general.office_address"
  | "general.user_portal_url"
  | "general.admin_portal_url"
  // Notifications
  | "notifications.new_registration.in_app"
  | "notifications.new_registration.email"
  | "notifications.renewal_submitted.in_app"
  | "notifications.renewal_submitted.email"
  | "notifications.ypop_submission.in_app"
  | "notifications.ypop_submission.email"
  | "notifications.budget_request.in_app"
  | "notifications.budget_request.email"
  | "notifications.liquidation_report.in_app"
  | "notifications.liquidation_report.email"
  | "notifications.new_inquiry.in_app"
  | "notifications.new_inquiry.email"
  | "notifications.revision_resubmission.in_app"
  | "notifications.revision_resubmission.email"
  | "notifications.overdue_liquidation.in_app"
  | "notifications.overdue_liquidation.email"
  | "notifications.accreditation_expiring.in_app"
  | "notifications.accreditation_expiring.email"
  | "notifications.daily_digest_enabled"
  | "notifications.daily_digest_time"
  // Workflow
  | "workflow.review_reminder_enabled"
  | "workflow.review_reminder_days"
  | "workflow.escalate_after_days"
  | "workflow.overdue_indicators_enabled"
  | "workflow.notify_org_on_needs_revision"
  | "workflow.notify_org_on_approved"
  | "workflow.notify_org_on_rejected"
  | "workflow.notify_org_on_resubmitted"
  // Programs
  | "programs.ypop_default_reminder_days"
  | "programs.ypop_deadline_reminders_enabled"
  | "programs.ypop_auto_close_on_deadline"
  // Budget & Finance
  | "budget.default_fiscal_year"
  | "budget.currency"
  | "budget.currency_symbol"
  | "budget.budget_deadline_reminders"
  | "budget.liquidation_overdue_reminders"
  // Security
  | "security.admin_session_timeout_minutes"
  | "security.reauth_delete_administrator"
  | "security.reauth_delete_inquiry"
  | "security.reauth_delete_organization"
  | "security.reauth_modify_role_permissions"
  | "security.reauth_modify_system_settings"
  | "security.require_verified_admin_email"
  | "security.allow_admin_password_reset"
  // Email
  | "email.sender_name"
  | "email.reply_to_email"
  | "email.send_invitation_emails"
  | "email.send_workflow_emails"
  // Audit & Records
  | "audit.log_admin_login"
  | "audit.log_admin_logout"
  | "audit.log_record_creation"
  | "audit.log_record_updates"
  | "audit.log_approvals_rejections"
  | "audit.log_deletions"
  | "audit.log_permission_changes"
  | "audit.log_config_changes"
  | "audit.include_ip_metadata"
  | "audit.include_user_agent";

export type AdminSystemSettingRecord = {
  id?: string;
  settingKey: AdminSystemSettingKey | string;
  category: AdminSystemSettingCategory;
  value: unknown; // typed in registry
  dataType: AdminSystemSettingDataType;
  description?: string;
  isSensitive: boolean;
  isEditable: boolean;
  updatedBy?: string | null;
  updatedAt?: string;
};

export type AdminSystemSettingDefinition = {
  key: AdminSystemSettingKey;
  category: AdminSystemSettingCategory;
  label: string;
  description: string;
  dataType: AdminSystemSettingDataType;
  defaultValue: unknown;
  isSensitive?: boolean;
  isEditable?: boolean;
  options?: Array<{ label: string; value: unknown }>;
  helperText?: string;
  badge?: string;
};

export const ADMIN_SETTING_CATEGORIES: Array<{
  id: AdminSystemSettingCategory;
  label: string;
  description: string;
}> = [
  {
    id: "general",
    label: "General",
    description: "System identity, department metadata, and canonical portal endpoints.",
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "In-app and email alert routing for administrative events and daily digest.",
  },
  {
    id: "workflow",
    label: "Workflow",
    description: "Review reminder intervals, escalation thresholds, and organization status notices.",
  },
  {
    id: "programs",
    label: "Programs",
    description: "YPOP validation period defaults, automated reminders, and submission lifecycle.",
  },
  {
    id: "budget_finance",
    label: "Budget & Finance",
    description: "Default fiscal year, currency display settings, and budget monitoring parameters.",
  },
  {
    id: "security",
    label: "Security",
    description: "Session inactivity timeouts, re-authentication guards, and credential policies.",
  },
  {
    id: "email",
    label: "Email",
    description: "Application sender identity, reply-to routing, and automated email delivery.",
  },
  {
    id: "audit_records",
    label: "Audit & Records",
    description: "Audit trail logging preferences, administrative action capture, and metadata options.",
  },
];

export const ADMIN_SYSTEM_SETTING_DEFINITIONS: AdminSystemSettingDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. GENERAL
  // ─────────────────────────────────────────────────────────────────────────────
  {
    key: "general.system_name",
    category: "general",
    label: "System Name",
    description: "Primary system title displayed across portal headers, breadcrumbs, and exported notices.",
    dataType: "string",
    defaultValue: "Y-TRACE",
    helperText: "e.g. Y-TRACE",
  },
  {
    key: "general.office_name",
    category: "general",
    label: "Office Name",
    description: "Official local government office or department administering youth organization programs.",
    dataType: "string",
    defaultValue: "Pasig City Local Youth Development Office",
    helperText: "e.g. Pasig City Local Youth Development Office",
  },
  {
    key: "general.office_acronym",
    category: "general",
    label: "Office Acronym",
    description: "Official abbreviated acronyms shown in chips, badges, and document headers.",
    dataType: "string",
    defaultValue: "PCYDO / LYDO",
    helperText: "e.g. PCYDO / LYDO",
  },
  {
    key: "general.support_email",
    category: "general",
    label: "Official Support Email",
    description: "Public contact address displayed for organization inquiries and technical support.",
    dataType: "string",
    defaultValue: "support@lydo.pasig.gov.ph",
    helperText: "e.g. support@lydo.pasig.gov.ph",
  },
  {
    key: "general.contact_number",
    category: "general",
    label: "Official Contact Number",
    description: "Landline or mobile contact number for administrative communications and inquiries.",
    dataType: "string",
    defaultValue: "(02) 8643-1111",
    helperText: "e.g. (02) 8643-1111",
  },
  {
    key: "general.office_address",
    category: "general",
    label: "Office Address",
    description: "Physical location for on-site document submission and official appointments.",
    dataType: "string",
    defaultValue: "Pasig City Hall Complex, Caruncho Ave, Pasig, Metro Manila",
    helperText: "e.g. Pasig City Hall Complex, Caruncho Ave, Pasig, Metro Manila",
  },
  {
    key: "general.user_portal_url",
    category: "general",
    label: "Youth Organization Portal URL",
    description: "Canonical public website and portal address for youth organizations.",
    dataType: "string",
    defaultValue: "https://ytrace.app",
    helperText: "e.g. https://ytrace.app",
  },
  {
    key: "general.admin_portal_url",
    category: "general",
    label: "Admin Portal URL",
    description: "Canonical URL for the administrative management portal.",
    dataType: "string",
    defaultValue: "https://y-trace-admin.vercel.app",
    helperText: "e.g. https://y-trace-admin.vercel.app",
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    key: "notifications.new_registration.in_app",
    category: "notifications",
    label: "New Registration (In-App)",
    description: "Generate in-app notification when a new YORP accreditation application is submitted.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.new_registration.email",
    category: "notifications",
    label: "New Registration (Email)",
    description: "Dispatch administrative email alert on incoming YORP accreditation submissions.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.renewal_submitted.in_app",
    category: "notifications",
    label: "Renewal Packet (In-App)",
    description: "Generate in-app notification when an organization submits an accreditation renewal packet.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.renewal_submitted.email",
    category: "notifications",
    label: "Renewal Packet (Email)",
    description: "Dispatch email alert when an organization submits an accreditation renewal packet.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.ypop_submission.in_app",
    category: "notifications",
    label: "YPOP Validation Submission (In-App)",
    description: "Generate in-app notification on new YPOP event validations and activity submissions.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.ypop_submission.email",
    category: "notifications",
    label: "YPOP Validation Submission (Email)",
    description: "Dispatch email alert on new YPOP event validations and activity submissions.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.budget_request.in_app",
    category: "notifications",
    label: "Budget Request (In-App)",
    description: "Generate in-app notification when an organization submits a project funding request.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.budget_request.email",
    category: "notifications",
    label: "Budget Request (Email)",
    description: "Dispatch email alert when an organization submits a project funding request.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.liquidation_report.in_app",
    category: "notifications",
    label: "Liquidation Report (In-App)",
    description: "Generate in-app notification when an organization submits a financial liquidation report.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.liquidation_report.email",
    category: "notifications",
    label: "Liquidation Report (Email)",
    description: "Dispatch email alert when an organization submits a financial liquidation report.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.new_inquiry.in_app",
    category: "notifications",
    label: "New Inquiry (In-App)",
    description: "Generate in-app notification upon receipt of a new public or organization inquiry.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.new_inquiry.email",
    category: "notifications",
    label: "New Inquiry (Email)",
    description: "Dispatch email alert upon receipt of a new public or organization inquiry.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.revision_resubmission.in_app",
    category: "notifications",
    label: "Revision Resubmission (In-App)",
    description: "Notify administrators when an organization resubmits previously returned documents.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.revision_resubmission.email",
    category: "notifications",
    label: "Revision Resubmission (Email)",
    description: "Send email notice when an organization resubmits previously returned documents.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.overdue_liquidation.in_app",
    category: "notifications",
    label: "Overdue Liquidation (In-App)",
    description: "Generate in-app warning when a funded project exceeds its liquidation deadline.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.overdue_liquidation.email",
    category: "notifications",
    label: "Overdue Liquidation (Email)",
    description: "Dispatch email warning when a funded project exceeds its liquidation deadline.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.accreditation_expiring.in_app",
    category: "notifications",
    label: "Accreditation Expiring (In-App)",
    description: "Generate in-app alert when recognized organizations enter their renewal window.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.accreditation_expiring.email",
    category: "notifications",
    label: "Accreditation Expiring (Email)",
    description: "Dispatch email alert when recognized organizations enter their renewal window.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.daily_digest_enabled",
    category: "notifications",
    label: "Daily Administrative Digest",
    description: "Consolidate open pending reviews, overdue items, and inquiries into a daily morning summary email.",
    dataType: "boolean",
    defaultValue: false,
  },
  {
    key: "notifications.daily_digest_time",
    category: "notifications",
    label: "Daily Digest Schedule Time",
    description: "Target hour (Asia/Manila) for generating and emailing the daily administrative digest.",
    dataType: "string",
    defaultValue: "08:00",
    options: [
      { label: "07:00 AM (PHT)", value: "07:00" },
      { label: "08:00 AM (PHT)", value: "08:00" },
      { label: "09:00 AM (PHT)", value: "09:00" },
      { label: "05:00 PM (PHT)", value: "17:00" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. WORKFLOW
  // ─────────────────────────────────────────────────────────────────────────────
  {
    key: "workflow.review_reminder_enabled",
    category: "workflow",
    label: "Enable Review Reminders",
    description: "Automatically flag document review items that have remained in pending queue.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "workflow.review_reminder_days",
    category: "workflow",
    label: "Review Reminder Threshold (Days)",
    description: "Number of calendar days after submission before a pending review item shows a reminder flag.",
    dataType: "number",
    defaultValue: 3,
    helperText: "e.g. 3 days",
  },
  {
    key: "workflow.escalate_after_days",
    category: "workflow",
    label: "Escalation Threshold (Days)",
    description: "Number of days before unreviewed submissions escalate to urgent attention status.",
    dataType: "number",
    defaultValue: 7,
    helperText: "e.g. 7 days",
  },
  {
    key: "workflow.overdue_indicators_enabled",
    category: "workflow",
    label: "Show Overdue Badges",
    description: "Display prominent visual overdue chips on document review lists and dashboard metrics.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "workflow.notify_org_on_needs_revision",
    category: "workflow",
    label: "Notify Organization on Needs Revision",
    description: "Dispatch immediate notification to organization when reviewer requests corrections.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "workflow.notify_org_on_approved",
    category: "workflow",
    label: "Notify Organization on Approval",
    description: "Send confirmation notice and accreditation updates when reviews are approved.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "workflow.notify_org_on_rejected",
    category: "workflow",
    label: "Notify Organization on Rejection",
    description: "Send official notification with administrative remarks when submissions are rejected.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "workflow.notify_org_on_resubmitted",
    category: "workflow",
    label: "Acknowledge Receipt on Resubmission",
    description: "Send automatic receipt confirmation to organization upon uploading revised requirements.",
    dataType: "boolean",
    defaultValue: true,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. PROGRAMS (YPOP)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    key: "programs.ypop_default_reminder_days",
    category: "programs",
    label: "YPOP Reminder Lead Time (Days)",
    description: "Lead time before validation deadline to send automated participation reminders.",
    dataType: "number",
    defaultValue: 5,
    helperText: "e.g. 5 days prior to deadline",
  },
  {
    key: "programs.ypop_deadline_reminders_enabled",
    category: "programs",
    label: "YPOP Deadline Reminders",
    description: "Send automated countdown reminders to active youth organizations during validation periods.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "programs.ypop_auto_close_on_deadline",
    category: "programs",
    label: "Auto-Close Submissions on Deadline",
    description: "Automatically lock semester validation submission queue when the period deadline passes.",
    dataType: "boolean",
    defaultValue: false,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. BUDGET & FINANCE
  // ─────────────────────────────────────────────────────────────────────────────
  {
    key: "budget.default_fiscal_year",
    category: "budget_finance",
    label: "Default Fiscal Year",
    description: "Active fiscal year selected by default in budget tracking, exports, and allocation charts.",
    dataType: "number",
    defaultValue: 2026,
    options: [
      { label: "FY 2026", value: 2026 },
      { label: "FY 2025", value: 2025 },
      { label: "FY 2024", value: 2024 },
    ],
  },
  {
    key: "budget.currency",
    category: "budget_finance",
    label: "Currency Code",
    description: "ISO currency code used for budget accounting and financial reports.",
    dataType: "string",
    defaultValue: "PHP",
    isEditable: false,
    helperText: "Standard Philippine Peso (PHP)",
  },
  {
    key: "budget.currency_symbol",
    category: "budget_finance",
    label: "Currency Symbol",
    description: "Display symbol for monetary values across tables and cards.",
    dataType: "string",
    defaultValue: "₱",
    isEditable: false,
  },
  {
    key: "budget.budget_deadline_reminders",
    category: "budget_finance",
    label: "Budget Proposal Deadlines",
    description: "Enable reminders for upcoming budget request cycles and project evaluation windows.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "budget.liquidation_overdue_reminders",
    category: "budget_finance",
    label: "Liquidation Overdue Reminders",
    description: "Automate warnings to organizations with released funds approaching liquidation deadlines.",
    dataType: "boolean",
    defaultValue: true,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. SECURITY
  // ─────────────────────────────────────────────────────────────────────────────
  {
    key: "security.admin_session_timeout_minutes",
    category: "security",
    label: "Admin Session Inactivity Timeout",
    description: "Duration of administrator inactivity before the authentication session expires.",
    dataType: "number",
    defaultValue: 30,
    options: [
      { label: "15 minutes", value: 15 },
      { label: "30 minutes (Recommended)", value: 30 },
      { label: "60 minutes (1 hour)", value: 60 },
      { label: "120 minutes (2 hours)", value: 120 },
    ],
    helperText: "Affects newly authenticated administrator sessions.",
  },
  {
    key: "security.reauth_delete_administrator",
    category: "security",
    label: "Confirmation: Delete Administrator",
    description: "Require explicit confirmation before permanently removing an administrator account.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "security.reauth_delete_inquiry",
    category: "security",
    label: "Confirmation: Delete Inquiry",
    description: "Require explicit confirmation modal before permanently deleting inquiry threads.",
    dataType: "boolean",
    defaultValue: false,
  },
  {
    key: "security.reauth_delete_organization",
    category: "security",
    label: "Confirmation: Delete Organization Account",
    description: "Require exact typing of organization name before permanently erasing an accreditation account.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "security.reauth_modify_role_permissions",
    category: "security",
    label: "Confirmation: Modify Role Permissions",
    description: "Prompt for confirmation before applying permission code changes to administrative roles.",
    dataType: "boolean",
    defaultValue: false,
  },
  {
    key: "security.reauth_modify_system_settings",
    category: "security",
    label: "Confirmation: Modify System Settings",
    description: "Prompt for confirmation before saving changes to core system settings.",
    dataType: "boolean",
    defaultValue: false,
  },
  {
    key: "security.require_verified_admin_email",
    category: "security",
    label: "Require Verified Admin Email",
    description: "Enforce email address verification before granting access to administrator portal accounts.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "security.allow_admin_password_reset",
    category: "security",
    label: "Allow Admin Password Reset",
    description: "Allow administrators to request self-service password reset emails via official inbox.",
    dataType: "boolean",
    defaultValue: true,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. EMAIL
  // ─────────────────────────────────────────────────────────────────────────────
  {
    key: "email.sender_name",
    category: "email",
    label: "Sender Display Name",
    description: "Display name shown as the email sender on all automated system communications.",
    dataType: "string",
    defaultValue: "Pasig City LYDO",
    helperText: "e.g. Pasig City LYDO",
  },
  {
    key: "email.reply_to_email",
    category: "email",
    label: "Reply-To Address",
    description: "Incoming reply address for automated transactional emails.",
    dataType: "string",
    defaultValue: "support@lydo.pasig.gov.ph",
    helperText: "e.g. support@lydo.pasig.gov.ph",
  },
  {
    key: "email.send_invitation_emails",
    category: "email",
    label: "Send Administrator Invites",
    description: "Dispatch automated email invitations with secure setup links when creating new administrators.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "email.send_workflow_emails",
    category: "email",
    label: "Send Transactional Status Emails",
    description: "Dispatch transactional emails for approval, revision requests, and completion receipts.",
    dataType: "boolean",
    defaultValue: true,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. AUDIT & RECORDS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    key: "audit.log_admin_login",
    category: "audit_records",
    label: "Log Administrator Sign-Ins",
    description: "Record administrator authentication events in system activity history.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "audit.log_admin_logout",
    category: "audit_records",
    label: "Log Administrator Sign-Outs",
    description: "Record administrator sign-out events in activity logs.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "audit.log_record_creation",
    category: "audit_records",
    label: "Log Record Creation",
    description: "Record creation of new templates, news releases, activities, and accreditation records.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "audit.log_record_updates",
    category: "audit_records",
    label: "Log Record Updates",
    description: "Record modifications to existing templates, posts, and review states.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "audit.log_approvals_rejections",
    category: "audit_records",
    label: "Log Approvals & Decisions",
    description: "Record administrative approvals, revision requests, and rejections.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "audit.log_deletions",
    category: "audit_records",
    label: "Log Deletions",
    description: "Record deletion of templates, inquiries, activities, and organization accounts.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "audit.log_permission_changes",
    category: "audit_records",
    label: "Log Role Permission Changes",
    description: "Record updates to administrative role permission assignments.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "audit.log_config_changes",
    category: "audit_records",
    label: "Log System Settings Updates",
    description: "Record modifications made to system configuration settings in activity history.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "audit.include_ip_metadata",
    category: "audit_records",
    label: "Capture Client IP Metadata",
    description: "Record client IP address in audit log metadata when available.",
    dataType: "boolean",
    defaultValue: false,
  },
  {
    key: "audit.include_user_agent",
    category: "audit_records",
    label: "Capture User Agent Metadata",
    description: "Record browser user agent strings in audit logs for security diagnostics.",
    dataType: "boolean",
    defaultValue: true,
  },
];

export const ADMIN_SETTING_DEFINITIONS_BY_KEY = new Map<AdminSystemSettingKey, AdminSystemSettingDefinition>(
  ADMIN_SYSTEM_SETTING_DEFINITIONS.map((def) => [def.key, def]),
);

export const getDefaultSystemSettingsMap = (): AdminSystemSettingsValues => {
  const map: Record<string, unknown> = {};
  for (const def of ADMIN_SYSTEM_SETTING_DEFINITIONS) {
    map[def.key] = def.defaultValue;
  }
  return map as unknown as AdminSystemSettingsValues;
};

export const DEFAULT_SYSTEM_SETTINGS_VALUES: AdminSystemSettingsValues = getDefaultSystemSettingsMap();

// Validation Helper
export const validateSystemSettingValue = (
  key: string,
  value: unknown,
): { valid: boolean; error?: string } => {
  const def = ADMIN_SETTING_DEFINITIONS_BY_KEY.get(key as AdminSystemSettingKey);
  if (!def) return { valid: true };

  if (def.dataType === "boolean") {
    if (typeof value !== "boolean") return { valid: false, error: "Must be a true/false value" };
    return { valid: true };
  }

  if (def.dataType === "number") {
    const num = Number(value);
    if (Number.isNaN(num)) return { valid: false, error: "Must be a valid number" };
    if (key === "security.admin_session_timeout_minutes" && (num < 5 || num > 480)) {
      return { valid: false, error: "Session timeout must be between 5 and 480 minutes" };
    }
    if (key === "budget.default_fiscal_year" && (num < 2000 || num > 2100)) {
      return { valid: false, error: "Fiscal year must be between 2000 and 2100" };
    }
    if (num < 0) return { valid: false, error: "Value cannot be negative" };
    return { valid: true };
  }

  if (def.dataType === "string") {
    const str = String(value ?? "").trim();
    if (!str && def.defaultValue !== "") {
      return { valid: false, error: "This field cannot be empty" };
    }
    if (str.length > 100) {
      return { valid: false, error: "Exceeds maximum length of 100 characters" };
    }
    if (key.includes("email") || key === "general.support_email" || key === "email.reply_to_email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(str)) return { valid: false, error: "Must be a valid email address" };
    }
    if (key.includes("url") || key === "general.user_portal_url" || key === "general.admin_portal_url") {
      try {
        const url = new URL(str);
        if (!["http:", "https:"].includes(url.protocol)) {
          return { valid: false, error: "URL must begin with http:// or https://" };
        }
      } catch {
        return { valid: false, error: "URL must begin with http:// or https://" };
      }
    }
    return { valid: true };
  }

  return { valid: true };
};

export const ADMIN_SETTINGS_STORAGE_KEY = "lydo_admin_system_settings_cache_v1";
export const ADMIN_SETTINGS_CHANGE_EVENT = "lydo-admin-system-settings-changed";

// In-Memory & LocalStorage Cache
export const readCachedSystemSettings = (): AdminSystemSettingsValues => {
  const defaults = getDefaultSystemSettingsMap();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(ADMIN_SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
};

export const writeCachedSystemSettings = (settingsMap: Partial<AdminSystemSettingsValues> | Record<string, unknown>) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ADMIN_SETTINGS_STORAGE_KEY, JSON.stringify(settingsMap));
    window.dispatchEvent(new CustomEvent(ADMIN_SETTINGS_CHANGE_EVENT, { detail: settingsMap }));
  } catch {
    // Ignore storage quota errors
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RPC CLIENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const adminGetSystemSettingsFromSupabase = async (): Promise<AdminSystemSettingRecord[]> => {
  const adminSession = readAdminSession();
  if (!supabase || !adminSession) {
    // Fall back to defaults for local/demo mode
    const defaults = getDefaultSystemSettingsMap();
    return ADMIN_SYSTEM_SETTING_DEFINITIONS.map((def) => ({
      settingKey: def.key,
      category: def.category,
      value: defaults[def.key],
      dataType: def.dataType,
      description: def.description,
      isSensitive: Boolean(def.isSensitive),
      isEditable: def.isEditable ?? true,
      updatedAt: new Date().toISOString(),
    }));
  }

  const { data, error } = await supabase.rpc("admin_get_system_settings", {
    _session_token: adminSession.sessionToken,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data || !Array.isArray(data)) return [];

  const records: AdminSystemSettingRecord[] = data.map((row: Record<string, unknown>) => ({
    id: String(row.id || ""),
    settingKey: String(row.setting_key || ""),
    category: row.category as AdminSystemSettingCategory,
    value: row.value_json,
    dataType: row.data_type as AdminSystemSettingDataType,
    description: row.description ? String(row.description) : undefined,
    isSensitive: Boolean(row.is_sensitive),
    isEditable: Boolean(row.is_editable),
    updatedBy: row.updated_by ? String(row.updated_by) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  }));

  // Update cached state
  const map: Record<string, unknown> = {};
  records.forEach((r) => {
    map[r.settingKey] = r.value;
  });
  writeCachedSystemSettings(map);

  return records;
};

export const adminSaveSystemSettingsInSupabase = async (
  updates: Array<{ key: AdminSystemSettingKey | string; value: unknown }>,
): Promise<AdminSystemSettingRecord[]> => {
  // Preflight validate all updates
  for (const update of updates) {
    const check = validateSystemSettingValue(update.key, update.value);
    if (!check.valid) {
      throw new Error(`Validation failed for ${update.key}: ${check.error}`);
    }
  }

  const adminSession = readAdminSession();
  if (!supabase || !adminSession) {
    // Local / Demo fallback
    const current = readCachedSystemSettings();
    const draft = { ...current } as Record<string, unknown>;
    updates.forEach((u) => {
      draft[u.key] = u.value;
    });
    writeCachedSystemSettings(draft);
    return ADMIN_SYSTEM_SETTING_DEFINITIONS.map((def) => ({
      settingKey: def.key,
      category: def.category,
      value: draft[def.key] ?? def.defaultValue,
      dataType: def.dataType,
      description: def.description,
      isSensitive: Boolean(def.isSensitive),
      isEditable: def.isEditable ?? true,
      updatedAt: new Date().toISOString(),
    }));
  }

  const { data, error } = await supabase.rpc("admin_save_system_settings", {
    _session_token: adminSession.sessionToken,
    _settings: updates,
  });

  if (error) throw new Error(error.message);
  if (!data || !Array.isArray(data)) return [];

  const savedRecords: AdminSystemSettingRecord[] = data.map((row: Record<string, unknown>) => ({
    id: String(row.id || ""),
    settingKey: String(row.setting_key || ""),
    category: row.category as AdminSystemSettingCategory,
    value: row.value_json,
    dataType: row.data_type as AdminSystemSettingDataType,
    description: row.description ? String(row.description) : undefined,
    isSensitive: Boolean(row.is_sensitive),
    isEditable: Boolean(row.is_editable),
    updatedBy: row.updated_by ? String(row.updated_by) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  }));

  // Update cache
  const current = readCachedSystemSettings();
  const draft = { ...current } as Record<string, unknown>;
  savedRecords.forEach((r) => {
    draft[r.settingKey] = r.value;
  });
  writeCachedSystemSettings(draft);

  return savedRecords;
};

/**
 * Get effective system settings values (from cache or defaults)
 */
export const getEffectiveSystemSettings = (): AdminSystemSettingsValues => {
  const cached = readCachedSystemSettings();
  return {
    ...DEFAULT_SYSTEM_SETTINGS_VALUES,
    ...cached,
  };
};

/**
 * Get a single effective system setting value
 */
export const getEffectiveSystemSetting = <K extends AdminSystemSettingKey>(
  key: K,
): AdminSystemSettingsValues[K] => {
  const settings = getEffectiveSystemSettings();
  return settings[key];
};

/**
 * Determine if a given activity type should be logged based on active settings
 */
export const shouldLogActivityType = (
  action: string,
): boolean => {
  const settings = getEffectiveSystemSettings();
  const lower = action.toLowerCase();
  if (lower.includes("login") || lower.includes("sign_in")) {
    return Boolean(settings["audit.log_admin_login"]);
  }
  if (lower.includes("logout") || lower.includes("sign_out")) {
    return Boolean(settings["audit.log_admin_logout"]);
  }
  if (lower.includes("delete") || lower.includes("remove") || lower.includes("purge")) {
    return Boolean(settings["audit.log_deletions"]);
  }
  if (lower.includes("permission") || lower.includes("role")) {
    return Boolean(settings["audit.log_permission_changes"]);
  }
  if (lower.includes("setting") || lower.includes("config")) {
    return Boolean(settings["audit.log_config_changes"]);
  }
  if (lower.includes("approve") || lower.includes("reject") || lower.includes("decision") || lower.includes("review")) {
    return Boolean(settings["audit.log_approvals_rejections"]);
  }
  if (lower.includes("create") || lower.includes("add") || lower.includes("new")) {
    return Boolean(settings["audit.log_record_creation"]);
  }
  if (lower.includes("update") || lower.includes("edit") || lower.includes("modify") || lower.includes("save") || lower.includes("status")) {
    return Boolean(settings["audit.log_record_updates"]);
  }
  return true;
};

/**
 * Determine if an admin notification should be generated/sent
 */
export const shouldNotifyAdmin = (
  eventTypeOrSettings:
    | "new_registration"
    | "renewal_submitted"
    | "ypop_submission"
    | "budget_request"
    | "liquidation_report"
    | "new_inquiry"
    | "needs_revision_resubmission"
    | "revision_resubmission"
    | "overdue_liquidation"
    | "accreditation_expiring"
    | Partial<AdminSystemSettingsValues>
    | Record<string, unknown>,
  channelOrEventType:
    | "in_app"
    | "email"
    | "new_registration"
    | "renewal_submitted"
    | "ypop_submission"
    | "budget_request"
    | "liquidation_report"
    | "new_inquiry"
    | "needs_revision_resubmission"
    | "revision_resubmission"
    | "overdue_liquidation"
    | "accreditation_expiring",
  channelIfFirstIsSettings?: "in_app" | "email" | Partial<AdminSystemSettingsValues> | Record<string, unknown>,
): boolean => {
  let settings: Record<string, unknown>;
  let eventType: string;
  let channel: "in_app" | "email";

  if (typeof eventTypeOrSettings === "object" && eventTypeOrSettings !== null) {
    settings = eventTypeOrSettings as Record<string, unknown>;
    eventType = String(channelOrEventType);
    channel = (channelIfFirstIsSettings as "in_app" | "email") ?? "email";
  } else {
    eventType = String(eventTypeOrSettings);
    channel = channelOrEventType as "in_app" | "email";
    if (typeof channelIfFirstIsSettings === "object" && channelIfFirstIsSettings !== null) {
      settings = channelIfFirstIsSettings as Record<string, unknown>;
    } else {
      settings = getEffectiveSystemSettings() as unknown as Record<string, unknown>;
    }
  }

  const normalizedEvent = eventType === "needs_revision_resubmission" ? "revision_resubmission" : eventType;
  const settingKey = `notifications.${normalizedEvent}.${channel}`;
  const val = settings[settingKey];
  return typeof val === "boolean" ? val : true;
};

/**
 * Determine if an organization notification should be dispatched based on workflow settings
 */
export const shouldNotifyOrganization = (
  action: "needs_revision" | "approved" | "rejected" | "resubmitted",
): boolean => {
  const settings = getEffectiveSystemSettings();
  switch (action) {
    case "needs_revision":
      return Boolean(settings["workflow.notify_org_on_needs_revision"]);
    case "approved":
      return Boolean(settings["workflow.notify_org_on_approved"]);
    case "rejected":
      return Boolean(settings["workflow.notify_org_on_rejected"]);
    case "resubmitted":
      return Boolean(settings["workflow.notify_org_on_resubmitted"]);
    default:
      return true;
  }
};

/**
 * Format currency amount using dynamic currency symbol from settings
 */
export const formatSystemCurrency = (amount: number): string => {
  const symbol = getEffectiveSystemSetting("budget.currency_symbol") || "₱";
  return `${symbol}${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

