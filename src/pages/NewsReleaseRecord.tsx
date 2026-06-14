import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import { statusLabelMap } from "@/lib/lydo-connect-data";
import SourcePostEmbed from "@/components/SourcePostEmbed";

export default function NewsReleaseRecord() {
  const { newsReleaseId = "" } = useParams<{ newsReleaseId?: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { state } = useLydoConnect();
  const isAdminPreview = pathname.startsWith("/admin");

  const newsRelease = useMemo(
    () => state.newsReleases.find((item) => item.id === newsReleaseId) ?? null,
    [newsReleaseId, state.newsReleases],
  );

  const formattedDate = useMemo(() => {
    if (!newsRelease?.datePosted) return "—";
    return new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "long", day: "numeric" }).format(new Date(newsRelease.datePosted));
  }, [newsRelease?.datePosted]);

  const statusDotColor =
    newsRelease?.visibilityStatus === "published"
      ? "bg-emerald-500"
      : newsRelease?.visibilityStatus === "hidden"
      ? "bg-rose-500"
      : "bg-amber-400";

  const backPath = isAdminPreview ? "/admin/news-releases" : "/news-releases";

  if (!newsRelease) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-16">
          <div className="sticky top-16 z-10 border-b border-border/60 bg-background/95 backdrop-blur-sm">
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
              <div className="flex h-12 items-center">
                <Button type="button" variant="ghost" size="sm" onClick={() => navigate(backPath)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to News Releases
                </Button>
              </div>
            </div>
          </div>
          <section className="container py-16">
            <Card className="border-border/70 shadow-sm">
              <CardContent className="p-6 text-center">
                <h1 className="text-2xl font-bold text-foreground">News release not found</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  The news release you are trying to preview is unavailable.
                </p>
              </CardContent>
            </Card>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">

        {/* Sticky sub-navbar */}
        <div className="sticky top-16 z-10 border-b border-border/60 bg-background/95 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="flex h-12 items-center justify-between gap-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => navigate(backPath)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to News Releases
              </Button>
              <div className="flex shrink-0 items-center gap-2.5">
                {isAdminPreview && (
                  <span className="hidden items-center gap-1.5 text-sm sm:flex">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotColor}`} />
                    <span className="text-muted-foreground">
                      {statusLabelMap[newsRelease.visibilityStatus] ?? newsRelease.visibilityStatus}
                    </span>
                  </span>
                )}
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={newsRelease.facebookPostUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    Open Source Post
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Hero */}
        <section className="hero-gradient overflow-hidden">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 md:py-14">
            <div className="mx-auto max-w-4xl space-y-3 rounded-2xl border border-secondary-foreground/15 bg-secondary-foreground/10 p-4 shadow-sm backdrop-blur-sm sm:space-y-4 sm:p-6 md:p-8">
              <p className="text-[11px] font-medium text-secondary-foreground/75 sm:text-sm">Official Source Post</p>
              <h1 className="text-2xl font-bold leading-tight text-secondary-foreground sm:text-3xl md:text-4xl">
                {newsRelease.title}
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-secondary-foreground/80 sm:text-base">
                {newsRelease.description}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center rounded-full bg-secondary-foreground/95 px-2.5 py-1 text-[11px] font-semibold text-primary sm:px-3 sm:text-xs">
                  <CalendarDays className="mr-1 inline-block h-3.5 w-3.5" />
                  {formattedDate}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary-foreground/25 bg-secondary-foreground/20 px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground sm:px-3 sm:text-xs">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDotColor}`} />
                  {statusLabelMap[newsRelease.visibilityStatus] ?? newsRelease.visibilityStatus}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Facebook embed */}
        <section className="mx-auto w-full max-w-[860px] px-4 py-5 sm:px-6 sm:py-7 md:py-8">
          <Card className="border-border/70 shadow-sm">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <SourcePostEmbed
                sourcePostUrl={newsRelease.facebookPostUrl}
                title={newsRelease.title}
                instanceKey={newsRelease.id}
                className="w-full"
              />
            </CardContent>
          </Card>
        </section>

      </main>
      <Footer />
    </div>
  );
}
