// Supabase Edge Function: admin-invite
//
// Handles the parts of the "Add Administrator" invite flow that require the
// service-role key (which must never reach the browser): sending Supabase
// Auth's real Invite user email, resending it, and cleaning up the shadow
// auth.users row after an invite is consumed. Everything else (creating the
// pending admin_accounts row, checking who's allowed to do this) is done by
// existing session-token-gated Postgres RPCs that this function calls into
// with the service-role client — it inherits their authorization checks
// rather than reimplementing them.
//
// Deploy with: supabase functions deploy admin-invite

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

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
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  const action = payload.action;

  try {
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

      const { data, error } = await supabaseAdmin.rpc("create_admin_account", {
        _session_token: session_token,
        _display_name: display_name,
        _email: email,
        _username: username,
        _role_id: role_id,
        _unit_id: unit_id,
      });

      if (error) return jsonResponse({ error: error.message }, 400);
      const createdRow = Array.isArray(data) ? data[0] : null;
      if (!createdRow) return jsonResponse({ error: "Failed to create the administrator account." }, 400);

      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${redirect_origin}/admin/create-password`,
      });

      if (inviteError) {
        await supabaseAdmin.rpc("delete_admin_account", {
          _session_token: session_token,
          _admin_id_to_delete: createdRow.id,
        });
        return jsonResponse({ error: `Could not send the invite email: ${inviteError.message}` }, 400);
      }

      return jsonResponse({ administrator: createdRow });
    }

    if (action === "resend") {
      const { session_token, admin_id, redirect_origin } = payload as {
        session_token: string;
        admin_id: string;
        redirect_origin: string;
      };

      const { data: email, error: emailError } = await supabaseAdmin.rpc("get_pending_administrator_email", {
        _session_token: session_token,
        _admin_id_to_invite: admin_id,
      });

      if (emailError || !email) {
        return jsonResponse({ error: emailError?.message ?? "Unable to resend the invite." }, 400);
      }

      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find((user) => user.email?.toLowerCase() === String(email).toLowerCase());
      if (existingUser) {
        await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      }

      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${redirect_origin}/admin/create-password`,
      });

      if (inviteError) return jsonResponse({ error: `Could not resend the invite email: ${inviteError.message}` }, 400);
      return jsonResponse({ success: true });
    }

    if (action === "finalize") {
      const authHeader = req.headers.get("Authorization") ?? "";
      const jwt = authHeader.replace(/^Bearer\s+/i, "");
      if (!jwt) return jsonResponse({ error: "Missing session." }, 401);

      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
      if (userError || !userData?.user) return jsonResponse({ error: "Invalid session." }, 401);

      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Unknown action." }, 400);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error." }, 500);
  }
});
