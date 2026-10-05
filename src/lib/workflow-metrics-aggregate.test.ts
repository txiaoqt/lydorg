import { describe, expect, it } from "vitest";
import {
  computeBudgetWorkflowMetricsFromStatusCounts,
  computeLiquidationWorkflowMetricsFromStatusCounts,
} from "./workflow-metrics";

describe("organization dashboard aggregate metrics", () => {
  it("calculates exact budget totals from database status counts beyond the recent window", () => {
    const metrics = computeBudgetWorkflowMetricsFromStatusCounts({
      budget_released: 120,
      needs_revision: 3,
      draft: 877,
    }, 1000);

    expect(metrics.totalRequests).toBe(1000);
    expect(metrics.releasedCount).toBe(120);
    expect(metrics.needsRevisionCount).toBe(3);
    expect(metrics.completionPercent).toBe(12);
    expect(metrics.overviewLabel).toBe("3 Needs Action");
  });

  it("calculates exact liquidation totals from database status counts beyond the recent window", () => {
    const metrics = computeLiquidationWorkflowMetricsFromStatusCounts({
      completed_liquidated: 830,
      submitted: 120,
      needs_revision: 25,
      not_started: 25,
    }, 1000);

    expect(metrics.totalReports).toBe(1000);
    expect(metrics.completedCount).toBe(830);
    expect(metrics.underReviewCount).toBe(120);
    expect(metrics.needsRevisionCount).toBe(25);
    expect(metrics.completionPercent).toBe(83);
    expect(metrics.overviewLabel).toBe("120 Under Review");
  });
});
