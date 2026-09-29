import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, GeoJsonObject, Layer, PathOptions } from "leaflet";
import { AlertTriangle, Check, Eye, LoaderCircle, MapPin, RefreshCw } from "lucide-react";
import {
  CANONICAL_PASIG_BARANGAYS,
  getPasigDistrictForBarangay,
  normalizePasigBarangayName,
  type PasigDistrict,
} from "@/lib/pasig-districts";
import type { OrganizationFundingRow } from "@/admin/components/OrganizationFundingTable";

type AllocationRow = {
  district: string;
  barangay: string;
  organizationId?: string;
  organizationCount?: number;
  releasedBudgetCount?: number;
  approvedAmount: number;
  releasedAmount: number;
  liquidatedAmount: number;
};
type BarangayFeature = Feature & { properties: Record<string, unknown> };
type BarangayCollection = { type: "FeatureCollection"; features: BarangayFeature[] };
type BarangayBudget = {
  name: string;
  district: PasigDistrict | "";
  organizationCount: number;
  releasedBudgetCount: number;
  approvedAmount: number;
  releasedAmount: number;
  liquidatedAmount: number;
  approvedBalance: number;
  releasedBalance: number;
};
type Coordinate = [number, number, ...number[]];
type PolygonGeometry = { type: "Polygon" | "MultiPolygon"; coordinates: Coordinate[][] | Coordinate[][][] };
type LineCollection = { type: "FeatureCollection"; features: Array<{ type: "Feature"; properties: Record<string, never>; geometry: { type: "MultiLineString"; coordinates: Coordinate[][] } }> };

const BOUNDARY_URL = "/data/pasig-barangay-boundaries.geojson";
const statusColors = { approved: "#2874c8", released: "#d18a00", liquidated: "#059669" } as const;
const statuses = [
  { id: "approved", label: "Approved", color: statusColors.approved },
  { id: "released", label: "Released", color: statusColors.released },
  { id: "liquidated", label: "Liquidated", color: statusColors.liquidated },
] as const;

const readFeatureName = (properties: Record<string, unknown> | null | undefined) => {
  if (!properties) return "";
  const aliases = ["barangay", "barangay_name", "brgy_name", "brgy", "name", "NAME", "NAME_3", "ADM4_EN", "ADM3_EN", "BGY_NAME"];
  for (const key of aliases) {
    const value = Object.entries(properties).find(([property]) => property.toLowerCase() === key.toLowerCase())?.[1];
    if (typeof value !== "string" || !value.trim()) continue;
    const name = CANONICAL_PASIG_BARANGAYS.find((entry) => normalizePasigBarangayName(entry.name) === normalizePasigBarangayName(value));
    if (name) return name.name;
  }
  for (const value of Object.values(properties)) {
    if (typeof value !== "string") continue;
    const name = CANONICAL_PASIG_BARANGAYS.find((entry) => normalizePasigBarangayName(entry.name) === normalizePasigBarangayName(value));
    if (name) return name.name;
  }
  return "";
};

const gradientId = (name: string) => `pasig-status-${normalizePasigBarangayName(name).replace(/[^a-z0-9]+/g, "-")}`;

/** Cancels shared barangay edges, leaving only the exterior city boundary. */
function createCityOutline(data: BarangayCollection): LineCollection {
  const edgeCounts = new Map<string, { count: number; line: Coordinate[] }>();
  const addRing = (ring: Coordinate[]) => {
    for (let index = 0; index < ring.length - 1; index += 1) {
      const start = ring[index];
      const end = ring[index + 1];
      const pointKey = (point: Coordinate) => `${point[0].toFixed(7)},${point[1].toFixed(7)}`;
      const a = pointKey(start);
      const b = pointKey(end);
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      const current = edgeCounts.get(key);
      if (current) current.count += 1;
      else edgeCounts.set(key, { count: 1, line: [start, end] });
    }
  };
  data.features.forEach((feature) => {
    const geometry = feature.geometry as PolygonGeometry | null;
    if (!geometry) return;
    const polygons = geometry.type === "Polygon"
      ? [geometry.coordinates as Coordinate[][]]
      : geometry.type === "MultiPolygon" ? geometry.coordinates as Coordinate[][][] : [];
    polygons.forEach((polygon) => polygon.forEach(addRing));
  });
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: {},
      geometry: { type: "MultiLineString", coordinates: [...edgeCounts.values()].filter((edge) => edge.count === 1).map((edge) => edge.line) },
    }],
  };
}

