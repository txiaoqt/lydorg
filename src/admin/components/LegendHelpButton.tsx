import React from "react";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";

type LegendHelpButtonProps = {
  onClick: () => void;
  ariaLabel: string;
};

export function LegendHelpButton({ onClick, ariaLabel }: LegendHelpButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <CircleHelp size={14} />
    </Button>
  );
}

