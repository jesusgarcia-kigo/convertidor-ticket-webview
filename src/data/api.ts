/**
 * Kigo — Convertidor de boleto: acceso a datos.
 *
 * Réplica del contrato real de `singlecheck/conversion.php` (referencia,
 * no se modifica):
 *
 * 1. Los datos llegan como query params (`parkingLotId`, `lada`, `number`,
 *    `ticketNumber`).
 * 2. Al confirmar: `POST conversion.py` con `{ parkingLotId, lada, cell,
 *    ticket }`. Éxito solo si responde HTTP 200; cualquier otro código es
 *    error.
 *
 * Con `VITE_ENABLE_MOCK_MODE=true` no se hace ninguna llamada de red y, si
 * faltan params, se usan datos de prueba. `?mock=error` fuerza el error.
 */

import { ApiError, apiFetch } from "@/lib/api-client";
import { config } from "@/lib/config";
import type { ConversionParams, ConversionRequest } from "./types";

const MOCK_PARAMS: ConversionParams = {
  parkingLotId: "mock_parking_lot",
  lada: "52",
  number: "5500000000",
  ticketNumber: "BAP1DRQ2441",
};

function mockDelay(ms = 800): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mockScenario(): string | null {
  return new URLSearchParams(window.location.search).get("mock");
}

/**
 * Lee los datos de conversión de la URL, como `conversion.php` (`$_GET`).
 * Devuelve `null` si falta alguno (fuera de mock mode).
 */
export function readConversionParams(search = window.location.search): ConversionParams | null {
  const q = new URLSearchParams(search);
  const params: ConversionParams = {
    parkingLotId: q.get("parkingLotId")?.trim() ?? "",
    lada: q.get("lada")?.trim() ?? "",
    number: q.get("number")?.trim() ?? "",
    ticketNumber: q.get("ticketNumber")?.trim() ?? "",
  };
  const complete = Object.values(params).every(Boolean);

  if (complete) return params;
  if (config.isMockMode) {
    // En mock se completan solo los que falten, para poder probar con datos parciales.
    return {
      parkingLotId: params.parkingLotId || MOCK_PARAMS.parkingLotId,
      lada: params.lada || MOCK_PARAMS.lada,
      number: params.number || MOCK_PARAMS.number,
      ticketNumber: params.ticketNumber || MOCK_PARAMS.ticketNumber,
    };
  }
  return null;
}

/**
 * Convierte el boleto físico en digital.
 *
 * POST conversion.py — body `{ parkingLotId, lada, cell, ticket }`.
 */
export async function convertTicket(params: ConversionParams): Promise<void> {
  if (config.isMockMode) {
    await mockDelay(1600);
    if (mockScenario() === "error") {
      throw new ApiError(
        500,
        4,
        "No es posible crear un registro con tu número de teléfono en este momento.",
      );
    }
    return;
  }

  const body: ConversionRequest = {
    parkingLotId: params.parkingLotId,
    lada: params.lada,
    cell: params.number,
    ticket: params.ticketNumber,
  };

  await apiFetch<unknown>(
    config.api.conversionUrl,
    { method: "POST", body: JSON.stringify(body) },
    // Igual que el legado: solo HTTP 200 cuenta como éxito.
    (res) => res.status === 200,
  );
}
