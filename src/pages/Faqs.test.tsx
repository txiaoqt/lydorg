import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Faqs from "./Faqs";

vi.mock("@/components/Navbar", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/lib/admin-system-settings", () => ({
  usePublicContactInfo: () => ({ email: "lydo@pasigcity.gov.ph" }),
}));

afterEach(cleanup);

function renderFaqs() {
  return render(
    <MemoryRouter initialEntries={["/faqs"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/faqs" element={<Faqs />} />
        <Route path="/about" element={<h1>About destination</h1>} />
        <Route path="/public-templates" element={<h1>Forms destination</h1>} />
        <Route path="/contacts" element={<h1>Contact destination</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("public FAQ navigation and accessible disclosure", () => {
  it("uses focusable native buttons, linked panels, and a single expanded answer", () => {
    renderFaqs();
    const first = screen.getByRole("button", { name: "What is Y-TRACE?" });
    const second = screen.getByRole("button", { name: "Who can create an account?" });
    const panel = document.getElementById(first.getAttribute("aria-controls")!);
    expect(first.tagName).toBe("BUTTON");
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("aria-labelledby", first.id);
    expect(panel).not.toBeVisible();
    first.focus();
    expect(first).toHaveFocus();
    fireEvent.click(first);
    expect(first).toHaveFocus();
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "What is Y-TRACE?" })).toBeVisible();
    fireEvent.click(second);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(panel).not.toBeVisible();
    expect(second).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-expanded", "false");
  });

  it("retains panel identity through search and exposes useful empty feedback", () => {
    renderFaqs();
    const controls = screen.getByRole("button", { name: "What is Y-TRACE?" }).getAttribute("aria-controls");
    const search = screen.getAllByPlaceholderText("Search questions by keyword, topic, or answer...")[0];
    fireEvent.change(search, { target: { value: "Y-TRACE" } });
    expect(screen.getByRole("button", { name: "What is Y-TRACE?" })).toHaveAttribute("aria-controls", controls);
    fireEvent.change(search, { target: { value: "no-matching-synthetic-topic" } });
    expect(screen.getByText("No questions found matching your search.")).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "" } });
    expect(screen.getByRole("button", { name: "What is Y-TRACE?" })).toHaveAttribute("aria-controls", controls);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(6);
  });

  it("routes the About learn-more link to the public About page", async () => {
    renderFaqs();
    fireEvent.click(screen.getByRole("button", { name: "What is Y-TRACE?" }));
    fireEvent.click(screen.getByRole("link", { name: "About page" }));
    expect(await screen.findByRole("heading", { name: "About destination" })).toBeInTheDocument();
  });

  it("routes the forms answer link to Forms & Templates", async () => {
    renderFaqs();
    fireEvent.click(screen.getByRole("button", { name: "Where can I access the official forms and templates?" }));
    fireEvent.click(screen.getByRole("link", { name: "Forms & Templates page" }));
    expect(await screen.findByRole("heading", { name: "Forms destination" })).toBeInTheDocument();
  });

  it("preserves the six registration requirements and the Contact link", async () => {
    renderFaqs();
    fireEvent.click(screen.getByRole("button", { name: "What documents are required for YORP registration?" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "What should I do if I cannot access my account?" }));
    fireEvent.click(screen.getByRole("link", { name: "Contact page" }));
    expect(await screen.findByRole("heading", { name: "Contact destination" })).toBeInTheDocument();
  });

  it("opens the official address in a safely isolated Gmail compose tab", () => {
    renderFaqs();
    const email = screen.getByRole("link", { name: "Send an Email" });
    const destination = new URL(email.getAttribute("href")!);
    expect(destination.origin).toBe("https://mail.google.com");
    expect(destination.searchParams.get("to")).toBe("lydo@pasigcity.gov.ph");
    expect(email).toHaveAttribute("target", "_blank");
    expect(email.getAttribute("rel")?.split(/\s+/)).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
    expect(screen.getByRole("heading", { name: "Need Assistance?" })).toBeInTheDocument();
  });

  it("gives separate FAQ instances unique control and panel identities", () => {
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Faqs /><Faqs /></MemoryRouter>);
    const questions = screen.getAllByRole("button", { name: "What is Y-TRACE?" });
    const controls = questions.map(question => question.getAttribute("aria-controls"));
    expect(new Set(controls).size).toBe(2);
    for (const question of questions) {
      const panel = document.getElementById(question.getAttribute("aria-controls")!);
      expect(panel).toHaveAttribute("aria-labelledby", question.id);
    }
  });
});
