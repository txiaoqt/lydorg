import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { YpopSubmissionsTable, type YpopSubmissionRow } from "@/admin/components/YpopSubmissionsTable";

const rows: YpopSubmissionRow[] = [
  { id: "entry-a", organizationId: "org-a", organizationName: "Alpha Youth Org", referenceId: "YORP-001", majorClassification: "Community", status: "qualified" },
  { id: "entry-b", organizationId: "org-b", organizationName: "Beta Youth Org", referenceId: "YORP-002", majorClassification: "School-Based", status: "pending_evaluation" },
];

const renderTable = (onDelete = vi.fn()) => {
  const Harness = () => {
    const [selected, setSelected] = useState(new Set<string>());
    return (
      <YpopSubmissionsTable
        rows={rows}
        searchValue=""
        onSearchChange={vi.fn()}
        classificationFilter="all"
        onClassificationFilterChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onValidate={vi.fn()}
        selectedOrganizationIds={selected}
        onSelectedOrganizationIdsChange={setSelected}
        onDeleteSelected={onDelete}
      />
    );
  };
  return render(<Harness />);
};

describe("YPOP submission selection and deletion actions", () => {
  it("selects every visible organization and exposes the bulk delete action", () => {
    const onDelete = vi.fn();
    renderTable(onDelete);

    fireEvent.click(screen.getByRole("checkbox", { name: "Select all submissions on this page" }));

    expect(screen.getByText("2 submissions selected")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Select Alpha Youth Org" })).toHaveProperty("checked", true);
    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("lets an administrator select a single organization submission", () => {
    renderTable();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Beta Youth Org" }));
    expect(screen.getByText("1 submission selected")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Select Beta Youth Org" })).toHaveProperty("checked", true);
  });
});
