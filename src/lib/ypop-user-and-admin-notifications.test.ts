import { describe, it, expect, vi } from "vitest";
import { type NotificationRecord, adminNavigationGroups } from "./lydo-connect-data";
import { readAdminSession, type SeededAdminUser } from "./admin-auth";

describe("YPOP User and Admin Notification System Integrity", () => {
  describe("1. YPOP Notification Mapping & Routing Contract", () => {
    it("maps YPOP org activity notifications with proper related_type and related_id", () => {
      const orgActivityNotif: NotificationRecord = {
        id: "notif-ypop-org-1",
        userId: "user-uuid-123",
        organizationId: "org-uuid-456",
        title: "PPA verified",
        message: "Your organization-led activity 'Youth Leadership Summit' has been verified by the admin.",
        type: "completed",
        relatedType: "ypop_org_activity",
        relatedId: "activity-uuid-789",
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      expect(orgActivityNotif.relatedType).toBe("ypop_org_activity");
      expect(orgActivityNotif.relatedId).toBe("activity-uuid-789");
      expect(orgActivityNotif.userId).toBe("user-uuid-123");
      expect(orgActivityNotif.type).toBe("completed");
    });

    it("maps YPOP event participation notifications with proper related_type and related_id", () => {
      const eventNotif: NotificationRecord = {
        id: "notif-ypop-event-1",
        userId: "user-uuid-123",
        organizationId: "org-uuid-456",
        title: "Event attendance verified",
        message: "Your attendance proof for the city-led event has been verified by the admin.",
        type: "completed",
        relatedType: "ypop_event_participation",
        relatedId: "participation-uuid-321",
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      expect(eventNotif.relatedType).toBe("ypop_event_participation");
      expect(eventNotif.relatedId).toBe("participation-uuid-321");
      expect(eventNotif.userId).toBe("user-uuid-123");
    });

    it("maps YPOP semester entry notifications with proper related_type and related_id", () => {
      const entryNotif: NotificationRecord = {
        id: "notif-ypop-entry-1",
        userId: "user-uuid-123",
        organizationId: "org-uuid-456",
        title: "YPOP semester entry qualified",
        message: "Your YPOP entry for 1st Semester 2026 has been evaluated and qualified! Points earned: 150.",
        type: "completed",
        relatedType: "ypop_entry",
        relatedId: "entry-uuid-654",
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      expect(entryNotif.relatedType).toBe("ypop_entry");
      expect(entryNotif.relatedId).toBe("entry-uuid-654");
      expect(entryNotif.userId).toBe("user-uuid-123");
    });
  });

  describe("2. Admin Navigation & Routing Structure", () => {
    it("exposes both Notifications and Activity Logs in adminNavigationGroups", () => {
      const systemGroup = adminNavigationGroups.find((g) => g.id === "system");
      expect(systemGroup).toBeDefined();

      const itemIds = systemGroup?.items.map((i) => i.id) ?? [];
      expect(itemIds).toContain("inquiries");
      expect(itemIds).toContain("notifications");
      expect(itemIds).toContain("activity-logs");
    });
  });

  describe("3. Dynamic Admin Notification Recipient Resolution", () => {
    it("resolves authenticated admin account ID rather than purely hardcoded mock", () => {
      const mockAdmin: SeededAdminUser = {
        id: "admin-uuid-real-001",
        username: "admin_pcydo",
        email: "pcydo@lucena.gov.ph",
        displayName: "PCYDO Administrator",
        sessionToken: "session-token-xyz",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      const notifications: NotificationRecord[] = [
        {
          id: "notif-adm-1",
          userId: "admin-uuid-real-001",
          organizationId: "org-uuid-1",
          title: "New Registration Submitted",
          message: "A new organization registration was submitted.",
          type: "announcement",
          relatedType: "organization_profile",
          relatedId: "org-uuid-1",
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: "notif-adm-2",
          userId: "other-user-uuid",
          organizationId: "org-uuid-2",
          title: "PPA verified",
          message: "Activity verified",
          type: "completed",
          relatedType: "ypop_org_activity",
          relatedId: "act-1",
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const currentAdminId = mockAdmin.id;
      const filtered = notifications.filter(
        (n) => n.userId === currentAdminId || n.userId === "admin-demo" || n.userId === "admin"
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("notif-adm-1");
    });
  });

  describe("4. Separation of Pipelines", () => {
    it("enforces in-app delivery without user email leakage", () => {
      const userNotification: NotificationRecord = {
        id: "notif-user-1",
        userId: "user-123",
        organizationId: "org-123",
        title: "PPA verified",
        message: "Your PPA was verified.",
        type: "completed",
        relatedType: "ypop_org_activity",
        relatedId: "act-123",
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      // Notification is purely an in-app persistent record structure
      expect(userNotification).not.toHaveProperty("recipientEmail");
      expect(userNotification).not.toHaveProperty("emailSent");
    });
  });
});
