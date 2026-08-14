import { ChevronDown, ChevronUp, CircleHelp, Filter, Search, Send } from "lucide-react";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import AnnouncementBar from "@/components/AnnouncementBar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type FaqCategory = "getting-started" | "documents" | "budget" | "portal";
type FilterId = "all" | FaqCategory;

const faqs: { question: string; answer: string; category: FaqCategory }[] = [
  {
    question: "What is Y-TRACE?",
    answer:
      "Y-TRACE is a youth organization compliance portal for Pasig City. It supports organization registration, compliance document submission, budget requests, liquidation reporting, templates, and official updates from the PCYDO office.",
    category: "getting-started",
  },
  {
    question: "Who can create an account?",
    answer:
      "Only organization representatives can register an account. Each account is tied to one youth organization. If your organization already has a Unique Registration Number (URN), select the previously registered organization option during sign-up.",
    category: "getting-started",
  },
  {
    question: "What do I need to complete first before submitting documents?",
    answer:
      "You need to fill out and save your Organization Profile first. The profile must be reviewed and verified by an admin before you can proceed to document submission and budget requests.",
    category: "getting-started",
  },
  {
    question: "How does document submission work?",
    answer:
      "Go to Document Submission and upload the required file for each published document slot. Once a file is attached, it becomes available for admin review, and you will be notified if any document needs revision or has been approved.",
    category: "documents",
  },
  {
    question: "Where can I download the official forms and templates?",
    answer:
      "Published templates are available from the public Templates page and inside the portal's Templates area. Document submission templates and other shared reference files will appear there once the admin uploads them.",
    category: "documents",
  },
  {
    question: "What happens after a budget request is approved?",
    answer:
      "Once approved, your budget request moves to 'Submit Onsite'. You then submit the required hard copy to the PCYDO office. After the office confirms release of funds, a liquidation report becomes available for you to complete after your activity.",
    category: "budget",
  },
  {
    question: "What is a liquidation report and when do I submit it?",
    answer:
      "A liquidation report accounts for how the released budget was used. It becomes available after the budget release process is completed. You submit it after your activity, and the deadline is based on the release timeline shown in the portal and notifications.",
    category: "budget",
  },
  {
    question: "Where do I see status updates and admin remarks?",
    answer:
      "Check the Notifications section for real-time updates on document approvals, revision requests, budget decisions, and liquidation reminders. The Compliance Status section gives you a full summary of your current standing.",
    category: "portal",
  },
  {
    question: "How do admins manage records?",
    answer:
      "PCYDO staff use a separate Admin Portal to review organization profiles, validate documents, approve or reject budget requests, monitor liquidation reports, manage templates, and publish news and transparency updates.",
    category: "portal",
  },
];

const filterTabs: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "getting-started", label: "Getting Started" },
  { id: "documents", label: "Documents & Compliance" },
  { id: "budget", label: "Budget & Liquidation" },
  { id: "portal", label: "Portal & Notifications" },
];

const categoryDefs: { id: FaqCategory; title: string }[] = [
  { id: "getting-started", title: "Getting Started" },
  { id: "documents", title: "Documents & Compliance" },
  { id: "budget", title: "Budget & Liquidation" },
  { id: "portal", title: "Portal & Notifications" },
];

