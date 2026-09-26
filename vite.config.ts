import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    port: 8080,
    allowedHosts: true,
    // Proxy de desarrollo hacia el servicio real de conversión (el mismo
    // que llama `singlecheck/conversion.php`). El legado lo llama desde el
    // servidor; desde el navegador podría bloquearlo CORS, así que en dev
    // usa VITE_CONVERSION_URL=/api/CAME/conversion.py para pasar por aquí.
    // También sirve al probar desde el celular vía túnel (Tunnelmole/ngrok).
    proxy: {
      "/api/CAME": {
        target: "https://guest.geosek.info",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
