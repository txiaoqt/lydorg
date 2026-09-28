import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { YorpRegistryExportDialog } from "./YorpRegistryExportDialog";
import {
  DEFAULT_YORP_REGISTRY_COLUMN_KEYS,
  YORP_REGISTRY_AVAILABLE_COLUMNS,
  YORP_REGISTRY_REQUIRED_COLUMN_KEYS,
} from "@/lib/report-export-configs";

describe("YorpRegistryExportDialog Per-Section Controls & Required Fields Option", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    recordCount: 42,
    selectedSemesterLabel: "1st Semester (Jan - Jun 2026)",
    onExport: vi.fn(),
  };

  it("A. Initial state: loads default 10 columns and required switch is OFF", () => {
    render(<YorpRegistryExportDialog {...defaultProps} />);

    expect(screen.getByText("Export YORP Registry")).toBeInTheDocument();
    expect(
      screen.getByText(
        `${DEFAULT_YORP_REGISTRY_COLUMN_KEYS.length} of ${YORP_REGISTRY_AVAILABLE_COLUMNS.length} selected`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/records matching active filters/i)).toBeInTheDocument();

    const requiredSwitch = screen.getByRole("switch", { name: /always include required fields/i });
    expect(requiredSwitch).toBeInTheDocument();
    expect(requiredSwitch).toHaveAttribute("aria-checked", "false");
  });

  it("B. Section Select all: selecting one section affects only that section's fields", () => {
    render(<YorpRegistryExportDialog {...defaultProps} />);

    // Clear all first to start from 0
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByText(`0 of ${YORP_REGISTRY_AVAILABLE_COLUMNS.length} selected`)).toBeInTheDocument();

    // Find the Identification section's select all checkbox
    const selectAllIdentification = screen.getByRole("checkbox", {
      name: /select all identification columns/i,
    });
    expect(selectAllIdentification).not.toBeChecked();

    // Click select all on Identification (4 columns: No., Org Name, URN, Reference ID)
    fireEvent.click(selectAllIdentification);

    expect(screen.getByText(`4 of ${YORP_REGISTRY_AVAILABLE_COLUMNS.length} selected`)).toBeInTheDocument();
    expect(screen.getByText("4/4")).toBeInTheDocument();
    expect(selectAllIdentification).toBeChecked();

    // Other section counters remain 0
    expect(screen.getByText("0/5")).toBeInTheDocument(); // Organization details
    expect(screen.getByText("0/6")).toBeInTheDocument(); // Contact & Location
    expect(screen.getByText("0/4")).toBeInTheDocument(); // Registration
  });

  it("C. Section partial state: partial selection sets indeterminate state", () => {
    render(<YorpRegistryExportDialog {...defaultProps} />);

    // Clear all
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    const selectAllIdentification = screen.getByRole("checkbox", {
      name: /select all identification columns/i,
    }) as HTMLInputElement;
    expect(selectAllIdentification.checked).toBe(false);
    expect(selectAllIdentification.indeterminate).toBe(false);

    // Select just Reference ID
    const refIdCheckbox = screen.getByRole("checkbox", { name: "Reference ID" });
    fireEvent.click(refIdCheckbox);

    expect(screen.getByText("1/4")).toBeInTheDocument();
    expect(selectAllIdentification.checked).toBe(false);
    expect(selectAllIdentification.indeterminate).toBe(true);
  });

  it("D. Section deselect: deselecting a section clears its fields", () => {
    render(<YorpRegistryExportDialog {...defaultProps} />);

    // Global select all
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(
      screen.getByText(
        `${YORP_REGISTRY_AVAILABLE_COLUMNS.length} of ${YORP_REGISTRY_AVAILABLE_COLUMNS.length} selected`,
      ),
    ).toBeInTheDocument();

    const selectAllRegistration = screen.getByRole("checkbox", {
      name: /select all registration columns/i,
    });
    expect(selectAllRegistration).toBeChecked();

    // Deselect Registration section (4 columns)
    fireEvent.click(selectAllRegistration);

    expect(screen.getByText("0/4")).toBeInTheDocument();
    expect(selectAllRegistration).not.toBeChecked();
    expect(
      screen.getByText(
        `${YORP_REGISTRY_AVAILABLE_COLUMNS.length - 4} of ${YORP_REGISTRY_AVAILABLE_COLUMNS.length} selected`,
      ),
    ).toBeInTheDocument();
  });

  it("E. Global Select all selects every exportable column", () => {
    render(<YorpRegistryExportDialog {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Select all" }));

    expect(
      screen.getByText(
        `${YORP_REGISTRY_AVAILABLE_COLUMNS.length} of ${YORP_REGISTRY_AVAILABLE_COLUMNS.length} selected`,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("4/4").length).toBe(2); // Identification and Registration
    expect(screen.getByText("5/5")).toBeInTheDocument();
    expect(screen.getByText("6/6")).toBeInTheDocument();
  });

  it("F. Global Clear all clears everything when required mode is OFF", () => {
    render(<YorpRegistryExportDialog {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    expect(screen.getByText(`0 of ${YORP_REGISTRY_AVAILABLE_COLUMNS.length} selected`)).toBeInTheDocument();
    expect(screen.getByText("Select at least one column to generate an export.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Export" })).toBeDisabled();
  });

  it("G. Required mode ON: No., Organization Name, URN become locked and marked Required", () => {
    render(<YorpRegistryExportDialog {...defaultProps} />);

    // Clear all first
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByText(`0 of ${YORP_REGISTRY_AVAILABLE_COLUMNS.length} selected`)).toBeInTheDocument();

    // Turn required mode ON
    const requiredSwitch = screen.getByRole("switch", { name: /always include required fields/i });
    fireEvent.click(requiredSwitch);
    expect(requiredSwitch).toHaveAttribute("aria-checked", "true");

    // 3 required fields automatically selected
    expect(screen.getByText(`3 of ${YORP_REGISTRY_AVAILABLE_COLUMNS.length} selected`)).toBeInTheDocument();
    expect(screen.getByText("3/4")).toBeInTheDocument(); // Identification has 3 of 4 selected

    // Check that No., Organization Name, URN have "Required" badges and disabled checkboxes
    const noCheckbox = screen.getByRole("checkbox", { name: "No." });
    const nameCheckbox = screen.getByRole("checkbox", { name: "Organization Name" });
    const urnCheckbox = screen.getByRole("checkbox", { name: "URN" });

    expect(noCheckbox).toBeChecked();
    expect(noCheckbox).toBeDisabled();
    expect(nameCheckbox).toBeChecked();
    expect(nameCheckbox).toBeDisabled();
    expect(urnCheckbox).toBeChecked();
    expect(urnCheckbox).toBeDisabled();

    expect(screen.getAllByText("Required").length).toBe(3);
  });

  it("H. Required mode + Clear all: clears optional fields while preserving required fields", () => {
    render(<YorpRegistryExportDialog {...defaultProps} />);

    // Enable required mode
    const requiredSwitch = screen.getByRole("switch", { name: /always include required fields/i });
    fireEvent.click(requiredSwitch);

    // Global select all (19/19)
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(
      screen.getByText(
        `${YORP_REGISTRY_AVAILABLE_COLUMNS.length} of ${YORP_REGISTRY_AVAILABLE_COLUMNS.length} selected`,
      ),
    ).toBeInTheDocument();

    // Click Clear all
    const clearAllBtn = screen.getByRole("button", { name: "Clear all" });
    fireEvent.click(clearAllBtn);

    // 3 required fields remain selected
    expect(screen.getByText(`3 of ${YORP_REGISTRY_AVAILABLE_COLUMNS.length} selected`)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "No." })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Organization Name" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "URN" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Reference ID" })).not.toBeChecked();

    // Clear all button becomes disabled since only required fields are left
    expect(clearAllBtn).toBeDisabled();
  });

  it("I. Required mode + Section deselect: clears optional fields in that section but preserves required fields", () => {
    render(<YorpRegistryExportDialog {...defaultProps} />);

    // Enable required mode
    const requiredSwitch = screen.getByRole("switch", { name: /always include required fields/i });
    fireEvent.click(requiredSwitch);

    // Select all identification columns (4/4)
    const selectAllIdentification = screen.getByRole("checkbox", {
      name: /select all identification columns/i,
    });
    fireEvent.click(selectAllIdentification);
    expect(screen.getByText("4/4")).toBeInTheDocument();
    expect(selectAllIdentification).toBeChecked();

    // Now click section control again to deselect
    fireEvent.click(selectAllIdentification);

    // Identification should have 3/4 selected (No., Org Name, URN) and Reference ID deselected
    expect(screen.getByText("3/4")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Reference ID" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "No." })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Organization Name" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "URN" })).toBeChecked();
  });

  it("J. Required mode + manual checkbox click: required fields cannot be deselected", () => {
    render(<YorpRegistryExportDialog {...defaultProps} />);

    const requiredSwitch = screen.getByRole("switch", { name: /always include required fields/i });
    fireEvent.click(requiredSwitch);

    const urnCheckbox = screen.getByRole("checkbox", { name: "URN" });
    expect(urnCheckbox).toBeChecked();
    expect(urnCheckbox).toBeDisabled();

    // Attempting to click does not uncheck it
    fireEvent.click(urnCheckbox);
    expect(urnCheckbox).toBeChecked();
  });

  it("K. Required mode OFF: returns fields to normally selectable behavior without losing selection", () => {
    render(<YorpRegistryExportDialog {...defaultProps} />);

    const requiredSwitch = screen.getByRole("switch", { name: /always include required fields/i });
    fireEvent.click(requiredSwitch); // ON
    expect(requiredSwitch).toHaveAttribute("aria-checked", "true");

    fireEvent.click(requiredSwitch); // OFF
    expect(requiredSwitch).toHaveAttribute("aria-checked", "false");

    const urnCheckbox = screen.getByRole("checkbox", { name: "URN" });
    expect(urnCheckbox).not.toBeDisabled();
    expect(urnCheckbox).toBeChecked();

    // Can now manually deselect URN
    fireEvent.click(urnCheckbox);
    expect(urnCheckbox).not.toBeChecked();
  });

  it("L. Reset to default preserves default columns and guarantees required fields when required mode is ON", () => {
    render(<YorpRegistryExportDialog {...defaultProps} />);

    const requiredSwitch = screen.getByRole("switch", { name: /always include required fields/i });
    fireEvent.click(requiredSwitch);

    // Global clear all (only 3 required left)
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByText(`3 of ${YORP_REGISTRY_AVAILABLE_COLUMNS.length} selected`)).toBeInTheDocument();

    // Click Reset to default
    fireEvent.click(screen.getByRole("button", { name: /reset to default/i }));

    // Restores default 10 columns
    expect(
      screen.getByText(
        `${DEFAULT_YORP_REGISTRY_COLUMN_KEYS.length} of ${YORP_REGISTRY_AVAILABLE_COLUMNS.length} selected`,
      ),
    ).toBeInTheDocument();
  });

  it("M. Generate Export invokes onExport with normalized selected column keys and page config", async () => {
    const onExportMock = vi.fn().mockResolvedValue(undefined);
    const onOpenChangeMock = vi.fn();

    render(
      <YorpRegistryExportDialog
        {...defaultProps}
        onExport={onExportMock}
        onOpenChange={onOpenChangeMock}
      />,
    );

    // Enable required mode
    const requiredSwitch = screen.getByRole("switch", { name: /always include required fields/i });
    fireEvent.click(requiredSwitch);

    // Click Generate Export
    const generateBtn = screen.getByRole("button", { name: /generate export/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(onExportMock).toHaveBeenCalledTimes(1);
    });

    const [format, exportedKeys, pageConfig] = onExportMock.mock.calls[0];

    expect(format).toBe("pdf");
    expect(pageConfig).toEqual({ paperSize: "a4", orientation: "landscape" });
    // Verify required keys are guaranteed in exportedKeys
    for (const requiredKey of YORP_REGISTRY_REQUIRED_COLUMN_KEYS) {
      expect(exportedKeys).toContain(requiredKey);
    }
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });
});
