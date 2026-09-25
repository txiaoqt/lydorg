import { useMemo, useRef, useState } from "react";
import { addDays, addYears } from "date-fns";
import { AlertTriangle, Award, BarChart3, Clock, Download, Heart, Loader2, Trash2, User } from "lucide-react";
import "./yorp-registry.css";
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
import { YorpQuarterlyReportDialog } from "@/components/reports/YorpQuarterlyReportDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminPageHeader } from "@/components/portal/AdminPageHeader";
import { StatsCard } from "@/admin/components/StatsCard";
import {
  YorpRegistryTable,
  type YorpRegistryEntry,
  type YorpStatus,
  type YorpStatusFilter,
} from "@/admin/components/YorpRegistryTable";
import { YorpRegistryDetailDrawer } from "@/admin/components/YorpRegistryDetailDrawer";
import { BulkOrganizationDeleteDialog } from "@/admin/components/BulkOrganizationDeleteDialog";
import { type PasigDistrict } from "@/lib/pasig-districts";
import { type OrganizationProfile } from "@/lib/lydo-connect-data";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import {
  ORGANIZATION_DELETION_CATEGORIES,
  organizationDeletionConfirmationMatches,
  permanentlyDeleteOrganizationAccount,
  type BulkOrganizationDeletionResult,
} from "@/lib/admin-organization-deletion";
import { getEffectiveSystemSetting } from "@/lib/admin-system-settings";
import { loadAdminPortalSupabaseState } from "@/lib/lydo-connect-supabase";
import {
  mapOrganizationProfileToYorpExportRow,
  yorpRegistryExportConfig,
} from "@/lib/report-export-configs";
import { exportReport, type ExportFormat, type PdfPageConfig } from "@/lib/report-export";
import { toast } from "@/hooks/use-toast";

const yorpStatusFilterLabel: Record<YorpStatusFilter, string> = {
  all: "All Status",
  active: "Active",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
};

const isYorpRegistered = (org: OrganizationProfile) =>
  org.yorpRegisteredYear != null || org.profileStatus === "verified";

const EXPIRING_SOON_WINDOW_DAYS = 90;

const getYorpStatus = (expiryDate: Date, now: Date): YorpStatus => {
  if (expiryDate.getTime() < now.getTime()) return "expired";
  if (expiryDate.getTime() < addDays(now, EXPIRING_SOON_WINDOW_DAYS).getTime()) return "expiring_soon";
  return "active";
};

