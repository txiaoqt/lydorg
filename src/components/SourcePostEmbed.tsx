import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Link2Off } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFacebookEmbedIssue, normalizeSourcePostUrl, toFacebookEmbedConfig } from "@/lib/source-post";

type SourcePostEmbedProps = {
  sourcePostUrl?: string | null;
  title: string;
  instanceKey?: string;
  className?: string;
};

export default function SourcePostEmbed({ sourcePostUrl, title, instanceKey, className }: SourcePostEmbedProps) {
  const normalizedSourceUrl = normalizeSourcePostUrl(sourcePostUrl);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  const embedIssue = getFacebookEmbedIssue(normalizedSourceUrl);
  const embedConfig = useMemo(() => toFacebookEmbedConfig(normalizedSourceUrl, measuredWidth ?? 500), [measuredWidth, normalizedSourceUrl]);
  const openLabel = embedConfig?.kind === "page" ? "Open Source Page" : "Open Source Post";
  const embedWidth = Math.max(280, Math.min(750, measuredWidth ?? 500));
  const showLiveEmbed = Boolean(embedConfig);
  const pluginWidth = embedConfig?.kind === "post" ? Math.max(350, embedWidth) : embedWidth;
  const visualWidth = measuredWidth && measuredWidth > 0 ? measuredWidth : pluginWidth;
  const embedScale = pluginWidth > visualWidth ? visualWidth / pluginWidth : 1;
  const embedHeight = embedConfig?.kind === "video" ? 460 : embedConfig?.kind === "page" ? 500 : 640;
  const scaledEmbedHeight = Math.ceil(embedHeight * embedScale);
  const embedRenderKey = `${instanceKey ?? "source"}-${normalizedSourceUrl ?? "none"}-${pluginWidth}`;

  useEffect(() => {
    if (!normalizedSourceUrl) return;

    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => {
      setMeasuredWidth(Math.round(element.getBoundingClientRect().width));
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [normalizedSourceUrl]);

  if (!normalizedSourceUrl) return null;

  return (
    <div ref={containerRef} className={cn("mx-auto w-full max-w-[780px] space-y-3", className)}>
      <a
        href={normalizedSourceUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        {openLabel} <ExternalLink className="h-4 w-4" />
      </a>

      {showLiveEmbed && embedConfig ? (
        <div className="relative overflow-hidden rounded-xl border bg-card" style={{ height: scaledEmbedHeight }}>
          <iframe
            key={embedRenderKey}
            title={`${title} Facebook source preview`}
            src={embedConfig.embedUrl}
            width={pluginWidth}
            height={embedHeight}
            className="block border-0 bg-muted/20"
            style={{
              width: pluginWidth,
              height: embedHeight,
              transform: `scale(${embedScale})`,
              transformOrigin: "top left",
            }}
            loading="lazy"
            allow="encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
          <a
            href={normalizedSourceUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${title} in Facebook`}
            className="absolute inset-0 z-10 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2"
          >
            <span className="sr-only">Open this Facebook post in a new tab</span>
          </a>
        </div>
      ) : (
        <div className="rounded-xl border bg-muted/20 p-6 md:p-8">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 text-primary grid place-items-center">
              <Link2Off className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">Post Preview Unavailable</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This source link can be opened, but Facebook cannot render an embeddable preview for this post format or visibility setting.
            </p>
          </div>
        </div>
      )}
      {embedIssue ? (
        <p className="text-xs text-warning">{embedIssue.message}</p>
      ) : embedConfig ? (
        <p className="text-xs text-muted-foreground">
          If Facebook shows "post no longer available", the post is usually not public/embeddable for all visitors.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Use a direct public Facebook post permalink for embedding.</p>
      )}
    </div>
  );
}
