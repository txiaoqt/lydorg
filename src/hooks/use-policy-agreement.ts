import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { hasPublishablePolicyContent } from "@/lib/ytrace-policy";

export type ActivePolicyVersion = {
  id: string;
  version: string;
  title: string;
  terms_content: string;
  privacy_content: string;
  effective_date: string | null;
};

type UsePolicyAgreementParams = {
  userId: string | null;
  enabled: boolean;
};

export const usePolicyAgreement = ({ userId, enabled }: UsePolicyAgreementParams) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isRequired, setIsRequired] = useState(false);
  const [activePolicy, setActivePolicy] = useState<ActivePolicyVersion | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !userId || !supabase) {
      setIsRequired(false);
      setActivePolicy(null);
      setError(null);
      return;
    }

    setIsChecking(true);
    setError(null);

    const { data: policy, error: policyError } = await supabase
      .from("policy_versions")
      .select("id,version,title,terms_content,privacy_content,effective_date")
      .eq("is_active", true)
      .order("effective_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (policyError) {
      setError(policyError.message);
      setActivePolicy(null);
      setIsRequired(false);
      setIsChecking(false);
      return;
    }

    if (!policy) {
      setActivePolicy(null);
      setIsRequired(false);
      setIsChecking(false);
      return;
    }

    if (!hasPublishablePolicyContent(policy.terms_content, policy.privacy_content)) {
      setActivePolicy(null);
      setIsRequired(false);
      setIsChecking(false);
      return;
    }

    setActivePolicy(policy as ActivePolicyVersion);

    const { data: acceptance, error: acceptanceError } = await supabase
      .from("user_policy_acceptance")
      .select("id")
      .eq("user_id", userId)
      .eq("policy_version_id", policy.id)
      .maybeSingle();

    if (acceptanceError) {
      setError(acceptanceError.message);
      setIsRequired(true);
      setIsChecking(false);
      return;
    }

    setIsRequired(!acceptance);
    setIsChecking(false);
  }, [enabled, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const accept = useCallback(async () => {
    if (!enabled || !userId || !supabase || !activePolicy) {
      return { error: "Policy agreement is not available." };
    }

    setAccepting(true);
    setError(null);
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;

    const { error: insertError } = await supabase.from("user_policy_acceptance").insert({
      user_id: userId,
      policy_version_id: activePolicy.id,
      accepted_terms: true,
      accepted_privacy: true,
      user_agent: userAgent,
    });

    if (insertError) {
      setAccepting(false);
      setError(insertError.message);
      return { error: insertError.message };
    }

    setAccepting(false);
    setIsRequired(false);
    return {};
  }, [enabled, userId, activePolicy]);

  return useMemo(
    () => ({
      isChecking,
      isRequired,
      activePolicy,
      accepting,
      error,
      accept,
      refresh,
    }),
    [accept, accepting, activePolicy, error, isChecking, isRequired, refresh],
  );
};

