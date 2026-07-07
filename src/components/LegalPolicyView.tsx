import { ArrowUp, ScrollText, ShieldCheck } from "lucide-react";
import { PolicyContent } from "@/components/PolicyContent";
import { getPolicySections } from "@/lib/policy-content";
import type { DisplayPolicy } from "@/lib/ytrace-policy";

type LegalPolicyViewProps = {
  type: "privacy" | "terms";
  policy: DisplayPolicy;
};

const backToTop = () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
};

export const LegalPolicyView = ({ type, policy }: LegalPolicyViewProps) => {
  const isPrivacy = type === "privacy";
  const title = isPrivacy ? "Privacy Policy" : "Terms of Service";
  const content = isPrivacy ? policy.privacy_content : policy.terms_content;
  const sections = getPolicySections(content);
  const Icon = isPrivacy ? ShieldCheck : ScrollText;

  return (
    <article className="legal-policy-view mx-auto w-full max-w-[800px]">
      <section className="mb-5 flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5" aria-label="Policy information">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold leading-tight text-foreground sm:text-xl">{title}</h2>
            <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
              Active
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            Version {policy.version} · Effective {policy.effectiveDate}
          </p>
        </div>
      </section>

      {sections.length ? (
        <details className="group mb-5 rounded-xl border border-border bg-card">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            Contents
            <span className="text-xs font-normal text-muted-foreground group-open:hidden">Show sections</span>
            <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">Hide sections</span>
          </summary>
          <nav className="border-t border-border px-4 py-3" aria-label={`${title} contents`}>
            <ol className="grid gap-1 sm:grid-cols-2 sm:gap-x-6">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex min-h-11 items-center rounded-lg px-2 py-2 text-sm leading-5 text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </details>
      ) : null}

      <section className="rounded-2xl border border-border bg-card px-5 py-6 shadow-sm sm:px-8 sm:py-8" aria-label={`${title} content`}>
        <PolicyContent content={content} hideDocumentTitle hideMetadata />
      </section>

      <footer className="mt-5 flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-sm">
        <p>
          Version {policy.version} · Last updated {policy.updatedAt ?? "June 30, 2026"} · Effective {policy.effectiveDate}
        </p>
        <button
          type="button"
          onClick={backToTop}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg px-3 font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:self-auto"
          aria-label={`Back to top of ${title}`}
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
          Back to top
        </button>
      </footer>
    </article>
  );
};
