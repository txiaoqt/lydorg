import React from "react";
import { FileText, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { cn } from "@/lib/utils";

export interface AttachedFileItem {
  id: string;
  fileName: string;
  fileUrl?: string;
  fileType?: string | null;
  fileSize?: number | null;
  uploadedAt?: string | Date | null;
  isStaged?: boolean;
}

export interface PortalAttachedFileRowProps {
  file: AttachedFileItem;
  isActive: boolean;
  onSelect: () => void;
  status: "verified" | "pending_verification" | "needs_revision" | "rejected" | "draft" | string;
  statusLabel?: string;
  canDelete?: boolean;
  isDeleting?: boolean;
  onDelete?: () => void;
  deleteTitle?: string;
  deleteAriaLabel?: string;
  className?: string;
}

/**
 * Authoritative attached file selector row.
 * Source of truth: Organization-Led PPA File Selector.
 * Used identically across Organization-Led PPA and City-Led YPOP drawers.
 */
export const PortalAttachedFileRow: React.FC<PortalAttachedFileRowProps> = ({
  file,
  isActive,
  onSelect,
  status,
  statusLabel,
  canDelete = false,
  isDeleting = false,
  onDelete,
  deleteTitle = "Remove attachment",
  deleteAriaLabel = "Remove attachment",
  className,
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Select ${file.fileName} for preview`}
      aria-pressed={isActive}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer select-none",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 active:scale-[0.99]",
        isActive
          ? "border-blue-300/80 bg-blue-50/70 dark:border-blue-800/80 dark:bg-blue-950/30 shadow-2xs ring-1 ring-blue-400/20 dark:ring-blue-600/20"
          : "border-border/70 bg-card hover:border-border hover:bg-muted/30 shadow-2xs",
        className
      )}
    >
      {/* Left: Icon and Metadata */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 flex items-center justify-center">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p
            className="text-xs font-bold text-foreground truncate max-w-[160px] xs:max-w-[200px] sm:max-w-[280px]"
            title={file.fileName}
          >
            {file.fileName}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
            <span>{file.fileType ? (file.fileType.includes("pdf") ? "PDF" : file.fileType) : "PDF"}</span>
            <span>•</span>
            <span>{file.fileSize ? `${Math.max(1, Math.round(file.fileSize / 1024))} KB` : "Attached"}</span>
            {file.uploadedAt ? (
              <>
                <span>•</span>
                <span className="truncate max-w-[120px]">
                  {new Date(file.uploadedAt).toLocaleDateString()}
                </span>
              </>
            ) : file.isStaged ? (
              <>
                <span>•</span>
                <span className="text-primary font-semibold">Ready to upload</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Right: Status Badge and Delete (if editable) */}
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge
          status={status}
          label={statusLabel}
          size="sm"
          className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 shadow-none pointer-events-none"
        />

        {/* Delete button (only when editable) */}
        {canDelete && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isDeleting}
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="h-7.5 w-7.5 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center active:scale-95"
            title={deleteTitle}
            aria-label={deleteAriaLabel}
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
