import { useCallback, useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { Maximize2, Pause, Play, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import videoSource from "@/assets/videos/ytrace-promotional-video.mp4";
import previewSource from "@/assets/videos/ytrace-promotional-preview.mp4";
import videoPoster from "@/assets/videos/ytrace-promotional-poster.webp";

const playVideo = (video: HTMLVideoElement) => {
  // A visibility change or a browser autoplay preference can interrupt play().
  // The preview's play button and the expanded player's controls remain usable.
  void video.play()?.catch(() => {});
};

export default function YTracePromotionalVideo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const expandedRef = useRef<HTMLVideoElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const expandedDialogId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(() => document.visibilityState !== "hidden");
  const [isPreviewPaused, setIsPreviewPaused] = useState(false);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const [expandedUnavailable, setExpandedUnavailable] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (typeof IntersectionObserver === "undefined") {
      setHasEnteredView(true);
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
      if (entry.isIntersecting) setHasEnteredView(true);
    }, { rootMargin: "100px 0px", threshold: 0.05 });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setIsPageVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const shouldPlayPreview = hasEnteredView && isInView && isPageVisible && !isExpanded && !isPreviewPaused;
  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    if (shouldPlayPreview) playVideo(preview);
    else preview.pause();
  }, [shouldPlayPreview]);

  const setExpandedVideo = useCallback((video: HTMLVideoElement | null) => {
    expandedRef.current?.pause();
    expandedRef.current = video;
    if (video) {
      // This is a new media element on every opening, independent of the loop.
      video.currentTime = 0;
      playVideo(video);
    }
  }, []);

  const onExpandedChange = (open: boolean) => {
    if (open) {
      previewRef.current?.pause();
      setExpandedUnavailable(false);
    } else {
      expandedRef.current?.pause();
    }
    setIsExpanded(open);
  };

  const openExpandedVideo = (event: MouseEvent<HTMLButtonElement>) => {
    openerRef.current = event.currentTarget;
    onExpandedChange(true);
  };

  return (
    <Dialog open={isExpanded} onOpenChange={onExpandedChange}>
      <div ref={containerRef} className="w-full">
        <button
          type="button"
          aria-label="Watch Y-TRACE Overview"
          aria-haspopup="dialog"
          aria-expanded={isExpanded}
          aria-controls={expandedDialogId}
          onClick={openExpandedVideo}
          className="group relative block aspect-video w-full overflow-hidden rounded-[2px] bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-4"
        >
          <video
            ref={previewRef}
            data-testid="promotional-video-preview"
            src={hasEnteredView ? previewSource : undefined}
            poster={videoPoster}
            autoPlay={shouldPlayPreview}
            muted
            loop
            playsInline
            preload={hasEnteredView ? "metadata" : "none"}
            aria-hidden="true"
            tabIndex={-1}
            onError={() => setPreviewUnavailable(true)}
            className="pointer-events-none block h-full w-full object-contain"
          />

          {/* Play affordance */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-[0_8px_24px_rgba(2,12,32,0.35)] transition-transform duration-200 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 sm:h-16 sm:w-16">
              <Play className="ml-0.5 h-6 w-6 fill-public-text-brand text-public-text-brand sm:h-7 sm:w-7" />
            </span>
          </span>

          {/* Caption bar */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent px-4 pb-3 pt-10 sm:px-5 sm:pb-4"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-inter text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-white/70">
                Getting started
              </span>
              <span className="truncate font-inter text-sm font-semibold leading-snug text-white sm:text-base">
                Y-TRACE Overview
              </span>
            </span>
            <span
              aria-label="Video duration: 1 minute 36 seconds"
              className="shrink-0 font-inter text-xs tabular-nums text-white/80"
            >
              1:36
            </span>
          </span>
        </button>

        <div className="mt-2 flex items-center justify-between gap-3 font-inter">
          <button
            type="button"
            aria-label="Expand Y-TRACE Overview"
            aria-haspopup="dialog"
            aria-expanded={isExpanded}
            aria-controls={expandedDialogId}
            onClick={openExpandedVideo}
            className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-public-text-brand transition-colors duration-150 hover:bg-public-bg-brand-subtle active:bg-public-bg-brand-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2"
          >
            <Maximize2 aria-hidden="true" className="h-4 w-4 shrink-0" />
            Watch full video
          </button>
          <div className="flex shrink-0 items-center gap-2">
            {!previewUnavailable && (
              <button
                type="button"
                aria-label={isPreviewPaused ? "Play video preview" : "Pause video preview"}
                title={isPreviewPaused ? "Play preview" : "Pause preview"}
                onClick={() => setIsPreviewPaused((paused) => !paused)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-public-text-brand transition-colors duration-150 hover:bg-public-bg-brand-subtle active:bg-public-bg-brand-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2"
              >
                {isPreviewPaused ? <Play aria-hidden="true" className="h-4 w-4" /> : <Pause aria-hidden="true" className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <DialogContent
        id={expandedDialogId}
        hideCloseButton
        onCloseAutoFocus={(event) => {
          if (openerRef.current?.isConnected) {
            event.preventDefault();
            openerRef.current.focus({ preventScroll: true });
          }
        }}
        className="gap-0 overflow-hidden rounded-xl border-0 bg-slate-950 p-0 text-white shadow-xl motion-reduce:animate-none sm:max-h-[90dvh] sm:max-w-6xl sm:rounded-xl sm:p-0"
      >
        <div className="flex items-center justify-between gap-4 px-4 py-2 sm:px-5">
          <DialogTitle className="font-inter text-base font-semibold text-white">Y-TRACE Overview</DialogTitle>
          <DialogDescription className="sr-only">Discover the Y-TRACE portal and what your organization can do.</DialogDescription>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close video"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </DialogClose>
        </div>
        {isExpanded && (expandedUnavailable ? (
          <div role="alert" className="flex aspect-video flex-col items-center justify-center gap-4 px-6 text-center font-inter">
            <p>We couldn’t load the video. Please try again.</p>
            <button type="button" onClick={() => setExpandedUnavailable(false)} className="rounded-lg bg-white px-4 py-2.5 font-semibold text-public-text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950">
              Try again
            </button>
          </div>
        ) : (
          <video
            ref={setExpandedVideo}
            aria-label="Y-TRACE promotional video"
            src={videoSource}
            poster={videoPoster}
            autoPlay
            controls
            playsInline
            preload="auto"
            onLoadedMetadata={(event) => {
              event.currentTarget.currentTime = 0;
              playVideo(event.currentTarget);
            }}
            onError={() => setExpandedUnavailable(true)}
            className="block max-h-[calc(90dvh-4rem)] w-full bg-black object-contain"
          />
        ))}
      </DialogContent>
    </Dialog>
  );
}
