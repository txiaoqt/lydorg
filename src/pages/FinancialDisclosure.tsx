import { useEffect, useMemo, useState } from "react";
import { BarChart3, DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import StatCard from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { fetchFinancialDashboardData, type FinancialDashboardRow } from "@/lib/data-api";

const getUtilizationStatus = (percent: number) => {
  if (percent >= 80) return { label: "Healthy", className: "bg-success/12 text-success border-success/30" };
  if (percent >= 60) return { label: "Moderate", className: "bg-warning/20 text-warning border-warning/40" };
  return { label: "Low", className: "bg-destructive/15 text-destructive border-destructive/30" };
};

const formatPeso = (value: number) => `PHP ${value.toLocaleString()}`;

export default function FinancialDisclosure() {
  const [rows, setRows] = useState<FinancialDashboardRow[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<Array<{ month: string; allocated: number; utilized: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      const dashboard = await fetchFinancialDashboardData();
      if (!mounted) return;
      setRows(dashboard.rows.sort((a, b) => b.percent - a.percent));
      setMonthlyTrend(dashboard.monthlyTrend);
      setIsLoading(false);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    const totalBudget = rows.reduce((sum, row) => sum + row.skBudget, 0);
    const totalUtilized = rows.reduce((sum, row) => sum + row.utilizedBudget, 0);
    const totalRemaining = totalBudget - totalUtilized;
    const utilizationRate = totalBudget > 0 ? Math.round((totalUtilized / totalBudget) * 100) : 0;
    return { totalBudget, totalUtilized, totalRemaining, utilizationRate };
  }, [rows]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <div className="pt-16">
        <PageHero
          title="Financial Disclosure"
          description="Modern snapshot of allocations, utilization, and remaining budgets across barangay SK offices."
        />

        <section className="container mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <StatCard
              icon={DollarSign}
              label="Total Budget"
              value={`PHP ${(totals.totalBudget / 1000000).toFixed(1)}M`}
              variant="primary"
            />
            <StatCard
              icon={TrendingUp}
              label="Utilized"
              value={`PHP ${(totals.totalUtilized / 1000000).toFixed(1)}M`}
              variant="accent"
            />
            <StatCard
              icon={TrendingDown}
              label="Remaining"
              value={`PHP ${(totals.totalRemaining / 1000000).toFixed(1)}M`}
              variant="warning"
            />
            <StatCard
              icon={BarChart3}
              label="Utilization Rate"
              value={`${totals.utilizationRate}%`}
              description="Overall SK utilization"
              variant="primary"
            />
          </div>

          <div className="bg-card rounded-2xl border p-4 sm:p-5 card-shadow">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-heading font-semibold text-base sm:text-lg">Monthly Budget Trend</h3>
                <p className="text-sm text-muted-foreground">Allocated vs utilized amount per month</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" />Allocated</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-secondary" />Utilized</span>
              </div>
            </div>
            <div className="h-56 sm:h-64 md:h-72">
              {monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 90%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `PHP ${(Number(value) / 1000000).toFixed(1)}M`}
                      width={66}
                    />
                    <Tooltip formatter={(value: number) => formatPeso(value)} />
                    <Legend />
                    <Bar dataKey="allocated" name="Allocated" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="utilized" name="Utilized" fill="hsl(var(--secondary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full grid place-items-center text-sm text-muted-foreground">No monthly financial trend data yet.</div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl border card-shadow overflow-hidden">
            <div className="p-4 sm:p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold text-base sm:text-lg">Barangay Budget Overview</h3>
                <p className="text-sm text-muted-foreground">Sorted by utilization rate (highest to lowest)</p>
              </div>
            </div>
            {isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading financial data...</div>
            ) : rows.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No barangay financial rows in Supabase yet.</div>
            ) : (
              <>
                <div className="md:hidden space-y-3 p-4 sm:p-5">
                  {rows.map((row) => {
                    const status = getUtilizationStatus(row.percent);
                    return (
                      <article key={row.name} className="rounded-xl border bg-background p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground break-words">{row.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Sorted by utilization rate</p>
                          </div>
                          <Badge variant="outline" className={status.className}>
                            {status.label}
                          </Badge>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg border bg-muted/20 p-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">SK Budget</p>
                            <p className="mt-1 break-words whitespace-normal text-sm font-medium text-foreground">
                              {formatPeso(row.skBudget)}
                            </p>
                          </div>
                          <div className="rounded-lg border bg-muted/20 p-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Utilized</p>
                            <p className="mt-1 break-words whitespace-normal text-sm font-medium text-foreground">
                              {formatPeso(row.utilizedBudget)}
                            </p>
                          </div>
                          <div className="rounded-lg border bg-muted/20 p-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Remaining</p>
                            <p className="mt-1 break-words whitespace-normal text-sm font-medium text-foreground">
                              {formatPeso(row.remaining)}
                            </p>
                          </div>
                          <div className="rounded-lg border bg-muted/20 p-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Utilization</p>
                            <p className="mt-1 text-sm font-medium text-foreground">{row.percent}%</p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <Progress value={row.percent} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-10 text-right">{row.percent}%</span>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[860px] text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="px-3 sm:px-5 py-3 font-medium">Barangay</th>
                      <th className="px-5 py-3 font-medium text-right">SK Budget</th>
                      <th className="px-5 py-3 font-medium text-right">Utilized</th>
                      <th className="px-5 py-3 font-medium text-right">Remaining</th>
                      <th className="px-5 py-3 font-medium">Health</th>
                      <th className="px-5 py-3 font-medium w-44">Utilization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                        const status = getUtilizationStatus(row.percent);
                        return (
                          <tr key={row.name} className="border-t hover:bg-muted/20 transition-colors">
                            <td className="px-3 sm:px-5 py-3 font-medium">{row.name}</td>
                            <td className="px-5 py-3 text-right">PHP {row.skBudget.toLocaleString()}</td>
                            <td className="px-5 py-3 text-right">PHP {row.utilizedBudget.toLocaleString()}</td>
                            <td className="px-5 py-3 text-right">PHP {row.remaining.toLocaleString()}</td>
                            <td className="px-5 py-3">
                              <Badge variant="outline" className={status.className}>{status.label}</Badge>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <Progress value={row.percent} className="h-2 flex-1" />
                                <span className="text-xs text-muted-foreground w-9 text-right">{row.percent}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
