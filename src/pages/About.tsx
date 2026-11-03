import { ArrowRight, ArrowUpRight, Award, Building2, ChevronDown, BookOpen, CircleCheck, ClipboardList, FileText, FolderOpen, Globe, Handshake, Lock, ScrollText, Send, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { usePublicContactInfo } from "@/lib/admin-system-settings";


const aboutCards = [
  {
    icon: BookOpen,
    title: "Access Information and Guidelines",
    description: "Review registration procedures, compliance requirements, and program guidelines relevant to youth organizations.",
  },
  {
    icon: FileText,
    title: "Access Official Forms and Templates",
    description: "Browse and download official forms, templates, and reference documents published by the PCYDO.",
  },
  {
    icon: Send,
    title: "Submit Requirements Online",
    description: "Submit registration documents, compliance requirements, and program-related submissions through the Organization Portal.",
  },
  {
    icon: ClipboardList,
    title: "Track Submission Status",
    description: "Monitor submission statuses and review administrative remarks, revision requests, and notifications regarding required actions.",
  },
];


const programCards = [
  {
    icon: Users,
    tag: "YORP",
    image: "/images/program-yorp.svg",
    title: "Youth Organization Registration Program",
    description: [
      "The Youth Organization Registration Program (YORP) is a program of the National Youth Commission (NYC) that facilitates the registration of youth and youth-serving organizations in the Philippines. It supports the recognition of youth organizations and their engagement in youth development initiatives and community and national development.",
      "Upon successful registration, an organization is assigned a Unique Registration Number (URN), which serves as its registration identifier.",
      "For more information, read the official PCYDO Facebook post about YORP and refer to the YORP guidelines for detailed information on registration requirements, required documents, and the registration process.",
    ],
  },
  {
    icon: Award,
    tag: "YPOP",
    image: "/images/program-ypop.svg",
    title: "Youth Participation Organization Passport",
    description: [
      "The Youth Participation Organization Passport (YPOP) is a program established under Pasig City Ordinance No. 50, Series of 2024. It recognizes the participation of YORP-registered youth and youth-serving organizations in government-initiated activities and their own initiatives. Through a points-based evaluation, the program assesses organizations' participation and eligibility for applicable incentives.",
      "For more information, read the official PCYDO Facebook post about YPOP and refer to the YPOP Guidelines for detailed information on participation requirements, point allocation, and qualification criteria.",
    ],
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
    description: "Submit required registration, compliance, and renewal documents directly through the portal for PCYDO review and verification.",
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
  const { address: officeAddress, email: officialEmail } = usePublicContactInfo();
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(officialEmail)}`;
  const portalHref = role === "admin" ? "/admin" : "/dashboard";

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="public-hero-pasig-photo px-4 pt-16 sm:px-6 sm:pt-20 xl:pt-32 lg:px-[64px]">
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
              { label: "Supported programs", href: "#supported-programs" },
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
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">

          {/* Copy */}
          <div className="flex w-full flex-col items-start lg:w-[52%] lg:shrink-0">
            <span className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-public-text-brand-secondary">
              About PCYDO
            </span>
            <h2 className="mt-3 font-editorial text-[30px] font-normal leading-[1.1] tracking-[-0.01em] text-public-text-brand sm:text-[36px] lg:text-[40px]">
              The office behind the portal
            </h2>
            <p className="mt-6 max-w-[58ch] font-inter text-[15px] font-normal leading-[1.7] text-slate-700 sm:text-base">
              The Pasig City Youth Development Office (PCYDO) is the local government office responsible for coordinating youth development programs and administering processes involving youth and youth-serving organizations in Pasig City. Its functions are guided by Republic Act No. 10742, as amended by Republic Act No. 11768, and Pasig City Ordinance No. 50, Series of 2024, which establishes the city's Comprehensive Youth Development Code.
            </p>
            <p className="mt-5 max-w-[58ch] font-inter text-[13px] font-normal leading-[1.7] text-slate-500 sm:text-sm">
              Through Y-TRACE, PCYDO provides a centralized digital platform for organizations to access registration services, submit requirements, monitor compliance, and participate in applicable youth development programs.
            </p>
          </div>

          {/* Office information */}
          <aside className="flex w-full flex-col rounded-[2px] bg-public-bg-secondary-subtle p-6 sm:p-8 lg:flex-1">
            <div className="flex items-center gap-3">
              <Building2 aria-hidden="true" strokeWidth={1.5} className="h-5 w-5 text-public-text-brand" />
              <h3 className="font-editorial text-lg font-normal leading-none text-public-text-brand">
                Office information
              </h3>
            </div>

            <dl className="mt-6 flex flex-col gap-5 border-t border-slate-300/70 pt-6">
              <div>
                <dt className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-slate-500">
                  Visit us
                </dt>
                <dd className="mt-2 font-inter text-[13px] font-normal leading-[1.65] text-slate-600">
                  {officeAddress}
                </dd>
              </div>
              <div>
                <dt className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-slate-500">
                  Opening hours
                </dt>
                <dd className="mt-2 flex flex-col gap-0.5 font-inter text-[13px] font-normal leading-[1.65] text-slate-600">
                  <span>Mon – Thu: 7:00 AM – 6:00 PM</span>
                  <span>Fri – Sun: Closed</span>
                </dd>
              </div>
              <div>
                <dt className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-slate-500">
                  Get in touch
                </dt>
                <dd className="mt-2 flex flex-col gap-1 font-inter text-[13px] font-normal leading-[1.65] text-slate-600">
                  <a
                    href={gmailComposeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-fit break-all text-public-text-brand underline underline-offset-[3px] decoration-public-text-brand/40 transition-colors hover:decoration-public-text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2"
                  >
                    {officialEmail}
                  </a>
                  <span>In-person and online support available</span>
                </dd>
              </div>
            </dl>

            <Link
              to="/contacts"
              className="group mt-6 inline-flex w-fit items-center gap-2 rounded-[2px] font-inter text-sm font-semibold text-public-text-brand underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-4"
            >
              Plan your visit
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </Link>
          </aside>

        </div>
      </section>

      {/* Supported Programs */}
      <section id="supported-programs" className="scroll-mt-[140px] bg-white px-4 py-10 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:gap-10">

          {/* Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
            <div className="flex flex-col items-start gap-2.5">
              <span className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-public-text-brand-secondary">
                Supported Programs
              </span>
              <h2 className="font-editorial text-[30px] font-normal leading-[1.1] tracking-[-0.01em] text-public-text-brand sm:text-[36px] lg:text-[40px]">
                Programs We Support
              </h2>
            </div>
            <p className="max-w-[30rem] font-inter text-sm font-normal leading-[1.65] text-slate-500 lg:text-right">
              Discover the flagship government programs that Y-TRACE helps youth organizations access, comply with, and participate in.
            </p>
          </div>

          {/* Program cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
            {programCards.map(({ icon: Icon, tag, title, description, image }) => (
              <article
                key={tag}
                className="group flex flex-col overflow-hidden border border-slate-200 bg-white transition-colors duration-200 hover:border-public-border-brand/60"
              >
                <div className="relative flex aspect-[16/6] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#0E2F66] to-[#1A5CA8]">
                  <Icon
                    aria-hidden="true"
                    strokeWidth={1.1}
                    className="h-16 w-16 text-white/85"
                  />
                  {image && (
                    <img
                      src={image}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  )}
                  <span className="absolute left-5 top-4 z-10 font-inter text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-white/75">
                    {tag}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5 sm:p-6">
                  <h3 className="font-editorial text-xl font-normal leading-snug text-public-text-brand">
                    {title}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {description.map((paragraph) => (
                      <p key={paragraph.slice(0, 40)} className="font-inter text-[13px] font-normal leading-[1.65] text-slate-500">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>

        </div>
      </section>

      {/* Portal Overview */}
      <section id="about-portal" className="scroll-mt-[140px] bg-public-bg-section px-4 py-10 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 sm:gap-10">
        <div className="flex w-full flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">

          {/* Copy + coverage list */}
          <div className="flex w-full flex-col items-start lg:w-[42%] lg:shrink-0">
            <span className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-public-text-brand-secondary">
              About the Portal
            </span>
            <h2 className="mt-3 font-editorial text-[30px] font-normal leading-[1.1] tracking-[-0.01em] text-public-text-brand sm:text-[36px] lg:text-[40px]">
              About Y-TRACE
            </h2>
            <p className="mt-5 max-w-[46ch] font-inter text-[15px] font-normal leading-[1.65] text-slate-600">
              Y-TRACE is a digital platform that centralizes information and online services for youth organizations in Pasig City. It facilitates access to registration and compliance guidelines, online submission of requirements, status tracking, and participation in programs administered by the PCYDO.
            </p>

            <Link
              to="/site-map"
              className="group mt-7 inline-flex h-11 items-center justify-center gap-4 rounded-[2px] bg-public-bg-brand px-5 font-inter text-sm font-medium text-white transition-colors hover:bg-public-bg-brand-hover active:bg-public-bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2"
            >
              View all services
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </Link>
          </div>

          {/* Feature grid */}
          <div className="grid w-full grid-cols-1 gap-x-10 sm:grid-cols-2 lg:flex-1">
            {aboutCards.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col gap-2 border-t border-slate-200 py-5">
                <Icon aria-hidden="true" strokeWidth={1.5} className="h-5 w-5 text-public-text-brand" />
                <h3 className="font-inter text-[15px] font-medium leading-snug text-public-text-brand">
                  {title}
                </h3>
                <p className="font-inter text-[13px] font-normal leading-[1.6] text-slate-500">
                  {description}
                </p>
              </div>
            ))}
          </div>

        </div>

          {/* Prefer to speak with someone */}
          <div className="flex w-full flex-col gap-4 border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
            <div className="flex items-start gap-4">
              <Handshake aria-hidden="true" strokeWidth={1.5} className="mt-0.5 h-5 w-5 shrink-0 text-public-text-brand" />
              <div className="flex flex-col gap-1">
                <p className="font-inter text-[15px] font-medium leading-snug text-public-text-brand">
                  Prefer to speak with someone?
                </p>
                <p className="font-inter text-[13px] font-normal leading-[1.6] text-slate-500">
                  Our team can help you use the portal, complete a form or find an alternative way to apply.
                </p>
              </div>
            </div>
            <Link
              to="/contacts"
              className="group inline-flex h-11 shrink-0 items-center justify-center gap-3 rounded-[2px] border border-public-border-brand px-5 font-inter text-sm font-medium text-public-text-brand transition-colors hover:bg-public-bg-brand-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2"
            >
              Contact our team
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </Link>
          </div>

        </div>
      </section>

      {/* Features */}
      <section className="bg-white px-4 py-10 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:gap-10">

          {/* Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
            <div className="flex flex-col items-start gap-2.5">
              <span className="font-inter text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-public-text-brand-secondary">
                Features
              </span>
              <h2 className="font-editorial text-[30px] font-normal leading-[1.1] tracking-[-0.01em] text-public-text-brand sm:text-[36px] lg:text-[40px]">
                Everything Your Organization Needs
              </h2>
            </div>
            <p className="max-w-[30rem] font-inter text-sm font-normal leading-[1.65] text-slate-500 lg:text-right">
              Y-TRACE provides all the digital tools your youth organization needs to stay compliant and connected with PCYDO.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col gap-2 border-t border-slate-200 py-5">
                <Icon aria-hidden="true" strokeWidth={1.5} className="h-5 w-5 text-public-text-brand" />
                <h3 className="font-inter text-[15px] font-medium leading-snug text-public-text-brand">
                  {title}
                </h3>
                <p className="font-inter text-[13px] font-normal leading-[1.6] text-slate-500">
                  {description}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Policies */}
      <section id="legal-policies" className="scroll-mt-[140px] bg-public-bg-section px-4 py-10 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
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

      <Footer />
    </div>
  );
};

export default About;
