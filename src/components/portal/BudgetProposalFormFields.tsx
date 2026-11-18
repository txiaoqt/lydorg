import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  budgetItemTotal,
  emptyBudgetItem,
  emptyProgrammeRow,
  proposalBudgetTotal,
  PROPOSAL_MAX_TOTAL,
  type BudgetProposalForm,
} from "@/lib/budget-proposal";

const peso = (value: number) => `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const inputClass = "h-10 text-xs rounded-xl bg-background border-border/80 focus-visible:ring-1 focus-visible:ring-primary/40";
const areaClass = "text-xs rounded-xl bg-background border-border/80 resize-y min-h-[96px] focus-visible:ring-1 focus-visible:ring-primary/40";

function Field({ label, hint, required = true, children, className }: { label: string; hint?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="block text-xs font-bold text-foreground">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      {hint ? <span className="block text-[11px] italic text-muted-foreground">{hint}</span> : null}
      {children}
    </label>
  );
}

function Section({ step, title, description, children }: { step: number; title: string; description: string; children: ReactNode }) {
  return (
    <Card className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 space-y-4 shadow-xs">
      <div className="border-b border-border/40 pb-3 mb-1">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <span className="h-6 w-6 rounded-md bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">{step}</span>
          {title}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {children}
    </Card>
  );
}

/** The official YPOP Project Proposal template as form sections, in the template's order. */
export function BudgetProposalFormFields({
  value,
  onChange,
  centerOfParticipationField,
}: {
  value: BudgetProposalForm;
  onChange: (next: BudgetProposalForm) => void;
  /** The Center of Youth Participation picker, shown in the Organization Details section. */
  centerOfParticipationField: ReactNode;
}) {
  const set = <K extends keyof BudgetProposalForm>(key: K, next: BudgetProposalForm[K]) => onChange({ ...value, [key]: next });
  const text = (key: keyof BudgetProposalForm) => ({
    value: value[key] as string,
    onChange: (event: { target: { value: string } }) => set(key, event.target.value as never),
  });
  const total = proposalBudgetTotal(value);
  const overCap = total > PROPOSAL_MAX_TOTAL;

  return (
    <div className="space-y-6">
      <Section step={1} title="Organization Details" description="Pre-filled from your organization profile. Update them if anything changed.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name of Organization"><Input className={inputClass} {...text("organizationName")} /></Field>
          <Field label="Barangay"><Input className={inputClass} {...text("barangay")} /></Field>
          <div className="sm:col-span-2">{centerOfParticipationField}</div>
          <Field label="Project Head" className="sm:col-span-2"><Input className={inputClass} {...text("projectHead")} /></Field>
          <Field label="Contact Number"><Input className={inputClass} inputMode="tel" {...text("contactNumber")} /></Field>
          <Field label="E-mail Address"><Input className={inputClass} type="email" {...text("email")} /></Field>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground">Team Members <span className="text-red-500">*</span></p>
          <p className="text-[11px] text-muted-foreground">Up to 10 members. Fill in at least one.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-2">
            {value.teamMembers.map((member, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-right text-xs font-bold text-muted-foreground">{index + 1}</span>
                <Input
                  aria-label={`Team member ${index + 1} name`}
                  placeholder="Name"
                  className={inputClass}
                  value={member.name}
                  onChange={(event) => set("teamMembers", value.teamMembers.map((m, i) => i === index ? { ...m, name: event.target.value } : m))}
                />
                <Input
                  aria-label={`Team member ${index + 1} role`}
                  placeholder="Role"
                  className={cn(inputClass, "max-w-[40%]")}
                  value={member.role}
                  onChange={(event) => set("teamMembers", value.teamMembers.map((m, i) => i === index ? { ...m, role: event.target.value } : m))}
                />
              </div>
            ))}
          </div>
        </div>

        <Field label="About the Organization" hint="(Description of your organization)">
          <Textarea rows={5} className={areaClass} {...text("aboutOrganization")} />
        </Field>
      </Section>

      <Section step={2} title="Project Proposal" description="Describe the project exactly as the official template asks.">
        <Field label="Project Title" hint="(Think of a creative title or include the subtitle)">
          <Input className={inputClass} {...text("projectTitle")} />
        </Field>
        <Field label="Implementation Timeline" hint="(Date and Time of Implementation)" required>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input aria-label="Implementation date" type="date" className={inputClass} {...text("implementationDate")} />
            <Input aria-label="Start time" type="time" className={inputClass} {...text("startTime")} />
            <Input aria-label="End time" type="time" className={inputClass} {...text("endTime")} />
          </div>
        </Field>
        <Field label="Project Overview" hint="(Provide a description of your project, what is it all about?)">
          <Textarea rows={5} className={areaClass} {...text("projectOverview")} />
        </Field>
        <Field label="Rationale" hint="(You can include legal basis or existing successful projects in connection of your project)">
          <Textarea rows={5} className={areaClass} {...text("rationale")} />
        </Field>
        <Field label="Target Participants" hint="(Who will benefit your project?)">
          <Textarea rows={3} className={areaClass} {...text("targetParticipants")} />
        </Field>
        <Field label="Methodology/Project Design" hint="(Steps/process of the activity in achieving your project; from planning to evaluation)">
          <Textarea rows={5} className={areaClass} {...text("methodology")} />
        </Field>
        <Field label="Objectives" hint="(Describes what a participant is expected to know, understand, or demonstrate to prove that learning has taken place)">
          <Textarea rows={5} className={areaClass} {...text("objectives")} />
        </Field>
        <Field label="Expected Output" hint="(What will be the output of the project? Tangible/Physical, a person or thing)">
          <Textarea rows={5} className={areaClass} {...text("expectedOutput")} />
        </Field>
      </Section>

      <Section step={3} title="Course Content and Session Flow" description="Programme: time, topic/activity and person assigned.">
        <div className="space-y-3">
          {value.programme.map((row, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-[150px_1fr_180px_auto] gap-2 items-start rounded-xl border border-border/50 p-3 sm:border-0 sm:p-0">
              <Input aria-label={`Programme row ${index + 1} time`} placeholder="Time (e.g. 8:00-9:00 AM)" className={inputClass} value={row.time}
                onChange={(event) => set("programme", value.programme.map((r, i) => i === index ? { ...r, time: event.target.value } : r))} />
              <Input aria-label={`Programme row ${index + 1} topic or activity`} placeholder="Topic/Activity" className={inputClass} value={row.activity}
                onChange={(event) => set("programme", value.programme.map((r, i) => i === index ? { ...r, activity: event.target.value } : r))} />
              <Input aria-label={`Programme row ${index + 1} person assigned`} placeholder="Person Assigned" className={inputClass} value={row.personAssigned}
                onChange={(event) => set("programme", value.programme.map((r, i) => i === index ? { ...r, personAssigned: event.target.value } : r))} />
              <Button type="button" variant="ghost" size="sm" aria-label={`Remove programme row ${index + 1}`} disabled={value.programme.length === 1}
                onClick={() => set("programme", value.programme.filter((_, i) => i !== index))} className="h-10 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-xs" onClick={() => set("programme", [...value.programme, emptyProgrammeRow()])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add programme row
          </Button>
        </div>
      </Section>

      <Section step={4} title="Budgetary Requirements" description="Maximum of PHP 50,000.00. Each row's total and the TOTAL are computed for you.">
        <div className="space-y-3">
          {value.budgetItems.map((item, index) => (
            <div key={index} className="grid grid-cols-2 sm:grid-cols-[1fr_90px_90px_120px_120px_auto] gap-2 items-center rounded-xl border border-border/50 p-3 sm:border-0 sm:p-0">
              <Input aria-label={`Budget row ${index + 1} details or description`} placeholder="Details/Description" className={cn(inputClass, "col-span-2 sm:col-span-1")} value={item.description}
                onChange={(event) => set("budgetItems", value.budgetItems.map((r, i) => i === index ? { ...r, description: event.target.value } : r))} />
              <Input aria-label={`Budget row ${index + 1} quantity`} placeholder="Quantity" type="number" min="0" step="any" className={inputClass} value={item.quantity || ""}
                onChange={(event) => set("budgetItems", value.budgetItems.map((r, i) => i === index ? { ...r, quantity: Number(event.target.value) || 0 } : r))} />
              <Input aria-label={`Budget row ${index + 1} units`} placeholder="Units" className={inputClass} value={item.units}
                onChange={(event) => set("budgetItems", value.budgetItems.map((r, i) => i === index ? { ...r, units: event.target.value } : r))} />
              <Input aria-label={`Budget row ${index + 1} unit cost`} placeholder="Unit Cost" type="number" min="0" step="0.01" className={cn(inputClass, "font-mono")} value={item.unitCost || ""}
                onChange={(event) => set("budgetItems", value.budgetItems.map((r, i) => i === index ? { ...r, unitCost: Number(event.target.value) || 0 } : r))} />
              <span className="text-xs font-mono font-bold text-foreground text-right sm:text-left" aria-label={`Budget row ${index + 1} total`}>{peso(budgetItemTotal(item))}</span>
              <Button type="button" variant="ghost" size="sm" aria-label={`Remove budget row ${index + 1}`} disabled={value.budgetItems.length === 1}
                onClick={() => set("budgetItems", value.budgetItems.filter((_, i) => i !== index))} className="h-10 text-muted-foreground hover:text-destructive justify-self-end">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-xs" onClick={() => set("budgetItems", [...value.budgetItems, emptyBudgetItem()])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add budget row
          </Button>
          <div className={cn("flex items-center justify-between rounded-xl border px-4 py-3", overCap ? "border-destructive/50 bg-destructive/5" : "border-border/60 bg-muted/30")}>
            <span className="text-xs font-bold text-foreground">TOTAL</span>
            <span className={cn("text-sm font-mono font-black", overCap ? "text-destructive" : "text-foreground")} data-testid="proposal-budget-total">{peso(total)}</span>
          </div>
          {overCap ? <p role="alert" className="text-[11px] font-medium text-destructive">The TOTAL cannot exceed ₱50,000.00.</p> : null}
        </div>
      </Section>

      <Section step={5} title="Prepared and Noted By" description="Typed names are printed on the proposal. You may print and sign it for your records.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Prepared by (Secretary)"><Input className={inputClass} {...text("preparedBy")} /></Field>
          <Field label="Noted by (President)"><Input className={inputClass} {...text("notedBy")} /></Field>
        </div>
      </Section>
    </div>
  );
}
