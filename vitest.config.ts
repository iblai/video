import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: [
      // Vitest + Node ESM resolution needs the explicit extension for SDK imports.
      { find: "next/navigation", replacement: "next/navigation.js" },
    ],
  },
  test: {
    globals: true,
    setupFiles: ["./__tests__/vitest.setup.ts"],
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "e2e/**"],
    server: { deps: { inline: true } },
    coverage: {
      provider: "v8",
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "hooks/**/*.{ts,tsx}",
        "lib/**/*.{ts,tsx}",
        "providers/**/*.{ts,tsx}",
      ],
      exclude: [
        "node_modules/**",
        ".next/**",
        "dist/**",
        "build/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/__tests__/**",
        "**/__mocks__/**",
        // Next.js plumbing (covered by e2e, not unit)
        "app/**/loading.tsx",
        "app/**/error.tsx",
        "app/**/global-error.tsx",
        "app/**/not-found.tsx",
        "instrumentation.ts",
        "middleware.ts",
        // Generated UI primitives + SDK proxy directory
        "components/ui/**",
        "lib/iblai/sdk/**",
      ],
      // Coverage is layered: most lib/ modules, hooks/, and providers/ have
      // dedicated suites at 90%+; components/ and app/ pages have smoke
      // coverage that exercises the major branches. The numbers below are a
      // floor — bump them as more tests land. The aspirational target is 95%
      // across the board, gated by per-directory thresholds where realistic.
      thresholds: {
        lines: 60,
        functions: 49,
        branches: 50,
        statements: 60,
        // Files we've explicitly invested in — keep these at production
        // quality so regressions get caught immediately.
        "lib/iblai/**/*.ts": {
          lines: 75,
          functions: 70,
          branches: 60,
          statements: 75,
        },
        "lib/openai/**/*.ts": {
          lines: 90,
          functions: 100,
          branches: 80,
          statements: 90,
        },
        "providers/**/*.tsx": {
          lines: 85,
          functions: 65,
          branches: 60,
          statements: 75,
        },
      },
    },
  },
});
