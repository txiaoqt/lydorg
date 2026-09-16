import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-session-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const missingRelationCodes = new Set(["42P01", "PGRST205"]);
const allowedBuckets = new Set([
  "organization-documents",
  "budget-request-files",
  "liquidation-report-files",
  "ypop-files",
]);

type Action = "preflight" | "delete";
type OrganizationTarget = {
  id: string;
  user_id: string;
  organization_name: string;
  organization_email: string;
};
type FileRow = { file_url?: string | null; revision_history?: unknown };
type DeletionCounts = {
  documentSubmissions: number;
  documentFiles: number;
  budgetRequests: number;
  budgetFiles: number;
  liquidationReports: number;
  liquidationFiles: number;
  ypopEntries: number;
  ypopFiles: number;
  ypopParticipations: number;
  ypopActivities: number;
  inquiries: number;
  notifications: number;
  complianceRemarks: number;
  activityLogs: number;
  storageObjects: number;
};
type StorageObject = { bucket: string; path: string };
type DeletionManifest = {
  organization: OrganizationTarget;
  counts: DeletionCounts;
  storageObjects: StorageObject[];
};

class SafeDeletionError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly stage = "preflight",
  ) {
    super(message);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });

const normalizeConfirmation = (value: string) => value.trim().replace(/\s+/g, " ");

const isMissingRelation = (error: { code?: string } | null) =>
  Boolean(error?.code && missingRelationCodes.has(error.code));

const collectStorageStrings = (value: unknown, result: string[] = []): string[] => {
  if (typeof value === "string") {
    if (value.startsWith("storage://") || value.includes("/storage/v1/object/")) result.push(value);
    return result;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStorageStrings(item, result));
    return result;
  }
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => collectStorageStrings(item, result));
  }
  return result;
};

const parseStorageReference = (value: string, supabaseUrl: string): StorageObject | null => {
  if (value.startsWith("storage://")) {
    const remainder = value.slice("storage://".length);
    const separator = remainder.indexOf("/");
    if (separator <= 0) return null;
    return { bucket: remainder.slice(0, separator), path: remainder.slice(separator + 1) };
  }

  try {
    const parsed = new URL(value);
    if (parsed.origin !== new URL(supabaseUrl).origin) return null;
    const match = parsed.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
};

const getRows = async <T>(
  client: ReturnType<typeof createClient>,
  table: string,
  select: string,
  column: string,
  value: string | string[],
  optional = false,
): Promise<T[]> => {
  if (Array.isArray(value) && value.length === 0) return [];
  const query = client.from(table).select(select);
  const result = Array.isArray(value) ? await query.in(column, value) : await query.eq(column, value);
  if (result.error) {
    if (optional && isMissingRelation(result.error)) return [];
    throw new SafeDeletionError("The organization deletion summary could not be prepared.", 500, "preflight");
  }
  return (result.data as T[] | null) ?? [];
};

const listStoragePrefix = async (
  client: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<string[]> => {
  const discovered: string[] = [];
  let offset = 0;
  const pageSize = 100;

  while (true) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) {
      if (/bucket.*not found|not found.*bucket/i.test(error.message ?? "")) return discovered;
      throw new SafeDeletionError(
        "Some uploaded files could not be prepared for removal. No account was deleted.",
        500,
        "storage_preflight",
      );
    }
    const entries = data ?? [];
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id == null) {
        discovered.push(...await listStoragePrefix(client, bucket, path));
      } else {
        discovered.push(path);
      }
    }
    if (entries.length < pageSize) break;
    offset += pageSize;
  }

  return discovered;
};

const addExpectedStorageReference = (
  value: string,
  supabaseUrl: string,
  expectedBucket: string,
  allowedPrefixes: Set<string>,
  output: Map<string, StorageObject>,
) => {
  const parsed = parseStorageReference(value, supabaseUrl);
  const pathSegments = parsed?.path.split("/") ?? [];
  const containsControlCharacter = [...(parsed?.path ?? "")]
    .some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    });
  const safePath = Boolean(
    parsed &&
    parsed.path &&
    !parsed.path.startsWith("/") &&
    !parsed.path.includes("\\") &&
    !containsControlCharacter &&
    pathSegments.every((segment) => segment && segment !== "." && segment !== ".."),
  );
  const owned = parsed &&
    safePath &&
    parsed.bucket === expectedBucket &&
    allowedBuckets.has(parsed.bucket) &&
    [...allowedPrefixes].some((prefix) => parsed.path === prefix || parsed.path.startsWith(`${prefix}/`));
  if (!owned || !parsed) {
    throw new SafeDeletionError(
      "Some uploaded files could not be safely matched to this organization. No account was deleted.",
      409,
      "storage_preflight",
    );
  }
  output.set(`${parsed.bucket}/${parsed.path}`, parsed);
};

