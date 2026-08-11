import { describe, expect, it } from "vitest";
import {
  activityLogExportConfig,
  getFriendlyAuditAction,
  getFriendlyAuditCategory,
  mapAuditLogToExportRow,
} from "@/lib/activity-log-export";
import { buildCsvContent } from "@/lib/report-export";
import type { ActivityLog } from "@/lib/lydo-connect-data";

const activity: ActivityLog = {
  id: "log-001",
  actorUserId: "admin-001",
  organizationId: "org-001",
  action: "approve_document_submission",
  relatedType: "document_submission",
  relatedId: "Constitution, By-Laws.pdf",
  description: '=Approved "Constitution"\nfor review.',
  createdAt: "2026-06-28T12:07:00.000Z",
};

describe("activity log export normalization", () => {
  it("keeps the PDF table within the printable A4 landscape width", () => {
    const totalWidth = activityLogExportConfig.columns.reduce(
      (sum, column) => sum + (column.pdfWidth ?? 0),
      0,
    );

    expect(totalWidth).toBe(769);
  });

  it("uses shared friendly labels and preserves traceability fields", () => {
    const row = mapAuditLogToExportRow(activity, {
      actor: "Administrator",
      organization: "Pasig Youth Council",
    });

    expect(row.action).toBe("Approved document submission");
    expect(row.category).toBe("Document");
    expect(row.logId).toBe("log-001");
    expect(row.affectedRecord).toBe("Constitution, By-Laws.pdf");
    expect(row.actor).toBe("Administrator");
    expect(row.organization).toBe("Pasig Youth Council");
  });

  it("falls back to readable title case for unknown values", () => {
    expect(getFriendlyAuditAction("custom_admin_update")).toBe("Custom Admin Update");
    expect(getFriendlyAuditCategory("special_record")).toBe("Special Record");
  });

  it("preserves quoted line breaks and neutralizes CSV formulas", () => {
    const csv = buildCsvContent({
      config: activityLogExportConfig,
      rows: [mapAuditLogToExportRow(activity)],
    });

    expect(csv).toContain("\"'=Approved \"\"Constitution\"\"\nfor review.\"");
    expect(csv).toContain('"Constitution, By-Laws.pdf"');
  });
});
