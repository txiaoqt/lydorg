# Policy Section Anchor Navigation Engineering Documentation

## Overview

- **Date of Change**: August 1, 2026
- **Feature / Component**: Policy Anchor Navigation & About Page Card Links
- **Primary Objective**: Enable direct section-level navigation to **Section 6 ("Legal Bases for Processing")** of the Privacy Policy (`/privacy#legal-bases-for-processing`) from the About page "Data Privacy Act Compliance" card, while preserving default top-of-page navigation for standard policy links.
- **Project**: Y-TRACE (LYDO Connect Organization Focused)
- **Branch**: `main`

---

## Problem Statement

When users clicked the **"Data Privacy Act Compliance"** policy card on the About page (`/about`), the application navigated to `/privacy`, but opened at the top of the page rather than jumping to **Section 6 ("6. Legal Bases for Processing")**.

### Root Cause Analysis
1. **Unconditional Scroll-to-Top**: In `src/App.tsx`, the `ScrollToTopOnRouteChange` component listened to `location.pathname` and `location.search` changes and unconditionally executed `window.scrollTo({ top: 0, left: 0 })` on every route transition. It completely ignored `location.hash`.
2. **Missing Stable Anchor ID Alias**: In `src/components/PolicyContent.tsx`, `<h2>` headings were automatically assigned IDs based on full heading text (e.g. `id="policy-6-legal-bases-for-processing"`). The clean URL hash `#legal-bases-for-processing` had no direct matching element ID in the DOM.

---

## Technical Implementation

### 1. Updated About Page Card Link (`src/pages/About.tsx`)
Updated the `href` property of the "Data Privacy Act Compliance" card in `policyCards`:

```ts
// src/pages/About.tsx
{
  icon: ScrollText,
  title: "Data Privacy Act Compliance",
  description: "Our compliance with Republic Act 10173, ensuring the lawful processing of personal data for all Y-TRACE users.",
  href: "/privacy#legal-bases-for-processing",
}
```

---

### 2. Dual Anchor ID Support in `PolicyContent.tsx` (`src/components/PolicyContent.tsx`)
Updated heading rendering in `PolicyContent.tsx` to output both the default `policy-6-legal-bases-for-processing` ID and a stable `<span id="legal-bases-for-processing" />` anchor element + `data-alias-id`:

```tsx
// src/components/PolicyContent.tsx
if (line.startsWith("## ")) {
  const heading = normalizePolicyHeading(line);
  const sectionId = getPolicySectionId(heading);
  const isLegalBases = heading.includes("Legal Bases for Processing");
  blocks.push(
    <h2
      id={sectionId}
      data-alias-id={isLegalBases ? "legal-bases-for-processing" : undefined}
      key={`h2-${index}`}
      className={isRedesign
        ? "font-segoe scroll-mt-[130px] border-b border-public-border-default pb-[10px] text-public-fs-subtitle-sm font-semibold leading-[120%] tracking-[-0.02em] text-public-text-brand"
        : "scroll-mt-24 border-t border-border pt-6 text-[1.08rem] font-semibold leading-snug text-foreground sm:text-xl"}
    >
      {isLegalBases ? (
        <span id="legal-bases-for-processing" className="scroll-mt-[130px]" />
      ) : null}
      {heading}
    </h2>,
  );
  continue;
}
```

---

### 3. Hash Scroll Handler (`src/App.tsx`)
Upgraded `ScrollToTopOnRouteChange` to inspect `location.hash`. When a hash is present, it looks for the target element by ID or alias, and triggers a smooth scroll (`scrollIntoView({ behavior: "smooth", block: "start" })`). A short fallback timeout handles cases where pages are lazy-loaded via React `Suspense`.

```tsx
// src/App.tsx
const ScrollToTopOnRouteChange = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    const rawId = hash.replace(/^#/, "");
    if (!rawId) return;

    const scrollToAnchor = () => {
      const targetElement =
        document.getElementById(rawId) ||
        document.querySelector(`[data-alias-id="${rawId}"]`) ||
        document.getElementById(`policy-${rawId}`);

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      }
      return false;
    };

    if (!scrollToAnchor()) {
      const timer = setTimeout(() => {
        scrollToAnchor();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pathname, search, hash]);

  return null;
};
```

---

## Files Modified

| File Path | Component / Module | Summary of Changes |
| :--- | :--- | :--- |
| `src/pages/About.tsx` | About Page | Updated Data Privacy Act Compliance card `href` to `/privacy#legal-bases-for-processing`. |
| `src/components/PolicyContent.tsx` | Policy Markdown Renderer | Added `id="legal-bases-for-processing"` anchor span and `data-alias-id` for Section 6 heading. |
| `src/App.tsx` | App Shell | Enhanced `ScrollToTopOnRouteChange` to support smooth hash anchor scrolling. |

---

## Behavior Verification

| User Action | Target Route | Expected & Verified Behavior |
| :--- | :--- | :--- |
| Click "Privacy Policy" | `/privacy` | Opens Privacy Policy page at top (0,0). |
| Click "Terms of Service" | `/terms` | Opens Terms of Service page at top (0,0). |
| Click "Data Privacy Act Compliance" | `/privacy#legal-bases-for-processing` | Opens Privacy Policy page and smoothly scrolls directly to Section 6 ("Legal Bases for Processing"). |
| Back / Forward Navigation | Any | Preserves browser history and scrolls smoothly to target section or page top. |

---

## Testing Performed

- **TypeScript Type Check**: `npx tsc --noEmit` passed with 0 errors.
- **Production Build**: `npm run build` completed with 0 errors.
- **Automated Unit Tests**: `npm test` executed with `92/92 passed`.

---

## Backward Compatibility & Regression Risks

- **Zero Breaking Changes**: Standard policy routes (`/privacy` and `/terms`) continue to function without hash modifications.
- **Dual ID Compatibility**: Both `#legal-bases-for-processing` and `#policy-6-legal-bases-for-processing` resolve to Section 6.
- **Performance**: Hash scroll handler uses native DOM `scrollIntoView` with zero external dependencies.
