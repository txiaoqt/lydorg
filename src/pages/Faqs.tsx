import { ChevronDown, ChevronUp, CircleHelp, Search, Send } from "lucide-react";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import AnnouncementBar from "@/components/AnnouncementBar";
import Footer from "@/components/Footer";

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

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Navbar />

      {/* Hero */}
      <section className="public-templates-hero-gradient px-5 pt-[120px] sm:px-6 lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-[48px] pb-[48px] pt-[64px]">

          <div className="flex flex-col gap-[16px]">
            <h1 className="font-segoe font-bold leading-[100%] tracking-[-0.03em] text-public-text-neutral-on-neutral text-public-fs-hero">
              Frequently Asked Questions
            </h1>
            <p className="font-segoe font-normal leading-[120%] text-public-text-neutral-on-neutral text-public-fs-subtitle-sm">
              Quick answers about using Y-TRACE and navigating the compliance workflow.
            </p>
          </div>

          <div className="flex h-[52px] w-full max-w-[792px] items-center gap-[8px] rounded-full border border-public-border-default bg-white px-[16px]">
            <Search className="h-4 w-4 shrink-0 text-public-text-secondary" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search questions..."
              className="flex-1 bg-transparent font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-neutral-default outline-none placeholder:text-public-text-secondary"
            />
          </div>

        </div>
      </section>

      {/* Catalog */}
      <section className="bg-public-bg-section px-5 pb-[32px] pt-[48px] sm:px-6 lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-[24px]">

          {/* Filter tabs */}
          <div className="flex flex-wrap justify-center gap-[10px] p-[10px]">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={
                  activeFilter === tab.id
                    ? `rounded-full bg-public-bg-brand px-[20px] py-[10px] font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-neutral-on-neutral backdrop-blur-[4px]${tab.id === "all" ? " min-w-[80px]" : ""}`
                    : `rounded-full border border-public-border-default bg-white px-[20px] py-[10px] font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-neutral-default${tab.id === "all" ? " min-w-[80px]" : ""}`
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* FAQ groups */}
          {groups.length > 0 ? (
            <div className="flex flex-col gap-[24px]">
              {groups.map((group) => (
                <div key={group.id} className="flex flex-col gap-[16px] px-[24px] pb-[24px]">
                  <h2 className="font-segoe text-public-fs-subheading-sm font-semibold uppercase tracking-[0.04em] text-public-text-brand">
                    {group.title}{" "}
                    <span className="text-public-text-secondary">({group.items.length})</span>
                  </h2>
                  {group.items.map((faq) => {
                    const isOpen = openId === faq.question;
                    return (
                      <div
                        key={faq.question}
                        className="rounded-[16px] border border-public-border-default [border-top-color:rgba(113,191,253,1)] bg-white px-[24px] py-[16px] shadow-public-overview-card"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenId(isOpen ? null : faq.question)}
                          className="flex w-full items-center gap-[8px] text-left"
                        >
                          <span className="flex-1 font-segoe text-public-fs-subheading-sm font-semibold leading-[140%] text-public-text-brand">
                            {faq.question}
                          </span>
                          {isOpen ? (
                            <span className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-full bg-[rgba(10,93,159,1)]">
                              <ChevronUp className="h-4 w-4 text-white" />
                            </span>
                          ) : (
                            <ChevronDown className="h-5 w-5 shrink-0 text-public-text-brand" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="mt-[24px] border-t border-public-border-default pt-[24px]">
                            <p className="font-segoe text-public-fs-body-sm font-normal leading-[160%] text-public-text-neutral-default">
                              {faq.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-public-bg-brand-subtle bg-white px-5 py-8 text-center font-segoe text-public-fs-body-sm text-public-text-secondary">
              No questions found matching your search.
            </div>
          )}

          {/* Still Need Help */}
          <div className="mx-auto flex w-full max-w-[1024px] flex-col items-center gap-[16px] rounded-[16px] border border-public-border-default bg-white px-[24px] py-[60px] text-center shadow-public-nav">
            <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-public-bg-tertiary-100 p-[8px]">
              <CircleHelp className="h-8 w-8 text-public-text-brand" />
            </div>
            <div className="flex flex-col gap-[10px] px-[10px]">
              <h3 className="font-segoe text-public-fs-subtitle-sm font-semibold leading-[120%] tracking-[-0.02em] text-public-text-brand">
                Still Need Help?
              </h3>
              <p className="font-segoe text-public-fs-body-sm font-normal leading-[120%] text-public-text-secondary">
                Can't find the answer you're looking for? Reach out to the PCYDO office directly
                and we'll get back to you as soon as possible.
              </p>
            </div>
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=lydo@pasigcity.gov.ph"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-[8px] rounded-[8px] bg-public-bg-brand px-[20px] py-[12px] font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-on-brand transition-colors hover:bg-public-bg-brand-hover"
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
