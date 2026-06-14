import { useMemo, useState } from "react";
import { Building2, ClipboardCheck, Download, Eye, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExportReportDialog } from "@/components/reports/ExportReportDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortalEmptyState, PortalMetricCard, PortalSection, PortalStatusBadge } from "@/components/portal/portal-ui";
import { majorClassificationOptions, statusLabelMap, type OrganizationProfile } from "@/lib/lydo-connect-data";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import {
  mapOrganizationProfileToYorpExportRow,
  yorpRegistryExportConfig,
} from "@/lib/report-export-configs";
import { exportReport, type ExportFormat } from "@/lib/report-export";
import { toast } from "@/hooks/use-toast";

type YorpFilter = "all" | "registered" | "renewed" | "not_registered";

const YEAR_OPTIONS = ["2024", "2025", "2026"];

const yorpStatusLabel: Record<YorpFilter, string> = {
  all: "All YORP",
  registered: "Registered",
  renewed: "Renewed",
  not_registered: "Not Registered",
};

export function YorpRegistryPage() {
  const { state } = useLydoConnect();
  const orgs = state.organizationProfiles;

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yorpFilter, setYorpFilter] = useState<YorpFilter>("all");
  const [selectedOrg, setSelectedOrg] = useState<OrganizationProfile | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orgs.filter((org) => {
      if (q && ![org.organizationName, org.barangay, org.representativeName, org.contactNumber, org.organizationEmail]
        .some((f) => f.toLowerCase().includes(q))) return false;
      if (yearFilter !== "all") {
        const yr = Number(yearFilter);
        if (org.yorpRegisteredYear !== yr && org.yorpRenewedYear !== yr) return false;
      }
      if (classFilter !== "all" && org.majorClassification !== classFilter) return false;
      if (statusFilter !== "all" && org.profileStatus !== statusFilter) return false;
      if (yorpFilter === "registered" && org.yorpRegisteredYear == null) return false;
      if (yorpFilter === "renewed" && org.yorpRenewedYear == null) return false;
      if (yorpFilter === "not_registered" && (org.yorpRegisteredYear != null || org.yorpRenewedYear != null)) return false;
      return true;
    });
  }, [orgs, search, yearFilter, classFilter, statusFilter, yorpFilter]);

  const stats = useMemo(() => ({
    total: orgs.length,
    registered: orgs.filter((o) => o.yorpRegisteredYear != null).length,
    renewed: orgs.filter((o) => o.yorpRenewedYear != null).length,
  }), [orgs]);

  const exportRows = useMemo(
    () => filtered.map(mapOrganizationProfileToYorpExportRow),
    [filtered],
  );

  const exportFilterSummary = useMemo(() => {
    const summary: string[] = [];
    if (search.trim()) summary.push(`Search: ${search.trim()}`);
    if (yorpFilter !== "all") summary.push(`YORP Status: ${yorpStatusLabel[yorpFilter]}`);
    if (yearFilter !== "all") summary.push(`Year: ${yearFilter}`);
    if (classFilter !== "all") summary.push(`Classification: ${classFilter}`);
    if (statusFilter !== "all") summary.push(`Profile Status: ${statusLabelMap[statusFilter] ?? statusFilter}`);
    return summary;
  }, [classFilter, search, statusFilter, yearFilter, yorpFilter]);

  const handleExport = async (format: ExportFormat) => {
    if (!exportRows.length) {
      toast({ title: "No Data", description: "No YORP records match the current filters." });
      return;
    }

    try {
      await exportReport(format, {
        config: yorpRegistryExportConfig,
        rows: exportRows,
        metadataLines: [`Total Records: ${exportRows.length}`],
        filterSummaryLines: exportFilterSummary,
      });
      toast({
        title: "Export Ready",
        description: `The YORP Registry ${format.toUpperCase()} export has been downloaded.`,
      });
    } catch (error) {
      console.error("Failed to export YORP registry:", error);
      toast({
        title: "Export Failed",
        description: "The YORP Registry export could not be generated.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <PortalMetricCard className="md:col-span-1" label="Total Organizations" value={stats.total} icon={Building2} />
        <PortalMetricCard label="YORP Registered" value={stats.registered} icon={ClipboardCheck} />
        <PortalMetricCard className="col-span-2 md:col-span-1" label="Renewed" value={stats.renewed} icon={RefreshCw} />
      </div>

      <PortalSection
        title="YORP Registry"
        description="View and manage YORP registration status for all organizations."
        action={
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={!filtered.length}
            onClick={() => setExportDialogOpen(true)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        }
      >
        {/* Filters */}
        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,0.8fr))]">
          <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
            <Input
              placeholder="Search org name, barangay, contact, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full pl-8"
            />
          </div>
          <Select value={yorpFilter} onValueChange={(v) => setYorpFilter(v as YorpFilter)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="YORP Status" />
            </SelectTrigger>
            <SelectContent>
              {(["all", "registered", "renewed", "not_registered"] as YorpFilter[]).map((v) => (
                <SelectItem key={v} value={v}>{yorpStatusLabel[v]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {YEAR_OPTIONS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="h-10 w-full sm:col-span-2 xl:col-span-1">
              <SelectValue placeholder="Classification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classifications</SelectItem>
              {majorClassificationOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Profile Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {["verified", "pending_review", "needs_update", "incomplete", "suspended_inactive"].map((s) => (
                <SelectItem key={s} value={s}>{statusLabelMap[s] ?? s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <PortalEmptyState
            title={orgs.length === 0 ? "No organizations yet" : "No organizations match"}
            description={orgs.length === 0 ? "Organizations will appear here once they register on the portal." : "Try adjusting the search or filters."}
          />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filtered.map((org, idx) => (
                <div key={org.id} className="rounded-xl border border-border/70 bg-background p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70">#{idx + 1}</p>
                      <p className="mt-1 break-words text-base font-semibold text-foreground">
                        {org.organizationName || <span className="italic text-muted-foreground">Unnamed</span>}
                      </p>
                      <p className="mt-1 break-words text-sm text-muted-foreground">{org.barangay || "—"}</p>
                    </div>
                    <div className="flex shrink-0 items-start gap-2">
                      <PortalStatusBadge status={org.profileStatus} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="View details"
                        onClick={() => setSelectedOrg(org)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70">Major classification</p>
                      <p className="mt-1 break-words text-sm text-foreground">{org.majorClassification || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70">Contact number</p>
                      <p className="mt-1 break-all text-sm text-foreground">{org.contactNumber || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70">Email</p>
                      <p className="mt-1 break-all text-sm text-foreground">{org.organizationEmail || "—"}</p>
                    </div>
                  </div>
                </div>
              ))}
              <p className="px-1 text-xs text-muted-foreground">
                Showing {filtered.length} of {orgs.length} organizations
              </p>
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  {["#", "Organization", "Barangay", "Major Classification", "Contact Number", "Email", "Status", ""].map((h) => (
                    <th key={h} className="admin-kicker pb-2 pr-4 text-left font-semibold last:pr-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((org, idx) => (
                  <tr
                    key={org.id}
                    className="border-b border-border/40 transition-colors hover:bg-muted/30 last:border-0"
                  >
                    <td className="py-2.5 pr-4 text-muted-foreground">{idx + 1}</td>
                    <td className="py-2.5 pr-4 font-medium">{org.organizationName || <span className="italic text-muted-foreground">Unnamed</span>}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{org.barangay || "—"}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{org.majorClassification || "—"}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{org.contactNumber || "—"}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{org.organizationEmail || "—"}</td>
                    <td className="py-2.5 pr-4">
                      <PortalStatusBadge status={org.profileStatus} />
                    </td>
                    <td className="py-2.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="View details"
                        onClick={() => setSelectedOrg(org)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              Showing {filtered.length} of {orgs.length} organizations
            </p>
          </div>
          </>
        )}
      </PortalSection>

      {/* Details Modal */}
      <Dialog open={selectedOrg !== null} onOpenChange={(open) => { if (!open) setSelectedOrg(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedOrg?.organizationName || "Organization"}</DialogTitle>
            {(selectedOrg?.barangay || selectedOrg?.majorClassification) && (
              <p className="text-sm text-muted-foreground">
                {[selectedOrg?.barangay, selectedOrg?.majorClassification].filter(Boolean).join(" · ")}
              </p>
            )}
          </DialogHeader>
          {selectedOrg && (
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 pt-1 sm:grid-cols-2">
              <Field label="Status">
                <PortalStatusBadge status={selectedOrg.profileStatus} />
              </Field>
              <Field label="Registration No.">
                <span className="font-mono">{selectedOrg.organizationIdentifierNumber || "—"}</span>
              </Field>

              <Field label="YORP Reg Year">
                {selectedOrg.yorpRegisteredYear != null
                  ? <Badge variant="secondary">{selectedOrg.yorpRegisteredYear}</Badge>
                  : <span className="text-muted-foreground">—</span>}
              </Field>
              <Field label="YORP Renewed Year">
                {selectedOrg.yorpRenewedYear != null
                  ? <Badge className="border-0 bg-green-500/15 text-green-700 hover:bg-green-500/20">{selectedOrg.yorpRenewedYear}</Badge>
                  : <span className="text-muted-foreground">—</span>}
              </Field>

              <Field label="Contact Number">
                {selectedOrg.contactNumber || <span className="text-muted-foreground">—</span>}
              </Field>
              <Field label="Email">
                {selectedOrg.organizationEmail || <span className="text-muted-foreground">—</span>}
              </Field>

              <Field label="District">
                {selectedOrg.district || <span className="text-muted-foreground">—</span>}
              </Field>
              <Field label="Sub-classification">
                {selectedOrg.subClassification || <span className="text-muted-foreground">—</span>}
              </Field>

              <Field label="Representative">
                {selectedOrg.representativeName || <span className="text-muted-foreground">—</span>}
              </Field>
              <Field label="Adviser">
                {selectedOrg.adviserName || <span className="text-muted-foreground">—</span>}
              </Field>

              <div className="col-span-2">
                <Field label="Address">
                  {selectedOrg.address || <span className="text-muted-foreground">—</span>}
                </Field>
              </div>

              <div className="col-span-2">
                <Field label="Facebook">
                  {selectedOrg.facebookPageUrl
                    ? <a href={selectedOrg.facebookPageUrl} target="_blank" rel="noreferrer" className="break-all text-primary underline-offset-4 hover:underline">{selectedOrg.facebookPageUrl}</a>
                    : <span className="text-muted-foreground">—</span>}
                </Field>
              </div>

              <div className="col-span-2">
                <Field label="Advocacies">
                  {selectedOrg.advocacies.length > 0
                    ? <div className="flex flex-wrap gap-1.5 mt-0.5">{selectedOrg.advocacies.map((a) => <Badge key={a} variant="outline" className="font-normal">{a}</Badge>)}</div>
                    : <span className="text-muted-foreground">—</span>}
                </Field>
              </div>

              {selectedOrg.internalNotes ? (
                <div className="col-span-2">
                  <Field label="Internal Notes">{selectedOrg.internalNotes}</Field>
                </div>
              ) : null}

              {selectedOrg.verifiedAt ? (
                <Field label="Verified">
                  {new Date(selectedOrg.verifiedAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                </Field>
              ) : null}
              <Field label="Registered">
                {new Date(selectedOrg.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
              </Field>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ExportReportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        reportTitle="YORP Registry"
        description="Export all YORP records matching the current search and filters."
        onExport={handleExport}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">{label}</p>
      <div className="text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}
