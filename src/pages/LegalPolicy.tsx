import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import { LegalPolicyView } from "@/components/LegalPolicyView";
import Navbar from "@/components/Navbar";
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
  const navigate = useNavigate();
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
      <Navbar />
      <main className="container mx-auto px-5 py-7 sm:py-10">
        <div className="mx-auto max-w-[800px]">
          <header className="mb-5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Go back from legal policy"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </button>
            <h1 className="text-[1.75rem] font-bold tracking-tight text-foreground sm:text-3xl">
              {isTerms ? "Terms of Service" : "Privacy Policy"}
            </h1>
          </header>

          <nav className="mb-5 flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card p-1 text-sm" aria-label="Legal policies">
            <Link
              to="/terms"
              className={`flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isTerms ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              className={`flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                !isTerms ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Privacy Policy
            </Link>
          </nav>

          <LegalPolicyView type={isTerms ? "terms" : "privacy"} policy={displayPolicy} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPolicy;
