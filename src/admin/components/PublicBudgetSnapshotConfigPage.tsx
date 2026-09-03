import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Plus, Save, X } from "lucide-react";
import { AdminPageHeader } from "@/components/portal/AdminPageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  adminGetPublicBudgetSnapshotSettingsFromSupabase,
  adminGetPublicBudgetSourcesFromSupabase,
  adminSavePublicBudgetSnapshotSettingsInSupabase,
  adminSavePublicBudgetSourcesInSupabase,
} from "@/lib/lydo-connect-supabase";
import type { PublicBudgetSnapshotSettings } from "@/lib/lydo-connect-data";

type DraftSource = { amount: string; purpose: string };

const CURRENT_YEAR = new Date().getFullYear();
const FISCAL_YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];

const DEFAULT_SETTINGS: PublicBudgetSnapshotSettings = {
  defaultFiscalYear: CURRENT_YEAR,
  allowFiscalYearSwitch: false,
  showUtilizationProgress: true,
  showTotalFyBudget: true,
  showApprovedBudget: true,
  showReleasedBudget: true,
  showLiquidatedBudget: true,
  showAllocationBreakdown: true,
  updatedAt: "",
};

const formatPeso = (value: number) => `₱${Math.round(value).toLocaleString()}`;

const SNAPSHOT_COMPONENT_TOGGLES: {
  key: keyof Pick<
    PublicBudgetSnapshotSettings,
    | "showUtilizationProgress"
    | "showTotalFyBudget"
    | "showApprovedBudget"
    | "showReleasedBudget"
    | "showLiquidatedBudget"
    | "showAllocationBreakdown"
  >;
  label: string;
  description: string;
}[] = [
  { key: "showUtilizationProgress", label: "Budget Utilization Progress", description: "The liquidated / active-in-field / remaining-headroom progress bar." },
  { key: "showTotalFyBudget", label: "Total FY Budget", description: "Total annual allocation for the selected fiscal year." },
  { key: "showApprovedBudget", label: "Approved Budget", description: "Total approved and pending-disbursement amount." },
  { key: "showReleasedBudget", label: "Released Budget", description: "Total disbursed to organizations, active in the field." },
  { key: "showLiquidatedBudget", label: "Liquidated Budget", description: "Total audited and cleared with official receipts." },
  { key: "showAllocationBreakdown", label: "Budget Allocation Breakdown", description: "Chart showing what portion of the total goes to each purpose (from the FY Budget Allocation entries above)." },
];

