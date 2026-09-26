/**
 * Kigo — Convertidor de boleto: contratos de datos.
 *
 * Fuente de verdad: el sistema legado `singlecheck/conversion.php` (solo
 * referencia, no se modifica). Ver `docs/BACKEND_REQUIREMENTS.md`.
 */

/**
 * Datos con los que la app nativa abre el webview, como query params:
 * `?parkingLotId=…&lada=…&number=…&ticketNumber=…` (mismos nombres que
 * `conversion.php`).
 */
export interface ConversionParams {
  parkingLotId: string;
  /** Lada del celular del usuario (ej. "52"). */
  lada: string;
  /** Celular del usuario, sin lada. */
  number: string;
  /** Número del boleto físico a convertir. */
  ticketNumber: string;
}

/**
 * Body de `POST conversion.py`. Ojo: los nombres del API difieren de los
 * query params (`number` → `cell`, `ticketNumber` → `ticket`).
 */
export interface ConversionRequest {
  parkingLotId: string;
  lada: string;
  cell: string;
  ticket: string;
}

/**
 * Error de conversión que se muestra al usuario. El sistema legado solo
 * distingue HTTP 200 (éxito) de cualquier otro código; `message` se usa
 * únicamente si el servicio devuelve uno legible en el body.
 */
export interface ConvertTicketError {
  code: number | null;
  message: string;
}
