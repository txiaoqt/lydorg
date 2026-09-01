import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandLogo from "@/components/BrandLogo";
import { ADMIN_SIGNIN_PATH } from "@/lib/deployment-surface";
import { clearPasswordRecoveryState, parsePasswordRecoveryUrl } from "@/lib/password-recovery";
import { supabase } from "@/lib/supabase";
import { finalizeAdminInviteInSupabase, setInitialAdminPasswordInSupabase } from "@/lib/lydo-connect-supabase";

type PageMode = "verifying" | "update" | "invalid" | "updated";

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

const AdminCreatePassword = () => {
  const navigate = useNavigate();

  const recovery = useMemo(
    () => parsePasswordRecoveryUrl(typeof window === "undefined" ? "/admin/create-password" : window.location.href),
    [],
  );
  const [mode, setMode] = useState<PageMode>(() => (recovery.hasRecoveryError ? "invalid" : "verifying"));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inlineError, setInlineError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setInlineError("This invite link is unavailable because Supabase is not configured.");
      setMode("invalid");
      return;
    }

    let active = true;

    const establishInviteSession = async () => {
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
          type: "invite",
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

      setInlineError(exchangeError || "This invite link is invalid or has expired.");
      setMode("invalid");
    };

    if (recovery.hasRecoveryError) {
      setMode("invalid");
      return;
    }

    if (recovery.hasRecoveryCredentials) {
      void establishInviteSession();
    } else {
      setInlineError("This invite link is invalid or has expired.");
      setMode("invalid");
    }

    return () => {
      active = false;
    };
  }, [recovery]);

  const finishAndSignOut = async () => {
    await finalizeAdminInviteInSupabase();
    clearPasswordRecoveryState();
    if (supabase) await supabase.auth.signOut();
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

    setIsLoading(true);
    try {
      await setInitialAdminPasswordInSupabase(password);
      await finishAndSignOut();
      setIsLoading(false);
      setPassword("");
      setConfirmPassword("");
      setMode("updated");
    } catch (error) {
      setIsLoading(false);
      setInlineError(error instanceof Error ? error.message : "This invite link is invalid or has expired.");
      setMode("invalid");
    }
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
          {mode === "verifying" ? (
            <div className="space-y-4 py-2 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden="true" />
              <div>
                <h1 className="text-2xl font-heading font-bold">Verifying invite link</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Please wait while we securely verify your invite link.
                </p>
              </div>
            </div>
          ) : null}

          {mode === "update" ? (
            <form onSubmit={updatePassword} className="space-y-5">
              <div>
                <h1 className="text-2xl font-heading font-bold">Create your password</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a secure password to activate your administrator account.
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

              <Button
                type="submit"
                className="w-full font-semibold"
                disabled={isLoading || !isPasswordValid(password) || password !== confirmPassword}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting password...
                  </>
                ) : (
                  "Set Password"
                )}
              </Button>
            </form>
          ) : null}

          {mode === "invalid" ? (
            <div className="space-y-4 py-2 text-center">
              <h1 className="text-2xl font-heading font-bold">Invite link unavailable</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                This invite link is invalid or has expired. Ask a Super Admin to send you a new one.
              </p>
              <Button type="button" className="w-full" onClick={() => navigate(ADMIN_SIGNIN_PATH)}>
                Back to Sign In
              </Button>
            </div>
          ) : null}

          {mode === "updated" ? (
            <div className="flex flex-col items-center space-y-4 py-2 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-heading font-bold">Password set</h1>
                <p className="mt-2 text-sm text-muted-foreground">Your account is ready. Sign in to continue.</p>
              </div>
              <Button className="w-full font-semibold" onClick={() => navigate(ADMIN_SIGNIN_PATH)}>
                Continue to Sign In
              </Button>
            </div>
          ) : null}

          {inlineError && mode === "update" ? (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {inlineError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AdminCreatePassword;
