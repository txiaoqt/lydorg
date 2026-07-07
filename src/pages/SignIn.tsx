import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandLogo from "@/components/BrandLogo";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { IS_ADMIN_SURFACE, IS_USER_SURFACE } from "@/lib/deployment-surface";
import { supabase } from "@/lib/supabase";
import {
  beginPwaAuthFlow,
  endPwaAuthFlow,
  isPwaAuthFlow,
  PWA_ENTRY_ROUTE,
  pwaAuthRoute,
} from "@/user/pwa/pwaAuthFlow";

type SignInProps = {
  forcedMode?: "user" | "admin";
};

const SignIn = ({ forcedMode }: SignInProps) => {
  const inferredMode = useMemo<"user" | "admin">(() => {
    if (forcedMode) return forcedMode;
    if (IS_ADMIN_SURFACE) return "admin";
    return "user";
  }, [forcedMode]);

  const [mode, setMode] = useState<"user" | "admin">(inferredMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inlineError, setInlineError] = useState("");

  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const pwaFlow = isPwaAuthFlow(location.search);
  const { signIn, isAuthenticated, isInitialized, role } = useAuth();
  const useSupabaseAuth = Boolean(supabase);
  const roleSelectionEnabled = !pwaFlow && !forcedMode && !IS_ADMIN_SURFACE && !IS_USER_SURFACE;

  const isAdminMode = mode === "admin";

  useEffect(() => {
    setMode(inferredMode);
  }, [inferredMode]);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("pwa") === "1") beginPwaAuthFlow();
  }, [location.search]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;
    if (role === "admin") {
      navigate("/admin", { replace: true });
      return;
    }
    if (pwaFlow) endPwaAuthFlow();
    navigate(pwaFlow ? "/app" : "/dashboard", { replace: true });
  }, [isAuthenticated, isInitialized, navigate, pwaFlow, role]);

  const canSubmit = isAdminMode
    ? Boolean(username.trim() && password) && !isLoading
    : Boolean(useSupabaseAuth && isInitialized && email.trim() && password) && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError("");
    setIsLoading(true);

    const result = isAdminMode
      ? await signIn({ mode: "admin", username, password })
      : await signIn({ mode: "user", email, password });

    setIsLoading(false);

    if (result.error) {
      setInlineError(result.error);
      return;
    }

    const signInToast = toast({
      title: "Signed In",
      description: isAdminMode ? "Welcome, administrator." : "Welcome back.",
    });
    window.setTimeout(() => signInToast.dismiss(), 1000);
    setUsername("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    if (pwaFlow && !isAdminMode) endPwaAuthFlow();
    navigate(isAdminMode ? "/admin" : pwaFlow ? "/app" : "/dashboard", { replace: true });
  };

  return (
    <div className={`${pwaFlow ? "ytrace-pwa-app pwa-public-auth-page" : ""} min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-8 relative overflow-hidden`}>
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-180px] left-[-140px] h-[360px] w-[360px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-[-190px] right-[-150px] h-[400px] w-[400px] rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="mb-7 text-left">
          <Link to={pwaFlow ? PWA_ENTRY_ROUTE : "/"} className="inline-flex items-center gap-3 max-w-full">
            <BrandLogo
              imgClassName="h-10 w-10"
              showText
              subtitle={isAdminMode ? "Admin Portal" : "Youth Portal"}
            />
          </Link>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5 card-shadow"
        >
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              {isAdminMode ? "Admin sign in" : "Sign in"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdminMode
                ? "Sign in with your LYDO/PCYDO admin credentials."
                : "Access your organization's compliance portal."}
            </p>
          </div>

          {/* Role toggle — only on combined surface */}
          {roleSelectionEnabled && (
            <div className="space-y-1.5">
              <Label>Access type</Label>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-muted/50 p-1">
                <button
                  type="button"
                  onClick={() => { setMode("user"); setInlineError(""); }}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
                    !isAdminMode
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Organization
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("admin"); setInlineError(""); }}
                  className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
                    isAdminMode
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>
          )}

          {!useSupabaseAuth && !isAdminMode && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning">
              Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.
            </div>
          )}

          {/* Email / Username */}
          {isAdminMode ? (
            <div className="space-y-1.5">
              <Label htmlFor="username">Admin Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter admin username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setInlineError(""); }}
                autoComplete="username"
                required
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setInlineError(""); }}
                autoComplete="email"
                required
              />
            </div>
          )}

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {!isAdminMode && (
                <Link
                  to={pwaFlow ? pwaAuthRoute("/reset-password") : "/reset-password"}
                  tabIndex={-1}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setInlineError(""); }}
                className="pr-10"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="space-y-2.5 pt-1">
            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={!canSubmit}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            {/* Inline error */}
            {inlineError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive">
                {inlineError}
              </p>
            )}
          </div>
        </form>

        {/* Below-card links */}
        <div className="mt-5 space-y-2.5 text-center text-sm text-muted-foreground">
          {!isAdminMode && (
            <p>
              Don't have an account?{" "}
              <Link to={pwaFlow ? pwaAuthRoute("/signup") : "/signup"} className="font-medium text-primary hover:text-primary/80 transition-colors">
                Create one
              </Link>
            </p>
          )}
          <p>
            <Link to={pwaFlow ? PWA_ENTRY_ROUTE : "/"} className="hover:text-foreground transition-colors">
              ← Back to {pwaFlow ? "welcome" : "home"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
