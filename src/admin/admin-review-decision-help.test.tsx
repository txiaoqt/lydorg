import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LiquidationStatusLabel } from "@/admin/components/LiquidationReportsTable";
import { StatusPill as BudgetStatusPill } from "@/admin/components/BudgetRequestsTable";

describe("Review Decision Help & Status Label UI Tests", () => {
  it("LiquidationStatusLabel renders 'Pending Review' with whitespace-nowrap preventing multi-line wrapping", () => {
    const { container } = render(<LiquidationStatusLabel status="submitted" />);
    const badge = screen.getByText("Pending Review");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("whitespace-nowrap");
    expect(badge.className).toContain("inline-flex");
    expect(badge.className).toContain("shrink-0");
  });

  it("LiquidationStatusLabel renders 'Approved — Onsite Required' with whitespace-nowrap", () => {
    render(<LiquidationStatusLabel status="approved_for_ftf_green" />);
    const badge = screen.getByText("Approved — Onsite Required");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("whitespace-nowrap");
  });

  it("BudgetStatusPill renders 'Pending Review' with whitespace-nowrap", () => {
    render(<BudgetStatusPill status="submitted" />);
    const pill = screen.getByText("Pending Review");
    expect(pill).toBeInTheDocument();
    expect(pill.className).toContain("whitespace-nowrap");
  });
});