const Faqs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const query = searchTerm.trim().toLowerCase();

  const filteredFaqs = faqs.filter((faq) => {
    if (activeFilter !== "all" && faq.category !== activeFilter) return false;
    if (!query) return true;
    return (
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query)
    );
  });

  const groups = categoryDefs
    .map((cat) => ({
      ...cat,
      items: filteredFaqs.filter((f) => f.category === cat.id),
    }))
    .filter((group) => group.items.length > 0);

  const activeFilterLabel = filterTabs.find((t) => t.id === activeFilter)?.label || "All";

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Navbar />

      {/* Hero */}
      <section className="public-templates-hero-gradient px-4 pt-[96px] sm:px-6 sm:pt-[120px] lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 pb-4 pt-4 sm:gap-[48px] sm:pb-[48px] sm:pt-[64px]">

          <div className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left sm:gap-[16px]">
            <h1 className="font-segoe font-bold leading-[105%] tracking-[-0.03em] text-public-text-neutral-on-neutral text-[24px] sm:text-public-fs-hero">
              Frequently Asked Questions
            </h1>
            <p className="font-segoe font-normal leading-relaxed sm:leading-[120%] text-public-text-neutral-on-neutral text-xs sm:text-public-fs-subtitle-sm max-w-xl">
              Quick answers about using Y-TRACE and navigating the compliance workflow.
            </p>
          </div>

          {/* Desktop Search Bar — visible on md and up */}
          <div className="hidden md:flex h-[52px] w-full max-w-[792px] items-center gap-[8px] rounded-full border border-public-border-default bg-white px-[16px] shadow-xs">
            <Search className="h-4 w-4 shrink-0 text-public-text-secondary" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search questions..."
              className="flex-1 bg-transparent font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-neutral-default outline-hidden placeholder:text-public-text-secondary"
            />
          </div>

        </div>
      </section>

      {/* Catalog */}
      <section className="bg-public-bg-section px-4 pb-10 pt-5 sm:px-6 sm:pb-[32px] sm:pt-[48px] lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-[24px]">

          {/* Mobile Unified Toolbar: Single Search + [Category: All] (matching Forms & Templates) */}
          <div className="flex flex-col gap-2.5 bg-card border border-border/60 p-2.5 px-3 rounded-2xl shadow-xs md:hidden mb-1">
            {/* Full-width Search Input */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 pr-3 text-xs rounded-xl bg-background border-border/80 shadow-2xs font-segoe placeholder:text-muted-foreground"
              />
            </div>

            {/* Row 2: Category Action Button */}
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-full rounded-xl border-border/80 bg-background text-xs font-semibold gap-1.5 justify-center shadow-2xs cursor-pointer truncate text-primary hover:text-primary hover:bg-primary/5"
                  >
                    <Filter className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">Category: {activeFilterLabel}</span>
                    <ChevronDown className="h-3 w-3 text-primary shrink-0 opacity-70 ml-auto" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1.5 rounded-xl bg-card border-border/80 shadow-lg">
                  {filterTabs.map((tab) => {
                    const count = tab.id === "all" ? faqs.length : faqs.filter((f) => f.category === tab.id).length;
                    return (
                      <DropdownMenuItem
                        key={tab.id}
                        onClick={() => setActiveFilter(tab.id)}
                        className={cn(
                          "text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-between py-1.5 px-2.5",
                          activeFilter === tab.id && "bg-primary/10 text-primary font-bold"
                        )}
                      >
                        <span>{tab.label}</span>
                        <span className="text-[10px] text-muted-foreground">({count})</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Desktop Filter Tabs Bar — visible on md and up */}
          <div className="hidden md:flex gap-[10px] justify-center p-[10px]">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={
                  activeFilter === tab.id
                    ? `shrink-0 whitespace-nowrap rounded-full bg-public-bg-brand px-[20px] py-[10px] font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-neutral-on-neutral backdrop-blur-[4px]${tab.id === "all" ? " min-w-[80px]" : ""}`
                    : `shrink-0 whitespace-nowrap rounded-full border border-public-border-default bg-white px-[20px] py-[10px] font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-neutral-default hover:bg-slate-50 transition-colors${tab.id === "all" ? " min-w-[80px]" : ""}`
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* FAQ groups */}
          {groups.length > 0 ? (
            <div className="flex flex-col gap-4 sm:gap-[24px]">
              {groups.map((group) => (
                <div key={group.id} className="flex flex-col gap-2 sm:gap-[16px] px-0 sm:px-[24px] pb-1 sm:pb-[24px]">
                  <h2 className="font-segoe text-xs sm:text-public-fs-subheading-sm font-bold uppercase tracking-wider text-public-text-brand flex items-center gap-1.5">
                    <span>{group.title}</span>
                    <span className="text-[11px] sm:text-public-fs-subheading-sm font-semibold text-public-text-secondary">({group.items.length})</span>
                  </h2>
                  <div className="flex flex-col gap-2 sm:gap-[16px]">
                    {group.items.map((faq) => {
                      const isOpen = openId === faq.question;
                      return (
                        <div
                          key={faq.question}
                          className="rounded-xl sm:rounded-[16px] border border-public-border-default [border-top-color:rgba(113,191,253,1)] bg-white p-3.5 sm:px-[24px] sm:py-[16px] shadow-2xs sm:shadow-public-overview-card transition-shadow"
                        >
                          <button
                            type="button"
                            onClick={() => setOpenId(isOpen ? null : faq.question)}
                            className="flex w-full items-center gap-2.5 sm:gap-[8px] text-left cursor-pointer"
                          >
                            <span className="flex-1 font-segoe text-xs sm:text-public-fs-subheading-sm font-semibold leading-snug sm:leading-[140%] text-public-text-brand">
                              {faq.question}
                            </span>
                            {isOpen ? (
                              <span className="flex h-6 w-6 sm:h-[29px] sm:w-[29px] shrink-0 items-center justify-center rounded-full bg-[rgba(10,93,159,1)] text-white">
                                <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </span>
                            ) : (
                              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-public-text-brand opacity-80" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="mt-2.5 sm:mt-[24px] border-t border-public-border-default/70 pt-2.5 sm:pt-[24px]">
                              <p className="font-segoe text-xs sm:text-public-fs-body-sm font-normal leading-relaxed sm:leading-[160%] text-public-text-neutral-default">
                                {faq.answer}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl sm:rounded-[16px] border border-dashed border-public-bg-brand-subtle bg-white px-4 py-8 text-center font-segoe text-xs sm:text-public-fs-body-sm text-public-text-secondary">
              No questions found matching your search.
            </div>
          )}

          {/* Still Need Help */}
          <div className="mx-auto flex w-full max-w-[1024px] flex-col items-center gap-2.5 sm:gap-[16px] rounded-xl sm:rounded-[16px] border border-public-border-default bg-white p-5 sm:px-[24px] sm:py-[60px] text-center shadow-2xs sm:shadow-public-nav mt-2 sm:mt-0">
            <div className="flex h-9 w-9 sm:h-[48px] sm:w-[48px] items-center justify-center rounded-full bg-public-bg-tertiary-100 p-1.5 sm:p-[8px]">
              <CircleHelp className="h-5 w-5 sm:h-8 sm:w-8 text-public-text-brand" />
            </div>
            <div className="flex flex-col gap-1 sm:gap-[10px] px-1 sm:px-[10px]">
              <h3 className="font-segoe text-sm sm:text-public-fs-subtitle-sm font-bold sm:font-semibold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand">
                Still Need Help?
              </h3>
              <p className="font-segoe text-xs sm:text-public-fs-body-sm font-normal leading-relaxed sm:leading-[120%] text-public-text-secondary max-w-md">
                Can't find the answer you're looking for? Reach out to the PCYDO office directly
                and we'll get back to you as soon as possible.
              </p>
            </div>
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=lydo@pasigcity.gov.ph"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 sm:gap-[8px] rounded-lg sm:rounded-[8px] bg-public-bg-brand px-4 py-2 sm:px-[20px] sm:py-[12px] font-segoe text-xs sm:text-public-fs-subheading-sm font-semibold sm:font-normal leading-none text-public-text-on-brand transition-colors hover:bg-public-bg-brand-hover shadow-2xs mt-1 sm:mt-0"
            >
              <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              Send an Email
            </a>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Faqs;
