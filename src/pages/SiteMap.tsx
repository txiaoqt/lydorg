import { Link } from "react-router-dom";
import { Building2, ChevronRight, Globe } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const siteMapSections = [
  {
    title: "Public Website",
    icon: Globe,
    links: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Budget Transparency", href: "/budget-transparency" },
      { label: "Forms & Templates", href: "/public-templates" },
      { label: "News Releases", href: "/news-releases" },
      { label: "FAQs", href: "/faqs" },
      { label: "Contacts", href: "/contacts" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Site Map", href: "/site-map" },
    ],
  },
  {
    title: "Organization Portal",
    icon: Building2,
    links: [
      { label: "Sign In", href: "/signin" },
      { label: "Create Organization Account", href: "/signup" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Organization Profile", href: "/organization-profile" },
      { label: "YPOP Incentive", href: "/ypop" },
      { label: "Registration Requirements", href: "/document-submission" },
      { label: "Budget Requests", href: "/budget-request" },
      { label: "Liquidation Reports", href: "/liquidation-reporting" },
      { label: "News Releases", href: "/portal-news-releases" },
      { label: "Notifications", href: "/notifications" },
      { label: "Inquiry / Support", href: "/faqs" },
    ],
  },
];

const SiteMap = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="public-templates-hero-gradient public-hero-pasig-photo px-4 pt-16 sm:px-6 sm:pt-20 xl:pt-32 lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-6 pt-6 sm:gap-[48px] sm:pb-[48px] sm:pt-[64px]">
          <div className="flex flex-col items-center gap-2.5 text-center sm:items-start sm:text-left">
            <h1 className="font-inter font-bold leading-[105%] tracking-[-0.03em] text-public-text-neutral-on-neutral text-[28px] sm:text-public-fs-hero">
              Site Map
            </h1>
            <p className="font-inter font-normal leading-relaxed sm:leading-[120%] text-public-text-neutral-on-neutral text-sm sm:text-public-fs-subtitle-sm max-w-xl lg:max-w-5xl lg:min-h-[65px]">
              Complete directory of the Y-TRACE public website pages and Organization Portal workflows.
            </p>
          </div>
        </div>
      </section>

      {/* Directory Content */}
      <section className="bg-public-bg-section px-4 pb-12 pt-5 sm:px-6 sm:pb-[64px] sm:pt-[48px] lg:px-[64px]">
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            {siteMapSections.map((section) => {
              const Icon = section.icon;
              return (
                <article
                  key={section.title}
                  className="flex flex-col overflow-hidden rounded-[2px] border border-public-border-default bg-white"
                >
                  {/* Category Section Header */}
                  <div className="flex items-center gap-3 border-b border-public-border-default px-4 py-4 sm:px-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] bg-public-bg-section">
                      <Icon className="h-[18px] w-[18px] text-public-text-brand" aria-hidden="true" />
                    </div>
                    <h2 className="font-editorial text-xl font-normal leading-tight text-public-text-brand sm:text-2xl">
                      {section.title}
                    </h2>
                  </div>

                  {/* Navigation Rows */}
                  <ul className="text-sm [&>li:last-child>a]:border-b-0">
                    {section.links.map((link, index) => (
                      <li key={`${link.href}-${index}`}>
                        <Link
                          to={link.href}
                          className="group flex min-h-11 items-center justify-between gap-3 border-b border-l-2 border-public-border-default border-l-transparent px-4 py-3 font-inter font-medium text-public-text-neutral-default transition-colors hover:border-l-public-border-brand hover:bg-public-bg-section hover:text-public-text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-public-border-brand sm:px-5"
                        >
                          <span className="break-words leading-snug">{link.label}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-public-text-secondary transition-colors group-hover:text-public-text-brand" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SiteMap;
