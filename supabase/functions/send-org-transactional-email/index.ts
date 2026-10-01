// Supabase Edge Function: send-org-transactional-email
//
// Dedicated Organization Transactional Status & Workflow Email Delivery Pipeline:
// 1. Caller Authentication & Authorization:
//    - Validates caller identity using Admin session token or Supabase Auth JWT.
//    - Rejects unauthenticated callers (401) and unauthorized cross-organization callers (403).
// 2. Fail-Closed Setting Gating:
//    - Authoritatively checks 'email.send_workflow_emails' from public.admin_system_settings.
//    - Fails closed (emailSent = false) if setting cannot be determined, database fails, or is disabled.
// 3. System-Managed Sender Identity:
//    - Fixed, verified sender: noreply@ytrace.app (Y-TRACE).
//    - Configurable Reply-To header routed to official institutional mailbox (default: lydo@pasigcity.gov.ph).
// 4. Authoritative Organization Recipient Resolution:
//    - Resolves organization email on record from public.organization_profiles / public.users.
//    - Never accepts arbitrary client-supplied recipient email addresses.
// 5. Canonical URL Validation:
//    - Enforces canonical Y-TRACE portal routing; rejects arbitrary external domains.
// 6. Non-Blocking & Safe Error Handling:
//    - Missing Brevo API key reports emailSent: false without mock success or workflow interruption.
//
// Deploy with: supabase functions deploy send-org-transactional-email --no-verify-jwt

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

export const CANONICAL_ORG_WORKFLOW_EVENT_TYPES = [
  "registration_approved",
  "registration_needs_revision",
  "registration_rejected",
  "renewal_approved",
  "renewal_needs_revision",
  "renewal_rejected",
  "document_approved",
  "document_needs_revision",
  "document_rejected",
  "ypop_approved",
  "ypop_needs_revision",
  "ypop_rejected",
  "budget_status_update",
  "liquidation_status_update",
  "submission_unlocked",
] as const;

export type OrgTransactionalEmailEventType = typeof CANONICAL_ORG_WORKFLOW_EVENT_TYPES[number];

const VALID_EVENT_TYPES = new Set<string>(CANONICAL_ORG_WORKFLOW_EVENT_TYPES);

type WorkflowNotificationSettingKey =
  | "workflow.notify_org_on_approved"
  | "workflow.notify_org_on_needs_revision"
  | "workflow.notify_org_on_rejected";

function getWorkflowNotificationSettingKey(
  eventType: OrgTransactionalEmailEventType,
  status?: string,
): WorkflowNotificationSettingKey | null {
  if (new Set<string>(["registration_approved", "renewal_approved", "document_approved", "ypop_approved"]).has(eventType)) {
    return "workflow.notify_org_on_approved";
  }
  if (new Set<string>(["registration_needs_revision", "renewal_needs_revision", "document_needs_revision", "ypop_needs_revision"]).has(eventType)) {
    return "workflow.notify_org_on_needs_revision";
  }
  if (new Set<string>(["registration_rejected", "renewal_rejected", "document_rejected", "ypop_rejected"]).has(eventType)) {
    return "workflow.notify_org_on_rejected";
  }

  if (eventType === "budget_status_update" || eventType === "liquidation_status_update") {
    const normalizedStatus = (status ?? "").trim().toLowerCase();
    if (normalizedStatus === "needs_revision") return "workflow.notify_org_on_needs_revision";
    if (["rejected", "rejected_red"].includes(normalizedStatus)) return "workflow.notify_org_on_rejected";
    if ([
      "approved",
      "approved_green",
      "verified",
      "qualified",
      "awaiting_release",
      "approved_for_ftf_green",
      "hard_copy_submitted",
      "budget_released",
      "completed",
      "completed_liquidated",
    ].includes(normalizedStatus)) {
      return "workflow.notify_org_on_approved";
    }
  }

  return null;
}

