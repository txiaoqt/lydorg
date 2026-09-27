import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface EndorsementGuidelinesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Endorsement or Certification Guidelines Modal.
 * Follows authenticated Y-TRACE organization portal design system:
 * - Direct institutional header without decorative eyebrows
 * - Standardized horizontal separators matching content container insets
 * - Consistent vertical rhythm and semibold typography
 * - Standard top-right close control and Radix UI dialog accessibility
 */
export const EndorsementGuidelinesModal: React.FC<EndorsementGuidelinesModalProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-1.5rem)] sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl bg-card border border-border/80 shadow-2xl flex flex-col max-h-[85vh]"
        aria-describedby="endorsement-guidelines-desc"
      >
        {/* Pinned Institutional Header */}
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-0 text-left shrink-0">
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
              Endorsement or Certification Guidelines
            </DialogTitle>
          </div>

          <DialogDescription
            id="endorsement-guidelines-desc"
            className="text-xs text-muted-foreground leading-relaxed mt-1"
          >
            Review the official endorsement and certification requirements below based on your organization type.
          </DialogDescription>
        </DialogHeader>

        {/* Clean Content Area with Standardized Inset Separators & Consistent Vertical Spacing */}
        <div className="px-5 sm:px-6 pt-4 pb-5 overflow-y-auto space-y-4 flex-1 text-xs leading-relaxed text-foreground">
          {/* Top Divider: perfectly matches content bounds and insets */}
          <div className="h-px bg-border/80 w-full" />

          {/* Section 1: Standard Applicable Requirements */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-foreground tracking-tight leading-snug">
              Organizations applying for registration shall submit the following, if applicable:
            </h3>

            <div className="space-y-2.5">
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">For school-based organizations:</p>
                <p className="text-muted-foreground leading-relaxed">
                  Certificate of Recognition from a competent school authority supervising student affairs;
                </p>
              </div>

              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">For faith-based organizations:</p>
                <p className="text-muted-foreground leading-relaxed">
                  Certificate of Recognition from any head/pastor of congregation or parish priest;
                </p>
              </div>

              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">
                  For organizations established or founded with the assistance of government agencies, offices and instrumentalities:
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Certificate of Recognition from the government agency, office or instrumentality;
                </p>
              </div>
            </div>
          </div>

          {/* Middle Section Divider: identical width, alignment, and styling */}
          <div className="h-px bg-border/80 w-full" />

          {/* Section 2: Expedited Verification Documents */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-foreground tracking-tight leading-snug">
              To expedite the process of verification, the following documents may also be submitted:
            </h3>

            <div className="space-y-2.5">
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">For chapters of multi-level organizations:</p>
                <p className="text-muted-foreground leading-relaxed">
                  Certificate of Recognition from the president governing at the highest organizational level;
                </p>
              </div>

              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">For Consortium organizations:</p>
                <p className="text-muted-foreground leading-relaxed">
                  Certification of Member Organizations issued by the secretariat/board;
                </p>
              </div>

              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">
                  For organizations registered in the Securities and Exchange Commission, or by other national government registering entities:
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Certificate of Registration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
