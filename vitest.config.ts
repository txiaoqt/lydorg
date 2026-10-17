import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // Keep tests detached from the repository's deployment .env. The explicit
  // defines below also win if a developer has production VITE_* variables set
  // in their shell or machine environment.
  envDir: path.resolve(__dirname, "./src/test/env"),
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://vitest.invalid"),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify("vitest-placeholder-not-a-key"),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
