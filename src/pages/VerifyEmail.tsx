import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, Loader2, MailCheck } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
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
import { getVerificationErrorMessage } from "@/lib/verification-error";

const PENDING_SIGNUP_EMAIL_KEY = "ytrace-pending-signup-email";
const RESEND_COOLDOWN_SECONDS = 60;
const OTP_LENGTH = 6;

type VerifyEmailLocationState = {
  email?: string;
  password?: string;
};

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isInitialized, isPasswordRecoverySession } = useAuth();
  const pwaFlow = isPwaAuthFlow(location.search);
  const pwaTheme = readPwaPreferences().accentTheme;
  const email = useMemo(() => {
    const searchEmail = new URLSearchParams(location.search).get("email");
    const stateEmail = (location.state as VerifyEmailLocationState | null)?.email;
    const storedEmail =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY)
        : null;
    return (searchEmail || stateEmail || storedEmail || "").trim().toLowerCase();
  }, [location.search, location.state]);

  const isReloaded = useMemo(() => {
    if (typeof window === "undefined") return false;
    const navEntries = window.performance?.getEntriesByType?.("navigation") as
      | PerformanceNavigationTiming[]
      | undefined;
    if (navEntries && navEntries.length > 0) {
      return navEntries[0].type === "reload";
    }
    return (
      (window.performance as unknown as { navigation?: { type?: number } })?.navigation
        ?.type === 1
    );
  }, []);

  const [code, setCode] = useState("");
  const [password, setPassword] = useState(() => {
    if (isReloaded) return "";
    return (location.state as VerifyEmailLocationState | null)?.password || "";
  });
  const showPasswordField = isReloaded || !((location.state as VerifyEmailLocationState | null)?.password);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("pwa") === "1") beginPwaAuthFlow();
  }, [location.search]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;
    if (isPasswordRecoverySession) {
      navigate("/reset-password", { replace: true });
      return;
    }
    const hasPendingSignup =
      typeof window !== "undefined" &&
      Boolean(window.sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY));
    if (!isVerified && password && hasPendingSignup) return;
    window.sessionStorage.removeItem(PENDING_SIGNUP_EMAIL_KEY);
    if (pwaFlow) endPwaAuthFlow();
    navigate(pwaFlow ? "/app" : "/dashboard", { replace: true });
  }, [isAuthenticated, isInitialized, isPasswordRecoverySession, isVerified, navigate, password, pwaFlow]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!supabase) {
      setError("Email verification is unavailable because Supabase is not configured.");
      return;
    }
    if (!email) {
      setError("Your signup email could not be found. Please create your account again.");
      return;
    }
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) {
      setError("Enter the complete six-digit verification code.");
      return;
    }
    if (password.length < 8) {
      setError("Enter a password with at least eight characters.");
      return;
    }

    setIsVerifying(true);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setIsVerifying(false);

    if (verifyError) {
      setError(getVerificationErrorMessage(verifyError));
      return;
    }
    if (!data.session) {
      setError("Your email was verified, but sign-in could not be completed. Please sign in manually.");
      return;
    }

    const { error: passwordError } = await supabase.auth.updateUser({ password });
    if (passwordError) {
      setError(`Your email was verified, but your password could not be saved: ${passwordError.message}`);
      return;
    }

    window.sessionStorage.removeItem(PENDING_SIGNUP_EMAIL_KEY);
    setIsVerified(true);
  };

  const resendCode = async () => {
    setError("");
    if (!supabase || !email || resendCooldown > 0) return;

    setIsResending(true);
    const { error: resendError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setIsResending(false);

    if (resendError) {
      setError(resendError.message);
      return;
    }
    setCode("");
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  };

  return (
    <div
      className={`${pwaFlow ? "ytrace-pwa-app pwa-public-auth-page" : ""} relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8 text-foreground`}
      data-pwa-theme={pwaFlow ? pwaTheme : undefined}
      style={pwaFlow ? getPwaThemeStyle(pwaTheme) : undefined}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-140px] top-[-180px] h-[360px] w-[360px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-[-190px] right-[-150px] h-[400px] w-[400px] rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-7 text-left">
          <Link to={pwaFlow ? PWA_ENTRY_ROUTE : "/"} className="inline-flex max-w-full items-center gap-3">
            <BrandLogo showText={false} />
          </Link>
        </div>

        <div className="space-y-6 rounded-2xl border border-border bg-card p-6 card-shadow sm:p-8">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Create organization account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Register your youth organization to start the compliance process.
            </p>
          </div>

          <ol className="grid grid-cols-3" aria-label="Registration progress">
            {(["Organization", "Account", "Verification"] as const).map((label, index) => {
              const step = index + 1;
              const isComplete = step < 3;
              const isActive = step === 3;
              return (
                <li key={label} className="relative flex flex-col items-center gap-2 text-center">
                  {index > 0 ? (
                    <span className="absolute right-1/2 top-3.5 h-px w-full bg-primary" aria-hidden="true" />
                  ) : null}
                  <span
                    className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                      isActive || isComplete
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                    aria-current={isActive ? "step" : undefined}
                  >
                    {isComplete ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : step}
                  </span>
                  <span className={`text-[11px] font-medium sm:text-xs ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="space-y-3 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold">Verify your email</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Enter the six-digit code sent to{" "}
                <span className="font-medium text-foreground">{email || "your email address"}</span>.
              </p>
            </div>
          </div>

          <form onSubmit={verifyCode} className="space-y-5">
            <div className="flex justify-center">
              <InputOTP
                maxLength={OTP_LENGTH}
                value={code}
                onChange={(value) => {
                  setCode(value.replace(/\D/g, ""));
                  setError("");
                }}
                inputMode="numeric"
                autoFocus
                disabled={isVerifying || !email}
                aria-label="Six-digit email verification code"
              >
                <InputOTPGroup>
                  {Array.from({ length: OTP_LENGTH }, (_, index) => (
                    <InputOTPSlot key={index} index={index} className="h-11 w-9 text-base sm:h-12 sm:w-11 sm:text-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {showPasswordField ? (
              <div className="space-y-1.5">
                <Label htmlFor="verification-password">Account password</Label>
                <Input
                  id="verification-password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Enter your account password"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Re-enter the password if this page was refreshed.
                </p>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full font-semibold" disabled={isVerifying || isVerified || code.length !== OTP_LENGTH || password.length < 8 || !email}>
              {isVerifying || isVerified ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isVerified ? "Signing you in..." : "Verifying..."}
                </>
              ) : (
                "Verify and Continue"
              )}
            </Button>
          </form>

          <div className="space-y-2 text-center text-sm text-muted-foreground">
            <p>Didn&apos;t receive the code?</p>
            <Button
              type="button"
              variant="ghost"
              className="h-auto px-2 py-1 font-medium text-primary"
              onClick={resendCode}
              disabled={isResending || resendCooldown > 0 || !email}
            >
              {isResending
                ? "Sending..."
                : resendCooldown > 0
                  ? `Send again in ${resendCooldown}s`
                  : "Send a new code"}
            </Button>
          </div>
        </div>

        <div className="mt-5 text-center text-sm text-muted-foreground">
          <Link to={pwaFlow ? pwaAuthRoute("/signup") : "/signup"} className="hover:text-foreground">
            ← Use a different email
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
