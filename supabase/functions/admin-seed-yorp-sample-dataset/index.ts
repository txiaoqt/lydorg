import { createClient } from "npm:@supabase/supabase-js@2";

const FIXED_BATCH_NAME = "PCYDO-YORP-2024-2026";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-admin-session-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

type Action = "authorize" | "seed";
type BridgeError = Error & { status?: number; code?: string };
type SeedResult = Record<string, unknown>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

const bridgeError = (message: string, status: number, code: string): BridgeError =>
  Object.assign(new Error(message), { status, code });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const numberField = (result: SeedResult, key: string, fallback = 0) => {
  const value = result[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

async function authorizeSuperAdmin(client: ReturnType<typeof createClient>, sessionToken: string) {
  const { data: validationData, error: validationError } = await client.rpc("validate_admin_session_token", {
    _session_token: sessionToken,
  });
  const validationRow = Array.isArray(validationData) ? validationData[0] : validationData;
  const adminId = isRecord(validationRow) && typeof validationRow.admin_id === "string"
    ? validationRow.admin_id
    : "";

  if (validationError || !adminId) {
    throw bridgeError("Your administrator session is invalid or expired. Sign in again.", 403, "unauthorized");
  }

  const { data: account, error: accountError } = await client
    .from("admin_accounts")
    .select("role_id")
    .eq("id", adminId)
    .maybeSingle();

  if (accountError || !account?.role_id) {
    throw bridgeError("This account is not authorized to seed the YORP sample dataset.", 403, "unauthorized");
  }

  const { data: role, error: roleError } = await client
    .from("roles")
    .select("code")
    .eq("id", account.role_id)
    .maybeSingle();

  if (roleError || role?.code !== "super_admin") {
    throw bridgeError("Only a Super Admin can seed the YORP sample dataset.", 403, "permission_denied");
  }

  const { data: testEnvironment, error: environmentError } = await client.rpc(
    "is_development_or_test_environment",
  );
  if (environmentError || testEnvironment !== true) {
    throw bridgeError("YORP sample seeding is unavailable outside a configured test environment.", 403, "environment_denied");
  }

  return adminId;
}

function publicSeedResult(result: SeedResult) {
  const yearBreakdown = isRecord(result.year_breakdown) ? result.year_breakdown : {};
  return {
    success: result.success === true,
    batch_name: FIXED_BATCH_NAME,
    total_records: numberField(result, "total_records", numberField(result, "organizations")),
    created_count: numberField(result, "created_count"),
    updated_count: numberField(result, "updated_count"),
    year_breakdown: {
      "2024": numberField(yearBreakdown, "2024"),
      "2025": numberField(yearBreakdown, "2025"),
      "2026": numberField(yearBreakdown, "2026"),
    },
    organizations: numberField(result, "organizations"),
    registration_packets: numberField(result, "registration_packets"),
    document_records: numberField(result, "document_records"),
    required_documents_per_organization: numberField(result, "required_documents_per_organization"),
    organizations_document_complete: numberField(result, "organizations_document_complete"),
    missing_requirements: numberField(result, "missing_requirements"),
    duplicate_requirements: numberField(result, "duplicate_requirements"),
    budget_requests: numberField(result, "budget_requests"),
    awaiting_release: numberField(result, "awaiting_release"),
    released: numberField(result, "released"),
    liquidated: numberField(result, "liquidated"),
    renewal_test_organization_excluded: result.renewal_test_organization_excluded === true,
    timestamp: typeof result.timestamp === "string" ? result.timestamp : new Date().toISOString(),
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return json({ error: "Method not allowed.", code: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "The YORP seed service is unavailable.", code: "configuration" }, 503);
  }

  const sessionToken = request.headers.get("x-admin-session-token")?.trim() ?? "";
  if (!sessionToken) {
    return json({ error: "Your administrator session is required.", code: "unauthorized" }, 401);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "The request is invalid.", code: "invalid_request" }, 400);
  }

  if (!isRecord(payload) || Object.keys(payload).some((key) => key !== "action")) {
    return json({ error: "Only the requested YORP seed action is accepted.", code: "invalid_request" }, 400);
  }
  const action = payload.action as Action;
  if (action !== "authorize" && action !== "seed") {
    return json({ error: "The requested YORP seed action is invalid.", code: "invalid_action" }, 400);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    await authorizeSuperAdmin(serviceClient, sessionToken);

    if (action === "authorize") {
      return json({ authorized: true, operation: "yorp_sample_dataset_seed" });
    }

    const { data, error } = await serviceClient.rpc("admin_seed_yorp_sample_dataset", {
      _session_token: sessionToken,
      _batch_name: FIXED_BATCH_NAME,
    });
    if (error) {
      const diagnostic = error.message.slice(0, 500);
      console.error("YORP sample seed RPC failed", { code: error.code ?? "unknown", message: diagnostic });
      return json({
        error: "The YORP sample dataset seed RPC failed.",
        code: error.code ?? "seed_failed",
        detail: diagnostic,
      }, 502);
    }
    if (!isRecord(data)) {
      console.error("YORP sample seed RPC returned an unexpected response shape");
      return json({ error: "The YORP sample seed RPC returned an unexpected response.", code: "invalid_seed_response" }, 502);
    }

    return json(publicSeedResult(data));
  } catch (error) {
    const safeError = error as BridgeError;
    if ((safeError.status ?? 500) >= 500) {
      console.error("YORP seed authorization bridge failed", { code: safeError.code ?? "internal_error" });
    }
    return json({ error: safeError.message || "The YORP seed service is unavailable.", code: safeError.code ?? "internal_error" }, safeError.status ?? 500);
  }
});
