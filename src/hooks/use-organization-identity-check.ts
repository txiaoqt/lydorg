import { useEffect, useState } from "react";
import { checkOrganizationIdentity } from "@/lib/organization-identity-api";
import { normalizeOrganizationName, type OrganizationIdentityOutcome } from "@/lib/organization-identity";

/** Debounced advisory lookup only; profile writes and verification remain server-enforced. */
export function useOrganizationIdentityCheck(name: string, barangay = "", urn = "") {
  const [result, setResult] = useState<{ input: string; outcome: OrganizationIdentityOutcome } | null>(null);
  const input = JSON.stringify([normalizeOrganizationName(name), barangay, urn]);
  useEffect(() => {
    if (normalizeOrganizationName(name).length < 3 || name.length > 100) return;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void checkOrganizationIdentity(name, barangay, urn, controller.signal).then(outcome => {
        if (active) setResult({ input, outcome });
      });
    }, 650);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [input]);
  return result?.input === input ? result.outcome : null;
}
