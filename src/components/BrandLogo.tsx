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
    <div className={cn("flex h-[49px] w-[129px] items-center gap-[10px] px-[10px] py-0", className)}>
      <img src="/y-trace-logo.svg" alt="Y-TRACE logo" className={cn("h-full w-auto object-contain", imgClassName)} />
      {showText ? (
        <div className={cn("min-w-0", textClassName)}>
          <p className="font-heading font-bold leading-tight">Y-TRACE</p>
          {subtitle ? <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
