import { defineConfig, devices } from "@playwright/test";

// Runs against a staging Supabase project (see .env.local / signInAsTestUser.js)
// rather than a real backend-free mode -- "New Game" requires sign-in, so
// specs authenticate as test-only bot accounts instead of a real Google
// OAuth round trip. workers: 1 / fullyParallel: false because that staging
// project is a free-tier instance; running specs concurrently was causing
// intermittent failures (profile/auth API calls silently empty under
// concurrent load) that don't happen running one at a time.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "line",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
