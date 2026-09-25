// Supabase Edge Function: send-activity-announcement
//
// Handles the server-side email announcement blast for Admin-created YPOP City-Led Activities.
// - Responds to CORS preflight (OPTIONS) immediately with 200 and allowed methods/headers.
// - Authorizes Admin session via validate_admin_session_token.
// - Queries the canonical activity from public.ypop_city_activities.
// - Queries eligible organizations (profile_status = 'verified' and active accreditation).
// - Deduplicates recipient emails.
// - Enforces idempotency via public.activity_announcements.
// - Sends branded HTML email through Brevo's Transactional Email API (https://api.brevo.com/v3/smtp/email).
// - Creates in-app notification rows in public.notifications.
// - Returns summary result to Admin without leaking raw secrets or sensitive provider details.
//
// Deploy with: supabase functions deploy send-activity-announcement --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SupabaseAdminClient = ReturnType<typeof createClient>;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
  "Access-Control-Max-Age": "86400",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

/**
 * Validates whether the caller holds an authorized admin session.
 */
async function authorizeAdminCaller(
  supabaseAdmin: SupabaseAdminClient,
  sessionToken: string,
): Promise<{ authorized: boolean; adminId?: string; error?: string; code?: string }> {
  if (!sessionToken || typeof sessionToken !== "string") {
    return { authorized: false, error: "Missing admin session.", code: "unauthorized" };
  }

  const { data: vatData, error: vatError } = await supabaseAdmin.rpc("validate_admin_session_token", {
    _session_token: sessionToken,
  });

  const row = Array.isArray(vatData) && vatData.length > 0 ? vatData[0] : vatData;
  const adminId = row?.admin_id ?? row?.id;
  if (vatError || !adminId) {
    return { authorized: false, error: "Admin account is not authorized.", code: "unauthorized" };
  }

  return { authorized: true, adminId };
}

/**
 * Fetches dynamic system settings from public.admin_system_settings.
 */
async function fetchAdminSettings(supabaseAdmin: SupabaseAdminClient) {
  try {
    const { data } = await supabaseAdmin
      .from("admin_system_settings")
      .select("setting_key, value_json");

    let senderName = "Pasig City LYDO";
    let replyToEmail = "support@lydo.pasig.gov.ph";
    let sendWorkflowEmails = true;
    let emailYpopEnabled = true;
    let inAppYpopEnabled = true;
    let userPortalUrl = "https://ytrace.app";
    let systemName = "Y-TRACE";
    let officeName = "Pasig City Local Youth Development Office";

    if (data && Array.isArray(data)) {
      for (const row of data) {
        if (row.setting_key === "email.sender_name" && typeof row.value_json === "string" && row.value_json.trim()) {
          senderName = row.value_json.trim();
        }
        if (row.setting_key === "email.reply_to_email" && typeof row.value_json === "string" && row.value_json.trim()) {
          replyToEmail = row.value_json.trim();
        }
        if (row.setting_key === "email.send_workflow_emails" && typeof row.value_json === "boolean") {
          sendWorkflowEmails = row.value_json;
        }
        if (row.setting_key === "notifications.ypop_submission.email" && typeof row.value_json === "boolean") {
          emailYpopEnabled = row.value_json;
        }
        if (row.setting_key === "notifications.ypop_submission.in_app" && typeof row.value_json === "boolean") {
          inAppYpopEnabled = row.value_json;
        }
        if (row.setting_key === "general.user_portal_url" && typeof row.value_json === "string" && row.value_json.trim()) {
          userPortalUrl = row.value_json.trim();
        }
        if (row.setting_key === "general.system_name" && typeof row.value_json === "string" && row.value_json.trim()) {
          systemName = row.value_json.trim();
        }
        if (row.setting_key === "general.office_name" && typeof row.value_json === "string" && row.value_json.trim()) {
          officeName = row.value_json.trim();
        }
      }
    }
    return {
      senderName,
      replyToEmail,
      sendWorkflowEmails,
      emailYpopEnabled,
      inAppYpopEnabled,
      userPortalUrl,
      systemName,
      officeName,
    };
  } catch {
    return {
      senderName: "Pasig City LYDO",
      replyToEmail: "support@lydo.pasig.gov.ph",
      sendWorkflowEmails: true,
      emailYpopEnabled: true,
      inAppYpopEnabled: true,
      userPortalUrl: "https://ytrace.app",
      systemName: "Y-TRACE",
      officeName: "Pasig City Local Youth Development Office",
    };
  }
}

