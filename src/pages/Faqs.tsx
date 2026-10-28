import { ChevronDown, ChevronUp, CircleHelp, Filter, Search, Send } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
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
import { usePublicContactInfo } from "@/lib/admin-system-settings";

type FaqCategory = "general" | "yorp" | "forms" | "ypop" | "budget" | "support";
type FilterId = "all" | FaqCategory;

type Faq = {
  question: string;
  answer: string;
  category: FaqCategory;
  supportingParagraphs?: { label?: string; text: string }[];
  listItems?: string[];
  answerLink?: { before: string; label: string; after: string; to: string };
  learnMore?: { before: string; label: string; after: string; to: string };
};

const faqs: Faq[] = [
  {
    question: "What is Y-TRACE?",
    answer:
      "Y-TRACE is a digital system developed for the Pasig City Youth Development Office (PCYDO) to support youth organization programs and services in Pasig City. Through the public website and Organization Portal, youth organizations can access official information and resources, register for the Youth Organization Registration Program (YORP), participate in the Youth Participation Organization Passport (YPOP) program, submit budget requests and liquidation reports, and view official announcements and updates.",
    category: "general",
    learnMore: {
      before: "Visit the ",
      label: "About page",
      after: " to learn about Y-TRACE, YORP, and YPOP.",
      to: "/about",
    },
  },
  {
    question: "Who can create an account?",
    answer:
      "The head of a youth organization may register for an account on behalf of the organization. Each account is associated with one youth organization. If your organization already has an active Unique Registration Number (URN), select the option for a previously registered organization during sign-up.",
    category: "general",
    learnMore: {
      before: "Visit the ",
      label: "About page",
      after: " for information about YORP.",
      to: "/about",
    },
  },
  {
    question: "What should I do after signing up?",
    answer:
      "You can sign up using either your Google account or the standard sign-up method. Regardless of which method you choose, you must complete and save your Organization Profile before proceeding to other sections of the Organization Portal.",
    category: "general",
    supportingParagraphs: [
      {
        label: "For organizations with an active URN: ",
        text: "Complete and save your Organization Profile to access the other sections of the portal.",
      },
      {
        label: "For organizations without a URN: ",
        text: "Complete and save your Organization Profile, then proceed to the YORP Registration section to submit the required registration documents.",
      },
    ],
    learnMore: {
      before: "Visit the ",
      label: "Forms & Templates page",
      after: " to access the official YORP registration forms and templates.",
      to: "/public-templates",
    },
  },
  {
    question: "What is the Youth Organization Registration Program (YORP)?",
    answer:
      "The Youth Organization Registration Program (YORP) is a program of the National Youth Commission (NYC) that aims to recognize and maintain a registry of youth organizations, support their development, and strengthen youth participation in community and national development.",
    category: "yorp",
    learnMore: {
      before: "Visit the ",
      label: "About page",
      after: " for information about YORP.",
      to: "/about",
    },
  },
  {
    question: "What documents are required for YORP registration?",
    answer:
      "Organizations applying for YORP registration must submit the following documents through the YORP Registration section of the Organization Portal:",
    category: "yorp",
    listItems: [
      "Pasig City YORP Registration Form (Form A)",
      "NYC YORP Registration Form (Form B)",
      "Endorsement Letter from the Appropriate Authority",
      "Directory of Officers and Advisers",
      "List of Members in Good Standing",
      "Constitution and By-Laws",
    ],
    learnMore: {
      before: "Visit the ",
      label: "Forms & Templates page",
      after: " to download the official YORP registration forms and templates.",
      to: "/public-templates",
    },
  },
  {
    question: "Where can I access the official forms and templates?",
    answer: "",
    category: "forms",
    answerLink: {
      before: "Official forms, templates, and reference documents are available on the ",
      label: "Forms & Templates page",
      after: " of the public website and the Organization Portal.",
      to: "/public-templates",
    },
  },
  {
    question: "What is the Youth Participation Organization Passport (YPOP)?",
    answer:
      "The Youth Participation Organization Passport (YPOP) is a program of the Pasig City Youth Development Office (PCYDO) that aims to encourage and recognize youth organizations' participation in city-led and organization-initiated activities. It evaluates organizations based on their participation in eligible activities, with the goal of promoting active youth participation in community development. Organizations that meet the established qualification criteria may be eligible for project grant incentives, subject to the program's requirements.",
    category: "ypop",
    learnMore: {
      before: "Visit the ",
      label: "About page",
      after: " for information about YPOP.",
      to: "/about",
    },
  },
  {
    question: "Which organizations are eligible to participate in YPOP?",
    answer:
      "Youth organizations registered under the Youth Organization Registration Program (YORP) may participate in the YPOP program, subject to the participation requirements established by the PCYDO. Participation in YPOP does not automatically qualify an organization for project grant incentives.",
    category: "ypop",
    learnMore: {
      before: "Visit the ",
      label: "About page",
      after: " for information about YORP and YPOP.",
      to: "/about",
    },
  },
  {
    question: "What are the requirements for YPOP qualification?",
    answer:
      "To qualify for YPOP project grant incentives, an organization must achieve at least 70% of the total possible points for PCYDO-mandated city-led activities. Organizations that do not meet this threshold are not eligible for these incentives.",
    category: "ypop",
    learnMore: {
      before: "Refer to the official ",
      label: "YPOP guidelines",
      after: " for the applicable participation criteria and qualification requirements.",
      to: "/public-templates",
    },
  },
  {
    question: "How can my organization submit a budget request?",
    answer:
      "Your organization must first qualify for the Youth Participation Organization Passport (YPOP) program to access the Budget Requests page of the Organization Portal. Once qualified, open the Budget Requests page, complete the required information in the Budget Request Form, and submit the completed form through the portal.",
    category: "budget",
  },
  {
    question: "How many budget requests may my organization submit per YPOP semester?",
    answer:
      "Each qualified organization may submit one budget request per YPOP semester through the Organization Portal.",
    category: "budget",
  },
  {
    question: "Where can I view updates and notifications about my organization's submissions?",
    answer:
      "Check the Notifications section of the Organization Portal for updates on document approvals, revision requests, and important deadlines.",
    category: "support",
  },
  {
    question: "What should I do if my organization's submitted documents require revisions?",
    answer:
      "Check the Notifications section of the Organization Portal for revision requests and review the accompanying administrative remarks. Revise the document according to the instructions provided and upload the updated file to the corresponding document slot within five days of the revision request. Failure to meet the deadline will result in the submission being locked. To have the submission unlocked, you must coordinate with the PCYDO for assistance.",
    category: "support",
  },
  {
    question: "What should I do if I cannot access my account?",
    answer:
      "Ensure that you are using the correct login credentials and try signing in again. If you continue to experience difficulties, contact the Pasig City Youth Development Office (PCYDO) through its official contact channels for assistance.",
    category: "support",
    learnMore: {
      before: "Visit the ",
      label: "Contact page",
      after: " for the PCYDO's official contact information.",
      to: "/contacts",
    },
  },
];

