import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const linkClass =
  "font-segoe text-public-fs-body-md font-normal leading-[140%] text-public-text-neutral-on-neutral transition-colors hover:text-white";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-[#0E2F66] to-[#1A5CA8] px-5 py-[96px] sm:px-6 lg:px-[64px]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-[32px]">

        {/* Links group */}
        <div className="flex flex-col gap-[24px] py-[10px] lg:flex-row lg:justify-between">

          {/* Y-TRACE group */}
          <div className="flex flex-col gap-[12px] p-[10px] lg:max-w-[373px]">
            <div className="flex items-center gap-[10px]">
              <img
                src="/y-trace-logo.png"
                alt="Y-TRACE logo"
                className="h-[50px] w-[55px] object-contain"
              />
              <div className="py-[10px]">
                <span className="font-segoe text-[20px] font-bold leading-[120%] tracking-[0%] text-public-text-neutral-on-neutral">
                  Y-TRACE
                </span>
              </div>
            </div>
            <p className="font-segoe text-public-fs-body-sm font-normal leading-[140%] text-white">
              Official Pasig City Local Youth Development Office Portal
            </p>
            <p className="font-segoe text-public-fs-body-sm font-normal leading-[140%] text-white">
              Empowering Pasig City youth organizations through streamlined compliance, transparent governance, and accessible digital services.
            </p>
          </div>

          {/* Nav columns */}
          <div className="flex flex-col gap-[24px] p-[10px] sm:flex-row sm:gap-[10px] lg:w-[826px]">

            {/* Quick Links */}
            <div className="flex flex-1 flex-col">
              <h4 className="mb-[16px] font-segoe text-public-fs-body-md font-semibold leading-[140%] text-white">
                Quick Links
              </h4>
              <div className="flex flex-col gap-[12px]">
                <Link to="/" className={linkClass}>Home</Link>
                <Link to="/about" className={linkClass}>About</Link>
                <Link to="/public-templates" className={linkClass}>Forms &amp; Templates</Link>
                <Link to="/news-releases" className={linkClass}>News Releases</Link>
                <Link to="/faqs" className={linkClass}>FAQs</Link>
                <Link to="/contacts" className={linkClass}>Contact</Link>
              </div>
            </div>

            {/* Legal */}
            <div className="flex flex-1 flex-col">
              <h4 className="mb-[16px] font-segoe text-public-fs-body-md font-semibold leading-[140%] text-white">
                Legal
              </h4>
              <div className="flex flex-col gap-[12px]">
                <Link to="/privacy" className={linkClass}>Privacy Policy</Link>
                <Link to="/terms" className={linkClass}>Terms of Service</Link>
              </div>
            </div>

            {/* Contact */}
            <div className="flex flex-1 flex-col">
              <h4 className="mb-[16px] font-segoe text-public-fs-body-md font-semibold leading-[140%] text-white">
                Contact
              </h4>
              <div className="flex flex-col gap-[12px]">
                <span className={linkClass}>(02) 8643-7632</span>
                <a href="mailto:lydo@pasigcity.gov.ph" className={linkClass}>
                  lydo@pasigcity.gov.ph
                </a>
                <Link to="/contacts" className={`${linkClass} flex items-center gap-[8px]`}>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                  Contact Us
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom group */}
        <div className="flex flex-col gap-[24px] p-[10px]">
          <hr className="border-t border-white" />
          <p className="text-center font-segoe text-public-fs-body-md font-normal leading-[140%] text-white">
            © 2026 Y-TRACE • Pasig City Local Youth Development Office. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
