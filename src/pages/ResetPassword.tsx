import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BrandLogo from "@/components/BrandLogo";
import { getPasswordResetUrl } from "@/lib/auth-redirect";
import {
  clearPasswordRecoveryState,
  getStoredSupabaseToken,
  isPasswordRecoveryActive,
  markPasswordRecoveryActive,
  parsePasswordRecoveryUrl,
} from "@/lib/password-recovery";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { endPwaAuthFlow } from "@/user/pwa/pwaAuthFlow";
import { GENERIC_RESET_MESSAGE, isValidEmailFormat } from "@/lib/email-validation";

const RESEND_COOLDOWN_SECONDS = 60;

export type ResetMode = "request" | "verifying" | "update" | "invalid" | "updated";

export const validatePasswordCriteria = (value: string) => ({
  length: value.length >= 8 && value.length <= 16,
  uppercase: /[A-Z]/.test(value),
  lowercase: /[a-z]/.test(value),
  number: /[0-9]/.test(value),
  special: /[!@#$%^&*()\-_+=[\]{}|;:'",.<>?/\\~]/.test(value),
});

export const isPasswordValid = (value: string) => {
  const criteria = validatePasswordCriteria(value);
  return Object.values(criteria).every(Boolean);
};

export const computeInitialResetMode = (href?: string): ResetMode => {
  const currentHref = href ?? (typeof window === "undefined" ? "/reset-password" : window.location.href);
  const recovery = parsePasswordRecoveryUrl(currentHref);

  if (recovery.hasRecoveryError) return "invalid";
  if (recovery.code || recovery.tokenHash) return "verifying";
  if (recovery.accessToken && recovery.refreshToken) return "update";
  if (isPasswordRecoveryActive({ url: currentHref })) return "update";

  const storedToken = getStoredSupabaseToken();
  if (storedToken) return "update";

  return "request";
};

const PasswordCriteriaChecklist = ({ password }: { password: string }) => {
  const criteria = useMemo(() => validatePasswordCriteria(password), [password]);

  const items = [
    { key: "length", label: "8–16 characters", valid: criteria.length },
    { key: "uppercase", label: "Contains an uppercase letter (A–Z)", valid: criteria.uppercase },
    { key: "lowercase", label: "Contains a lowercase letter (a–z)", valid: criteria.lowercase },
    { key: "number", label: "Contains a number (0–9)", valid: criteria.number },
    { key: "special", label: "Contains a special character (!@#$%...)", valid: criteria.special },
  ];

  if (!password) return null;

  return (
    <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
      <p className="font-semibold text-muted-foreground">Password Requirements:</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2 transition-colors">
            {item.valid ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
            ) : (
              <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/40" />
            )}
            <span className={item.valid ? "font-medium text-foreground" : "text-muted-foreground"}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ResetPassword = () => {
  const { user, isAuthenticated, signOut, isPasswordRecoverySession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentHref = useMemo(() => {
    if (typeof window === "undefined") return "/reset-password";
    const origin = window.location.origin || "https://y-trace.local";
    return `${origin}${location.pathname}${location.search}${location.hash}`;
  }, [location.pathname, location.search, location.hash]);

  const recovery = useMemo(
    () => parsePasswordRecoveryUrl(currentHref),
    [currentHref],
  );

  const [mode, setMode] = useState<ResetMode>(() => computeInitialResetMode(currentHref));

  const [email, setEmail] = useState("");
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inlineError, setInlineError] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const isEmailValid = useMemo(() => isValidEmailFormat(email), [email]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    endPwaAuthFlow();
    if (!supabase) {
      if (recovery.hasRecoveryCredentials) {
        setInlineError("Password recovery is unavailable because Supabase is not configured.");
        setMode("invalid");
      }
      return;
    }

    let active = true;

    // Listen for auth events that signal recovery or active session availability
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (
        event === "PASSWORD_RECOVERY" ||
        (event === "SIGNED_IN" && session) ||
        (event === "INITIAL_SESSION" && session) ||
        (event === "TOKEN_REFRESHED" && session)
      ) {
        if (session) {
          window.history.replaceState({}, document.title, window.location.pathname);
          setInlineError("");
          setMode((current) => (current === "updated" ? "updated" : "update"));
        }
      }
    });

    const establishRecoverySession = async () => {
      if (recovery.errorMessage) {
        if (active) {
          setInlineError(recovery.errorMessage);
          setMode("invalid");
        }
        return;
      }

      let exchangeError: string | null = null;
      try {
        if (recovery.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(recovery.code);
          exchangeError = error?.message ?? null;
        } else if (recovery.tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: recovery.tokenHash,
            type: "recovery",
          });
          exchangeError = error?.message ?? null;
        } else if (recovery.accessToken && recovery.refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: recovery.accessToken,
            refresh_token: recovery.refreshToken,
          });
          exchangeError = error?.message ?? null;
        }
      } catch (err: unknown) {
        exchangeError = err instanceof Error ? err.message : "Failed to establish password recovery session.";
      }

      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        markPasswordRecoveryActive(data.session.user?.id);
        window.history.replaceState({}, document.title, window.location.pathname);
        setInlineError("");
        setMode("update");
        return;
      }

      setInlineError(exchangeError || "This password reset link is invalid or has expired.");
      setMode("invalid");
    };

    if (recovery.hasRecoveryError) {
      setMode("invalid");
      return;
    }

    if (recovery.code || recovery.tokenHash || (recovery.accessToken && recovery.refreshToken)) {
      void establishRecoverySession();
    } else {
      // Check existing authenticated session or recovery session
      void supabase.auth.getSession().then(({ data }) => {
        if (!active) return;
        if (data.session || isAuthenticated || isPasswordRecoverySession) {
          setMode((current) => (current === "updated" || current === "invalid" ? current : "update"));
        }
      });
    }

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [recovery, isAuthenticated, isPasswordRecoverySession]);

  const requestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setInlineError("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !isEmailValid) {
      setInlineError("Please enter a valid email address.");
      return;
    }
    if (!supabase) {
      setInlineError("Password recovery is unavailable because Supabase is not configured.");
      return;
    }
    if (resendCooldown > 0) return;

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getPasswordResetUrl(),
    });
    setIsLoading(false);

    if (error) {
      if (/rate limit|too many/i.test(error.message)) {
        setInlineError("Too many requests. Please wait a moment before trying again.");
      } else {
        // Show generic confirmation to prevent enumeration even on unexpected backend responses
        setRequestSent(true);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setShowSuccessModal(true);
      }
      return;
    }

    setRequestSent(true);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setShowSuccessModal(true);
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setInlineError("");

    const criteria = validatePasswordCriteria(password);
    if (!criteria.length) {
      setInlineError("Password must be between 8 and 16 characters long.");
      return;
    }
    if (!criteria.uppercase) {
      setInlineError("Password must contain at least one uppercase letter (A–Z).");
      return;
    }
    if (!criteria.lowercase) {
      setInlineError("Password must contain at least one lowercase letter (a–z).");
      return;
    }
    if (!criteria.number) {
      setInlineError("Password must contain at least one numeric digit (0–9).");
      return;
    }
    if (!criteria.special) {
      setInlineError("Password must contain at least one special character.");
      return;
    }
    if (password !== confirmPassword) {
      setInlineError("New password and confirmation do not match.");
      return;
    }
    if (!supabase) {
      setInlineError("Password recovery is unavailable because Supabase is not configured.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setIsLoading(false);
      setInlineError(error.message);
      return;
    }
    clearPasswordRecoveryState();
    window.history.replaceState({}, document.title, "/reset-password");
    await signOut();
    setIsLoading(false);
    setPassword("");
    setConfirmPassword("");
    setMode("updated");
  };

  const cancelRecovery = async (destination: string) => {
    clearPasswordRecoveryState();
    window.history.replaceState({}, document.title, destination);
    if (isPasswordRecoverySession) {
      await signOut();
    }
    navigate(destination, { replace: true });
  };

  const requestAnotherLink = () => {
    clearPasswordRecoveryState();
    window.history.replaceState({}, document.title, "/reset-password");
    setInlineError("");
    setEmail("");
    setTouchedEmail(false);
    setRequestSent(false);
    setShowSuccessModal(false);
    setResendCooldown(0);
    setMode("request");
  };

  const confirmMatchHint = useMemo(() => {
    if (!confirmPassword) return null;
    if (password === confirmPassword && isPasswordValid(password)) {
      return (
        <p className="flex items-center gap-1 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match.
        </p>
      );
    }
    if (password !== confirmPassword) {
      return <p className="text-xs text-destructive">Passwords do not match.</p>;
    }
    return null;
  }, [password, confirmPassword]);

  return (
    <div className="relative flex min-h-0 sm:min-h-screen flex-col items-center justify-start sm:justify-center overflow-hidden bg-background px-4 pt-5 pb-6 sm:py-12 text-foreground">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-140px] top-[-180px] h-[360px] w-[360px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-[-190px] right-[-150px] h-[400px] w-[400px] rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[390px] sm:max-w-md mx-auto space-y-4 sm:space-y-6">
        {/* Brand Logo — centered above card */}
        <div className="flex justify-center">
          <Link
            to="/"
            className="inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-transform hover:opacity-95 active:scale-[0.98]"
          >
            <BrandLogo showText={false} className="h-12 sm:h-14 w-auto" />
          </Link>
        </div>

        {/* Card */}
        <div className="space-y-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-6 sm:p-8 shadow-xs">
          {mode === "request" ? (
            <form onSubmit={requestReset} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <h1 className="text-2xl sm:text-[28px] font-heading font-bold text-foreground tracking-tight">
                  Forgot your password?
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enter the email address associated with your account, and we&apos;ll send you a secure reset link to reset your password.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground/90">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setInlineError("");
                  }}
                  onBlur={() => setTouchedEmail(true)}
                  placeholder="you@gmail.com"
                  autoComplete="email"
                  disabled={isLoading}
                  className="h-11 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-sm px-3.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all duration-150"
                  required
                />
                {touchedEmail && !email.trim() ? (
                  <p className="text-xs text-destructive">Email address is required.</p>
                ) : null}
                {touchedEmail && email && !isEmailValid ? (
                  <p className="text-xs text-destructive">Please enter a valid email address.</p>
                ) : null}
                {inlineError ? (
                  <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                    {inlineError}
                  </p>
                ) : null}
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isLoading || !isEmailValid || resendCooldown > 0}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend available in ${resendCooldown}s`
                  ) : requestSent ? (
                    "Resend password reset link"
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </div>
            </form>
          ) : null}

          {mode === "verifying" ? (
            <div className="space-y-4 py-4 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden="true" />
              <div className="space-y-1">
                <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">Verifying reset link</h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Please wait while we securely verify your password reset link.
                </p>
              </div>
            </div>
          ) : null}

          {mode === "update" ? (
            <form onSubmit={updatePassword} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <h1 className="text-2xl sm:text-[28px] font-heading font-bold text-foreground tracking-tight">
                  {isAuthenticated || user ? "Set your account password" : "Create a new password"}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isAuthenticated || user
                    ? "Establish a secure password for your account."
                    : "Choose a secure password you haven't used before."}
                </p>
              </div>
              <PasswordField
                id="new-password"
                label="New password"
                value={password}
                visible={showPassword}
                maxLength={16}
                onChange={(val) => {
                  setPassword(val);
                  setInlineError("");
                }}
                onToggle={() => setShowPassword((current) => !current)}
              />

              <PasswordCriteriaChecklist password={password} />

              <PasswordField
                id="confirm-new-password"
                label="Confirm new password"
                value={confirmPassword}
                visible={showConfirmPassword}
                maxLength={16}
                onChange={(val) => {
                  setConfirmPassword(val);
                  setInlineError("");
                }}
                onToggle={() => setShowConfirmPassword((current) => !current)}
                onPaste={(event) => {
                  event.preventDefault();
                  setInlineError("For security, please manually retype your confirmation password.");
                }}
                hint={confirmMatchHint}
              />

              <div className="pt-1">
                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isLoading || !isPasswordValid(password) || password !== confirmPassword}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </form>
          ) : null}

          {mode === "invalid" ? (
            <div className="space-y-4 py-2 text-center">
              <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">Reset link unavailable</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {inlineError || "Request a new password reset link and try again."}
              </p>
              <Button type="button" className="w-full h-11 rounded-xl font-bold text-sm" onClick={requestAnotherLink}>
                Request New Link
              </Button>
            </div>
          ) : null}

          {mode === "updated" ? (
            <div className="flex flex-col items-center space-y-4 py-2 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">Password updated</h1>
                <p className="text-sm text-muted-foreground">
                  Your new password is ready. Sign in again to continue.
                </p>
              </div>
              <Button className="w-full h-11 rounded-xl font-bold text-sm" onClick={() => cancelRecovery("/signin")}>
                Continue to Sign In
              </Button>
            </div>
          ) : null}

          {inlineError && mode !== "request" && mode !== "invalid" ? (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {inlineError}
            </p>
          ) : null}
        </div>

        {mode !== "updated" ? (
          <div className="space-y-2 text-center text-sm text-muted-foreground pt-1">
            <p className="text-sm">
              Remember your password?{" "}
              <button
                type="button"
                onClick={() => cancelRecovery("/signin")}
                className="font-semibold text-primary hover:text-primary/80 hover:underline transition-colors focus-visible:outline-none focus-visible:underline cursor-pointer"
              >
                Sign in
              </button>
            </p>
            <p>
              <button
                type="button"
                onClick={() => cancelRecovery("/")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-block pt-0.5 focus-visible:outline-none focus-visible:underline cursor-pointer"
              >
                ← Back to home
              </button>
            </p>
          </div>
        ) : null}

        {/* Success Dialog Modal */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent
            hideCloseButton={true}
            className="w-[calc(100vw-2rem)] max-w-[360px] sm:max-w-[400px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-6 sm:p-7 shadow-xl text-center space-y-4 sm:rounded-2xl"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>

            <DialogHeader className="space-y-2 text-center sm:text-center">
              <DialogTitle className="text-xl sm:text-2xl font-heading font-bold text-foreground tracking-tight text-center">
                Reset link requested
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed text-center px-1">
                {GENERIC_RESET_MESSAGE}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="pt-2 sm:justify-center">
              <Button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full h-11 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer"
              >
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

const PasswordField = ({
  id,
  label,
  value,
  visible,
  maxLength,
  onChange,
  onToggle,
  onPaste,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  maxLength?: number;
  onChange: (value: string) => void;
  onToggle: () => void;
  onPaste?: (event: React.ClipboardEvent<HTMLInputElement>) => void;
  hint?: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-sm font-semibold text-foreground/90">{label}</Label>
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onPaste={onPaste}
        maxLength={maxLength}
        className="h-11 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-sm px-3.5 pr-11 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all duration-150"
        autoComplete="new-password"
        required
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
    {hint}
  </div>
);

export default ResetPassword;
