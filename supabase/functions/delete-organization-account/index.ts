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

const MAX_BULK_BATCH_SIZE = 25;

type Action = "preflight" | "delete" | "bulk_preflight" | "bulk_delete";

type OrganizationTarget = {
  id: string;
  user_id: string;
  organization_name: string;
  organization_email: string;
  urn?: string | null;
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

type BulkItemResult = {
  organizationId: string;
  organizationName: string;
  urn?: string;
  status: "deleted" | "blocked" | "failed" | "deleted_with_storage_cleanup_pending";
  reason?: string;
  counts?: DeletionCounts;
  alreadyDeleted?: boolean;
};

class SafeDeletionError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly stage = "validation",
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
    client, "document_submissions", "id", "organization_id", organization.id, true,
  );
  const budgetRequests = await getRows<{ id: string }>(
    client, "budget_requests", "id", "organization_id", organization.id, true,
  );
  const liquidationReports = await getRows<{ id: string }>(
    client, "liquidation_reports", "id", "organization_id", organization.id, true,
  );
  const ypopEntries = await getRows<{ id: string }>(
    client, "ypop_entries", "id", "organization_id", organization.id, true,
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
      true,
    ),
    getRows<FileRow>(
      client, "budget_request_files", "file_url", "budget_request_id", budgetRequests.map(({ id }) => id), true,
    ),
    getRows<FileRow>(
      client,
      "liquidation_report_files",
      "file_url",
      "liquidation_report_id",
      liquidationReports.map(({ id }) => id),
      true,
    ),
    getRows<FileRow>(client, "ypop_files", "file_url", "organization_id", organization.id, true),
    getRows<FileRow>(client, "ypop_event_files", "file_url", "organization_id", organization.id, true),
    getRows<FileRow>(client, "ypop_org_activity_files", "file_url", "organization_id", organization.id, true),
    getRows<{ id: string }>(client, "inquiries", "id", "organization_id", organization.id, true),
    getRows<{ id: string }>(client, "notifications", "id", "organization_id", organization.id, true),
    getRows<{ id: string }>(client, "compliance_remarks", "id", "organization_id", organization.id, true),
    getRows<{ id: string }>(client, "activity_logs", "id", "organization_id", organization.id, true),
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
        console.warn("Storage removal notice during post-deletion cleanup", { bucket, error: error.message });
      }
    }
  }
};

/**
 * Validates whether the target organization exists, is not already deleted,
 * and is not an Administrator or protected account.
 */
const validateOrganizationTarget = async (
  client: ReturnType<typeof createClient>,
  organizationId: string,
): Promise<{
  target: OrganizationTarget | null;
  isProtected: boolean;
  alreadyDeleted: boolean;
  previousManifest?: { organizationName?: string; counts?: DeletionCounts };
}> => {
  const { data: organization, error: organizationError } = await client
    .from("organization_profiles")
    .select("id,user_id,organization_name,organization_email,urn")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError) {
    throw new SafeDeletionError("The organization could not be loaded.", 500, "validation");
  }

  if (!organization) {
    // Check if previously deleted in activity_logs
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
        if (previous.result === "success") {
          return {
            target: null,
            isProtected: false,
            alreadyDeleted: true,
            previousManifest: previous,
          };
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
    return { target: null, isProtected: false, alreadyDeleted: false };
  }

  const target = organization as OrganizationTarget;

  // Protect administrator accounts
  const [{ data: adminRole, error: adminRoleError }, { data: matchingAdmin, error: matchingAdminError }] =
    await Promise.all([
      client.from("roles").select("id").eq("code", "admin").maybeSingle(),
      client.from("admin_accounts").select("id").eq("email", target.organization_email).limit(1),
    ]);

  if (adminRoleError || matchingAdminError) {
    throw new SafeDeletionError("The target account type could not be verified.", 500, "protection_check");
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
    throw new SafeDeletionError("The target account type could not be verified.", 500, "protection_check");
  }

  if ((adminUserRoles?.length ?? 0) > 0 || (matchingAdmin?.length ?? 0) > 0) {
    return { target, isProtected: true, alreadyDeleted: false };
  }

  return { target, isProtected: false, alreadyDeleted: false };
};

