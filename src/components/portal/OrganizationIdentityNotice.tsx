import { identityOutcomeMessage, type OrganizationIdentityOutcome } from "@/lib/organization-identity";
export function OrganizationIdentityNotice({ outcome }: { outcome: OrganizationIdentityOutcome | null }) {
  if (!outcome) return null;
  return <p role="status" className={outcome === "EXACT_URN_CONFLICT" ? "text-sm text-destructive" : "rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}>
    {identityOutcomeMessage[outcome]}
  </p>;
}
