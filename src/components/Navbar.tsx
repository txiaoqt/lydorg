import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Forms & Templates", href: "/public-templates" },
  { label: "News Releases", href: "/news-releases" },
  { label: "FAQs", href: "/faqs" },
  { label: "Contact", href: "/contacts" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, signOut, role } = useAuth();

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
    <nav className="fixed left-0 right-0 top-[40px] z-50 bg-public-nav-bg shadow-public-nav">
      <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between gap-2 px-5 py-[10px] sm:px-10 lg:px-20">
        <Link to="/" className="min-w-0 shrink-0">
          <BrandLogo showText={false} />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden h-[42px] items-center gap-[10px] bg-public-nav-bg px-[10px] md:flex">
          {!isAuthenticated
            ? navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex h-[42px] items-center px-[12px] py-[10px] text-public-fs-body-sm font-normal leading-[140%] transition-colors ${
                    isNavItemActive(item.href)
                      ? "border-b border-public-border-brand text-public-text-brand"
                      : "border-b border-transparent text-public-text-secondary hover:text-public-text-brand"
                  }`}
                >
                  {item.label}
                </Link>
              ))
            : null}
        </div>

        {/* Desktop right actions */}
        <div className="hidden h-[40px] items-center gap-[16px] md:flex">
          {isAuthenticated ? (
            <>
              <Link
                to={portalHref}
                className="flex h-[40px] items-center rounded-[8px] border border-public-border-brand px-[12px] font-segoe text-public-fs-body-sm font-normal leading-none text-public-text-brand transition-colors hover:bg-public-bg-brand-subtle"
              >
                {portalLabel}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex h-[40px] items-center rounded-[8px] bg-public-bg-brand px-[12px] font-segoe text-public-fs-body-sm font-normal leading-none text-public-text-on-brand transition-colors hover:bg-public-bg-brand-hover"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="flex h-[40px] items-center rounded-[8px] border border-public-border-brand px-[12px] font-segoe text-public-fs-body-sm font-normal leading-none text-public-text-brand transition-colors hover:bg-public-bg-brand-subtle"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="flex h-[40px] items-center rounded-[8px] bg-public-bg-brand px-[12px] font-segoe text-public-fs-body-sm font-normal leading-none text-public-text-on-brand transition-colors hover:bg-public-bg-brand-hover"
              >
                Create an Account
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="shrink-0 p-2 text-foreground md:hidden"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen ? (
        <div className="border-b border-primary/15 bg-public-nav-bg px-5 pb-4 sm:px-10 lg:px-20 md:hidden">
          {!isAuthenticated ? (
            <>
              <div className="space-y-0.5 py-3">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block border-b py-2.5 pl-1 pr-4 text-public-fs-body-sm font-normal leading-[140%] transition-colors ${
                      isNavItemActive(item.href)
                        ? "border-public-border-brand text-public-text-brand"
                        : "border-transparent text-public-text-secondary hover:text-public-text-brand"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-[16px] pt-1">
                <Link
                  to="/signin"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-[40px] items-center justify-center rounded-[8px] border border-public-border-brand font-segoe text-public-fs-body-sm font-normal leading-none text-public-text-brand"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-[40px] items-center justify-center rounded-[8px] bg-public-bg-brand font-segoe text-public-fs-body-sm font-normal leading-none text-public-text-on-brand"
                >
                  Create an Account
                </Link>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-[16px] py-3">
              <Link
                to={portalHref}
                onClick={() => setMobileOpen(false)}
                className="flex h-[40px] items-center justify-center rounded-[8px] border border-public-border-brand font-segoe text-public-fs-body-sm font-normal leading-none text-public-text-brand"
              >
                {portalLabel}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex h-[40px] items-center justify-center rounded-[8px] bg-public-bg-brand font-segoe text-public-fs-body-sm font-normal leading-none text-public-text-on-brand"
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
