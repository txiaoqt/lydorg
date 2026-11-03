import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Budget Transparency", href: "/budget-transparency" },
  { label: "Forms & Templates", href: "/public-templates" },
  { label: "News Releases", href: "/news-releases" },
  { label: "FAQs", href: "/faqs" },
  { label: "Contacts", href: "/contacts" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, signOut, role } = useAuth();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileOpen]);

  const handleSignOut = () => {
    signOut();
    setMobileOpen(false);
    navigate("/");
  };

  const isNavItemActive = (href: string) => {
    if (href.includes("#")) {
      const [path, hash] = href.split("#");
      return location.pathname === (path || "/") && location.hash === `#${hash}`;
    }
    return location.pathname === href;
  };

  const portalHref = role === "admin" ? "/admin" : "/dashboard";
  const portalLabel = role === "admin" ? "Admin Portal" : "Open Portal";

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 bg-white shadow-public-nav border-b border-slate-100/80">
      <div className="mx-auto flex h-14 sm:h-16 lg:h-20 w-full max-w-[1440px] items-center justify-between gap-2 px-4 sm:px-10 lg:px-20">
        <Link to="/" className="min-w-0 shrink-0 flex items-center gap-3">
          <img
            src="/navbar-mark.svg"
            alt="Y-TRACE"
            className="h-9 w-9 lg:h-11 lg:w-11 rounded-[6px] object-contain"
          />
          <span aria-hidden="true" className="flex flex-col font-inter leading-none text-public-text-brand">
            <span className="text-[10px] lg:text-[11px] font-semibold uppercase tracking-[0.04em]">Pasig City</span>
            <span className="mt-1 text-base lg:text-lg font-semibold">Y-TRACE</span>
          </span>
        </Link>

        {/* Desktop right actions — visible at xl and above */}
        <div className="hidden h-[40px] items-center gap-[16px] xl:flex">
          {isAuthenticated ? (
            <>
              <Link
                to={portalHref}
                className="flex h-[40px] items-center rounded-[2px] border border-public-border-default px-[16px] font-inter text-public-fs-body-sm font-medium leading-none text-public-text-brand transition-colors hover:border-public-border-brand hover:bg-public-bg-brand-subtle"
              >
                {portalLabel}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex h-[40px] items-center rounded-[2px] bg-public-bg-brand px-[20px] font-inter text-public-fs-body-sm font-medium leading-none text-public-text-on-brand transition-colors hover:bg-public-bg-brand-hover"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="flex h-[40px] items-center rounded-[2px] border border-public-border-default px-[16px] font-inter text-public-fs-body-sm font-medium leading-none text-public-text-brand transition-colors hover:border-public-border-brand hover:bg-public-bg-brand-subtle"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="flex h-[40px] items-center rounded-[2px] bg-public-bg-brand px-[20px] font-inter text-public-fs-body-sm font-medium leading-none text-public-text-on-brand transition-colors hover:bg-public-bg-brand-hover"
              >
                Create an Account
              </Link>
            </>
          )}
        </div>

        {/* Compact navigation button — visible below xl to prevent cramped desktop links */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:text-primary hover:bg-slate-100 active:bg-slate-200/80 transition-colors xl:hidden touch-target"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {mobileOpen ? <X className="h-6 w-6 text-slate-900" /> : <Menu className="h-6 w-6 text-slate-900" />}
        </button>
      </div>

      {/* Desktop nav row — always rendered at xl so page offsets (xl:pt-32) stay fixed */}
      <div className="hidden h-12 border-t border-slate-100 xl:block">
        <div className="mx-auto flex h-full w-full max-w-[1440px] items-stretch gap-8 px-20">
          {!isAuthenticated
            ? navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center border-b-2 text-public-fs-body-sm leading-[140%] transition-colors ${
                    isNavItemActive(item.href)
                      ? "border-public-border-brand font-semibold text-public-text-brand"
                      : "border-transparent font-normal text-public-text-neutral-default hover:text-public-text-brand"
                  }`}
                >
                  {item.label}
                </Link>
              ))
            : null}
        </div>
      </div>

      {/* Invisible mobile backdrop for outside-click dismiss — preserves normal page appearance */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 top-14 sm:top-16 lg:top-20 z-40 bg-transparent xl:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Content-driven compact modern mobile navigation panel with 100% solid opaque white background */}
      {mobileOpen ? (
        <div className="fixed inset-x-0 top-14 sm:top-16 lg:top-20 z-50 max-h-[calc(100dvh-3.5rem-2rem)] sm:max-h-[calc(100dvh-4rem-2rem)] lg:max-h-[calc(100dvh-5rem-2rem)] overflow-y-auto rounded-b-2xl border-b border-x border-slate-200/90 bg-white px-4.5 pb-7 pt-3 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] xl:hidden safe-area-bottom">
          {/* Navigation Links */}
          <div className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const active = isNavItemActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                    active
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-slate-800 hover:bg-slate-50 hover:text-primary active:bg-slate-100"
                  }`}
                >
                  <span>{item.label}</span>
                  {active ? (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Action CTA Buttons directly below links with comfortable horizontal breathing room */}
          {!isAuthenticated ? (
            <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 mt-2.5 px-3.5">
              <Link
                to="/signin"
                onClick={() => setMobileOpen(false)}
                className="flex h-[42px] items-center justify-center rounded-xl border border-primary/30 font-inter text-sm font-bold text-primary bg-white hover:bg-primary/5 active:scale-[0.98] transition-all shadow-2xs"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileOpen(false)}
                className="flex h-[42px] items-center justify-center rounded-xl bg-public-bg-brand font-inter text-sm font-bold text-public-text-on-brand hover:bg-public-bg-brand-hover active:scale-[0.98] transition-all shadow-xs"
              >
                Create an Account
              </Link>
              <p className="text-center text-xs text-slate-400 font-medium pt-1 pb-1">
                Pasig City Youth Development Portal
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 mt-2.5 px-3.5">
              <Link
                to={portalHref}
                onClick={() => setMobileOpen(false)}
                className="flex h-[42px] items-center justify-center rounded-xl border border-primary/30 font-inter text-sm font-bold text-primary bg-white hover:bg-primary/5 active:scale-[0.98] transition-all shadow-2xs"
              >
                {portalLabel}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex h-[42px] items-center justify-center rounded-xl bg-primary font-inter text-sm font-bold text-white hover:bg-primary/90 active:scale-[0.98] transition-all shadow-xs"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      ) : null}
    </nav>
  );
};

export default Navbar;
