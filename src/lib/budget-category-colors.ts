import { advocacyOptions, type Advocacy } from "@/lib/lydo-connect-data";

/** Neutral color for synthetic or noncanonical values such as "Other Categories". */
export const OTHER_CATEGORY_COLOR = "#64748B";
/** Neutral fallback for legacy or invalid values; it is not a category assignment. */
export const DEFAULT_CATEGORY_COLOR = "#64748B";

/**
 * One stable color for every canonical Centers of Youth Participation value.
 * The Record type makes this mapping exhaustive when the CYP taxonomy changes.
 */
export const CANONICAL_CATEGORY_COLORS: Record<Advocacy, string> = {
  education: "#2563EB",
  environment: "#15803D",
  health: "#BE123C",
  "peace building and security": "#7C3AED",
  governance: "#4338CA",
  "active citizenship": "#A16207",
  "global mobility": "#0891B2",
  "social inclusion and equity": "#C2410C",
  "economic empowerment": "#047857",
  agriculture: "#65A30D",
};

export function normalizeCategory(category?: string | null): string {
  return category?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
}

/** Synthetic "Other" aggregates are neutral and do not represent a CYP purpose. */
export function isOtherCategory(category?: string | null): boolean {
  const normalized = normalizeCategory(category);
  return [
    "other",
    "other categories",
    "other category",
    "other programs",
    "other program",
    "others",
    "other initiatives",
  ].includes(normalized);
}

const canonicalCategorySet = new Set<string>(advocacyOptions);

export function isCanonicalPurposeCategory(category?: string | null): category is Advocacy {
  return canonicalCategorySet.has(normalizeCategory(category));
}

/** Resolve canonical categories only; unknown and legacy values stay neutral. */
export function getCategoryColor(category?: string | null): string {
  const normalized = normalizeCategory(category);
  if (isOtherCategory(normalized)) return OTHER_CATEGORY_COLOR;
  if (!canonicalCategorySet.has(normalized)) return DEFAULT_CATEGORY_COLOR;
  return CANONICAL_CATEGORY_COLORS[normalized as Advocacy];
}

/**
 * Kept as a compatibility wrapper for existing callers. The input collection is
 * intentionally ignored so filtering, sorting, and pagination cannot affect colors.
 */
export function createCategoryColorResolver(
  _categories?: (string | { category: string })[],
): (category: string) => string {
  return getCategoryColor;
}
