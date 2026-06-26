import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is Y-TRACE?",
    answer:
      "Y-TRACE is a youth organization compliance portal for Pasig City. It supports organization registration, compliance document submission, budget requests, liquidation reporting, templates, and official updates from the LYDO/PCYDO office.",
  },
  {
    question: "Who can create an account?",
    answer:
      "Only organization representatives can register an account. Each account is tied to one youth organization. If your organization already has a YORP Pasig identifier number, check the 'existing organization' box during sign-up.",
  },
  {
    question: "What do I need to complete first before submitting documents?",
    answer:
      "You need to fill out and save your Organization Profile first. The profile must be reviewed and verified by an admin before you can proceed to document submission and budget requests.",
  },
  {
    question: "How does document submission work?",
    answer:
      "Go to Document Submission and upload the required file for each published document slot. Once a file is attached, it becomes available for admin review, and you will be notified if any document needs revision or has been approved.",
  },
  {
    question: "What happens after a budget request is approved?",
    answer:
      "Once approved, your budget request moves to 'Submit Onsite'. You then submit the required hard copy to the LYDO office. After the office confirms release of funds, a liquidation report becomes available for you to complete after your activity.",
  },
  {
    question: "What is a liquidation report and when do I submit it?",
    answer:
      "A liquidation report accounts for how the released budget was used. It becomes available after the budget release process is completed. You submit it after your activity, and the deadline is based on the release timeline shown in the portal and notifications.",
  },
  {
    question: "Where do I see status updates and admin remarks?",
    answer:
      "Check the Notifications section for real-time updates on document approvals, revision requests, budget decisions, and liquidation reminders. The Compliance Status section gives you a full summary of your current standing.",
  },
  {
    question: "Where can I download the official forms and templates?",
    answer:
      "Published templates are available from the public Templates page and inside the portal's Templates area. Document submission templates and other shared reference files will appear there once the admin uploads them.",
  },
  {
    question: "How do admins manage records?",
    answer:
      "LYDO/PCYDO staff use a separate Admin Portal to review organization profiles, validate documents, approve or reject budget requests, monitor liquidation reports, manage templates, and publish news and transparency updates.",
  },
];

const Faqs = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <section className="hero-gradient py-10 sm:py-12 md:py-20">
          <div className="container mx-auto px-6 sm:px-8 max-w-3xl text-center">
            <h1 className="text-[1.9rem] sm:text-4xl md:text-5xl font-heading font-bold text-secondary-foreground mb-4 sm:mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-secondary-foreground/70 text-sm sm:text-base md:text-lg leading-relaxed">
              Quick answers about using Y-TRACE and navigating the compliance workflow.
            </p>
          </div>
        </section>

        <section className="py-10 sm:py-14 md:py-20">
          <div className="container mx-auto px-6 sm:px-8 max-w-3xl">
            <Accordion type="single" collapsible defaultValue="item-0" className="space-y-3">
              {faqs.map((item, index) => (
                <AccordionItem
                  key={item.question}
                  value={`item-${index}`}
                  className="rounded-xl border border-border bg-card px-5 card-shadow data-[state=open]:border-primary/30"
                >
                  <AccordionTrigger className="py-4 text-left text-base sm:text-lg font-heading font-semibold text-foreground hover:no-underline hover:text-primary transition-colors [&[data-state=open]]:text-primary">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Faqs;
