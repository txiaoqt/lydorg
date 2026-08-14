import { ArrowRight, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";

const linkClass =
  "font-segoe text-xs sm:text-public-fs-body-md font-normal leading-relaxed sm:leading-[140%] text-white/80 transition-colors hover:text-white";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-[#0E2F66] to-[#1A5CA8] px-4 py-8 sm:px-6 sm:py-12 lg:px-[64px] lg:py-[96px]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-8 lg:gap-[32px]">

        {/* Desktop / Tablet Layout: 3 Columns. Mobile: Balanced Stack */}
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">

          {/* Brand Column */}
          <div className="flex flex-col gap-2.5 sm:gap-[12px] p-1 sm:p-[10px] lg:max-w-[373px]">
            <div className="flex items-center gap-2 sm:gap-[10px]">
              <BrandLogo showText={false} className="h-9 w-auto sm:h-10 lg:h-[49px]" />
            </div>
            <p className="font-segoe text-xs sm:text-public-fs-body-sm font-semibold leading-relaxed sm:leading-[140%] text-white">
              Official Pasig City Local Youth Development Office Portal
            </p>
            <p className="font-segoe text-xs sm:text-public-fs-body-sm font-normal leading-relaxed sm:leading-[140%] text-white/80 max-w-md">
              Empowering Pasig City youth organizations through streamlined compliance, transparent governance, and accessible digital services.
            </p>
          </div>

          {/* Navigation Links & Contact on Desktop (3 cols) & Mobile (Balanced 2-col + card) */}
          <div className="flex flex-col gap-5 p-1 sm:flex-row sm:gap-[10px] sm:p-[10px] lg:w-[826px]">

            {/* Quick Links Column */}
            <div className="flex-1 flex flex-col">
              <h4 className="mb-2 sm:mb-[16px] font-segoe text-xs sm:text-public-fs-body-md font-bold uppercase sm:normal-case tracking-wider sm:tracking-normal text-white">
                Quick Links
              </h4>
              <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2 sm:gap-[12px]">
                <Link to="/" className={linkClass}>Home</Link>
                <Link to="/about" className={linkClass}>About</Link>
                <Link to="/public-templates" className={linkClass}>Forms &amp; Templates</Link>
                <Link to="/news-releases" className={linkClass}>News Releases</Link>
                <Link to="/faqs" className={linkClass}>FAQs</Link>
                <Link to="/contacts" className={linkClass}>Contacts</Link>
                <Link to="/site-map" className={linkClass}>Site Map</Link>
              </div>
            </div>

            {/* Legal Column */}
            <div className="flex-1 flex flex-col pt-1 sm:pt-0">
              <h4 className="mb-2 sm:mb-[16px] font-segoe text-xs sm:text-public-fs-body-md font-bold uppercase sm:normal-case tracking-wider sm:tracking-normal text-white">
                Legal
              </h4>
              <div className="flex flex-row sm:flex-col gap-4 sm:gap-[12px]">
                <Link to="/privacy" className={linkClass}>Privacy Policy</Link>
                <Link to="/terms" className={linkClass}>Terms of Service</Link>
              </div>
            </div>

            {/* Contact Column (Card on Mobile, Column on Desktop) */}
            <div className="flex-1 flex flex-col rounded-2xl bg-white/10 p-4 border border-white/20 backdrop-blur-xs sm:bg-transparent sm:p-0 sm:border-0 sm:backdrop-blur-none mt-2 sm:mt-0">
              <h4 className="mb-2 sm:mb-[16px] font-segoe text-xs sm:text-public-fs-body-md font-bold uppercase sm:normal-case tracking-wider sm:tracking-normal text-white">
                Contact
              </h4>
              <div className="flex flex-col gap-2 sm:gap-[12px]">
                <div className="flex items-center gap-2 text-xs sm:text-public-fs-body-md text-white/90">
                  <Phone className="h-3.5 w-3.5 sm:hidden shrink-0 text-white/70" />
                  <span>(02) 8643-7632</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-public-fs-body-md text-white/90">
                  <Mail className="h-3.5 w-3.5 sm:hidden shrink-0 text-white/70" />
                  <a href="mailto:lydo@pasigcity.gov.ph" className="underline underline-offset-2 hover:text-white">
                    lydo@pasigcity.gov.ph
                  </a>
                </div>
                <Link
                  to="/contacts"
                  className="mt-1 sm:mt-0 flex items-center justify-center sm:justify-start gap-1.5 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-[#0E2F66] hover:bg-white/95 transition-all shadow-sm active:scale-[0.98] sm:bg-transparent sm:p-0 sm:text-white/80 sm:hover:text-white sm:shadow-none"
                >
                  <span className="sm:hidden">View Contact Page</span>
                  <span className="hidden sm:inline">Contact Us</span>
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom copyright group */}
        <div className="flex flex-col gap-3 sm:gap-[24px] p-1 sm:p-[10px]">
          <hr className="border-t border-white/20 sm:border-white/40" />
          <p className="text-center font-segoe text-xs sm:text-public-fs-body-md font-normal leading-relaxed sm:leading-[140%] text-white/70">
            © 2026 Y-TRACE • Pasig City Local Youth Development Office. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
