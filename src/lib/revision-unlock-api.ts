import { supabase } from "./supabase";
import { readAdminSession } from "./admin-auth";

export type RevisionUnlockEntityType =
  | "budget_request"
  | "liquidation_report"
  | "document_submission"
  | "renewal"
  | "ypop_event_participation"
  | "ypop_org_activity";

export type RevisionUnlockResult = { revisionLocked: false; revisionLockedAt: null; revisionUnlockedAt: string };

/** Lets an organization resubmit after its 5-day revision deadline passed. The original deadline is kept for history. */
export async function unlockSubmissionRevision(entityType: RevisionUnlockEntityType, entityId: string, remarks?: string): Promise<RevisionUnlockResult> {
  const token = readAdminSession()?.sessionToken;
  if (!supabase || !token) throw new Error("An active admin session is required.");
  const { data, error } = await supabase.rpc("admin_unlock_submission_revision", {
    _session_token: token,
    _entity_type: entityType,
    _entity_id: entityId,
    _remarks: remarks?.trim() || null,
  });
  if (error || !data?.success) throw new Error(error?.message || "The submission could not be unlocked.");
  return { revisionLocked: false, revisionLockedAt: null, revisionUnlockedAt: String(data.revision_unlocked_at) };
}
