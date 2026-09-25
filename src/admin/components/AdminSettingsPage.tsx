import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Undo2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/portal/AdminPageHeader";
import { PortalEmptyState } from "@/components/portal/portal-ui";
import {
  type AdminSystemSettingCategory,
  type AdminSystemSettingKey,
  ADMIN_SETTING_CATEGORIES,
  ADMIN_SETTING_DEFINITIONS_BY_KEY,
} from "@/lib/admin-system-settings";
import { useAdminSystemSettings } from "@/hooks/use-admin-system-settings";

const CATEGORY_ICONS: Record<AdminSystemSettingCategory, LucideIcon> = {
  general: Globe,
  notifications: Bell,
  workflow: SlidersHorizontal,
  programs: Sparkles,
  budget_finance: Wallet,
  security: Shield,
  email: Mail,
  audit_records: Activity,
};

interface NotificationEventRow {
  label: string;
  description: string;
  inAppKey: AdminSystemSettingKey;
  emailKey: AdminSystemSettingKey;
}

const NOTIFICATION_EVENT_ROWS: NotificationEventRow[] = [
  {
    label: "New Registration",
    description: "New youth organization accreditation submitted.",
    inAppKey: "notifications.new_registration.in_app",
    emailKey: "notifications.new_registration.email",
  },
  {
    label: "Renewal Application",
    description: "Existing organization annual renewal submitted.",
    inAppKey: "notifications.renewal_submitted.in_app",
    emailKey: "notifications.renewal_submitted.email",
  },
  {
    label: "YPOP Verification Proof",
    description: "Organization submitted YPOP compliance documents.",
    inAppKey: "notifications.ypop_submission.in_app",
    emailKey: "notifications.ypop_submission.email",
  },
  {
    label: "Budget Project Proposal",
    description: "New project proposal / fund allocation submitted.",
    inAppKey: "notifications.budget_request.in_app",
    emailKey: "notifications.budget_request.email",
  },
  {
    label: "Liquidation Report Packet",
    description: "Financial report packet submitted for completed project.",
    inAppKey: "notifications.liquidation_report.in_app",
    emailKey: "notifications.liquidation_report.email",
  },
  {
    label: "Helpdesk Citizen Inquiry",
    description: "New citizen or organization support ticket submitted.",
    inAppKey: "notifications.new_inquiry.in_app",
    emailKey: "notifications.new_inquiry.email",
  },
  {
    label: "Document Resubmission",
    description: "Organization re-uploaded revised compliance files.",
    inAppKey: "notifications.revision_resubmission.in_app",
    emailKey: "notifications.revision_resubmission.email",
  },
  {
    label: "Accreditation Expiring Notice",
    description: "Automated alert when recognized organizations enter renewal window.",
    inAppKey: "notifications.accreditation_expiring.in_app",
    emailKey: "notifications.accreditation_expiring.email",
  },
  {
    label: "Overdue Liquidation Escalation",
    description: "Automated warning when a funded project exceeds liquidation deadline.",
    inAppKey: "notifications.overdue_liquidation.in_app",
    emailKey: "notifications.overdue_liquidation.email",
  },
];

