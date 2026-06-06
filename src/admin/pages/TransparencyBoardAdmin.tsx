import { FormEvent, useEffect, useMemo, useState } from "react";
import { ExternalLink, Plus, Search } from "lucide-react";
import { DataTable } from "../components/DataTable";
import {
  ComplianceBoardStatusRow,
  DocState,
  MonthlyComplianceRow,
  QuarterCode,
  SubmissionState,
} from "../types";
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

type BoardRow = ComplianceBoardStatusRow & { barangay_name: string };
type MonthlyRow = MonthlyComplianceRow & { barangay_name: string; report_doc_code?: string; report_url?: string };
type Option = { id: string; name: string };
type ReportOption = { id: string; doc_code: string; title: string };
type BoardForm = {
  barangayId: string; fiscalYear: string; quarter: QuarterCode;
  cbydp: DocState; abyip: DocState; annualBudget: DocState; rcb: DocState; mil: DocState; remarks: string;
};
type MonthlyForm = {
  barangayId: string; fiscalYear: string; monthNo: string; dueDate: string;
  mfrStatus: SubmissionState; milStatus: SubmissionState; rcbStatus: SubmissionState;
  accomplishmentStatus: SubmissionState; censusStatus: SubmissionState; reportDocumentId: string;
};

const QUARTERS: QuarterCode[] = ["Q1", "Q2", "Q3", "Q4"];
const DOC_STATES: DocState[] = ["ok", "partial", "issue"];
const SUBMISSION_STATES: SubmissionState[] = ["submitted", "late", "missing"];
const DOC_LABEL: Record<DocState, string> = { ok: "Complete", partial: "Partial", issue: "Issue" };
const SUB_LABEL: Record<SubmissionState, string> = { submitted: "Submitted", late: "Late", missing: "Missing" };
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BOARD_REMARK_OPTIONS = [
  "",
  "All required documents submitted.",
  "For follow-up with barangay SK officials.",
  "Pending confirmation from LYDO.",
  "Incomplete uploads this quarter.",
] as const;
const boardDefaults: BoardForm = {
  barangayId: "", fiscalYear: String(new Date().getFullYear()), quarter: "Q1",
  cbydp: "issue", abyip: "issue", annualBudget: "issue", rcb: "issue", mil: "issue", remarks: "",
};
const monthlyDefaults: MonthlyForm = {
  barangayId: "", fiscalYear: String(new Date().getFullYear()), monthNo: String(new Date().getMonth() + 1), dueDate: new Date().toISOString().slice(0, 10),
  mfrStatus: "missing", milStatus: "missing", rcbStatus: "missing", accomplishmentStatus: "missing", censusStatus: "missing", reportDocumentId: "",
};

const completionPercent = (f: MonthlyForm) =>
  Math.round(([
    f.mfrStatus, f.milStatus, f.rcbStatus, f.accomplishmentStatus, f.censusStatus,
  ].filter((s) => s !== "missing").length / 5) * 100);

