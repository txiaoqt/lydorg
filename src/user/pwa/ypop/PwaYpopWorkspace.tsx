import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  CalendarDays,
  ChevronRight,
  FileText,
  Loader2,
  LockKeyhole,
  Medal,
  Plus,
  Send,
  Trash2,
  Trophy,
  Upload,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { toast } from "@/hooks/use-toast";
import {
  buildVerifiedYpopAttendance,
  computeYpopScore,
  getApprovedYpopOrgActivityCount,
  normalizeYpopCityLedPoints,
  resolveYpopCityLedCategory,
  YPOP_CITY_LED_CATEGORY_LABELS,
  type YPOPEntry,
  type YPOPEventParticipation,
  type YPOPOrgActivity,
} from "@/lib/lydo-connect-data";
import {
  createYpopEventParticipationInSupabase,
  createYpopOrgActivityInSupabase,
  deleteYpopEntryFromSupabase,
  deleteYpopEventFileFromSupabase,
  deleteYpopOrgActivityFileFromSupabase,
  deleteYpopOrgActivityFromSupabase,
  resolveSupabaseFileUrl,
  updateYpopEntryInSupabase,
  updateYpopEventParticipationInSupabase,
  updateYpopOrgActivityInSupabase,
  uploadYpopEventFileToSupabase,
  uploadYpopOrgActivityFileToSupabase,
} from "@/lib/lydo-connect-supabase";
import {
  getYpopEventJoinEligibility,
  isPastYpopActivityDate,
  isYpopEntryEditable,
  isYpopPeriodOpen,
} from "@/lib/ypop-event-eligibility";
import type { usePwaPortalData } from "../hooks/usePwaPortalData";
import { PwaBackButton } from "../PwaBackButton";
import { usePwaNavigation } from "../hooks/usePwaNavigation";
import {
  PWA_ROUTES,
  pwaYpopEntryRoute,
  pwaYpopPpaEditRoute,
  pwaYpopPpaListRoute,
  pwaYpopPpaNewRoute,
} from "../pwaRoutes";

type PortalData = ReturnType<typeof usePwaPortalData>;
type EventTab = "ongoing" | "past";

const formatDateTime = (value: string) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(date);
};

const eventProofLabel = (participation: YPOPEventParticipation, fileCount: number) => {
  if (participation.status === "verified") return "Verified";
  if (participation.status === "needs_revision") return "Needs Revision";
  if (participation.status === "rejected") return "Rejected";
  if (participation.proofSubmittedAt) return "Under Admin Review";
  if (fileCount) return "Proof Attached";
  return "Proof Required";
};

async function openStoredFile(fileUrl: string) {
  const url = await resolveSupabaseFileUrl(fileUrl);
  if (!url) throw new Error("The file is currently unavailable.");
  window.open(url, "_blank", "noopener,noreferrer");
}

