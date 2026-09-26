/**
 * Configuración centralizada de la aplicación.
 * Lee variables de entorno (Vite expone las que tienen prefijo VITE_).
 * En mock mode, usa valores por defecto para prototipar sin backend.
 */

export const config = {
  env: import.meta.env.VITE_APP_ENV ?? "development",
  isMockMode: import.meta.env.VITE_ENABLE_MOCK_MODE === "true",

  api: {
    /**
     * Servicio real de conversión (ver `singlecheck/conversion.php`). En
     * desarrollo puede apuntar a `/api/CAME/conversion.py` para pasar por
     * el proxy de Vite y evitar CORS (ver `vite.config.ts`).
     */
    conversionUrl:
      import.meta.env.VITE_CONVERSION_URL ?? "https://guest.geosek.info/api/CAME/conversion.py",
    timeout: Number(import.meta.env.VITE_API_TIMEOUT ?? 15000),
  },
} as const;

export type AppConfig = typeof config;