export const TransparencyBoardAdmin = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [boardRows, setBoardRows] = useState<BoardRow[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<MonthlyRow[]>([]);
  const [barangays, setBarangays] = useState<Option[]>([]);
  const [reportDocs, setReportDocs] = useState<ReportOption[]>([]);
  const [boardSearch, setBoardSearch] = useState("");
  const [monthlySearch, setMonthlySearch] = useState("");
  const [monthlyMonthFilter, setMonthlyMonthFilter] = useState("all");

  const [isBoardDialog, setIsBoardDialog] = useState(false);
  const [editingBoard, setEditingBoard] = useState<BoardRow | null>(null);
  const [boardForm, setBoardForm] = useState<BoardForm>(boardDefaults);
  const [boardRemarkMode, setBoardRemarkMode] = useState<"preset" | "custom">("preset");
  const [boardRemarkPreset, setBoardRemarkPreset] = useState<string>(BOARD_REMARK_OPTIONS[0]);
  const [isSavingBoard, setIsSavingBoard] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState<BoardRow | null>(null);
  const [isDeletingBoard, setIsDeletingBoard] = useState(false);
  const [viewingBoard, setViewingBoard] = useState<BoardRow | null>(null);
  const [isBoardDetailsOpen, setIsBoardDetailsOpen] = useState(false);

  const [isMonthlyDialog, setIsMonthlyDialog] = useState(false);
  const [editingMonthly, setEditingMonthly] = useState<MonthlyRow | null>(null);
  const [monthlyForm, setMonthlyForm] = useState<MonthlyForm>(monthlyDefaults);
  const [isSavingMonthly, setIsSavingMonthly] = useState(false);
  const [deletingMonthly, setDeletingMonthly] = useState<MonthlyRow | null>(null);
  const [isDeletingMonthly, setIsDeletingMonthly] = useState(false);
  const [viewingMonthly, setViewingMonthly] = useState<MonthlyRow | null>(null);
  const [isMonthlyDetailsOpen, setIsMonthlyDetailsOpen] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      setBoardRows([]); setMonthlyRows([]); setBarangays([]); setReportDocs([]); setIsLoading(false); return;
    }
    const [boardResp, monthlyResp, barangayResp, docsResp] = await Promise.all([
      supabase.from("compliance_board_status").select("*,barangays(name)").order("fiscal_year", { ascending: false }).order("quarter", { ascending: false }),
      supabase.from("monthly_compliance").select("*,barangays(name),disclosure_documents(doc_code,public_url,storage_path)").order("fiscal_year", { ascending: false }).order("month_no", { ascending: false }),
      supabase.from("barangays").select("id,name").order("name", { ascending: true }),
      supabase.from("disclosure_documents").select("id,doc_code,title").order("published_date", { ascending: false }).limit(500),
    ]);
    const err = boardResp.error || monthlyResp.error || barangayResp.error || docsResp.error;
    if (err) { toast({ title: "Load Failed", description: err.message }); setIsLoading(false); return; }

    setBoardRows(((boardResp.data ?? []) as Array<ComplianceBoardStatusRow & { barangays?: { name?: string } | Array<{ name?: string }> }>).map((row) => {
      const b = Array.isArray(row.barangays) ? row.barangays[0] : row.barangays;
      return { ...row, barangay_name: b?.name ?? "Unknown Barangay" };
    }));
    setMonthlyRows(((monthlyResp.data ?? []) as Array<MonthlyComplianceRow & {
      barangays?: { name?: string } | Array<{ name?: string }>;
      disclosure_documents?: { doc_code?: string; public_url?: string; storage_path?: string } | Array<{ doc_code?: string; public_url?: string; storage_path?: string }>;
    }>).map((row) => {
      const b = Array.isArray(row.barangays) ? row.barangays[0] : row.barangays;
      const d = Array.isArray(row.disclosure_documents) ? row.disclosure_documents[0] : row.disclosure_documents;
      return { ...row, barangay_name: b?.name ?? "Unknown Barangay", report_doc_code: d?.doc_code, report_url: d?.public_url ?? d?.storage_path };
    }));
    setBarangays((barangayResp.data ?? []) as Option[]);
    setReportDocs((docsResp.data ?? []) as ReportOption[]);
    setIsLoading(false);
  };

  useEffect(() => { void loadData(); }, []);

  const openCreateBoardDialog = () => {
    setEditingBoard(null);
    setBoardForm(boardDefaults);
    setBoardRemarkMode("preset");
    setBoardRemarkPreset(BOARD_REMARK_OPTIONS[0]);
    setIsBoardDialog(true);
  };

  const openEditBoardDialog = (row: BoardRow) => {
    const existingRemarks = (row.remarks ?? "").trim();
    const hasPreset = BOARD_REMARK_OPTIONS.includes(existingRemarks as (typeof BOARD_REMARK_OPTIONS)[number]);
    setEditingBoard(row);
    setBoardForm({
      barangayId: row.barangay_id,
      fiscalYear: String(row.fiscal_year),
      quarter: row.quarter,
      cbydp: row.cbydp,
      abyip: row.abyip,
      annualBudget: row.annual_budget,
      rcb: row.rcb,
      mil: row.mil,
      remarks: existingRemarks,
    });
    if (hasPreset) {
      setBoardRemarkMode("preset");
      setBoardRemarkPreset(existingRemarks);
    } else {
      setBoardRemarkMode("custom");
      setBoardRemarkPreset(BOARD_REMARK_OPTIONS[0]);
    }
    setIsBoardDialog(true);
  };
  const openBoardDetails = (row: BoardRow) => {
    setViewingBoard(row);
    setIsBoardDetailsOpen(true);
  };

  const saveBoard = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !boardForm.barangayId) return;
    const year = Number(boardForm.fiscalYear);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) { toast({ title: "Invalid Year", description: "Fiscal year must be 2000-2100." }); return; }
    setIsSavingBoard(true);
    const payload = {
      barangay_id: boardForm.barangayId, fiscal_year: year, quarter: boardForm.quarter,
      cbydp: boardForm.cbydp, abyip: boardForm.abyip, annual_budget: boardForm.annualBudget, rcb: boardForm.rcb, mil: boardForm.mil,
      remarks: boardForm.remarks.trim() || null,
    };
    const resp = editingBoard
      ? await supabase.from("compliance_board_status").update(payload).eq("id", editingBoard.id)
      : await supabase.from("compliance_board_status").insert(payload);
    setIsSavingBoard(false);
    if (resp.error) { toast({ title: "Save Failed", description: resp.error.code === "23505" ? "Duplicate quarter row for this barangay and fiscal year." : resp.error.message }); return; }
    setIsBoardDialog(false); setEditingBoard(null); setBoardForm(boardDefaults); toast({ title: "Saved", description: "Board row saved." }); void loadData();
  };

  const saveMonthly = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !monthlyForm.barangayId || !monthlyForm.dueDate) return;
    const year = Number(monthlyForm.fiscalYear);
    const month = Number(monthlyForm.monthNo);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) { toast({ title: "Invalid Year", description: "Fiscal year must be 2000-2100." }); return; }
    if (!Number.isInteger(month) || month < 1 || month > 12) { toast({ title: "Invalid Month", description: "Month must be 1-12." }); return; }
    setIsSavingMonthly(true);
    const payload = {
      barangay_id: monthlyForm.barangayId, fiscal_year: year, month_no: month, due_date: monthlyForm.dueDate,
      mfr_status: monthlyForm.mfrStatus, mil_status: monthlyForm.milStatus, rcb_status: monthlyForm.rcbStatus,
      accomplishment_status: monthlyForm.accomplishmentStatus, census_status: monthlyForm.censusStatus,
      completion_percent: completionPercent(monthlyForm), report_document_id: monthlyForm.reportDocumentId || null,
    };
    const resp = editingMonthly
      ? await supabase.from("monthly_compliance").update(payload).eq("id", editingMonthly.id)
      : await supabase.from("monthly_compliance").insert(payload);
    setIsSavingMonthly(false);
    if (resp.error) { toast({ title: "Save Failed", description: resp.error.code === "23505" ? "Duplicate month row for this barangay and fiscal year." : resp.error.message }); return; }
    setIsMonthlyDialog(false); setEditingMonthly(null); setMonthlyForm(monthlyDefaults); toast({ title: "Saved", description: "Monthly row saved." }); void loadData();
  };
  const openEditMonthlyDialog = (row: MonthlyRow) => {
    setEditingMonthly(row);
    setMonthlyForm({
      barangayId: row.barangay_id,
      fiscalYear: String(row.fiscal_year),
      monthNo: String(row.month_no),
      dueDate: row.due_date,
      mfrStatus: row.mfr_status,
      milStatus: row.mil_status,
      rcbStatus: row.rcb_status,
      accomplishmentStatus: row.accomplishment_status,
      censusStatus: row.census_status,
      reportDocumentId: row.report_document_id ?? "",
    });
    setIsMonthlyDialog(true);
  };
  const openMonthlyDetails = (row: MonthlyRow) => {
    setViewingMonthly(row);
    setIsMonthlyDetailsOpen(true);
  };

  const deleteBoard = async () => {
    if (!supabase || !deletingBoard) return;
    setIsDeletingBoard(true);
    const resp = await supabase.from("compliance_board_status").delete().eq("id", deletingBoard.id);
    setIsDeletingBoard(false);
    if (resp.error) { toast({ title: "Delete Failed", description: resp.error.message }); return; }
    setDeletingBoard(null); toast({ title: "Deleted", description: "Board row deleted." }); void loadData();
  };

  const deleteMonthly = async () => {
    if (!supabase || !deletingMonthly) return;
    setIsDeletingMonthly(true);
    const resp = await supabase.from("monthly_compliance").delete().eq("id", deletingMonthly.id);
    setIsDeletingMonthly(false);
    if (resp.error) { toast({ title: "Delete Failed", description: resp.error.message }); return; }
    setDeletingMonthly(null); toast({ title: "Deleted", description: "Monthly row deleted." }); void loadData();
  };

  const filteredBoard = useMemo(() => boardRows.filter((r) => {
    const q = boardSearch.toLowerCase();
    return r.barangay_name.toLowerCase().includes(q) || String(r.fiscal_year).includes(q) || r.quarter.toLowerCase().includes(q) || (r.remarks ?? "").toLowerCase().includes(q);
  }), [boardRows, boardSearch]);
  const availableMonthlyMonths = useMemo(
    () => Array.from(new Set(monthlyRows.map((row) => row.month_no))).sort((a, b) => a - b),
    [monthlyRows],
  );
  const filteredMonthly = useMemo(() => monthlyRows.filter((r) => {
    const q = monthlySearch.toLowerCase().trim();
    const monthLabel = MONTH_NAMES[Math.max(0, Math.min(11, r.month_no - 1))] ?? String(r.month_no);
    const matchesSearch =
      q.length === 0
        ? true
        : r.barangay_name.toLowerCase().includes(q) ||
          String(r.fiscal_year).includes(q) ||
          String(r.month_no).includes(q) ||
          monthLabel.toLowerCase().includes(q) ||
          (r.report_doc_code ?? "").toLowerCase().includes(q);
    const matchesMonth = monthlyMonthFilter === "all" ? true : String(r.month_no) === monthlyMonthFilter;
    return matchesSearch && matchesMonth;
  }), [monthlyRows, monthlySearch, monthlyMonthFilter]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Accountability Board Config</h1>
        <p className="text-muted-foreground mt-1 font-medium">Configure all public Accountability Board and Monthly Compliance data from admin.</p>
      </header>

      <Tabs defaultValue="board-rows" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="board-rows">Board Rows</TabsTrigger>
          <TabsTrigger value="monthly-rows">Monthly Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="board-rows" className="space-y-4">
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-foreground">Board Rows</h2>
              <Button type="button" onClick={openCreateBoardDialog} className="gap-2"><Plus size={16} />Add Board Row</Button>
            </div>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={boardSearch}
                onChange={(e) => setBoardSearch(e.target.value)}
                placeholder="Search board rows..."
                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm"
              />
            </div>
            <DataTable
              columns={[
                { header: "Barangay / Period", accessor: (r: BoardRow) => <div><p className="font-semibold">{r.barangay_name}</p><p className="text-xs text-muted-foreground">FY {r.fiscal_year} - {r.quarter}</p></div> },
                { header: "Document States", accessor: (r: BoardRow) => <div className="flex flex-wrap gap-1.5 text-xs"><span className="rounded-md border px-2 py-0.5">CBYDP {DOC_LABEL[r.cbydp]}</span><span className="rounded-md border px-2 py-0.5">ABYIP {DOC_LABEL[r.abyip]}</span><span className="rounded-md border px-2 py-0.5">BUD {DOC_LABEL[r.annual_budget]}</span><span className="rounded-md border px-2 py-0.5">RCB {DOC_LABEL[r.rcb]}</span><span className="rounded-md border px-2 py-0.5">MIL {DOC_LABEL[r.mil]}</span></div> },
                { header: "Remarks", accessor: (r: BoardRow) => r.remarks || "-" },
              ]}
              data={filteredBoard}
              isLoading={isLoading}
              onRowClick={openBoardDetails}
              getRowAriaLabel={(row) => `Open details for ${row.barangay_name} ${row.quarter} FY ${row.fiscal_year}`}
            />
          </section>
        </TabsContent>

        <TabsContent value="monthly-rows" className="space-y-4">
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-foreground">Monthly Compliance Rows</h2>
              <Button type="button" onClick={() => { setEditingMonthly(null); setMonthlyForm(monthlyDefaults); setIsMonthlyDialog(true); }} className="gap-2"><Plus size={16} />Add Monthly Row</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={monthlySearch}
                  onChange={(e) => setMonthlySearch(e.target.value)}
                  placeholder="Search monthly rows..."
                  className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm"
                />
              </div>
              <div className="w-full sm:w-auto">
                <select
                  value={monthlyMonthFilter}
                  onChange={(e) => setMonthlyMonthFilter(e.target.value)}
                  className="w-full sm:w-52 h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">All Months</option>
                  {availableMonthlyMonths.map((month) => (
                    <option key={month} value={month}>
                      {MONTH_NAMES[Math.max(0, Math.min(11, month - 1))] ?? month}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMonthlyMonthFilter("all")}
                disabled={monthlyMonthFilter === "all"}
              >
                Clear Month
              </Button>
            </div>
            <DataTable
              columns={[
                { header: "Barangay / Month", accessor: (r: MonthlyRow) => <div><p className="font-semibold">{r.barangay_name}</p><p className="text-xs text-muted-foreground">FY {r.fiscal_year} - {MONTH_NAMES[r.month_no - 1] ?? r.month_no}</p></div> },
                { header: "Completion", accessor: (r: MonthlyRow) => <div><p className="font-semibold">{r.completion_percent}%</p><p className="text-xs text-muted-foreground">Due {new Date(r.due_date).toLocaleDateString()}</p></div> },
                { header: "Statuses", accessor: (r: MonthlyRow) => <div className="flex flex-wrap gap-1.5 text-xs"><span className="rounded-md border px-2 py-0.5">MFR {SUB_LABEL[r.mfr_status]}</span><span className="rounded-md border px-2 py-0.5">MIL {SUB_LABEL[r.mil_status]}</span><span className="rounded-md border px-2 py-0.5">RCB {SUB_LABEL[r.rcb_status]}</span><span className="rounded-md border px-2 py-0.5">ACC {SUB_LABEL[r.accomplishment_status]}</span><span className="rounded-md border px-2 py-0.5">CEN {SUB_LABEL[r.census_status]}</span></div> },
                { header: "Report", accessor: (r: MonthlyRow) => r.report_doc_code ? (r.report_url ? <a href={r.report_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">{r.report_doc_code}<ExternalLink size={12} /></a> : r.report_doc_code) : "-" },
              ]}
              data={filteredMonthly}
              isLoading={isLoading}
              onRowClick={openMonthlyDetails}
              getRowAriaLabel={(row) => `Open monthly details for ${row.barangay_name} month ${row.month_no}`}
            />
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={isBoardDialog} onOpenChange={setIsBoardDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{editingBoard ? "Edit Board Row" : "Create Board Row"}</DialogTitle><DialogDescription>This is used by the public Accountability Board table.</DialogDescription></DialogHeader>
          <form onSubmit={saveBoard} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2"><Label>Barangay</Label><select value={boardForm.barangayId} onChange={(e) => setBoardForm((p) => ({ ...p, barangayId: e.target.value }))} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" required><option value="">Select barangay</option>{barangays.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              <div className="space-y-2"><Label>Fiscal Year</Label><Input type="number" min={2000} max={2100} value={boardForm.fiscalYear} onChange={(e) => setBoardForm((p) => ({ ...p, fiscalYear: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Quarter</Label><select value={boardForm.quarter} onChange={(e) => setBoardForm((p) => ({ ...p, quarter: e.target.value as QuarterCode }))} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">{QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}</select></div>
              {[["cbydp", "CBYDP"], ["abyip", "ABYIP"], ["annualBudget", "Annual Budget"], ["rcb", "RCB"], ["mil", "MIL / PR"]].map(([k, l]) => <div className="space-y-2" key={k}><Label>{l}</Label><select value={boardForm[k as keyof BoardForm] as string} onChange={(e) => setBoardForm((p) => ({ ...p, [k]: e.target.value as DocState }))} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">{DOC_STATES.map((s) => <option key={s} value={s}>{DOC_LABEL[s]}</option>)}</select></div>)}
              <div className="space-y-2 md:col-span-3">
                <Label>Remarks</Label>
                <div className="flex flex-col md:flex-row gap-2">
                  <select
                    value={boardRemarkMode === "preset" ? boardRemarkPreset : BOARD_REMARK_OPTIONS[0]}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBoardRemarkMode("preset");
                      setBoardRemarkPreset(value);
                      setBoardForm((p) => ({ ...p, remarks: value }));
                    }}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    disabled={boardRemarkMode === "custom"}
                  >
                    <option value="">No remark</option>
                    {BOARD_REMARK_OPTIONS.filter((option) => option).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    className="md:w-48"
                    onClick={() => {
                      if (boardRemarkMode === "custom") {
                        setBoardRemarkMode("preset");
                        setBoardForm((p) => ({ ...p, remarks: boardRemarkPreset }));
                        return;
                      }
                      setBoardRemarkMode("custom");
                    }}
                  >
                    {boardRemarkMode === "custom" ? "Use Dropdown Remark" : "Custom Remark"}
                  </Button>
                </div>
                {boardRemarkMode === "custom" && (
                  <Input
                    value={boardForm.remarks}
                    onChange={(e) => setBoardForm((p) => ({ ...p, remarks: e.target.value }))}
                    placeholder="Type custom remark"
                  />
                )}
              </div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setIsBoardDialog(false)} disabled={isSavingBoard}>Cancel</Button><Button type="submit" disabled={isSavingBoard}>{isSavingBoard ? "Saving..." : editingBoard ? "Save Changes" : "Create Row"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isMonthlyDialog} onOpenChange={setIsMonthlyDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingMonthly ? "Edit Monthly Row" : "Create Monthly Row"}</DialogTitle><DialogDescription>This is used by the public Monthly Compliance table.</DialogDescription></DialogHeader>
          <form onSubmit={saveMonthly} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2"><Label>Barangay</Label><select value={monthlyForm.barangayId} onChange={(e) => setMonthlyForm((p) => ({ ...p, barangayId: e.target.value }))} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" required><option value="">Select barangay</option>{barangays.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              <div className="space-y-2"><Label>Fiscal Year</Label><Input type="number" min={2000} max={2100} value={monthlyForm.fiscalYear} onChange={(e) => setMonthlyForm((p) => ({ ...p, fiscalYear: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Month</Label><Input type="number" min={1} max={12} value={monthlyForm.monthNo} onChange={(e) => setMonthlyForm((p) => ({ ...p, monthNo: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={monthlyForm.dueDate} onChange={(e) => setMonthlyForm((p) => ({ ...p, dueDate: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Completion</Label><Input readOnly className="bg-muted/50" value={`${completionPercent(monthlyForm)}%`} /></div>
              {[["mfrStatus", "MFR"], ["milStatus", "MIL"], ["rcbStatus", "RCB"], ["accomplishmentStatus", "Accomplishment"], ["censusStatus", "Census"]].map(([k, l]) => <div className="space-y-2" key={k}><Label>{l}</Label><select value={monthlyForm[k as keyof MonthlyForm] as string} onChange={(e) => setMonthlyForm((p) => ({ ...p, [k]: e.target.value as SubmissionState }))} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">{SUBMISSION_STATES.map((s) => <option key={s} value={s}>{SUB_LABEL[s]}</option>)}</select></div>)}
              <div className="space-y-2 md:col-span-3"><Label>Linked Report Document</Label><select value={monthlyForm.reportDocumentId} onChange={(e) => setMonthlyForm((p) => ({ ...p, reportDocumentId: e.target.value }))} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">No linked document</option>{reportDocs.map((d) => <option key={d.id} value={d.id}>{d.doc_code} - {d.title}</option>)}</select></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setIsMonthlyDialog(false)} disabled={isSavingMonthly}>Cancel</Button><Button type="submit" disabled={isSavingMonthly}>{isSavingMonthly ? "Saving..." : editingMonthly ? "Save Changes" : "Create Row"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isBoardDetailsOpen} onOpenChange={setIsBoardDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Board Row Details</DialogTitle><DialogDescription>Read-only record view.</DialogDescription></DialogHeader>
          {viewingBoard && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><p className="text-muted-foreground">Barangay</p><p className="font-medium">{viewingBoard.barangay_name}</p></div>
                <div><p className="text-muted-foreground">Period</p><p className="font-medium">FY {viewingBoard.fiscal_year} - {viewingBoard.quarter}</p></div>
                <div><p className="text-muted-foreground">CBYDP</p><p className="font-medium">{DOC_LABEL[viewingBoard.cbydp]}</p></div>
                <div><p className="text-muted-foreground">ABYIP</p><p className="font-medium">{DOC_LABEL[viewingBoard.abyip]}</p></div>
                <div><p className="text-muted-foreground">Annual Budget</p><p className="font-medium">{DOC_LABEL[viewingBoard.annual_budget]}</p></div>
                <div><p className="text-muted-foreground">RCB</p><p className="font-medium">{DOC_LABEL[viewingBoard.rcb]}</p></div>
                <div><p className="text-muted-foreground">MIL</p><p className="font-medium">{DOC_LABEL[viewingBoard.mil]}</p></div>
                <div className="md:col-span-2"><p className="text-muted-foreground">Remarks</p><p className="font-medium">{viewingBoard.remarks || "N/A"}</p></div>
              </div>
              <DialogFooter className="sm:justify-between">
                <p className="text-xs text-muted-foreground">Read-only record view.</p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsBoardDetailsOpen(false)}>Close</Button>
                  <Button type="button" onClick={() => { setIsBoardDetailsOpen(false); openEditBoardDialog(viewingBoard); }}>Edit</Button>
                  <Button type="button" variant="destructive" onClick={() => { setIsBoardDetailsOpen(false); setDeletingBoard(viewingBoard); }}>Delete</Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isMonthlyDetailsOpen} onOpenChange={setIsMonthlyDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Monthly Row Details</DialogTitle><DialogDescription>Read-only record view.</DialogDescription></DialogHeader>
          {viewingMonthly && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><p className="text-muted-foreground">Barangay</p><p className="font-medium">{viewingMonthly.barangay_name}</p></div>
                <div><p className="text-muted-foreground">Period</p><p className="font-medium">FY {viewingMonthly.fiscal_year} - {MONTH_NAMES[viewingMonthly.month_no - 1] ?? viewingMonthly.month_no}</p></div>
                <div><p className="text-muted-foreground">Due Date</p><p className="font-medium">{new Date(viewingMonthly.due_date).toLocaleDateString()}</p></div>
                <div><p className="text-muted-foreground">Completion</p><p className="font-medium">{viewingMonthly.completion_percent}%</p></div>
              </div>
              <DialogFooter className="sm:justify-between">
                <p className="text-xs text-muted-foreground">Read-only record view.</p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsMonthlyDetailsOpen(false)}>Close</Button>
                  <Button type="button" onClick={() => { setIsMonthlyDetailsOpen(false); openEditMonthlyDialog(viewingMonthly); }}>Edit</Button>
                  <Button type="button" variant="destructive" onClick={() => { setIsMonthlyDetailsOpen(false); setDeletingMonthly(viewingMonthly); }}>Delete</Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingBoard)} onOpenChange={(open) => { if (!open) setDeletingBoard(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Board Row</AlertDialogTitle><AlertDialogDescription>{deletingBoard ? `Delete ${deletingBoard.barangay_name} (${deletingBoard.quarter} FY ${deletingBoard.fiscal_year})?` : "This cannot be undone."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isDeletingBoard}>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteBoard} disabled={isDeletingBoard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeletingBoard ? "Deleting..." : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deletingMonthly)} onOpenChange={(open) => { if (!open) setDeletingMonthly(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Monthly Row</AlertDialogTitle><AlertDialogDescription>{deletingMonthly ? `Delete ${deletingMonthly.barangay_name} month ${deletingMonthly.month_no}, FY ${deletingMonthly.fiscal_year}?` : "This cannot be undone."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isDeletingMonthly}>Cancel</AlertDialogCancel><AlertDialogAction onClick={deleteMonthly} disabled={isDeletingMonthly} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeletingMonthly ? "Deleting..." : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
