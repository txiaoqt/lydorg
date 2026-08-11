export type LocationSuggestion = {
  id: string;
  displayName: string;
  municipality: string;
  barangay: string;
  province: string;
  latitude: number;
  longitude: number;
};

type NominatimAddress = Partial<{
  city: string;
  municipality: string;
  town: string;
  village: string;
  suburb: string;
  hamlet: string;
  neighbourhood: string;
  quarter: string;
  county: string;
  state: string;
  province: string;
  city_district: string;
}>;

type NominatimRow = {
  place_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: NominatimAddress;
};

const pickAddressValue = (address: NominatimAddress | undefined, keys: Array<keyof NominatimAddress>) => {
  if (!address) return "";
  for (const key of keys) {
    const value = String(address[key] ?? "").trim();
    if (value) return value;
  }
  return "";
};

export const searchPhilippineLocationSuggestions = async (
  query: string,
  limit = 6,
  signal?: AbortSignal,
): Promise<LocationSuggestion[]> => {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 3) return [];

  const params = new URLSearchParams({
    q: normalizedQuery,
    format: "jsonv2",
    addressdetails: "1",
    limit: String(Math.max(1, Math.min(10, limit))),
    countrycodes: "ph",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    method: "GET",
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as NominatimRow[];
  const seen = new Set<string>();

  return payload
    .map((row) => {
      const latitude = Number(row.lat);
      const longitude = Number(row.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

      const displayName = String(row.display_name ?? "").trim();
      if (!displayName) return null;

      const municipality = pickAddressValue(row.address, ["city", "municipality", "town", "village", "county"]);
      const barangay = pickAddressValue(row.address, ["suburb", "village", "hamlet", "neighbourhood", "quarter", "city_district"]);
      const province = pickAddressValue(row.address, ["state", "province"]);

      return {
        id: String(row.place_id ?? `${latitude},${longitude}`),
        displayName,
        municipality,
        barangay,
        province,
        latitude,
        longitude,
      } satisfies LocationSuggestion;
    })
    .filter((item): item is LocationSuggestion => Boolean(item))
    .filter((item) => {
      const key = `${item.displayName.toLowerCase()}|${item.latitude}|${item.longitude}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};
