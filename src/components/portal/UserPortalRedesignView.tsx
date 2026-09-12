import React, { useState, useEffect, useMemo } from "react";
import {
  User,
  FileText,
  ClipboardList,
  CalendarDays,
  CheckCircle2,
  Send,
  ChevronRight,
  Clock,
  Check,
  AlertTriangle,
  BadgeCheck,
  Sparkles,
  Newspaper,
  HelpCircle,
  FolderArchive,
  History,
  X,
  RefreshCw,
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
import { SubmitInquiryModal } from "@/components/portal/SubmitInquiryModal";
import { cn } from "@/lib/utils";
import { formatFullActivityTimestamp } from "@/components/activity/RecentActivityPreview";
import { useRenewalClock } from "@/hooks/use-renewal-clock";
import type { UserFacingRenewalState } from "@/lib/organization-renewal";

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
  renewalCountdown?: {
    expiresAt: string;
    daysRemaining?: number;
    isDue?: boolean;
  } | null;
  renewalState?: UserFacingRenewalState | null;
  onStartRenewal?: () => void;
  onContinueRenewal?: () => void;
  startingRenewal?: boolean;
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
  handleSendInquiry: (e: React.FormEvent) => void | Promise<void>;
  onViewAllInquiries: () => void;
  onViewAllActivities?: () => void;
  navigate: (path: string) => void;
  userRouteMap: Record<string, string>;
}

// Compact Authoritative Renewal Countdown Indicator
// Consumes the Admin-side source of truth (useRenewalClock) and threshold rules
export const RenewalCountdownChip: React.FC<{
  expiresAt: string;
  className?: string;
  renewalState?: UserFacingRenewalState | null;
}> = ({
  expiresAt,
  className,
  renewalState,
}) => {
  const clock = useRenewalClock(expiresAt);

  const dueDateStr = useMemo(() => {
    const d = new Date(expiresAt);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
  }, [expiresAt]);

  // Admin threshold semantics (YorpRegistry EXPIRING_SOON_WINDOW_DAYS = 90)
  const isDueOrExpired = clock.isDue || clock.days <= 0;
  const isExpiringSoon = clock.days <= 90;

  // Authoritative label and tone derivation
  let label: string;
  let tone: "danger" | "warning" | "info" | "neutral" = "neutral";

  if (renewalState?.key === "renewal_draft") {
    label = "Renewal draft in progress";
    tone = "warning";
  } else if (renewalState?.key === "renewal_needs_revision") {
    label = "Renewal action required";
    tone = "danger";
  } else if (renewalState?.key === "renewal_submitted" || renewalState?.key === "renewal_resubmitted") {
    label = "Renewal submitted (Pending Review)";
    tone = "info";
  } else if (renewalState?.key === "renewal_under_review") {
    label = "Renewal under review";
    tone = "info";
  } else if (renewalState?.key === "renewal_rejected") {
    label = "Renewal not approved";
    tone = "danger";
  } else if (isDueOrExpired) {
    label = renewalState?.key === "expired_within_renewal_window"
      ? "Accreditation expired (Renewal open)"
      : renewalState?.key === "expired_beyond_renewal_window"
        ? "Accreditation expired"
        : "Renewal due today";
    tone = "danger";
  } else if (clock.days === 1) {
    label = "Renewal in 1 day";
    tone = "warning";
  } else if (isExpiringSoon) {
    label = `Renewal in ${clock.days} days`;
    tone = "warning";
  } else {
    label = `Renewal in ${clock.days} days`;
    tone = "neutral";
  }

  return (
    <div
      title={dueDateStr ? `Accreditation valid until ${dueDateStr}` : undefined}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors duration-150 shadow-2xs",
        tone === "danger"
          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
          : tone === "warning"
            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            : tone === "info"
              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
              : "bg-muted/40 text-foreground border-border/50",
        className
      )}
    >
      {tone === "danger" ? (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
      ) : tone === "warning" ? (
        <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
      ) : tone === "info" ? (
        <FileText className="h-3.5 w-3.5 shrink-0 text-sky-500" />
      ) : (
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />
      )}
      <span>{label}</span>
    </div>
  );
};

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

