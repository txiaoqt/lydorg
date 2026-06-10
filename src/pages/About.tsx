import { CalendarDays, CheckCircle2, FileText, Shield, Users, Wallet } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const workflows = [
  { icon: Users, title: "Organization Profile", description: "Register and maintain your org's details for admin verification." },
  { icon: FileText, title: "Document Submission", description: "Upload the 6 required compliance documents with OCR-assisted review." },
  { icon: Wallet, title: "Budget Requests", description: "Submit activity budgets, track approvals, and receive fund releases." },
  { icon: CalendarDays, title: "Liquidation Reports", description: "Account for released funds after your activity within the deadline." },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">

        {/* Hero */}
        <section className="hero-gradient py-10 sm:py-12 md:py-24">
          <div className="container mx-auto px-6 sm:px-8 text-center max-w-3xl">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-secondary-foreground/60">
              About
            </span>
            <h1 className="text-[1.9rem] sm:text-4xl md:text-5xl font-heading font-bold text-secondary-foreground mb-4 sm:mb-6">
              About LYDO Connect
            </h1>
            <p className="text-secondary-foreground/70 text-sm sm:text-base md:text-lg leading-relaxed">
              LYDO Connect is the official compliance portal for youth organizations registered under
              the Pasig City Local Youth Development Office (LYDO) and PCYDO.
            </p>
          </div>
        </section>

        {/* What it is */}
        <section className="py-10 sm:py-14 md:py-24">
          <div className="container mx-auto px-6 sm:px-8 max-w-6xl">
            <div className="grid md:grid-cols-2 gap-8 md:gap-14 items-start">
              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">
                  The Problem
                </span>
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-4">
                  Why LYDO Connect was built
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
                  Youth organization compliance in Pasig City used to rely entirely on paper forms, in-person
                  office visits, and manual follow-ups. Organization representatives had no way to track
                  the status of their submitted documents, budget requests, or liquidation reports without
                  physically going to the LYDO office.
                </p>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
                  For LYDO staff, reviewing and monitoring dozens of organizations meant managing scattered
                  paper records, making it difficult to track deadlines, send reminders, or maintain
                  an accurate compliance picture across all registered groups.
                </p>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  LYDO Connect moves the entire compliance workflow online — from initial org registration
                  all the way through document review, budget approval, and liquidation — so both
                  organizations and LYDO staff always have a clear, up-to-date view of where things stand.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {workflows.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="rounded-xl border border-border bg-card p-4 card-shadow">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-heading text-sm font-bold text-foreground mb-1">{title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Who uses it */}
        <section className="bg-muted/40 py-10 sm:py-14 md:py-20">
          <div className="container mx-auto px-6 sm:px-8 max-w-4xl">
            <div className="mb-8 text-center sm:mb-10">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">
                Users
              </span>
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                Who uses the portal
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6 card-shadow">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground mb-2">
                  Organization Representatives
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Leaders of registered youth organizations who manage the compliance process on behalf of their group.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[
                    "Fill out and submit the organization profile",
                    "Upload 6 required compliance documents",
                    "Submit and track activity budget requests",
                    "File liquidation reports after activities",
                    "Receive notifications and admin remarks",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 card-shadow">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground mb-2">
                  LYDO / PCYDO Staff
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
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
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Legal basis */}
        <section className="py-10 sm:py-14 md:py-20">
          <div className="container mx-auto px-6 sm:px-8 max-w-3xl text-center">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 block">
              Legal Basis
            </span>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-4">
              RA 10742 Compliant
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
              LYDO Connect is designed in compliance with Republic Act 10742 (Sangguniang Kabataan
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
