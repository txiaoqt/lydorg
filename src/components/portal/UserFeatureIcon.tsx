import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type UserFeatureIconProps = {
  icon: LucideIcon;
  size?: "compact" | "default";
  className?: string;
  iconClassName?: string;
};

export const UserFeatureIcon = ({
  icon: Icon,
  size = "default",
  className,
  iconClassName,
}: UserFeatureIconProps) => (
  <span
    aria-hidden="true"
    className={cn(
      "user-feature-icon inline-grid shrink-0 place-items-center border border-primary/15 bg-primary-soft text-primary",
      size === "compact" ? "h-8 w-8 rounded-[10px]" : "h-10 w-10 rounded-xl",
      className,
    )}
  >
    <Icon
      aria-hidden="true"
      strokeWidth={1.8}
      className={cn(size === "compact" ? "h-4 w-4" : "h-5 w-5", iconClassName)}
    />
  </span>
);
