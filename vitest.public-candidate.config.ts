import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const tempRoot = process.env.TEMP ?? process.env.TMP ?? root;

export default defineConfig({
  root,
  plugins: [react()],
  cacheDir: path.join(tempRoot, "ytrace-public-candidate-vite-cache-20261028"),
  envDir: path.resolve(root, "./src/test/env"),
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://vitest.invalid"),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify("vitest-placeholder-not-a-key"),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.join(root, "src/test/setup.ts")],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(root, "./src") },
  },
});
