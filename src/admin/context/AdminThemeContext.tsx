import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AdminThemePreference = "light" | "dark" | "system";
export type AdminResolvedTheme = "light" | "dark";

export const ADMIN_THEME_STORAGE_KEY = "ytrace_admin_theme_preference";

interface AdminThemeContextType {
  theme: AdminThemePreference;
  resolvedTheme: AdminResolvedTheme;
  setTheme: (theme: AdminThemePreference) => void;
}

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined);

const getSystemTheme = (): AdminResolvedTheme => {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const getStoredPreference = (): AdminThemePreference => {
  if (typeof window === "undefined") {
    return "system";
  }
  try {
    const saved = localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
  } catch {
    // localStorage may be inaccessible in certain environments
  }
  return "system";
};

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AdminThemePreference>(getStoredPreference);
  const [systemTheme, setSystemTheme] = useState<AdminResolvedTheme>(getSystemTheme);

  // Listen to OS system color scheme changes when theme is "system"
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    setSystemTheme(mediaQuery.matches ? "dark" : "light");

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else if (mediaQuery.addListener) {
      // Compatibility fallback
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const resolvedTheme: AdminResolvedTheme = theme === "system" ? systemTheme : theme;

  // Apply or remove the .dark class on documentElement & body during the Admin lifecycle
  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const body = document.body;

    if (resolvedTheme === "dark") {
      root.classList.add("dark");
      body.classList.add("dark");
      body.classList.add("admin-theme-active");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      body.classList.remove("dark");
      body.classList.remove("admin-theme-active");
      root.style.colorScheme = "light";
    }

    // Cleanup when this AdminThemeProvider unmounts (e.g. navigating to public pages)
    return () => {
      root.classList.remove("dark");
      body.classList.remove("dark");
      body.classList.remove("admin-theme-active");
      root.style.removeProperty("color-scheme");
    };
  }, [resolvedTheme]);

  const setTheme = (newTheme: AdminThemePreference) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(ADMIN_THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <AdminThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme(): AdminThemeContextType {
  const context = useContext(AdminThemeContext);
  if (!context) {
    // Fallback safe defaults if used outside AdminThemeProvider
    const system = getSystemTheme();
    return {
      theme: "system",
      resolvedTheme: system,
      setTheme: () => {},
    };
  }
  return context;
}
