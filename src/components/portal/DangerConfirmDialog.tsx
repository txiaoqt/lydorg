import type { ReactNode } from "react";
import { AlertTriangle, Info, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

type DangerConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  description: ReactNode;
  warning?: ReactNode;
  warningTone?: "caution" | "danger";
  variant?: "danger" | "info";
  cancelLabel?: string;
  confirmLabel: string;
  confirmIcon?: LucideIcon;
  onConfirm: () => void;
};

export const DangerConfirmDialog = ({
  open,
  onOpenChange,
  icon: Icon,
  title,
  subtitle,
  description,
  warning,
  warningTone = "caution",
  variant = "danger",
  cancelLabel = "Cancel",
  confirmLabel,
  confirmIcon: ConfirmIcon,
  onConfirm,
}: DangerConfirmDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      hideCloseButton
      className="w-[420px] sm:w-[420px] max-w-[calc(100vw-2rem)] h-auto sm:h-auto min-h-[336px] max-h-[calc(100dvh-2rem)] overflow-y-auto gap-6 rounded-md sm:rounded-md border border-slate-300 bg-admin-surface p-6 sm:p-6 shadow-lg"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-300 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] p-2",
              variant === "info" ? "bg-public-bg-secondary-100" : "bg-danger-subtle",
            )}
          >
            <Icon
              className={cn("h-5 w-5", variant === "info" ? "text-public-text-brand-secondary" : "text-icon-danger-secondary")}
              strokeWidth={1.6}
            />
          </div>
          <div className="flex flex-col gap-1">
            <DialogTitle className="font-segoe text-lg font-semibold leading-none text-text-default">
              {title}
            </DialogTitle>
            {subtitle ? <p className="font-segoe text-sm font-normal leading-none text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        <DialogClose asChild>
          <button
            type="button"
            aria-label="Close"
            className="h-5 w-5 shrink-0 border-0 bg-transparent p-0 text-border-default shadow-none transition-colors hover:bg-transparent hover:text-public-text-secondary"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </DialogClose>
      </div>

      <p className="text-justify font-segoe text-[13px] font-normal leading-[120%] text-text-default">
        {description}
      </p>

      {warning ? (
        variant === "info" ? (
          <div className="flex items-start gap-2.5 rounded-md border border-brand-info-border bg-brand-info-subtle p-6">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-public-bg-brand" strokeWidth={1.6} />
            <p className="text-justify font-segoe text-[13px] font-normal leading-[120%] text-public-bg-brand">
              {warning}
            </p>
          </div>
        ) : warningTone === "danger" ? (
          <div className="flex items-start gap-2.5 rounded-md border border-danger-subtle bg-danger-subtle p-6">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-icon-danger-secondary" strokeWidth={1.6} />
            <p className="text-justify font-segoe text-[13px] font-normal leading-[120%] text-icon-danger-secondary">
              {warning}
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 rounded-md border border-border-warning-subtle bg-amber-50 p-6">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-text-warning-secondary" strokeWidth={1.6} />
            <p className="text-justify font-segoe text-[13px] font-normal leading-[120%] text-text-warning-secondary">
              {warning}
            </p>
          </div>
        )
      ) : null}

      <div className="flex justify-end gap-2.5">
        <DialogClose asChild>
          <button
            type="button"
            className={cn(
              "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm font-normal leading-[140%] text-text-default shadow-none transition-colors",
              "hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            {cancelLabel}
          </button>
        </DialogClose>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-3 font-segoe text-public-fs-body-sm font-normal leading-[140%] shadow-none transition-colors",
            variant === "info"
              ? "bg-public-bg-brand text-public-text-neutral-on-neutral hover:bg-bg-brand-hover"
              : "bg-bg-danger-default text-danger-subtle hover:bg-icon-danger-secondary",
          )}
        >
          {ConfirmIcon ? (
            <ConfirmIcon
              className={cn("h-4 w-4", variant === "info" ? "text-public-text-neutral-on-neutral" : "text-danger-subtle")}
              strokeWidth={1.6}
            />
          ) : null}
          {confirmLabel}
        </button>
      </div>
    </DialogContent>
  </Dialog>
);