const buildDeletionManifest = async (
  client: ReturnType<typeof createClient>,
  organization: OrganizationTarget,
  supabaseUrl: string,
): Promise<DeletionManifest> => {
  const documentSubmissions = await getRows<{ id: string }>(
    client, "document_submissions", "id", "organization_id", organization.id,
  );
  const budgetRequests = await getRows<{ id: string }>(
    client, "budget_requests", "id", "organization_id", organization.id,
  );
  const liquidationReports = await getRows<{ id: string }>(
    client, "liquidation_reports", "id", "organization_id", organization.id,
  );
  const ypopEntries = await getRows<{ id: string }>(
    client, "ypop_entries", "id", "organization_id", organization.id,
  );
  const ypopParticipations = await getRows<{ id: string }>(
    client, "ypop_event_participations", "id", "organization_id", organization.id, true,
  );
  const ypopActivities = await getRows<{ id: string }>(
    client, "ypop_org_activities", "id", "organization_id", organization.id, true,
  );

  const [
    documentFiles,
    budgetFiles,
    liquidationFiles,
    ypopFiles,
    ypopEventFiles,
    ypopActivityFiles,
    inquiries,
    notifications,
    complianceRemarks,
    activityLogs,
  ] = await Promise.all([
    getRows<FileRow>(
      client,
      "document_submission_files",
      "file_url,revision_history",
      "submission_id",
      documentSubmissions.map(({ id }) => id),
    ),
    getRows<FileRow>(
      client, "budget_request_files", "file_url", "budget_request_id", budgetRequests.map(({ id }) => id),
    ),
    getRows<FileRow>(
      client,
      "liquidation_report_files",
      "file_url",
      "liquidation_report_id",
      liquidationReports.map(({ id }) => id),
    ),
    getRows<FileRow>(client, "ypop_files", "file_url", "organization_id", organization.id, true),
    getRows<FileRow>(client, "ypop_event_files", "file_url", "organization_id", organization.id, true),
    getRows<FileRow>(client, "ypop_org_activity_files", "file_url", "organization_id", organization.id, true),
    getRows<{ id: string }>(client, "inquiries", "id", "organization_id", organization.id),
    getRows<{ id: string }>(client, "notifications", "id", "organization_id", organization.id),
    getRows<{ id: string }>(client, "compliance_remarks", "id", "organization_id", organization.id),
    getRows<{ id: string }>(client, "activity_logs", "id", "organization_id", organization.id),
  ]);

  const storageObjects = new Map<string, StorageObject>();
  const documentPrefixes = new Set([organization.id]);
  const budgetPrefixes = new Set(budgetRequests.map(({ id }) => id));
  const liquidationPrefixes = new Set(liquidationReports.map(({ id }) => id));
  const ypopPrefixes = new Set([
    ...ypopEntries.map(({ id }) => id),
    ...ypopParticipations.map(({ id }) => id),
    ...ypopActivities.map(({ id }) => id),
  ]);

  for (const row of documentFiles) {
    const values = [
      ...(row.file_url ? [row.file_url] : []),
      ...collectStorageStrings(row.revision_history),
    ];
    values.forEach((value) =>
      addExpectedStorageReference(value, supabaseUrl, "organization-documents", documentPrefixes, storageObjects)
    );
  }
  budgetFiles.forEach(({ file_url }) => {
    if (file_url) addExpectedStorageReference(
      file_url, supabaseUrl, "budget-request-files", budgetPrefixes, storageObjects,
    );
  });
  liquidationFiles.forEach(({ file_url }) => {
    if (file_url) addExpectedStorageReference(
      file_url, supabaseUrl, "liquidation-report-files", liquidationPrefixes, storageObjects,
    );
  });
  [...ypopFiles, ...ypopEventFiles, ...ypopActivityFiles].forEach(({ file_url }) => {
    if (file_url) addExpectedStorageReference(file_url, supabaseUrl, "ypop-files", ypopPrefixes, storageObjects);
  });

  const folderManifests: Array<[string, Set<string>]> = [
    ["organization-documents", documentPrefixes],
    ["budget-request-files", budgetPrefixes],
    ["liquidation-report-files", liquidationPrefixes],
    ["ypop-files", ypopPrefixes],
  ];
  for (const [bucket, prefixes] of folderManifests) {
    for (const prefix of prefixes) {
      const paths = await listStoragePrefix(client, bucket, prefix);
      paths.forEach((path) => storageObjects.set(`${bucket}/${path}`, { bucket, path }));
    }
  }

  const counts: DeletionCounts = {
    documentSubmissions: documentSubmissions.length,
    documentFiles: documentFiles.length,
    budgetRequests: budgetRequests.length,
    budgetFiles: budgetFiles.length,
    liquidationReports: liquidationReports.length,
    liquidationFiles: liquidationFiles.length,
    ypopEntries: ypopEntries.length,
    ypopFiles: ypopFiles.length + ypopEventFiles.length + ypopActivityFiles.length,
    ypopParticipations: ypopParticipations.length,
    ypopActivities: ypopActivities.length,
    inquiries: inquiries.length,
    notifications: notifications.length,
    complianceRemarks: complianceRemarks.length,
    activityLogs: activityLogs.length,
    storageObjects: storageObjects.size,
  };

  return { organization, counts, storageObjects: [...storageObjects.values()] };
};

