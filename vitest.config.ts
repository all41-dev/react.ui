import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/*
 * Separate from vite.config.ts on purpose: that file switches on `mode === 'lib'` and
 * carries the whole externals/rollup story for the published bundle, none of which a
 * test run needs. Tailwind is left out too — these tests assert behaviour and
 * accessibility, never computed styles.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: false,
    coverage: {
      provider: "v8",
      include: ["src/components/datagrid/**"],
      exclude: ["src/components/datagrid/**/*.test.*"],
    },
  },
});
