import type { ReactNode } from "react";
import {
  BellRing,
  BookOpen,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileCheck2,
  LogIn,
  Phone,
  ScrollText,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/use-auth";
import { PwaContactPage, PwaFaqPage, PwaLegalPage } from "../PwaInformationPages";
import PwaInitialLoadingScreen from "../PwaInitialLoadingScreen";
import { useInstalledUserPwa } from "../hooks/useInstalledUserPwa";
import {
  beginPwaAuthFlow,
  PWA_ENTRY_ROUTE,
  pwaAuthRoute,
  pwaPublicRoute,
} from "../pwaAuthFlow";
import "../styles/pwa-app.css";

type PublicPage = "help" | "faqs" | "contact" | "privacy" | "terms";

const websiteFallbacks: Record<PublicPage, string> = {
  help: "/faqs",
  faqs: "/faqs",
  contact: "/contacts",
  privacy: "/privacy",
  terms: "/terms",
};

function PwaPublicShell({
  children,
  showBack = false,
  welcome = false,
}: {
  children: ReactNode;
  showBack?: boolean;
  welcome?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className={`ytrace-pwa-app pwa-public-app ${welcome ? "is-welcome" : ""}`}>
      <header className={`pwa-public-header ${welcome ? "is-utility-only" : ""}`}>
        {!welcome ? (
          <button
            type="button"
            className="pwa-public-brand"
            aria-label="Y-TRACE welcome"
            onClick={() => navigate(PWA_ENTRY_ROUTE)}
          >
            <BrandLogo imgClassName="h-9 w-9" subtitle="Compliance App" />
          </button>
        ) : null}
        {showBack ? (
          <button type="button" className="pwa-public-header-action" onClick={() => navigate(PWA_ENTRY_ROUTE)}>
            Back
          </button>
        ) : (
          <button
            type="button"
            className="pwa-public-header-action"
            aria-label="Open PWA help"
            onClick={() => navigate(pwaPublicRoute("help"))}
          >
            <CircleHelp aria-hidden="true" /> Help
          </button>
        )}
      </header>
      <main className="pwa-public-main">{children}</main>
    </div>
  );
}

function PwaWelcomePage() {
  const navigate = useNavigate();
  const startAuth = (route: "/signin" | "/signup") => {
    beginPwaAuthFlow();
    navigate(pwaAuthRoute(route));
  };

  const capabilities = [
    {
      icon: FileCheck2,
      title: "Track compliance documents",
      detail: "Upload files and monitor review results.",
    },
    {
      icon: ClipboardCheck,
      title: "Manage organization requests",
      detail: "Track YPOP eligibility, budgets, and liquidation.",
    },
    {
      icon: BellRing,
      title: "Receive official updates",
      detail: "Access notifications, templates, and LYDO news.",
    },
  ];

  return (
    <PwaPublicShell welcome>
      <section className="pwa-public-welcome" aria-labelledby="pwa-welcome-title">
        <img className="pwa-public-hero-logo" src="/y-trace-logo.png" alt="Y-TRACE" />
        <p className="pwa-public-product-label">Compliance App</p>
        <h1 id="pwa-welcome-title"><span>Youth Organization</span><span>Compliance App</span></h1>
        <p>Manage your organization profile, compliance documents, YPOP participation, budget requests, and liquidation requirements in one secure portal.</p>
      </section>

      <section className="pwa-public-auth-actions" aria-label="Account access">
        <button type="button" className="pwa-primary-button" aria-label="Sign in to Y-TRACE" onClick={() => startAuth("/signin")}>
          <LogIn aria-hidden="true" /> Sign In
        </button>
        <button type="button" className="pwa-secondary-button" aria-label="Create a Y-TRACE account" onClick={() => startAuth("/signup")}>
          <UserPlus aria-hidden="true" /> Create Account
        </button>
      </section>

      <section className="pwa-card pwa-public-capabilities" aria-labelledby="pwa-capabilities-title">
        <h2 id="pwa-capabilities-title">What you can do</h2>
        {capabilities.map(({ icon: Icon, title, detail }) => (
          <article key={title}>
            <span><Icon aria-hidden="true" /></span>
            <div><h3>{title}</h3><p>{detail}</p></div>
          </article>
        ))}
      </section>

      <footer className="pwa-public-footer">
        <p>Need help?</p>
        <nav aria-label="PWA support links">
          <button type="button" onClick={() => navigate(pwaPublicRoute("faqs"))}>FAQs</button>
          <span aria-hidden="true">&middot;</span>
          <button type="button" onClick={() => navigate(pwaPublicRoute("contact"))}>Contact LYDO / PCYDO</button>
        </nav>
        <nav aria-label="PWA legal links">
          <button type="button" onClick={() => navigate(pwaPublicRoute("privacy"))}>Privacy Policy</button>
          <span aria-hidden="true">&middot;</span>
          <button type="button" onClick={() => navigate(pwaPublicRoute("terms"))}>Terms of Service</button>
        </nav>
      </footer>
    </PwaPublicShell>
  );
}

function PwaPublicHelpPage() {
  const navigate = useNavigate();
  const links = [
    { label: "Frequently Asked Questions", path: pwaPublicRoute("faqs"), icon: BookOpen },
    { label: "Contact LYDO / PCYDO", path: pwaPublicRoute("contact"), icon: Phone },
    { label: "Privacy Policy", path: pwaPublicRoute("privacy"), icon: ShieldCheck },
    { label: "Terms of Service", path: pwaPublicRoute("terms"), icon: ScrollText },
  ];
  return (
    <div className="pwa-stack">
      <section className="pwa-card pwa-settings-detail-card">
        <span className="pwa-settings-hero-icon"><CircleHelp aria-hidden="true" /></span>
        <div><h2>Help and information</h2><p>Support and legal resources available before you sign in.</p></div>
      </section>
      <section className="pwa-card pwa-public-help-links">
        {links.map(({ label, path, icon: Icon }) => (
          <button type="button" key={path} onClick={() => navigate(path)}>
            <span className="pwa-menu-icon"><Icon aria-hidden="true" /></span>
            <strong>{label}</strong>
            <ChevronRight aria-hidden="true" />
          </button>
        ))}
      </section>
    </div>
  );
}

export function PwaEntryGate() {
  const installedPwa = useInstalledUserPwa();
  const { isInitialized, isAuthenticated, role } = useAuth();
  if (!installedPwa) return <Navigate to="/" replace />;
  if (!isInitialized) return <PwaInitialLoadingScreen />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (isAuthenticated) return <Navigate to="/app" replace />;
  return <PwaWelcomePage />;
}

export function PwaPublicResourceGate({ page }: { page: PublicPage }) {
  const installedPwa = useInstalledUserPwa();
  const { isInitialized, isAuthenticated, role } = useAuth();
  if (!installedPwa) return <Navigate to={websiteFallbacks[page]} replace />;
  if (!isInitialized) return <PwaInitialLoadingScreen />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (isAuthenticated) return <Navigate to="/app" replace />;

  const content = page === "help"
    ? <PwaPublicHelpPage />
    : page === "faqs"
      ? <PwaFaqPage />
      : page === "contact"
        ? <PwaContactPage />
        : <PwaLegalPage type={page} />;

  return <PwaPublicShell showBack>{content}</PwaPublicShell>;
}
