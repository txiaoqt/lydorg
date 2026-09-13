import { useState, useEffect } from "react";
import { Coins, Loader2, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { adminSaveAnnualBudgetAllocationInSupabase } from "@/lib/lydo-connect-supabase";
import type { AnnualBudgetAllocation } from "@/lib/lydo-connect-data";

type ConfigureAnnualBudgetModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fiscalYear: number;
  existingAllocation: AnnualBudgetAllocation | null;
  onSaved: (allocation: AnnualBudgetAllocation) => void;
};

const formatCurrencyPreview = (val: number): string => {
  if (Number.isNaN(val) || !Number.isFinite(val)) return "₱0.00";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

export const ConfigureAnnualBudgetModal = ({
  open,
  onOpenChange,
  fiscalYear,
  existingAllocation,
  onSaved,
}: ConfigureAnnualBudgetModalProps) => {
  const [amountStr, setAmountStr] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingAllocation) {
        setAmountStr(String(existingAllocation.totalAmount));
        setNotes(existingAllocation.statutoryBaselineNotes || "");
        setIsActive(existingAllocation.isActive);
      } else {
        setAmountStr("");
        setNotes("");
        setIsActive(true);
      }
      setErrorMsg(null);
    }
  }, [open, existingAllocation]);

  const parsedAmount = Number(amountStr);
  const isAmountValid = !Number.isNaN(parsedAmount) && parsedAmount >= 0 && amountStr.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAmountValid) {
      setErrorMsg("Please provide a valid, non-negative budget allocation amount.");
      return;
    }

    if (parsedAmount > 50000000000) {
      setErrorMsg("The budget amount exceeds the reasonable institutional threshold (₱50 Billion).");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const saved = await adminSaveAnnualBudgetAllocationInSupabase({
        fiscalYear,
        totalAmount: parsedAmount,
        statutoryBaselineNotes: notes.trim() || null,
        isActive,
      });

      toast({
        title: existingAllocation ? "Allocation Updated" : "Allocation Configured",
        description: `Annual budget allocation for FY ${fiscalYear} successfully set to ${formatCurrencyPreview(parsedAmount)}.`,
      });

      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save the annual budget allocation.";
      setErrorMsg(message);
      toast({
        title: "Configuration Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-xl border border-slate-300 bg-admin-surface p-0 shadow-lg">
        <DialogHeader className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2 text-public-text-brand">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-public-bg-secondary-100 text-public-text-brand">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="font-segoe text-lg font-bold text-text-default">
                {existingAllocation ? `Edit FY ${fiscalYear} Budget Allocation` : `Configure FY ${fiscalYear} Budget Allocation`}
              </DialogTitle>
              <DialogDescription className="font-segoe text-xs text-slate-500">
                Establish the statutory annual youth funding baseline for the Local Youth Development Office.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {errorMsg ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 font-segoe text-xs text-red-700">
              {errorMsg}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="font-segoe text-xs font-semibold text-text-default">Fiscal Year</label>
            <div className="flex h-10 w-full items-center rounded-md border border-slate-200 bg-slate-50 px-3 font-cascadia text-sm font-bold text-text-default">
              FY {fiscalYear}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="budget-amount" className="font-segoe text-xs font-semibold text-text-default">
              Total FY Allocation Amount (₱) <span className="text-red-500">*</span>
            </label>
            <input
              id="budget-amount"
              type="number"
              min="0"
              step="any"
              required
              placeholder="e.g. 50000000"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 font-cascadia text-sm font-semibold text-text-default outline-none transition-colors focus:border-public-bg-brand"
            />
            {amountStr.trim() !== "" && !Number.isNaN(parsedAmount) ? (
              <p className="font-cascadia text-xs font-semibold text-public-text-brand">
                Preview: {formatCurrencyPreview(parsedAmount)}
              </p>
            ) : (
              <p className="font-segoe text-[11px] text-slate-500">
                Enter the approved statutory budget ceiling appropriated for youth PPAs in this fiscal year.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="statutory-notes" className="font-segoe text-xs font-semibold text-text-default">
              Statutory Baseline Notes / Authority
            </label>
            <textarea
              id="statutory-notes"
              rows={3}
              placeholder="e.g. City Ordinance No. 2026-XX, Approved LYDO Youth Development Fund Appropriation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex w-full rounded-md border border-slate-300 bg-white p-3 font-segoe text-xs text-text-default outline-none transition-colors focus:border-public-bg-brand placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-col">
              <span className="font-segoe text-xs font-semibold text-text-default">Active Allocation</span>
              <span className="font-segoe text-[11px] text-slate-500">
                Mark as the authoritative active budget for monitoring and headroom calculation.
              </span>
            </div>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-public-bg-brand focus:ring-public-bg-brand"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => onOpenChange(false)}
              className="flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 font-segoe text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !isAmountValid}
              className="flex h-10 items-center justify-center gap-2 rounded-md bg-public-bg-brand px-5 py-2 font-segoe text-xs font-semibold text-white transition-colors hover:bg-bg-brand-hover disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {existingAllocation ? "Save Changes" : "Save Allocation"}
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
