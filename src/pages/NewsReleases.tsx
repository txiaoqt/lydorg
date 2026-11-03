import { ChevronDown, Facebook, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { PublicNewsReleaseCard, type PublicNewsRelease } from "@/components/public/PublicNewsReleaseCard";

const LYDO_FACEBOOK_URL = "https://www.facebook.com/profile.php?id=100064071040238";
const NEWS_CATEGORY_PRIORITY = ["yorp", "ypop", "move"];
export const NEWS_RELEASES_SEARCH_PLACEHOLDER = "Search by title, summary, or keyword…";

export const orderNewsReleaseCategories = (categories: string[]) =>
  [...categories].sort((a, b) => {
    const priorityA = NEWS_CATEGORY_PRIORITY.indexOf(a.trim().toLowerCase());
    const priorityB = NEWS_CATEGORY_PRIORITY.indexOf(b.trim().toLowerCase());
    if (priorityA !== -1 && priorityB !== -1) return priorityA - priorityB;
    if (priorityA !== -1) return -1;
    if (priorityB !== -1) return 1;
    return a.localeCompare(b);
  });

const NewsReleases = () => {
  const [releases, setReleases] = useState<PublicNewsRelease[] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    if (!supabase) return;
    void supabase
      .from("news_releases")
      .select("id,title,description,facebook_post_url,preview_image_url,date_posted,category")
      .eq("visibility_status", "published")
      .order("date_posted", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setReleases((data as PublicNewsRelease[] | null) ?? []);
      });
  }, []);

  const availableCategories = useMemo(
    () => {
      const categories = [
        ...new Set((releases ?? []).map((r) => r.category).filter((c): c is string => Boolean(c))),
      ];

      return orderNewsReleaseCategories(categories);
    },
    [releases],
  );

  const query = searchTerm.trim().toLowerCase();
  const filteredReleases =
    releases?.filter(
      (n) =>
        (activeFilter === "all" || n.category === activeFilter) &&
        (!query ||
          n.title.toLowerCase().includes(query) ||
          (n.description ?? "").toLowerCase().includes(query)),
    ) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="public-templates-hero-gradient public-hero-pasig-photo px-4 pt-16 sm:px-6 sm:pt-20 xl:pt-32 lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-6 pt-6 sm:gap-[48px] sm:pb-[48px] sm:pt-[64px]">
          <div className="flex flex-col items-center gap-2.5 text-center sm:items-start sm:text-left">
            <h1 className="font-inter font-bold leading-[105%] tracking-[-0.03em] text-public-text-neutral-on-neutral text-[28px] sm:text-public-fs-hero">
              News Releases
            </h1>
            <p className="font-inter font-normal leading-relaxed sm:leading-[120%] text-public-text-neutral-on-neutral text-sm sm:text-public-fs-subtitle-sm max-w-xl lg:max-w-5xl lg:min-h-[65px]">
              Official announcements and updates on the programs, services, and activities of the Pasig City Youth Development Office (PCYDO).
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-public-bg-section px-4 pb-10 pt-5 sm:px-6 sm:pb-[64px] sm:pt-[48px] lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-6">

          {/* Toolbar: search spans the row on mobile; category + Facebook split the second row */}
          <div className="grid grid-cols-2 gap-2 font-inter md:flex md:items-center md:gap-3">
            <div className="relative col-span-2 min-w-0 md:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-public-text-secondary" aria-hidden="true" />
              <Input
                type="text"
                aria-label="Search news releases"
                placeholder={NEWS_RELEASES_SEARCH_PLACEHOLDER}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 rounded-[2px] border-public-border-default bg-white pl-9 pr-3 text-base sm:text-sm placeholder:text-public-text-secondary focus-visible:border-public-border-brand focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="group flex h-10 min-w-0 items-center gap-2 rounded-[2px] border border-public-border-default bg-white px-3 text-sm text-public-text-neutral-default transition-colors hover:border-public-border-brand md:min-w-[200px]"
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    <span className="text-public-text-secondary">Category: </span>
                    <span className="font-semibold text-public-text-brand">{activeFilter === "all" ? "All" : activeFilter}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-public-text-brand transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={4}
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[200px] rounded-[2px] border-public-border-default bg-white p-0 font-inter shadow-lg"
              >
                {[{ id: "all", label: "All Categories", count: releases?.length ?? 0 }, ...availableCategories.map((cat) => ({
                  id: cat,
                  label: cat,
                  count: (releases ?? []).filter((r) => r.category === cat).length,
                }))].map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => setActiveFilter(item.id)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-none border-b border-l-2 border-public-border-default px-3 py-3 text-sm leading-snug last:border-b-0 focus:bg-public-bg-section focus:text-public-text-brand",
                      activeFilter === item.id
                        ? "border-l-public-border-brand bg-public-bg-section font-semibold text-public-text-brand"
                        : "border-l-transparent text-public-text-neutral-default"
                    )}
                  >
                    <span>{item.label}</span>
                    <span className="text-xs text-public-text-secondary">{item.count}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <a
              href={LYDO_FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-[2px] bg-public-bg-brand px-4 text-sm font-semibold text-public-text-on-brand transition-colors hover:bg-public-bg-brand-hover md:shrink-0"
            >
              <Facebook className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Visit Facebook</span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>

          {/* News Cards Grid */}
          {filteredReleases === null ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 py-1 sm:py-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-[300px] sm:h-[360px] lg:h-[370px] animate-pulse rounded-xl sm:rounded-[16px] lg:rounded-2xl bg-white border border-border/50" />
              ))}
            </div>
          ) : filteredReleases.length === 0 ? (
            <div className="rounded-xl sm:rounded-2xl border border-dashed border-public-bg-brand-subtle bg-white px-5 py-12 text-center font-inter text-xs sm:text-sm text-public-text-secondary">
              {query || activeFilter !== "all"
                ? "No news releases match your search."
                : "No news releases published yet."}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 py-1 sm:py-2">
              {filteredReleases.map((news) => (
                <PublicNewsReleaseCard key={news.id} news={news} />
              ))}
            </div>
          )}

        </div>
      </section>

      <Footer />
    </div>
  );
};

export default NewsReleases;
