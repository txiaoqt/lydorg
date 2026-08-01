import { ArrowRight, Award, Bell, BookOpen, CircleCheck, ClipboardList, FileText, FolderOpen, Globe, Heart, LayoutGrid, Lock, ScrollText, Send, ShieldCheck, Star, Target, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import AnnouncementBar from "@/components/AnnouncementBar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import aboutHero from "@/assets/about-hero.webp";

const portalItems = [
  { icon: Users, label: "Organization Registration" },
  { icon: FileText, label: "Compliance Submission" },
  { icon: FolderOpen, label: "Official Forms & Templates" },
  { icon: Bell, label: "Announcements & Advisories" },
  { icon: ClipboardList, label: "Compliance Tracking" },
];

const aboutCards = [
  {
    icon: BookOpen,
    title: "Learn the Process",
    description: "Understand the compliance workflow for youth organizations under PCYDO.",
  },
  {
    icon: FileText,
    title: "Access Official Forms",
    description: "Download templates required for registration, budgets, and activity reports.",
  },
  {
    icon: Send,
    title: "Apply Online",
    description: "Register your organization and submit compliance documents through the portal.",
  },
  {
    icon: ClipboardList,
    title: "Track Your Application",
    description: "Monitor the real-time review status of your submitted documents.",
  },
];

const pcydoCards = [
  {
    icon: Target,
    title: "Our Mission",
    description: "To empower youth organizations in Pasig City through streamlined compliance, accessible resources, and transparent digital governance.",
  },
  {
    icon: Heart,
    title: "Our Vision",
    description: "A thriving youth sector where every registered organization can fulfill its mandate with ease and full accountability.",
  },
  {
    icon: Star,
    title: "Our Mandate",
    description: "To implement Republic Act 10742 by overseeing SK federation activities, youth organization accreditation, and citywide PCYDO programs.",
  },
];

const programCards = [
  {
    icon: Users,
    tag: "YORP",
    title: "Youth Organization Registration Program",
    description: "A government-mandated program requiring all youth organizations to formally register with PCYDO and maintain updated compliance records.",
  },
  {
    icon: Award,
    tag: "YPOP",
    title: "Youth Participation Organization Passport",
    description: "An accreditation program that recognizes active youth organizations and grants eligibility for government-funded programs and activities.",
  },
];

const featureCards = [
  {
    icon: Users,
    title: "Organization Registration",
    description: "Register your organization digitally with PCYDO and maintain an up-to-date profile for compliance and accreditation.",
  },
  {
    icon: FileText,
    title: "Compliance Submission",
    description: "Submit required compliance documents such as financial reports, activity logs, and officer updates directly through the portal.",
  },
  {
    icon: ClipboardList,
    title: "Budget Requests",
    description: "File and track budget proposals and financial requests to PCYDO through a structured digital workflow.",
  },
  {
    icon: CircleCheck,
    title: "Compliance Tracking",
    description: "Monitor the real-time review status of all submitted documents and stay updated on pending requirements.",
  },
  {
    icon: FolderOpen,
    title: "Forms & Templates",
    description: "Access a library of official PCYDO forms and downloadable templates needed for your compliance submissions.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Organization Account",
    description: "Manage your portal account with role-based access, keeping your organization's data secure and accessible to authorized members.",
  },
];

const policyCards = [
  {
    icon: Lock,
    title: "Privacy Policy",
    description: "How we collect, use, and protect your organization's personal information on the Y-TRACE platform.",
    href: "/privacy",
  },
  {
    icon: ShieldCheck,
    title: "Terms of Service",
    description: "The rules and conditions governing use of the Y-TRACE portal for registered youth organizations and PCYDO staff.",
    href: "/terms",
  },
  {
    icon: ScrollText,
    title: "Data Privacy Act Compliance",
    description: "Our compliance with Republic Act 10173, ensuring the lawful processing of personal data for all Y-TRACE users.",
    href: "/privacy#legal-bases-for-processing",
  },
];

const About = () => {
  const { isAuthenticated, role } = useAuth();
  const portalHref = role === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="min-h-screen">
      <AnnouncementBar />
      <Navbar />

      {/* Hero */}
      <section className="about-hero-gradient flex min-h-[480px] items-center px-5 pt-[120px] sm:min-h-[758px] sm:px-6 lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col-reverse items-center gap-[40px] py-[64px] xl:flex-row xl:items-center xl:justify-between xl:py-[160px]">

          {/* Left column */}
          <div className="flex w-full flex-col items-center gap-[32px] py-[10px] text-center xl:max-w-[573px] xl:items-start xl:text-left">
            <div className="flex w-full flex-col items-center gap-[16px] xl:items-start">
              <h1 className="font-segoe font-bold leading-[100%] tracking-[-0.03em] text-public-text-brand text-[26px] sm:text-public-fs-hero">
                Empowering Youth Organizations in Pasig City
              </h1>
              <p className="font-segoe font-normal leading-[120%] tracking-[-0.02em] text-center text-[#1e1e1e] text-public-fs-subtitle-sm xl:text-justify">
                The Pasig City Local Youth Development Office (PCYDO) is mandated to support, develop, and monitor registered youth organizations across the city. Y-TRACE is our official digital portal — simplifying compliance, registration, document submission, and activity reporting for both organizations and PCYDO staff.
              </p>
            </div>

            {/* Button group */}
            <div className="flex w-full flex-col items-stretch gap-[12px] sm:w-auto sm:flex-row sm:items-center sm:gap-[16px] xl:w-auto">
              {isAuthenticated ? (
                <Link
                  to={portalHref}
                  className="flex items-center justify-center rounded-[8px] bg-public-bg-brand px-[24px] py-[16px] font-segoe text-public-fs-body-md font-normal leading-none text-public-text-neutral-on-neutral transition-colors hover:bg-public-bg-brand-hover"
                >
                  Open Portal
                </Link>
              ) : (
                <>
                  <Link
                    to="/signin"
                    className="flex items-center justify-center rounded-[8px] border border-public-border-brand px-[24px] py-[16px] font-segoe text-public-fs-subheading-sm font-normal leading-none text-public-text-brand transition-colors hover:bg-public-bg-brand-subtle"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="flex items-center justify-center rounded-[8px] bg-public-bg-brand px-[24px] py-[16px] font-segoe text-public-fs-body-md font-normal leading-none text-public-text-neutral-on-neutral transition-colors hover:bg-public-bg-brand-hover"
                  >
                    Create an Account
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right column — image card */}
          <div className="flex w-full items-center justify-center rounded-[16px] border border-public-bg-brand-subtle bg-white p-[10px] shadow-public-overview-card xl:h-[395px] xl:w-[678px] xl:shrink-0">
            <img
              src={aboutHero}
              alt="Pasig City PCYDO"
              className="h-full w-full object-contain"
            />
          </div>

        </div>
      </section>

      {/* Portal Overview */}
      <section className="bg-public-bg-section px-5 py-[48px] sm:px-6 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-[24px] xl:flex-row xl:items-center">

          {/* Left column — gradient card */}
          <div className="flex w-full flex-col gap-[16px] rounded-[16px] border border-public-bg-brand-subtle bg-gradient-to-r from-[#0E2F66] to-[#1A5CA8] p-[24px] shadow-public-overview-card xl:w-[540px] xl:shrink-0">

            {/* Title frame */}
            <div className="flex items-center gap-[10px]">
              <LayoutGrid className="h-[18px] w-[18px] shrink-0 text-[rgba(243,243,243,1)] [stroke-width:2.5px]" />
              <span className="font-segoe text-public-fs-subheading-sm font-semibold leading-[140%] text-white">
                Portal Overview
              </span>
            </div>

            {/* Box frame */}
            <div className="flex flex-col gap-[12px]">
              {portalItems.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-[8px] border border-[rgba(220,228,240,0.4)] bg-white/15 px-[16px] py-[10px] backdrop-blur-[4px]"
                >
                  <div className="flex items-center gap-[16px]">
                    <div className="flex h-[40px] w-[40px] items-center justify-center rounded-[8px] bg-white/15 p-[8px]">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="font-segoe text-public-fs-subheading-sm font-semibold leading-[140%] text-white">
                      {label}
                    </span>
                  </div>
                  <CircleCheck className="h-6 w-6 shrink-0 text-white" />
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="flex w-full flex-1 flex-col gap-[24px] xl:px-[24px]">

            {/* Overview header */}
            <div className="flex flex-col gap-[10px] py-[10px]">
              <div className="inline-flex w-fit items-center gap-[10px] rounded-full border border-public-bg-secondary-100 bg-public-bg-secondary-subtle px-[10px] py-[4px] backdrop-blur-[4px]">
                <span className="font-segoe text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand-secondary">
                  OVERVIEW
                </span>
              </div>
              <h2 className="font-segoe font-bold leading-[120%] tracking-[-0.02em] text-public-text-brand text-public-fs-title-page">
                What is Y-TRACE?
              </h2>
              <p className="font-segoe font-normal leading-[100%] text-public-text-secondary text-public-fs-subheading-sm">
                Y-TRACE is the official online portal of PCYDO Pasig City for managing youth organization compliance, registrations, and activity processes — all in one place.
              </p>
            </div>

            {/* 2×2 card grid */}
            <div className="grid grid-cols-1 gap-x-[24px] gap-y-[12px] py-[10px] sm:grid-cols-2">
              {aboutCards.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex flex-col gap-[12px] rounded-[16px] border border-public-bg-brand-subtle bg-white p-[16px] shadow-public-nav"
                >
                  <div className="flex h-[40px] w-[40px] items-center justify-center rounded-[16px] bg-public-bg-tertiary-100 p-[8px]">
                    <Icon className="h-6 w-6 text-public-text-brand" />
                  </div>
                  <h3 className="font-segoe text-public-fs-subtitle-sm font-semibold leading-[120%] tracking-[-0.02em] text-public-text-brand">
                    {title}
                  </h3>
                  <p className="font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-secondary">
                    {description}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* About PCYDO */}
      <section className="bg-white px-5 py-[48px] sm:px-6 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-[24px] xl:flex-row xl:items-center">

          {/* Left column — PCYDO card */}
          <div className="flex w-full flex-col gap-[24px] rounded-[16px] border border-public-bg-brand-subtle bg-white p-[24px] shadow-public-overview-card xl:w-[515px] xl:shrink-0">
            <div className="flex h-[64px] w-[64px] items-center justify-center rounded-[16px] bg-public-bg-brand p-[8px]">
              <Globe className="h-12 w-12 text-white" />
            </div>
            <div className="flex flex-col gap-[4px]">
              <h3 className="font-segoe text-public-fs-subtitle-sm font-semibold leading-[120%] tracking-[-0.02em] text-[#1e1e1e]">
                Pasig City Local Youth Development Office
              </h3>
              <span className="font-segoe text-public-fs-subheading-sm font-semibold leading-[140%] text-public-text-brand">
                PCYDO
              </span>
            </div>
            <p className="font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-justify text-public-text-secondary">
              The Pasig City Local Youth Development Office oversees youth welfare programs, supports registered youth organizations, and enforces compliance with national and local youth development policies.
            </p>
            <div className="flex flex-wrap gap-[12px]">
              {["Youth Development", "Compliance", "Registration"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-public-border-default bg-public-bg-section px-[10px] py-[10px] font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-[#1e1e1e]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="flex w-full flex-1 flex-col gap-[24px] xl:px-[24px]">
            <div className="flex flex-col gap-[10px] py-[10px]">
              <div className="inline-flex w-fit items-center gap-[10px] rounded-full border border-public-bg-secondary-100 bg-public-bg-secondary-subtle px-[10px] py-[4px] backdrop-blur-[4px]">
                <span className="font-segoe text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand-secondary">
                  ABOUT PCYDO
                </span>
              </div>
              <h2 className="font-segoe font-bold leading-[120%] tracking-[-0.02em] text-public-text-brand text-public-fs-title-page">
                The office behind the portal
              </h2>
              <p className="font-segoe font-normal leading-[100%] text-public-text-secondary text-public-fs-subheading-sm">
                PCYDO Pasig City is the government office mandated to coordinate, monitor, and support all youth-related programs and organizations across the city's barangays.
              </p>
            </div>
            <div className="flex flex-col gap-[12px] py-[10px]">
              {pcydoCards.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex flex-col items-start gap-[12px] rounded-[16px] border border-public-bg-brand-subtle bg-white p-[24px] shadow-public-nav sm:flex-row sm:items-center sm:gap-[24px]"
                >
                  <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[16px] bg-public-bg-tertiary-100 p-[8px]">
                    <Icon className="h-8 w-8 text-public-text-brand" />
                  </div>
                  <div className="flex flex-col gap-[6px]">
                    <h3 className="font-segoe text-public-fs-subtitle-sm font-semibold leading-[120%] text-public-text-brand">
                      {title}
                    </h3>
                    <p className="font-segoe text-public-fs-body-sm font-normal leading-[140%] text-public-text-neutral-default">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Supported Programs */}
      <section className="bg-public-bg-section px-5 py-[48px] sm:px-6 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-[10px]">

          {/* Header — centered */}
          <div className="flex flex-col items-center gap-[10px] py-[10px] text-center">
            <div className="inline-flex w-fit items-center gap-[10px] rounded-full border border-public-bg-secondary-100 bg-public-bg-secondary-subtle px-[10px] py-[4px] backdrop-blur-[4px]">
              <span className="font-segoe text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand-secondary">
                SUPPORTED PROGRAMS
              </span>
            </div>
            <h2 className="font-segoe font-bold leading-[120%] tracking-[-0.02em] text-public-text-brand text-public-fs-title-page">
              Programs We Support
            </h2>
            <p className="font-segoe font-normal leading-[100%] text-public-text-secondary text-public-fs-subheading-sm">
              Discover the flagship government programs that Y-TRACE helps youth organizations access, comply with, and participate in.
            </p>
          </div>

          {/* Cards row */}
          <div className="grid grid-cols-1 gap-[24px] py-[10px] sm:grid-cols-2">
            {programCards.map(({ icon: Icon, tag, title, description }) => (
              <div
                key={tag}
                className="flex flex-col gap-[16px] rounded-[16px] border border-public-bg-brand-subtle bg-white p-[24px] shadow-public-nav"
              >
                {/* Icon + pill row */}
                <div className="flex items-center justify-between py-[4px]">
                  <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-public-bg-brand p-[8px]">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="inline-flex items-center rounded-full border border-public-bg-secondary-100 bg-white px-[10px] py-[10px] backdrop-blur-[4px]">
                    <span className="font-segoe text-public-fs-subheading-sm font-semibold leading-[140%] text-public-text-brand">
                      {tag}
                    </span>
                  </div>
                </div>
                <h3 className="font-segoe text-public-fs-subtitle-sm font-semibold leading-[120%] tracking-[-0.02em] text-public-text-brand">
                  {title}
                </h3>
                <p className="font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-secondary">
                  {description}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Features */}
      <section className="bg-white px-5 py-[48px] sm:px-6 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-[10px]">

          {/* Header — centered */}
          <div className="flex flex-col items-center gap-[10px] py-[10px] text-center">
            <div className="inline-flex w-fit items-center gap-[10px] rounded-full border border-public-bg-secondary-100 bg-public-bg-secondary-subtle px-[10px] py-[4px] backdrop-blur-[4px]">
              <span className="font-segoe text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand-secondary">
                FEATURES
              </span>
            </div>
            <h2 className="font-segoe font-bold leading-[120%] tracking-[-0.02em] text-public-text-brand text-public-fs-title-page">
              Everything Your<br className="sm:hidden" /> Organization Needs
            </h2>
            <p className="font-segoe font-normal leading-[100%] text-public-text-secondary text-public-fs-subheading-sm">
              Y-TRACE provides all the digital tools your youth organization needs to stay compliant and connected with PCYDO.
            </p>
          </div>

          {/* 3×2 card grid */}
          <div className="grid grid-cols-1 gap-[24px] py-[10px] sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex flex-col gap-[16px] rounded-[16px] border border-public-bg-brand-subtle bg-white p-[24px] shadow-public-nav"
              >
                <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-public-bg-tertiary-100 p-[8px]">
                  <Icon className="h-8 w-8 text-public-text-brand" />
                </div>
                <h3 className="font-segoe text-public-fs-subtitle-sm font-semibold leading-[120%] tracking-[-0.02em] text-public-text-brand">
                  {title}
                </h3>
                <p className="font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-secondary">
                  {description}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Policies */}
      <section className="bg-public-bg-section px-5 py-[48px] sm:px-6 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-[10px]">

          {/* Header — centered */}
          <div className="flex flex-col items-center gap-[10px] py-[10px] text-center">
            <div className="inline-flex w-fit items-center gap-[10px] rounded-full border border-public-bg-secondary-100 bg-public-bg-secondary-subtle px-[10px] py-[4px] backdrop-blur-[4px]">
              <span className="font-segoe text-public-fs-body-sm font-semibold leading-[140%] text-public-text-brand-secondary">
                POLICIES
              </span>
            </div>
            <h2 className="font-segoe font-bold leading-[120%] tracking-[-0.02em] text-public-text-brand text-public-fs-title-page">
              Our Policies
            </h2>
            <p className="font-segoe font-normal leading-[100%] text-public-text-secondary text-public-fs-subheading-sm">
              Read about our commitments to transparency, data protection, and responsible use of the Y-TRACE platform.
            </p>
          </div>

          {/* Cards row */}
          <div className="grid grid-cols-1 gap-[24px] py-[10px] sm:grid-cols-2 lg:grid-cols-3">
            {policyCards.map(({ icon: Icon, title, description, href }) => (
              <div
                key={title}
                className="flex flex-col gap-[16px] rounded-[16px] border border-public-bg-brand-subtle bg-white p-[24px] shadow-public-nav"
              >
                <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[16px] bg-public-bg-tertiary-100 p-[8px]">
                  <Icon className="h-8 w-8 text-public-text-brand" />
                </div>
                <h3 className="font-segoe text-public-fs-subtitle-sm font-semibold leading-[120%] tracking-[-0.02em] text-public-text-brand">
                  {title}
                </h3>
                <p className="font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-secondary">
                  {description}
                </p>
                <Link
                  to={href}
                  className="flex items-center gap-[8px] py-[4px] font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-brand transition-colors hover:underline"
                >
                  View Policy
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
              </div>
            ))}
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
