import React, { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Edit3,
  Trash2,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/portal/StatusBadge";
import {
  DEFAULT_ORG_LED_TIERS,
  getApprovedYpopOrgActivityCount,
  type YPOPEntry,
  type YPOPOrgActivity,
  type YPOPOrgActivityFile,
  type YPOPPeriod,
} from "@/lib/lydo-connect-data";
import {
  deleteYpopOrgActivityFromSupabase,
} from "@/lib/lydo-connect-supabase";
import { YpopPpaModal } from "./YpopPpaModal";

export interface YpopOrgLedTabProps {
  onEnsureEntry?: () => Promise<YPOPEntry>;
  period: YPOPPeriod;
  entry: YPOPEntry | null;
  orgActivities: YPOPOrgActivity[];
  orgActivityFiles: YPOPOrgActivityFile[];
  organizationId: string;
  userId: string;
  formatShortPortalDate: (dateStr: string) => string;
  onActivitySaved: (activity: YPOPOrgActivity) => void;
  onActivityDeleted: (activityId: string) => void;
  onFileCreated: (file: YPOPOrgActivityFile) => void;
  onFileDeleted: (fileId: string) => void;
}

export const YpopOrgLedTab: React.FC<YpopOrgLedTabProps> = ({
  onEnsureEntry,
  period,
  entry,
  orgActivities,
  orgActivityFiles,
  organizationId,
  userId,
  formatShortPortalDate,
  onActivitySaved,
  onActivityDeleted,
  onFileCreated,
  onFileDeleted,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<YPOPOrgActivity | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Use configured period orgLedTiers if available, or fallback (Internal calculation preserved per Requirement #2 & #9)
  const tiers = period.orgLedTiers?.length ? period.orgLedTiers : DEFAULT_ORG_LED_TIERS;
  const sortedTiers = [...tiers].sort((a, b) => a.minProjects - b.minProjects);

  // Scoped to this semester's entry
  const entryActivities = entry
    ? orgActivities.filter((act) => act.ypopEntryId === entry.id)
    : [];

  const approvedCount = entry
    ? getApprovedYpopOrgActivityCount(entryActivities, entry.id, entry.orgLedProjectCount ?? 0)
    : 0;

  // Active bonus tier calculation preserved internally
  const activeTier = [...sortedTiers].reverse().find((t) => approvedCount >= t.minProjects);
  const currentBonus = activeTier?.bonus ?? 0;

  // Search filter
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return entryActivities;
    const q = searchQuery.toLowerCase();
    return entryActivities.filter((act) => {
      return (
        act.activityName?.toLowerCase().includes(q) ||
        act.venue?.toLowerCase().includes(q) ||
        act.narrativeReport?.toLowerCase().includes(q)
      );
    });
  }, [entryActivities, searchQuery]);

  const handleOpenNew = async () => {
    if (!entry && onEnsureEntry) {
      try {
        await onEnsureEntry();
      } catch (err) {
        toast({
          title: "Unable to start PPA",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
        return;
      }
    }
    setEditingActivity(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (act: YPOPOrgActivity) => {
    setEditingActivity(act);
    setModalOpen(true);
  };

  const handleDelete = async (act: YPOPOrgActivity) => {
    if (!confirm(`Are you sure you want to delete "${act.activityName}"?`)) return;

    setDeletingId(act.id);
    try {
      await deleteYpopOrgActivityFromSupabase(act.id);
      onActivityDeleted(act.id);
      toast({
        title: "Activity deleted",
        description: "The organization PPA record has been removed.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete activity.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Table Container in Y-TRACE Design System */}
      <Card className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
        {/* Table Toolbar / Header */}
        <div className="p-3.5 sm:p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Organization-Led PPAs
              </h3>
              <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/50">
                {approvedCount} of {entryActivities.length} Approved
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Programs, projects, and activities initiated by your organization for {period.semesterLabel}.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search PPAs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8.5 w-full sm:w-48 bg-background border-border/80 rounded-lg"
              />
            </div>
            <Button
              type="button"
              onClick={handleOpenNew}
              className="h-8.5 px-3.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs gap-1.5 cursor-pointer whitespace-nowrap transition-all active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log PPA Activity</span>
            </Button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full text-left border-collapse md:min-w-[850px]">
            <thead className="hidden md:table-header-group">
              <tr className="border-b border-border/70 bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3.5 px-5 min-w-[200px] lg:min-w-[220px]">Activity / PPA</th>
                <th className="py-3.5 px-4 min-w-[140px]">Date & Venue</th>
                <th className="py-3.5 px-4 min-w-[120px]">Status</th>
                <th className="py-3.5 px-4 min-w-[120px]">Documents</th>
                <th className="py-3.5 px-4 min-w-[140px]">Admin Remarks</th>
                <th className="py-3.5 px-5 text-right min-w-[160px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 md:table-row-group">
              {filteredActivities.length === 0 ? (
                <tr className="block md:table-row">
                  <td colSpan={6} className="block md:table-cell py-12 text-center text-muted-foreground text-xs space-y-3">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto stroke-1" />
                    <p className="text-sm font-bold text-foreground">
                      {entryActivities.length === 0
                        ? "No Organization PPAs Logged"
                        : "No matching PPAs found"}
                    </p>
                    <p className="text-xs max-w-sm mx-auto">
                      {entryActivities.length === 0
                        ? `Your organization has not recorded any project, program, or activity for ${period.semesterLabel} yet.`
                        : "Try adjusting your search query."}
                    </p>
                    {entryActivities.length === 0 && (
                      <Button
                        type="button"
                        onClick={handleOpenNew}
                        className="h-8.5 px-3.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer gap-1.5 transition-all active:scale-[0.98]"
                      >
                        <Plus className="h-3.5 w-3.5" /> Log First PPA Activity
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredActivities.map((act) => {
                  const files = orgActivityFiles.filter((f) => f.orgActivityId === act.id);
                  const isApproved = act.status === "approved";
                  const isNeedsRevision = act.status === "needs_revision";
                  const isRejected = act.status === "rejected";
                  const isUnderReview = act.status === "under_review" || act.status === "submitted";
                  const isDraft = act.status === "draft";

                  return (
                    <tr
                      key={act.id}
                      className="grid grid-cols-2 gap-2.5 p-3.5 sm:p-4 md:table-row md:p-0 md:h-18 md:gap-0 hover:bg-muted/40 transition-colors duration-150 group border-b md:border-b-0 border-border/40"
                    >
                      {/* Column 1: Activity Name & Narrative */}
                      <td className="col-span-2 md:col-auto md:table-cell p-0 md:py-3.5 md:px-5 align-middle order-1">
                        <div className="space-y-1 min-w-0 max-w-[260px]">
                          <p
                            onClick={() => handleOpenEdit(act)}
                            className="font-bold text-sm text-foreground hover:text-primary transition-colors cursor-pointer leading-snug tracking-tight truncate"
                            title={act.activityName}
                          >
                            {act.activityName}
                          </p>
                          {act.narrativeReport && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {act.narrativeReport}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Column 2: Date & Venue */}
                      <td className="col-span-2 sm:col-span-1 md:col-auto md:table-cell p-0 md:py-3.5 md:px-4 align-middle whitespace-nowrap order-3">
                        <div className="space-y-0.5 text-xs text-muted-foreground font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                            <span>{act.activityDate ? formatShortPortalDate(act.activityDate) : "Date not set"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                            <span className="truncate max-w-[150px]">{act.venue || "Pasig City"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Status Badge (Standardized via StatusBadge) */}
                      <td className="col-span-1 md:col-auto md:table-cell p-0 md:py-3.5 md:px-4 align-middle whitespace-nowrap flex md:table-cell items-center order-2">
                        <StatusBadge status={act.status} />
                      </td>

                      {/* Column 4: Documents */}
                      <td className="col-span-1 md:col-auto md:table-cell p-0 md:py-3.5 md:px-4 align-middle whitespace-nowrap flex md:table-cell items-center justify-end md:justify-start order-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                          <span>{files.length} attachment{files.length === 1 ? "" : "s"}</span>
                        </div>
                      </td>

                      {/* Column 5: Admin Remarks */}
                      <td className="col-span-2 md:col-auto md:table-cell p-0 md:py-3.5 md:px-4 align-middle order-4">
                        {act.adminRemarks ? (
                          <div
                            className={`p-2 rounded-lg text-xs leading-relaxed max-w-[240px] ${
                              isNeedsRevision
                                ? "bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200"
                                : isRejected
                                ? "bg-destructive/10 border border-destructive/20 text-destructive"
                                : "bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            <p className="line-clamp-2 italic font-medium">"{act.adminRemarks}"</p>
                          </div>
                        ) : (
                          <span className="hidden md:inline text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>

                      {/* Column 6: Action */}
                      <td className="col-span-2 md:col-auto md:table-cell p-0 pt-1 md:pt-0 md:py-3.5 md:px-5 md:text-right align-middle whitespace-nowrap order-5">
                        {isNeedsRevision && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(act)}
                            className="w-full md:w-auto h-8 px-3 text-xs font-semibold rounded-lg gap-1.5 cursor-pointer border border-amber-500/40 dark:border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 dark:hover:bg-amber-500/25 hover:border-amber-500/60 dark:hover:border-amber-500/50 hover:text-amber-900 dark:hover:text-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-2 shadow-2xs whitespace-nowrap transition-all active:scale-[0.98] inline-flex items-center justify-center"
                          >
                            <Edit3 className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300" />
                            <span>Resolve Revision</span>
                          </Button>
                        )}
                        {isDraft && (
                          <div className="flex items-center justify-between md:justify-end gap-1.5 w-full md:w-auto">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(act)}
                              className="flex-1 md:flex-initial h-8 px-3 text-xs font-medium rounded-lg gap-1.5 cursor-pointer whitespace-nowrap border-border/80 hover:bg-muted text-foreground transition-all active:scale-[0.98] inline-flex items-center justify-center"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={deletingId === act.id}
                              onClick={() => handleDelete(act)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer transition-colors active:scale-[0.98] shrink-0"
                              title="Delete PPA"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        {isUnderReview && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(act)}
                            className="w-full md:w-auto h-8 px-3 text-xs font-medium rounded-lg whitespace-nowrap border-border/80 hover:bg-muted text-foreground transition-all active:scale-[0.98] inline-flex items-center justify-center"
                          >
                            View Details
                          </Button>
                        )}
                        {isApproved && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(act)}
                            className="w-full md:w-auto h-8 px-3 text-xs font-medium rounded-lg whitespace-nowrap border-border/80 hover:bg-muted text-foreground transition-all active:scale-[0.98] inline-flex items-center justify-center"
                          >
                            View Submission
                          </Button>
                        )}
                        {isRejected && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(act)}
                            className="w-full md:w-auto h-8 px-3 text-xs font-medium rounded-lg text-destructive border-destructive/30 hover:bg-destructive/10 whitespace-nowrap transition-all active:scale-[0.98] inline-flex items-center justify-center"
                          >
                            View Remarks & Files
                          </Button>
                        )}
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
            <strong className="font-bold text-foreground">{entryActivities.length}</strong> records
          </span>
        </div>
      </Card>

      {/* PPA Modal */}
      <YpopPpaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        entry={entry}
        activity={editingActivity}
        orgActivityFiles={orgActivityFiles}
        organizationId={organizationId}
        userId={userId}
        onActivitySaved={(saved) => {
          setEditingActivity(saved);
          onActivitySaved(saved);
        }}
        onFileCreated={onFileCreated}
        onFileDeleted={onFileDeleted}
      />
    </div>
  );
};
