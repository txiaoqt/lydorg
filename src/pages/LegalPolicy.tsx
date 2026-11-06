import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowDown, ArrowUp, ShieldCheck } from "lucide-react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { PolicyContent } from "@/components/PolicyContent";
import { supabase } from "@/lib/supabase";
import { usePublicContactInfo } from "@/lib/admin-system-settings";
import { getPolicySectionId, normalizePolicyHeading } from "@/lib/policy-content";
import { resolveDisplayPolicy } from "@/lib/ytrace-policy";
import { cn } from "@/lib/utils";

type PolicyVersion = {
  title: string;
  terms_content: string;
  privacy_content: string;
  version: string;
  effective_date: string | null;
};

type PolicySection = { id: string; number: string; title: string; body: string };

// Splits policy markdown on "## " headings. The "at a Glance" section becomes the summary callout.
const parsePolicy = (content: string, docNumber: number) => {
  const sections: PolicySection[] = [];
  let glance = "";
  let current: { heading: string; lines: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const body = current.lines.join("\n");
    if (/at a glance/i.test(current.heading)) {
      glance = body;
    } else {
      const match = current.heading.match(/^(\d+)\.\s*(.*)$/);
      sections.push({
        id: getPolicySectionId(current.heading),
        number: match ? `${docNumber}.${match[1]}` : "",
        title: match ? match[2] : current.heading,
        body,
      });
    }
  };

  for (const line of content.split("\n")) {
    if (line.trim().startsWith("## ")) {
      flush();
      current = { heading: normalizePolicyHeading(line.trim()), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  flush();
  return { glance, sections };
};

const scrollToId = (id: string) => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
};

const anchorClass = "scroll-mt-[130px] xl:scroll-mt-[176px]";
const textLinkClass =
  "inline-flex items-center gap-1.5 font-inter text-sm font-medium text-public-text-brand transition-colors hover:text-public-text-brand-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-border-brand focus-visible:ring-offset-2";

const LegalPolicy = () => {
  const location = useLocation();
  const isTerms = location.pathname === "/terms";
  const { email } = usePublicContactInfo();
  const [policy, setPolicy] = useState<PolicyVersion | null>(null);
  const displayPolicy = resolveDisplayPolicy(policy);
  const [activeDoc, setActiveDoc] = useState<"privacy" | "terms">(isTerms ? "terms" : "privacy");

  const documents = useMemo(
    () => [
      { key: "privacy" as const, id: "privacy-policy", number: 1, title: "Privacy Policy", ...parsePolicy(displayPolicy.privacy_content, 1) },
      { key: "terms" as const, id: "terms-of-service", number: 2, title: "Terms of Service", ...parsePolicy(displayPolicy.terms_content, 2) },
    ],
    [displayPolicy.privacy_content, displayPolicy.terms_content],
  );

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

  // /terms opens at the Terms of Service; hash links are handled by the app's route scroller.
  useEffect(() => {
    if (!isTerms || location.hash) return;
    const timer = window.setTimeout(() => {
      document.getElementById("terms-of-service")?.scrollIntoView({ block: "start" });
      setActiveDoc("terms");
    }, 50);
    return () => window.clearTimeout(timer);
  }, [isTerms, location.hash]);

  useEffect(() => {
    const onScroll = () => {
      const terms = document.getElementById("terms-of-service");
      setActiveDoc(terms && terms.getBoundingClientRect().top < 240 ? "terms" : "privacy");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onThisPage = [
    { id: "privacy-policy", label: "Privacy Policy" },
    { id: "terms-of-service", label: "Terms of Service" },
    { id: "policy-questions", label: "Questions about these policies" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="public-templates-hero-gradient public-hero-pasig-photo px-4 sm:px-6 lg:px-[64px]">
        <div className="public-page-hero-body mx-auto flex w-full max-w-7xl flex-col justify-center gap-6 pb-6 pt-6 sm:gap-[48px] sm:pb-[48px] sm:pt-[64px]">
          <div className="flex flex-col items-center gap-2.5 text-center sm:items-start sm:text-left">
            <h1 className="font-tnr font-normal leading-[1.1] tracking-[-0.01em] text-public-text-neutral-on-neutral text-[28px] sm:text-public-fs-hero">
              Legal Policies
            </h1>
            <p className="font-inter text-base font-normal leading-[1.6] text-white/85">
              Review the Privacy Policy and Terms of Service for information on personal data protection and the terms governing the use of the Y-TRACE platform.
            </p>
          </div>
        </div>
      </section>

      {/* On this page */}
      <nav aria-label="On this page" className="border-b border-public-border-default bg-white px-4 sm:px-6 lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 py-4">
          <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">On this page</span>
          {onThisPage.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(event) => {
                event.preventDefault();
                scrollToId(item.id);
              }}
              className={textLinkClass}
            >
              {item.label}
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </a>
          ))}
        </div>
      </nav>

      {/* Documents */}
      <section className="bg-white px-4 py-10 sm:px-6 sm:py-[56px] lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl gap-12">
          {/* Sidebar */}
          <aside className="hidden w-[240px] shrink-0 lg:block">
            <nav aria-label="In this document" className="sticky top-[100px] max-h-[calc(100vh-120px)] overflow-y-auto pb-4 xl:top-[148px] xl:max-h-[calc(100vh-168px)]">
              <p className="mb-4 font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">In this document</p>
              {documents.map((doc) => {
                const active = activeDoc === doc.key;
                return (
                  <div key={doc.key} className="mb-5">
                    <a
                      href={`#${doc.id}`}
                      onClick={(event) => {
                        event.preventDefault();
                        scrollToId(doc.id);
                      }}
                      aria-current={active ? "location" : undefined}
                      className={cn(
                        "flex items-center gap-3 border-b px-3 py-2.5 font-inter text-sm font-medium transition-colors",
                        active
                          ? "border-b-public-border-brand border-l-2 border-l-public-border-brand bg-public-bg-section text-public-text-brand"
                          : "border-b-public-border-default text-public-text-brand hover:bg-slate-50",
                      )}
                    >
                      <span className="text-xs">{String(doc.number).padStart(2, "0")}</span>
                      {doc.title}
                    </a>
                    {/* Sub-sections of the document being read; the other stays collapsed to keep the list short. */}
                    {active ? (
                      <ul className="mt-2 space-y-0.5">
                        {doc.sections.map((section) => (
                          <li key={section.id}>
                            <a
                              href={`#${section.id}`}
                              onClick={(event) => {
                                event.preventDefault();
                                scrollToId(section.id);
                              }}
                              className="block px-3 py-1.5 font-inter text-xs leading-snug text-slate-600 transition-colors hover:text-public-text-brand"
                            >
                              {section.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {documents.map((doc, docIndex) => {
              const isLast = docIndex === documents.length - 1;
              const next = documents[docIndex + 1];
              const previous = documents[docIndex - 1];
              return (
                <article
                  key={doc.key}
                  id={doc.id}
                  aria-labelledby={`${doc.id}-title`}
                  className={cn(anchorClass, docIndex > 0 && "mt-12 border-t-2 border-public-text-brand pt-10")}
                >
                  <p className="font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-public-text-brand">
                    {String(doc.number).padStart(2, "0")} / Legal policies
                  </p>
                  <h2 id={`${doc.id}-title`} className="mt-3 font-tnr text-[30px] font-normal leading-[1.15] text-public-text-brand sm:text-[34px]">
                    {doc.title}
                  </h2>
                  <p className="mt-2 font-inter text-xs text-slate-500">
                    Version {displayPolicy.version} · Last updated {displayPolicy.updatedAt ?? displayPolicy.effectiveDate}
                  </p>

                  {doc.glance ? (
                    <div className="mt-6 flex gap-3 bg-public-bg-section px-4 py-4 sm:px-5">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-public-text-brand" aria-hidden="true" />
                      <PolicyContent content={doc.glance} variant="redesign" />
                    </div>
                  ) : null}

                  <div className="mt-6 border-t border-public-border-default">
                    {doc.sections.map((section) => {
                      const isLegalBases = section.title.includes("Legal Bases for Processing");
                      return (
                        <section
                          key={section.id}
                          id={section.id}
                          data-alias-id={isLegalBases ? "legal-bases-for-processing" : undefined}
                          className={cn(anchorClass, "flex gap-4 border-b border-public-border-default py-6 sm:gap-6")}
                        >
                          <span className="w-8 shrink-0 pt-1 font-inter text-xs font-medium text-public-text-brand">{section.number}</span>
                          <div className="min-w-0 flex-1">
                            {isLegalBases ? <span id="legal-bases-for-processing" className={anchorClass} /> : null}
                            <h3 className="mb-3 font-inter text-lg font-medium leading-snug text-public-text-brand">{section.title}</h3>
                            <PolicyContent content={section.body} variant="redesign" />
                          </div>
                        </section>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-5">
                    {previous ? (
                      <a href={`#${previous.id}`} onClick={(event) => { event.preventDefault(); scrollToId(previous.id); }} className={textLinkClass}>
                        Return to {previous.title}
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="font-inter text-xs text-slate-500">Continue reading</span>
                    )}
                    {isLast ? (
                      <a href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={textLinkClass}>
                        Back to top
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : (
                      <a href={`#${next.id}`} onClick={(event) => { event.preventDefault(); scrollToId(next.id); }} className={textLinkClass}>
                        {next.title}
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}

            {/* Questions */}
            <div id="policy-questions" className={cn(anchorClass, "mt-12 border border-public-border-default bg-public-bg-section px-5 py-6 sm:px-8")}>
              <h2 className="font-inter text-lg font-medium text-public-text-brand">Questions about these policies</h2>
              <p className="mt-2 font-inter text-sm leading-relaxed text-slate-600">
                For questions about the Privacy Policy or Terms of Service, or to exercise your data privacy rights, contact the PCYDO at{" "}
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-public-text-brand-secondary underline underline-offset-[3px] hover:text-public-text-brand"
                >
                  {email}
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LegalPolicy;
