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
  getApprovedYpopOrgActivityCount,
  YPOP_SCORE_THRESHOLD,
  type YPOPCityActivity,
  type YPOPEntry,
  type YPOPEventParticipation,
  type YPOPOrgActivity,
  type YPOPPeriod,
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
      <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-4 sm:p-6 rounded-2xl border border-border/60 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-primary">Youth Participation Organization Passport (YPOP)</span>
          <span className="text-muted-foreground/30">•</span>
          <span className="text-xs text-muted-foreground">Validation Periods</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Select a YPOP Semester Period
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
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
                  className="h-8 rounded-xl border-border text-xs font-medium gap-1.5 cursor-pointer shrink-0 w-full sm:w-auto justify-between sm:justify-center px-3 hover:bg-accent text-foreground"
                >
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">Status: {currentStatusLabel}</span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-70 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl bg-card border-border/80 shadow-lg z-50">
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
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3.5 px-5">Semester / Period</th>
                <th className="py-3.5 px-4">Period Status</th>
                <th className="py-3.5 px-4">Qualification Status</th>
                <th className="py-3.5 px-4">Calculated Score</th>
                <th className="py-3.5 px-4">Activities Summary</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredPeriods.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-xs space-y-2">
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

                  const verifiedCityCount = verifiedAttendance.filter((a) => a.attended).length;
                  const actionLabel = getActionLabel(entry, period);

                  return (
                    <tr
                      key={period.id}
                      className="h-20 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors duration-150 group border-b border-border/40"
                    >
                      {/* Column 1: Semester / Period */}
                      <td className="py-3.5 px-5">
                        <div className="space-y-1 min-w-0">
                          <p
                            onClick={() => onSelectSemester(period.semesterKey)}
                            className="text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer leading-tight"
                          >
                            {period.semesterLabel}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              Deadline: {formatDeadline(period.validationDeadline)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Period Status (Standardized via StatusBadge) */}
                      <td className="py-3.5 px-4 align-middle">
                        <StatusBadge
                          status={period.status === "open" ? "open" : "closed"}
                          label={period.status === "open" ? "Open Period" : "Closed"}
                        />
                      </td>

                      {/* Column 3: Qualification Status (Standardized via StatusBadge) */}
                      <td className="py-3.5 px-4 align-middle">
                        <StatusBadge
                          status={entry ? entry.status : (period.status === "open" ? "not_started" : "closed")}
                          label={
                            entry
                              ? undefined
                              : (period.status === "open" ? "Not Started" : "No Submission")
                          }
                        />
                      </td>

                      {/* Column 4: Calculated Score */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="space-y-1 min-w-[130px]">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Score</span>
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                              {liveScore.totalScore}%
                            </span>
                          </div>
                          <Progress
                            value={Math.min(100, liveScore.totalScore)}
                            className="h-1.5 bg-muted w-28"
                          />
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>Cutoff: {YPOP_SCORE_THRESHOLD}%</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 5: Activities Summary */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-[11px] text-foreground font-medium">
                            <span className="text-muted-foreground">City-Led:</span>
                            <span className="font-bold">{verifiedCityCount} / {semesterActivities.length}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-foreground font-medium">
                            <span className="text-muted-foreground">Approved PPAs:</span>
                            <span className="font-bold">{approvedPpaCount}</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 6: Action */}
                      <td className="py-3.5 px-5 text-right align-middle">
                        <Button
                          type="button"
                          onClick={() => onSelectSemester(period.semesterKey)}
                          className="h-9 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-2xs gap-1.5 inline-flex items-center cursor-pointer whitespace-nowrap"
                        >
                          <span>{actionLabel}</span>
                          <ChevronRight className="h-4 w-4" />
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
              className="h-8 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground gap-1"
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
                className={`h-8 w-8 p-0 text-xs font-bold rounded-lg ${
                  pageNum === currentPageSafe
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
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
              className="h-8 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground gap-1"
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
