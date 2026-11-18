/** The official PCYDO YPOP Project Proposal template, captured as form answers. */

export const PROPOSAL_MAX_TOTAL = 50000;
export const PROPOSAL_TEAM_SIZE = 10;

export type ProposalTeamMember = { name: string; role: string };
/** Start/end come from time pickers; `time` is free text kept for answers saved before the pickers. */
export type ProposalProgrammeRow = { startTime?: string; endTime?: string; time?: string; activity: string; personAssigned: string };
export type ProposalBudgetItem = { description: string; quantity: number; units: string; unitCost: number };

export type BudgetProposalForm = {
  organizationName: string;
  barangay: string;
  projectHead: string;
  contactNumber: string;
  email: string;
  teamMembers: ProposalTeamMember[];
  aboutOrganization: string;
  projectTitle: string;
  implementationDate: string;
  startTime: string;
  endTime: string;
  projectOverview: string;
  rationale: string;
  targetParticipants: string;
  methodology: string;
  objectives: string;
  expectedOutput: string;
  programme: ProposalProgrammeRow[];
  budgetItems: ProposalBudgetItem[];
  preparedBy: string;
  notedBy: string;
};

export const emptyProgrammeRow = (): ProposalProgrammeRow => ({ startTime: "", endTime: "", activity: "", personAssigned: "" });
export const emptyBudgetItem = (): ProposalBudgetItem => ({ description: "", quantity: 0, units: "", unitCost: 0 });

export const createEmptyProposalForm = (profile?: {
  organizationName?: string | null;
  barangay?: string | null;
  contactNumber?: string | null;
  email?: string | null;
} | null): BudgetProposalForm => ({
  organizationName: profile?.organizationName ?? "",
  barangay: profile?.barangay ?? "",
  projectHead: "",
  contactNumber: profile?.contactNumber ?? "",
  email: profile?.email ?? "",
  teamMembers: Array.from({ length: PROPOSAL_TEAM_SIZE }, () => ({ name: "", role: "" })),
  aboutOrganization: "",
  projectTitle: "",
  implementationDate: "",
  startTime: "",
  endTime: "",
  projectOverview: "",
  rationale: "",
  targetParticipants: "",
  methodology: "",
  objectives: "",
  expectedOutput: "",
  programme: [emptyProgrammeRow()],
  budgetItems: [emptyBudgetItem()],
  preparedBy: "",
  notedBy: "",
});

/** Profile-owned details: read-only in the form and always taken from the current profile. */
const PROFILE_FIELDS = ["organizationName", "barangay", "contactNumber", "email"] as const;

/** Fill any missing keys so answers saved by an older form version still open. */
export const normalizeProposalForm = (value: unknown, fallback: BudgetProposalForm): BudgetProposalForm => {
  if (!value || typeof value !== "object") return fallback;
  const saved = value as Partial<BudgetProposalForm>;
  const team = Array.isArray(saved.teamMembers) ? saved.teamMembers : [];
  const fromProfile = Object.fromEntries(PROFILE_FIELDS.filter(key => fallback[key]).map(key => [key, fallback[key]]));
  return {
    ...fallback,
    ...saved,
    ...fromProfile,
    teamMembers: Array.from({ length: PROPOSAL_TEAM_SIZE }, (_, i) => ({ name: team[i]?.name ?? "", role: team[i]?.role ?? "" })),
    programme: Array.isArray(saved.programme) && saved.programme.length ? saved.programme : fallback.programme,
    budgetItems: Array.isArray(saved.budgetItems) && saved.budgetItems.length
      ? saved.budgetItems.map(item => ({ ...item, quantity: Number(item.quantity) || 0, unitCost: Number(item.unitCost) || 0 }))
      : fallback.budgetItems,
  };
};

const cents = (value: number) => Math.round(value * 100) / 100;

/** Must match public.budget_proposal_total() in the database, which checks requested_amount. */
export const budgetItemTotal = (item: ProposalBudgetItem) => cents((Number(item.quantity) || 0) * (Number(item.unitCost) || 0));
export const proposalBudgetTotal = (form: BudgetProposalForm) => cents(form.budgetItems.reduce((sum, item) => sum + budgetItemTotal(item), 0));

const filled = (value: string) => value.trim().length > 0;

