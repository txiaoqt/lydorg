import { CalendarDays, CheckCircle2, FileText, Shield, Users, Wallet } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const workflows = [
  { icon: Users, title: "Organization Profile", description: "Register and maintain your org's details for admin verification." },
  { icon: FileText, title: "Document Submission", description: "Upload required compliance documents and track admin review results inside the portal." },
  { icon: Wallet, title: "Budget Requests", description: "Submit activity budgets, track approvals, and receive fund releases." },
  { icon: CalendarDays, title: "Liquidation Reports", description: "Account for released funds after your activity within the deadline." },
];

const About = () => {
  return (
    <div className="about-page min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <section className="about-hero hero-gradient py-8 sm:py-10 md:py-24">
          <div className="container mx-auto max-w-3xl px-5 text-center sm:px-8">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-secondary-foreground/60">
              About
            </span>
            <h1 className="about-hero-title mb-3 text-[1.9rem] font-heading font-bold text-secondary-foreground sm:mb-6 sm:text-4xl md:text-5xl">
              About Y-TRACE
            </h1>
            <p className="about-hero-description mx-auto max-w-[32rem] text-sm leading-relaxed text-secondary-foreground/70 sm:text-base md:text-lg lg:max-w-none">
              Y-TRACE is the official compliance portal for youth organizations registered under
              the Pasig City Local Youth Development Office (LYDO) and PCYDO.
            </p>
          </div>
        </section>

        <section className="about-problem-section py-8 sm:py-10 md:py-24">
          <div className="container mx-auto max-w-6xl px-5 sm:px-8">
            <div className="grid items-start gap-6 md:grid-cols-2 md:gap-14">
              <div className="about-problem-copy max-w-[38rem] lg:max-w-none">
                <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-primary">
                  The Problem
                </span>
                <h2 className="mb-3 text-2xl font-heading font-bold text-foreground md:mb-4 md:text-3xl">
                  Why Y-TRACE was built
                </h2>
                <p className="about-problem-paragraph mb-3 text-[0.95rem] leading-7 text-muted-foreground sm:text-base">
                  Youth organization compliance in Pasig City used to rely entirely on paper forms, in-person
                  office visits, and manual follow-ups. Organization representatives had no way to track
                  the status of their submitted documents, budget requests, or liquidation reports without
                  physically going to the LYDO office.
                </p>
                <p className="about-problem-paragraph mb-3 text-[0.95rem] leading-7 text-muted-foreground sm:text-base">
                  For LYDO staff, reviewing and monitoring dozens of organizations meant managing scattered
                  paper records, making it difficult to track deadlines, send reminders, or maintain
                  an accurate compliance picture across all registered groups.
                </p>
                <p className="about-problem-paragraph text-[0.95rem] leading-7 text-muted-foreground sm:text-base">
                  Y-TRACE moves the entire compliance workflow online - from initial org registration
                  all the way through document review, budget approval, and liquidation - so both
                  organizations and LYDO staff always have a clear, up-to-date view of where things stand.
                  It also gives organizations access to published templates, official announcements,
                  and activity-related status updates in one place.
                </p>
              </div>

              <div className="about-workflow-grid grid grid-cols-1 gap-3 sm:grid-cols-2">
                {workflows.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="about-workflow-card rounded-xl border border-border bg-card p-3.5 card-shadow md:p-4">
                    <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 md:mb-3 md:h-9 md:w-9">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="mb-1 font-heading text-sm font-bold leading-snug text-foreground">{title}</h3>
                    <p className="text-[0.8rem] leading-6 text-muted-foreground md:text-xs">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="about-users-section bg-muted/40 py-8 sm:py-10 md:py-20">
          <div className="container mx-auto max-w-4xl px-5 sm:px-8">
            <div className="mb-7 text-center sm:mb-10">
              <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-primary">
                Users
              </span>
              <h2 className="text-2xl font-heading font-bold text-foreground md:text-3xl">
                Who uses the portal
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="about-user-card rounded-2xl border border-border bg-card p-4 card-shadow md:p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 md:mb-4 md:h-11 md:w-11">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-heading text-base font-bold text-foreground md:text-lg">
                  Organization Representatives
                </h3>
                <p className="mb-3 text-[0.9rem] leading-6 text-muted-foreground md:mb-4 md:text-sm">
                  Leaders of registered youth organizations who manage the compliance process on behalf of their group.
                </p>
                <ul className="about-user-list space-y-2 text-[0.9rem] text-muted-foreground md:text-sm">
                  {[ 
                    "Fill out and submit the organization profile",
                    "Upload and manage required compliance documents",
                    "Submit and track activity budget requests",
                    "File liquidation reports after activities",
                    "Download templates and receive notifications",
                  ].map((item) => (
                    <li key={item} className="about-user-list-item grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="about-user-card rounded-2xl border border-border bg-card p-4 card-shadow md:p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 md:mb-4 md:h-11 md:w-11">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-heading text-base font-bold text-foreground md:text-lg">
                  LYDO / PCYDO Staff
                </h3>
                <p className="mb-3 text-[0.9rem] leading-6 text-muted-foreground md:mb-4 md:text-sm">
                  Office administrators who review, approve, and monitor all organization submissions through the Admin Portal.
                </p>
                <ul className="about-user-list space-y-2 text-[0.9rem] text-muted-foreground md:text-sm">
                  {[
                    "Review and verify organization profiles",
                    "Validate submitted compliance documents",
                    "Approve or reject budget requests",
                    "Monitor liquidation deadlines and reports",
                    "Manage document templates and publish updates",
                  ].map((item) => (
                    <li key={item} className="about-user-list-item grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="about-legal-section py-8 sm:py-10 md:py-20">
          <div className="container mx-auto max-w-3xl px-5 text-center sm:px-8">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-primary">
              Legal Basis
            </span>
            <h2 className="mb-3 text-2xl font-heading font-bold text-foreground md:mb-4 md:text-3xl">
              RA 10742 Compliant
            </h2>
            <p className="mx-auto max-w-[34rem] text-[0.95rem] leading-7 text-muted-foreground sm:text-base lg:max-w-none">
              Y-TRACE is designed in compliance with Republic Act 10742 (Sangguniang Kabataan
              Reform Act of 2015), which mandates standardized youth governance tools across Local
              Government Units. The platform supports LYDO offices in fulfilling their statutory
              responsibilities for youth organization oversight, budget accountability, and compliance monitoring.
            </p>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default About;
