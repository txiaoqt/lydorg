import { useMemo } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLydoConnect } from "@/lib/lydo-connect-store";
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

  if (!newsRelease) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-16">
          <section className="container py-16">
            <Card className="border-border/70 shadow-sm">
              <CardContent className="p-6 text-center">
                <h1 className="text-2xl font-bold text-foreground">News release not found</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  The news release you are trying to preview is unavailable.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button type="button" variant="outline" onClick={() => navigate(isAdminPreview ? "/admin/news-releases" : "/news-releases")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to News Releases
                  </Button>
                </div>
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
        <section className="hero-gradient overflow-hidden">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 md:py-14">
            <div className="max-w-4xl space-y-3 rounded-2xl border border-secondary-foreground/15 bg-secondary-foreground/10 p-4 shadow-sm backdrop-blur-sm sm:space-y-4 sm:p-6 md:p-8">
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
                  {newsRelease.datePosted}
                </span>
                <span className="inline-flex items-center rounded-full border border-secondary-foreground/25 bg-secondary-foreground/20 px-2.5 py-1 text-[11px] font-semibold capitalize text-secondary-foreground sm:px-3 sm:text-xs">
                  {newsRelease.visibilityStatus}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6 md:py-10">
          <div className="grid items-start gap-4 xl:grid-cols-[1.35fr_0.75fr] xl:gap-6">
            <div className="min-w-0 space-y-4">
              <Card className="border-border/70 shadow-sm">
                <CardContent className="p-4 sm:p-5 md:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">Open Source Post</p>
                      <p className="text-sm text-muted-foreground">
                        This is the Facebook preview for the selected news release.
                      </p>
                    </div>
                    <Button type="button" variant="outline" className="w-full sm:w-auto" asChild>
                      <a href={newsRelease.facebookPostUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Source Post
                      </a>
                    </Button>
                  </div>

                  <div className="mt-4">
                    <SourcePostEmbed
                      sourcePostUrl={newsRelease.facebookPostUrl}
                      title={newsRelease.title}
                      instanceKey={newsRelease.id}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-4 xl:sticky xl:top-24">
              <Card className="border-border/70 shadow-sm">
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/70">Summary</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Clicked from the News Releases page. This view is for previewing the source post before opening Facebook.
                    </p>
                  </div>
                  <div className="grid gap-3">
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm">
                      <p className="font-medium text-foreground">Title</p>
                      <p className="mt-1 text-muted-foreground">{newsRelease.title}</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm">
                      <p className="font-medium text-foreground">Date Posted</p>
                      <p className="mt-1 text-muted-foreground">{newsRelease.datePosted}</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm">
                      <p className="font-medium text-foreground">Visibility</p>
                      <p className="mt-1 text-muted-foreground">{newsRelease.visibilityStatus}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => navigate(isAdminPreview ? "/admin/news-releases" : "/news-releases")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to News Releases
                </Button>
                <Button type="button" variant="ghost" className="w-full sm:w-auto" asChild>
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
