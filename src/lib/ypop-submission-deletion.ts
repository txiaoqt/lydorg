import { readAdminSession } from "./admin-auth";
import type { LydoSeedState, YpopSubmissionDeletionReceipt } from "./lydo-connect-data";
import { supabase } from "./supabase";

type ReceiptRow = {
  operation_id: string;
  organization_id: string;
  semester: string;
  entry_ids: string[];
  participation_ids: string[];
  org_activity_ids: string[];
  deleted_at: string;
};

const mapReceipt = (row: ReceiptRow): YpopSubmissionDeletionReceipt => ({
  operationId: row.operation_id, organizationId: row.organization_id, semester: row.semester,
  entryIds: row.entry_ids ?? [], participationIds: row.participation_ids ?? [],
  orgActivityIds: row.org_activity_ids ?? [], deletedAt: row.deleted_at,
});

export const fetchYpopDeletionReceipts = async (organizationId: string) => {
  if (!supabase) return undefined;
  const { data, error } = await supabase.from("ypop_submission_deletion_receipts")
    .select("operation_id,organization_id,semester,entry_ids,participation_ids,org_activity_ids,deleted_at")
    .eq("organization_id", organizationId);
  // Preserve previous receipts if this read fails. Never infer deletion from an
  // empty/error response: locally saved new drafts must survive a refresh.
  if (error) return undefined;
  return (data as ReceiptRow[]).map(mapReceipt);
};

export const pruneDeletedYpopSubmissions = (state: LydoSeedState, receipts: YpopSubmissionDeletionReceipt[]): LydoSeedState => {
  const receiptMap = new Map<string, YpopSubmissionDeletionReceipt>();
  [...(state.ypopDeletionReceipts ?? []), ...receipts].forEach((receipt) => {
    receiptMap.set(`${receipt.operationId}:${receipt.organizationId}`, receipt);
  });
  const allReceipts = [...receiptMap.values()];
  if (!allReceipts.length) return state;
  const entryIds = new Set(allReceipts.flatMap((receipt) => receipt.entryIds));
  const participationIds = new Set(allReceipts.flatMap((receipt) => receipt.participationIds));
  const activityIds = new Set(allReceipts.flatMap((receipt) => receipt.orgActivityIds));
  return {
    ...state, ypopDeletionReceipts: allReceipts,
    ypopEntries: state.ypopEntries.filter((entry) => !entryIds.has(entry.id) && !(
      entry.id.startsWith("virtual-") && allReceipts.some((receipt) =>
        receipt.organizationId === entry.organizationId && receipt.semester === entry.semester &&
        Date.parse(entry.createdAt) <= Date.parse(receipt.deletedAt))
    )),
    ypopFiles: state.ypopFiles.filter((file) => !entryIds.has(file.ypopEntryId)),
    ypopEventParticipations: state.ypopEventParticipations.filter((participation) => !participationIds.has(participation.id)),
    ypopEventFiles: state.ypopEventFiles.filter((file) => !participationIds.has(file.participationId)),
    ypopOrgActivities: state.ypopOrgActivities.filter((activity) => !activityIds.has(activity.id) && !entryIds.has(activity.ypopEntryId)),
    ypopOrgActivityFiles: state.ypopOrgActivityFiles.filter((file) => !activityIds.has(file.orgActivityId)),
    budgetRequests: state.budgetRequests.map((request) => entryIds.has(request.ypopEntryId ?? "")
      ? { ...request, ypopEntryId: undefined } : request),
  };
};

export const deleteAdminYpopSubmissions = async (params: {
  periodId: string; organizationIds: string[]; operationId: string;
}): Promise<{ deletedCount: number; receipts: YpopSubmissionDeletionReceipt[]; storageWarning?: string }> => {
  if (!supabase) throw new Error("Supabase is not configured.");
  const session = readAdminSession();
  if (!session?.sessionToken) throw new Error("Admin session is invalid or expired. Please sign in again.");
  const { data, error } = await supabase.functions.invoke("delete-ypop-submissions", {
    body: params, headers: { "x-admin-session-token": session.sessionToken },
  });
  if (error) {
    const response = (error as { context?: unknown }).context;
    const payload = response instanceof Response ? await response.clone().json().catch(() => null) : null;
    throw new Error(typeof payload?.error === "string" ? payload.error : error.message || "Unable to delete the selected submissions.");
  }
  if (!data || !Number.isInteger(data.deleted_count) || !Array.isArray(data.receipts)) {
    throw new Error("The deletion service returned an invalid response. Refresh the submissions list before retrying.");
  }
  return { deletedCount: data.deleted_count, receipts: data.receipts.map(mapReceipt), storageWarning: data.storageWarning };
};
