import React from "react";
import { Calendar, ExternalLink, Megaphone } from "lucide-react";

export type PublicNewsRelease = {
  id: string;
  title: string;
  description?: string | null;
  facebook_post_url: string;
  preview_image_url?: string | null;
  date_posted: string;
  category?: string | null;
};

export interface PublicNewsReleaseCardProps {
  news: PublicNewsRelease;
}

export const PublicNewsReleaseCard: React.FC<PublicNewsReleaseCardProps> = ({ news }) => {
  const formattedDate = new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(news.date_posted));

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-xl sm:rounded-[16px] lg:rounded-2xl border border-public-bg-brand-subtle lg:border-[#DCE4F0] bg-white shadow-public-nav lg:transition-all lg:duration-200 lg:hover:border-public-border-brand/50 lg:hover:shadow-md lg:hover:shadow-slate-200/60 h-full">
      {/* Image frame with category badge */}
      <div className="relative flex h-[160px] sm:h-[200px] lg:h-[200px] w-full items-center justify-center bg-gradient-to-b from-[#0E2F66] to-[#1A5CA8] p-2 sm:p-[10px] lg:p-0 overflow-hidden">
        {news.category && (
          <div className="absolute left-2.5 top-2.5 sm:left-[10px] sm:top-[10px] lg:left-3 lg:top-3 z-10 inline-flex w-fit items-center rounded-full border border-[#DCF0FD] lg:border-white/60 bg-white lg:bg-white/95 px-2.5 py-0.5 sm:px-[10px] sm:py-[4px] lg:px-2.5 lg:py-0.5 lg:shadow-2xs lg:backdrop-blur-xs">
            <span className="font-segoe text-xs sm:text-public-fs-body-sm lg:text-xs font-semibold sm:font-semibold lg:font-bold leading-[140%] lg:leading-none text-public-text-brand">
              {news.category}
            </span>
          </div>
        )}
        <Megaphone className="h-16 w-16 sm:h-20 sm:w-20 lg:h-16 lg:w-16 text-white/80" strokeWidth={1.5} />
        {news.preview_image_url && (
          <img
            src={news.preview_image_url}
            alt={news.title}
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover lg:transition-transform lg:duration-300 lg:group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-5 lg:p-5 gap-2.5 sm:gap-3 lg:gap-3">
        <h3 className="font-segoe font-semibold sm:font-semibold lg:font-bold leading-tight sm:leading-[120%] lg:leading-snug tracking-[-0.02em] lg:tracking-[-0.01em] text-public-text-brand lg:text-[#0E2F66] lg:group-hover:text-public-text-brand text-base sm:text-public-fs-subtitle-sm lg:text-base lg:transition-colors line-clamp-2">
          {news.title}
        </h3>

        <div className="space-y-2.5 pt-1">
          <hr className="border-public-border-neutral-tertiary lg:border-border/60" />
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 text-xs lg:gap-2">
            <div className="flex items-center gap-1.5 sm:gap-[8px] py-0.5 sm:py-[4px] lg:py-0 text-slate-500">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-3.5 lg:w-3.5 shrink-0 text-public-text-secondary lg:text-slate-400" />
              <span className="font-segoe text-xs sm:text-public-fs-body-sm lg:text-xs font-normal leading-none text-public-text-secondary lg:text-slate-500">
                {formattedDate}
              </span>
            </div>
            <a
              href={news.facebook_post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 sm:gap-[8px] lg:gap-1 font-segoe text-xs sm:text-public-fs-body-sm lg:text-xs font-semibold text-public-text-brand transition-colors hover:underline shrink-0"
            >
              <span>View on Facebook</span>
              <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-3 lg:w-3 shrink-0" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
};
