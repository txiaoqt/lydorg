import {
  Award,
  ChevronDown,
  ClipboardList,
  FileText,
  LifeBuoy,
  type LucideIcon,
  MessageSquare,
  Minus,
  Monitor,
  Plus,
  Search,
  Send,
  Wallet,
} from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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

const filterTabs: { id: FaqCategory; label: string }[] = [
  { id: "general", label: "General Information" },
  { id: "yorp", label: "YORP" },
  { id: "forms", label: "Forms & Templates" },
  { id: "ypop", label: "YPOP" },
  { id: "budget", label: "Budget Requests" },
  { id: "support", label: "Account & Portal Support" },
];

const categoryDefs: { id: FaqCategory; title: string; icon: LucideIcon }[] = [
  { id: "general", title: "General Information", icon: Monitor },
  { id: "yorp", title: "Youth Organization Registration Program (YORP)", icon: ClipboardList },
  { id: "forms", title: "Forms and Templates", icon: FileText },
  { id: "ypop", title: "Youth Participation Organization Passport (YPOP)", icon: Award },
  { id: "budget", title: "Budget Requests", icon: Wallet },
  { id: "support", title: "Account and Portal Support", icon: LifeBuoy },
];

const Faqs = () => {
  const accordionId = useId();
  const { email } = usePublicContactInfo();
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FaqCategory>("general");
  const [openId, setOpenId] = useState<string | null>(null);

  const query = searchTerm.trim().toLowerCase();

  const filteredFaqs = faqs.filter((faq) => {
    // Search spans every category; browsing shows the selected one.
    if (!query) return faq.category === activeFilter;
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

  const activeFilterLabel = filterTabs.find((t) => t.id === activeFilter)?.label;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="public-templates-hero-gradient public-hero-pasig-photo px-4 sm:px-6 lg:px-[64px]">
        <div className="public-page-hero-body mx-auto flex w-full max-w-7xl flex-col justify-center gap-4 pb-4 pt-4 sm:gap-[48px] sm:pb-[48px] sm:pt-[64px]">
          <div className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left sm:gap-2.5">
            <h1 className="font-tnr font-normal leading-[1.1] tracking-[-0.01em] text-public-text-neutral-on-neutral text-[28px] sm:text-public-fs-hero">
              Frequently Asked Questions
            </h1>
            <p className="font-inter text-base font-normal leading-[1.6] text-white/85">
              Find information about Y-TRACE, YORP, YPOP, and other programs and services provided by the Pasig City Youth Development Office (PCYDO).
            </p>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section className="bg-white px-4 pb-10 pt-5 sm:px-6 sm:pb-[64px] sm:pt-[48px] lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 sm:gap-12">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">

            {/* Category sidebar — lg and up */}
            <nav aria-label="FAQ categories" className="hidden lg:flex flex-col font-inter">
              <p className="pb-3 text-xs font-semibold uppercase tracking-wider text-public-text-neutral-default">
                Browse by Category
              </p>
              {filterTabs.map((tab) => {
                const active = activeFilter === tab.id;
                const count = faqs.filter((f) => f.category === tab.id).length;
                const label = categoryDefs.find((c) => c.id === tab.id)?.title;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveFilter(tab.id)}
                    className={cn(
                      "flex items-center justify-between gap-3 border-b border-public-border-default border-l-2 px-3 py-3 text-left text-sm leading-snug transition-colors",
                      active
                        ? "border-l-public-border-brand bg-public-bg-section font-semibold text-public-text-brand"
                        : "border-l-transparent text-public-text-neutral-default hover:bg-public-bg-section hover:text-public-text-brand"
                    )}
                  >
                    <span>{label}</span>
                    <span className="text-xs text-public-text-secondary">{count}</span>
                  </button>
                );
              })}
            </nav>

            <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
              {/* Mobile toolbar: search + category dropdown */}
              <div className="flex flex-col gap-2.5 lg:hidden">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search questions by keyword, topic, or answer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 rounded-[2px] border-public-border-default bg-white pl-9 pr-3 font-inter text-base sm:text-sm placeholder:text-public-text-secondary focus-visible:border-public-border-brand focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="group flex w-full items-center gap-3 border border-l-2 border-public-border-default border-l-public-border-brand bg-public-bg-section px-3 py-2.5 text-left font-inter transition-colors hover:bg-public-bg-brand-subtle"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-public-text-secondary">
                          Browse by Category
                        </span>
                        <span className="truncate text-sm font-semibold text-public-text-brand">{activeFilterLabel}</span>
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-public-text-brand transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    sideOffset={4}
                    className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-[2px] border-public-border-default bg-white p-0 font-inter shadow-lg"
                  >
                    {filterTabs.map((tab) => {
                      const active = activeFilter === tab.id;
                      const count = faqs.filter((f) => f.category === tab.id).length;
                      return (
                        <DropdownMenuItem
                          key={tab.id}
                          onClick={() => setActiveFilter(tab.id)}
                          className={cn(
                            "flex cursor-pointer items-center justify-between gap-3 rounded-none border-b border-l-2 border-public-border-default px-3 py-3 text-sm leading-snug last:border-b-0 focus:bg-public-bg-section focus:text-public-text-brand",
                            active
                              ? "border-l-public-border-brand bg-public-bg-section font-semibold text-public-text-brand"
                              : "border-l-transparent text-public-text-neutral-default"
                          )}
                        >
                          <span>{categoryDefs.find((c) => c.id === tab.id)?.title}</span>
                          <span className="text-xs text-public-text-secondary">{count}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Desktop summary + search */}
              <div className="hidden lg:flex items-center justify-between gap-6 font-inter">
                <p className="text-xs text-public-text-secondary">
                  {faqs.length} questions across {categoryDefs.length} categories
                </p>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search questions by keyword, topic, or answer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 rounded-[2px] border-public-border-default bg-white pl-9 pr-3 font-inter text-sm placeholder:text-public-text-secondary focus-visible:border-public-border-brand focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* FAQ groups */}
              {groups.length > 0 ? (
                groups.map((group) => {
                  const Icon = group.icon;
                  return (
                    <div key={group.id} className="flex flex-col font-inter">
                      <div className="flex items-center justify-between gap-4 border-b border-public-border-default pb-3">
                        <h2 className="flex items-center gap-3 text-base sm:text-xl font-semibold leading-snug text-public-text-brand">
                          <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                          {group.title}
                        </h2>
                        <span className="shrink-0 text-xs text-public-text-secondary">
                          {group.items.length} {group.items.length === 1 ? "question" : "questions"}
                        </span>
                      </div>
                      {group.items.map((faq) => {
                        const isOpen = openId === faq.question;
                        const questionId = `${accordionId}-question-${faqs.indexOf(faq)}`;
                        const answerId = `${accordionId}-answer-${faqs.indexOf(faq)}`;
                        return (
                          <div key={faq.question} className="border-b border-public-border-default">
                            <button
                              id={questionId}
                              type="button"
                              aria-expanded={isOpen}
                              aria-controls={answerId}
                              onClick={() => setOpenId(isOpen ? null : faq.question)}
                              className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm sm:text-base font-semibold leading-snug text-public-text-neutral-default transition-colors hover:text-public-text-brand"
                            >
                              <span>{faq.question}</span>
                              {isOpen ? (
                                <Minus className="h-4 w-4 shrink-0 text-public-text-brand" aria-hidden="true" />
                              ) : (
                                <Plus className="h-4 w-4 shrink-0 text-public-text-brand" aria-hidden="true" />
                              )}
                            </button>
                            <div
                              id={answerId}
                              role="region"
                              aria-labelledby={questionId}
                              hidden={!isOpen}
                              className="pb-5 text-sm leading-relaxed text-public-text-secondary"
                            >
                              {faq.answer && <p>{faq.answer}</p>}
                              {faq.answerLink && (
                                <p className="mt-2">
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
                                <p key={paragraph.label} className="mt-2">
                                  {paragraph.label && <strong className="text-public-text-neutral-default">{paragraph.label}</strong>}
                                  {paragraph.text}
                                </p>
                              ))}
                              {faq.listItems && (
                                <ul className="mt-2 list-disc space-y-1 pl-5">
                                  {faq.listItems.map((item) => <li key={item}>{item}</li>)}
                                </ul>
                              )}
                              {faq.learnMore && (
                                <p className="mt-4">
                                  <span className="font-medium text-public-text-brand">Learn more:</span> {faq.learnMore.before}
                                  <Link
                                    to={faq.learnMore.to}
                                    className="text-public-text-brand-secondary underline underline-offset-[3px] transition-colors hover:text-public-text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-bg-brand focus-visible:ring-offset-2"
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
                  );
                })
              ) : (
                <div className="border border-dashed border-public-border-default px-4 py-12 text-center font-inter text-sm text-public-text-secondary">
                  No questions found matching your search.
                </div>
              )}
            </div>
          </div>

          {/* Need Assistance */}
          <div className="flex flex-col gap-4 border-l-4 border-public-border-brand bg-public-bg-section p-5 font-inter sm:flex-row sm:items-center sm:gap-6 sm:p-6">
            <MessageSquare className="h-7 w-7 shrink-0 text-public-text-brand" aria-hidden="true" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3 className="text-base sm:text-lg font-semibold text-public-text-brand">Need Assistance?</h3>
              <p className="text-xs sm:text-sm leading-relaxed text-public-text-secondary">
                For further inquiries, please contact the PCYDO through its official email address. Include the purpose of your inquiry and any relevant details to help the office address your request.
              </p>
            </div>
            <a
              href={gmailComposeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit shrink-0 items-center gap-2 rounded-[2px] bg-public-bg-brand px-5 py-2.5 text-xs sm:text-sm font-semibold text-public-text-on-brand transition-colors hover:bg-public-bg-brand-hover"
            >
              <Send className="h-4 w-4 shrink-0" aria-hidden="true" />
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
