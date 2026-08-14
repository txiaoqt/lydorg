import { Link } from "react-router-dom";
import { Building2, ChevronRight, Globe } from "lucide-react";
import Navbar from "@/components/Navbar";
import AnnouncementBar from "@/components/AnnouncementBar";
import Footer from "@/components/Footer";

const siteMapSections = [
  {
    title: "Public Website",
    icon: Globe,
    links: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
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
      { label: "YPOP (Youth Participation Organization Passport)", href: "/ypop" },
      { label: "Document Submission", href: "/document-submission" },
      { label: "Budget Requests", href: "/budget-request" },
      { label: "Liquidation Reports", href: "/liquidation-reporting" },
      { label: "News Releases", href: "/portal-news-releases" },
      { label: "Notifications", href: "/notifications" },
      { label: "Inquiry / Support", href: "/contacts" },
      { label: "Account Settings", href: "/organization-profile" },
    ],
  },
];

const SiteMap = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Navbar />

      {/* Hero */}
      <section className="public-templates-hero-gradient px-4 pt-[96px] sm:px-6 sm:pt-[120px] lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-2 py-4 text-center sm:items-start sm:text-left sm:gap-[16px] sm:py-[48px] sm:min-h-[285px]">
          <h1 className="font-segoe font-bold leading-tight tracking-[-0.03em] text-public-text-neutral-on-neutral text-[26px] sm:text-public-fs-hero">
            Site Map
          </h1>
          <p className="font-segoe font-normal leading-relaxed sm:leading-[120%] text-public-text-neutral-on-neutral text-xs sm:text-public-fs-subtitle-sm max-w-xl">
            Complete directory of the Y-TRACE public website pages and Organization Portal workflows.
          </p>
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
                  className="rounded-xl sm:rounded-[16px] border border-[#DCE4F0] bg-white p-2.5 sm:p-4 shadow-2xs sm:shadow-public-nav overflow-hidden flex flex-col"
                >
                  {/* Category Section Header */}
                  <div className="flex items-center gap-2 border-b border-[#DCE4F0] pb-2.5 mb-1 px-2.5 sm:px-3 pt-1.5 sm:pt-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEF7FE] p-1 shrink-0">
                      <Icon className="h-4 w-4 text-public-text-brand" />
                    </div>
                    <h2 className="font-segoe text-sm sm:text-base font-bold text-public-text-brand">
                      {section.title}
                    </h2>
                  </div>

                  {/* Navigation Rows */}
                  <ul className="divide-y divide-border/40 text-xs sm:text-sm">
                    {section.links.map((link, index) => (
                      <li key={`${link.href}-${index}`}>
                        <Link
                          to={link.href}
                          className="group flex min-h-[42px] items-center justify-between gap-3 px-2.5 py-2.5 sm:px-3 sm:py-3 font-segoe font-medium text-foreground hover:text-primary hover:bg-slate-50 transition-colors rounded-lg"
                        >
                          <span className="break-words leading-snug">{link.label}</span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
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
