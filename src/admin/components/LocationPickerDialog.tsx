import { useEffect, useMemo, useRef, useState } from "react";
import L, { LatLngTuple } from "leaflet";
import { Loader2, MapPin } from "lucide-react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const defaultCenter: LatLngTuple = [14.696, 121.126];

const pinIcon = new L.Icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const parseCoordinates = (value: string): LatLngTuple | null => {
  const matched = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!matched) return null;
  const lat = Number(matched[1]);
  const lng = Number(matched[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lat, lng];
};

const geocodeSearch = async (query: string): Promise<{ point: LatLngTuple; label: string } | null> => {
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

const MapRecenter = ({ position }: { position: LatLngTuple }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(position, Math.max(map.getZoom(), 15));
  }, [map, position]);
  return null;
};

const DraggablePin = ({ position, onDragEnd }: { position: LatLngTuple; onDragEnd: (value: LatLngTuple) => void }) => {
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
    <Marker ref={markerRef} position={position} icon={pinIcon} draggable eventHandlers={eventHandlers}>
      <Popup>Drag to adjust exact pin location.</Popup>
    </Marker>
  );
};

export type LocationPickerResult = {
  location: string;
  latitude: number;
  longitude: number;
};

interface LocationPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (value: LocationPickerResult) => void;
  initialLocation?: string;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  title?: string;
  description?: string;
}

export default function LocationPickerDialog({
  open,
  onOpenChange,
  onConfirm,
  initialLocation,
  initialLatitude,
  initialLongitude,
  title = "Pick Precise Location",
  description = "Type an address or drag the pin to set exact latitude and longitude.",
}: LocationPickerDialogProps) {
  const [query, setQuery] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [markerPosition, setMarkerPosition] = useState<LatLngTuple>(defaultCenter);
  const [latInput, setLatInput] = useState(defaultCenter[0].toFixed(6));
  const [lngInput, setLngInput] = useState(defaultCenter[1].toFixed(6));
  const [isSearching, setIsSearching] = useState(false);
  const [searchHint, setSearchHint] = useState("");
  const skipAutoSearchRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    const hasInitialCoordinates =
      Number.isFinite(initialLatitude) &&
      Number.isFinite(initialLongitude) &&
      Math.abs(initialLatitude ?? 0) <= 90 &&
      Math.abs(initialLongitude ?? 0) <= 180;

    const bootstrap = async () => {
      skipAutoSearchRef.current = true;
      if (hasInitialCoordinates) {
        const initialPoint: LatLngTuple = [initialLatitude as number, initialLongitude as number];
        setMarkerPosition(initialPoint);
        setQuery((initialLocation ?? "").trim());
        setResolvedAddress((initialLocation ?? "").trim());
        setSearchHint("");
        return;
      }

      const locationText = (initialLocation ?? "").trim();
      setQuery(locationText);
      setResolvedAddress("");
      setSearchHint(locationText ? "Searching initial location..." : "");
      if (!locationText) {
        setMarkerPosition(defaultCenter);
        return;
      }

      setIsSearching(true);
      const result = await geocodeSearch(locationText);
      setIsSearching(false);
      if (result) {
        setMarkerPosition(result.point);
        setResolvedAddress(result.label);
        setSearchHint("");
      } else {
        setMarkerPosition(defaultCenter);
        setSearchHint("Could not locate this address. You can drag the pin manually.");
      }
    };

    void bootstrap();
  }, [initialLatitude, initialLocation, initialLongitude, open]);

  useEffect(() => {
    setLatInput(markerPosition[0].toFixed(6));
    setLngInput(markerPosition[1].toFixed(6));
  }, [markerPosition]);

  useEffect(() => {
    if (!open) return;
    if (skipAutoSearchRef.current) {
      skipAutoSearchRef.current = false;
      return;
    }

    const value = query.trim();
    if (!value || value.length < 3) {
      setSearchHint("");
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      const result = await geocodeSearch(value);
      setIsSearching(false);
      if (!result) {
        setSearchHint("No location match yet. Continue typing or drag the pin manually.");
        return;
      }

      setMarkerPosition(result.point);
      setResolvedAddress(result.label);
      setSearchHint("Pin auto-adjusted from your typed location.");
    }, 500);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  const updatePositionFromPin = (point: LatLngTuple) => {
    setMarkerPosition(point);
    setSearchHint("Pin moved. Resolving nearest address...");

    void (async () => {
      const label = await reverseGeocode(point);
      if (label) {
        setResolvedAddress(label);
        setSearchHint("Pin updated. Confirm if this location is correct.");
      } else {
        setSearchHint("Pin updated. Could not resolve address text.");
      }
    })();
  };

  const applyTypedCoordinates = () => {
    const lat = Number(latInput);
    const lng = Number(lngInput);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setSearchHint("Coordinates are invalid. Latitude must be -90..90 and longitude -180..180.");
      return;
    }
    setMarkerPosition([lat, lng]);
    setSearchHint("Pin updated from coordinates.");
  };

  const confirmSelection = () => {
    const locationText =
      query.trim() || resolvedAddress.trim() || `${markerPosition[0].toFixed(6)}, ${markerPosition[1].toFixed(6)}`;

    onConfirm({
      location: locationText,
      latitude: markerPosition[0],
      longitude: markerPosition[1],
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location-search">Search Location</Label>
            <div className="relative">
              <Input
                id="location-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type address, landmark, or 'lat,lng'"
                className="pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              </span>
            </div>
            {resolvedAddress && <p className="text-xs text-muted-foreground">Resolved Address: {resolvedAddress}</p>}
            {searchHint && <p className="text-xs text-primary">{searchHint}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="location-lat">Latitude</Label>
              <Input
                id="location-lat"
                value={latInput}
                onChange={(event) => setLatInput(event.target.value)}
                onBlur={applyTypedCoordinates}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-lng">Longitude</Label>
              <Input
                id="location-lng"
                value={lngInput}
                onChange={(event) => setLngInput(event.target.value)}
                onBlur={applyTypedCoordinates}
              />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" className="w-full" onClick={applyTypedCoordinates}>
                Update Pin from Coordinates
              </Button>
            </div>
          </div>

          <div className="h-[430px] rounded-lg border overflow-hidden">
            <MapContainer center={markerPosition} zoom={15} className="h-full w-full">
              <MapRecenter position={markerPosition} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <DraggablePin position={markerPosition} onDragEnd={updatePositionFromPin} />
            </MapContainer>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={confirmSelection}>
            Confirm This Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
