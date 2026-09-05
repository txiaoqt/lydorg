import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandLogo from "@/components/BrandLogo";
import AuthImageSlideshow from "@/components/auth/AuthImageSlideshow";
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
import { readPwaPreferences } from "@/user/pwa/hooks/usePwaPreferences";
import { getPwaThemeStyle } from "@/user/pwa/pwaAccentThemes";
import { getPasswordResetUrl } from "@/lib/auth-redirect";

type SignInProps = {
  forcedMode?: "user" | "admin";
};

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

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
  const pwaTheme = readPwaPreferences().accentTheme;
  const { signIn, isAuthenticated, isInitialized, isPasswordRecoverySession, role } = useAuth();
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
    if (isPasswordRecoverySession) {
      navigate("/reset-password", { replace: true });
      return;
    }
    if (role === "admin") {
      navigate("/admin", { replace: true });
      return;
    }
    if (pwaFlow) endPwaAuthFlow();
    navigate(pwaFlow ? "/app" : "/dashboard", { replace: true });
  }, [isAuthenticated, isInitialized, isPasswordRecoverySession, navigate, pwaFlow, role]);

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
      if (/email not confirmed|unconfirmed/i.test(result.error)) {
        setInlineError(
          "Your email address is not verified yet. Please complete verification before signing in.",
        );
      } else {
        setInlineError(result.error);
      }
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

  /* ─────────────────────────────────────────────────────────────────────────────
     ADMIN SIGN IN (EXACT EXISTING UI & STYLING 100% PRESERVED)
     ───────────────────────────────────────────────────────────────────────────── */
  if (isAdminMode) {
    return (
      <div
        className={`${pwaFlow ? "ytrace-pwa-app pwa-public-auth-page" : ""} min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-8 relative overflow-hidden`}
        data-pwa-theme={pwaFlow ? pwaTheme : undefined}
        style={pwaFlow ? getPwaThemeStyle(pwaTheme) : undefined}
      >
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-180px] left-[-140px] h-[360px] w-[360px] rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute bottom-[-190px] right-[-150px] h-[400px] w-[400px] rounded-full bg-primary/15 blur-3xl" />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="mb-7 text-left">
            <Link to={pwaFlow ? PWA_ENTRY_ROUTE : "/"} className="inline-flex items-center gap-3 max-w-full">
              <BrandLogo showText={false} />
            </Link>
          </div>

          {/* Card */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5 card-shadow"
          >
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Admin sign in
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Sign in to access the Y-TRACE administration portal and manage youth organization records.
              </p>
            </div>

            {/* Role toggle — only on combined surface */}
            {roleSelectionEnabled && (
              <div className="space-y-1.5">
                <Label>Access type</Label>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-muted/50 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("user");
                      setInlineError("");
                    }}
                    className="rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150 text-muted-foreground hover:text-foreground"
                  >
                    Organization
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("admin");
                      setInlineError("");
                    }}
                    className="rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150 bg-primary text-primary-foreground shadow-sm"
                  >
                    Admin
                  </button>
                </div>
              </div>
            )}

            {/* Admin Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username">Admin Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter admin username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setInlineError("");
                }}
                autoComplete="username"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setInlineError("");
                  }}
                  className="pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                <div className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive space-y-1">
                  <p>{inlineError}</p>
                </div>
              )}
            </div>
          </form>

          {/* Below-card links */}
          <div className="mt-5 space-y-2.5 text-center text-sm text-muted-foreground">
            <p>
              <Link to={pwaFlow ? PWA_ENTRY_ROUTE : "/"} className="hover:text-foreground transition-colors">
                ← Back to {pwaFlow ? "welcome" : "home"}
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────────────
     ORGANIZATION / USER SIGN IN (DESKTOP: SLIDESHOW LEFT, FORM RIGHT)
     ───────────────────────────────────────────────────────────────────────────── */
  return (
    <div
      className={`${pwaFlow ? "ytrace-pwa-app pwa-public-auth-page" : ""} min-h-screen w-full bg-background text-foreground flex flex-col md:flex-row md:h-[100dvh] md:max-h-[100dvh] md:overflow-hidden overflow-x-hidden`}
      data-pwa-theme={pwaFlow ? pwaTheme : undefined}
      style={pwaFlow ? getPwaThemeStyle(pwaTheme) : undefined}
    >
      {/* SIBLING 1: Left Column — Full-Bleed Slideshow Region (Hidden on mobile <768px; Visible on desktop/tablet >=768px) */}
      <section
        aria-label="Photo gallery showcase"
        className="hidden md:block relative md:w-[55%] lg:w-[60%] xl:w-[62%] 2xl:w-[65%] md:h-full md:min-h-0 md:max-h-none overflow-hidden md:border-r border-border/40 shrink-0"
      >
        <AuthImageSlideshow className="w-full h-full" />
      </section>

      {/* SIBLING 2: Right Column — Standalone Login Region (Full-width & min-h-screen on mobile; Desktop 35–40%, Tablet 45%) */}
      <section
        aria-label="Sign in form"
        className="w-full md:w-[45%] lg:w-[40%] xl:w-[38%] 2xl:w-[35%] min-h-screen md:min-h-0 md:h-full bg-card flex items-center justify-center px-4 sm:px-6 md:px-8 lg:px-10 py-8 md:py-10 z-10 md:overflow-y-auto"
      >
        <div className="w-full max-w-[350px] lg:max-w-[390px] mx-auto flex flex-col justify-center space-y-6 sm:space-y-7 py-4">
          {/* Logo — showText={false} ensures single authentic brand lockup */}
          <div className="flex justify-center">
            <Link
              to={pwaFlow ? PWA_ENTRY_ROUTE : "/"}
              className="inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <BrandLogo showText={false} className="h-12 sm:h-14 w-auto" />
            </Link>
          </div>

          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Sign in to access your organization’s Y-TRACE compliance portal.
            </p>
          </div>

          {/* Role toggle — only on combined surface */}
          {roleSelectionEnabled && (
            <div className="space-y-1.5">
              <Label>Access type</Label>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-muted/50 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("user");
                    setInlineError("");
                  }}
                  className="rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-150 bg-primary text-primary-foreground shadow-sm"
                >
                  Organization
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("admin");
                    setInlineError("");
                  }}
                  className="rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-150 text-muted-foreground hover:text-foreground"
                >
                  Admin
                </button>
              </div>
            </div>
          )}

          {!useSupabaseAuth && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning">
              Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.
            </div>
          )}

          {/* Organization Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setInlineError("");
                }}
                autoComplete="email"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to={getPasswordResetUrl()}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setInlineError("");
                  }}
                  className="pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="space-y-2 pt-1">
              <Button
                type="submit"
                className="w-full font-semibold h-10"
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
                <div className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive space-y-1">
                  <p>{inlineError}</p>
                  {inlineError.toLowerCase().includes("not verified yet") && (
                    <p>
                      <Link
                        to={pwaFlow ? pwaAuthRoute("/verify-email") : "/verify-email"}
                        state={{ email: email.trim().toLowerCase() }}
                        className="font-medium underline hover:text-destructive/80"
                      >
                        Enter verification code →
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </div>
          </form>

          {/* Google Sign-In (UI Only — Organization/User mode only) */}
          <div className="space-y-3 pt-1">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or continue with</span>
              </div>
            </div>

            <button
              type="button"
              disabled
              aria-disabled="true"
              onClick={(e) => e.preventDefault()}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-border bg-muted/30 text-muted-foreground cursor-not-allowed text-sm font-medium transition-colors select-none"
            >
              <div className="flex items-center gap-2.5">
                <GoogleIcon className="h-4 w-4 shrink-0" />
                <span>Continue with Google</span>
              </div>
              <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                Coming soon
              </span>
            </button>
          </div>

          {/* Footer Navigation Links */}
          <div className="space-y-2 text-center text-sm text-muted-foreground pt-4 border-t border-border/40">
            <p>
              Don't have an account?{" "}
              <Link
                to={pwaFlow ? pwaAuthRoute("/signup") : "/signup"}
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Create one
              </Link>
            </p>
            <p>
              <Link
                to={pwaFlow ? PWA_ENTRY_ROUTE : "/"}
                className="hover:text-foreground transition-colors inline-block"
              >
                ← Back to {pwaFlow ? "welcome" : "home"}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SignIn;
