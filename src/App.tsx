import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import About from "./pages/About";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import AdminPortal from "./admin/AdminPortal";
import LegalPolicy from "./pages/LegalPolicy";
import Faqs from "./pages/Faqs";
import Contacts from "./pages/Contacts";
import SiteMap from "./pages/SiteMap";
import NewsReleaseRecord from "./pages/NewsReleaseRecord";
import { usePolicyAgreement } from "./hooks/use-policy-agreement";
import { TermsPrivacyAgreementModal } from "./components/TermsPrivacyAgreementModal";
import UserPortal from "./user/UserPortal";
import { LydoConnectProvider } from "./lib/lydo-connect-store";
import {
  ADMIN_SIGNIN_PATH,
  EFFECTIVE_ADMIN_SIGNIN_PATH,
  IS_ADMIN_SURFACE,
  IS_COMBINED_SURFACE,
  IS_USER_SURFACE,
  USER_SIGNIN_PATH,
} from "./lib/deployment-surface";

const queryClient = new QueryClient();

const FullScreenLoader = () => (
  <div className="min-h-screen bg-background grid place-items-center text-muted-foreground text-sm">Loading...</div>
);

const PolicyAgreementGate = ({ children }: { children: JSX.Element }) => {
  const { isInitialized, isAuthenticated, role, user, signOut } = useAuth();
  const shouldCheckPolicy = isInitialized && isAuthenticated && role !== "admin" && Boolean(user?.id);
  const { isChecking, isRequired, activePolicy, accepting, error, accept, refresh } = usePolicyAgreement({
    userId: user?.id ?? null,
    enabled: shouldCheckPolicy,
  });

  if (!isInitialized) return <FullScreenLoader />;
  if (shouldCheckPolicy && isChecking) return <FullScreenLoader />;
  if (shouldCheckPolicy && !activePolicy) {
    return (
      <div className="min-h-screen bg-background grid place-items-center px-4">
        <div className="max-w-md rounded-xl border border-border bg-card p-5 text-center">
          <h2 className="text-lg font-semibold text-foreground">Policy Agreement Required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We could not load the active Terms of Service and Privacy Policy right now.
          </p>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
              onClick={() => void refresh()}
            >
              Retry
            </button>
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
              onClick={() => void signOut()}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <TermsPrivacyAgreementModal
        open={Boolean(shouldCheckPolicy && isRequired && activePolicy)}
        policy={activePolicy}
        saving={accepting}
        error={error}
        onAccept={async () => {
          await accept();
        }}
        onDecline={async () => {
          await signOut();
        }}
      />
    </>
  );
};

const RequireAdmin = ({ children }: { children: JSX.Element }) => {
  const { isInitialized, role } = useAuth();
  if (!isInitialized) return <FullScreenLoader />;
  if (role !== "admin") return <Navigate to={EFFECTIVE_ADMIN_SIGNIN_PATH} replace />;
  return children;
};

const RequireUser = ({ children }: { children: JSX.Element }) => {
  const { isInitialized, isAuthenticated, role } = useAuth();
  if (!isInitialized) return <FullScreenLoader />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (!isAuthenticated) return <Navigate to={USER_SIGNIN_PATH} replace />;
  return children;
};

const NotFoundRoute = () => {
  const { isInitialized, role } = useAuth();
  if (!isInitialized) return <FullScreenLoader />;
  if (IS_ADMIN_SURFACE) return <Navigate to={EFFECTIVE_ADMIN_SIGNIN_PATH} replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  return <NotFound />;
};

const ScrollToTopOnRouteChange = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search]);
  return null;
};

