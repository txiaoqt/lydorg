import { readAdminSession } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";

export type OrganizationDeletionCounts = {
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

export type OrganizationDeletionResult = {
  success: true;
  organizationId: string;
  organizationName?: string;
  urn?: string | null;
  status?: "deleted" | "deleted_with_storage_cleanup_pending";
  counts: OrganizationDeletionCounts;
  auditRecorded: boolean;
  alreadyDeleted?: boolean;
};

export type BulkPreflightTarget = {
  id: string;
  name: string;
  urn?: string;
  allowed: boolean;
  blockingReason?: string;
};

export type BulkPreflightResult = {
  valid: boolean;
  targets: BulkPreflightTarget[];
  totalCount: number;
  allowedCount: number;
  blockedCount: number;
};

export type BulkItemResult = {
  organizationId: string;
  organizationName: string;
  urn?: string;
  status: "deleted" | "blocked" | "failed" | "deleted_with_storage_cleanup_pending";
  reason?: string;
  counts?: OrganizationDeletionCounts;
  alreadyDeleted?: boolean;
};

export type BulkOrganizationDeletionResult = {
  success: boolean;
  total: number;
  deletedCount: number;
  blockedCount: number;
  failedCount: number;
  results: BulkItemResult[];
};

export const MAX_BULK_ORGANIZATION_DELETION_LIMIT = 25;

export const ORGANIZATION_DELETION_CATEGORIES = [
  "Account and organization profile",
  "Compliance documents and uploaded files",
  "Budget requests and attachments",
  "Liquidation reports and attachments",
  "YPOP participation, activities, and supporting files",
  "Inquiries, notifications, and related organization records",
] as const;

type DeletionErrorPayload = {
  error?: string;
  stage?: string;
  retryable?: boolean;
};

export class OrganizationDeletionError extends Error {
  constructor(
    message: string,
    readonly stage = "request",
    readonly retryable = false,
  ) {
    super(message);
  }
}

export const normalizeOrganizationDeletionConfirmation = (value: string) =>
  value.trim().replace(/\s+/g, " ");

export const organizationDeletionConfirmationMatches = (entered: string, organizationName: string) =>
  normalizeOrganizationDeletionConfirmation(entered) ===
  normalizeOrganizationDeletionConfirmation(organizationName);

export const bulkOrganizationDeletionConfirmationMatches = (entered: string) =>
  normalizeOrganizationDeletionConfirmation(entered).toUpperCase() === "DELETE SELECTED";

export const getOrganizationDeletionServiceError = (
  status: number | null,
  payload: DeletionErrorPayload | null,
  fallbackMessage: string,
) => {
  if (status === 404) {
    return "The account deletion service is not deployed. Deploy the delete-organization-account server function, then retry.";
  }
  return payload?.error || fallbackMessage;
};

const invokeDeletionFunction = async <T>(
  body: Record<string, unknown>,
  fallbackMessage: string,
): Promise<T> => {
  if (!supabase) throw new OrganizationDeletionError("Supabase is not configured.");
  const adminSession = readAdminSession();
  if (!adminSession?.sessionToken) {
    throw new OrganizationDeletionError(
      "You are not authorized to delete organization accounts.",
      "authorization",
    );
  }

  const { data, error } = await supabase.functions.invoke("delete-organization-account", {
    body,
    headers: { "x-admin-session-token": adminSession.sessionToken },
  });
  if (!error) return data as T;

  let payload: DeletionErrorPayload | null = data && typeof data === "object"
    ? data as DeletionErrorPayload
    : null;
  const context = (error as { context?: unknown }).context;
  const isResponse = Boolean(context && typeof (context as { json?: unknown }).json === "function");
  const responseStatus = isResponse ? (context as Response).status : null;
  if (!payload && isResponse) {
    try {
      const response = typeof (context as Response).clone === "function"
        ? (context as Response).clone()
        : (context as Response);
      const parsed = await response.json();
      if (parsed && typeof parsed === "object") {
        payload = parsed as DeletionErrorPayload;
      }
    } catch {
      try {
        const text = typeof (context as Response).clone === "function"
          ? await (context as Response).clone().text()
          : "";
        if (text && !text.startsWith("<")) {
          payload = { error: text };
        }
      } catch {
        payload = null;
      }
    }
  }
  const fallbackWithSpecificError =
    error instanceof Error && error.message && !error.message.includes("non-2xx status code")
      ? error.message
      : fallbackMessage;
  throw new OrganizationDeletionError(
    getOrganizationDeletionServiceError(responseStatus, payload, fallbackWithSpecificError),
    payload?.stage,
    payload?.retryable,
  );
};

export const permanentlyDeleteOrganizationAccount = (
  organizationId: string,
  confirmationName: string,
) =>
  invokeDeletionFunction<OrganizationDeletionResult>(
    { action: "delete", organizationId, confirmationName },
    "The organization account could not be deleted. Please try again.",
  );

export const preflightRegistrationDeletion = (organizationId: string) =>
  invokeDeletionFunction<{
    organization: { id: string; name: string; urn?: string | null };
    counts: OrganizationDeletionCounts;
  }>(
    { action: "registration_preflight", organizationId },
    "The registration deletion preflight check could not be completed.",
  );

export const permanentlyDeleteRegistrationAccount = (
  organizationId: string,
  confirmationName: string,
) =>
  invokeDeletionFunction<OrganizationDeletionResult>(
    { action: "registration_delete", organizationId, confirmationName },
    "The registration account could not be deleted. Please try again.",
  );

export const preflightBulkOrganizationDeletion = (organizationIds: string[]) =>
  invokeDeletionFunction<BulkPreflightResult>(
    { action: "bulk_preflight", organizationIds },
    "The bulk organization preflight check could not be completed.",
  );

export const permanentlyDeleteBulkOrganizationAccounts = (
  organizationIds: string[],
  confirmationPhrase: string,
) =>
  invokeDeletionFunction<BulkOrganizationDeletionResult>(
    { action: "bulk_delete", organizationIds, confirmationPhrase },
    "The bulk organization account deletion could not be completed.",
  );