function FitBarangays({ data }: { data: BarangayCollection }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.geoJSON(data as unknown as GeoJsonObject);
    const bounds = layer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });
    const container = map.getContainer();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(container);
    return () => observer.disconnect();
  }, [data, map]);
  return null;
}

function StatusGradientPaint({ data, version }: { data: BarangayBudget[]; version: string }) {
  const map = useMap();
  useEffect(() => {
    const paint = () => {
      const defsBySvg = new Map<SVGSVGElement, SVGDefsElement>();
      const paintLayer = (item: Layer) => {
        if (item instanceof L.GeoJSON) {
          item.eachLayer(paintLayer);
          return;
        }
        if (!(item instanceof L.Path)) return;
        const element = item.getElement();
        const svg = element?.ownerSVGElement;
        const feature = (item as L.Path & { feature?: BarangayFeature }).feature;
        const name = readFeatureName(feature?.properties);
        const entry = data.find((row) => row.name === name);
        if (!element || !svg || !entry) return;
        let defs = defsBySvg.get(svg);
        if (!defs) {
          defs = svg.querySelector("defs[data-pasig-status-gradients]") ?? document.createElementNS("http://www.w3.org/2000/svg", "defs");
          defs.setAttribute("data-pasig-status-gradients", "true");
          if (!defs.parentNode) svg.prepend(defs);
          defsBySvg.set(svg, defs);
        }
        const id = gradientId(name);
        defs.querySelector(`#${id}`)?.remove();
        const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        gradient.id = id;
        gradient.setAttribute("x1", "0%");
        gradient.setAttribute("x2", "100%");
        gradient.setAttribute("y1", "0%");
        gradient.setAttribute("y2", "0%");
        const portions = [entry.approvedBalance, entry.releasedBalance, entry.liquidatedAmount];
        const total = portions.reduce((sum, amount) => sum + amount, 0);
        let offset = 0;
        portions.forEach((amount, index) => {
          if (amount <= 0 || total <= 0) return;
          const next = offset + amount / total * 100;
          const stopStart = document.createElementNS("http://www.w3.org/2000/svg", "stop");
          stopStart.setAttribute("offset", `${offset}%`);
          stopStart.setAttribute("stop-color", statuses[index].color);
          const stopEnd = document.createElementNS("http://www.w3.org/2000/svg", "stop");
          stopEnd.setAttribute("offset", `${next}%`);
          stopEnd.setAttribute("stop-color", statuses[index].color);
          gradient.append(stopStart, stopEnd);
          offset = next;
        });
        if (total <= 0) {
          const stop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
          stop.setAttribute("offset", "0%");
          stop.setAttribute("stop-color", "#edf2f8");
          gradient.append(stop);
        }
        defs.append(gradient);
        element.setAttribute("fill", `url(#${id})`);
      };
      map.eachLayer(paintLayer);
    };
    paint();
  }, [data, map, version]);
  return null;
}

function SyncBarangayStyles({ getStyle, version, focusedBarangay }: { getStyle: (feature?: Feature) => PathOptions; version: string; focusedBarangay: string }) {
  const map = useMap();
  useEffect(() => {
    const sync = (layer: Layer) => {
      if (layer instanceof L.GeoJSON) {
        layer.eachLayer(sync);
        return;
      }
      if (!(layer instanceof L.Path)) return;
      const feature = (layer as L.Path & { feature?: BarangayFeature }).feature;
      const name = readFeatureName(feature?.properties);
      if (!feature || !name) return;
      layer.setStyle(getStyle(feature));
      const element = layer.getElement();
      element?.setAttribute("fill", `url(#${gradientId(name)})`);
      element?.classList.toggle("pasig-barangay-focused", name === focusedBarangay);
    };
    map.eachLayer(sync);
  }, [focusedBarangay, getStyle, map, version]);
  return null;
}