const SurfaceThemeClass = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const isAdminPath = pathname.startsWith("/admin");
    const shouldUsePublicTheme = !IS_ADMIN_SURFACE && !isAdminPath;
    document.body.classList.toggle("public-shell", shouldUsePublicTheme);

    return () => {
      document.body.classList.remove("public-shell");
    };
  }, [pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LydoConnectProvider>
      <AuthProvider>
        <TooltipProvider>
          <PolicyAgreementGate>
            <>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTopOnRouteChange />
                <SurfaceThemeClass />
                <Routes>
                  {IS_ADMIN_SURFACE ? (
                    <>
                      <Route path={ADMIN_SIGNIN_PATH} element={<SignIn forcedMode="admin" />} />
                      <Route path={USER_SIGNIN_PATH} element={<Navigate to={ADMIN_SIGNIN_PATH} replace />} />
                      <Route path="/admin" element={<RequireAdmin><AdminPortal section="overview" /></RequireAdmin>} />
                      <Route path="/admin/registrations" element={<RequireAdmin><AdminPortal section="registrations" /></RequireAdmin>} />
                      <Route path="/admin/users" element={<RequireAdmin><AdminPortal section="users" /></RequireAdmin>} />
                      <Route path="/admin/document-validation" element={<Navigate to="/admin/registrations" replace />} />
                      <Route path="/admin/budget-utilization" element={<RequireAdmin><AdminPortal section="budget-utilization" /></RequireAdmin>} />
                      <Route path="/admin/liquidation-monitoring" element={<RequireAdmin><AdminPortal section="liquidation-monitoring" /></RequireAdmin>} />
                      <Route path="/admin/news-releases" element={<RequireAdmin><AdminPortal section="news-releases" /></RequireAdmin>} />
                      <Route path="/admin/news-releases/:newsReleaseId" element={<RequireAdmin><NewsReleaseRecord /></RequireAdmin>} />
                      <Route path="/admin/budget-monitoring" element={<RequireAdmin><AdminPortal section="budget-monitoring" /></RequireAdmin>} />
                      <Route path="/admin/public-transparency-posts" element={<Navigate to="/admin/budget-monitoring" replace />} />
                      <Route path="/admin/templates" element={<RequireAdmin><AdminPortal section="templates" /></RequireAdmin>} />
                      <Route path="/admin/notifications" element={<RequireAdmin><AdminPortal section="notifications" /></RequireAdmin>} />
                      <Route path="/admin/activity-logs" element={<RequireAdmin><AdminPortal section="activity-logs" /></RequireAdmin>} />
                      <Route path="/admin/notifications-activity" element={<Navigate to="/admin/notifications" replace />} />
                      <Route path="/" element={<Navigate to={ADMIN_SIGNIN_PATH} replace />} />
                      <Route path="*" element={<Navigate to={ADMIN_SIGNIN_PATH} replace />} />
                    </>
                  ) : (
                    <>
                      {IS_COMBINED_SURFACE ? (
                        <>
                          <Route path="/admin" element={<RequireAdmin><AdminPortal section="overview" /></RequireAdmin>} />
                          <Route path="/admin/registrations" element={<RequireAdmin><AdminPortal section="registrations" /></RequireAdmin>} />
                          <Route path="/admin/users" element={<RequireAdmin><AdminPortal section="users" /></RequireAdmin>} />
                          <Route path="/admin/document-validation" element={<Navigate to="/admin/registrations" replace />} />
                          <Route path="/admin/budget-utilization" element={<RequireAdmin><AdminPortal section="budget-utilization" /></RequireAdmin>} />
                          <Route path="/admin/liquidation-monitoring" element={<RequireAdmin><AdminPortal section="liquidation-monitoring" /></RequireAdmin>} />
                          <Route path="/admin/news-releases" element={<RequireAdmin><AdminPortal section="news-releases" /></RequireAdmin>} />
                          <Route path="/admin/news-releases/:newsReleaseId" element={<RequireAdmin><NewsReleaseRecord /></RequireAdmin>} />
                          <Route path="/admin/budget-monitoring" element={<RequireAdmin><AdminPortal section="budget-monitoring" /></RequireAdmin>} />
                          <Route path="/admin/public-transparency-posts" element={<Navigate to="/admin/budget-monitoring" replace />} />
                          <Route path="/admin/templates" element={<RequireAdmin><AdminPortal section="templates" /></RequireAdmin>} />
                          <Route path="/admin/notifications" element={<RequireAdmin><AdminPortal section="notifications" /></RequireAdmin>} />
                          <Route path="/admin/activity-logs" element={<RequireAdmin><AdminPortal section="activity-logs" /></RequireAdmin>} />
                          <Route path="/admin/notifications-activity" element={<Navigate to="/admin/notifications" replace />} />
                        </>
                      ) : (
                        <Route path="/admin/*" element={<Navigate to="/" replace />} />
                      )}
                      <Route path="/" element={<Index />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/faqs" element={<Faqs />} />
                      <Route path="/contacts" element={<Contacts />} />
                      <Route path="/site-map" element={<SiteMap />} />
                      <Route path="/terms" element={<LegalPolicy />} />
                      <Route path="/privacy" element={<LegalPolicy />} />
                      <Route path="/advocacy" element={<About />} />
                      <Route path={USER_SIGNIN_PATH} element={<SignIn forcedMode={IS_USER_SURFACE ? "user" : undefined} />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />
                      <Route path="/signup" element={<SignUp />} />
                      <Route path="/dashboard" element={<RequireUser><UserPortal section="dashboard" /></RequireUser>} />
                      <Route path="/organization-profile" element={<RequireUser><UserPortal section="organization-profile" /></RequireUser>} />
                      <Route path="/document-submission" element={<RequireUser><UserPortal section="document-submission" /></RequireUser>} />
                      <Route path="/validation-review" element={<Navigate to="/document-submission" replace />} />
                      <Route path="/budget-request" element={<RequireUser><UserPortal section="budget-request" /></RequireUser>} />
                      <Route path="/liquidation-reporting" element={<RequireUser><UserPortal section="liquidation-reporting" /></RequireUser>} />
                      <Route path="/news-releases" element={<RequireUser><UserPortal section="news-releases" /></RequireUser>} />
                      <Route path="/news-releases/:newsReleaseId" element={<NewsReleaseRecord />} />
                      <Route path="/public-transparency" element={<RequireUser><UserPortal section="public-transparency" /></RequireUser>} />
                      <Route path="/compliance-status" element={<RequireUser><UserPortal section="compliance-status" /></RequireUser>} />
                      <Route path="/notifications" element={<RequireUser><UserPortal section="notifications" /></RequireUser>} />
                      <Route path="/profile" element={<Navigate to="/organization-profile" replace />} />
                      <Route path="*" element={<NotFoundRoute />} />
                    </>
                  )}
                </Routes>
              </BrowserRouter>
            </>
          </PolicyAgreementGate>
        </TooltipProvider>
      </AuthProvider>
    </LydoConnectProvider>
  </QueryClientProvider>
);

export default App;
