import { useState } from "react";
import { ArrowRight, ArrowUpRight, Bell, ChevronDown, Download, ExternalLink, FileCheck2, FilePlus2, ListChecks, Lock, MessagesSquare, ScrollText, ShieldCheck, User, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PortalDocumentViewer } from "@/components/portal/PortalDocumentPreviewModal";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";


const portalFeatures = [
  {
    icon: User,
    title: "Organization Profile",
    description: "Create and update the organization's profile and contact information.",
  },
  {
    icon: FilePlus2,
    title: "YORP Registration",
    description: "Submit required documents for YORP registration and renewal.",
  },
  {
    icon: FileCheck2,
    title: "YPOP Qualification",
    description: "Submit proof of participation in eligible activities and view qualification status under the YPOP program.",
  },
  {
    icon: ListChecks,
    title: "Budget Requests and Liquidation Reports",
    description: "Submit budget requests and liquidation reports and monitor their processing status.",
  },
  {
    icon: MessagesSquare,
    title: "Inquiries",
    description: "Submit inquiries to the PCYDO through the Organization Portal.",
  },
  {
    icon: Bell,
    title: "Status and Notifications",
    description: "View submission statuses, administrative remarks, revision requests, and related notifications.",
  },
];

const programCards = [
  {
    tag: "YORP",
    image: "/images/program-yorp.jpg",
    facebookUrl: "https://www.facebook.com/story.php?story_fbid=1327153006097055&id=100064071040238",
    guidelinesText: "YORP guidelines",
    guidelinesUrl: "/guidelines/yorp-guidelines.pdf",
    title: "Youth Organization Registration Program (YORP)",
    description: [
      "The Youth Organization Registration Program (YORP) is a program of the National Youth Commission (NYC) that facilitates the registration of youth and youth-serving organizations in the Philippines. It supports the recognition of youth organizations and their engagement in youth development initiatives and community and national development.",
      "Upon successful registration, an organization is assigned a Unique Registration Number (URN), which serves as its registration identifier.",
      "For more information, read the official PCYDO Facebook post about YORP and refer to the YORP guidelines for detailed information on registration requirements, required documents, and the registration process.",
    ],
  },
  {
    tag: "YPOP",
    image: "/images/program-ypop.jpg",
    facebookUrl: "https://www.facebook.com/story.php?story_fbid=1440541714758183&id=100064071040238",
    guidelinesText: "YPOP Guidelines",
    guidelinesUrl: "/guidelines/ypop-guidelines.pdf",
    title: "Youth Participation Organization Passport (YPOP)",
    description: [
      "The Youth Participation Organization Passport (YPOP) is a program established under Pasig City Ordinance No. 50, Series of 2024. It recognizes the participation of YORP-registered youth and youth-serving organizations in government-initiated activities and their own initiatives. Through a points-based evaluation, the program assesses organizations' participation and eligibility for applicable incentives.",
      "For more information, read the official PCYDO Facebook post about YPOP and refer to the YPOP Guidelines for detailed information on participation requirements, point allocation, and qualification criteria.",
    ],
  },
];

const policyCards = [
  {
    icon: Lock,
    category: "Personal Information",
    title: "Privacy Policy",
    description: "How we collect, use, and protect your organization's personal information on the Y-TRACE platform.",
    href: "/privacy",
  },
  {
    icon: ShieldCheck,
    category: "Transparency",
    title: "Terms of Service",
    description: "The rules and conditions governing use of the Y-TRACE portal for registered youth organizations and PCYDO staff.",
    href: "/terms",
  },
  {
    icon: ScrollText,
    category: "Compliance",
    title: "Data Privacy Act Compliance",
    description: "Our compliance with Republic Act 10173, ensuring the lawful processing of personal data for all Y-TRACE users.",
    href: "/privacy#legal-bases-for-processing",
  },
];