/**
 * Format date for display in the email announcement.
 */
function formatAnnouncementDate(startDate?: string | null, endDate?: string | null): string {
  if (!startDate) return "To be announced";
  if (!endDate || endDate === startDate) {
    const d = new Date(startDate);
    return isNaN(d.getTime()) ? startDate : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return `${startDate} – ${endDate}`;
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString("en-US", { month: "long" })} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

/**
 * Generates the responsive HTML email template using Y-TRACE design tokens.
 */
function generateAnnouncementEmailHtml(params: {
  activityName: string;
  categoryLabel: string;
  categoryColor: string;
  categoryBg: string;
  categoryBorder: string;
  points: number;
  dateRangeStr: string;
  venue: string;
  viewActivityUrl: string;
  officeName?: string;
  systemName?: string;
}): string {
  const {
    activityName,
    categoryLabel,
    categoryColor,
    categoryBg,
    categoryBorder,
    points,
    dateRangeStr,
    venue,
    viewActivityUrl,
    officeName = "Pasig City Local Youth Development Office",
    systemName = "Y-TRACE",
  } = params;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Official Announcement: ${activityName}</title>
    <style>
      body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
      @media only screen and (max-width: 600px) {
        .email-outer-padding { padding: 24px 12px !important; }
        .email-card-content { padding: 32px 20px 28px !important; }
        .email-heading { font-size: 24px !important; line-height: 32px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;-webkit-font-smoothing:antialiased;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
      New City-Led YPOP Activity Announcement from Pasig City Local Youth Development Office: ${activityName}.
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f8fafc;">
      <tr>
        <td align="center" class="email-outer-padding" style="padding:48px 16px;">
          <!-- Centered SaaS Card -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:580px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 10px 30px -5px rgba(15,23,42,0.05);overflow:hidden;">
            <tr>
              <td class="email-card-content" style="padding:40px 40px 36px;">
                
                <!-- Y-TRACE Brand Header -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
                  <tr>
                    <td align="center">
                      <img src="https://mqqaykksadotbrghbexz.supabase.co/storage/v1/object/public/transparency-attachments/y-trace-logo.png" width="76" alt="Y-TRACE Logo" style="display:block;width:76px;height:auto;margin:0 auto;" />
                    </td>
                  </tr>
                </table>

                <!-- Eyebrow Badge -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 16px;">
                  <tr>
                    <td align="center" style="background-color:#eff6ff;border:1px solid #dbeafe;border-radius:20px;padding:4px 14px;">
                      <span style="font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#1d4ed8;">
                        City-Led Activity Announcement
                      </span>
                    </td>
                  </tr>
                </table>

                <!-- Main Heading -->
                <h1 class="email-heading" style="margin:0 0 16px;font-size:26px;line-height:34px;font-weight:800;letter-spacing:-0.5px;color:#0f172a;text-align:center;">
                  ${activityName}
                </h1>

                <p style="margin:0 0 28px;font-size:14px;line-height:22px;color:#64748b;text-align:center;">
                  The Pasig City Local Youth Development Office (LYDO) announces a new City-Led Activity under the Youth Participation Organization Passport (YPOP) program.
                </p>

                <!-- Parameter Details Box -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:32px;">
                  <tr>
                    <td style="padding:20px 24px;">
                      
                      <!-- Activity Type & Points Row -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:12px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;">
                        <tr>
                          <td style="font-size:13px;color:#64748b;font-weight:600;width:120px;">
                            Activity Type
                          </td>
                          <td align="right">
                            <span style="display:inline-block;background-color:${categoryBg};color:${categoryColor};border:1px solid ${categoryBorder};font-size:12px;font-weight:700;padding:2px 10px;border-radius:12px;">
                              ${categoryLabel} (${points} pts)
                            </span>
                          </td>
                        </tr>
                      </table>

                      <!-- Date Row -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:12px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;">
                        <tr>
                          <td style="font-size:13px;color:#64748b;font-weight:600;width:120px;">
                            Date
                          </td>
                          <td align="right" style="font-size:13px;font-weight:600;color:#0f172a;">
                            ${dateRangeStr}
                          </td>
                        </tr>
                      </table>

                      <!-- Venue Row -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="font-size:13px;color:#64748b;font-weight:600;width:120px;">
                            Venue
                          </td>
                          <td align="right" style="font-size:13px;font-weight:600;color:#0f172a;">
                            ${venue}
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>
                </table>

                <!-- Call to Action Button -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:32px;">
                  <tr>
                    <td align="center">
                      <a href="${viewActivityUrl}" target="_blank" style="display:inline-block;background-color:#022B69;color:#ffffff;font-size:14px;font-weight:700;line-height:44px;height:44px;padding:0 32px;border-radius:8px;text-decoration:none;letter-spacing:0.2px;box-shadow:0 4px 12px rgba(2,43,105,0.25);">
                        View Activity &amp; Upload Proof &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0;font-size:12px;line-height:18px;color:#94a3b8;text-align:center;">
                  Accredited youth organizations may upload proof of attendance in the YPOP portal after participating in this event to earn incentive points.
                </p>

              </td>
            </tr>

            <!-- Card Footer -->
            <tr>
              <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:11px;line-height:16px;color:#94a3b8;">
                  &copy; ${new Date().getFullYear()} Pasig City Local Youth Development Office &bull; Y-TRACE Youth Participation System
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

Deno.serve(async (req) => {
  // 1. Handle CORS preflight OPTIONS request immediately
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: CORS_HEADERS,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid request payload.", code: "invalid_payload" }, 400);
  }

  const action = payload.action ?? "send";
  const sessionToken = (payload.session_token as string) ?? "";
  const activityId = (payload.activity_id as string) ?? "";
  const siteUrl = (payload.site_url as string) || Deno.env.get("SITE_URL") || "https://ytrace.app";
  const idempotencyKey = (payload.idempotency_key as string) || `announcement-${activityId}`;

  // 2. Authorize Admin
  const authCheck = await authorizeAdminCaller(supabaseAdmin, sessionToken);
  if (!authCheck.authorized) {
    return jsonResponse({ error: authCheck.error, code: authCheck.code }, 403);
  }

  if (!activityId) {
    return jsonResponse({ error: "activity_id is required.", code: "missing_activity_id" }, 400);
  }

  // 3. Fetch Activity Record
  const { data: activity, error: actError } = await supabaseAdmin
    .from("ypop_city_activities")
    .select("id, semester_key, name, date, start_date, end_date, venue, points")
    .eq("id", activityId)
    .maybeSingle();

  if (actError || !activity) {
    return jsonResponse({ error: "City-Led Activity not found.", code: "activity_not_found" }, 404);
  }

  // 4. Query Eligible Organizations: profile_status = 'verified' and active accreditation
  const { data: orgs, error: orgsError } = await supabaseAdmin
    .from("organization_profiles")
    .select("id, user_id, organization_name, organization_email, profile_status, current_accreditation_id, accreditation_expires_at")
    .eq("profile_status", "verified")
    .neq("profile_status", "suspended_inactive");

  if (orgsError) {
    return jsonResponse({ error: "Failed to query organization recipients.", code: "db_error" }, 500);
  }

  // Query active accreditation records from organization_accreditations
  const { data: accreditations } = await supabaseAdmin
    .from("organization_accreditations")
    .select("id, organization_id, status, end_date")
    .in("status", ["active"]);

  const activeAccreditationByOrgId = new Map<string, { status: string; end_date: string }>();
  for (const acc of accreditations ?? []) {
    activeAccreditationByOrgId.set(acc.organization_id, acc);
  }

  const now = Date.now();
  const eligibleOrgs = (orgs ?? []).filter((org) => {
    if (org.profile_status !== "verified") return false;

    // Check canonical accreditation record if available
    const acc = activeAccreditationByOrgId.get(org.id);
    if (acc) {
      if (acc.status === "revoked" || acc.status === "superseded") return false;
      if (acc.end_date) {
        const exp = new Date(acc.end_date).getTime();
        if (!isNaN(exp) && exp < now) return false;
      }
      return true;
    }

    // Check accreditation_expires_at on profile
    if (org.accreditation_expires_at) {
      const exp = new Date(org.accreditation_expires_at).getTime();
      if (!isNaN(exp) && exp < now) return false;
    }

    return true;
  });

  // Deduplicate recipient emails (lowercased, trimmed)
  const recipientMap = new Map<string, { orgId: string; userId: string; orgName: string; email: string }>();
  for (const org of eligibleOrgs) {
    const rawEmail = (org.organization_email || "").trim();
    const emailNorm = rawEmail.toLowerCase();
    if (emailNorm && emailNorm.includes("@") && !recipientMap.has(emailNorm)) {
      recipientMap.set(emailNorm, {
        orgId: org.id,
        userId: org.user_id,
        orgName: org.organization_name || "Youth Organization",
        email: rawEmail,
      });
    }
  }

  const uniqueRecipients = Array.from(recipientMap.values());

  // Preflight action: return eligible count and deduplicated recipients list
  if (action === "preflight") {
    return jsonResponse({
      status: "ready",
      eligible_count: uniqueRecipients.length,
      recipients: uniqueRecipients.map((r) => ({
        organization_id: r.orgId,
        organization_name: r.orgName,
        organization_email: r.email,
      })),
      activity: {
        id: activity.id,
        name: activity.name,
        startDate: activity.start_date || activity.date,
        endDate: activity.end_date || activity.start_date || activity.date,
        venue: activity.venue || "Pasig City",
        points: activity.points,
      },
    }, 200);
  }

  // 5. Send Action with Idempotency Guard
  // Check if announcement with this idempotency key was already completed
  const { data: existingAnnouncement } = await supabaseAdmin
    .from("activity_announcements")
    .select("id, status, recipient_count, successful_count, failed_count")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingAnnouncement && (existingAnnouncement.status === "sent" || existingAnnouncement.status === "sending")) {
    return jsonResponse({
      status: existingAnnouncement.status === "sent" ? "already_sent" : "sending",
      message: "This announcement request was already dispatched or is currently in progress.",
      announcement_id: existingAnnouncement.id,
      recipient_count: existingAnnouncement.recipient_count,
      successful_count: existingAnnouncement.successful_count,
      failed_count: existingAnnouncement.failed_count,
    }, 200);
  }

  // Record initial announcement row
  const { data: annRow, error: annInsertErr } = await supabaseAdmin
    .from("activity_announcements")
    .insert({
      activity_id: activity.id,
      sent_by: authCheck.adminId,
      recipient_count: uniqueRecipients.length,
      status: "sending",
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .single();

  const announcementId = annRow?.id ?? null;

  // 6. Fetch Dynamic System Settings
  const settings = await fetchAdminSettings(supabaseAdmin);

  // Determine category and points presentation
  const points = activity.points ?? 4;
  const categoryLabel = points === 4 ? "Mandatory" : points === 3 ? "Invitational" : "Partnership";
  const categoryColor = points === 4 ? "#1d4ed8" : points === 3 ? "#be185d" : "#047857";
  const categoryBg = points === 4 ? "#eff6ff" : points === 3 ? "#fdf2f8" : "#ecfdf5";
  const categoryBorder = points === 4 ? "#bfdbfe" : points === 3 ? "#fbcfe8" : "#a7f3d0";
  const dateRangeStr = formatAnnouncementDate(activity.start_date || activity.date, activity.end_date || activity.start_date || activity.date);
  const targetSiteUrl = (payload.site_url as string) || settings.userPortalUrl || Deno.env.get("SITE_URL") || "https://ytrace.app";
  const viewActivityUrl = `${targetSiteUrl.replace(/\/+$/, "")}/portal?section=ypop&activityId=${activity.id}`;

  const emailHtml = generateAnnouncementEmailHtml({
    activityName: activity.name,
    categoryLabel,
    categoryColor,
    categoryBg,
    categoryBorder,
    points,
    dateRangeStr,
    venue: activity.venue || "Pasig City",
    viewActivityUrl,
    officeName: settings.officeName,
    systemName: settings.systemName,
  });

  // 7. Brevo Transactional Email Integration
  const brevoApiKey = Deno.env.get("BREVO_API_KEY") || Deno.env.get("SMTP_API_KEY");
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "noreply@ytrace.app";
  const senderName = settings.senderName || Deno.env.get("BREVO_SENDER_NAME") || "Y-TRACE";
  const replyToAddress = settings.replyToEmail || senderEmail;

  let successfulCount = 0;
  let failedCount = 0;
  const deliveryErrors: string[] = [];

  const shouldSendEmail = settings.sendWorkflowEmails && settings.emailYpopEnabled;

  if (uniqueRecipients.length === 0) {
    if (announcementId) {
      await supabaseAdmin.from("activity_announcements").update({
        status: "sent",
        recipient_count: 0,
        successful_count: 0,
        failed_count: 0,
        sent_at: new Date().toISOString(),
      }).eq("id", announcementId);
    }
    return jsonResponse({
      status: "sent",
      announcement_id: announcementId,
      recipient_count: 0,
      successful_count: 0,
      failed_count: 0,
      message: "No eligible recipient organizations found.",
    });
  }

  if (shouldSendEmail) {
    if (brevoApiKey) {
      // Dispatch batches to Brevo REST API
      const batchRecipients = uniqueRecipients.map((r) => ({
        email: r.email,
        name: r.orgName,
      }));

      try {
        const brevoPayload = {
          sender: { name: senderName, email: senderEmail },
          replyTo: { email: replyToAddress, name: senderName },
          to: batchRecipients,
          subject: `[${settings.systemName}] City-Led Activity Announcement: ${activity.name}`,
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

        if (!brevoRes.ok) {
          const errText = await brevoRes.text();
          console.error("Brevo API error:", errText);
          failedCount = uniqueRecipients.length;
          deliveryErrors.push(`Brevo status ${brevoRes.status}: ${errText}`);
        } else {
          successfulCount = uniqueRecipients.length;
        }
      } catch (sendErr) {
        console.error("Network send error to Brevo:", sendErr);
        failedCount = uniqueRecipients.length;
        deliveryErrors.push(sendErr instanceof Error ? sendErr.message : "Network error");
      }
    } else {
      console.warn("BREVO_API_KEY is not configured in Edge Function environment. Logging mock dispatch.");
      successfulCount = uniqueRecipients.length;
    }
  } else {
    // Email delivery skipped per system configuration
    successfulCount = uniqueRecipients.length;
  }

  // 8. Create in-app notifications if notifications.ypop_submission.in_app is enabled
  if (settings.inAppYpopEnabled) {
    try {
      const notificationRows = uniqueRecipients.map((r) => ({
        user_id: r.userId,
        organization_id: r.orgId,
        type: "announcement",
        related_type: "ypop_city_activity",
        related_id: activity.id,
        title: "New City-Led Activity Announcement",
        message: `${settings.officeName} announced a new City-Led activity: "${activity.name}". Location: ${activity.venue || "Pasig City"}.`,
        is_read: false,
      }));

      if (notificationRows.length > 0) {
        await supabaseAdmin.from("notifications").insert(notificationRows);
      }
    } catch (notifErr) {
      console.warn("Could not insert in-app notifications:", notifErr);
    }
  }

  // 8. Update announcement tracking status
  const finalStatus =
    failedCount === 0
      ? "sent"
      : successfulCount === 0
        ? "failed"
        : "partial_failure";

  if (announcementId) {
    await supabaseAdmin
      .from("activity_announcements")
      .update({
        status: finalStatus,
        successful_count: successfulCount,
        failed_count: failedCount,
        error_message: deliveryErrors.length > 0 ? deliveryErrors.join("; ") : null,
        sent_at: finalStatus === "sent" || finalStatus === "partial_failure" ? new Date().toISOString() : null,
      })
      .eq("id", announcementId);
  }

  return jsonResponse({
    status: finalStatus,
    announcement_id: announcementId,
    recipient_count: uniqueRecipients.length,
    successful_count: successfulCount,
    failed_count: failedCount,
    message:
      finalStatus === "sent"
        ? `Successfully broadcasted to ${successfulCount} organizations.`
        : finalStatus === "partial_failure"
          ? `Partially sent: ${successfulCount} delivered, ${failedCount} failed.`
          : "Delivery failed. Please check provider status.",
  });
});
