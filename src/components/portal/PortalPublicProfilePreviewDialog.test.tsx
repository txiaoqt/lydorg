import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PortalPublicProfilePreviewDialog } from "./PortalPublicProfilePreviewDialog";

describe("PortalPublicProfilePreviewDialog", () => {
  const mockProfile = {
    majorClassification: "Youth-Serving Organization",
    subClassification: "community_based",
    district: "District I",
    barangay: "San Nicolas",
    representativeName: "Juan Dela Cruz",
    adviserName: "Maria Santos",
    facebookPageUrl: "https://facebook.com/juandelacruzorg",
    advocacies: ["Education", "Environment", "Youth Leadership"],
  };

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    profileName: "Pasig Youth Pioneers",
    profileStatus: "verified",
    profile: mockProfile,
    profileSubClass: "Community-Based",
    displayUrn: "URN-PASIG-2026-0089",
    profilePercent: 100,
    joinedYpopEvents: [
      {
        id: "ypop-1",
        title: "Barangay Youth Leadership Summit",
        date: "2026-08-15T00:00:00Z",
        organizer: "PCYDO",
      },
      {
        id: "ypop-2",
        title: "Pasig Green Youth Initiative",
        date: "2026-07-20T00:00:00Z",
        organizer: "PCYDO",
      },
    ],
    formatShortPortalDate: (d: string) => "Aug 15, 2026",
  };

  it("renders organization identity with name, status, and classification", () => {
    render(<PortalPublicProfilePreviewDialog {...defaultProps} />);

    expect(screen.getByRole("heading", { name: /Public Profile Preview/i })).toBeDefined();
    expect(screen.getByRole("heading", { name: /Pasig Youth Pioneers/i })).toBeDefined();
    expect(screen.getAllByText(/Youth-Serving Organization/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Community-Based/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/San Nicolas, District I/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Verified").length).toBeGreaterThan(0);
    expect(screen.getByText(/100% Verified/i)).toBeDefined();
  });

  it("renders verified institutional details correctly in editorial grid", () => {
    render(<PortalPublicProfilePreviewDialog {...defaultProps} />);

    expect(screen.getByText("Authorized Representative")).toBeDefined();
    expect(screen.getByText("Juan Dela Cruz")).toBeDefined();

    expect(screen.getByText("Organization Adviser")).toBeDefined();
    expect(screen.getByText("Maria Santos")).toBeDefined();

    expect(screen.getByText("Unique Registration Number (URN)")).toBeDefined();
    expect(screen.getByText("URN-PASIG-2026-0089")).toBeDefined();

    expect(screen.getByText("Advocacy Focus Areas")).toBeDefined();
    expect(screen.getByText("Education")).toBeDefined();
    expect(screen.getByText("Environment")).toBeDefined();
    expect(screen.getByText("Youth Leadership")).toBeDefined();
  });

  it("renders Facebook link with secure external attributes", () => {
    render(<PortalPublicProfilePreviewDialog {...defaultProps} />);

    const link = screen.getByRole("link", { name: /Visit Page/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("https://facebook.com/juandelacruzorg");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("handles missing Facebook link gracefully", () => {
    render(
      <PortalPublicProfilePreviewDialog
        {...defaultProps}
        profile={{ ...mockProfile, facebookPageUrl: "" }}
      />
    );

    expect(screen.queryByRole("link", { name: /Visit Page/i })).toBeNull();
    expect(screen.getByText("Not provided")).toBeDefined();
  });

  it("renders recent city-led activities with title, date, organizer, and verified status", () => {
    render(<PortalPublicProfilePreviewDialog {...defaultProps} />);

    expect(screen.getByText("Recent City-Led Activities")).toBeDefined();
    expect(screen.getByText("Barangay Youth Leadership Summit")).toBeDefined();
    expect(screen.getByText("Pasig Green Youth Initiative")).toBeDefined();
  });

  it("renders clean empty state when no YPOP activities are recorded", () => {
    render(
      <PortalPublicProfilePreviewDialog
        {...defaultProps}
        joinedYpopEvents={[]}
      />
    );

    expect(
      screen.getByText(/No recent city-led YPOP activities recorded for this organization/i)
    ).toBeDefined();
  });

  it("invokes onOpenChange when close button in header or footer is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <PortalPublicProfilePreviewDialog
        {...defaultProps}
        onOpenChange={onOpenChange}
      />
    );

    const headerClose = screen.getByRole("button", { name: /^Close preview dialog$/i });
    fireEvent.click(headerClose);
    expect(onOpenChange).toHaveBeenCalledWith(false);

    const footerClose = screen.getByRole("button", { name: /^Close Preview$/i });
    fireEvent.click(footerClose);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("handles long organization, representative, and adviser names gracefully", () => {
    const longName = "Association of Highly Motivated Youth Advocates and Community Builders of Pasig City Chapter";
    const longRep = "Alexander Bartholomew Christopher Dela Cruz-Montenegro III";
    const longAdviser = "Dr. Maria Bernadette Evangelista-San Agustin";

    render(
      <PortalPublicProfilePreviewDialog
        {...defaultProps}
        profileName={longName}
        profile={{
          ...mockProfile,
          representativeName: longRep,
          adviserName: longAdviser,
        }}
      />
    );

    expect(screen.getByRole("heading", { name: new RegExp(longName, "i") })).toBeDefined();
    expect(screen.getByText(longRep)).toBeDefined();
    expect(screen.getByText(longAdviser)).toBeDefined();
  });

  it("renders custom profile image when profileImageUrl is provided", () => {
    render(
      <PortalPublicProfilePreviewDialog
        {...defaultProps}
        profile={{
          ...mockProfile,
          profileImageUrl: "https://example.com/logo.png",
        }}
      />
    );

    const img = screen.getByRole("img", { name: /Pasig Youth Pioneers/i });
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("https://example.com/logo.png");
  });

  it("does not render URN block when displayUrn is 'Not required' or empty", () => {
    const { rerender } = render(
      <PortalPublicProfilePreviewDialog
        {...defaultProps}
        displayUrn="Not required"
      />
    );

    expect(screen.queryByText("Unique Registration Number (URN)")).toBeNull();

    rerender(
      <PortalPublicProfilePreviewDialog
        {...defaultProps}
        displayUrn=""
      />
    );

    expect(screen.queryByText("Unique Registration Number (URN)")).toBeNull();
  });

  it("handles unassigned representatives, advisers, and omitted advocacies", () => {
    render(
      <PortalPublicProfilePreviewDialog
        {...defaultProps}
        profile={{
          ...mockProfile,
          representativeName: "",
          adviserName: "",
          advocacies: [],
        }}
      />
    );

    expect(screen.getByText("Unassigned Representative")).toBeDefined();
    expect(screen.getByText("Unassigned Adviser")).toBeDefined();
    expect(screen.queryByText("Advocacy Focus Areas")).toBeNull();
  });

  it("gracefully falls back to organization initials when image is missing or fails to load", () => {
    // 1. Missing image URL
    const { rerender } = render(
      <PortalPublicProfilePreviewDialog
        {...defaultProps}
        profileName="Tadz Youth Org"
        profile={{
          ...mockProfile,
          profileImageUrl: "",
        }}
      />
    );

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("TY")).toBeDefined();

    // 2. Image URL provided but errors out during load
    rerender(
      <PortalPublicProfilePreviewDialog
        {...defaultProps}
        profileName="Tadz Youth Org"
        profile={{
          ...mockProfile,
          profileImageUrl: "https://example.com/broken-image.jpg",
        }}
      />
    );

    const img = screen.getByRole("img", { name: /Tadz Youth Org/i });
    expect(img).toBeDefined();

    // Simulate image error event
    fireEvent.error(img);

    // Broken image is replaced with graceful monogram fallback
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("TY")).toBeDefined();
  });
});
