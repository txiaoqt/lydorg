import React, { useEffect, useId, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  Copy,
  ExternalLink,
  FlaskConical,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  adminGetOrCreateRenewalTestAccountInSupabase,
  adminPrepareRenewalTestScenarioInSupabase,
  adminResetRenewalTestScenarioInSupabase,
  adminRestoreRenewalTestScenarioInSupabase,
  type RenewalTestAccountDetails,
} from "@/lib/lydo-connect-supabase";

export interface RenewalTestEnvironmentPanelProps {
  onNavigateToRenewals?: () => void;
  className?: string;
}

export const RenewalTestEnvironmentPanel: React.FC<RenewalTestEnvironmentPanelProps> = ({
  onNavigateToRenewals,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [testAccount, setTestAccount] = useState<RenewalTestAccountDetails | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<"30" | "60" | "90" | "grace_10" | "custom">("30");
  const [customDate, setCustomDate] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const disclosureId = useId();

  const isDevOrTestEnv = import.meta.env.DEV || import.meta.env.MODE !== "production";

  const fetchAccountState = async () => {
    try {
      setLoading(true);
      const data = await adminGetOrCreateRenewalTestAccountInSupabase();
      setTestAccount(data);
    } catch (err: any) {
      console.error("Failed to load renewal test account:", err);
      toast({
        title: "Test Environment Error",
        description: err?.message || "Failed to load renewal test account details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDevOrTestEnv && isExpanded) {
      void fetchAccountState();
    }
  }, [isDevOrTestEnv, isExpanded]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast({
      title: "Copied to Clipboard",
      description: `${fieldName} copied.`,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrepareScenario = async () => {
    try {
      setActionInProgress("prepare");
      let daysAhead: number | undefined;
      let customDateVal: string | undefined;

      if (selectedPreset === "30") daysAhead = 30;
      else if (selectedPreset === "60") daysAhead = 60;
      else if (selectedPreset === "90") daysAhead = 90;
      else if (selectedPreset === "grace_10") daysAhead = -10;
      else if (selectedPreset === "custom") {
        if (!customDate) {
          toast({
            title: "Custom Date Required",
            description: "Please choose a valid expiration date.",
            variant: "destructive",
          });
          return;
        }
        customDateVal = customDate;
      }

      const res = await adminPrepareRenewalTestScenarioInSupabase({
        expirationDaysAhead: daysAhead,
        customExpirationDate: customDateVal,
      });

      toast({
        title: "Renewal Test Scenario Prepared",
        description: `Expiration set to ${res.endDate}. Authoritative window: ${res.eligibility.windowStatus}.`,
      });

      await fetchAccountState();
    } catch (err: any) {
      toast({
        title: "Failed to Prepare Scenario",
        description: err?.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRestore = async () => {
    try {
      setActionInProgress("restore");
      const res = await adminRestoreRenewalTestScenarioInSupabase();
      toast({
        title: "Test Scenario Restored",
        description: `Accreditation restored to 3-year term (valid until ${res.endDate}).`,
      });
      await fetchAccountState();
    } catch (err: any) {
      toast({
        title: "Failed to Restore Scenario",
        description: err?.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReset = async () => {
    try {
      setActionInProgress("reset");
      const res = await adminResetRenewalTestScenarioInSupabase();
      toast({
        title: "Renewal Test Scenario Reset",
        description: `Test organization reset to clean Cycle 2 ready state (+30 days expiration: ${res.endDate}).`,
      });
      await fetchAccountState();
    } catch (err: any) {
      toast({
        title: "Failed to Reset Scenario",
        description: err?.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  if (!isDevOrTestEnv) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-6 text-card-foreground shadow-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          <p className="text-sm font-medium">
            Renewal Test Environment is disabled in production mode.
          </p>
        </div>
      </div>
    );
  }

  const eligibility = testAccount?.eligibility;
  const accreditation = testAccount?.accreditation;
  const isWindowOpen = eligibility?.windowStatus === "open";
  const isGrace = eligibility?.windowStatus === "expired";
  const isTooEarly = eligibility?.windowStatus === "too_early";
  const isLapsed = eligibility?.windowStatus === "lapsed";
  const windowSummary = isWindowOpen
    ? "Renewal window open"
    : isGrace
    ? "In grace period"
    : isTooEarly
    ? "Window not open yet"
    : isLapsed
    ? "Accreditation lapsed"
    : loading
    ? "Loading eligibility…"
    : "Eligibility loads when expanded";

  return (
    <section className={cn("overflow-hidden rounded-xl border border-indigo-500/20 bg-card", className)}>
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={disclosureId}
        onClick={() => setIsExpanded((expanded) => !expanded)}
        className="group flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-indigo-500/[0.035] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-foreground">Renewal Test Environment</span>
            <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
              Dev / Test Only
            </Badge>
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Safe, isolated renewal lifecycle testing · {testAccount?.organization.name || "Y-TRACE Renewal Test Organization"}
          </span>
          <span className="mt-1 block text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
            {windowSummary}
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150", isExpanded && "rotate-180")} aria-hidden="true" />
      </button>

      <div id={disclosureId} hidden={!isExpanded} className="space-y-4 border-t border-border/60 p-4 sm:p-5">
      {isExpanded && <>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void fetchAccountState()}
            disabled={loading || actionInProgress !== null}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      {loading && !testAccount ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-500 mb-2" />
          <p className="text-xs font-medium">Loading Renewal Test Account...</p>
        </div>
      ) : testAccount ? (
        <div className="space-y-6">
          {/* Account & Credentials Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                  Dedicated Test Account
                </span>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px]">
                  Active Verified
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-muted-foreground">Organization: </span>
                  <span className="font-semibold text-foreground">{testAccount.organization.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Barangay: </span>
                  <span className="text-foreground">{testAccount.organization.barangay}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Official URN: </span>
                  <code className="rounded bg-background px-1.5 py-0.5 text-xs font-mono font-medium text-foreground">
                    {testAccount.organization.urn || "Not assigned"}
                  </code>
                </div>
              </div>

              {/* Login Credentials Box */}
              <div className="mt-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    Portal Login Credentials
                  </span>
                  <span className="text-[10px] text-muted-foreground">Dev / Test</span>
                </div>

                <div className="flex items-center justify-between bg-background/80 rounded px-2 py-1.5 border border-border/40">
                  <span className="font-mono text-xs">{testAccount.credentials.email}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleCopy(testAccount.credentials.email, "Email")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                {testAccount.credentials.temporaryPassword && (
                  <div className="flex items-center justify-between bg-background/80 rounded px-2 py-1.5 border border-border/40">
                    <span className="font-mono text-xs text-foreground font-semibold">
                      {testAccount.credentials.temporaryPassword}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => handleCopy(testAccount.credentials.temporaryPassword!, "Password")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Use these credentials to log in to the Organization Portal at <code className="font-mono">/portal</code>.
                </p>
              </div>
            </div>

            {/* Accreditation & Real Eligibility Card */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  Accreditation & Eligibility
                </span>
                {isWindowOpen && (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Renewal Window OPEN
                  </Badge>
                )}
                {isGrace && (
                  <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs gap-1">
                    <Clock className="h-3 w-3" />
                    In Grace Period
                  </Badge>
                )}
                {isTooEarly && (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs gap-1">
                    <Clock className="h-3 w-3" />
                    Too Early (&gt; 90 days)
                  </Badge>
                )}
                {isLapsed && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Lapsed (&gt; 180 days)
                  </Badge>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Active Term:</span>
                  <span className="font-semibold text-foreground">
                    Term {accreditation?.termNumber ?? 1} ({accreditation?.certificateUrn || "01-23-999"})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Expiration Date:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {accreditation?.endDate || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Days Remaining:</span>
                  <span className="font-medium text-foreground">
                    {eligibility?.daysRemaining !== null && eligibility?.daysRemaining !== undefined
                      ? `${eligibility.daysRemaining} days`
                      : isTooEarly && eligibility?.daysUntilOpen
                      ? `Opens in ${eligibility.daysUntilOpen} days`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Can Start Draft / Submit:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {eligibility?.canDraft ? "Yes (Authoritative)" : "No"}
                  </span>
                </div>
              </div>

              {testAccount.activeRenewal && (
                <div className="mt-2 rounded-lg bg-background/90 p-2.5 border border-indigo-500/20 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Active Renewal Packet:</span>
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {testAccount.activeRenewal.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Cycle {testAccount.activeRenewal.cycleNumber} · ID: <span className="font-mono">{testAccount.activeRenewal.id.slice(0, 8)}...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scenario Preparation Controls */}
          <div className="rounded-xl border border-indigo-500/20 bg-background p-5 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-500" />
                Prepare Renewal Test Scenario
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set the test organization's expiration date into the real Renewal Window without altering business rules.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Button
                type="button"
                variant={selectedPreset === "30" ? "default" : "outline"}
                size="sm"
                className={cn("h-auto py-2.5 flex-col items-start gap-0.5 text-left", selectedPreset === "30" && "bg-indigo-600 hover:bg-indigo-700")}
                onClick={() => setSelectedPreset("30")}
              >
                <span className="font-semibold text-xs">30 Days Ahead</span>
                <span className="text-[10px] opacity-80">Recommended (Open)</span>
              </Button>

              <Button
                type="button"
                variant={selectedPreset === "60" ? "default" : "outline"}
                size="sm"
                className={cn("h-auto py-2.5 flex-col items-start gap-0.5 text-left", selectedPreset === "60" && "bg-indigo-600 hover:bg-indigo-700")}
                onClick={() => setSelectedPreset("60")}
              >
                <span className="font-semibold text-xs">60 Days Ahead</span>
                <span className="text-[10px] opacity-80">Open Window</span>
              </Button>

              <Button
                type="button"
                variant={selectedPreset === "90" ? "default" : "outline"}
                size="sm"
                className={cn("h-auto py-2.5 flex-col items-start gap-0.5 text-left", selectedPreset === "90" && "bg-indigo-600 hover:bg-indigo-700")}
                onClick={() => setSelectedPreset("90")}
              >
                <span className="font-semibold text-xs">90 Days Ahead</span>
                <span className="text-[10px] opacity-80">Window Opens Today</span>
              </Button>

              <Button
                type="button"
                variant={selectedPreset === "grace_10" ? "default" : "outline"}
                size="sm"
                className={cn("h-auto py-2.5 flex-col items-start gap-0.5 text-left", selectedPreset === "grace_10" && "bg-indigo-600 hover:bg-indigo-700")}
                onClick={() => setSelectedPreset("grace_10")}
              >
                <span className="font-semibold text-xs">10 Days Expired</span>
                <span className="text-[10px] opacity-80">Grace Period Active</span>
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="preset_custom"
                  checked={selectedPreset === "custom"}
                  onChange={() => setSelectedPreset("custom")}
                  className="text-indigo-600"
                />
                <Label htmlFor="preset_custom" className="text-xs cursor-pointer">
                  Custom Expiration Date:
                </Label>
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setSelectedPreset("custom");
                  }}
                  className="h-8 w-40 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end">
                <Button
                  size="sm"
                  onClick={handlePrepareScenario}
                  disabled={actionInProgress !== null}
                  className="h-9 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow"
                >
                  {actionInProgress === "prepare" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Apply Test Expiration
                </Button>
              </div>
            </div>
          </div>

          {/* Action Row & Lifecycle Management */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={actionInProgress !== null}
                className="h-8 text-xs gap-1.5 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10"
              >
                {actionInProgress === "reset" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Reset Scenario (Clean Cycle 2 Ready)
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestore}
                disabled={actionInProgress !== null}
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                {actionInProgress === "restore" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                Restore Pre-Test State
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {onNavigateToRenewals && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onNavigateToRenewals}
                  className="h-8 text-xs gap-1.5"
                >
                  Open Admin Renewals
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 space-y-3">
          <p className="text-xs text-muted-foreground">
            No dedicated test account found. Click below to provision the isolated Renewal Test Account.
          </p>
          <Button
            onClick={() => void fetchAccountState()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 gap-2"
          >
            <FlaskConical className="h-4 w-4" />
            Create Renewal Test Account
          </Button>
        </div>
      )}
      </>}
      </div>
    </section>
  );
};
export default RenewalTestEnvironmentPanel;
