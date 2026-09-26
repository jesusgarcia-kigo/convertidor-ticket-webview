/**
 * API Client — fetch JSON con timeout.
 *
 * Lanza `ApiError` cuando la respuesta no cumple `isSuccess` (por defecto,
 * cualquier 2xx). A diferencia del sistema legado (`CURLOPT_TIMEOUT => 0`),
 * aquí siempre hay timeout para no dejar al usuario esperando sin fin.
 */

import { config } from "./config";

export class ApiError extends Error {
  constructor(
    public status: number,
    /** Código de aplicación si el servicio lo manda en el body; si no, 0. */
    public code: number,
    message: string,
    public raw?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  url: string,
  init?: RequestInit,
  isSuccess: (res: Response) => boolean = (res) => res.ok,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.api.timeout);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });

    const body = await res.json().catch(() => null);

    if (!isSuccess(res)) {
      // Solo se usa un mensaje del servicio si es texto legible; nunca el
      // `statusText` HTTP (viene en inglés y no le sirve al usuario).
      const message = typeof body?.message === "string" ? body.message : "";
      const code = typeof body?.code === "number" ? body.code : 0;
      throw new ApiError(res.status, code, message, body);
    }

    return body as T;
  } finally {
    clearTimeout(timeout);
  }
}