/** Only rows the org actually filled are stored, printed and counted. */
export const compactProposalForm = (form: BudgetProposalForm): BudgetProposalForm => ({
  ...form,
  programme: form.programme.filter(row => filled(row.startTime ?? "") || filled(row.endTime ?? "") || filled(row.time ?? "") || filled(row.activity) || filled(row.personAssigned)),
  budgetItems: form.budgetItems.filter(item => filled(item.description) || filled(item.units) || item.quantity > 0 || item.unitCost > 0),
});

const formatTime = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  return `${hours % 12 || 12}:${match[2]} ${hours < 12 ? "AM" : "PM"}`;
};

/** "8:00 AM – 9:00 AM" for picked times, or the older free-text time. */
export const programmeRowTime = (row: ProposalProgrammeRow) =>
  row.startTime || row.endTime ? [row.startTime, row.endTime].filter(Boolean).map(value => formatTime(value!)).join(" – ") : (row.time ?? "");

/** "18 December 2026, 8:00 AM – 5:00 PM", the template's single "Date and Time of Implementation" line. */
export const formatImplementationTimeline = (form: Pick<BudgetProposalForm, "implementationDate" | "startTime" | "endTime">) => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(form.implementationDate)
    ? new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${form.implementationDate}T00:00:00Z`))
    : form.implementationDate;
  const time = [form.startTime, form.endTime].filter(Boolean).map(formatTime).join(" – ");
  return [date, time].filter(Boolean).join(", ");
};

/** Every template field is required on submit; a draft only needs a title. Returns the first problem, or null. */
export const validateProposalForm = (form: BudgetProposalForm, mode: "draft" | "submit"): string | null => {
  if (!filled(form.projectTitle)) return "Project Title is required.";
  const total = proposalBudgetTotal(form);
  if (total > PROPOSAL_MAX_TOTAL) return "The budget TOTAL cannot exceed ₱50,000.00.";
  if (mode === "draft") return null;

  const fromProfile: Array<[string, string]> = [
    ["Name of Organization", form.organizationName],
    ["Barangay", form.barangay],
    ["Contact Number", form.contactNumber],
    ["E-mail Address", form.email],
  ];
  const missingProfile = fromProfile.find(([, value]) => !filled(value));
  if (missingProfile) return `${missingProfile[0]} is missing from your organization profile. Update your Organization Profile first.`;

  const required: Array<[string, string]> = [
    ["Project Head", form.projectHead],
    ["About the Organization", form.aboutOrganization],
    ["Implementation date", form.implementationDate],
    ["Start time", form.startTime],
    ["End time", form.endTime],
    ["Project Overview", form.projectOverview],
    ["Rationale", form.rationale],
    ["Target Participants", form.targetParticipants],
    ["Methodology/Project Design", form.methodology],
    ["Objectives", form.objectives],
    ["Expected Output", form.expectedOutput],
    ["Prepared by (Secretary)", form.preparedBy],
    ["Noted by (President)", form.notedBy],
  ];
  const missing = required.find(([, value]) => !filled(value));
  if (missing) return `${missing[0]} is required.`;
  if (form.endTime <= form.startTime) return "End time must be later than start time.";

  if (!form.teamMembers.some(member => filled(member.name))) return "Add at least one team member.";
  if (form.teamMembers.some(member => filled(member.name) !== filled(member.role))) return "Each team member needs both a name and a role.";

  const programme = compactProposalForm(form).programme;
  if (!programme.length) return "Add at least one programme row.";
  if (programme.some(row => !(row.startTime && row.endTime) && !filled(row.time ?? ""))) return "Each programme row needs a start and end time.";
  if (programme.some(row => row.startTime && row.endTime && row.endTime <= row.startTime)) return "Each programme row's end time must be later than its start time.";
  if (programme.some(row => !filled(row.activity) || !filled(row.personAssigned))) {
    return "Each programme row needs a topic/activity and a person assigned.";
  }

  const items = compactProposalForm(form).budgetItems;
  if (!items.length) return "Add at least one budgetary requirement.";
  if (items.some(item => !filled(item.description) || !filled(item.units) || !(item.quantity > 0) || !(item.unitCost > 0))) {
    return "Each budgetary requirement needs a description, quantity, units and unit cost.";
  }
  return null;
};