export const PublicBudgetSnapshotConfigPage = ({ onBack }: { onBack: () => void }) => {
  const [sourcesFiscalYear, setSourcesFiscalYear] = useState(CURRENT_YEAR);
  const [draftSources, setDraftSources] = useState<DraftSource[]>([{ amount: "", purpose: "" }]);
  const [draftSettings, setDraftSettings] = useState<PublicBudgetSnapshotSettings>(DEFAULT_SETTINGS);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;
    void adminGetPublicBudgetSnapshotSettingsFromSupabase()
      .then((settings) => {
        if (!isActive || !settings) return;
        setDraftSettings(settings);
      })
      .catch((error) => console.error("Unable to load public budget snapshot settings:", error));
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    setIsLoadingSources(true);
    void adminGetPublicBudgetSourcesFromSupabase(sourcesFiscalYear)
      .then((sources) => {
        if (!isActive) return;
        setDraftSources(
          sources.length
            ? sources.map((source) => ({ amount: String(source.amount), purpose: source.purpose }))
            : [{ amount: "", purpose: "" }],
        );
      })
      .catch((error) => console.error("Unable to load public budget sources:", error))
      .finally(() => {
        if (isActive) setIsLoadingSources(false);
      });
    return () => {
      isActive = false;
    };
  }, [sourcesFiscalYear]);

  const totalFyBudget = draftSources.reduce((sum, source) => sum + (Number(source.amount) || 0), 0);

  const handleSourceChange = (index: number, patch: Partial<DraftSource>) => {
    setDraftSources((current) => current.map((source, i) => (i === index ? { ...source, ...patch } : source)));
  };

  const handleRemoveSource = (index: number) => {
    setDraftSources((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current));
  };

  const handleAddSource = () => {
    setDraftSources((current) => [...current, { amount: "", purpose: "" }]);
  };

  const handleToggleChange = (key: (typeof SNAPSHOT_COMPONENT_TOGGLES)[number]["key"], value: boolean) => {
    setDraftSettings((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await adminSavePublicBudgetSourcesInSupabase(
        sourcesFiscalYear,
        draftSources
          .filter((source) => source.purpose.trim() || Number(source.amount) > 0)
          .map((source, index) => ({ amount: Number(source.amount) || 0, purpose: source.purpose.trim(), sortOrder: index })),
      );
      const savedSettings = await adminSavePublicBudgetSnapshotSettingsInSupabase(draftSettings);
      setDraftSettings(savedSettings);
      toast({ title: "Changes saved", description: "The Public Portal's Budget Monitoring snapshot has been updated." });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unable to save these changes right now.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm text-text-default transition-colors hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4 shrink-0 text-text-default" strokeWidth={1.6} />
        Back to Budget Monitoring
      </button>

      <AdminPageHeader
        title="Configure Public Budget Snapshot"
        description="Choose what appears on the Public Portal's Budget Monitoring page."
        action={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm text-text-default transition-colors hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4 shrink-0 text-text-default" strokeWidth={1.6} />
              Preview Public Page
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSave()}
              className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover disabled:opacity-50"
            >
              <Save className="h-4 w-4 shrink-0 text-public-text-neutral-on-neutral" strokeWidth={1.6} />
              {isSaving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 rounded-md border border-slate-300 bg-admin-surface p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="font-segoe text-lg font-semibold leading-none text-text-default">Budget Allocation</p>
                <p className="font-segoe text-[13px] font-normal leading-[140%] text-slate-500">
                  Enter the budget source(s) available this fiscal year and what each is for. These feed the Total FY Budget figure — add as many as apply.
                </p>
              </div>
              <Select value={String(sourcesFiscalYear)} onValueChange={(value) => setSourcesFiscalYear(Number(value))}>
                <SelectTrigger className="h-10 w-[110px] shrink-0 border-slate-300 font-segoe text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FISCAL_YEAR_OPTIONS.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      FY {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3">
              {isLoadingSources ? (
                <p className="py-4 text-center font-segoe text-xs text-slate-500">Loading budget sources…</p>
              ) : (
                draftSources.map((source, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <label className="font-segoe text-xs font-normal text-slate-500">Amount</label>
                    <div className="flex h-10 items-center gap-1 rounded-md border border-slate-300 bg-admin-surface px-3">
                      <span className="font-cascadia text-sm text-slate-500">₱</span>
                      <input
                        type="number"
                        min={0}
                        value={source.amount}
                        onChange={(event) => handleSourceChange(index, { amount: event.target.value })}
                        placeholder="0.00"
                        className="w-full border-0 bg-transparent p-0 font-cascadia text-sm text-text-default outline-none placeholder:text-text-disabled"
                      />
                    </div>
                  </div>
                  <div className="flex flex-[2] flex-col gap-1.5">
                    <label className="font-segoe text-xs font-normal text-slate-500">Purpose / What it&rsquo;s for</label>
                    <input
                      type="text"
                      value={source.purpose}
                      onChange={(event) => handleSourceChange(index, { purpose: event.target.value })}
                      placeholder="e.g. Program & Activity Support"
                      className="h-10 w-full rounded-md border border-slate-300 bg-admin-surface px-3 font-segoe text-sm text-text-default outline-none placeholder:text-text-disabled"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label="Remove budget source"
                    disabled={draftSources.length <= 1}
                    onClick={() => handleRemoveSource(index)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="h-4 w-4" strokeWidth={1.6} />
                  </button>
                </div>
                ))
              )}

              <button
                type="button"
                onClick={handleAddSource}
                className="flex h-[52px] w-full items-center justify-center gap-3 rounded-md border border-dashed border-slate-300 bg-admin-surface p-4 font-segoe text-public-fs-body-sm font-normal text-public-text-brand transition-colors hover:bg-slate-50"
              >
                <Plus className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                Add Budget Source
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-slate-300 pt-4">
              <p className="font-segoe text-sm font-normal text-slate-500">Total FY Budget</p>
              <p className="font-cascadia text-lg font-bold text-text-default">{formatPeso(totalFyBudget)}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-md border border-slate-300 bg-admin-surface p-6">
            <div className="flex flex-col gap-1">
              <p className="font-segoe text-lg font-semibold leading-none text-text-default">Snapshot Components</p>
              <p className="font-segoe text-[13px] font-normal leading-[140%] text-slate-500">
                Turn sections on or off for the public-facing page. Internal admin data is unaffected either way.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {SNAPSHOT_COMPONENT_TOGGLES.map((toggle) => (
                <div key={toggle.key} className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-segoe text-sm font-semibold text-text-default">{toggle.label}</p>
                    <p className="font-segoe text-xs font-normal text-slate-500">{toggle.description}</p>
                  </div>
                  <Switch
                    checked={draftSettings[toggle.key]}
                    onCheckedChange={(checked) => handleToggleChange(toggle.key, checked)}
                    className="data-[state=checked]:bg-border-info-tertiary"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 rounded-md border border-slate-300 bg-admin-surface p-6">
            <div className="flex flex-col gap-1">
              <p className="font-segoe text-lg font-semibold leading-none text-text-default">Default View</p>
              <p className="font-segoe text-[13px] font-normal leading-[140%] text-slate-500">
                Controls what visitors see when they first land on the public page.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="font-segoe text-sm font-semibold text-text-default">Default fiscal year</p>
              <Select
                value={draftSettings.defaultFiscalYear !== null ? String(draftSettings.defaultFiscalYear) : String(CURRENT_YEAR)}
                onValueChange={(value) => setDraftSettings((current) => ({ ...current, defaultFiscalYear: Number(value) }))}
              >
                <SelectTrigger className="h-10 w-[160px] border-slate-300 font-segoe text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FISCAL_YEAR_OPTIONS.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      FY {year}
                      {year === CURRENT_YEAR ? " (Latest)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="font-segoe text-sm font-semibold text-text-default">Let organizations switch fiscal year</p>
              <Switch
                checked={draftSettings.allowFiscalYearSwitch}
                onCheckedChange={(checked) => setDraftSettings((current) => ({ ...current, allowFiscalYearSwitch: checked }))}
                className="data-[state=checked]:bg-border-info-tertiary"
              />
            </div>
          </div>

          <div className="rounded-md border border-slate-300 bg-admin-surface p-4">
            <div className="flex items-start gap-2 rounded-md border border-brand-info-border bg-brand-info-subtle px-4 py-3">
              <p className="font-segoe text-[13px] leading-[140%] text-public-text-brand">
                <span className="font-bold">Heads up:</span> These settings control the Public tab of Budget Monitoring
                only. Nothing here changes what admins or organizations see inside Y-TRACE.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
