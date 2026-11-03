import { ArrowRight, Banknote, Check, Clock, FileText, Globe, HelpCircle, Info, Mail, MapPin, Minus, MoveRight, Plus } from "lucide-react";
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
  description?: string | null;
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


  useEffect(() => {
    if (!supabase) return;
    void supabase
      .from("news_releases")
      .select("id,title,description,facebook_post_url,preview_image_url,date_posted,category")
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
      {/* Starts below the fixed nav (56 / 64 / 80 / 128px) so no part of the photo hides behind it. */}
      <section className="hero-section relative isolate mt-14 overflow-hidden bg-[#1C4F93] sm:mt-16 lg:mt-20 lg:flex lg:h-[42vw] lg:max-h-[760px] lg:items-center xl:mt-32">
        {/* City Hall, multiplied into the brand blue so it reads as a blue-toned texture */}
        <img
          src="/images/pasig-city-hall-header.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_25%] opacity-60 mix-blend-multiply lg:w-[62%]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(14,47,102,0.55)_0%,rgba(14,47,102,0.15)_55%,rgba(14,47,102,0.45)_100%)]"
        />

        {/* Desktop: full PCYDO photo at its natural 3:2 ratio, right-anchored, fading in from the left */}
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="hero-photo-fade-x pointer-events-none absolute inset-y-0 right-0 hidden h-full w-auto max-w-none lg:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(24,70,136,0.6)_0%,rgba(24,70,136,0.5)_38%,rgba(24,70,136,0.22)_54%,rgba(24,70,136,0)_66%)] lg:block xl:bg-[linear-gradient(90deg,rgba(24,70,136,0.55)_0%,rgba(24,70,136,0.35)_34%,rgba(24,70,136,0.12)_46%,rgba(24,70,136,0)_58%)]"
        />

        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-8 pt-10 sm:px-10 sm:pb-10 sm:pt-14 lg:px-20 lg:py-0">
          <div className="animate-fade-up flex flex-col items-start">

            {/* Main Heading */}
            <h1 className="hero-title max-w-[620px] text-balance font-tnr font-normal leading-[1.1] tracking-[-0.01em] text-white text-[32px] sm:text-[44px] lg:text-[42px] xl:text-[54px]">
              Youth Organization Services in One Place
            </h1>

            {/* Description */}
            <p className="hero-description mt-4 max-w-[35rem] lg:max-w-[28rem] xl:max-w-[35rem] font-inter text-base font-normal leading-[1.6] text-white/85 sm:mt-6 lg:mt-7">
              Access youth organization services, manage requirements, and stay informed about programs and opportunities through <span className="whitespace-nowrap">Y-TRACE</span>.
            </p>

            {/* Actions */}
            <div className="mt-7 flex w-full flex-col items-stretch gap-1 sm:mt-8 sm:w-auto sm:flex-row sm:items-center sm:gap-6">
              <Link
                to={isAuthenticated ? portalHref : "/signin"}
                className="group flex h-12 items-center justify-center gap-5 rounded-[2px] bg-[#1A5CA8] px-5 font-inter text-sm font-medium text-white transition-colors duration-150 hover:bg-[#2468B8] active:bg-[#174E8F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C4F93]"
              >
                {isAuthenticated ? "Open Portal" : "Sign In"}
                <MoveRight
                  aria-hidden="true"
                  className="h-5 w-5 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                />
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/signup"
                  className="flex h-12 items-center justify-center rounded-[2px] px-1 font-inter text-sm font-medium text-white underline decoration-white/70 underline-offset-[5px] transition-colors duration-150 hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C4F93]"
                >
                  Create an Account
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile and tablet: the whole photo, uncropped, fading up into the blue */}
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="hero-photo-fade-y pointer-events-none relative block h-auto w-full lg:hidden"
        />
      </section>

      {/* Quick Access */}
      <section className="bg-public-bg-section py-10 sm:py-10 lg:py-16">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-7 lg:gap-9 px-4 sm:px-6 lg:px-[64px]">
          {/* Title block */}
          <div className="flex flex-col gap-2.5 sm:gap-3">
            <span className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-public-text-brand-secondary">
              Quick Links
            </span>
            <h2 className="font-editorial font-normal leading-[1.1] tracking-[-0.01em] text-public-text-brand text-[28px] sm:text-[34px] lg:text-[38px]">
              Explore Y-TRACE
            </h2>
            <p className="max-w-[54ch] font-inter font-normal leading-[1.6] text-public-text-secondary text-sm sm:text-base">
              Access official information, resources, and services related to youth organization registration, compliance, and PCYDO programs.
            </p>
          </div>

          {/* Link rows */}
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-12">
            {quickLinks.map(({ icon: Icon, title, description, href }) => (
              <Link
                key={href}
                to={href}
                className="group flex items-start gap-3 border-t border-slate-200 py-4 transition-colors hover:border-public-border-brand sm:gap-4 sm:py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-4 sm:py-6"
              >
                <Icon
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="mt-px h-6 w-6 shrink-0 text-public-text-brand"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <h3 className="font-inter text-[15px] font-semibold leading-snug text-public-text-brand">
                    {title}
                  </h3>
                  <p className="font-inter text-[13px] font-normal leading-[1.55] text-public-text-secondary">
                    {description}
                  </p>
                </div>
                <ArrowRight
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="mt-px h-5 w-5 shrink-0 text-public-text-brand transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="bg-white px-4 py-10 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 sm:gap-10 lg:gap-12 xl:flex-row xl:items-center xl:gap-14">

          {/* Text column */}
          <div className="flex w-full flex-col items-start xl:w-[42%] xl:shrink-0">

            {/* Title block */}
            <div className="flex flex-col gap-3">
              <span className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-public-text-brand-secondary">
                Portal Overview
              </span>
              <h2 className="font-editorial font-normal leading-[1.12] tracking-[-0.01em] text-public-text-brand text-[28px] sm:text-[34px] lg:text-[36px]">
                Your Gateway to Youth Organization Services
              </h2>
              <p className="max-w-[46ch] font-inter font-normal leading-[1.65] text-public-text-secondary text-sm sm:text-[15px]">
                Y-TRACE brings essential information and digital services for youth organizations in Pasig City into one place. Access guidelines, submit requirements, and keep track of your submissions through the portal.
              </p>
            </div>

            {/* What the portal covers */}
            <ul className="mt-6 flex flex-col gap-3 sm:mt-7">
              {overviewHighlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-3">
                  <Check
                    aria-hidden="true"
                    strokeWidth={2.5}
                    className="mt-0.5 h-4 w-4 shrink-0 text-public-text-brand"
                  />
                  <span className="font-inter text-sm font-normal leading-relaxed text-public-text-secondary">
                    {highlight}
                  </span>
                </li>
              ))}
            </ul>

            {/* Primary link */}
            <Link
              to="/about"
              className="group mt-7 inline-flex w-fit items-center gap-2 rounded-[2px] font-inter text-sm font-semibold text-public-text-brand underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-4"
            >
              Learn more about the portal
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </Link>

          </div>

          {/* Video column */}
          <div className="w-full xl:flex-1">
            <YTracePromotionalVideo />
          </div>
        </div>
      </section>

      {/* Latest News */}
      {latestReleases !== null && latestReleases.length > 0 && (
        <section className="bg-public-bg-section px-4 py-10 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2.5 sm:gap-[10px]">

            {/* Title group */}
            <div className="flex flex-col gap-2 py-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:py-[10px]">
              <div className="flex flex-col gap-2.5">
                <span className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-public-text-brand-secondary">
                  Latest News
                </span>
                <h2 className="font-editorial font-normal leading-[1.1] tracking-[-0.01em] text-public-text-brand text-[28px] sm:text-[34px] lg:text-[38px]">
                  Latest News Releases
                </h2>
              </div>
              <Link
                to="/news-releases"
                className="group hidden shrink-0 items-center gap-2 rounded-[2px] font-inter text-sm font-semibold text-public-text-brand underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-4 sm:inline-flex"
              >
                View all
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                />
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[2px] font-inter text-sm font-semibold text-public-text-brand underline-offset-4 transition-colors hover:underline"
                >
                  View all
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>

            </div>

          </div>
        </section>
      )}

      {/* Help Center */}
      <section className="bg-white px-4 py-10 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 sm:gap-10 lg:gap-14 xl:flex-row xl:items-start">

          {/* Left column */}
          <div className="flex w-full flex-col items-start xl:w-[38%] xl:shrink-0">
            <span className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-public-text-brand-secondary">
              Help Center
            </span>
            <h2 className="mt-3 font-editorial font-normal leading-[1.1] tracking-[-0.01em] text-public-text-brand text-[28px] sm:text-[34px] lg:text-[36px]">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 max-w-[42ch] font-inter text-sm font-normal leading-[1.65] text-public-text-secondary sm:text-[15px]">
              Find answers to common questions about PCYDO services and the Y-TRACE portal.
            </p>
            <Link
              to="/faqs"
              className="group mt-6 inline-flex w-fit items-center gap-2 rounded-[2px] font-inter text-sm font-semibold text-public-text-brand underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-4"
            >
              View all FAQs
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </Link>
          </div>

          {/* Right column — accordion */}
          <div className="w-full flex-1 border-b border-slate-200">
            {faqs.map(({ id, question, answer }) => {
              const isOpen = openFaq === id;
              return (
                <div key={id} className="border-t border-slate-200">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : id)}
                    className="flex w-full items-start justify-between gap-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2 sm:py-5"
                  >
                    <span className="font-inter text-[15px] font-medium leading-snug text-public-text-brand">
                      {question}
                    </span>
                    {isOpen ? (
                      <Minus aria-hidden="true" strokeWidth={2} className="mt-0.5 h-4 w-4 shrink-0 text-public-text-brand" />
                    ) : (
                      <Plus aria-hidden="true" strokeWidth={2} className="mt-0.5 h-4 w-4 shrink-0 text-public-text-brand" />
                    )}
                  </button>
                  {isOpen && (
                    <p className="max-w-[62ch] pb-4 pr-8 font-inter text-[13px] font-normal leading-[1.6] text-public-text-secondary sm:pb-5">
                      {answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* CTA Banner */}
      <section className="public-hero-gradient px-4 py-10 sm:px-6 sm:py-16 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-16">

          {/* Copy */}
          <div className="flex max-w-[54ch] flex-col gap-4">
            <h2 className="font-editorial font-normal leading-[1.12] tracking-[-0.01em] text-white text-[28px] sm:text-[34px] lg:text-[38px]">
              Get Started with Y-TRACE
            </h2>
            <p className="font-inter text-sm font-normal leading-[1.65] text-white/80 sm:text-[15px]">
              Access the Y-TRACE Portal to manage your organization's registration, submit requirements, track compliance, and participate in PCYDO-administered programs.
            </p>
          </div>

          {/* Actions */}
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
            <Link
              to="/signup"
              className="group inline-flex h-12 items-center justify-center gap-5 rounded-[2px] bg-white px-6 font-inter text-sm font-semibold text-public-text-brand transition-colors hover:bg-white/90 active:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E2F66]"
            >
              Create an Account
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </Link>
            <Link
              to="/public-templates"
              className="inline-flex h-11 items-center justify-center rounded-[2px] font-inter text-sm font-medium text-white underline decoration-white/50 underline-offset-[5px] transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E2F66]"
            >
              Browse Forms &amp; Templates
            </Link>
          </div>

        </div>
      </section>

      {/* Contact */}
      <section className="bg-white px-4 py-10 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[80px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">

          {/* Copy */}
          <div className="flex w-full flex-col items-start lg:w-[30%] lg:shrink-0">
            <span className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-public-text-brand-secondary">
              Contact
            </span>
            <h2 className="mt-3 font-editorial font-normal leading-[1.1] tracking-[-0.01em] text-public-text-brand text-[28px] sm:text-[34px] lg:text-[36px]">
              Get in Touch
            </h2>
            <p className="mt-4 max-w-[42ch] font-inter text-sm font-normal leading-[1.65] text-public-text-secondary">
              For inquiries regarding services provided by the Pasig City Youth Development Office (PCYDO), please contact the office through its official communication channels.
            </p>
            <Link
              to="/contacts"
              className="group mt-6 inline-flex w-fit items-center gap-2 rounded-[2px] font-inter text-sm font-semibold text-public-text-brand underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-4"
            >
              View Contact Page
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </Link>
          </div>

          {/* Details */}
          <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2 lg:flex-1 lg:grid-cols-3 lg:gap-10">

            {/* Office Address */}
            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5">
              <MapPin aria-hidden="true" strokeWidth={1.5} className="h-5 w-5 text-public-text-brand" />
              <h3 className="font-inter text-[15px] font-medium leading-snug text-public-text-brand">
                Office Address
              </h3>
              <p className="font-inter text-[13px] font-normal leading-[1.65] text-public-text-secondary">
                {officeAddress}
              </p>
            </div>

            {/* Official Email */}
            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5">
              <Mail aria-hidden="true" strokeWidth={1.5} className="h-5 w-5 text-public-text-brand" />
              <h3 className="font-inter text-[15px] font-medium leading-snug text-public-text-brand">
                Official Email
              </h3>
              <a
                href={gmailComposeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-fit break-all font-inter text-[13px] font-normal leading-[1.65] text-public-text-brand underline underline-offset-[3px] decoration-public-text-brand/40 transition-colors hover:decoration-public-text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2"
              >
                {officialEmail}
              </a>
              <a
                href={gmailComposeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-1 inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-[2px] font-inter text-sm font-semibold text-public-text-brand underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-4"
              >
                Email PCYDO Directly
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                />
              </a>
            </div>

            {/* Office Hours */}
            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5">
              <Clock aria-hidden="true" strokeWidth={1.5} className="h-5 w-5 text-public-text-brand" />
              <h3 className="font-inter text-[15px] font-medium leading-snug text-public-text-brand">
                Office Hours
              </h3>
              <div className="flex flex-col gap-1 font-inter text-[13px] font-normal leading-[1.65] text-public-text-secondary">
                <span>Mon – Thu: 7:00 AM – 6:00 PM</span>
                <span>Fri – Sun: Closed</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
