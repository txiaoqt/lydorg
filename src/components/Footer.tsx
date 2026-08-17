import { ArrowRight, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

const mobileLinkClass =
  "font-segoe text-sm sm:text-public-fs-body-md font-normal leading-relaxed sm:leading-[140%] text-white/80 transition-colors hover:text-white";

const desktopLinkClass =
  "font-segoe text-sm font-normal leading-relaxed text-white/75 transition-colors hover:text-white";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-[#0E2F66] to-[#1A5CA8] px-4 py-8 sm:px-6 sm:py-10 lg:px-[64px] lg:py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-8 lg:gap-6">

        {/* ==================== MOBILE / TABLET LAYOUT (< lg) ==================== */}
        <div className="flex flex-col gap-6 lg:hidden">

          {/* Brand Column */}
          <div className="flex flex-col gap-2.5 sm:gap-[12px] p-1 sm:p-[10px]">
            <div className="flex items-center gap-2 sm:gap-[10px]">
              <img src="/FullFooter.svg" alt="Y-TRACE" className="h-9 w-auto sm:h-10 object-contain" />
            </div>
            <p className="font-segoe text-sm sm:text-public-fs-body-sm font-semibold leading-relaxed sm:leading-[140%] text-white">
              Official Pasig City Local Youth Development Office Portal
            </p>
            <p className="font-segoe text-sm sm:text-public-fs-body-sm font-normal leading-relaxed sm:leading-[140%] text-white/80 max-w-md">
              Empowering Pasig City youth organizations through streamlined compliance, transparent governance, and accessible digital services.
            </p>
          </div>

          {/* Navigation Links & Contact on Mobile */}
          <div className="flex flex-col gap-5 p-1 sm:flex-row sm:gap-[10px] sm:p-[10px]">

            {/* Quick Links Column */}
            <div className="flex-1 flex flex-col">
              <h4 className="mb-2 sm:mb-[16px] font-segoe text-sm sm:text-public-fs-body-md font-bold uppercase sm:normal-case tracking-wider sm:tracking-normal text-white">
                Quick Links
              </h4>
              <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2 sm:gap-[12px]">
                <Link to="/" className={mobileLinkClass}>Home</Link>
                <Link to="/about" className={mobileLinkClass}>About</Link>
                <Link to="/public-templates" className={mobileLinkClass}>Forms &amp; Templates</Link>
                <Link to="/news-releases" className={mobileLinkClass}>News Releases</Link>
                <Link to="/faqs" className={mobileLinkClass}>FAQs</Link>
                <Link to="/contacts" className={mobileLinkClass}>Contacts</Link>
                <Link to="/site-map" className={mobileLinkClass}>Site Map</Link>
              </div>
            </div>

            {/* Legal Column */}
            <div className="flex-1 flex flex-col pt-1 sm:pt-0">
              <h4 className="mb-2 sm:mb-[16px] font-segoe text-sm sm:text-public-fs-body-md font-bold uppercase sm:normal-case tracking-wider sm:tracking-normal text-white">
                Legal
              </h4>
              <div className="flex flex-row sm:flex-col gap-4 sm:gap-[12px]">
                <Link to="/privacy" className={mobileLinkClass}>Privacy Policy</Link>
                <Link to="/terms" className={mobileLinkClass}>Terms of Service</Link>
              </div>
            </div>

            {/* Contact Column (Card on Mobile) */}
            <div className="flex-1 flex flex-col rounded-2xl bg-white/10 p-4 border border-white/20 backdrop-blur-xs sm:bg-transparent sm:p-0 sm:border-0 sm:backdrop-blur-none mt-2 sm:mt-0">
              <h4 className="mb-2 sm:mb-[16px] font-segoe text-sm sm:text-public-fs-body-md font-bold uppercase sm:normal-case tracking-wider sm:tracking-normal text-white">
                Contact
              </h4>
              <div className="flex flex-col gap-2 sm:gap-[12px]">
                <div className="flex items-center gap-2 text-sm sm:text-public-fs-body-md text-white/90">
                  <Phone className="h-3.5 w-3.5 sm:hidden shrink-0 text-white/70" />
                  <span>(02) 8643-7632</span>
                </div>
                <div className="flex items-center gap-2 text-sm sm:text-public-fs-body-md text-white/90">
                  <Mail className="h-3.5 w-3.5 sm:hidden shrink-0 text-white/70" />
                  <a href="mailto:lydo@pasigcity.gov.ph" className="underline underline-offset-2 hover:text-white">
                    lydo@pasigcity.gov.ph
                  </a>
                </div>
                <Link
                  to="/contacts"
                  className="mt-1 sm:mt-0 flex items-center justify-center sm:justify-start gap-1.5 rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-[#0E2F66] hover:bg-white/95 transition-all shadow-sm active:scale-[0.98] sm:bg-transparent sm:p-0 sm:text-white/80 sm:hover:text-white sm:shadow-none"
                >
                  <span className="sm:hidden">View Contact Page</span>
                  <span className="hidden sm:inline">Contact Us</span>
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* ==================== DESKTOP LAYOUT (lg and up) ==================== */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-10 lg:items-start">

          {/* Left Column: Brand (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-2.5">
            <div className="flex items-center">
              <img src="/FullFooter.svg" alt="Y-TRACE" className="h-9 w-auto object-contain" />
            </div>
            <p className="font-segoe text-public-fs-subheading-sm font-semibold leading-snug text-white">
              Official Pasig City Local Youth Development Office Portal
            </p>
            <p className="font-segoe text-sm font-normal leading-relaxed text-white/75 max-w-sm">
              Empowering Pasig City youth organizations through streamlined compliance, transparent governance, and accessible digital services.
            </p>
          </div>

          {/* Middle Column: Quick Links (4 cols) */}
          <div className="lg:col-span-4 flex flex-col">
            <h4 className="font-segoe text-public-fs-subheading-sm font-semibold text-white mb-2.5">
              Quick Links
            </h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              <Link to="/" className={desktopLinkClass}>Home</Link>
              <Link to="/faqs" className={desktopLinkClass}>FAQs</Link>
              <Link to="/about" className={desktopLinkClass}>About</Link>
              <Link to="/contacts" className={desktopLinkClass}>Contacts</Link>
              <Link to="/public-templates" className={desktopLinkClass}>Forms &amp; Templates</Link>
              <Link to="/site-map" className={desktopLinkClass}>Site Map</Link>
              <Link to="/news-releases" className={desktopLinkClass}>News Releases</Link>
            </div>
          </div>

          {/* Right Column: Legal + Contact stacked (3 cols) */}
          <div className="lg:col-span-3 flex flex-col gap-4">

            {/* Legal */}
            <div className="flex flex-col">
              <h4 className="font-segoe text-public-fs-subheading-sm font-semibold text-white mb-1.5">
                Legal
              </h4>
              <div className="flex flex-col gap-1.5">
                <Link to="/privacy" className={desktopLinkClass}>Privacy Policy</Link>
                <Link to="/terms" className={desktopLinkClass}>Terms of Service</Link>
              </div>
            </div>

            {/* Contact */}
            <div className="flex flex-col">
              <h4 className="font-segoe text-public-fs-subheading-sm font-semibold text-white mb-1.5">
                Contact
              </h4>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-white/60" />
                  <span>(02) 8643-7632</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-white/60" />
                  <a href="mailto:lydo@pasigcity.gov.ph" className="underline underline-offset-2 hover:text-white">
                    lydo@pasigcity.gov.ph
                  </a>
                </div>
                <Link
                  to="/contacts"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white transition-colors mt-0.5"
                >
                  <span>Contact Us</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </Link>
              </div>
            </div>

          </div>

        </div>

        {/* Bottom copyright group */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <hr className="border-t border-white/20" />
          <p className="text-center font-segoe text-xs font-normal leading-relaxed text-white/70">
            © 2026 Y-TRACE • Pasig City Local Youth Development Office. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
