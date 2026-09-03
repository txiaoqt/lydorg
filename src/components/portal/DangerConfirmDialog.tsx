import { useState, type ReactNode } from "react";
import { AlertTriangle, Info, Loader, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

type DangerConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  description: ReactNode;
  content?: ReactNode;
  warning?: ReactNode;
  warningTone?: "caution" | "danger";
  variant?: "danger" | "info" | "warning" | "success";
  cancelLabel?: string;
  confirmLabel: string;
  confirmIcon?: LucideIcon;
  confirmDisabled?: boolean;
  className?: string;
  onConfirm: () => void | Promise<void>;
};

export const DangerConfirmDialog = ({
  open,
  onOpenChange,
  icon: Icon,
  title,
  subtitle,
  description,
  content,
  warning,
  warningTone = "caution",
  variant = "danger",
  cancelLabel = "Cancel",
  confirmLabel,
  confirmIcon: ConfirmIcon,
  confirmDisabled = false,
  className,
  onConfirm,
}: DangerConfirmDialogProps) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirmClick = () => {
    const result = onConfirm();
    if (result && typeof (result as Promise<void>).then === "function") {
      setIsConfirming(true);
      (result as Promise<void>).finally(() => {
        setIsConfirming(false);
        onOpenChange(false);
      });
    } else {
      onOpenChange(false);
    }
  };

  return (
  <Dialog open={open} onOpenChange={(next) => (isConfirming ? undefined : onOpenChange(next))}>
    <DialogContent
      hideCloseButton
      className={cn(
        "w-[420px] sm:w-[420px] max-w-[calc(100vw-2rem)] h-auto sm:h-auto min-h-[336px] max-h-[calc(100dvh-2rem)] overflow-y-auto gap-6 rounded-md sm:rounded-md border border-slate-300 bg-admin-surface p-6 sm:p-6 shadow-lg",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-300 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] p-2",
              variant === "info"
                ? "bg-public-bg-secondary-100"
                : variant === "warning"
                  ? "bg-amber-50"
                  : variant === "success"
                    ? "bg-bg-success-subtle"
                    : "bg-danger-subtle",
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                variant === "info"
                  ? "text-public-text-brand-secondary"
                  : variant === "warning"
                    ? "text-text-warning-secondary"
                    : variant === "success"
                      ? "text-positive-secondary"
                      : "text-icon-danger-secondary",
              )}
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

      {description ? (
        <p className="text-justify font-segoe text-[13px] font-normal leading-[120%] text-text-default">
          {description}
        </p>
      ) : null}

      {content}

      {warning ? (
        variant === "info" ? (
          <div className="flex items-start gap-2.5 rounded-md border border-brand-info-border bg-brand-info-subtle p-6">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-public-bg-brand" strokeWidth={1.6} />
            <p className="text-justify font-segoe text-[13px] font-normal leading-[120%] text-public-bg-brand">
              {warning}
            </p>
          </div>
        ) : variant === "success" ? (
          <div className="flex items-start gap-2.5 rounded-md border border-border-success-subtle bg-bg-success-subtle p-6">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-positive-secondary" strokeWidth={1.6} />
            <p className="text-justify font-segoe text-[13px] font-normal leading-[120%] text-positive-secondary">
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
            disabled={isConfirming}
            className={cn(
              "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm font-normal leading-[140%] text-text-default shadow-none transition-colors disabled:opacity-50",
              "hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            {cancelLabel}
          </button>
        </DialogClose>
        <button
          type="button"
          onClick={handleConfirmClick}
          disabled={isConfirming || confirmDisabled}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-3 font-segoe text-public-fs-body-sm font-normal leading-[140%] shadow-none transition-colors disabled:opacity-50",
            variant === "info"
              ? "bg-public-bg-brand text-public-text-neutral-on-neutral hover:bg-bg-brand-hover"
              : variant === "warning"
                ? "bg-warning-default text-public-text-neutral-on-neutral hover:bg-warning-hover"
                : variant === "success"
                  ? "bg-green-600 text-public-text-neutral-on-neutral hover:bg-green-700"
                  : "bg-bg-danger-default text-danger-subtle hover:bg-icon-danger-secondary",
          )}
        >
          {isConfirming ? (
            <Loader
              className={cn(
                "h-4 w-4 animate-spin",
                variant === "info" || variant === "warning" || variant === "success"
                  ? "text-public-text-neutral-on-neutral"
                  : "text-danger-subtle",
              )}
              strokeWidth={1.6}
            />
          ) : ConfirmIcon ? (
            <ConfirmIcon
              className={cn(
                "h-4 w-4",
                variant === "info" || variant === "warning" || variant === "success"
                  ? "text-public-text-neutral-on-neutral"
                  : "text-danger-subtle",
              )}
              strokeWidth={1.6}
            />
          ) : null}
          {confirmLabel}
        </button>
      </div>
    </DialogContent>
  </Dialog>
  );
};
