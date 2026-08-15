import { ArrowRight, BookOpen, Calendar, ChevronDown, ClipboardList, Clock, Download, ExternalLink, Eye, FileText, Globe, HelpCircle, Info, Mail, MapPin, Megaphone, Phone, Send, Shield, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import AnnouncementBar from "@/components/AnnouncementBar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-image.webp";
import overviewPreview from "@/assets/overview-preview.jpg";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import { toast } from "@/hooks/use-toast";

const faqs = [
  {
    id: 1,
    question: "How do I register my youth organization with PCYDO?",
    answer: "Navigate to the Sign Up page and create an account for your organization. You will then be guided through submitting the required documents for PCYDO review and approval.",
  },
  {
    id: 2,
    question: "What documents are required for compliance submission?",
    answer: "Required documents include your registration form, financial statements, activity reports, and officer information. Download the templates from the Forms & Templates section.",
  },
  {
    id: 3,
    question: "How do I track the status of my submitted documents?",
    answer: "After logging in, your dashboard shows the real-time status of all submitted documents, pending requirements, and upcoming compliance deadlines.",
  },
];

const getFileType = (url: string | null | undefined): string => {
  if (!url) return "FILE";
  const ext = url.split(".").pop()?.split("?")[0].toUpperCase() ?? "FILE";
  return ext.length <= 5 ? ext : "FILE";
};

type LatestNewsRelease = {
  id: string;
  title: string;
  facebook_post_url: string;
  preview_image_url: string | null;
  date_posted: string;
  category: string | null;
};

const overviewCards = [
  { icon: BookOpen,      title: "Learn the Process",       description: "Understand the compliance workflow and requirements for PCYDO-registered youth organizations." },
  { icon: FileText,      title: "Access Official Forms",   description: "Download the required forms for registration, activity budgets, and liquidation reports." },
  { icon: Send,          title: "Apply Online",            description: "Submit your organization's documents and applications directly through the portal." },
  { icon: ClipboardList, title: "Track Your Application",  description: "Monitor submission statuses and stay on top of compliance deadlines in real time." },
];

const quickLinks = [
  { icon: Info,       title: "About",             description: "Learn about PCYDO and its mandate for Pasig City youth organizations.",       href: "/about" },
  { icon: FileText,   title: "Forms & Templates", description: "Download official forms and document templates for compliance submission.",    href: "/public-templates" },
  { icon: Globe,      title: "News Releases",     description: "Stay updated with the latest official announcements and events from PCYDO.",   href: "/news-releases" },
  { icon: HelpCircle, title: "FAQs",              description: "Find answers to common questions about the portal and compliance processes.", href: "/faqs" },
];

const Index = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [orgCount, setOrgCount] = useState<number | null>(null);
  const [activityCount, setActivityCount] = useState<number | null>(null);
  const [openingTemplateId, setOpeningTemplateId] = useState<string | null>(null);
  const [downloadingTemplateId, setDownloadingTemplateId] = useState<string | null>(null);
  const [latestReleases, setLatestReleases] = useState<LatestNewsRelease[] | null>(null);
  const { isAuthenticated, role } = useAuth();
  const { hash } = useLocation();
  const { state } = useLydoConnect();
  const portalHref = isAuthenticated ? (role === "admin" ? "/admin" : "/dashboard") : "/signin";

  const featuredTemplates = useMemo(
    () =>
      [...state.templates]
        .filter((t) => t.templateActive && t.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, 3),
    [state.templates],
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

  const openTemplate = async (fileUrl: string, fileName: string) => {
    if (!fileUrl || fileUrl.startsWith("#")) {
      toast({ title: "Preview unavailable", description: "No file is available for preview yet.", variant: "destructive" });
      return;
    }
    setOpeningTemplateId(fileName);
    try {
      const resolvedUrl = await resolveSupabaseFileUrl(fileUrl);
      window.open(resolvedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({ title: "Unable to open template", description: error instanceof Error ? error.message : "The file could not be opened.", variant: "destructive" });
    } finally {
      setOpeningTemplateId(null);
    }
  };

  const downloadTemplate = async (fileUrl: string, fileName: string) => {
    if (!fileUrl || fileUrl.startsWith("#")) {
      toast({ title: "Download unavailable", description: "No file is available for download yet.", variant: "destructive" });
      return;
    }
    setDownloadingTemplateId(fileName);
    try {
      const resolvedUrl = await resolveSupabaseFileUrl(fileUrl);
      const response = await fetch(resolvedUrl);
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();

      let targetFileName = fileName.trim().replace(/[/\\?%*:|"<>]/g, "-");
      const hasExt = /\.(pdf|docx?|xlsx?|pptx?|zip|png|jpe?g|txt|csv)$/i.test(targetFileName);
      if (!hasExt) {
        if (resolvedUrl.toLowerCase().includes(".pdf") || blob.type.includes("pdf")) {
          targetFileName += ".pdf";
        } else if (resolvedUrl.toLowerCase().includes(".docx") || blob.type.includes("word")) {
          targetFileName += ".docx";
        } else if (resolvedUrl.toLowerCase().includes(".xlsx") || blob.type.includes("sheet") || blob.type.includes("excel")) {
          targetFileName += ".xlsx";
        } else {
          targetFileName += ".pdf";
        }
      }

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = targetFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast({ title: "Download failed", description: error instanceof Error ? error.message : "The file could not be downloaded.", variant: "destructive" });
    } finally {
      setDownloadingTemplateId(null);
    }
  };

  useEffect(() => {
    if (!supabase) return;
    void supabase
      .rpc("get_public_stats")
      .then(({ data }) => {
        const row = Array.isArray(data) ? data[0] : null;
        if (!row) return;
        setOrgCount(Number(row.verified_org_count));
        setActivityCount(Number(row.activity_count));
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
      <AnnouncementBar />
      <Navbar />

      {/* Hero */}
      <section className="hero-section public-hero-gradient relative flex min-h-0 sm:min-h-[758px] flex-col justify-center overflow-x-clip pt-[116px] sm:pt-[108px] lg:pt-[120px] pb-4 sm:pb-0">
        <div className="container mx-auto relative z-10 w-full max-w-7xl px-3.5 xs:px-4 sm:px-6 lg:px-[64px] py-0 sm:py-10 lg:py-0">
          <div className="flex flex-col-reverse items-center gap-4 sm:gap-6 lg:flex-row lg:items-center lg:gap-[40px]">
            {/* Left column (Text & Actions) */}
            <div className="animate-fade-up flex w-full flex-col items-center gap-3.5 sm:gap-6 lg:gap-[32px] text-center lg:max-w-[440px] lg:items-start lg:shrink-0 lg:text-left xl:max-w-[510px]">
              <div className="flex w-full flex-col items-center gap-2 sm:gap-4 lg:gap-[16px] lg:items-start">
                
                {/* Portal Badge */}
                <div className="inline-flex w-fit max-w-full items-center gap-2 sm:gap-[8px] rounded-full border border-white/30 bg-white/15 px-3.5 py-1.5 sm:px-[20px] sm:py-[10px] backdrop-blur-[4px]">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-white" />
                  <span className="whitespace-nowrap font-segoe text-[9.5px] xs:text-[10px] sm:text-public-fs-scale-01 font-bold leading-none sm:leading-[140%] tracking-wide sm:tracking-normal text-white">
                    OFFICIAL PASIG CITY LOCAL YOUTH DEVELOPMENT OFFICE PORTAL
                  </span>
                </div>

                {/* Main Heading */}
                <h1 className="hero-title w-full max-w-[390px] xs:max-w-[400px] sm:max-w-none font-segoe font-bold leading-[1.2] sm:leading-none tracking-tight sm:tracking-[-0.02em] text-white text-[21.5px] xs:text-[22px] sm:text-public-fs-hero lg:text-[30px] xl:text-public-fs-hero">
                  Your youth organization's compliance,<br className="sm:hidden" /> simplified.
                </h1>

                {/* Description */}
                <p className="hero-description w-full max-w-[342px] sm:max-w-[480px] lg:max-w-none font-segoe font-normal leading-[1.35] sm:leading-[130%] tracking-normal sm:tracking-[-0.02em] text-center text-white/90 text-[12px] sm:text-public-fs-body-md lg:text-justify">
                  Register, submit compliance documents, request activity budgets, and track liquidation deadlines - all in one place with PCYDO.
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

            {/* Right column — hero image with floating stat cards */}
            <div className="animate-float relative min-w-0 flex-1 bg-transparent w-full max-w-[382px] sm:max-w-[500px] lg:max-w-none">
              {/* Floating card — top right */}
              <div className="absolute -right-4 -top-6 z-10 hidden h-[48px] w-auto min-w-[152px] items-center gap-[12px] rounded-[8px] bg-white px-[10px] py-[6px] shadow-public-card sm:flex">
                <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] bg-public-bg-brand-subtle p-[6px]">
                  <Users className="h-4 w-4 text-public-text-brand" />
                </div>
                <div>
                  <p className="whitespace-nowrap font-segoe text-public-fs-scale-01 font-normal leading-[140%] text-public-text-secondary">Registered Orgs</p>
                  <p className="font-segoe text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand">
                    {orgCount != null ? String(orgCount).padStart(2, "0") : "—"}
                  </p>
                </div>
              </div>

              <img
                src={heroImage}
                alt="Youth organization members at a PCYDO event"
                className="block h-auto w-full rounded-2xl sm:rounded-[8px] border border-white/70 sm:border-public-bg-brand-subtle shadow-md sm:shadow-public-card object-cover"
              />

              {/* Floating card — bottom left */}
              <div className="absolute -bottom-6 -left-10 z-10 hidden h-[48px] w-auto min-w-[132px] items-center gap-[12px] rounded-[8px] bg-white px-[10px] py-[6px] shadow-public-card sm:flex">
                <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] bg-public-bg-brand-subtle p-[6px]">
                  <ClipboardList className="h-4 w-4 text-public-text-brand" />
                </div>
                <div>
                  <p className="whitespace-nowrap font-segoe text-public-fs-scale-01 font-normal leading-[140%] text-public-text-secondary">Activities</p>
                  <p className="font-segoe text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand">
                    {activityCount != null ? String(activityCount).padStart(2, "0") : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access */}
      <section className="bg-public-bg-section py-7 sm:py-12 lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2.5 sm:gap-[10px] px-4 sm:px-6 lg:px-[64px]">
          {/* Title block */}
          <div className="flex flex-col gap-1.5 sm:gap-[10px] py-1 sm:py-[10px]">
            <div className="inline-flex w-fit items-center gap-1.5 sm:gap-[10px] rounded-full border border-public-bg-secondary-100 bg-public-bg-secondary-subtle px-2.5 py-0.5 sm:px-[10px] sm:py-[4px] backdrop-blur-[4px]">
              <span className="font-segoe text-xs sm:text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand-secondary">
                QUICK LINKS
              </span>
            </div>
            <h2 className="font-segoe font-bold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand text-[22px] sm:text-2xl lg:text-public-fs-title-page">
              Explore the Portal
            </h2>
            <p className="font-segoe font-normal leading-normal sm:leading-[100%] text-public-text-secondary text-sm sm:text-sm lg:text-public-fs-subheading-sm">
              Access the portal's key sections — from compliance forms and official news releases to FAQs and information about PCYDO.
            </p>
          </div>

          {/* Cards grid */}
          <div className="grid gap-3 sm:gap-4 lg:gap-[24px] py-1 sm:py-[10px] sm:grid-cols-2 xl:grid-cols-4">
            {quickLinks.map(({ icon: Icon, title, description, href }) => (
              <Link
                key={href}
                to={href}
                className="flex flex-col gap-3 sm:gap-4 lg:gap-[16px] rounded-xl sm:rounded-[16px] border border-public-bg-brand-subtle bg-white p-3.5 sm:p-5 lg:p-[24px] shadow-public-nav transition-shadow hover:shadow-public-card"
              >
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 lg:h-[48px] lg:w-[48px] items-center justify-center rounded-lg sm:rounded-[16px] bg-public-bg-brand p-1.5 sm:p-2 lg:p-[8px]">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <div className="flex flex-col gap-1.5 sm:gap-2 lg:gap-[8px]">
                  <h3 className="font-segoe font-semibold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand text-base sm:text-base lg:text-public-fs-subtitle-sm">
                    {title}
                  </h3>
                  <p className="font-segoe font-normal leading-normal sm:leading-[100%] text-left sm:text-justify text-public-text-secondary text-sm sm:text-sm lg:text-public-fs-subheading-sm">
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

          {/* Left column — portal preview card */}
          <div className="flex w-full items-center justify-center rounded-xl sm:rounded-[16px] border border-public-bg-brand-subtle bg-white p-2 sm:p-3 lg:p-[10px] shadow-public-overview-card xl:h-[700px] xl:w-[620px] xl:shrink-0">
            <img
              src={overviewPreview}
              alt="Y-TRACE portal preview"
              className="h-auto w-full max-w-[540px] rounded-lg sm:rounded-[12px] object-cover"
            />
          </div>

          {/* Right column */}
          <div className="flex w-full flex-col gap-4 sm:gap-6 lg:gap-[24px] xl:px-[24px]">

            {/* Title block */}
            <div className="flex flex-col gap-1.5 sm:gap-[10px] py-1 sm:py-[10px]">
              <div className="inline-flex w-fit items-center gap-1.5 sm:gap-[10px] rounded-full border border-public-bg-secondary-100 bg-public-bg-secondary-subtle px-2.5 py-0.5 sm:px-[10px] sm:py-[4px] backdrop-blur-[4px]">
                <span className="font-segoe text-xs sm:text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand-secondary">
                  OVERVIEW
                </span>
              </div>
              <h2 className="font-segoe font-bold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand text-[22px] sm:text-2xl lg:text-public-fs-title-page">
                What is Y-TRACE?
              </h2>
              <p className="font-segoe font-normal leading-normal sm:leading-[100%] text-left sm:text-justify text-public-text-secondary text-sm sm:text-sm lg:text-public-fs-subheading-sm">
                Y-TRACE is the official online portal of PCYDO Pasig City for managing youth organization compliance, registrations, and activity processes — all in one place.
              </p>
            </div>

            {/* 2×2 feature cards */}
            <div className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:gap-x-[24px] lg:gap-y-[12px] py-1 sm:py-[10px] sm:grid-cols-2">
              {overviewCards.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex flex-col gap-1.5 sm:gap-2 lg:gap-[8px] rounded-lg sm:rounded-[8px] border border-public-bg-brand-subtle bg-white p-3 sm:p-3.5 lg:p-[16px]">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 lg:h-[40px] lg:w-[40px] items-center justify-center rounded-lg sm:rounded-[16px] bg-public-bg-tertiary-100 p-1.5 sm:p-2 lg:p-[8px]">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-public-text-brand" />
                  </div>
                  <h3 className="font-segoe font-semibold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand text-base sm:text-sm lg:text-public-fs-subheading-sm">
                    {title}
                  </h3>
                  <p className="font-segoe font-normal leading-relaxed sm:leading-[140%] text-public-text-secondary text-sm sm:text-xs lg:text-public-fs-body-sm">
                    {description}
                  </p>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:gap-[16px]">
              <Link
                to="/about"
                className="flex items-center justify-center gap-2 rounded-[8px] bg-public-bg-brand px-3.5 py-2.5 sm:px-[12px] sm:py-[12px] font-segoe text-sm sm:text-public-fs-subheading-sm font-semibold text-public-text-on-brand transition-colors hover:bg-public-bg-brand-hover"
              >
                Learn More <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/public-templates"
                className="flex items-center justify-center rounded-[8px] border border-public-border-brand px-3.5 py-2.5 sm:px-[12px] sm:py-[12px] font-segoe text-sm sm:text-public-fs-subheading-sm font-semibold text-public-text-brand transition-colors hover:bg-public-bg-brand-subtle"
              >
                Browse Forms & Templates
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Latest News */}
      {latestReleases !== null && latestReleases.length > 0 && (
      <section className="bg-public-bg-section px-4 py-7 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2.5 sm:gap-[10px]">

          {/* Title group */}
          <div className="flex flex-col gap-1.5 sm:gap-[10px] py-1 sm:py-[10px]">
            <div className="inline-flex w-fit items-center gap-1.5 sm:gap-[10px] rounded-full border border-public-bg-secondary-100 bg-public-bg-secondary-subtle px-2.5 py-0.5 sm:px-[10px] sm:py-[4px] backdrop-blur-[4px]">
              <span className="font-segoe text-xs sm:text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand-secondary">
                LATEST NEWS
              </span>
            </div>
            <h2 className="font-segoe font-bold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand text-[22px] sm:text-2xl lg:text-public-fs-title-page">
              Stay Updated
            </h2>
            <p className="font-segoe font-normal leading-normal sm:leading-[100%] text-public-text-secondary text-sm sm:text-sm lg:text-public-fs-subheading-sm">
              Stay informed with the latest announcements, events, and updates from the Pasig City Local Youth Development Office.
            </p>
          </div>

          {/* Cards + view all */}
          <div className="flex flex-col gap-2 sm:gap-[8px]">
            <div className="hidden justify-end sm:flex">
              <Link
                to="/news-releases"
                className="flex items-center gap-2 rounded-[8px] border border-public-border-brand px-3 py-2.5 sm:px-[12px] sm:py-[12px] font-segoe text-sm sm:text-public-fs-subheading-sm font-semibold text-public-text-brand transition-colors hover:bg-public-bg-brand-subtle"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3 sm:gap-4 lg:gap-[24px] py-1 sm:py-[10px] sm:grid-cols-2 xl:grid-cols-3">
              {latestReleases === null ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="h-[280px] sm:h-[400px] animate-pulse rounded-xl sm:rounded-[16px] bg-white" />
                ))
              ) : (
                latestReleases.map((news) => {
                  const formattedDate = new Intl.DateTimeFormat("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }).format(new Date(news.date_posted));
                  return (
                    <div key={news.id} className="flex flex-col overflow-hidden rounded-xl sm:rounded-[16px] border border-public-bg-brand-subtle bg-white shadow-public-nav">

                      {/* Image frame */}
                      <div className="relative flex h-[140px] sm:h-[200px] lg:h-[260px] items-center justify-center bg-gradient-to-b from-[#0E2F66] to-[#1A5CA8] p-2 sm:p-[10px]">
                        {news.category && (
                          <div className="absolute left-2.5 top-2.5 sm:left-[10px] sm:top-[10px] z-10 inline-flex w-fit items-center rounded-full border border-[#DCF0FD] bg-white px-2.5 py-0.5 sm:px-[10px] sm:py-[4px]">
                            <span className="font-segoe text-xs sm:text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand">
                              {news.category}
                            </span>
                          </div>
                        )}
                        <Megaphone className="h-16 w-16 sm:h-20 sm:w-20 lg:h-[111px] lg:w-[111px] text-white/80" strokeWidth={1.5} />
                        {news.preview_image_url && (
                          <img
                            src={news.preview_image_url}
                            alt={news.title}
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex flex-col gap-2.5 sm:gap-3 lg:gap-[16px] p-3.5 sm:p-5 lg:px-[24px] lg:py-[20px]">
                        <h3 className="font-segoe font-semibold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand text-base sm:text-base lg:text-public-fs-subtitle-sm line-clamp-2">
                          {news.title}
                        </h3>
                        <hr className="border-public-border-neutral-tertiary" />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 sm:gap-[8px] py-0.5 sm:py-[4px]">
                            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-public-text-secondary" />
                            <span className="font-segoe text-xs sm:text-public-fs-body-sm font-normal leading-none text-public-text-secondary">
                              {formattedDate}
                            </span>
                          </div>
                          <a
                            href={news.facebook_post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 sm:gap-[8px] font-segoe text-xs sm:text-public-fs-body-sm font-semibold text-public-text-brand transition-colors hover:underline"
                          >
                            View on Facebook <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </a>
                        </div>
                      </div>

                    </div>
                  );
                })
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

      {/* Resources */}
      <section className="bg-white px-4 py-7 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2.5 sm:gap-[10px]">

          {/* Title group */}
          <div className="flex flex-col gap-1.5 sm:gap-[10px] py-1 sm:py-[10px]">
            <div className="inline-flex w-fit items-center gap-1.5 sm:gap-[10px] rounded-full border border-public-bg-secondary-100 bg-public-bg-secondary-subtle px-2.5 py-0.5 sm:px-[10px] sm:py-[4px] backdrop-blur-[4px]">
              <span className="font-segoe text-xs sm:text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand-secondary">
                RESOURCES
              </span>
            </div>
            <h2 className="font-segoe font-bold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand text-[22px] sm:text-2xl lg:text-public-fs-title-page">
              Forms & Templates
            </h2>
            <p className="font-segoe font-normal leading-normal sm:leading-[100%] text-public-text-secondary text-sm sm:text-sm lg:text-public-fs-subheading-sm">
              Download official forms and document templates required for your organization's compliance with PCYDO.
            </p>
          </div>

          {/* Cards + view all */}
          <div className="flex flex-col gap-2 sm:gap-[8px]">
            <div className="hidden justify-end sm:flex">
              <Link
                to="/public-templates"
                className="flex items-center gap-2 rounded-[8px] border border-public-border-brand px-3 py-2.5 sm:px-[12px] sm:py-[12px] font-segoe text-sm sm:text-public-fs-subheading-sm font-semibold text-public-text-brand transition-colors hover:bg-public-bg-brand-subtle"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {featuredTemplates.length > 0 ? (
              <div className="grid gap-3 sm:gap-4 lg:gap-[24px] py-1 sm:py-[10px] sm:grid-cols-2 xl:grid-cols-3">
                {featuredTemplates.map((template) => {
                  const fileType = getFileType(template.templateFileUrl);
                  const formattedDate = template.templateUploadedAt
                    ? `Updated ${new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(template.templateUploadedAt))}`
                    : "Upload date unavailable";
                  const isOpening = openingTemplateId === template.name;
                  const isDownloading = downloadingTemplateId === template.name;
                  const viewDisabled = !template.templateFileUrl || isOpening;
                  const dlDisabled = !template.templateFileUrl || isDownloading;

                  return (
                    <div
                      key={template.id}
                      className="relative flex flex-col gap-2.5 sm:gap-4 lg:gap-[24px] rounded-xl sm:rounded-[16px] border border-[#DCE4F0] sm:border-public-bg-brand-subtle bg-white p-3.5 sm:p-5 lg:p-[24px] shadow-public-nav"
                    >
                      {/* File type pill — visible on desktop/tablet, hidden on mobile */}
                      <div className="absolute right-3.5 top-3.5 sm:right-[24px] sm:top-[24px] hidden sm:block rounded-full bg-public-bg-secondary-subtle px-2 py-0.5 sm:px-[10px] sm:py-[4px] backdrop-blur-[4px]">
                        <span className="font-segoe text-xs sm:text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand">
                          {fileType}
                        </span>
                      </div>

                      {/* Header with Document Icon and Title */}
                      <div className="flex items-start gap-2.5 sm:gap-0 sm:block">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF7FE] p-1.5 sm:hidden">
                          <FileText className="h-4 w-4 text-[#0E2F66]" />
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col gap-0.5 sm:gap-[10px] sm:pr-[60px]">
                          <h3 className="font-segoe font-bold sm:font-semibold leading-snug sm:leading-[120%] tracking-[-0.02em] text-[#0E2F66] sm:text-public-text-brand text-base sm:text-base lg:text-public-fs-subtitle-sm break-words">
                            {template.name}
                          </h3>
                          <p className="hidden sm:block font-segoe font-normal leading-[100%] text-public-text-secondary text-xs sm:text-xs lg:text-public-fs-subheading-sm">
                            {formattedDate}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="font-segoe font-normal leading-relaxed sm:leading-[100%] text-left sm:text-justify text-[#64748B] sm:text-public-text-neutral-default text-sm sm:text-sm lg:text-public-fs-subheading-sm line-clamp-2 sm:line-clamp-none break-words">
                        {template.description || "Official template published by PCYDO Pasig City."}
                      </p>

                      {/* Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#DCE4F0] sm:border-t-0 sm:flex sm:gap-[10px] sm:pt-0">
                        <button
                          type="button"
                          disabled={viewDisabled}
                          onClick={() => void openTemplate(template.templateFileUrl, template.name)}
                          className="h-8 sm:h-auto flex flex-1 items-center justify-center gap-1 sm:gap-[8px] rounded-lg sm:rounded-[8px] border border-[#0E2F66] sm:border-public-border-brand bg-white px-2 py-1.5 sm:px-[12px] sm:py-[12px] font-segoe text-sm sm:text-public-fs-subheading-sm font-semibold text-[#0E2F66] sm:text-public-text-brand transition-colors hover:bg-slate-50 sm:hover:bg-public-bg-brand-subtle disabled:opacity-50 cursor-pointer shadow-2xs sm:shadow-none"
                        >
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#0E2F66]" /> {isOpening ? "Opening…" : "View"}
                        </button>
                        <button
                          type="button"
                          disabled={dlDisabled}
                          onClick={() => void downloadTemplate(template.templateFileUrl, template.name)}
                          className="h-8 sm:h-auto flex flex-1 items-center justify-center gap-1 sm:gap-[8px] rounded-lg sm:rounded-[8px] bg-[#0E2F66] sm:bg-public-bg-brand px-2 py-1.5 sm:px-[12px] sm:py-[12px] font-segoe text-sm sm:text-public-fs-subheading-sm font-semibold text-white sm:text-public-text-on-brand transition-colors hover:bg-[#0A234D] sm:hover:bg-public-bg-brand-hover disabled:opacity-50 cursor-pointer shadow-2xs sm:shadow-none"
                        >
                          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" /> {isDownloading ? "Downloading…" : "Download"}
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : null}
            <div className="flex pt-1.5 sm:hidden">
              <Link
                to="/public-templates"
                className="flex w-full items-center justify-center gap-2 rounded-[8px] border border-public-border-brand px-3 py-2.5 sm:px-[12px] sm:py-[12px] font-segoe text-sm sm:text-public-fs-subheading-sm font-semibold text-public-text-brand transition-colors hover:bg-public-bg-brand-subtle"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* Help Center */}
      <section className="bg-public-bg-section px-4 py-7 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-5 sm:gap-6 lg:gap-[24px] xl:flex-row xl:items-center">

          {/* Left column */}
          <div className="flex w-full flex-col gap-1.5 sm:gap-[10px] py-1 sm:py-[10px] xl:w-[564px] xl:shrink-0">
            <div className="inline-flex w-fit items-center gap-1.5 sm:gap-[10px] rounded-full border border-public-bg-secondary-100 bg-public-bg-secondary-subtle px-2.5 py-0.5 sm:px-[10px] sm:py-[4px] backdrop-blur-[4px]">
              <span className="font-segoe text-xs sm:text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand-secondary">
                HELP CENTER
              </span>
            </div>
            <h2 className="font-segoe font-bold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand text-[22px] sm:text-2xl lg:text-public-fs-title-page">
              Frequently Asked Questions
            </h2>
            <p className="font-segoe font-normal leading-normal sm:leading-[100%] text-public-text-secondary text-sm sm:text-sm lg:text-public-fs-subheading-sm">
              Quick answers to the most common questions about using the PCYDO portal.
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
                  <span className="font-segoe text-sm sm:text-sm lg:text-public-fs-subheading-sm font-semibold leading-[140%] text-public-text-brand">
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
      <section className="bg-white px-3.5 py-7 sm:px-6 sm:py-12 lg:px-[10px] lg:py-[96px]">
        <div className="public-hero-gradient mx-auto flex w-full max-w-[1090px] flex-col items-center gap-5 sm:gap-6 lg:gap-[32px] rounded-xl sm:rounded-[16px] px-4 py-7 sm:px-[32px] sm:py-[64px] shadow-public-overview-card lg:px-[64px] lg:py-[160px]">

          {/* Title group */}
          <div className="flex w-full flex-col items-center gap-2.5 sm:gap-4 lg:gap-[24px] p-1 sm:p-[10px] text-center">
            <h2 className="font-segoe font-bold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-neutral-on-neutral text-[22px] sm:text-2xl lg:text-public-fs-title-page">
              Ready to get started
              <br className="sm:hidden" />
              {" "}with PCYDO?
            </h2>
            <p className="font-segoe font-medium sm:font-semibold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-neutral-on-neutral text-sm sm:text-sm lg:text-public-fs-subtitle-sm">
              Join the growing community of youth organizations in Pasig City.
            </p>
          </div>

          {/* Button group */}
          <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:gap-[16px]">
            <Link
              to="/signup"
              className="flex items-center justify-center rounded-[8px] bg-white px-4 py-2.5 sm:px-[24px] sm:py-[16px] font-segoe text-sm sm:text-public-fs-body-md font-semibold text-public-text-brand transition-colors hover:bg-public-bg-brand-subtle shadow-xs"
            >
              Create an Account
            </Link>
            <Link
              to="/public-templates"
              className="flex items-center justify-center rounded-[8px] border border-public-bg-brand-subtle px-4 py-2.5 sm:px-[24px] sm:py-[16px] font-segoe text-sm sm:text-public-fs-subheading-sm font-semibold text-public-text-neutral-on-neutral transition-colors hover:bg-white/10"
            >
              Browse Forms &amp; Templates
            </Link>
          </div>

        </div>
      </section>

      {/* Contact */}
      <section className="bg-white px-4 py-7 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2.5 sm:gap-[10px]">

          {/* Title group */}
          <div className="flex flex-col gap-1.5 sm:gap-[10px] py-1 sm:py-[10px]">
            <div className="inline-flex w-fit items-center gap-1.5 sm:gap-[10px] rounded-full border border-public-bg-secondary-100 bg-public-bg-secondary-subtle px-2.5 py-0.5 sm:px-[10px] sm:py-[4px] backdrop-blur-[4px]">
              <span className="font-segoe text-xs sm:text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand-secondary">
                CONTACT
              </span>
            </div>
            <h2 className="font-segoe font-bold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand text-[22px] sm:text-2xl lg:text-public-fs-title-page">
              Get in Touch with PCYDO
            </h2>
            <p className="font-segoe font-normal leading-normal sm:leading-[100%] text-public-text-secondary text-sm sm:text-sm lg:text-public-fs-subheading-sm">
              Reach us through any of the following contact information.
            </p>
          </div>

          {/* Card frame — capped at 975px */}
          <div className="mx-auto flex w-full max-w-[975px] flex-col gap-3 sm:gap-4 lg:gap-[24px] py-1 sm:py-[10px]">

            {/* Address card — capped at 723px */}
            <div className="mx-auto flex w-full max-w-[723px] flex-col items-center gap-2 sm:gap-3 lg:gap-[16px] rounded-xl sm:rounded-[16px] border border-public-bg-brand-subtle bg-white p-3.5 sm:p-5 lg:p-[24px] shadow-public-nav text-center">
              <div className="flex h-9 w-9 sm:h-11 sm:w-11 lg:h-[48px] lg:w-[48px] items-center justify-center rounded-lg sm:rounded-[16px] bg-public-bg-tertiary-100 p-1.5 sm:p-2 lg:p-[8px]">
                <MapPin className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-public-text-brand" />
              </div>
              <p className="font-segoe text-xs sm:text-xs lg:text-public-fs-subheading-sm font-semibold uppercase leading-none text-public-text-secondary">
                Office Address
              </p>
              <p className="font-segoe text-sm sm:text-sm lg:text-public-fs-subtitle-sm font-semibold leading-relaxed sm:leading-[120%] tracking-[-0.02em] text-public-text-brand">
                3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City
              </p>
            </div>

            {/* Card row — 3 columns */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-[24px] py-1 sm:py-[10px] sm:grid-cols-3">

              {/* Contact Numbers */}
              <div className="flex flex-col items-center gap-2 sm:gap-3 lg:gap-[16px] rounded-xl sm:rounded-[16px] border border-public-bg-brand-subtle bg-white p-3.5 sm:p-5 lg:p-[24px] shadow-public-nav text-center">
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 lg:h-[48px] lg:w-[48px] items-center justify-center rounded-lg sm:rounded-[16px] bg-public-bg-tertiary-100 p-1.5 sm:p-2 lg:p-[8px]">
                  <Phone className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-public-text-brand" />
                </div>
                <p className="font-segoe text-xs sm:text-xs lg:text-public-fs-subheading-sm font-semibold uppercase leading-none text-public-text-secondary">
                  Contact Numbers
                </p>
                <p className="font-segoe text-sm sm:text-sm lg:text-public-fs-subtitle-sm font-semibold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand">
                  (02) 8643-7632
                </p>
              </div>

              {/* Official Email */}
              <div className="flex flex-col items-center gap-2 sm:gap-3 lg:gap-[16px] rounded-xl sm:rounded-[16px] border border-public-bg-brand-subtle bg-white p-3.5 sm:p-5 lg:p-[24px] shadow-public-nav text-center">
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 lg:h-[48px] lg:w-[48px] items-center justify-center rounded-lg sm:rounded-[16px] bg-public-bg-tertiary-100 p-1.5 sm:p-2 lg:p-[8px]">
                  <Mail className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-public-text-brand" />
                </div>
                <p className="font-segoe text-xs sm:text-xs lg:text-public-fs-subheading-sm font-semibold uppercase leading-none text-public-text-secondary">
                  Official Email
                </p>
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=lydo@pasigcity.gov.ph"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-segoe text-sm sm:text-sm lg:text-public-fs-subtitle-sm font-semibold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand hover:underline"
                >
                  lydo@pasigcity.gov.ph
                </a>
              </div>

              {/* Office Hours */}
              <div className="flex flex-col items-center gap-2 sm:gap-3 lg:gap-[16px] rounded-xl sm:rounded-[16px] border border-public-bg-brand-subtle bg-white p-3.5 sm:p-5 lg:p-[24px] shadow-public-nav text-center">
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 lg:h-[48px] lg:w-[48px] items-center justify-center rounded-lg sm:rounded-[16px] bg-public-bg-tertiary-100 p-1.5 sm:p-2 lg:p-[8px]">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-public-text-brand" />
                </div>
                <p className="font-segoe text-xs sm:text-xs lg:text-public-fs-subheading-sm font-semibold uppercase leading-none text-public-text-secondary">
                  Office Hours
                </p>
                <p className="font-segoe text-sm sm:text-sm lg:text-public-fs-subtitle-sm font-semibold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand">
                  Monday–Friday<br />7:00 AM – 4:00 PM
                </p>
              </div>

            </div>

            {/* View Contact Page CTA */}
            <div className="flex justify-center pt-1 sm:pt-0">
              <Link
                to="/contacts"
                className="flex items-center rounded-[8px] bg-public-bg-brand px-4 py-2.5 sm:px-[24px] sm:py-[16px] font-segoe text-sm sm:text-public-fs-body-md font-semibold text-public-text-on-brand transition-colors hover:bg-public-bg-brand-hover shadow-xs"
              >
                View Contact Page
              </Link>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
