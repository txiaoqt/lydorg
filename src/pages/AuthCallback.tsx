import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import {
  beginPwaAuthFlow,
  endPwaAuthFlow,
  isPwaAuthFlow,
  pwaAuthRoute,
} from "@/user/pwa/pwaAuthFlow";

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isInitialized, role } = useAuth();
  const pwaFlow = isPwaAuthFlow(location.search);
  const [readyToFallback, setReadyToFallback] = useState(false);
  const hasAuthParams = useMemo(() => {
    if (typeof window === "undefined") return false;
    const authParams = `${window.location.search}&${window.location.hash}`;
    return /(?:access_token|refresh_token|code|error|error_code)=/.test(authParams);
  }, []);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("pwa") === "1") beginPwaAuthFlow();
  }, [location.search]);

  useEffect(() => {
    if (!isInitialized) return;
    if (isAuthenticated) {
      if (pwaFlow && role !== "admin") endPwaAuthFlow();
      navigate(role === "admin" ? "/admin" : pwaFlow ? "/app" : "/organization-profile", { replace: true });
      return;
    }
    if (!hasAuthParams || readyToFallback) {
      navigate(pwaFlow ? pwaAuthRoute("/signin") : "/signin", { replace: true });
    }
  }, [hasAuthParams, isAuthenticated, isInitialized, navigate, pwaFlow, readyToFallback, role]);

  useEffect(() => {
    if (!isInitialized || isAuthenticated || !hasAuthParams) return;
    const timeout = window.setTimeout(() => {
      setReadyToFallback(true);
    }, 2500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [hasAuthParams, isAuthenticated, isInitialized]);

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
