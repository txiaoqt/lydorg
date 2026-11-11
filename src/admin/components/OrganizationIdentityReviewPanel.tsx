import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronUp, Info, Lock, RotateCw, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { statusLabelMap } from "@/lib/lydo-connect-data";
import { fetchOrganizationIdentityReview, reviewOrganizationIdentity, type IdentityDecision, type IdentityReviewPacket } from "@/lib/organization-identity-api";

const decisions: Record<IdentityDecision, string> = {
  confirmed_different: "Confirm Different Organization", confirmed_existing: "Confirm Existing Organization",
  more_information: "Request More Information", rejected: "Reject Unsupported Identity Claim",
};
const decisionOptions: Array<{ value: IdentityDecision; title: string; description: string }> = [
  { value: "confirmed_different", title: "Clear identity", description: "The official evidence shows this is a different organization." },
  { value: "confirmed_existing", title: "Same as existing organization", description: "The official evidence shows this is the selected existing organization." },
  { value: "more_information", title: "Request more information", description: "Ask the organization for additional evidence before deciding." },
  { value: "rejected", title: "Reject identity", description: "The evidence does not establish this organization's identity." },
];
const labelClass = "font-inter text-[13px] font-semibold normal-case tracking-normal text-text-default";

function StatusChip({ tone, children }: { tone: "success" | "warning" | "neutral"; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-inter text-xs font-semibold leading-[140%]",
    tone === "success" && "border-border-success-subtle bg-bg-success-subtle text-positive-secondary",
    tone === "warning" && "border-border-warning-subtle bg-amber-50 text-text-warning-secondary",
    tone === "neutral" && "border-slate-300 bg-slate-50 text-slate-600")}>{children}</span>;
}

