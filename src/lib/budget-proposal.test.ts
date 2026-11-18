import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  compactProposalForm,
  createEmptyProposalForm,
  formatImplementationTimeline,
  normalizeProposalForm,
  proposalBudgetTotal,
  validateProposalForm,
  type BudgetProposalForm,
} from "./budget-proposal";
import { generateBudgetProposalPdf } from "./budget-proposal-pdf";

// Record every string drawn on the PDF (jsPDF defines text() per instance, so wrap the class).
const printed = vi.hoisted(() => [] as string[]);
vi.mock("jspdf", async (importOriginal) => {
  const mod = await importOriginal<typeof import("jspdf")>();
  class RecordingPdf extends mod.jsPDF {
    constructor(...args: ConstructorParameters<typeof mod.jsPDF>) {
      super(...args);
      const draw = this.text.bind(this);
      this.text = ((value: string | string[], ...rest: unknown[]) => {
        printed.push(...(Array.isArray(value) ? value : [value]).map(String));
        return (draw as (...a: unknown[]) => unknown)(value, ...rest);
      }) as typeof this.text;
    }
  }
  return { ...mod, jsPDF: RecordingPdf, default: RecordingPdf };
});

const completeForm = (): BudgetProposalForm => ({
  ...createEmptyProposalForm({ organizationName: "Palatiw Artisans", barangay: "Palatiw", contactNumber: "0917 123 4567", email: "org@example.test" }),
  projectHead: "Juan Dela Cruz",
  teamMembers: createEmptyProposalForm().teamMembers.map((member, index) => index === 0 ? { name: "Ana Reyes", role: "Secretary" } : member),
  aboutOrganization: "A youth arts group.",
  projectTitle: "Palatiw Artisan Seminar",
  implementationDate: "2026-12-18",
  startTime: "08:00",
  endTime: "17:00",
  projectOverview: "A one-day seminar.",
  rationale: "Supports local artisans.",
  targetParticipants: "Youth of Palatiw.",
  methodology: "Plan, run, evaluate.",
  objectives: "Learn three crafts.",
  expectedOutput: "Thirty finished crafts.",
  programme: [{ time: "8:00-9:00 AM", activity: "Registration", personAssigned: "Secretariat" }],
  budgetItems: [
    { description: "Snacks", quantity: 30, units: "packs", unitCost: 85.5 },
    { description: "Materials", quantity: 3, units: "sets", unitCost: 1000.333 },
  ],
  preparedBy: "Ana Reyes",
  notedBy: "Maria Santos",
});

describe("budget proposal answers", () => {
  it("rounds each row to centavos, matching the database total", () => {
    // 30 × 85.50 = 2,565.00 and 3 × 1,000.333 = 3,000.999 → 3,001.00
    expect(proposalBudgetTotal(completeForm())).toBe(5566);
  });

  it("caps the TOTAL at ₱50,000 for drafts and submissions", () => {
    const form = { ...completeForm(), budgetItems: [{ description: "Venue rental", quantity: 1, units: "day", unitCost: 50000.01 }] };
    expect(validateProposalForm(form, "draft")).toMatch("₱50,000");
    expect(validateProposalForm({ ...form, budgetItems: [{ ...form.budgetItems[0], unitCost: 50000 }] }, "submit")).toBeNull();
  });

  it("lets a draft be saved with only a title but requires every template field on submit", () => {
    const draft = { ...createEmptyProposalForm(), projectTitle: "Untitled draft" };
    expect(validateProposalForm(draft, "draft")).toBeNull();
    expect(validateProposalForm(draft, "submit")).not.toBeNull();
    expect(validateProposalForm(completeForm(), "submit")).toBeNull();
    expect(validateProposalForm({ ...completeForm(), endTime: "07:00" }, "submit")).toMatch("End time");
    expect(validateProposalForm({ ...completeForm(), programme: [{ time: "", activity: "", personAssigned: "" }] }, "submit")).toMatch("programme");
  });

  it("drops blank rows and reopens saved answers with all 10 team slots", () => {
    const form = { ...completeForm(), programme: [...completeForm().programme, { time: "", activity: "", personAssigned: "" }] };
    expect(compactProposalForm(form).programme).toHaveLength(1);
    const reopened = normalizeProposalForm({ projectTitle: "Saved", teamMembers: [{ name: "A", role: "B" }] }, createEmptyProposalForm());
    expect(reopened.teamMembers).toHaveLength(10);
    expect(reopened.projectTitle).toBe("Saved");
    expect(formatImplementationTimeline(completeForm())).toBe("December 18, 2026, 8:00 AM – 5:00 PM");
  });
});

describe("proposal PDF", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(new Uint8Array(readFileSync(`public${url}`)), { status: 200 })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("prints every template section, the answers, the TOTAL and the signatories from settings", async () => {
    printed.length = 0;
    const pdf = await generateBudgetProposalPdf({
      form: completeForm(),
      centerOfParticipation: "Education",
      reviewers: [{ name: "REVIEWER ONE", position: "Youth Development Officer I" }, { name: "REVIEWER TWO", position: "Youth Development Officer II" }],
      approver: { name: "APPROVER NAME", position: "Officer-in-Charge" },
    });
    const text = printed.join("\n");

    for (const heading of [
      "PROJECT PROPOSAL", "ORGANIZATION DETAILS", "Name of", "Barangay:", "Center of", "Project Head", "Team Members", "About the",
      "Project Title", "Implementation Timeline", "Project Overview", "Rationale", "Target Participants", "Methodology/Project",
      "Objectives", "Expected Output", "COURSE CONTENT AND SESSION FLOW", "PROGRAMME", "PERSON ASSIGNED",
      "BUDGETARY REQUIREMENTS: (MAXIMUM OF PHP 50,000.00)", "UNIT COST", "TOTAL:", "PREPARED BY:", "NOTED BY:", "REVIEWED BY:", "APPROVED BY:",
    ]) expect(text).toContain(heading);
    for (const answer of ["Palatiw Artisans", "Education", "Ana Reyes", "December 18, 2026, 8:00 AM – 5:00 PM", "Thirty finished crafts.", "Registration", "5,566.00", "Maria Santos", "Secretary", "President"]) {
      expect(text).toContain(answer);
    }
    for (const signatory of ["REVIEWER ONE", "REVIEWER TWO", "APPROVER NAME", "Officer-in-Charge"]) expect(text).toContain(signatory);
    expect(text).not.toMatch(/venue/i);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(4);
  });
});
