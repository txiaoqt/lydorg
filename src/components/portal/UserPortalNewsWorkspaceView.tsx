import React, { useState, useMemo, useEffect } from "react";
import {
  Newspaper,
  Search,
  ExternalLink,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import { formatFullActivityTimestamp } from "@/components/activity/RecentActivityPreview";

export interface UserPortalNewsWorkspaceViewProps {
  newsReleases: Array<any>;
  formatShortPortalDate?: (dateStr: string) => string;
  LYDO_FACEBOOK_PAGE_URL: string;
}

// Sub-component for Resolving & Rendering Cover Images (200px - 220px Height for Visual Emphasis)
const NewsCoverImage: React.FC<{ url?: string; title: string }> = ({ url, title }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const rawUrl = url?.trim();

    if (!rawUrl) {
      setLoading(false);
      setHasError(true);
      return;
    }

    const loadUrl = async () => {
      try {
        setLoading(true);
        setHasError(false);
        const resolved = await resolveSupabaseFileUrl(rawUrl);
        if (isMounted) {
          setResolvedUrl(resolved || rawUrl);
        }
      } catch (err) {
        if (isMounted) {
          setResolvedUrl(rawUrl);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadUrl();
    return () => {
      isMounted = false;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="w-full h-52 sm:h-56 bg-muted/40 animate-pulse flex items-center justify-center border-b border-border/40 shrink-0">
        <Newspaper className="h-8 w-8 text-muted-foreground/30" />
      </div>
    );
  }

  if (hasError || !resolvedUrl) {
    return (
      <div className="w-full h-52 sm:h-56 bg-gradient-to-br from-card via-accent/30 to-muted flex flex-col items-center justify-center gap-1.5 text-muted-foreground/60 border-b border-border/40 p-4 text-center shrink-0">
        <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Newspaper className="h-5 w-5" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground">No cover image</span>
      </div>
    );
  }

  return (
    <div className="w-full h-52 sm:h-56 overflow-hidden bg-muted relative border-b border-border/40 shrink-0">
      <img
        src={resolvedUrl}
        alt={title}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
      />
    </div>
  );
};

export const UserPortalNewsWorkspaceView: React.FC<UserPortalNewsWorkspaceViewProps> = ({
  newsReleases,
  formatShortPortalDate,
  LYDO_FACEBOOK_PAGE_URL,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Only published news releases
  const publishedReleases = useMemo(() => {
    return newsReleases.filter((n) => n.visibilityStatus === "published" || n.isPublished !== false);
  }, [newsReleases]);

  // Extract authentic unique categories from database items
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    publishedReleases.forEach((r) => {
      if (r.category?.trim()) cats.add(r.category.trim());
    });
    return Array.from(cats);
  }, [publishedReleases]);

  // Filter releases by Search Query and Category
  const filteredReleases = useMemo(() => {
    const searchLower = searchQuery.trim().toLowerCase();
    return publishedReleases.filter((news) => {
      const matchesCategory = categoryFilter === "all" || news.category === categoryFilter;
      const matchesSearch =
        !searchLower ||
        news.title?.toLowerCase().includes(searchLower) ||
        (news.description ?? news.summary ?? "").toLowerCase().includes(searchLower) ||
        (news.keywords ?? []).some((k: string) => k.toLowerCase().includes(searchLower)) ||
        (news.category ?? "").toLowerCase().includes(searchLower);
      return matchesCategory && matchesSearch;
    });
  }, [publishedReleases, searchQuery, categoryFilter]);

  const handleReadRelease = (news: any) => {
    const targetUrl =
      news.facebookUrl ||
      news.facebookPostUrl ||
      news.url ||
      news.link ||
      LYDO_FACEBOOK_PAGE_URL;
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-background text-foreground transition-colors duration-200 font-sans space-y-6 max-w-[1440px] mx-auto py-2">
      {/* Clean Hero Workspace Header */}
      <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-5 sm:p-6 rounded-2xl border border-border/60 shadow-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-primary">LYDO Bulletin</span>
          <span className="text-muted-foreground/30">•</span>
          <span className="text-xs text-muted-foreground">Official Announcements</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          News & Official Releases
        </h1>
        <p className="text-sm text-muted-foreground max-w-[720px]">
          Stay informed with official updates, YORP registration schedules, and youth policy releases from PCYDO.
        </p>
      </div>

      {/* Unified Search & Category Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/60 p-2.5 px-3 rounded-2xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search news title, summary, keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs rounded-xl bg-background border-border/80"
          />
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl border-border text-xs font-medium gap-1 cursor-pointer">
                <Filter className="h-3.5 w-3.5" /> Category: {categoryFilter === "all" ? "All" : categoryFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-2 rounded-xl bg-card border-border/80">
              <DropdownMenuItem onClick={() => setCategoryFilter("all")} className="text-xs font-medium cursor-pointer">
                All Categories ({publishedReleases.length})
              </DropdownMenuItem>
              {availableCategories.map((cat) => (
                <DropdownMenuItem key={cat} onClick={() => setCategoryFilter(cat)} className="text-xs font-medium cursor-pointer">
                  {cat}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
            className="h-8 rounded-xl border-border text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <a href={LYDO_FACEBOOK_PAGE_URL} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Visit Facebook Page
            </a>
          </Button>
        </div>
      </div>

      {/* 3-Column Responsive News Article Card Grid (~430px Card Heights, 208px-224px Images) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Official News Releases ({filteredReleases.length})
          </h3>
        </div>

        {filteredReleases.length === 0 ? (
          <Card className="p-10 text-center rounded-2xl border border-border/60 bg-card space-y-2.5 shadow-xs">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Newspaper className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-foreground">📰 No announcements found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Try searching for another keyword or selecting a different category filter.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
            {filteredReleases.map((news) => {
              const rawImageUrl = news.previewImageUrl || news.imageUrl || news.coverImageUrl || news.image;
              const dateTimestamp = news.publishedAt || news.datePosted || news.createdAt || news.updatedAt;
              const formattedTime = dateTimestamp ? formatFullActivityTimestamp(dateTimestamp) : "Recently Published";

              return (
                <Card
                  key={news.id}
                  onClick={() => handleReadRelease(news)}
                  className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs hover:-translate-y-1 hover:shadow-md transition-all duration-200 flex flex-col h-auto min-h-[380px] sm:h-[430px] group cursor-pointer"
                >
                  {/* 1. Primary Visual Focus: Cover Image (200px - 220px Height) */}
                  <NewsCoverImage url={rawImageUrl} title={news.title} />

                  {/* 2. Body Content Container with flex-grow spacer */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2 min-h-0">
                    <div className="space-y-2 min-h-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center text-[10px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                          {news.category || "Official Release"}
                        </span>
                      </div>

                      {/* Strict 2-Line Clamped Title */}
                      <h4
                        className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug overflow-hidden text-ellipsis"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: "1.35",
                        }}
                        title={news.title}
                      >
                        {news.title}
                      </h4>

                      {/* Strict 2-Line Clamped Summary with Line Height 1.5 */}
                      <p
                        className="text-xs text-muted-foreground leading-relaxed overflow-hidden text-ellipsis"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: "1.5",
                        }}
                      >
                        {news.description || news.summary || "Read the full official announcement details on the official PCYDO Facebook page."}
                      </p>
                    </div>

                    {/* flex-grow spacer */}
                    <div className="flex-1" />
                  </div>

                  {/* 3. Fixed Baseline Footer (Pinned at bottom using mt-auto shrink-0) */}
                  <div className="px-4 py-3 border-t border-border/40 bg-muted/10 flex items-center justify-between mt-auto shrink-0">
                    <span className="text-[11px] font-medium text-muted-foreground truncate pr-2">
                      {formattedTime}
                    </span>

                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReadRelease(news);
                      }}
                      className="h-7 px-2.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs gap-1 shrink-0 cursor-pointer"
                    >
                      Read Release <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
