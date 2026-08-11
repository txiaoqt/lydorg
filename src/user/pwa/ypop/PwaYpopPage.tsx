import { useState } from "react";
import { CalendarDays, ChevronRight, FileText, Medal, Trophy } from "lucide-react";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  buildVerifiedYpopAttendance,
  computeYpopScore,
  getApprovedYpopOrgActivityCount,
  YPOP_BASE_TOTAL_POINTS,
  YPOP_SCORE_THRESHOLD,
  type YPOPEntry,
  type YPOPPeriod,
} from "@/lib/lydo-connect-data";
import { createYpopEntryInSupabase } from "@/lib/lydo-connect-supabase";
import { getYpopEventJoinEligibility } from "@/lib/ypop-event-eligibility";
import type { usePwaPortalData } from "../hooks/usePwaPortalData";
import { usePwaNavigation } from "../hooks/usePwaNavigation";
import { pwaYpopEntryRoute, pwaYpopPeriodRoute } from "../pwaRoutes";

type PortalData = ReturnType<typeof usePwaPortalData>;

const dateLabel = (value: string) => {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(date);
};

const actionLabel = (entry: YPOPEntry | null) => {
  if (!entry) return "Open Submission";
  if (entry.status === "draft") return "Open Submission";
  if (entry.status === "needs_revision") return "Continue Revision";
  if (entry.status === "qualified" || entry.status === "not_qualified") return "View Result";
  return "View Submission";
};

