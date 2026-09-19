import React, { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  XCircle,
  Trophy,
  Award,
  FileText,
  Send,
  Loader2,
  ExternalLink,
  Info,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  buildVerifiedYpopAttendance,
  computeYpopScore,
  getApprovedYpopOrgActivityCount,
  YPOP_SCORE_THRESHOLD,
  deriveYpopQualificationStatus,
  statusLabelMap,
  type OrganizationProfile,
  type YPOPCityActivity,
  type YPOPEntry,
  type YPOPEventFile,
  type YPOPEventParticipation,
  type YPOPOrgActivity,
  type YPOPOrgActivityFile,
  type YPOPPeriod,
  type YpopQualificationStatus,
} from "@/lib/lydo-connect-data";
import {
  createYpopEntryInSupabase,
  updateYpopEntryInSupabase,
} from "@/lib/lydo-connect-supabase";
import {
  validateYpopSubmissionEligibility,
} from "@/lib/ypop-event-eligibility";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { YpopValidationComputationPopover } from "@/admin/components/YpopValidationComputationPopover";
import { YpopCityLedTab } from "./YpopCityLedTab";
import { YpopOrgLedTab } from "./YpopOrgLedTab";

export interface YpopSemesterWorkspaceProps {
  period: YPOPPeriod;
  allPeriods: YPOPPeriod[];
  entry: YPOPEntry | null;
  allEntries: YPOPEntry[];
  cityActivities: YPOPCityActivity[];
  initialActivityId?: string | null;
  participations: YPOPEventParticipation[];
  eventFiles: YPOPEventFile[];
  orgActivities: YPOPOrgActivity[];
  orgActivityFiles: YPOPOrgActivityFile[];
  profile: OrganizationProfile | null;
  organizationId: string;
  userId: string;
  canEditParticipation: boolean;
  userRouteMap: Record<string, string>;
  navigate: (path: string) => void;
  formatShortPortalDate: (dateStr: string) => string;
  onBack: () => void;
  onEntryUpdated: (entry: YPOPEntry) => void;
  onParticipationCreated: (participation: YPOPEventParticipation) => void;
  onParticipationUpdated: (participation: YPOPEventParticipation) => void;
  onEventFileCreated: (file: YPOPEventFile) => void;
  onEventFileDeleted: (fileId: string) => void;
  onOrgActivitySaved: (activity: YPOPOrgActivity) => void;
  onOrgActivityDeleted: (activityId: string) => void;
  onOrgFileCreated: (file: YPOPOrgActivityFile) => void;
  onOrgFileDeleted: (fileId: string) => void;
}

