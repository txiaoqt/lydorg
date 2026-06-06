import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { PolicyContent } from "@/components/PolicyContent";

type PolicyVersion = {
  title: string;
  terms_content: string;
  privacy_content: string;
  version: string;
};

const LegalPolicy = () => {
  const location = useLocation();
  const isTerms = location.pathname === "/terms";
  const [policy, setPolicy] = useState<PolicyVersion | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from("policy_versions")
        .select("title,terms_content,privacy_content,version")
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
      <Navbar />
      <main className="container mx-auto px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
            <Link to="/terms" className={isTerms ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}>
              Terms of Service
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link to="/privacy" className={!isTerms ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}>
              Privacy Policy
            </Link>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Draft legal text for prototype use. Final wording should be reviewed before production use.
          </p>
          <PolicyContent
            content={isTerms ? policy?.terms_content ?? "Terms of Service content is not available yet." : policy?.privacy_content ?? "Privacy Policy content is not available yet."}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPolicy;
