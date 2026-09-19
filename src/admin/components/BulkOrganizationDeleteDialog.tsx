import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Building2,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type OrganizationProfile } from "@/lib/lydo-connect-data";
import {
  ORGANIZATION_DELETION_CATEGORIES,
  bulkOrganizationDeletionConfirmationMatches,
  permanentlyDeleteBulkOrganizationAccounts,
  preflightBulkOrganizationDeletion,
  type BulkPreflightResult,
  type BulkOrganizationDeletionResult,
} from "@/lib/admin-organization-deletion";
import { ReferenceCodeChip } from "@/admin/components/InquiriesTable";
import { cn } from "@/lib/utils";

type BulkOrganizationDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrganizations: OrganizationProfile[];
  onDeletionComplete: (result: BulkOrganizationDeletionResult) => void;
};

export function BulkOrganizationDeleteDialog({
  open,
  onOpenChange,
  selectedOrganizations,
  onDeletionComplete,
}: BulkOrganizationDeleteDialogProps) {
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [preflightError, setPreflightError] = useState("");
  const [preflightData, setPreflightData] = useState<BulkPreflightResult | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deletionResults, setDeletionResults] = useState<BulkOrganizationDeletionResult | null>(null);

  const confirmationInputRef = useRef<HTMLInputElement>(null);

  const orgProfileMap = useMemo(
    () => new Map(selectedOrganizations.map((org) => [org.id, org])),
    [selectedOrganizations],
  );

  // Trigger preflight check when dialog opens
  useEffect(() => {
    if (!open || selectedOrganizations.length === 0) {
      setConfirmationPhrase("");
      setPreflightError("");
      setPreflightData(null);
      setIsDeleting(false);
      setDeleteError("");
      setDeletionResults(null);
      return;
    }

    let isMounted = true;
    const runPreflight = async () => {
      setPreflightLoading(true);
      setPreflightError("");
      try {
        const orgIds = selectedOrganizations.map((org) => org.id);
        const result = await preflightBulkOrganizationDeletion(orgIds);
        if (isMounted) {
          setPreflightData(result);
        }
      } catch (err) {
        if (isMounted) {
          setPreflightError(
            err instanceof Error
              ? err.message
              : "Failed to validate selected organizations for deletion.",
          );
        }
      } finally {
        if (isMounted) {
          setPreflightLoading(false);
        }
      }
    };

    void runPreflight();

    return () => {
      isMounted = false;
    };
  }, [open, selectedOrganizations]);

  const handleClose = () => {
    if (isDeleting) return;
    onOpenChange(false);
  };

  const isConfirmationValid = bulkOrganizationDeletionConfirmationMatches(confirmationPhrase);

  const handleConfirmBulkDelete = async () => {
    if (!isConfirmationValid || isDeleting || selectedOrganizations.length === 0) return;

    setIsDeleting(true);
    setDeleteError("");

    try {
      const orgIds = selectedOrganizations.map((org) => org.id);
      const result = await permanentlyDeleteBulkOrganizationAccounts(orgIds, confirmationPhrase);
      setDeletionResults(result);
      onDeletionComplete(result);
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during bulk deletion. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const count = selectedOrganizations.length;

  // Compute title & description for results
  const resultTitle = useMemo(() => {
    if (!deletionResults) return `Permanently delete ${count} organization ${count === 1 ? "account" : "accounts"}?`;
    if (deletionResults.failedCount > 0 && deletionResults.deletedCount === 0) {
      return "Bulk deletion could not be completed";
    }
    if (deletionResults.failedCount > 0 || deletionResults.blockedCount > 0) {
      return "Bulk deletion completed with some issues";
    }
    return "Bulk deletion completed successfully";
  }, [deletionResults, count]);

  const resultDescription = useMemo(() => {
    if (!deletionResults) {
      return "This will permanently delete the selected organization accounts and all associated organization-owned records, submissions, and uploaded files. This action cannot be undone.";
    }
    if (deletionResults.failedCount > 0 && deletionResults.deletedCount === 0) {
      return "None of the selected accounts could be deleted. Review the failure reasons below.";
    }
    if (deletionResults.failedCount > 0 || deletionResults.blockedCount > 0) {
      return "Some accounts could not be deleted. Successfully deleted accounts were removed from the registry.";
    }
    return "All selected organization accounts and associated records have been permanently removed.";
  }, [deletionResults]);

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
      <AlertDialogContent
        className="max-w-xl max-h-[90vh] overflow-y-auto admin-organization-delete-dialog"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          confirmationInputRef.current?.focus();
        }}
        onEscapeKeyDown={(event) => { if (isDeleting) event.preventDefault(); }}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <AlertDialogHeader>
          <div className="admin-organization-delete-dialog__icon" aria-hidden="true">
            <AlertTriangle />
          </div>
          <AlertDialogTitle>{resultTitle}</AlertDialogTitle>
          <AlertDialogDescription>{resultDescription}</AlertDialogDescription>
        </AlertDialogHeader>

        {/* RESULTS PHASE */}
        {deletionResults ? (
          <div className="space-y-4 py-2">
            {/* Status counts banner */}
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-1.5 font-segoe text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Deleted: {deletionResults.deletedCount}
              </div>
              {deletionResults.blockedCount > 0 && (
                <div className="flex items-center gap-1.5 font-segoe text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Blocked: {deletionResults.blockedCount}
                </div>
              )}
              {deletionResults.failedCount > 0 && (
                <div className="flex items-center gap-1.5 font-segoe text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                  <XCircle className="h-3.5 w-3.5" />
                  Failed: {deletionResults.failedCount}
                </div>
              )}
            </div>

            {/* Per-item list */}
            <div className="space-y-2">
              <p className="font-segoe text-xs font-semibold text-slate-700">Detailed Results:</p>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-md p-2 bg-white">
                {deletionResults.results.map((res) => {
                  const fallbackProfile = orgProfileMap.get(res.organizationId);
                  const orgName = (res.organizationName && res.organizationName !== "Organization" && res.organizationName !== "Unknown Organization")
                    ? res.organizationName
                    : (fallbackProfile?.organizationName || "Organization");
                  const orgUrn = res.urn || fallbackProfile?.urn || undefined;

                  const isDeleted = res.status === "deleted" || res.status === "deleted_with_storage_cleanup_pending";
                  return (
                    <div
                      key={res.organizationId}
                      className={cn(
                        "flex items-start justify-between gap-2 p-2 rounded text-xs font-segoe border",
                        isDeleted
                          ? "border-emerald-100 bg-emerald-50/40 text-emerald-900"
                          : res.status === "blocked"
                          ? "border-amber-100 bg-amber-50/40 text-amber-900"
                          : "border-red-100 bg-red-50/40 text-red-900",
                      )}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        {isDeleted ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                        ) : res.status === "blocked" ? (
                          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{orgName}</p>
                          {isDeleted ? (
                            <p className="text-[11px] text-emerald-700 mt-0.5">
                              {res.alreadyDeleted
                                ? "Account was already deleted."
                                : res.status === "deleted_with_storage_cleanup_pending"
                                ? "Account deleted (some storage cleanup pending)."
                                : "Permanently deleted."}
                            </p>
                          ) : (
                            res.reason && (
                              <p className="text-[11px] opacity-85 mt-0.5">{res.reason}</p>
                            )
                          )}
                        </div>
                      </div>
                      {orgUrn && <ReferenceCodeChip code={orgUrn} />}
                    </div>
                  );
                })}
              </div>
            </div>

            <AlertDialogFooter>
              <Button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto font-segoe bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Close
              </Button>
            </AlertDialogFooter>
          </div>
        ) : (
          /* CONFIRMATION / PREFLIGHT PHASE */
          <div className="space-y-4">
            {/* Categories summary */}
            <div className="admin-organization-delete-dialog__summary">
              <p className="admin-organization-delete-dialog__summary-title">
                The following will be permanently removed for each selected organization:
              </p>
              <ul>
                {ORGANIZATION_DELETION_CATEGORIES.map((category) => (
                  <li key={category}>{category}</li>
                ))}
              </ul>
            </div>

            {/* Selected organizations preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Target Organizations ({count})
                </Label>
                {preflightLoading && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-500 font-segoe">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Validating accounts…
                  </span>
                )}
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1 border border-slate-200 rounded-md p-2 bg-slate-50/50">
                {selectedOrganizations.map((org) => {
                  const targetPreflight = preflightData?.targets.find((t) => t.id === org.id);
                  const isBlocked = targetPreflight && !targetPreflight.allowed;

                  return (
                    <div
                      key={org.id}
                      className={cn(
                        "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-xs font-segoe bg-white border border-slate-200 shadow-2xs",
                        isBlocked && "border-amber-300 bg-amber-50/60",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="font-semibold text-slate-800 truncate">
                          {org.organizationName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isBlocked && (
                          <span className="text-[11px] font-medium text-amber-700">
                            {targetPreflight?.blockingReason || "Blocked"}
                          </span>
                        )}
                        <ReferenceCodeChip code={org.urn || "—"} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Confirmation phrase input */}
            <div className="space-y-2">
              <Label htmlFor="bulk-delete-confirmation">
                Type “DELETE SELECTED” to confirm
              </Label>
              <p
                id="bulk-delete-instruction"
                className="admin-organization-delete-dialog__instruction"
              >
                Enter “DELETE SELECTED” in all caps to enable bulk deletion.
              </p>
              <Input
                ref={confirmationInputRef}
                id="bulk-delete-confirmation"
                value={confirmationPhrase}
                disabled={isDeleting || preflightLoading}
                autoComplete="off"
                aria-invalid={Boolean(confirmationPhrase && !isConfirmationValid)}
                aria-describedby="bulk-delete-instruction bulk-delete-mismatch"
                onChange={(event) => setConfirmationPhrase(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !isDeleting &&
                    !preflightLoading &&
                    isConfirmationValid
                  ) {
                    event.preventDefault();
                    void handleConfirmBulkDelete();
                  }
                }}
                placeholder="DELETE SELECTED"
              />
              {confirmationPhrase && !isConfirmationValid ? (
                <p id="bulk-delete-mismatch" className="text-xs text-destructive" role="status">
                  Confirmation text must be “DELETE SELECTED”.
                </p>
              ) : null}
            </div>

            <p className="admin-organization-delete-dialog__permanent-warning">
              This action is permanent and cannot be undone. Accounts will not be deactivated; they will be completely erased.
            </p>

            {preflightError && (
              <div className="admin-organization-delete-dialog__error" role="alert">
                {preflightError}
              </div>
            )}

            {deleteError && (
              <div className="admin-organization-delete-dialog__error" role="alert">
                {deleteError}
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isDeleting}
                onClick={handleClose}
                className="font-segoe active:scale-[0.98] transition-transform"
              >
                Cancel
              </AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={
                  isDeleting ||
                  preflightLoading ||
                  !isConfirmationValid ||
                  selectedOrganizations.length === 0
                }
                onClick={() => void handleConfirmBulkDelete()}
                className="font-segoe active:scale-[0.98] transition-transform"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Deleting {count} organization accounts…
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Permanently Delete {count} Accounts
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
