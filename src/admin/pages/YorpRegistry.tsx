import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import "./yorp-registry.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExportReportDialog } from "@/components/reports/ExportReportDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PortalEmptyState, PortalMetricCard, PortalSection, PortalStatusBadge } from "@/components/portal/portal-ui";
import { majorClassificationOptions, statusLabelMap, type OrganizationProfile } from "@/lib/lydo-connect-data";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import {
  ORGANIZATION_DELETION_CATEGORIES,
  organizationDeletionConfirmationMatches,
  permanentlyDeleteOrganizationAccount,
} from "@/lib/admin-organization-deletion";
import { loadAdminPortalSupabaseState } from "@/lib/lydo-connect-supabase";
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

const isYorpRegistered = (org: OrganizationProfile) =>
  org.yorpRegisteredYear != null || org.profileStatus === "verified";

const isYorpRenewed = (org: OrganizationProfile) =>
  org.yorpRenewedYear != null;

const renderOrFallback = (value?: string | null) =>
  value && value.trim().length ? value : "Not available";

const desktopDetailValue = (value?: string | null) =>
  value && value.trim().length ? value : "Not provided";

const organizationInitial = (name?: string | null) =>
  name?.trim().charAt(0).toUpperCase() || "O";

const canRenderProfileImage = (url?: string | null) =>
  Boolean(url && /^(https?:|blob:|data:)/i.test(url));

function MobileYorpOrganizationCard({
  organization,
  index,
  onViewDetails,
}: {
  organization: OrganizationProfile;
  index: number;
  onViewDetails: () => void;
}) {
  const location = [organization.barangay, organization.district].filter(Boolean);
  return (
    <article className="mobile-yorp-card">
      <div className="mobile-yorp-card-header">
        <div className="mobile-yorp-heading">
          <span className="mobile-yorp-index">#{index}</span>
          <h3>
            {organization.organizationName || <span className="italic text-muted-foreground">Unnamed</span>}
          </h3>
        </div>
        <PortalStatusBadge status={organization.profileStatus} />
      </div>

      <div className="mobile-yorp-summary">
        <p>
          {location.length ? (
            <>
              {location[0]}
              {location[1] ? ` \u00b7 ${location[1]}` : ""}
            </>
          ) : (
            "Not available"
          )}
        </p>
        <p>{renderOrFallback(organization.majorClassification)}</p>
        <p className="mobile-yorp-email">
          {renderOrFallback(organization.organizationEmail || organization.contactNumber)}
        </p>
      </div>

      <button
        type="button"
        className="mobile-yorp-details-action"
        onClick={onViewDetails}
        aria-label={`View details for ${organization.organizationName || "organization"}`}
      >
        <span>View organization details</span>
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      </button>
    </article>
  );
}

