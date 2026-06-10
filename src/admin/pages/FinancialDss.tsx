import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Filter, Plus, RefreshCw, Search } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DataTable } from "../components/DataTable";
import { Barangay, BarangayFinancialRow } from "../types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

type FinancialRow = BarangayFinancialRow & { barangay_name: string };
type Option = { id: string; name: string };
type BudgetRow = {
  id: string;
  barangay_id: string;
  barangay_name: string;
  fiscal_year: number;
  total_budget: number;
  row_count: number;
};
type BudgetOverviewRow = {
  id: string;
  barangay_name: string;
  total_budget: number;
  utilized_amount: number;
  remaining_budget: number;
  utilization_rate: number;
};
type FinancialForm = {
  barangayId: string;
  fiscalYear: string;
  monthNo: string;
  totalBudget: string;
  allocatedAmount: string;
  utilizedAmount: string;
};
type BudgetForm = {
  barangayId: string;
  fiscalYear: string;
  totalBudget: string;
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const financialDefaults: FinancialForm = {
  barangayId: "", fiscalYear: String(new Date().getFullYear()), monthNo: String(new Date().getMonth() + 1),
  totalBudget: "0", allocatedAmount: "0", utilizedAmount: "0",
};
const budgetDefaults: BudgetForm = {
  barangayId: "",
  fiscalYear: String(new Date().getFullYear()),
  totalBudget: "0",
};

const asCurrency = (value: number) => `PHP ${Number(value || 0).toLocaleString()}`;
const budgetKey = (barangayId: string, fiscalYear: number | string) => `${barangayId}::${fiscalYear}`;

export const FinancialDss = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [financialRows, setFinancialRows] = useState<FinancialRow[]>([]);
  const [barangayOptions, setBarangayOptions] = useState<Option[]>([]);
  const [financialSearch, setFinancialSearch] = useState("");
  const [analyticsYear, setAnalyticsYear] = useState<number>(new Date().getFullYear());
  const [showFinancialFilters, setShowFinancialFilters] = useState(false);
  const [financialYearFilter, setFinancialYearFilter] = useState("all");
  const [financialBarangayFilter, setFinancialBarangayFilter] = useState("all");
  const [financialMonthFilter, setFinancialMonthFilter] = useState("all");

  const [isFinancialDialog, setIsFinancialDialog] = useState(false);
  const [editingFinancial, setEditingFinancial] = useState<FinancialRow | null>(null);
  const [viewingFinancial, setViewingFinancial] = useState<FinancialRow | null>(null);
  const [isFinancialDetailsOpen, setIsFinancialDetailsOpen] = useState(false);
  const [financialForm, setFinancialForm] = useState<FinancialForm>(financialDefaults);
  const [isSavingFinancial, setIsSavingFinancial] = useState(false);
  const [deletingFinancial, setDeletingFinancial] = useState<FinancialRow | null>(null);
  const [isDeletingFinancial, setIsDeletingFinancial] = useState(false);
  const [isBudgetDialog, setIsBudgetDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetRow | null>(null);
  const [budgetForm, setBudgetForm] = useState<BudgetForm>(budgetDefaults);
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      setFinancialRows([]);
      setBarangayOptions([]);
      setIsLoading(false);
      return;
    }

    const [financialResp, barangayResp] = await Promise.all([
      supabase.from("barangay_financials").select("*,barangays(name)").order("fiscal_year", { ascending: false }).order("month_no", { ascending: false }),
      supabase.from("barangays").select("id,name").order("name", { ascending: true }),
    ]);

    const err = financialResp.error || barangayResp.error;
    if (err) { toast({ title: "Load Failed", description: err.message }); setIsLoading(false); return; }

    setFinancialRows(((financialResp.data ?? []) as Array<BarangayFinancialRow & { barangays?: { name?: string } | Array<{ name?: string }> }>).map((row) => {
      const b = Array.isArray(row.barangays) ? row.barangays[0] : row.barangays;
      return { ...row, barangay_name: b?.name ?? "Unknown Barangay" };
    }));
    const bs = (barangayResp.data ?? []) as Barangay[];
    setBarangayOptions(bs.map((b) => ({ id: b.id, name: b.name })));
    setIsLoading(false);
  };

  useEffect(() => { void loadData(); }, []);

  const availableYears = useMemo(
    () => Array.from(new Set(financialRows.map((row) => row.fiscal_year))).sort((a, b) => b - a),
    [financialRows],
  );

  useEffect(() => {
    if (availableYears.length === 0) return;
    setAnalyticsYear((current) => (availableYears.includes(current) ? current : availableYears[0]));
  }, [availableYears]);

  const totalBudgetByKey = useMemo(() => {
    const map = new Map<string, number>();
    const countMap = new Map<string, number>();
    const sorted = [...financialRows].sort((a, b) => {
      if (a.fiscal_year !== b.fiscal_year) return b.fiscal_year - a.fiscal_year;
      return b.month_no - a.month_no;
    });
    for (const row of sorted) {
      const key = budgetKey(row.barangay_id, row.fiscal_year);
      if (!map.has(key)) {
        map.set(key, Number(row.sk_budget ?? 0));
      }
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }
    return { map, countMap };
  }, [financialRows]);

  const resolveBudgetFromDashboard = (barangayId: string, fiscalYear: string | number) => {
    const year = Number(fiscalYear);
    if (!barangayId || !Number.isInteger(year)) return 0;
    return totalBudgetByKey.map.get(budgetKey(barangayId, year)) ?? 0;
  };

  const budgetRows = useMemo<BudgetRow[]>(() => {
    const barangayNameById = new Map(barangayOptions.map((option) => [option.id, option.name]));
    return Array.from(totalBudgetByKey.map.entries())
      .map(([key, totalBudget]) => {
        const [barangayId, fiscalYearText] = key.split("::");
        const fiscalYear = Number(fiscalYearText);
        return {
          id: key,
          barangay_id: barangayId,
          barangay_name: barangayNameById.get(barangayId) ?? "Unknown Barangay",
          fiscal_year: fiscalYear,
          total_budget: totalBudget,
          row_count: totalBudgetByKey.countMap.get(key) ?? 0,
        };
      })
      .sort((a, b) => {
        if (a.barangay_name !== b.barangay_name) return a.barangay_name.localeCompare(b.barangay_name);
        return b.fiscal_year - a.fiscal_year;
      });
  }, [barangayOptions, totalBudgetByKey]);

  const openCreateFinancialDialog = () => {
    setEditingFinancial(null);
    setFinancialForm(financialDefaults);
    setIsFinancialDialog(true);
  };

  const openEditFinancialDialog = (row: FinancialRow) => {
    const totalBudget = resolveBudgetFromDashboard(row.barangay_id, row.fiscal_year) || Number(row.sk_budget ?? 0);
    setEditingFinancial(row);
    setFinancialForm({
      barangayId: row.barangay_id,
      fiscalYear: String(row.fiscal_year),
      monthNo: String(row.month_no),
      totalBudget: String(totalBudget),
      allocatedAmount: String(row.allocated_amount ?? 0),
      utilizedAmount: String(row.utilized_amount ?? 0),
    });
    setIsFinancialDialog(true);
  };
  const openFinancialDetails = (row: FinancialRow) => {
    setViewingFinancial(row);
    setIsFinancialDetailsOpen(true);
  };

  const openCreateBudgetDialog = () => {
    setEditingBudget(null);
    setBudgetForm(budgetDefaults);
    setIsBudgetDialog(true);
  };

  const openEditBudgetDialog = (row: BudgetRow) => {
    setEditingBudget(row);
    setBudgetForm({
      barangayId: row.barangay_id,
      fiscalYear: String(row.fiscal_year),
      totalBudget: String(row.total_budget),
    });
    setIsBudgetDialog(true);
  };

  const saveFinancial = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !financialForm.barangayId) return;
    const fy = Number(financialForm.fiscalYear);
    const month = Number(financialForm.monthNo);
    const totalBudget = Number(financialForm.totalBudget);
    const allocated = Number(financialForm.allocatedAmount);
    const utilized = Number(financialForm.utilizedAmount);
    if (!Number.isInteger(fy) || fy < 2000 || fy > 2100) { toast({ title: "Invalid Fiscal Year", description: "Fiscal year must be 2000-2100." }); return; }
    if (!Number.isInteger(month) || month < 1 || month > 12) { toast({ title: "Invalid Month", description: "Month must be 1-12." }); return; }
    if ([totalBudget, allocated, utilized].some((n) => !Number.isFinite(n) || n < 0)) { toast({ title: "Invalid Amount", description: "All amounts must be non-negative numbers." }); return; }
    if (allocated > totalBudget) {
      toast({ title: "Invalid Allocation", description: "Allocated amount cannot exceed total budget." });
      return;
    }
    if (utilized > allocated) {
      toast({ title: "Invalid Utilization", description: "Utilized amount cannot exceed allocated amount." });
      return;
    }
    setIsSavingFinancial(true);
    const payload = {
      barangay_id: financialForm.barangayId,
      fiscal_year: fy,
      month_no: month,
      sk_budget: totalBudget,
      allocated_amount: allocated,
      utilized_amount: utilized,
    };
    const resp = editingFinancial
      ? await supabase.from("barangay_financials").update(payload).eq("id", editingFinancial.id)
      : await supabase.from("barangay_financials").insert(payload);
    setIsSavingFinancial(false);
    if (resp.error) { toast({ title: "Save Failed", description: resp.error.code === "23505" ? "Duplicate row for this barangay, fiscal year and month." : resp.error.message }); return; }
    setIsFinancialDialog(false); setEditingFinancial(null); setFinancialForm(financialDefaults); toast({ title: "Saved", description: "Financial row saved." }); void loadData();
  };

  const saveBudget = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !budgetForm.barangayId) return;

    const fy = Number(budgetForm.fiscalYear);
    const totalBudget = Number(budgetForm.totalBudget);

    if (!Number.isInteger(fy) || fy < 2000 || fy > 2100) {
      toast({ title: "Invalid Fiscal Year", description: "Fiscal year must be 2000-2100." });
      return;
    }
    if (!Number.isFinite(totalBudget) || totalBudget < 0) {
      toast({ title: "Invalid Amount", description: "Total budget must be a non-negative number." });
      return;
    }

    setIsSavingBudget(true);

    const existingResp = await supabase
      .from("barangay_financials")
      .select("id,allocated_amount")
      .eq("barangay_id", budgetForm.barangayId)
      .eq("fiscal_year", fy);

    if (existingResp.error) {
      setIsSavingBudget(false);
      toast({ title: "Save Failed", description: existingResp.error.message });
      return;
    }

    const existingRows = existingResp.data ?? [];

    const exceedsBudget = existingRows.some((row) => Number(row.allocated_amount ?? 0) > totalBudget);
    if (exceedsBudget) {
      setIsSavingBudget(false);
      toast({
        title: "Invalid Budget",
        description: "Total budget cannot be lower than an existing allocated amount for this barangay and fiscal year.",
      });
      return;
    }

    let mutationError: string | null = null;
    if (existingRows.length === 0) {
      const insertResp = await supabase.from("barangay_financials").insert({
        barangay_id: budgetForm.barangayId,
        fiscal_year: fy,
        month_no: 1,
        sk_budget: totalBudget,
        allocated_amount: 0,
        utilized_amount: 0,
      });
      mutationError = insertResp.error?.message ?? null;
    } else {
      const updateResp = await supabase
        .from("barangay_financials")
        .update({ sk_budget: totalBudget })
        .eq("barangay_id", budgetForm.barangayId)
        .eq("fiscal_year", fy);
      mutationError = updateResp.error?.message ?? null;
    }

    setIsSavingBudget(false);
    if (mutationError) {
      toast({ title: "Save Failed", description: mutationError });
      return;
    }

    toast({
      title: "Total Budget Updated",
      description:
        existingRows.length === 0
          ? "Budget saved with an initial month row. You can now edit or add monthly rows."
          : "Budget was applied to all matching financial rows.",
    });
    setIsBudgetDialog(false);
    setEditingBudget(null);
    setBudgetForm(budgetDefaults);
    void loadData();
  };

  const deleteFinancial = async () => {
    if (!supabase || !deletingFinancial) return;
    setIsDeletingFinancial(true);
    const resp = await supabase.from("barangay_financials").delete().eq("id", deletingFinancial.id);
    setIsDeletingFinancial(false);
    if (resp.error) { toast({ title: "Delete Failed", description: resp.error.message }); return; }
    setDeletingFinancial(null); toast({ title: "Deleted", description: "Financial row deleted." }); void loadData();
  };

  const availableMonths = useMemo(
    () => Array.from(new Set(financialRows.map((row) => row.month_no))).sort((a, b) => a - b),
    [financialRows],
  );

  const filteredFinancial = useMemo(
    () =>
      financialRows.filter((r) => {
        const q = financialSearch.trim().toLowerCase();
        const monthLabel = MONTH_NAMES[Math.max(0, Math.min(11, r.month_no - 1))] ?? String(r.month_no);
        const matchesSearch =
          q.length === 0
            ? true
            : r.barangay_name.toLowerCase().includes(q) ||
              String(r.fiscal_year).includes(q) ||
              String(r.month_no).includes(q) ||
              monthLabel.toLowerCase().includes(q);
        const matchesYear = financialYearFilter === "all" ? true : String(r.fiscal_year) === financialYearFilter;
        const matchesBarangay = financialBarangayFilter === "all" ? true : r.barangay_id === financialBarangayFilter;
        const matchesMonth = financialMonthFilter === "all" ? true : String(r.month_no) === financialMonthFilter;
        return matchesSearch && matchesYear && matchesBarangay && matchesMonth;
      }),
    [financialRows, financialSearch, financialYearFilter, financialBarangayFilter, financialMonthFilter],
  );
  const rowsForSelectedYear = useMemo(() => financialRows.filter((r) => r.fiscal_year === analyticsYear), [financialRows, analyticsYear]);
  const monthlyTrend = useMemo(() => {
    const trendMap = new Map<number, { allocated: number; utilized: number }>();
    rowsForSelectedYear.forEach((row) => {
      const prev = trendMap.get(row.month_no) ?? { allocated: 0, utilized: 0 };
      trendMap.set(row.month_no, {
        allocated: prev.allocated + Number(row.allocated_amount ?? 0),
        utilized: prev.utilized + Number(row.utilized_amount ?? 0),
      });
    });
    return Array.from(trendMap.entries()).sort((a, b) => a[0] - b[0]).map(([monthNo, values]) => ({
      month: MONTH_NAMES[Math.max(0, Math.min(11, monthNo - 1))] ?? `M${monthNo}`,
      allocated: values.allocated,
      utilized: values.utilized,
    }));
  }, [rowsForSelectedYear]);
  const budgetOverviewRows = useMemo<BudgetOverviewRow[]>(() => {
    const latestRows = new Map<string, FinancialRow>();
    rowsForSelectedYear.forEach((row) => {
      const existing = latestRows.get(row.barangay_id);
      if (!existing || row.month_no > existing.month_no) {
        latestRows.set(row.barangay_id, row);
      }
    });

    return Array.from(latestRows.values())
      .map((row) => {
        const totalBudget = resolveBudgetFromDashboard(row.barangay_id, analyticsYear);
        const utilizedAmount = Number(row.utilized_amount ?? 0);
        const remainingBudget = Math.max(totalBudget - utilizedAmount, 0);
        const utilizationRate = totalBudget > 0 ? Math.round((utilizedAmount / totalBudget) * 100) : 0;
        return {
          id: row.barangay_id,
          barangay_name: row.barangay_name,
          total_budget: totalBudget,
          utilized_amount: utilizedAmount,
          remaining_budget: remainingBudget,
          utilization_rate: utilizationRate,
        };
      })
      .sort((a, b) => b.utilization_rate - a.utilization_rate);
  }, [rowsForSelectedYear, analyticsYear, totalBudgetByKey]);
  const summary = useMemo(() => {
    const totalBudget = budgetOverviewRows.reduce((sum, row) => sum + row.total_budget, 0);
    const totalUtilized = budgetOverviewRows.reduce((sum, row) => sum + row.utilized_amount, 0);
    const remainingBudget = Math.max(totalBudget - totalUtilized, 0);
    const utilizationRate = totalBudget > 0 ? Math.round((totalUtilized / totalBudget) * 100) : 0;
    return { totalBudget, totalUtilized, remainingBudget, utilizationRate };
  }, [budgetOverviewRows]);
  const formTotalBudget = Number(financialForm.totalBudget || 0);
  const formAllocated = Number(financialForm.allocatedAmount || 0);
  const formUtilized = Number(financialForm.utilizedAmount || 0);
  const remainingAfterUtilization = Number.isFinite(formTotalBudget) && Number.isFinite(formUtilized)
    ? formTotalBudget - formUtilized
    : 0;

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const buildFinancialRowsHtml = (rows: FinancialRow[]) =>
    rows
      .map((row) => {
        const monthLabel = MONTH_NAMES[Math.max(0, Math.min(11, row.month_no - 1))] ?? String(row.month_no);
        return `
          <tr>
            <td>${escapeHtml(row.barangay_name)}</td>
            <td>${escapeHtml(String(row.fiscal_year))}</td>
            <td>${escapeHtml(monthLabel)}</td>
            <td>${escapeHtml(asCurrency(Number(row.sk_budget ?? 0)))}</td>
            <td>${escapeHtml(asCurrency(Number(row.allocated_amount ?? 0)))}</td>
            <td>${escapeHtml(asCurrency(Number(row.utilized_amount ?? 0)))}</td>
            <td>${escapeHtml(asCurrency(Math.max(Number(row.sk_budget ?? 0) - Number(row.utilized_amount ?? 0), 0)))}</td>
            <td>${escapeHtml(asCurrency(Math.max(Number(row.allocated_amount ?? 0) - Number(row.utilized_amount ?? 0), 0)))}</td>
          </tr>
        `;
      })
      .join("");

  const exportFinancialExcel = () => {
    if (filteredFinancial.length === 0) {
      toast({ title: "No Data", description: "No financial rows available to export." });
      return;
    }

    const generatedAt = new Date().toLocaleString();
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #3D3D3D; }
            h1 { font-size: 20px; margin: 0 0 8px 0; }
            p { margin: 0 0 12px 0; color: #777777; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th, td { border: 1px solid #DEDEDE; padding: 8px; text-align: left; }
            th { background: #F2F2F0; font-weight: 700; }
            tr:nth-child(even) { background: #FAFAFA; }
          </style>
        </head>
        <body>
          <h1>Financial Reports - Filtered Financial Rows</h1>
          <p>Generated: ${escapeHtml(generatedAt)}</p>
          <table>
            <thead>
              <tr>
                <th>Barangay</th>
                <th>Fiscal Year</th>
                <th>Month</th>
                <th>Total Budget</th>
                <th>Allocated</th>
                <th>Utilized</th>
                <th>Remaining (SK Budget - Utilized)</th>
                <th>Not Utilized (Allocated - Utilized)</th>
              </tr>
            </thead>
            <tbody>
              ${buildFinancialRowsHtml(filteredFinancial)}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financial-rows-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Formatted Excel file downloaded." });
  };

  const exportFinancialPdf = () => {
    if (filteredFinancial.length === 0) {
      toast({ title: "No Data", description: "No financial rows available to export." });
      return;
    }

    const generatedAt = new Date().toLocaleString();
    const html = `
      <html>
        <head>
          <title>Financial Reports Export</title>
          <style>
            body { font-family: Arial, sans-serif; color: #3D3D3D; padding: 20px; }
            h1 { font-size: 20px; margin: 0 0 8px 0; }
            p { margin: 0 0 12px 0; color: #777777; }
            table { border-collapse: collapse; width: 100%; font-size: 11px; }
            th, td { border: 1px solid #DEDEDE; padding: 7px; text-align: left; }
            th { background: #F2F2F0; font-weight: 700; }
            tr:nth-child(even) { background: #FAFAFA; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>Financial Reports - Filtered Financial Rows</h1>
          <p>Generated: ${escapeHtml(generatedAt)}</p>
          <table>
            <thead>
              <tr>
                <th>Barangay</th>
                <th>Fiscal Year</th>
                <th>Month</th>
                <th>Total Budget</th>
                <th>Allocated</th>
                <th>Utilized</th>
                <th>Remaining (SK Budget - Utilized)</th>
                <th>Not Utilized (Allocated - Utilized)</th>
              </tr>
            </thead>
            <tbody>
              ${buildFinancialRowsHtml(filteredFinancial)}
            </tbody>
          </table>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
    if (!printWindow) {
      toast({ title: "Popup Blocked", description: "Allow popups to export PDF." });
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Financial Reports</h1>
        <p className="text-muted-foreground mt-1 font-medium">
          Finance-only dashboard for budget setup, monthly allocation/utilization tracking, and fiscal-year analytics.
        </p>
      </header>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="dashboard">Overview</TabsTrigger>
          <TabsTrigger value="budget-setup">Budget Setup</TabsTrigger>
          <TabsTrigger value="financial-rows">Financial Rows</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Fiscal Year Summary</h2>
                <p className="text-sm text-muted-foreground">Focused metrics for financial decisions only.</p>
              </div>
              <div className="flex items-end gap-2">
                <div className="space-y-1">
                  <Label>Fiscal Year</Label>
                  <select
                    value={String(analyticsYear)}
                    onChange={(event) => setAnalyticsYear(Number(event.target.value))}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    disabled={availableYears.length === 0}
                  >
                    {availableYears.length === 0 ? (
                      <option value={String(new Date().getFullYear())}>No data</option>
                    ) : (
                      availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <Button type="button" variant="outline" onClick={() => void loadData()} className="gap-2">
                  <RefreshCw size={15} />
                  Refresh
                </Button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Budget</p>
              <p className="mt-2 text-2xl font-bold">{asCurrency(summary.totalBudget)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Utilized</p>
              <p className="mt-2 text-2xl font-bold">{asCurrency(summary.totalUtilized)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Remaining (SK Budget - Utilized)</p>
              <p className="mt-2 text-2xl font-bold">{asCurrency(summary.remainingBudget)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Utilization Rate</p>
              <p className="mt-2 text-2xl font-bold">{summary.utilizationRate}%</p>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold">Monthly Budget Trend (FY {analyticsYear})</h2>
            <p className="text-sm text-muted-foreground mb-3">Allocated vs utilized amount</p>
            <div className="h-64">
              {monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => asCurrency(value)} />
                    <Legend />
                    <Bar dataKey="allocated" name="Allocated" fill="#1A3F7A" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="utilized" name="Utilized" fill="#2460A7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full grid place-items-center text-sm text-muted-foreground">No trend data yet.</div>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">Budget Overview by Barangay (FY {analyticsYear})</h2>
              <p className="text-sm text-muted-foreground">
                Uses latest monthly utilized value per barangay for annual snapshot consistency.
              </p>
            </div>
            <DataTable
              columns={[
                { header: "Barangay", accessor: (row: BudgetOverviewRow) => row.barangay_name },
                { header: "Total Budget", accessor: (row: BudgetOverviewRow) => asCurrency(row.total_budget) },
                { header: "Remaining", accessor: (row: BudgetOverviewRow) => asCurrency(row.remaining_budget) },
                { header: "Utilized", accessor: (row: BudgetOverviewRow) => asCurrency(row.utilized_amount) },
                {
                  header: "Utilization Rate",
                  accessor: (row: BudgetOverviewRow) => (
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        row.utilization_rate >= 80
                          ? "bg-accent/20 text-accent"
                          : row.utilization_rate >= 50
                            ? "bg-warning/20 text-warning"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {row.utilization_rate}%
                    </span>
                  ),
                },
              ]}
              data={budgetOverviewRows}
              isLoading={isLoading}
            />
          </section>
        </TabsContent>

        <TabsContent value="budget-setup" className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">Total Budget Setup</h2>
                <p className="text-sm text-muted-foreground">
                  Set budget per barangay and fiscal year. Financial rows will use this value as read-only.
                </p>
              </div>
              <Button type="button" onClick={openCreateBudgetDialog} className="gap-2">
                <Plus size={16} />
                Set Total Budget
              </Button>
            </div>
          </section>
          <DataTable
            columns={[
              {
                header: "Barangay / Fiscal Year",
                accessor: (row: BudgetRow) => (
                  <div>
                    <p className="font-semibold">{row.barangay_name}</p>
                    <p className="text-xs text-muted-foreground">FY {row.fiscal_year}</p>
                  </div>
                ),
              },
              { header: "Total Budget", accessor: (row: BudgetRow) => asCurrency(row.total_budget) },
              { header: "Rows Covered", accessor: (row: BudgetRow) => row.row_count.toLocaleString() },
            ]}
            data={budgetRows}
            isLoading={isLoading}
            onEdit={openEditBudgetDialog}
          />
        </TabsContent>

        <TabsContent value="financial-rows" className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">Financial Rows</h2>
                <p className="text-sm text-muted-foreground">
                  Monthly entries used by Financial Disclosure and DSS analytics.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={exportFinancialExcel} className="gap-2">
                  <FileSpreadsheet size={16} />
                  Export Excel
                </Button>
                <Button type="button" variant="outline" onClick={exportFinancialPdf} className="gap-2">
                  <FileText size={16} />
                  Export PDF
                </Button>
                <Button type="button" onClick={openCreateFinancialDialog} className="gap-2">
                  <Plus size={16} />
                  Add Financial Row
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={financialSearch}
                  onChange={(e) => setFinancialSearch(e.target.value)}
                  placeholder="Search financial rows..."
                  className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm"
                />
              </div>
              <Button type="button" variant="outline" onClick={() => setShowFinancialFilters((prev) => !prev)} className="gap-2">
                <Filter size={16} />
                Filter
              </Button>
              <Button type="button" variant="outline" onClick={() => void loadData()} className="gap-2">
                <RefreshCw size={16} />
                Refresh Data
              </Button>
            </div>
            {showFinancialFilters && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label>Fiscal Year</Label>
                  <select
                    value={financialYearFilter}
                    onChange={(e) => setFinancialYearFilter(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">All Years</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Barangay</Label>
                  <select
                    value={financialBarangayFilter}
                    onChange={(e) => setFinancialBarangayFilter(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">All Barangays</option>
                    {barangayOptions.map((barangay) => (
                      <option key={barangay.id} value={barangay.id}>
                        {barangay.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Month</Label>
                  <select
                    value={financialMonthFilter}
                    onChange={(e) => setFinancialMonthFilter(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">All Months</option>
                    {availableMonths.map((month) => (
                      <option key={month} value={month}>
                        {MONTH_NAMES[Math.max(0, Math.min(11, month - 1))] ?? month}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFinancialYearFilter("all");
                      setFinancialBarangayFilter("all");
                      setFinancialMonthFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </section>
          <DataTable
            columns={[
              {
                header: "Barangay / Period",
                accessor: (r: FinancialRow) => (
                  <div>
                    <p className="font-semibold">{r.barangay_name}</p>
                    <p className="text-xs text-muted-foreground">
                      FY {r.fiscal_year} - {MONTH_NAMES[r.month_no - 1] ?? r.month_no}
                    </p>
                  </div>
                ),
              },
              { header: "Total Budget", accessor: (r: FinancialRow) => asCurrency(Number(r.sk_budget ?? 0)) },
              { header: "Allocated", accessor: (r: FinancialRow) => asCurrency(Number(r.allocated_amount ?? 0)) },
              {
                header: "Remaining (SK Budget - Utilized)",
                accessor: (r: FinancialRow) => asCurrency(Math.max(Number(r.sk_budget ?? 0) - Number(r.utilized_amount ?? 0), 0)),
              },
              { header: "Utilized", accessor: (r: FinancialRow) => asCurrency(Number(r.utilized_amount ?? 0)) },
              {
                header: "Not Utilized",
                accessor: (r: FinancialRow) => asCurrency(Math.max(Number(r.allocated_amount ?? 0) - Number(r.utilized_amount ?? 0), 0)),
              },
            ]}
            data={filteredFinancial}
            isLoading={isLoading}
            onRowClick={openFinancialDetails}
            getRowAriaLabel={(row) => `Open financial details for ${row.barangay_name} month ${row.month_no}`}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isFinancialDetailsOpen} onOpenChange={setIsFinancialDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Financial Row Details</DialogTitle>
            <DialogDescription>Read-only record view.</DialogDescription>
          </DialogHeader>
          {viewingFinancial && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><p className="text-muted-foreground">Barangay</p><p className="font-medium">{viewingFinancial.barangay_name}</p></div>
                <div><p className="text-muted-foreground">Period</p><p className="font-medium">FY {viewingFinancial.fiscal_year} - {MONTH_NAMES[viewingFinancial.month_no - 1] ?? viewingFinancial.month_no}</p></div>
                <div><p className="text-muted-foreground">Total Budget</p><p className="font-medium">{asCurrency(Number(viewingFinancial.sk_budget ?? 0))}</p></div>
                <div><p className="text-muted-foreground">Allocated</p><p className="font-medium">{asCurrency(Number(viewingFinancial.allocated_amount ?? 0))}</p></div>
                <div><p className="text-muted-foreground">Utilized</p><p className="font-medium">{asCurrency(Number(viewingFinancial.utilized_amount ?? 0))}</p></div>
                <div><p className="text-muted-foreground">Remaining</p><p className="font-medium">{asCurrency(Math.max(Number(viewingFinancial.sk_budget ?? 0) - Number(viewingFinancial.utilized_amount ?? 0), 0))}</p></div>
              </div>
              <DialogFooter className="sm:justify-between">
                <p className="text-xs text-muted-foreground">Read-only record view.</p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsFinancialDetailsOpen(false)}>Close</Button>
                  <Button type="button" onClick={() => { setIsFinancialDetailsOpen(false); openEditFinancialDialog(viewingFinancial); }}>Edit</Button>
                  <Button type="button" variant="destructive" onClick={() => { setIsFinancialDetailsOpen(false); setDeletingFinancial(viewingFinancial); }}>Delete</Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isBudgetDialog} onOpenChange={setIsBudgetDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingBudget ? "Edit Total Budget" : "Set Total Budget"}</DialogTitle>
            <DialogDescription>Applies to all financial rows of the selected barangay and fiscal year.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveBudget} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Barangay</Label>
                <select
                  value={budgetForm.barangayId}
                  onChange={(e) => setBudgetForm((p) => ({ ...p, barangayId: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  required
                >
                  <option value="">Select barangay</option>
                  {barangayOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Fiscal Year</Label>
                <Input
                  type="number"
                  min={2000}
                  max={2100}
                  value={budgetForm.fiscalYear}
                  onChange={(e) => setBudgetForm((p) => ({ ...p, fiscalYear: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Total Budget</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={budgetForm.totalBudget}
                  onChange={(e) => setBudgetForm((p) => ({ ...p, totalBudget: e.target.value }))}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              If no monthly row exists yet, the system will create an initial month entry for this fiscal year.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsBudgetDialog(false)} disabled={isSavingBudget}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingBudget}>
                {isSavingBudget ? "Saving..." : editingBudget ? "Save Budget" : "Set Budget"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isFinancialDialog} onOpenChange={setIsFinancialDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{editingFinancial ? "Edit Financial Row" : "Create Financial Row"}</DialogTitle><DialogDescription>Used by Financial Disclosure and DSS analytics.</DialogDescription></DialogHeader>
          <form onSubmit={saveFinancial} className="space-y-4">
            <div className="space-y-4">
              <div className="rounded-xl border border-border p-4 space-y-4">
                <p className="text-sm font-semibold text-foreground">Editable Inputs</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Barangay</Label>
                    <select
                      value={financialForm.barangayId}
                      onChange={(e) =>
                        setFinancialForm((p) => ({
                          ...p,
                          barangayId: e.target.value,
                          totalBudget: String(resolveBudgetFromDashboard(e.target.value, p.fiscalYear)),
                        }))
                      }
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      required
                    >
                      <option value="">Select barangay</option>
                      {barangayOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fiscal Year</Label>
                    <Input
                      type="number"
                      min={2000}
                      max={2100}
                      value={financialForm.fiscalYear}
                      onChange={(e) =>
                        setFinancialForm((p) => ({
                          ...p,
                          fiscalYear: e.target.value,
                          totalBudget: String(resolveBudgetFromDashboard(p.barangayId, e.target.value)),
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Input type="number" min={1} max={12} value={financialForm.monthNo} onChange={(e) => setFinancialForm((p) => ({ ...p, monthNo: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Allocated Amount</Label>
                    <Input type="number" min={0} step="0.01" value={financialForm.allocatedAmount} onChange={(e) => setFinancialForm((p) => ({ ...p, allocatedAmount: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Utilized Amount</Label>
                    <Input type="number" min={0} step="0.01" value={financialForm.utilizedAmount} onChange={(e) => setFinancialForm((p) => ({ ...p, utilizedAmount: e.target.value }))} required />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 space-y-4">
                <p className="text-sm font-semibold text-foreground">Auto-Computed (Read-only)</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Total Budget (From Overview Setup)</Label>
                    <Input type="number" value={Number.isFinite(formTotalBudget) ? formTotalBudget.toFixed(2) : "0.00"} readOnly className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Remaining Budget (SK Budget - Utilized)</Label>
                    <Input type="number" value={Number.isFinite(remainingAfterUtilization) ? remainingAfterUtilization.toFixed(2) : "0.00"} readOnly className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Allocation Gap (Allocated - Utilized)</Label>
                    <Input
                      type="number"
                      value={Number.isFinite(formAllocated) && Number.isFinite(formUtilized) ? (formAllocated - formUtilized).toFixed(2) : "0.00"}
                      readOnly
                      className="bg-muted/50"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total budget is configured in the "Total Budget Setup" section above.
                </p>
              </div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setIsFinancialDialog(false)} disabled={isSavingFinancial}>Cancel</Button><Button type="submit" disabled={isSavingFinancial}>{isSavingFinancial ? "Saving..." : editingFinancial ? "Save Changes" : "Create Row"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingFinancial)} onOpenChange={(open) => { if (!open) setDeletingFinancial(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Financial Row</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingFinancial
                ? `Are you sure you want to delete ${deletingFinancial.barangay_name} FY ${deletingFinancial.fiscal_year} month ${deletingFinancial.month_no}? This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingFinancial}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteFinancial} disabled={isDeletingFinancial} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