export function OrganizationIdentityReviewPanel({ organizationId }: { organizationId: string }) {
  const { user } = useAuth();
  const scope = `${organizationId}|${user?.id}|${user?.roleCode}|${[...(user?.permissionCodes || [])].sort().join(",")}`;
  const currentScope = useRef(scope); currentScope.current = scope;
  const [result, setResult] = useState<{ scope: string; packet: IdentityReviewPacket } | null>(null);
  const packet = result?.scope === scope ? result.packet : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [candidateId, setCandidateId] = useState("");
  const [decision, setDecision] = useState<IdentityDecision>("more_information");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const inFlight = useRef(false);
  const resetForm = () => { setDecision("more_information"); setReason(""); setEvidence(""); setConfirmed(false); };
  useEffect(() => () => { currentScope.current = "unmounted"; }, []);
  async function load() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    const requestedScope = scope;
    try {
      const next = await fetchOrganizationIdentityReview(organizationId);
      if (currentScope.current === requestedScope) {
        setResult({ scope: requestedScope, packet: next }); setConfirmed(false);
        setCandidateId(next.candidates.length === 1 ? next.candidates[0].id : "");
      }
    } catch (failure) { if (currentScope.current === requestedScope) setError(failure instanceof Error ? failure.message : "Identity review is unavailable."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  // The header must say up front whether a review is needed, so the check runs when the registration opens.
  useEffect(() => { setError(""); setCandidateId(""); setOpen(false); resetForm(); void load(); }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps
  async function save() {
    if (inFlight.current || !packet || !confirmed) return;
    inFlight.current = true; setBusy(true); setError("");
    const requestedScope = scope;
    try {
      const next = await reviewOrganizationIdentity(organizationId, candidateId || null, decision, reason, evidence, packet.version);
      if (currentScope.current === requestedScope) { setResult({ scope: requestedScope, packet: next }); resetForm(); }
    } catch (failure) { if (currentScope.current === requestedScope) setError(failure instanceof Error ? failure.message : "Unable to save identity decision. Reload if the registration changed."); }
    finally { inFlight.current = false; setBusy(false); }
  }

  const clear = Boolean(packet && ["NO_MATCH", "VERIFIED_SEPARATE"].includes(packet.outcome));
  const confirmedExisting = Boolean(packet?.canonicalOrganizationId);
  const needsReview = Boolean(packet && !clear && !confirmedExisting);
  const chip = !packet ? (busy ? <StatusChip tone="neutral">Checking…</StatusChip> : null)
    : packet.outcome === "NO_MATCH" ? <StatusChip tone="success"><Check className="h-3 w-3" strokeWidth={2.4} />Not required</StatusChip>
      : clear ? <StatusChip tone="success"><Check className="h-3 w-3" strokeWidth={2.4} />Cleared</StatusChip>
        : confirmedExisting ? <StatusChip tone="neutral">Confirmed existing organization</StatusChip>
          : <StatusChip tone="warning">Possible match found</StatusChip>;
  const description = !packet ? "Checking for other organizations with the same name."
    : packet.outcome === "NO_MATCH" ? "No other organization with the same name was found, so an identity review isn't needed."
      : clear ? "Identity check cleared. Document/URN verification is still required."
        : confirmedExisting ? "Confirmed existing organization. Original records and obligations remain with the canonical organization; this account has not received ownership or access. Follow the authorized account recovery process."
          : "Compare official evidence before completing registration verification.";
  const needsCandidate = decision === "confirmed_existing" || (decision === "confirmed_different" && Boolean(packet?.candidates.length));
  const canSave = !busy && confirmed && reason.trim().length >= 10 && evidence.trim().length >= 5 && !(needsCandidate && !candidateId);
  const showBody = Boolean(packet) && (open || !needsReview);

  return <section className="overflow-hidden rounded-md border border-slate-300 bg-admin-surface" aria-label="Organization identity review">
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2"><h2 className="font-inter text-base font-semibold text-public-text-brand">Organization Identity Review</h2>{chip}</div>
        <p role="status" className="font-inter text-[13px] text-slate-500">{description}</p>
      </div>
      {needsReview ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(current => !current)} aria-expanded={open}
          className="h-9 gap-1.5 border-public-bg-brand font-inter text-[13px] font-semibold text-public-text-brand">
          {open ? <>Close Identity Review<ChevronUp className="h-4 w-4" /></> : <>Check Organization Identity<ArrowRight className="h-4 w-4" /></>}
        </Button>
      ) : !packet && error ? (
        <Button type="button" variant="outline" size="sm" onClick={load} disabled={busy} className="h-9 font-inter text-[13px]">Check Organization Identity</Button>
      ) : (
        <Button type="button" variant="outline" size="sm" disabled className="h-9 gap-1.5 font-inter text-[13px]"><Lock className="h-3.5 w-3.5" />Check Organization Identity</Button>
      )}
    </div>
    {error && <p role="alert" className="px-4 pb-4 text-sm text-destructive">{error}</p>}
    {packet && showBody && (packet.candidates.length > 0 || packet.candidateLimitReached || packet.history.length > 0 || Boolean(packet.relatedRegistrations?.length) || needsReview) && (
      <div className="space-y-4 border-t border-slate-300 p-4">
        {needsReview && packet.candidates.length > 0 && <div className="flex gap-2.5 rounded-md border border-bg-info-secondary bg-bg-info-tertiary p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-icon-info-secondary" />
          <div><p className="font-inter text-[13px] font-semibold text-text-default">Same organization name found</p>
            <p className="font-inter text-[13px] text-slate-600">Review the candidate below. Similar names alone do not establish identity.</p></div>
        </div>}
        {packet.candidateLimitReached && <p role="alert" className="text-sm text-destructive">This candidate list reached its limit. Verification remains pending; request a scoped investigation before clearing this registration.</p>}
        {packet.candidates.length > 0 && <div className="space-y-2">
          <p className="font-inter text-[13px] font-semibold text-text-default">Candidate Organizations</p>
          {packet.candidates.map(candidate => <label key={candidate.id} className={cn("flex items-center gap-3 rounded-md border p-3",
            candidateId === candidate.id ? "border-amber-300 bg-amber-50/60" : "border-slate-200")}>
            <input type="radio" name={`identity-candidate-${organizationId}`} value={candidate.id} checked={candidateId === candidate.id} className="sr-only"
              disabled={busy || !needsReview} onChange={() => { setCandidateId(candidate.id); setConfirmed(false); }} />
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100"><Search className="h-4 w-4 text-slate-500" /></span>
            <span className="min-w-0 flex-1 space-y-0.5 font-inter text-[13px]">
              <span className="block font-semibold text-text-default">{candidate.name}</span>
              <span className="block text-slate-500">{candidate.district} · {candidate.barangay} · URN: {candidate.urn || "Not yet assigned"}</span>
              <span className="block text-slate-500">{statusLabelMap[candidate.status] || "Under review"}{candidate.verifiedAt ? ` · Verified ${new Date(candidate.verifiedAt).toLocaleDateString("en-PH")}` : ""}</span>
              {candidate.hasRetainedHistory && <span className="block text-slate-500">Official organizational history is retained on this identity.</span>}
              {candidate.separateDecision && <span className="block text-slate-500">Reviewed as a different organization for these identity details.</span>}
            </span>
            <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {[candidate.signals.normalizedName && "Same name", candidate.signals.sameBarangay && "Same barangay", candidate.signals.exactUrn && "Same URN"]
                .filter(Boolean).map(signal => <StatusChip key={String(signal)} tone="warning">{signal}</StatusChip>)}
            </span>
          </label>)}
          {needsReview && <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={load} disabled={busy} className="h-8 gap-1.5 font-inter text-xs"><RotateCw className="h-3.5 w-3.5" />{busy ? "Checking…" : "Re-run Check"}</Button>
          </div>}
        </div>}
        {packet.candidates.length === 0 && needsReview && <p className="text-sm text-slate-500">No current candidate organizations were found.</p>}
        {/* A cleared check needs no decision; recording one could only block verification. assess() re-flags on new candidates. */}
        {needsReview && <div className="space-y-4 border-t border-slate-200 pt-4">
          <fieldset className="space-y-2">
            <legend className="mb-2 font-inter text-[13px] font-semibold text-text-default">Identity Decision</legend>
            {decisionOptions.map(option => <label key={option.value} className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-3",
              decision === option.value ? "border-public-bg-brand bg-bg-info-tertiary/40" : "border-slate-200")}>
              <input type="radio" name={`identity-decision-${organizationId}`} value={option.value} checked={decision === option.value} disabled={busy}
                className="mt-1" onChange={() => { setDecision(option.value); setConfirmed(false); }} />
              <span className="font-inter text-[13px] normal-case tracking-normal"><span className="block font-semibold text-text-default">{option.title}</span>
                <span className="block font-normal text-slate-500">{option.description}</span></span>
            </label>)}
          </fieldset>
          <div className="space-y-1.5">
            <label htmlFor={`identity-reason-${organizationId}`} className={labelClass}>Reason / Remarks <span className="text-destructive">*</span></label>
            <Textarea id={`identity-reason-${organizationId}`} value={reason} maxLength={3000} disabled={busy} onChange={e => { setReason(e.target.value); setConfirmed(false); }} />
            <p className="text-xs text-slate-500">Explain what is missing or why you reached this decision.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`identity-evidence-${organizationId}`} className={labelClass}>Official Evidence Reference <span className="text-destructive">*</span></label>
            <Input id={`identity-evidence-${organizationId}`} maxLength={1000} value={evidence} disabled={busy} onChange={e => { setEvidence(e.target.value); setConfirmed(false); }} />
            <p className="text-xs text-slate-500">Reference the reviewed official registration record or supporting documents.</p>
          </div>
          <label className="flex items-start gap-2 rounded-md border border-slate-200 p-3 font-inter text-[13px] font-normal normal-case tracking-normal text-text-default">
            <input type="checkbox" className="mt-0.5" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} />
            I reviewed the official evidence. Similar names alone do not establish identity. This decision will not merge records or transfer account ownership.</label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => { resetForm(); setOpen(false); }}>Cancel</Button>
            <Button type="button" onClick={save} disabled={!canSave}>Record Identity Decision</Button>
          </div>
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
      </div>
    )}
  </section>;
}
