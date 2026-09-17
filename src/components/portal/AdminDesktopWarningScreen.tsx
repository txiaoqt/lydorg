import { Monitor } from "lucide-react";
import { useCurrentViewportWidth, ADMIN_DESKTOP_MIN_WIDTH } from "@/hooks/use-admin-desktop-viewport";

export type AdminDesktopWarningScreenProps = {
  onSwitchToUser?: () => void;
};

export const AdminDesktopWarningScreen = (_props: AdminDesktopWarningScreenProps = {}) => {
  const currentWidth = useCurrentViewportWidth();

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-admin-page-bg p-4 sm:p-6 font-segoe text-text-default">
      {/* Brand Header */}
      <div className="mb-6 flex items-center gap-3">
        <img src="/y-trace-logo-blue.png" alt="Y-TRACE" className="h-9 w-9 object-contain" />
        <div className="min-w-0 text-left leading-none">
          <p className="font-segoe text-base font-semibold text-text-default">Y-TRACE</p>
          <p className="font-segoe text-xs text-slate-500">Admin Portal</p>
        </div>
      </div>

      {/* Main Warning Card */}
      <div className="w-full max-w-md rounded-md border border-slate-300 bg-admin-surface p-6 sm:p-8 shadow-sm text-center space-y-5">
        {/* Warning Icon Tone */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-border-warning-subtle bg-amber-50 p-2.5 mx-auto">
          <Monitor className="h-6 w-6 text-text-warning-secondary" strokeWidth={1.8} />
        </div>

        {/* Status Pill */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-warning-subtle bg-amber-50 px-2.5 py-1 font-segoe text-xs font-semibold text-text-warning-secondary">
            Desktop / Laptop Only
          </span>
        </div>

        {/* Required Heading & Body Copy */}
        <div className="space-y-2">
          <h1 className="font-segoe text-xl sm:text-2xl font-semibold leading-tight text-text-default">
            Desktop Display Required
          </h1>
          <p className="font-segoe text-sm leading-[150%] text-slate-500">
            The Y-TRACE Admin Portal is designed for desktop and laptop computers to support detailed data tables, document review queues, and financial records. Mobile and tablet access is restricted.
          </p>
        </div>

        {/* Viewport Status & Guidance Box */}
        <div className="rounded-md border border-slate-200 bg-bg-panel-subtle p-3.5 text-xs text-slate-500 space-y-1.5">
          <p className="font-cascadia font-medium text-text-default">
            Current Viewport: <span className="font-bold text-text-warning-secondary">{currentWidth}px</span> · Required: ≥ {ADMIN_DESKTOP_MIN_WIDTH}px
          </p>
          <p className="text-[11px] leading-normal text-slate-500">
            If you are on a laptop or desktop, expand your browser window or reduce browser zoom.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDesktopWarningScreen;
