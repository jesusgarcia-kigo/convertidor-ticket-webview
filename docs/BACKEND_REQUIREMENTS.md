# Convertidor de boleto — contrato con backend

**Fuente de verdad:** el sistema legado `singlecheck/` (en particular
`conversion.php`). Se usa solo como referencia; este rediseño replica su
contrato sin modificarlo. La carpeta está en `.gitignore` porque contiene
conexiones reales.

## 1. Entrada: query params

La app nativa abre el webview con los datos en la URL (mismos nombres que
`conversion.php`):

```
/?parkingLotId=…&lada=…&number=…&ticketNumber=…
```

| Param          | Descripción                 |
| -------------- | --------------------------- |
| `parkingLotId` | ID del estacionamiento      |
| `lada`         | Lada del celular (ej. `52`) |
| `number`       | Celular sin lada            |
| `ticketNumber` | Número del boleto físico    |

Si falta alguno, el webview muestra "No encontramos los datos de tu boleto"
(`readConversionParams` en `src/data/api.ts`). No hay intercambio de token
ni sesión: el legado tampoco lo tiene.

## 2. Conversión: `POST https://guest.geosek.info/api/CAME/conversion.py`

Body JSON (ojo: los nombres cambian respecto a los params):

```json
{ "parkingLotId": "…", "lada": "52", "cell": "5500000000", "ticket": "BAP1DRQ2441" }
```

- **HTTP 200** → éxito (pantalla "Tu boleto ahora es Kigo").
- **Cualquier otro código** → error (bottom sheet "No pudimos convertir tu
  boleto").

El legado no lee el body de la respuesta. Si el servicio manda
`{ "message": "…" }` legible, el sheet lo muestra; si no, usa un texto
genérico. **Pendiente de confirmar con backend** qué devuelve en error.

**Diferencias intencionales con el legado**

- Timeout de 15 s (`VITE_API_TIMEOUT`); el legado usa `CURLOPT_TIMEOUT => 0`
  (sin límite).
- La llamada se hace desde el navegador (el legado la hacía desde PHP).
  Si el servicio no permite CORS para el dominio del webview, en producción
  hace falta un proxy/BFF delante. En desarrollo ya hay uno en
  `vite.config.ts` (`VITE_CONVERSION_URL=/api/CAME/conversion.py`).

## 3. Cerrar el webview (app nativa)

En la pantalla de éxito, el botón **Confirmar** pide a la app contenedora que
cierre el webview (`src/lib/webview-bridge.ts`). El frontend envía el mismo
mensaje por los tres canales; la app solo necesita escuchar el suyo:

```json
{ "type": "CLOSE_WEBVIEW" }
```

| Plataforma        | Cómo se recibe                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| iOS (WKWebView)   | `WKScriptMessageHandler` registrado con el nombre `kigoWebView` (llega como objeto).                        |
| Android (WebView) | `addJavascriptInterface(obj, "KigoWebView")` con un método `@JavascriptInterface postMessage(String json)`. |
| React Native      | `onMessage` de `react-native-webview` (llega como string JSON).                                             |

Si ningún canal existe (navegador normal), el frontend intenta
`window.close()`, que el navegador solo permite en pestañas abiertas por
script.
