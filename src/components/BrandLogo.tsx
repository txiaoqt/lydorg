import { cn } from "@/lib/utils";
import BrandLockup from "@/components/BrandLockup";

type BrandLogoProps = {
  className?: string;
  showText?: boolean;
  markOnly?: boolean;
  onDark?: boolean;
};

// Full logo renders the same mark + "Y-TRACE / PASIG CITY" lockup as the public navbar.
export default function BrandLogo({ className, markOnly = false, onDark = false }: BrandLogoProps) {
  if (markOnly) {
    return (
      <div className={cn("flex items-center", className)}>
        <img src="/y-trace-logo-blue.png?v=12" alt="Y-TRACE logo" className="h-10 w-10 shrink-0 object-contain" />
      </div>
    );
  }
  return (
    <div className={cn("flex items-center", className)}>
      <BrandLockup onDark={onDark} />
    </div>
  );
}
