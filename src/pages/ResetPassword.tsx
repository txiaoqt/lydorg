import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandLogo from "@/components/BrandLogo";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [inlineError, setInlineError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError("");

    if (!email.trim() || !email.includes("@")) {
      setInlineError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    window.setTimeout(() => {
      setIsLoading(false);
      setIsSent(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-180px] left-[-140px] h-[360px] w-[360px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-[-190px] right-[-150px] h-[400px] w-[400px] rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="mb-7 text-left">
          <Link to="/" className="inline-flex items-center gap-3 max-w-full">
            <BrandLogo imgClassName="h-10 w-10" showText subtitle="Youth Portal" />
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5 card-shadow">
          {isSent ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center text-center space-y-4 py-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h1 className="text-2xl font-heading font-bold text-foreground">
                  Check your inbox
                </h1>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  We sent a password reset link to{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                  <br />
                  Check your spam folder if you don't see it.
                </p>
              </div>
              <Button className="w-full font-semibold" asChild>
                <Link to="/signin">Back to Sign In</Link>
              </Button>
            </div>
          ) : (
            /* ── Email form state ── */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h1 className="text-2xl font-heading font-bold text-foreground">
                  Forgot your password?
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

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

              <div className="space-y-2.5 pt-1">
                <Button
                  type="submit"
                  className="w-full font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                {inlineError && (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive">
                    {inlineError}
                  </p>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Below-card links */}
        <div className="mt-5 space-y-2.5 text-center text-sm text-muted-foreground">
          {isSent ? (
            <p>
              Didn't receive it?{" "}
              <button
                type="button"
                onClick={() => { setIsSent(false); setEmail(""); }}
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Try again →
              </button>
            </p>
          ) : (
            <p>
              Remember your password?{" "}
              <Link to="/signin" className="font-medium text-primary hover:text-primary/80 transition-colors">
                Sign in
              </Link>
            </p>
          )}
          <p>
            <Link to="/" className="hover:text-foreground transition-colors">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
