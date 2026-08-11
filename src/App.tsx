import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
const Index = lazy(() => import("./pages/Index"));
const About = lazy(() => import("./pages/About"));
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import VerifyEmail from "./pages/VerifyEmail";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import AdminPortal from "./admin/AdminPortal";
const LegalPolicy = lazy(() => import("./pages/LegalPolicy"));
const Faqs = lazy(() => import("./pages/Faqs"));
const Contacts = lazy(() => import("./pages/Contacts"));
import ResetPassword from "./pages/ResetPassword";
const SiteMap = lazy(() => import("./pages/SiteMap"));
import NewsReleaseRecord from "./pages/NewsReleaseRecord";
const PublicTemplates = lazy(() => import("./pages/PublicTemplates"));
const NewsReleases = lazy(() => import("./pages/NewsReleases"));
import { usePolicyAgreement } from "./hooks/use-policy-agreement";
import { TermsPrivacyAgreementModal } from "./components/TermsPrivacyAgreementModal";
import UserPortalEntry, { PwaRouteEntry } from "./user/UserPortalEntry";
import { useInstalledUserPwa } from "./user/pwa/hooks/useInstalledUserPwa";
import PwaInitialLoadingScreen from "./user/pwa/PwaInitialLoadingScreen";
import PublicPageLoader from "./components/PublicPageLoader";
import { PwaEntryGate, PwaPublicResourceGate } from "./user/pwa/public/PwaPublicEntry";
import { PWA_ENTRY_ROUTE } from "./user/pwa/pwaAuthFlow";
import { LydoConnectProvider } from "./lib/lydo-connect-store";
import { isSupabaseConfigured } from "./lib/supabase";
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
  const { isInitialized, isAuthenticated, isPasswordRecoverySession, role, user, signOut } = useAuth();
  const usePwaUi = useInstalledUserPwa();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isRecoveryRoute = pathname === "/reset-password" || pathname === "/auth/callback";
  const shouldCheckPolicy =
    !isRecoveryRoute && isInitialized && isAuthenticated && !isPasswordRecoverySession && role !== "admin" && Boolean(user?.id);
  const { isChecking, isRequired, activePolicy, accepting, error, accept } = usePolicyAgreement({
    userId: user?.id ?? null,
    enabled: shouldCheckPolicy,
  });

  const isPublicPath =
    ["/", "/about", "/faqs", "/contacts", "/site-map", "/terms", "/privacy", "/public-templates", "/advocacy"].includes(pathname) ||
    pathname.startsWith("/news-releases");

  if (isInitialized && isPasswordRecoverySession && pathname !== "/reset-password") {
    console.debug("[AuthDebug] PolicyAgreementGate redirecting recovery session from", pathname, "to /reset-password");
    return <Navigate to="/reset-password" replace />;
  }

  if (!isInitialized) {
    if (usePwaUi) return <PwaInitialLoadingScreen />;
    if (isPublicPath) return <PublicPageLoader />;
    return <FullScreenLoader />;
  }
  if (shouldCheckPolicy && isChecking) {
    if (usePwaUi) return <PwaInitialLoadingScreen />;
    if (isPublicPath) return <PublicPageLoader />;
    return <FullScreenLoader />;
  }

  return (
    <>
      {children}
      <TermsPrivacyAgreementModal
        open={Boolean(shouldCheckPolicy && isRequired && activePolicy)}
        policy={activePolicy}
        saving={accepting}
        variant={usePwaUi ? "pwa" : "website"}
        error={error}
        onAccept={async () => {
          const result = await accept();
          if (!result.error && pathname === "/verify-email") {
            navigate(usePwaUi ? "/app" : "/dashboard", { replace: true });
          }
        }}
        onDecline={async () => {
          await signOut();
        }}
      />
    </>
  );
};

const RequireAdmin = ({ children }: { children: JSX.Element }) => {
  const { isInitialized, isPasswordRecoverySession, role } = useAuth();
  const { pathname } = useLocation();
  if (!isInitialized) return <FullScreenLoader />;
  if (isPasswordRecoverySession) {
    console.debug("[AuthDebug] RequireAdmin redirecting recovery session from", pathname, "to /reset-password");
    return <Navigate to="/reset-password" replace />;
  }
  if (role !== "admin") return <Navigate to={EFFECTIVE_ADMIN_SIGNIN_PATH} replace />;
  return children;
};

