export type BarangayOption = { id: string; name: string };
export type PasigDistrict = "District I" | "District II";

export const pasigDistrictBarangays: Record<PasigDistrict, BarangayOption[]> = {
  "District I": [
    { id: "barangay-bagong-ilog", name: "Bagong Ilog" },
    { id: "barangay-bagong-katipunan", name: "Bagong Katipunan" },
    { id: "barangay-bambang", name: "Bambang" },
    { id: "barangay-buting", name: "Buting" },
    { id: "barangay-caniogan", name: "Caniogan" },
    { id: "barangay-kalawaan", name: "Kalawaan" },
    { id: "barangay-kapasigan", name: "Kapasigan" },
    { id: "barangay-kapitolyo", name: "Kapitolyo" },
    { id: "barangay-malinao", name: "Malinao" },
    { id: "barangay-oranbo", name: "Oranbo" },
    { id: "barangay-palatiw", name: "Palatiw" },
    { id: "barangay-pineda", name: "Pineda" },
    { id: "barangay-sagad", name: "Sagad" },
    { id: "barangay-san-antonio", name: "San Antonio" },
    { id: "barangay-san-joaquin", name: "San Joaquin" },
    { id: "barangay-san-jose", name: "San Jose" },
    { id: "barangay-san-nicolas", name: "San Nicolas" },
    { id: "barangay-sta-cruz", name: "Sta. Cruz" },
    { id: "barangay-sta-rosa", name: "Sta. Rosa" },
    { id: "barangay-sto-tomas", name: "Sto. Tomas" },
    { id: "barangay-sumilang", name: "Sumilang" },
    { id: "barangay-ugong", name: "Ugong" },
  ],
  "District II": [
    { id: "barangay-dela-paz", name: "Dela Paz" },
    { id: "barangay-manggahan", name: "Manggahan" },
    { id: "barangay-maybunga", name: "Maybunga" },
    { id: "barangay-pinagbuhatan", name: "Pinagbuhatan" },
    { id: "barangay-rosario", name: "Rosario" },
    { id: "barangay-san-miguel", name: "San Miguel" },
    { id: "barangay-sta-lucia", name: "Sta. Lucia" },
    { id: "barangay-santolan", name: "Santolan" },
  ],
};

export const pasigDistrictOptions: PasigDistrict[] = ["District I", "District II"];

export const getBarangayOptionsForDistrict = (
  district: "all" | PasigDistrict,
): BarangayOption[] => {
  if (district === "District I" || district === "District II") {
    return [...pasigDistrictBarangays[district]].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }
  return Object.values(pasigDistrictBarangays)
    .flat()
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const isBarangayInDistrict = (
  barangayName: string,
  district: "all" | PasigDistrict,
): boolean => {
  if (!barangayName || barangayName === "all" || barangayName.toLowerCase() === "all barangays") {
    return true;
  }
  if (district === "all") {
    return true;
  }
  if (district !== "District I" && district !== "District II") {
    return false;
  }

  const districtList = pasigDistrictBarangays[district];
  if (!districtList) return false;

  const normalized = barangayName.trim().toLowerCase();
  return districtList.some(
    (b) =>
      b.name.toLowerCase() === normalized ||
      b.id.toLowerCase() === normalized,
  );
};

export const CANONICAL_PASIG_BARANGAYS: { ordinal: string; name: string }[] = [
  { ordinal: "01", name: "Bagong Ilog" },
  { ordinal: "02", name: "Bagong Katipunan" },
  { ordinal: "03", name: "Bambang" },
  { ordinal: "04", name: "Buting" },
  { ordinal: "05", name: "Caniogan" },
  { ordinal: "06", name: "Dela Paz" },
  { ordinal: "07", name: "Kalawaan" },
  { ordinal: "08", name: "Kapasigan" },
  { ordinal: "09", name: "Kapitolyo" },
  { ordinal: "10", name: "Malinao" },
  { ordinal: "11", name: "Manggahan" },
  { ordinal: "12", name: "Maybunga" },
  { ordinal: "13", name: "Oranbo" },
  { ordinal: "14", name: "Palatiw" },
  { ordinal: "15", name: "Pinagbuhatan" },
  { ordinal: "16", name: "Pineda" },
  { ordinal: "17", name: "Rosario" },
  { ordinal: "18", name: "Sagad" },
  { ordinal: "19", name: "San Antonio" },
  { ordinal: "20", name: "San Joaquin" },
  { ordinal: "21", name: "San Jose" },
  { ordinal: "22", name: "San Miguel" },
  { ordinal: "23", name: "San Nicolas" },
  { ordinal: "24", name: "Sta. Cruz" },
  { ordinal: "25", name: "Sta. Lucia" },
  { ordinal: "26", name: "Sta. Rosa" },
  { ordinal: "27", name: "Santolan" },
  { ordinal: "28", name: "Sto. Tomas" },
  { ordinal: "29", name: "Sumilang" },
  { ordinal: "30", name: "Ugong" },
];

export const normalizePasigBarangayName = (name?: string | null): string => {
  if (!name) return "";
  let clean = name.trim().toLowerCase();
  clean = clean.replace(/^(barangay|brgy\.?)\s+/i, "").trim();
  clean = clean.replace(/^santa\s+/i, "sta. ");
  clean = clean.replace(/^sta\s+/i, "sta. ");
  clean = clean.replace(/^santo\s+/i, "sto. ");
  clean = clean.replace(/^sto\s+/i, "sto. ");
  return clean;
};

export const getPasigBarangayOrdinal = (name?: string | null): string | null => {
  const normalized = normalizePasigBarangayName(name);
  if (!normalized) return null;
  const match = CANONICAL_PASIG_BARANGAYS.find(
    (b) => normalizePasigBarangayName(b.name) === normalized,
  );
  return match ? match.ordinal : null;
};