// Shared style for Overview metric numbers: refined font-weight 700 (font-bold)
const OVERVIEW_METRIC_VALUE_CLASS =
  "text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-none py-1 tabular-nums";

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
  renewalState,
  onStartRenewal,
  onContinueRenewal,
  startingRenewal = false,
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
}) => {
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);

  // Formatting date ("Sun, Sep 6")
  const todayDateStr = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const orgDisplayName =
    profile?.organizationName ||
    currentProfile?.organizationName ||
    "Organization User";

  const onInquiryFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await handleSendInquiry(e);
      setInquiryModalOpen(false);
    } catch {
      // Keep modal open if an error occurs so the user doesn't lose their input
    }
  };

  // Determine active task or focus
  const activeTask = dashboardTasks.length > 0 ? dashboardTasks[0] : null;

  return (
    <div className="bg-background text-foreground transition-colors duration-200 font-sans space-y-6 sm:space-y-8 max-w-[1440px] mx-auto py-2">

      {/* ========================================================================= */}
      {/* 1. SITUATION BANNER: Who am I & What is my current status?                 */}
      {/* ========================================================================= */}
      <div className="bg-card border border-border/70 rounded-2xl p-5 sm:p-7 shadow-xs relative overflow-hidden transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-5">
          {/* Left: Warm, respectful civic greeting & standing */}
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <span>{todayDateStr}</span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-muted-foreground font-normal">Pasig City Y-TRACE</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-tight">
                Hello, <span className="text-primary">{orgDisplayName}</span> 👋
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0",
                  isVerified
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-primary/10 text-primary border-primary/20"
                )}
              >
                {isVerified ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    Verified Organization
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3 shrink-0" />
                    Compliance in Progress ({Math.round((stepsCompleted / 3) * 100)}%)
                  </>
                )}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isVerified
                ? "Your organization is verified and in good standing for city grants, youth initiatives, and program authorizations."
                : "Welcome back. Complete your pending compliance verification to unlock budget requests and grant access."}
            </p>
          </div>

          {/* Right: Operational telemetry (Renewal Countdown) */}
          {(renewalCountdown?.expiresAt || renewalState?.expiresAt) && (
            <div className="w-full lg:w-auto flex items-center justify-center lg:justify-end lg:flex-col lg:items-end gap-2 text-xs text-muted-foreground font-medium shrink-0 pt-1 lg:pt-0">
              <RenewalCountdownChip
                expiresAt={renewalCountdown?.expiresAt || renewalState?.expiresAt || ""}
                renewalState={renewalState}
              />
              {!activeTask?.key?.startsWith("renewal-") && renewalState?.canStartRenewal && onStartRenewal && (
                <Button
                  size="sm"
                  type="button"
                  onClick={onStartRenewal}
                  disabled={startingRenewal}
                  className="h-8 text-xs font-bold px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition-all cursor-pointer shrink-0"
                >
                  {startingRenewal ? "Starting..." : "Start Renewal →"}
                </Button>
              )}
              {!activeTask?.key?.startsWith("renewal-") && renewalState?.canContinueRenewal && onContinueRenewal && (
                <Button
                  size="sm"
                  type="button"
                  onClick={onContinueRenewal}
                  className="h-8 text-xs font-bold px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition-all cursor-pointer shrink-0"
                >
                  Continue Renewal →
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1B. COMPLIANCE ONBOARDING STEPPER (Rendered ONLY when !isVerified)         */}
      {/* ========================================================================= */}
      {!isVerified && (
        <Card className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Compliance Verification Workflow
              </h3>
              <p className="text-xs text-muted-foreground/80 mt-0.5">
                Complete the remaining requirements to qualify for budget requests.
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {stepsCompleted} of 3 completed ({Math.round((stepsCompleted / 3) * 100)}%)
            </span>
          </div>

          {/* Connected Step Pipeline Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Step 1 */}
            <div
              onClick={() => navigate(userRouteMap["organization-profile"])}
              className={cn(
                "p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group hover:-translate-y-0.5 shadow-2xs",
                isProfileSaved
                  ? "bg-accent/30 border-border/60"
                  : "bg-card border-primary/40 hover:border-primary"
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
                  <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">1. Profile Details</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{isProfileSaved ? "Completed ✓" : "Action Required"}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </div>

            {/* Step 2 */}
            <div
              onClick={() => navigate(userRouteMap["document-submission"])}
              className={cn(
                "p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group hover:-translate-y-0.5 shadow-2xs",
                hasSubmittedDocuments
                  ? "bg-accent/30 border-border/60"
                  : "bg-card border-primary/40 hover:border-primary"
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
            <div className="p-3.5 rounded-xl border bg-accent/20 border-border/40 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-foreground">3. Admin Validation</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Pending Review</p>
                </div>
              </div>
            </div>
          </div>

          <Progress value={(stepsCompleted / 3) * 100} className="h-1.5 bg-muted" />
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 2. COMMAND ACTION: What do I need to do next? (PRIMARY FOCUS)             */}
      {/* ========================================================================= */}
      <div className="relative rounded-2xl border-2 border-primary/35 bg-gradient-to-br from-card via-card to-primary/5 dark:to-primary/10 p-5 sm:p-6 shadow-sm overflow-hidden transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                Current Focus • Action Required
              </span>
            </div>

            {activeTask ? (
              <div className="space-y-1.5">
                <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight leading-snug">
                  {activeTask.title}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  {activeTask.description}
                </p>

                {/* Workflow Progress Indicator if active */}
                <div className="pt-2 max-w-md space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                    <span>Workflow Completion</span>
                    <span className="text-foreground font-bold">
                      {stepsCompleted >= 3 ? "100%" : `${Math.round((stepsCompleted / 3) * 100)}%`}
                    </span>
                  </div>
                  <Progress
                    value={stepsCompleted >= 3 ? 100 : Math.round((stepsCompleted / 3) * 100)}
                    className="h-1.5 bg-muted"
                  />
                </div>
              </div>
            ) : isVerified ? (
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight leading-snug flex items-center gap-1.5">
                  <span>🎉</span> All Compliance Up to Date
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  Your organization has no pending compliance or liquidation tasks. You are ready to create and submit new budget requests for upcoming youth activities.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight leading-snug">
                  Complete Organization Setup
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  Finish your organization profile and upload your official compliance documents to start the verification process.
                </p>
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <div className="shrink-0 self-start md:self-center w-full md:w-auto">
            {activeTask?.ctaLabel ? (
              <Button
                type="button"
                onClick={activeTask.onClick}
                size="lg"
                className="w-full md:w-auto h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm shadow-sm hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer justify-center"
              >
                {activeTask.ctaLabel} →
              </Button>
            ) : isVerified ? (
              <Button
                type="button"
                onClick={() => navigate(userRouteMap["budget-request"])}
                size="lg"
                className="w-full md:w-auto h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm shadow-sm hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer justify-center"
              >
                Create Budget Request →
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => navigate(userRouteMap["organization-profile"])}
                size="lg"
                className="w-full md:w-auto h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm shadow-sm hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer justify-center"
              >
                Start Setup →
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ORGANIZATIONAL HEALTH & METRICS: What should I know?                   */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Overview
            </h2>
            <p className="text-xs text-muted-foreground">
              Live computed health and status across all organization workflows.
            </p>
          </div>

          {/* Secondary Activity History Affordance in Overview Header */}
          <button
            type="button"
            aria-label="View activity history"
            onClick={() => {
              if (onViewAllActivities) {
                onViewAllActivities();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer px-2.5 py-1.5 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border/50"
          >
            <History className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Activity History</span>
            <span className="sm:hidden">History</span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Profile Metric Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(userRouteMap["organization-profile"])}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(userRouteMap["organization-profile"]);
              }
            }}
            className="bg-card border border-border/60 p-4 rounded-2xl shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 transition-all duration-150 ease-out cursor-pointer space-y-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                Profile
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                  isVerified
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    : "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
                )}
              >
                {isVerified ? "✓ Verified" : isProfileSaved ? "In Progress" : "Incomplete"}
              </span>
            </div>
            <p className={OVERVIEW_METRIC_VALUE_CLASS}>
              {profilePercent}%
            </p>
            <p className="text-[11px] text-muted-foreground truncate border-t border-border/40 pt-2">
              {isVerified ? "Verified organization" : "Profile update in progress"}
            </p>
          </div>

          {/* 2. Documents Metric Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(userRouteMap["document-submission"])}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(userRouteMap["document-submission"]);
              }
            }}
            className="bg-card border border-border/60 p-4 rounded-2xl shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 transition-all duration-150 ease-out cursor-pointer space-y-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                Documents
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                  dashboardDocumentPercent >= 100
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    : "text-primary bg-primary/10 border-primary/20"
                )}
              >
                {dashboardDocumentPercent >= 100 ? "✓ Approved" : "In Review"}
              </span>
            </div>
            <p className={OVERVIEW_METRIC_VALUE_CLASS}>
              {dashboardDocumentPercent}%
            </p>
            <p className="text-[11px] text-muted-foreground truncate border-t border-border/40 pt-2">
              {dashboardDocumentHelper}
            </p>
          </div>

          {/* 3. Budget Metric Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(userRouteMap["budget-request"])}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(userRouteMap["budget-request"]);
              }
            }}
            className="bg-card border border-border/60 p-4 rounded-2xl shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 transition-all duration-150 ease-out cursor-pointer space-y-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                Budget
              </span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                {budgetOverviewLabel}
              </span>
            </div>
            <p className={OVERVIEW_METRIC_VALUE_CLASS}>
              {budgetPercent}%
            </p>
            <p className="text-[11px] text-muted-foreground truncate border-t border-border/40 pt-2">
              {budgetOverviewLabel}
            </p>
          </div>

          {/* 4. Liquidation Metric Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(userRouteMap["liquidation-reporting"])}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(userRouteMap["liquidation-reporting"]);
              }
            }}
            className="bg-card border border-border/60 p-4 rounded-2xl shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 transition-all duration-150 ease-out cursor-pointer space-y-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                Liquidation
              </span>
              <span className="text-[10px] font-bold text-muted-foreground bg-accent px-2 py-0.5 rounded-full border border-border/60 shrink-0">
                {liquidationOverviewLabel}
              </span>
            </div>
            <p className={OVERVIEW_METRIC_VALUE_CLASS}>
              {liquidationPercent}%
            </p>
            <p className="text-[11px] text-muted-foreground truncate border-t border-border/40 pt-2">
              {liquidationOverviewLabel}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SUPPORT & RESOURCES: Where can I get help or access official tools?     */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Support & Resources
            </h2>
            <p className="text-xs text-muted-foreground">
              Official PCYDO communication channel, templates, bulletins, and programs.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
          {/* Support & Inquiries Card (Left: 7 columns on Desktop) */}
          <Card className="lg:col-span-7 h-full rounded-2xl border border-border/60 bg-card p-4 sm:p-5 flex flex-col justify-between shadow-xs">
            <div className="space-y-2.5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-2.5">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground">
                    Support & Inquiries
                  </h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                    Direct inquiries to PCYDO administrative staff.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => setInquiryModalOpen(true)}
                  className="h-9 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs sm:text-sm shadow-xs hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 justify-center self-start sm:self-auto"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>New Inquiry</span>
                </Button>
              </div>

              {/* Subheader: Count and View All */}
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-xs font-bold text-foreground">
                  Submitted Inquiries ({inquiries.length})
                </span>
                {inquiries.length > 0 && (
                  <button
                    type="button"
                    onClick={onViewAllInquiries}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    View all inquiries →
                  </button>
                )}
              </div>

              {/* Inquiries Content: Populated vs Empty State */}
              {inquiries && inquiries.length > 0 ? (
                <div className="space-y-1.5 max-h-[148px] overflow-y-auto pr-0.5">
                  {inquiries.slice(0, 3).map((inq) => {
                    const inquiryCodeDisplay =
                      inq.inquiryCode ||
                      `INQ-2026-${(inq.id || "001").slice(-4).toUpperCase()}`;
                    const readableStatus = formatInquiryStatusLabel(inq.status);

                    return (
                      <div
                        key={inq.id}
                        onClick={onViewAllInquiries}
                        className="px-3 py-2 rounded-xl border border-border/60 bg-accent/20 hover:bg-accent/40 transition-colors cursor-pointer flex items-center justify-between gap-3 shadow-2xs group"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] font-mono font-bold text-primary shrink-0">
                              {inquiryCodeDisplay}
                            </span>
                            <span className="text-muted-foreground/40 text-xs shrink-0">•</span>
                            <p
                              className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate"
                              title={inq.subject}
                            >
                              {inq.subject || "General Inquiry"}
                            </p>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {formatFullActivityTimestamp(inq.createdAt)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                            readableStatus === "Resolved"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : readableStatus === "In Progress"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-primary/10 text-primary border-primary/20"
                          )}
                        >
                          {readableStatus}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 bg-accent/10 p-3.5 sm:p-4 flex items-center gap-3.5 my-auto">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-foreground">
                      No submitted inquiries
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Need assistance with compliance requirements, budget requests, or registration? Submit an inquiry directly to the PCYDO team.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setInquiryModalOpen(true)}
                    className="rounded-xl text-xs font-semibold h-8 px-3 shrink-0 border-border hover:bg-accent cursor-pointer hidden sm:inline-flex"
                  >
                    Ask PCYDO
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Official Resources & Shortcuts (Right: 5 columns on Desktop) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-2.5 sm:space-y-3">
            {/* 1. Official Templates */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate(userRouteMap["templates"])}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(userRouteMap["templates"]);
                }
              }}
              className="p-3.5 sm:p-4 rounded-2xl border border-border/60 bg-card hover:bg-accent/30 hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer shadow-xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center justify-between gap-3.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-muted text-primary shrink-0 group-hover:scale-105 transition-transform">
                  <FolderArchive className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    Official Templates
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-snug truncate">
                    Download official registration forms, by-laws, and compliance documents.
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>

            {/* 2. News & Bulletins */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate(userRouteMap["news-releases"])}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(userRouteMap["news-releases"]);
                }
              }}
              className="p-3.5 sm:p-4 rounded-2xl border border-border/60 bg-card hover:bg-accent/30 hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer shadow-xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center justify-between gap-3.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-muted text-primary shrink-0 group-hover:scale-105 transition-transform">
                  <Newspaper className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    News & Official Releases
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-snug truncate">
                    PCYDO announcements, registration schedules, and official notices.
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>

            {/* 3. Youth Programs & Incentives (YPOP) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate(userRouteMap["ypop-scoring"] || userRouteMap["compliance-overview"] || "/ypop")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(userRouteMap["ypop-scoring"] || userRouteMap["compliance-overview"] || "/ypop");
                }
              }}
              className="p-3.5 sm:p-4 rounded-2xl border border-border/60 bg-card hover:bg-accent/30 hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer shadow-xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center justify-between gap-3.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-muted text-primary shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    Youth Programs & Incentives
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-snug truncate">
                    Check YPOP points standing, joined activities, and program qualification.
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. INQUIRY CREATION MODAL DIALOG                                          */}
      {/* ========================================================================= */}
      <SubmitInquiryModal
        open={inquiryModalOpen}
        onOpenChange={setInquiryModalOpen}
        inquiryForm={inquiryForm}
        setInquiryForm={setInquiryForm}
        submittingInquiry={submittingInquiry}
        onSubmit={onInquiryFormSubmit}
      />
    </div>
  );
};
