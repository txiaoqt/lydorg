import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserPortalDocumentWorkspaceView } from "./UserPortalDocumentWorkspaceView";
import { EndorsementGuidelinesModal } from "./EndorsementGuidelinesModal";

describe("Endorsement Guidelines Modal and Document Workspace Integration", () => {
  const defaultProps = {
    templateDocuments: [
      {
        id: "doc-1",
        title: "Constitution and By-Laws",
        description: "Upload the official CBL document.",
        isRequired: true,
        fileType: "pdf",
      },
    ],
    documentSubmissions: new Map(),
    navigate: vi.fn(),
    userRouteMap: { "document-submission": "/document-submission" },
    formatDateTimeLabel: () => "Aug 11, 2026",
    formatShortPortalDate: () => "Aug 11, 2026",
    getDocumentPrimaryFileTypeLabel: () => "PDF",
  };

  it("renders Endorsement Guidelines item with interactive View Guidelines button in Submission Guidelines", () => {
    render(<UserPortalDocumentWorkspaceView {...defaultProps} />);

    // Check that Endorsement Guidelines label and buttons are rendered
    const endorsementLabels = screen.getAllByText(/Endorsement Guidelines:/i);
    expect(endorsementLabels.length).toBeGreaterThan(0);

    const viewGuidelinesButtons = screen.getAllByRole("button", {
      name: /view endorsement or certification guidelines/i,
    });
    expect(viewGuidelinesButtons.length).toBeGreaterThan(0);
    expect(viewGuidelinesButtons[0]).toHaveTextContent("View Guidelines →");
  });

  it("opens Endorsement Guidelines modal when View Guidelines is clicked", () => {
    render(<UserPortalDocumentWorkspaceView {...defaultProps} />);

    // Initially modal is not open
    expect(screen.queryByRole("heading", { name: "Endorsement or Certification Guidelines" })).not.toBeInTheDocument();

    const viewGuidelinesBtn = screen.getAllByRole("button", {
      name: /view endorsement or certification guidelines/i,
    })[0];

    fireEvent.click(viewGuidelinesBtn);

    // Modal is now open directly with heading and description (no eyebrow)
    expect(screen.getByRole("heading", { name: "Endorsement or Certification Guidelines" })).toBeInTheDocument();
    expect(screen.queryByText("Registration Compliance")).not.toBeInTheDocument();
    expect(screen.getByText(/Review the official endorsement and certification requirements below/i)).toBeInTheDocument();
  });

  it("renders exact mandatory and expedited endorsement guidelines content according to official specifications", () => {
    const onOpenChange = vi.fn();
    render(<EndorsementGuidelinesModal open={true} onOpenChange={onOpenChange} />);

    // Title
    expect(screen.getByRole("heading", { name: "Endorsement or Certification Guidelines" })).toBeInTheDocument();

    // Section 1: Standard Applicable Requirements
    expect(
      screen.getByText("Organizations applying for registration shall submit the following, if applicable:")
    ).toBeInTheDocument();

    expect(screen.getByText("For school-based organizations:")).toBeInTheDocument();
    expect(
      screen.getByText("Certificate of Recognition from a competent school authority supervising student affairs;")
    ).toBeInTheDocument();

    expect(screen.getByText("For faith-based organizations:")).toBeInTheDocument();
    expect(
      screen.getByText("Certificate of Recognition from any head/pastor of congregation or parish priest;")
    ).toBeInTheDocument();

    expect(
      screen.getByText("For organizations established or founded with the assistance of government agencies, offices and instrumentalities:")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Certificate of Recognition from the government agency, office or instrumentality;")
    ).toBeInTheDocument();

    // Section 2: Expedited Verification Documents
    expect(
      screen.getByText("To expedite the process of verification, the following documents may also be submitted:")
    ).toBeInTheDocument();

    expect(screen.getByText("For chapters of multi-level organizations:")).toBeInTheDocument();
    expect(
      screen.getByText("Certificate of Recognition from the president governing at the highest organizational level;")
    ).toBeInTheDocument();

    expect(screen.getByText("For Consortium organizations:")).toBeInTheDocument();
    expect(
      screen.getByText("Certification of Member Organizations issued by the secretariat/board;")
    ).toBeInTheDocument();

    expect(
      screen.getByText("For organizations registered in the Securities and Exchange Commission, or by other national government registering entities:")
    ).toBeInTheDocument();
    expect(screen.getByText("Certificate of Registration.")).toBeInTheDocument();
  });

  it("closes modal when clicking Close button", () => {
    const onOpenChange = vi.fn();
    render(<EndorsementGuidelinesModal open={true} onOpenChange={onOpenChange} />);

    const closeButtons = screen.getAllByRole("button", { name: /close/i });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(closeButtons[0]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
