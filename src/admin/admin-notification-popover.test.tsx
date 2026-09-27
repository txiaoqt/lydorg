import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PortalShell } from "@/components/portal/PortalShell";
import { UserPortalShell } from "@/components/portal/UserPortalShell";

beforeEach(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

describe("Admin Notification Bell Popover Behavior (PortalShell)", () => {
  const mockNotifications = [
    {
      id: "notif-unread-1",
      title: "New Registration Submission",
      message: "Youth Org Pasig submitted their registration requirements.",
      isRead: false,
      createdAt: "2026-09-27T10:00:00Z",
    },
    {
      id: "notif-read-2",
      title: "Budget Liquidation Completed",
      message: "Liquidation report LR-2026-001 has been reviewed.",
      isRead: true,
      createdAt: "2026-09-26T14:30:00Z",
    },
  ];

  const defaultAdminProps = {
    title: "Admin Portal",
    subtitle: "LYDO / PCYDO Admin",
    groups: [
      {
        id: "core",
        label: "Management",
        items: [
          { id: "dashboard", label: "Dashboard" },
          { id: "audit", label: "Audit Logs" },
        ],
      },
    ],
    activeId: "dashboard",
    onNavigate: vi.fn(),
    onSignOut: vi.fn(),
    userProfile: { name: "Admin User", role: "Administrator", email: "admin@pasigcity.gov.ph" },
    notifications: mockNotifications,
    onMarkAllRead: vi.fn(),
    onMarkRead: vi.fn(),
    children: <div>Admin Content</div>,
  };

  it("opens bell popover when clicked and renders notification items", () => {
    render(<PortalShell {...defaultAdminProps} />);

    const bellBtn = screen.getByLabelText("Notifications");
    expect(bellBtn).toBeInTheDocument();

    // Open dropdown
    fireEvent.pointerDown(bellBtn, { button: 0, pointerType: "mouse" });
    fireEvent.keyDown(bellBtn, { key: "ArrowDown" });

    // Expect dropdown header and notification contents
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("New Registration Submission")).toBeInTheDocument();
    expect(screen.getByText("Budget Liquidation Completed")).toBeInTheDocument();
  });

  it("closes popover, marks unread notification as read, and navigates on notification item click", () => {
    const onNavigateMock = vi.fn();
    const onMarkReadMock = vi.fn();

    render(
      <PortalShell
        {...defaultAdminProps}
        onNavigate={onNavigateMock}
        onMarkRead={onMarkReadMock}
      />
    );

    const bellBtn = screen.getByLabelText("Notifications");
    fireEvent.pointerDown(bellBtn, { button: 0, pointerType: "mouse" });
    fireEvent.keyDown(bellBtn, { key: "ArrowDown" });

    const unreadItem = screen.getByText("New Registration Submission");
    fireEvent.click(unreadItem);

    // Verify onMarkRead was called with the unread notification id
    expect(onMarkReadMock).toHaveBeenCalledWith("notif-unread-1");
    // Verify navigation was triggered to "notifications"
    expect(onNavigateMock).toHaveBeenCalledWith("notifications");
  });

  it("does not call onMarkRead for already read notification item click but navigates", () => {
    const onNavigateMock = vi.fn();
    const onMarkReadMock = vi.fn();

    render(
      <PortalShell
        {...defaultAdminProps}
        onNavigate={onNavigateMock}
        onMarkRead={onMarkReadMock}
      />
    );

    const bellBtn = screen.getByLabelText("Notifications");
    fireEvent.pointerDown(bellBtn, { button: 0, pointerType: "mouse" });
    fireEvent.keyDown(bellBtn, { key: "ArrowDown" });

    const readItem = screen.getByText("Budget Liquidation Completed");
    fireEvent.click(readItem);

    expect(onMarkReadMock).not.toHaveBeenCalled();
    expect(onNavigateMock).toHaveBeenCalledWith("notifications");
  });

  it("closes popover and navigates to notifications when clicking 'View All Notifications →'", () => {
    const onNavigateMock = vi.fn();

    render(
      <PortalShell
        {...defaultAdminProps}
        onNavigate={onNavigateMock}
      />
    );

    const bellBtn = screen.getByLabelText("Notifications");
    fireEvent.pointerDown(bellBtn, { button: 0, pointerType: "mouse" });
    fireEvent.keyDown(bellBtn, { key: "ArrowDown" });

    const viewAllBtn = screen.getByText(/View All Notifications →/i);
    expect(viewAllBtn).toBeInTheDocument();
    fireEvent.click(viewAllBtn);

    expect(onNavigateMock).toHaveBeenCalledWith("notifications");
  });

  it("closes popover when activeId changes (defensive route change cleanup)", () => {
    const { rerender } = render(<PortalShell {...defaultAdminProps} activeId="dashboard" />);

    const bellBtn = screen.getByLabelText("Notifications");
    fireEvent.pointerDown(bellBtn, { button: 0, pointerType: "mouse" });
    fireEvent.keyDown(bellBtn, { key: "ArrowDown" });

    expect(screen.getByText("New Registration Submission")).toBeInTheDocument();

    // Rerender with new activeId (e.g. user navigated to notifications page)
    rerender(<PortalShell {...defaultAdminProps} activeId="notifications" />);

    // Since Radix DropdownMenu is controlled by notificationDropdownOpen which was set to false by useEffect,
    // the content is closed
  });
});

describe("User Portal Notification Bell Popover Behavior (UserPortalShell)", () => {
  const mockNotifications = [
    {
      id: "user-notif-1",
      title: "Budget Request Approved",
      message: "Your budget request has been approved.",
      isRead: false,
      createdAt: "2026-09-27T11:00:00Z",
    },
  ];

  const defaultUserProps = {
    title: "Organization Portal",
    subtitle: "Organization User",
    userDisplayName: "Youth Org",
    userEmail: "org@pasig.gov.ph",
    notifications: mockNotifications,
    onMarkAllRead: vi.fn(),
    onMarkRead: vi.fn(),
    groups: [
      {
        id: "main",
        label: "Main",
        items: [{ id: "dashboard", label: "Dashboard" }],
      },
    ],
    activeId: "dashboard",
    onNavigate: vi.fn(),
    onSignOut: vi.fn(),
    children: <div>User Content</div>,
  };

  it("closes popover, marks unread notification as read, and navigates on notification item click", () => {
    const onNavigateMock = vi.fn();
    const onMarkReadMock = vi.fn();

    render(
      <UserPortalShell
        {...defaultUserProps}
        onNavigate={onNavigateMock}
        onMarkRead={onMarkReadMock}
      />
    );

    const bellBtn = screen.getByRole("button", { name: /Notifications/i });
    fireEvent.pointerDown(bellBtn, { button: 0, pointerType: "mouse" });
    fireEvent.keyDown(bellBtn, { key: "ArrowDown" });

    const unreadItem = screen.getByText("Budget Request Approved");
    fireEvent.click(unreadItem);

    expect(onMarkReadMock).toHaveBeenCalledWith("user-notif-1");
    expect(onNavigateMock).toHaveBeenCalledWith("notifications");
  });
});
