import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, FileText, Medal, Trophy } from "lucide-react";
import { OrganizationHistoryPagination } from "@/components/portal/OrganizationHistoryPagination";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  YPOP_BASE_TOTAL_POINTS,
  YPOP_SCORE_THRESHOLD,
  type YPOPEntry,
  type YPOPPeriod,
} from "@/lib/lydo-connect-data";
import { createYpopEntryInSupabase, invalidateOrganizationYpopQueries, loadOrganizationYpopEntriesForSemesters, subscribeToOrganizationStatusChangesInSupabase } from "@/lib/lydo-connect-supabase";
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
  const [periodPage, setPeriodPage] = useState(1);
  const [entriesForPage, setEntriesForPage] = useState<YPOPEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [realtimeRefreshVersion, setRealtimeRefreshVersion] = useState(0);
  const { state } = data.store;
  const organizationId = data.profile?.id ?? "";
  const periods = useMemo(() => [...state.ypopPeriods].sort((left, right) => right.createdAt.localeCompare(left.createdAt)), [state.ypopPeriods]);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(periods.length / pageSize));
  const safePage = Math.min(periodPage, totalPages);
  const visiblePeriods = useMemo(() => periods.slice((safePage - 1) * pageSize, safePage * pageSize), [periods, safePage]);
  const periodRows = visiblePeriods.map((period) => ({
    period,
    entry: entriesForPage.find((entry) => entry.semester === period.semesterKey) ?? null,
  }));

  useEffect(() => {
    if (!organizationId || !visiblePeriods.length) {
      setEntriesForPage([]);
      return;
    }
    let active = true;
    setEntriesLoading(true);
    void loadOrganizationYpopEntriesForSemesters(organizationId, visiblePeriods.map((period) => period.semesterKey))
      .then((page) => { if (active) setEntriesForPage(page.rows); })
      .catch((error) => {
        if (active) {
          setEntriesForPage([]);
          console.error("Unable to load YPOP entries for the visible period page:", error);
        }
      })
      .finally(() => { if (active) setEntriesLoading(false); });
    return () => { active = false; };
  }, [organizationId, visiblePeriods, realtimeRefreshVersion]);

  useEffect(() => {
    if (!organizationId) return;
    return subscribeToOrganizationStatusChangesInSupabase({
      organizationId, feature: "ypop_city_led", onChange: () => setRealtimeRefreshVersion((version) => version + 1),
      onStatus: (status, error) => {
        if (import.meta.env.DEV && status === "SUBSCRIBED") console.debug("Organization YPOP summary channel subscribed.");
        else if (import.meta.env.DEV && ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) console.warn("Organization YPOP summary channel:", status, error ?? "");
      },
    });
  }, [organizationId]);

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
      await invalidateOrganizationYpopQueries(organizationId, period.semesterKey);
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
          const storedScore = Math.max(0, Number(entry?.pointsEarned ?? 0));
          const verifiedCityCount = entry?.cityLedAttendance?.filter((activity) => activity.attended).length ?? 0;
          const cityActivityCount = entry?.cityLedAttendance?.length ?? 0;
          const approvedPpas = entry?.orgLedProjectCount ?? 0;
          const status = entry?.status ?? period.status;
          const finalized = entry?.status === "qualified" || entry?.status === "not_qualified";
          return (
            <article className="pwa-card pwa-ypop-semester-card" key={`${period.id}-${entry?.id ?? "period"}`}>
              <div className="pwa-ypop-heading">
                <div><h3>{period.semesterLabel}</h3><p><CalendarDays aria-hidden="true" /> Validation {period.status === "open" ? "closes" : "closed"} {dateLabel(entry?.validationDeadline || period.validationDeadline)}</p></div>
                <StatusBadge status={status} />
              </div>
              <div className="pwa-ypop-semester-score">
                <span><small>Current score</small><strong>{storedScore}%</strong></span>
                <span><small>Threshold</small><strong>{entry?.pointsRequired ?? YPOP_SCORE_THRESHOLD}%</strong></span>
              </div>
              <div className="pwa-progress"><span style={{ width: `${Math.min(100, storedScore)}%` }} /></div>
              <dl className="pwa-ypop-semester-counts">
                <div><dt>City-led activities</dt><dd>{verifiedCityCount} / {cityActivityCount} verified</dd></div>
                <div><dt>Approved PPAs</dt><dd>{approvedPpas}</dd></div>
                <div><dt>Validation status</dt><dd>{entry ? actionLabel(entry) : "Not started"}</dd></div>
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
      {periods.length ? <OrganizationHistoryPagination page={safePage} totalPages={totalPages} totalCount={periods.length} pageSize={pageSize} loading={entriesLoading} onPageChange={setPeriodPage} /> : null}
    </div>
  );
}