const About = () => {
  const { isAuthenticated, role } = useAuth();
  const [guideline, setGuideline] = useState<{ title: string; url: string } | null>(null);
  const portalHref = role === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="public-hero-pasig-photo px-4 sm:px-6 lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 pb-10 pt-8 text-center sm:gap-7 sm:pb-[64px] sm:pt-[72px]">
          <h1 className="font-tnr text-[36px] font-normal leading-[1.1] tracking-[-0.01em] text-white sm:text-[46px] lg:text-[52px]">
            Supporting
            <br className="hidden sm:block" />
            {" "}Youth Organizations
            <br className="hidden sm:block" />
            {" "}in Pasig City
          </h1>
          <p className="max-w-[46rem] font-inter text-base font-normal leading-[1.6] text-white/85">
            Connecting Pasig City youth organizations to registration services, compliance processes, and youth development programs through a centralized digital platform.
          </p>
          {isAuthenticated ? (
            <Link
              to={portalHref}
              className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-[2px] bg-[#1A5CA8] px-6 font-inter text-sm font-medium text-white transition-colors hover:bg-[#2468B8] active:bg-[#174E8F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E2F66]"
            >
              Open Portal
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </section>

      {/* On this page */}
      <nav aria-label="On this page" className="border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-8 sm:py-5">
          <span className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-slate-500">
            On this page
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {[
              { label: "About the office", href: "#about-office" },
              { label: "PCYDO programs", href: "#supported-programs" },
              { label: "About the portal", href: "#about-portal" },
              { label: "Legal policies", href: "#legal-policies" },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="group inline-flex items-center gap-1.5 rounded-[2px] font-inter text-[13px] font-medium text-public-text-brand underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2"
              >
                {label}
                <ChevronDown
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-public-text-brand-secondary transition-transform duration-200 ease-out group-hover:translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
                />
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* About PCYDO */}
      <section id="about-office" className="scroll-mt-[140px] bg-public-bg-section px-4 py-10 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 lg:flex-row lg:items-center lg:gap-12">

          {/* Copy */}
          <div className="flex w-full min-w-0 flex-col items-start lg:flex-1">
            <span className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-public-text-brand-secondary">
              01 / About the office
            </span>
            <h2 className="mt-3 font-editorial text-[30px] font-normal leading-[1.1] tracking-[-0.01em] text-public-text-brand sm:text-[36px] lg:text-[40px]">
              Pasig City Youth Development Office (PCYDO)
            </h2>
            <p className="mt-6 font-inter text-[15px] font-normal leading-[1.7] text-slate-600">
              The Pasig City Youth Development Office (PCYDO) is the local government office responsible for coordinating youth development programs and administering processes involving youth and youth-serving organizations in Pasig City. Its functions are guided by Republic Act No. 10742, as amended by Republic Act No. 11768, and Pasig City Ordinance No. 50, Series of 2024, which establishes the city's Comprehensive Youth Development Code.
            </p>
            <p className="mt-5 font-inter text-[15px] font-normal leading-[1.7] text-slate-600">
              Through Y-TRACE, PCYDO provides a centralized digital platform for organizations to access registration services, submit requirements, monitor compliance, and participate in applicable youth development programs.
            </p>
          </div>

          {/* Office seal */}
          <img
            src="/images/pcydo-seal.webp"
            alt="Seal of the Local Youth Development Office, Office of the City Mayor, Pasig City"
            width={732}
            height={732}
            loading="lazy"
            className="mx-auto h-auto w-[220px] shrink-0 sm:w-[260px] lg:mx-0 lg:w-[300px]"
          />

        </div>
      </section>

      {/* Supported Programs */}
      <section id="supported-programs" className="scroll-mt-[140px] bg-white px-4 py-10 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:gap-10">

          {/* Header */}
          <div className="flex flex-col items-start gap-2.5">
            <span className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-public-text-brand-secondary">
              02 / PCYDO programs
            </span>
            <h2 className="font-editorial text-[30px] font-normal leading-[1.1] tracking-[-0.01em] text-public-text-brand sm:text-[36px] lg:text-[40px]">
              Programs We Support
            </h2>
          </div>

          {/* Program cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
            {programCards.map(({ tag, title, description, image, facebookUrl, guidelinesText, guidelinesUrl }) => (
              <article
                key={tag}
                className="group flex flex-col overflow-hidden border border-slate-200 bg-white transition-colors duration-200 hover:border-public-border-brand/60"
              >
                <div className="relative aspect-[16/8] w-full overflow-hidden bg-slate-200">
                  <img
                    src={image}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5 sm:p-6">
                  <h3 className="font-inter text-xl font-medium leading-snug text-public-text-brand">
                    {title}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {description.map((paragraph) => {
                      const fbText = `official PCYDO Facebook post about ${tag}`;
                      return (
                        <p key={paragraph.slice(0, 40)} className="font-inter text-[13px] font-normal leading-[1.65] text-slate-500">
                          {paragraph.split(new RegExp(`(${fbText}|${guidelinesText})`)).map((part, i) =>
                            part === fbText ? (
                              <a key={i} href={facebookUrl} target="_blank" rel="noopener noreferrer" className="text-public-text-brand-secondary underline underline-offset-[3px] transition-colors hover:text-public-text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2">
                                {part}
                              </a>
                            ) : part === guidelinesText ? (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setGuideline({ title: `${tag} Guidelines`, url: guidelinesUrl })}
                                className="text-public-text-brand-secondary underline underline-offset-[3px] transition-colors hover:text-public-text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2"
                              >
                                {part}
                              </button>
                            ) : (
                              part
                            ),
                          )}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>

        </div>
      </section>

      {/* About the portal */}
      <section id="about-portal" className="scroll-mt-[140px] bg-public-bg-section px-4 py-10 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">

          {/* Copy */}
          <div className="flex w-full flex-col items-start lg:w-[30%] lg:shrink-0">
            <span className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-public-text-brand-secondary">
              03 / About the portal
            </span>
            <h2 className="mt-3 font-editorial text-[30px] font-normal leading-[1.1] tracking-[-0.01em] text-public-text-brand sm:text-[36px] lg:text-[40px]">
              About Y-TRACE
            </h2>
            <p className="mt-5 font-inter text-[15px] font-normal leading-[1.65] text-slate-600">
              Y-TRACE is a digital platform that centralizes information and online services for youth organizations in Pasig City. It facilitates access to registration and compliance guidelines, online submission of requirements, status tracking, and participation in programs administered by the PCYDO.
            </p>

            <Link
              to="/site-map"
              className="group mt-7 inline-flex h-11 items-center justify-center gap-4 rounded-[2px] bg-public-bg-brand px-5 font-inter text-sm font-medium text-white transition-colors hover:bg-public-bg-brand-hover active:bg-public-bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2"
            >
              View site map
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </Link>
          </div>

          {/* Portal features */}
          <div className="flex w-full flex-col lg:flex-1">
            <h3 className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-public-text-brand">
              Portal features
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {portalFeatures.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex flex-col gap-2 border-t border-slate-200 py-5 lg:py-6">
                  <Icon aria-hidden="true" strokeWidth={1.5} className="h-5 w-5 text-public-text-brand" />
                  <h4 className="mt-1 font-inter text-[15px] font-medium leading-snug text-public-text-brand">
                    {title}
                  </h4>
                  <p className="font-inter text-[13px] font-normal leading-[1.6] text-slate-500">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Policies */}
      <section id="legal-policies" className="scroll-mt-[140px] bg-white px-4 py-10 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">

          {/* Copy */}
          <div className="flex w-full flex-col items-start lg:w-[38%] lg:shrink-0">
            <span className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-public-text-brand-secondary">
              Policies
            </span>
            <h2 className="mt-3 font-editorial text-[30px] font-normal leading-[1.1] tracking-[-0.01em] text-public-text-brand sm:text-[36px] lg:text-[40px]">
              Our Policies
            </h2>
            <p className="mt-5 max-w-[42ch] font-inter text-sm font-normal leading-[1.7] text-slate-500 sm:text-[15px]">
              Read about our commitments to transparency, data protection, and responsible use of the Y-TRACE platform.
            </p>
            <div className="mt-6 flex w-full max-w-[26rem] items-start gap-3 rounded-[2px] bg-public-bg-secondary-subtle px-4 py-3.5">
              <ShieldCheck
                aria-hidden="true"
                strokeWidth={1.5}
                className="mt-0.5 h-4 w-4 shrink-0 text-public-text-brand"
              />
              <p className="font-inter text-[13px] font-normal leading-[1.6] text-slate-600">
                We collect only what is needed to provide a service. We do not sell your personal information.
              </p>
            </div>
          </div>

          {/* Policy list */}
          <div className="flex w-full flex-col lg:flex-1">
            {policyCards.map(({ icon: Icon, category, title, description, href }) => (
              <Link
                key={title}
                to={href}
                className="group flex items-start gap-4 border-t border-slate-200 py-5 last:border-b focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2 sm:py-6"
              >
                <Icon aria-hidden="true" strokeWidth={1.5} className="mt-1 h-5 w-5 shrink-0 text-public-text-brand" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-inter text-[10px] font-semibold uppercase leading-none tracking-[0.12em] text-slate-500">
                    {category}
                  </span>
                  <h3 className="font-inter text-[17px] font-medium leading-snug text-public-text-brand underline-offset-4 group-hover:underline">
                    {title}
                  </h3>
                  <p className="font-inter text-[13px] font-normal leading-[1.6] text-slate-500">
                    {description}
                  </p>
                </div>
                <ArrowUpRight
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="mt-1 h-4 w-4 shrink-0 text-public-text-brand transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                />
              </Link>
            ))}
          </div>

        </div>
      </section>

      <Dialog open={guideline !== null} onOpenChange={(open) => !open && setGuideline(null)}>
        <DialogContent
          hideCloseButton
          className="flex h-[92dvh] max-h-[920px] w-[95vw] max-w-[1100px] flex-col gap-0 overflow-hidden rounded-[2px] border border-public-border-default bg-white p-0 shadow-xl"
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-public-border-default px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">PCYDO Programs</p>
              <DialogTitle className="font-tnr text-2xl font-normal leading-tight text-public-text-brand">{guideline?.title}</DialogTitle>
              <DialogDescription className="sr-only">PDF preview of the {guideline?.title}.</DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <a href={guideline?.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-[2px] px-3 font-inter text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-border-brand focus-visible:ring-offset-2 border border-public-border-default bg-white text-public-text-brand hover:border-public-border-brand">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Open in new tab</span>
              </a>
              <a href={guideline?.url} download className="inline-flex h-9 items-center gap-1.5 rounded-[2px] px-3 font-inter text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-border-brand focus-visible:ring-offset-2 bg-public-bg-brand text-white hover:bg-[#2468B8]">
                <Download className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Download</span>
              </a>
              <button
                type="button"
                onClick={() => setGuideline(null)}
                aria-label="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[2px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-public-text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-border-brand"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          {guideline ? (
            <PortalDocumentViewer
              previewUrl={guideline.url}
              previewTitle={guideline.title}
              className="min-h-0 flex-1 overflow-y-auto bg-public-bg-section p-3 sm:p-5"
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
};

export default About;
