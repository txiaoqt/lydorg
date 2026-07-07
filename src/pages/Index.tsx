import { ArrowRight, CheckCircle2, ClipboardList, FileText, Users, Wallet } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-image.png";
import { useAuth } from "@/hooks/use-auth";

const howItWorksSteps = [
  {
    step: "01",
    icon: Users,
    title: "Register your organization",
    description: "Fill in your organization profile - name, location, classification, officers, and adviser.",
  },
  {
    step: "02",
    icon: FileText,
    title: "Submit required documents",
    description: "Upload the required compliance documents, monitor their status, and respond to admin revision requests when needed.",
  },
  {
    step: "03",
    icon: Wallet,
    title: "Request activity budget",
    description: "Submit a budget request for your planned activity and track its approval status in real time.",
  },
  {
    step: "04",
    icon: CheckCircle2,
    title: "Submit liquidation report",
    description: "After your activity, submit a liquidation report to close out the budget and complete compliance.",
  },
];

const trustBadges = [
  "RA 10742 Compliant",
  "Pasig City LYDO",
  "NYC YORP 2026",
];

const Index = () => {
  const { isAuthenticated, role } = useAuth();
  const { hash } = useLocation();
  const portalHref = isAuthenticated ? (role === "admin" ? "/admin" : "/dashboard") : "/signin";
  const homepageFeatures = [
    {
      icon: Users,
      title: "Organization Profile",
      description: "Keep your organization details, officers, and adviser info current.",
    },
    {
      icon: FileText,
      title: "Document Submission",
      description: "Upload required documents and track review results.",
    },
    {
      icon: ClipboardList,
      title: "Budget Requests",
      description: "Submit activity budgets and monitor approval status.",
    },
    {
      icon: CheckCircle2,
      title: "Liquidation & Reporting",
      description: "Submit liquidation reports and monitor deadlines.",
    },
    {
      icon: Wallet,
      title: "Templates & Updates",
      description: "Download templates and follow official LYDO updates.",
    },
    {
      icon: ArrowRight,
      title: "Compliance Status",
      description: "See what is complete, pending, and due next.",
    },
  ];

  useEffect(() => {
    if (!hash) return;
    const targetId = hash.replace("#", "");
    const target = document.getElementById(targetId);
    if (!target) return;
    const handle = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(handle);
  }, [hash]);

  return (
    <div className="public-home-page min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="hero-section hero-gradient relative overflow-x-clip pt-14 lg:pt-16">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-10 right-20 h-96 w-96 rounded-full bg-primary blur-3xl" />
        </div>

        <div className="container mx-auto relative z-10 max-w-7xl px-5 py-8 sm:px-6 sm:py-10 md:py-20 lg:px-10 lg:py-24">
          <div className="grid items-center gap-8 md:grid-cols-2 lg:gap-14">
            <div className="animate-fade-up">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-secondary-foreground/20 bg-secondary-foreground/10 px-3 py-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-skGold shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-secondary-foreground/80">
                  Y-TRACE - Organization Compliance Portal
                </span>
              </div>

              <h1 className="hero-title mb-3 text-[2rem] font-heading font-extrabold leading-tight text-secondary-foreground sm:text-4xl md:text-5xl lg:text-[3.4rem]">
                Your youth organization's compliance,{" "}
                <span className="text-gradient">simplified.</span>
              </h1>

              <p className="hero-description mb-5 max-w-lg text-[0.95rem] leading-relaxed text-secondary-foreground/75 sm:text-lg">
                Register, submit compliance documents, request activity budgets, and track liquidation deadlines - all in one place with LYDO/PCYDO.
              </p>

              <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                <Button variant="hero" size="lg" className="w-full sm:w-auto" asChild>
                  <Link to={portalHref}>
                    {isAuthenticated ? "Open Portal" : "Sign In"}{" "}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                {!isAuthenticated && (
                  <Button variant="heroOutline" size="lg" className="w-full sm:w-auto" asChild>
                    <Link to="/signup">Create Account</Link>
                  </Button>
                )}
              </div>

              <div className="hero-trust-list mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
                {trustBadges.map((badge, i) => (
                  <span key={badge} className="flex items-center gap-1.5 text-xs text-secondary-foreground/60">
                    {i > 0 && <span className="hidden sm:inline text-secondary-foreground/30">·</span>}
                    <CheckCircle2 className="h-3.5 w-3.5 text-brand-skGold shrink-0" />
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <div className="animate-float order-last md:order-none">
              <img
                src={heroImage}
                alt="Youth organization members coordinating documents and compliance tasks"
                className="hero-illustration mx-auto h-auto max-h-[220px] w-full max-w-full rounded-2xl object-contain shadow-2xl md:max-h-none md:max-w-[520px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-background py-10 sm:py-12 md:py-24">
        <div className="container mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
          <div className="mb-6 mx-auto max-w-2xl text-center md:mb-14">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-primary">
              How It Works
            </span>
            <h2 className="mb-3 text-[1.6rem] font-heading font-bold text-foreground sm:text-3xl md:text-4xl">
              Four steps from registration to compliance
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Every organization follows the same workflow - profile, documents, budget, liquidation.
            </p>
          </div>

          <div className="how-it-works-list grid gap-0 lg:grid-cols-4 lg:gap-4">
            {howItWorksSteps.map(({ step, icon: Icon, title, description }) => (
              <div
                key={step}
                className="how-it-works-item grid grid-cols-[48px_minmax(0,1fr)] gap-x-3.5 border-b border-border/70 py-6 last:border-b-0 md:grid-cols-[auto_minmax(0,1fr)] md:gap-3 md:py-4 lg:flex lg:flex-col lg:gap-4 lg:rounded-xl lg:border lg:bg-card lg:p-5 lg:card-shadow"
              >
                <div className="contents md:flex md:items-start md:gap-3 lg:justify-between">
                  <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 md:flex lg:h-11 lg:w-11">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="self-start font-heading text-[2rem] font-semibold leading-none tabular-nums text-primary/60 md:normal-nums md:text-2xl md:font-extrabold md:text-muted-foreground/20 lg:text-3xl">
                    {step}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="mb-1.5 font-heading text-[1.08rem] font-bold leading-snug text-foreground md:mb-1 md:text-[0.98rem] lg:mb-1.5 lg:text-base">
                    {title}
                  </h3>
                  <p className="min-w-0 break-words text-left text-[0.9375rem] leading-[1.6] text-muted-foreground md:text-[0.875rem] md:leading-relaxed lg:text-sm">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Features */}
      <section className="bg-muted/40 py-10 sm:py-12 md:py-24">
        <div className="container mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
          <div className="mb-8 mx-auto max-w-2xl text-center sm:mb-14">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-primary">
              What's Inside
            </span>
            <h2 className="mb-3 text-[1.6rem] font-heading font-bold text-foreground sm:text-3xl md:text-4xl">
              Everything your organization needs
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Each section of the portal is built around a specific compliance need.
            </p>
          </div>

          <div className="homepage-feature-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
            {homepageFeatures.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="homepage-feature-card rounded-xl border border-border bg-card p-4 card-shadow transition-all duration-200 hover:border-primary/30 hover:card-shadow-hover lg:p-5"
              >
                <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 lg:mb-3 lg:h-10 lg:w-10">
                  <Icon className="h-4 w-4 text-primary lg:h-5 lg:w-5" />
                </div>
                <h3 className="mb-1 font-heading text-[0.98rem] font-bold leading-snug text-foreground lg:mb-1.5 lg:text-base">
                  {title}
                </h3>
                <p className="line-clamp-3 text-[0.875rem] leading-relaxed text-muted-foreground lg:line-clamp-none lg:text-sm">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Band */}
      <section className="homepage-final-cta hero-gradient relative overflow-hidden py-10 sm:py-12 md:py-28">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-primary blur-3xl" />
          <div className="absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-brand-skGold blur-3xl" />
        </div>

        <div className="container mx-auto relative z-10 max-w-2xl px-5 text-center sm:px-8">
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-secondary-foreground/50">
            Get Started
          </span>
          <h2 className="mb-3 text-[1.85rem] font-heading font-extrabold leading-tight text-secondary-foreground sm:text-4xl md:text-5xl">
            Ready to register your organization?
          </h2>
          <p className="mb-5 text-[0.95rem] text-secondary-foreground/70 sm:text-lg">
            Create an account, complete your profile, and start the compliance process - all in one place.
          </p>
          <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
            <Button variant="hero" size="lg" className="w-full sm:w-auto" asChild>
              <Link to={portalHref}>
                {isAuthenticated ? "Open Portal" : "Sign In"}{" "}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            {!isAuthenticated && (
              <Button
                size="lg"
                className="w-full sm:w-auto border border-white/30 bg-white/10 text-secondary-foreground hover:bg-white/20"
                asChild
              >
                <Link to="/signup">Create Account</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
