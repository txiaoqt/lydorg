import { FileText, Home, Menu, ReceiptText, WalletCards } from "lucide-react";
import { useLocation } from "react-router-dom";
import { usePwaNavigation } from "./hooks/usePwaNavigation";
import { PWA_ROUTES } from "./pwaRoutes";

const items = [
  { label: "Home", path: PWA_ROUTES.home, icon: Home },
  { label: "Documents", path: PWA_ROUTES.documents, icon: FileText },
  { label: "Budget", path: PWA_ROUTES.budgets, icon: WalletCards },
  { label: "Liquidation", path: PWA_ROUTES.liquidations, icon: ReceiptText },
  { label: "More", path: PWA_ROUTES.more, icon: Menu },
];

const secondaryPaths = new Set([
  PWA_ROUTES.profile, PWA_ROUTES.news, PWA_ROUTES.transparency, PWA_ROUTES.compliance,
  PWA_ROUTES.notifications, PWA_ROUTES.ypop, PWA_ROUTES.templates, PWA_ROUTES.inquiries,
  PWA_ROUTES.activity,
  PWA_ROUTES.settings, PWA_ROUTES.about, PWA_ROUTES.faqs, PWA_ROUTES.contact,
  PWA_ROUTES.privacy, PWA_ROUTES.terms,
]);

export function PwaBottomNavigation() {
  const { go } = usePwaNavigation();
  const { pathname } = useLocation();

  return (
    <nav className="pwa-bottom-nav" aria-label="Primary app navigation">
      <button type="button" className="pwa-nav-brand" aria-label="Open Y-TRACE Home" onClick={() => go(PWA_ROUTES.home)}>
        <img src="/y-trace-logo.png" alt="" />
        <span>Y-TRACE</span>
      </button>
      <div className="pwa-bottom-nav-inner">
        {items.map((item) => {
          const isSecondaryPage = [...secondaryPaths].some(
            (path) => pathname === path || pathname.startsWith(`${path}/`),
          );
          const active =
            pathname === item.path ||
            (item.path !== PWA_ROUTES.home && pathname.startsWith(`${item.path}/`)) ||
            (item.path === PWA_ROUTES.more && isSecondaryPage);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              className={active ? "is-active" : ""}
              aria-current={active ? "page" : undefined}
              onClick={() => go(item.path)}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
