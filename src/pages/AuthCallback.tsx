import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import {
  beginPwaAuthFlow,
  endPwaAuthFlow,
  isPwaAuthFlow,
  pwaAuthRoute,
} from "@/user/pwa/pwaAuthFlow";
import { fetchOrganizationProfileInSupabase } from "@/lib/lydo-connect-supabase";
import { isOrganizationProfileComplete } from "@/lib/organization-profile-domain";

const parseAuthError = (search?: string, hash?: string): string | null => {
  const searchSource = search || (typeof window !== "undefined" ? window.location.search : "");
  const hashSource = hash || (typeof window !== "undefined" ? window.location.hash : "");

  const searchParams = new URLSearchParams(searchSource);
  const hashString = hashSource.startsWith("#") ? hashSource.slice(1) : hashSource;
  const hashParams = new URLSearchParams(hashString);

  const error = searchParams.get("error") || hashParams.get("error");
  const errorDescription =
    searchParams.get("error_description") || hashParams.get("error_description");
  const errorCode = searchParams.get("error_code") || hashParams.get("error_code");

  if (!error && !errorDescription && !errorCode) return null;

  if (
    error === "access_denied" ||
    errorCode === "403" ||
    errorDescription?.toLowerCase().includes("access_denied") ||
    errorDescription?.toLowerCase().includes("cancelled") ||
    errorDescription?.toLowerCase().includes("canceled")
  ) {
    return "Sign in with Google was cancelled.";
  }

  return errorDescription || error || "Authentication could not be completed. Please try again.";
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isInitialized, isPasswordRecoverySession, role, user } = useAuth();
  const pwaFlow = isPwaAuthFlow(location.search);
  const [readyToFallback, setReadyToFallback] = useState(false);
  const authError = useMemo(() => parseAuthError(location.search, location.hash), [location.search, location.hash]);

  const hasAuthParams = useMemo(() => {
    const searchSource = location.search || (typeof window !== "undefined" ? window.location.search : "");
    const hashSource = location.hash || (typeof window !== "undefined" ? window.location.hash : "");
    const authParams = `${searchSource}&${hashSource}`;
    return /(?:access_token|refresh_token|code|error|error_code)=/.test(authParams);
  }, [location.search, location.hash]);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("pwa") === "1") beginPwaAuthFlow();
  }, [location.search]);

  useEffect(() => {
    if (authError) {
      navigate(pwaFlow ? pwaAuthRoute("/signin") : "/signin", {
        replace: true,
        state: { error: authError },
      });
    }
  }, [authError, navigate, pwaFlow]);

  useEffect(() => {
    if (!isInitialized || authError) return;
    if (isPasswordRecoverySession) {
      navigate("/reset-password", { replace: true });
      return;
    }
    if (isAuthenticated) {
      if (role === "admin") {
        navigate("/admin", { replace: true });
        return;
      }
      if (pwaFlow) {
        endPwaAuthFlow();
        navigate("/app", { replace: true });
        return;
      }

      let active = true;
      (async () => {
        try {
          if (!user?.id) {
            navigate("/google-onboarding", { replace: true });
            return;
          }
          const profile = await fetchOrganizationProfileInSupabase(user.id);
          if (!active) return;
          if (profile && isOrganizationProfileComplete(profile)) {
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/google-onboarding", { replace: true });
          }
        } catch {
          if (!active) return;
          navigate("/google-onboarding", { replace: true });
        }
      })();

      return () => {
        active = false;
      };
    }
    if (!hasAuthParams || readyToFallback) {
      navigate(pwaFlow ? pwaAuthRoute("/signin") : "/signin", {
        replace: true,
        state: readyToFallback
          ? { error: "Authentication session could not be established. Please try again." }
          : undefined,
      });
    }
  }, [authError, hasAuthParams, isAuthenticated, isInitialized, isPasswordRecoverySession, navigate, pwaFlow, readyToFallback, role, user]);

  useEffect(() => {
    if (!isInitialized || isAuthenticated || !hasAuthParams || authError) return;
    const timeout = window.setTimeout(() => {
      setReadyToFallback(true);
    }, 2500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [authError, hasAuthParams, isAuthenticated, isInitialized]);

  return (
    <div className="min-h-screen bg-background grid place-items-center px-4 text-center">
      <div>
        <h1 className="text-xl font-heading font-semibold text-foreground">Confirming your account...</h1>
        <p className="mt-2 text-sm text-muted-foreground">You will be redirected in a moment.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