export const AdminSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = (searchParams.get("tab") as AdminSystemSettingCategory) || "general";

  const [activeTab, setActiveTab] = useState<AdminSystemSettingCategory>(
    ADMIN_SETTING_CATEGORIES.some((c) => c.id === initialTab) ? initialTab : "general",
  );
  const [resetConfirmCategory, setResetConfirmCategory] = useState<AdminSystemSettingCategory | null>(null);

  const {
    settings,
    draftSettings,
    dirtyKeys,
    hasChanges,
    validationErrors,
    isLoading,
    isSaving,
    error,
    canViewSettings,
    canManageSettings,
    updateDraft,
    saveChanges,
    discardChanges,
    resetCategoryToDefaults,
    refreshSettings,
  } = useAdminSystemSettings();

  const handleTabChange = (val: string) => {
    const category = val as AdminSystemSettingCategory;
    setActiveTab(category);
    const params = new URLSearchParams(location.search);
    params.set("tab", category);
    navigate({ search: params.toString() }, { replace: true });
  };

  const handleSave = async (category?: AdminSystemSettingCategory) => {
    const result = await saveChanges(category);
    if (result.success) {
      toast({
        title: "Settings Saved",
        description: "System configuration has been updated successfully.",
      });
    } else {
      toast({
        title: "Unable to Save Settings",
        description: result.error || "Please verify your input and try again.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmReset = () => {
    if (!resetConfirmCategory) return;
    resetCategoryToDefaults(resetConfirmCategory);
    setResetConfirmCategory(null);
    toast({
      title: "Reset to System Defaults",
      description: "Draft values updated. Click 'Save Changes' to apply.",
    });
  };

  const activeCategoryLabel = useMemo(() => {
    return ADMIN_SETTING_CATEGORIES.find((c) => c.id === activeTab)?.label || "Settings";
  }, [activeTab]);

  // Unauthorized Access Guard
  if (!isLoading && !canViewSettings) {
    return (
      <div className="space-y-4 max-w-4xl">
        <AdminPageHeader
          title="System Settings"
          description="Administrative configuration controls and system-wide defaults."
        />
        <PortalEmptyState
          title="Access Restricted"
          description="You do not have the required permissions ('System Settings View') to access the system settings panel. Contact a Super Administrator to adjust your role permissions."
          action={
            <Button variant="outline" onClick={() => navigate("/admin")}>
              Return to Overview
            </Button>
          }
        />
      </div>
    );
  }

  // Error Loading State
  if (!isLoading && error && Object.keys(settings).length === 0) {
    return (
      <div className="space-y-4 max-w-4xl">
        <AdminPageHeader
          title="System Settings"
          description="Administrative configuration controls and system-wide defaults."
        />
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-4 max-w-xl mx-auto">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-segoe text-base font-semibold text-foreground">Unable to load system settings</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
          </div>
          <Button onClick={() => refreshSettings()} variant="outline" size="sm" className="gap-2 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 max-w-[1080px]">
      {/* Page Header */}
      <AdminPageHeader
        title="System Settings"
        description="Configure system-wide administrative behavior, notifications, workflows, security, and defaults."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshSettings()}
            disabled={isLoading || isSaving}
            className="h-8 gap-1.5 text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-50 shadow-none"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        }
      />

      {/* Read-Only Mode Banner */}
      {!canManageSettings && (
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-3.5 py-2.5 flex items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-2 text-xs">
            <Lock className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong className="font-semibold text-amber-950">Read-Only Mode:</strong> You can view system settings, but modifying them requires the <code className="font-mono text-[11px] bg-amber-100/80 px-1 py-0.5 rounded">system_settings_manage</code> permission.
            </span>
          </div>
        </div>
      )}

      {/* Settings Workspace with Refined Proportions */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-0">
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Left Navigation Rail (Tight 220px Width) */}
          <aside className="w-full lg:w-[220px] lg:shrink-0">
            <nav aria-label="Settings Categories" className="sticky top-6 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-2xs">
              <div className="px-2.5 py-1 mb-1 border-b border-slate-100">
                <p className="font-segoe text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Configuration Areas
                </p>
              </div>
              <TabsList className="flex flex-row lg:flex-col items-stretch justify-start bg-transparent p-0 gap-0.5 overflow-x-auto lg:overflow-visible w-full h-auto">
                {ADMIN_SETTING_CATEGORIES.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.id];
                  const categoryDirty = dirtyKeys.some((k) => {
                    const def = ADMIN_SETTING_DEFINITIONS_BY_KEY.get(k as AdminSystemSettingKey);
                    return def?.category === cat.id;
                  });

                  return (
                    <TabsTrigger
                      key={cat.id}
                      value={cat.id}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-left w-full",
                        "data-[state=active]:bg-primary/10 data-[state=active]:text-public-bg-brand data-[state=active]:font-semibold data-[state=active]:shadow-none",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="h-4 w-4 shrink-0 opacity-75" strokeWidth={1.75} />
                        <span className="truncate">{cat.label}</span>
                      </div>
                      {categoryDirty && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" title="Unsaved changes" />
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </nav>
          </aside>

          {/* Right Settings Content Surface (820px Content Max-Width) */}
          <main className="flex-1 min-w-0 max-w-[820px] w-full">
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xs">
              {/* Category Surface Header */}
              <div className="flex items-center justify-between gap-4 pb-3.5 mb-5 border-b border-slate-100">
                <div>
                  <h2 className="font-segoe text-[15px] font-semibold text-text-default">
                    {activeCategoryLabel}
                  </h2>
                  <p className="font-segoe text-xs text-slate-500 mt-0.5">
                    {ADMIN_SETTING_CATEGORIES.find((c) => c.id === activeTab)?.description}
                  </p>
                </div>

                {canManageSettings && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setResetConfirmCategory(activeTab)}
                    disabled={isSaving}
                    className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 gap-1.5 font-normal"
                  >
                    <RotateCcw className="h-3 w-3 text-slate-400" />
                    <span>Reset section</span>
                  </Button>
                )}
              </div>

              {/* ───────────────────────────────────────────────────────────────── */}
              {/* 1. GENERAL */}
              {/* ───────────────────────────────────────────────────────────────── */}
              <TabsContent value="general" className="mt-0 focus-visible:outline-none space-y-5">
                <SettingSection
                  title="System Information"
                  description="Official department identity and public-facing system names."
                >
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <SettingInputField
                      settingKey="general.system_name"
                      value={draftSettings["general.system_name"]}
                      error={validationErrors["general.system_name"]}
                      disabled={!canManageSettings || isSaving}
                      descriptionOverride="Primary name used across portal headers and notices."
                      onChange={(val) => updateDraft("general.system_name", val)}
                    />
                    <SettingInputField
                      settingKey="general.office_acronym"
                      value={draftSettings["general.office_acronym"]}
                      error={validationErrors["general.office_acronym"]}
                      disabled={!canManageSettings || isSaving}
                      hideDescription
                      onChange={(val) => updateDraft("general.office_acronym", val)}
                    />
                  </div>

                  <SettingInputField
                    settingKey="general.office_name"
                    value={draftSettings["general.office_name"]}
                    error={validationErrors["general.office_name"]}
                    disabled={!canManageSettings || isSaving}
                    hideDescription
                    onChange={(val) => updateDraft("general.office_name", val)}
                  />

                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <SettingInputField
                      settingKey="general.support_email"
                      value={draftSettings["general.support_email"]}
                      error={validationErrors["general.support_email"]}
                      disabled={!canManageSettings || isSaving}
                      descriptionOverride="Destination for citizen support and inquiries."
                      onChange={(val) => updateDraft("general.support_email", val)}
                    />
                    <SettingInputField
                      settingKey="general.contact_number"
                      value={draftSettings["general.contact_number"]}
                      error={validationErrors["general.contact_number"]}
                      disabled={!canManageSettings || isSaving}
                      hideDescription
                      onChange={(val) => updateDraft("general.contact_number", val)}
                    />
                  </div>

                  <SettingInputField
                    settingKey="general.office_address"
                    value={draftSettings["general.office_address"]}
                    error={validationErrors["general.office_address"]}
                    disabled={!canManageSettings || isSaving}
                    hideDescription
                    onChange={(val) => updateDraft("general.office_address", val)}
                  />
                </SettingSection>
              </TabsContent>

              {/* ───────────────────────────────────────────────────────────────── */}
              {/* 2. NOTIFICATIONS */}
              {/* ───────────────────────────────────────────────────────────────── */}
              <TabsContent value="notifications" className="mt-0 focus-visible:outline-none space-y-5">
                <SettingSection
                  title="Administrator Event Alerts"
                  description="Choose which system activities trigger in-app bell notifications and email dispatches."
                >
                  <div className="rounded-lg border border-slate-200/80 overflow-hidden">
                    <div className="grid grid-cols-12 bg-slate-50/90 px-4 py-2 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600">
                      <div className="col-span-8">Event Alert Trigger</div>
                      <div className="col-span-2 text-center">In-App</div>
                      <div className="col-span-2 text-center">Email</div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {NOTIFICATION_EVENT_ROWS.map((evt) => (
                        <div
                          key={evt.inAppKey}
                          className="grid grid-cols-12 items-center px-4 py-2.5 hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="col-span-8 pr-3">
                            <p className="font-segoe text-xs font-medium text-text-default leading-snug">{evt.label}</p>
                            <p className="font-segoe text-[11px] text-slate-500 leading-tight">{evt.description}</p>
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <Switch
                              aria-label={`In-App: ${evt.label}`}
                              checked={Boolean(draftSettings[evt.inAppKey])}
                              disabled={!canManageSettings || isSaving}
                              onCheckedChange={(val) => updateDraft(evt.inAppKey, val)}
                            />
                          </div>
                          <div className="col-span-2 flex justify-center">
                            <Switch
                              aria-label={`Email: ${evt.label}`}
                              checked={Boolean(draftSettings[evt.emailKey])}
                              disabled={!canManageSettings || isSaving}
                              onCheckedChange={(val) => updateDraft(evt.emailKey, val)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </SettingSection>

                <div className="border-t border-slate-100 pt-5">
                  <SettingSection
                    title="Delivery Preferences"
                    description="Configure scheduled digests and bulk notification timing."
                  >
                    <div className="divide-y divide-slate-100">
                      <SettingRow
                        title="Daily Activity Digest"
                        description="Bundle administrative alerts into a consolidated daily summary email."
                      >
                        <Switch
                          aria-label="Daily Activity Digest"
                          checked={Boolean(draftSettings["notifications.daily_digest_enabled"])}
                          disabled={!canManageSettings || isSaving}
                          onCheckedChange={(val) => updateDraft("notifications.daily_digest_enabled", val)}
                        />
                      </SettingRow>
                    </div>

                    {Boolean(draftSettings["notifications.daily_digest_enabled"]) && (
                      <div className="max-w-xs pt-2">
                        <SettingSelectField
                          settingKey="notifications.daily_digest_time"
                          value={draftSettings["notifications.daily_digest_time"]}
                          disabled={!canManageSettings || isSaving}
                          onChange={(val) => updateDraft("notifications.daily_digest_time", val)}
                        />
                      </div>
                    )}
                  </SettingSection>
                </div>
              </TabsContent>

              {/* ───────────────────────────────────────────────────────────────── */}
              {/* 3. WORKFLOW */}
              {/* ───────────────────────────────────────────────────────────────── */}
              <TabsContent value="workflow" className="mt-0 focus-visible:outline-none space-y-5">
                <SettingSection
                  title="Review Thresholds & Escalations"
                  description="Turnaround timeframes and queue visual indicators."
                >
                  <div className="divide-y divide-slate-100">
                    <SettingRow
                      title="Review Reminders"
                      description="Highlight submissions awaiting action past target turnaround time."
                    >
                      <Switch
                        aria-label="Review Reminders"
                        checked={Boolean(draftSettings["workflow.review_reminder_enabled"])}
                        disabled={!canManageSettings || isSaving}
                        onCheckedChange={(val) => updateDraft("workflow.review_reminder_enabled", val)}
                      />
                    </SettingRow>
                  </div>

                  <div className="grid gap-3.5 sm:grid-cols-2 pt-1">
                    <SettingInputField
                      settingKey="workflow.review_reminder_days"
                      value={draftSettings["workflow.review_reminder_days"]}
                      error={validationErrors["workflow.review_reminder_days"]}
                      disabled={!canManageSettings || isSaving}
                      hideDescription
                      onChange={(val) => updateDraft("workflow.review_reminder_days", Number(val))}
                    />
                    <SettingInputField
                      settingKey="workflow.escalate_after_days"
                      value={draftSettings["workflow.escalate_after_days"]}
                      error={validationErrors["workflow.escalate_after_days"]}
                      disabled={!canManageSettings || isSaving}
                      hideDescription
                      onChange={(val) => updateDraft("workflow.escalate_after_days", Number(val))}
                    />
                  </div>

                  <div className="divide-y divide-slate-100 pt-1">
                    <SettingRow
                      title="Overdue Indicators"
                      description="Display persistent red warning badges on submissions exceeding deadline limits."
                    >
                      <Switch
                        aria-label="Overdue Indicators"
                        checked={Boolean(draftSettings["workflow.overdue_indicators_enabled"])}
                        disabled={!canManageSettings || isSaving}
                        onCheckedChange={(val) => updateDraft("workflow.overdue_indicators_enabled", val)}
                      />
                    </SettingRow>
                  </div>
                </SettingSection>

                <div className="border-t border-slate-100 pt-5">
                  <SettingSection
                    title="Organization Status Alerts"
                    description="Transactional notifications automatically sent to youth organizations upon administrative decisions."
                  >
                    <div className="divide-y divide-slate-100">
                      <SettingRow
                        title="Notify on Needs Revision"
                        description="Alert organization when remarks and correction requirements are issued."
                      >
                        <Switch
                          aria-label="Notify on Needs Revision"
                          checked={Boolean(draftSettings["workflow.notify_org_on_needs_revision"])}
                          disabled={!canManageSettings || isSaving}
                          onCheckedChange={(val) => updateDraft("workflow.notify_org_on_needs_revision", val)}
                        />
                      </SettingRow>
                      <SettingRow
                        title="Notify on Approval"
                        description="Send confirmation when an accreditation, YPOP, or budget request is approved."
                      >
                        <Switch
                          aria-label="Notify on Approval"
                          checked={Boolean(draftSettings["workflow.notify_org_on_approved"])}
                          disabled={!canManageSettings || isSaving}
                          onCheckedChange={(val) => updateDraft("workflow.notify_org_on_approved", val)}
                        />
                      </SettingRow>
                      <SettingRow
                        title="Notify on Rejection"
                        description="Dispatch notification with documented reason when a submission is declined."
                      >
                        <Switch
                          aria-label="Notify on Rejection"
                          checked={Boolean(draftSettings["workflow.notify_org_on_rejected"])}
                          disabled={!canManageSettings || isSaving}
                          onCheckedChange={(val) => updateDraft("workflow.notify_org_on_rejected", val)}
                        />
                      </SettingRow>
                      <SettingRow
                        title="Notify on Resubmission"
                        description="Acknowledge receipt when an organization submits requested document revisions."
                      >
                        <Switch
                          aria-label="Notify on Resubmission"
                          checked={Boolean(draftSettings["workflow.notify_org_on_resubmitted"])}
                          disabled={!canManageSettings || isSaving}
                          onCheckedChange={(val) => updateDraft("workflow.notify_org_on_resubmitted", val)}
                        />
                      </SettingRow>
                    </div>
                  </SettingSection>
                </div>
              </TabsContent>

              {/* ───────────────────────────────────────────────────────────────── */}
              {/* 4. PROGRAMS / YPOP */}
              {/* ───────────────────────────────────────────────────────────────── */}
              <TabsContent value="programs" className="m-0 space-y-4 focus-visible:outline-none">
                <SettingSection
                  title="YPOP Program Defaults"
                  description="Global baseline defaults applied to newly created YPOP validation cycles. Existing active cycles retain their explicit configuration."
                >
                  <div className="grid gap-3.5 sm:grid-cols-2 pt-1">
                    <SettingInputField
                      settingKey="programs.ypop_default_reminder_days"
                      value={draftSettings["programs.ypop_default_reminder_days"]}
                      error={validationErrors["programs.ypop_default_reminder_days"]}
                      disabled={!canManageSettings || isSaving}
                      hideDescription
                      onChange={(val) => updateDraft("programs.ypop_default_reminder_days", Number(val))}
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100 divide-y divide-slate-100">
                    <SettingRow
                      title="Enable Deadline Reminders"
                      description="Dispatch automated notifications to organizations as the validation period closes."
                    >
                      <Switch
                        aria-label="Enable Deadline Reminders"
                        checked={Boolean(draftSettings["programs.ypop_deadline_reminders_enabled"])}
                        disabled={!canManageSettings || isSaving}
                        onCheckedChange={(val) => updateDraft("programs.ypop_deadline_reminders_enabled", val)}
                      />
                    </SettingRow>

                    <SettingRow
                      title="Auto-Close on Deadline Expiration"
                      description="Automatically lock proof submissions when the official deadline date passes."
                    >
                      <Switch
                        aria-label="Auto-Close on Deadline Expiration"
                        checked={Boolean(draftSettings["programs.ypop_auto_close_on_deadline"])}
                        disabled={!canManageSettings || isSaving}
                        onCheckedChange={(val) => updateDraft("programs.ypop_auto_close_on_deadline", val)}
                      />
                    </SettingRow>
                  </div>
                </SettingSection>
              </TabsContent>

              {/* ───────────────────────────────────────────────────────────────── */}
              {/* 5. BUDGET & FINANCE */}
              {/* ───────────────────────────────────────────────────────────────── */}
              <TabsContent value="budget_finance" className="mt-0 focus-visible:outline-none space-y-5">
                <SettingSection
                  title="Fiscal Parameters & Accounting Defaults"
                  description="Baseline accounting currency and fiscal parameters across budget monitoring modules."
                >
                  <div className="grid gap-3.5 sm:grid-cols-2 pt-1">
                    <SettingInputField
                      settingKey="budget.default_fiscal_year"
                      value={draftSettings["budget.default_fiscal_year"]}
                      error={validationErrors["budget.default_fiscal_year"]}
                      disabled={!canManageSettings || isSaving}
                      hideDescription
                      onChange={(val) => updateDraft("budget.default_fiscal_year", Number(val))}
                    />
                    <SettingInputField
                      settingKey="budget.currency"
                      value={draftSettings["budget.currency"]}
                      error={validationErrors["budget.currency"]}
                      disabled={!canManageSettings || isSaving}
                      hideDescription
                      onChange={(val) => updateDraft("budget.currency", val)}
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100 divide-y divide-slate-100">
                    <SettingRow
                      title="Budget Deadline Alerts"
                      description="Display notifications for pending project proposals nearing approval cutoffs."
                    >
                      <Switch
                        aria-label="Budget Deadline Alerts"
                        checked={Boolean(draftSettings["budget.budget_deadline_reminders"])}
                        disabled={!canManageSettings || isSaving}
                        onCheckedChange={(val) => updateDraft("budget.budget_deadline_reminders", val)}
                      />
                    </SettingRow>

                    <SettingRow
                      title="Liquidation Overdue Reminders"
                      description="Generate system alerts for released funds missing formal liquidation packets."
                    >
                      <Switch
                        aria-label="Liquidation Overdue Reminders"
                        checked={Boolean(draftSettings["budget.liquidation_overdue_reminders"])}
                        disabled={!canManageSettings || isSaving}
                        onCheckedChange={(val) => updateDraft("budget.liquidation_overdue_reminders", val)}
                      />
                    </SettingRow>
                  </div>
                </SettingSection>

                {/* Public Budget Snapshot Linked Module */}
                <div className="border-t border-slate-100 pt-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-slate-50/60 p-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-segoe text-xs font-semibold text-text-default">Public Budget Snapshot</span>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Authoritative Module</span>
                      </div>
                      <p className="font-segoe text-[11px] text-slate-500 max-w-lg">
                        Municipal budget allocations, charts, and fund breakdowns are managed centrally in the Budget Monitoring workspace.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/admin/budget-monitoring")}
                      className="shrink-0 gap-1.5 text-xs font-medium border-slate-300 hover:bg-white h-8 shadow-none"
                    >
                      <span>Open Configuration</span>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* ───────────────────────────────────────────────────────────────── */}
              {/* 6. SECURITY */}
              {/* ───────────────────────────────────────────────────────────────── */}
              <TabsContent value="security" className="mt-0 focus-visible:outline-none space-y-5">
                <SettingSection
                  title="Session Lifetime & Timeout"
                  description="Enforce automatic administrative session expiration after inactivity."
                >
                  <div className="max-w-xs pt-1">
                    <SettingSelectField
                      settingKey="security.admin_session_timeout_minutes"
                      value={draftSettings["security.admin_session_timeout_minutes"]}
                      disabled={!canManageSettings || isSaving}
                      onChange={(val) => updateDraft("security.admin_session_timeout_minutes", Number(val))}
                    />
                  </div>
                </SettingSection>

                <div className="border-t border-slate-100 pt-5">
                  <SettingSection
                    title="Destructive Action Confirmation Guards"
                    description="Require explicit confirmation dialogs before executing permanent data operations."
                  >
                    <div className="divide-y divide-slate-100">
                      <SettingRow
                        title="Administrator Account Deletion"
                        description="Require confirmed name input before removing an administrator account."
                      >
                        <Switch
                          aria-label="Administrator Account Deletion"
                          checked={Boolean(draftSettings["security.reauth_delete_administrator"])}
                          disabled={!canManageSettings || isSaving}
                          onCheckedChange={(val) => updateDraft("security.reauth_delete_administrator", val)}
                        />
                      </SettingRow>
                      <SettingRow
                        title="Organization Deletion"
                        description="Enforce confirmation before permanently purging organization records."
                      >
                        <Switch
                          aria-label="Organization Deletion"
                          checked={Boolean(draftSettings["security.reauth_delete_organization"])}
                          disabled={!canManageSettings || isSaving}
                          onCheckedChange={(val) => updateDraft("security.reauth_delete_organization", val)}
                        />
                      </SettingRow>
                      <SettingRow
                        title="Inquiry Ticket Deletion"
                        description="Confirm ticket deletion to prevent accidental loss of citizen communication."
                      >
                        <Switch
                          aria-label="Inquiry Ticket Deletion"
                          checked={Boolean(draftSettings["security.reauth_delete_inquiry"])}
                          disabled={!canManageSettings || isSaving}
                          onCheckedChange={(val) => updateDraft("security.reauth_delete_inquiry", val)}
                        />
                      </SettingRow>
                      <SettingRow
                        title="Role Permission Changes"
                        description="Display permission modification warning before altering role capabilities."
                      >
                        <Switch
                          aria-label="Role Permission Changes"
                          checked={Boolean(draftSettings["security.reauth_modify_role_permissions"])}
                          disabled={!canManageSettings || isSaving}
                          onCheckedChange={(val) => updateDraft("security.reauth_modify_role_permissions", val)}
                        />
                      </SettingRow>
                      <SettingRow
                        title="System Configuration Updates"
                        description="Require confirmation before applying system-wide administrative policy updates."
                      >
                        <Switch
                          aria-label="System Configuration Updates"
                          checked={Boolean(draftSettings["security.reauth_modify_system_settings"])}
                          disabled={!canManageSettings || isSaving}
                          onCheckedChange={(val) => updateDraft("security.reauth_modify_system_settings", val)}
                        />
                      </SettingRow>
                    </div>
                  </SettingSection>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <SettingSection
                    title="Account Security Standards"
                    description="Verification and recovery rules for administrator accounts."
                  >
                    <div className="divide-y divide-slate-100">
                      <SettingRow
                        title="Require Verified Admin Email"
                        description="Administrators must confirm their municipal email address prior to active access."
                      >
                        <Switch
                          aria-label="Require Verified Admin Email"
                          checked={Boolean(draftSettings["security.require_verified_admin_email"])}
                          disabled={!canManageSettings || isSaving}
                          onCheckedChange={(val) => updateDraft("security.require_verified_admin_email", val)}
                        />
                      </SettingRow>
                      <SettingRow
                        title="Administrator Password Reset"
                        description="Enable self-service reset links dispatched to registered municipal email accounts."
                      >
                        <Switch
                          aria-label="Administrator Password Reset"
                          checked={Boolean(draftSettings["security.allow_admin_password_reset"])}
                          disabled={!canManageSettings || isSaving}
                          onCheckedChange={(val) => updateDraft("security.allow_admin_password_reset", val)}
                        />
                      </SettingRow>
                    </div>
                  </SettingSection>
                </div>
              </TabsContent>

              {/* ───────────────────────────────────────────────────────────────── */}
              {/* 7. EMAIL */}
              {/* ───────────────────────────────────────────────────────────────── */}
              <TabsContent value="email" className="mt-0 focus-visible:outline-none space-y-5">
                <SettingSection
                  title="Email Sender Identity"
                  description="Information displayed on automated receipts, invitations, and notices."
                >
                  <div className="grid gap-3.5 sm:grid-cols-2 pt-1">
                    <SettingInputField
                      settingKey="email.sender_name"
                      value={draftSettings["email.sender_name"]}
                      error={validationErrors["email.sender_name"]}
                      disabled={!canManageSettings || isSaving}
                      hideDescription
                      onChange={(val) => updateDraft("email.sender_name", val)}
                    />
                    <SettingInputField
                      settingKey="email.reply_to_email"
                      value={draftSettings["email.reply_to_email"]}
                      error={validationErrors["email.reply_to_email"]}
                      disabled={!canManageSettings || isSaving}
                      hideDescription
                      onChange={(val) => updateDraft("email.reply_to_email", val)}
                    />
                  </div>
                </SettingSection>

                <div className="border-t border-slate-100 pt-5">
                  <SettingSection
                    title="Email Delivery Dispatch"
                    description="Choose which system communication workflows dispatch transactional emails."
                  >
                    <div className="divide-y divide-slate-100">
                      <SettingRow
                        title="Administrator Invitation Emails"
                        description="Dispatch invitation onboarding links when new administrator accounts are registered."
                      >
                        <Switch
                          aria-label="Administrator Invitation Emails"
                          checked={Boolean(draftSettings["email.send_invitation_emails"])}
                          disabled={!canManageSettings || isSaving}
                          onCheckedChange={(val) => updateDraft("email.send_invitation_emails", val)}
                        />
                      </SettingRow>
                      <SettingRow
                        title="Transactional Status & Workflow Emails"
                        description="Dispatch submission decision and review notice emails to youth organizations."
                      >
                        <Switch
                          aria-label="Transactional Status & Workflow Emails"
                          checked={Boolean(draftSettings["email.send_workflow_emails"])}
                          disabled={!canManageSettings || isSaving}
                          onCheckedChange={(val) => updateDraft("email.send_workflow_emails", val)}
                        />
                      </SettingRow>
                    </div>
                  </SettingSection>
                </div>
              </TabsContent>

              {/* ───────────────────────────────────────────────────────────────── */}
              {/* 8. AUDIT & RECORDS */}
              {/* ───────────────────────────────────────────────────────────────── */}
              <TabsContent value="audit_records" className="mt-0 focus-visible:outline-none space-y-5">
                <SettingSection
                  title="System Activity Tracking Preferences"
                  description="Select administrative and organizational actions tracked in the immutable audit log."
                >
                  <div className="divide-y divide-slate-100">
                    <SettingRow
                      title="Administrator Sign-Ins"
                      description="Log successful administrator portal logins with timestamp and session details."
                    >
                      <Switch
                        aria-label="Administrator Sign-Ins"
                        checked={Boolean(draftSettings["audit.log_admin_login"])}
                        disabled={!canManageSettings || isSaving}
                        onCheckedChange={(val) => updateDraft("audit.log_admin_login", val)}
                      />
                    </SettingRow>
                    <SettingRow
                      title="Administrator Sign-Outs"
                      description="Log intentional administrator session terminations."
                    >
                      <Switch
                        aria-label="Administrator Sign-Outs"
                        checked={Boolean(draftSettings["audit.log_admin_logout"])}
                        disabled={!canManageSettings || isSaving}
                        onCheckedChange={(val) => updateDraft("audit.log_admin_logout", val)}
                      />
                    </SettingRow>
                    <SettingRow
                      title="Record Creation"
                      description="Log new registrations, program entries, and budget transactions."
                    >
                      <Switch
                        aria-label="Record Creation"
                        checked={Boolean(draftSettings["audit.log_record_creation"])}
                        disabled={!canManageSettings || isSaving}
                        onCheckedChange={(val) => updateDraft("audit.log_record_creation", val)}
                      />
                    </SettingRow>
                    <SettingRow
                      title="Record Updates"
                      description="Log changes to organization profiles, status flags, and compliance files."
                    >
                      <Switch
                        aria-label="Record Updates"
                        checked={Boolean(draftSettings["audit.log_record_updates"])}
                        disabled={!canManageSettings || isSaving}
                        onCheckedChange={(val) => updateDraft("audit.log_record_updates", val)}
                      />
                    </SettingRow>
                    <SettingRow
                      title="Approvals & Decisions"
                      description="Log administrative approval, rejection, and revision decisions."
                    >
                      <Switch
                        aria-label="Approvals & Decisions"
                        checked={Boolean(draftSettings["audit.log_approvals_rejections"])}
                        disabled={!canManageSettings || isSaving}
                        onCheckedChange={(val) => updateDraft("audit.log_approvals_rejections", val)}
                      />
                    </SettingRow>
                    <SettingRow
                      title="Record Deletions"
                      description="Log permanent purging of tickets, records, or accounts."
                    >
                      <Switch
                        aria-label="Record Deletions"
                        checked={Boolean(draftSettings["audit.log_deletions"])}
                        disabled={!canManageSettings || isSaving}
                        onCheckedChange={(val) => updateDraft("audit.log_deletions", val)}
                      />
                    </SettingRow>
                    <SettingRow
                      title="Role Permission Changes"
                      description="Log modifications made to administrator security roles and capabilities."
                    >
                      <Switch
                        aria-label="Role Permission Changes"
                        checked={Boolean(draftSettings["audit.log_permission_changes"])}
                        disabled={!canManageSettings || isSaving}
                        onCheckedChange={(val) => updateDraft("audit.log_permission_changes", val)}
                      />
                    </SettingRow>
                    <SettingRow
                      title="System Settings Updates"
                      description="Log all modifications made to global system settings and defaults."
                    >
                      <Switch
                        aria-label="System Settings Updates"
                        checked={Boolean(draftSettings["audit.log_config_changes"])}
                        disabled={!canManageSettings || isSaving}
                        onCheckedChange={(val) => updateDraft("audit.log_config_changes", val)}
                      />
                    </SettingRow>
                  </div>
                </SettingSection>

                <div className="border-t border-slate-100 pt-5">
                  <SettingSection
                    title="Audit Trail Metadata"
                    description="Contextual diagnostic information recorded alongside audit events."
                  >
                    <div className="divide-y divide-slate-100">
                      <SettingRow
                        title="Capture User Agent Metadata"
                        description="Record browser user agent details in audit metadata for security diagnostics."
                      >
                        <Switch
                          aria-label="Capture User Agent Metadata"
                          checked={Boolean(draftSettings["audit.include_user_agent"])}
                          disabled={!canManageSettings || isSaving}
                          onCheckedChange={(val) => updateDraft("audit.include_user_agent", val)}
                        />
                      </SettingRow>
                      <SettingRow
                        title="Capture Client IP Metadata"
                        description="Record client IP addresses in activity log records where available."
                      >
                        <Switch
                          aria-label="Capture Client IP Metadata"
                          checked={Boolean(draftSettings["audit.include_ip_metadata"])}
                          disabled={!canManageSettings || isSaving}
                          onCheckedChange={(val) => updateDraft("audit.include_ip_metadata", val)}
                        />
                      </SettingRow>
                    </div>
                  </SettingSection>
                </div>
              </TabsContent>
            </div>
          </main>
        </div>
      </Tabs>

      {/* Floating Save Action Bar — Rendered ONLY when there are unsaved changes */}
      {hasChanges && (
        <div className="fixed bottom-5 inset-x-0 z-30 flex justify-center px-4 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none">
          <div className="pointer-events-auto flex items-center justify-between gap-4 rounded-xl border border-slate-300 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-md w-full max-w-xl">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Unsaved changes ({dirtyKeys.length})</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => discardChanges(activeTab)}
                disabled={isSaving}
                className="h-8 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                <Undo2 className="h-3.5 w-3.5 mr-1" />
                Discard
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleSave(activeTab)}
                disabled={!canManageSettings || isSaving}
                className="h-8 px-4 text-xs font-semibold shadow-sm bg-public-bg-brand text-white hover:bg-bg-brand-hover gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <AlertDialog
        open={Boolean(resetConfirmCategory)}
        onOpenChange={(open) => (!open ? setResetConfirmCategory(null) : undefined)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-segoe text-base font-bold text-text-default">
              Reset section to defaults?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
              This will replace all fields in the <strong className="text-foreground">{activeCategoryLabel}</strong> section with standard system defaults. You can still review and discard before clicking Save Changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="text-xs font-medium h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              className="text-xs font-semibold h-9 bg-primary text-primary-foreground"
            >
              Reset to Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE SETTING PRIMITIVES (Quiet, Dense, Accessible)
// ─────────────────────────────────────────────────────────────────────────────

function SettingSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <h3 className="font-segoe text-[13px] font-semibold text-slate-800">{title}</h3>
        {description && (
          <p className="font-segoe text-xs text-slate-500 leading-normal">{description}</p>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 last:border-0 min-h-[48px]">
      <div className="space-y-0.5 max-w-lg">
        <p className="font-segoe text-xs font-medium text-text-default leading-snug">{title}</p>
        {description && (
          <p className="font-segoe text-[11px] text-slate-500 leading-tight">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SettingInputField({
  settingKey,
  value,
  error,
  disabled,
  onChange,
  labelOverride,
  descriptionOverride,
  hideDescription,
}: {
  settingKey: AdminSystemSettingKey;
  value: unknown;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  labelOverride?: string;
  descriptionOverride?: string;
  hideDescription?: boolean;
}) {
  const def = ADMIN_SETTING_DEFINITIONS_BY_KEY.get(settingKey);
  if (!def) return null;

  const label = labelOverride || def.label;
  const description = hideDescription ? undefined : (descriptionOverride || def.description);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={settingKey} className="font-segoe text-xs font-medium text-text-default">
          {label}
        </Label>
        {def.badge && (
          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
            {def.badge}
          </span>
        )}
      </div>
      <Input
        id={settingKey}
        type={def.dataType === "number" ? "number" : "text"}
        value={String(value ?? "")}
        disabled={disabled}
        placeholder={def.helperText}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-8 font-segoe text-xs border-slate-300 bg-white shadow-none focus-visible:ring-1",
          Boolean(error) && "border-destructive focus-visible:ring-destructive",
          disabled && "bg-slate-50 text-slate-500",
        )}
      />
      {description && <p className="text-[11px] text-slate-500 leading-tight mt-1">{description}</p>}
      {error && <p className="text-[11px] font-medium text-destructive mt-1">{error}</p>}
    </div>
  );
}

function SettingSelectField({
  settingKey,
  value,
  disabled,
  onChange,
}: {
  settingKey: AdminSystemSettingKey;
  value: unknown;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const def = ADMIN_SETTING_DEFINITIONS_BY_KEY.get(settingKey);
  if (!def || !def.options) return null;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={settingKey} className="font-segoe text-xs font-medium text-text-default">
        {def.label}
      </Label>
      <Select value={String(value ?? def.defaultValue)} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={settingKey} className="h-8 font-segoe text-xs border-slate-300 bg-white shadow-none">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          {def.options.map((opt) => (
            <SelectItem key={String(opt.value)} value={String(opt.value)} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {def.description && <p className="text-[11px] text-slate-500 leading-tight mt-1">{def.description}</p>}
    </div>
  );
}