const removeStorageObjects = async (
  client: ReturnType<typeof createClient>,
  objects: StorageObject[],
) => {
  const grouped = new Map<string, string[]>();
  objects.forEach(({ bucket, path }) => grouped.set(bucket, [...(grouped.get(bucket) ?? []), path]));

  for (const [bucket, paths] of grouped) {
    for (let index = 0; index < paths.length; index += 100) {
      const { error } = await client.storage.from(bucket).remove(paths.slice(index, index + 100));
      if (error) {
        throw new SafeDeletionError(
          "Some uploaded files could not be removed. No account was deleted. Retry the cleanup.",
          502,
          "storage_cleanup",
        );
      }
    }
  }
};

const removeAuthBlockingOrganizationRecords = async (
  client: ReturnType<typeof createClient>,
  organizationId: string,
) => {
  // These organization-owned tables were originally created with submitted_by
  // references that do not specify ON DELETE behavior. Remove only the target
  // organization's rows before deleting its Auth user so those constraints
  // cannot block the canonical Auth/profile cascade.
  for (const table of ["ypop_event_participations", "ypop_entries"]) {
    const { error } = await client
      .from(table)
      .delete()
      .eq("organization_id", organizationId);
    if (error && !isMissingRelation(error)) {
      console.error("Organization dependency cleanup failed", {
        organizationId,
        table,
        stage: "database_pre_auth_cleanup",
        code: error.code,
        message: error.message,
      });
      throw new SafeDeletionError(
        "The account deletion is incomplete. Retry the cleanup or contact the system administrator.",
        502,
        "database_pre_auth_cleanup",
      );
    }
  }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("delete-organization-account is missing server credentials");
    return json({ error: "The account deletion service is unavailable.", stage: "configuration" }, 503);
  }

  try {
    const adminSessionToken = request.headers.get("x-admin-session-token")?.trim() ?? "";
    if (!adminSessionToken) {
      throw new SafeDeletionError("You are not authorized to delete organization accounts.", 401, "authorization");
    }

    let payload: {
      action?: Action;
      organizationId?: string;
      confirmationName?: string;
    };
    try {
      payload = await request.json();
    } catch {
      throw new SafeDeletionError("The deletion request is invalid.", 400, "request");
    }

    const action = payload.action;
    const organizationId = payload.organizationId?.trim() ?? "";
    if ((action !== "preflight" && action !== "delete") || !uuidPattern.test(organizationId)) {
      throw new SafeDeletionError("The deletion request is invalid.", 400, "request");
    }

    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: validatedAdmins, error: adminError } = await client.rpc("validate_admin_session_token", {
      _session_token: adminSessionToken,
    });
    const admin = Array.isArray(validatedAdmins) ? validatedAdmins[0] : null;
    if (adminError || !admin?.admin_id) {
      throw new SafeDeletionError("You are not authorized to delete organization accounts.", 403, "authorization");
    }

    const { data: organization, error: organizationError } = await client
      .from("organization_profiles")
      .select("id,user_id,organization_name,organization_email")
      .eq("id", organizationId)
      .maybeSingle();
    if (organizationError) {
      throw new SafeDeletionError("The organization could not be loaded.", 500, "preflight");
    }
    if (!organization) {
      if (action === "delete") {
        const { data: completedDeletion } = await client
          .from("activity_logs")
          .select("description")
          .eq("action", "permanently_deleted_organization_account")
          .eq("related_type", "organization_account_deletion")
          .eq("related_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (completedDeletion?.description) {
          try {
            const previous = JSON.parse(completedDeletion.description) as {
              organizationName?: string;
              result?: string;
              counts?: DeletionCounts;
            };
            if (
              previous.result === "success" &&
              previous.organizationName &&
              normalizeConfirmation(payload.confirmationName ?? "") ===
                normalizeConfirmation(previous.organizationName)
            ) {
              return json({
                success: true,
                organizationId,
                counts: previous.counts,
                auditRecorded: true,
                alreadyDeleted: true,
              });
            }
          } catch {
            // A malformed audit entry must never be treated as deletion success.
          }
        }
      }
      throw new SafeDeletionError("The organization could not be found.", 404, "preflight");
    }

    const target = organization as OrganizationTarget;
    const [{ data: adminRole, error: adminRoleError }, { data: matchingAdmin, error: matchingAdminError }] =
      await Promise.all([
        client.from("roles").select("id").eq("code", "admin").maybeSingle(),
        client.from("admin_accounts").select("id").eq("email", target.organization_email).limit(1),
      ]);
    if (adminRoleError || matchingAdminError) {
      throw new SafeDeletionError("The target account type could not be verified.", 500, "authorization");
    }
    const { data: adminUserRoles, error: adminUserRoleError } = adminRole?.id
      ? await client
        .from("user_roles")
        .select("user_id")
        .eq("user_id", target.user_id)
        .eq("role_id", adminRole.id)
        .limit(1)
      : { data: [], error: null };
    if (adminUserRoleError) {
      throw new SafeDeletionError("The target account type could not be verified.", 500, "authorization");
    }
    if ((adminUserRoles?.length ?? 0) > 0 || (matchingAdmin?.length ?? 0) > 0) {
      throw new SafeDeletionError("Administrator accounts cannot be deleted from the YORP Registry.", 403, "authorization");
    }

    const manifest = await buildDeletionManifest(client, target, supabaseUrl);
    if (action === "preflight") {
      return json({
        organization: { id: target.id, name: target.organization_name },
        counts: manifest.counts,
      });
    }

    if (
      normalizeConfirmation(payload.confirmationName ?? "") !==
        normalizeConfirmation(target.organization_name)
    ) {
      throw new SafeDeletionError("The organization name does not match.", 409, "confirmation");
    }
    await removeStorageObjects(client, manifest.storageObjects);
    await removeAuthBlockingOrganizationRecords(client, target.id);

    const { error: authDeleteError } = await client.auth.admin.deleteUser(target.user_id);
    const authUserMissing = authDeleteError &&
      /user.*not found|not.*found/i.test(authDeleteError.message ?? "");
    if (authDeleteError && !authUserMissing) {
      console.error("Organization Auth deletion failed", {
        organizationId: target.id,
        stage: "auth_cleanup",
        message: authDeleteError.message,
      });
      throw new SafeDeletionError(
        "The account deletion is incomplete. Uploaded files were removed, but the account could not be deleted. Retry the cleanup or contact the system administrator.",
        502,
        "auth_cleanup",
      );
    }

    // Auth deletion is the canonical cascade. This scoped fallback also cleans
    // an orphaned profile if the Auth user had already been removed.
    const { error: profileDeleteError } = await client
      .from("organization_profiles")
      .delete()
      .eq("id", target.id)
      .eq("user_id", target.user_id);
    if (profileDeleteError) {
      console.error("Organization profile cleanup failed", {
        organizationId: target.id,
        stage: "database_cleanup",
        message: profileDeleteError.message,
      });
      throw new SafeDeletionError(
        "The account deletion is incomplete. Retry the cleanup or contact the system administrator.",
        502,
        "database_cleanup",
      );
    }

    const { data: remainingProfile, error: verifyError } = await client
      .from("organization_profiles")
      .select("id")
      .eq("id", target.id)
      .maybeSingle();
    if (verifyError || remainingProfile) {
      throw new SafeDeletionError(
        "The account deletion could not be verified. Retry the cleanup or contact the system administrator.",
        502,
        "verification",
      );
    }

    const auditDescription = JSON.stringify({
      adminId: admin.admin_id,
      organizationId: target.id,
      organizationName: target.organization_name,
      result: "success",
      counts: manifest.counts,
    });
    const { error: auditError } = await client.from("activity_logs").insert({
      actor_user_id: null,
      organization_id: null,
      action: "permanently_deleted_organization_account",
      related_type: "organization_account_deletion",
      related_id: target.id,
      description: auditDescription,
    });
    if (auditError) {
      console.error("Organization deletion audit insert failed", {
        organizationId: target.id,
        message: auditError.message,
      });
    }

    return json({
      success: true,
      organizationId: target.id,
      counts: manifest.counts,
      auditRecorded: !auditError,
    });
  } catch (error) {
    if (error instanceof SafeDeletionError) {
      return json({ error: error.message, stage: error.stage, retryable: error.status >= 500 }, error.status);
    }
    console.error("Unexpected organization deletion failure", error);
    return json({
      error: "The organization account could not be deleted. Please try again.",
      stage: "unexpected",
      retryable: true,
    }, 500);
  }
});
