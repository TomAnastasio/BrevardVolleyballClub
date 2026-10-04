import { defineConfig, devices } from "@playwright/test";

// Deliberately scoped to the one flow that needs zero backend/auth: the
// core free scoreboard (landing -> new casual game -> score -> save). Signed
// -in/ranked/admin flows need a real Google OAuth round trip and aren't
// covered here — see TODO.md for why that's out of scope for now.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
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
