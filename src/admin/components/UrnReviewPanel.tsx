import { useState } from "react";
import { ArrowLeft, CheckCircle2, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { OrganizationProfile } from "@/lib/lydo-connect-data";
import { reviewOrganizationUrnInSupabase } from "@/lib/lydo-connect-supabase";
import { urnReviewLabels } from "@/lib/urn-registration";

type Decision = "verified" | "needs_correction" | "rejected";

export function UrnReviewPanel({ profile, onBack, onReviewed }: {
  profile: OrganizationProfile;
  onBack: () => void;
  onReviewed: (profile: OrganizationProfile) => void;
}) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [remarks, setRemarks] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!decision || (decision === "verified" && !confirmed)) return;
    if (decision !== "verified" && !remarks.trim()) return;
    setSaving(true);
    try {
      const updated = await reviewOrganizationUrnInSupabase({
        organizationId: profile.id, expectedUrn: profile.urn, decision, remarks,
      });
      onReviewed(updated);
      setDecision(null); setRemarks(""); setConfirmed(false);
      toast({ title: decision === "verified" ? "URN verified" : decision === "needs_correction" ? "Correction requested" : "URN rejected" });
    } catch (error) {
      toast({ title: "URN review failed", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    } finally { setSaving(false); }
  };
  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Back to Registration Review</Button>
      <section className="mx-auto max-w-3xl rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Existing URN</p><h1 className="text-2xl font-semibold">{profile.organizationName}</h1><p className="text-sm text-muted-foreground">{profile.organizationEmail}</p></div>
          <span className="rounded-full border px-3 py-1 text-sm font-medium">{urnReviewLabels[profile.urnReviewStatus]}</span>
        </div>
        <div className="mt-6 rounded-xl border bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submitted Unique Registration Number (URN)</p>
          <div className="mt-2 flex items-center gap-2"><strong className="break-all text-xl">{profile.urn || "No URN was submitted"}</strong><Button size="icon" variant="ghost" aria-label="Copy URN" onClick={() => void navigator.clipboard.writeText(profile.urn)}><Copy className="h-4 w-4" /></Button></div>
          <p className="mt-3 text-sm text-muted-foreground">Verify this number against the official LYDO / PCYDO registration record outside Y-TRACE.</p>
        </div>
        {profile.urnAdminRemarks ? <div className="mt-4 rounded-lg border p-3 text-sm"><strong>Latest remarks</strong><p>{profile.urnAdminRemarks}</p></div> : null}
        {profile.urnReviewStatus !== "verified" ? <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <Button onClick={() => setDecision("verified")}><CheckCircle2 className="mr-2 h-4 w-4" />Verify URN</Button>
          <Button variant="outline" onClick={() => setDecision("needs_correction")}>Needs Correction</Button>
          <Button variant="destructive" onClick={() => setDecision("rejected")}>Reject URN</Button>
        </div> : null}
      </section>
      <Dialog open={Boolean(decision)} onOpenChange={(open) => !saving && !open && setDecision(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{decision === "verified" ? "Confirm URN verification" : decision === "needs_correction" ? "Request URN correction" : "Reject URN verification"}</DialogTitle>
            <DialogDescription>{decision === "verified" ? "Confirm that the submitted URN matches the official LYDO / PCYDO registration record for this organization." : "Explain the decision clearly to the organization."}</DialogDescription>
          </DialogHeader>
          <dl className="rounded-lg bg-muted p-3 text-sm"><dt className="text-muted-foreground">Organization</dt><dd className="font-medium">{profile.organizationName}</dd><dt className="mt-2 text-muted-foreground">Submitted URN</dt><dd className="font-medium">{profile.urn}</dd></dl>
          {decision === "verified" ? <div className="flex items-start gap-3"><Checkbox id="confirm-urn" checked={confirmed} onCheckedChange={(v) => setConfirmed(Boolean(v))} /><Label htmlFor="confirm-urn">I confirm that I checked this URN against the official LYDO / PCYDO record.</Label></div> : <div className="space-y-2"><Label htmlFor="urn-remarks">Admin feedback *</Label><Textarea id="urn-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Explain why the URN could not be confirmed and what the organization should check." /></div>}
          <DialogFooter><Button variant="outline" onClick={() => setDecision(null)} disabled={saving}>Cancel</Button><Button variant={decision === "rejected" ? "destructive" : "default"} disabled={saving || (decision === "verified" ? !confirmed : !remarks.trim())} onClick={() => void submit()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{decision === "verified" ? "Verify Organization" : decision === "needs_correction" ? "Send Correction Request" : "Reject URN"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
