import React from "react";
import { HelpCircle, Send, Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface SubmitInquiryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inquiryForm: {
    submitterName: string;
    organizationName?: string;
    email: string;
    subject: string;
    description: string;
  };
  setInquiryForm: React.Dispatch<
    React.SetStateAction<{
      submitterName: string;
      organizationName: string;
      email: string;
      subject: string;
      description: string;
    }>
  >;
  submittingInquiry?: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Redesigned Y-TRACE Submit Inquiry Modal.
 * Follows Impeccable, Taste, and Emil Kowalski design-engineering standards:
 * - Clear conceptual grouping: Contact Details (2-col on desktop) vs. Inquiry Details
 * - Institutional header hierarchy with PCYDO context
 * - Prominent, comfortable message textarea
 * - Tactile, decisive CTA hierarchy with loading state feedback
 */
export const SubmitInquiryModal: React.FC<SubmitInquiryModalProps> = ({
  open,
  onOpenChange,
  inquiryForm,
  setInquiryForm,
  submittingInquiry = false,
  onSubmit,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl bg-card border border-border/80 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Refined Institutional Header */}
        <DialogHeader className="px-4 sm:px-5 pt-5 pb-4 border-b border-border/60 bg-muted/10 text-left shrink-0">
          <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-[11px] mb-1 tracking-wide">
            <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>PCYDO Support Desk · Pasig City</span>
          </div>
          <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            Submit Inquiry
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            Send your official question or assistance request directly to the PCYDO administrative team.
          </DialogDescription>
        </DialogHeader>

        {/* Structured Form Body */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 sm:px-5 py-4 space-y-4.5 overflow-y-auto max-h-[calc(90vh-10rem)]">
            {/* Conceptual Group 1: Sender Contact Details */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
                  Contact Details
                </span>
                <div className="h-px bg-border/50 flex-1" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="inquiry-submitter-name" className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
                    <span>Name / Organization Name</span>
                    <span className="text-destructive font-normal text-xs" aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="inquiry-submitter-name"
                    required
                    value={inquiryForm?.submitterName || ""}
                    onChange={(e) =>
                      setInquiryForm((prev) => ({
                        ...prev,
                        submitterName: e.target.value,
                        organizationName: e.target.value,
                      }))
                    }
                    placeholder="Organization name"
                    className="rounded-xl text-xs h-9 bg-background border-border/80 focus-visible:ring-1.5 focus-visible:ring-primary focus-visible:border-primary transition-all duration-150"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inquiry-email" className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
                    <span>Email Address</span>
                    <span className="text-destructive font-normal text-xs" aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id="inquiry-email"
                    required
                    type="email"
                    value={inquiryForm?.email || ""}
                    onChange={(e) =>
                      setInquiryForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="email@organization.org"
                    className="rounded-xl text-xs h-9 bg-background border-border/80 focus-visible:ring-1.5 focus-visible:ring-primary focus-visible:border-primary transition-all duration-150"
                  />
                </div>
              </div>
            </div>

            {/* Conceptual Group 2: Inquiry Content */}
            <div className="space-y-2.5 pt-0.5">
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
                  Inquiry Content
                </span>
                <div className="h-px bg-border/50 flex-1" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inquiry-subject" className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
                  <span>Subject</span>
                  <span className="text-destructive font-normal text-xs" aria-hidden="true">*</span>
                </Label>
                <Input
                  id="inquiry-subject"
                  required
                  value={inquiryForm?.subject || ""}
                  onChange={(e) =>
                    setInquiryForm((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                  placeholder="e.g. Question about liquidation requirement"
                  className="rounded-xl text-xs h-9 bg-background border-border/80 focus-visible:ring-1.5 focus-visible:ring-primary focus-visible:border-primary transition-all duration-150"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inquiry-description" className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
                  <span>Message / Details</span>
                  <span className="text-destructive font-normal text-xs" aria-hidden="true">*</span>
                </Label>
                <Textarea
                  id="inquiry-description"
                  required
                  rows={4}
                  value={inquiryForm?.description || ""}
                  onChange={(e) =>
                    setInquiryForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Provide details about your inquiry..."
                  className="rounded-xl text-xs bg-background border-border/80 min-h-[115px] sm:min-h-[125px] leading-relaxed p-3 focus-visible:ring-1.5 focus-visible:ring-primary focus-visible:border-primary transition-all duration-150 resize-y"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <DialogFooter className="px-4 sm:px-5 py-3 sm:py-3.5 border-t border-border/60 bg-muted/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground font-medium justify-center sm:justify-start">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Direct administrative routing</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-9.5 sm:h-10 px-4 rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground text-xs sm:text-sm font-medium cursor-pointer transition-colors duration-150"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingInquiry}
                className="h-9.5 sm:h-10 px-4 sm:px-5 rounded-lg bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground text-xs sm:text-sm font-semibold gap-2 cursor-pointer shadow-sm transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
              >
                {submittingInquiry ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 shrink-0" />
                    <span>Submit Inquiry</span>
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
