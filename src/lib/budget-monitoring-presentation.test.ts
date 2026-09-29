import { describe, expect, it } from "vitest";
import {
  deriveBudgetMonitoringMetrics,
  getBudgetExecutionSegmentWidths,
} from "./budget-monitoring-presentation";

describe("budget monitoring presentation metrics", () => {
  it("derives pending disbursement and remaining headroom from the canonical totals", () => {
    expect(
      deriveBudgetMonitoringMetrics({ allocation: 100, approved: 40, released: 10 }),
    ).toEqual({
      pendingDisbursement: 30,
      remainingHeadroom: 60,
      isDeficit: false,
      deficitAmount: 0,
    });
  });

  it("preserves allocation deficits instead of clamping the financial value", () => {
    expect(
      deriveBudgetMonitoringMetrics({ allocation: 50, approved: 65, released: 20 }),
    ).toEqual({
      pendingDisbursement: 45,
      remainingHeadroom: -15,
      isDeficit: true,
      deficitAmount: 15,
    });
  });

  it("keeps headroom unavailable until an annual allocation is configured", () => {
    expect(
      deriveBudgetMonitoringMetrics({ allocation: null, approved: 40, released: 10 }),
    ).toEqual({
      pendingDisbursement: 30,
      remainingHeadroom: null,
      isDeficit: false,
      deficitAmount: 0,
    });
  });

  it("uses one allocation denominator and clips deficit overflow only in the visual track", () => {
    expect(getBudgetExecutionSegmentWidths({
      releasedAndLiquidated: 21_213,
      pendingDisbursement: 23_443,
      remainingHeadroom: 105_344,
      totalAllocation: 150_000,
    })).toEqual({
      releasedAndLiquidated: (21_213 / 150_000) * 100,
      pendingDisbursement: (23_443 / 150_000) * 100,
      remainingHeadroom: (105_344 / 150_000) * 100,
    });
    expect(getBudgetExecutionSegmentWidths({
      releasedAndLiquidated: 20,
      pendingDisbursement: 45,
      remainingHeadroom: -15,
      totalAllocation: 50,
    })).toEqual({ releasedAndLiquidated: 40, pendingDisbursement: 60, remainingHeadroom: 0 });
    expect(getBudgetExecutionSegmentWidths({
      releasedAndLiquidated: 20,
      pendingDisbursement: 10,
      remainingHeadroom: null,
      totalAllocation: null,
    })).toEqual({ releasedAndLiquidated: 0, pendingDisbursement: 0, remainingHeadroom: 0 });
  });
});
