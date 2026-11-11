import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { UserPortalDocumentWorkspaceView } from "./UserPortalDocumentWorkspaceView";

const baseProps = {
  templateDocuments: [{ id: "doc-1", title: "YORP Constitution and By-Laws", isRequired: true, fileType: "pdf" }],
  documentSubmissions: new Map(),
  navigate: vi.fn(),
  userRouteMap: {},
  formatDateTimeLabel: () => "Oct 3, 2026",
  getDocumentPrimaryFileTypeLabel: () => "PDF",
};

describe("Registration documents after a final decision", () => {
  it("shows the approved files read-only instead of the upload workspace", () => {
    const openAttachedDocumentEditor = vi.fn();
    const openPreview = vi.fn();
    const openFile = vi.fn();
    render(
      <UserPortalDocumentWorkspaceView
        {...baseProps}
        openAttachedDocumentEditor={openAttachedDocumentEditor}
        openPreview={openPreview}
        openFile={openFile}
        finalSubmissionStatus="approved"
        finalSubmissionFiles={[{ id: "f1", documentTypeName: "Constitution and By-Laws", fileName: "cbl.pdf", fileUrl: "org/cbl.pdf", adminStatus: "approved_green" }]}
      />,
    );
    expect(screen.getByText("Registration Approved")).toBeInTheDocument();
    expect(screen.getByText("Constitution and By-Laws")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.queryByText("Upload Multiple Documents")).not.toBeInTheDocument();
    expect(screen.queryByText(/Upload Document/)).not.toBeInTheDocument();
    // View opens the uploaded file in the attached-file drawer: not the template viewer, not a download.
    fireEvent.click(screen.getByRole("button", { name: /View Attached/ }));
    expect(openAttachedDocumentEditor).toHaveBeenCalledWith(expect.objectContaining({ id: "f1", fileUrl: "org/cbl.pdf" }), "Constitution and By-Laws");
    expect(openPreview).not.toHaveBeenCalled();
    expect(openFile).not.toHaveBeenCalled();
  });

  it("keeps the upload workspace while the registration is still open", () => {
    render(<UserPortalDocumentWorkspaceView {...baseProps} />);
    expect(screen.getByText("Upload Multiple Documents")).toBeInTheDocument();
    expect(screen.queryByText("Registration Approved")).not.toBeInTheDocument();
  });
});
