import React from "react";
import { CircleHelp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DEFAULT_ORG_LED_TIERS,
  normalizeYpopCityLedPoints,
  resolveYpopCityLedCategory,
  YPOP_CITY_LED_CATEGORY_LABELS,
  YPOP_CITY_LED_CATEGORY_POINTS,
  type YPOPCityActivity,
  type YPOPCityActivityCategory,
  type YPOPEntry,
  type YPOPEventParticipation,
  type YPOPOrgActivity,
  type YPOPPeriod,
  type YpopQualificationStatus,
} from "@/lib/lydo-connect-data";
import { cn } from "@/lib/utils";

export interface YpopValidationComputationPopoverProps {
  entry: YPOPEntry;
  organizationName?: string;
  semesterLabel?: string;
  semesterActivities: YPOPCityActivity[];
  orgEventParticipations?: YPOPEventParticipation[];
  orgActivities: YPOPOrgActivity[];
  verifiedAttendance: Array<{ activityId: string; attended: boolean }>;
  liveScore: {
    cityLedEarned: number;
    cityLedMax: number;
    cityLedPercent: number;
    cityLedWeightedScore: number;
    orgLedBonus: number;
    totalScore: number;
  };
  displayScore: number;
  overallQualificationStatus?: YpopQualificationStatus | YPOPEntry["status"];
  period?: YPOPPeriod | null;
}

const CATEGORY_ORDER: YPOPCityActivityCategory[] = ["mandatory", "invitational", "partnership"];