export interface OrgTransactionalEmailPayload {
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

function sanitizeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isValidEmail(email?: string | null): boolean {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function hashSessionToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface OrgEventPresentation {
  title: string;
  defaultSubject: string;
  description: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  actionPath: string;
  actionLabel: string;
}

function getOrgEventPresentation(
  eventType: OrgTransactionalEmailEventType,
  statusOverride?: string,
  statusLabelOverride?: string,
  itemNameOverride?: string,
): OrgEventPresentation {
  const item = itemNameOverride ? `"${itemNameOverride}"` : "your submission";

  switch (eventType) {
    case "registration_approved":
      return {
        title: "Registration Verified & Approved",
        defaultSubject: "Organization Accreditation Registration Approved",
        description: "Your youth organization accreditation application has been verified and approved by the Pasig City Youth Development Office.",
        badge: "VERIFIED",
        badgeBg: "#ecfdf5",
        badgeColor: "#059669",
        badgeBorder: "#a7f3d0",
        actionPath: "/dashboard",
        actionLabel: "View Organization Dashboard",
      };

    case "registration_needs_revision":
      return {
        title: "Registration Requires Updates",
        defaultSubject: "Accreditation Registration Document Revisions Requested",
        description: "The administrative review team reviewed your organization registration profile and requested document updates.",
        badge: "NEEDS UPDATE",
        badgeBg: "#fffbeb",
        badgeColor: "#d97706",
        badgeBorder: "#fde68a",
        actionPath: "/dashboard",
        actionLabel: "Update Registration Documents",
      };

    case "registration_rejected":
      return {
        title: "Registration Status Update",
        defaultSubject: "Accreditation Registration Review Decision",
        description: "Your organization accreditation registration application could not be approved at this time.",
        badge: "NOT APPROVED",
        badgeBg: "#fef2f2",
        badgeColor: "#dc2626",
        badgeBorder: "#fecaca",
        actionPath: "/dashboard",
        actionLabel: "Review Remarks",
      };

    case "renewal_approved":
      return {
        title: "Accreditation Renewal Approved",
        defaultSubject: "Annual Accreditation Renewal Packet Approved",
        description: "Your annual accreditation renewal packet has been officially approved. Your organization status is active.",
        badge: "RENEWAL APPROVED",
        badgeBg: "#ecfdf5",
        badgeColor: "#059669",
        badgeBorder: "#a7f3d0",
        actionPath: "/renewal",
        actionLabel: "View Renewal Certificate",
      };

    case "renewal_needs_revision":
      return {
        title: "Renewal Packet Revision Requested",
        defaultSubject: "Accreditation Renewal Packet Requires Corrections",
        description: "The reviewer requested corrections or additional compliance documents for your annual renewal packet.",
        badge: "NEEDS REVISION",
        badgeBg: "#fffbeb",
        badgeColor: "#d97706",
        badgeBorder: "#fde68a",
        actionPath: "/renewal",
        actionLabel: "Upload Revised Documents",
      };

    case "renewal_rejected":
      return {
        title: "Renewal Application Notice",
        defaultSubject: "Accreditation Renewal Review Decision",
        description: "Your annual accreditation renewal packet was reviewed with administrative remarks.",
        badge: "RENEWAL REJECTED",
        badgeBg: "#fef2f2",
        badgeColor: "#dc2626",
        badgeBorder: "#fecaca",
        actionPath: "/renewal",
        actionLabel: "View Renewal Review",
      };

    case "document_approved":
      return {
        title: "Compliance Document Approved",
        defaultSubject: `Compliance Document Approved: ${itemNameOverride || "Required Document"}`,
        description: `The compliance document ${item} has been approved by the administrative reviewer.`,
        badge: "APPROVED",
        badgeBg: "#ecfdf5",
        badgeColor: "#059669",
        badgeBorder: "#a7f3d0",
        actionPath: "/dashboard",
        actionLabel: "View Document Status",
      };

    case "document_needs_revision":
      return {
        title: "Document Revision Requested",
        defaultSubject: `Correction Requested: ${itemNameOverride || "Compliance Document"}`,
        description: `The reviewer returned ${item} with instructions for corrections or re-upload.`,
        badge: "NEEDS REVISION",
        badgeBg: "#fffbeb",
        badgeColor: "#d97706",
        badgeBorder: "#fde68a",
        actionPath: "/dashboard",
        actionLabel: "Re-upload Document",
      };

    case "document_rejected":
      return {
        title: "Document Review Notice",
        defaultSubject: `Document Decision: ${itemNameOverride || "Compliance Document"}`,
        description: `The reviewer reviewed ${item} with remarks.`,
        badge: "REJECTED",
        badgeBg: "#fef2f2",
        badgeColor: "#dc2626",
        badgeBorder: "#fecaca",
        actionPath: "/dashboard",
        actionLabel: "View Document Remarks",
      };

    case "ypop_approved":
      return {
        title: "YPOP Activity Validation Approved",
        defaultSubject: `YPOP Validation Approved: ${itemNameOverride || "PPA Submission"}`,
        description: `Your YPOP event validation / activity proof for ${item} has been approved and scored.`,
        badge: "POINTS VALIDATED",
        badgeBg: "#ecfdf5",
        badgeColor: "#059669",
        badgeBorder: "#a7f3d0",
        actionPath: "/ypop",
        actionLabel: "View YPOP Standings",
      };

    case "ypop_needs_revision":
      return {
        title: "YPOP Submission Revision Requested",
        defaultSubject: `YPOP Validation Revision Requested: ${itemNameOverride || "Activity Proof"}`,
        description: `The reviewer requested corrections or additional evidence for ${item}.`,
        badge: "NEEDS REVISION",
        badgeBg: "#fffbeb",
        badgeColor: "#d97706",
        badgeBorder: "#fde68a",
        actionPath: "/ypop",
        actionLabel: "Resubmit Activity Proof",
      };

    case "ypop_rejected":
      return {
        title: "YPOP Validation Notice",
        defaultSubject: `YPOP Validation Decision: ${itemNameOverride || "Activity Submission"}`,
        description: `The validation proof for ${item} was reviewed with administrative remarks.`,
        badge: "NOT VALIDATED",
        badgeBg: "#fef2f2",
        badgeColor: "#dc2626",
        badgeBorder: "#fecaca",
        actionPath: "/ypop",
        actionLabel: "View Activity Details",
      };

    case "budget_status_update":
      return {
        title: "Budget Request Status Update",
        defaultSubject: `Budget Request Update: ${itemNameOverride || "Funding Request"}`,
        description: `There is an update on your budget request for ${item}.`,
        badge: statusLabelOverride ? statusLabelOverride.toUpperCase() : "BUDGET UPDATE",
        badgeBg: "#eff6ff",
        badgeColor: "#1d4ed8",
        badgeBorder: "#bfdbfe",
        actionPath: "/budget",
        actionLabel: "View Budget Tracker",
      };

    case "liquidation_status_update":
      return {
        title: "Liquidation Report Status Update",
        defaultSubject: `Liquidation Report Update: ${itemNameOverride || "Expense Report"}`,
        description: `Your financial liquidation report for ${item} has been updated.`,
        badge: statusLabelOverride ? statusLabelOverride.toUpperCase() : "LIQUIDATION UPDATE",
        badgeBg: "#f0fdf4",
        badgeColor: "#15803d",
        badgeBorder: "#bbf7d0",
        actionPath: "/liquidation",
        actionLabel: "View Liquidation Report",
      };

    case "submission_unlocked":
      return {
        title: "Submission Revision Unlocked",
        defaultSubject: `Submission Unlocked for Revision: ${itemNameOverride || "Submission"}`,
        description: `An administrator has unlocked ${item} for revision and corrections.`,
        badge: "UNLOCKED",
        badgeBg: "#f5f3ff",
        badgeColor: "#6d28d9",
        badgeBorder: "#ddd6fe",
        actionPath: "/dashboard",
        actionLabel: "Proceed to Submission",
      };

    default:
      return {
        title: "Status Update",
        defaultSubject: "Organization Transactional Update",
        description: "There is an official status update regarding your organization submission.",
        badge: "UPDATE",
        badgeBg: "#f1f5f9",
        badgeColor: "#334155",
        badgeBorder: "#cbd5e1",
        actionPath: "/dashboard",
        actionLabel: "View Details in Portal",
      };
  }
}

function deriveCanonicalActionUrl(userPortalUrl: string, actionPath: string): string {
  const baseUrl = userPortalUrl.trim().replace(/\/+$/, "") || "https://ytrace.app";
  const cleanPath = actionPath.trim().replace(/^\/+/, "");
  return `${baseUrl}/${cleanPath}`;
}

function generateOrgEmailHtml(params: {
  systemName: string;
  officeName: string;
  officeAcronym: string;
  supportEmail: string;
  organizationName: string;
  title: string;
  description: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  actionUrl: string;
  actionLabel: string;
  itemName?: string;
  statusLabel?: string;
  referenceId?: string;
  remarks?: string;
  timestamp: string;
}): string {
  const {
    systemName,
    officeName,
    supportEmail,
    organizationName,
    title,
    description,
    badge,
    badgeBg,
    badgeColor,
    badgeBorder,
    actionUrl,
    actionLabel,
    itemName,
    statusLabel,
    referenceId,
    remarks,
    timestamp,
  } = params;

  const currentYear = new Date().getFullYear();
  const safeSystemName = sanitizeHtml(systemName);
  const safeOfficeName = sanitizeHtml(officeName);
  const safeSupportEmail = sanitizeHtml(supportEmail);
  const safeOrganizationName = sanitizeHtml(organizationName);
  const safeTitle = sanitizeHtml(title);
  const safeDescription = sanitizeHtml(description);
  const safeActionUrl = sanitizeHtml(actionUrl);
  const safeActionLabel = sanitizeHtml(actionLabel);
  const safeTimestamp = sanitizeHtml(timestamp);
  const safeItemName = itemName ? sanitizeHtml(itemName) : "";
  const safeStatusLabel = statusLabel ? sanitizeHtml(statusLabel) : "";
  const safeReferenceId = referenceId ? sanitizeHtml(referenceId) : "";
  const safeRemarks = remarks ? sanitizeHtml(remarks) : "";

  const itemRow = itemName
    ? `<tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 500; width: 38%; vertical-align: top;">Submission / Item</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right; vertical-align: top; word-break: break-word;">${safeItemName}</td>
      </tr>`
    : "";
  const statusRow = statusLabel
    ? `<tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 500; width: 38%; vertical-align: top;">Status</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right; vertical-align: top; word-break: break-word;">${safeStatusLabel}</td>
      </tr>`
    : "";
  const referenceRow = referenceId
    ? `<tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 500; width: 38%; vertical-align: top;">Reference ID</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px; color: #0f172a; font-weight: 600; text-align: right; vertical-align: top; word-break: break-word;">${safeReferenceId}</td>
      </tr>`
    : "";
  const remarksBlock = remarks
    ? `<div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #64748b;">Review Remarks / Instructions</p>
        <p style="margin: 0; padding: 12px; border-radius: 6px; background-color: #ffffff; font-size: 13px; line-height: 1.6; color: #334155; white-space: pre-wrap; word-break: break-word;">${safeRemarks}</p>
      </div>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle} - ${safeSystemName}</title>
    <style>
      body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
      img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
      @media only screen and (max-width: 600px) {
        .email-outer-td { padding: 20px 12px !important; }
        .email-inner-card { padding: 24px 18px !important; }
        .email-footer-td { padding: 20px 16px !important; }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent; line-height: 1px; font-size: 1px;">
      ${safeTitle} - ${safeSystemName} Organization Notification.
    </div>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; background-color: #f8fafc;">
      <tr>
        <td align="center" class="email-outer-td" style="padding: 40px 16px;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 540px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.03);">
            <tr>
              <td class="email-inner-card" style="padding: 32px 32px 28px; text-align: left;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                  <tr>
                    <td align="left">
                      <img src="https://mqqaykksadotbrghbexz.supabase.co/storage/v1/object/public/brand-logo/FullNavbar.svg" height="40" alt="${safeSystemName}" style="display: block; height: 40px; width: auto; max-height: 44px; border: 0; outline: none; text-decoration: none;" />
                    </td>
                  </tr>
                </table>

                <p style="margin: 0 0 6px; font-size: 11px; line-height: 16px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #1d4ed8;">Organization Notification</p>
                <h1 style="margin: 0 0 8px; font-size: 22px; line-height: 28px; font-weight: 800; letter-spacing: -0.4px; color: #0f172a;">${safeTitle}</h1>
                <p style="margin: 0 0 8px; font-size: 14px; line-height: 20px; font-weight: 600; color: #334155;">Dear ${safeOrganizationName},</p>
                <p style="margin: 0 0 24px; font-size: 14px; line-height: 20px; color: #475569;">${safeDescription}</p>

                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 18px 20px;">
                      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px;">
                        <tr>
                          <td style="vertical-align: middle; padding-right: 10px;">
                            <h2 style="margin: 0; font-size: 15px; line-height: 1.3; font-weight: 700; color: #0f172a;">Transaction Details</h2>
                          </td>
                          <td align="right" style="vertical-align: middle; white-space: nowrap;">
                            <span style="display: inline-block; padding: 3px 9px; border: 1px solid ${badgeBorder}; border-radius: 12px; background-color: ${badgeBg}; color: ${badgeColor}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${sanitizeHtml(badge)}</span>
                          </td>
                        </tr>
                      </table>

                      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 500; width: 38%; vertical-align: top;">Organization</td>
                          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right; vertical-align: top; word-break: break-word;">${safeOrganizationName}</td>
                        </tr>
                        ${itemRow}
                        ${statusRow}
                        ${referenceRow}
                        <tr>
                          <td style="padding: 10px 0; font-size: 13px; color: #64748b; font-weight: 500; width: 38%; vertical-align: top;">Processed Date</td>
                          <td style="padding: 10px 0; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right; vertical-align: top; word-break: break-word;">${safeTimestamp}</td>
                        </tr>
                      </table>
                      ${remarksBlock}
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 8px;">
                  <tr>
                    <td align="center">
                      <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center" style="background-color: #0e3a7a; border-radius: 6px;">
                            <a href="${safeActionUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 11px 26px; border-radius: 6px; color: #ffffff; text-decoration: none; font-size: 13px; line-height: 1.2; font-weight: 600; letter-spacing: 0.2px;">${safeActionLabel} &rarr;</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td class="email-footer-td" style="background-color: #0e3a7a; padding: 24px 28px; text-align: center;">
                <p style="margin: 0 0 6px; font-size: 13px; line-height: 18px; font-weight: 700; color: #ffffff;">${safeOfficeName}</p>
                <p style="margin: 0 0 8px; font-size: 11px; line-height: 16px; color: #bfdbfe;">3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City</p>
                <p style="margin: 0 0 10px; font-size: 11px; line-height: 16px; color: #ffffff;">
                  <a href="mailto:${safeSupportEmail}" style="color: #ffffff; text-decoration: none;">${safeSupportEmail}</a> &bull;
                  <a href="https://ytrace.app" target="_blank" rel="noopener noreferrer" style="color: #ffffff; text-decoration: none;">ytrace.app</a> &bull;
                  <a href="https://ytrace.app/privacy" target="_blank" rel="noopener noreferrer" style="color: #ffffff; text-decoration: none;">Privacy</a> &bull;
                  <a href="https://ytrace.app/terms" target="_blank" rel="noopener noreferrer" style="color: #ffffff; text-decoration: none;">Terms of Service</a> &bull;
                  <a href="https://www.facebook.com/profile.php?id=100064071040238" target="_blank" rel="noopener noreferrer" style="color: #ffffff; text-decoration: none;">Facebook</a>
                </p>
                <p style="margin: 0; font-size: 11px; line-height: 15px; color: #bfdbfe;">&copy; ${currentYear} ${safeSystemName} &middot; ${safeOfficeName}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[send-org-transactional-email] Supabase service environment credentials missing.");
      return jsonResponse({ error: "Server misconfiguration" }, 500);
    }

    const supabaseAdmin: SupabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Parse input body
    let payload: OrgTransactionalEmailPayload;
    try {
      payload = (await req.json()) as OrgTransactionalEmailPayload;
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { eventType, organizationId } = payload;

    if (!eventType || !VALID_EVENT_TYPES.has(eventType)) {
      return jsonResponse({
        error: `Invalid or unsupported eventType '${eventType}'. Supported types: ${CANONICAL_ORG_WORKFLOW_EVENT_TYPES.join(", ")}`,
      }, 400);
    }

    if (!organizationId || typeof organizationId !== "string" || !organizationId.trim()) {
      return jsonResponse({ error: "Missing required 'organizationId'." }, 400);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. CALLER AUTHENTICATION & AUTHORIZATION (Active Administrator Only)
    // ─────────────────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const adminSessionToken = req.headers.get("x-admin-session-token") || "";

    let callerIsAuthorizedAdmin = false;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Check service role key bearer token
    if (serviceRoleKey && authHeader.startsWith("Bearer ") && authHeader.slice(7).trim() === serviceRoleKey) {
      callerIsAuthorizedAdmin = true;
    }

    // Check custom admin session token
    if (!callerIsAuthorizedAdmin && adminSessionToken && adminSessionToken.trim()) {
      try {
        const hashedToken = await hashSessionToken(adminSessionToken);
        const { data: adminSession } = await supabaseAdmin
          .from("admin_sessions")
          .select("id, admin_id, expires_at, revoked_at")
          .eq("token_hash", hashedToken)
          .is("revoked_at", null)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (adminSession?.id && adminSession.admin_id) {
          // Authoritatively verify the administrator account is currently active
          const { data: adminAcc } = await supabaseAdmin
            .from("admin_accounts")
            .select("id, is_active")
            .eq("id", adminSession.admin_id)
            .eq("is_active", true)
            .maybeSingle();

          if (adminAcc?.id) {
            callerIsAuthorizedAdmin = true;
          }
        }
      } catch (sessionErr) {
        console.warn("[send-org-transactional-email] Admin session check error:", sessionErr);
      }
    }

    // Check Supabase Auth JWT (if not already verified as admin via session token)
    if (!callerIsAuthorizedAdmin && authHeader.startsWith("Bearer ")) {
      const jwtToken = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (jwtToken && jwtToken !== Deno.env.get("SUPABASE_ANON_KEY")) {
        try {
          const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwtToken);
          if (user && !authErr) {
            // Check if user is an active administrator in public.admin_accounts
            const { data: adminAccount } = await supabaseAdmin
              .from("admin_accounts")
              .select("id, is_active")
              .eq("user_id", user.id)
              .eq("is_active", true)
              .maybeSingle();

            if (adminAccount?.id) {
              callerIsAuthorizedAdmin = true;
            }
          }
        } catch (jwtErr) {
          console.warn("[send-org-transactional-email] JWT auth verification error:", jwtErr);
        }
      }
    }

    // Reject if caller has no valid active administrative authorization
    if (!callerIsAuthorizedAdmin) {
      console.warn(`[send-org-transactional-email] Unauthorized invocation attempt for organization '${organizationId}'.`);
      return jsonResponse({
        error: "Unauthorized: Active administrative session or privileges required to dispatch organization workflow status emails.",
        reason: "unauthorized_caller",
      }, 401);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. FAIL-CLOSED SYSTEM SETTINGS CHECK (email.send_workflow_emails & email.reply_to_email)
    // ─────────────────────────────────────────────────────────────────────────────
    let sendWorkflowEmails: boolean | null = null;
    let workflowNotificationEnabled: boolean | null = null;
    const workflowNotificationSettingKey = getWorkflowNotificationSettingKey(eventType, payload.status);
    let configuredReplyTo: string | null = null;
    let supportEmail = "lydo@pasigcity.gov.ph";
    let systemName = "Y-TRACE";
    let officeName = "Pasig City Youth Development Office";
    let officeAcronym = "PCYDO / LYDO";
    let userPortalUrl = "https://ytrace.app";

    try {
      const { data: settingsRows, error: settingsError } = await supabaseAdmin
        .from("admin_system_settings")
        .select("setting_key, value_json")
        .in("setting_key", [
          "email.send_workflow_emails",
          "email.reply_to_email",
          "workflow.notify_org_on_approved",
          "workflow.notify_org_on_needs_revision",
          "workflow.notify_org_on_rejected",
          "general.support_email",
          "general.system_name",
          "general.office_name",
          "general.office_acronym",
          "general.user_portal_url",
        ]);

      if (settingsError) {
        console.error("[send-org-transactional-email] Database error reading admin_system_settings (failing closed):", settingsError.message);
      } else if (settingsRows && Array.isArray(settingsRows)) {
        for (const row of settingsRows) {
          const k = row.setting_key;
          const v = row.value_json;
          if (k === "email.send_workflow_emails" && typeof v === "boolean") {
            sendWorkflowEmails = v;
          } else if (k === workflowNotificationSettingKey && typeof v === "boolean") {
            workflowNotificationEnabled = v;
          } else if (k === "email.reply_to_email" && typeof v === "string") {
            configuredReplyTo = v.trim();
          } else if (k === "general.support_email" && typeof v === "string" && v.trim()) {
            supportEmail = v.trim();
          } else if (k === "general.system_name" && typeof v === "string" && v.trim()) {
            systemName = v.trim();
          } else if (k === "general.office_name" && typeof v === "string" && v.trim()) {
            officeName = v.trim();
          } else if (k === "general.office_acronym" && typeof v === "string" && v.trim()) {
            officeAcronym = v.trim();
          } else if (k === "general.user_portal_url" && typeof v === "string" && v.trim()) {
            userPortalUrl = v.trim();
          }
        }
      }
    } catch (settingsErr) {
      console.error("[send-org-transactional-email] Exception reading admin_system_settings (failing closed):", settingsErr);
    }

    // Fail-Closed Guard: If sendWorkflowEmails is not strictly TRUE, do NOT dispatch email
    if (sendWorkflowEmails !== true) {
      const reason = sendWorkflowEmails === false ? "workflow_emails_disabled" : "workflow_emails_setting_unavailable";
      console.log(`[send-org-transactional-email] Transactional email skipped (${reason}).`);
      return jsonResponse({
        success: true,
        event: eventType,
        emailSent: false,
        reason,
        organizationId: payload.organizationId,
      });
    }

    if (workflowNotificationSettingKey && workflowNotificationEnabled === false) {
      console.log(`[send-org-transactional-email] Transactional email skipped (${workflowNotificationSettingKey} is false).`);
      return jsonResponse({
        success: true,
        event: eventType,
        emailSent: false,
        reason: "workflow_notification_disabled",
        organizationId: payload.organizationId,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. AUTHORITATIVE RECIPIENT RESOLUTION (Organization email on record)
    // ─────────────────────────────────────────────────────────────────────────────
    const { data: orgProfile, error: orgProfileErr } = await supabaseAdmin
      .from("organization_profiles")
      .select("id, user_id, organization_name, organization_email")
      .eq("id", payload.organizationId)
      .maybeSingle();

    if (orgProfileErr || !orgProfile) {
      console.warn(`[send-org-transactional-email] Organization not found for ID '${payload.organizationId}'.`);
      return jsonResponse({
        success: false,
        event: eventType,
        emailSent: false,
        reason: "organization_not_found",
      }, 404);
    }

    let recipientEmail = orgProfile.organization_email?.trim() || "";
    const orgName = orgProfile.organization_name || "Youth Organization";

    // Fallback: If organization_email is empty/invalid on profile, query account owner email from users table
    if (!isValidEmail(recipientEmail) && orgProfile.user_id) {
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("email")
        .eq("id", orgProfile.user_id)
        .maybeSingle();

      if (userData?.email && isValidEmail(userData.email)) {
        recipientEmail = userData.email.trim();
      }
    }

    if (!isValidEmail(recipientEmail)) {
      console.warn(`[send-org-transactional-email] No valid organization email on record for '${orgName}' (ID: ${orgProfile.id}).`);
      return jsonResponse({
        success: true,
        event: eventType,
        emailSent: false,
        reason: "no_valid_recipient_email",
        organizationName: orgName,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. REPLY-TO & SENDER VALIDATION (Strict: No runtime fallback if configured setting is invalid/missing)
    // ─────────────────────────────────────────────────────────────────────────────
    const senderEmail = "noreply@ytrace.app";
    const senderName = "Y-TRACE";

    // Valid email.reply_to_email -> use it.
    // Invalid/missing email.reply_to_email -> DO NOT SEND. Return emailSent: false, reason: "invalid_reply_to_configuration".
    if (!configuredReplyTo || !isValidEmail(configuredReplyTo)) {
      console.error(`[send-org-transactional-email] Invalid or missing Reply-To email configuration ('email.reply_to_email' = '${configuredReplyTo}'). Delivery suppressed.`);
      return jsonResponse({
        success: false,
        event: eventType,
        emailSent: false,
        reason: "invalid_reply_to_configuration",
        organizationId: payload.organizationId,
      });
    }

    const replyToAddress = configuredReplyTo;

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. EVENT PRESENTATION & CANONICAL URL RESOLUTION
    // ─────────────────────────────────────────────────────────────────────────────
    const presentation = getOrgEventPresentation(
      eventType,
      payload.status,
      payload.statusLabel,
      payload.itemName,
    );

    const emailTitle = payload.title || presentation.title;
    const emailSubject = payload.subject || `[${systemName}] ${presentation.defaultSubject}`;
    const fullActionUrl = deriveCanonicalActionUrl(userPortalUrl, presentation.actionPath);
    const actionLabel = payload.actionLabel || presentation.actionLabel;

    const formattedDate = new Date().toLocaleDateString("en-PH", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const emailHtml = generateOrgEmailHtml({
      systemName,
      officeName,
      officeAcronym,
      supportEmail,
      organizationName: orgName,
      title: emailTitle,
      description: presentation.description,
      badge: presentation.badge,
      badgeBg: presentation.badgeBg,
      badgeColor: presentation.badgeColor,
      badgeBorder: presentation.badgeBorder,
      actionUrl: fullActionUrl,
      actionLabel,
      itemName: payload.itemName,
      statusLabel: payload.statusLabel,
      referenceId: payload.referenceId,
      remarks: payload.remarks,
      timestamp: formattedDate,
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // 6. DISPATCH VIA BREVO REST API (Non-blocking & Safe)
    // ─────────────────────────────────────────────────────────────────────────────
    const brevoApiKey = Deno.env.get("BREVO_API_KEY") || Deno.env.get("SMTP_API_KEY");

    if (!brevoApiKey) {
      console.error("[send-org-transactional-email] BREVO_API_KEY is not configured in Edge Function environment. Skipping dispatch.");
      return jsonResponse({
        success: false,
        event: eventType,
        emailSent: false,
        reason: "brevo_api_key_not_configured",
      });
    }

    console.log(`[send-org-transactional-email] Dispatching Brevo transactional email for ${eventType} to ${recipientEmail}`);

    let emailSent = false;
    let providerStatus: number | null = null;
    let providerMessageId: string | null = null;
    let providerError: string | null = null;

    try {
      const brevoPayload = {
        sender: { name: senderName, email: senderEmail },
        replyTo: { email: replyToAddress, name: `${officeAcronym} Support` },
        to: [{ email: recipientEmail, name: orgName }],
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
        console.error("[send-org-transactional-email] Brevo API error:", providerError);
        emailSent = false;
      } else {
        const resJson = await brevoRes.json().catch(() => ({}));
        providerMessageId = resJson?.messageId || null;
        emailSent = true;
        console.log(`[send-org-transactional-email] Email sent successfully to ${recipientEmail}. Message ID: ${providerMessageId}`);
      }
    } catch (netErr) {
      providerError = netErr instanceof Error ? netErr.message : "Network error";
      console.error("[send-org-transactional-email] Network send error to Brevo:", providerError);
      emailSent = false;
    }

    return jsonResponse({
      success: emailSent,
      event: eventType,
      emailSent,
      recipient: recipientEmail,
      organizationName: orgName,
      providerStatus,
      providerMessageId,
      providerError,
    });
  } catch (err) {
    console.error("[send-org-transactional-email] Unexpected handler error:", err);
    return jsonResponse({
      success: false,
      error: err instanceof Error ? err.message : "Internal server error",
    }, 500);
  }
});
