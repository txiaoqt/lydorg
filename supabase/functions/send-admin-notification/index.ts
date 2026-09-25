// Supabase Edge Function: send-admin-notification
//
// Authoritative Admin Email Notification Delivery Pipeline:
// 1. Authenticates callers via:
//    - SUPABASE_SERVICE_ROLE_KEY (internal server-to-server workflows)
//    - validate_admin_session_token (Admin Portal sessions)
//    - Supabase Auth JWT with organization ownership validation (Youth Organization users)
// 2. Authorizes organization users against database records (preventing cross-organization forgery).
// 3. Dynamically reads the current official support email from public.admin_system_settings (key: 'general.support_email').
// 4. Validates global workflow email gate ('email.send_workflow_emails') and event-specific gate ('notifications.<event>.email').
// 5. Independently handles in-app notifications according to ('notifications.<event>.in_app').
// 6. Dispatches branded, HTML-escaped transactional email to dynamic general.support_email via Brevo REST API.
// 7. System sender is verified: BREVO_SENDER_EMAIL || 'noreply@ytrace.app'.
// 8. Fail-safe: if database settings cannot be read, email dispatch fails closed (false).
// 9. Non-blocking: failures are logged without corrupting or rolling back business transactions.
//
// Deploy with: supabase functions deploy send-admin-notification --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SupabaseAdminClient = ReturnType<typeof createClient>;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma, x-admin-session-token",
  "Access-Control-Max-Age": "86400",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

export const CANONICAL_ADMIN_EVENT_TYPES = [
  "new_registration",
  "renewal_submitted",
  "ypop_submission",
  "budget_request",
  "liquidation_report",
  "new_inquiry",
  "revision_resubmission",
  "accreditation_expiring",
  "overdue_liquidation",
] as const;

export type AdminNotificationEventType = typeof CANONICAL_ADMIN_EVENT_TYPES[number];

const VALID_EVENT_TYPES = new Set<string>(CANONICAL_ADMIN_EVENT_TYPES);

export interface AdminNotificationPayload {
  eventType: AdminNotificationEventType;
  organizationId?: string;
  organizationName?: string;
  referenceId?: string;
  subject?: string;
  details?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
}

interface ResolvedAdminSettings {
  supportEmail: string;
  senderName: string;
  replyToEmail: string;
  sendWorkflowEmails: boolean;
  adminPortalUrl: string;
  systemName: string;
  officeName: string;
  officeAcronym: string;
  eventEmailEnabled: boolean;
  eventInAppEnabled: boolean;
  settingsReadSuccessfully: boolean;
}

interface ValidatedEventContext {
  organizationId?: string;
  organizationName?: string;
  referenceId?: string;
  subject?: string;
  details?: string;
  amount?: number;
}

/**
 * Escapes special HTML characters to prevent HTML/XSS injection in rendered email content.
 */
function escapeHtml(str?: string | null): string {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validates email format.
 */
function isValidEmail(email?: string | null): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Sanitize text inputs by trimming and limiting length.
 */
function sanitizeText(val: unknown, maxLen = 500): string {
  if (typeof val !== "string") return "";
  return val.trim().slice(0, maxLen);
}

/**
 * Validates caller authorization using genuine authentication mechanisms.
 * Supports:
 * 1. Server-to-server / trusted workflows with SUPABASE_SERVICE_ROLE_KEY.
 * 2. Authenticated Admin accounts with valid admin session tokens verified via database RPC.
 * 3. Authenticated Youth Organization users with valid Supabase Auth JWT verified via auth.getUser().
 * 
 * Rejects unauthenticated callers, fake tokens, random strings, and bare public anon keys.
 */
async function authorizeCaller(
  req: Request,
  supabaseAdmin: SupabaseAdminClient,
): Promise<{ authorized: boolean; callerId?: string; callerType?: string; reason?: string }> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const adminSessionToken = req.headers.get("x-admin-session-token") || req.headers.get("X-Admin-Session-Token");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  // 1. Check for Service Role Key (server-to-server / internal trusted workers)
  if (serviceKey && authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token === serviceKey) {
      return { authorized: true, callerType: "service_role" };
    }
  }

  // 2. Check for Authenticated Admin Session Token (Admin Portal Users)
  if (adminSessionToken && typeof adminSessionToken === "string") {
    try {
      const { data: vatData, error: vatError } = await supabaseAdmin.rpc("validate_admin_session_token", {
        _session_token: adminSessionToken.trim(),
      });
      const row = Array.isArray(vatData) && vatData.length > 0 ? vatData[0] : vatData;
      const adminId = row?.admin_id ?? row?.id;
      if (!vatError && adminId) {
        return { authorized: true, callerId: String(adminId), callerType: "admin" };
      }
    } catch {
      // Fall through to user JWT verification
    }
  }

  // 3. Check for Authenticated Supabase User (Youth Organization Portal Users)
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const jwtToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (jwtToken && jwtToken !== serviceKey) {
      try {
        const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwtToken);
        if (!userError && userData?.user?.id) {
          return { authorized: true, callerId: userData.user.id, callerType: "organization_user" };
        }
      } catch {
        // Validation failed
      }
    }
  }

  return {
    authorized: false,
    reason: "Unauthorized: Caller must provide a verified Supabase user session, valid admin session token, or service role credential.",
  };
}

