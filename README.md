# Kigo — Convertidor de boleto (webview)

Webview móvil donde el usuario convierte su boleto físico de estacionamiento en
un boleto digital. Después sale escaneando el QR del tótem con la app Kigo.

Usa el mismo sistema visual que el flujo de pago por WhatsApp (tokens Umbral,
CTA `btn-kigo`, tarjetas de detalle y logo Kigo).

## Pantallas

| Estado    | Qué ve el usuario                                                                    |
| --------- | ------------------------------------------------------------------------------------ |
| Confirmar | Explicación del cambio, cómo salir, datos del boleto, CTA                            |
| Enviando  | CTA con spinner "Convirtiendo boleto"; la pantalla queda bloqueada                   |
| Éxito     | Check que se dibuja al centro y sube a la pantalla de salida; pasos para salir       |
| Error     | Bottom sheet sobre "Convertir": mensaje del backend + "Reintentar" (cierra el sheet) |

Todo vive en `src/routes/index.tsx`. El contrato con el backend está en
`docs/BACKEND_REQUIREMENTS.md`.

## Desarrollo

```bash
npm install
cp .env.example .env   # VITE_ENABLE_MOCK_MODE=true para trabajar sin backend
npm run dev            # http://localhost:8080
```

En mock mode abre `http://localhost:8080/?mock=error` para ver el estado de error.

| Acción  | Comando          |
| ------- | ---------------- |
| Dev     | `npm run dev`    |
| Build   | `npm run build`  |
| Lint    | `npm run lint`   |
| Formato | `npm run format` |

## Estructura

```
src/
├── routes/index.tsx        # Flujo completo (sesión, confirmar, éxito, error)
├── components/
│   ├── ExitTotem.tsx       # Ilustración SVG del tótem de salida
│   └── logos/KigoLogo.tsx  # Logo Kigo
├── data/                   # Params de entrada + llamada a conversion.py (con mock mode)
├── lib/                    # config, api-client, puente con la app nativa
└── styles.css              # Tokens Kigo (Tailwind v4)
```