const RequireUser = ({ children }: { children: JSX.Element }) => {
  const { isInitialized, isAuthenticated, isPasswordRecoverySession, role } = useAuth();
  const usePwaUi = useInstalledUserPwa();
  const { pathname } = useLocation();
  if (!isInitialized) return usePwaUi ? <PwaInitialLoadingScreen /> : <FullScreenLoader />;
  if (isPasswordRecoverySession) {
    console.debug("[AuthDebug] RequireUser redirecting recovery session from", pathname, "to /reset-password");
    return <Navigate to="/reset-password" replace />;
  }
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (!isAuthenticated) return <Navigate to={usePwaUi ? PWA_ENTRY_ROUTE : USER_SIGNIN_PATH} replace />;
  return children;
};

const NotFoundRoute = () => {
  const { isInitialized, isPasswordRecoverySession, role } = useAuth();
  const { pathname } = useLocation();
  if (!isInitialized) return <FullScreenLoader />;
  if (isPasswordRecoverySession) {
    console.debug("[AuthDebug] NotFoundRoute redirecting recovery session from", pathname, "to /reset-password");
    return <Navigate to="/reset-password" replace />;
  }
  if (IS_ADMIN_SURFACE) return <Navigate to={EFFECTIVE_ADMIN_SIGNIN_PATH} replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  return <NotFound />;
};

const UserSurfaceRoot = () => {
  const { isPasswordRecoverySession } = useAuth();
  const usePwaUi = useInstalledUserPwa();
  const { pathname } = useLocation();
  if (isPasswordRecoverySession) {
    console.debug("[AuthDebug] UserSurfaceRoot redirecting recovery session from", pathname, "to /reset-password");
    return <Navigate to="/reset-password" replace />;
  }
  return usePwaUi ? <Navigate to={PWA_ENTRY_ROUTE} replace /> : <Index />;
};

const PublicNewsReleasesGate = () => {
  const { isInitialized, isAuthenticated, role } = useAuth();
  const usePwaUi = useInstalledUserPwa();

  if (!isInitialized) return usePwaUi ? <PwaInitialLoadingScreen /> : <PublicPageLoader />;

  if (isAuthenticated) {
    if (role === "admin") {
      return <Navigate to="/admin/news-releases" replace />;
    }
    return <Navigate to="/portal-news-releases" replace />;
  }

  return <NewsReleases />;
};