/**
 * Validates organization user authorization and prevents cross-organization forgery.
 * Resolves authoritative values from database records whenever a referenceId is supplied.
 */
async function authorizeAndResolveEventContext(
  supabaseAdmin: SupabaseAdminClient,
  caller: { callerId?: string; callerType?: string },
  payload: AdminNotificationPayload,
): Promise<{ authorized: boolean; context?: ValidatedEventContext; error?: string }> {
  // 1. If caller is admin or service_role, allow full operational authorization with sanitized inputs
  if (caller.callerType === "admin" || caller.callerType === "service_role") {
    return {
      authorized: true,
      context: {
        organizationId: payload.organizationId,
        organizationName: payload.organizationName,
        referenceId: payload.referenceId,
        subject: payload.subject,
        details: payload.details,
        amount: payload.amount,
      },
    };
  }

  // 2. Organization user restrictions: Block admin/system-only events
  if (payload.eventType === "accreditation_expiring" || payload.eventType === "overdue_liquidation") {
    return {
      authorized: false,
      error: `Forbidden: Event '${payload.eventType}' is restricted to administrators and system workflows.`,
    };
  }

  const userId = caller.callerId;
  if (!userId) {
    return { authorized: false, error: "Missing user identity for organization caller." };
  }

  // 3. Query authenticated user's organization profile
  const { data: userOrg, error: orgErr } = await supabaseAdmin
    .from("organization_profiles")
    .select("id, organization_name, user_id, profile_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (orgErr || !userOrg) {
    return {
      authorized: false,
      error: "Forbidden: Authenticated user has no associated youth organization profile.",
    };
  }

  // Cross-org check: if payload has organizationId, it must match userOrg.id
  if (payload.organizationId && payload.organizationId !== userOrg.id) {
    return {
      authorized: false,
      error: "Forbidden: Cross-organization notification dispatch is prohibited.",
    };
  }

  const orgId = userOrg.id;
  let orgName = userOrg.organization_name || payload.organizationName || "Youth Organization";
  let subject = payload.subject;
  let details = payload.details;
  let amount = payload.amount;
  const refId = payload.referenceId;

  // 4. Require referenceId for organization users across all submission event types
  if (!refId) {
    return {
      authorized: false,
      error: `Forbidden: Missing required referenceId for event '${payload.eventType}'.`,
    };
  }

  // 5. Verify reference record existence, ownership, and workflow state against the database
  switch (payload.eventType) {
    case "budget_request": {
      const { data: budgetRow } = await supabaseAdmin
        .from("budget_requests")
        .select("id, organization_id, project_name, activity_title, amount, requested_amount, status")
        .eq("id", refId)
        .maybeSingle();

      if (!budgetRow) {
        return { authorized: false, error: "Forbidden: Referenced budget request does not exist." };
      }
      if (budgetRow.organization_id !== orgId) {
        return { authorized: false, error: "Forbidden: Referenced budget request does not belong to your organization." };
      }
      const validBudgetStatuses = ["submitted", "under_review"];
      if (!budgetRow.status || !validBudgetStatuses.includes(budgetRow.status)) {
        return { authorized: false, error: "Forbidden: Budget request is not in a submitted/reviewable state." };
      }
      if (budgetRow.project_name || budgetRow.activity_title) {
        subject = budgetRow.project_name || budgetRow.activity_title;
      }
      if (typeof budgetRow.amount === "number") {
        amount = budgetRow.amount;
      } else if (typeof budgetRow.requested_amount === "number") {
        amount = budgetRow.requested_amount;
      }
      break;
    }

    case "liquidation_report": {
      const { data: liqRow } = await supabaseAdmin
        .from("liquidation_reports")
        .select("id, organization_id, project_name, total_amount, status")
        .eq("id", refId)
        .maybeSingle();

      if (!liqRow) {
        return { authorized: false, error: "Forbidden: Referenced liquidation report does not exist." };
      }
      if (liqRow.organization_id !== orgId) {
        return { authorized: false, error: "Forbidden: Referenced liquidation report does not belong to your organization." };
      }
      const validLiqStatuses = ["submitted", "under_review"];
      if (!liqRow.status || !validLiqStatuses.includes(liqRow.status)) {
        return { authorized: false, error: "Forbidden: Liquidation report is not in a submitted/reviewable state." };
      }
      if (liqRow.project_name) subject = liqRow.project_name;
      if (typeof liqRow.total_amount === "number") amount = liqRow.total_amount;
      break;
    }

    case "ypop_submission": {
      // 1. Check ypop_org_activities (PPA activities)
      const { data: orgActRow } = await supabaseAdmin
        .from("ypop_org_activities")
        .select("id, organization_id, activity_name, status, narrative_report")
        .eq("id", refId)
        .maybeSingle();

      if (orgActRow) {
        if (orgActRow.organization_id !== orgId) {
          return { authorized: false, error: "Forbidden: Referenced YPOP activity does not belong to your organization." };
        }
        const validOrgActStatuses = ["pending_evaluation", "submitted", "under_review"];
        if (!orgActRow.status || !validOrgActStatuses.includes(orgActRow.status)) {
          return { authorized: false, error: "Forbidden: YPOP activity is not in a submitted/reviewable state." };
        }
        if (orgActRow.activity_name) subject = `PPA Activity: ${orgActRow.activity_name}`;
        if (orgActRow.narrative_report) details = orgActRow.narrative_report;
        break;
      }

      // 2. Check ypop_event_participations (Event validation proofs)
      const { data: partRow } = await supabaseAdmin
        .from("ypop_event_participations")
        .select("id, organization_id, activity_name, status")
        .eq("id", refId)
        .maybeSingle();

      if (partRow) {
        if (partRow.organization_id !== orgId) {
          return { authorized: false, error: "Forbidden: Referenced YPOP participation does not belong to your organization." };
        }
        const validPartStatuses = ["pending_evaluation", "pending_verification", "verified"];
        if (!partRow.status || !validPartStatuses.includes(partRow.status)) {
          return { authorized: false, error: "Forbidden: YPOP event participation is not in a submitted/verified state." };
        }
        if (partRow.activity_name) subject = `Event Participation: ${partRow.activity_name}`;
        break;
      }

      // 3. Check ypop_entries (Semester entry)
      const { data: ypopEntryRow } = await supabaseAdmin
        .from("ypop_entries")
        .select("id, organization_id, semester, status")
        .eq("id", refId)
        .maybeSingle();

      if (ypopEntryRow) {
        if (ypopEntryRow.organization_id !== orgId) {
          return { authorized: false, error: "Forbidden: Referenced YPOP entry does not belong to your organization." };
        }
        const validEntryStatuses = ["pending_evaluation", "submitted", "under_review", "qualified"];
        if (!ypopEntryRow.status || !validEntryStatuses.includes(ypopEntryRow.status)) {
          return { authorized: false, error: "Forbidden: YPOP entry is not in a submitted/reviewable state." };
        }
        if (ypopEntryRow.semester) subject = `YPOP Entry: ${ypopEntryRow.semester}`;
        break;
      }

      // 4. Check legacy ypop_events table if present
      const { data: eventRow } = await supabaseAdmin
        .from("ypop_events")
        .select("id, organization_id, title, status")
        .eq("id", refId)
        .maybeSingle();

      if (eventRow) {
        if (eventRow.organization_id !== orgId) {
          return { authorized: false, error: "Forbidden: Referenced YPOP event does not belong to your organization." };
        }
        if (eventRow.status === "draft") {
          return { authorized: false, error: "Forbidden: Cannot dispatch notification for draft YPOP event." };
        }
        if (eventRow.title) subject = eventRow.title;
        break;
      }

      return { authorized: false, error: "Forbidden: Referenced YPOP record does not exist." };
    }

    case "new_inquiry": {
      const { data: inqRow } = await supabaseAdmin
        .from("inquiries")
        .select("id, organization_id, submitted_by, subject, description, status")
        .eq("id", refId)
        .maybeSingle();

      if (!inqRow) {
        return { authorized: false, error: "Forbidden: Referenced inquiry does not exist." };
      }
      if (inqRow.organization_id !== orgId && inqRow.submitted_by !== userId) {
        return { authorized: false, error: "Forbidden: Referenced inquiry does not belong to your account." };
      }
      if (inqRow.status !== "pending_review") {
        return { authorized: false, error: "Forbidden: Inquiry is not in an active pending review state." };
      }
      if (inqRow.subject) subject = inqRow.subject;
      if (inqRow.description) details = inqRow.description;
      break;
    }

    case "revision_resubmission": {
      // Restricted strictly to document_submissions.id per specification
      const { data: docRow } = await supabaseAdmin
        .from("document_submissions")
        .select("id, organization_id, document_type, status")
        .eq("id", refId)
        .maybeSingle();

      if (!docRow) {
        return { authorized: false, error: "Forbidden: Referenced document submission does not exist." };
      }
      if (docRow.organization_id !== orgId) {
        return { authorized: false, error: "Forbidden: Referenced document submission does not belong to your organization." };
      }
      const validRevisionStatuses = ["under_admin_review", "submitted", "ready_for_review", "needs_revision"];
      if (!docRow.status || !validRevisionStatuses.includes(docRow.status)) {
        return { authorized: false, error: "Forbidden: Document submission is not in a reviewable revision state." };
      }
      break;
    }

    case "new_registration": {
      if (refId === orgId) {
        break;
      }

      const { data: docRow } = await supabaseAdmin
        .from("document_submissions")
        .select("id, organization_id, status")
        .eq("id", refId)
        .maybeSingle();

      if (docRow) {
        if (docRow.organization_id !== orgId) {
          return { authorized: false, error: "Forbidden: Referenced registration document does not belong to your organization." };
        }
        const validRegistrationStatuses = ["under_admin_review", "submitted", "ready_for_review"];
        if (!docRow.status || !validRegistrationStatuses.includes(docRow.status)) {
          return { authorized: false, error: "Forbidden: Registration document submission is not in a reviewable state." };
        }
        break;
      }

      return { authorized: false, error: "Forbidden: Referenced registration record does not exist or does not match your organization." };
    }

    case "renewal_submitted": {
      if (refId === orgId) {
        break;
      }

      const { data: renewalRow } = await supabaseAdmin
        .from("organization_renewals")
        .select("id, organization_id, status")
        .eq("id", refId)
        .maybeSingle();

      if (renewalRow) {
        if (renewalRow.organization_id !== orgId) {
          return { authorized: false, error: "Forbidden: Referenced renewal application does not belong to your organization." };
        }
        const validRenewalStatuses = ["submitted", "under_review"];
        if (!renewalRow.status || !validRenewalStatuses.includes(renewalRow.status)) {
          return { authorized: false, error: "Forbidden: Renewal application is not in a submitted state." };
        }
        break;
      }

      const { data: docRow } = await supabaseAdmin
        .from("document_submissions")
        .select("id, organization_id, status")
        .eq("id", refId)
        .maybeSingle();

      if (docRow) {
        if (docRow.organization_id !== orgId) {
          return { authorized: false, error: "Forbidden: Referenced renewal document does not belong to your organization." };
        }
        const validDocStatuses = ["under_admin_review", "submitted", "ready_for_review"];
        if (!docRow.status || !validDocStatuses.includes(docRow.status)) {
          return { authorized: false, error: "Forbidden: Renewal document submission is not in a submitted state." };
        }
        break;
      }

      return { authorized: false, error: "Forbidden: Referenced renewal record does not exist or does not match your organization." };
    }
  }

  return {
    authorized: true,
    context: {
      organizationId: orgId,
      organizationName: orgName,
      referenceId: refId,
      subject,
      details,
      amount,
    },
  };
}