export function PwaYpopPage({ data }: { data: PortalData }) {
  const { go } = usePwaNavigation();
  const [openingPeriodId, setOpeningPeriodId] = useState("");
  const { state } = data.store;
  const organizationId = data.profile?.id ?? "";
  const periods = [...state.ypopPeriods].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const semesterKeys = new Set(periods.map((period) => period.semesterKey));
  const entries = state.ypopEntries
    .filter(
      (entry) =>
        entry.organizationId === organizationId &&
        semesterKeys.has(entry.semester),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const periodRows = periods.map((period) => ({
    period,
    entry: entries.find((entry) => entry.semester === period.semesterKey) ?? null,
  }));

  const openPeriod = async (period: YPOPPeriod, entry: YPOPEntry | null) => {
    if (entry) {
      go(pwaYpopEntryRoute(entry.id));
      return;
    }
    if (period.status !== "open" || !data.ypopWorkflowEligibility.canEditParticipation) {
      go(pwaYpopPeriodRoute(period.id));
      return;
    }
    setOpeningPeriodId(period.id);
    try {
      const saved = await createYpopEntryInSupabase({
        organizationId,
        submittedBy: data.user?.id ?? "",
        semester: period.semesterKey,
        semesterLabel: period.semesterLabel,
        pointsEarned: 0,
        pointsRequired: YPOP_SCORE_THRESHOLD,
        totalPoints: YPOP_BASE_TOTAL_POINTS,
        status: "draft",
        adminRemarks: "",
        submissionNote: "",
        validationDeadline: period.validationDeadline,
        submittedAt: "",
        validatedAt: "",
        revisionHistory: [],
        orgLedProjectCount: 0,
        cityLedAttendance: [],
      });
      data.store.createYPOPEntry(saved);
      await data.refresh();
      go(pwaYpopEntryRoute(saved.id));
    } catch (error) {
      toast({ title: "Unable to open submission", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setOpeningPeriodId("");
    }
  };

  return (
    <div className="pwa-stack pwa-ypop-landing">
      <section className="pwa-page-intro">
        <span><Medal aria-hidden="true" /></span>
        <div><h2>YPOP Incentive</h2><p>Join activities, manage proof, log PPAs, and submit semester participation for validation.</p></div>
      </section>
      {!data.ypopWorkflowEligibility.canEditParticipation ? (
        <section className="pwa-eligibility-notice"><Medal aria-hidden="true" /><div><h2>Organization verification required</h2><p>YPOP participation becomes editable after the organization profile is verified.</p></div></section>
      ) : null}
      <section className="pwa-stack" aria-label="YPOP semester submissions">
        {periodRows.map(({ period, entry }) => {
          const activities = state.ypopCityActivities.filter((activity) => activity.semesterKey === period.semesterKey);
          const participations = state.ypopEventParticipations.filter((participation) =>
            participation.organizationId === organizationId && activities.some((activity) => activity.id === participation.activityId),
          );
          const orgActivities = entry ? state.ypopOrgActivities.filter((activity) => activity.ypopEntryId === entry.id) : [];
          const approvedPpas = entry ? getApprovedYpopOrgActivityCount(orgActivities, entry.id, entry.orgLedProjectCount ?? 0) : 0;
          const verifiedAttendance = buildVerifiedYpopAttendance(activities, participations, entry?.cityLedAttendance);
          const score = computeYpopScore(verifiedAttendance, activities, approvedPpas, period.orgLedTiers);
          const proofCount =
            (entry ? state.ypopFiles.filter((file) => file.ypopEntryId === entry.id).length : 0) +
            state.ypopEventFiles.filter((file) => participations.some((participation) => participation.id === file.participationId)).length +
            state.ypopOrgActivityFiles.filter((file) => orgActivities.some((activity) => activity.id === file.orgActivityId)).length;
          const availableCount = activities.filter((activity) => {
            const participation = participations.find((item) => item.activityId === activity.id);
            return getYpopEventJoinEligibility({ activity, period, entry, participation, profile: data.profile }).allowed;
          }).length;
          const status = entry?.status ?? period.status;
          const finalized = entry?.status === "qualified" || entry?.status === "not_qualified";
          return (
            <article className="pwa-card pwa-ypop-semester-card" key={`${period.id}-${entry?.id ?? "period"}`}>
              <div className="pwa-ypop-heading">
                <div><h3>{period.semesterLabel}</h3><p><CalendarDays aria-hidden="true" /> Validation {period.status === "open" ? "closes" : "closed"} {dateLabel(entry?.validationDeadline || period.validationDeadline)}</p></div>
                <StatusBadge status={status} />
              </div>
              <div className="pwa-ypop-semester-score">
                <span><small>Current score</small><strong>{score.totalScore}%</strong></span>
                <span><small>Threshold</small><strong>{entry?.pointsRequired ?? YPOP_SCORE_THRESHOLD}%</strong></span>
              </div>
              <div className="pwa-progress"><span style={{ width: `${Math.min(100, score.totalScore)}%` }} /></div>
              <dl className="pwa-ypop-semester-counts">
                <div><dt>Available events</dt><dd>{availableCount}</dd></div>
                <div><dt>Joined events</dt><dd>{participations.length}</dd></div>
                <div><dt>Proof files</dt><dd>{proofCount}</dd></div>
              </dl>
              {finalized ? (
                <div className={`pwa-ypop-result ${entry?.status === "qualified" ? "is-qualified" : "is-not-qualified"}`}>
                  {entry?.status === "qualified" ? <Trophy /> : <FileText />}
                  <div><strong>{entry?.status === "qualified" ? "Qualified for the YPOP incentive" : "Not qualified for this period"}</strong></div>
                </div>
              ) : null}
              <Button
                className="pwa-ypop-open-button"
                variant="outline"
                disabled={openingPeriodId === period.id}
                onClick={() => void openPeriod(period, entry)}
              >
                {openingPeriodId === period.id ? "Opening..." : entry ? actionLabel(entry) : period.status === "open" ? "Open Submission" : "View Period"}
                <ChevronRight aria-hidden="true" />
              </Button>
            </article>
          );
        })}
        {!periodRows.length ? <section className="pwa-card pwa-empty-copy">No YPOP validation periods are available yet.</section> : null}
      </section>
    </div>
  );
}
