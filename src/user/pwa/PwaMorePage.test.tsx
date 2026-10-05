import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PwaMorePage } from "./PwaMorePage";

describe("PwaMorePage", () => {
  it("does not render Organization Directory in Resources section", () => {
    render(
      <MemoryRouter>
        <PwaMorePage onSignOut={vi.fn()} />
      </MemoryRouter>
    );

    // Verify Organization Directory is removed
    expect(screen.queryByText("Organization Directory")).not.toBeInTheDocument();
    expect(screen.queryByText("Discover verified youth organizations")).not.toBeInTheDocument();

    // Verify remaining Resources links still exist
    expect(screen.getByText("Resources")).toBeInTheDocument();
    expect(screen.getByText("Templates")).toBeInTheDocument();
    expect(screen.getByText("News Releases")).toBeInTheDocument();

    // Verify other groups still exist
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Organization Profile")).toBeInTheDocument();
    expect(screen.getByText("Programs")).toBeInTheDocument();
    expect(screen.getByText("YPOP Validation")).toBeInTheDocument();
    expect(screen.getByText("Help & Support")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
  });
});
