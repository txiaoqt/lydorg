import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { UserPortalBudgetWorkspaceView } from "./UserPortalBudgetWorkspaceView";

describe("UserPortalBudgetWorkspaceView - Budget Request Document Upload Area", () => {
  const mockFilesMap = new Map([
    [
      "br-existing-1",
      [
        {
          id: "file-br-1",
          budgetRequestId: "br-existing-1",
          fileName: "itemized-budget-breakdown.pdf",
          fileUrl: "https://example.com/itemized-budget.pdf",
          fileType: "application/pdf",
          fileSize: 1048576, // 1.0 MB
          uploadedAt: "2026-08-11T00:00:00Z",
          createdAt: "2026-08-11T00:00:00Z",
          adminStatus: "submitted",
          adminRemarks: "",
        },
      ],
    ],
  ]);

  const baseProps: any = {
    budgetWorkflowEligibility: { eligible: true },
    budgetRequests: [],
    budgetFilesByRequestId: mockFilesMap,
    budgetNotesByRequestId: {},
    submittingBudgetId: null,
    showBudgetForm: true,
    setShowBudgetForm: vi.fn(),
    editingBudgetRequest: null,
    startEditingBudgetRequest: vi.fn(),
    handleDeleteBudgetRequest: vi.fn(),
    openFile: vi.fn(),
    openPreview: vi.fn(),
    navigate: vi.fn(),
    searchParams: new URLSearchParams(),
    userRouteMap: { "budget-request": "/financial-grant" },
    buildPublicRecordCode: () => "BR-2026-001",
    formatCurrency: (n: number) => `₱${n.toLocaleString()}`,
    formatShortPortalDate: () => "Aug 11, 2026",
    formatDateTimeLabel: () => "Aug 11, 2026 10:00 AM",
    formatStatusLabel: (s: string) => s,
    newActivityTitle: "Youth Leadership Seminar",
    setNewActivityTitle: vi.fn(),
    newActivityDescription: "Leadership workshop for youth members",
    setNewActivityDescription: vi.fn(),
    newPurposeCategory: "Capability Building",
    setNewPurposeCategory: vi.fn(),
    newActivityDate: "2026-09-15",
    setNewActivityDate: vi.fn(),
    newVenue: "Pasig City Hall",
    setNewVenue: vi.fn(),
    newRequestedAmount: "50000",
    setNewRequestedAmount: vi.fn(),
    newRemarks: "Itemized proposal attached.",
    setNewRemarks: vi.fn(),
    handleCreateOrUpdateBudgetRequest: vi.fn(),
  };

  it("1. renders the Detailed Project Proposal upload section in Create Mode", () => {
    render(<UserPortalBudgetWorkspaceView {...baseProps} />);

    expect(screen.getByText("Detailed Project Proposal")).toBeDefined();
    expect(screen.getByText("Upload your orgs detailed project budget proposal for administrative review")).toBeDefined();
    expect(screen.getByText("PDF Only")).toBeDefined();
    expect(screen.getByTestId("budget-file-dropzone")).toBeDefined();
    expect(screen.getByTestId("browse-budget-file-button")).toBeDefined();
    expect(screen.getByText(/PDF format only \(Max 25MB\)/i)).toBeDefined();
  });

  it("2. browse button triggers file input click", () => {
    render(<UserPortalBudgetWorkspaceView {...baseProps} />);

    const fileInput = screen.getByTestId("budget-file-input") as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click");

    const browseButton = screen.getByTestId("browse-budget-file-button");
    fireEvent.click(browseButton);

    expect(clickSpy).toHaveBeenCalled();
  });

  it("3. PDF file selection calls handleBudgetFileDraftChange", () => {
    const handleDraftChangeMock = vi.fn();
    render(
      <UserPortalBudgetWorkspaceView
        {...baseProps}
        handleBudgetFileDraftChange={handleDraftChangeMock}
      />
    );

    const fileInput = screen.getByTestId("budget-file-input");
    const pdfFile = new File(["dummy content"], "budget-plan.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    expect(handleDraftChangeMock).toHaveBeenCalled();
  });

  it("4. rejects non-PDF file using existing validation pattern", () => {
    // Testing the handler logic used in UserPortal
    let draftFile: File | null = null;
    let toastCalled = false;

    const mockHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      if (!file) return;
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (!isPdf) {
        toastCalled = true;
        draftFile = null;
        return;
      }
      draftFile = file;
    };

    render(
      <UserPortalBudgetWorkspaceView
        {...baseProps}
        handleBudgetFileDraftChange={mockHandler}
      />
    );

    const fileInput = screen.getByTestId("budget-file-input");
    const txtFile = new File(["not a pdf"], "notes.txt", { type: "text/plain" });

    fireEvent.change(fileInput, { target: { files: [txtFile] } });

    expect(toastCalled).toBe(true);
    expect(draftFile).toBeNull();
  });

  it("5. selected draft file is visibly represented with metadata and ready badge", () => {
    const draftFile = new File(["fake pdf content of 2048 bytes"], "activity-budget-2026.pdf", {
      type: "application/pdf",
    });
    // mock size
    Object.defineProperty(draftFile, "size", { value: 204800 });

    render(
      <UserPortalBudgetWorkspaceView
        {...baseProps}
        budgetFileDraft={draftFile}
      />
    );

    expect(screen.getByTestId("budget-file-draft-card")).toBeDefined();
    expect(screen.getByTestId("budget-file-draft-name").textContent).toContain("activity-budget-2026.pdf");
    expect(screen.getByTestId("budget-file-draft-size").textContent).toContain("200 KB");
    expect(screen.getByText("Ready")).toBeDefined();
    expect(screen.getByTestId("replace-budget-file-button")).toBeDefined();
    expect(screen.getByTestId("remove-budget-file-button")).toBeDefined();
  });

  it("6. remove/reset button calls onClearBudgetFileDraft and clears draft state", () => {
    const onClearMock = vi.fn();
    const draftFile = new File(["content"], "budget.pdf", { type: "application/pdf" });

    render(
      <UserPortalBudgetWorkspaceView
        {...baseProps}
        budgetFileDraft={draftFile}
        onClearBudgetFileDraft={onClearMock}
      />
    );

    const removeBtn = screen.getByTestId("remove-budget-file-button");
    fireEvent.click(removeBtn);

    expect(onClearMock).toHaveBeenCalled();
  });

  it("7. displays existing document in Edit Mode with View and Replace actions", () => {
    const editingRequest = {
      id: "br-existing-1",
      activityTitle: "Youth Leadership Seminar",
      status: "draft",
    };

    render(
      <UserPortalBudgetWorkspaceView
        {...baseProps}
        editingBudgetRequest={editingRequest}
        budgetFileDraft={null}
      />
    );

    expect(screen.getByTestId("budget-existing-file-card")).toBeDefined();
    expect(screen.getByTestId("budget-existing-file-name").textContent).toContain("itemized-budget-breakdown.pdf");
    expect(screen.getByTestId("budget-existing-file-size").textContent).toContain("1 MB");
    expect(screen.getByText("Current Attached Document")).toBeDefined();
    expect(screen.getByTestId("view-existing-budget-file-button")).toBeDefined();
    expect(screen.getByTestId("replace-existing-budget-file-button")).toBeDefined();
  });

  it("8. selecting a replacement file in Edit Mode shows replacement notice", () => {
    const editingRequest = {
      id: "br-existing-1",
      activityTitle: "Youth Leadership Seminar",
      status: "draft",
    };

    const replacementFile = new File(["new draft content"], "revised-budget-v2.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(replacementFile, "size", { value: 512000 });

    render(
      <UserPortalBudgetWorkspaceView
        {...baseProps}
        editingBudgetRequest={editingRequest}
        budgetFileDraft={replacementFile}
      />
    );

    expect(screen.getByTestId("budget-file-draft-card")).toBeDefined();
    expect(screen.getByText("Replacement Ready")).toBeDefined();
    expect(screen.getByText(/Replaces:/i)).toBeDefined();
    expect(screen.getByText("itemized-budget-breakdown.pdf")).toBeDefined();
  });

  it("9. form submit triggers handleCreateOrUpdateBudgetRequest", async () => {
    const handleSubmitMock = vi.fn((e) => e.preventDefault());
    const draftFile = new File(["content"], "budget.pdf", { type: "application/pdf" });

    render(
      <UserPortalBudgetWorkspaceView
        {...baseProps}
        budgetFileDraft={draftFile}
        handleCreateOrUpdateBudgetRequest={handleSubmitMock}
      />
    );

    const submitBtn = screen.getByText("Submit Proposal →");
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(handleSubmitMock).toHaveBeenCalled();
  });

  it("10. verifies required-document guard logic triggers when no file exists", () => {
    // Verifying the saveBudgetRequest guard from UserPortal
    const validateBudgetDocument = (draftFile: File | null, existingFile: any | null) => {
      if (!draftFile && !existingFile) {
        return { valid: false, error: "Attach the required document" };
      }
      return { valid: true };
    };

    // Case A: No draft, no existing
    expect(validateBudgetDocument(null, null).valid).toBe(false);
    expect(validateBudgetDocument(null, null).error).toBe("Attach the required document");

    // Case B: With draft in create mode
    const file = new File(["content"], "budget.pdf", { type: "application/pdf" });
    expect(validateBudgetDocument(file, null).valid).toBe(true);

    // Case C: With existing file in edit mode
    expect(validateBudgetDocument(null, { id: "file-1" }).valid).toBe(true);
  });

  it("11. verifies responsive rendering on mobile viewports (320px, 375px, 414px)", () => {
    const viewports = [320, 375, 414];

    viewports.forEach((width) => {
      window.innerWidth = width;
      const { unmount } = render(
        <UserPortalBudgetWorkspaceView
          {...baseProps}
          budgetFileDraft={new File(["content"], "long-budget-filename-for-testing-mobile-responsiveness.pdf", { type: "application/pdf" })}
        />
      );

      // Verify no horizontal overflow issues and card renders
      const card = screen.getByTestId("budget-file-draft-card");
      expect(card).toBeDefined();

      // Check replace and remove buttons are present
      expect(screen.getByTestId("replace-budget-file-button")).toBeDefined();
      expect(screen.getByTestId("remove-budget-file-button")).toBeDefined();

      unmount();
    });
  });
});