/**
 * Fetches dynamic system settings from public.admin_system_settings for the specified event.
 * Fail-Safe: If database cannot be read, notification gating fails closed (false) to prevent unintended dispatches.
 */
async function fetchAdminNotificationSettings(
  supabaseAdmin: SupabaseAdminClient,
  eventType: AdminNotificationEventType,
): Promise<ResolvedAdminSettings> {
  // Safe default branding fallbacks
  let supportEmail = "";
  let senderName = "Pasig City LYDO";
  let replyToEmail = "";
  let adminPortalUrl = "https://y-trace-admin.vercel.app";
  let systemName = "Y-TRACE";
  let officeName = "Pasig City Local Youth Development Office";
  let officeAcronym = "PCYDO / LYDO";

  // Fail-closed defaults: if settings table cannot be queried, do not send automated emails
  let sendWorkflowEmails = false;
  let eventEmailEnabled = false;
  let eventInAppEnabled = false;
  let settingsReadSuccessfully = false;

  const emailKey = `notifications.${eventType}.email`;
  const inAppKey = `notifications.${eventType}.in_app`;

  try {
    const { data, error } = await supabaseAdmin
      .from("admin_system_settings")
      .select("setting_key, value_json");

    if (error) {
      console.error("[send-admin-notification] Error querying admin_system_settings (failing closed):", error.message);
    } else if (data && Array.isArray(data)) {
      settingsReadSuccessfully = true;

      // When DB is successfully read, default missing booleans to standard active defaults
      sendWorkflowEmails = true;
      eventEmailEnabled = true;
      eventInAppEnabled = true;

      for (const row of data) {
        const key = row.setting_key;
        const val = row.value_json;

        if (key === "general.support_email" && typeof val === "string" && val.trim()) {
          supportEmail = val.trim();
        } else if (key === "email.sender_name" && typeof val === "string" && val.trim()) {
          senderName = val.trim();
        } else if (key === "email.reply_to_email" && typeof val === "string" && val.trim()) {
          replyToEmail = val.trim();
        } else if (key === "email.send_workflow_emails" && typeof val === "boolean") {
          sendWorkflowEmails = val;
        } else if (key === "general.admin_portal_url" && typeof val === "string" && val.trim()) {
          adminPortalUrl = val.trim();
        } else if (key === "general.system_name" && typeof val === "string" && val.trim()) {
          systemName = val.trim();
        } else if (key === "general.office_name" && typeof val === "string" && val.trim()) {
          officeName = val.trim();
        } else if (key === "general.office_acronym" && typeof val === "string" && val.trim()) {
          officeAcronym = val.trim();
        } else if (key === emailKey && typeof val === "boolean") {
          eventEmailEnabled = val;
        } else if (key === inAppKey && typeof val === "boolean") {
          eventInAppEnabled = val;
        }
      }
    }
  } catch (err) {
    console.error("[send-admin-notification] Unexpected exception reading settings:", err);
  }

  // Safe reply-to resolution: use dynamic setting, or fallback cleanly to supportEmail or senderEmail.
  // NEVER fall back to a personal email address!
  if (!isValidEmail(replyToEmail)) {
    replyToEmail = isValidEmail(supportEmail) ? supportEmail : "";
  }

  return {
    supportEmail,
    senderName,
    replyToEmail,
    sendWorkflowEmails,
    adminPortalUrl,
    systemName,
    officeName,
    officeAcronym,
    eventEmailEnabled,
    eventInAppEnabled,
    settingsReadSuccessfully,
  };
}