export const YpopValidationComputationPopover: React.FC<YpopValidationComputationPopoverProps> = ({
  entry,
  organizationName,
  semesterLabel,
  semesterActivities,
  orgEventParticipations,
  orgActivities,
  verifiedAttendance,
  liveScore,
  displayScore,
  overallQualificationStatus,
  period,
}) => {
  const approvedPpaCount = orgActivities.filter((a) => a.status === "approved").length;

  const configuredTiers = period?.orgLedTiers?.length ? period.orgLedTiers : DEFAULT_ORG_LED_TIERS;
  const sortedTiersDescending = [...configuredTiers].sort((a, b) => b.minProjects - a.minProjects);
  const matchedTier = sortedTiersDescending.find((t) => approvedPpaCount >= t.minProjects);
  const tiersAscending = [...configuredTiers].sort((a, b) => a.minProjects - b.minProjects);

  // Derive category breakdown for City-Led points based on actual current semester activities
  const allCategoryRows = CATEGORY_ORDER.map((cat) => {
    const allInCat = semesterActivities.filter(
      (act) => resolveYpopCityLedCategory(act.category, act.points) === cat
    );
    const verifiedInCat = allInCat.filter((act) =>
      verifiedAttendance.some((item) => item.activityId === act.id && item.attended)
    );

    const standardPoints = YPOP_CITY_LED_CATEGORY_POINTS[cat];
    const count = verifiedInCat.length;
    const earnedPoints = verifiedInCat.reduce(
      (sum, act) => sum + normalizeYpopCityLedPoints(act.points, act.category),
      0
    );

    return {
      category: cat,
      label: YPOP_CITY_LED_CATEGORY_LABELS[cat],
      standardPoints,
      count,
      totalInSemester: allInCat.length,
      earnedPoints,
    };
  });

  // Filter to categories that exist in this semester or have contributions; fallback to all categories if semester has none
  const activeCategoryRows = allCategoryRows.filter((r) => r.totalInSemester > 0);
  const categoryRowsToDisplay = activeCategoryRows.length > 0 ? activeCategoryRows : allCategoryRows;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="View actual YPOP qualification computation"
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5 rounded-sm hover:bg-muted"
        >
          <CircleHelp className="h-[18px] w-[18px]" strokeWidth={1.6} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[94vw] max-w-[420px] max-h-[85vh] overflow-y-auto p-4 space-y-3 rounded-2xl shadow-xl bg-admin-surface border border-slate-300 dark:border-slate-800 text-text-default font-segoe"
      >
        {/* Header Information */}
        <div>
          <h3 className="text-base font-bold tracking-tight text-text-default">
            YPOP POINTS BREAKDOWN
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Breakdown of this organization’s overall YPOP points.
          </p>
          {(organizationName || semesterLabel || entry.semesterLabel) && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 pt-1">
              <span className="truncate max-w-[200px]">{organizationName || "Organization"}</span>
              <span className="shrink-0">{semesterLabel || entry.semesterLabel || entry.semester}</span>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800" />

        {/* CITY-LED POINTS SECTION */}
        <div className="space-y-1.5" data-testid="city-led-points-summary">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            City-Led Points
          </p>

          <div className="space-y-1 text-xs">
            {categoryRowsToDisplay.map((catRow) => (
              <div key={catRow.category} className="flex items-center justify-between py-0.5">
                <span className="font-semibold text-text-default">
                  {catRow.count}× {catRow.label}
                </span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  {catRow.count} × {catRow.standardPoints} pts =
                </span>
                <span
                  className={cn(
                    "font-cascadia font-bold min-w-[36px] text-right",
                    catRow.earnedPoints > 0 ? "text-text-default" : "text-muted-foreground"
                  )}
                >
                  {catRow.earnedPoints} pts
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-slate-200 dark:border-slate-800 my-1.5" />

          {/* Subtotal */}
          <div className="flex items-start justify-between text-xs pt-0.5">
            <div>
              <span className="font-semibold text-text-default">City-led subtotal</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {liveScore.cityLedEarned} pts ÷ {liveScore.cityLedMax} max pts = {liveScore.cityLedPercent}%
              </p>
            </div>
            <span className="font-cascadia font-bold text-text-default text-sm">
              {liveScore.cityLedEarned} pts
            </span>
          </div>
        </div>

        {/* ORGANIZATION-LED BONUS SECTION */}
        <div className="space-y-1.5 pt-1" data-testid="org-led-bonus-summary">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Organization-Led Bonus
            </p>
            <span className="text-[11px] text-muted-foreground font-medium">
              {approvedPpaCount} approved {approvedPpaCount === 1 ? "project" : "projects"}
            </span>
          </div>

          <div className="space-y-1.5">
            {tiersAscending.map((tier) => {
              const isCurrent = matchedTier?.minProjects === tier.minProjects;
              return (
                <div
                  key={tier.minProjects}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors",
                    isCurrent
                      ? "border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold shadow-xs"
                      : "border border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/30 text-muted-foreground font-normal"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {isCurrent && <span className="text-blue-600 dark:text-blue-400 text-[11px]">✓</span>}
                    <span>≥ {tier.minProjects} project{tier.minProjects > 1 ? "s" : ""}</span>
                  </span>
                  <span
                    className={cn(
                      "font-cascadia font-bold",
                      isCurrent ? "text-blue-700 dark:text-blue-400 font-extrabold" : "text-muted-foreground"
                    )}
                  >
                    +{tier.bonus}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* FINAL COMPUTATION / TOTAL SECTION */}
        <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-800/40 bg-emerald-50/70 dark:bg-emerald-950/30 p-3.5 space-y-2 mt-2">
          <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <span className="font-medium">City-led score</span>
            <span className="font-cascadia font-bold">{liveScore.cityLedPercent}%</span>
          </div>
          <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <span className="font-medium">Organization-led bonus</span>
            <span className="font-cascadia font-bold">+{liveScore.orgLedBonus}%</span>
          </div>
          <div className="border-t border-emerald-200/60 dark:border-emerald-800/40 pt-2 flex items-center justify-between">
            <span className="font-bold text-text-default text-xs">Total YPOP Points</span>
            <span
              className="font-cascadia text-xl font-black text-emerald-700 dark:text-emerald-400"
              data-testid="popover-total-score"
            >
              {displayScore}%
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
