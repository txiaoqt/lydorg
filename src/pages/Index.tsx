import { ArrowRight, Bell, FileCheck2, FileText, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FeatureCard from "@/components/FeatureCard";
import heroImage from "@/assets/hero-image.png";
import { useAuth } from "@/hooks/use-auth";

const complianceFeatures = [
  {
    icon: Users,
    title: "Organization Profile Setup",
    description: "Complete your organization details before submitting documents or budget requests.",
    href: "/organization-profile",
  },
  {
    icon: FileText,
    title: "Document Submission",
    description: "Upload the required registration and compliance documents in one place.",
    href: "/document-submission",
  },
  {
    icon: FileCheck2,
    title: "OCR Review",
    description: "Check the OCR preview inside document submission before you confirm the upload.",
    href: "/document-submission",
  },
  {
    icon: Shield,
    title: "Compliance Status",
    description: "Track your current standing, remarks, and next action needed.",
    href: "/compliance-status",
  },
];

const systemFeatures = [
  {
    icon: Bell,
    title: "Notifications",
    description: "See admin remarks, approvals, revision requests, and overdue reminders.",
  },
  {
    icon: Shield,
    title: "Budget and Liquidation",
    description: "Manage soft-copy pre-checks, face-to-face submission, and liquidation deadlines.",
  },
  {
    icon: FileText,
    title: "News and Transparency",
    description: "View news releases and simplified public transparency posts in a single flow.",
  },
  {
    icon: FileCheck2,
    title: "OCR-Assisted Review",
    description: "Use OCR as a helper, while LYDO/PCYDO personnel make the final decision.",
  },
];

const Index = () => {
  const { isAuthenticated, role } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="hero-gradient relative overflow-x-clip pt-16">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-10 right-20 h-96 w-96 rounded-full bg-primary blur-3xl" />
        </div>
        <div className="container mx-auto relative z-10 px-4 py-8 sm:py-10 md:py-16 lg:py-20">
          <div className="grid items-center gap-6 md:grid-cols-2 lg:gap-12">
            <div className="animate-fade-up">
              <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-secondary-foreground/20 bg-secondary-foreground/10 px-3 py-1.5 sm:mb-5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-skGold" />
                <span className="truncate text-[11px] font-medium text-secondary-foreground/80 sm:text-xs">
                  LYDO Connect Organization Compliance Portal
                </span>
              </div>
              <h1 className="mb-3 text-[1.9rem] font-heading font-extrabold leading-tight text-secondary-foreground sm:mb-5 sm:text-4xl md:text-5xl lg:text-[3.5rem]">
                Manage organization compliance, submissions, and reporting in one place.
              </h1>
              <p className="mb-4 max-w-xl text-[15px] leading-relaxed text-secondary-foreground/75 sm:mb-7 sm:text-lg">
                Register your organization, upload compliance documents, review OCR output, request budget support,
                and track liquidation deadlines with LYDO/PCYDO.
              </p>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
                <Button variant="hero" size="lg" className="w-full sm:w-auto" asChild>
                  <Link to={isAuthenticated ? (role === "admin" ? "/admin" : "/dashboard") : "/signin"}>
                    {isAuthenticated ? "Open Portal" : "Sign In"} <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="heroOutline" size="lg" className="w-full sm:w-auto" asChild>
                  <Link to="/signup">Create Account</Link>
                </Button>
              </div>
            </div>
            <div className="animate-float order-last md:order-none">
              <img
                src={heroImage}
                alt="Youth organization members coordinating documents and compliance tasks"
                className="mx-auto h-auto w-full max-w-full rounded-2xl object-contain shadow-2xl md:max-w-[560px]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-12 sm:py-14 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-8 max-w-2xl text-center sm:mb-12 mx-auto">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-primary">Core Workflow</span>
            <h2 className="mb-3 text-[1.55rem] font-heading font-bold text-foreground sm:text-3xl md:text-4xl">
              Built for organization setup, compliance, and review
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              The site centers on registration, document submission, budget requests, liquidation, and public transparency.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
            {complianceFeatures.map((feature) => (
              <Link key={feature.title} to={feature.href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <FeatureCard icon={feature.icon} title={feature.title} description={feature.description} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted/50 py-12 sm:py-14 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-7 flex flex-col items-start justify-between gap-3 md:mb-12 md:flex-row md:items-center">
            <div>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-primary">Platform Highlights</span>
              <h2 className="text-[1.55rem] font-heading font-bold text-foreground sm:text-3xl md:text-4xl">
                What the portal supports
              </h2>
            </div>
            <Button variant="outline" asChild>
              <Link to={isAuthenticated ? (role === "admin" ? "/admin" : "/dashboard") : "/signin"}>
                Go to Portal <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {systemFeatures.map((feature) => (
              <div key={feature.title} className="rounded-lg border bg-card p-4 sm:p-5">
                <p className="font-semibold text-sm sm:text-base">{feature.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