/**
 * Returns formatted event presentation info: title, badge, color, route.
 */
function getEventMetadata(
  eventType: AdminNotificationEventType,
  adminPortalUrl: string,
  payload: ValidatedEventContext,
) {
  const baseUrl = adminPortalUrl.replace(/\/+$/, "");
  switch (eventType) {
    case "new_registration":
      return {
        title: "New Accreditation Registration",
        badge: "Registration",
        badgeBg: "#eff6ff",
        badgeColor: "#1d4ed8",
        badgeBorder: "#bfdbfe",
        actionUrl: `${baseUrl}?section=registrations`,
        actionLabel: "Review Registration Documents",
        defaultSubject: `New Organization Registration Submitted: ${payload.organizationName || "Youth Organization"}`,
        relatedType: "organization_profile",
      };
    case "renewal_submitted":
      return {
        title: "Accreditation Renewal Application",
        badge: "Renewal",
        badgeBg: "#f0fdf4",
        badgeColor: "#15803d",
        badgeBorder: "#bbf7d0",
        actionUrl: `${baseUrl}?section=renewals`,
        actionLabel: "Review Renewal Application",
        defaultSubject: `Accreditation Renewal Submitted: ${payload.organizationName || "Youth Organization"}`,
        relatedType: "organization_profile",
      };
    case "ypop_submission":
      return {
        title: "YPOP Event Validation Proof",
        badge: "YPOP Activity",
        badgeBg: "#faf5ff",
        badgeColor: "#7e22ce",
        badgeBorder: "#e9d5ff",
        actionUrl: `${baseUrl}?section=ypop`,
        actionLabel: "Evaluate YPOP Submission",
        defaultSubject: `YPOP Proof Submitted: ${payload.organizationName || "Youth Organization"} - ${payload.subject || "Event Participation"}`,
        relatedType: "ypop_submission",
      };
    case "budget_request":
      return {
        title: "Project Budget Request",
        badge: "Budget Proposal",
        badgeBg: "#fffbeb",
        badgeColor: "#b45309",
        badgeBorder: "#fde68a",
        actionUrl: `${baseUrl}?section=budget`,
        actionLabel: "Evaluate Budget Request",
        defaultSubject: `Project Budget Proposal: ${payload.organizationName || "Youth Organization"} - ${payload.subject || "Project Activity"}`,
        relatedType: "budget_request",
      };
    case "liquidation_report":
      return {
        title: "Liquidation Report Packet",
        badge: "Liquidation",
        badgeBg: "#ecfeff",
        badgeColor: "#0e7490",
        badgeBorder: "#a5f3fc",
        actionUrl: `${baseUrl}?section=liquidation`,
        actionLabel: "Audit Liquidation Report",
        defaultSubject: `Liquidation Report Submitted: ${payload.organizationName || "Youth Organization"} - ${payload.subject || "Project Liquidation"}`,
        relatedType: "liquidation_report",
      };
    case "new_inquiry":
      return {
        title: "Helpdesk Citizen / Org Inquiry",
        badge: "Helpdesk Inquiry",
        badgeBg: "#fdf2f8",
        badgeColor: "#be185d",
        badgeBorder: "#fbcfe8",
        actionUrl: `${baseUrl}?section=helpdesk`,
        actionLabel: "Open Helpdesk Inquiries",
        defaultSubject: `New Helpdesk Inquiry: ${payload.subject || "Citizen / Organization Message"}`,
        relatedType: "inquiry",
      };
    case "revision_resubmission":
      return {
        title: "Document Revision Resubmitted",
        badge: "Resubmission",
        badgeBg: "#fff7ed",
        badgeColor: "#c2410c",
        badgeBorder: "#fed7aa",
        actionUrl: `${baseUrl}?section=documents`,
        actionLabel: "Review Corrected Documents",
        defaultSubject: `Corrected Documents Resubmitted: ${payload.organizationName || "Youth Organization"}`,
        relatedType: "document_submission",
      };
    case "accreditation_expiring":
      return {
        title: "Accreditation Expiring Notice",
        badge: "Term Expiring",
        badgeBg: "#fff1f2",
        badgeColor: "#be123c",
        badgeBorder: "#fecdd3",
        actionUrl: `${baseUrl}?section=renewals`,
        actionLabel: "View Renewal Workspace",
        defaultSubject: `Accreditation Term Expiring: ${payload.organizationName || "Youth Organization"}`,
        relatedType: "organization_profile",
      };
    case "overdue_liquidation":
      return {
        title: "Overdue Liquidation Escalation",
        badge: "Overdue Alert",
        badgeBg: "#fef2f2",
        badgeColor: "#b91c1c",
        badgeBorder: "#fecaca",
        actionUrl: `${baseUrl}?section=liquidation`,
        actionLabel: "Review Overdue Liquidation",
        defaultSubject: `Overdue Liquidation Alert: ${payload.organizationName || "Youth Organization"}`,
        relatedType: "liquidation_report",
      };
  }
}