const ScrollToTopOnRouteChange = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    const rawId = hash.replace(/^#/, "");
    if (!rawId) return;

    const scrollToAnchor = () => {
      const targetElement =
        document.getElementById(rawId) ||
        document.querySelector(`[data-alias-id="${rawId}"]`) ||
        document.getElementById(`policy-${rawId}`);

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      }
      return false;
    };

    if (!scrollToAnchor()) {
      const timer = setTimeout(() => {
        scrollToAnchor();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pathname, search, hash]);

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
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <PolicyAgreementGate>
              <>
              <Toaster />
              <Sonner />
              <ScrollToTopOnRouteChange />
              <SurfaceThemeClass />
              <Routes>
                  {IS_ADMIN_SURFACE ? (
                    <>
                      <Route path={ADMIN_SIGNIN_PATH} element={<SignIn forcedMode="admin" />} />
                      <Route path={USER_SIGNIN_PATH} element={<Navigate to={ADMIN_SIGNIN_PATH} replace />} />
                      <Route path="/admin" element={<RequireAdmin><AdminPortal section="overview" /></RequireAdmin>} />
                      <Route path="/admin/registrations" element={<RequireAdmin><AdminPortal section="registrations" /></RequireAdmin>} />
                      <Route path="/admin/users" element={<Navigate to="/admin/yorp-registry" replace />} />
                      <Route path="/admin/document-validation" element={<Navigate to="/admin/registrations" replace />} />
                      <Route path="/admin/budget-utilization" element={<RequireAdmin><AdminPortal section="budget-utilization" /></RequireAdmin>} />
                      <Route path="/admin/liquidation-monitoring" element={<RequireAdmin><AdminPortal section="liquidation-monitoring" /></RequireAdmin>} />
                      <Route path="/admin/inquiries" element={<RequireAdmin><AdminPortal section="inquiries" /></RequireAdmin>} />
                      <Route path="/admin/news-releases" element={<RequireAdmin><AdminPortal section="news-releases" /></RequireAdmin>} />
                      <Route path="/admin/news-releases/:newsReleaseId" element={<RequireAdmin><NewsReleaseRecord /></RequireAdmin>} />
                      <Route path="/admin/budget-monitoring" element={<RequireAdmin><AdminPortal section="budget-monitoring" /></RequireAdmin>} />
                      <Route path="/admin/public-transparency-posts" element={<Navigate to="/admin/budget-monitoring" replace />} />
                      <Route path="/admin/templates" element={<RequireAdmin><AdminPortal section="templates" /></RequireAdmin>} />
                      <Route path="/admin/notifications" element={<RequireAdmin><AdminPortal section="notifications" /></RequireAdmin>} />
                      <Route path="/admin/activity-logs" element={<RequireAdmin><AdminPortal section="activity-logs" /></RequireAdmin>} />
                      <Route path="/admin/notifications-activity" element={<Navigate to="/admin/notifications" replace />} />
                      <Route path="/admin/ypop-validation" element={<RequireAdmin><AdminPortal section="ypop-validation" /></RequireAdmin>} />
                      <Route path="/admin/yorp-registry" element={<RequireAdmin><AdminPortal section="yorp-registry" /></RequireAdmin>} />
                      <Route path="/" element={<Navigate to={ADMIN_SIGNIN_PATH} replace />} />
                      <Route path="*" element={<Navigate to={ADMIN_SIGNIN_PATH} replace />} />
                    </>
                  ) : (
                    <>
                      {IS_COMBINED_SURFACE ? (
                        <>
                          <Route path="/admin" element={<RequireAdmin><AdminPortal section="overview" /></RequireAdmin>} />
                          <Route path="/admin/registrations" element={<RequireAdmin><AdminPortal section="registrations" /></RequireAdmin>} />
                          <Route path="/admin/users" element={<Navigate to="/admin/yorp-registry" replace />} />
                          <Route path="/admin/document-validation" element={<Navigate to="/admin/registrations" replace />} />
                          <Route path="/admin/budget-utilization" element={<RequireAdmin><AdminPortal section="budget-utilization" /></RequireAdmin>} />
                          <Route path="/admin/liquidation-monitoring" element={<RequireAdmin><AdminPortal section="liquidation-monitoring" /></RequireAdmin>} />
                          <Route path="/admin/inquiries" element={<RequireAdmin><AdminPortal section="inquiries" /></RequireAdmin>} />
                          <Route path="/admin/news-releases" element={<RequireAdmin><AdminPortal section="news-releases" /></RequireAdmin>} />
                          <Route path="/admin/news-releases/:newsReleaseId" element={<RequireAdmin><NewsReleaseRecord /></RequireAdmin>} />
                          <Route path="/admin/budget-monitoring" element={<RequireAdmin><AdminPortal section="budget-monitoring" /></RequireAdmin>} />
                          <Route path="/admin/public-transparency-posts" element={<Navigate to="/admin/budget-monitoring" replace />} />
                          <Route path="/admin/templates" element={<RequireAdmin><AdminPortal section="templates" /></RequireAdmin>} />
                          <Route path="/admin/notifications" element={<RequireAdmin><AdminPortal section="notifications" /></RequireAdmin>} />
                          <Route path="/admin/activity-logs" element={<RequireAdmin><AdminPortal section="activity-logs" /></RequireAdmin>} />
                          <Route path="/admin/notifications-activity" element={<Navigate to="/admin/notifications" replace />} />
                          <Route path="/admin/ypop-validation" element={<RequireAdmin><AdminPortal section="ypop-validation" /></RequireAdmin>} />
                          <Route path="/admin/yorp-registry" element={<RequireAdmin><AdminPortal section="yorp-registry" /></RequireAdmin>} />
                        </>
                      ) : (
                        <Route path="/admin/*" element={<Navigate to="/" replace />} />
                      )}
                      <Route path="/" element={<Suspense fallback={<PublicPageLoader />}><UserSurfaceRoot /></Suspense>} />
                      <Route path="/public-templates" element={<Suspense fallback={<PublicPageLoader />}><PublicTemplates /></Suspense>} />
                      <Route path="/about" element={<Suspense fallback={<PublicPageLoader />}><About /></Suspense>} />
                      <Route path="/faqs" element={<Suspense fallback={<PublicPageLoader />}><Faqs /></Suspense>} />
                      <Route path="/contacts" element={<Suspense fallback={<PublicPageLoader />}><Contacts /></Suspense>} />
                      <Route path="/site-map" element={<Suspense fallback={<PublicPageLoader />}><SiteMap /></Suspense>} />
                      <Route path="/terms" element={<Suspense fallback={<PublicPageLoader />}><LegalPolicy /></Suspense>} />
                      <Route path="/privacy" element={<Suspense fallback={<PublicPageLoader />}><LegalPolicy /></Suspense>} />
                      <Route path="/advocacy" element={<Suspense fallback={<PublicPageLoader />}><About /></Suspense>} />
                      <Route path="/news-releases" element={<Suspense fallback={<PublicPageLoader />}><PublicNewsReleasesGate /></Suspense>} />
                      <Route path="/news-releases/:newsReleaseId" element={<Suspense fallback={<PublicPageLoader />}><NewsReleaseRecord /></Suspense>} />
                      <Route path={PWA_ENTRY_ROUTE} element={<PwaEntryGate />} />
                      <Route path={`${PWA_ENTRY_ROUTE}/help`} element={<PwaPublicResourceGate page="help" />} />
                      <Route path={`${PWA_ENTRY_ROUTE}/faqs`} element={<PwaPublicResourceGate page="faqs" />} />
                      <Route path={`${PWA_ENTRY_ROUTE}/contact`} element={<PwaPublicResourceGate page="contact" />} />
                      <Route path={`${PWA_ENTRY_ROUTE}/privacy`} element={<PwaPublicResourceGate page="privacy" />} />
                      <Route path={`${PWA_ENTRY_ROUTE}/terms`} element={<PwaPublicResourceGate page="terms" />} />
                      <Route path={USER_SIGNIN_PATH} element={<SignIn forcedMode={IS_USER_SURFACE ? "user" : undefined} />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />
                      <Route path="/signup" element={<SignUp />} />
                      <Route path="/verify-email" element={<VerifyEmail />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/dashboard" element={<RequireUser><UserPortalEntry section="dashboard" /></RequireUser>} />
                      <Route path="/organization-profile" element={<RequireUser><UserPortalEntry section="organization-profile" /></RequireUser>} />
                      <Route path="/document-submission" element={<RequireUser><UserPortalEntry section="document-submission" /></RequireUser>} />
                      <Route path="/validation-review" element={<Navigate to="/document-submission" replace />} />
                      <Route path="/budget-request" element={<RequireUser><UserPortalEntry section="budget-request" /></RequireUser>} />
                      <Route path="/liquidation-reporting" element={<RequireUser><UserPortalEntry section="liquidation-reporting" /></RequireUser>} />
                      <Route path="/portal-news-releases" element={<RequireUser><UserPortalEntry section="news-releases" /></RequireUser>} />
                      <Route path="/organization-news-releases" element={<RequireUser><UserPortalEntry section="news-releases" /></RequireUser>} />

                      <Route path="/public-transparency" element={<RequireUser><UserPortalEntry section="public-transparency" /></RequireUser>} />
                      <Route path="/compliance-status" element={<RequireUser><UserPortalEntry section="compliance-status" /></RequireUser>} />
                      <Route path="/notifications" element={<RequireUser><UserPortalEntry section="notifications" /></RequireUser>} />
                      <Route path="/ypop" element={<RequireUser><UserPortalEntry section="ypop" /></RequireUser>} />
                      <Route path="/templates" element={<RequireUser><UserPortalEntry section="templates" /></RequireUser>} />
                      <Route path="/app-more" element={<RequireUser><UserPortalEntry section="more" /></RequireUser>} />
                      <Route path="/app-inquiries" element={<RequireUser><UserPortalEntry section="inquiries" /></RequireUser>} />
                      <Route path="/app/*" element={<RequireUser><PwaRouteEntry /></RequireUser>} />
                      <Route path="/profile" element={<Navigate to="/organization-profile" replace />} />
                      <Route path="*" element={<NotFoundRoute />} />
                    </>
                  )}
              </Routes>
              </>
            </PolicyAgreementGate>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LydoConnectProvider>
  </QueryClientProvider>
);

export default App;
