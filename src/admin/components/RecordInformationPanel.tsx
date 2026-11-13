import { useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRepresentativeDisplayName, type OrganizationProfile } from "@/lib/lydo-connect-data";
import { ReferenceCodeChip } from "@/admin/components/InquiriesTable";
import { UrnChip } from "@/admin/components/OrganizationDetailsPanel";

export type RecordFinancialCard = {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  /** Amber card, used while a linked record is still pending. */
  pending?: boolean;
};

type Props = {
  title: string;
  code: string;
  financial: RecordFinancialCard[];
  projectName: string;
  purposeDescription?: string | null;
  activityRows: Array<[label: string, value: ReactNode]>;
  organization?: OrganizationProfile | null;
};

const sectionLabel = "font-inter text-[11px] font-semibold uppercase leading-none text-slate-500";
const missing = <span className="font-normal italic text-slate-400">Not provided</span>;

const Row = ({ label, value, last }: { label: string; value: ReactNode; last?: boolean }) => (
  <div className={cn("flex items-center justify-between gap-3 py-2.5", !last && "border-b border-slate-200")}>
    <span className="font-inter text-[13px] text-slate-500">{label}</span>
    <span className="min-w-0 break-words text-right font-inter text-[13px] font-semibold text-text-default">{value}</span>
  </div>
);

// "+1 more" pill; hovering lists the other emails or numbers
const MorePill = ({ items }: { items: string[] }) =>
  items.length ? (
    <span title={items.join(", ")} className="ml-1.5 inline-flex rounded-full border border-slate-300 bg-slate-50 px-1.5 py-0.5 align-middle font-inter text-[11px] font-semibold text-slate-600">
      +{items.length} more
    </span>
  ) : null;

/** Collapsible "… Information" panel shared by the Budget Request and Liquidation Report review pages. */
export function RecordInformationPanel({ title, code, financial, projectName, purposeDescription, activityRows, organization }: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const urn = organization?.urn || organization?.organizationIdentifierNumber;

  return (
    <section className="overflow-hidden rounded-md border border-slate-300 bg-admin-surface" aria-label={title}>
      <div className={cn("flex flex-wrap items-center justify-between gap-3 p-4", !collapsed && "border-b border-slate-300")}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="font-inter text-lg font-semibold leading-none text-public-text-brand">{title}</h2>
          <ReferenceCodeChip code={code} />
        </div>
        <button
          type="button"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((current) => !current)}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-admin-surface px-3 font-inter text-[13px] font-semibold text-text-default transition-colors hover:bg-slate-50"
        >
          {collapsed ? "Expand Details" : "Collapse Details"}
          <ChevronDown className={cn("h-4 w-4 transition-transform", !collapsed && "rotate-180")} strokeWidth={1.6} />
        </button>
      </div>

      {!collapsed ? (
        <div className="space-y-4 p-4">
          <div className="space-y-2.5">
            <p className={sectionLabel}>Financial Details</p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              {financial.map(({ icon: Icon, label, value, pending }) => (
                <div key={label} className={cn("flex flex-col gap-2 rounded-md border px-4 py-3", pending ? "border-amber-200 bg-amber-50/60" : "border-slate-300 bg-admin-surface")}>
                  <p className="flex items-center gap-1.5 font-inter text-[13px] text-slate-600">
                    <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />{label}
                  </p>
                  <div className="font-inter text-2xl font-bold leading-[120%] tracking-[-0.02em] text-public-text-brand">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            <div className="flex flex-col rounded-md border border-slate-300 px-4 py-3">
              <p className={sectionLabel}>Activity Details</p>
              <p className="mt-3 font-inter text-xs text-slate-500">Project name</p>
              <p className="font-inter text-base font-bold text-public-text-brand">{projectName}</p>
              {purposeDescription ? (
                <>
                  <p className="mt-3 font-inter text-xs text-slate-500">Purpose description</p>
                  <p className="whitespace-pre-wrap font-inter text-[13px] text-text-default">{purposeDescription}</p>
                </>
              ) : null}
              <div className="mt-auto pt-3">
                {activityRows.map(([label, value], index) => <Row key={label} label={label} value={value} last={index === activityRows.length - 1} />)}
              </div>
            </div>

            <div className="flex flex-col rounded-md border border-slate-300 px-4 py-3">
              <p className={sectionLabel}>Submitted By</p>
              <p className="mt-3 font-inter text-xs text-slate-500">Organization name</p>
              <p className="font-inter text-base font-bold text-public-text-brand">{organization?.organizationName ?? "Unknown organization"}</p>
              {urn ? <UrnChip urn={urn} className="mt-2" /> : null}
              <div className="mt-auto pt-3">
                <Row label="Head of organization" value={organization ? getRepresentativeDisplayName(organization, "") || missing : missing} />
                <Row label="Contact" value={organization?.contactNumber ? <>{organization.contactNumber}<MorePill items={(organization.additionalContactNumbers ?? []).map(String)} /></> : missing} />
                <Row label="Email" value={organization?.organizationEmail ? <>{organization.organizationEmail}<MorePill items={(organization.additionalEmails ?? []).map(String)} /></> : missing} last />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
