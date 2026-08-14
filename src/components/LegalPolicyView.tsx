import { useEffect, useMemo, useState } from "react";
import { ArrowUp, ChevronDown, List } from "lucide-react";
import { PolicyContent } from "@/components/PolicyContent";
import { getPolicySections } from "@/lib/policy-content";
import type { DisplayPolicy } from "@/lib/ytrace-policy";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type LegalPolicyViewProps = {
  type: "privacy" | "terms";
  policy: DisplayPolicy;
};

const backToTop = () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
};

const scrollToSection = (sectionId: string) => {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

export const LegalPolicyView = ({ type, policy }: LegalPolicyViewProps) => {
  const isPrivacy = type === "privacy";
  const title = isPrivacy ? "Privacy Policy" : "Terms of Service";
  const content = isPrivacy ? policy.privacy_content : policy.terms_content;
  const sections = useMemo(() => getPolicySections(content), [content]);
  const [showFloatingTop, setShowFloatingTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowFloatingTop(true);
      } else {
        setShowFloatingTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <article className="legal-policy-view w-full relative">
      <div className="flex flex-col gap-[24px] lg:flex-row lg:items-start">

        {/* Left column — sticky TOC for Desktop (visible on lg and up) */}
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
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(section.id);
                  }}
                  className="line-clamp-2 font-segoe text-public-fs-subheading-sm font-normal leading-[140%] text-public-text-brand transition-colors hover:text-public-text-brand"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-1 flex-col gap-3.5 sm:gap-[16px]">

          {/* Mobile "Jump to section" Dropdown (visible on screens below lg) */}
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-[42px] w-full items-center justify-between gap-2 rounded-xl border border-public-border-default bg-white px-3.5 shadow-2xs font-segoe text-xs font-semibold text-public-text-brand hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 truncate">
                    <List className="h-4 w-4 text-public-text-brand shrink-0" />
                    <span className="truncate">Jump to section</span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-public-text-brand shrink-0 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                onCloseAutoFocus={(e) => e.preventDefault()}
                className="w-[calc(100vw-32px)] max-w-md max-h-[360px] overflow-y-auto p-1.5 rounded-xl bg-white border border-public-border-default shadow-lg z-50"
              >
                <div className="px-2.5 py-1.5 font-segoe text-[11px] font-bold uppercase tracking-wider text-public-text-secondary border-b border-border/50 mb-1">
                  Table of Contents
                </div>
                {sections.map((section) => (
                  <DropdownMenuItem
                    key={section.id}
                    asChild
                    onSelect={() => {
                      requestAnimationFrame(() => {
                        scrollToSection(section.id);
                      });
                    }}
                    className="text-xs font-medium text-public-text-brand rounded-lg cursor-pointer py-2 px-2.5 hover:bg-primary/10 hover:text-primary transition-colors break-words w-full"
                  >
                    <a
                      href={`#${section.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(section.id);
                      }}
                      className="w-full block"
                    >
                      {section.title}
                    </a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title frame */}
          <div className="flex flex-col gap-1 sm:gap-[10px] border-b border-public-border-default pb-2 sm:pb-[10px]">
            <h2 className="font-segoe text-xl sm:text-[24px] font-bold leading-snug sm:leading-[120%] text-public-text-brand">
              {title}
            </h2>
            <p className="font-segoe text-xs sm:text-public-fs-body-sm font-normal leading-relaxed sm:leading-[120%] text-public-text-secondary">
              Last Updated: {policy.updatedAt ?? "June 30, 2026"}
            </p>
          </div>

          {/* Policy body */}
          <PolicyContent content={content} hideDocumentTitle hideMetadata variant="redesign" />

        </div>
      </div>

      {/* Floating Back to top Button for Mobile (fixed viewport position) */}
      <div
        className={cn(
          "fixed bottom-5 right-4 z-40 lg:hidden transition-all duration-300 pointer-events-none pb-[env(safe-area-inset-bottom,0px)]",
          showFloatingTop
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-3 pointer-events-none"
        )}
      >
        <button
          type="button"
          onClick={backToTop}
          className="flex h-[40px] items-center justify-center gap-1.5 rounded-full bg-[#0E2F66] px-4 font-segoe text-xs font-semibold text-white shadow-lg border border-white/20 hover:bg-[#0A234D] transition-colors cursor-pointer"
          aria-label="Back to top"
        >
          <ArrowUp className="h-3.5 w-3.5 text-white" aria-hidden="true" />
          <span>Back to top</span>
        </button>
      </div>
    </article>
  );
};
