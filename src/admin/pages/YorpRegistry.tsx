import { useMemo, useRef, useState } from "react";
import { addDays, addYears } from "date-fns";
import { AlertTriangle, Award, Clock, Heart, Loader2, Trash2, User } from "lucide-react";
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
import { type PasigDistrict } from "@/lib/pasig-districts";
import { type OrganizationProfile } from "@/lib/lydo-connect-data";
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
  const [deleteTarget, setDeleteTarget] = useState<OrganizationProfile | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletingOrganization, setDeletingOrganization] = useState(false);
  const [deleteError, setDeleteError] = useState("");
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
    () => filtered.map(({ org }) => mapOrganizationProfileToYorpExportRow(org)),
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
      setSelectedEntry(null);
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
      <AdminPageHeader title="YORP Registry" description="View accredited youth organizations." />

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

