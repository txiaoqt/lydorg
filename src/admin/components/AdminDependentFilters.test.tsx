import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RegistrationsTable } from "./RegistrationsTable";
import { RenewalsTable } from "./RenewalsTable";
import { YorpRegistryTable } from "./YorpRegistryTable";
import { BudgetRequestsTable } from "./BudgetRequestsTable";
import { LiquidationReportsTable } from "./LiquidationReportsTable";

const DISTRICT_II_BARANGAYS = [
  "Santolan",
  "Dela Paz",
  "Manggahan",
  "Maybunga",
  "Pinagbuhatan",
  "Rosario",
  "San Miguel",
  "Sta. Lucia",
];

const DISTRICT_I_SAMPLE_BARANGAYS = [
  "Kapitolyo",
  "Bagong Ilog",
  "San Antonio",
  "Ugong",
  "San Nicolas",
];

const openMenu = (trigger: HTMLElement) => {
  fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
};

describe("Dependent District → Barangay Filters Across All 5 Admin Pages", () => {
  const tables = [
    {
      name: "RegistrationsTable",
      getComponent: (props: any) => (
        <RegistrationsTable
          registrations={[]}
          documentCountsByOrgId={{}}
          searchValue=""
          onSearchChange={vi.fn()}
          statusFilter="all"
          onStatusFilterChange={vi.fn()}
          classificationFilter="all"
          onClassificationFilterChange={vi.fn()}
          onReview={vi.fn()}
          {...props}
        />
      ),
      renderComponent: (props: any) =>
        render(
          <RegistrationsTable
            registrations={[]}
            documentCountsByOrgId={{}}
            searchValue=""
            onSearchChange={vi.fn()}
            statusFilter="all"
            onStatusFilterChange={vi.fn()}
            classificationFilter="all"
            onClassificationFilterChange={vi.fn()}
            onReview={vi.fn()}
            {...props}
          />
        ),
    },
    {
      name: "RenewalsTable",
      getComponent: (props: any) => (
        <RenewalsTable
          renewals={[]}
          searchValue=""
          onSearchChange={vi.fn()}
          statusFilter="all"
          onStatusFilterChange={vi.fn()}
          classificationFilter="all"
          onClassificationFilterChange={vi.fn()}
          onReview={vi.fn()}
          {...props}
        />
      ),
      renderComponent: (props: any) =>
        render(
          <RenewalsTable
            renewals={[]}
            searchValue=""
            onSearchChange={vi.fn()}
            statusFilter="all"
            onStatusFilterChange={vi.fn()}
            classificationFilter="all"
            onClassificationFilterChange={vi.fn()}
            onReview={vi.fn()}
            {...props}
          />
        ),
    },
    {
      name: "YorpRegistryTable",
      getComponent: (props: any) => (
        <YorpRegistryTable
          entries={[]}
          searchValue=""
          onSearchChange={vi.fn()}
          statusFilter="all"
          onStatusFilterChange={vi.fn()}
          classificationFilter="all"
          onClassificationFilterChange={vi.fn()}
          onView={vi.fn()}
          {...props}
        />
      ),
      renderComponent: (props: any) =>
        render(
          <YorpRegistryTable
            entries={[]}
            searchValue=""
            onSearchChange={vi.fn()}
            statusFilter="all"
            onStatusFilterChange={vi.fn()}
            classificationFilter="all"
            onClassificationFilterChange={vi.fn()}
            onView={vi.fn()}
            {...props}
          />
        ),
    },
    {
      name: "BudgetRequestsTable",
      getComponent: (props: any) => (
        <BudgetRequestsTable
          requests={[]}
          allRequests={[]}
          organizationsById={{}}
          searchValue=""
          onSearchChange={vi.fn()}
          statusFilter="all"
          onStatusFilterChange={vi.fn()}
          classificationFilter="all"
          onClassificationFilterChange={vi.fn()}
          onReview={vi.fn()}
          {...props}
        />
      ),
      renderComponent: (props: any) =>
        render(
          <BudgetRequestsTable
            requests={[]}
            allRequests={[]}
            organizationsById={{}}
            searchValue=""
            onSearchChange={vi.fn()}
            statusFilter="all"
            onStatusFilterChange={vi.fn()}
            classificationFilter="all"
            onClassificationFilterChange={vi.fn()}
            onReview={vi.fn()}
            {...props}
          />
        ),
    },
    {
      name: "LiquidationReportsTable",
      getComponent: (props: any) => (
        <LiquidationReportsTable
          reports={[]}
          allReports={[]}
          organizationsById={{}}
          budgetRequestsById={{}}
          allBudgetRequests={[]}
          searchValue=""
          onSearchChange={vi.fn()}
          statusFilter="all"
          onStatusFilterChange={vi.fn()}
          classificationFilter="all"
          onClassificationFilterChange={vi.fn()}
          onReview={vi.fn()}
          onOpenLinkedRequest={vi.fn()}
          {...props}
        />
      ),
      renderComponent: (props: any) =>
        render(
          <LiquidationReportsTable
            reports={[]}
            allReports={[]}
            organizationsById={{}}
            budgetRequestsById={{}}
            allBudgetRequests={[]}
            searchValue=""
            onSearchChange={vi.fn()}
            statusFilter="all"
            onStatusFilterChange={vi.fn()}
            classificationFilter="all"
            onClassificationFilterChange={vi.fn()}
            onReview={vi.fn()}
            onOpenLinkedRequest={vi.fn()}
            {...props}
          />
        ),
    },
  ];

  tables.forEach(({ name, renderComponent, getComponent }) => {
    describe(`${name}`, () => {
      // TEST A — ALL DISTRICTS
      it("TEST A — When District is All districts, Barangay dropdown contains all 30 barangays", () => {
        renderComponent({
          districtFilter: "all",
          onDistrictFilterChange: vi.fn(),
          barangayFilter: "all",
          onBarangayFilterChange: vi.fn(),
        });

        const barangayBtn = screen.getByRole("button", { name: /all barangays/i });
        openMenu(barangayBtn);

        const items = screen.getAllByRole("menuitem");
        // "All barangays" option + 30 barangays = 31 items
        expect(items).toHaveLength(31);
        expect(screen.getByRole("menuitem", { name: "All barangays" })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: "Kapitolyo" })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: "Santolan" })).toBeInTheDocument();
      });

      // TEST B — DISTRICT I
      it("TEST B — When District is District I, Barangay dropdown contains ONLY 22 District I barangays", () => {
        renderComponent({
          districtFilter: "District I",
          onDistrictFilterChange: vi.fn(),
          barangayFilter: "all",
          onBarangayFilterChange: vi.fn(),
        });

        const barangayBtn = screen.getByRole("button", { name: /all barangays/i });
        openMenu(barangayBtn);

        const items = screen.getAllByRole("menuitem");
        // "All barangays" + 22 District I barangays = 23 items
        expect(items).toHaveLength(23);

        // District I barangays MUST be present
        DISTRICT_I_SAMPLE_BARANGAYS.forEach((b) => {
          expect(screen.getByRole("menuitem", { name: b })).toBeInTheDocument();
        });

        // District II barangays MUST NOT appear
        DISTRICT_II_BARANGAYS.forEach((b) => {
          expect(screen.queryByRole("menuitem", { name: b })).not.toBeInTheDocument();
        });
      });

      // TEST C — DISTRICT II
      it("TEST C — When District is District II, Barangay dropdown contains ONLY 8 District II barangays", () => {
        renderComponent({
          districtFilter: "District II",
          onDistrictFilterChange: vi.fn(),
          barangayFilter: "all",
          onBarangayFilterChange: vi.fn(),
        });

        const barangayBtn = screen.getByRole("button", { name: /all barangays/i });
        openMenu(barangayBtn);

        const items = screen.getAllByRole("menuitem");
        // "All barangays" + 8 District II barangays = 9 items
        expect(items).toHaveLength(9);

        // District II barangays MUST be present
        DISTRICT_II_BARANGAYS.forEach((b) => {
          expect(screen.getByRole("menuitem", { name: b })).toBeInTheDocument();
        });

        // District I barangays MUST NOT appear
        DISTRICT_I_SAMPLE_BARANGAYS.forEach((b) => {
          expect(screen.queryByRole("menuitem", { name: b })).not.toBeInTheDocument();
        });
      });

      // TEST D — VALID BARANGAY PRESERVATION (District I + Kapitolyo -> All districts)
      it("TEST D — Preserves valid barangay when switching from District I to All districts", () => {
        const onDistrictChange = vi.fn();
        const onBarangayChange = vi.fn();

        renderComponent({
          districtFilter: "District I",
          onDistrictFilterChange: onDistrictChange,
          barangayFilter: "Kapitolyo",
          onBarangayFilterChange: onBarangayChange,
        });

        // Click District dropdown
        const districtBtn = screen.getByRole("button", { name: /district i/i });
        openMenu(districtBtn);

        // Select All districts
        const allDistrictsItem = screen.getByRole("menuitem", { name: /all districts/i });
        fireEvent.click(allDistrictsItem);

        expect(onDistrictChange).toHaveBeenCalledWith("all");
        // Barangay is still valid in "all", so onBarangayChange("all") should NOT be called
        expect(onBarangayChange).not.toHaveBeenCalled();
      });

      // TEST E — INVALID BARANGAY RESET (District II + Santolan -> District I)
      it("TEST E — Resets incompatible barangay to 'all' when switching from District II to District I", () => {
        const onDistrictChange = vi.fn();
        const onBarangayChange = vi.fn();

        renderComponent({
          districtFilter: "District II",
          onDistrictFilterChange: onDistrictChange,
          barangayFilter: "Santolan",
          onBarangayFilterChange: onBarangayChange,
        });

        const districtBtn = screen.getByRole("button", { name: /district ii/i });
        openMenu(districtBtn);

        const districtIItem = screen.getByRole("menuitem", { name: /^district i$/i });
        fireEvent.click(districtIItem);

        expect(onDistrictChange).toHaveBeenCalledWith("District I");
        // Santolan is invalid in District I, so onBarangayChange("all") must be triggered
        expect(onBarangayChange).toHaveBeenCalledWith("all");
      });

      // TEST F — REVERSE INVALID SWITCH (District I + Kapitolyo -> District II)
      it("TEST F — Resets incompatible barangay to 'all' when switching from District I to District II", () => {
        const onDistrictChange = vi.fn();
        const onBarangayChange = vi.fn();

        renderComponent({
          districtFilter: "District I",
          onDistrictFilterChange: onDistrictChange,
          barangayFilter: "Kapitolyo",
          onBarangayFilterChange: onBarangayChange,
        });

        const districtBtn = screen.getByRole("button", { name: /district i/i });
        openMenu(districtBtn);

        const districtIIItem = screen.getByRole("menuitem", { name: /^district ii$/i });
        fireEvent.click(districtIIItem);

        expect(onDistrictChange).toHaveBeenCalledWith("District II");
        // Kapitolyo is invalid in District II, so onBarangayChange("all") must be triggered
        expect(onBarangayChange).toHaveBeenCalledWith("all");
      });

      // TEST G — ALL → DISTRICT (All districts + Santolan -> District II)
      it("TEST G — Preserves valid barangay when switching from All districts to District II", () => {
        const onDistrictChange = vi.fn();
        const onBarangayChange = vi.fn();

        renderComponent({
          districtFilter: "all",
          onDistrictFilterChange: onDistrictChange,
          barangayFilter: "Santolan",
          onBarangayFilterChange: onBarangayChange,
        });

        const districtBtn = screen.getByRole("button", { name: /all districts/i });
        openMenu(districtBtn);

        const districtIIItem = screen.getByRole("menuitem", { name: /^district ii$/i });
        fireEvent.click(districtIIItem);

        expect(onDistrictChange).toHaveBeenCalledWith("District II");
        // Santolan is valid in District II, so onBarangayChange should NOT be called
        expect(onBarangayChange).not.toHaveBeenCalled();
      });

      // TEST H — DISTRICT → ALL (District I + Kapitolyo -> All districts)
      it("TEST H — Preserves selected barangay when switching from District I to All districts", () => {
        const onDistrictChange = vi.fn();
        const onBarangayChange = vi.fn();

        renderComponent({
          districtFilter: "District I",
          onDistrictFilterChange: onDistrictChange,
          barangayFilter: "Kapitolyo",
          onBarangayFilterChange: onBarangayChange,
        });

        const districtBtn = screen.getByRole("button", { name: /district i/i });
        openMenu(districtBtn);

        const allDistrictsItem = screen.getByRole("menuitem", { name: /all districts/i });
        fireEvent.click(allDistrictsItem);

        expect(onDistrictChange).toHaveBeenCalledWith("all");
        expect(onBarangayChange).not.toHaveBeenCalled();
      });

      // LAYOUT STABILITY CHECK
      it("maintains strict fixed trigger widths (156px and 180px) across district changes", () => {
        const { rerender } = renderComponent({
          districtFilter: "all",
          onDistrictFilterChange: vi.fn(),
          barangayFilter: "all",
          onBarangayFilterChange: vi.fn(),
        });

        let districtBtn = screen.getByRole("button", { name: /all districts/i });
        let barangayBtn = screen.getByRole("button", { name: /all barangays/i });
        expect(districtBtn.className).toContain("w-[156px]");
        expect(districtBtn.className).toContain("shrink-0");
        expect(barangayBtn.className).toContain("w-[180px]");
        expect(barangayBtn.className).toContain("shrink-0");

        // Switch to District I
        rerender(
          getComponent({
            districtFilter: "District I",
            onDistrictFilterChange: vi.fn(),
            barangayFilter: "all",
            onBarangayFilterChange: vi.fn(),
          })
        );
        districtBtn = screen.getByRole("button", { name: /district i/i });
        barangayBtn = screen.getByRole("button", { name: /all barangays/i });
        expect(districtBtn.className).toContain("w-[156px]");
        expect(districtBtn.className).toContain("shrink-0");
        expect(barangayBtn.className).toContain("w-[180px]");
        expect(barangayBtn.className).toContain("shrink-0");

        // Switch to District II
        rerender(
          getComponent({
            districtFilter: "District II",
            onDistrictFilterChange: vi.fn(),
            barangayFilter: "Santolan",
            onBarangayFilterChange: vi.fn(),
          })
        );
        districtBtn = screen.getByRole("button", { name: /district ii/i });
        barangayBtn = screen.getByRole("button", { name: /santolan/i });
        expect(districtBtn.className).toContain("w-[156px]");
        expect(districtBtn.className).toContain("shrink-0");
        expect(barangayBtn.className).toContain("w-[180px]");
        expect(barangayBtn.className).toContain("shrink-0");
      });
    });
  });
});
