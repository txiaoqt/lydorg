import { useState, type ReactNode } from "react";
import { Building2, Check, ChevronDown, Copy, Globe, Mail, Phone, UserRound, type LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAdviserDisplayName, getRepresentativeDisplayName, type OrganizationProfile } from "@/lib/lydo-connect-data";
import { CategoryChip, ReferenceCodeChip } from "@/admin/components/InquiriesTable";

/** Green URN chip used beside (or under) a registration reference. */
export const UrnChip = ({ urn, className }: { urn: string; className?: string }) => (
  <span className={cn("inline-flex w-fit shrink-0 items-center rounded-full border border-border-success-subtle bg-bg-success-subtle px-2 py-0.5 font-cascadia text-[10px] font-semibold leading-[140%] text-positive-secondary", className)}>
    URN {urn}
  </span>
);

const sectionTitle = "font-inter text-sm font-semibold text-public-text-brand";
const fieldLabel = "font-inter text-[11px] font-semibold uppercase leading-none text-slate-500";

const Field = ({ label, title, description }: { label: string; title: string; description?: string }) => (
  <div className="space-y-1">
    <p className={fieldLabel}>{label}</p>
    <p className="font-inter text-sm font-semibold leading-snug text-text-default">{title}</p>
    {description ? <p className="font-inter text-xs leading-snug text-slate-500">{description}</p> : null}
  </div>
);

const copy = (value: string) => {
  void navigator.clipboard.writeText(value);
  toast({ title: "Copied", description: `${value} copied to clipboard.` });
};

const ContactRow = ({ icon: Icon, value, primary, verified, label }: { icon: LucideIcon; value: string; primary: boolean; verified?: boolean; label: string }) => (
  <li className="flex flex-wrap items-center gap-3 py-2">
    <Icon className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.6} />
    <span className="min-w-0 flex-1 break-all font-inter text-sm font-semibold text-text-default">{value}</span>
    <span className="flex shrink-0 items-center gap-2">
      {verified ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-border-success-subtle bg-bg-success-subtle px-2 py-0.5 font-inter text-xs font-semibold text-positive-secondary">
          <Check className="h-3 w-3" strokeWidth={2.4} />Verified portal account
        </span>
      ) : null}
      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 font-inter text-xs font-semibold",
        primary ? "bg-public-bg-brand text-white" : "border border-slate-300 bg-slate-50 text-slate-600")}>
        {primary ? "Primary" : "Alternate"}
      </span>
      <button type="button" onClick={() => copy(value)} aria-label={`Copy ${label} ${value}`} className="text-slate-400 transition-colors hover:text-slate-600">
        <Copy className="h-3.5 w-3.5" strokeWidth={1.6} />
      </button>
    </span>
  </li>
);

type Props = {
  organization: OrganizationProfile;
  /** Extra header chips, e.g. the renewal cycle. */
  chips?: ReactNode;
  dateLabel?: string;
  date?: string | null;
  dateDescription?: string;
  defaultCollapsed?: boolean;
};

/** Organization header plus details, shared by the Registrations, Renewals and YPOP review pages. */
export function OrganizationDetailsPanel({ organization: org, chips, dateLabel = "Registration Date", date, dateDescription, defaultCollapsed = false }: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const urn = org.urn || org.organizationIdentifierNumber;
  const parsedDate = date ? new Date(date) : null;
  const emails = [org.organizationEmail, ...(org.additionalEmails ?? [])].map(value => value?.trim()).filter(Boolean) as string[];
  const phones = [org.contactNumber, ...(org.additionalContactNumbers ?? [])].map(value => value?.trim()).filter(Boolean) as string[];
  const facebook = org.facebookPageUrl?.trim();

  return (
    <section className="overflow-hidden rounded-md border border-slate-300 bg-admin-surface" aria-label="Organization details">
      <div className={cn("flex flex-wrap items-center justify-between gap-3 p-4", !collapsed && "border-b border-slate-300")}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-public-bg-brand">
            <Building2 className="h-5 w-5 text-white" strokeWidth={1.33} />
          </div>
          <h1 className="font-inter text-lg font-semibold leading-none text-text-default">{org.organizationName}</h1>
          <ReferenceCodeChip code={org.referenceId || "—"} />
          {urn ? <UrnChip urn={urn} /> : null}
          {org.majorClassification ? <CategoryChip category={org.majorClassification} /> : null}
          {chips}
        </div>
        <button
          type="button"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(current => !current)}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-admin-surface px-3 font-inter text-[13px] font-semibold text-text-default transition-colors hover:bg-slate-50"
        >
          {collapsed ? "Expand Details" : "Collapse Details"}
          <ChevronDown className={cn("h-4 w-4 transition-transform", !collapsed && "rotate-180")} strokeWidth={1.6} />
        </button>
      </div>

      {!collapsed ? (
        <div className="space-y-5 p-4">
          <div className="space-y-3">
            <p className={sectionTitle}>Organization Details</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Classification" title={org.majorClassification || "N/A"} description={org.subClassification || undefined} />
              <Field
                label={dateLabel}
                title={parsedDate && !Number.isNaN(parsedDate.getTime()) ? format(parsedDate, "d MMM yyyy") : "N/A"}
                description={dateDescription ?? (org.isExistingOrganization ? "Existing organization" : "New organization")}
              />
              <Field label="Location" title={org.district || "N/A"} description={org.barangay || undefined} />
              <Field label="Office Address" title={org.address || "No address provided"} />
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-4">
            <p className={sectionTitle}>Contact Details</p>
            <div className="flex items-center gap-3">
              <UserRound className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.6} />
              <div className="min-w-0">
                <p className="font-inter text-xs text-slate-500">Head of organization</p>
                <p className="font-inter text-sm font-semibold text-text-default">{getRepresentativeDisplayName(org, "N/A")}</p>
                <p className="font-inter text-xs text-slate-500">Adviser: {getAdviserDisplayName(org, "N/A")}</p>
              </div>
            </div>
            <div>
              <p className={fieldLabel}>Email Addresses · {emails.length}</p>
              {emails.length ? (
                <ul className="divide-y divide-slate-100">
                  {emails.map((email, index) => <ContactRow key={`${email}-${index}`} icon={Mail} value={email} primary={index === 0} verified={index === 0} label="email" />)}
                </ul>
              ) : <p className="py-2 font-inter text-sm text-slate-500">Not provided</p>}
            </div>
            <div>
              <p className={fieldLabel}>Contact Numbers · {phones.length}</p>
              {phones.length ? (
                <ul className="divide-y divide-slate-100">
                  {phones.map((phone, index) => <ContactRow key={`${phone}-${index}`} icon={Phone} value={phone} primary={index === 0} label="contact number" />)}
                </ul>
              ) : <p className="py-2 font-inter text-sm text-slate-500">Not provided</p>}
            </div>
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.6} />
              <div className="min-w-0">
                <p className="font-inter text-xs text-slate-500">Facebook</p>
                {facebook ? (
                  <a href={facebook} target="_blank" rel="noreferrer" className="break-all font-inter text-sm font-semibold text-public-text-brand hover:underline">
                    {facebook.replace(/^https?:\/\/(www\.)?/i, "")}
                  </a>
                ) : <p className="font-inter text-sm text-text-default">Not provided</p>}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
