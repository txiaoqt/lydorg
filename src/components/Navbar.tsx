import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Templates", href: "/public-templates" },
  { label: "About", href: "/about" },
  { label: "FAQs", href: "/faqs" },
  { label: "Contacts", href: "/contacts" },
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
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-primary/15 bg-background/90 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-3 sm:px-4">
        <Link to="/" className="min-w-0 shrink-0">
          <BrandLogo imgClassName="h-9 w-9 sm:h-10 sm:w-10" showText textClassName="hidden sm:block" />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-1 md:flex">
          {!isAuthenticated
            ? navItems.map((item) => (
                <Link
                    key={item.href}
                    to={item.href}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isNavItemActive(item.href)
                      ? "border border-primary/25 bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              ))
            : null}
        </div>

        {/* Desktop right actions */}
        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to={portalHref}>{portalLabel}</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/signin">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Create Account</Link>
              </Button>
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
        <div className="border-b border-primary/15 bg-background px-4 pb-4 md:hidden">
          {!isAuthenticated ? (
            <>
              <div className="space-y-0.5 py-3">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                      isNavItemActive(item.href)
                        ? "border border-primary/25 bg-primary/12 text-primary"
                        : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to="/signin" onClick={() => setMobileOpen(false)}>Sign In</Link>
                </Button>
                <Button size="sm" className="w-full" asChild>
                  <Link to="/signup" onClick={() => setMobileOpen(false)}>Create Account</Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-2 py-3">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to={portalHref} onClick={() => setMobileOpen(false)}>
                  {portalLabel}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </nav>
  );
};

export default Navbar;
