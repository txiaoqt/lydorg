import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { AdminThemeProvider, ADMIN_THEME_STORAGE_KEY } from "./AdminThemeContext";

describe("AdminThemeProvider dark mode", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark", "admin-theme-active");
    document.documentElement.style.removeProperty("color-scheme");
  });

  it("sets the admin theme scope and native dark color scheme", async () => {
    localStorage.setItem(ADMIN_THEME_STORAGE_KEY, "dark");
    const { unmount } = render(<AdminThemeProvider><div>Admin</div></AdminThemeProvider>);

    await waitFor(() => {
      expect(document.body).toHaveClass("dark", "admin-theme-active");
      expect(document.documentElement).toHaveClass("dark");
      expect(document.documentElement.style.colorScheme).toBe("dark");
    });

    unmount();
    expect(document.body).not.toHaveClass("admin-theme-active");
    expect(document.documentElement.style.colorScheme).toBe("");
  });
});