/**
 * Shared core execution logic for deleting a single organization account.
 * Follows the safe sequence:
 * Step 1: In-Memory Storage Manifest Collection (before DB rows are deleted)
 * Step 2: Canonical Database Transaction (delete_organization_account_canonical RPC)
 * Step 3: Auth User Deletion & Confirmation
 * Step 4: Storage Cleanup (ONLY after DB & Auth are confirmed gone)
 * Step 5: Verification
 * Step 6: Audit Logging
 */
const executeSingleDeletionCore = async (
  client: ReturnType<typeof createClient>,
  adminSessionToken: string,
  adminId: string,
  target: OrganizationTarget,
  supabaseUrl: string,
  operation: "single" | "bulk" = "single",
) => {
  // Step 1: Collect storage manifest BEFORE database deletion removes references
  const manifest = await buildDeletionManifest(client, target, supabaseUrl);

  // Step 2: Canonical Database Transaction via RPC
  const { data: dbResult, error: dbError } = await client.rpc("delete_organization_account_canonical", {
    _session_token: adminSessionToken,
    _organization_id: target.id,
  });

  if (dbError) {
    console.error("Canonical DB deletion RPC failed:", { organizationId: target.id, error: dbError });
    throw new SafeDeletionError(
      `Database deletion failed: ${dbError.message}`,
      502,
      "database_cleanup",
    );
  }

  if (!dbResult?.success) {
    if (dbResult?.is_protected) {
      throw new SafeDeletionError("Administrator accounts cannot be deleted from the YORP Registry.", 403, "protection_check");
    }
    throw new SafeDeletionError(
      dbResult?.error || "Database deletion failed.",
      502,
      dbResult?.stage || "database_cleanup",
    );
  }

  // Step 3: Auth User Deletion (only after DB transaction has succeeded!)
  if (target.user_id) {
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
        `Auth deletion failed: ${authDeleteError.message}. Database records were cleaned.`,
        502,
        "auth_cleanup",
      );
    }

    // Auth verification: ensure user is gone
    const { data: authCheck, error: authCheckError } = await client.auth.admin.getUserById(target.user_id);
    if (!authCheckError && authCheck?.user) {
      throw new SafeDeletionError(
        "Auth user deletion could not be verified. Auth record still exists.",
        502,
        "auth_verification",
      );
    }
  }

  // Step 4: Storage Cleanup (ONLY executed once DB and Auth deletions have passed!)
  let storageCleanupPending = false;
  try {
    await removeStorageObjects(client, manifest.storageObjects);
  } catch (storageErr) {
    console.warn("Storage cleanup encountered issues post-account-deletion:", storageErr);
    storageCleanupPending = true;
  }

  // Step 5: Verification of DB profile removal
  const { data: remainingProfile } = await client
    .from("organization_profiles")
    .select("id")
    .eq("id", target.id)
    .maybeSingle();

  if (remainingProfile) {
    throw new SafeDeletionError(
      "The account deletion could not be verified. Profile still exists in database.",
      502,
      "verification",
    );
  }

  // Step 6: Activity Audit Logging
  const auditDescription = JSON.stringify({
    adminId,
    organizationId: target.id,
    organizationName: target.organization_name,
    urn: target.urn ?? null,
    result: "success",
    storageCleanupPending,
    counts: manifest.counts,
    operation,
  });

  const { error: auditError } = await client.from("activity_logs").insert({
    actor_user_id: adminId,
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

  return {
    success: true,
    organizationId: target.id,
    organizationName: target.organization_name,
    urn: target.urn,
    status: storageCleanupPending ? ("deleted_with_storage_cleanup_pending" as const) : ("deleted" as const),
    counts: manifest.counts,
    auditRecorded: !auditError,
  };
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
      organizationIds?: string[];
      confirmationName?: string;
      confirmationPhrase?: string;
    };
    try {
      payload = await request.json();
    } catch {
      throw new SafeDeletionError("The deletion request is invalid.", 400, "request");
    }

    const action = payload.action;
    if (!action || !["preflight", "delete", "bulk_preflight", "bulk_delete"].includes(action)) {
      throw new SafeDeletionError("The deletion request action is invalid.", 400, "request");
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

    // ==========================================
    // ACTION: BULK PREFLIGHT
    // ==========================================
    if (action === "bulk_preflight") {
      const organizationIds = (payload.organizationIds ?? []).map((id) => id.trim()).filter(Boolean);
      if (organizationIds.length === 0) {
        throw new SafeDeletionError("No organizations selected for preflight.", 400, "request");
      }
      if (organizationIds.length > MAX_BULK_BATCH_SIZE) {
        throw new SafeDeletionError(
          `Cannot process more than ${MAX_BULK_BATCH_SIZE} organizations in a single bulk operation.`,
          400,
          "request",
        );
      }

      const targets: Array<{
        id: string;
        name: string;
        urn?: string;
        allowed: boolean;
        blockingReason?: string;
      }> = [];

      for (const id of organizationIds) {
        if (!uuidPattern.test(id)) {
          targets.push({
            id,
            name: "Invalid ID",
            allowed: false,
            blockingReason: "The organization ID format is invalid.",
          });
          continue;
        }

        try {
          const validation = await validateOrganizationTarget(client, id);
          if (validation.alreadyDeleted) {
            targets.push({
              id,
              name: validation.previousManifest?.organizationName || "Already Deleted",
              allowed: false,
              blockingReason: "This organization account has already been permanently deleted.",
            });
          } else if (!validation.target) {
            targets.push({
              id,
              name: "Not Found",
              allowed: false,
              blockingReason: "The organization could not be found.",
            });
          } else if (validation.isProtected) {
            targets.push({
              id,
              name: validation.target.organization_name,
              urn: validation.target.urn ?? undefined,
              allowed: false,
              blockingReason: "Administrator accounts cannot be deleted from the YORP Registry.",
            });
          } else {
            targets.push({
              id,
              name: validation.target.organization_name,
              urn: validation.target.urn ?? undefined,
              allowed: true,
            });
          }
        } catch (itemError) {
          targets.push({
            id,
            name: "Error",
            allowed: false,
            blockingReason: itemError instanceof Error ? itemError.message : "Failed to validate organization.",
          });
        }
      }

      const allowedCount = targets.filter((t) => t.allowed).length;
      const blockedCount = targets.filter((t) => !t.allowed).length;

      return json({
        valid: true,
        targets,
        totalCount: targets.length,
        allowedCount,
        blockedCount,
      });
    }

    // ==========================================
    // ACTION: BULK DELETE
    // ==========================================
    if (action === "bulk_delete") {
      const organizationIds = (payload.organizationIds ?? []).map((id) => id.trim()).filter(Boolean);
      if (organizationIds.length === 0) {
        throw new SafeDeletionError("No organizations selected for bulk deletion.", 400, "request");
      }
      if (organizationIds.length > MAX_BULK_BATCH_SIZE) {
        throw new SafeDeletionError(
          `Cannot delete more than ${MAX_BULK_BATCH_SIZE} organizations in a single request.`,
          400,
          "request",
        );
      }

      const confirmationPhrase = normalizeConfirmation(payload.confirmationPhrase ?? "").toUpperCase();
      if (confirmationPhrase !== "DELETE SELECTED") {
        throw new SafeDeletionError(
          "Confirmation phrase does not match. Please type “DELETE SELECTED” to confirm.",
          409,
          "confirmation",
        );
      }

      const results: BulkItemResult[] = [];

      // Process each organization sequentially for resource safety and audit reliability
      for (const id of organizationIds) {
        let currentOrgName = "Organization";
        let currentUrn: string | undefined = undefined;

        if (!uuidPattern.test(id)) {
          results.push({
            organizationId: id,
            organizationName: "Invalid Organization",
            status: "failed",
            reason: "Invalid organization ID format.",
          });
          continue;
        }

        try {
          // Phase A: Pre-validation & Protection check
          const validation = await validateOrganizationTarget(client, id);

          if (validation.alreadyDeleted) {
            results.push({
              organizationId: id,
              organizationName: validation.previousManifest?.organizationName || "Previously Deleted Organization",
              status: "deleted",
              alreadyDeleted: true,
              counts: validation.previousManifest?.counts,
              reason: "Account was already deleted.",
            });
            continue;
          }

          if (!validation.target) {
            results.push({
              organizationId: id,
              organizationName: "Unknown Organization",
              status: "failed",
              reason: "Organization could not be found.",
            });
            continue;
          }

          currentOrgName = validation.target.organization_name;
          currentUrn = validation.target.urn ?? undefined;

          if (validation.isProtected) {
            results.push({
              organizationId: id,
              organizationName: currentOrgName,
              urn: currentUrn,
              status: "blocked",
              reason: "Administrator accounts cannot be deleted from the YORP Registry.",
            });
            continue;
          }

          // Canonical Safe Deletion Core
          const result = await executeSingleDeletionCore(
            client,
            adminSessionToken,
            admin.admin_id,
            validation.target,
            supabaseUrl,
            "bulk",
          );

          results.push({
            organizationId: id,
            organizationName: currentOrgName,
            urn: currentUrn,
            status: result.status,
            counts: result.counts,
          });
        } catch (itemError) {
          console.error("Bulk deletion failed for organization", { organizationId: id, error: itemError });
          results.push({
            organizationId: id,
            organizationName: currentOrgName,
            urn: currentUrn,
            status: "failed",
            reason: itemError instanceof Error ? itemError.message : "Deletion failed unexpectedly.",
          });
        }
      }

      const deletedCount = results.filter((r) => r.status === "deleted" || r.status === "deleted_with_storage_cleanup_pending").length;
      const blockedCount = results.filter((r) => r.status === "blocked").length;
      const failedCount = results.filter((r) => r.status === "failed").length;

      return json({
        success: deletedCount > 0,
        total: results.length,
        deletedCount,
        blockedCount,
        failedCount,
        results,
      });
    }

    // ==========================================
    // ACTION: SINGLE PREFLIGHT / DELETE
    // ==========================================
    const organizationId = payload.organizationId?.trim() ?? "";
    if (!uuidPattern.test(organizationId)) {
      throw new SafeDeletionError("The deletion request is invalid.", 400, "request");
    }

    const validation = await validateOrganizationTarget(client, organizationId);

    if (action === "preflight") {
      if (!validation.target) {
        throw new SafeDeletionError("The organization could not be found.", 404, "validation");
      }
      if (validation.isProtected) {
        throw new SafeDeletionError("Administrator accounts cannot be deleted from the YORP Registry.", 403, "protection_check");
      }
      const manifest = await buildDeletionManifest(client, validation.target, supabaseUrl);
      return json({
        organization: { id: validation.target.id, name: validation.target.organization_name, urn: validation.target.urn },
        counts: manifest.counts,
      });
    }

    // action === "delete"
    if (!validation.target) {
      if (validation.alreadyDeleted && validation.previousManifest?.organizationName) {
        if (
          normalizeConfirmation(payload.confirmationName ?? "") ===
          normalizeConfirmation(validation.previousManifest.organizationName)
        ) {
          return json({
            success: true,
            organizationId,
            counts: validation.previousManifest.counts,
            auditRecorded: true,
            alreadyDeleted: true,
          });
        }
      }
      throw new SafeDeletionError("The organization could not be found.", 404, "validation");
    }

    if (validation.isProtected) {
      throw new SafeDeletionError("Administrator accounts cannot be deleted from the YORP Registry.", 403, "protection_check");
    }

    if (
      normalizeConfirmation(payload.confirmationName ?? "") !==
      normalizeConfirmation(validation.target.organization_name)
    ) {
      throw new SafeDeletionError("The organization name does not match.", 409, "confirmation");
    }

    const result = await executeSingleDeletionCore(
      client,
      adminSessionToken,
      admin.admin_id,
      validation.target,
      supabaseUrl,
      "single",
    );

    return json(result);
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
