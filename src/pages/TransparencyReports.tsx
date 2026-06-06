import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, FileText, Filter, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DisclosureDocument } from "@/lib/transparencyPortalData";
import { fetchDisclosureRegistry, fetchTransparencyKpis } from "@/lib/data-api";

const quarters = ["All", "Q1", "Q2", "Q3", "Q4"];

const downloadFile = (fileName: string, data: string, mimeType: string) => {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

export default function TransparencyReports() {
  const [documents, setDocuments] = useState<DisclosureDocument[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [kpis, setKpis] = useState({
    disclosuresPublished: 0,
    reportsReceived: 0,
    reportsResolved: 0,
    avgResponseHours: 0,
    pendingTickets: 0,
  });
  const [search, setSearch] = useState("");
  const [docType, setDocType] = useState("All");
  const [fiscalYear, setFiscalYear] = useState("All");
  const [quarter, setQuarter] = useState("All");
  const [barangay, setBarangay] = useState("All");
  const [office, setOffice] = useState("All");
  const [openMobileDocs, setOpenMobileDocs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoadingData(true);
      const [registry, portalKpis] = await Promise.all([fetchDisclosureRegistry(), fetchTransparencyKpis()]);
      if (!mounted) return;
      setDocuments(registry);
      setKpis(portalKpis);
      setIsLoadingData(false);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const docTypes = ["All", ...Array.from(new Set(documents.map((d) => d.documentType)))];
  const years = ["All", ...Array.from(new Set(documents.map((d) => String(d.fiscalYear))))];
  const barangays = ["All", ...Array.from(new Set(documents.map((d) => d.barangay)))];
  const offices = ["All", ...Array.from(new Set(documents.map((d) => d.office)))];

  const filtered = useMemo(
    () =>
      documents.filter((doc) => {
        const matchSearch = doc.title.toLowerCase().includes(search.toLowerCase());
        const matchType = docType === "All" || doc.documentType === docType;
        const matchYear = fiscalYear === "All" || String(doc.fiscalYear) === fiscalYear;
        const matchQuarter = quarter === "All" || doc.quarter === quarter;
        const matchBarangay = barangay === "All" || doc.barangay === barangay;
        const matchOffice = office === "All" || doc.office === office;
        return matchSearch && matchType && matchYear && matchQuarter && matchBarangay && matchOffice;
      }),
    [documents, search, docType, fiscalYear, quarter, barangay, office],
  );

  const exportCsv = () => {
    const header = ["Title", "Document Type", "Fiscal Year", "Quarter", "Barangay", "Office", "Published Date", "Size", "PDF URL"];
    const rows = filtered.map((doc) => [doc.title, doc.documentType, doc.fiscalYear, doc.quarter, doc.barangay, doc.office, doc.publishedDate, doc.size, doc.pdfUrl]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadFile("disclosure-registry.csv", csv, "text/csv;charset=utf-8;");
  };

  const exportJson = () => {
    downloadFile("disclosure-registry.json", JSON.stringify(filtered, null, 2), "application/json;charset=utf-8;");
  };

  const mobileRecordLabel = (doc: DisclosureDocument) =>
    [
      doc.documentType,
      doc.fiscalYear ? `FY ${doc.fiscalYear}` : null,
      doc.quarter ? doc.quarter : null,
    ]
      .filter(Boolean)
      .join(" • ");

  const toggleMobileDoc = (docId: string) => {
    setOpenMobileDocs((current) => ({ ...current, [docId]: !current[docId] }));
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <div className="pt-16">
        <PageHero
          title="Disclosure Registry"
          description="Structured full-disclosure records by type, fiscal year, quarter, office, and barangay."
        />

        <section className="container mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-6">
          <div className="bg-card border rounded-2xl p-4 sm:p-5 card-shadow">
            <h2 className="mb-3 text-base sm:text-lg font-semibold">Transparency Board Snapshot</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-5">
              <div className="rounded-lg border bg-muted/20 p-3 sm:p-4">
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">Disclosures Published</p>
                <p className="mt-1 text-lg sm:text-xl font-semibold">{kpis.disclosuresPublished}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 sm:p-4">
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">Reports Received</p>
                <p className="mt-1 text-lg sm:text-xl font-semibold">{kpis.reportsReceived}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 sm:p-4">
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">Reports Resolved</p>
                <p className="mt-1 text-lg sm:text-xl font-semibold">{kpis.reportsResolved}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 sm:p-4">
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">Avg Response (hrs)</p>
                <p className="mt-1 text-lg sm:text-xl font-semibold">{kpis.avgResponseHours}</p>
              </div>
              <div className="col-span-2 rounded-lg border bg-muted/20 p-3 sm:p-4 md:col-span-1">
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">Pending Tickets</p>
                <p className="mt-1 text-lg sm:text-xl font-semibold">{kpis.pendingTickets}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-2xl border bg-card p-4 sm:p-5 card-shadow">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search disclosure title..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-11 pl-9 text-sm rounded-lg"
                  />
                </div>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="h-11 rounded-lg">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>{docTypes.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={fiscalYear} onValueChange={setFiscalYear}>
                  <SelectTrigger className="h-11 rounded-lg"><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>{years.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={quarter} onValueChange={setQuarter}>
                  <SelectTrigger className="h-11 rounded-lg"><SelectValue placeholder="Quarter" /></SelectTrigger>
                  <SelectContent>{quarters.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={barangay} onValueChange={setBarangay}>
                  <SelectTrigger className="h-11 rounded-lg"><SelectValue placeholder="Barangay" /></SelectTrigger>
                  <SelectContent>{barangays.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={office} onValueChange={setOffice}>
                  <SelectTrigger className="h-11 rounded-lg"><SelectValue placeholder="Office" /></SelectTrigger>
                  <SelectContent>{offices.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={exportCsv} className="h-11 w-full rounded-lg">
                <Download className="mr-1 h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={exportJson} className="h-11 w-full rounded-lg">
                <Download className="mr-1 h-4 w-4" />
                Export JSON
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-lg border overflow-hidden card-shadow">
            {isLoadingData ? (
              <div className="p-6 text-sm text-muted-foreground">Loading disclosure registry...</div>
            ) : (
              <>
                <div className="md:hidden space-y-3 p-4 sm:p-5">
                  {filtered.map((doc) => (
                    <article key={doc.id} className="rounded-xl border bg-background p-4 shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleMobileDoc(doc.id)}
                        className="flex w-full items-start justify-between gap-3 text-left"
                        aria-expanded={Boolean(openMobileDocs[doc.id])}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                              <span className="break-words whitespace-normal">{doc.title}</span>
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground break-words whitespace-normal">
                              {mobileRecordLabel(doc)}
                            </p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                            openMobileDocs[doc.id] ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {openMobileDocs[doc.id] ? (
                        <div className="mt-3 space-y-2">
                          {doc.pdfUrl ? (
                            <a
                              href={doc.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Open PDF
                            </a>
                          ) : null}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg border bg-muted/20 p-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Type</p>
                            <p className="mt-1 break-words whitespace-normal text-sm font-medium text-foreground">{doc.documentType}</p>
                          </div>
                          <div className="rounded-lg border bg-muted/20 p-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">FY</p>
                            <p className="mt-1 text-sm font-medium text-foreground">{doc.fiscalYear}</p>
                          </div>
                          <div className="rounded-lg border bg-muted/20 p-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Quarter</p>
                            <p className="mt-1 text-sm font-medium text-foreground">{doc.quarter}</p>
                          </div>
                          <div className="rounded-lg border bg-muted/20 p-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Published</p>
                            <p className="mt-1 text-sm font-medium text-foreground">{doc.publishedDate}</p>
                          </div>
                          <div className="col-span-2 rounded-lg border bg-muted/20 p-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Office / Barangay</p>
                            <p className="mt-1 break-words whitespace-normal text-sm font-medium text-foreground">
                              {doc.office} / {doc.barangay}
                            </p>
                          </div>
                          <div className="col-span-2 rounded-lg border bg-muted/20 p-2.5">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">PDF Size</p>
                            <p className="mt-1 text-sm font-medium text-foreground">{doc.size}</p>
                          </div>
                        </div>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[860px] text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-left">
                      <th className="px-3 sm:px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">FY</th>
                      <th className="px-4 py-3 font-medium">Qtr</th>
                      <th className="px-4 py-3 font-medium">Barangay</th>
                      <th className="px-4 py-3 font-medium">Office</th>
                      <th className="px-4 py-3 font-medium">Published</th>
                      <th className="px-4 py-3 font-medium">PDF Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((doc) => (
                      <tr key={doc.id} className="border-t">
                        <td className="px-3 sm:px-4 py-3 min-w-72 align-top">
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 mt-0.5 text-primary" />
                            {doc.pdfUrl ? (
                              <a href={doc.pdfUrl} target="_blank" rel="noreferrer" className="break-words whitespace-normal text-primary hover:underline">
                                {doc.title}
                              </a>
                            ) : (
                              <span className="break-words whitespace-normal">{doc.title}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{doc.documentType}</td>
                        <td className="px-4 py-3">{doc.fiscalYear}</td>
                        <td className="px-4 py-3">{doc.quarter}</td>
                        <td className="px-4 py-3">{doc.barangay}</td>
                        <td className="px-4 py-3">{doc.office}</td>
                        <td className="px-4 py-3">{doc.publishedDate}</td>
                        <td className="px-4 py-3">{doc.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>

          {!isLoadingData && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No disclosure documents found for selected filters.</p>
            </div>
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
}
