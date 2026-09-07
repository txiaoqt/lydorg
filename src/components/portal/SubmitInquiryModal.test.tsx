import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubmitInquiryModal } from "./SubmitInquiryModal";

describe("SubmitInquiryModal Component", () => {
  const defaultInquiryForm = {
    submitterName: "Youth Org Representative",
    organizationName: "Youth Org Representative",
    email: "contact@youthorg.ph",
    subject: "Question regarding documentation deadline",
    description: "Good day, we would like to inquire if an extension is permitted for the quarterly report.",
  };

  it("renders when open=true with institutional header and contextual eyebrow", () => {
    render(
      <SubmitInquiryModal
        open={true}
        onOpenChange={vi.fn()}
        inquiryForm={defaultInquiryForm}
        setInquiryForm={vi.fn()}
        submittingInquiry={false}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText("PCYDO Support Desk · Pasig City")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Submit Inquiry/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Send your official question or assistance request directly to the PCYDO administrative team/i)
    ).toBeInTheDocument();
  });

  it("does not render modal dialog content when open=false", () => {
    render(
      <SubmitInquiryModal
        open={false}
        onOpenChange={vi.fn()}
        inquiryForm={defaultInquiryForm}
        setInquiryForm={vi.fn()}
        submittingInquiry={false}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.queryByRole("heading", { name: /Submit Inquiry/i })).not.toBeInTheDocument();
  });

  it("renders conceptual groupings for Contact Details and Inquiry Content", () => {
    render(
      <SubmitInquiryModal
        open={true}
        onOpenChange={vi.fn()}
        inquiryForm={defaultInquiryForm}
        setInquiryForm={vi.fn()}
        submittingInquiry={false}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText("Contact Details")).toBeInTheDocument();
    expect(screen.getByText("Inquiry Content")).toBeInTheDocument();

    // Inputs with values
    expect(screen.getByDisplayValue("Youth Org Representative")).toBeInTheDocument();
    expect(screen.getByDisplayValue("contact@youthorg.ph")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Question regarding documentation deadline")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Good day, we would like to inquire/i)).toBeInTheDocument();
  });

  it("handles input changes and triggers setInquiryForm", () => {
    const handleSetInquiryForm = vi.fn();
    render(
      <SubmitInquiryModal
        open={true}
        onOpenChange={vi.fn()}
        inquiryForm={{
          submitterName: "",
          email: "",
          subject: "",
          description: "",
        }}
        setInquiryForm={handleSetInquiryForm}
        submittingInquiry={false}
        onSubmit={vi.fn()}
      />
    );

    const subjectInput = screen.getByPlaceholderText("e.g. Question about liquidation requirement");
    fireEvent.change(subjectInput, { target: { value: "New liquidation query" } });

    expect(handleSetInquiryForm).toHaveBeenCalled();
  });

  it("submits the form when clicking Submit Inquiry button", () => {
    const handleSubmit = vi.fn((e) => e.preventDefault());
    render(
      <SubmitInquiryModal
        open={true}
        onOpenChange={vi.fn()}
        inquiryForm={defaultInquiryForm}
        setInquiryForm={vi.fn()}
        submittingInquiry={false}
        onSubmit={handleSubmit}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Submit Inquiry/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalled();
  });

  it("displays loading spinner and disables submit button when submittingInquiry=true", () => {
    render(
      <SubmitInquiryModal
        open={true}
        onOpenChange={vi.fn()}
        inquiryForm={defaultInquiryForm}
        setInquiryForm={vi.fn()}
        submittingInquiry={true}
        onSubmit={vi.fn()}
      />
    );

    const submittingBtn = screen.getByRole("button", { name: /Submitting\.\.\./i });
    expect(submittingBtn).toBeDisabled();
  });

  it("calls onOpenChange(false) when clicking Cancel or Close button", () => {
    const handleOpenChange = vi.fn();
    render(
      <SubmitInquiryModal
        open={true}
        onOpenChange={handleOpenChange}
        inquiryForm={defaultInquiryForm}
        setInquiryForm={vi.fn()}
        submittingInquiry={false}
        onSubmit={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onOpenChange(false) when pressing Escape key", () => {
    const handleOpenChange = vi.fn();
    render(
      <SubmitInquiryModal
        open={true}
        onOpenChange={handleOpenChange}
        inquiryForm={defaultInquiryForm}
        setInquiryForm={vi.fn()}
        submittingInquiry={false}
        onSubmit={vi.fn()}
      />
    );

    fireEvent.keyDown(document.activeElement || document, { key: "Escape", code: "Escape" });
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it("binds required asterisks immediately beside field labels as cohesive units", () => {
    render(
      <SubmitInquiryModal
        open={true}
        onOpenChange={vi.fn()}
        inquiryForm={defaultInquiryForm}
        setInquiryForm={vi.fn()}
        submittingInquiry={false}
        onSubmit={vi.fn()}
      />
    );

    const labels = document.querySelectorAll("label");
    expect(labels.length).toBe(4);

    labels.forEach((label) => {
      // Must use inline-flex with small gap, NOT justify-between
      expect(label.className).toContain("inline-flex");
      expect(label.className).toContain("gap-1");
      expect(label.className).not.toContain("justify-between");

      const asterisk = label.querySelector(".text-destructive");
      expect(asterisk).toBeInTheDocument();
      expect(asterisk?.textContent).toBe("*");
    });
  });

  it("applies consistent horizontal padding across header, body, and footer", () => {
    render(
      <SubmitInquiryModal
        open={true}
        onOpenChange={vi.fn()}
        inquiryForm={defaultInquiryForm}
        setInquiryForm={vi.fn()}
        submittingInquiry={false}
        onSubmit={vi.fn()}
      />
    );

    const header = document.querySelector('[class*="border-b"][class*="px-4"]');
    expect(header).toBeInTheDocument();
    expect(header?.className).toContain("sm:px-5");

    const body = document.querySelector('form > div[class*="px-4"]');
    expect(body).toBeInTheDocument();
    expect(body?.className).toContain("sm:px-5");

    const footer = document.querySelector('[class*="border-t"][class*="px-4"]');
    expect(footer).toBeInTheDocument();
    expect(footer?.className).toContain("sm:px-5");
  });

  it("renders well-proportioned action buttons with clear primary/secondary hierarchy", () => {
    render(
      <SubmitInquiryModal
        open={true}
        onOpenChange={vi.fn()}
        inquiryForm={defaultInquiryForm}
        setInquiryForm={vi.fn()}
        submittingInquiry={false}
        onSubmit={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    const submitBtn = screen.getByRole("button", { name: /Submit Inquiry/i });

    // Cancel is secondary
    expect(cancelBtn.className).toContain("h-9.5");
    expect(cancelBtn.className).toContain("sm:h-10");
    expect(cancelBtn.className).toContain("rounded-lg");
    expect(cancelBtn.className).not.toContain("rounded-xl");

    // Submit Inquiry is primary
    expect(submitBtn.className).toContain("h-9.5");
    expect(submitBtn.className).toContain("sm:h-10");
    expect(submitBtn.className).toContain("bg-primary");
    expect(submitBtn.className).toContain("rounded-lg");
    expect(submitBtn.className).not.toContain("rounded-xl");

    // Routing info present in footer
    expect(screen.getByText("Direct administrative routing")).toBeInTheDocument();
  });
});
