import { useCallback, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PublicBudgetOverview from "@/components/public/PublicBudgetOverview";
import PublicBudgetTransparencyMap from "@/components/public/PublicBudgetTransparencyMap";
import { cn } from "@/lib/utils";

const PublicBudgetTransparency = () => {
  const [activeTab, setActiveTab] = useState<"overview" | "map">("overview");
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [availableFiscalYears, setAvailableFiscalYears] = useState([new Date().getFullYear()]);
  const updateAvailableFiscalYears = useCallback((years: number[]) => {
    setAvailableFiscalYears((current) => current.join(",") === years.join(",") ? current : years);
  }, []);

  return (
    <div className="public-budget-transparency-page min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="public-templates-hero-gradient px-4 pt-16 sm:px-6 sm:pt-20 lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-6 pt-6 sm:gap-[48px] sm:pb-[48px] sm:pt-[64px]">
          {/* Title block */}
          <div className="flex flex-col items-center gap-2.5 text-center sm:items-start sm:text-left">
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
          <div role="tablist" aria-label="Budget transparency views" className="public-budget-transparency-tabs mb-6 flex w-full flex-nowrap gap-2 border-b border-slate-200 pb-3">
            <button
              id="budget-overview-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === "overview"}
              aria-controls="budget-overview-panel"
              onClick={() => setActiveTab("overview")}
              className={cn(
                "min-h-11 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:px-5",
                activeTab === "overview" ? "border-blue-950 bg-blue-950 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >Budget Transparency</button>
            <button
              id="budget-map-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === "map"}
              aria-controls="budget-map-panel"
              onClick={() => setActiveTab("map")}
              className={cn(
                "min-h-11 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 sm:px-5",
                activeTab === "map" ? "border-blue-950 bg-blue-950 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >Budget Transparency Map</button>
          </div>
          {activeTab === "overview" ? (
            <div id="budget-overview-panel" role="tabpanel" aria-labelledby="budget-overview-tab">
              <PublicBudgetOverview
                selectedFiscalYear={fiscalYear}
                onFiscalYearChange={setFiscalYear}
                onAvailableFiscalYearsChange={updateAvailableFiscalYears}
              />
            </div>
          ) : (
            <div id="budget-map-panel" role="tabpanel" aria-labelledby="budget-map-tab">
              <PublicBudgetTransparencyMap
                fiscalYear={fiscalYear}
                availableFiscalYears={availableFiscalYears}
                onFiscalYearChange={setFiscalYear}
              />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PublicBudgetTransparency;
