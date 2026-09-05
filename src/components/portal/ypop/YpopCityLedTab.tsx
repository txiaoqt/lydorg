import React, { useState } from "react";
import {
  Award,
  Calendar,
  MapPin,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  ChevronDown,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { cn } from "@/lib/utils";
import {
  resolveYpopCityLedCategory,
  YPOP_CITY_LED_CATEGORY_LABELS,
  YPOP_CITY_LED_CATEGORY_TAG_STYLES,
  formatActivityDateRange,
  type YPOPCityActivity,
  type YPOPCityActivityCategory,
  type YPOPEventFile,
  type YPOPEventParticipation,
  type YPOPPeriod,
} from "@/lib/lydo-connect-data";
import { YpopProofDrawer } from "./YpopProofDrawer";

export interface YpopCityLedTabProps {
  period: YPOPPeriod;
  activities: YPOPCityActivity[];
  participations: YPOPEventParticipation[];
  eventFiles: YPOPEventFile[];
  organizationId: string;
  isPeriodOpen: boolean;
  canEditParticipation: boolean;
  onParticipationCreated: (participation: YPOPEventParticipation) => void;
  onParticipationUpdated: (participation: YPOPEventParticipation) => void;
  onFileCreated: (file: YPOPEventFile) => void;
  onFileDeleted: (fileId: string) => void;
}

export const YpopCityLedTab: React.FC<YpopCityLedTabProps> = ({
  period,
  activities,
  participations,
  eventFiles,
  organizationId,
  isPeriodOpen,
  canEditParticipation,
  onParticipationCreated,
  onParticipationUpdated,
  onFileCreated,
  onFileDeleted,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeActivity, setActiveActivity] = useState<YPOPCityActivity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Category activity counts for filter labels
  const mandatoryCount = activities.filter(
    (act) => resolveYpopCityLedCategory(act.category, act.points) === "mandatory"
  ).length;
  const invitationalCount = activities.filter(
    (act) => resolveYpopCityLedCategory(act.category, act.points) === "invitational"
  ).length;
  const partnershipCount = activities.filter(
    (act) => resolveYpopCityLedCategory(act.category, act.points) === "partnership"
  ).length;

  const currentCategoryLabel =
    categoryFilter === "all"
      ? "All"
      : YPOP_CITY_LED_CATEGORY_LABELS[categoryFilter as YPOPCityActivityCategory] || categoryFilter;

  // Filter activities for this semester
  const filteredActivities = activities.filter((act) => {
    const matchesSearch =
      act.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.venue || "").toLowerCase().includes(searchQuery.toLowerCase());
    const category = resolveYpopCityLedCategory(act.category, act.points);
    const matchesCategory = categoryFilter === "all" || category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleOpenDrawer = (activity: YPOPCityActivity) => {
    setActiveActivity(activity);
    setDrawerOpen(true);
  };

  const activeParticipation = activeActivity
    ? participations.find((p) => p.activityId === activeActivity.id) ?? null
    : null;

  return (
    <div className="space-y-4">
      {/* Table Container in Y-TRACE Design System */}
      <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
        {/* Standard User Portal Search and Filters Toolbar */}
        <div className="p-3 sm:p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-card">
          {/* Search Bar matching established User Portal pattern */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search activities or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs rounded-xl bg-background border-border/80 w-full"
            />
          </div>

          {/* Category Filter Dropdown matching established User Portal pattern */}
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
                    <span className="truncate">Category: {currentCategoryLabel}</span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-70 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl bg-card border-border/80 shadow-lg z-50">
                <DropdownMenuItem
                  onClick={() => setCategoryFilter("all")}
                  className={cn(
                    "text-xs font-medium rounded-lg cursor-pointer flex items-center justify-between py-1.5 px-2.5",
                    categoryFilter === "all" && "bg-primary/10 text-primary font-bold"
                  )}
                >
                  <span>All Categories</span>
                  <span className="text-[10px] text-muted-foreground">({activities.length})</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setCategoryFilter("mandatory")}
                  className={cn(
                    "text-xs font-medium rounded-lg cursor-pointer flex items-center justify-between py-1.5 px-2.5",
                    categoryFilter === "mandatory" && "bg-primary/10 text-primary font-bold"
                  )}
                >
                  <span className="truncate mr-2">Mandatory (4 pts)</span>
                  <span className="text-[10px] text-muted-foreground">({mandatoryCount})</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setCategoryFilter("invitational")}
                  className={cn(
                    "text-xs font-medium rounded-lg cursor-pointer flex items-center justify-between py-1.5 px-2.5",
                    categoryFilter === "invitational" && "bg-primary/10 text-primary font-bold"
                  )}
                >
                  <span className="truncate mr-2">Invitational (3 pts)</span>
                  <span className="text-[10px] text-muted-foreground">({invitationalCount})</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setCategoryFilter("partnership")}
                  className={cn(
                    "text-xs font-medium rounded-lg cursor-pointer flex items-center justify-between py-1.5 px-2.5",
                    categoryFilter === "partnership" && "bg-primary/10 text-primary font-bold"
                  )}
                >
                  <span className="truncate mr-2">Partnership (2 pts)</span>
                  <span className="text-[10px] text-muted-foreground">({partnershipCount})</span>
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
                <th className="py-3.5 px-5">Activity</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Venue</th>
                <th className="py-3.5 px-4">Proof Status</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-xs space-y-2">
                    <Award className="h-8 w-8 text-muted-foreground mx-auto stroke-1" />
                    <p className="text-sm font-bold text-foreground">No City-Led activities found</p>
                    <p className="text-xs max-w-sm mx-auto">
                      {searchQuery || categoryFilter !== "all"
                        ? "Try adjusting your search query or category filter."
                        : "No city activities have been scheduled by the LYDO Admin for this semester."}
                    </p>
                    {(searchQuery || categoryFilter !== "all") && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery("");
                          setCategoryFilter("all");
                        }}
                        className="h-8 px-3 text-xs font-semibold rounded-xl mt-2 cursor-pointer"
                      >
                        Reset Filters
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredActivities.map((act) => {
                  const category = resolveYpopCityLedCategory(act.category, act.points);
                  const participation = participations.find((p) => p.activityId === act.id);
                  const filesCount = participation
                    ? eventFiles.filter((f) => f.participationId === participation.id).length
                    : 0;

                  return (
                    <tr
                      key={act.id}
                      className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors duration-150 group"
                    >
                      {/* Column 1: Activity Name & Details */}
                      <td className="py-3.5 px-5 align-middle">
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-foreground leading-tight">{act.name}</p>
                          {act.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs sm:max-w-md">
                              {act.description}
                            </p>
                          )}
                          {participation?.status === "needs_revision" && participation.adminRemarks && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span className="italic">"{participation.adminRemarks}"</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Column 2: Category (Exact colors, NO redundant points weight badge) */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <span
                          className={cn(
                            "text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center",
                            YPOP_CITY_LED_CATEGORY_TAG_STYLES[category].className
                          )}
                          style={{
                            color: YPOP_CITY_LED_CATEGORY_TAG_STYLES[category].text,
                            backgroundColor: YPOP_CITY_LED_CATEGORY_TAG_STYLES[category].background,
                            borderColor: YPOP_CITY_LED_CATEGORY_TAG_STYLES[category].border,
                          }}
                        >
                          {YPOP_CITY_LED_CATEGORY_LABELS[category]}
                        </span>
                      </td>

                      {/* Column 3: Date */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{formatActivityDateRange(act.startDate || act.date, act.endDate || act.date)}</span>
                        </div>
                      </td>

                      {/* Column 4: Venue */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[180px]">{act.venue || "Pasig City"}</span>
                        </div>
                      </td>

                      {/* Column 5: Proof Status */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        {participation ? (
                          <StatusBadge
                            status={participation.status}
                            label={
                                participation.status === "verified"
                                ? "Verified"
                                : participation.status === "needs_revision"
                                ? "Needs Revision"
                                : participation.status === "draft"
                                ? "Draft"
                                : undefined
                            }
                          />
                        ) : (
                          <StatusBadge
                            status="draft"
                            label="Not Submitted"
                          />
                        )}
                      </td>

                      {/* Column 6: Action */}
                      <td className="py-3.5 px-5 text-right align-middle whitespace-nowrap">
                        <Button
                          type="button"
                          variant={participation && filesCount > 0 ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleOpenDrawer(act)}
                          className="h-8 text-xs font-bold rounded-xl gap-1 cursor-pointer whitespace-nowrap"
                        >
                          {participation && filesCount > 0 ? (
                            <FileText className="h-3.5 w-3.5" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {participation?.status === "needs_revision"
                              ? "Resolve Revision"
                              : participation && filesCount > 0
                              ? "View Proof & Details"
                              : "Submit Attendance Proof"}
                          </span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Record Count Footer */}
        <div className="p-3.5 px-5 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground bg-muted/10">
          <span>
            Showing <strong className="font-bold text-foreground">{filteredActivities.length}</strong> of{" "}
            <strong className="font-bold text-foreground">{activities.length}</strong> activities
          </span>
        </div>
      </Card>

      {/* Proof Drawer Modal */}
      <YpopProofDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        activity={activeActivity}
        participation={activeParticipation}
        eventFiles={eventFiles}
        organizationId={organizationId}
        onParticipationUpdated={onParticipationUpdated}
        onFileCreated={onFileCreated}
        onFileDeleted={onFileDeleted}
      />
    </div>
  );
};
