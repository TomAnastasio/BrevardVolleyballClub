import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url)));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // GITHUB_SHA is set automatically by GitHub Actions (see deploy workflow)
    // and absent locally, where the fallback makes a dev build identifiable.
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_SHA__: JSON.stringify((process.env.GITHUB_SHA || "dev").slice(0, 7)),
  },
  test: {
    // Unit tests only exercise pure logic, never real Supabase calls — force
    // "unconfigured" so importing a hook module doesn't construct a real
    // client (which crashes under Node's test runner trying to set up a
    // realtime websocket connection).
    env: {
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_ANON_KEY: "",
    },
    // e2e/ holds Playwright specs, run via `npm run test:e2e`, not Vitest.
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});
