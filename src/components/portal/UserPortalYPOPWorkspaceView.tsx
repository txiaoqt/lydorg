import React, { useState } from "react";
import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  FileText,
  Eye,
  Search,
  ChevronRight,
  ChevronDown,
  FileUp,
  Award,
  Sparkles,
  Calendar,
  MapPin,
  Send,
  Trash2,
  Edit3,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { PortalStatusBadge } from "@/components/portal/portal-ui";
import { cn } from "@/lib/utils";

import { WebsiteWorkflowNotice } from "./WebsiteWorkflowNotice";
import { FeatureGate } from "./FeatureGate";

export interface UserPortalYPOPWorkspaceViewProps {
  ypopWorkflowEligibility?: any;
  currentProfile: any;
  ypopEntries: Array<any>;
  ypopCityActivities: Array<any>;
  ypopEventParticipations: Array<any>;
  ypopEventFiles: Array<any>;
  ypopFiles: Array<any>;
  ypopOrgActivityFiles: Array<any>;
  activeEntry: any | null;
  navigate: (path: string) => void;
  userRouteMap: Record<string, string>;
  openFile: (url: string, name: string) => void;
  formatDateTimeLabel: (dateStr: string) => string;
  formatShortPortalDate: (dateStr: string) => string;
  setYpopOrgActivityModalOpen: (open: boolean) => void;
}

