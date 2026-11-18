import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { UserPortalOrganizationProfileWorkspaceView } from "./UserPortalOrganizationProfileWorkspaceView";

const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }), toast }));

const baseProfile = {
  id: "org-1",
  organizationName: "Palatiw Artisans",
  organizationEmail: "org@example.test",
  contactNumber: "09171234567",
  majorClassification: "Youth Organization",
  subClassification: "community-based",
  advocacies: ["education"],
  representativeFirstName: "Juan",
  representativeLastName: "Dela Cruz",
  adviserFirstName: "",
  adviserLastName: "",
  addressStreet: "1 Main St",
  addressBarangay: "Palatiw",
  barangay: "Palatiw",
  district: "District I",
  addressZipCode: "1601",
  profileStatus: "verified",
};

function Harness({ save }: { save: () => Promise<void> }) {
  const [draft, setDraft] = useState<Record<string, unknown>>(baseProfile);
  return (
    <UserPortalOrganizationProfileWorkspaceView
      {...({
        profile: baseProfile,
        currentProfile: baseProfile,
        profileDraft: draft,
        handleProfileFieldChange: (field: string, value: unknown) => setDraft((current) => ({ ...current, [field]: value })),
        toggleAdvocacy: vi.fn(),
        saveOrganizationProfile: save,
        savingProfile: false,
        profilePercent: 80,
        activeProfileTab: "overview",
        setActiveProfileTab: vi.fn(),
        showProfileEditSection: true,
        setShowProfileEditSection: vi.fn(),
        profilePreviewOpen: false,
        setProfilePreviewOpen: vi.fn(),
        advocacyOptions: ["education"],
        subClassificationOptions: ["community-based"],
        formatShortPortalDate: (value: string) => value,
        formatDateTimeLabel: (value: string) => value,
        formatSubClassificationLabel: (value: string) => value,
        navigate: vi.fn(),
        userRouteMap: {},
      } as never)}
    />
  );
}

describe("Organization profile required fields", () => {
  // jsdom has no layout, so scrolling is a no-op here.
  Element.prototype.scrollIntoView = vi.fn();

  it("blocks the save, names the empty Official Adviser fields and focuses the first one", () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<Harness save={save} />);

    // Any edit enables Save Changes.
    fireEvent.change(screen.getByPlaceholderText("e.g. Crisostomo"), { target: { value: "Santos" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(save).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Complete 2 required fields before saving",
      description: "Official Adviser — First Name, Official Adviser — Last Name",
      variant: "destructive",
    }));
    expect(document.activeElement).toBe(screen.getByPlaceholderText("e.g. Maria"));
  });

  it("saves once every required field is filled", () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<Harness save={save} />);

    fireEvent.change(screen.getByPlaceholderText("e.g. Maria"), { target: { value: "Maria" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. delos Santos"), { target: { value: "Reyes" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(save).toHaveBeenCalledTimes(1);
  });
});
