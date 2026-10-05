import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TermsPrivacyAgreementModal } from "./TermsPrivacyAgreementModal";
import type { ActivePolicyVersion } from "@/hooks/use-policy-agreement";

const mockPolicy: ActivePolicyVersion = {
  id: "test-policy-1",
  version: "1.0",
  terms_content: "# Terms of Service\n\nThese are terms.",
  privacy_content: "# Privacy Policy\n\nThis is privacy.",
  changelog: "Initial version",
  is_active: true,
  published_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
};

describe("TermsPrivacyAgreementModal", () => {
  it("renders correctly in PWA variant with non-stretching checkbox classes", () => {
    render(
      <TermsPrivacyAgreementModal
        open={true}
        policy={mockPolicy}
        saving={false}
        variant="pwa"
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />
    );

    expect(screen.getByText("Policy Agreement Required")).toBeInTheDocument();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);

    // In PWA variant, both checkboxes have explicit sizing classes preventing stretching
    for (const checkbox of checkboxes) {
      expect(checkbox.className).toContain("shrink-0");
      expect(checkbox.className).toContain("!h-4");
      expect(checkbox.className).toContain("!w-4");
      expect(checkbox.className).toContain("!min-h-[1rem]");
      expect(checkbox.className).toContain("!max-h-[1rem]");
    }
  });

  it("renders correctly in website variant without PWA-specific override classes", () => {
    render(
      <TermsPrivacyAgreementModal
        open={true}
        policy={mockPolicy}
        saving={false}
        variant="website"
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);

    for (const checkbox of checkboxes) {
      expect(checkbox.className).not.toContain("!min-h-[1rem]");
    }
  });

  it("keeps Accept button disabled until both checkboxes are checked in PWA", () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();

    render(
      <TermsPrivacyAgreementModal
        open={true}
        policy={mockPolicy}
        saving={false}
        variant="pwa"
        onAccept={onAccept}
        onDecline={onDecline}
      />
    );

    const acceptBtn = screen.getByRole("button", { name: "Accept and Continue" });
    expect(acceptBtn).toBeDisabled();

    const [privacyCheckbox, termsCheckbox] = screen.getAllByRole("checkbox");

    // Check privacy
    fireEvent.click(privacyCheckbox);
    expect(acceptBtn).toBeDisabled();

    // Check terms
    fireEvent.click(termsCheckbox);
    expect(acceptBtn).not.toBeDisabled();

    // Click accept
    fireEvent.click(acceptBtn);
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("calls onDecline when Sign Out is clicked", () => {
    const onDecline = vi.fn();

    render(
      <TermsPrivacyAgreementModal
        open={true}
        policy={mockPolicy}
        saving={false}
        variant="pwa"
        onAccept={vi.fn()}
        onDecline={onDecline}
      />
    );

    const signOutBtn = screen.getByRole("button", { name: "Sign Out" });
    fireEvent.click(signOutBtn);
    expect(onDecline).toHaveBeenCalledTimes(1);
  });
});