export function PasigBudgetMap({
  rows,
  organizationRows,
  formatPesoAmount,
  selectedDistrict,
  selectedBarangay,
  fiscalPeriodLabel,
  onViewOrganization,
}: {
  rows: AllocationRow[];
  organizationRows: OrganizationFundingRow[];
  formatPesoAmount: (amount: number) => string;
  selectedDistrict: "all" | PasigDistrict;
  selectedBarangay: string;
  fiscalPeriodLabel: string;
  onViewOrganization: (organizationId: string) => void;
}) {
  const [boundaries, setBoundaries] = useState<BarangayCollection | null>(null);
  const [loadError, setLoadError] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [transparentSelectedFill, setTransparentSelectedFill] = useState(false);

  const loadBoundaries = useCallback(async (signal?: AbortSignal) => {
    setLoadError("");
    try {
      const response = await fetch(BOUNDARY_URL, { signal, headers: { Accept: "application/geo+json, application/json" } });
      if (!response.ok) throw new Error(`Boundary file returned ${response.status}.`);
      const result = await response.json() as BarangayCollection;
      if (result.type !== "FeatureCollection" || !Array.isArray(result.features) || result.features.length === 0) throw new Error("The boundary file returned no barangay polygons.");
      const features = result.features.filter((feature) => readFeatureName(feature.properties));
      const unique = new Set(features.map((feature) => readFeatureName(feature.properties)));
      if (unique.size !== CANONICAL_PASIG_BARANGAYS.length) throw new Error(`The boundary file covers ${unique.size} of ${CANONICAL_PASIG_BARANGAYS.length} canonical barangays, so the map was not drawn.`);
      setBoundaries({ ...result, features });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLoadError(error instanceof Error ? error.message : "Unable to load the barangay boundary map.");
      setBoundaries(null);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadBoundaries(controller.signal);
    return () => controller.abort();
  }, [loadBoundaries]);

  useEffect(() => {
    const selected = CANONICAL_PASIG_BARANGAYS.find(({ name }) => normalizePasigBarangayName(name) === normalizePasigBarangayName(selectedBarangay));
    setSelectedName(selectedBarangay === "all" ? "" : selected?.name ?? "");
  }, [selectedBarangay]);

  const barangayData = useMemo<BarangayBudget[]>(() => {
    const canonical = CANONICAL_PASIG_BARANGAYS.map(({ name }) => ({
      name,
      district: getPasigDistrictForBarangay(name),
      organizationCount: 0,
      releasedBudgetCount: 0,
      approvedAmount: 0,
      releasedAmount: 0,
      liquidatedAmount: 0,
      approvedBalance: 0,
      releasedBalance: 0,
    } satisfies BarangayBudget));
    const byName = new Map(canonical.map((entry) => [normalizePasigBarangayName(entry.name), entry]));
    const organizationsByName = new Map<string, Set<string>>();
    rows.forEach((row) => {
      const entry = byName.get(normalizePasigBarangayName(row.barangay));
      if (!entry) return;
      entry.approvedAmount += row.approvedAmount;
      entry.releasedAmount += row.releasedAmount;
      entry.liquidatedAmount += row.liquidatedAmount;
      if (row.releasedAmount > 0) entry.releasedBudgetCount += 1;
      const ids = organizationsByName.get(entry.name) ?? new Set<string>();
      if (row.organizationId) ids.add(row.organizationId);
      else entry.organizationCount += row.organizationCount ?? 0;
      organizationsByName.set(entry.name, ids);
    });
    canonical.forEach((entry) => {
      entry.organizationCount += organizationsByName.get(entry.name)?.size ?? 0;
      entry.approvedAmount = Math.max(entry.approvedAmount, entry.releasedAmount, entry.liquidatedAmount);
      entry.approvedBalance = Math.max(entry.approvedAmount - entry.releasedAmount, 0);
      entry.releasedBalance = Math.max(entry.releasedAmount - entry.liquidatedAmount, 0);
    });
    return canonical;
  }, [rows]);

  const cityOutline = useMemo(() => boundaries ? createCityOutline(boundaries) : null, [boundaries]);
  const totals = useMemo(() => rows.reduce((acc, row) => {
    acc.approved += row.approvedAmount;
    acc.released += row.releasedAmount;
    acc.liquidated += row.liquidatedAmount;
    acc.organizations.add(row.organizationId ?? `${row.district}::${row.barangay}`);
    return acc;
  }, { approved: 0, released: 0, liquidated: 0, organizations: new Set<string>() }), [rows]);
  const selectedEntry = barangayData.find((entry) => entry.name === selectedName) ?? null;
  const selectedOrganizations = selectedEntry
    ? organizationRows.filter((organization) => normalizePasigBarangayName(organization.barangay) === normalizePasigBarangayName(selectedEntry.name) && organization.totalReleased > 0)
    : [];
  const selectedFeatureName = useCallback((feature: BarangayFeature) => readFeatureName(feature.properties), []);
  const getStyle = useCallback((feature?: BarangayFeature): PathOptions => {
    const name = feature ? selectedFeatureName(feature) : "";
    const entry = barangayData.find((barangay) => barangay.name === name);
    const focusActive = Boolean(selectedName);
    const focused = focusActive && name === selectedName;
    if (focusActive && !focused) {
      return {
        color: "#9aa8b8",
        weight: 0.6,
        opacity: 0.12,
        fillColor: "#dce5ef",
        fillOpacity: 0.025,
      };
    }
    const highlighted = name === selectedName
      || (selectedBarangay !== "all" && normalizePasigBarangayName(name) === normalizePasigBarangayName(selectedBarangay))
      || (selectedDistrict !== "all" && entry?.district === selectedDistrict);
    return {
      color: focused ? "#102d56" : highlighted ? "#12366b" : "#ffffff",
      weight: focused ? 5 : highlighted ? 2.5 : 1,
      opacity: 1,
      fillColor: "#dce5ef",
      fillOpacity: focused ? (transparentSelectedFill ? 0.3 : 0.98) : 0.92,
    };
  }, [barangayData, selectedBarangay, selectedDistrict, selectedFeatureName, selectedName, transparentSelectedFill]);
  const version = JSON.stringify(barangayData.map((entry) => [entry.name, entry.approvedBalance, entry.releasedBalance, entry.liquidatedAmount]));
  const getStyleRef = useRef(getStyle);
  getStyleRef.current = getStyle;
  const stableStyle = useCallback((feature?: Feature) => getStyleRef.current(feature as BarangayFeature), []);
  const handleFeature = useCallback((feature: BarangayFeature, layer: Layer) => {
    const name = selectedFeatureName(feature);
    layer.bindTooltip(name || "Unmatched barangay", { sticky: true, direction: "top", className: "pasig-map-tooltip" });
    layer.on({
      click: () => setSelectedName((current) => current === name ? "" : name),
      mouseover: (event) => {
        const target = event.target as L.Path;
        const style = getStyleRef.current(feature);
        target.setStyle({ ...style, weight: Math.max(Number(style.weight ?? 1), 3), color: "#12366b" });
        target.getElement()?.setAttribute("fill", `url(#${gradientId(name)})`);
      },
      mouseout: (event) => {
        const target = event.target as L.Path;
        target.setStyle(getStyleRef.current(feature));
        target.getElement()?.setAttribute("fill", `url(#${gradientId(name)})`);
      },
    });
  }, [selectedFeatureName]);

  return (
    <section className="pasig-budget-map" aria-labelledby="pasig-budget-map-title">
      <header className="pasig-budget-map__header">
        <div>
          <h2 id="pasig-budget-map-title">Budget by Barangay</h2>
          <p>{fiscalPeriodLabel} · {selectedDistrict === "all" ? "All districts" : selectedDistrict}{selectedBarangay !== "all" ? ` · ${selectedBarangay}` : ""} · Budget values follow current Budget Monitoring filters.</p>
        </div>
        <a
          className="pasig-budget-map__period"
          href="https://www.google.com/maps/search/?api=1&query=Pasig%20City%20boundaries%2C%20Philippines"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View Pasig City boundaries on Google Maps (opens in a new tab)"
        >
          <MapPin size={15} aria-hidden="true" /> Pasig City
        </a>
      </header>

      <div className="pasig-budget-map__summary" aria-live="polite">
        <div><span>Approved budget</span><strong>{formatPesoAmount(totals.approved)}</strong></div>
        <div><span>Released</span><strong>{formatPesoAmount(totals.released)}</strong></div>
        <div><span>Liquidated</span><strong>{formatPesoAmount(totals.liquidated)}</strong></div>
        <div><span>Organizations</span><strong>{totals.organizations.size}</strong></div>
      </div>

      <div className="pasig-budget-map__content">
        <aside className="pasig-budget-map__browse" aria-label="Browse by barangay">
          <h3>Browse by Barangay</h3>
          <ul className="pasig-budget-map__barangay-list">{barangayData.map((entry) => (
            <li key={entry.name}><button type="button" aria-pressed={selectedName === entry.name} onClick={() => setSelectedName((current) => current === entry.name ? "" : entry.name)}><span>{entry.name}<small>{entry.district}</small></span><strong>{formatPesoAmount(entry.approvedAmount)}</strong>{selectedName === entry.name ? <Check size={14} aria-label="Selected" /> : null}</button></li>
          ))}</ul>
        </aside>
        <div className="pasig-budget-map__canvas" aria-label="Interactive Pasig barangay budget map">
          <button
            type="button"
            className="pasig-budget-map__transparency-toggle"
            aria-pressed={transparentSelectedFill}
            aria-label="Transparent fill for selected barangay"
            title={selectedName ? "Toggle the selected barangay's fill transparency" : "Select a barangay first"}
            disabled={!selectedName}
            onClick={() => setTransparentSelectedFill((current) => !current)}
          >
            <Eye size={15} aria-hidden="true" />
            Transparent fill
          </button>
          {boundaries ? (
            <MapContainer center={[14.5764, 121.0851]} zoom={11} scrollWheelZoom className="pasig-budget-map__leaflet">
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FitBarangays data={boundaries} />
              <GeoJSON
                data={boundaries as unknown as GeoJsonObject}
                style={stableStyle}
                onEachFeature={handleFeature}
              />
              <StatusGradientPaint data={barangayData} version={version} />
              <SyncBarangayStyles getStyle={stableStyle} version={`${version}-${selectedDistrict}-${transparentSelectedFill}`} focusedBarangay={selectedName} />
              {cityOutline ? <GeoJSON data={cityOutline as unknown as GeoJsonObject} style={{ color: "#d32626", weight: 4, opacity: 1, fill: false, interactive: false }} /> : null}
            </MapContainer>
          ) : (
            <div className="pasig-budget-map__map-state" role={loadError ? "alert" : "status"}>
              {loadError ? <AlertTriangle size={22} aria-hidden="true" /> : <LoaderCircle className="pasig-budget-map__spinner" size={22} aria-hidden="true" />}
              <strong>{loadError ? "Barangay map unavailable" : "Loading barangay boundaries"}</strong>
              {loadError ? <><p>{loadError}</p><button type="button" onClick={() => void loadBoundaries()}><RefreshCw size={14} /> Retry map</button></> : <p>Loading Pasig City polygons…</p>}
            </div>
          )}
          <div className="pasig-budget-map__legend" aria-label="Budget status legend">
            {statuses.map((status) => <span key={status.id}><i style={{ backgroundColor: status.color }} />{status.label}</span>)}
            <span className="pasig-budget-map__boundary-key"><i />Pasig boundary</span>
          </div>
        </div>

        <aside className="pasig-budget-map__details" aria-label="Selected barangay details">
          {selectedEntry ? (
            <>
              <div className="pasig-budget-map__details-heading"><span className="pasig-budget-map__pin"><MapPin size={17} /></span><div><h3>{selectedEntry.name}</h3><p>{selectedEntry.district}</p></div></div>
              <p className="pasig-budget-map__selected-value">{formatPesoAmount(selectedEntry.approvedAmount)} <span>approved budget</span></p>
              <dl>
                <div><dt>Approved</dt><dd>{formatPesoAmount(selectedEntry.approvedBalance)}</dd></div>
                <div><dt>Released (not yet liquidated)</dt><dd>{formatPesoAmount(selectedEntry.releasedBalance)}</dd></div>
                <div><dt>Liquidated</dt><dd>{formatPesoAmount(selectedEntry.liquidatedAmount)}</dd></div>
                <div><dt>Organizations</dt><dd>{selectedEntry.organizationCount}</dd></div>
                <div><dt>Released requests</dt><dd>{selectedEntry.releasedBudgetCount}</dd></div>
              </dl>
            </>
          ) : (
            <div className="pasig-budget-map__empty-selection"><span className="pasig-budget-map__pin"><MapPin size={17} /></span><h3>Select a barangay</h3><p>Choose a shaded area on the map or from the barangay list to inspect its budget totals.</p></div>
          )}
        </aside>
      </div>

      {selectedEntry ? (
        <section className="pasig-budget-map__organizations" aria-label={`Organizations in ${selectedEntry.name}`}>
          <h3>Organizations in {selectedEntry.name}<span>{selectedOrganizations.length}</span></h3>
          {selectedOrganizations.length > 0 ? <ul>{selectedOrganizations.map((organization) => (
            <li key={organization.organizationId}><button type="button" onClick={() => onViewOrganization(organization.organizationId)}><span>{organization.organizationName}<small>{organization.majorClassification}</small></span><strong>{formatPesoAmount(organization.totalReleased)} released<small>{formatPesoAmount(organization.totalLiquidated)} liquidated</small></strong></button></li>
          ))}</ul> : <p>No organizations have matching budget requests for the current filters.</p>}
        </section>
      ) : null}

      <footer className="pasig-budget-map__source">Barangay shapes: <a href="https://services7.arcgis.com/poQdgvLD6DHnbpsT/ArcGIS/rest/services/Philippine_Administrative_Boundaries/FeatureServer/3" target="_blank" rel="noreferrer">public Philippine administrative boundary layer</a>. The red line traces the combined barangay boundary for visualization; confirm with Pasig City GIS for official boundary decisions.</footer>
    </section>
  );
}
