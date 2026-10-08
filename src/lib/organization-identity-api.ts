import { supabase } from "./supabase";
import { ORGANIZATION_IDENTITY_OUTCOMES, type OrganizationIdentityOutcome } from "./organization-identity";
import { readAdminSession } from "./admin-auth";

export async function checkOrganizationIdentity(name: string, barangay = "", urn = "", signal?: AbortSignal): Promise<OrganizationIdentityOutcome> {
  if (!supabase) return "CHECK_UNAVAILABLE";
  try {
    let request = supabase.rpc("check_organization_identity", { _name: name.trim(), _barangay: barangay || null, _urn: urn || null });
    if (signal) request = request.abortSignal(signal);
    const { data, error } = await request;
    return !error && data && ORGANIZATION_IDENTITY_OUTCOMES.includes(data.outcome) ? data.outcome : "CHECK_UNAVAILABLE";
  } catch { return "CHECK_UNAVAILABLE"; }
}
export type IdentityCandidate = { id: string; name: string; urn: string | null; barangay: string; district: string;
  status: string; verifiedAt: string | null; hasRetainedHistory: boolean; separateDecision: boolean;
  signals: { normalizedName: boolean; sameBarangay: boolean; sameDistrict: boolean; exactUrn: boolean } };
export type IdentityDecision = "confirmed_different" | "confirmed_existing" | "more_information" | "rejected";
export type IdentityReviewPacket = { outcome: string; version: number; canonicalOrganizationId: string | null;
  candidateLimitReached: boolean;
  relatedRegistrations?: { id: string; name: string; urn: string | null; status: string }[];
  relatedLimitReached?: boolean;
  candidates: IdentityCandidate[]; history: { id: string; adminId: string; candidateId: string | null;
    decision: IdentityDecision; reason: string; evidenceReference: string; createdAt: string }[]; historyLimited: boolean };
const adminToken = () => {
  const token = readAdminSession()?.sessionToken;
  if (!token || !supabase) throw new Error("An active registration reviewer session is required.");
  return token;
};
export async function fetchOrganizationIdentityReview(organizationId: string, signal?: AbortSignal): Promise<IdentityReviewPacket> {
  const token = adminToken();
  let request = supabase!.rpc("admin_get_organization_identity_review", { _session_token: token, _organization_id: organizationId });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error || !data) throw new Error(error?.message || "Identity review is unavailable.");
  return data as IdentityReviewPacket;
}
export async function reviewOrganizationIdentity(organizationId: string, candidateId: string | null,
  decision: IdentityDecision, reason: string, evidenceReference: string, expectedVersion: number): Promise<IdentityReviewPacket> {
  const token = adminToken();
  const { data, error } = await supabase!.rpc("admin_review_organization_identity", {
    _session_token: token, _organization_id: organizationId, _candidate_id: candidateId,
    _decision: decision, _reason: reason.trim(), _evidence_reference: evidenceReference.trim(), _expected_version: expectedVersion,
  });
  if (error || !data) throw new Error(error?.message || "Identity decision could not be saved.");
  return data as IdentityReviewPacket;
}
