import { useState } from "react";
import { AlertOctagon, LogOut, ShieldAlert, XCircle, FileX, Loader2 } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";

export interface AccountSuspendedScreenProps {
  onSignOut?: () => void | Promise<void>;
  userEmail?: string | null;
  organizationName?: string | null;
  isPwa?: boolean;
}

export const AccountSuspendedScreen = ({
  onSignOut,
  userEmail,
  organizationName,
  isPwa = false,
}: AccountSuspendedScreenProps) => {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (onSignOut) {
        await onSignOut();
      }
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div
      data-testid="account-suspended-screen"
      className="min-h-screen bg-slate-50/80 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8"
    >
      {/* Top Bar / Brand */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between pb-6 border-b border-border/80">
        <BrandLogo showText={false} className="h-10 w-auto" />
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20 font-mono tracking-tight">
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            ACCOUNT SUSPENDED
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-2xl mx-auto my-auto py-8">
        <div className="bg-card border border-destructive/25 rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
          {/* Header Icon + Main Notice */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shadow-xs">
              <ShieldAlert className="h-9 w-9" strokeWidth={1.8} />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-segoe">
                Account Suspended
              </h1>
              <p className="text-sm sm:text-base font-semibold text-destructive max-w-lg mx-auto">
                Your Y-TRACE organization account has been permanently suspended.
              </p>
              {organizationName ? (
                <p className="text-xs text-muted-foreground pt-0.5 font-medium">
                  Organization: <span className="font-semibold text-foreground">{organizationName}</span>
                  {userEmail ? <span> ({userEmail})</span> : null}
                </p>
              ) : userEmail ? (
                <p className="text-xs text-muted-foreground pt-0.5 font-medium">
                  Account: <span className="font-semibold text-foreground">{userEmail}</span>
                </p>
              ) : null}
            </div>
          </div>

          {/* Detailed Explanation */}
          <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3 bg-muted/30 border border-border/70 rounded-xl p-4 sm:p-5">
            <p>
              One or more documents submitted during your organization registration were marked as{" "}
              <strong className="text-destructive font-bold uppercase">REJECTED</strong> by the Pasig City Youth
              Development Office.
            </p>
            <p>
              Because of this rejection, your organization is no longer eligible to continue the registration and
              validation process through Y-TRACE. Access to organization services and submission workflows has been
              suspended.
            </p>
            <p>
              You can no longer upload or resubmit registration documents, submit new requirements, or continue using
              the system&apos;s organization services.
            </p>
          </div>

          {/* Reason Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <AlertOctagon className="h-4 w-4 text-destructive shrink-0" />
              <span>Reason for Suspension</span>
            </div>
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs sm:text-sm text-foreground">
              One or more registration documents submitted by your organization were marked{" "}
              <span className="font-bold text-destructive">REJECTED</span> by the Pasig City Youth Development Office.
            </div>
          </div>

          {/* Access Restricted Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <FileX className="h-4 w-4 text-destructive shrink-0" />
              <span>Access Restricted</span>
            </div>
            <div className="rounded-xl border border-border/80 bg-background p-4 space-y-2 text-xs sm:text-sm">
              <p className="font-medium text-foreground">Your organization can no longer:</p>
              <ul className="space-y-1.5 text-muted-foreground pl-1">
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <span>Resubmit rejected registration documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <span>Upload remaining registration requirements</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <span>Submit new organization documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <span>Create or submit Budget Requests</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <span>Submit Liquidation Reports</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <span>Submit YPOP participation requirements</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <span>Use other authenticated organization services</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Final Status Section */}
          <div className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-2 text-xs sm:text-sm">
            <p className="font-bold text-foreground">Final Status</p>
            <p className="text-muted-foreground leading-relaxed">
              Your registration process has been terminated and your organization portal access has been suspended. Your
              previous submissions and review records remain retained for administrative purposes.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              This suspension is permanent and cannot be lifted through the organization portal.
            </p>
            <p className="font-semibold text-foreground pt-1">
              Your opportunity to complete the Y-TRACE registration process has therefore ended.
            </p>
          </div>

          {/* Sign Out Action */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/70">
            <span className="text-xs text-muted-foreground text-center sm:text-left">
              Session is locked. Click sign out to exit your account.
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="w-full sm:w-auto font-semibold gap-2 border-border/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              {signingOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing Out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </>
              )}
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto pt-6 text-center text-xs text-muted-foreground border-t border-border/60">
        Pasig City Youth Development Office (PCYDO) • Y-TRACE Portal
      </footer>
    </div>
  );
};

export default AccountSuspendedScreen;
