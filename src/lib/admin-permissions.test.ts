import { describe, expect, it } from "vitest";
import { hasAdminDashboardWidgetPermission, hasAdminNavPermission } from "@/lib/admin-permissions";

describe("administrator permission-scoped overview", () => {
  const configuredLimitedAdmin = [
    "registrations_management",
    "yorp_registry_view",
    "news_releases_management",
  ];

  it("shows only registration overview metrics for an admin with the configured three permissions", () => {
    expect(hasAdminDashboardWidgetPermission(configuredLimitedAdmin, "registrations", "admin")).toBe(true);
    for (const widget of ["ypop", "budgetRequests", "liquidations", "inquiries", "budgetMonitoring", "recentActivity"] as const) {
      expect(hasAdminDashboardWidgetPermission(configuredLimitedAdmin, widget, "admin")).toBe(false);
    }
  });

  it("updates visible metrics when an administrator receives a page permission", () => {
    const withYpopReview = [...configuredLimitedAdmin, "ypop_validation_review"];
    expect(hasAdminDashboardWidgetPermission(withYpopReview, "ypop", "admin")).toBe(true);
    expect(hasAdminDashboardWidgetPermission(withYpopReview, "inquiries", "admin")).toBe(false);
  });

  it("keeps review queues separate from budget monitoring read permissions", () => {
    const monitoringOnly = ["budget_monitoring_view"];
    expect(hasAdminDashboardWidgetPermission(monitoringOnly, "budgetRequests", "admin")).toBe(false);
    expect(hasAdminDashboardWidgetPermission(monitoringOnly, "liquidations", "admin")).toBe(false);
    expect(hasAdminDashboardWidgetPermission(monitoringOnly, "budgetMonitoring", "admin")).toBe(true);
    expect(hasAdminNavPermission(monitoringOnly, "budget-utilization", "admin")).toBe(false);
  });

  it("keeps Super Admin access even when its cached permission list is empty", () => {
    expect(hasAdminNavPermission([], "ypop-validation", "super_admin")).toBe(true);
    for (const widget of ["registrations", "ypop", "budgetRequests", "liquidations", "inquiries", "budgetMonitoring", "recentActivity"] as const) {
      expect(hasAdminDashboardWidgetPermission([], widget, "super_admin")).toBe(true);
    }
  });
});
