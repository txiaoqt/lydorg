import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  showText?: boolean;
  subtitle?: string;
  textClassName?: string;
  markOnly?: boolean;
};

export default function BrandLogo({
  className,
  showText = true,
  subtitle,
  textClassName,
  markOnly = false,
}: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-[10px]", showText ? "h-[49px] w-[129px] px-[10px] py-0" : "h-auto w-auto", className)}>
      <img
        src={markOnly ? "/y-trace-logo-blue.png?v=12" : "/FullNavbar.svg"}
        alt="Y-TRACE logo"
        className={markOnly ? "h-10 w-10 shrink-0 object-contain" : "h-full w-auto object-contain"}
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
