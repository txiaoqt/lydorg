import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Search,
  Filter,
  ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { cn } from "@/lib/utils";
import {
  buildVerifiedYpopAttendance,
  computeYpopScore,
  deriveYpopQualificationStatus,
  getApprovedYpopOrgActivityCount,
  statusLabelMap,
  YPOP_SCORE_THRESHOLD,
  type YPOPCityActivity,
  type YPOPEntry,
  type YPOPEventParticipation,
  type YPOPOrgActivity,
  type YPOPPeriod,
  type YpopQualificationStatus,
} from "@/lib/lydo-connect-data";

export interface YpopSemesterListProps {
  periods: YPOPPeriod[];
  entries: YPOPEntry[];
  cityActivities: YPOPCityActivity[];
  participations: YPOPEventParticipation[];
  orgActivities: YPOPOrgActivity[];
  organizationId: string;
  onSelectSemester: (semesterKey: string) => void;
  formatShortPortalDate: (dateStr: string) => string;
}

const formatDeadline = (dateStr: string) => {
  if (!dateStr) return "Not set";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
};

const getActionLabel = (entry: YPOPEntry | null, period: YPOPPeriod) => {
  if (entry) {
    if (entry.status === "needs_revision") return "Continue Revision";
    if (entry.status === "qualified" || entry.status === "not_qualified") {
      return "View Evaluation Result";
    }
    return "Open Semester Workspace";
  }
  return period.status === "open" ? "Start / Open Semester" : "View Semester Details";
};

