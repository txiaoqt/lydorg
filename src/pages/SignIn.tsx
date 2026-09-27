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
import { IS_ADMIN_SURFACE, IS_COMBINED_SURFACE, IS_USER_SURFACE } from "@/lib/deployment-surface";
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
import { getAuthCallbackUrl, getPasswordResetUrl } from "@/lib/auth-redirect";
import { getEffectiveSystemSetting } from "@/lib/admin-system-settings";
import { cn } from "@/lib/utils";
import { AdminDesktopGate } from "@/components/portal/AdminDesktopGate";
import GoogleIcon from "@/components/GoogleIcon";

type SignInProps = {
  forcedMode?: "user" | "admin";
};

const SignIn = ({ forcedMode }: SignInProps) => {
  const location = useLocation();
  const locationState = location.state as {
    error?: string;
    prefilledUsername?: string;
    prefilledMode?: "user" | "admin";
  } | null;

  const inferredMode = useMemo<"user" | "admin">(() => {
    if (forcedMode) return forcedMode;
    if (locationState?.prefilledMode) return locationState.prefilledMode;
    if (IS_ADMIN_SURFACE) return "admin";
    return "user";
  }, [forcedMode, locationState?.prefilledMode]);

  const [mode, setMode] = useState<"user" | "admin">(inferredMode);
  const [username, setUsername] = useState(() => locationState?.prefilledUsername || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [inlineError, setInlineError] = useState("");

  const { toast } = useToast();
  const navigate = useNavigate();
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
    const stateObj = location.state as {
      error?: string;
      prefilledUsername?: string;
      prefilledMode?: "user" | "admin";
    } | null;
    const errorFromState = stateObj?.error;
    const searchParams = new URLSearchParams(location.search);
    const errorFromSearch = searchParams.get("error_description") || searchParams.get("error");
    if (errorFromState) {
      setInlineError(errorFromState);
    } else if (errorFromSearch) {
      setInlineError(errorFromSearch);
    }
    if (stateObj?.prefilledUsername) {
      setUsername(stateObj.prefilledUsername);
    }
    if (stateObj?.prefilledMode) {
      setMode(stateObj.prefilledMode);
    }
  }, [location.state, location.search]);

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
    ? Boolean(username.trim() && password) && !isLoading && !isGoogleLoading
    : Boolean(useSupabaseAuth && isInitialized && email.trim() && password) && !isLoading && !isGoogleLoading;

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading || isLoading) return;
    if (!supabase) {
      setInlineError("Authentication service is currently unavailable.");
      return;
    }
    setInlineError("");
    setIsGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthCallbackUrl({ pwaFlow: false }),
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        setIsGoogleLoading(false);
        setInlineError(error.message || "Failed to initiate Google sign in.");
      }
    } catch (err) {
      setIsGoogleLoading(false);
      const message = err instanceof Error ? err.message : "Failed to initiate Google sign in.";
      setInlineError(message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGoogleLoading) return;
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
      <AdminDesktopGate
        onSwitchToUser={
          roleSelectionEnabled
            ? () => {
              setMode("user");
              setInlineError("");
            }
            : undefined
        }
      >
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
                  Sign in to access the {getEffectiveSystemSetting("general.system_name") || "Y-TRACE"} administration portal and manage youth organization records.
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

              {/* Admin Username / Email */}
              <div className="space-y-1.5">
                <Label htmlFor="username">Admin Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
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

            {/* Below-card links — only rendered on combined deployment surface */}
            {IS_COMBINED_SURFACE && (
              <div className="mt-5 space-y-2.5 text-center text-sm text-muted-foreground">
                <p>
                  <Link to={pwaFlow ? PWA_ENTRY_ROUTE : "/"} className="hover:text-foreground transition-colors">
                    ← Back to {pwaFlow ? "welcome" : "home"}
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </AdminDesktopGate>
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
        className="w-full md:w-[45%] lg:w-[40%] xl:w-[38%] 2xl:w-[35%] min-h-screen md:min-h-0 md:h-full bg-card flex items-center justify-center px-4 sm:px-6 md:px-8 lg:px-10 py-6 sm:py-8 md:py-10 z-10 md:overflow-y-auto"
      >
        <div className="w-full max-w-[360px] sm:max-w-[380px] lg:max-w-[400px] mx-auto flex flex-col justify-center space-y-5 sm:space-y-6 py-2 sm:py-4">
          {/* Logo — showText={false} ensures single authentic brand lockup */}
          <div className="flex justify-center mb-1">
            <Link
              to={pwaFlow ? PWA_ENTRY_ROUTE : "/"}
              className="inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-transform hover:opacity-95 active:scale-[0.98]"
            >
              <BrandLogo showText={false} className="h-12 sm:h-14 w-auto" />
            </Link>
          </div>

          {/* Header */}
          <div className="space-y-1 text-left">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sign in to access your organization’s Y-TRACE compliance portal.
            </p>
          </div>

          {/* Role toggle — only on combined surface */}
          {roleSelectionEnabled && (
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground/90">Access type</Label>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-muted/50 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("user");
                    setInlineError("");
                  }}
                  className="rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-150 bg-primary text-primary-foreground shadow-sm active:scale-[0.98]"
                >
                  Organization
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("admin");
                    setInlineError("");
                  }}
                  className="rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-150 text-muted-foreground hover:text-foreground active:scale-[0.98]"
                >
                  Admin
                </button>
              </div>
            </div>
          )}

          {!useSupabaseAuth && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-sm text-warning">
              Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.
            </div>
          )}

          {/* Organization Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold text-foreground/90">Email Address</Label>
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
                className="h-11 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-sm px-3.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all duration-150"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground/90">Password</Label>
                <Link
                  to={getPasswordResetUrl()}
                  className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline"
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
                  className="h-11 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-sm px-3.5 pr-11 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all duration-150"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                className="w-full h-11 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
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
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive space-y-1">
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
          <div className="space-y-3.5 pt-1">
            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[11px] font-semibold uppercase tracking-wider">
                <span className="bg-card px-3 text-muted-foreground">or continue with</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isGoogleLoading || isLoading || !useSupabaseAuth}
              onClick={handleGoogleSignIn}
              className="w-full h-11 flex items-center justify-center gap-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card text-foreground hover:bg-slate-50 dark:hover:bg-slate-900/60 active:scale-[0.98] transition-all duration-150 text-sm font-semibold shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin text-muted-foreground" />
                  <span>Connecting to Google…</span>
                </>
              ) : (
                <>
                  <div className="w-[18px] h-[18px] flex items-center justify-center shrink-0">
                    <GoogleIcon className="h-[18px] w-[18px] shrink-0" />
                  </div>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>

          {/* Footer Navigation Links */}
          <div className="space-y-2 text-center text-sm text-muted-foreground pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <p className="text-sm">
              Don't have an account?{" "}
              <Link
                to={pwaFlow ? pwaAuthRoute("/signup") : "/signup"}
                className="font-semibold text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                Create one
              </Link>
            </p>
            <p>
              <Link
                to={pwaFlow ? PWA_ENTRY_ROUTE : "/"}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-block pt-0.5"
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
