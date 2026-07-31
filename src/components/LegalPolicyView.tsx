import { useMemo } from "react";
import { ArrowUp } from "lucide-react";
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
  const sections = useMemo(() => getPolicySections(content), [content]);

  return (
    <article className="legal-policy-view w-full">
      <div className="flex flex-col gap-[24px] lg:flex-row lg:items-start">

        {/* Left column — sticky TOC */}
        <div className="hidden w-[274px] shrink-0 lg:block">
          <div className="sticky top-[130px] flex flex-col gap-[28px] p-[10px]">
            <span className="font-segoe text-public-fs-subheading-sm font-semibold uppercase leading-[140%] tracking-[0.04em] text-public-text-brand">
              Table of Contents
            </span>
            <nav className="flex flex-col gap-[12px]">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="line-clamp-2 font-segoe text-public-fs-subheading-sm font-normal leading-[140%] text-public-text-brand transition-colors hover:text-public-text-brand"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-1 flex-col gap-[16px]">

          {/* Title frame */}
          <div className="flex flex-col gap-[10px] border-b border-public-border-default pb-[10px]">
            <h2 className="font-segoe text-[24px] font-bold leading-[120%] text-public-text-brand">
              {title}
            </h2>
            <p className="font-segoe text-public-fs-body-sm font-normal leading-[120%] text-public-text-secondary">
              Last Updated: {policy.updatedAt ?? "June 30, 2026"}
            </p>
          </div>

          {/* Policy body */}
          <PolicyContent content={content} hideDocumentTitle hideMetadata variant="redesign" />

        </div>
      </div>

      {/* Back to top */}
      <footer className="mt-5 flex justify-end rounded-xl border border-border bg-card px-4 py-4">
        <button
          type="button"
          onClick={backToTop}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Back to top of ${title}`}
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
          Back to top
        </button>
      </footer>
    </article>
  );
};
