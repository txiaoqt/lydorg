import { ArrowRight, Banknote, Check, ChevronDown, Clock, FileText, Globe, HelpCircle, Info, Mail, MapPin, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-image-upscaled.jpeg";
import YTracePromotionalVideo from "@/components/public/YTracePromotionalVideo";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { PublicNewsReleaseCard } from "@/components/public/PublicNewsReleaseCard";
import { usePublicContactInfo } from "@/lib/admin-system-settings";

const faqs = [
  {
    id: 1,
    question: "What is Y-TRACE?",
    answer: "Y-TRACE is a digital system developed for the Pasig City Youth Development Office (PCYDO) to support youth organization programs and services in Pasig City. Through the public website and Organization Portal, youth organizations can access official information and resources, register for the Youth Organization Registration Program (YORP), participate in the Youth Participation Organization Passport (YPOP) program, submit budget requests and liquidation reports, and view official announcements and updates.",
  },
  {
    id: 2,
    question: "Who can create an account?",
    answer: "The head of a youth organization may register for an account on behalf of the organization. Each account is associated with one youth organization. If your organization already has an active Unique Registration Number (URN), select the option for a previously registered organization during sign-up.",
  },
  {
    id: 3,
    question: "What should I do after signing up?",
    answer: "You can sign up using either your Google account or the standard sign-up method. Regardless of which method you choose, you must complete and save your Organization Profile before proceeding to other sections of the Organization Portal.",
  },
];

type LatestNewsRelease = {
  id: string;
  title: string;
  facebook_post_url: string;
  preview_image_url: string | null;
  date_posted: string;
  category: string | null;
};

const overviewHighlights = [
  "Find registration and compliance guidelines",
  "Access official forms and templates",
  "Submit requirements and track updates online",
];

const quickLinks = [
  { icon: Info, title: "Learn About Y-TRACE", description: "Understand the portal and the services available to youth organizations in Pasig City.", href: "/about" },
  { icon: Banknote, title: "View Budget Information", description: "Review information on youth development funding and budget allocations.", href: "/budget-transparency" },
  { icon: FileText, title: "Access Forms and Templates", description: "Browse and download official PCYDO forms, templates, and reference documents.", href: "/public-templates" },
  { icon: Globe, title: "Read the Latest News", description: "View official announcements and updates from PCYDO.", href: "/news-releases" },
  { icon: HelpCircle, title: "Find Answers", description: "Get answers to common questions about the Y-TRACE portal and PCYDO services.", href: "/faqs" },
  { icon: MapPin, title: "Contact PCYDO", description: "Find official contact information for inquiries and assistance.", href: "/contacts" },
];

const Index = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [latestReleases, setLatestReleases] = useState<LatestNewsRelease[] | null>(null);
  const { address: officeAddress, email: officialEmail } = usePublicContactInfo();
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(officialEmail)}`;
  const { isAuthenticated, role } = useAuth();
  const { hash } = useLocation();
  const portalHref = isAuthenticated ? (role === "admin" ? "/admin" : "/dashboard") : "/signin";

  const portalOverviewPill = (
    <div className="inline-flex w-fit items-center gap-1.5 sm:gap-[10px] rounded-full border border-public-bg-secondary-100 bg-public-bg-secondary-subtle px-2.5 py-0.5 sm:px-[10px] sm:py-[4px] backdrop-blur-[4px]">
      <span className="font-segoe text-xs sm:text-public-fs-body-sm font-semibold uppercase leading-[140%] text-public-text-brand-secondary">
        Portal Overview
      </span>
    </div>
  );

  useEffect(() => {
    if (!supabase) return;
    void supabase
      .from("news_releases")
      .select("id,title,facebook_post_url,preview_image_url,date_posted,category")
      .eq("visibility_status", "published")
      .order("date_posted", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setLatestReleases((data as LatestNewsRelease[] | null) ?? []);
      });
  }, []);

  useEffect(() => {
    if (!hash) return;
    const targetId = hash.replace("#", "");
    const target = document.getElementById(targetId);
    if (!target) return;
    const handle = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(handle);
  }, [hash]);

  return (
    <div className="public-home-page min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="hero-section public-hero-pasig-photo relative flex min-h-0 sm:min-h-[758px] flex-col justify-center overflow-x-clip pt-[84px] sm:pt-[68px] lg:pt-[80px] pb-4 sm:pb-0">
        <div className="container mx-auto relative z-10 w-full max-w-7xl px-3.5 xs:px-4 sm:px-6 lg:px-[64px] py-0 sm:py-10 lg:py-0">
          <div className="flex flex-col-reverse items-center gap-4 sm:gap-6 lg:flex-row lg:items-center lg:gap-[40px]">
            {/* Left column (Text & Actions) */}
            <div className="animate-fade-up flex w-full flex-col items-center gap-3.5 sm:gap-6 lg:gap-[32px] text-center lg:max-w-[440px] lg:items-start lg:shrink-0 lg:text-left xl:max-w-[510px]">
              <div className="flex w-full flex-col items-center gap-2 sm:gap-4 lg:gap-[16px] lg:items-start">

                {/* Portal Badge */}
                <div className="inline-flex w-fit max-w-full items-center gap-2 sm:gap-[8px] rounded-full border border-white/30 bg-white/15 px-3.5 py-1.5 sm:px-[20px] sm:py-[10px] backdrop-blur-[4px]">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-white" />
                  <span className="whitespace-nowrap font-segoe text-[9.5px] xs:text-[10px] sm:text-public-fs-scale-01 font-bold leading-none sm:leading-[140%] tracking-wide sm:tracking-normal text-white">
                    OFFICIAL PASIG CITY YOUTH DEVELOPMENT OFFICE PORTAL
                  </span>
                </div>

                {/* Main Heading */}
                <h1 className="hero-title w-full max-w-[390px] xs:max-w-[400px] sm:max-w-none font-segoe font-bold leading-[1.2] sm:leading-none tracking-tight sm:tracking-[-0.02em] text-white text-[21.5px] xs:text-[22px] sm:text-public-fs-hero">
                  Youth Organization Services<br className="sm:hidden" /> in One Place.
                </h1>

                {/* Description */}
                <p className="hero-description w-full max-w-[342px] sm:max-w-[480px] lg:max-w-none font-segoe font-normal leading-[1.35] sm:leading-[130%] tracking-normal sm:tracking-[-0.02em] text-center text-white/90 text-[12px] sm:text-public-fs-body-md lg:text-justify">
                  Access youth organization services, manage requirements, and stay informed about programs and opportunities through <span className="whitespace-nowrap">Y-TRACE</span>.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex w-full max-w-[382px] sm:max-w-none flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:gap-[16px]">
                <Link
                  to={isAuthenticated ? portalHref : "/signin"}
                  className="flex h-[44px] sm:h-auto items-center justify-center gap-2 rounded-xl sm:rounded-[8px] border border-white/40 bg-transparent px-5 py-2.5 sm:px-[24px] sm:py-[12px] font-segoe text-sm sm:text-public-fs-body-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  {isAuthenticated ? "Open Portal" : "Sign In"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {!isAuthenticated && (
                  <Link
                    to="/signup"
                    className="flex h-[44px] sm:h-auto items-center justify-center rounded-xl sm:rounded-[8px] bg-white px-5 py-2.5 sm:px-[24px] sm:py-[12px] font-segoe text-sm sm:text-public-fs-body-sm font-bold text-[#0E2F66] transition-colors hover:bg-slate-100 shadow-xs"
                  >
                    Create an Account
                  </Link>
                )}
              </div>
            </div>

            {/* Right column — hero image */}
            <div className="animate-float relative min-w-0 flex-1 bg-transparent w-full max-w-[382px] sm:max-w-[500px] lg:max-w-none">
              <img
                src={heroImage}
                alt="Youth organization members at a PCYDO event"
                className="block h-auto w-full rounded-2xl sm:rounded-[8px] border border-white/70 sm:border-public-bg-brand-subtle shadow-md sm:shadow-public-card object-cover"
              />

            </div>
          </div>
        </div>
      </section>

      {/* Quick Access */}
      <section className="bg-public-bg-section py-7 sm:py-10 lg:py-16">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6 lg:gap-8 px-4 sm:px-6 lg:px-[64px]">
          {/* Title block */}
          <div className="flex max-w-3xl flex-col gap-2 sm:gap-3">
            <h2 className="font-segoe font-bold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand text-[22px] sm:text-public-fs-title-page">
              Explore Y-TRACE
            </h2>
            <p className="font-segoe font-normal leading-[1.5] text-public-text-secondary text-sm sm:text-public-fs-body-sm">
              Access official information, resources, and services related to youth organization registration, compliance, and PCYDO programs.
            </p>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6">
            {quickLinks.map(({ icon: Icon, title, description, href }) => (
              <Link
                key={href}
                to={href}
                className="group flex h-full flex-col gap-4 rounded-xl border border-public-bg-brand-subtle bg-white p-4 shadow-public-nav transition-colors hover:border-public-border-brand hover:bg-public-bg-brand-subtle/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2 sm:p-5 lg:p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-public-bg-brand sm:h-12 sm:w-12">
                    <Icon aria-hidden="true" className="h-6 w-6 text-white" />
                  </div>
                  <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0 text-public-text-brand transition-transform group-hover:translate-x-1" />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="font-segoe font-semibold leading-[1.25] tracking-[-0.02em] text-public-text-brand text-base sm:text-public-fs-subtitle-sm">
                    {title}
                  </h3>
                  <p className="font-segoe font-normal leading-[1.5] text-left text-public-text-secondary text-sm sm:text-public-fs-body-sm">
                    {description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="bg-white px-4 py-7 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-5 sm:gap-6 lg:gap-[24px] xl:flex-row xl:items-center">

          {/* Stacked layouts label the section above the video; desktop keeps it in the text column */}
          <div className="w-full self-start xl:hidden">
            {portalOverviewPill}
          </div>

          {/* Left column — autoplay preview with its own expanded player */}
          <div className="w-full self-start xl:w-[540px] xl:shrink-0 xl:self-center">
            <YTracePromotionalVideo />
          </div>

          {/* Right column */}
          <div className="flex w-full flex-col gap-4 sm:gap-6 lg:gap-[24px] xl:px-[24px]">

            {/* Title block */}
            <div className="flex flex-col gap-1.5 sm:gap-[10px] py-1 sm:py-[10px]">
              <div className="hidden xl:block">
                {portalOverviewPill}
              </div>
              <h2 className="font-segoe font-bold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand text-[22px] sm:text-public-fs-title-page">
                Your Gateway to Youth Organization Services
              </h2>
              <p className="max-w-[62ch] font-segoe font-normal leading-relaxed sm:leading-[140%] text-public-text-secondary text-sm sm:text-public-fs-body-sm">
                Y-TRACE brings essential information and digital services for youth organizations in Pasig City into one place. Access guidelines, submit requirements, and keep track of your submissions through the portal.
              </p>
            </div>

            {/* What the portal covers */}
            <div className="rounded-xl border border-public-bg-brand-subtle bg-white p-1.5 shadow-public-nav sm:rounded-[16px] sm:p-[8px]">
              <ul className="flex flex-col divide-y divide-public-bg-brand-subtle">
                {overviewHighlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-3 px-2.5 py-3 sm:px-[12px] sm:py-[12px]">
                    <span aria-hidden="true" className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-public-bg-tertiary-100">
                      <Check className="h-3.5 w-3.5 text-public-text-brand" strokeWidth={2.5} />
                    </span>
                    <span className="font-segoe text-sm sm:text-public-fs-body-sm leading-relaxed text-public-text-secondary">
                      {highlight}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Primary link */}
            <Link
              to="/about"
              className="group inline-flex w-fit items-center justify-center gap-2 rounded-[8px] border border-public-border-brand px-3.5 py-2.5 sm:px-[12px] sm:py-[12px] font-segoe text-sm sm:text-public-fs-body-sm font-semibold text-public-text-brand transition-colors hover:bg-public-bg-brand-subtle active:bg-public-bg-brand-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2"
            >
              Learn more about the portal
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </Link>

          </div>
        </div>
      </section>

      {/* Latest News */}
      {latestReleases !== null && latestReleases.length > 0 && (
        <section className="bg-public-bg-section px-4 py-7 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2.5 sm:gap-[10px]">

            {/* Title group */}
            <div className="flex flex-col gap-2 py-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:py-[10px]">
              <div className="flex flex-col gap-1.5 sm:gap-[10px]">
                <div className="inline-flex w-fit items-center gap-1.5 sm:gap-[10px] rounded-full border border-public-bg-secondary-100 bg-public-bg-secondary-subtle px-2.5 py-0.5 sm:px-[10px] sm:py-[4px] backdrop-blur-[4px]">
                  <span className="font-segoe text-xs sm:text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand-secondary">
                    LATEST NEWS
                  </span>
                </div>
                <h2 className="font-segoe font-bold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand text-[22px] sm:text-public-fs-title-page">
                  Latest News Releases
                </h2>
              </div>
              <Link
                to="/news-releases"
                className="hidden shrink-0 items-center gap-2 rounded-[8px] border border-public-border-brand px-3 py-2.5 sm:inline-flex sm:px-[12px] sm:py-[12px] font-segoe text-sm sm:text-public-fs-body-sm font-semibold text-public-text-brand transition-colors hover:bg-public-bg-brand-subtle active:bg-public-bg-brand-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2"
              >
                View all <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>

            {/* Cards + view all */}
            <div className="flex flex-col gap-2 sm:gap-[8px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 lg:gap-6 py-1 sm:py-2">
                {latestReleases === null ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="h-[300px] sm:h-[380px] lg:h-[380px] animate-pulse rounded-xl sm:rounded-[16px] lg:rounded-2xl bg-white border border-border/50" />
                  ))
                ) : (
                  latestReleases.map((news) => (
                    <PublicNewsReleaseCard key={news.id} news={news} />
                  ))
                )}
              </div>
              <div className="flex pt-1.5 sm:hidden">
                <Link
                  to="/news-releases"
                  className="flex w-full items-center justify-center gap-2 rounded-[8px] border border-public-border-brand px-3 py-2.5 sm:px-[12px] sm:py-[12px] font-segoe text-sm sm:text-public-fs-subheading-sm font-semibold text-public-text-brand transition-colors hover:bg-public-bg-brand-subtle"
                >
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

            </div>

          </div>
        </section>
      )}

      {/* Help Center */}
      <section className="bg-white px-4 py-7 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-5 sm:gap-6 lg:gap-[24px] xl:flex-row xl:items-center">

          {/* Left column */}
          <div className="flex w-full flex-col gap-1.5 sm:gap-[10px] py-1 sm:py-[10px] xl:w-[564px] xl:shrink-0">
            <div className="inline-flex w-fit items-center gap-1.5 sm:gap-[10px] rounded-full border border-public-bg-secondary-100 bg-public-bg-secondary-subtle px-2.5 py-0.5 sm:px-[10px] sm:py-[4px] backdrop-blur-[4px]">
              <span className="font-segoe text-xs sm:text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand-secondary">
                HELP CENTER
              </span>
            </div>
            <h2 className="font-segoe font-bold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand text-[22px] sm:text-public-fs-title-page">
              Frequently Asked Questions
            </h2>
            <p className="font-segoe font-normal leading-normal sm:leading-[100%] text-public-text-secondary text-sm sm:text-public-fs-body-sm">
              Find answers to common questions about PCYDO services and the Y-TRACE portal.
            </p>
          </div>

          {/* Right column — accordion */}
          <div className="flex w-full flex-1 flex-col gap-2.5 sm:gap-3 lg:gap-[16px] pb-3 sm:pb-[24px] pt-2 sm:pt-[16px] xl:px-[16px]">
            {faqs.map(({ id, question, answer }) => (
              <div key={id} className="rounded-xl sm:rounded-[16px] border border-public-border-default bg-white p-3.5 sm:p-5 lg:p-[24px]">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === id ? null : id)}
                  className="flex w-full items-center justify-between gap-2 sm:gap-[8px] text-left"
                >
                  <span className="font-segoe text-sm sm:text-public-fs-subheading-sm font-semibold leading-[140%] text-public-text-brand">
                    {question}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-public-text-brand transition-transform duration-200 ${openFaq === id ? "rotate-180" : ""}`}
                  />
                </button>
                {openFaq === id && (
                  <p className="mt-2.5 sm:mt-[16px] font-segoe text-sm sm:text-public-fs-body-sm font-normal leading-relaxed sm:leading-[140%] text-public-text-secondary">
                    {answer}
                  </p>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-public-bg-section px-3.5 py-7 sm:px-6 sm:py-12 lg:px-[10px] lg:py-[96px]">
        <div className="public-hero-gradient mx-auto flex w-full max-w-[1090px] flex-col items-center gap-5 sm:gap-6 lg:gap-[32px] rounded-xl sm:rounded-[16px] px-4 py-7 sm:px-[32px] sm:py-[64px] shadow-public-overview-card lg:px-[64px] lg:py-[160px]">

          {/* Title group */}
          <div className="flex w-full flex-col items-center gap-2.5 sm:gap-4 lg:gap-[24px] p-1 sm:p-[10px] text-center">
            <h2 className="font-segoe font-bold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-neutral-on-neutral text-[22px] sm:text-public-fs-title-page">
              Get Started with Y-TRACE
            </h2>
            <p className="font-segoe font-medium sm:font-semibold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-neutral-on-neutral text-sm sm:text-public-fs-subtitle-sm">
              Access the Y-TRACE Portal to manage your organization's registration, submit requirements, track compliance, and participate in PCYDO-administered programs.
            </p>
          </div>

          {/* Button group */}
          <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:gap-[16px]">
            <Link
              to="/signup"
              className="flex items-center justify-center rounded-[8px] bg-white px-4 py-2.5 sm:px-[24px] sm:py-[16px] font-segoe text-sm sm:text-public-fs-body-sm font-semibold text-public-text-brand transition-colors hover:bg-public-bg-brand-subtle shadow-xs"
            >
              Create an Account
            </Link>
            <Link
              to="/public-templates"
              className="flex items-center justify-center rounded-[8px] border border-public-bg-brand-subtle px-4 py-2.5 sm:px-[24px] sm:py-[16px] font-segoe text-sm sm:text-public-fs-body-sm font-semibold text-public-text-neutral-on-neutral transition-colors hover:bg-white/10"
            >
              Browse Forms &amp; Templates
            </Link>
          </div>

        </div>
      </section>

      {/* Contact */}
      <section className="bg-white px-4 py-8 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[80px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-8">

          {/* Title group */}
          <div className="flex flex-col gap-2 sm:gap-3 text-center sm:text-left">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-public-bg-secondary-100 bg-public-bg-secondary-subtle px-3 py-1 backdrop-blur-[4px] mx-auto sm:mx-0">
              <span className="font-segoe text-xs sm:text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand-secondary">
                CONTACT
              </span>
            </div>
            <h2 className="font-segoe font-bold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand text-[22px] sm:text-public-fs-title-page">
              Get in Touch
            </h2>
            <p className="font-segoe font-normal leading-normal text-public-text-secondary text-sm sm:text-public-fs-body-sm max-w-xl">
              For inquiries regarding services provided by the Pasig City Youth Development Office (PCYDO), please contact the office through its official communication channels.
            </p>
          </div>

          {/* 3-column contact grid */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">

            {/* Office Address */}
            <div className="flex flex-col items-center gap-3 sm:gap-4 rounded-2xl border border-public-bg-brand-subtle bg-white p-6 shadow-public-nav text-center transition-all hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-public-bg-tertiary-100 p-2.5 text-public-text-brand">
                <MapPin className="h-6 w-6 text-public-text-brand" />
              </div>
              <p className="font-segoe text-xs font-semibold uppercase tracking-wider text-public-text-secondary">
                Office Address
              </p>
              <p className="font-segoe text-sm sm:text-base font-semibold leading-snug text-public-text-brand">
                {officeAddress}
              </p>
            </div>

            {/* Official Email */}
            <div className="flex flex-col items-center gap-3 sm:gap-4 rounded-2xl border border-public-bg-brand-subtle bg-white p-6 shadow-public-nav text-center transition-all hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-public-bg-tertiary-100 p-2.5 text-public-text-brand">
                <Mail className="h-6 w-6 text-public-text-brand" />
              </div>
              <p className="font-segoe text-xs font-semibold uppercase tracking-wider text-public-text-secondary">
                Official Email
              </p>
              <a
                href={gmailComposeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-segoe text-sm sm:text-base font-semibold leading-snug text-public-text-brand hover:underline break-all"
              >
                {officialEmail}
              </a>
            </div>

            {/* Office Hours */}
            <div className="flex flex-col items-center gap-3 sm:gap-4 rounded-2xl border border-public-bg-brand-subtle bg-white p-6 shadow-public-nav text-center transition-all hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-public-bg-tertiary-100 p-2.5 text-public-text-brand">
                <Clock className="h-6 w-6 text-public-text-brand" />
              </div>
              <p className="font-segoe text-xs font-semibold uppercase tracking-wider text-public-text-secondary">
                Office Hours
              </p>
              <div className="font-segoe text-sm sm:text-base font-semibold leading-snug text-public-text-brand flex flex-col items-center gap-0.5">
                <span>Mon – Thu: 7:00 AM – 6:00 PM</span>
                <span className="text-xs font-normal text-slate-500">Fri – Sun: Closed</span>
              </div>
            </div>

          </div>

          {/* Action CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/contacts"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-public-bg-brand px-6 py-3 font-segoe text-sm font-semibold text-public-text-on-brand transition-all hover:bg-public-bg-brand-hover shadow-xs active:scale-[0.98]"
            >
              <MapPin className="h-4 w-4" />
              <span>View Contact Page</span>
            </Link>
            <a
              href={gmailComposeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 font-segoe text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]"
            >
              <Mail className="h-4 w-4" />
              <span>Email PCYDO Directly</span>
            </a>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
