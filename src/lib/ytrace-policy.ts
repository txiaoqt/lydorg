import {
  YTRACE_POLICY_EFFECTIVE_DATE,
  YTRACE_POLICY_TITLE,
  YTRACE_POLICY_UPDATED_AT,
  YTRACE_POLICY_VERSION,
  YTRACE_PRIVACY_POLICY,
  YTRACE_TERMS_OF_SERVICE,
  hasPublishablePolicyContent,
} from "./ytrace-policy-content.generated";

export type DisplayPolicy = {
  title: string;
  version: string;
  terms_content: string;
  privacy_content: string;
  effectiveDate: string;
  isActive: boolean;
  updatedAt?: string;
};

type DatabasePolicy = {
  title: string;
  version: string;
  terms_content: string;
  privacy_content: string;
  effective_date?: string | null;
} | null;

export const bundledPolicy: DisplayPolicy = {
  title: YTRACE_POLICY_TITLE,
  version: YTRACE_POLICY_VERSION,
  terms_content: YTRACE_TERMS_OF_SERVICE,
  privacy_content: YTRACE_PRIVACY_POLICY,
  effectiveDate: YTRACE_POLICY_EFFECTIVE_DATE,
  isActive: true,
  updatedAt: YTRACE_POLICY_UPDATED_AT,
};

// Keep older published policy copy consistent in the UI without changing
// saved policy records or official email addresses such as lydo@pasigcity.gov.ph.
const normalizeTermsOfficeName = (content: string) =>
  content.replace(/\bLYDO\b(?!@)/gi, "PCYDO");

export const resolveDisplayPolicy = (policy: DatabasePolicy): DisplayPolicy => {
  if (policy && hasPublishablePolicyContent(policy.terms_content, policy.privacy_content)) {
    return {
      ...policy,
      terms_content: normalizeTermsOfficeName(policy.terms_content),
      effectiveDate: policy.effective_date
        ? new Date(`${policy.effective_date}T00:00:00`).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : YTRACE_POLICY_EFFECTIVE_DATE,
      isActive: true,
    };
  }
  return {
    ...bundledPolicy,
    terms_content: normalizeTermsOfficeName(bundledPolicy.terms_content),
  };
};

export { hasPublishablePolicyContent };
