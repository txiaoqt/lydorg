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
