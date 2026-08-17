import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  showText?: boolean;
  subtitle?: string;
  textClassName?: string;
};

export default function BrandLogo({
  className,
  showText = true,
  subtitle,
  textClassName,
}: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-[10px]", showText ? "h-[49px] w-[129px] px-[10px] py-0" : "h-auto w-auto", className)}>
      <img
        src="/FullNavbar.svg"
        alt="Y-TRACE logo"
        className="h-full w-auto object-contain"
      />
      {showText ? (
        <div className={cn("min-w-0", textClassName)}>
          <p className="font-heading font-bold leading-tight">Y-TRACE</p>
          {subtitle ? <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
