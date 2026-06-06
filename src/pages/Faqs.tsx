import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const faqs = [
  {
    question: "What is LYDO Connect?",
    answer:
      "LYDO Connect is a youth organization compliance portal for registration, profile setup, document submission, validation, budget requests, liquidation, and official updates.",
  },
  {
    question: "What can I access before signing in?",
    answer:
      "Before sign-in, the public navbar stays simple: Home and FAQs only. You can still open About, Contacts, Site Map, Terms, and Privacy from the footer.",
  },
  {
    question: "What changes once I am signed in?",
    answer:
      "Signed-in users go straight to the portal workflow. The public links are hidden, and the portal navigation shows Dashboard, Organization Profile, Document Submission, Budget Request, Liquidation and Reporting, News Releases, Public Transparency Posting, Notifications, and Compliance Status.",
  },
  {
    question: "How does document submission work?",
    answer:
      "You upload a PDF in Document Submission, review the OCR preview and flagged issues, then confirm the submission so the record moves to admin review.",
  },
  {
    question: "What happens after a budget request is approved?",
    answer:
      "Approved budget requests can move to face-to-face or hard copy submission, then release tracking and liquidation reporting follow after the activity is completed.",
  },
  {
    question: "Where do I see reminders, remarks, and status updates?",
    answer:
      "Notifications show workflow updates, while Compliance Status summarizes your current standing. Admin remarks and public updates are also reflected in the portal sections when available.",
  },
  {
    question: "How do admins manage records?",
    answer:
      "Admins use the Admin Portal to review registrations, manage users, review budget and liquidation records, publish news and transparency posts, manage templates, and track notification activity.",
  },
];

const Faqs = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <section className="hero-gradient py-10 sm:py-12 md:py-20">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h1 className="text-[1.9rem] sm:text-4xl md:text-5xl font-heading font-bold text-secondary-foreground mb-4 sm:mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-secondary-foreground/70 text-sm sm:text-base md:text-lg leading-relaxed">
              Quick answers about using LYDO Connect services and platform features.
            </p>
          </div>
        </section>

        <section className="py-8 sm:py-12 md:py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="space-y-4 sm:space-y-5">
              {faqs.map((item) => (
                <article key={item.question} className="bg-card border border-border rounded-xl p-4 sm:p-6 card-shadow">
                  <h2 className="text-base sm:text-lg font-heading font-semibold text-foreground">{item.question}</h2>
                  <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Faqs;
