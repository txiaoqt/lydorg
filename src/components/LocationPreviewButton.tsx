import { useEffect, useMemo, useRef, useState } from "react";
import L, { LatLngTuple } from "leaflet";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const defaultCenter: LatLngTuple = [14.696, 121.126];

const defaultMarker = new L.Icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const destinationMarker = L.divIcon({
  className: "",
  html: `
    <div style="position: relative; width: 26px; height: 26px;">
      <div style="width: 18px; height: 18px; border-radius: 9999px; background: #1A3F7A; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,.25); position: absolute; left: 4px; top: 0;"></div>
      <div style="width: 2px; height: 10px; background: #1A3F7A; position: absolute; left: 12px; bottom: 0;"></div>
    </div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  popupAnchor: [0, -24],
});

const userMarker = L.divIcon({
  className: "",
  html: `
    <div style="position: relative; width: 22px; height: 22px;">
      <div style="width: 14px; height: 14px; border-radius: 9999px; background: #2460A7; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,.25); position: absolute; left: 4px; top: 4px;"></div>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -10],
});

const parseCoordinates = (value: string): LatLngTuple | null => {
  const matched = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!matched) return null;
  const lat = Number(matched[1]);
  const lng = Number(matched[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lat, lng];
};

type GeocodeResult = {
  point: LatLngTuple;
  label: string;
};

