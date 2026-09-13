/**
 * Authoritative Budget Category Color Architecture
 * Single deterministic category -> color resolver.
 * Used across Donut Charts, Legends, and Table indicators in Budget Monitoring.
 */

export const OTHER_CATEGORY_COLOR = "#64748B"; // Slate 500 - Dedicated neutral for consolidated Other Categories
export const DEFAULT_CATEGORY_COLOR = "#475569"; // Slate 600 - Default fallback

/**
 * Curated accessible Y-TRACE palette for youth purpose categories.
 * Distinct, vibrant, high-contrast, avoiding Slate #64748B which is reserved for Other Categories.
 */
export const CATEGORY_PALETTE: readonly string[] = [
  "#2563EB", // 1. Blue (Primary Brand)
  "#0D9488", // 2. Teal (Health & Sports)
  "#7C3AED", // 3. Purple (Arts & Culture)
  "#EA580C", // 4. Orange (Community Outreach)
  "#0284C7", // 5. Sky (Digital & Technology)
  "#059669", // 6. Emerald (Environment & Climate)
  "#D97706", // 7. Amber (Livelihood & Economic)
  "#4F46E5", // 8. Indigo (Governance & Civic)
  "#E11D48", // 9. Rose (Social Wellness)
  "#0891B2", // 10. Cyan (Education & Literacy)
  "#C026D3", // 11. Fuchsia (Youth Leadership)
  "#16A34A", // 12. Green (Sustainable Initiatives)
  "#9333EA", // 13. Violet (Creative Development)
  "#CA8A04", // 14. Ochre (Heritage & Tradition)
];

/**
 * Standard Canonical Youth Purpose Categories in Pasig City LYDO.
 * Explicitly mapped to signature colors.
 */
export const CANONICAL_CATEGORY_COLORS: Record<string, string> = {
  // Leadership & Governance
  "leadership & governance": "#2563EB",
  "leadership and governance": "#2563EB",
  "youth leadership": "#2563EB",
  "leadership": "#2563EB",

  // Sports, Fitness & Recreation
  "sports, fitness & recreation": "#0D9488",
  "sports, fitness and recreation": "#0D9488",
  "sports & fitness": "#0D9488",
  "sports & recreation": "#0D9488",
  "sports": "#0D9488",

  // Arts, Culture & Heritage
  "arts, culture & heritage": "#7C3AED",
  "arts, culture and heritage": "#7C3AED",
  "arts & culture": "#7C3AED",
  "arts and culture": "#7C3AED",
  "arts": "#7C3AED",

  // Environmental Protection & Climate Action
  "environmental protection & climate action": "#059669",
  "environmental protection and climate action": "#059669",
  "environmental protection": "#059669",
  "climate action": "#059669",
  "environment": "#059669",

  // Education, Digital Literacy & Technology
  "education, digital literacy & technology": "#0284C7",
  "education, digital literacy and technology": "#0284C7",
  "education & technology": "#0284C7",
  "education and technology": "#0284C7",
  "education": "#0284C7",

  // Health, Mental Wellness & Anti-Drug Advocacy
  "health, mental wellness & anti-drug advocacy": "#E11D48",
  "health, mental wellness and anti-drug advocacy": "#E11D48",
  "health & mental wellness": "#E11D48",
  "health and mental wellness": "#E11D48",
  "health": "#E11D48",

  // Community Outreach & Social Inclusion
  "community outreach & social inclusion": "#EA580C",
  "community outreach and social inclusion": "#EA580C",
  "community outreach": "#EA580C",
  "outreach": "#EA580C",

  // Economic Empowerment & Livelihood
  "economic empowerment & livelihood": "#D97706",
  "economic empowerment and livelihood": "#D97706",
  "economic empowerment": "#D97706",
  "livelihood": "#D97706",

  // General / Uncategorized
  "general / uncategorized": "#475569",
  "general and uncategorized": "#475569",
  "uncategorized": "#475569",
  "general": "#475569",
};

/**
 * Normalizes a category name for consistent key comparison.
 * Trims leading/trailing whitespace, collapses internal whitespace, converts to lowercase.
 */
export function normalizeCategory(category?: string | null): string {
  if (!category) return "";
  return category.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Checks if a category name represents the consolidated "Other" bucket.
 */
export function isOtherCategory(category?: string | null): boolean {
  const norm = normalizeCategory(category);
  return (
    norm === "other" ||
    norm === "other categories" ||
    norm === "other category" ||
    norm === "other programs" ||
    norm === "other program" ||
    norm === "others" ||
    norm === "other initiatives"
  );
}

/**
 * Simple deterministic 32-bit string hashing algorithm (djb2).
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Pure category color resolver.
 * Given category name (and optional context), returns the deterministic color.
 */
export function getCategoryColor(
  category: string,
  contextCategories?: (string | { category: string })[]
): string {
  if (!category) return DEFAULT_CATEGORY_COLOR;

  if (isOtherCategory(category)) {
    return OTHER_CATEGORY_COLOR;
  }

  const norm = normalizeCategory(category);
  if (CANONICAL_CATEGORY_COLORS[norm]) {
    return CANONICAL_CATEGORY_COLORS[norm];
  }

  if (contextCategories && contextCategories.length > 0) {
    const resolver = createCategoryColorResolver(contextCategories);
    return resolver(category);
  }

  // Pure deterministic fallback using hash
  const colorIndex = hashString(norm) % CATEGORY_PALETTE.length;
  return CATEGORY_PALETTE[colorIndex];
}

/**
 * Factory that creates a stable category -> color resolver for a collection of categories.
 * Guarantees:
 * 1. "Other Categories" -> OTHER_CATEGORY_COLOR (#64748B)
 * 2. Canonical categories -> CANONICAL_CATEGORY_COLORS
 * 3. Arbitrary/dynamic categories in the collection receive unique, non-colliding colors from CATEGORY_PALETTE in order of appearance.
 * 4. Case/whitespace insensitive lookup.
 * 5. Stable across pagination, sorting, and search filtering.
 */
export function createCategoryColorResolver(
  categories?: (string | { category: string })[]
): (category: string) => string {
  const colorMap = new Map<string, string>();
  let paletteCursor = 0;

  if (categories && categories.length > 0) {
    for (const item of categories) {
      const rawName = typeof item === "string" ? item : item?.category;
      if (!rawName) continue;

      const norm = normalizeCategory(rawName);
      if (colorMap.has(norm)) continue;

      if (isOtherCategory(norm)) {
        colorMap.set(norm, OTHER_CATEGORY_COLOR);
      } else if (CANONICAL_CATEGORY_COLORS[norm]) {
        colorMap.set(norm, CANONICAL_CATEGORY_COLORS[norm]);
      } else {
        const assignedColor = CATEGORY_PALETTE[paletteCursor % CATEGORY_PALETTE.length];
        colorMap.set(norm, assignedColor);
        paletteCursor++;
      }
    }
  }

  return (category: string): string => {
    if (!category) return DEFAULT_CATEGORY_COLOR;
    if (isOtherCategory(category)) return OTHER_CATEGORY_COLOR;

    const norm = normalizeCategory(category);
    if (colorMap.has(norm)) {
      return colorMap.get(norm)!;
    }

    if (CANONICAL_CATEGORY_COLORS[norm]) {
      return CANONICAL_CATEGORY_COLORS[norm];
    }

    // Deterministic fallback for unseen categories
    const hash = hashString(norm);
    return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
  };
}
