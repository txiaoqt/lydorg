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
          className="inline-flex items-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer p-0.5 rounded-sm hover:bg-slate-100"
        >
          <CircleHelp className="h-[18px] w-[18px]" strokeWidth={1.6} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[94vw] max-w-[420px] max-h-[85vh] overflow-y-auto p-4 space-y-3 rounded-2xl shadow-xl bg-white border border-slate-200 text-slate-900 font-segoe"
      >
        {/* Header Information matching Reference 1 */}
        <div>
          <h3 className="text-base font-bold tracking-tight text-slate-900">
            YPOP POINTS BREAKDOWN
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Breakdown of this organization’s overall YPOP points.
          </p>
          {(organizationName || semesterLabel || entry.semesterLabel) && (
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span className="truncate max-w-[200px]">{organizationName || "Organization"}</span>
              <span className="shrink-0">{semesterLabel || entry.semesterLabel || entry.semester}</span>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100" />

        {/* CITY-LED POINTS SECTION */}
        <div className="space-y-1.5" data-testid="city-led-points-summary">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            City-Led Points
          </p>

          <div className="space-y-1 text-xs">
            {categoryRowsToDisplay.map((catRow) => (
              <div key={catRow.category} className="flex items-center justify-between py-0.5">
                <span className="font-semibold text-slate-800">
                  {catRow.count}× {catRow.label}
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {catRow.count} × {catRow.standardPoints} pts =
                </span>
                <span
                  className={cn(
                    "font-cascadia font-bold min-w-[36px] text-right",
                    catRow.earnedPoints > 0 ? "text-slate-900" : "text-slate-400"
                  )}
                >
                  {catRow.earnedPoints} pts
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-slate-200 my-1.5" />

          {/* Subtotal */}
          <div className="flex items-start justify-between text-xs pt-0.5">
            <div>
              <span className="font-semibold text-slate-700">City-led subtotal</span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {liveScore.cityLedEarned} pts ÷ {liveScore.cityLedMax} max pts = {liveScore.cityLedPercent}%
              </p>
            </div>
            <span className="font-cascadia font-bold text-slate-900 text-sm">
              {liveScore.cityLedEarned} pts
            </span>
          </div>
        </div>

        {/* ORGANIZATION-LED BONUS SECTION */}
        <div className="space-y-1.5 pt-1" data-testid="org-led-bonus-summary">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Organization-Led Bonus
            </p>
            <span className="text-[11px] text-slate-500 font-medium">
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
                      ? "border border-blue-200 bg-blue-50/70 text-blue-900 font-semibold shadow-xs"
                      : "border border-slate-100 bg-slate-50/60 text-slate-400 font-normal"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {isCurrent && <span className="text-blue-600 text-[11px]">✓</span>}
                    <span>≥ {tier.minProjects} project{tier.minProjects > 1 ? "s" : ""}</span>
                  </span>
                  <span
                    className={cn(
                      "font-cascadia font-bold",
                      isCurrent ? "text-blue-700 font-extrabold" : "text-slate-400"
                    )}
                  >
                    +{tier.bonus}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* FINAL COMPUTATION / TOTAL SECTION (GREEN CARD MATCHING REFERENCE 1) */}
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 space-y-2 mt-2">
          <div className="flex items-center justify-between text-xs text-emerald-800">
            <span className="font-medium">City-led score</span>
            <span className="font-cascadia font-bold">{liveScore.cityLedPercent}%</span>
          </div>
          <div className="flex items-center justify-between text-xs text-emerald-800">
            <span className="font-medium">Organization-led bonus</span>
            <span className="font-cascadia font-bold">+{liveScore.orgLedBonus}%</span>
          </div>
          <div className="border-t border-emerald-200/60 pt-2 flex items-center justify-between">
            <span className="font-bold text-slate-800 text-xs">Total YPOP Points</span>
            <span
              className="font-cascadia text-xl font-black text-emerald-700"
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
