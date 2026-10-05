import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createBackupControlHandler } from "./control.ts";

// Custom admin sessions are authoritative; the browser's Supabase bearer JWT is not an admin grant.
Deno.serve(createBackupControlHandler({
  env: name => Deno.env.get(name),
  fetch: globalThis.fetch,
  authorize: async token => {
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return null;
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.rpc("validate_admin_session_token", { _session_token: token });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row?.admin_id) return null;
    const account = await db.from("admin_accounts").select("id, is_active, roles(code, permission_codes)").eq("id", row.admin_id).maybeSingle();
    if (account.error || !account.data?.is_active) return null;
    const role = Array.isArray(account.data.roles) ? account.data.roles[0] : account.data.roles;
    if (!role?.code) return null;
    return { id: account.data.id, roleCode: role.code, permissionCodes: role.permission_codes ?? [] };
  },
  guard: async (token, operation, leaseId) => {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data, error } = await db.rpc("admin_backup_dispatch_guard", {
      _session_token: token, _operation: operation, _lease_id: leaseId ?? null,
    });
    if (error || !data || typeof data !== "object") throw new Error("Backup coordination unavailable");
    return data;
  },
  audit: async (token, metadata) => {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data, error } = await db.rpc("create_admin_activity_log", {
      _session_token: token, _organization_id: null, _action: "backup_requested", _related_type: "system_backup",
      _related_id: null, _description: "Requested a Y-TRACE system backup.", _category: "config", _metadata: metadata,
    });
    if (error) return "unavailable";
    return Array.isArray(data) && data.length ? "recorded" : "disabled";
  },
}));
