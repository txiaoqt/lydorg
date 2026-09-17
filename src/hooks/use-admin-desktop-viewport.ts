import { useEffect, useState } from "react";

export const ADMIN_DESKTOP_MIN_WIDTH = 1024;

/**
 * Hook to detect whether the current viewport width meets the minimum
 * required CSS viewport width for the Y-TRACE Admin Portal (>= 1024px).
 *
 * Listens for live viewport changes via resize and matchMedia events.
 * Defaults to true in non-browser/SSR environments to prevent crashes.
 */
export function useAdminDesktopViewport(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= ADMIN_DESKTOP_MIN_WIDTH;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateViewport = () => {
      setIsDesktop(window.innerWidth >= ADMIN_DESKTOP_MIN_WIDTH);
    };

    // Ensure synchronous alignment on mount
    updateViewport();

    window.addEventListener("resize", updateViewport);

    let mql: MediaQueryList | null = null;
    if (typeof window.matchMedia === "function") {
      mql = window.matchMedia(`(min-width: ${ADMIN_DESKTOP_MIN_WIDTH}px)`);
      if (mql.addEventListener) {
        mql.addEventListener("change", updateViewport);
      } else if ("addListener" in mql) {
        // @ts-expect-error fallback for legacy Safari
        mql.addListener(updateViewport);
      }
    }

    return () => {
      window.removeEventListener("resize", updateViewport);
      if (mql) {
        if (mql.removeEventListener) {
          mql.removeEventListener("change", updateViewport);
        } else if ("removeListener" in mql) {
          // @ts-expect-error fallback for legacy Safari
          mql.removeListener(updateViewport);
        }
      }
    };
  }, []);

  return isDesktop;
}

/**
 * Hook to read the live viewport width in pixels.
 * Used by the warning screen to display the exact detected CSS viewport width.
 */
export function useCurrentViewportWidth(): number {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === "undefined") return ADMIN_DESKTOP_MIN_WIDTH;
    return window.innerWidth;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return width;
}
