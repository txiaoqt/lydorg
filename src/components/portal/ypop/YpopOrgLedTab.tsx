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
        <div className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-foreground">
                Organization-Led PPAs
              </h3>
              <span className="text-xs font-semibold text-muted-foreground bg-accent px-2.5 py-0.5 rounded-full border border-border/50">
                {approvedCount} of {entryActivities.length} Approved
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Programs, projects, and activities initiated by your organization for {period.semesterLabel}.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search PPAs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9 w-40 sm:w-48 bg-muted/20 border-border/80 rounded-xl"
              />
            </div>
            <Button
              type="button"
              onClick={handleOpenNew}
              className="h-9 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-2xs gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Log PPA Activity</span>
            </Button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-5">Activity / PPA</th>
                <th className="py-3 px-4">Date & Venue</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Documents</th>
                <th className="py-3 px-4">Admin Remarks</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-xs space-y-3">
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
                        className="h-9 px-4 text-xs font-bold rounded-xl bg-primary text-primary-foreground cursor-pointer gap-1.5"
                      >
                        <Plus className="h-4 w-4" /> Log First PPA Activity
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
                      className="h-20 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors duration-150 group border-b border-border/40"
                    >
                      {/* Column 1: Activity Name & Narrative */}
                      <td className="py-3.5 px-5">
                        <div className="space-y-1 min-w-0 max-w-[260px]">
                          <p
                            onClick={() => handleOpenEdit(act)}
                            className="font-bold text-sm text-foreground hover:text-primary transition-colors cursor-pointer leading-tight truncate"
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
                      <td className="py-3.5 px-4 align-middle">
                        <div className="space-y-1 text-xs text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span>{act.activityDate ? formatShortPortalDate(act.activityDate) : "Date not set"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[150px]">{act.venue || "Pasig City"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Status Badge (Standardized via StatusBadge) */}
                      <td className="py-3.5 px-4 align-middle">
                        <StatusBadge status={act.status} />
                      </td>

                      {/* Column 4: Documents */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span>{files.length} attachment{files.length === 1 ? "" : "s"}</span>
                        </div>
                      </td>

                      {/* Column 5: Admin Remarks */}
                      <td className="py-3.5 px-4 align-middle">
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
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>

                      {/* Column 6: Action */}
                      <td className="py-3.5 px-5 text-right align-middle">
                        {isNeedsRevision && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(act)}
                            className="h-8 px-3 text-xs font-bold rounded-xl gap-1 cursor-pointer border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 whitespace-nowrap"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Resolve Revision</span>
                          </Button>
                        )}
                        {isDraft && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(act)}
                              className="h-8 px-2.5 text-xs font-bold rounded-xl gap-1 cursor-pointer whitespace-nowrap"
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
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer"
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
                            className="h-8 px-3 text-xs font-semibold rounded-xl whitespace-nowrap"
                          >
                            View Details
                          </Button>
                        )}
                        {isApproved && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(act)}
                            className="h-8 px-3 text-xs font-semibold text-primary hover:bg-primary/10 rounded-xl whitespace-nowrap"
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
                            className="h-8 px-3 text-xs font-semibold rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 whitespace-nowrap"
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
        onActivitySaved={onActivitySaved}
        onFileCreated={onFileCreated}
        onFileDeleted={onFileDeleted}
      />
    </div>
  );
};
