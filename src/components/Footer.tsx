import { ArrowUp, Mail, MapPin } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { usePublicContactInfo } from "@/lib/admin-system-settings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const linkClass =
  "inline-block rounded-sm py-1 font-segoe text-sm font-normal leading-relaxed text-white/75 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

const groupTitleClass = "font-segoe text-sm font-semibold leading-[140%] text-white";

const utilityLinkClass =
  "rounded-sm py-1 font-segoe text-xs font-normal text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

const FooterLinkGroup = ({
  title,
  links,
  className = "",
}: {
  title: string;
  links: { label: string; to: string }[];
  className?: string;
}) => (
  <nav aria-label={title} className={`flex flex-col ${className}`}>
    <h2 className={groupTitleClass}>{title}</h2>
    <ul className="mt-3 flex flex-col gap-2.5">
      {links.map(({ label, to }) => (
        <li key={to}>
          <Link to={to} className={linkClass}>
            {label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);

const Footer = () => {
  const { address, email } = usePublicContactInfo();
  const [cookiePrefsOpen, setCookiePrefsOpen] = useState(false);
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;

  const handleBackToTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <footer className="bg-gradient-to-r from-[#0E2F66] to-[#1A5CA8] px-4 py-10 sm:px-6 lg:px-[64px] lg:py-12">
      <div className="mx-auto w-full max-w-7xl">

        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-10 lg:grid-cols-12 lg:items-start lg:gap-x-8 lg:gap-y-9">

          {/* Brand column */}
          <div className="col-span-2 flex flex-col gap-4 lg:col-span-6 lg:row-span-2 lg:gap-5 lg:pr-10">
            <img src="/FullFooter.svg" alt="Y-TRACE — Pasig City" className="h-10 w-auto self-start object-contain sm:h-12" />
            <p className="max-w-[360px] font-segoe text-sm font-normal leading-relaxed text-white/80">
              Supporting Pasig City youth organizations through streamlined registration, accessible digital services, and transparent compliance processes.
            </p>
            <div className="mt-1 flex flex-col gap-2.5">
              <p className="flex items-start gap-2 font-segoe text-sm font-normal leading-relaxed text-white/80">
                <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{address}</span>
              </p>
              <a
                href={gmailComposeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-sm py-1 font-segoe text-sm font-normal leading-relaxed text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Mail aria-hidden="true" className="h-4 w-4 shrink-0" />
                {email}
              </a>
            </div>
          </div>

          {/* Navigation groups */}
          <FooterLinkGroup
            className="lg:col-span-3 lg:col-start-7 lg:row-start-1"
            title="General Information"
            links={[
              { label: "Home", to: "/" },
              { label: "About", to: "/about" },
              { label: "News Releases", to: "/news-releases" },
            ]}
          />
          <FooterLinkGroup
            className="lg:col-span-3 lg:col-start-10 lg:row-start-1"
            title="Support"
            links={[
              { label: "FAQs", to: "/faqs" },
              { label: "Contact Us", to: "/contacts" },
            ]}
          />
          <FooterLinkGroup
            className="lg:col-span-3 lg:col-start-7 lg:row-start-2"
            title="Resources"
            links={[
              { label: "Budget Transparency", to: "/budget-transparency" },
              { label: "Forms and Templates", to: "/public-templates" },
            ]}
          />
          <FooterLinkGroup
            className="lg:col-span-3 lg:col-start-10 lg:row-start-2"
            title="Legal"
            links={[
              { label: "Privacy Policy", to: "/privacy" },
              { label: "Terms of Service", to: "/terms" },
            ]}
          />

        </div>

        {/* Utility bar */}
        <div className="mt-9 flex flex-col gap-3 border-t border-white/20 pt-5 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="font-segoe text-xs font-normal leading-relaxed text-white/70">
            © 2026 Pasig City Youth Development Office. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <button type="button" onClick={() => setCookiePrefsOpen(true)} className={utilityLinkClass}>
              Cookie preferences
            </button>
            <Link to="/site-map" className={utilityLinkClass}>
              Sitemap
            </Link>
            <button
              type="button"
              onClick={handleBackToTop}
              className={`${utilityLinkClass} inline-flex items-center gap-1.5`}
            >
              Back to top
              <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

      </div>

      <Dialog open={cookiePrefsOpen} onOpenChange={setCookiePrefsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-segoe">Cookie preferences</DialogTitle>
            <DialogDescription className="font-segoe">
              Y-TRACE uses only the storage needed to run the portal. Nothing here is used for advertising or cross-site tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 font-segoe text-sm">
            <div className="rounded-lg border border-border p-3">
              <p className="font-semibold text-foreground">Essential storage — always active</p>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                Keeps you signed in, protects your session, remembers accepted policies, and caches the installed app for offline use.
              </p>
            </div>
            <p className="leading-relaxed text-muted-foreground">
              Optional analytics and advertising cookies are not used, so there is nothing to switch on or off.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button asChild variant="outline">
              <Link to="/privacy">Privacy Policy</Link>
            </Button>
            <Button type="button" onClick={() => setCookiePrefsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </footer>
  );
};

export default Footer;
