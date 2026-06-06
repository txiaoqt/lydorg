import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isInitialized, role } = useAuth();
  const [readyToFallback, setReadyToFallback] = useState(false);
  const hasAuthParams = useMemo(() => {
    if (typeof window === "undefined") return false;
    const authParams = `${window.location.search}&${window.location.hash}`;
    return /(?:access_token|refresh_token|code|error|error_code)=/.test(authParams);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    if (isAuthenticated) {
      navigate(role === "admin" ? "/admin" : "/organization-profile", { replace: true });
      return;
    }
    if (!hasAuthParams || readyToFallback) {
      navigate("/signin", { replace: true });
    }
  }, [hasAuthParams, isAuthenticated, isInitialized, navigate, readyToFallback, role]);

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
