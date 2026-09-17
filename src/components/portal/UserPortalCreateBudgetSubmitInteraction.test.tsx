import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { UserPortalBudgetWorkspaceView, UserPortalBudgetWorkspaceViewProps } from "./UserPortalBudgetWorkspaceView";

describe("UserPortal - Create Budget Request Submit Interaction & UI Polish", () => {
  const defaultBaseProps: UserPortalBudgetWorkspaceViewProps = {
    budgetWorkflowEligibility: { eligible: true, requirements: [] },
    budgetRequests: [],
    budgetFilesByRequestId: new Map(),
    budgetNotesByRequestId: {},
    submittingBudgetId: null,
    showBudgetForm: true,
    setShowBudgetForm: vi.fn(),
    editingBudgetRequest: null,
    startEditingBudgetRequest: vi.fn(),
    handleDeleteBudgetRequest: vi.fn(),
    openPreview: vi.fn(),
    openFile: vi.fn(),
    navigate: vi.fn(),
    searchParams: new URLSearchParams(),
    userRouteMap: { "budget-request": "/user/budget-request" },
    buildPublicRecordCode: () => "BR-2026-001",
    formatCurrency: (val: number) => `₱${val.toLocaleString()}`,
    formatShortPortalDate: () => "Sep 17, 2026",
    formatDateTimeLabel: () => "Sep 17, 2026, 5:00 PM",
    formatStatusLabel: (status: string) => status.toUpperCase(),
    newActivityTitle: "Youth Environmental Summit 2026",
    setNewActivityTitle: vi.fn(),
    newActivityDescription: "Community tree planting and environmental leadership workshop",
    setNewActivityDescription: vi.fn(),
    newPurposeCategory: "Environmental Protection & Climate Action",
    setNewPurposeCategory: vi.fn(),
    newActivityDate: "2026-10-15",
    setNewActivityDate: vi.fn(),
    newVenue: "Pasig Rainforest Park",
    setNewVenue: vi.fn(),
    newRequestedAmount: "75000",
    setNewRequestedAmount: vi.fn(),
    newRemarks: "Proposal and estimated supplier costs attached.",
    setNewRemarks: vi.fn(),
    handleCreateOrUpdateBudgetRequest: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("A. Submit Loading State & Immediate Feedback", () => {
    it("immediately transitions button to 'Submitting Proposal...' with spinner and disabled state", async () => {
      let resolveSubmission: () => void = () => {};
      const submissionPromise = new Promise<void>((resolve) => {
        resolveSubmission = resolve;
      });
      const handleSubmitMock = vi.fn().mockReturnValue(submissionPromise);

      render(
        <UserPortalBudgetWorkspaceView
          {...defaultBaseProps}
          handleCreateOrUpdateBudgetRequest={handleSubmitMock}
        />
      );

      const submitButton = screen.getByTestId("submit-budget-proposal-button");
      expect(submitButton).toHaveTextContent("Submit Proposal →");
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveAttribute("aria-busy", "false");

      // Click submit
      await act(async () => {
        fireEvent.click(submitButton);
      });

      // Verification: Immediately in submitting state
      expect(handleSubmitMock).toHaveBeenCalledTimes(1);
      expect(submitButton).toHaveTextContent("Submitting Proposal...");
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveAttribute("aria-busy", "true");

      // Verify spinner is rendered inside the button
      const spinner = submitButton.querySelector(".animate-spin");
      expect(spinner).not.toBeNull();

      // Resolve async operation
      await act(async () => {
        resolveSubmission();
      });

      // Verification: Restored after resolution
      expect(submitButton).toHaveTextContent("Submit Proposal →");
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveAttribute("aria-busy", "false");
    });

    it("prevents duplicate submissions on rapid repeated clicks", async () => {
      let resolveSubmission: () => void = () => {};
      const submissionPromise = new Promise<void>((resolve) => {
        resolveSubmission = resolve;
      });
      const handleSubmitMock = vi.fn().mockReturnValue(submissionPromise);

      render(
        <UserPortalBudgetWorkspaceView
          {...defaultBaseProps}
          handleCreateOrUpdateBudgetRequest={handleSubmitMock}
        />
      );

      const submitButton = screen.getByTestId("submit-budget-proposal-button");

      // First click
      await act(async () => {
        fireEvent.click(submitButton);
      });
      expect(handleSubmitMock).toHaveBeenCalledTimes(1);

      // Rapid successive clicks while submission is in-flight
      await act(async () => {
        fireEvent.click(submitButton);
        fireEvent.click(submitButton);
        fireEvent.click(submitButton);
      });

      // Still only called once
      expect(handleSubmitMock).toHaveBeenCalledTimes(1);

      // Resolve
      await act(async () => {
        resolveSubmission();
      });
    });

    it("preserves stable layout dimensions without width jump (sm:min-w-[190px])", () => {
      render(<UserPortalBudgetWorkspaceView {...defaultBaseProps} />);

      const submitButton = screen.getByTestId("submit-budget-proposal-button");
      expect(submitButton.className).toContain("sm:min-w-[190px]");
      expect(submitButton.className).toContain("h-10");
    });
  });

  describe("B. Success Behavior", () => {
    it("clears loading state cleanly upon successful submission", async () => {
      const handleSubmitMock = vi.fn().mockResolvedValue(undefined);

      render(
        <UserPortalBudgetWorkspaceView
          {...defaultBaseProps}
          handleCreateOrUpdateBudgetRequest={handleSubmitMock}
        />
      );

      const submitButton = screen.getByTestId("submit-budget-proposal-button");

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(handleSubmitMock).toHaveBeenCalledWith(expect.anything(), false);
      expect(submitButton).toHaveTextContent("Submit Proposal →");
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("C. Failure Safety & Error Recovery", () => {
    it("releases loading state and re-enables button if submission fails or rejects", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const handleSubmitMock = vi.fn().mockRejectedValue(new Error("Network timeout"));

      render(
        <UserPortalBudgetWorkspaceView
          {...defaultBaseProps}
          newActivityTitle="Resilient Activity"
          handleCreateOrUpdateBudgetRequest={handleSubmitMock}
        />
      );

      const submitButton = screen.getByTestId("submit-budget-proposal-button");

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(handleSubmitMock).toHaveBeenCalledTimes(1);
      // Button restored and re-enabled
      expect(submitButton).toHaveTextContent("Submit Proposal →");
      expect(submitButton).not.toBeDisabled();

      // Form values remain preserved in DOM
      expect(screen.getByDisplayValue("Resilient Activity")).toBeDefined();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("D. Copy Changes", () => {
    it("renders 'Detailed Project Proposal' and does NOT render 'Detailed Budget Document'", () => {
      render(<UserPortalBudgetWorkspaceView {...defaultBaseProps} />);

      // Must be present
      expect(screen.getByText("Detailed Project Proposal")).toBeDefined();
      expect(
        screen.getByText("Upload your orgs detailed project budget proposal for administrative review")
      ).toBeDefined();
      expect(screen.getByText("PDF Only")).toBeDefined();
      expect(screen.getByText("Select Detailed Project Proposal")).toBeDefined();

      // Must NOT be present
      expect(screen.queryByText("Detailed Budget Document")).toBeNull();
      expect(screen.queryByText("Select Detailed Budget Document")).toBeNull();
    });
  });

  describe("E. Removed Active YPOP Qualification Banner", () => {
    it("does NOT render the Active YPOP Qualification banner or its associated text", () => {
      render(<UserPortalBudgetWorkspaceView {...defaultBaseProps} />);

      expect(screen.queryByText("Active YPOP Qualification")).toBeNull();
      expect(
        screen.queryByText(
          "This request will be submitted under your organization's active Pasig City YPOP grant allocation."
        )
      ).toBeNull();
      expect(screen.queryByText("Project Grant (PPA)")).toBeNull();
    });
  });

  describe("F. Action Area Hierarchy & Concurrent Safety", () => {
    it("disables Cancel and Save Draft buttons while proposal submission is active", async () => {
      let resolveSubmission: () => void = () => {};
      const submissionPromise = new Promise<void>((resolve) => {
        resolveSubmission = resolve;
      });
      const handleSubmitMock = vi.fn().mockReturnValue(submissionPromise);

      render(
        <UserPortalBudgetWorkspaceView
          {...defaultBaseProps}
          handleCreateOrUpdateBudgetRequest={handleSubmitMock}
        />
      );

      const submitButton = screen.getByTestId("submit-budget-proposal-button");
      const saveDraftButton = screen.getByTestId("save-budget-draft-button");
      const cancelButton = screen.getByTestId("cancel-budget-form-button");

      await act(async () => {
        fireEvent.click(submitButton);
      });

      // While submitting:
      expect(submitButton).toBeDisabled();
      expect(saveDraftButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();

      // Clicking Save Draft during submission does not fire a concurrent call
      await act(async () => {
        fireEvent.click(saveDraftButton);
      });
      expect(handleSubmitMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveSubmission();
      });

      // Restored
      expect(submitButton).not.toBeDisabled();
      expect(saveDraftButton).not.toBeDisabled();
      expect(cancelButton).not.toBeDisabled();
    });

    it("disables Submit Proposal and Cancel buttons while saving draft is active", async () => {
      let resolveDraft: () => void = () => {};
      const draftPromise = new Promise<void>((resolve) => {
        resolveDraft = resolve;
      });
      const handleDraftMock = vi.fn().mockReturnValue(draftPromise);

      render(
        <UserPortalBudgetWorkspaceView
          {...defaultBaseProps}
          handleCreateOrUpdateBudgetRequest={handleDraftMock}
        />
      );

      const submitButton = screen.getByTestId("submit-budget-proposal-button");
      const saveDraftButton = screen.getByTestId("save-budget-draft-button");
      const cancelButton = screen.getByTestId("cancel-budget-form-button");

      await act(async () => {
        fireEvent.click(saveDraftButton);
      });

      // While saving draft:
      expect(saveDraftButton).toHaveTextContent("Saving Draft...");
      expect(saveDraftButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();

      // Verify draft called with isDraft = true
      expect(handleDraftMock).toHaveBeenCalledWith(expect.anything(), true);

      // Attempting to submit proposal while saving draft is blocked
      await act(async () => {
        fireEvent.click(submitButton);
      });
      expect(handleDraftMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveDraft();
      });

      expect(saveDraftButton).toHaveTextContent("Save Draft");
      expect(saveDraftButton).not.toBeDisabled();
      expect(submitButton).not.toBeDisabled();
      expect(cancelButton).not.toBeDisabled();
    });
  });

  describe("G. Edit Mode Support", () => {
    it("renders 'Update Proposal' in idle state and transitions to 'Submitting Proposal...' on submit", async () => {
      let resolveEdit: () => void = () => {};
      const editPromise = new Promise<void>((resolve) => {
        resolveEdit = resolve;
      });
      const handleEditMock = vi.fn().mockReturnValue(editPromise);

      render(
        <UserPortalBudgetWorkspaceView
          {...defaultBaseProps}
          editingBudgetRequest={{ id: "br-edit-1", activityTitle: "Existing Activity" }}
          handleCreateOrUpdateBudgetRequest={handleEditMock}
        />
      );

      const submitButton = screen.getByTestId("submit-budget-proposal-button");
      expect(submitButton).toHaveTextContent("Update Proposal");

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(submitButton).toHaveTextContent("Submitting Proposal...");
      expect(submitButton).toBeDisabled();

      await act(async () => {
        resolveEdit();
      });

      expect(submitButton).toHaveTextContent("Update Proposal");
      expect(submitButton).not.toBeDisabled();
    });
  });
});
