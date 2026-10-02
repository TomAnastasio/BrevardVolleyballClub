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
});
