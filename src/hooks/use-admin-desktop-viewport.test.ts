import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  ADMIN_DESKTOP_MIN_WIDTH,
  useAdminDesktopViewport,
  useCurrentViewportWidth,
} from "./use-admin-desktop-viewport";

describe("useAdminDesktopViewport Hook", () => {
  const originalInnerWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;

  const setViewportWidth = (width: number) => {
    window.innerWidth = width;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: width >= ADMIN_DESKTOP_MIN_WIDTH,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  afterEach(() => {
    window.innerWidth = originalInnerWidth;
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it("exports ADMIN_DESKTOP_MIN_WIDTH = 1024", () => {
    expect(ADMIN_DESKTOP_MIN_WIDTH).toBe(1024);
  });

  it("returns true for 1280px viewport", () => {
    setViewportWidth(1280);
    const { result } = renderHook(() => useAdminDesktopViewport());
    expect(result.current).toBe(true);
  });

  it("returns true for 1024px viewport (exact threshold boundary)", () => {
    setViewportWidth(1024);
    const { result } = renderHook(() => useAdminDesktopViewport());
    expect(result.current).toBe(true);
  });

  it("returns false for 1023px viewport (just below threshold)", () => {
    setViewportWidth(1023);
    const { result } = renderHook(() => useAdminDesktopViewport());
    expect(result.current).toBe(false);
  });

  it("returns false for 768px tablet viewport", () => {
    setViewportWidth(768);
    const { result } = renderHook(() => useAdminDesktopViewport());
    expect(result.current).toBe(false);
  });

  it("returns false for 375px mobile viewport", () => {
    setViewportWidth(375);
    const { result } = renderHook(() => useAdminDesktopViewport());
    expect(result.current).toBe(false);
  });

  it("reacts dynamically when resizing from 768px to 1280px", () => {
    setViewportWidth(768);
    const { result } = renderHook(() => useAdminDesktopViewport());
    expect(result.current).toBe(false);

    act(() => {
      setViewportWidth(1280);
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe(true);
  });

  it("reacts dynamically when resizing from 1280px to 800px", () => {
    setViewportWidth(1280);
    const { result } = renderHook(() => useAdminDesktopViewport());
    expect(result.current).toBe(true);

    act(() => {
      setViewportWidth(800);
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe(false);
  });

  it("cleans up event listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    setViewportWidth(1280);
    const { unmount } = renderHook(() => useAdminDesktopViewport());

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("useCurrentViewportWidth tracks live width", () => {
    setViewportWidth(850);
    const { result } = renderHook(() => useCurrentViewportWidth());
    expect(result.current).toBe(850);

    act(() => {
      window.innerWidth = 1150;
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe(1150);
  });
});