const filterTabs: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "general", label: "General Information" },
  { id: "yorp", label: "YORP" },
  { id: "forms", label: "Forms & Templates" },
  { id: "ypop", label: "YPOP" },
  { id: "budget", label: "Budget Requests" },
  { id: "support", label: "Account & Portal Support" },
];

const categoryDefs: { id: FaqCategory; title: string }[] = [
  { id: "general", title: "Section 1 · General Information" },
  { id: "yorp", title: "Section 2 · Youth Organization Registration Program (YORP)" },
  { id: "forms", title: "Section 3 · Forms and Templates" },
  { id: "ypop", title: "Section 4 · Youth Participation Organization Passport (YPOP)" },
  { id: "budget", title: "Section 5 · Budget Requests" },
  { id: "support", title: "Section 6 · Account and Portal Support" },
];

const Faqs = () => {
  const accordionId = useId();
  const { email } = usePublicContactInfo();
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const query = searchTerm.trim().toLowerCase();

  const filteredFaqs = faqs.filter((faq) => {
    if (activeFilter !== "all" && faq.category !== activeFilter) return false;
    if (!query) return true;
    const searchableText = [
      faq.question,
      faq.answer,
      ...(faq.supportingParagraphs ?? []).flatMap(({ label, text }) => [label, text]),
      ...(faq.listItems ?? []),
      faq.answerLink?.before,
      faq.answerLink?.label,
      faq.answerLink?.after,
      faq.learnMore?.before,
      faq.learnMore?.label,
      faq.learnMore?.after,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchableText.includes(query);
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
      <Navbar />

      {/* Hero */}
      <section className="public-templates-hero-gradient px-4 pt-16 sm:px-6 sm:pt-20 lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 pb-4 pt-4 sm:gap-[48px] sm:pb-[48px] sm:pt-[64px]">
          <div className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left sm:gap-[16px]">
            <h1 className="font-segoe font-bold leading-[105%] tracking-[-0.03em] text-public-text-neutral-on-neutral text-[28px] sm:text-public-fs-hero">
              Frequently Asked Questions
            </h1>
            <p className="font-segoe font-normal leading-relaxed sm:leading-[120%] text-public-text-neutral-on-neutral text-sm sm:text-public-fs-subtitle-sm max-w-xl lg:max-w-5xl">
              Find information about Y-TRACE, YORP, YPOP, and other programs and services provided by the Pasig City Youth Development Office (PCYDO).
            </p>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section className="bg-public-bg-section px-4 pb-10 pt-5 sm:px-6 sm:pb-[48px] sm:pt-[40px] lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-[24px]">

          {/* Mobile Unified Toolbar: Single Search + [Category: All] */}
          <div className="flex flex-col gap-2.5 bg-card border border-border/60 p-2.5 px-3 rounded-2xl shadow-xs md:hidden mb-1">
            {/* Full-width Search Input */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search questions by keyword, topic, or answer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 pr-3 text-base sm:text-sm rounded-xl bg-background border-border/80 shadow-2xs font-segoe placeholder:text-muted-foreground"
              />
            </div>

            {/* Row 2: Category Action Button */}
            <div className="flex items-center">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-full rounded-xl border-border/80 bg-background text-sm font-semibold gap-1.5 justify-center shadow-2xs cursor-pointer truncate text-primary hover:text-primary hover:bg-primary/5"
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

          {/* Desktop Search + Category Filter Row — visible on md and up */}
          <div className="hidden md:flex items-center gap-3 bg-card border border-border/60 p-2.5 px-3.5 rounded-2xl shadow-xs max-w-4xl mx-auto w-full">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search questions by keyword, topic, or answer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 pr-3 text-sm rounded-xl bg-background border-border/80 shadow-2xs font-segoe placeholder:text-muted-foreground w-full"
              />
            </div>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 rounded-xl border-border/80 bg-background text-sm font-semibold gap-2 px-3.5 shadow-2xs cursor-pointer text-primary hover:text-primary hover:bg-primary/5"
                >
                  <Filter className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Category: {activeFilterLabel}</span>
                  <ChevronDown className="h-3 w-3 text-primary shrink-0 opacity-70 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 p-1.5 rounded-xl bg-card border-border/80 shadow-lg">
                {filterTabs.map((tab) => {
                  const count = tab.id === "all" ? faqs.length : faqs.filter((f) => f.category === tab.id).length;
                  return (
                    <DropdownMenuItem
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id)}
                      className={cn(
                        "text-sm font-semibold rounded-lg cursor-pointer flex items-center justify-between py-1.5 px-2.5",
                        activeFilter === tab.id && "bg-primary/10 text-primary font-bold"
                      )}
                    >
                      <span>{tab.id === "all" ? "All Categories" : tab.label}</span>
                      <span className="text-[10px] text-muted-foreground">({count})</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* FAQ groups — readable centered max-width */}
          {groups.length > 0 ? (
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 sm:gap-8">
              {groups.map((group) => (
                <div key={group.id} className="flex flex-col gap-3">
                  <h2 className="font-segoe text-xs sm:text-sm font-bold uppercase tracking-wider text-[#0E2F66] flex items-center gap-2 px-1">
                    <span>{group.title}</span>
                    <span className="text-xs font-semibold text-slate-400">({group.items.length})</span>
                  </h2>
                  <div className="flex flex-col gap-2.5">
                    {group.items.map((faq) => {
                      const isOpen = openId === faq.question;
                      const questionId = `${accordionId}-question-${faqs.indexOf(faq)}`;
                      const answerId = `${accordionId}-answer-${faqs.indexOf(faq)}`;
                      return (
                        <div
                          key={faq.question}
                          className={cn(
                            "rounded-2xl border bg-white transition-all duration-200 shadow-2xs overflow-hidden",
                            isOpen
                              ? "border-public-border-brand/60 shadow-xs ring-1 ring-public-border-brand/20"
                              : "border-border/70 hover:border-public-border-brand/40"
                          )}
                        >
                          <button
                            id={questionId}
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={answerId}
                            onClick={() => setOpenId(isOpen ? null : faq.question)}
                            className="flex w-full items-center justify-between gap-3 p-4 sm:p-4.5 text-left cursor-pointer transition-colors hover:bg-slate-50/50"
                          >
                            <span className="font-segoe text-sm sm:text-base font-semibold leading-snug text-[#0E2F66]">
                              {faq.question}
                            </span>
                            <span
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                                isOpen
                                  ? "bg-public-bg-brand text-white"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              )}
                            >
                              {isOpen ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </span>
                          </button>
                          <div
                            id={answerId}
                            role="region"
                            aria-labelledby={questionId}
                            hidden={!isOpen}
                            className="border-t border-border/50 bg-slate-50/30 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4"
                          >
                              {faq.answer && (
                                <p className="font-segoe text-sm sm:text-public-fs-subheading-sm font-normal leading-relaxed text-slate-700">
                                  {faq.answer}
                                </p>
                              )}
                              {faq.answerLink && (
                                <p className="mt-2 font-segoe text-sm sm:text-public-fs-subheading-sm font-normal leading-relaxed text-slate-700">
                                  {faq.answerLink.before}
                                  <Link
                                    to={faq.answerLink.to}
                                    className="font-semibold text-public-text-brand underline underline-offset-2 transition-opacity hover:opacity-80"
                                  >
                                    {faq.answerLink.label}
                                  </Link>
                                  {faq.answerLink.after}
                                </p>
                              )}
                              {faq.supportingParagraphs?.map((paragraph) => (
                                <p
                                  key={paragraph.label}
                                  className="mt-2 font-segoe text-sm sm:text-public-fs-subheading-sm font-normal leading-relaxed text-slate-700"
                                >
                                  {paragraph.label && <strong>{paragraph.label}</strong>}
                                  {paragraph.text}
                                </p>
                              ))}
                              {faq.listItems && (
                                <ul className="mt-2 list-disc space-y-1 pl-5 font-segoe text-sm sm:text-public-fs-subheading-sm leading-relaxed text-slate-700">
                                  {faq.listItems.map((item) => <li key={item}>{item}</li>)}
                                </ul>
                              )}
                              {faq.learnMore && (
                                <p className="mt-3 font-segoe text-sm sm:text-public-fs-subheading-sm leading-relaxed text-slate-700">
                                  <strong>Learn more: </strong>
                                  {faq.learnMore.before}
                                  <Link
                                    to={faq.learnMore.to}
                                    className="font-semibold text-public-text-brand underline underline-offset-2 transition-opacity hover:opacity-80"
                                  >
                                    {faq.learnMore.label}
                                  </Link>
                                  {faq.learnMore.after}
                                </p>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-4xl w-full rounded-2xl border border-dashed border-public-bg-brand-subtle bg-white px-4 py-12 text-center font-segoe text-sm text-public-text-secondary">
              No questions found matching your search.
            </div>
          )}

          {/* Need Assistance */}
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-2.5 sm:gap-4 rounded-2xl border border-public-border-default bg-white p-6 sm:p-10 text-center shadow-public-nav mt-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-public-bg-tertiary-100 text-[#0E2F66]">
              <CircleHelp className="h-6 w-6 text-public-text-brand" />
            </div>
            <div className="flex flex-col gap-1 sm:gap-1.5 max-w-md">
              <h3 className="font-segoe text-base sm:text-lg font-bold text-[#0E2F66]">
                Need Assistance?
              </h3>
              <p className="font-segoe text-xs sm:text-sm text-slate-500 leading-relaxed">
                For further inquiries, please contact the PCYDO through its official email address.
                Include the purpose of your inquiry and any relevant details to help the office
                address your request.
              </p>
            </div>
            <a
              href={gmailComposeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-public-bg-brand px-5 py-2.5 font-segoe text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-public-bg-brand-hover shadow-xs mt-1"
            >
              <Send className="h-4 w-4 shrink-0" />
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
