import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

const root = path.resolve(__dirname, "..");
// Per-developer credentials live in e2e/.env.development (gitignored);
// load that first so PLAYWRIGHT_USERNAME / PLAYWRIGHT_PASSWORD are
// available to auth.setup.ts.
dotenv.config({ path: path.join(__dirname, ".env.development") });
dotenv.config({ path: path.join(root, ".env.local"), override: true });
dotenv.config({ path: path.join(root, ".env") });

// Honour Next's basePath so spec files can use bare paths.
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const basePath = rawBasePath
  ? rawBasePath.startsWith("/")
    ? rawBasePath
    : `/${rawBasePath}`
  : "";

// Use a dedicated port so we don't collide with a running `pnpm dev`.
const E2E_PORT = process.env.E2E_PORT || "3100";
const origin = process.env.E2E_BASE_URL || `http://localhost:${E2E_PORT}`;

const STORAGE_STATE = path.resolve(
  __dirname,
  "playwright",
  ".auth",
  "user.json",
);

export default defineConfig({
  testDir: ".",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 1 local retry to absorb the occasional SDK-triggered logout-redirect
  // that races page mount on slower iblai backend round-trips.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 4,
  timeout: 60_000,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: `${origin}${basePath}`,
    headless: true,
    trace: "retain-on-failure",
    screenshot: process.env.CI ? "only-on-failure" : "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testDir: "./journeys",
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE,
      },
      dependencies: ["setup"],
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm dev -p ${E2E_PORT}`,
        url: `http://localhost:${E2E_PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
