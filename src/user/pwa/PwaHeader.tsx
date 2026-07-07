import { ArrowLeft, Bell } from "lucide-react";
import { PwaOrganizationAvatar } from "./PwaOrganizationAvatar";

export function PwaHeader({
  title,
  organizationName,
  profileImageUrl,
  unreadCount,
  mode,
  dashboard,
  onProfile,
  onBack,
  onNotifications,
}: {
  title: string;
  organizationName: string;
  profileImageUrl?: string | null;
  unreadCount: number;
  mode: "identity" | "nested";
  dashboard?: boolean;
  onProfile: () => void;
  onBack: () => void;
  onNotifications: () => void;
}) {
  if (mode === "nested") {
    return (
      <header className="pwa-app-header pwa-app-header--nested">
        <button type="button" className="pwa-header-back" aria-label="Go back" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
        </button>
        <div className="pwa-header-copy"><h1>{title}</h1></div>
      </header>
    );
  }

  return (
    <header className="pwa-app-header">
      <button type="button" className="pwa-identity-button" onClick={onProfile} aria-label="Open organization profile">
        <PwaOrganizationAvatar className="pwa-avatar" organizationName={organizationName} profileImageUrl={profileImageUrl} />
        <span className="pwa-header-copy">
          <h1>{title}</h1>
          <span>{dashboard ? `Good ${getDayPart()}, ${organizationName || "Organization"}` : organizationName}</span>
        </span>
      </button>
      <button type="button" className="pwa-icon-button" aria-label="Open notifications" onClick={onNotifications}>
        <Bell aria-hidden="true" />
        {unreadCount > 0 ? <span className="pwa-notification-dot">{Math.min(unreadCount, 9)}</span> : null}
      </button>
    </header>
  );
}

function getDayPart() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
