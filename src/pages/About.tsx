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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <section className="hero-gradient py-10 sm:py-12 md:py-24">
          <div className="container mx-auto max-w-3xl px-6 text-center sm:px-8">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-secondary-foreground/60">
              About
            </span>
            <h1 className="mb-4 text-[1.9rem] font-heading font-bold text-secondary-foreground sm:mb-6 sm:text-4xl md:text-5xl">
              About Y-TRACE
            </h1>
            <p className="text-sm leading-relaxed text-secondary-foreground/70 sm:text-base md:text-lg">
              Y-TRACE is the official compliance portal for youth organizations registered under
              the Pasig City Local Youth Development Office (LYDO) and PCYDO.
            </p>
          </div>
        </section>

        <section className="py-10 sm:py-14 md:py-24">
          <div className="container mx-auto max-w-6xl px-6 sm:px-8">
            <div className="grid items-start gap-8 md:grid-cols-2 md:gap-14">
              <div>
                <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-primary">
                  The Problem
                </span>
                <h2 className="mb-4 text-2xl font-heading font-bold text-foreground md:text-3xl">
                  Why Y-TRACE was built
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Youth organization compliance in Pasig City used to rely entirely on paper forms, in-person
                  office visits, and manual follow-ups. Organization representatives had no way to track
                  the status of their submitted documents, budget requests, or liquidation reports without
                  physically going to the LYDO office.
                </p>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  For LYDO staff, reviewing and monitoring dozens of organizations meant managing scattered
                  paper records, making it difficult to track deadlines, send reminders, or maintain
                  an accurate compliance picture across all registered groups.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Y-TRACE moves the entire compliance workflow online - from initial org registration
                  all the way through document review, budget approval, and liquidation - so both
                  organizations and LYDO staff always have a clear, up-to-date view of where things stand.
                  It also gives organizations access to published templates, official announcements,
                  and activity-related status updates in one place.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {workflows.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="rounded-xl border border-border bg-card p-4 card-shadow">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="mb-1 font-heading text-sm font-bold text-foreground">{title}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted/40 py-10 sm:py-14 md:py-20">
          <div className="container mx-auto max-w-4xl px-6 sm:px-8">
            <div className="mb-8 text-center sm:mb-10">
              <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-primary">
                Users
              </span>
              <h2 className="text-2xl font-heading font-bold text-foreground md:text-3xl">
                Who uses the portal
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6 card-shadow">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-heading text-lg font-bold text-foreground">
                  Organization Representatives
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  Leaders of registered youth organizations who manage the compliance process on behalf of their group.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[ 
                    "Fill out and submit the organization profile",
                    "Upload and manage required compliance documents",
                    "Submit and track activity budget requests",
                    "File liquidation reports after activities",
                    "Download templates and receive notifications",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 card-shadow">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-heading text-lg font-bold text-foreground">
                  LYDO / PCYDO Staff
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  Office administrators who review, approve, and monitor all organization submissions through the Admin Portal.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[
                    "Review and verify organization profiles",
                    "Validate submitted compliance documents",
                    "Approve or reject budget requests",
                    "Monitor liquidation deadlines and reports",
                    "Manage document templates and publish updates",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 sm:py-14 md:py-20">
          <div className="container mx-auto max-w-3xl px-6 text-center sm:px-8">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-primary">
              Legal Basis
            </span>
            <h2 className="mb-4 text-2xl font-heading font-bold text-foreground md:text-3xl">
              RA 10742 Compliant
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
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
