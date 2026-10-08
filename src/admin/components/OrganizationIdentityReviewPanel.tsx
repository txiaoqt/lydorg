import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { statusLabelMap } from "@/lib/lydo-connect-data";
import { fetchOrganizationIdentityReview, reviewOrganizationIdentity, type IdentityDecision, type IdentityReviewPacket } from "@/lib/organization-identity-api";

const decisions: Record<IdentityDecision, string> = {
  confirmed_different: "Confirm Different Organization", confirmed_existing: "Confirm Existing Organization",
  more_information: "Request More Information", rejected: "Reject Unsupported Identity Claim",
};
export function OrganizationIdentityReviewPanel({ organizationId }: { organizationId: string }) {
  const { user } = useAuth();
  const scope = `${organizationId}|${user?.id}|${user?.roleCode}|${[...(user?.permissionCodes || [])].sort().join(",")}`;
  const currentScope = useRef(scope); currentScope.current = scope;
  const [result, setResult] = useState<{ scope: string; packet: IdentityReviewPacket } | null>(null);
  const packet = result?.scope === scope ? result.packet : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [decision, setDecision] = useState<IdentityDecision>("more_information");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => { setError(""); setCandidateId(""); setReason(""); setEvidence(""); setConfirmed(false); }, [scope]);
  useEffect(() => () => { currentScope.current = "unmounted"; }, []);
  async function load() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    const requestedScope = scope;
    try {
      const next = await fetchOrganizationIdentityReview(organizationId);
      if (currentScope.current === requestedScope) { setResult({ scope: requestedScope, packet: next }); setConfirmed(false); }
    } catch (failure) { if (currentScope.current === requestedScope) setError(failure instanceof Error ? failure.message : "Identity review is unavailable."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function save() {
    if (inFlight.current || !packet || !confirmed) return;
    inFlight.current = true; setBusy(true); setError("");
    const requestedScope = scope;
    try {
      const next = await reviewOrganizationIdentity(organizationId, candidateId || null, decision, reason, evidence, packet.version);
      if (currentScope.current === requestedScope) { setResult({ scope: requestedScope, packet: next }); setConfirmed(false); setReason(""); setEvidence(""); }
    } catch (failure) { if (currentScope.current === requestedScope) setError(failure instanceof Error ? failure.message : "Unable to save identity decision. Reload if the registration changed."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const clear = packet && ["NO_MATCH", "VERIFIED_SEPARATE"].includes(packet.outcome);
  return <section className="space-y-4 rounded-md border border-slate-300 bg-admin-surface p-4" aria-label="Organization identity review">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-segoe text-base font-semibold">Organization Identity Review</h2>
        <p className="text-sm text-slate-500">Compare official evidence before completing registration verification.</p></div>
      <Button type="button" variant="outline" size="sm" onClick={load} disabled={busy}>{busy ? "Checking…" : packet ? "Reload Identity Review" : "Check Organization Identity"}</Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {packet && <>
      <p role="status" className="rounded-md bg-bg-panel-subtle p-3 text-sm">{clear ? "Identity check cleared. Document/URN verification is still required." : packet.canonicalOrganizationId ?
        "Confirmed existing organization. Original records and obligations remain with the canonical organization; this account has not received ownership or access. Follow the authorized account recovery process." :
        "Identity review remains pending. Do not approve registration until supporting evidence and the identity decision are complete."}</p>
      {packet.candidates.length === 0 && <p className="text-sm text-slate-500">No current candidate organizations were found.</p>}
      {packet.candidateLimitReached && <p role="alert" className="text-sm text-destructive">This candidate list reached its limit. Verification remains pending; request a scoped investigation before clearing this registration.</p>}
      {packet.candidates.map(candidate => <label key={candidate.id} className="flex items-start gap-3 rounded-md border border-slate-200 p-3">
        <input type="radio" name={`identity-candidate-${organizationId}`} value={candidate.id} checked={candidateId === candidate.id}
          disabled={busy || Boolean(packet.canonicalOrganizationId)} onChange={() => { setCandidateId(candidate.id); setConfirmed(false); }} />
        <span className="min-w-0 space-y-1 text-sm"><span className="block font-semibold">{candidate.name}</span>
          <span className="block">URN: {candidate.urn || "Not yet assigned"} · {candidate.district} · {candidate.barangay}</span>
          <span className="block">{statusLabelMap[candidate.status] || "Under review"}{candidate.verifiedAt ? ` · Verified ${new Date(candidate.verifiedAt).toLocaleDateString("en-PH")}` : ""}</span>
          <span className="block text-slate-500">{[candidate.signals.normalizedName && "Same normalized name", candidate.signals.sameBarangay && "Same barangay",
            candidate.signals.sameDistrict && "Same district", candidate.signals.exactUrn && "Exact official URN"].filter(Boolean).join(" · ") || "Similar name in the same barangay"}</span>
          {candidate.hasRetainedHistory && <span className="block">Official organizational history is retained on this identity.</span>}
          {candidate.separateDecision && <span className="block">Reviewed as a different organization for these identity details.</span>}
        </span>
      </label>)}
      {!packet.canonicalOrganizationId && <div className="space-y-3 border-t border-slate-200 pt-3">
        <Label htmlFor={`identity-decision-${organizationId}`}>Identity Decision</Label>
        <select id={`identity-decision-${organizationId}`} className="w-full rounded-md border border-slate-300 bg-admin-surface p-2 text-sm" value={decision}
          disabled={busy} onChange={event => { setDecision(event.target.value as IdentityDecision); setConfirmed(false); }}>
          {Object.entries(decisions).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
        </select>
        <Label htmlFor={`identity-reason-${organizationId}`}>Reason / Remarks</Label>
        <Textarea id={`identity-reason-${organizationId}`} value={reason} maxLength={3000} disabled={busy} onChange={e => { setReason(e.target.value); setConfirmed(false); }} />
        <Label htmlFor={`identity-evidence-${organizationId}`}>Official Evidence Reference</Label>
        <Textarea id={`identity-evidence-${organizationId}`} placeholder="Reference the reviewed official registration record or supporting documents." maxLength={1000}
          value={evidence} disabled={busy} onChange={e => { setEvidence(e.target.value); setConfirmed(false); }} />
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} />
          I reviewed the official evidence. Similar names alone do not establish identity. This decision will not merge records or transfer account ownership.</label>
        <Button type="button" onClick={save} disabled={busy || !confirmed || reason.trim().length < 10 || evidence.trim().length < 5 ||
          ((decision === "confirmed_existing" || (decision === "confirmed_different" && packet.candidates.length > 0)) && !candidateId)}>Record Identity Decision</Button>
      </div>}
      {packet.history.length > 0 && <details className="border-t border-slate-200 pt-3"><summary className="cursor-pointer text-sm font-semibold">Identity Review History (latest 50)</summary>
        <ol className="mt-3 space-y-3">{packet.history.map(event => <li key={event.id} className="text-sm">
          <p className="font-semibold">{decisions[event.decision]} · {new Date(event.createdAt).toLocaleString("en-PH")}</p>
          <p>{event.reason}</p><p className="text-slate-500">Evidence: {event.evidenceReference}</p><p className="text-xs text-slate-500">Reviewer: {event.adminId}</p>
        </li>)}</ol>
      </details>}
      {Boolean(packet.relatedRegistrations?.length) && <details className="border-t border-slate-200 pt-3">
        <summary className="cursor-pointer text-sm font-semibold">Related Canonical Identity Reviews</summary>
        <p className="mt-2 text-sm text-slate-500">These registration IDs remain traceable. Their records have not been merged or transferred.</p>
        <ul className="mt-2 space-y-2">{packet.relatedRegistrations?.map(related => <li key={related.id} className="text-sm">
          <p className="font-semibold">{related.name} · {related.urn || "URN not assigned"}</p><p className="break-all text-xs text-slate-500">Registration ID: {related.id}</p>
        </li>)}</ul>
        {packet.relatedLimitReached && <p className="mt-2 text-sm">The related-registration list reached its limit. Request a scoped historical investigation.</p>}
      </details>}
    </>}
  </section>;
}
