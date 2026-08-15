import { Calendar, ChevronDown, ExternalLink, Facebook, Filter, Megaphone, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import AnnouncementBar from "@/components/AnnouncementBar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const LYDO_FACEBOOK_URL = "https://www.facebook.com/profile.php?id=100064071040238";

type PublicNewsRelease = {
  id: string;
  title: string;
  description: string | null;
  facebook_post_url: string;
  preview_image_url: string | null;
  date_posted: string;
  category: string | null;
};

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
    () =>
      [...new Set((releases ?? []).map((r) => r.category).filter((c): c is string => Boolean(c)))].sort(),
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
      <AnnouncementBar />
      <Navbar />

      {/* Hero */}
      <section className="public-templates-hero-gradient px-4 pt-[96px] sm:px-6 sm:pt-[120px] lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-6 pt-6 sm:gap-[48px] sm:pb-[48px] sm:pt-[64px]">
          <div className="flex flex-col items-center gap-2.5 text-center sm:items-start sm:text-left">
            <h1 className="font-segoe font-bold leading-[105%] tracking-[-0.03em] text-public-text-neutral-on-neutral text-[28px] sm:text-public-fs-hero">
              News Releases
            </h1>
            <p className="font-segoe font-normal leading-relaxed sm:leading-[120%] text-public-text-neutral-on-neutral text-sm sm:text-public-fs-subtitle-sm max-w-xl">
              Official announcements and updates from the Pasig City Local Youth Development Office.
            </p>
          </div>

          {/* Desktop Search Bar — visible on sm and up */}
          <div className="hidden sm:flex h-[52px] w-full max-w-[792px] items-center gap-[8px] rounded-full border border-public-border-default bg-white px-[16px] shadow-xs">
            <Search className="h-4 w-4 shrink-0 text-public-text-secondary" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search news releases..."
              className="flex-1 bg-transparent font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-neutral-default outline-hidden placeholder:text-public-text-secondary"
            />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-public-bg-section px-4 pb-10 pt-5 sm:px-6 sm:pb-[64px] sm:pt-[48px] lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-[24px]">

          {/* Mobile Unified Toolbar: Single Search + [Category: All] [Visit Facebook] (matching Forms & Templates) */}
          <div className="flex flex-col gap-2.5 bg-card border border-border/60 p-2.5 px-3 rounded-2xl shadow-xs md:hidden mb-1">
            {/* Full-width Search Input */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search news title, summary, keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 pr-3 text-base sm:text-sm rounded-xl bg-background border-border/80 shadow-2xs font-segoe placeholder:text-muted-foreground"
              />
            </div>

            {/* Row 2: Equal-width Action Buttons (50/50 split) */}
            <div className="flex items-center gap-2">
              {/* Category Action Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 rounded-xl border-border/80 bg-background text-sm font-semibold gap-1.5 justify-center shadow-2xs cursor-pointer truncate text-primary hover:text-primary hover:bg-primary/5"
                  >
                    <Filter className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">
                      {activeFilter === "all" ? "Category: All" : `Category: ${activeFilter}`}
                    </span>
                    <ChevronDown className="h-3 w-3 text-primary shrink-0 opacity-70 ml-auto" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1.5 rounded-xl bg-card border-border/80 shadow-lg">
                  <DropdownMenuItem
                    onClick={() => setActiveFilter("all")}
                    className={cn(
                      "text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-between py-1.5 px-2.5",
                      activeFilter === "all" && "bg-primary/10 text-primary font-bold"
                    )}
                  >
                    <span>All Categories</span>
                    <span className="text-[10px] text-muted-foreground">({releases?.length ?? 0})</span>
                  </DropdownMenuItem>
                  {availableCategories.map((cat) => {
                    const count = (releases ?? []).filter((r) => r.category === cat).length;
                    return (
                      <DropdownMenuItem
                        key={cat}
                        onClick={() => setActiveFilter(cat)}
                        className={cn(
                          "text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-between py-1.5 px-2.5",
                          activeFilter === cat && "bg-primary/10 text-primary font-bold"
                        )}
                      >
                        <span>{cat}</span>
                        <span className="text-[10px] text-muted-foreground">({count})</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Visit Facebook Page Action Button */}
              <a
                href={LYDO_FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 flex-1 rounded-xl border border-border/80 bg-background text-sm font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer truncate text-primary hover:text-primary hover:bg-primary/5 transition-colors"
              >
                <Facebook className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">Visit Facebook</span>
              </a>
            </div>
          </div>

          {/* Desktop Facebook announcement bar — visible on md and up */}
          <div className="hidden md:flex mx-auto w-full max-w-[980px] flex-col overflow-hidden rounded-[8px] border border-[#DCE4F0] bg-white shadow-public-nav sm:flex-row sm:items-center">
            {/* Icon + text */}
            <div className="flex flex-1 items-center gap-[24px] px-[24px] pb-[16px] pt-[24px] sm:py-[24px]">
              <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[8px] bg-[#EEF7FE] p-[8px]">
                <Facebook className="h-[32px] w-[32px] text-public-text-brand" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-[4px]">
                <p className="font-segoe text-public-fs-subheading-sm font-semibold leading-[140%] text-public-text-brand">
                  Official announcements are posted on Facebook
                </p>
                <p className="font-segoe text-public-fs-body-sm font-normal leading-[100%] text-public-text-neutral-default">
                  Follow the official LYDO Pasig City page to stay updated on the latest news.
                </p>
              </div>
            </div>

            {/* Button */}
            <div className="flex shrink-0 items-center px-[24px] pb-[24px] pt-0 sm:py-[24px]">
              <a
                href={LYDO_FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-[8px] rounded-[4px] bg-[#0E2F66] px-[12px] py-[10px] font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-[#F5F5F5] sm:w-auto sm:py-0 sm:h-[40px]"
              >
                <Facebook className="h-[16px] w-[16px]" /> Visit Facebook Page
              </a>
            </div>
          </div>

          {/* Desktop Category filter pills — visible on md and up */}
          {availableCategories.length > 0 && (
            <div className="hidden md:flex flex-wrap justify-center gap-[10px] p-[10px]">
              {["all", ...availableCategories].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveFilter(cat)}
                  className={
                    activeFilter === cat
                      ? "rounded-full bg-public-bg-brand px-[20px] py-[10px] font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-neutral-on-neutral backdrop-blur-[4px]"
                      : "rounded-full border border-public-border-default bg-white px-[20px] py-[10px] font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-neutral-default"
                  }
                >
                  {cat === "all" ? "All" : cat}
                </button>
              ))}
            </div>
          )}

          {/* News Cards Grid */}
          {filteredReleases === null ? (
            <div className="grid gap-3.5 sm:gap-[24px] py-1 sm:py-[10px] sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[360px] sm:h-[470px] animate-pulse rounded-xl sm:rounded-[16px] bg-white border border-border/50" />
              ))}
            </div>
          ) : filteredReleases.length === 0 ? (
            <div className="rounded-xl sm:rounded-[16px] border border-dashed border-public-bg-brand-subtle bg-white px-5 py-12 text-center font-segoe text-xs sm:text-public-fs-body-sm text-public-text-secondary">
              {query || activeFilter !== "all"
                ? "No news releases match your search."
                : "No news releases published yet."}
            </div>
          ) : (
            <div className="grid gap-3.5 sm:gap-[24px] py-1 sm:py-[10px] sm:grid-cols-2 xl:grid-cols-3">
              {filteredReleases.map((news) => {
                const formattedDate = new Intl.DateTimeFormat("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }).format(new Date(news.date_posted));

                return (
                  <article
                    key={news.id}
                    className="flex flex-col overflow-hidden rounded-xl sm:rounded-[16px] border border-[#DCE4F0] bg-white shadow-public-nav transition-shadow hover:shadow-md"
                  >
                    {/* Image area */}
                    <div className="relative flex h-[160px] items-center justify-center bg-gradient-to-b from-[#0E2F66] to-[#1A5CA8] p-[10px] sm:h-[309px]">
                      {news.category && (
                        <div className="absolute left-2.5 top-2.5 z-10 rounded-full border border-[#DCF0FD] bg-white px-2.5 py-0.5 sm:px-[10px] sm:py-[4px] shadow-2xs">
                          <span className="font-segoe text-xs sm:text-public-fs-body-sm font-bold sm:font-semibold leading-none text-public-text-brand">
                            {news.category}
                          </span>
                        </div>
                      )}
                      <Megaphone className="h-16 w-16 sm:h-[111px] sm:w-[111px] text-white/80" strokeWidth={1.5} />
                      {news.preview_image_url && (
                        <img
                          src={news.preview_image_url}
                          alt={news.title}
                          referrerPolicy="no-referrer"
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                    </div>

                    {/* Card bottom */}
                    <div className="flex flex-col gap-2.5 sm:gap-[16px] p-3.5 sm:px-[24px] sm:pb-[24px] sm:pt-[20px]">
                      <h3 className="font-segoe text-base sm:text-public-fs-subtitle-sm font-semibold leading-[130%] sm:leading-[120%] tracking-[-0.02em] text-public-text-brand line-clamp-2">
                        {news.title}
                      </h3>
                      <hr className="border-border/60" />
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-public-text-secondary" />
                          <span className="font-segoe text-xs sm:text-public-fs-body-sm font-normal leading-none text-public-text-secondary">
                            {formattedDate}
                          </span>
                        </div>
                        <a
                          href={news.facebook_post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-1.5 py-1 font-segoe text-xs sm:text-public-fs-body-sm font-semibold sm:font-normal leading-none text-public-text-brand transition-colors hover:underline shrink-0"
                        >
                          <span>Facebook</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

        </div>
      </section>

      <Footer />
    </div>
  );
};

export default NewsReleases;
