import { Link } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";

const Footer = () => {
  return (
    <footer className="hero-gradient text-secondary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.3fr_1fr_1fr_1.1fr] md:gap-10">
          <div className="space-y-3">
            <div>
              <BrandLogo
                imgClassName="h-8 w-8 sm:h-9 sm:w-9"
                showText
                textClassName="text-sm sm:text-base text-secondary-foreground"
              />
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-secondary-foreground/70">
              Y-TRACE brings organization registration, compliance document submission, review updates, and reporting into one workflow for youth organizations.
            </p>
            <p className="text-xs uppercase tracking-[0.16em] text-secondary-foreground/55">
              LYDO / PCYDO Organization Compliance Portal
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-secondary-foreground">Explore</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/70">
              <li><Link to="/" className="transition-colors hover:text-primary">Home</Link></li>
              <li><Link to="/about" className="transition-colors hover:text-primary">About Y-TRACE</Link></li>
              <li><Link to="/faqs" className="transition-colors hover:text-primary">FAQs</Link></li>
              <li><Link to="/site-map" className="transition-colors hover:text-primary">Site Map</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-secondary-foreground">Portal Access</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/70">
              <li><Link to="/signin" className="transition-colors hover:text-primary">Sign In</Link></li>
              <li><Link to="/signup" className="transition-colors hover:text-primary">Create Account</Link></li>
              <li><Link to="/dashboard" className="transition-colors hover:text-primary">Organization Portal</Link></li>
              <li><Link to="/contacts" className="transition-colors hover:text-primary">Contact Directory</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-secondary-foreground">Support</h4>
            <div className="space-y-2 text-sm text-secondary-foreground/70">
              <p>For office details and staff contacts, open the dedicated Contact Directory page.</p>
              <p>
                <Link to="/contacts" className="transition-colors hover:text-primary">
                  View contact information
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-secondary-foreground/10 pt-5">
          <div className="flex flex-col items-center gap-2.5 text-center">
            <p className="text-[11px] sm:text-xs text-secondary-foreground/55 leading-relaxed">
              (c) 2026 Y-TRACE - Prototype LYDO Portal. Compliant with RA 10742.
            </p>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] sm:text-xs text-secondary-foreground/55">
              <Link to="/privacy" className="hover:text-secondary-foreground/85 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-secondary-foreground/85 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
