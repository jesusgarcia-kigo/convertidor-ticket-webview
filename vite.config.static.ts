import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Static SPA build for GitHub Pages — bypasses TanStack Start SSR.
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  base: "/convertidor-ticket-webview/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