export const UserPortalYPOPWorkspaceView: React.FC<UserPortalYPOPWorkspaceViewProps> = ({
  ypopWorkflowEligibility,
  currentProfile,
  ypopEntries,
  ypopCityActivities,
  ypopEventParticipations,
  ypopEventFiles,
  ypopFiles,
  ypopOrgActivityFiles,
  activeEntry,
  navigate,
  userRouteMap,
  openFile,
  formatDateTimeLabel,
  formatShortPortalDate,
  setYpopOrgActivityModalOpen,
}) => {
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"activities" | "ppa" | "history">("activities");

  // Calculate score and status dynamically from authentic props
  const currentPoints = activeEntry?.pointsEarned || 0;
  const isQualified = currentPoints >= 70;
  const threshold = 70;

  const isYpopEligible = Boolean(
    ypopWorkflowEligibility
      ? ypopWorkflowEligibility.canEditParticipation
      : true
  );

  const nextYpopStepAction = !ypopWorkflowEligibility?.profileComplete
    ? "Complete Profile"
    : "View Registration Status";

  const nextYpopStepRoute = !ypopWorkflowEligibility?.profileComplete
    ? userRouteMap["organization-profile"]
    : userRouteMap["document-submission"];

  return (
    <FeatureGate
      canAccess={isYpopEligible}
      title="Complete registration requirements first"
      description="Your organization must complete registration before participating in YPOP incentive scoring."
      requirements={ypopWorkflowEligibility?.requirements || []}
      actionLabel={nextYpopStepAction}
      onAction={() => navigate(nextYpopStepRoute)}
      heroSection={
        <div className="bg-gradient-to-r from-card via-amber-50/10 to-slate-50/40 dark:from-card dark:via-amber-950/10 dark:to-slate-900/40 p-6 sm:p-7 rounded-2xl border border-border/60 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">YPOP Workspace</span>
                <span className="text-muted-foreground/30">•</span>
                <span className="text-xs text-muted-foreground">{currentProfile?.organizationName || "LYDO Pasig City"}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Youth Participation Organization Passport (YPOP)
              </h1>
              <p className="text-sm text-muted-foreground">
                Track qualification progress, submit PPA organization activities, and monitor incentive tiers.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="bg-background text-foreground transition-colors duration-200 font-sans space-y-6 max-w-[1440px] mx-auto py-2">
      {/* Hero Workspace Header */}
      <div className="bg-gradient-to-r from-card via-amber-50/10 to-slate-50/40 dark:from-card dark:via-amber-950/10 dark:to-slate-900/40 p-6 sm:p-7 rounded-2xl border border-border/60 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">YPOP Workspace</span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-xs text-muted-foreground">{currentProfile?.organizationName || "LYDO Pasig City"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Youth Participation Organization Passport (YPOP)
            </h1>
            <p className="text-sm text-muted-foreground">
              Track qualification progress, submit PPA organization activities, and monitor incentive tiers.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              onClick={() => setYpopOrgActivityModalOpen(true)}
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs gap-1.5 h-8 px-4 text-xs font-bold"
            >
              <Plus className="h-3.5 w-3.5" /> Log PPA Activity
            </Button>
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Left 70% Activities & PPA, Right 30% Sticky Qualification Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (70% - 8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Module Tabs */}
          <div className="flex items-center gap-1 bg-card border border-border/60 p-1.5 rounded-2xl w-full sm:w-fit shadow-xs scroll-tabs">
            <button
              type="button"
              onClick={() => setActiveTab("activities")}
              className={cn(
                "rounded-xl px-4 py-1.5 text-xs font-bold transition-all",
                activeTab === "activities"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              City-Led Activities ({ypopCityActivities.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ppa")}
              className={cn(
                "rounded-xl px-4 py-1.5 text-xs font-bold transition-all",
                activeTab === "ppa"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              Organization PPA Logs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn(
                "rounded-xl px-4 py-1.5 text-xs font-bold transition-all",
                activeTab === "history"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              Recent Activity
            </button>
          </div>

          {/* Tab 1: City-Led Activities */}
          {activeTab === "activities" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Available & Participated Activities</h3>
              {ypopCityActivities.length === 0 ? (
                <Card className="p-8 text-center rounded-2xl border border-border/60 text-xs text-muted-foreground">
                  No city-led YPOP activities currently listed for this validation period.
                </Card>
              ) : (
                ypopCityActivities.map((act) => {
                  const isExpanded = expandedActivityId === act.id;
                  const participation = ypopEventParticipations.find((p) => p.activityId === act.id);

                  return (
                    <Card key={act.id} className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
                      <div
                        onClick={() => setExpandedActivityId(isExpanded ? null : act.id)}
                        className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-primary/5 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Award className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-sm font-bold text-foreground truncate">{act.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {act.date ? formatShortPortalDate(act.date) : "TBA"} • {act.venue || "Pasig City"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {participation ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" /> Attended
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-muted-foreground bg-accent px-2.5 py-0.5 rounded-full">
                              Available
                            </span>
                          )}
                          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                        </div>
                      </div>

                      {/* Collapsible Details */}
                      {isExpanded && (
                        <div className="border-t border-border/60 bg-muted/20 p-4 space-y-3 text-xs">
                          <p className="text-foreground">{act.description || "Official PCYDO youth activity."}</p>
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-muted-foreground font-semibold">Points Weight: {act.points || 10} Points</span>
                            <Button type="button" size="sm" className="h-7 text-xs rounded-lg bg-primary font-semibold">
                              View Event Proof →
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 2: Organization PPA Logs */}
          {activeTab === "ppa" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Organization-Initiated Activities</h3>
                <Button type="button" size="sm" onClick={() => setYpopOrgActivityModalOpen(true)} className="h-7 text-xs rounded-xl gap-1">
                  <Plus className="h-3 w-3" /> Add PPA Activity
                </Button>
              </div>

              <Card className="p-8 text-center rounded-2xl border border-border/60 text-xs text-muted-foreground space-y-3">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="font-bold text-foreground">Log your organization's PPA initiatives</p>
                <p>Submit narrative reports and attendance files for YPOP qualification evaluation.</p>
                <Button type="button" onClick={() => setYpopOrgActivityModalOpen(true)} className="h-8 text-xs font-bold rounded-xl">
                  Log PPA Activity Now
                </Button>
              </Card>
            </div>
          )}

          {/* Tab 3: History Timeline */}
          {activeTab === "history" && (
            <Card className="rounded-2xl border border-border/60 bg-card p-6 space-y-4 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Activity History Timeline</h3>
              <div className="space-y-4 border-l border-border/60 pl-6 relative">
                {ypopEventParticipations.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No YPOP activity history recorded yet.</p>
                ) : (
                  ypopEventParticipations.map((item, idx) => (
                    <div key={item.id || idx} className="space-y-1 relative">
                      <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                      <p className="font-bold text-foreground text-xs">{item.title || "City-Led Event Attended"}</p>
                      <p className="text-[11px] text-muted-foreground">{item.description || "Organized by PCYDO Pasig City"}</p>
                      <span className="text-[10px] text-muted-foreground/70 font-medium">{item.date ? formatShortPortalDate(item.date) : "Recorded"}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column (30% - 4 cols): Intelligent Sticky Sidebar */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6">
          <Card className="rounded-2xl border border-amber-500/30 bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Qualification Status</span>
              {isQualified ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Qualified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  <Clock className="h-3.5 w-3.5" /> In Progress
                </span>
              )}
            </div>

            {/* Score Meter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Overall YPOP Score</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{currentPoints}%</span>
              </div>
              <Progress value={currentPoints} className="h-2.5 bg-muted" />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium pt-0.5">
                <span>Threshold: {threshold}%</span>
                <span>Max: 100%</span>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="bg-accent/40 p-3.5 rounded-xl border border-border/60 space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Score Breakdown</span>
              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground font-medium">City-Led Score:</span>
                <span className="font-bold text-foreground">{activeEntry?.cityLedPoints ?? currentPoints}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Organization Bonus:</span>
                <span className="font-bold text-foreground">{activeEntry?.orgBonusPoints ?? 0}%</span>
              </div>
            </div>

            {/* Project Grant CTA */}
            <div className="border-t border-border/60 pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-semibold">Project Grant (PPA):</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Eligible</span>
              </div>
              <Button
                type="button"
                onClick={() => navigate(userRouteMap["budget-request"] || "/financial-grant")}
                className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-2xs gap-1.5"
              >
                Submit Budget Request →
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
    </FeatureGate>
  );
};