const geocodeSearch = async (query: string): Promise<GeocodeResult | null> => {
  const direct = parseCoordinates(query);
  if (direct) return { point: direct, label: `${direct[0].toFixed(6)}, ${direct[1].toFixed(6)}` };

  const params = new URLSearchParams({
    q: query,
    format: "json",
    addressdetails: "1",
    limit: "1",
    countrycodes: "ph",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!response.ok) return null;
  const payload = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  const first = payload[0];
  if (!first) return null;

  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { point: [lat, lng], label: first.display_name };
};

const geocodeLocation = async (location: string): Promise<LatLngTuple | null> => {
  const result = await geocodeSearch(location);
  return result?.point ?? null;
};

const reverseGeocode = async (point: LatLngTuple): Promise<string | null> => {
  const params = new URLSearchParams({
    lat: String(point[0]),
    lon: String(point[1]),
    format: "json",
    zoom: "18",
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
  if (!response.ok) return null;
  const payload = (await response.json()) as { display_name?: string };
  return payload.display_name ?? null;
};

const haversineKm = (a: LatLngTuple, b: LatLngTuple) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const aa = sinLat * sinLat + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return 6371 * c;
};

const getRoute = async (origin: LatLngTuple, destination: LatLngTuple) => {
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`,
  );
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    routes?: Array<{
      distance: number;
      duration: number;
      geometry: { coordinates: number[][] };
    }>;
  };
  const firstRoute = payload.routes?.[0];
  if (!firstRoute) return null;

  const points = firstRoute.geometry.coordinates
    .filter((pair) => Array.isArray(pair) && pair.length >= 2)
    .map((pair) => [pair[1], pair[0]] as LatLngTuple);

  return {
    points,
    distanceKm: firstRoute.distance / 1000,
    durationMinutes: firstRoute.duration / 60,
  };
};

const MapViewportController = ({
  destination,
  origin,
  routePoints,
}: {
  destination: LatLngTuple;
  origin: LatLngTuple | null;
  routePoints: LatLngTuple[];
}) => {
  const map = useMap();

  useEffect(() => {
    const applyView = () => {
      map.invalidateSize();

      if (origin) {
        const boundsPoints = routePoints.length > 1 ? routePoints : [origin, destination];
        map.fitBounds(boundsPoints, { padding: [48, 48], maxZoom: 15 });
        return;
      }

      map.setView(destination, 15);
    };

    applyView();
    const t1 = window.setTimeout(applyView, 120);
    const t2 = window.setTimeout(applyView, 420);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [destination, map, origin, routePoints]);

  return null;
};

const DraggableOriginMarker = ({
  position,
  onDragEnd,
}: {
  position: LatLngTuple;
  onDragEnd: (value: LatLngTuple) => void;
}) => {
  const markerRef = useRef<L.Marker | null>(null);
  const eventHandlers = useMemo(
    () => ({
      dragend: () => {
        const marker = markerRef.current;
        if (!marker) return;
        const latLng = marker.getLatLng();
        onDragEnd([latLng.lat, latLng.lng]);
      },
    }),
    [onDragEnd],
  );

  return (
    <Marker ref={markerRef} position={position} icon={userMarker ?? defaultMarker} draggable eventHandlers={eventHandlers}>
      <Popup>Drag to set your exact starting location.</Popup>
    </Marker>
  );
};

interface LocationPreviewButtonProps {
  location: string;
  locationLatitude?: number;
  locationLongitude?: number;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
}

export default function LocationPreviewButton({
  location,
  locationLatitude,
  locationLongitude,
  className,
  iconClassName,
  labelClassName,
}: LocationPreviewButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isOriginSearching, setIsOriginSearching] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [destination, setDestination] = useState<LatLngTuple | null>(null);
  const [origin, setOrigin] = useState<LatLngTuple | null>(null);
  const [originQuery, setOriginQuery] = useState("");
  const [originResolvedAddress, setOriginResolvedAddress] = useState("");
  const [originHint, setOriginHint] = useState("Type your starting location or drag the blue pin.");
  const [originLatInput, setOriginLatInput] = useState("");
  const [originLngInput, setOriginLngInput] = useState("");
  const [hasManualOrigin, setHasManualOrigin] = useState(false);
  const [routePoints, setRoutePoints] = useState<LatLngTuple[]>([]);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  const [routeError, setRouteError] = useState<string>("");
  const { toast } = useToast();

  const directDistance = useMemo(() => {
    if (!origin || !destination || !hasManualOrigin) return null;
    return haversineKm(origin, destination);
  }, [destination, hasManualOrigin, origin]);

  const mapCenter = useMemo<LatLngTuple>(() => {
    if (destination && origin && hasManualOrigin) {
      return [(origin[0] + destination[0]) / 2, (origin[1] + destination[1]) / 2];
    }
    if (destination) return destination;
    if (origin) return origin;
    return defaultCenter;
  }, [destination, hasManualOrigin, origin]);

  const directionUrl = useMemo(() => {
    if (!destination || !origin || !hasManualOrigin) return "";
    return `https://www.google.com/maps/dir/?api=1&origin=${origin[0]},${origin[1]}&destination=${destination[0]},${destination[1]}&travelmode=driving`;
  }, [destination, hasManualOrigin, origin]);

  const refreshRoute = async (originPoint: LatLngTuple, destinationPoint: LatLngTuple) => {
    setIsRouting(true);
    setRouteError("");

    try {
      const route = await getRoute(originPoint, destinationPoint);
      if (route && route.points.length > 1) {
        setRoutePoints(route.points);
        setRouteDistance(route.distanceKm);
        setRouteDuration(route.durationMinutes);
      } else {
        setRoutePoints([originPoint, destinationPoint]);
        setRouteDistance(null);
        setRouteDuration(null);
        setRouteError("Route service unavailable. Showing direct line distance.");
      }
    } catch {
      setRoutePoints([originPoint, destinationPoint]);
      setRouteDistance(null);
      setRouteDuration(null);
      setRouteError("Route service unavailable. Showing direct line distance.");
    } finally {
      setIsRouting(false);
    }
  };

  const applyOriginPoint = (
    point: LatLngTuple,
    options?: {
      markManual?: boolean;
      autoRoute?: boolean;
      hint?: string;
      resolvedAddress?: string;
      resolveAddress?: boolean;
    },
  ) => {
    const markManual = options?.markManual ?? true;
    const autoRoute = options?.autoRoute ?? true;

    setOrigin(point);
    setOriginLatInput(point[0].toFixed(6));
    setOriginLngInput(point[1].toFixed(6));

    if (options?.resolvedAddress) {
      setOriginResolvedAddress(options.resolvedAddress);
    }
    if (options?.hint) {
      setOriginHint(options.hint);
    }

    if (markManual) {
      setHasManualOrigin(true);
    }

    if (markManual && autoRoute && destination) {
      void refreshRoute(point, destination);
    }

    if (options?.resolveAddress) {
      void (async () => {
        const label = await reverseGeocode(point);
        if (label) {
          setOriginResolvedAddress(label);
          setOriginHint("Starting point updated. Route recalculated.");
        } else {
          setOriginHint("Starting point updated. Could not resolve address text.");
        }
      })();
    }
  };

  useEffect(() => {
    if (!isOpen || !destination) return;
    const value = originQuery.trim();
    if (!value || value.length < 3) return;

    const timer = window.setTimeout(async () => {
      setIsOriginSearching(true);
      const result = await geocodeSearch(value);
      setIsOriginSearching(false);

      if (!result) {
        setOriginHint("No location match yet. Continue typing or drag the pin.");
        return;
      }

      applyOriginPoint(result.point, {
        markManual: true,
        autoRoute: true,
        hint: "Starting point updated from typed location.",
        resolvedAddress: result.label,
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [destination, isOpen, originQuery]);

  const applyTypedCoordinates = () => {
    const lat = Number(originLatInput);
    const lng = Number(originLngInput);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setOriginHint("Coordinates are invalid. Latitude must be -90..90 and longitude -180..180.");
      return;
    }

    applyOriginPoint([lat, lng], {
      markManual: true,
      autoRoute: true,
      hint: "Starting point updated from coordinates.",
      resolveAddress: true,
    });
  };

  const openPreview = async () => {
    if (!location?.trim()) return;

    setIsLoading(true);
    setRouteError("");
    try {
      const hasCoordinates =
        Number.isFinite(locationLatitude) &&
        Number.isFinite(locationLongitude) &&
        Math.abs(locationLatitude ?? 0) <= 90 &&
        Math.abs(locationLongitude ?? 0) <= 180;

      const destinationPoint = hasCoordinates
        ? ([locationLatitude as number, locationLongitude as number] as LatLngTuple)
        : await geocodeLocation(location);
      if (!destinationPoint) {
        toast({
          title: "Location Not Found",
          description: "Could not resolve this location on the map. Try using a more specific location.",
        });
        return;
      }

      setDestination(destinationPoint);
      setOrigin(destinationPoint);
      setOriginQuery("");
      setOriginResolvedAddress("");
      setOriginHint("Set your starting location by typing or dragging the blue pin.");
      setOriginLatInput(destinationPoint[0].toFixed(6));
      setOriginLngInput(destinationPoint[1].toFixed(6));
      setHasManualOrigin(false);
      setRoutePoints([]);
      setRouteDistance(null);
      setRouteDuration(null);
      setIsOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not open location preview.";
      toast({ title: "Location Preview Error", description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void openPreview()}
        disabled={isLoading}
        className={cn(
          "inline-flex items-center gap-1.5 text-left hover:text-primary transition-colors disabled:opacity-70 disabled:cursor-not-allowed",
          className,
        )}
      >
        {isLoading ? <Loader2 className={cn("h-3.5 w-3.5 animate-spin", iconClassName)} /> : <MapPin className={cn("h-3.5 w-3.5", iconClassName)} />}
        <span className={cn("line-clamp-1", labelClassName)}>{location}</span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-5xl max-h-[calc(100svh-1rem)] overflow-y-auto p-4 sm:max-h-[92vh] sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Location Preview and Directions</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">{location}</DialogDescription>
        </DialogHeader>

          <div className="rounded-lg border border-border bg-muted/20 p-3 sm:p-4 space-y-3 sm:space-y-4">
            <p className="text-sm sm:text-base font-semibold">Set Your Starting Location</p>
            <div className="space-y-2">
              <Label htmlFor="origin-search">Search your location</Label>
              <div className="relative">
                <Input
                  id="origin-search"
                  value={originQuery}
                  onChange={(event) => setOriginQuery(event.target.value)}
                  placeholder="Type address, landmark, or 'lat,lng'"
                  className="pr-10 h-10 sm:h-11 text-sm sm:text-base"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {isOriginSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                </span>
              </div>
              {originResolvedAddress && <p className="text-xs text-muted-foreground">Resolved Start Address: {originResolvedAddress}</p>}
              {originHint && <p className="text-xs text-primary">{originHint}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
              <div className="space-y-2">
                <Label htmlFor="origin-lat">Start Latitude</Label>
                <Input
                  id="origin-lat"
                  value={originLatInput}
                  onChange={(event) => setOriginLatInput(event.target.value)}
                  onBlur={applyTypedCoordinates}
                  className="h-10 sm:h-11 text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origin-lng">Start Longitude</Label>
                <Input
                  id="origin-lng"
                  value={originLngInput}
                  onChange={(event) => setOriginLngInput(event.target.value)}
                  onBlur={applyTypedCoordinates}
                  className="h-10 sm:h-11 text-sm sm:text-base"
                />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="outline" className="w-full h-10 sm:h-11 text-sm sm:text-base" onClick={applyTypedCoordinates}>
                  Update Start Pin
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-lg border border-border bg-muted/30 p-2.5 sm:p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Direct Distance</p>
              <p className="text-lg sm:text-xl font-semibold">{directDistance != null ? `${directDistance.toFixed(2)} km` : "N/A"}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-2.5 sm:p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Route Distance</p>
              <p className="text-lg sm:text-xl font-semibold">{routeDistance != null ? `${routeDistance.toFixed(2)} km` : "N/A"}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-2.5 sm:p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Time</p>
              <p className="text-lg sm:text-xl font-semibold">{routeDuration != null ? `${Math.round(routeDuration)} min` : "N/A"}</p>
            </div>
          </div>

          {isRouting && (
            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Calculating route...
            </p>
          )}

          {directionUrl && (
            <a
              href={directionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <Navigation className="h-4 w-4" />
              Open turn-by-turn directions in Google Maps
            </a>
          )}

          {routeError && <p className="text-xs text-warning">{routeError}</p>}

          <div className="h-[260px] sm:h-[420px] rounded-lg border overflow-hidden">
            {destination ? (
              <MapContainer
                center={mapCenter}
                zoom={13}
                className="h-full w-full"
                key={`${destination[0]}-${destination[1]}`}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapViewportController destination={destination} origin={hasManualOrigin ? origin : null} routePoints={routePoints} />

                <Marker position={destination} icon={destinationMarker ?? defaultMarker}>
                  <Popup>Destination: {location}</Popup>
                </Marker>

                {origin && (
                  <DraggableOriginMarker
                    position={origin}
                    onDragEnd={(point) =>
                      applyOriginPoint(point, {
                        markManual: true,
                        autoRoute: true,
                        hint: "Starting point updated from map pin.",
                        resolveAddress: true,
                      })
                    }
                  />
                )}

                {hasManualOrigin && routePoints.length > 1 && <Polyline positions={routePoints} color="#2460A7" weight={4} opacity={0.8} />}
              </MapContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">Location data unavailable.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