export const YpopSemesterList: React.FC<YpopSemesterListProps> = ({
  periods,
  entries,
  cityActivities,
  participations,
  orgActivities,
  organizationId,
  onSelectSemester,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const sortedPeriods = useMemo(() => {
    return [...periods].sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || "")
    );
  }, [periods]);

  const openCount = sortedPeriods.filter((p) => p.status === "open").length;
  const endedCount = sortedPeriods.filter((p) => p.status !== "open").length;
  const allCount = sortedPeriods.length;

  const statusLabels: Record<"all" | "open" | "closed", string> = {
    all: "All",
    open: "Open",
    closed: "Ended",
  };
  const currentStatusLabel = statusLabels[statusFilter];

  const filteredPeriods = useMemo(() => {
    return sortedPeriods.filter((period) => {
      if (statusFilter === "open" && period.status !== "open") return false;
      if (statusFilter === "closed" && period.status === "open") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLabel = period.semesterLabel?.toLowerCase().includes(q);
        const matchKey = period.semesterKey?.toLowerCase().includes(q);
        if (!matchLabel && !matchKey) return false;
      }
      return true;
    });
  }, [sortedPeriods, statusFilter, searchQuery]);

  // Reset page when filters change
  const totalPages = Math.max(1, Math.ceil(filteredPeriods.length / itemsPerPage));
  const currentPageSafe = Math.min(currentPage, totalPages);

  const paginatedPeriods = useMemo(() => {
    const start = (currentPageSafe - 1) * itemsPerPage;
    return filteredPeriods.slice(start, start + itemsPerPage);
  }, [filteredPeriods, currentPageSafe, itemsPerPage]);

  const startRecord = filteredPeriods.length === 0 ? 0 : (currentPageSafe - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPageSafe * itemsPerPage, filteredPeriods.length);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1440px] mx-auto">
      {/* Standard User Portal Header Banner */}
      <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-4 sm:p-6 rounded-2xl border border-border/60 shadow-xs space-y-2 mt-1 sm:mt-0">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-xs font-semibold text-primary">Youth Participation Organization Passport (YPOP)</span>
          <span className="text-muted-foreground/30">•</span>
          <span className="text-xs text-muted-foreground">Validation Periods</span>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-foreground leading-tight sm:leading-snug">
          Select a YPOP Semester Period
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
          Select an active or historical validation semester below to view City-Led activities, submit attendance proof, log organization-initiated PPAs, and track your qualification progress.
        </p>
      </div>

      {/* Main Table Card Container */}
      <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
        {/* Standard User Portal Search and Filters Toolbar */}
        <div className="p-3 sm:p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-card">
          {/* Search Bar matching established User Portal pattern */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by semester..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 pl-8 text-xs rounded-xl bg-background border-border/80 w-full"
            />
          </div>

          {/* Status Filter Dropdown matching established User Portal pattern */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg border border-border/80 bg-background hover:bg-muted text-xs font-medium gap-1.5 cursor-pointer shrink-0 w-full sm:w-auto justify-between sm:justify-center px-3 text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">Status: {currentStatusLabel}</span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-70 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[min(calc(100vw-3rem),14rem)] sm:w-56 p-1.5 rounded-xl bg-card border-border/80 shadow-lg z-50">
                <DropdownMenuItem
                  onClick={() => {
                    setStatusFilter("all");
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "text-xs font-medium rounded-lg cursor-pointer flex items-center justify-between py-1.5 px-2.5",
                    statusFilter === "all" && "bg-primary/10 text-primary font-bold"
                  )}
                >
                  <span>All Status</span>
                  <span className="text-[10px] text-muted-foreground">({allCount})</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setStatusFilter("open");
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "text-xs font-medium rounded-lg cursor-pointer flex items-center justify-between py-1.5 px-2.5",
                    statusFilter === "open" && "bg-primary/10 text-primary font-bold"
                  )}
                >
                  <span className="truncate mr-2">Open</span>
                  <span className="text-[10px] text-muted-foreground">({openCount})</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setStatusFilter("closed");
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "text-xs font-medium rounded-lg cursor-pointer flex items-center justify-between py-1.5 px-2.5",
                    statusFilter === "closed" && "bg-primary/10 text-primary font-bold"
                  )}
                >
                  <span className="truncate mr-2">Ended</span>
                  <span className="text-[10px] text-muted-foreground">({endedCount})</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Standard User Portal Responsive Table Wrapper */}
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full text-left border-collapse md:min-w-[850px]">
            <thead className="hidden md:table-header-group">
              <tr className="border-b border-border/70 bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3.5 px-5 min-w-[200px] lg:min-w-[220px]">Semester / Period</th>
                <th className="py-3.5 px-4 min-w-[120px]">Period Status</th>
                <th className="py-3.5 px-4 min-w-[140px]">Qualification Status</th>
                <th className="py-3.5 px-4 min-w-[130px]">Calculated Score</th>
                <th className="py-3.5 px-4 min-w-[140px]">Activities Summary</th>
                <th className="py-3.5 px-5 text-right min-w-[150px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 md:table-row-group">
              {filteredPeriods.length === 0 ? (
                <tr className="block md:table-row">
                  <td colSpan={6} className="block md:table-cell py-12 text-center text-muted-foreground text-xs space-y-2">
                    <Trophy className="h-10 w-10 text-muted-foreground mx-auto stroke-1" />
                    <p className="text-sm font-bold text-foreground">
                      {sortedPeriods.length === 0
                        ? "No YPOP validation periods configured yet."
                        : "No matching YPOP validation periods found."}
                    </p>
                    <p className="text-xs">
                      {sortedPeriods.length === 0
                        ? "The Pasig City LYDO administrator has not set up any validation periods."
                        : "Try adjusting your search term or status filter."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedPeriods.map((period) => {
                  const semesterActivities = cityActivities.filter(
                    (act) => act.semesterKey === period.semesterKey
                  );
                  const semesterParticipations = participations.filter(
                    (p) =>
                      p.organizationId === organizationId &&
                      semesterActivities.some((act) => act.id === p.activityId)
                  );
                  const entry =
                    entries.find(
                      (e) =>
                        e.organizationId === organizationId &&
                        e.semester === period.semesterKey
                    ) ?? null;

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
                  const qualificationStatus: YpopQualificationStatus = deriveYpopQualificationStatus({
                    score: liveScore.totalScore,
                    pointsRequired: threshold,
                    period,
                    entry,
                    participations: semesterParticipations,
                    orgActivities: semesterOrgActivities,
                  });
                  const isQualified = qualificationStatus === "qualified";
                  const verifiedCityCount = verifiedAttendance.filter((a) => a.attended).length;
                  const actionLabel = getActionLabel(
                    entry ? { ...entry, status: isQualified ? "qualified" : qualificationStatus === "not_qualified" ? "not_qualified" : entry.status } : null,
                    period
                  );
                  const isNeedsAttention = isPeriodOpen && (!entry || qualificationStatus === "pending_evaluation");

                  return (
                    <tr
                      key={period.id}
                      className="grid grid-cols-2 gap-2.5 p-3.5 sm:p-4 md:table-row md:p-0 md:h-18 md:gap-0 hover:bg-muted/40 transition-colors duration-150 group border-b md:border-b-0 border-border/40"
                    >
                      {/* Column 1: Semester / Period */}
                      <td className="col-span-2 md:col-auto md:table-cell p-0 md:py-3.5 md:px-5 align-middle">
                        <div className="space-y-1 min-w-0">
                          <p
                            onClick={() => onSelectSemester(period.semesterKey)}
                            className="text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer leading-snug tracking-tight"
                          >
                            {period.semesterLabel}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                            <span>
                              Deadline: {formatDeadline(period.validationDeadline)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Period Status (Subtle dot indicator - does not compete with qualification badge) */}
                      <td className="col-span-1 md:col-auto md:table-cell p-0 md:py-3.5 md:px-4 align-middle whitespace-nowrap flex md:table-cell items-center">
                        {isPeriodOpen ? (
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            <span>Open Period</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                            <span>Closed</span>
                          </div>
                        )}
                      </td>

                      {/* Column 3: Qualification Status (Primary status badge in the row) */}
                      <td className="col-span-1 md:col-auto md:table-cell p-0 md:py-3.5 md:px-4 align-middle whitespace-nowrap flex md:table-cell items-center justify-end md:justify-start">
                        <StatusBadge
                          status={qualificationStatus}
                          label={statusLabelMap[qualificationStatus]}
                        />
                      </td>

                      {/* Column 4: Calculated Score (Clear numerical anchor with required percentage reference) */}
                      <td className="col-span-1 md:col-auto md:table-cell p-0 md:py-3.5 md:px-4 align-middle">
                        <div className="w-full md:min-w-[120px] md:max-w-[140px] space-y-1">
                          <div className="flex items-baseline justify-between gap-1.5">
                            <span
                              className={cn(
                                "text-sm sm:text-base font-black tracking-tight tabular-nums",
                                isQualified
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-foreground"
                              )}
                            >
                              {liveScore.totalScore}%
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium whitespace-nowrap">
                              Required Percentage: {threshold}%
                            </span>
                          </div>
                          <Progress
                            value={Math.min(100, liveScore.totalScore)}
                            className="h-1.5 bg-slate-200 dark:bg-slate-700"
                          />
                        </div>
                      </td>

                      {/* Column 5: Activities Summary (Clean, scannable tabular typography) */}
                      <td className="col-span-1 md:col-auto md:table-cell p-0 md:py-3.5 md:px-4 align-middle whitespace-nowrap flex md:table-cell flex-col justify-center">
                        <div className="space-y-0.5 sm:space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-muted-foreground text-[11px] sm:text-xs min-w-[56px] sm:min-w-[76px]">City-Led:</span>
                            <span className="font-bold text-foreground tabular-nums text-[11px] sm:text-xs">
                              {verifiedCityCount} / {semesterActivities.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-muted-foreground text-[11px] sm:text-xs min-w-[56px] sm:min-w-[76px]">PPAs:</span>
                            <span className="font-bold text-foreground tabular-nums text-[11px] sm:text-xs">
                              {approvedPpaCount} approved
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 6: Action (Clear hierarchy: primary for active, outline for evaluated/closed) */}
                      <td className="col-span-2 md:col-auto md:table-cell p-0 pt-1 md:pt-0 md:py-3.5 md:px-5 md:text-right align-middle whitespace-nowrap">
                        <Button
                          type="button"
                          variant={isNeedsAttention ? "default" : "outline"}
                          size="sm"
                          onClick={() => onSelectSemester(period.semesterKey)}
                          className={cn(
                            "w-full md:w-auto h-8 px-3 rounded-lg text-xs font-medium gap-1.5 inline-flex items-center justify-center cursor-pointer transition-all whitespace-nowrap active:scale-[0.98]",
                            isNeedsAttention
                              ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs"
                              : "border border-border/80 bg-background hover:bg-muted text-foreground"
                          )}
                        >
                          <span>{actionLabel}</span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Standard User Portal Pagination Toolbar */}
        <div className="p-3.5 px-5 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-muted/10">
          <div>
            Showing <span className="font-bold text-foreground">{startRecord}</span> to <span className="font-bold text-foreground">{endRecord}</span> of <span className="font-bold text-foreground">{filteredPeriods.length}</span> records
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={currentPageSafe <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 gap-1 rounded-lg cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <Button
                key={pageNum}
                type="button"
                variant={pageNum === currentPageSafe ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentPage(pageNum)}
                className={cn(
                  "h-8 w-8 p-0 text-xs font-semibold rounded-lg cursor-pointer transition-colors",
                  pageNum === currentPageSafe
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                )}
              >
                {pageNum}
              </Button>
            ))}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={currentPageSafe >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 gap-1 rounded-lg cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
