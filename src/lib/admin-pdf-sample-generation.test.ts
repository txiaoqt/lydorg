import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  generateReportPdfDocument,
} from "@/lib/report-export";
import {
  yorpRegistryExportConfig,
  budgetRequestExportConfig,
  budgetMonitoringExportConfig,
  allocationByBarangayExportConfig,
  buildAllocationPdfTotalsRow,
  buildBudgetMonitoringPdfTotalsRow,
  buildBudgetRequestPdfTotalsRow,
  type BudgetRequestExportRow,
  type BudgetMonitoringExportRow,
  type AllocationByBarangayExportRow,
} from "@/lib/report-export-configs";
import {
  activityLogExportConfig,
  type ActivityLogExportRow,
} from "@/lib/activity-log-export";
import type { YorpRegistration } from "@/lib/lydo-connect-data";

const scratchDir = "C:\\Users\\Christopher x Angel\\.gemini\\antigravity-ide\\brain\\ad2ad959-7d14-4eae-bd6f-ad3ad5b92e58\\scratch";

describe("Admin PDF Export System - Sample Generation & Verification", () => {
  it("generates multi-page A4 portrait PDF for YORP Registry with official letterhead", async () => {
    const sampleYorpRows: YorpRegistration[] = Array.from({ length: 25 }, (_, i) => ({
      id: `yorp-${i + 1}`,
      organizationName: `Pasig Youth Leadership Council ${i + 1} for Community Development`,
      yorpUniqueRegistrationNumber: `YORP-2026-${String(i + 1).padStart(4, "0")}`,
      classification: i % 2 === 0 ? "Youth Organization" : "Youth Serving Organization",
      subClassification: i % 3 === 0 ? "Community-Based" : "School-Based",
      barangay: i % 2 === 0 ? "San Nicolas" : "Bagong Ilog",
      status: i % 3 === 0 ? "approved" : i % 3 === 1 ? "conditional" : "pending",
      complianceStatus: "Compliant",
      presidentName: `Juan Dela Cruz ${i + 1}`,
      officialContactNumber: `0917${String(i + 1).padStart(7, "0")}`,
      officialEmailAddress: `council.${i + 1}@pasigyouth.org.ph`,
      approvedAt: "2026-03-15T08:00:00.000Z",
      validUntil: "2029-03-15T08:00:00.000Z",
      createdAt: "2026-01-10T08:00:00.000Z",
      updatedAt: "2026-03-15T08:00:00.000Z",
    }));

    const doc = await generateReportPdfDocument({
      config: yorpRegistryExportConfig,
      rows: sampleYorpRows,
      metadataLines: [
        "Total Registered Organizations: 25",
        "Official Registry Status: Active FY 2026",
      ],
      filterSummaryLines: [
        "Classification: All Classifications",
        "Barangay: All Barangays",
      ],
    });

    const pageCount = doc.getNumberOfPages();
    expect(pageCount).toBeGreaterThan(1);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(595.28, 1);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(841.89, 1);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    fs.writeFileSync(path.join(scratchDir, "sample_yorp_registry.pdf"), pdfBuffer);
  });

  it("generates multi-page A4 portrait PDF for Budget Requests with official letterhead", async () => {
    const sampleBudgetRequests: BudgetRequestExportRow[] = Array.from({ length: 20 }, (_, i) => ({
      organizationName: `Organization Alpha ${i + 1}`,
      activity: `Youth Skills Training Seminar and Environmental Workshop Phase ${i + 1}`,
      approvedAmount: 25000 + i * 5000,
      releasedAmount: 20000 + i * 4000,
      releasedDate: "2026-06-15T08:00:00.000Z",
    }));

    const doc = await generateReportPdfDocument({
      config: budgetRequestExportConfig,
      rows: sampleBudgetRequests,
      metadataLines: [
        `Total Requests: ${sampleBudgetRequests.length}`,
        "Total Approved Amount: ₱745,000.00",
        "Total Released Amount: ₱596,000.00",
      ],
      filterSummaryLines: [
        "Status: Approved & Released",
        "Fiscal Year: 2026",
      ],
      totalsRow: buildBudgetRequestPdfTotalsRow(sampleBudgetRequests),
    });

    const pageCount = doc.getNumberOfPages();
    expect(pageCount).toBeGreaterThan(1);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(595.28, 1);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(841.89, 1);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    fs.writeFileSync(path.join(scratchDir, "sample_budget_requests.pdf"), pdfBuffer);
  });

  it("generates multi-page A4 portrait PDF for Budget Monitoring with official letterhead", async () => {
    const sampleMonitoringRows: BudgetMonitoringExportRow[] = Array.from({ length: 20 }, (_, i) => ({
      organizationName: `Youth Federation of Pasig Chapter ${i + 1}`,
      recordCode: `BR-2026-${String(i + 1).padStart(3, "0")}`,
      activity: `Community Outreach and Disaster Preparedness Training ${i + 1}`,
      approvedAmount: 50000,
      releasedAmount: 40000,
      remainingAmount: 10000,
      utilizationRate: 80,
      budgetStatus: "Partially Released",
      liquidationStatus: "Pending Liquidation",
      releaseDate: "2026-06-01T00:00:00.000Z",
      goSignalDate: "2026-06-05T00:00:00.000Z",
      deadlineAt: "2026-07-30T00:00:00.000Z",
      hardCopyAt: "2026-07-25T00:00:00.000Z",
      completedAt: "",
      remarks: "First tranche disbursed on schedule",
      riskLabel: i % 3 === 0 ? "High Risk" : i % 3 === 1 ? "Medium" : "Low Risk",
    }));

    const doc = await generateReportPdfDocument({
      config: budgetMonitoringExportConfig,
      rows: sampleMonitoringRows,
      metadataLines: [
        `Total Monitored Records: ${sampleMonitoringRows.length}`,
        "Total Approved Amount: ₱1,000,000.00",
        "Total Released Amount: ₱800,000.00",
        "Total Remaining Amount: ₱200,000.00",
      ],
      filterSummaryLines: [
        "Status: Active Monitoring",
        "District: All Districts",
      ],
      totalsRow: buildBudgetMonitoringPdfTotalsRow(sampleMonitoringRows),
    });

    const pageCount = doc.getNumberOfPages();
    expect(pageCount).toBeGreaterThan(1);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(595.28, 1);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(841.89, 1);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    fs.writeFileSync(path.join(scratchDir, "sample_budget_monitoring.pdf"), pdfBuffer);
  });

  it("generates multi-page A4 portrait PDF for Allocation by Barangay with official letterhead", async () => {
    const sampleAllocations: AllocationByBarangayExportRow[] = Array.from({ length: 30 }, (_, i) => ({
      district: i < 15 ? "District 1" : "District 2",
      barangay: `Barangay Sample ${i + 1}`,
      organizationNames: [
        `Youth Org Alpha ${i + 1}`,
        `Student Council Beta ${i + 1}`,
        `Community Sports Club ${i + 1}`,
      ],
      approvedAmount: 60000 + i * 2000,
      releasedAmount: 50000 + i * 1500,
    }));

    const doc = await generateReportPdfDocument({
      config: allocationByBarangayExportConfig,
      rows: sampleAllocations,
      metadataLines: [
        `Total Barangays: 30`,
        `Total Organizations: 90`,
        `Total Approved Amount: ₱2,670,000.00`,
        `Total Released Amount: ₱2,152,500.00`,
      ],
      filterSummaryLines: [
        "District: All Districts",
        "Barangay: All Barangays",
      ],
      totalsRow: buildAllocationPdfTotalsRow(sampleAllocations),
    });

    const pageCount = doc.getNumberOfPages();
    expect(pageCount).toBeGreaterThan(1);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(595.28, 1);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(841.89, 1);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    fs.writeFileSync(path.join(scratchDir, "sample_allocation_by_barangay.pdf"), pdfBuffer);
  });

  it("generates multi-page A4 portrait PDF for Activity Logs with official letterhead", async () => {
    const sampleLogs: ActivityLogExportRow[] = Array.from({ length: 25 }, (_, i) => ({
      logId: `LOG-${String(i + 1).padStart(4, "0")}`,
      date: "Jun 28, 2026",
      time: "14:32:00",
      action: i % 2 === 0 ? "Approved document submission" : "Updated budget request",
      category: i % 2 === 0 ? "Document" : "Budget",
      actor: "Administrator",
      organization: `Pasig Youth Council Chapter ${i + 1}`,
      affectedRecord: `Constitution_and_ByLaws_v${i + 1}.pdf`,
      description: `Administrative officer reviewed and approved the annual organizational submission documents for compliance verification and accredited endorsement.`,
    }));

    const doc = await generateReportPdfDocument({
      config: activityLogExportConfig,
      rows: sampleLogs,
      metadataLines: [
        `Total Audit Entries: ${sampleLogs.length}`,
        "Date Range: Jun 01, 2026 to Jun 30, 2026",
      ],
      filterSummaryLines: [
        "Category: All Categories",
        "Actor: All Roles",
      ],
    });

    const pageCount = doc.getNumberOfPages();
    expect(pageCount).toBeGreaterThan(1);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(595.28, 1);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(841.89, 1);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    fs.writeFileSync(path.join(scratchDir, "sample_activity_logs.pdf"), pdfBuffer);
  });
});
