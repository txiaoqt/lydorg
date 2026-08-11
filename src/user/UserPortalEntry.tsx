import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import UserPortal from "@/user/UserPortal";
import { useInstalledUserPwa } from "@/user/pwa/hooks/useInstalledUserPwa";
import PwaInitialLoadingScreen from "@/user/pwa/PwaInitialLoadingScreen";
import { PwaErrorBoundary } from "@/user/pwa/PwaErrorBoundary";
import { getPwaEquivalentRoute } from "@/user/pwa/pwaRoutes";

const PwaUserPortal = lazy(() => import("@/user/pwa/PwaUserPortal"));

export type UserPortalSection =
  | "dashboard"
  | "organization-profile"
  | "document-submission"
  | "budget-request"
  | "liquidation-reporting"
  | "news-releases"
  | "public-transparency"
  | "compliance-status"
  | "notifications"
  | "ypop"
  | "templates"
  | "more"
  | "inquiries";

export default function UserPortalEntry({ section, browserElement }: { section: UserPortalSection; browserElement?: ReactNode }) {
  const usePwaUi = useInstalledUserPwa();
  const { pathname } = useLocation();

  if (!usePwaUi) {
    if (section === "more" || section === "inquiries") return <Navigate to="/dashboard" replace />;
    return browserElement ?? <UserPortal section={section} />;
  }

  return <Navigate to={getPwaEquivalentRoute(pathname)} replace state={{ pwaFrom: pathname }} />;
}

export function PwaRouteEntry() {
  const usePwaUi = useInstalledUserPwa();
  const navigate = useNavigate();

  if (!usePwaUi) return <Navigate to="/dashboard" replace />;

  return (
    <PwaErrorBoundary onDashboard={() => navigate("/app", { replace: true })}>
      <Suspense fallback={<PwaInitialLoadingScreen />}>
        <PwaUserPortal />
      </Suspense>
    </PwaErrorBoundary>
  );
}
