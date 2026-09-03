import { useEffect, useState } from "react";
import { Archive, ChevronRight, Download, Loader, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  compressAndDownloadBundle,
  downloadFileDirect,
  type DownloadableFile,
} from "@/lib/document-compression";

type DownloadDocumentsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFile: DownloadableFile | null;
  allFiles: DownloadableFile[];
  zipName: string;
};

const formatBytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

export function DownloadDocumentsDialog({
  open,
  onOpenChange,
  currentFile,
  allFiles,
  zipName,
}: DownloadDocumentsDialogProps) {
  const { toast } = useToast();
  const [loadingOption, setLoadingOption] = useState<"single" | "compress" | null>(null);
  const [progressMessage, setProgressMessage] = useState("");

  useEffect(() => {
    if (!open) {
      setLoadingOption(null);
      setProgressMessage("");
    }
  }, [open]);

  const handleDownloadOriginal = async () => {
    if (loadingOption || !currentFile) return;
    setLoadingOption("single");
    try {
      await downloadFileDirect(currentFile.url, currentFile.name);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingOption(null);
    }
  };

  const handleCompressAndDownload = async () => {
    if (loadingOption || !allFiles.length) return;
    setLoadingOption("compress");
    try {
      const result = await compressAndDownloadBundle(allFiles, zipName, setProgressMessage);
      onOpenChange(false);
      toast({
        title: result.hitTarget ? "Compressed & downloaded" : "Downloaded (over 3 MB)",
        description: result.hitTarget
          ? `The .zip is ${formatBytes(result.finalSizeBytes)}, within the 3 MB target.`
          : `Even after compression, the smallest achievable size was ${formatBytes(result.finalSizeBytes)}.`,
        variant: result.hitTarget ? undefined : "destructive",
      });
    } catch (error) {
      toast({
        title: "Compression failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingOption(null);
      setProgressMessage("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !loadingOption && onOpenChange(nextOpen)}>
      <DialogContent
        hideCloseButton
        className="flex w-[420px] sm:w-[420px] max-w-[calc(100vw-2rem)] h-auto sm:h-auto max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto gap-6 rounded-md sm:rounded-md border border-slate-300 bg-admin-surface p-6 sm:p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-300 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-public-bg-secondary-100 p-2">
              <Download className="h-5 w-5 text-public-text-brand-secondary" strokeWidth={1.6} />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-segoe text-lg font-semibold leading-none text-text-default">
                Download Documents
              </p>
              <p className="font-segoe text-sm font-normal leading-none text-slate-500">
                Choose how you'd like to download these files.
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              disabled={loadingOption !== null}
              className="h-5 w-5 shrink-0 border-0 bg-transparent p-0 text-border-default shadow-none transition-colors hover:bg-transparent hover:text-public-text-secondary disabled:opacity-50"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </DialogClose>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={loadingOption !== null || !currentFile}
            onClick={() => void handleDownloadOriginal()}
            className="group flex h-[60px] w-full shrink-0 items-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-bg-info-tertiary p-2">
              <Download className="h-5 w-5 text-icon-info-secondary" strokeWidth={1.6} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="font-segoe text-[13px] font-semibold leading-none text-text-default">
                Download Original File
              </p>
              <p className="font-segoe text-[11px] font-normal leading-none text-slate-500">
                Download this file as-is, at full quality.
              </p>
            </div>
            {loadingOption === "single" ? (
              <Loader className="h-4 w-4 shrink-0 animate-spin text-icon-info-secondary" strokeWidth={1.6} />
            ) : (
              <ChevronRight
                className="h-4 w-4 shrink-0 text-text-disabled transition-colors group-hover:text-icon-info-secondary"
                strokeWidth={1.6}
              />
            )}
          </button>

          <button
            type="button"
            disabled={loadingOption !== null || !allFiles.length}
            onClick={() => void handleCompressAndDownload()}
            className="group flex h-[60px] w-full shrink-0 items-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-bg-success-subtle p-2">
              <Archive className="h-5 w-5 text-positive-secondary" strokeWidth={1.6} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="font-segoe text-[13px] font-semibold leading-none text-text-default">
                Compress All & Download (.zip)
              </p>
              <p className="font-segoe text-[11px] font-normal leading-none text-slate-500">
                {loadingOption === "compress" && progressMessage
                  ? progressMessage
                  : `Bundle all ${allFiles.length} document${allFiles.length === 1 ? "" : "s"} into one .zip, targeting 3 MB.`}
              </p>
            </div>
            {loadingOption === "compress" ? (
              <Loader className="h-4 w-4 shrink-0 animate-spin text-positive-secondary" strokeWidth={1.6} />
            ) : (
              <ChevronRight
                className={cn(
                  "h-4 w-4 shrink-0 text-text-disabled transition-colors group-hover:text-positive-secondary",
                )}
                strokeWidth={1.6}
              />
            )}
          </button>
        </div>

        <div className="flex justify-end">
          <DialogClose asChild>
            <button
              type="button"
              disabled={loadingOption !== null}
              className="h-11 rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm font-normal leading-[140%] text-text-default shadow-none transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