export function YorpRegistryPage() {
  const {
    state,
    mergeRemoteState,
    removeOrganizationAccountFromCache,
  } = useLydoConnect();
  const orgs = state.organizationProfiles;

  const [search, setSearch] = useState("");
  const [yorpStatusFilter, setYorpStatusFilter] = useState<YorpStatusFilter>("all");
  const [districtFilter, setDistrictFilter] = useState<"all" | PasigDistrict>("all");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [classificationFilter, setClassificationFilter] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState<YorpRegistryEntry | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<OrganizationProfile | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletingOrganization, setDeletingOrganization] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const deleteConfirmationInputRef = useRef<HTMLInputElement>(null);

  const registryEntries = useMemo<YorpRegistryEntry[]>(() => {
    const now = new Date();
    return orgs
      .filter(isYorpRegistered)
      .map((org) => {
        const registrationDate = new Date(org.verifiedAt || org.createdAt);
        const expiryDate = addYears(registrationDate, 3);
        return { org, registrationDate, expiryDate, yorpStatus: getYorpStatus(expiryDate, now) };
      });
  }, [orgs]);

  const selectedBulkOrgs = useMemo(
    () =>
      registryEntries
        .filter((entry) => selectedOrgIds.has(entry.org.id))
        .map((entry) => entry.org),
    [registryEntries, selectedOrgIds],
  );

  const stats = useMemo(
    () => ({
      activeAccredited: registryEntries.length,
      expiringSoon: registryEntries.filter((entry) => entry.yorpStatus === "expiring_soon").length,
      youthOrgs: registryEntries.filter((entry) => entry.org.majorClassification === "Youth Organization").length,
      youthServingOrgs: registryEntries.filter(
        (entry) => entry.org.majorClassification === "Youth-Serving Organization",
      ).length,
    }),
    [registryEntries],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return registryEntries.filter(({ org, yorpStatus }) => {
      if (q && ![org.organizationName, org.urn].some((field) => field.toLowerCase().includes(q))) return false;
      if (yorpStatusFilter !== "all" && yorpStatus !== yorpStatusFilter) return false;
      if (districtFilter !== "all" && org.district !== districtFilter) return false;
      if (barangayFilter !== "all" && org.barangay !== barangayFilter) return false;
      if (classificationFilter !== "all" && org.majorClassification !== classificationFilter) return false;
      return true;
    });
  }, [registryEntries, search, yorpStatusFilter, districtFilter, barangayFilter, classificationFilter]);

  const exportRows = useMemo(
    () => filtered.map((entry, index) => mapOrganizationProfileToYorpExportRow(entry, index)),
    [filtered],
  );

  const exportFilterSummary = useMemo(() => {
    const summary: string[] = [];
    if (search.trim()) summary.push(`Search: ${search.trim()}`);
    if (yorpStatusFilter !== "all") summary.push(`Status: ${yorpStatusFilterLabel[yorpStatusFilter]}`);
    if (districtFilter !== "all") summary.push(`District: ${districtFilter}`);
    if (barangayFilter !== "all") summary.push(`Barangay: ${barangayFilter}`);
    if (classificationFilter !== "all") summary.push(`Classification: ${classificationFilter}`);
    return summary;
  }, [search, yorpStatusFilter, districtFilter, barangayFilter, classificationFilter]);

  const openDeleteDialog = (organization: OrganizationProfile) => {
    const requireNameConfirmation = Boolean(getEffectiveSystemSetting("security.reauth_delete_organization"));
    setDeleteConfirmation(requireNameConfirmation ? "" : organization.organizationName);
    setDeleteError("");
    setDeleteTarget(organization);
  };

  const handleDeleteSelected = () => {
    if (selectedOrgIds.size === 0) return;
    if (selectedOrgIds.size === 1) {
      const [targetId] = Array.from(selectedOrgIds);
      const targetEntry = registryEntries.find((entry) => entry.org.id === targetId);
      if (!targetEntry) return;
      openDeleteDialog(targetEntry.org);
    } else {
      setBulkDeleteDialogOpen(true);
    }
  };

  const closeDeleteDialog = () => {
    if (deletingOrganization) return;
    setDeleteTarget(null);
    setDeleteConfirmation("");
    setDeleteError("");
  };

  const confirmPermanentDeletion = async () => {
    const requireNameConfirmation = Boolean(getEffectiveSystemSetting("security.reauth_delete_organization"));
    const effectiveConfirmation = requireNameConfirmation ? deleteConfirmation : (deleteConfirmation || deleteTarget?.organizationName || "");

    if (
      !deleteTarget ||
      (requireNameConfirmation && !organizationDeletionConfirmationMatches(effectiveConfirmation, deleteTarget.organizationName)) ||
      deletingOrganization
    ) {
      return;
    }

    setDeletingOrganization(true);
    setDeleteError("");
    try {
      await permanentlyDeleteOrganizationAccount(
        deleteTarget.id,
        effectiveConfirmation,
      );
      removeOrganizationAccountFromCache(deleteTarget.id);
      setSelectedOrgIds((current) => {
        const next = new Set(current);
        next.delete(deleteTarget.id);
        return next;
      });
      setSelectedEntry(null);
      setDeleteTarget(null);
      setDeleteConfirmation("");
      toast({
        title: "Organization account permanently deleted.",
        description: `Account and associated records for ${deleteTarget.organizationName} have been removed.`,
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

  const handleBulkDeletionComplete = async (result: BulkOrganizationDeletionResult) => {
    const deletedIds: string[] = [];
    for (const item of result.results) {
      if (item.status === "deleted" || item.status === "deleted_with_storage_cleanup_pending") {
        removeOrganizationAccountFromCache(item.organizationId);
        deletedIds.push(item.organizationId);
      }
    }

    if (deletedIds.length > 0) {
      setSelectedOrgIds((current) => {
        const next = new Set(current);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
      setSelectedEntry(null);
    }

    if (result.deletedCount > 0) {
      toast({
        title: "Bulk deletion completed.",
        description: `${result.deletedCount} organization ${result.deletedCount === 1 ? "account" : "accounts"} permanently deleted.`,
      });
    }

    try {
      const snapshot = await loadAdminPortalSupabaseState();
      if (snapshot) mergeRemoteState(snapshot);
    } catch (refreshError) {
      console.error("Failed to refresh admin state after bulk organization deletion:", refreshError);
    }
  };

  const handleExport = async (format: ExportFormat, pageConfig?: PdfPageConfig) => {
    if (!exportRows.length) {
      toast({ title: "No Data", description: "No YORP records match the current filters." });
      return;
    }

    try {
      await exportReport(
        format,
        {
          config: yorpRegistryExportConfig,
          rows: exportRows,
          metadataLines: [`Total Records: ${exportRows.length}`],
          filterSummaryLines: exportFilterSummary,
        },
        pageConfig,
      );
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
      <AdminPageHeader
        title="YORP Registry"
        description="View accredited youth organizations."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(true)}
              disabled={filtered.length === 0}
              className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm text-text-default transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4 shrink-0 text-text-default" strokeWidth={1.6} />
              Export
            </Button>
            <Button
              onClick={() => setReportDialogOpen(true)}
              className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary text-primary-foreground px-4 py-3 font-segoe text-public-fs-body-sm transition-colors hover:bg-primary/90"
            >
              <BarChart3 className="h-4 w-4 shrink-0" strokeWidth={1.6} />
              Reports
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatsCard
          title="ACTIVE ACCREDITED"
          value={stats.activeAccredited}
          icon={Award}
          description="Valid YORP accreditation"
        />
        <StatsCard
          title="EXPIRING SOON"
          value={stats.expiringSoon}
          icon={Clock}
          trendLabel="within 90 days"
          description="Accreditation nearing expiration"
        />
        <StatsCard
          title="YOUTH ORGANIZATIONS"
          value={stats.youthOrgs}
          icon={User}
          description="Accredited youth organizations"
        />
        <StatsCard
          title="YOUTH-SERVING ORGANIZATIONS"
          value={stats.youthServingOrgs}
          icon={Heart}
          description="Accredited youth-serving organizations"
        />
      </div>

      <YorpRegistryTable
        entries={filtered}
        searchValue={search}
        onSearchChange={setSearch}
        statusFilter={yorpStatusFilter}
        onStatusFilterChange={setYorpStatusFilter}
        districtFilter={districtFilter}
        onDistrictFilterChange={setDistrictFilter}
        barangayFilter={barangayFilter}
        onBarangayFilterChange={setBarangayFilter}
        classificationFilter={classificationFilter}
        onClassificationFilterChange={setClassificationFilter}
        onView={(organizationId) => {
          const found = registryEntries.find((registryEntry) => registryEntry.org.id === organizationId);
          if (found) setSelectedEntry(found);
        }}
        selectedOrgIds={selectedOrgIds}
        onSelectedOrgIdsChange={setSelectedOrgIds}
        onDeleteSelected={handleDeleteSelected}
        isDeleting={deletingOrganization}
      />

      <YorpRegistryDetailDrawer
        entry={selectedEntry}
        onOpenChange={(open) => { if (!open) setSelectedEntry(null); }}
      />

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
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !deletingOrganization &&
                      deleteTarget.id &&
                      deleteTarget.organizationName &&
                      organizationDeletionConfirmationMatches(deleteConfirmation, deleteTarget.organizationName)
                    ) {
                      event.preventDefault();
                      void confirmPermanentDeletion();
                    }
                  }}
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

              <div className="admin-organization-delete-dialog__warning-card" role="note">
                <div className="admin-organization-delete-dialog__warning-icon-wrapper" aria-hidden="true">
                  <AlertTriangle className="admin-organization-delete-dialog__warning-icon" />
                </div>
                <div className="admin-organization-delete-dialog__warning-content">
                  <p className="admin-organization-delete-dialog__warning-title">
                    This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>

              {deleteError ? (
                <div className="admin-organization-delete-dialog__error" role="alert">
                  {deleteError}
                </div>
              ) : null}

              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={deletingOrganization}
                  onClick={closeDeleteDialog}
                  className="font-segoe active:scale-[0.98] transition-transform"
                >
                  Cancel
                </AlertDialogCancel>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={
                    deletingOrganization ||
                    !deleteTarget.id ||
                    !deleteTarget.organizationName ||
                    (Boolean(getEffectiveSystemSetting("security.reauth_delete_organization")) &&
                      !organizationDeletionConfirmationMatches(
                        deleteConfirmation,
                        deleteTarget.organizationName,
                      ))
                  }
                  onClick={() => void confirmPermanentDeletion()}
                  className="font-segoe active:scale-[0.98] transition-transform"
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

      <BulkOrganizationDeleteDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        selectedOrganizations={selectedBulkOrgs}
        onDeletionComplete={handleBulkDeletionComplete}
      />

      <ExportReportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        reportTitle="YORP Registry"
        description="Export all YORP records matching the current search and filters."
        onExport={handleExport}
      />

      <YorpQuarterlyReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
      />
    </div>
  );
}

