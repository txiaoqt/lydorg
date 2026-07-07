import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PolicyContent } from "@/components/PolicyContent";
import type { ActivePolicyVersion } from "@/hooks/use-policy-agreement";

type TermsPrivacyAgreementModalProps = {
  open: boolean;
  policy: ActivePolicyVersion | null;
  saving: boolean;
  variant?: "website" | "pwa";
  error?: string | null;
  onAccept: () => void | Promise<void>;
  onDecline: () => void | Promise<void>;
};

export const TermsPrivacyAgreementModal = ({
  open,
  policy,
  saving,
  variant = "website",
  error,
  onAccept,
  onDecline,
}: TermsPrivacyAgreementModalProps) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  useEffect(() => {
    if (open) {
      setAcceptedTerms(false);
      setAcceptedPrivacy(false);
    }
  }, [open, policy?.id]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !policy) return null;

  const isPwa = variant === "pwa";

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/60 backdrop-blur-[2px]">
      <div
        className={`mx-auto flex min-h-dvh w-full items-center justify-center ${
          isPwa
            ? "max-w-[600px] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
            : "max-w-3xl p-4"
        }`}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="policy-agreement-title"
          aria-describedby="policy-agreement-description"
          className={`flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden border border-border bg-card shadow-2xl ${
            isPwa ? "rounded-[1.25rem]" : "rounded-2xl"
          }`}
        >
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <h2 id="policy-agreement-title" className="text-xl font-heading font-bold text-foreground">
              Policy Agreement Required
            </h2>
            <p id="policy-agreement-description" className="mt-1 text-sm leading-5 text-muted-foreground">
              Review and accept Version {policy.version} before continuing to authenticated features.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            <Tabs defaultValue="terms" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="terms">Terms of Service</TabsTrigger>
                <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
              </TabsList>
              <TabsContent value="terms" className="mt-3">
                <ScrollArea className={`${isPwa ? "h-[34vh]" : "h-[44vh]"} rounded-lg border border-border bg-background p-4`}>
                  <PolicyContent content={policy.terms_content} hideDocumentTitle hideMetadata />
                </ScrollArea>
              </TabsContent>
              <TabsContent value="privacy" className="mt-3">
                <ScrollArea className={`${isPwa ? "h-[34vh]" : "h-[44vh]"} rounded-lg border border-border bg-background p-4`}>
                  <PolicyContent content={policy.privacy_content} hideDocumentTitle hideMetadata />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          <div className="border-t border-border px-5 py-4 sm:px-6">
            <div className="mb-4 space-y-3">
              <div className="flex min-h-11 items-start gap-2">
                <Checkbox
                  id="terms-agreement"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(Boolean(checked))}
                  disabled={saving}
                />
                <Label htmlFor="terms-agreement" className="cursor-pointer text-sm leading-6 text-foreground">
                  I have read and agree to the Terms of Service.
                </Label>
              </div>
              <div className="flex min-h-11 items-start gap-2">
                <Checkbox
                  id="privacy-agreement"
                  checked={acceptedPrivacy}
                  onCheckedChange={(checked) => setAcceptedPrivacy(Boolean(checked))}
                  disabled={saving}
                />
                <Label htmlFor="privacy-agreement" className="cursor-pointer text-sm leading-6 text-foreground">
                  I have read and acknowledge the Privacy Policy.
                </Label>
              </div>
            </div>

            {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onDecline} disabled={saving}>
                Sign Out
              </Button>
              <Button
                type="button"
                onClick={() => void onAccept()}
                disabled={!acceptedTerms || !acceptedPrivacy || saving}
              >
                {saving ? "Saving..." : "Accept and Continue"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
