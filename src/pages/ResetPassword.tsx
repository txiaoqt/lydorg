import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandLogo from "@/components/BrandLogo";
import { getPasswordResetUrl } from "@/lib/auth-redirect";
import {
  clearPasswordRecoveryState,
  parsePasswordRecoveryUrl,
} from "@/lib/password-recovery";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { endPwaAuthFlow } from "@/user/pwa/pwaAuthFlow";
import { GENERIC_RESET_MESSAGE, isValidEmailFormat } from "@/lib/email-validation";

const RESEND_COOLDOWN_SECONDS = 60;

type ResetMode = "request" | "verifying" | "update" | "invalid" | "updated";

const validatePasswordCriteria = (value: string) => ({
  length: value.length >= 8 && value.length <= 16,
  uppercase: /[A-Z]/.test(value),
  lowercase: /[a-z]/.test(value),
  number: /[0-9]/.test(value),
  special: /[!@#$%^&*()\-_+=\[\]{}|;:'",.<>?/\\~]/.test(value),
});

const isPasswordValid = (value: string) => {
  const criteria = validatePasswordCriteria(value);
  return Object.values(criteria).every(Boolean);
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
  const { signOut, isPasswordRecoverySession } = useAuth();
  const navigate = useNavigate();

  const cancelRecovery = async (destination: string) => {
    clearPasswordRecoveryState();
    window.history.replaceState({}, document.title, destination);
    await signOut();
    navigate(destination, { replace: true });
  };

  const recovery = useMemo(
    () => parsePasswordRecoveryUrl(typeof window === "undefined" ? "/reset-password" : window.location.href),
    [],
  );

  const [mode, setMode] = useState<ResetMode>(() =>
    recovery.hasRecoveryError ? "invalid" : recovery.hasRecoveryCredentials ? "verifying" : "request",
  );

  const [email, setEmail] = useState("");
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inlineError, setInlineError] = useState("");
  const [requestSent, setRequestSent] = useState(false);
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
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const isRecoveryEvent = event === "PASSWORD_RECOVERY";
      const isRecoverySignIn = recovery.hasRecoveryCredentials && event === "SIGNED_IN";
      if (!active || !session || (!isRecoveryEvent && !isRecoverySignIn)) return;
      window.history.replaceState({}, document.title, window.location.pathname);
      setInlineError("");
      setMode((current) => (current === "updated" ? "updated" : "update"));
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

      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
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

    if (recovery.hasRecoveryCredentials) {
      void establishRecoverySession();
    } else if (isPasswordRecoverySession) {
      void supabase.auth.getSession().then(({ data }) => {
        if (active && data.session) {
          setMode("update");
        }
      });
    }
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [recovery, isPasswordRecoverySession]);

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
      }
      return;
    }

    setRequestSent(true);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
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

  const requestAnotherLink = () => {
    clearPasswordRecoveryState();
    window.history.replaceState({}, document.title, "/reset-password");
    setInlineError("");
    setEmail("");
    setTouchedEmail(false);
    setRequestSent(false);
    setResendCooldown(0);
    setMode("request");
  };

  const confirmMatchHint = useMemo(() => {
    if (!confirmPassword) return null;
    if (password === confirmPassword && isPasswordValid(password)) {
      return (
        <p className="flex items-center gap-1 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
        </p>
      );
    }
    if (password !== confirmPassword) {
      return <p className="text-xs text-destructive">Passwords do not match</p>;
    }
    return null;
  }, [password, confirmPassword]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8 text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-140px] top-[-180px] h-[360px] w-[360px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-[-190px] right-[-150px] h-[400px] w-[400px] rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-7 text-left">
          <Link to="/" className="inline-flex max-w-full items-center gap-3">
            <BrandLogo showText={false} />
          </Link>
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-6 card-shadow sm:p-8">
          {mode === "request" ? (
            <form onSubmit={requestReset} className="space-y-5">
              <div>
                <h1 className="text-2xl font-heading font-bold">Forgot your password?</h1>
                <p className="mt-1 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a secure reset link.</p>
              </div>

              {requestSent && (
                <div role="status" className="rounded-lg border border-primary/30 bg-primary/10 p-3.5 text-sm text-foreground space-y-1">
                  <p className="font-medium text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Reset link requested
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {GENERIC_RESET_MESSAGE}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
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
                  required
                />
                {touchedEmail && !email.trim() ? (
                  <p className="text-xs text-destructive">Email address is required.</p>
                ) : null}
                {touchedEmail && email && !isEmailValid ? (
                  <p className="text-xs text-destructive">Please enter a valid email address.</p>
                ) : null}
                {inlineError ? (
                  <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {inlineError}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                className="w-full font-semibold"
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
            </form>
          ) : null}

          {mode === "verifying" ? (
            <div className="space-y-4 py-2 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden="true" />
              <div>
                <h1 className="text-2xl font-heading font-bold">Verifying reset link</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Please wait while we securely verify your password reset link.
                </p>
              </div>
            </div>
          ) : null}

          {mode === "update" ? (
            <form onSubmit={updatePassword} className="space-y-5">
              <div>
                <h1 className="text-2xl font-heading font-bold">Create a new password</h1>
                <p className="mt-1 text-sm text-muted-foreground">Choose a secure password you haven&apos;t used before.</p>
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

              <Button type="submit" className="w-full font-semibold" disabled={isLoading || !isPasswordValid(password) || password !== confirmPassword}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : "Update Password"}
              </Button>
            </form>
          ) : null}

          {mode === "invalid" ? (
            <div className="space-y-4 py-2 text-center">
              <h1 className="text-2xl font-heading font-bold">Reset link unavailable</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">Request a new password reset link and try again.</p>
              <Button type="button" className="w-full" onClick={requestAnotherLink}>Request New Link</Button>
            </div>
          ) : null}

          {mode === "updated" ? (
            <div className="flex flex-col items-center space-y-4 py-2 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-heading font-bold">Password updated</h1>
                <p className="mt-2 text-sm text-muted-foreground">Your new password is ready. Sign in again to continue.</p>
              </div>
              <Button className="w-full font-semibold" onClick={() => cancelRecovery("/signin")}>Continue to Sign In</Button>
            </div>
          ) : null}

          {inlineError && mode !== "request" && mode !== "invalid" ? (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {inlineError}
            </p>
          ) : null}
        </div>

        {mode !== "updated" ? (
          <div className="mt-5 space-y-2.5 text-center text-sm text-muted-foreground">
            <p>Remember your password? <button type="button" onClick={() => cancelRecovery("/signin")} className="font-medium text-primary hover:text-primary/80">Sign in</button></p>
            <p><button type="button" onClick={() => cancelRecovery("/")} className="hover:text-foreground">← Back to home</button></p>
          </div>
        ) : null}
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
    <Label htmlFor={id}>{label}</Label>
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onPaste={onPaste}
        maxLength={maxLength}
        className="pr-11"
        autoComplete="new-password"
        required
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-md bg-transparent hover:bg-transparent active:bg-transparent focus:bg-transparent text-muted-foreground transition-colors hover:text-foreground active:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
    {hint}
  </div>
);

export default ResetPassword;
