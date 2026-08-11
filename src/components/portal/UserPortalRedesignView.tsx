import React, { useState } from "react";
import {
  User,
  FileText,
  ClipboardList,
  CalendarDays,
  CheckCircle2,
  Building2,
  Sparkles,
  Send,
  ChevronRight,
  Sun,
  Moon,
  LayoutGrid,
  Clock,
  Download,
  MessageSquare,
  Check,
  ArrowRight,
  FileSpreadsheet,
  FileCode,
  AlertTriangle,
  HelpCircle,
  BadgeCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatActivityActionLabel, formatFullActivityTimestamp } from "@/components/activity/RecentActivityPreview";
import { getTemplateFileFormat } from "./UserPortalTemplatesWorkspaceView";

export interface UserPortalRedesignViewProps {
  profile: any;
  currentProfile: any;
  isVerified: boolean;
  isProfileSaved: boolean;
  hasSubmittedDocuments: boolean;
  stepsCompleted: number;
  profilePercent: number;
  dashboardDocumentPercent: number;
  dashboardDocumentHelper: string;
  budgetPercent: number;
  budgetOverviewLabel: string;
  liquidationPercent: number;
  liquidationOverviewLabel: string;
  renewalCountdown?: { expiresAt: string } | null;
  dashboardTasks: Array<{
    key: string;
    title: string;
    description: string;
    ctaLabel?: string;
    onClick?: () => void;
    icon: any;
    tone: string;
  }>;
  recentActivities?: Array<{
    id: string;
    description: string;
    createdAt: string;
  }>;
  inquiries?: Array<{
    id: string;
    inquiryCode?: string;
    subject?: string;
    description?: string;
    status?: string;
    createdAt: string;
  }>;
  publicTemplates?: Array<any>;
  openPreview?: (fileUrl: string, fileName: string) => void;
  inquiryForm: {
    submitterName: string;
    organizationName?: string;
    email: string;
    subject: string;
    description: string;
  };
  setInquiryForm: React.Dispatch<
    React.SetStateAction<{
      submitterName: string;
      organizationName: string;
      email: string;
      subject: string;
      description: string;
    }>
  >;
  submittingInquiry?: boolean;
  handleSendInquiry: (e: React.FormEvent) => void;
  onViewAllInquiries: () => void;
  onViewAllActivities?: () => void;
  navigate: (path: string) => void;
  userRouteMap: Record<string, string>;
  onSwitchToClassic: () => void;
}

