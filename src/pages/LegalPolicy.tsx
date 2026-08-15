import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Footer from "@/components/Footer";
import { LegalPolicyView } from "@/components/LegalPolicyView";
import Navbar from "@/components/Navbar";
import AnnouncementBar from "@/components/AnnouncementBar";
import { supabase } from "@/lib/supabase";
import { resolveDisplayPolicy } from "@/lib/ytrace-policy";

type PolicyVersion = {
  title: string;
  terms_content: string;
  privacy_content: string;
  version: string;
  effective_date: string | null;
};

const LegalPolicy = () => {
  const location = useLocation();
  const isTerms = location.pathname === "/terms";
  const [policy, setPolicy] = useState<PolicyVersion | null>(null);
  const displayPolicy = resolveDisplayPolicy(policy);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from("policy_versions")
        .select("title,terms_content,privacy_content,version,effective_date")
        .eq("is_active", true)
        .order("effective_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (mounted && data) setPolicy(data as PolicyVersion);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Navbar />

      {/* Hero */}
      <section className="public-templates-hero-gradient px-4 pt-[96px] sm:px-6 sm:pt-[120px] lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col justify-center gap-2 py-4 sm:gap-[16px] sm:py-[48px] sm:min-h-[285px]">
          <h1 className="font-segoe font-bold leading-tight tracking-[-0.03em] text-public-text-neutral-on-neutral text-[28px] sm:text-public-fs-hero">
            Legal Policies
          </h1>
          <p className="font-segoe font-normal leading-relaxed sm:leading-[120%] text-public-text-neutral-on-neutral text-sm sm:text-public-fs-subtitle-sm max-w-xl">
            Review how Y-TRACE handles your data and the terms for using the platform.
          </p>
        </div>
      </section>

      {/* Tab bar */}
      <section className="bg-public-bg-section px-4 pb-3 pt-4 sm:px-6 sm:pb-[32px] sm:pt-[48px] lg:px-[64px]">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex gap-2 sm:gap-[10px] rounded-xl sm:rounded-[16px] border border-public-border-default bg-white p-2 sm:p-[16px] shadow-2xs sm:shadow-public-nav">
            <Link
              to="/privacy"
              className={`flex h-9 sm:h-[48px] flex-1 items-center justify-center rounded-lg sm:rounded-[8px] px-3 sm:px-[16px] font-segoe text-sm sm:text-public-fs-subheading-sm font-semibold sm:font-normal leading-none sm:leading-[100%] transition-colors shadow-2xs sm:shadow-none ${
                !isTerms
                  ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                  : "text-public-text-brand hover:bg-slate-50"
              }`}
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className={`flex h-9 sm:h-[48px] flex-1 items-center justify-center rounded-lg sm:rounded-[8px] px-3 sm:px-[16px] font-segoe text-sm sm:text-public-fs-subheading-sm font-semibold sm:font-normal leading-none sm:leading-[100%] transition-colors shadow-2xs sm:shadow-none ${
                isTerms
                  ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                  : "text-public-text-brand hover:bg-slate-50"
              }`}
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </section>

      {/* Policy content */}
      <section className="bg-public-bg-section px-4 pb-12 sm:px-6 sm:pb-[64px] lg:px-[64px]">
        <div className="mx-auto w-full max-w-7xl">
          <LegalPolicyView type={isTerms ? "terms" : "privacy"} policy={displayPolicy} />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LegalPolicy;