export const YpopSemesterWorkspace: React.FC<YpopSemesterWorkspaceProps> = ({
  period,
  allPeriods,
  entry,
  allEntries,
  cityActivities,
  initialActivityId,
  participations,
  eventFiles,
  orgActivities,
  orgActivityFiles,
  profile,
  organizationId,
  userId,
  canEditParticipation,
  userRouteMap,
  navigate,
  formatShortPortalDate,
  onBack,
  onEntryUpdated,
  onParticipationCreated,
  onParticipationUpdated,
  onEventFileCreated,
  onEventFileDeleted,
  onOrgActivitySaved,
  onOrgActivityDeleted,
  onOrgFileCreated,
  onOrgFileDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<"city-led" | "org-led">("city-led");

  // Scoped data for this semester
  const semesterActivities = cityActivities.filter(
    (act) => act.semesterKey === period.semesterKey
  );
  const semesterParticipations = participations.filter(
    (p) =>
      p.organizationId === organizationId &&
      semesterActivities.some((act) => act.id === p.activityId)
  );
  const semesterOrgActivities = entry
    ? orgActivities.filter((act) => act.ypopEntryId === entry.id)
    : [];

  const approvedPpaCount = entry
    ? getApprovedYpopOrgActivityCount(
        semesterOrgActivities,
        entry.id,
        entry.orgLedProjectCount ?? 0
      )
    : 0;

  const verifiedAttendance = buildVerifiedYpopAttendance(
    semesterActivities,
    semesterParticipations,
    entry?.cityLedAttendance
  );

  const liveScore = computeYpopScore(
    verifiedAttendance,
    semesterActivities,
    approvedPpaCount,
    period.orgLedTiers
  );

  const threshold = entry?.pointsRequired ?? YPOP_SCORE_THRESHOLD;
  const isPeriodOpen = period.status === "open";
  const overallQualificationStatus: YpopQualificationStatus = deriveYpopQualificationStatus({
    score: liveScore.totalScore,
    pointsRequired: threshold,
    period,
    entry,
    participations: semesterParticipations,
    orgActivities: semesterOrgActivities,
  });
  const isQualified = overallQualificationStatus === "qualified";
  const isNotQualified = overallQualificationStatus === "not_qualified";
  const isUnderReview = entry?.status === "under_review" || entry?.status === "submitted";
  const isDraft = !entry || entry.status === "draft";

  const computationEntry: YPOPEntry = entry ?? {
    id: `temp-${period.semesterKey}`,
    organizationId,
    submittedBy: userId,
    semester: period.semesterKey,
    semesterLabel: period.semesterLabel,
    pointsEarned: liveScore.totalScore,
    pointsRequired: threshold,
    totalPoints: 100,
    status: isQualified ? "qualified" : isNotQualified ? "not_qualified" : "draft",
    adminRemarks: "",
    submissionNote: "",
    validationDeadline: period.validationDeadline,
    submittedAt: null,
    validatedAt: null,
    revisionHistory: [],
    orgLedProjectCount: approvedPpaCount,
    cityLedAttendance: verifiedAttendance,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handleEnsureEntry = async (): Promise<YPOPEntry> => {
    if (entry) return entry;
    const now = new Date().toISOString();
    const created = await createYpopEntryInSupabase({
      organizationId,
      submittedBy: userId,
      semester: period.semesterKey,
      semesterLabel: period.semesterLabel,
      pointsEarned: liveScore.totalScore,
      pointsRequired: threshold,
      totalPoints: 100,
      status: "draft",
      adminRemarks: "",
      submissionNote: "",
      validationDeadline: period.validationDeadline,
      submittedAt: null,
      validatedAt: null,
      revisionHistory: [],
      orgLedProjectCount: approvedPpaCount,
      cityLedAttendance: verifiedAttendance,
    });
    onEntryUpdated(created);
    return created;
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Top Navigation & Header */}
      <div className="space-y-3 sm:space-y-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-xs font-medium text-muted-foreground hover:text-foreground -ml-2 gap-1.5 cursor-pointer h-8 px-2.5 rounded-lg hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to All Semesters</span>
        </Button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 border border-border/60 shadow-xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-primary">
                {period.semesterLabel}
              </span>
              <span className="text-muted-foreground/30">•</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/70" />
                Deadline: {formatShortPortalDate(period.validationDeadline)}
              </span>
              <span className="text-muted-foreground/30">•</span>
              {period.status === "open" ? (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Open Period</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span>Closed Period</span>
                </div>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              YPOP Validation Workspace
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Track your organization's qualification score, join City-Led activities, upload post-event attendance proof, and record organization-initiated PPAs.
            </p>
          </div>

          {/* Header Action: Conditional Budget Request Button (Only when Qualified) */}
          {isQualified ? (
            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              <Button
                type="button"
                onClick={() => {
                  const basePath = userRouteMap["budget-request"] || "/budget-request";
                  const separator = basePath.includes("?") ? "&" : "?";
                  const targetUrl = entry?.id
                    ? `${basePath}${separator}ypopEntryId=${encodeURIComponent(entry.id)}`
                    : basePath;
                  navigate(targetUrl);
                }}
                className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs gap-1.5 h-8.5 px-3.5 text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer inline-flex items-center"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Budget Request</span>
              </Button>
            </div>
          ) : null}
        </div>

        {/* Qualification Summary Card */}
        <div
          className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-3"
          data-testid="user-ypop-qualification-summary"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Qualification Summary
                </p>
                <StatusBadge
                  status={overallQualificationStatus}
                  label={statusLabelMap[overallQualificationStatus]}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
                <span className="font-medium text-foreground">Required Percentage: {threshold}%</span>
                <YpopValidationComputationPopover
                  entry={computationEntry}
                  organizationName={profile?.organizationName}
                  semesterLabel={period.semesterLabel}
                  semesterActivities={semesterActivities}
                  orgEventParticipations={semesterParticipations}
                  orgActivities={semesterOrgActivities}
                  verifiedAttendance={verifiedAttendance}
                  liveScore={liveScore}
                  displayScore={liveScore.totalScore}
                  overallQualificationStatus={overallQualificationStatus}
                  period={period}
                />
              </div>
            </div>

            <div className="w-full sm:max-w-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Qualification Progress</span>
                <span
                  className={cn(
                    "font-bold tabular-nums text-sm",
                    isQualified
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-foreground"
                  )}
                >
                  {liveScore.totalScore}%
                </span>
              </div>
              <Progress
                value={Math.min(100, liveScore.totalScore)}
                className="h-2 bg-muted/80"
              />
            </div>
          </div>
        </div>
      </div>


      {/* Main Tabs Header (Crisp segmented tabs with clean active indicator) */}
      <div className="flex items-center gap-2 border-b border-border/70 overflow-x-auto [scrollbar-width:none]">
        <button
          type="button"
          onClick={() => setActiveTab("city-led")}
          className={cn(
            "relative px-4 py-2.5 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border-b-2 -mb-px",
            activeTab === "city-led"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
          )}
        >
          <Award className="h-3.5 w-3.5 shrink-0" />
          <span>City-Led Activities</span>
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              activeTab === "city-led"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {semesterActivities.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("org-led")}
          className={cn(
            "relative px-4 py-2.5 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border-b-2 -mb-px",
            activeTab === "org-led"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
          )}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span>Organization PPAs</span>
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              activeTab === "org-led"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {semesterOrgActivities.length}
          </span>
        </button>
      </div>

      {/* Active Tab Content */}
      {activeTab === "city-led" ? (
        <YpopCityLedTab
          period={period}
          activities={semesterActivities}
          initialActivityId={initialActivityId}
          participations={semesterParticipations}
          eventFiles={eventFiles}
          organizationId={organizationId}
          isPeriodOpen={isPeriodOpen}
          canEditParticipation={canEditParticipation}
          onParticipationCreated={onParticipationCreated}
          onParticipationUpdated={onParticipationUpdated}
          onFileCreated={onEventFileCreated}
          onFileDeleted={onEventFileDeleted}
        />
      ) : (
        <YpopOrgLedTab
          onEnsureEntry={handleEnsureEntry}
          period={period}
          entry={entry}
          orgActivities={orgActivities}
          orgActivityFiles={orgActivityFiles}
          organizationId={organizationId}
          userId={userId}
          formatShortPortalDate={formatShortPortalDate}
          onActivitySaved={onOrgActivitySaved}
          onActivityDeleted={onOrgActivityDeleted}
          onFileCreated={onOrgFileCreated}
          onFileDeleted={onOrgFileDeleted}
        />
      )}
    </div>
  );
};
