// Supabase Edge Function: admin-invite
//
// Handles the parts of the "Add Administrator" invite flow that require the
// service-role key (which must never reach the browser): checking email collision
// safety against active User Portal accounts, sending Supabase Auth's real Invite
// user email, resending it safely without deleting active organization accounts,
// and cleaning up the shadow auth.users row after an invite is consumed. Everything
// else (creating the pending admin_accounts row, checking who's allowed to do this)
// is done by session-token-gated Postgres RPCs that this function calls into
// with the service-role client.
//
// Deploy with: supabase functions deploy admin-invite

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SupabaseAdminClient = ReturnType<typeof createClient>;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

type AuthUserRecord = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  invited_at?: string;
  confirmed_at?: string;
  email_confirmed_at?: string;
};

/**
 * Checks whether an auth.users record belongs to an active User Portal organization account.
 * Crucial safety rule: NEVER delete or overwrite an active organization user when managing admin invites.
 */
async function checkIfActiveOrganizationUser(
  supabaseAdmin: SupabaseAdminClient,
  user: AuthUserRecord,
): Promise<boolean> {
  // 1. Check if linked to an organization profile by user_id
  const { data: orgByUserId } = await supabaseAdmin
    .from("organization_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (orgByUserId) return true;

  // 2. Check if linked to an organization profile by organization_email
  if (user.email) {
    const { data: orgByEmail } = await supabaseAdmin
      .from("organization_profiles")
      .select("id")
      .ilike("organization_email", user.email.trim())
      .maybeSingle();
    if (orgByEmail) return true;
  }

  // 3. Check if user has registered applications
  const { data: registration } = await supabaseAdmin
    .from("registrations")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (registration) return true;

  // 4. Check user metadata for User Portal specific fields
  const meta = user.user_metadata || {};
  if (
    meta.full_name ||
    meta.display_name ||
    meta.contact_number ||
    meta.barangay_id ||
    meta.municipality ||
    meta.organization_name
  ) {
    return true;
  }

  // 5. If user was never invited (i.e. self-registered youth/org user) and has confirmed
  if (!user.invited_at && (user.confirmed_at || user.email_confirmed_at)) {
    return true;
  }

  return false;
}

/**
 * Validates whether the caller holds an authorized admin session with 'administrators_management'.
 */
async function authorizeAdminCaller(
  supabaseAdmin: SupabaseAdminClient,
  sessionToken: string,
): Promise<{ authorized: boolean; error?: string; code?: string }> {
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

  const { data: adminAccount, error: adminError } = await supabaseAdmin
    .from("admin_accounts")
    .select("id, role_id, roles(permission_codes)")
    .eq("id", adminId)
    .maybeSingle();

  if (adminError || !adminAccount) {
    return { authorized: false, error: "Admin account is not authorized.", code: "unauthorized" };
  }

  const rolesObj = adminAccount.roles as { permission_codes?: string[] } | null;
  const permissionCodes = rolesObj?.permission_codes ?? [];
  if (!permissionCodes.includes("administrators_management")) {
    return {
      authorized: false,
      error: "You do not have permission to manage admin accounts.",
      code: "permission_denied",
    };
  }

  return { authorized: true };
}

/**
 * Securely resolves the Admin Portal password creation redirect URL.
 * Prevents open redirects and ensures the invitation link is directed
 * strictly to the Admin Portal (https://y-trace-admin.vercel.app or configured ADMIN_APP_URL),
 * never to the User Portal (https://ytrace.app).
 */
function resolveAdminRedirectUrl(clientOrigin?: string): string {
  const envAdminUrl = Deno.env.get("ADMIN_APP_URL") || Deno.env.get("ADMIN_SITE_URL");
  if (envAdminUrl && typeof envAdminUrl === "string" && envAdminUrl.trim()) {
    return `${envAdminUrl.trim().replace(/\/+$/, "")}/admin/create-password`;
  }

  if (clientOrigin && typeof clientOrigin === "string") {
    const trimmed = clientOrigin.trim().replace(/\/+$/, "");
    try {
      const url = new URL(trimmed);
      // Support localhost / local development ports
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        return `${trimmed}/admin/create-password`;
      }
      // Support canonical Admin Portal and Vercel admin preview domains
      if (
        url.hostname === "y-trace-admin.vercel.app" ||
        url.hostname.endsWith(".vercel.app") ||
        url.hostname.includes("admin")
      ) {
        return `${trimmed}/admin/create-password`;
      }
    } catch {
      // Ignore URL parse errors and fall back to canonical Admin Portal
    }
  }

  // Canonical production Admin Portal origin
  return "https://y-trace-admin.vercel.app/admin/create-password";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid request body.", code: "invalid_payload" }, 400);
  }

  const action = payload.action;

  try {
    // Action: Preflight check email availability
    if (action === "check_email" || action === "preflight") {
      const { session_token, email } = payload as { session_token: string; email: string };
      if (!email || typeof email !== "string") {
        return jsonResponse({ error: "Email is required.", code: "invalid_payload" }, 400);
      }

      const authCheck = await authorizeAdminCaller(supabaseAdmin, session_token);
      if (!authCheck.authorized) {
        return jsonResponse({ error: authCheck.error, code: authCheck.code }, 403);
      }

      const normalizedEmail = email.trim().toLowerCase();

      // 1. Check if email exists in public.admin_accounts
      const { data: adminMatch } = await supabaseAdmin
        .from("admin_accounts")
        .select("id")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (adminMatch) {
        return jsonResponse({
          status: "admin_exists",
          message: "An administrator with this email already exists.",
        }, 200);
      }

      // 2. Check if email exists in auth.users
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = userList?.users.find((u) => u.email?.toLowerCase() === normalizedEmail);

      if (existingUser) {
        const isOrgUser = await checkIfActiveOrganizationUser(supabaseAdmin, existingUser);
        if (isOrgUser) {
          return jsonResponse({
            status: "user_exists",
            message: "This email address is already registered to an organization account. Please use a different email address.",
          }, 200);
        }

        return jsonResponse({
          status: "shadow_admin",
          message: "An unconfirmed administrator invitation shadow record exists.",
        }, 200);
      }

      return jsonResponse({ status: "available" }, 200);
    }

    if (action === "create") {
      const { session_token, display_name, email, username, role_id, unit_id, redirect_origin } = payload as {
        session_token: string;
        display_name: string;
        email: string;
        username: string;
        role_id: number;
        unit_id: number;
        redirect_origin: string;
      };

      if (!session_token || !display_name?.trim() || !email?.trim() || !username?.trim() || role_id == null || unit_id == null) {
        return jsonResponse({ error: "Please fill in all required fields.", code: "invalid_payload" }, 400);
      }

      const authCheck = await authorizeAdminCaller(supabaseAdmin, session_token);
      if (!authCheck.authorized) {
        return jsonResponse({ error: authCheck.error, code: authCheck.code }, 403);
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check public.admin_accounts before calling RPC
      const { data: existingAdmin } = await supabaseAdmin
        .from("admin_accounts")
        .select("id")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (existingAdmin) {
        return jsonResponse({
          error: "An administrator with that email already exists. Please use a different email address.",
          code: "admin_email_exists",
        }, 400);
      }

      // Check auth.users before calling create_admin_account
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = userList?.users.find((u) => u.email?.toLowerCase() === normalizedEmail);

      if (existingUser) {
        const isOrgUser = await checkIfActiveOrganizationUser(supabaseAdmin, existingUser);
        if (isOrgUser) {
          return jsonResponse({
            error: "This email address is already registered to an organization account. Please use a different email address.",
            code: "email_in_use_by_user",
          }, 400);
        }

        // If it's an unconfirmed/abandoned shadow admin invite, safely remove it so the new invite can proceed
        try {
          await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
        } catch (delErr) {
          console.warn("Unable to remove previous shadow admin invite in auth.users:", delErr);
        }
      }

      // Invoke RPC create_admin_account
      const { data, error: createError } = await supabaseAdmin.rpc("create_admin_account", {
        _session_token: session_token,
        _display_name: display_name.trim(),
        _email: normalizedEmail,
        _username: username.trim(),
        _role_id: role_id,
        _unit_id: unit_id,
      });

      if (createError) {
        if (/username/i.test(createError.message) && /duplicate/i.test(createError.message)) {
          return jsonResponse({ error: "That username is already taken.", code: "username_exists" }, 400);
        }
        if (/email/i.test(createError.message) && /duplicate/i.test(createError.message)) {
          return jsonResponse({
            error: "An administrator with that email already exists. Please use a different email address.",
            code: "admin_email_exists",
          }, 400);
        }
        return jsonResponse({ error: createError.message, code: "create_failed" }, 400);
      }

      const createdRow = Array.isArray(data) ? data[0] : null;
      if (!createdRow) {
        return jsonResponse({ error: "Failed to create the administrator account.", code: "create_failed" }, 400);
      }

      // Send the invite email via GoTrue
      const targetRedirect = resolveAdminRedirectUrl(redirect_origin);
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo: targetRedirect,
      });

      if (inviteError) {
        // Compensating rollback: delete newly created admin account
        try {
          const { error: rollbackError } = await supabaseAdmin.rpc("delete_admin_account", {
            _session_token: session_token,
            _admin_id_to_delete: createdRow.id,
          });
          if (rollbackError) {
            console.error("Rollback failed for admin account ID:", createdRow.id, rollbackError);
          }
        } catch (rbEx) {
          console.error("Exception during rollback for admin account ID:", createdRow.id, rbEx);
        }

        return jsonResponse({
          error: `The administrator account could not be invited right now: ${inviteError.message}`,
          code: "invite_failed",
        }, 400);
      }

      return jsonResponse({ administrator: createdRow }, 200);
    }

    if (action === "resend") {
      const { session_token, admin_id, redirect_origin } = payload as {
        session_token: string;
        admin_id: string;
        redirect_origin: string;
      };

      if (!session_token || !admin_id) {
        return jsonResponse({ error: "Missing required parameters.", code: "invalid_payload" }, 400);
      }

      const authCheck = await authorizeAdminCaller(supabaseAdmin, session_token);
      if (!authCheck.authorized) {
        return jsonResponse({ error: authCheck.error, code: authCheck.code }, 403);
      }

      const { data: email, error: emailError } = await supabaseAdmin.rpc("get_pending_administrator_email", {
        _session_token: session_token,
        _admin_id_to_invite: admin_id,
      });

      if (emailError || !email) {
        return jsonResponse({ error: emailError?.message ?? "Unable to resend the invite.", code: "admin_not_found" }, 400);
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find((user) => user.email?.toLowerCase() === normalizedEmail);

      if (existingUser) {
        const isOrgUser = await checkIfActiveOrganizationUser(supabaseAdmin, existingUser);
        if (isOrgUser) {
          return jsonResponse({
            error: "This email address belongs to an existing organization account and cannot be reused for an administrator invitation.",
            code: "email_in_use_by_user",
          }, 400);
        }

        // Only delete unconfirmed shadow user if safe
        try {
          await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
        } catch (delErr) {
          console.warn("Unable to remove previous shadow admin invite in auth.users:", delErr);
        }
      }

      const targetRedirect = resolveAdminRedirectUrl(redirect_origin);
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo: targetRedirect,
      });

      if (inviteError) {
        return jsonResponse({ error: `Could not resend the invite email: ${inviteError.message}`, code: "invite_failed" }, 400);
      }

      return jsonResponse({ success: true }, 200);
    }

    if (action === "finalize") {
      const authHeader = req.headers.get("Authorization") ?? "";
      const jwt = authHeader.replace(/^Bearer\s+/i, "");
      if (!jwt) return jsonResponse({ error: "Missing session.", code: "unauthorized" }, 401);

      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
      if (userError || !userData?.user) return jsonResponse({ error: "Invalid session.", code: "unauthorized" }, 401);

      // Guard: NEVER delete if this user is linked to an organization account
      const isOrgUser = await checkIfActiveOrganizationUser(supabaseAdmin, userData.user);
      if (isOrgUser) {
        return jsonResponse({ success: true }, 200);
      }

      // Safe cleanup of shadow admin user
      try {
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      } catch (delErr) {
        console.warn("Unable to delete shadow admin user:", delErr);
      }

      return jsonResponse({ success: true }, 200);
    }

    return jsonResponse({ error: "Unknown action.", code: "unknown_action" }, 400);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error.", code: "server_error" }, 500);
  }
});
