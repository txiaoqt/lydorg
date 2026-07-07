import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imgClassName?: string;
  showText?: boolean;
  subtitle?: string;
  textClassName?: string;
};

export default function BrandLogo({
  className,
  imgClassName,
  showText = true,
  subtitle,
  textClassName,
}: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img src="/y-trace-logo.png" alt="Y-TRACE logo" className={cn("h-10 w-10 object-contain", imgClassName)} />
      {showText ? (
        <div className={cn("min-w-0", textClassName)}>
          <p className="font-heading font-bold leading-tight">Y-TRACE</p>
          {subtitle ? <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
