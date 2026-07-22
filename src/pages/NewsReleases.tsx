import { Calendar, ExternalLink, Facebook, Megaphone, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import AnnouncementBar from "@/components/AnnouncementBar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

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
      <section className="public-templates-hero-gradient px-5 pt-[120px] sm:px-6 lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-[48px] pb-[32px] pt-[40px] sm:pb-[48px] sm:pt-[64px]">
          <div className="flex flex-col items-center gap-[16px] text-center sm:items-start sm:text-left">
            <h1 className="font-segoe font-bold leading-[100%] tracking-[-0.03em] text-public-text-neutral-on-neutral text-[32px] sm:text-public-fs-hero">
              News Releases
            </h1>
            <p className="font-segoe font-normal leading-[120%] text-public-text-neutral-on-neutral text-public-fs-subtitle-sm">
              Official announcements and updates from the Pasig City Local Youth Development Office.
            </p>
          </div>

          <div className="flex h-[52px] w-full max-w-[792px] items-center gap-[8px] rounded-full border border-public-border-default bg-white px-[16px]">
            <Search className="h-4 w-4 shrink-0 text-public-text-secondary" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search news releases..."
              className="flex-1 bg-transparent font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-neutral-default outline-none placeholder:text-public-text-secondary"
            />
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-public-bg-section px-5 pb-[64px] pt-[48px] sm:px-6 lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-[24px]">

          {/* Row 1 — Facebook announcement bar */}
          <div className="mx-auto flex w-full max-w-[980px] flex-col overflow-hidden rounded-[8px] border border-[#DCE4F0] bg-white shadow-public-nav sm:flex-row sm:items-center">
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

          {/* Row 2 — Category filter pills */}
          {availableCategories.length > 0 && (
            <div className="flex flex-wrap justify-center gap-[10px] p-[10px]">
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

          {/* Row 3 — Cards grid */}
          {filteredReleases === null ? (
            <div className="grid gap-[24px] py-[10px] sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[470px] animate-pulse rounded-[16px] bg-white" />
              ))}
            </div>
          ) : filteredReleases.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-public-bg-brand-subtle bg-white px-5 py-16 text-center font-segoe text-public-fs-body-sm text-public-text-secondary">
              {query || activeFilter !== "all"
                ? "No news releases match your search."
                : "No news releases published yet."}
            </div>
          ) : (
            <div className="grid gap-[24px] py-[10px] sm:grid-cols-2 xl:grid-cols-3">
              {filteredReleases.map((news) => {
                const formattedDate = new Intl.DateTimeFormat("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }).format(new Date(news.date_posted));

                return (
                  <article
                    key={news.id}
                    className="flex flex-col overflow-hidden rounded-[16px] border border-[#DCE4F0] bg-white shadow-public-nav"
                  >
                    {/* Image area */}
                    <div className="relative flex h-[200px] items-center justify-center bg-gradient-to-b from-[#0E2F66] to-[#1A5CA8] p-[10px] sm:h-[309px]">
                      {news.category && (
                        <div className="absolute left-[10px] top-[10px] z-10 rounded-full border border-[#DCF0FD] bg-white px-[10px] py-[4px]">
                          <span className="font-segoe text-public-fs-body-sm font-semibold leading-none text-public-text-brand">
                            {news.category}
                          </span>
                        </div>
                      )}
                      <Megaphone className="h-[111px] w-[111px] text-white/80" strokeWidth={1.5} />
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
                    <div className="flex flex-col gap-[16px] px-[24px] pb-[24px] pt-[20px]">
                      <h3 className="font-segoe text-public-fs-subtitle-sm font-semibold leading-[120%] tracking-[-0.02em] text-public-text-brand line-clamp-2">
                        {news.title}
                      </h3>
                      <hr className="border-[rgba(178,178,178,1)]" />
                      <div className="flex items-center justify-between gap-[8px]">
                        <div className="flex items-center gap-[8px]">
                          <Calendar className="h-4 w-4 shrink-0 text-public-text-secondary" />
                          <span className="font-segoe text-public-fs-body-sm font-normal leading-none text-public-text-secondary">
                            {formattedDate}
                          </span>
                        </div>
                        <a
                          href={news.facebook_post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-[8px] px-[8px] py-[4px] font-segoe text-public-fs-body-sm font-normal leading-none text-public-text-brand transition-colors hover:underline"
                        >
                          View on Facebook <ExternalLink className="h-3.5 w-3.5" />
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
