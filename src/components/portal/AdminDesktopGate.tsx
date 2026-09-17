import { type ReactNode } from "react";
import { useAdminDesktopViewport } from "@/hooks/use-admin-desktop-viewport";
import { AdminDesktopWarningScreen } from "@/components/portal/AdminDesktopWarningScreen";

type AdminDesktopGateProps = {
  children: ReactNode;
  onSwitchToUser?: () => void;
};

/**
 * Gate that renders its children only when the viewport is at desktop/laptop
 * dimensions (>= 1024px).
 *
 * Below 1024px, renders AdminDesktopWarningScreen in-place without triggering
 * redirects, without mutating authentication sessions, and preserving the
 * active URL and route state.
 */
export const AdminDesktopGate = ({ children, onSwitchToUser }: AdminDesktopGateProps) => {
  const isDesktop = useAdminDesktopViewport();

  if (!isDesktop) {
    return <AdminDesktopWarningScreen onSwitchToUser={onSwitchToUser} />;
  }

  return <>{children}</>;
};

export default AdminDesktopGate;
