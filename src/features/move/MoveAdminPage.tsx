import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  PlaneTakeoff,
  UserRound,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortalEmptyState, PortalSection, PortalStatusBadge } from "@/components/portal/portal-ui";
import { toast } from "@/hooks/use-toast";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import { statusLabelMap, type MOVEApplication } from "@/lib/lydo-connect-data";
import { adminUpdateMoveApplicationInSupabase, resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";

const formatCompactDateLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(date);
};

const adminStatuses: MOVEApplication["status"][] = [
  "under_review",
  "needs_revision",
  "approved_for_ftf_green",
  "rejected_red",
  "completed",
];

export function MoveAdminPage() {
  const { state, updateMoveApplication } = useLydoConnect();
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(state.moveApplications[0]?.id ?? null);
  const [draftStatus, setDraftStatus] = useState<MOVEApplication["status"]>("under_review");
  const [draftRemarks, setDraftRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | MOVEApplication["status"]>("all");

  const applications = useMemo(
    () =>
      [...state.moveApplications]
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .filter((application) => (filter === "all" ? true : application.status === filter)),
    [filter, state.moveApplications],
  );

  useEffect(() => {
    if (!applications.length) {
      setSelectedApplicationId(null);
      setDraftStatus("under_review");
      setDraftRemarks("");
      return;
    }
    const currentSelection = selectedApplicationId
      ? applications.find((application) => application.id === selectedApplicationId) ?? null
      : null;
    const nextSelection = currentSelection ?? applications[0];
    if (nextSelection.id !== selectedApplicationId) {
      setSelectedApplicationId(nextSelection.id);
    }
    setDraftStatus(nextSelection.status);
    setDraftRemarks(nextSelection.adminRemarks ?? "");
  }, [applications, selectedApplicationId]);

  const selectedApplication =
    state.moveApplications.find((application) => application.id === selectedApplicationId) ??
    applications[0] ??
    null;
  const selectedOrganization = selectedApplication
    ? state.organizationProfiles.find((profile) => profile.id === selectedApplication.organizationId) ?? null
    : null;
  const selectedFiles = selectedApplication
    ? state.moveFiles.filter((file) => file.applicationId === selectedApplication.id && file.requirementKey === "move_form")
    : [];

  const handleSelectApplication = (applicationId: string) => {
    setSelectedApplicationId(applicationId);
    const next = state.moveApplications.find((application) => application.id === applicationId) ?? null;
    setDraftStatus(next?.status ?? "under_review");
    setDraftRemarks(next?.adminRemarks ?? "");
  };

  const openFile = async (fileUrl: string) => {
    if (!fileUrl) {
      toast({
        title: "Preview unavailable",
        description: "This file is only stored locally right now. Ask the organization to re-upload if needed.",
        variant: "destructive",
      });
      return;
    }
    try {
      const href = await resolveSupabaseFileUrl(fileUrl);
      window.open(href, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Unable to open file",
        description: error instanceof Error ? error.message : "An error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleSaveReview = async () => {
    if (!selectedApplication) return;
    if ((draftStatus === "needs_revision" || draftStatus === "rejected_red") && !draftRemarks.trim()) {
      toast({
        title: "Remarks required",
        description: "Please add an admin remark when sending the MOVE form back for revision or rejecting it.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const patch: Partial<MOVEApplication> = {
        status: draftStatus,
        adminRemarks: draftRemarks.trim(),
        reviewedAt: now,
        completedAt: draftStatus === "completed" ? now : "",
        revisionHistory: [
          ...(selectedApplication.revisionHistory ?? []),
          { action: draftStatus, adminRemarks: draftRemarks.trim(), changedAt: now },
        ],
      };
      try {
        const saved = await adminUpdateMoveApplicationInSupabase(selectedApplication.id, patch);
        updateMoveApplication(saved.id, saved);
        setDraftStatus(saved.status);
        setDraftRemarks(saved.adminRemarks ?? "");
      } catch {
        updateMoveApplication(selectedApplication.id, patch);
      }
      toast({
        title: "MOVE review saved",
        description: `${selectedOrganization?.organizationName ?? "Organization"} is now marked as ${statusLabelMap[draftStatus] ?? draftStatus}.`,
      });
    } catch (error) {
      toast({
        title: "Unable to save review",
        description: error instanceof Error ? error.message : "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    total: state.moveApplications.length,
    submitted: state.moveApplications.filter((application) => application.status === "submitted" || application.status === "under_review").length,
    approved: state.moveApplications.filter((application) => application.status === "approved_for_ftf_green" || application.status === "completed").length,
    revision: state.moveApplications.filter((application) => application.status === "needs_revision" || application.status === "rejected_red").length,
  };

  return (
    <PortalSection title="MOVE Applications" description="Review the uploaded MOVE application form PDF and continue coordination through the organization email.">
      <div className="space-y-6">
        <Card className="border-border/70">
          <CardContent className="grid gap-4 p-5 md:grid-cols-4">
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <PlaneTakeoff className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Total</span>
              </div>
              <p className="mt-3 text-2xl font-semibold">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">For Review</span>
              </div>
              <p className="mt-3 text-2xl font-semibold">{stats.submitted}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Approved</span>
              </div>
              <p className="mt-3 text-2xl font-semibold">{stats.approved}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <XCircle className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Revision / Rejected</span>
              </div>
              <p className="mt-3 text-2xl font-semibold">{stats.revision}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            All
          </Button>
          {adminStatuses.map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={filter === status ? "default" : "outline"}
              onClick={() => setFilter(status)}
            >
              {statusLabelMap[status] ?? status}
            </Button>
          ))}
        </div>

        {applications.length === 0 ? (
          <PortalEmptyState
            title="No MOVE applications found"
            description="Applications will appear here once organizations submit their accomplished MOVE forms."
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <div className="space-y-3">
              {applications.map((application) => {
                const organization = state.organizationProfiles.find((profile) => profile.id === application.organizationId);
                const applicationFiles = state.moveFiles.filter((file) => file.applicationId === application.id && file.requirementKey === "move_form");
                return (
                  <button
                    key={application.id}
                    type="button"
                    onClick={() => handleSelectApplication(application.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                      application.id === selectedApplication?.id
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/60 bg-card hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {application.programTitle || "MOVE application"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{organization?.organizationName ?? "Unknown organization"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {applicationFiles.length} form file{applicationFiles.length === 1 ? "" : "s"} attached
                        </p>
                      </div>
                      <PortalStatusBadge status={application.status} />
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedApplication ? (
              <Card className="border-border/70">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-semibold">{selectedApplication.programTitle || "MOVE application"}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Review the uploaded MOVE form and use the organization email for further discussion.
                      </p>
                    </div>
                    <PortalStatusBadge status={selectedApplication.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-0">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <UserRound className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em]">Organization Contact</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-foreground">{selectedOrganization?.organizationName ?? "Unknown organization"}</p>
                      <p className="mt-1 text-sm break-all text-foreground">{selectedOrganization?.organizationEmail ?? "No email provided"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedOrganization?.district || "No district"} • {selectedOrganization?.barangay || "No barangay"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em]">Submitted Form</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-foreground">{selectedFiles.length} PDF file{selectedFiles.length === 1 ? "" : "s"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        The checklist is already inside the official MOVE template, so this single uploaded form is the main record for review.
                      </p>
                    </div>
                  </div>

                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">Uploaded MOVE Form PDF</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {selectedFiles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No MOVE form PDF uploaded yet.</p>
                      ) : (
                        selectedFiles.map((file) => (
                          <div key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-foreground">{file.fileName}</p>
                              <p className="text-xs text-muted-foreground">Uploaded {formatCompactDateLabel(file.uploadedAt)}</p>
                            </div>
                            <Button type="button" size="sm" variant="outline" onClick={() => void openFile(file.fileUrl)}>
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                              Open PDF
                            </Button>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    <Label htmlFor="move-admin-status">Review Status</Label>
                    <Select value={draftStatus} onValueChange={(value) => setDraftStatus(value as MOVEApplication["status"])}>
                      <SelectTrigger id="move-admin-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {adminStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {statusLabelMap[status] ?? status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="move-admin-remarks">Admin Remarks</Label>
                    <Textarea
                      id="move-admin-remarks"
                      rows={4}
                      value={draftRemarks}
                      onChange={(event) => setDraftRemarks(event.target.value)}
                      placeholder="Add the review result, follow-up instructions, or revision note here."
                    />
                  </div>

                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">Recent Review Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-3">
                        {(selectedApplication.revisionHistory ?? [])
                          .slice()
                          .sort((left, right) => right.changedAt.localeCompare(left.changedAt))
                          .map((entry, index) => (
                            <li key={`${entry.changedAt}-${index}`} className="text-sm">
                              <p className="font-medium text-foreground">{statusLabelMap[entry.action] ?? entry.action}</p>
                              {entry.adminRemarks ? <p className="text-muted-foreground">{entry.adminRemarks}</p> : null}
                              <p className="text-xs text-muted-foreground">{formatCompactDateLabel(entry.changedAt)}</p>
                            </li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button type="button" onClick={() => void handleSaveReview()} disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save MOVE Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </PortalSection>
  );
}
