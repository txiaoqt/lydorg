import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ActivePolicyVersion } from "@/hooks/use-policy-agreement";
import { PolicyContent } from "@/components/PolicyContent";

type TermsPrivacyAgreementModalProps = {
  open: boolean;
  policy: ActivePolicyVersion | null;
  saving: boolean;
  error?: string | null;
  onAccept: () => void | Promise<void>;
  onDecline: () => void | Promise<void>;
};

export const TermsPrivacyAgreementModal = ({
  open,
  policy,
  saving,
  error,
  onAccept,
  onDecline,
}: TermsPrivacyAgreementModalProps) => {
  const [agreed, setAgreed] = useState(false);

  if (!open || !policy) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-[1px]">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-4">
        <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <h2 className="text-xl font-heading font-bold text-foreground">{policy.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You must review and accept these policies before continuing to authenticated features.
            </p>
          </div>

          <div className="px-5 py-4 sm:px-6">
            <Tabs defaultValue="terms" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="terms">Terms of Service</TabsTrigger>
                <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
              </TabsList>
              <TabsContent value="terms" className="mt-3">
                <ScrollArea className="h-[44vh] rounded-lg border border-border bg-background p-4">
                  <PolicyContent content={policy.terms_content} />
                </ScrollArea>
              </TabsContent>
              <TabsContent value="privacy" className="mt-3">
                <ScrollArea className="h-[44vh] rounded-lg border border-border bg-background p-4">
                  <PolicyContent content={policy.privacy_content} />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          <div className="border-t border-border px-5 py-4 sm:px-6">
            <div className="mb-3 flex items-start gap-2">
              <Checkbox
                id="policy-agreement"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(Boolean(checked))}
                disabled={saving}
              />
              <Label htmlFor="policy-agreement" className="cursor-pointer text-sm leading-6 text-foreground">
                I have read and agree to the Terms of Service and Privacy Policy.
              </Label>
            </div>

            {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onDecline} disabled={saving}>
                Sign Out
              </Button>
              <Button type="button" onClick={() => void onAccept()} disabled={!agreed || saving}>
                {saving ? "Saving..." : "Accept and Continue"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