export function PwaYpopWorkspace({ data }: { data: PortalData }) {
  const { entryId, periodId } = useParams();
  const { go } = usePwaNavigation();
  const [eventTab, setEventTab] = useState<EventTab>("ongoing");
  const [note, setNote] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [deleteEntryOpen, setDeleteEntryOpen] = useState(false);
  const { confirmAction, confirmationDialog } = useConfirmActionDialog();
  const eventFileInput = useRef<HTMLInputElement | null>(null);
  const [uploadParticipationId, setUploadParticipationId] = useState("");
  const { state } = data.store;
  const organizationId = data.profile?.id ?? "";
  const requestedEntry = entryId
    ? state.ypopEntries.find((item) => item.id === entryId && item.organizationId === organizationId) ?? null
    : null;
  const entry = requestedEntry && state.ypopPeriods.some(
    (item) => item.semesterKey === requestedEntry.semester,
  )
    ? requestedEntry
    : null;
  const period = periodId
    ? state.ypopPeriods.find((item) => item.id === periodId) ?? null
    : state.ypopPeriods.find((item) => item.semesterKey === entry?.semester) ?? null;
  const semesterKey = entry?.semester || period?.semesterKey || "";
  const activities = state.ypopCityActivities
    .filter((item) => item.semesterKey === semesterKey)
    .sort((left, right) => left.date.localeCompare(right.date));
  const currentActivityForParticipation = (participation: YPOPEventParticipation) =>
    activities.find((activity) => activity.id === participation.activityId) ?? null;
  const currentParticipationDate = (participation: YPOPEventParticipation) =>
    currentActivityForParticipation(participation)?.date || participation.activityDate;
  const participations = state.ypopEventParticipations.filter((item) =>
    item.organizationId === organizationId && activities.some((activity) => activity.id === item.activityId),
  );
  const orgActivities = entry
    ? state.ypopOrgActivities
      .filter((item) => item.ypopEntryId === entry.id)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    : [];
  const visibleOrgActivities = orgActivities.slice(0, 3);
  const editable = Boolean(entry && isYpopEntryEditable(entry) && isYpopPeriodOpen(period));
  const ppaUnlocked = Boolean(entry?.status === "qualified" && isYpopPeriodOpen(period));
  const finalized = entry?.status === "qualified" || entry?.status === "not_qualified";
  const readOnly = Boolean(entry && !editable);
  const approvedPpas = entry ? getApprovedYpopOrgActivityCount(orgActivities, entry.id, entry.orgLedProjectCount ?? 0) : 0;
  const verifiedAttendance = buildVerifiedYpopAttendance(activities, participations, entry?.cityLedAttendance);
  const score = computeYpopScore(verifiedAttendance, activities, approvedPpas, period?.orgLedTiers);

  useEffect(() => {
    setNote(entry?.submissionNote ?? "");
  }, [entry?.id, entry?.submissionNote]);

  const refresh = async () => {
    await data.refresh();
  };

  const joinEvent = async (activityId: string) => {
    const activity = activities.find((item) => item.id === activityId);
    if (!activity) return;
    const participation = participations.find((item) => item.activityId === activity.id);
    const eligibility = getYpopEventJoinEligibility({ activity, period, entry, participation, profile: data.profile });
    if (!eligibility.allowed) {
      toast({ title: eligibility.label, description: "This activity cannot be joined in its current state.", variant: "destructive" });
      return;
    }
    setBusyKey(`join-${activity.id}`);
    try {
      const saved = await createYpopEventParticipationInSupabase({
        organizationId,
        activityId: activity.id,
        activityName: activity.name,
        activityDate: activity.date,
        venue: activity.venue,
        status: "pending_verification",
        adminRemarks: "",
        joinedAt: new Date().toISOString(),
      });
      data.store.createYPOPEventParticipation(saved);
      await refresh();
      toast({ title: "Event joined", description: `${activity.name} was added to Joined Activities.` });
    } catch (error) {
      toast({ title: "Unable to join event", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setBusyKey("");
    }
  };

  const uploadEventProof = async (file: File) => {
    if (!uploadParticipationId) return;
    setBusyKey(`event-upload-${uploadParticipationId}`);
    try {
      const saved = await uploadYpopEventFileToSupabase({ participationId: uploadParticipationId, organizationId, file });
      data.store.createYPOPEventFile(saved);
      await refresh();
      toast({ title: "Proof attached", description: file.name });
    } catch (error) {
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setBusyKey("");
      setUploadParticipationId("");
      if (eventFileInput.current) eventFileInput.current.value = "";
    }
  };

  const removeEventProof = async (fileId: string, fileUrl: string) => {
    if (!await confirmAction({
      title: "Remove proof file?",
      description: "This proof file will be permanently removed from the event submission.",
      confirmLabel: "Remove File",
      destructive: true,
    })) return;
    setBusyKey(`event-delete-${fileId}`);
    try {
      await deleteYpopEventFileFromSupabase(fileId, fileUrl);
      data.store.deleteYPOPEventFile(fileId);
      await refresh();
    } catch (error) {
      toast({ title: "Unable to remove proof", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setBusyKey("");
    }
  };

  const submitEventProof = async (participation: YPOPEventParticipation) => {
    const files = state.ypopEventFiles.filter((item) => item.participationId === participation.id);
    if (!files.length) {
      toast({ title: "Proof required", description: "Attach at least one proof file first.", variant: "destructive" });
      return;
    }
    setBusyKey(`event-submit-${participation.id}`);
    try {
      const now = new Date().toISOString();
      const saved = await updateYpopEventParticipationInSupabase(participation.id, {
        status: "pending_verification",
        adminRemarks: "",
        proofSubmittedAt: now,
        revisionHistory: [
          ...(participation.revisionHistory ?? []),
          { action: "pending_verification", adminRemarks: "Proof submitted for admin verification.", changedAt: now },
        ],
      });
      data.store.updateYPOPEventParticipation(saved.id, saved);
      await refresh();
      toast({ title: "Proof submitted", description: "The event proof is under admin review." });
    } catch (error) {
      toast({ title: "Submission failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setBusyKey("");
    }
  };

  const pastJoinedWithoutProof = participations.filter((participation) =>
    isPastYpopActivityDate(currentParticipationDate(participation)) && !participation.proofSubmittedAt,
  );
  const totalProofCount =
    state.ypopEventFiles.filter((file) => participations.some((participation) => participation.id === file.participationId)).length +
    state.ypopOrgActivityFiles.filter((file) => orgActivities.some((activity) => activity.id === file.orgActivityId)).length;
  const submissionBlockReason = !entry
    ? "Start a submission before sending it for validation."
    : !editable
      ? "This submission is read-only in its current state."
      : pastJoinedWithoutProof.length
        ? "Submit the required proof for every completed joined event."
        : "";

  const submitEntry = async () => {
    if (!entry || submissionBlockReason) return;
    if (!await confirmAction({
      title: entry.status === "needs_revision" ? "Resubmit for city-led validation?" : "Submit for city-led validation?",
      description: `Your joined city-led activities and their proof files will be sent to the admin for validation.${note.trim() ? "\n\nYour message for the admin will be included." : ""}`,
      confirmLabel: entry.status === "needs_revision" ? "Resubmit for Validation" : "Submit for Validation",
    })) return;
    setBusyKey("submit-entry");
    try {
      const now = new Date().toISOString();
      const saved = await updateYpopEntryInSupabase(entry.id, {
        status: "submitted",
        submissionNote: note.trim(),
        submittedAt: now,
        revisionHistory: [
          ...(entry.revisionHistory ?? []),
          { action: "submitted", adminRemarks: "", changedAt: now },
        ],
      });
      data.store.updateYPOPEntry(saved.id, saved);
      await refresh();
      toast({ title: "Submitted for validation", description: "Your semester record is now under admin review." });
    } catch (error) {
      toast({ title: "Submission failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setBusyKey("");
    }
  };

  const deleteEntry = async () => {
    if (!entry) return;
    setBusyKey("delete-entry");
    try {
      await deleteYpopEntryFromSupabase(entry.id);
      data.store.deleteYPOPEntry(entry.id);
      await refresh();
      setDeleteEntryOpen(false);
      go(PWA_ROUTES.ypop, { replace: true });
      toast({ title: "Draft deleted" });
    } catch (error) {
      toast({ title: "Unable to delete submission", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setBusyKey("");
    }
  };

  const deletePpa = async (activity: YPOPOrgActivity) => {
    if (!await confirmAction({
      title: `Delete “${activity.activityName}”?`,
      description: "This permanently removes the PPA activity and its attached files. This action cannot be undone.",
      confirmLabel: "Delete PPA",
      destructive: true,
    })) return;
    setBusyKey(`ppa-delete-${activity.id}`);
    try {
      await deleteYpopOrgActivityFromSupabase(activity.id);
      data.store.deleteYPOPOrgActivity(activity.id);
      await refresh();
    } catch (error) {
      toast({ title: "Unable to delete PPA", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setBusyKey("");
    }
  };

  const activityLog = (() => {
    if (!entry) return [];
    const records: Array<{ id: string; title: string; context: string; date: string }> = [
      { id: `entry-${entry.id}`, title: "Submission started", context: entry.semesterLabel, date: entry.createdAt },
      ...(entry.revisionHistory ?? []).map((item, index) => ({
        id: `entry-history-${index}`,
        title: item.action.replaceAll("_", " "),
        context: item.adminRemarks,
        date: item.changedAt,
      })),
      ...participations.flatMap((participation) => [
        { id: `joined-${participation.id}`, title: "Joined event", context: participation.activityName, date: participation.joinedAt },
        ...(participation.proofSubmittedAt ? [{ id: `proof-${participation.id}`, title: "Event proof submitted", context: participation.activityName, date: participation.proofSubmittedAt }] : []),
      ]),
      ...orgActivities.map((activity) => ({
        id: `ppa-${activity.id}`,
        title: `PPA ${activity.status.replaceAll("_", " ")}`,
        context: activity.activityName,
        date: activity.updatedAt,
      })),
    ];
    return records.filter((item) => item.date).sort((left, right) => right.date.localeCompare(left.date));
  })();

  if (!period && !entry) {
    return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.ypop} label="YPOP Incentive" /><section className="pwa-card pwa-empty-copy">YPOP period not found.</section></div>;
  }

  const filteredActivities = activities.filter((activity) => eventTab === "past" ? isPastYpopActivityDate(activity.date) : !isPastYpopActivityDate(activity.date));
  const filteredParticipations = participations.filter((participation) => eventTab === "past" ? isPastYpopActivityDate(currentParticipationDate(participation)) : !isPastYpopActivityDate(currentParticipationDate(participation)));
  const availableActivities = filteredActivities.filter((activity) => !participations.some((participation) => participation.activityId === activity.id));

  return (
    <div className="pwa-stack pwa-ypop-workspace">
      <PwaBackButton fallback={PWA_ROUTES.ypop} label="YPOP Incentive" />
      <section className="pwa-card pwa-ypop-workspace-summary">
        <div className="pwa-ypop-heading">
          <div><h2>{entry?.semesterLabel || period?.semesterLabel}</h2><p><CalendarDays /> Validation closes {formatDateTime(entry?.validationDeadline || period?.validationDeadline || "")}</p></div>
          <StatusBadge status={entry?.status ?? period?.status ?? "closed"} />
        </div>
        <div className="pwa-ypop-score">
          <span><small>Current score</small><strong>{score.totalScore}%</strong></span>
          <span><small>Qualification threshold</small><strong>{entry?.pointsRequired ?? 70}%</strong></span>
        </div>
        <div className="pwa-progress"><span style={{ width: `${Math.min(100, score.totalScore)}%` }} /></div>
        <div className="pwa-ypop-metrics">
          <span><small>City-led points</small><strong>{score.cityLedEarned} / {score.cityLedMax}</strong></span>
          <span><small>City percentage</small><strong>{score.cityLedPercent}%</strong></span>
          <span><small>Organization bonus</small><strong>+{score.orgLedBonus}%</strong></span>
          <span><small>Approved PPAs</small><strong>{approvedPpas}</strong></span>
          <span><small>Attached proof</small><strong>{totalProofCount}</strong></span>
        </div>
        {entry?.adminRemarks && !finalized ? <div className="pwa-admin-note"><strong>Admin remarks</strong><p>{entry.adminRemarks}</p></div> : null}
      </section>

      <div className="pwa-ypop-event-tabs" role="tablist" aria-label="YPOP event timeframe">
        <button type="button" role="tab" aria-selected={eventTab === "ongoing"} className={eventTab === "ongoing" ? "is-active" : ""} onClick={() => setEventTab("ongoing")}>Ongoing</button>
        <button type="button" role="tab" aria-selected={eventTab === "past"} className={eventTab === "past" ? "is-active" : ""} onClick={() => setEventTab("past")}>Past</button>
      </div>

      <section className="pwa-card pwa-ypop-workspace-section pwa-ypop-main-section">
        <h2>Available Activities</h2>
        <div className="pwa-ypop-workspace-list">
          {availableActivities.map((activity) => {
            const eligibility = getYpopEventJoinEligibility({ activity, period, entry, profile: data.profile });
            return (
              <article key={activity.id}>
                <div><strong>{activity.name}</strong><p>{formatDateTime(activity.date)}{activity.venue ? ` · ${activity.venue}` : ""}</p><small>{YPOP_CITY_LED_CATEGORY_LABELS[resolveYpopCityLedCategory(activity.category, activity.points)]} · {normalizeYpopCityLedPoints(activity.points, activity.category)} points</small></div>
                <Button size="sm" disabled={!eligibility.allowed || busyKey === `join-${activity.id}`} onClick={() => void joinEvent(activity.id)}>
                  {busyKey === `join-${activity.id}` ? "Joining..." : eligibility.label}
                </Button>
              </article>
            );
          })}
          {!availableActivities.length ? <p className="pwa-empty-copy">No {eventTab} unjoined activities.</p> : null}
        </div>
      </section>

      <section className="pwa-card pwa-ypop-workspace-section pwa-ypop-main-section">
        <h2>Joined Activities</h2>
        <input ref={eventFileInput} hidden type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadEventProof(file); }} />
        <div className="pwa-ypop-joined-list">
          {filteredParticipations.map((participation) => {
            const activity = activities.find((item) => item.id === participation.activityId);
            const files = state.ypopEventFiles.filter((item) => item.participationId === participation.id);
            const displayedDate = activity?.date || participation.activityDate;
            const displayedName = activity?.name || participation.activityName;
            const displayedVenue = activity?.venue || participation.venue;
            const eventEnded = isPastYpopActivityDate(displayedDate);
            const canEditProof =
              editable &&
              participation.status !== "verified" &&
              participation.status !== "rejected" &&
              (!participation.proofSubmittedAt || participation.status === "needs_revision");
            const canSubmitProof = canEditProof && (eventEnded || participation.status === "needs_revision");
            return (
              <article key={participation.id}>
                <div className="pwa-ypop-joined-heading">
                  <div><strong>{displayedName}</strong><p>{formatDateTime(displayedDate)}{displayedVenue ? ` · ${displayedVenue}` : ""}</p><small>{activity ? `${YPOP_CITY_LED_CATEGORY_LABELS[resolveYpopCityLedCategory(activity.category, activity.points)]} · ${normalizeYpopCityLedPoints(activity.points, activity.category)} points` : "Joined city-led activity"}</small></div>
                  <StatusBadge status={participation.status} />
                </div>
                <div className="pwa-ypop-proof-state"><span>{eventProofLabel(participation, files.length)}</span><span>{files.length} file{files.length === 1 ? "" : "s"}</span></div>
                {participation.adminRemarks ? <p className="pwa-ypop-feedback">Admin: {participation.adminRemarks}</p> : null}
                {files.length ? <ul className="pwa-ypop-file-list">{files.map((file) => (
                  <li key={file.id}><button type="button" onClick={() => void openStoredFile(file.fileUrl)}><FileText />{file.fileName}</button>{canEditProof ? <button type="button" aria-label={`Remove ${file.fileName}`} disabled={busyKey === `event-delete-${file.id}`} onClick={() => void removeEventProof(file.id, file.fileUrl)}><Trash2 /></button> : null}</li>
                ))}</ul> : null}
                <div className="pwa-ypop-row-actions">
                  {canEditProof ? <Button variant="outline" disabled={!canSubmitProof || busyKey.startsWith("event-upload")} onClick={() => { setUploadParticipationId(participation.id); eventFileInput.current?.click(); }}><Upload />{files.length ? "Add Proof" : "Upload Proof"}</Button> : null}
                  {canSubmitProof ? <Button disabled={!files.length || busyKey === `event-submit-${participation.id}`} onClick={() => void submitEventProof(participation)}><Send />{participation.status === "needs_revision" ? "Resubmit Proof" : "Submit Proof"}</Button> : null}
                </div>
                {!eventEnded && !participation.proofSubmittedAt ? <p className="pwa-form-helper">Proof upload becomes available after the event ends.</p> : null}
              </article>
            );
          })}
          {!filteredParticipations.length ? <p className="pwa-empty-copy">No joined {eventTab} activities.</p> : null}
        </div>
      </section>

      <section className="pwa-card pwa-ypop-workspace-section pwa-ypop-main-section">
        <div className="pwa-section-heading"><h2>Organization-Led Activities / PPA Submissions</h2>{ppaUnlocked && entry ? <Button size="sm" variant="outline" onClick={() => go(pwaYpopPpaNewRoute(entry.id))}><Plus />Log PPA</Button> : null}</div>
        {!ppaUnlocked ? (
          <div className="pwa-ypop-ppa-lock">
            <LockKeyhole aria-hidden="true" />
            <div>
              <strong>{entry?.status === "submitted" || entry?.status === "under_review" ? "City-led validation in progress" : "Qualification required"}</strong>
              <p>Organization-led PPA logging unlocks after the admin marks this semester as qualified.</p>
            </div>
          </div>
        ) : null}
        {entry && editable ? (
          <div className="pwa-ypop-city-validation-submit">
            <h3>Submit City-Led Activities for Validation</h3>
            <p>Your optional note is sent only when you submit. It cannot be saved separately.</p>
            <Textarea rows={4} value={note} placeholder="Optional message for the admin reviewing your city-led participation..." onChange={(event) => setNote(event.target.value)} />
            {submissionBlockReason ? <p className="pwa-ypop-block-reason">{submissionBlockReason}</p> : null}
            <div>
              <Button variant="outline" className="is-danger" onClick={() => setDeleteEntryOpen(true)}><Trash2 />Delete Submission</Button>
              <Button disabled={Boolean(submissionBlockReason) || busyKey === "submit-entry"} onClick={() => void submitEntry()}><Send />{busyKey === "submit-entry" ? "Submitting..." : entry.status === "needs_revision" ? "Resubmit for Validation" : "Submit for Validation"}</Button>
            </div>
          </div>
        ) : null}
        <div className="pwa-ypop-ppa-list">
          {visibleOrgActivities.map((activity) => {
            const files = state.ypopOrgActivityFiles.filter((file) => file.orgActivityId === activity.id);
            const canEdit = ppaUnlocked && (activity.status === "draft" || activity.status === "needs_revision");
            return <article key={activity.id} className="pwa-ypop-ppa-card">
              <div className="pwa-ypop-ppa-summary">
              <div><strong>{activity.activityName}</strong><p>{formatDateTime(activity.activityDate)} · {activity.venue || "Venue not set"}</p><small>{files.length} proof file{files.length === 1 ? "" : "s"}</small></div>
                <StatusBadge status={activity.status} />
              </div>
              {activity.adminRemarks ? <p className="pwa-ypop-feedback">Admin: {activity.adminRemarks}</p> : null}
              <div className="pwa-ypop-row-actions">
                {entry ? <Button variant="outline" onClick={() => go(pwaYpopPpaEditRoute(entry.id, activity.id))}>{canEdit ? activity.status === "needs_revision" ? "Respond to Revision" : "Manage PPA" : "View Details"}</Button> : null}
                {canEdit ? <Button variant="outline" disabled={busyKey === `ppa-delete-${activity.id}`} onClick={() => void deletePpa(activity)}><Trash2 />Delete</Button> : null}
              </div>
            </article>;
          })}
          {!orgActivities.length ? <p className="pwa-empty-copy">No organization-initiated activities logged.</p> : null}
        </div>
        {entry && orgActivities.length > 3 ? (
          <Button className="pwa-ypop-view-all-ppas" variant="outline" onClick={() => go(pwaYpopPpaListRoute(entry.id))}>
            View All Submitted PPAs
            <ChevronRight aria-hidden="true" />
          </Button>
        ) : null}
      </section>

      {finalized && entry ? (
        <section className="pwa-card pwa-ypop-workspace-section pwa-ypop-side-section pwa-ypop-final-result" aria-labelledby="ypop-final-result-title">
          <h2 id="ypop-final-result-title">Final Result</h2>
          <div className={`pwa-ypop-result ${entry.status === "qualified" ? "is-qualified" : "is-not-qualified"}`}>
            {entry.status === "qualified" ? <Trophy aria-hidden="true" /> : <Medal aria-hidden="true" />}
            <div>
              <strong>{entry.status === "qualified" ? "Qualified for a project grant" : "Not qualified for this period"}</strong>
              <dl className="pwa-ypop-result-metadata">
                <div><dt>Final score</dt><dd>{score.totalScore}%</dd></div>
                <div><dt>Required threshold</dt><dd>{entry.pointsRequired}%</dd></div>
                {entry.validatedAt ? <div><dt>Finalized</dt><dd><time dateTime={entry.validatedAt}>{formatDateTime(entry.validatedAt)}</time></dd></div> : null}
              </dl>
              {entry.adminRemarks ? <div className="pwa-ypop-final-remarks"><span>Admin final remarks</span><p>{entry.adminRemarks}</p></div> : null}
            </div>
          </div>
        </section>
      ) : (
        <section className="pwa-card pwa-ypop-workspace-section pwa-ypop-side-section">
          <h2>Qualification and Scoring</h2>
          <dl className="pwa-ypop-scoring-list">
            <div><dt>City-Led Score</dt><dd>{score.cityLedPercent}%</dd></div>
            <div><dt>Organization Bonus</dt><dd>+{score.orgLedBonus}%</dd></div>
            <div><dt>Current Score</dt><dd>{score.totalScore}%</dd></div>
            <div><dt>Qualification Threshold</dt><dd>{entry?.pointsRequired ?? 70}%</dd></div>
            <div><dt>Approved PPA Count</dt><dd>{approvedPpas}</dd></div>
          </dl>
        </section>
      )}

      {entry ? (
        <section className="pwa-card pwa-ypop-workspace-section pwa-ypop-side-section pwa-ypop-submission-info" aria-labelledby="ypop-submission-info-title">
          <h2 id="ypop-submission-info-title">Submission Information</h2>
          <dl className="pwa-ypop-submission-metadata">
            <div><dt>Status</dt><dd><StatusBadge status={entry.status} /></dd></div>
            {entry.submittedAt ? <div><dt>Submitted</dt><dd><time dateTime={entry.submittedAt}>{formatDateTime(entry.submittedAt)}</time></dd></div> : null}
          </dl>

          {!editable && note.trim() ? (
            <div className="pwa-ypop-info-group">
              <h3>Message sent to admin</h3>
              <p className="pwa-ypop-submitted-message">{note}</p>
            </div>
          ) : null}

        </section>
      ) : null}

      {readOnly ? (
        <section className="pwa-ypop-readonly-note pwa-ypop-side-section" aria-label="Finalized submission notice">
          <LockKeyhole aria-hidden="true" />
          <div>
            <strong>{finalized ? "Submission finalized" : period?.status === "closed" ? "Period closed" : "Submission under review"}</strong>
            <p>{entry.status === "qualified" ? "City-led validation is complete. You may now manage PPA submissions in the Organization-Led Activities section." : finalized ? "This submission was finalized and can no longer be edited." : period?.status === "closed" ? "This period is closed and the submission can no longer be edited." : "This submission is being reviewed and can no longer be edited."}</p>
          </div>
        </section>
      ) : null}

      <section className="pwa-card pwa-ypop-workspace-section pwa-ypop-side-section pwa-ypop-recent-activity" aria-labelledby="ypop-recent-activity-title">
        <div className="pwa-section-heading">
          <h2 id="ypop-recent-activity-title">Recent Activity</h2>
          {activityLog.length ? <button type="button" aria-label="View all YPOP activity" onClick={() => go(PWA_ROUTES.activity)}>View all <ChevronRight aria-hidden="true" /></button> : null}
        </div>
        <div className="pwa-profile-audit-list">{activityLog.slice(0, 3).map((item) => <article key={item.id}><span /><div><strong>{item.title}</strong>{item.context ? <p>{item.context}</p> : null}<time dateTime={item.date}>{formatDateTime(item.date)}</time></div></article>)}</div>
        {!activityLog.length ? <p className="pwa-ypop-inline-empty">No recent YPOP activity.</p> : null}
      </section>

      <AlertDialog open={deleteEntryOpen} onOpenChange={setDeleteEntryOpen}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-sm">
          <AlertDialogHeader><AlertDialogTitle>Delete YPOP submission?</AlertDialogTitle><AlertDialogDescription>This removes the draft semester record and its attached records. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={busyKey === "delete-entry"}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" disabled={busyKey === "delete-entry"} onClick={(event) => { event.preventDefault(); void deleteEntry(); }}>{busyKey === "delete-entry" ? "Deleting..." : "Delete Submission"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {confirmationDialog}
    </div>
  );
}

export function PwaYpopPpaList({ data }: { data: PortalData }) {
  const { entryId } = useParams();
  const { go } = usePwaNavigation();
  const { state } = data.store;
  const entry = state.ypopEntries.find(
    (item) => item.id === entryId && item.organizationId === data.profile?.id,
  ) ?? null;
  const period = state.ypopPeriods.find((item) => item.semesterKey === entry?.semester) ?? null;
  const ppas = entry
    ? state.ypopOrgActivities
      .filter((item) => item.ypopEntryId === entry.id)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    : [];

  if (!entry) {
    return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.ypop} label="YPOP Incentive" /><section className="pwa-card pwa-empty-copy">YPOP submission not found.</section></div>;
  }

  return (
    <div className="pwa-stack pwa-ypop-ppa-all-page">
      <PwaBackButton fallback={pwaYpopEntryRoute(entry.id)} label={entry.semesterLabel} />
      <section className="pwa-page-intro">
        <span><FileText aria-hidden="true" /></span>
        <div><h2>All PPA Submissions</h2><p>Review every organization-led activity recorded for this semester.</p></div>
      </section>
      <section className="pwa-card pwa-ypop-workspace-section">
        <div className="pwa-section-heading">
          <h2>{ppas.length} Recorded PPA{ppas.length === 1 ? "" : "s"}</h2>
        </div>
        <div className="pwa-ypop-ppa-list">
          {ppas.map((activity) => {
            const files = state.ypopOrgActivityFiles.filter((file) => file.orgActivityId === activity.id);
            const canEdit = Boolean(
              entry.status === "qualified"
              && isYpopPeriodOpen(period)
              && (activity.status === "draft" || activity.status === "needs_revision"),
            );
            return (
              <article key={activity.id} className="pwa-ypop-ppa-card">
                <div className="pwa-ypop-ppa-summary">
                  <div>
                    <strong>{activity.activityName}</strong>
                    <p>{formatDateTime(activity.activityDate)} Â· {activity.venue || "Venue not set"}</p>
                    <small>{files.length} attached file{files.length === 1 ? "" : "s"}</small>
                  </div>
                  <StatusBadge status={activity.status} />
                </div>
                {activity.adminRemarks ? <p className="pwa-ypop-feedback">Admin: {activity.adminRemarks}</p> : null}
                <div className="pwa-ypop-row-actions">
                  <Button variant="outline" onClick={() => go(pwaYpopPpaEditRoute(entry.id, activity.id))}>
                    {canEdit ? activity.status === "needs_revision" ? "Respond to Revision" : "Manage PPA" : "View Details"}
                  </Button>
                </div>
              </article>
            );
          })}
          {!ppas.length ? <p className="pwa-empty-copy">No PPA submissions have been recorded.</p> : null}
        </div>
      </section>
    </div>
  );
}

export function PwaYpopPpaEditor({ data }: { data: PortalData }) {
  const { entryId, activityId } = useParams();
  const { go } = usePwaNavigation();
  const requestedEntry = data.store.state.ypopEntries.find((item) => item.id === entryId) ?? null;
  const entry = requestedEntry && data.store.state.ypopPeriods.some(
    (item) => item.semesterKey === requestedEntry.semester,
  )
    ? requestedEntry
    : null;
  const period = data.store.state.ypopPeriods.find((item) => item.semesterKey === entry?.semester) ?? null;
  const existing = data.store.state.ypopOrgActivities.find((item) => item.id === activityId && item.ypopEntryId === entryId) ?? null;
  const existingFiles = existing ? data.store.state.ypopOrgActivityFiles.filter((file) => file.orgActivityId === existing.id) : [];
  const [form, setForm] = useState({
    activityName: existing?.activityName ?? "",
    activityDate: existing?.activityDate ?? "",
    venue: existing?.venue ?? "",
  });
  const [narrativePdf, setNarrativePdf] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const { confirmAction, confirmationDialog } = useConfirmActionDialog();
  const editable = Boolean(
    entry?.status === "qualified" &&
    isYpopPeriodOpen(period) &&
    (!existing || existing.status === "draft" || existing.status === "needs_revision"),
  );
  const existingNarrativePdf = existingFiles.find(
    (file) => file.fileName === existing?.narrativeReport,
  ) ?? null;
  const existingProofFiles = existingFiles.filter(
    (file) => file.id !== existingNarrativePdf?.id,
  );

  useEffect(() => {
    if (existing) {
      setForm({
        activityName: existing.activityName,
        activityDate: existing.activityDate,
        venue: existing.venue,
      });
    }
  }, [existing]);

  const selectNarrativePdf = (file: File | null) => {
    if (!file) {
      setNarrativePdf(null);
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast({
        title: "PDF required",
        description: "The narrative report must be uploaded as a PDF file.",
        variant: "destructive",
      });
      return;
    }
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
      toast({
        title: "Invalid file size",
        description: "The narrative report PDF must be no larger than 10 MB.",
        variant: "destructive",
      });
      return;
    }
    setNarrativePdf(file);
  };

  const save = async (submit: boolean) => {
    if (!entry || !data.profile || !data.user || !editable) return;
    const activityName = form.activityName.trim();
    const activityDate = form.activityDate.trim();
    const venue = form.venue.trim();
    const narrativeReport = narrativePdf?.name ?? existingNarrativePdf?.fileName ?? "";
    if (!activityName || !activityDate || !venue || !narrativeReport) {
      toast({ title: "Missing details", description: "Complete the activity details and attach the narrative report PDF.", variant: "destructive" });
      return;
    }
    if (submit && existingProofFiles.length + selectedFiles.length === 0) {
      toast({ title: "Proof required", description: "Attach at least one supporting file before submitting the PPA.", variant: "destructive" });
      return;
    }
    if (submit && !await confirmAction({
      title: existing?.status === "needs_revision" ? "Resubmit this PPA for validation?" : "Submit this PPA for validation?",
      description: "The PPA details, narrative report, and supporting proof files will be locked while the admin reviews them.",
      confirmLabel: existing?.status === "needs_revision" ? "Resubmit PPA" : "Submit PPA",
    })) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      let saved: YPOPOrgActivity;
      if (existing) {
        saved = await updateYpopOrgActivityInSupabase(existing.id, {
          activityName,
          activityDate,
          venue,
          narrativeReport,
          status: existing.status,
          submittedAt: existing.submittedAt,
          adminRemarks: existing.adminRemarks,
          revisionHistory: existing.revisionHistory,
        });
        data.store.updateYPOPOrgActivity(saved.id, saved);
      } else {
        saved = await createYpopOrgActivityInSupabase({
          ypopEntryId: entry.id,
          organizationId: data.profile.id,
          submittedBy: data.user.id,
          activityName,
          activityDate,
          venue,
          narrativeReport,
          status: "draft",
          adminRemarks: "",
          submittedAt: "",
        });
        data.store.createYPOPOrgActivity(saved);
      }
      if (narrativePdf) {
        const uploadedNarrative = await uploadYpopOrgActivityFileToSupabase({
          orgActivityId: saved.id,
          organizationId: data.profile.id,
          file: narrativePdf,
        });
        data.store.createYPOPOrgActivityFile(uploadedNarrative);
        if (existingNarrativePdf) {
          await deleteYpopOrgActivityFileFromSupabase(
            existingNarrativePdf.id,
            existingNarrativePdf.fileUrl,
          );
          data.store.deleteYPOPOrgActivityFile(existingNarrativePdf.id);
        }
      }
      for (const file of selectedFiles) {
        const uploaded = await uploadYpopOrgActivityFileToSupabase({ orgActivityId: saved.id, organizationId: data.profile.id, file });
        data.store.createYPOPOrgActivityFile(uploaded);
      }
      if (submit) {
        saved = await updateYpopOrgActivityInSupabase(saved.id, {
          status: "submitted",
          submittedAt: now,
          adminRemarks: "",
          revisionHistory: [...(saved.revisionHistory ?? []), { action: "submitted", adminRemarks: "", changedAt: now }],
        });
        data.store.updateYPOPOrgActivity(saved.id, saved);
      }
      await data.refresh();
      toast({ title: submit ? "PPA submitted" : "PPA draft saved", description: submit ? "The activity is now pending admin approval." : "You can continue this draft later." });
      go(pwaYpopEntryRoute(entry.id), { replace: true });
    } catch (error) {
      toast({ title: "Unable to save PPA", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeExistingFile = async (fileId: string, fileUrl: string) => {
    if (!await confirmAction({
      title: "Remove PPA attachment?",
      description: "This attachment will be permanently removed from the PPA activity.",
      confirmLabel: "Remove File",
      destructive: true,
    })) return;
    try {
      await deleteYpopOrgActivityFileFromSupabase(fileId, fileUrl);
      data.store.deleteYPOPOrgActivityFile(fileId);
      await data.refresh();
    } catch (error) {
      toast({ title: "Unable to remove file", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    }
  };

  if (!entry) return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.ypop} label="YPOP Incentive" /><section className="pwa-card pwa-empty-copy">YPOP submission not found.</section></div>;
  return (
    <div className="pwa-stack pwa-ypop-ppa-editor">
      <PwaBackButton fallback={pwaYpopEntryRoute(entry.id)} label={entry.semesterLabel} />
      <section className="pwa-page-intro"><span>{existing && !editable ? <FileText /> : <Plus />}</span><div><h2>{existing ? editable ? "Manage PPA" : "PPA Details" : "Log PPA"}</h2><p>{existing && !editable ? "Review the submitted activity details and attached files." : "Create an organization-initiated activity and attach its supporting proof."}</p></div></section>
      {existing?.adminRemarks ? <div className="pwa-admin-note"><strong>Admin remarks</strong><p>{existing.adminRemarks}</p></div> : null}
      <section className="pwa-card pwa-native-form">
        <label>Activity Name *<Input value={form.activityName} disabled={!editable} onChange={(event) => setForm((current) => ({ ...current, activityName: event.target.value }))} /></label>
        <label>Activity Date *<Input type="date" value={form.activityDate} disabled={!editable} onChange={(event) => setForm((current) => ({ ...current, activityDate: event.target.value }))} /></label>
        <label>Venue *<Input value={form.venue} disabled={!editable} onChange={(event) => setForm((current) => ({ ...current, venue: event.target.value }))} /></label>
        <div className="pwa-ppa-upload-field">
          <div className="pwa-ppa-file-section-heading">
            <div><strong>Narrative Report</strong><small>Required PDF document</small></div>
            <span>{existingNarrativePdf || narrativePdf ? "1 file" : "Missing"}</span>
          </div>
          <span className="pwa-ppa-upload-label">Narrative Report PDF *</span>
          <label className="pwa-file-control pwa-ppa-file-control">
            <input
              type="file"
              disabled={!editable}
              accept=".pdf,application/pdf"
              onChange={(event) => {
                selectNarrativePdf(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
            <span><Upload aria-hidden="true" />{narrativePdf?.name ?? (existingNarrativePdf ? "Replace narrative report PDF" : "Choose narrative report PDF")}</span>
          </label>
          <small>PDF only · Maximum 10 MB</small>
          {existingNarrativePdf && !narrativePdf ? (
            <button
              type="button"
              className="pwa-ppa-current-narrative"
              onClick={() => void openStoredFile(existingNarrativePdf.fileUrl)}
            >
              <FileText aria-hidden="true" />
              <span><strong>{existingNarrativePdf.fileName}</strong><small>Current narrative report PDF</small></span>
              <ChevronRight aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="pwa-ppa-upload-field">
          <div className="pwa-ppa-file-section-heading">
            <div><strong>Supporting Proof Files</strong><small>Photos or supporting documents</small></div>
            <span>{existingProofFiles.length + selectedFiles.length} file{existingProofFiles.length + selectedFiles.length === 1 ? "" : "s"}</span>
          </div>
          <label className="pwa-file-control pwa-ppa-file-control"><input type="file" multiple disabled={!editable} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt,application/pdf,image/*" onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))} /><span><Upload aria-hidden="true" />{selectedFiles.length ? `${selectedFiles.length} new file${selectedFiles.length === 1 ? "" : "s"} selected` : "Attach PPA proof files"}</span></label>
          {existingProofFiles.length ? <ul className="pwa-ppa-attachment-list">{existingProofFiles.map((file) => <li key={file.id} className="pwa-ppa-attachment-card"><button type="button" onClick={() => void openStoredFile(file.fileUrl)}><FileText aria-hidden="true" /><span><strong>{file.fileName}</strong><small>Supporting proof</small></span><ChevronRight aria-hidden="true" /></button>{editable ? <button type="button" aria-label={`Remove ${file.fileName}`} onClick={() => void removeExistingFile(file.id, file.fileUrl)}><Trash2 aria-hidden="true" /></button> : null}</li>)}</ul> : null}
          {!existingProofFiles.length && !selectedFiles.length && !editable ? <p className="pwa-ypop-inline-empty">No supporting proof files attached.</p> : null}
        </div>
      </section>
      {editable ? <div className="pwa-profile-editor-actions"><Button variant="outline" disabled={saving} onClick={() => void save(false)}>Save Draft</Button><Button disabled={saving} onClick={() => void save(true)}>{saving ? <Loader2 className="pwa-spin" /> : <Send />}{saving ? "Saving..." : existing?.status === "needs_revision" ? "Resubmit PPA" : "Submit PPA for Validation"}</Button></div> : null}
      {confirmationDialog}
    </div>
  );
}