// Human Readable Inquiry Status Formatter
const formatInquiryStatusLabel = (status?: string): string => {
  if (!status) return "Pending";
  const s = status.toLowerCase();
  if (s === "pending_review" || s === "pending") return "Pending";
  if (s === "in_progress" || s === "under_review") return "In Progress";
  if (s === "resolved" || s === "answered" || s === "completed") return "Resolved";
  if (s === "needs_revision") return "Needs Revision";
  return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

export const UserPortalRedesignView: React.FC<UserPortalRedesignViewProps> = ({
  profile,
  currentProfile,
  isVerified,
  isProfileSaved,
  hasSubmittedDocuments,
  stepsCompleted,
  profilePercent,
  dashboardDocumentPercent,
  dashboardDocumentHelper,
  budgetPercent,
  budgetOverviewLabel,
  liquidationPercent,
  liquidationOverviewLabel,
  renewalCountdown,
  dashboardTasks,
  recentActivities = [],
  inquiries = [],
  publicTemplates = [],
  openPreview,
  inquiryForm,
  setInquiryForm,
  submittingInquiry = false,
  handleSendInquiry,
  onViewAllInquiries,
  onViewAllActivities,
  navigate,
  userRouteMap,
  onSwitchToClassic,
}) => {
  const [aiQuickModalOpen, setAiQuickModalOpen] = useState(false);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);

  // Formatting date ("Mon, Aug 6")
  const todayDateStr = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const orgDisplayName =
    profile?.organizationName ||
    currentProfile?.organizationName ||
    "Organization User";

  const onInquiryFormSubmit = (e: React.FormEvent) => {
    handleSendInquiry(e);
    setInquiryModalOpen(false);
  };

  // Determine active task or focus
  const activeTask = dashboardTasks.length > 0 ? dashboardTasks[0] : null;

  // Derive top 3 templates dynamically from backend
  const displayTemplates = publicTemplates.slice(0, 3);

  return (
    <div className="bg-background text-foreground transition-colors duration-200 font-sans space-y-10 max-w-[1440px] mx-auto py-2">
      {/* Hero Section: Perfectly Balanced Left/Right with Ultra-Soft Ambient Gradient */}
      <div className="bg-gradient-to-r from-white via-indigo-50/30 to-blue-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-6 sm:p-8 rounded-2xl border border-slate-200/90 dark:border-border/60 shadow-xs sm:shadow-sm dark:shadow-xs space-y-6 relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left Side (7 Cols): Greeting & Subtitle */}
          <div className="md:col-span-7 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {todayDateStr}
            </p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Hello, <span className="text-primary">{orgDisplayName}</span> 👋
            </h1>
            <p className="text-sm text-muted-foreground/90 max-w-xl leading-relaxed">
              {isVerified
                ? "Welcome back. Your organization is verified and fully operational."
                : `Welcome back. Your compliance review is currently in progress.`}
            </p>
          </div>

          {/* Right Side (5 Cols): Balanced Contextual Information */}
          <div className="md:col-span-5 flex flex-col items-start md:items-end justify-center space-y-3 bg-white/80 dark:bg-card/70 border border-slate-200/80 dark:border-border/60 p-4 rounded-xl backdrop-blur-xs shadow-2xs">
            <div className="flex items-center justify-between w-full text-xs">
              <span className="text-muted-foreground font-medium">Organization Status</span>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                  isVerified
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                )}
              >
                {isVerified ? "Verified Org" : `${Math.round((stepsCompleted / 3) * 100)}% Complete`}
              </span>
            </div>

            <div className="flex items-center justify-between w-full text-xs border-t border-slate-200/60 dark:border-border/40 pt-2">
              <span className="text-muted-foreground">Verification Queue</span>
              <span className="font-semibold text-foreground">
                {isVerified ? "Unlocked ✓" : "2–3 Business Days"}
              </span>
            </div>

            <div className="flex items-center justify-between w-full text-[11px] text-muted-foreground border-t border-slate-200/60 dark:border-border/40 pt-2">
              <span>Last Login</span>
              <span className="font-medium text-foreground">Today • 8:31 AM</span>
            </div>
          </div>
        </div>

        {/* Quick Access Floating Pill Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-200/80 dark:border-border/40">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Quick Access:</span>
          <Button
            type="button"
            onClick={() => setAiQuickModalOpen(true)}
            className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs gap-1.5 h-8 px-3.5 text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ask AI Assistant
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(userRouteMap["document-submission"])}
            className="rounded-full bg-card border-border/80 hover:bg-accent text-foreground shadow-2xs h-8 px-3 text-xs font-medium hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            Submit Docs
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(userRouteMap["budget-request"])}
            className="rounded-full bg-card border-border/80 hover:bg-accent text-foreground shadow-2xs h-8 px-3 text-xs font-medium hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            Budget Request
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(userRouteMap["templates"])}
            className="rounded-full bg-card border-border/80 hover:bg-accent text-foreground shadow-2xs h-8 px-3 text-xs font-medium hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            Templates
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setInquiryModalOpen(true)}
            className="rounded-full bg-card border-border/80 hover:bg-accent text-foreground shadow-2xs h-8 px-3 text-xs font-medium hover:scale-[1.02] active:scale-[0.98] transition-all sm:ml-auto cursor-pointer"
          >
            Create Inquiry
          </Button>
        </div>
      </div>

      {/* Compliance Onboarding Stepper with Visually Connected Pipeline (✓ ─── ✓ ─── ○) */}
      {!isVerified && (
        <Card className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Compliance Workflow
              </h3>
              <p className="text-xs text-muted-foreground/80 mt-0.5">
                Complete all 3 steps to unlock budget requests.
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {stepsCompleted} of 3 completed ({Math.round((stepsCompleted / 3) * 100)}%)
            </span>
          </div>

          {/* Connected Step Pipeline Grid */}
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div
              onClick={() => navigate(userRouteMap["organization-profile"])}
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between relative group hover:-translate-y-0.5 shadow-2xs",
                isProfileSaved
                  ? "bg-accent/30 border-border/60"
                  : "bg-card border-primary/30 hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  isProfileSaved ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-primary/20 text-primary"
                )}>
                  {isProfileSaved ? <Check className="h-4 w-4" /> : "1"}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">1. Complete Profile</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{isProfileSaved ? "Completed ✓" : "Action Required"}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </div>

            {/* Step 2 */}
            <div
              onClick={() => navigate(userRouteMap["document-submission"])}
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between relative group hover:-translate-y-0.5 shadow-2xs",
                hasSubmittedDocuments
                  ? "bg-accent/30 border-border/60"
                  : "bg-card border-primary/30 hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  hasSubmittedDocuments ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-primary/20 text-primary"
                )}>
                  {hasSubmittedDocuments ? <Check className="h-4 w-4" /> : "2"}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">2. Upload Documents</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{hasSubmittedDocuments ? "Submitted ✓" : "Action Required"}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-xl border bg-accent/20 border-border/40 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-foreground">3. Admin Verification</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Pending Review</p>
                </div>
              </div>
            </div>
          </div>

          <Progress value={(stepsCompleted / 3) * 100} className="h-1.5 bg-muted" />
        </Card>
      )}

      {/* Main 12-Column Responsive CSS Grid */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Column (8 Columns Desktop) */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Overview Metrics Section (Authentic Computed Backend Metrics) */}
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">
                Overview
              </h2>
              <p className="text-[13px] text-muted-foreground/70 font-normal">
                Live computed summary of your organization compliance & requests.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {/* Profile Metric Card */}
              <div
                onClick={() => navigate(userRouteMap["organization-profile"])}
                className="bg-card border border-border/60 p-4 rounded-2xl shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Profile</p>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      isVerified
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
                    )}
                  >
                    {isVerified ? "✓ Verified" : isProfileSaved ? "In Progress" : "Incomplete"}
                  </span>
                </div>
                <p className="text-4xl sm:text-[42px] font-black text-foreground tracking-tight leading-none py-1">
                  {profilePercent}%
                </p>
                <p className="text-[11px] text-muted-foreground truncate border-t border-border/40 pt-2">
                  {isVerified ? "Verified organization" : "Profile update in progress"}
                </p>
              </div>

              {/* Documents Metric Card */}
              <div
                onClick={() => navigate(userRouteMap["document-submission"])}
                className="bg-card border border-border/60 p-4 rounded-2xl shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Documents</p>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      dashboardDocumentPercent >= 100
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
                    )}
                  >
                    {dashboardDocumentPercent >= 100 ? "✓ Approved" : "In Review"}
                  </span>
                </div>
                <p className="text-4xl sm:text-[42px] font-black text-foreground tracking-tight leading-none py-1">
                  {dashboardDocumentPercent}%
                </p>
                <p className="text-[11px] text-muted-foreground truncate border-t border-border/40 pt-2">
                  {dashboardDocumentHelper}
                </p>
              </div>

              {/* Budget Metric Card */}
              <div
                onClick={() => navigate(userRouteMap["budget-request"])}
                className="bg-card border border-border/60 p-4 rounded-2xl shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Budget</p>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {budgetOverviewLabel}
                  </span>
                </div>
                <p className="text-4xl sm:text-[42px] font-black text-foreground tracking-tight leading-none py-1">
                  {budgetPercent}%
                </p>
                <p className="text-[11px] text-muted-foreground truncate border-t border-border/40 pt-2">
                  {budgetOverviewLabel}
                </p>
              </div>

              {/* Liquidation Metric Card */}
              <div
                onClick={() => navigate(userRouteMap["liquidation-reporting"])}
                className="bg-card border border-border/60 p-4 rounded-2xl shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Liquidation</p>
                  <span className="text-[10px] font-bold text-muted-foreground bg-accent px-2 py-0.5 rounded-full border border-border/60">
                    {liquidationOverviewLabel}
                  </span>
                </div>
                <p className="text-4xl sm:text-[42px] font-black text-foreground tracking-tight leading-none py-1">
                  {liquidationPercent}%
                </p>
                <p className="text-[11px] text-muted-foreground truncate border-t border-border/40 pt-2">
                  {liquidationOverviewLabel}
                </p>
              </div>
            </div>
          </div>

          {/* DYNAMIC WORKSPACE SECTION */}
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">
                Workspace
              </h2>
              <p className="text-[13px] text-muted-foreground/70 font-normal">
                Dynamic tasks, workflow status, and shortcuts.
              </p>
            </div>

            <Card className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* 1. CURRENT FOCUS (DOMINATES: 6 Columns Desktop) */}
                <div className="md:col-span-6 p-4 rounded-xl bg-accent/20 border border-border/40 flex flex-col justify-between space-y-3 shadow-2xs hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      Current Focus
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-background font-semibold">
                      {activeTask ? "Active Action" : isVerified ? "All Clear" : "Setup"}
                    </Badge>
                  </div>

                  {activeTask ? (
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm text-foreground leading-snug">
                        {activeTask.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {activeTask.description}
                      </p>
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px] text-muted-foreground font-semibold">
                          <span>Workflow Completion</span>
                          <span>{stepsCompleted >= 3 ? "100%" : `${Math.round((stepsCompleted / 3) * 100)}%`}</span>
                        </div>
                        <Progress value={stepsCompleted >= 3 ? 100 : Math.round((stepsCompleted / 3) * 100)} className="h-1.5 bg-muted" />
                      </div>
                    </div>
                  ) : isVerified ? (
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-foreground leading-snug flex items-center gap-1">
                        🎉 Organization Fully Verified!
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        No pending compliance tasks. You can submit budget requests for upcoming organization activities.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-foreground leading-snug">
                        🚀 Complete Registration Checklist
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Finish your organization profile & upload required compliance files.
                      </p>
                    </div>
                  )}

                  {activeTask?.ctaLabel ? (
                    <Button
                      type="button"
                      onClick={activeTask.onClick}
                      size="sm"
                      className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-8 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      {activeTask.ctaLabel} →
                    </Button>
                  ) : isVerified ? (
                    <Button
                      type="button"
                      onClick={() => navigate(userRouteMap["budget-request"])}
                      size="sm"
                      className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-8 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Create Budget Request →
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => navigate(userRouteMap["organization-profile"])}
                      size="sm"
                      className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-8 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Start Setup →
                    </Button>
                  )}
                </div>

                {/* 2. WAITING ON (3 Columns Desktop) */}
                <div className="md:col-span-3 p-4 rounded-xl bg-accent/20 border border-border/40 flex flex-col justify-between space-y-3 shadow-2xs hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Waiting On
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-background font-semibold">
                      Queue
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-xs text-foreground">
                      {!isVerified && hasSubmittedDocuments
                        ? "Awaiting Admin Review"
                        : isVerified
                        ? "Ready for Requests"
                        : "Profile Submission"}
                    </h4>
                    <div className="pt-2">
                      <p className="text-2xl font-black tracking-tight text-foreground">
                        {!isVerified && hasSubmittedDocuments ? "2–3 Days" : isVerified ? "Unlocked ✓" : "Action Needed"}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        Review Queue Timeframe
                      </p>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground font-medium pt-1 border-t border-border/40 flex justify-between">
                    <span>Queue Status</span>
                    <span className="font-semibold text-foreground">
                      {!isVerified && hasSubmittedDocuments ? "In Queue" : isVerified ? "Active" : "Pending"}
                    </span>
                  </div>
                </div>

                {/* 3. RESOURCES (3 Columns Desktop) */}
                <div className="md:col-span-3 p-4 rounded-xl bg-accent/20 border border-border/40 flex flex-col justify-between space-y-3 shadow-2xs hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Resources
                    </span>
                  </div>

                  <div className="space-y-1 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => navigate(userRouteMap["templates"])}
                      className="w-full text-left py-2 px-2 rounded-lg hover:bg-background transition-all flex items-center justify-between text-muted-foreground hover:text-foreground group border-b border-border/30 cursor-pointer"
                    >
                      <span className="group-hover:translate-x-0.5 transition-transform text-xs font-medium">Templates</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(userRouteMap["news-releases"])}
                      className="w-full text-left py-2 px-2 rounded-lg hover:bg-background transition-all flex items-center justify-between text-muted-foreground hover:text-foreground group border-b border-border/30 cursor-pointer"
                    >
                      <span className="group-hover:translate-x-0.5 transition-transform text-xs font-medium">News & Grants</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setInquiryModalOpen(true)}
                      className="w-full text-left py-2 px-2 rounded-lg hover:bg-background transition-all flex items-center justify-between text-muted-foreground hover:text-foreground group cursor-pointer"
                    >
                      <span className="group-hover:translate-x-0.5 transition-transform text-xs font-medium">Support Inquiry</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate(userRouteMap["templates"])}
                    size="sm"
                    className="w-full text-xs font-semibold h-7 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Explore Resources →
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* RECENT ACTIVITY (Lightweight Timeline Feed matching Document Submission Page) */}
          <div className="space-y-3">
            <Card className="rounded-2xl border border-border/60 bg-card p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
                  <p className="text-xs text-muted-foreground pt-0.5">Authentic activity timeline recorded for your organization.</p>
                </div>
                <button
                  type="button"
                  onClick={onViewAllActivities || (() => navigate(userRouteMap["organization-profile"]))}
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  View all →
                </button>
              </div>

              <div className="space-y-4 border-l border-border/60 pl-6 relative">
                {recentActivities && recentActivities.length > 0 ? (
                  recentActivities.slice(0, 5).map((act, idx) => {
                    const actionTitle = formatActivityActionLabel(act.description);
                    const fullTime = formatFullActivityTimestamp(act.createdAt);
                    const isApproved = actionTitle.includes("Approved") || actionTitle.includes("Verified") || actionTitle.includes("Completed");
                    const isRevision = actionTitle.includes("Revision") || actionTitle.includes("Rejected") || actionTitle.includes("Flagged");

                    return (
                      <div key={act.id || idx} className="relative space-y-1">
                        <div
                          className={cn(
                            "absolute -left-[31px] top-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                            isApproved
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : isRevision
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                          )}
                        >
                          {isApproved ? (
                            <Check className="h-2.5 w-2.5" />
                          ) : isRevision ? (
                            <AlertTriangle className="h-2.5 w-2.5" />
                          ) : (
                            <Clock className="h-2.5 w-2.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-xs font-semibold text-foreground leading-snug truncate" title={actionTitle}>
                            {actionTitle}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-medium">
                            {fullTime}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground italic py-2">No recent activity recorded.</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Right Column (4 Columns Desktop) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Support & Inquiries Card (Displaying Inquiry Codes & Human-Readable Badges) */}
          <Card className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Support & Inquiries
              </h3>
              <p className="text-xs text-muted-foreground">Send an inquiry directly to the admin.</p>
            </div>

            <Button
              type="button"
              onClick={() => setInquiryModalOpen(true)}
              className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 shadow-xs gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              Create Inquiry
            </Button>

            {/* Submitted Inquiries List */}
            <div className="border-t border-border/40 pt-3 space-y-2">
              <span className="text-xs font-bold text-foreground">
                Submitted Inquiries ({inquiries.length})
              </span>

              {inquiries && inquiries.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {inquiries.slice(0, 4).map((inq) => {
                    const inquiryCodeDisplay = inq.inquiryCode || `INQ-2026-${(inq.id || "001").slice(-4).toUpperCase()}`;
                    const readableStatus = formatInquiryStatusLabel(inq.status);

                    return (
                      <div
                        key={inq.id}
                        className="p-3 rounded-xl border border-border/60 bg-accent/20 space-y-1 shadow-2xs hover:bg-accent/40 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono font-bold text-primary">
                            {inquiryCodeDisplay}
                          </span>
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">
                            {readableStatus}
                          </Badge>
                        </div>
                        <p className="text-xs font-bold text-foreground truncate" title={inq.subject}>
                          {inq.subject || "General Inquiry"}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {formatFullActivityTimestamp(inq.createdAt)}
                        </p>
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onViewAllInquiries}
                    className="w-full rounded-xl text-xs h-8 font-medium text-muted-foreground hover:text-foreground hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    View All History →
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  No submitted inquiries.
                </p>
              )}
            </div>
          </Card>

          {/* Required Templates Card (Renders ONLY 3 Dynamic Templates from Backend) */}
          <Card className="rounded-2xl border border-border/60 bg-card p-5 space-y-3 shadow-xs">
            <h4 className="font-bold text-xs text-foreground">Required Templates</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Official downloadable forms for registration and compliance.
            </p>

            <div className="space-y-1.5 pt-1 text-xs font-medium text-muted-foreground">
              {displayTemplates.length > 0 ? (
                displayTemplates.map((tpl) => {
                  const fileFormat = getTemplateFileFormat(tpl.fileUrl, tpl.title);
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => {
                        if (openPreview) {
                          void openPreview(tpl.fileUrl, tpl.title);
                        } else {
                          navigate(userRouteMap["templates"]);
                        }
                      }}
                      className="flex items-center justify-between p-2 rounded-xl bg-accent/20 border border-border/30 hover:bg-accent/40 transition-colors cursor-pointer group"
                    >
                      <span className="flex items-center gap-2 min-w-0 pr-2">
                        <FileText className="h-4 w-4 text-primary shrink-0 group-hover:scale-105 transition-transform" />
                        <span className="text-xs font-bold text-foreground truncate max-w-[180px]" title={tpl.title}>
                          {tpl.title}
                        </span>
                      </span>
                      <span className="text-[10px] font-mono font-extrabold text-muted-foreground bg-card border border-border/60 px-2 py-0.5 rounded-md shrink-0">
                        {fileFormat}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground py-2 text-center">No templates available.</p>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(userRouteMap["templates"])}
              className="w-full rounded-xl border-border text-foreground text-xs font-semibold h-8 hover:scale-[1.02] active:scale-[0.98] transition-all mt-2 cursor-pointer"
            >
              Browse All Templates →
            </Button>
          </Card>
        </div>
      </div>

      {/* Inquiry Creation Modal Dialog */}
      <Dialog open={inquiryModalOpen} onOpenChange={setInquiryModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Submit Inquiry
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Send your question directly to the admin dashboard.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onInquiryFormSubmit} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                Name / Organization Name <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                value={inquiryForm?.submitterName || ""}
                onChange={(e) =>
                  setInquiryForm((prev) => ({
                    ...prev,
                    submitterName: e.target.value,
                    organizationName: e.target.value,
                  }))
                }
                placeholder="Organization name"
                className="rounded-xl text-xs h-9 bg-background"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                type="email"
                value={inquiryForm?.email || ""}
                onChange={(e) =>
                  setInquiryForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="email@organization.org"
                className="rounded-xl text-xs h-9 bg-background"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                value={inquiryForm?.subject || ""}
                onChange={(e) =>
                  setInquiryForm((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                placeholder="e.g. Question about liquidation requirement"
                className="rounded-xl text-xs h-9 bg-background"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                Message / Details <span className="text-red-500">*</span>
              </Label>
              <Textarea
                required
                rows={4}
                value={inquiryForm?.description || ""}
                onChange={(e) =>
                  setInquiryForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Provide details about your inquiry..."
                className="rounded-xl text-xs bg-background"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInquiryModalOpen(false)}
                className="rounded-xl text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingInquiry}
                className="rounded-xl bg-primary text-primary-foreground font-semibold text-xs h-8"
              >
                {submittingInquiry ? "Sending..." : "Submit Inquiry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
