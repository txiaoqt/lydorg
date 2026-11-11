import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortalFooter } from "./UserPortalShell";

describe("PortalFooter", () => {
  it("shows the office contact details and the public help and legal links", () => {
    render(<PortalFooter />);
    expect(screen.getByRole("contentinfo")).toHaveTextContent("Y-TRACE");
    expect(screen.getByText("Pasig City Youth Development Office")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /lydo@pasigcity\.gov\.ph/ })).toHaveAttribute("href", expect.stringContaining("lydo%40pasigcity.gov.ph"));
    expect(screen.getByText(/All rights reserved\./)).toBeInTheDocument();
    for (const [label, href] of [["FAQs", "/faqs"], ["Contact Us", "/contacts"], ["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"]]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
  });
});
