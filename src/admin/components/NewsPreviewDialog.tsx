import { format } from "date-fns";
import { AlertCircle, Clock, ExternalLink, Megaphone, Tag, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { NewsRelease } from "@/lib/lydo-connect-data";

type NewsPreviewDialogProps = {
  news: NewsRelease | null;
  onOpenChange: (open: boolean) => void;
};

export const NewsPreviewDialog = ({ news, onOpenChange }: NewsPreviewDialogProps) => {
  const date = news ? new Date(news.datePosted) : null;
  const isValidDate = Boolean(date && !Number.isNaN(date.getTime()));

  return (
    <Dialog open={Boolean(news)} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="flex w-[560px] sm:w-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] flex-col gap-3 overflow-y-auto rounded-md sm:rounded-md border border-slate-300 bg-admin-surface p-6 sm:p-6 shadow-lg"
      >
        {news ? (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-slate-300 pb-4">
              <div className="flex flex-col gap-2">
                {news.category ? (
                  <span className="flex w-fit items-center gap-1 rounded-[4px] border border-border-tertiary-200 bg-public-bg-tertiary-100 px-2 py-1 font-segoe text-[13px] font-semibold leading-[140%] text-text-tertiary-800">
                    <Tag className="h-[13px] w-[13px] shrink-0" strokeWidth={1.3} />
                    {news.category}
                  </span>
                ) : null}
                <DialogTitle className="font-segoe text-lg font-semibold leading-none text-text-default">
                  {news.title}
                </DialogTitle>
                <p className="flex items-center gap-1 font-cascadia text-xs font-normal leading-[140%] text-slate-500">
                  <Clock className="h-[13px] w-[13px] shrink-0" strokeWidth={1.3} />
                  Published{" "}
                  {isValidDate ? `${format(date!, "d MMM yyyy")} · ${format(date!, "h:mm a")}` : ""}
                </p>
              </div>
              <DialogClose asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="h-5 w-5 shrink-0 border-0 bg-transparent p-0 text-border-default transition-colors hover:text-public-text-secondary"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </DialogClose>
            </div>

            <div className="flex flex-col gap-2 pt-4">
              {news.previewImageUrl ? (
                <img
                  src={news.previewImageUrl}
                  alt=""
                  className="h-[320px] w-full rounded-md object-cover"
                />
              ) : (
                <div
                  className="flex h-[320px] w-full items-center justify-center rounded-md p-2.5"
                  style={{ background: "linear-gradient(180deg, #0E2F66 0%, #1A5CA8 100%)" }}
                >
                  <Megaphone className="h-14 w-14 text-public-text-neutral-on-neutral" strokeWidth={1.5} />
                </div>
              )}

              <p className="border-b border-slate-300 py-4 text-justify font-segoe text-sm font-normal leading-[120%] text-text-default">
                {news.description}
              </p>

              {news.facebookPostUrl ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-bg-info-secondary bg-info-panel-subtle px-6 py-4">
                  <p className="flex items-center gap-2 font-segoe text-xs font-normal leading-[140%] text-slate-500">
                    <AlertCircle className="h-[13px] w-[13px] shrink-0" strokeWidth={1.3} />
                    Also posted on the PCYDO&apos;s Facebook page
                  </p>
                  <a
                    href={news.facebookPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-[159px] shrink-0 items-center justify-center gap-1.5 rounded-md bg-public-bg-brand px-3 py-2 font-segoe text-public-fs-body-sm font-normal leading-[140%] text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover"
                  >
                    View on Facebook
                    <ExternalLink className="h-4 w-4 shrink-0 text-public-text-neutral-on-neutral" strokeWidth={1.6} />
                  </a>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
