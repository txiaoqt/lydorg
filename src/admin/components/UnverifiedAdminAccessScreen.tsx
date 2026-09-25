import { useState } from "react";
import { MailCheck, LogOut, ShieldAlert, Loader2, ArrowRight } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export type UnverifiedAdminAccessScreenProps = {
  email?: string;
  onSignOut?: () => void | Promise<void>;
};

export const UnverifiedAdminAccessScreen = ({
  email = "",
  onSignOut,
}: UnverifiedAdminAccessScreenProps) => {
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleResendVerification = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      if (supabase && email) {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: email.trim().toLowerCase(),
        });
        if (error) {
          toast({
            title: "Unable to Resend Verification",
            description: error.message,
            variant: "destructive",
          });
          return;
        }
      }

      setResendSuccess(true);
      setCooldown(60);
      toast({
        title: "Verification Email Sent",
        description: `A verification link has been dispatched to ${email || "your registered address"}.`,
      });

      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      toast({
        title: "Unable to Resend Verification",
        description: err instanceof Error ? err.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between pb-6 border-b border-slate-200">
        <BrandLogo variant="light" size="sm" />
        <span className="font-cascadia text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
          Admin Portal Gate
        </span>
      </div>

      {/* Main Content Card */}
      <main className="w-full max-w-md mx-auto my-auto py-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Icon + Title */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
              <ShieldAlert className="h-7 w-7" strokeWidth={1.8} />
            </div>
            <div className="space-y-1">
              <h1 className="font-segoe text-lg font-bold text-slate-900 tracking-tight">
                Administrator Email Verification Required
              </h1>
              <p className="font-segoe text-xs text-slate-500 leading-relaxed max-w-sm">
                Your administrator account email address must be verified before you can access the Admin Portal.
              </p>
            </div>
          </div>

          {/* Email Target Box */}
          {email && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                <MailCheck className="h-4 w-4 text-public-bg-brand" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-segoe text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Target Administrator Email
                </p>
                <p className="font-segoe text-xs font-semibold text-slate-800 truncate">
                  {email}
                </p>
              </div>
            </div>
          )}

          {/* Policy Information */}
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5 text-xs text-amber-800 leading-relaxed space-y-1">
            <p className="font-semibold text-amber-900">Security Policy Enforced</p>
            <p className="text-[11px] text-amber-700 leading-normal">
              The system policy <strong className="font-mono">Require Verified Admin Email</strong> is active. Please confirm your email address through the verification link sent to your inbox, or request assistance from the Super Administrator.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <Button
              type="button"
              onClick={handleResendVerification}
              disabled={isResending || cooldown > 0}
              className="w-full h-10 text-xs font-semibold bg-public-bg-brand text-white hover:bg-bg-brand-hover shadow-sm gap-2"
            >
              {isResending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Sending Verification...</span>
                </>
              ) : cooldown > 0 ? (
                <span>Resend in {cooldown}s</span>
              ) : (
                <>
                  <MailCheck className="h-3.5 w-3.5" />
                  <span>Resend Verification Email</span>
                </>
              )}
            </Button>

            {onSignOut && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void onSignOut()}
                className="w-full h-10 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50 gap-2"
              >
                <LogOut className="h-3.5 w-3.5 text-slate-500" />
                <span>Sign Out & Return to Login</span>
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto pt-6 border-t border-slate-200 text-center">
        <p className="font-segoe text-xs text-slate-400">
          Pasig City Youth Development Office (PCYDO) — Y-TRACE Security Gateway
        </p>
      </footer>
    </div>
  );
};
