import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const siteMapSections: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "Public Pages",
    links: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "FAQs", href: "/faqs" },
      { label: "Contacts", href: "/contacts" },
      { label: "Site Map", href: "/site-map" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
  {
    title: "User Portal",
    links: [
      { label: "Sign In", href: "/signin" },
      { label: "Sign Up", href: "/signup" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Organization Profile", href: "/organization-profile" },
      { label: "Document Submission", href: "/document-submission" },
      { label: "Budget Request", href: "/budget-request" },
      { label: "Liquidation and Reporting", href: "/liquidation-reporting" },
      { label: "News Releases", href: "/news-releases" },
      { label: "Public Transparency Posting", href: "/public-transparency" },
      { label: "Compliance Status", href: "/compliance-status" },
      { label: "Notifications", href: "/notifications" },
    ],
  },
];

const SiteMap = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <section className="hero-gradient py-10 sm:py-12 md:py-20">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h1 className="text-[1.9rem] sm:text-4xl md:text-5xl font-heading font-bold text-secondary-foreground mb-4 sm:mb-6">
              Site Map
            </h1>
            <p className="text-secondary-foreground/70 text-sm sm:text-base md:text-lg leading-relaxed">
              Complete directory of the Y-TRACE public pages and user portal routes.
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
                    {section.links.map((link) => (
                      <li key={link.href}>
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
