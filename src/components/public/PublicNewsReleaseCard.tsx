import React from "react";
import { ExternalLink, Megaphone } from "lucide-react";

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
    <article className="group flex h-full flex-row overflow-hidden border border-slate-200 bg-white transition-colors duration-200 hover:border-public-border-brand/60 sm:flex-col">
      {/* Image */}
      <div className="relative flex aspect-[4/3] w-[38%] shrink-0 items-center justify-center overflow-hidden bg-gradient-to-b from-[#0E2F66] to-[#1A5CA8] sm:aspect-[16/9] sm:w-full sm:shrink">
        <Megaphone className="h-14 w-14 text-white/70" strokeWidth={1.5} />
        {news.preview_image_url && (
          <img
            src={news.preview_image_url}
            alt={news.title}
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3.5 sm:gap-2 sm:p-[18px]">
        {news.category && (
          <span className="font-inter text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-public-text-brand-secondary">
            {news.category}
          </span>
        )}
        <span className="font-inter text-xs font-normal leading-none text-slate-500">
          {formattedDate}
        </span>
        <h3 className="font-editorial text-[15px] font-normal leading-snug text-public-text-brand line-clamp-3 sm:text-[17px] sm:line-clamp-2">
          {news.title}
        </h3>
        {news.description && (
          <div className="hidden sm:block">
            <p className="line-clamp-3 font-inter text-[13px] font-normal leading-[1.55] text-slate-500">
              {news.description}
            </p>
          </div>
        )}
        <a
          href={news.facebook_post_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex w-fit items-center gap-1.5 pt-2 font-inter text-xs font-semibold text-public-text-brand underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2"
        >
          <span>View on Facebook</span>
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        </a>
      </div>
    </article>
  );
};
