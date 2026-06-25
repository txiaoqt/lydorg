import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  FileUp,
  Loader2,
  MapPin,
  PlaneTakeoff,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PortalEmptyState, PortalIconBadge, PortalSection, PortalStatusBadge } from "@/components/portal/portal-ui";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import { statusLabelMap, type MOVEApplication, type MOVEFile } from "@/lib/lydo-connect-data";
import {
  createMoveApplicationInSupabase,
  deleteMoveApplicationFromSupabase,
  deleteMoveFileFromSupabase,
  resolveSupabaseFileUrl,
  updateMoveApplicationInSupabase,
  uploadMoveFileToSupabase,
} from "@/lib/lydo-connect-supabase";

const createLocalId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

const buildEmptyApplication = (organizationId: string, submittedBy: string, organizationName: string): MOVEApplication => ({
  id: createLocalId("move"),
  organizationId,
  submittedBy,
  programTitle: `MOVE Application - ${organizationName}`,
  opportunityType: "international_delegation",
  organizerName: "",
  location: "",
  invitationSource: "",
  startDate: "",
  endDate: "",
  expectedExpenseTotal: 0,
  approvedAssistancePercent: null,
  status: "draft",
  adminRemarks: "",
  applicantNote: "",
  submittedAt: "",
  reviewedAt: "",
  completedAt: "",
  revisionHistory: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export function MoveUserPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    state,
    createMoveApplication,
    updateMoveApplication,
    deleteMoveApplication,
    createMoveFile,
    deleteMoveFile,
  } = useLydoConnect();

  const currentProfile = state.organizationProfiles.find((profile) => profile.userId === user?.id) ?? null;
  const isLocked = currentProfile?.profileStatus !== "verified";

  const applications = useMemo(
    () =>
      state.moveApplications
        .filter((application) => application.organizationId === (currentProfile?.id ?? ""))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [currentProfile?.id, state.moveApplications],
  );
  const files = useMemo(
    () => state.moveFiles.filter((file) => file.organizationId === (currentProfile?.id ?? "")),
    [currentProfile?.id, state.moveFiles],
  );
  const moveTemplates = useMemo(
    () =>
      [...state.templates]
        .filter((template) => template.templateActive && template.isActive && template.templateScope === "move")
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [state.templates],
  );
  const primaryMoveTemplate = moveTemplates[0] ?? null;

  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(applications[0]?.id ?? null);
  const [savingApplication, setSavingApplication] = useState(false);
  const [uploadingMoveForm, setUploadingMoveForm] = useState(false);

  useEffect(() => {
    if (!applications.length) {
      setSelectedApplicationId(null);
      return;
    }
    if (!selectedApplicationId || !applications.some((application) => application.id === selectedApplicationId)) {
      setSelectedApplicationId(applications[0].id);
    }
  }, [applications, selectedApplicationId]);

  const selectedApplication =
    applications.find((application) => application.id === selectedApplicationId) ??
    applications[0] ??
    null;
  const selectedFiles = selectedApplication
    ? files.filter((file) => file.applicationId === selectedApplication.id && file.requirementKey === "move_form")
    : [];

  const selectedYear = selectedApplication?.createdAt ? new Date(selectedApplication.createdAt).getFullYear() : new Date().getFullYear();
  const yearAvailmentCount = applications.filter(
    (application) =>
      new Date(application.createdAt).getFullYear() === selectedYear &&
      application.status !== "rejected_red",
  ).length;

  const patchSelectedApplication = (patch: Partial<MOVEApplication>) => {
    if (!selectedApplication) return;
    updateMoveApplication(selectedApplication.id, patch);
  };

  const openFile = async (file: MOVEFile) => {
    if (!file.fileUrl) {
      toast({
        title: "Preview unavailable",
        description: "This file is only stored locally right now. Refresh after Supabase sync or re-upload if needed.",
        variant: "destructive",
      });
      return;
    }
    try {
      const href = await resolveSupabaseFileUrl(file.fileUrl);
      window.open(href, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Unable to open file",
        description: error instanceof Error ? error.message : "An error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleCreateApplication = async () => {
    if (!currentProfile?.id || !user?.id) return;
    const draft = buildEmptyApplication(currentProfile.id, user.id, currentProfile.organizationName || "Organization");
    setSavingApplication(true);
    try {
      try {
        const saved = await createMoveApplicationInSupabase(draft);
        createMoveApplication(saved);
        setSelectedApplicationId(saved.id);
      } catch {
        createMoveApplication(draft);
        setSelectedApplicationId(draft.id);
      }
      toast({
        title: "MOVE draft created",
        description: "Open the MOVE template and upload the accomplished PDF when ready.",
      });
    } catch (error) {
      toast({
        title: "Unable to create draft",
        description: error instanceof Error ? error.message : "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setSavingApplication(false);
    }
  };

  const handleUploadMoveForm = async (file: File) => {
    if (!selectedApplication || !currentProfile?.id) return;
    setUploadingMoveForm(true);
    try {
      for (const existingFile of selectedFiles) {
        try {
          await deleteMoveFileFromSupabase(existingFile.id, existingFile.fileUrl);
        } catch {
          // ignore
        }
        deleteMoveFile(existingFile.id);
      }

      try {
        const saved = await uploadMoveFileToSupabase({
          applicationId: selectedApplication.id,
          organizationId: currentProfile.id,
          requirementKey: "move_form",
          requirementPhase: "pre_application",
          file,
        });
        createMoveFile(saved);
      } catch {
        createMoveFile({
          id: createLocalId("move-file"),
          applicationId: selectedApplication.id,
          organizationId: currentProfile.id,
          requirementKey: "move_form",
          requirementPhase: "pre_application",
          fileName: file.name,
          fileUrl: "",
          fileType: file.type,
          uploadedAt: new Date().toISOString(),
        });
      }

      toast({
        title: "MOVE form attached",
        description: `${file.name} is now linked to this MOVE application.`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setUploadingMoveForm(false);
    }
  };

  const promptMoveFormUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,application/pdf";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        void handleUploadMoveForm(file);
      }
    };
    input.click();
  };

  const handleDeleteFile = async (file: MOVEFile) => {
    try {
      await deleteMoveFileFromSupabase(file.id, file.fileUrl);
    } catch {
      // local fallback
    }
    deleteMoveFile(file.id);
  };

  const validateBeforeSubmit = (application: MOVEApplication) => {
    if (!currentProfile?.organizationEmail?.trim()) {
      return "Your organization email is required before submitting the MOVE form.";
    }
    const uploadedMoveForm = files.some(
      (file) => file.applicationId === application.id && file.requirementKey === "move_form",
    );
    if (!uploadedMoveForm) {
      return "Please upload the accomplished MOVE application form in PDF format.";
    }
    return "";
  };

  const handleSubmitForReview = async () => {
    if (!selectedApplication) return;
    const validationMessage = validateBeforeSubmit(selectedApplication);
    if (validationMessage) {
      toast({ title: "Incomplete MOVE application", description: validationMessage, variant: "destructive" });
      return;
    }

    setSavingApplication(true);
    try {
      const now = new Date().toISOString();
      const patch: Partial<MOVEApplication> = {
        status: "submitted",
        submittedAt: now,
        revisionHistory: [
          ...(selectedApplication.revisionHistory ?? []),
          { action: "submitted", adminRemarks: "MOVE application submitted for review.", changedAt: now },
        ],
      };
      try {
        const saved = await updateMoveApplicationInSupabase(selectedApplication.id, patch);
        updateMoveApplication(saved.id, saved);
      } catch {
        updateMoveApplication(selectedApplication.id, patch);
      }
      toast({ title: "MOVE submitted", description: "Your accomplished MOVE form is now under admin review." });
    } catch (error) {
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setSavingApplication(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedApplication) return;
    setSavingApplication(true);
    try {
      const patch: Partial<MOVEApplication> = {
        applicantNote: selectedApplication.applicantNote,
        status:
          selectedApplication.status === "submitted" ||
          selectedApplication.status === "under_review" ||
          selectedApplication.status === "approved_for_ftf_green" ||
          selectedApplication.status === "completed"
            ? selectedApplication.status
            : "draft",
      };
      try {
        const saved = await updateMoveApplicationInSupabase(selectedApplication.id, patch);
        updateMoveApplication(saved.id, saved);
      } catch {
        updateMoveApplication(selectedApplication.id, patch);
      }
      toast({ title: "Draft saved", description: "Your MOVE note has been saved." });
    } catch (error) {
      toast({
        title: "Unable to save draft",
        description: error instanceof Error ? error.message : "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setSavingApplication(false);
    }
  };

  const handleDeleteApplication = async (application: MOVEApplication) => {
    if (!window.confirm("Delete this MOVE draft?")) return;
    try {
      await deleteMoveApplicationFromSupabase(application.id);
    } catch {
      // local fallback
    }
    deleteMoveApplication(application.id);
    setSelectedApplicationId((current) => (current === application.id ? null : current));
  };

  if (isLocked) {
    return (
      <PortalSection title="MOVE" description="This section becomes available after your organization registration is approved.">
        <Card className="border-border/70">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-500/10 p-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Waiting for Admin Approval</h3>
                <p className="text-sm text-muted-foreground">
                  Your MOVE page unlocks once the admin verifies your organization profile.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </PortalSection>
    );
  }

  return (
    <PortalSection
      title="MOVE"
      description="Download the official MOVE application form, upload the accomplished PDF, and wait for follow-up through your registered email."
      action={
        <Button type="button" size="sm" onClick={() => void handleCreateApplication()} disabled={savingApplication}>
          {savingApplication ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
          New MOVE Application
        </Button>
      }
    >
      <div className="space-y-4">
        <Card className="border-border/70">
          <CardContent className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-3.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <PortalIconBadge icon={PlaneTakeoff} tone="primary" size="sm" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Applications</span>
              </div>
              <p className="mt-2.5 text-2xl font-semibold text-foreground">{applications.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">MOVE applications linked to your organization.</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-3.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <PortalIconBadge icon={Wallet} tone="emerald" size="sm" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Contact Email</span>
              </div>
              <p className="mt-2.5 text-sm font-semibold break-all text-foreground">{currentProfile?.organizationEmail || "Not set yet"}</p>
              <p className="mt-1 text-sm text-muted-foreground">Further discussion will continue through this email.</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-3.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <PortalIconBadge icon={CheckCircle2} tone="amber" size="sm" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Yearly Availment</span>
              </div>
              <p className="mt-2.5 text-2xl font-semibold text-foreground">{yearAvailmentCount} / 2</p>
              <p className="mt-1 text-sm text-muted-foreground">The memo allows at most two MOVE availments per year.</p>
            </div>
          </CardContent>
        </Card>

        {applications.length === 0 ? (
          <PortalEmptyState
            title="No MOVE applications yet"
            description="Create a MOVE draft to access the official template and upload your accomplished PDF."
            action={
              <Button type="button" onClick={() => void handleCreateApplication()}>
                Start MOVE Application
              </Button>
            }
          />
        ) : selectedApplication ? (
          <div className="mx-auto w-full max-w-6xl space-y-4">
            {applications.length > 1 ? (
              <Card className="border-border/70">
                <CardContent className="p-3.5 sm:p-4">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Active MOVE application</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Switch between your saved MOVE applications here.
                      </p>
                    </div>
                    <Select value={selectedApplication.id} onValueChange={setSelectedApplicationId}>
                      <SelectTrigger className="w-full sm:w-[320px]">
                        <SelectValue placeholder="Select MOVE application" />
                      </SelectTrigger>
                      <SelectContent>
                        {applications.map((application) => {
                          const applicationFiles = files.filter((file) => file.applicationId === application.id && file.requirementKey === "move_form");
                          return (
                            <SelectItem key={application.id} value={application.id}>
                              {(application.programTitle.trim() || "MOVE application") + ` • ${applicationFiles.length} file${applicationFiles.length === 1 ? "" : "s"}`}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="space-y-4">
              <Card className="border-border/70">
                <CardHeader className="pb-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {selectedApplication.programTitle.trim() || "MOVE application"}
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Download the published MOVE template, accomplish it, then upload the scanned or soft-copy PDF.
                      </p>
                    </div>
                    <PortalStatusBadge status={selectedApplication.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {selectedApplication.adminRemarks.trim() ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Admin Remarks</p>
                      <p className="mt-2 text-sm text-amber-900">{selectedApplication.adminRemarks}</p>
                    </div>
                  ) : null}

                  <div className="grid items-stretch gap-4 lg:grid-cols-2">
                    <Card className="flex h-full flex-col border-border/60">
                      <CardHeader className="pb-2.5">
                        <CardTitle className="text-sm font-semibold">Published Template</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
                        <div className="rounded-xl border border-border/60 bg-muted/15 p-3.5">
                          <div className="flex items-start gap-3">
                            <PortalIconBadge icon={FileText} tone="red" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{primaryMoveTemplate?.name || "MOVE Application Template"}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                The checklist is already inside the template form, so you only need this file plus your accomplished PDF submission.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-auto space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="flex-1 sm:flex-none"
                              disabled={!primaryMoveTemplate?.templateFileUrl}
                              onClick={() =>
                                primaryMoveTemplate
                                  ? void openFile({
                                      id: primaryMoveTemplate.id,
                                      applicationId: selectedApplication.id,
                                      organizationId: selectedApplication.organizationId,
                                      requirementKey: "move_form",
                                      requirementPhase: "pre_application",
                                      fileName: primaryMoveTemplate.templateFileName || primaryMoveTemplate.name,
                                      fileUrl: primaryMoveTemplate.templateFileUrl,
                                      fileType: primaryMoveTemplate.templateFileType || "",
                                      uploadedAt: primaryMoveTemplate.templateUploadedAt || "",
                                    })
                                  : undefined
                              }
                            >
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                              View Template
                            </Button>
                            <Button
                              type="button"
                              className="flex-1 sm:flex-none"
                              disabled={!primaryMoveTemplate?.templateFileUrl}
                              onClick={() =>
                                primaryMoveTemplate
                                  ? void resolveSupabaseFileUrl(primaryMoveTemplate.templateFileUrl)
                                      .then((resolvedUrl) => {
                                        const link = document.createElement("a");
                                        link.href = resolvedUrl;
                                        link.download = primaryMoveTemplate.templateFileName || primaryMoveTemplate.name;
                                        link.target = "_blank";
                                        link.rel = "noreferrer";
                                        document.body.appendChild(link);
                                        link.click();
                                        link.remove();
                                      })
                                      .catch((error) =>
                                        toast({
                                          title: "Unable to download template",
                                          description: error instanceof Error ? error.message : "An error occurred.",
                                          variant: "destructive",
                                        }),
                                      )
                                  : undefined
                              }
                            >
                              <FileText className="mr-1.5 h-3.5 w-3.5" />
                              Download Template
                            </Button>
                          </div>
                          {!primaryMoveTemplate?.templateFileUrl ? (
                            <p className="text-sm text-amber-700">
                              No MOVE template file has been uploaded by the admin yet.
                            </p>
                          ) : (
                            <div className="rounded-xl border border-border/50 bg-muted/10 px-3 py-2.5">
                              <p className="text-sm font-medium text-foreground">
                                {primaryMoveTemplate.templateFileName || primaryMoveTemplate.name}
                              </p>
                              {primaryMoveTemplate.templateUploadedAt ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Updated {formatCompactDateLabel(primaryMoveTemplate.templateUploadedAt)}
                                </p>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="flex h-full flex-col border-border/60">
                      <CardHeader className="pb-2.5">
                        <CardTitle className="text-sm font-semibold">MOVE Form Submission</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
                        <div className="rounded-xl border border-border/60 bg-muted/15 p-3.5">
                          <div className="flex items-start gap-3">
                            <PortalIconBadge icon={Wallet} tone="emerald" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">Required contact email</p>
                              <p className="mt-1 text-sm font-medium break-all text-foreground">
                                {currentProfile?.organizationEmail || "Not set yet"}
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                This email is required because further discussion about the MOVE application will continue here after submission.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/60 p-3.5">
                          <div className="flex min-w-0 items-start gap-3">
                            <PortalIconBadge icon={FileUp} tone="red" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">Soft copy / scanned PDF</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Upload the accomplished MOVE application form in PDF format only.
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={uploadingMoveForm || selectedApplication.status === "completed"}
                            onClick={promptMoveFormUpload}
                          >
                            {uploadingMoveForm ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FileUp className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Upload PDF
                          </Button>
                        </div>

                        {selectedFiles.length === 0 ? (
                          <div className="mt-auto rounded-xl border border-dashed border-border/60 bg-muted/10 px-3 py-4 text-sm text-muted-foreground">
                            No MOVE form uploaded yet.
                          </div>
                        ) : (
                          selectedFiles.map((file) => (
                            <div key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                              <div>
                                <p className="text-sm font-medium text-foreground">{file.fileName}</p>
                                <p className="text-xs text-muted-foreground">Uploaded {formatCompactDateLabel(file.uploadedAt)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button type="button" size="sm" variant="outline" onClick={() => void openFile(file)}>
                                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                  Open
                                </Button>
                                {selectedApplication.status !== "completed" ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => void handleDeleteFile(file)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="move-note">Message for Admin</Label>
                    <Textarea
                      id="move-note"
                      rows={3}
                      value={selectedApplication.applicantNote}
                      onChange={(event) => patchSelectedApplication({ applicantNote: event.target.value })}
                      placeholder="Optional note for the admin before they review your submitted MOVE form."
                      disabled={selectedApplication.status === "completed"}
                    />
                  </div>

                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-3">
                        {[
                          ...(selectedApplication.revisionHistory ?? []).map((entry) => ({
                            id: `${entry.changedAt}-${entry.action}`,
                            label: statusLabelMap[entry.action] ?? entry.action,
                            note: entry.adminRemarks,
                            at: entry.changedAt,
                          })),
                          ...selectedFiles.map((file) => ({
                            id: file.id,
                            label: `MOVE form attached — ${file.fileName}`,
                            note: "",
                            at: file.uploadedAt,
                          })),
                        ]
                          .sort((left, right) => right.at.localeCompare(left.at))
                          .map((entry) => (
                            <li key={entry.id} className="flex items-start gap-3 text-sm">
                              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/60" />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground">{entry.label}</p>
                                {entry.note ? <p className="text-muted-foreground">{entry.note}</p> : null}
                                <p className="text-xs text-muted-foreground">{formatCompactDateLabel(entry.at)}</p>
                              </div>
                            </li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
                      disabled={selectedApplication.status === "submitted" || selectedApplication.status === "under_review" || selectedApplication.status === "completed"}
                      onClick={() => void handleDeleteApplication(selectedApplication)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Draft
                    </Button>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={savingApplication || selectedApplication.status === "completed"}
                        onClick={() => void handleSaveDraft()}
                      >
                        Save Draft
                      </Button>
                      <Button type="button" variant="outline" onClick={() => navigate("/ypop")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Incentives
                      </Button>
                      <Button
                        type="button"
                        disabled={savingApplication || selectedApplication.status === "completed"}
                        onClick={() => void handleSubmitForReview()}
                      >
                        {savingApplication ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {selectedApplication.status === "needs_revision" ? "Resubmit MOVE Form" : "Submit for Review"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-border/60">
                  <CardContent className="flex items-start gap-3 p-4">
                    <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Timeline Rule</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Applications should be submitted at least two weeks before the delegation schedule.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardContent className="flex items-start gap-3 p-4">
                    <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Residency Rule</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        The memo requires the applicant to be a Pasig City youth resident aged 15 to 30.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardContent className="flex items-start gap-3 p-4">
                    <FileText className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Submission Rule</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        The published template already contains the checklist, so the required portal submission is the accomplished MOVE form PDF.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PortalSection>
  );
}