export function YorpRegistryPage() {
  const {
    state,
    mergeRemoteState,
    removeOrganizationAccountFromCache,
  } = useLydoConnect();
  const orgs = state.organizationProfiles;

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yorpFilter, setYorpFilter] = useState<YorpFilter>("all");
  const [selectedOrg, setSelectedOrg] = useState<OrganizationProfile | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(6);
  const [deleteTarget, setDeleteTarget] = useState<OrganizationProfile | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletingOrganization, setDeletingOrganization] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteConfirmationInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orgs.filter((org) => {
      if (
        q &&
        ![
          org.organizationName,
          org.barangay,
          org.representativeName,
          org.contactNumber,
          org.organizationEmail,
        ].some((field) => field.toLowerCase().includes(q))
      ) {
        return false;
      }
      if (yearFilter !== "all") {
        const yr = Number(yearFilter);
        if (org.yorpRegisteredYear !== yr && org.yorpRenewedYear !== yr) return false;
      }
      if (classFilter !== "all" && org.majorClassification !== classFilter) return false;
      if (statusFilter !== "all" && org.profileStatus !== statusFilter) return false;
      if (yorpFilter === "registered" && !isYorpRegistered(org)) return false;
      if (yorpFilter === "renewed" && !isYorpRenewed(org)) return false;
      if (yorpFilter === "not_registered" && (isYorpRegistered(org) || isYorpRenewed(org))) return false;
      return true;
    });
  }, [orgs, search, yearFilter, classFilter, statusFilter, yorpFilter]);

  const stats = useMemo(
    () => ({
      total: orgs.length,
      registered: orgs.filter(isYorpRegistered).length,
      renewed: orgs.filter(isYorpRenewed).length,
    }),
    [orgs],
  );

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

  useEffect(() => {
    setMobileVisibleCount(6);
  }, [search, yearFilter, classFilter, statusFilter, yorpFilter]);

  const openDeleteDialog = (organization: OrganizationProfile) => {
    setDeleteConfirmation("");
    setDeleteError("");
    setDeleteTarget(organization);
  };

  const closeDeleteDialog = () => {
    if (deletingOrganization) return;
    setDeleteTarget(null);
    setDeleteConfirmation("");
    setDeleteError("");
  };

  const confirmPermanentDeletion = async () => {
    if (
      !deleteTarget ||
      !organizationDeletionConfirmationMatches(deleteConfirmation, deleteTarget.organizationName) ||
      deletingOrganization
    ) {
      return;
    }

    setDeletingOrganization(true);
    setDeleteError("");
    try {
      await permanentlyDeleteOrganizationAccount(
        deleteTarget.id,
        deleteConfirmation,
      );
      removeOrganizationAccountFromCache(deleteTarget.id);
      setSelectedOrg(null);
      setDeleteTarget(null);
      setDeleteConfirmation("");
      toast({
        title: "Organization account permanently deleted.",
      });

      try {
        const snapshot = await loadAdminPortalSupabaseState();
        if (snapshot) mergeRemoteState(snapshot);
      } catch (refreshError) {
        console.error("Failed to refresh admin state after organization deletion:", refreshError);
      }
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "The organization account could not be deleted. Please try again.",
      );
    } finally {
      setDeletingOrganization(false);
    }
  };

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
    <div className="yorp-registry-page admin-yorp-registry-page space-y-4 sm:space-y-6">
      <div className="registry-summary-grid grid grid-cols-3 gap-2 lg:hidden">
        {[
          { label: "Total Organizations", value: stats.total, icon: Building2 },
          { label: "YORP Registered", value: stats.registered, icon: ClipboardCheck },
          { label: "Renewed", value: stats.renewed, icon: RefreshCw },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="registry-summary-card min-w-0 rounded-xl border border-border/70 bg-card/90 p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <p className="text-[9px] uppercase tracking-[0.08em] leading-snug text-muted-foreground/75">
                {label}
              </p>
            </div>
            <p className="mt-2.5 text-[1.6rem] font-semibold leading-none text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="hidden grid-cols-2 gap-3 md:grid-cols-3 lg:grid">
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
            className="registry-export-button w-auto max-lg:min-h-[38px] max-lg:px-3.5"
            disabled={!filtered.length}
            onClick={() => setExportDialogOpen(true)}
          >
            <Download className="mr-2 h-4 w-4" />
            <span className="lg:hidden">Export Registry</span>
            <span className="hidden lg:inline">Export</span>
          </Button>
        }
      >
        <div className="registry-filter-grid mobile-filter-grid mb-4 grid grid-cols-2 gap-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,0.8fr))]">
          <div className="registry-search relative col-span-2 min-w-0 xl:col-span-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              placeholder="Search organizations..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 w-full pl-8"
            />
          </div>
          <Select value={yorpFilter} onValueChange={(value) => setYorpFilter(value as YorpFilter)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="YORP Status" />
            </SelectTrigger>
            <SelectContent>
              {(["all", "registered", "renewed", "not_registered"] as YorpFilter[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {yorpStatusLabel[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {YEAR_OPTIONS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Classification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classifications</SelectItem>
              {majorClassificationOptions.map((classification) => (
                <SelectItem key={classification} value={classification}>
                  {classification}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Profile Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {["verified", "pending_review", "needs_update", "incomplete", "suspended_inactive"].map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabelMap[status] ?? status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <PortalEmptyState
            title={orgs.length === 0 ? "No organizations yet" : "No organizations match"}
            description={
              orgs.length === 0
                ? "Organizations will appear here once they register on the portal."
                : "Try adjusting the search or filters."
            }
          />
        ) : (
          <>
            <p className="mobile-yorp-result-count lg:hidden">
              {filtered.length} {filtered.length === 1 ? "organization" : "organizations"}
            </p>
            <div className="mobile-yorp-list lg:hidden">
              {filtered.slice(0, mobileVisibleCount).map((org, idx) => (
                <MobileYorpOrganizationCard
                  key={org.id}
                  organization={org}
                  index={idx + 1}
                  onViewDetails={() => setSelectedOrg(org)}
                />
              ))}
              <p className="px-1 text-xs text-muted-foreground">
                Showing {Math.min(mobileVisibleCount, filtered.length)} of {filtered.length} organizations
              </p>
              {mobileVisibleCount < filtered.length ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setMobileVisibleCount((current) => current + 6)}
                >
                  Load more organizations
                </Button>
              ) : null}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    {["#", "Organization", "Barangay", "Major Classification", "Contact Number", "Email", "Status", ""].map((heading) => (
                      <th key={heading} className="admin-kicker pb-2 pr-4 text-left font-semibold last:pr-0">
                        {heading}
                      </th>
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
                      <td className="py-2.5 pr-4 font-medium">
                        {org.organizationName || <span className="italic text-muted-foreground">Unnamed</span>}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{org.barangay || "—"}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{org.majorClassification || "—"}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{org.contactNumber || "—"}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{org.organizationEmail || "—"}</td>
                      <td className="py-2.5 pr-4">
                        <PortalStatusBadge status={org.profileStatus} />
                      </td>
                      <td className="py-2.5" onClick={(event) => event.stopPropagation()}>
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

      <Dialog open={selectedOrg !== null} onOpenChange={(open) => { if (!open && !deletingOrganization) setSelectedOrg(null); }}>
        <DialogContent
          className="yorp-registry-details mobile-yorp-details-modal max-w-2xl"
          onEscapeKeyDown={(event) => { if (deletingOrganization) event.preventDefault(); }}
          onPointerDownOutside={(event) => { if (deletingOrganization) event.preventDefault(); }}
        >
          {selectedOrg ? (
            <>
              <DialogTitle className="sr-only">{selectedOrg.organizationName || "Organization"} details</DialogTitle>
              <div className="desktop-yorp-details hidden lg:flex">
                <header className="desktop-yorp-summary">
                  <div className="desktop-yorp-avatar" aria-hidden="true">
                    {canRenderProfileImage(selectedOrg.profileImageUrl) ? (
                      <img src={selectedOrg.profileImageUrl} alt="" />
                    ) : organizationInitial(selectedOrg.organizationName)}
                  </div>
                  <div className="desktop-yorp-summary__copy">
                    <div className="desktop-yorp-summary__title-row">
                      <h2>{selectedOrg.organizationName || "Organization"}</h2>
                      <PortalStatusBadge status={selectedOrg.profileStatus} />
                    </div>
                    <p>{[selectedOrg.district, selectedOrg.barangay].filter(Boolean).join(" · ") || "Location not provided"}</p>
                    <p>{[selectedOrg.majorClassification, selectedOrg.subClassification].filter(Boolean).join(" · ") || "Classification not provided"}</p>
                  </div>
                </header>

                <div className="desktop-yorp-details__scroll">
                  <DesktopDetailsSection title="Registration" icon={ClipboardCheck}>
                    <div className="desktop-yorp-field-grid desktop-yorp-field-grid--three">
                      <DesktopField label="Registration No." value={selectedOrg.organizationIdentifierNumber} mono />
                      <DesktopField label="YORP Registration Year" value={selectedOrg.yorpRegisteredYear?.toString()} />
                      <DesktopField label="YORP Renewed Year" value={selectedOrg.yorpRenewedYear?.toString()} />
                      <DesktopField label="Registered" value={new Date(selectedOrg.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })} />
                      <DesktopField label="Verified" value={selectedOrg.verifiedAt ? new Date(selectedOrg.verifiedAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : null} />
                    </div>
                  </DesktopDetailsSection>

                  <DesktopDetailsSection title="Organization & Leadership" icon={Users}>
                    <div className="desktop-yorp-field-grid">
                      <DesktopField label="Major Classification" value={selectedOrg.majorClassification} />
                      <DesktopField label="Sub-classification" value={selectedOrg.subClassification} />
                      <DesktopField label="Representative" value={selectedOrg.representativeName} />
                      <DesktopField label="Adviser" value={selectedOrg.adviserName} />
                      <div className="desktop-yorp-field desktop-yorp-field--full">
                        <p className="desktop-yorp-field__label">Advocacies</p>
                        {selectedOrg.advocacies.length > 0 ? (
                          <div className="desktop-yorp-advocacies">
                            {selectedOrg.advocacies.map((advocacy) => <Badge key={advocacy} variant="outline">{advocacy}</Badge>)}
                          </div>
                        ) : <p className="desktop-yorp-field__missing">Not provided</p>}
                      </div>
                    </div>
                  </DesktopDetailsSection>

                  <DesktopDetailsSection title="Contact & Location" icon={MapPin}>
                    <div className="desktop-yorp-field-grid">
                      <DesktopField label="Contact Number" value={selectedOrg.contactNumber} />
                      <DesktopField label="Email" value={selectedOrg.organizationEmail} />
                      <DesktopField label="District" value={selectedOrg.district} />
                      <DesktopField label="Barangay" value={selectedOrg.barangay} />
                      <DesktopField className="desktop-yorp-field--full" label="Address" value={selectedOrg.address} />
                      <div className="desktop-yorp-field desktop-yorp-field--full">
                        <p className="desktop-yorp-field__label">Facebook Page</p>
                        {selectedOrg.facebookPageUrl ? (
                          <a
                            className="desktop-yorp-facebook"
                            href={selectedOrg.facebookPageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Visit ${selectedOrg.organizationName || "organization"} Facebook page (opens in a new tab)`}
                          >
                            <ExternalLink aria-hidden="true" />
                            Visit Facebook Page
                          </a>
                        ) : <p className="desktop-yorp-field__missing">Not provided</p>}
                      </div>
                    </div>
                  </DesktopDetailsSection>

                  {selectedOrg.internalNotes ? (
                    <DesktopDetailsSection title="Internal Notes">
                      <p className="desktop-yorp-notes">{selectedOrg.internalNotes}</p>
                    </DesktopDetailsSection>
                  ) : null}

                  <OrganizationDangerZone onDelete={() => openDeleteDialog(selectedOrg)} />
                </div>
              </div>

              <DialogHeader className="hidden">
                <h2 className="text-lg font-semibold leading-none tracking-tight">{selectedOrg.organizationName || "Organization"}</h2>
                {(selectedOrg.barangay || selectedOrg.majorClassification) && (
                  <p className="text-sm text-muted-foreground">
                    {[selectedOrg.barangay, selectedOrg.majorClassification].filter(Boolean).join(" · ")}
                  </p>
                )}
              </DialogHeader>

              <div className="hidden">
                <Field label="Status">
                  <PortalStatusBadge status={selectedOrg.profileStatus} />
                </Field>
                <Field label="Registration No.">
                  <span className="font-mono">{selectedOrg.organizationIdentifierNumber || "—"}</span>
                </Field>

                <Field label="YORP Reg Year">
                  {selectedOrg.yorpRegisteredYear != null ? <Badge variant="secondary">{selectedOrg.yorpRegisteredYear}</Badge> : <span className="text-muted-foreground">—</span>}
                </Field>
                <Field label="YORP Renewed Year">
                  {selectedOrg.yorpRenewedYear != null ? (
                    <Badge className="border-0 bg-green-500/15 text-green-700 hover:bg-green-500/20">
                      {selectedOrg.yorpRenewedYear}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
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
                    {selectedOrg.facebookPageUrl ? (
                      <a href={selectedOrg.facebookPageUrl} target="_blank" rel="noreferrer" className="break-all text-primary underline-offset-4 hover:underline">
                        {selectedOrg.facebookPageUrl}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </Field>
                </div>

                <div className="col-span-2">
                  <Field label="Advocacies">
                    {selectedOrg.advocacies.length > 0 ? (
                      <div className="mt-0.5 flex flex-wrap gap-1.5">
                        {selectedOrg.advocacies.map((advocacy) => (
                          <Badge key={advocacy} variant="outline" className="font-normal">
                            {advocacy}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
                <div className="col-span-2">
                  <OrganizationDangerZone onDelete={() => openDeleteDialog(selectedOrg)} />
                </div>
              </div>

              <header className="mobile-yorp-modal-header lg:hidden">
                <div className="organization-identity">
                  <h2>{selectedOrg.organizationName || "Organization"}</h2>
                  <p className="organization-location">
                    {[selectedOrg.barangay, selectedOrg.district].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <div className="organization-meta-row">
                    <PortalStatusBadge status={selectedOrg.profileStatus} />
                    {selectedOrg.majorClassification || selectedOrg.subClassification ? (
                      <span className="organization-classification">
                        {[selectedOrg.majorClassification, selectedOrg.subClassification].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </header>

              <div className="mobile-yorp-details-scroll lg:hidden">
                <div className="mobile-yorp-details-body">
                  <MobileDetailsSection title="Registration" icon={ClipboardCheck}>
                    <div className="mobile-yorp-registration-grid">
                      <MobileField label="Registration No.">
                        <span className="font-mono">{selectedOrg.organizationIdentifierNumber || "—"}</span>
                      </MobileField>
                      <MobileField label="YORP Registration Year">
                        {selectedOrg.yorpRegisteredYear != null ? selectedOrg.yorpRegisteredYear : "—"}
                      </MobileField>
                      <MobileField label="YORP Renewed Year">
                        {selectedOrg.yorpRenewedYear != null ? selectedOrg.yorpRenewedYear : "—"}
                      </MobileField>
                    </div>
                  </MobileDetailsSection>

                  <MobileDetailsSection title="Contact & Location" icon={MapPin}>
                    <div className="mobile-yorp-detail-grid contact-detail-grid">
                      <MobileField label="Contact Number">{selectedOrg.contactNumber || "—"}</MobileField>
                      <MobileField label="District">{selectedOrg.district || "—"}</MobileField>
                      <MobileField className="details-field--full" label="Email">{selectedOrg.organizationEmail || "—"}</MobileField>
                      <MobileField className="details-field--full" label="Address">{selectedOrg.address || "—"}</MobileField>
                      <MobileField className="details-field--full" label="Facebook">
                        {selectedOrg.facebookPageUrl ? (
                          <a href={selectedOrg.facebookPageUrl} target="_blank" rel="noreferrer" title={selectedOrg.facebookPageUrl}>
                            {selectedOrg.facebookPageUrl}
                          </a>
                        ) : "—"}
                      </MobileField>
                    </div>
                  </MobileDetailsSection>

                  <MobileDetailsSection title="Leadership" icon={Users}>
                    <div className="mobile-yorp-detail-grid leadership-detail-grid">
                      <MobileField label="Representative">{selectedOrg.representativeName || "—"}</MobileField>
                      <MobileField label="Adviser">{selectedOrg.adviserName || "—"}</MobileField>
                    </div>
                  </MobileDetailsSection>

                  <MobileDetailsSection title="Classification & Advocacies" icon={Building2}>
                    <div className="mobile-yorp-detail-grid classification-detail-grid">
                      <MobileField label="Major">{selectedOrg.majorClassification || "—"}</MobileField>
                      <MobileField label="Sub-classification">{selectedOrg.subClassification || "—"}</MobileField>
                    </div>
                    <div className="mobile-yorp-advocacies">
                      <p className="mobile-yorp-detail-label">Advocacies</p>
                      {selectedOrg.advocacies.length > 0 ? (
                        <div className="advocacy-tags">
                          {selectedOrg.advocacies.map((advocacy) => (
                            <span key={advocacy} className="advocacy-tag">{advocacy}</span>
                          ))}
                        </div>
                      ) : <p className="mobile-yorp-detail-value">—</p>}
                    </div>
                  </MobileDetailsSection>

                  <MobileDetailsSection title="Record Information" icon={CalendarDays}>
                    <div className="mobile-yorp-detail-grid record-detail-grid">
                      {selectedOrg.verifiedAt ? (
                        <MobileField label="Verified">
                          {new Date(selectedOrg.verifiedAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                        </MobileField>
                      ) : null}
                      <MobileField label="Registered">
                        {new Date(selectedOrg.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                      </MobileField>
                    </div>
                  </MobileDetailsSection>
                  <OrganizationDangerZone mobile onDelete={() => openDeleteDialog(selectedOrg)} />
                </div>
              </div>

              <div className="yorp-registry-details__body min-h-0 overflow-y-auto overscroll-contain lg:hidden">
                <div className="border-b border-border/60 px-4 pb-4 pt-5">
                  <div className="pr-12">
                    <h2 className="text-lg font-semibold leading-6 text-foreground">
                      {selectedOrg.organizationName || "Organization"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[selectedOrg.barangay, selectedOrg.majorClassification].filter(Boolean).join(" · ") || "Not available"}
                    </p>
                    <div className="mt-2">
                      <PortalStatusBadge status={selectedOrg.profileStatus} />
                    </div>
                  </div>
                </div>

                <div className="space-y-5 px-4 py-4">
                  <MobileDetailsSection title="Registration">
                    <div className="details-grid grid grid-cols-2 gap-x-4 gap-y-4">
                      <MobileField label="Status">
                        <PortalStatusBadge status={selectedOrg.profileStatus} />
                      </MobileField>
                      <MobileField label="Registration No.">
                        <span className="font-mono">{selectedOrg.organizationIdentifierNumber || "Not available"}</span>
                      </MobileField>
                      <MobileField label="YORP Registration Year">
                        {selectedOrg.yorpRegisteredYear != null ? selectedOrg.yorpRegisteredYear : "Not available"}
                      </MobileField>
                      <MobileField label="YORP Renewed Year">
                        {selectedOrg.yorpRenewedYear != null ? selectedOrg.yorpRenewedYear : "Not available"}
                      </MobileField>
                    </div>
                  </MobileDetailsSection>

                  <MobileDetailsSection title="Contact & Location">
                    <div className="details-grid grid grid-cols-2 gap-x-4 gap-y-4">
                      <MobileField label="Contact Number">
                        {renderOrFallback(selectedOrg.contactNumber)}
                      </MobileField>
                      <MobileField label="District">
                        {renderOrFallback(selectedOrg.district)}
                      </MobileField>
                      <MobileField className="details-field--full col-span-2" label="Email">
                        {renderOrFallback(selectedOrg.organizationEmail)}
                      </MobileField>
                      <MobileField className="details-field--full col-span-2" label="Address">
                        {renderOrFallback(selectedOrg.address)}
                      </MobileField>
                      <MobileField className="details-field--full col-span-2" label="Facebook">
                        {selectedOrg.facebookPageUrl ? (
                          <a href={selectedOrg.facebookPageUrl} target="_blank" rel="noreferrer" className="break-words text-primary underline-offset-4 hover:underline">
                            {selectedOrg.facebookPageUrl}
                          </a>
                        ) : (
                          "Not available"
                        )}
                      </MobileField>
                    </div>
                  </MobileDetailsSection>

                  <MobileDetailsSection title="Leadership">
                    <div className="grid grid-cols-1 gap-y-4">
                      <MobileField className="details-field--full" label="Representative">
                        {renderOrFallback(selectedOrg.representativeName)}
                      </MobileField>
                      <MobileField className="details-field--full" label="Adviser">
                        {renderOrFallback(selectedOrg.adviserName)}
                      </MobileField>
                    </div>
                  </MobileDetailsSection>

                  <MobileDetailsSection title="Classification">
                    <div className="details-grid grid grid-cols-2 gap-x-4 gap-y-4">
                      <MobileField label="Major">
                        {renderOrFallback(selectedOrg.majorClassification)}
                      </MobileField>
                      <MobileField label="Sub-classification">
                        {renderOrFallback(selectedOrg.subClassification)}
                      </MobileField>
                    </div>
                  </MobileDetailsSection>

                  <MobileDetailsSection title="Advocacies">
                    {selectedOrg.advocacies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedOrg.advocacies.map((advocacy) => (
                          <Badge key={advocacy} variant="outline" className="font-normal">
                            {advocacy}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not available</p>
                    )}
                  </MobileDetailsSection>

                  <MobileDetailsSection title="Record Information">
                    <div className="grid grid-cols-1 gap-y-4">
                      {selectedOrg.verifiedAt ? (
                        <MobileField className="details-field--full" label="Verified">
                          {new Date(selectedOrg.verifiedAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                        </MobileField>
                      ) : null}
                      <MobileField className="details-field--full" label="Registered">
                        {new Date(selectedOrg.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                      </MobileField>
                    </div>
                  </MobileDetailsSection>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) closeDeleteDialog(); }}
      >
        <AlertDialogContent
          className="admin-organization-delete-dialog"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            deleteConfirmationInputRef.current?.focus();
          }}
          onEscapeKeyDown={(event) => { if (deletingOrganization) event.preventDefault(); }}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          {deleteTarget ? (
            <>
              <AlertDialogHeader>
                <div className="admin-organization-delete-dialog__icon" aria-hidden="true">
                  <AlertTriangle />
                </div>
                <AlertDialogTitle>
                  Permanently delete {deleteTarget.organizationName || "this organization"}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the organization account and all
                  organization-owned records and uploaded files. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="admin-organization-delete-dialog__summary">
                <p className="admin-organization-delete-dialog__summary-title">
                  The following will be permanently deleted:
                </p>
                <ul>
                  {ORGANIZATION_DELETION_CATEGORIES.map((category) => (
                    <li key={category}>{category}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization-delete-confirmation">
                  Type the organization name to confirm
                </Label>
                <p
                  id="organization-delete-instruction"
                  className="admin-organization-delete-dialog__instruction"
                >
                  Enter “{deleteTarget.organizationName}” exactly as shown.
                </p>
                <Input
                  ref={deleteConfirmationInputRef}
                  id="organization-delete-confirmation"
                  value={deleteConfirmation}
                  disabled={deletingOrganization}
                  autoComplete="off"
                  aria-invalid={Boolean(
                    deleteConfirmation &&
                    !organizationDeletionConfirmationMatches(
                      deleteConfirmation,
                      deleteTarget.organizationName,
                    )
                  )}
                  aria-describedby="organization-delete-instruction organization-delete-mismatch"
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  placeholder={deleteTarget.organizationName}
                />
                {deleteConfirmation &&
                !organizationDeletionConfirmationMatches(
                  deleteConfirmation,
                  deleteTarget.organizationName,
                ) ? (
                  <p id="organization-delete-mismatch" className="text-xs text-destructive" role="status">
                    The organization name does not match.
                  </p>
                ) : (
                  <span id="organization-delete-mismatch" className="sr-only">
                    The entered organization name must match before deletion is enabled.
                  </span>
                )}
              </div>

              <p className="admin-organization-delete-dialog__permanent-warning">
                This action is permanent and cannot be undone.
              </p>

              {deleteError ? (
                <div className="admin-organization-delete-dialog__error" role="alert">
                  {deleteError}
                </div>
              ) : null}

              <AlertDialogFooter>
                <AlertDialogCancel disabled={deletingOrganization} onClick={closeDeleteDialog}>
                  Cancel
                </AlertDialogCancel>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={
                    deletingOrganization ||
                    !deleteTarget.id ||
                    !deleteTarget.organizationName ||
                    !organizationDeletionConfirmationMatches(
                      deleteConfirmation,
                      deleteTarget.organizationName,
                    )
                  }
                  onClick={() => void confirmPermanentDeletion()}
                >
                  {deletingOrganization ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Deleting organization account…</>
                  ) : (
                    <><Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />Permanently Delete Account</>
                  )}
                </Button>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>

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

function DesktopDetailsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="desktop-yorp-section">
      <div className="desktop-yorp-section__heading">
        {Icon ? <Icon aria-hidden="true" /> : null}
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function DesktopField({
  label,
  value,
  mono = false,
  className = "",
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  className?: string;
}) {
  const missing = !value?.trim();
  return (
    <div className={`desktop-yorp-field ${className}`}>
      <p className="desktop-yorp-field__label">{label}</p>
      <p className={`${missing ? "desktop-yorp-field__missing" : ""}${mono && !missing ? " font-mono" : ""}`}>
        {desktopDetailValue(value)}
      </p>
    </div>
  );
}

function OrganizationDangerZone({
  onDelete,
  mobile = false,
}: {
  onDelete: () => void;
  mobile?: boolean;
}) {
  return (
    <section className={`admin-organization-danger-zone${mobile ? " is-mobile" : ""}`}>
      <div>
        <p className="admin-organization-danger-zone__eyebrow">Danger Zone</p>
        <h3>Delete organization account</h3>
        <p>
          Permanently delete this organization&apos;s account, profile, submissions,
          financial records, YPOP records, communications, and uploaded files.
        </p>
      </div>
      <Button type="button" variant="destructive" onClick={onDelete}>
        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
        Delete Organization Account
      </Button>
    </section>
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

function MobileDetailsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="mobile-yorp-section">
      <div className="mobile-modal-section-heading">
        {Icon ? <Icon aria-hidden="true" /> : null}
        <h3>{title}</h3>
      </div>
      <div className="mobile-yorp-section-content">{children}</div>
    </section>
  );
}

function MobileField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mobile-yorp-detail-field ${className}`}>
      <p className="mobile-yorp-detail-label">{label}</p>
      <div className="mobile-yorp-detail-value">{children}</div>
    </div>
  );
}
