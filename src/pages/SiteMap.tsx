import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import AnnouncementBar from "@/components/AnnouncementBar";
import Footer from "@/components/Footer";

const siteMapSections: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "Public Website",
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
    links: [
      { label: "Sign In", href: "/signin" },
      { label: "Create Organization Account", href: "/signup" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Organization Profile", href: "/organization-profile" },
      { label: "YPOP (Youth Participation Organization Passport)", href: "/ypop" },
      { label: "Document Submission", href: "/document-submission" },
      { label: "Budget Requests", href: "/budget-request" },
      { label: "Liquidation Reports", href: "/liquidation-reporting" },
      { label: "News Releases", href: "/news-releases" },
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
      <div className="pt-16">
        <section className="hero-gradient py-10 sm:py-12 md:py-20">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h1 className="text-[1.9rem] sm:text-4xl md:text-5xl font-heading font-bold text-secondary-foreground mb-4 sm:mb-6">
              Site Map
            </h1>
            <p className="text-secondary-foreground/70 text-sm sm:text-base md:text-lg leading-relaxed">
              Complete directory of the Y-TRACE public website pages and Organization Portal workflows.
            </p>
          </div>
        </section>

        <section className="py-8 sm:py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              {siteMapSections.map((section) => (
                <article key={section.title} className="bg-card border border-border rounded-xl p-5 sm:p-6 card-shadow">
                  <h2 className="text-lg font-heading font-semibold text-foreground mb-3">{section.title}</h2>
                  <ul className="space-y-2 text-sm">
                    {section.links.map((link, index) => (
                      <li key={`${link.href}-${index}`}>
                        <Link to={link.href} className="text-muted-foreground hover:text-primary transition-colors">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default SiteMap;
