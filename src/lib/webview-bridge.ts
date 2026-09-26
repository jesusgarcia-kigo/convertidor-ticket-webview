/**
 * Puente con la app nativa que abre este webview.
 *
 * `closeWebView()` pide a la app contenedora que cierre la vista. El mismo
 * mensaje se envía por cada canal nativo disponible; la app solo necesita
 * escuchar el suyo (ver `docs/BACKEND_REQUIREMENTS.md` §3):
 *
 * - iOS (WKWebView):  window.webkit.messageHandlers.kigoWebView.postMessage(msg)
 * - Android (JS interface "KigoWebView"):  window.KigoWebView.postMessage(json)
 * - React Native WebView:  window.ReactNativeWebView.postMessage(json)
 *
 * Si ninguno existe (navegador normal), intenta `window.close()`, que solo
 * funciona cuando la pestaña fue abierta por script.
 */

export const CLOSE_WEBVIEW_MESSAGE = { type: "CLOSE_WEBVIEW" } as const;

type BridgeWindow = Window & {
  webkit?: { messageHandlers?: { kigoWebView?: { postMessage: (msg: unknown) => void } } };
  KigoWebView?: { postMessage: (json: string) => void };
  ReactNativeWebView?: { postMessage: (json: string) => void };
};

/** @returns `true` si algún canal nativo recibió el mensaje. */
export function closeWebView(): boolean {
  const w = window as BridgeWindow;
  const json = JSON.stringify(CLOSE_WEBVIEW_MESSAGE);
  let delivered = false;

  try {
    const ios = w.webkit?.messageHandlers?.kigoWebView;
    if (ios) {
      ios.postMessage(CLOSE_WEBVIEW_MESSAGE);
      delivered = true;
    }
  } catch {
    // Canal no disponible: se intenta el siguiente.
  }

  try {
    if (w.KigoWebView) {
      w.KigoWebView.postMessage(json);
      delivered = true;
    }
  } catch {
    // Canal no disponible: se intenta el siguiente.
  }

  try {
    if (w.ReactNativeWebView) {
      w.ReactNativeWebView.postMessage(json);
      delivered = true;
    }
  } catch {
    // Canal no disponible: se intenta el siguiente.
  }

  if (!delivered) window.close();
  return delivered;
}
