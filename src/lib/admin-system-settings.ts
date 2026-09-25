import { useEffect, useState } from "react";
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
    description: "Office information, official contact details, and system identity.",
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "In-app and email notifications for submissions, reminders, and daily summaries.",
  },
  {
    id: "workflow",
    label: "Workflow",
    description: "Review reminder timelines, overdue alerts, and automated organization notifications.",
  },
  {
    id: "programs",
    label: "Programs",
    description: "YPOP validation period defaults, deadline reminder schedules, and submission deadlines.",
  },
  {
    id: "budget_finance",
    label: "Budget & Finance",
    description: "Default fiscal year, currency display, and financial deadline reminders.",
  },
  {
    id: "security",
    label: "Security",
    description: "Sign-in session timeouts, action confirmation prompts, and administrator security rules.",
  },
  {
    id: "email",
    label: "Email",
    description: "Automated email sender details, reply-to address, and email notification switches.",
  },
  {
    id: "audit_records",
    label: "Audit & Records",
    description: "Activity log preferences, recorded administrator actions, and sign-in details.",
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
    description: "Official system name displayed in headers, reports, and notices.",
    dataType: "string",
    defaultValue: "Y-TRACE",
    isEditable: false,
    badge: "System",
    helperText: "e.g. Y-TRACE",
  },
  {
    key: "general.office_name",
    category: "general",
    label: "Office Name",
    description: "Official name of the local government office administering youth programs.",
    dataType: "string",
    defaultValue: "Pasig City Youth Development Office",
    helperText: "e.g. Pasig City Youth Development Office",
  },
  {
    key: "general.office_acronym",
    category: "general",
    label: "Office Acronym",
    description: "Short office abbreviation shown on badges, tags, and document headers.",
    dataType: "string",
    defaultValue: "PCYDO / LYDO",
    isEditable: false,
    badge: "System",
    helperText: "e.g. PCYDO / LYDO",
  },
  {
    key: "general.support_email",
    category: "general",
    label: "Official Support Email",
    description: "Official contact email displayed to youth organizations and citizens for inquiries.",
    dataType: "string",
    defaultValue: "lydo@pasigcity.gov.ph",
    helperText: "e.g. lydo@pasigcity.gov.ph",
  },
  {
    key: "general.contact_number",
    category: "general",
    label: "Official Contact Number",
    description: "Official telephone or mobile number displayed for inquiries.",
    dataType: "string",
    defaultValue: "(02) 8643-1111",
    helperText: "e.g. (02) 8643-1111",
  },
  {
    key: "general.office_address",
    category: "general",
    label: "Office Address",
    description: "Physical office address displayed for in-person visits and submissions.",
    dataType: "string",
    defaultValue: "3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City",
    helperText: "e.g. 3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City",
  },
  {
    key: "general.user_portal_url",
    category: "general",
    label: "Youth Organization Portal URL",
    description: "Website address used in emails and links for youth organizations.",
    dataType: "string",
    defaultValue: "https://ytrace.app",
    helperText: "e.g. https://ytrace.app",
  },
  {
    key: "general.admin_portal_url",
    category: "general",
    label: "Admin Portal URL",
    description: "Website address for the administrator portal.",
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
    description: "Show an in-app notification when a youth organization submits a new registration application.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.new_registration.email",
    category: "notifications",
    label: "New Registration (Email)",
    description: "Send an email notification when a youth organization submits a new registration application.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.renewal_submitted.in_app",
    category: "notifications",
    label: "Renewal Application (In-App)",
    description: "Show an in-app notification when an organization submits an annual renewal application.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.renewal_submitted.email",
    category: "notifications",
    label: "Renewal Application (Email)",
    description: "Send an email notification when an organization submits an annual renewal application.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.ypop_submission.in_app",
    category: "notifications",
    label: "YPOP Submission (In-App)",
    description: "Show an in-app notification when an organization submits documents for YPOP event validation.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.ypop_submission.email",
    category: "notifications",
    label: "YPOP Submission (Email)",
    description: "Send an email notification when an organization submits documents for YPOP event validation.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.budget_request.in_app",
    category: "notifications",
    label: "Budget Request (In-App)",
    description: "Show an in-app notification when an organization submits a project funding request.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.budget_request.email",
    category: "notifications",
    label: "Budget Request (Email)",
    description: "Send an email notification when an organization submits a project funding request.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.liquidation_report.in_app",
    category: "notifications",
    label: "Liquidation Report (In-App)",
    description: "Show an in-app notification when an organization submits a financial liquidation report.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.liquidation_report.email",
    category: "notifications",
    label: "Liquidation Report (Email)",
    description: "Send an email notification when an organization submits a financial liquidation report.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.new_inquiry.in_app",
    category: "notifications",
    label: "New Inquiry (In-App)",
    description: "Show an in-app notification when a new citizen or organization inquiry is received.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.new_inquiry.email",
    category: "notifications",
    label: "New Inquiry (Email)",
    description: "Send an email notification when a new citizen or organization inquiry is received.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.revision_resubmission.in_app",
    category: "notifications",
    label: "Document Resubmission (In-App)",
    description: "Show an in-app notification when an organization resubmits returned documents.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.revision_resubmission.email",
    category: "notifications",
    label: "Document Resubmission (Email)",
    description: "Send an email notification when an organization resubmits returned documents.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.overdue_liquidation.in_app",
    category: "notifications",
    label: "Overdue Liquidation (In-App)",
    description: "Show an in-app notification when an organization misses its project liquidation deadline.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.overdue_liquidation.email",
    category: "notifications",
    label: "Overdue Liquidation (Email)",
    description: "Send an email notification when an organization misses its project liquidation deadline.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.accreditation_expiring.in_app",
    category: "notifications",
    label: "Expiring Accreditation (In-App)",
    description: "Show an in-app notification when an organization's accreditation is nearing expiration.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.accreditation_expiring.email",
    category: "notifications",
    label: "Expiring Accreditation (Email)",
    description: "Send an email notification when an organization's accreditation is nearing expiration.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "notifications.daily_digest_enabled",
    category: "notifications",
    label: "Daily Activity Digest",
    description: "Send administrators a consolidated daily morning email summarizing pending reviews, overdue items, and new inquiries.",
    dataType: "boolean",
    defaultValue: false,
  },
  {
    key: "notifications.daily_digest_time",
    category: "notifications",
    label: "Daily Digest Delivery Time",
    description: "Time of day when the daily summary email is sent to administrators.",
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
    label: "Review Reminders",
    description: "Flag submissions that have been waiting for review past the target turnaround time.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "workflow.review_reminder_days",
    category: "workflow",
    label: "Reminder After (Days)",
    description: "Number of days a submission can wait in queue before showing a reminder indicator.",
    dataType: "number",
    defaultValue: 3,
    helperText: "e.g. 3 days",
  },
  {
    key: "workflow.escalate_after_days",
    category: "workflow",
    label: "Mark Urgent After (Days)",
    description: "Number of days before an unreviewed submission is marked with urgent priority.",
    dataType: "number",
    defaultValue: 7,
    helperText: "e.g. 7 days",
  },
  {
    key: "workflow.overdue_indicators_enabled",
    category: "workflow",
    label: "Show Overdue Indicators",
    description: "Show visual overdue badges on submissions and reports that have passed their deadline.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "workflow.notify_org_on_needs_revision",
    category: "workflow",
    label: "Notify Organization on Needs Revision",
    description: "Send an automatic notification to the organization when an administrator requests document corrections.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "workflow.notify_org_on_approved",
    category: "workflow",
    label: "Notify Organization on Approval",
    description: "Send an automatic notification to the organization when their registration, renewal, YPOP, or budget request is approved.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "workflow.notify_org_on_rejected",
    category: "workflow",
    label: "Notify Organization on Disapproval",
    description: "Send an automatic notification with administrative remarks when a submission is not approved.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "workflow.notify_org_on_resubmitted",
    category: "workflow",
    label: "Acknowledge Resubmissions",
    description: "Send an automatic confirmation to the organization when they successfully upload revised documents.",
    dataType: "boolean",
    defaultValue: true,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. PROGRAMS (YPOP)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    key: "programs.ypop_default_reminder_days",
    category: "programs",
    label: "Reminder Notice (Days Before Deadline)",
    description: "Number of days before the validation deadline to send reminder notices to organizations.",
    dataType: "number",
    defaultValue: 5,
    helperText: "e.g. 5 days prior to deadline",
  },
  {
    key: "programs.ypop_deadline_reminders_enabled",
    category: "programs",
    label: "Send Deadline Reminders",
    description: "Automatically send reminder notifications to organizations before the submission deadline.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "programs.ypop_auto_close_on_deadline",
    category: "programs",
    label: "Automatically Close Submissions at Deadline",
    description: "Automatically close the submission window and stop accepting new submissions once the deadline passes.",
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
    description: "The fiscal year selected by default when viewing budget tracking, reports, and funding allocations.",
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
    description: "Currency code used for financial amounts in reports and records.",
    dataType: "string",
    defaultValue: "PHP",
    isEditable: false,
    helperText: "Standard Philippine Peso (PHP)",
  },
  {
    key: "budget.currency_symbol",
    category: "budget_finance",
    label: "Currency Symbol",
    description: "Symbol displayed before currency amounts throughout the system.",
    dataType: "string",
    defaultValue: "₱",
    isEditable: false,
  },
  {
    key: "budget.budget_deadline_reminders",
    category: "budget_finance",
    label: "Budget Proposal Reminders",
    description: "Show reminders for pending budget proposals that require review or action.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "budget.liquidation_overdue_reminders",
    category: "budget_finance",
    label: "Liquidation Overdue Reminders",
    description: "Send automatic reminders to organizations with released project funds that are due or past due for liquidation.",
    dataType: "boolean",
    defaultValue: true,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. SECURITY
  // ─────────────────────────────────────────────────────────────────────────────
  {
    key: "security.admin_session_timeout_minutes",
    category: "security",
    label: "Inactivity Sign-Out Time",
    description: "Duration of administrator inactivity before the system automatically signs them out.",
    dataType: "number",
    defaultValue: 30,
    options: [
      { label: "15 minutes", value: 15 },
      { label: "30 minutes (Recommended)", value: 30 },
      { label: "60 minutes (1 hour)", value: 60 },
      { label: "120 minutes (2 hours)", value: 120 },
    ],
    helperText: "Applies to administrator sign-ins after saving.",
  },
  {
    key: "security.reauth_delete_administrator",
    category: "security",
    label: "Confirm Before Deleting Administrator Accounts",
    description: "Ask for confirmation before permanently removing an administrator account.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "security.reauth_delete_inquiry",
    category: "security",
    label: "Confirm Before Deleting Inquiries",
    description: "Ask for confirmation before permanently deleting an inquiry.",
    dataType: "boolean",
    defaultValue: false,
  },
  {
    key: "security.reauth_delete_organization",
    category: "security",
    label: "Confirm Before Deleting Organizations",
    description: "Require typing the organization's name before permanently deleting its record.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "security.reauth_modify_role_permissions",
    category: "security",
    label: "Confirm Before Changing Role Permissions",
    description: "Ask for confirmation before saving changes to administrator role permissions.",
    dataType: "boolean",
    defaultValue: false,
  },
  {
    key: "security.reauth_modify_system_settings",
    category: "security",
    label: "Confirm Before Saving System Settings",
    description: "Ask for confirmation before saving changes made on this settings page.",
    dataType: "boolean",
    defaultValue: false,
  },
  {
    key: "security.require_verified_admin_email",
    category: "security",
    label: "Require Verified Email for Administrators",
    description: "Require administrators to verify their email address before accessing the admin portal.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "security.allow_admin_password_reset",
    category: "security",
    label: "Allow Self-Service Password Resets",
    description: "Allow administrators to reset forgotten passwords using a secure link sent to their email.",
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
    description: "The name shown as the sender for all automated emails from Y-TRACE.",
    dataType: "string",
    defaultValue: "Y-TRACE",
    isEditable: false,
    badge: "Managed by System",
    helperText: "noreply@ytrace.app (Y-TRACE)",
  },
  {
    key: "email.reply_to_email",
    category: "email",
    label: "Reply-To Email Address",
    description: "The email address where replies to automated system emails will be received.",
    dataType: "string",
    defaultValue: "lydo@pasigcity.gov.ph",
    helperText: "e.g. lydo@pasigcity.gov.ph",
  },
  {
    key: "email.send_invitation_emails",
    category: "email",
    label: "Send New Administrator Invitation Emails",
    description: "Send an email with an account setup link whenever a new administrator is created.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "email.send_workflow_emails",
    category: "email",
    label: "Send Status & Decision Emails to Organizations",
    description: "Send emails to youth organizations when their submissions are approved, returned for revision, or rejected. (In-app notifications remain active regardless of this switch.)",
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
    description: "Record when administrators sign in to the portal.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "audit.log_admin_logout",
    category: "audit_records",
    label: "Log Administrator Sign-Outs",
    description: "Record when administrators sign out of the portal.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "audit.log_record_creation",
    category: "audit_records",
    label: "Log New Records & Submissions",
    description: "Record when new templates, announcements, activities, registrations, or budget requests are created.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "audit.log_record_updates",
    category: "audit_records",
    label: "Log Record Changes & Edits",
    description: "Record when existing information, templates, announcements, or organization records are edited.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "audit.log_approvals_rejections",
    category: "audit_records",
    label: "Log Approvals, Revisions & Decisions",
    description: "Record administrative decisions, including approvals, revision requests, and rejections.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "audit.log_deletions",
    category: "audit_records",
    label: "Log Deleted Items",
    description: "Record when items such as templates, inquiries, activities, or accounts are deleted.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "audit.log_permission_changes",
    category: "audit_records",
    label: "Log Permission & Role Changes",
    description: "Record when administrator roles or access permissions are modified.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "audit.log_config_changes",
    category: "audit_records",
    label: "Log System Settings Changes",
    description: "Record whenever changes are made and saved on this System Settings page.",
    dataType: "boolean",
    defaultValue: true,
  },
  {
    key: "audit.include_ip_metadata",
    category: "audit_records",
    label: "Record IP Address",
    description: "Record the IP address of the device used when an administrator performs an action.",
    dataType: "boolean",
    defaultValue: false,
  },
  {
    key: "audit.include_user_agent",
    category: "audit_records",
    label: "Record Browser & Device Information",
    description: "Record the web browser and device type used when an administrator performs an action.",
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

  if (def.isEditable === false) {
    if (value !== undefined && value !== def.defaultValue) {
      return { valid: false, error: `${def.label} is system-managed and read-only.` };
    }
  }

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
    if (key === "workflow.review_reminder_days" && (num < 1 || num > 90)) {
      return { valid: false, error: "Reminder threshold must be between 1 and 90 days" };
    }
    if (key === "workflow.escalate_after_days" && (num < 1 || num > 180)) {
      return { valid: false, error: "Urgent threshold must be between 1 and 180 days" };
    }
    if (key === "programs.ypop_default_reminder_days" && (num < 1 || num > 60)) {
      return { valid: false, error: "Reminder days must be between 1 and 60 days" };
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
    // Fall back to cached / defaults for local/demo mode
    const effective = getEffectiveSystemSettings();
    return ADMIN_SYSTEM_SETTING_DEFINITIONS.map((def) => ({
      settingKey: def.key,
      category: def.category,
      value: (effective as Record<string, unknown>)[def.key] ?? def.defaultValue,
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
export const getEffectiveSystemSetting = <K extends AdminSystemSettingKey | "security.admin_password_reset">(
  key: K,
): K extends AdminSystemSettingKey ? AdminSystemSettingsValues[K] : boolean => {
  const settings = getEffectiveSystemSettings();
  if (key === "security.admin_password_reset") {
    return (settings["security.allow_admin_password_reset"] ?? true) as any;
  }
  return settings[key as AdminSystemSettingKey] as any;
};

/**
 * Reactive hook to subscribe to system settings changes across the application
 */
export const useSystemSettings = (): AdminSystemSettingsValues => {
  const [settings, setSettings] = useState<AdminSystemSettingsValues>(() => getEffectiveSystemSettings());

  useEffect(() => {
    const handleUpdate = () => {
      setSettings(getEffectiveSystemSettings());
    };
    window.addEventListener(ADMIN_SETTINGS_CHANGE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(ADMIN_SETTINGS_CHANGE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return settings;
};

/**
 * Reactive hook to subscribe to a specific system setting
 */
export const useSystemSetting = <K extends AdminSystemSettingKey | "security.admin_password_reset">(
  key: K,
): K extends AdminSystemSettingKey ? AdminSystemSettingsValues[K] : boolean => {
  const [val, setVal] = useState(() => getEffectiveSystemSetting(key));

  useEffect(() => {
    const handleUpdate = () => {
      setVal(getEffectiveSystemSetting(key));
    };
    window.addEventListener(ADMIN_SETTINGS_CHANGE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(ADMIN_SETTINGS_CHANGE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [key]);

  return val as any;
};

/**
 * Public-safe asynchronous fetcher for non-sensitive system settings (e.g. contact info, office address).
 * Loads live data from Supabase without requiring admin session authentication.
 */
export const fetchPublicSystemSettings = async (): Promise<Partial<AdminSystemSettingsValues>> => {
  if (!supabase) return {};

  try {
    let rows: Array<{ setting_key: string; value_json: unknown }> | null = null;

    // Try public-safe RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_public_system_settings");
    if (!rpcError && Array.isArray(rpcData)) {
      rows = rpcData;
    } else {
      // Fallback to direct select via RLS policy
      const { data: tableData, error: tableError } = await supabase
        .from("admin_system_settings")
        .select("setting_key, value_json")
        .eq("is_sensitive", false);
      if (!tableError && Array.isArray(tableData)) {
        rows = tableData;
      }
    }

    if (rows && Array.isArray(rows)) {
      const map: Record<string, unknown> = {};
      rows.forEach((r) => {
        if (r.setting_key && r.value_json !== undefined) {
          map[r.setting_key] = r.value_json;
        }
      });
      if (Object.keys(map).length > 0) {
        const current = readCachedSystemSettings();
        const next = { ...current, ...map };
        writeCachedSystemSettings(next);
        return map as Partial<AdminSystemSettingsValues>;
      }
    }
  } catch (err) {
    // Non-blocking fallback to local defaults/cache
    console.warn("Could not refresh public system settings from server:", err);
  }

  return {};
};

/**
 * Reactive hook for public-facing contact information
 */
export const usePublicContactInfo = () => {
  const [info, setInfo] = useState(() => {
    const s = getEffectiveSystemSettings();
    return {
      contactNumber: String(s["general.contact_number"] || "(02) 8643-1111"),
      email: String(s["email.reply_to_email"] || s["general.support_email"] || "lydo@pasigcity.gov.ph"),
      address: String(s["general.office_address"] || "3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City"),
      officeName: String(s["general.office_name"] || "Pasig City Youth Development Office"),
      systemName: String(s["general.system_name"] || "Y-TRACE"),
    };
  });

  useEffect(() => {
    // Immediately fetch latest live settings from Supabase on mount
    void fetchPublicSystemSettings();

    const handleUpdate = () => {
      const s = getEffectiveSystemSettings();
      setInfo({
        contactNumber: String(s["general.contact_number"] || "(02) 8643-1111"),
        email: String(s["email.reply_to_email"] || s["general.support_email"] || "lydo@pasigcity.gov.ph"),
        address: String(s["general.office_address"] || "3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City"),
        officeName: String(s["general.office_name"] || "Pasig City Youth Development Office"),
        systemName: String(s["general.system_name"] || "Y-TRACE"),
      });
    };

    window.addEventListener(ADMIN_SETTINGS_CHANGE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(ADMIN_SETTINGS_CHANGE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return info;
};

export type AuditCategory =
  | "login"
  | "logout"
  | "create"
  | "update"
  | "approval"
  | "deletion"
  | "permission"
  | "config";

/**
 * Determine if a given activity type should be logged based on active settings.
 * Supports explicit audit category and fallback keyword classification.
 */
export const shouldLogActivityType = (
  actionOrCategory: string,
  explicitCategory?: AuditCategory,
): boolean => {
  const settings = getEffectiveSystemSettings();
  const lower = actionOrCategory.toLowerCase();

  const category: AuditCategory =
    explicitCategory ??
    (() => {
      if (lower === "login" || lower.includes("sign_in") || lower.includes("signed in") || lower.includes("logged in")) return "login";
      if (lower === "logout" || lower.includes("sign_out") || lower.includes("signed out") || lower.includes("logged out")) return "logout";
      if (lower.includes("delete") || lower.includes("remove") || lower.includes("purge")) return "deletion";
      if (lower.includes("permission") || lower.includes("role")) return "permission";
      if (lower.includes("setting") || lower.includes("config")) return "config";
      if (lower.includes("approve") || lower.includes("reject") || lower.includes("decision") || lower.includes("review") || lower.includes("needs_revision")) return "approval";
      if (lower.includes("create") || lower.includes("add") || lower.includes("new")) return "create";
      if (
        lower.includes("update") ||
        lower.includes("edit") ||
        lower.includes("modify") ||
        lower.includes("save") ||
        lower.includes("status") ||
        lower.includes("archive") ||
        lower.includes("restore")
      ) {
        return "update";
      }
      return "update";
    })();

  switch (category) {
    case "login":
      return Boolean(settings["audit.log_admin_login"]);
    case "logout":
      return Boolean(settings["audit.log_admin_logout"]);
    case "create":
      return Boolean(settings["audit.log_record_creation"]);
    case "update":
      return Boolean(settings["audit.log_record_updates"]);
    case "approval":
      return Boolean(settings["audit.log_approvals_rejections"]);
    case "deletion":
      return Boolean(settings["audit.log_deletions"]);
    case "permission":
      return Boolean(settings["audit.log_permission_changes"]);
    case "config":
      return Boolean(settings["audit.log_config_changes"]);
    default:
      return true;
  }
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
  settingsOverride?: Partial<AdminSystemSettingsValues> | Record<string, unknown>,
): boolean => {
  const settings = settingsOverride
    ? { ...getEffectiveSystemSettings(), ...settingsOverride }
    : getEffectiveSystemSettings();
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

export interface WorkflowTimingResult {
  ageInDays: number;
  isReminderDue: boolean;
  isEscalated: boolean;
  isOverdue: boolean;
  riskLabel: "On Track" | "Needs Attention" | "Overdue" | "Completed";
}

/**
 * Centrally computes timing, review reminders, and overdue states for reviewable workflow items.
 */
export const computeWorkflowItemTiming = (
  submittedAtOrDeadline: string | Date | null | undefined,
  options?: {
    isDeadline?: boolean;
    isCompleted?: boolean;
    customSettings?: Partial<AdminSystemSettingsValues>;
  },
): WorkflowTimingResult => {
  const settings = options?.customSettings
    ? { ...getEffectiveSystemSettings(), ...options.customSettings }
    : getEffectiveSystemSettings();

  const reminderEnabled = Boolean(settings["workflow.review_reminder_enabled"]);
  const reminderDays = Math.max(1, Number(settings["workflow.review_reminder_days"]) || 3);
  const escalateDays = Math.max(1, Number(settings["workflow.escalate_after_days"]) || 7);
  const overdueEnabled = Boolean(settings["workflow.overdue_indicators_enabled"]);

  if (options?.isCompleted) {
    return {
      ageInDays: 0,
      isReminderDue: false,
      isEscalated: false,
      isOverdue: false,
      riskLabel: "Completed",
    };
  }

  if (!submittedAtOrDeadline) {
    return {
      ageInDays: 0,
      isReminderDue: false,
      isEscalated: false,
      isOverdue: false,
      riskLabel: "On Track",
    };
  }

  const date = typeof submittedAtOrDeadline === "string" ? new Date(submittedAtOrDeadline) : submittedAtOrDeadline;
  if (Number.isNaN(date.getTime())) {
    return {
      ageInDays: 0,
      isReminderDue: false,
      isEscalated: false,
      isOverdue: false,
      riskLabel: "On Track",
    };
  }

  const now = new Date();

  if (options?.isDeadline) {
    const isPastDeadline = date.getTime() < now.getTime();
    const daysUntil = Math.ceil((date.getTime() - now.getTime()) / 86400000);
    const isOverdue = overdueEnabled && isPastDeadline;
    const isReminder = reminderEnabled && !isPastDeadline && daysUntil <= reminderDays;

    let riskLabel: WorkflowTimingResult["riskLabel"] = "On Track";
    if (isOverdue) riskLabel = "Overdue";
    else if (isPastDeadline) riskLabel = "Needs Attention";
    else if (isReminder) riskLabel = "Needs Attention";

    return {
      ageInDays: Math.max(0, -daysUntil),
      isReminderDue: isReminder,
      isEscalated: false,
      isOverdue,
      riskLabel,
    };
  }

  const ageInDays = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86400000));
  const isEscalated = ageInDays >= escalateDays;
  const isReminderDue = reminderEnabled && ageInDays >= reminderDays;

  let riskLabel: WorkflowTimingResult["riskLabel"] = "On Track";
  if (isEscalated) {
    riskLabel = overdueEnabled ? "Overdue" : "Needs Attention";
  } else if (isReminderDue) {
    riskLabel = "Needs Attention";
  }

  return {
    ageInDays,
    isReminderDue,
    isEscalated,
    isOverdue: isEscalated && overdueEnabled,
    riskLabel,
  };
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


