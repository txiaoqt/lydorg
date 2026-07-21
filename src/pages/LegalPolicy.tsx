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
      <section className="public-templates-hero-gradient px-5 pt-[120px] sm:px-6 lg:px-[64px]">
        <div className="mx-auto flex min-h-[285px] w-full max-w-7xl flex-col justify-center gap-[16px] py-[48px]">
          <h1 className="font-segoe font-bold leading-[100%] tracking-[-0.03em] text-public-text-neutral-on-neutral text-public-fs-hero">
            Legal Policies
          </h1>
          <p className="font-segoe font-normal leading-[120%] text-public-text-neutral-on-neutral text-public-fs-subtitle-sm">
            Review how Y-TRACE handles your data and the terms for using the platform.
          </p>
        </div>
      </section>

      {/* Tab bar */}
      <section className="bg-public-bg-section px-5 pb-[32px] pt-[48px] sm:px-6 lg:px-[64px]">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex gap-[10px] rounded-[16px] border border-public-border-default bg-white p-[16px] shadow-public-nav">
            <Link
              to="/privacy"
              className={`flex h-[48px] flex-1 items-center justify-center rounded-[8px] px-[16px] font-segoe text-public-fs-subheading-sm font-normal leading-[100%] transition-colors ${
                !isTerms
                  ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                  : "text-public-text-brand hover:bg-public-bg-section"
              }`}
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className={`flex h-[48px] flex-1 items-center justify-center rounded-[8px] px-[16px] font-segoe text-public-fs-subheading-sm font-normal leading-[100%] transition-colors ${
                isTerms
                  ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                  : "text-public-text-brand hover:bg-public-bg-section"
              }`}
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </section>

      {/* Policy content */}
      <section className="bg-public-bg-section px-5 pb-[64px] sm:px-6 lg:px-[64px]">
        <div className="mx-auto w-full max-w-7xl">
          <LegalPolicyView type={isTerms ? "terms" : "privacy"} policy={displayPolicy} />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LegalPolicy;