/**
 * Generates responsive, branded HTML email template for administrative notifications.
 * All dynamic parameters are strictly HTML-escaped to prevent injection.
 */
function generateAdminEmailHtml(params: {
  systemName: string;
  officeName: string;
  officeAcronym: string;
  supportEmail: string;
  title: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  actionUrl: string;
  actionLabel: string;
  organizationName?: string;
  referenceId?: string;
  subject?: string;
  details?: string;
  amount?: number;
  timestamp: string;
}): string {
  const safeSystemName = escapeHtml(params.systemName);
  const safeOfficeName = escapeHtml(params.officeName);
  const safeOfficeAcronym = escapeHtml(params.officeAcronym);
  const safeSupportEmail = escapeHtml(params.supportEmail);
  const safeTitle = escapeHtml(params.title);
  const safeBadge = escapeHtml(params.badge);
  const safeActionLabel = escapeHtml(params.actionLabel);
  const safeTimestamp = escapeHtml(params.timestamp);
  const safeOrg = escapeHtml(params.organizationName);
  const safeSubject = escapeHtml(params.subject);
  const safeRef = escapeHtml(params.referenceId);
  const safeDetails = escapeHtml(params.details);
  const safeUrl = params.actionUrl.startsWith("http") ? escapeHtml(params.actionUrl) : "#";

  const amountRow =
    params.amount !== undefined && params.amount !== null
      ? `<tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; width: 140px; vertical-align: top; border-bottom: 1px solid #f1f5f9;">Requested Amount</td>
          <td style="padding: 10px 14px; font-size: 14px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">₱${params.amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>`
      : "";

  const orgRow = safeOrg
    ? `<tr>
        <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; width: 140px; vertical-align: top; border-bottom: 1px solid #f1f5f9;">Organization</td>
        <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #f1f5f9;">${safeOrg}</td>
      </tr>`
    : "";

  const subjectRow = safeSubject
    ? `<tr>
        <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; width: 140px; vertical-align: top; border-bottom: 1px solid #f1f5f9;">Topic / Item</td>
        <td style="padding: 10px 14px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${safeSubject}</td>
      </tr>`
    : "";

  const refRow = safeRef
    ? `<tr>
        <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; width: 140px; vertical-align: top; border-bottom: 1px solid #f1f5f9;">Reference ID</td>
        <td style="padding: 10px 14px; font-size: 12px; font-family: monospace; color: #475569; border-bottom: 1px solid #f1f5f9;">${safeRef}</td>
      </tr>`
    : "";

  const detailsBlock = safeDetails
    ? `<div style="margin-top: 18px; padding: 14px 16px; background-color: #f8fafc; border-left: 3px solid #0038A8; border-radius: 6px;">
        <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Remarks / Submission Summary</p>
        <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #334155; white-space: pre-wrap;">${safeDetails}</p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} - ${safeSystemName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0038A8 0%, #002266 100%); padding: 24px 32px; text-align: left;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #93c5fd; margin-bottom: 4px;">
                      ${safeOfficeAcronym} &bull; Administrative Alert
                    </div>
                    <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      ${safeSystemName} Management Portal
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <!-- Event Badge & Title -->
              <div style="margin-bottom: 20px;">
                <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 9999px; background-color: ${params.badgeBg}; color: ${params.badgeColor}; border: 1px solid ${params.badgeBorder}; margin-bottom: 12px;">
                  ${safeBadge}
                </span>
                <h1 style="margin: 0; font-size: 19px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                  ${safeTitle}
                </h1>
                <p style="margin: 6px 0 0 0; font-size: 13px; color: #64748b;">
                  Logged on ${safeTimestamp} (PHT)
                </p>
              </div>

              <!-- Key Attributes Table -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
                ${orgRow}
                ${subjectRow}
                ${amountRow}
                ${refRow}
                <tr>
                  <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; width: 140px; vertical-align: top;">Official Recipient</td>
                  <td style="padding: 10px 14px; font-size: 13px; color: #0038A8; font-weight: 600;">${safeSupportEmail}</td>
                </tr>
              </table>

              ${detailsBlock}

              <!-- Action Button -->
              <div style="margin-top: 28px; text-align: center;">
                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 28px; background-color: #0038A8; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 56, 168, 0.2);">
                  ${safeActionLabel} &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #475569;">
                ${safeOfficeName}
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                This is an automated administrative notification dispatched by ${safeSystemName}.<br>
                Notification routing preferences are dynamically configured in Admin &rarr; Settings.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Edge Function Entrypoint
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Only POST is accepted." }, 405);
  }

  try {
    // 1. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[send-admin-notification] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
      return jsonResponse({ error: "Server misconfiguration." }, 500);
    }

    const supabaseAdmin: SupabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 2. Caller Authentication Check (Cryptographic JWT / Admin Token / Service Key)
    const auth = await authorizeCaller(req, supabaseAdmin);
    if (!auth.authorized) {
      console.warn("[send-admin-notification] Unauthorized caller rejected:", auth.reason);
      return jsonResponse({ error: auth.reason || "Unauthorized" }, 401);
    }

    // 3. Parse & Validate Payload Schema
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON request body." }, 400);
    }

    if (!rawBody || typeof rawBody !== "object") {
      return jsonResponse({ error: "Request body must be a JSON object." }, 400);
    }

    const rawPayload = rawBody as Record<string, unknown>;
    const eventType = String(rawPayload.eventType || "").trim() as AdminNotificationEventType;

    if (!VALID_EVENT_TYPES.has(eventType)) {
      return jsonResponse(
        {
          error: `Invalid or unsupported eventType '${eventType}'. Allowed events: ${Array.from(VALID_EVENT_TYPES).join(", ")}`,
        },
        400,
      );
    }

    // Sanitize payload fields
    const sanitizedPayload: AdminNotificationPayload = {
      eventType,
      organizationId: sanitizeText(rawPayload.organizationId, 100) || undefined,
      organizationName: sanitizeText(rawPayload.organizationName, 200) || undefined,
      referenceId: sanitizeText(rawPayload.referenceId, 100) || undefined,
      subject: sanitizeText(rawPayload.subject, 300) || undefined,
      details: sanitizeText(rawPayload.details, 4000) || undefined,
      amount:
        typeof rawPayload.amount === "number" && !Number.isNaN(rawPayload.amount) && rawPayload.amount >= 0
          ? rawPayload.amount
          : undefined,
    };

    // 4. Validate Organization User Authorization & Record Ownership
    const eventAuth = await authorizeAndResolveEventContext(supabaseAdmin, auth, sanitizedPayload);
    if (!eventAuth.authorized || !eventAuth.context) {
      console.warn("[send-admin-notification] Event authorization rejected:", eventAuth.error);
      return jsonResponse({ error: eventAuth.error || "Forbidden" }, 403);
    }

    const validatedPayload = eventAuth.context;
    console.log(`[send-admin-notification] Authorized notification event: ${eventType} (callerType: ${auth.callerType})`);

    // 5. Fetch Dynamic System Settings from public.admin_system_settings
    const settings = await fetchAdminNotificationSettings(supabaseAdmin, eventType);

    console.log(
      `[send-admin-notification] Settings resolved: supportEmail='${settings.supportEmail}', sendWorkflowEmails=${settings.sendWorkflowEmails}, eventEmail=${settings.eventEmailEnabled}, eventInApp=${settings.eventInAppEnabled}`,
    );

    const eventMeta = getEventMetadata(eventType, settings.adminPortalUrl, validatedPayload);
    const formattedDate = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      dateStyle: "medium",
      timeStyle: "short",
    });

    // 6. In-App Notification Channel (Authoritative producer for Admin Accounts with deduplication)
    let inAppCreatedCount = 0;
    if (settings.eventInAppEnabled) {
      try {
        const { data: admins, error: adminErr } = await supabaseAdmin
          .from("admin_accounts")
          .select("id")
          .eq("status", "active");

        if (adminErr) {
          console.warn("[send-admin-notification] Could not fetch active admins for in-app alert:", adminErr.message);
        } else if (admins && admins.length > 0) {
          // Check for recent duplicate within 2 minutes to prevent rapid retry duplicates
          const dedupeCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
          let existingCount = 0;

          if (validatedPayload.referenceId) {
            const { count } = await supabaseAdmin
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("related_type", eventMeta.relatedType)
              .eq("related_id", validatedPayload.referenceId)
              .gte("created_at", dedupeCutoff);
            existingCount = count || 0;
          }

          if (existingCount === 0) {
            const inAppRows = admins.map((admin) => ({
              user_id: admin.id,
              organization_id: validatedPayload.organizationId || null,
              title: eventMeta.title,
              message: validatedPayload.subject
                ? `${validatedPayload.subject} (${validatedPayload.organizationName || "Youth Organization"})`
                : `${eventMeta.title} submitted by ${validatedPayload.organizationName || "Youth Organization"}.`,
              type: "announcement",
              related_type: eventMeta.relatedType,
              related_id: validatedPayload.referenceId || null,
              is_read: false,
            }));

            const { error: insertErr } = await supabaseAdmin.from("notifications").insert(inAppRows);
            if (insertErr) {
              console.warn("[send-admin-notification] Failed to insert in-app notifications:", insertErr.message);
            } else {
              inAppCreatedCount = inAppRows.length;
              console.log(`[send-admin-notification] Created ${inAppCreatedCount} in-app notification rows.`);
            }
          } else {
            console.log(`[send-admin-notification] In-app notification skipped due to recent deduplication match.`);
          }
        }
      } catch (inAppErr) {
        console.warn("[send-admin-notification] In-app notification error (non-fatal):", inAppErr);
      }
    } else {
      console.log(`[send-admin-notification] In-app notification skipped (notifications.${eventType}.in_app is false).`);
    }

    // 7. Check Email Channel Gating
    const shouldSendEmail = settings.sendWorkflowEmails && settings.eventEmailEnabled;

    if (!shouldSendEmail) {
      console.log(
        `[send-admin-notification] Email delivery skipped by gating: sendWorkflowEmails=${settings.sendWorkflowEmails}, eventEmailEnabled=${settings.eventEmailEnabled}`,
      );
      return jsonResponse({
        success: true,
        event: eventType,
        emailSent: false,
        reason: "gating_disabled",
        inAppCreated: inAppCreatedCount,
      });
    }

    // 8. Authoritative Support Email Validation
    const supportEmail = settings.supportEmail?.trim();
    if (!isValidEmail(supportEmail)) {
      console.warn(
        `[send-admin-notification] Email delivery skipped: invalid or missing general.support_email setting ('${supportEmail}').`,
      );
      return jsonResponse({
        success: true,
        event: eventType,
        emailSent: false,
        reason: "invalid_or_missing_support_email",
        supportEmail: supportEmail || null,
        inAppCreated: inAppCreatedCount,
      });
    }

    // 9. Brevo Transactional Email Dispatch
    // System sender is verified: BREVO_SENDER_EMAIL || "noreply@ytrace.app"
    const brevoApiKey = Deno.env.get("BREVO_API_KEY") || Deno.env.get("SMTP_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "noreply@ytrace.app";
    const senderName = settings.senderName || Deno.env.get("BREVO_SENDER_NAME") || "Y-TRACE";
    const replyToAddress = isValidEmail(settings.replyToEmail)
      ? settings.replyToEmail
      : (isValidEmail(supportEmail) ? supportEmail : senderEmail);

    const emailSubject = `[${settings.systemName}] ${eventMeta.defaultSubject}`;
    const emailHtml = generateAdminEmailHtml({
      systemName: settings.systemName,
      officeName: settings.officeName,
      officeAcronym: settings.officeAcronym,
      supportEmail,
      title: eventMeta.title,
      badge: eventMeta.badge,
      badgeBg: eventMeta.badgeBg,
      badgeColor: eventMeta.badgeColor,
      badgeBorder: eventMeta.badgeBorder,
      actionUrl: eventMeta.actionUrl,
      actionLabel: eventMeta.actionLabel,
      organizationName: validatedPayload.organizationName,
      referenceId: validatedPayload.referenceId,
      subject: validatedPayload.subject,
      details: validatedPayload.details,
      amount: validatedPayload.amount,
      timestamp: formattedDate,
    });

    let emailSent = false;
    let providerStatus: number | null = null;
    let providerMessageId: string | null = null;
    let providerError: string | null = null;

    if (brevoApiKey) {
      console.log(`[send-admin-notification] Dispatching Brevo email to authoritative recipient: ${supportEmail} (From: ${senderEmail})`);
      try {
        const brevoPayload = {
          sender: { name: senderName, email: senderEmail },
          replyTo: { email: replyToAddress, name: senderName },
          to: [{ email: supportEmail, name: `${settings.officeAcronym} Official Support` }],
          subject: emailSubject,
          htmlContent: emailHtml,
        };

        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": brevoApiKey,
            accept: "application/json",
          },
          body: JSON.stringify(brevoPayload),
        });

        providerStatus = brevoRes.status;

        if (!brevoRes.ok) {
          const errText = await brevoRes.text();
          providerError = `Brevo status ${brevoRes.status}: ${errText}`;
          console.error("[send-admin-notification] Brevo API error:", providerError);
          emailSent = false;
        } else {
          const resJson = await brevoRes.json().catch(() => ({}));
          providerMessageId = resJson?.messageId || null;
          emailSent = true;
          console.log(`[send-admin-notification] Brevo email sent successfully to ${supportEmail}. Message ID: ${providerMessageId}`);
        }
      } catch (netErr) {
        providerError = netErr instanceof Error ? netErr.message : "Network error";
        console.error("[send-admin-notification] Network send error to Brevo:", providerError);
        emailSent = false;
      }
    } else {
      providerError = "BREVO_API_KEY is not configured in Edge Function environment secrets.";
      console.warn(`[send-admin-notification] ${providerError}`);
      emailSent = false;
    }

    // 10. Activity Log Audit
    try {
      await supabaseAdmin.from("activity_logs").insert({
        action: "admin_notification_dispatched",
        related_type: eventType,
        related_id: validatedPayload.referenceId || null,
        organization_id: validatedPayload.organizationId || null,
        description: `Admin notification (${eventType}) processed. Recipient: ${supportEmail}. Email sent: ${emailSent}. In-app created: ${inAppCreatedCount}.${providerError ? ` Provider notice: ${providerError}` : ""}`,
      });
    } catch {
      // Non-fatal
    }

    return jsonResponse({
      success: true,
      event: eventType,
      emailSent,
      recipient: supportEmail,
      providerStatus,
      providerMessageId,
      providerError,
      inAppCreated: inAppCreatedCount,
    });
  } catch (err) {
    console.error("[send-admin-notification] Uncaught error:", err);
    return jsonResponse(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal error processing notification",
      },
      500,
    );
  }
});
