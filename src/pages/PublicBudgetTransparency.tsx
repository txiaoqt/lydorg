import Navbar from "@/components/Navbar";
import AnnouncementBar from "@/components/AnnouncementBar";
import Footer from "@/components/Footer";
import PublicBudgetOverview from "@/components/public/PublicBudgetOverview";

const PublicBudgetTransparency = () => {
  return (
    <div className="public-budget-transparency-page min-h-screen bg-background">
      <AnnouncementBar />
      <Navbar />

      {/* Hero */}
      <section className="public-templates-hero-gradient px-4 pt-[96px] sm:px-6 sm:pt-[120px] lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-6 pt-6 sm:gap-[48px] sm:pb-[48px] sm:pt-[64px]">
          {/* Title block */}
          <div className="flex flex-col items-center gap-2.5 text-center sm:items-start sm:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
              Civic Fiscal Openness
            </span>
            <h1 className="font-segoe font-bold leading-[105%] tracking-[-0.03em] text-public-text-neutral-on-neutral text-[28px] sm:text-public-fs-hero">
              Budget Transparency
            </h1>
            <p className="font-segoe font-normal leading-relaxed sm:leading-[120%] text-public-text-neutral-on-neutral text-sm sm:text-public-fs-subtitle-sm max-w-2xl">
              Official public overview of the Local Youth Development Fund in Pasig City. Track authorized city appropriations, approved community youth grants, disbursements, and audited utilization.
            </p>
          </div>
        </div>
      </section>

      {/* Main Budget Transparency Overview */}
      <main className="bg-background px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:px-[64px]">
        <div className="mx-auto w-full max-w-7xl">
          <PublicBudgetOverview />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PublicBudgetTransparency;
