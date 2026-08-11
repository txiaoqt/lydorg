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
  counts: OrganizationDeletionCounts;
  auditRecorded: boolean;
};

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
  const responseStatus = context instanceof Response ? context.status : null;
  if (!payload && context instanceof Response) {
    try {
      payload = await context.clone().json() as DeletionErrorPayload;
    } catch {
      payload = null;
    }
  }
  throw new OrganizationDeletionError(
    getOrganizationDeletionServiceError(responseStatus, payload, fallbackMessage),
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
