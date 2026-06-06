import { useMemo, useState, useEffect } from "react";
import { BarChart3, DollarSign, MapPin, Shield, Users } from "lucide-react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import ComplianceBadge from "@/components/ComplianceBadge";
import { fetchFinancialDashboardData, type FinancialDashboardRow } from "@/lib/data-api";

const mapCenter: [number, number] = [14.696, 121.126];

const baseMarkerIcon = new L.Icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const statusMarkerIcon = (status: "compliant" | "pending" | "overdue") => {
  const color = status === "overdue" ? "#CC1F2F" : status === "pending" ? "#7A6000" : "#1A3F7A";

  return L.divIcon({
    className: "status-marker-wrapper",
    html: `
      <div style="position: relative; width: 24px; height: 36px;">
        <img src="${markerIcon}" style="width:24px;height:36px;display:block;filter:grayscale(100%);" />
        <div style="position:absolute;left:6px;top:6px;width:12px;height:12px;border-radius:9999px;background:${color};border:2px solid #ffffff;box-shadow:0 1px 2px rgba(0,0,0,.25);"></div>
      </div>
    `,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [1, -28],
  });
};

const statusMarkerColor = (status: "compliant" | "pending" | "overdue") => {
  if (status === "overdue") return "text-destructive";
  if (status === "pending") return "text-warning";
  return "text-primary";
};

const MapSizeFix = () => {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, [map]);

  return null;
};

export default function BarangayMap() {
  const [rows, setRows] = useState<FinancialDashboardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      const dashboard = await fetchFinancialDashboardData();
      if (!mounted) return;
      setRows(dashboard.rows);
      setIsLoading(false);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const rowByBarangay = useMemo(
    () =>
      rows.reduce<Record<string, FinancialDashboardRow>>((acc, row) => {
        acc[row.name] = row;
        return acc;
      }, {}),
    [rows],
  );

  const markerItems = useMemo(
    () =>
      rows
        .filter((row) => row.latitude != null && row.longitude != null)
        .map((row) => ({
          name: row.name,
          coords: [row.latitude as number, row.longitude as number] as [number, number],
          status: row.complianceStatus,
        })),
    [rows],
  );

  const data = selected ? rowByBarangay[selected] : null;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <div className="pt-16">
        <PageHero
          title="Barangay Map"
          description="Click any marker to view youth population, budget utilization, activities, and compliance status."
        />

        <section className="container py-5 pb-8 sm:py-7 sm:pb-10">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2">
              <div className="relative z-0 bg-card rounded-lg border p-3.5 sm:p-4 card-shadow">
                <div className="flex flex-col gap-2 mb-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                    <h2 className="font-heading text-[15px] font-semibold sm:text-base">
                      Interactive Barangay Map
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-none text-muted-foreground sm:gap-x-3 sm:text-xs">
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" />Compliant</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" />Pending</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" />Overdue</span>
                  </div>
                </div>

                <div className="relative z-0 h-[300px] w-full overflow-hidden rounded-lg border sm:h-[360px] md:h-[420px] [&_.leaflet-container]:z-0 [&_.leaflet-control-attribution]:bg-background/90 [&_.leaflet-control-attribution]:px-2 [&_.leaflet-control-attribution]:py-1 [&_.leaflet-control-attribution]:text-[10px] [&_.leaflet-control-zoom]:ml-2 [&_.leaflet-control-zoom]:mt-2 [&_.leaflet-control-zoom]:overflow-hidden [&_.leaflet-control-zoom]:shadow-sm [&_.leaflet-control-zoom_a]:h-8 [&_.leaflet-control-zoom_a]:w-8 [&_.leaflet-control-zoom_a]:leading-8">
                  {isLoading ? (
                    <div className="h-full grid place-items-center text-sm text-muted-foreground">Loading map data...</div>
                  ) : (
                    <MapContainer
                      center={mapCenter}
                      zoom={13}
                      scrollWheelZoom
                      className="h-full w-full"
                      style={{ width: "100%", height: "100%" }}
                    >
                      <MapSizeFix />
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {markerItems.map((item) => (
                        <Marker
                          key={item.name}
                          position={item.coords}
                          icon={statusMarkerIcon(item.status) ?? baseMarkerIcon}
                          eventHandlers={{ click: () => setSelected(item.name) }}
                        >
                          <Popup>
                            <div className="text-sm">
                              <p className="font-semibold">{item.name}</p>
                              <p className="text-muted-foreground">Youth: {rowByBarangay[item.name]?.youthPopulation.toLocaleString() ?? 0}</p>
                              <p className={statusMarkerColor(item.status)}>Status: {item.status}</p>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  )}
                </div>
              </div>
            </div>

            <div>
              {data && selected ? (
                <div className="bg-card rounded-lg border p-4 sm:p-6 card-shadow animate-fade-up">
                  <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
                    <h3 className="font-heading text-[17px] font-bold leading-tight sm:text-lg">{selected}</h3>
                    <ComplianceBadge status={data.complianceStatus} />
                  </div>

                  <div className="grid gap-2.5 sm:gap-3">
                    <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 sm:items-center sm:p-3.5">
                      <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:mt-0" />
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Youth Population</p>
                        <p className="font-semibold leading-tight">{data.youthPopulation.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 sm:items-center sm:p-3.5">
                      <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-accent sm:mt-0" />
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">SK Budget</p>
                        <p className="font-semibold leading-tight">PHP {data.skBudget.toLocaleString()}</p>
                        <p className="text-xs leading-tight text-muted-foreground">
                          Utilized: PHP {data.utilizedBudget.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 sm:items-center sm:p-3.5">
                      <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:mt-0" />
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Activities and Participants</p>
                        <p className="font-semibold leading-tight">
                          {data.activities} activities, {data.participants.toLocaleString()} participants
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 sm:items-center sm:p-3.5">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:mt-0" />
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">SK Chairperson</p>
                        <p className="font-semibold leading-tight">{data.skChairperson}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-card rounded-lg border p-4 sm:p-6 card-shadow text-center">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-muted/60 sm:h-14 sm:w-14">
                    <MapPin className="h-6 w-6 text-muted-foreground/35 sm:h-7 sm:w-7" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No barangay selected yet</p>
                  <p className="mx-auto mt-1 max-w-[18rem] text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
                    Tap any marker on the map to see youth population, budget use, activities, and compliance status.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
