import { createFileRoute } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertCircle, Lightbulb, Loader2 } from "lucide-react";
import { convertTicket, readConversionParams } from "@/data/api";
import type { ConversionParams, ConvertTicketError } from "@/data/types";
import { ApiError } from "@/lib/api-client";
import { closeWebView } from "@/lib/webview-bridge";
import bannerConvertirHorizontal from "@/assets/banner-convertir-horizontal.png";
import bannerConvertirVertical from "@/assets/banner-convertir-vertical.jpg";

/**
 * Coreografía del momento de éxito (ms desde que se confirma):
 * el check se dibuja al centro y en MOMENT_MS sube a su lugar en la
 * pantalla de salida mientras entra el resto del contenido.
 */
const MOMENT_MS = 1500;
const SETTLE_MS = 800;
/** Curva de desaceleración estilo iOS para el recorrido del check. */
const SETTLE_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
/** Escala del check mientras está al centro (56px → ~84px). */
const HERO_SCALE = 1.5;

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  return (
    <ParamsGate>
      <ConverterApp />
    </ParamsGate>
  );
}

/* ─────────────────────────  Datos de entrada  ───────────────────────── */

const ParamsContext = createContext<ConversionParams | null>(null);

function useConversionParams(): ConversionParams {
  const ctx = useContext(ParamsContext);
  if (!ctx) {
    throw new Error("useConversionParams debe usarse dentro de <ParamsGate>");
  }
  return ctx;
}

/**
 * Lee los datos de conversión de la URL (como `conversion.php` con `$_GET`).
 * Si falta alguno, no hay nada que convertir: se muestra el aviso en vez del flujo.
 */
function ParamsGate({ children }: { children: React.ReactNode }) {
  const [params] = useState(() => readConversionParams());
  if (!params) return <MissingParamsScreen />;
  return <ParamsContext.Provider value={params}>{children}</ParamsContext.Provider>;
}

function MissingParamsScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-7 text-destructive" aria-hidden />
      </div>
      <h1 className="mt-5 text-[22px] font-semibold tracking-tight">
        No encontramos los datos de tu boleto
      </h1>
      <p className="mt-2 max-w-[300px] text-[15px] leading-relaxed text-[#4B5563]">
        Vuelve a abrir la conversión desde la app para intentarlo de nuevo.
      </p>
    </div>
  );
}

/* ─────────────────────────  Flujo  ───────────────────────── */

type View = "confirm" | "success";

function ConverterApp() {
  const params = useConversionParams();
  const { ticketNumber } = params;
  // El contrato real no incluye el nombre del estacionamiento; Detalles
  // solo muestra la fila de ubicación si llega.
  const locationName: string | undefined = undefined;
  const [view, setView] = useState<View>("confirm");
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<ConvertTicketError | null>(null);

  const handleConfirm = async () => {
    setIsConverting(true);
    try {
      await convertTicket(params);
      navigator.vibrate?.([12, 60, 18]);
      setView("success");
    } catch (err: unknown) {
      setError({
        code: err instanceof ApiError && err.code ? err.code : null,
        message:
          err instanceof ApiError && err.message
            ? err.message
            : "Algo falló de nuestro lado al convertir tu boleto.",
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="phone-frame relative flex min-h-dvh flex-col">
        {view === "confirm" && (
          <ConfirmView
            ticketNumber={ticketNumber}
            locationName={locationName}
            isConverting={isConverting}
            onConfirm={handleConfirm}
          />
        )}
        {view === "success" && (
          <SuccessView ticketNumber={ticketNumber} locationName={locationName} />
        )}
        {/* El error sube como bottom sheet sobre "Convertir"; "Reintentar"
            solo lo cierra y el usuario vuelve a intentar desde el CTA. */}
        {view === "confirm" && error && (
          <ErrorSheet error={error} onDismissed={() => setError(null)} />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────  Confirmar  ───────────────────────── */

function ConfirmView({
  ticketNumber,
  locationName,
  isConverting,
  onConfirm,
}: {
  ticketNumber: string;
  locationName?: string;
  isConverting: boolean;
  onConfirm: () => void;
}) {
  return (
    // Pantalla "tipo app": ocupa exactamente el alto visible, sin scroll.
    // El contenido arranca arriba, el banner vertical toma el espacio
    // sobrante (se ajusta a él) y el CTA queda anclado abajo.
    <div className="relative flex h-dvh flex-col overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
      {/* Bloquea la pantalla mientras se envía la conversión */}
      {isConverting && <div className="fixed inset-0 z-40" aria-hidden />}

      <div className="flex min-h-0 flex-1 flex-col px-5 pt-[max(env(safe-area-inset-top),32px)] short:pt-[max(env(safe-area-inset-top),20px)]">
        <section className="text-center">
          <h1 className="text-[28px] font-bold leading-[1.15] tracking-tight text-foreground short:text-[24px]">
            Convierte tu boleto a <KigoWord />
          </h1>
          <p className="mx-auto mt-2.5 max-w-[310px] text-[16px] leading-[1.5] text-[#4B5563] short:mt-1.5 short:text-[15px] short:leading-snug">
            Al confirmar, tu boleto físico ya no será necesario y podrás salir usando Kigo.
          </p>
        </section>

        <TicketDetail
          className="mt-6 short:mt-4"
          variant="white"
          ticketNumber={ticketNumber}
          locationName={locationName}
        />

        <ExitInstructions
          className="mt-6 flex min-h-0 flex-1 flex-col justify-center short:mt-4"
          layout="vertical"
        />
      </div>

      {/* CTA anclada abajo */}
      <div className="relative z-50 shrink-0 px-5 pt-5 pb-[max(env(safe-area-inset-bottom),24px)] short:pt-4 short:pb-[max(env(safe-area-inset-bottom),16px)]">
        <button
          onClick={onConfirm}
          disabled={isConverting}
          aria-busy={isConverting}
          className="btn-kigo flex h-[52px] w-full items-center justify-center gap-2 rounded-full px-5 text-[17px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 disabled:shadow-none"
        >
          {isConverting ? (
            <>
              <Loader2 className="size-5 animate-spin" aria-hidden />
              <span className="sr-only">Convirtiendo boleto</span>
            </>
          ) : (
            "Convertir"
          )}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────  Éxito  ───────────────────────── */

type SuccessPhase = "moment" | "settling" | "done";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Pantalla de salida con su momento de éxito integrado.
 *
 * El check es un elemento compartido (técnica FLIP): vive siempre en su
 * lugar final dentro del layout, pero arranca desplazado al centro de la
 * pantalla y escalado. Al terminar el momento se quita la transformación y
 * el check "sube" a su sitio mientras el resto del contenido aparece.
 */
function SuccessView({
  ticketNumber,
  locationName,
}: {
  ticketNumber: string;
  locationName?: string;
}) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<SuccessPhase>(() =>
    prefersReducedMotion() ? "done" : "moment",
  );
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);

  // Antes del primer paint: mide dónde queda el check y calcula cuánto
  // moverlo para que aparezca centrado (ligeramente arriba del centro).
  useLayoutEffect(() => {
    if (phase !== "moment" || !heroRef.current) return;
    window.scrollTo(0, 0);
    const rect = heroRef.current.getBoundingClientRect();
    setOffset({
      x: window.innerWidth / 2 - (rect.left + rect.width / 2),
      y: window.innerHeight * 0.42 - (rect.top + rect.height / 2),
    });
    // Solo al montar: la coreografía corre una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "moment") return;
    document.body.style.overflow = "hidden";
    const settle = setTimeout(() => setPhase("settling"), MOMENT_MS);
    const done = setTimeout(() => setPhase("done"), MOMENT_MS + SETTLE_MS);
    return () => {
      clearTimeout(settle);
      clearTimeout(done);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "done") document.body.style.overflow = "";
  }, [phase]);

  const inMoment = phase === "moment";
  const [celebrating] = useState(() => !prefersReducedMotion());

  const heroStyle: React.CSSProperties =
    inMoment && offset
      ? {
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${HERO_SCALE})`,
          transition: "none",
        }
      : inMoment
        ? { opacity: 0 }
        : { transform: "none", transition: `transform ${SETTLE_MS}ms ${SETTLE_EASE}` };

  /** Entrada escalonada del contenido de la pantalla de salida. */
  const reveal = (index: number): React.CSSProperties =>
    inMoment
      ? { opacity: 0, transform: "translateY(12px)" }
      : {
          opacity: 1,
          transform: "none",
          transition: `opacity 500ms ease-out, transform 600ms ${SETTLE_EASE}`,
          transitionDelay: phase === "settling" ? `${380 + index * 70}ms` : "0ms",
        };

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden px-5 pt-[max(env(safe-area-inset-top),16px)] short:pt-[max(env(safe-area-inset-top),12px)]">
      {/* Halo sutil detrás del check durante el momento */}
      {phase !== "done" && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-[42vh] z-0 mx-auto size-[340px] -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(0,166,62,0.12) 0%, rgba(0,166,62,0.04) 45%, rgba(254,249,248,0) 70%)",
            opacity: inMoment ? 1 : 0,
            transition: "opacity 400ms ease-out",
            animation: inMoment
              ? "success-glow 900ms cubic-bezier(0.22, 1, 0.36, 1) both"
              : undefined,
          }}
        />
      )}

      {/* Texto del momento: se desvanece cuando el check sube */}
      {phase !== "done" && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 top-[calc(42vh+68px)] z-10 flex flex-col items-center px-8 text-center"
          style={{
            opacity: inMoment ? 1 : 0,
            transform: inMoment ? "none" : "translateY(-10px)",
            transition: `opacity 260ms ease-out, transform 400ms ${SETTLE_EASE}`,
          }}
        >
          <p
            className="success-rise text-[13px] font-semibold uppercase tracking-[0.14em] text-pay-text"
            style={{ animationDelay: "650ms" }}
          >
            Cambio confirmado
          </p>
          <p
            className="success-rise mt-2 text-[22px] font-semibold tracking-tight text-foreground"
            style={{ animationDelay: "760ms" }}
          >
            Boleto convertido
          </p>
        </div>
      )}

      <section className="mt-8 flex flex-col items-center text-center short:mt-3">
        <div ref={heroRef} className="relative z-20" style={heroStyle}>
          <SuccessCheck animate={celebrating} />
        </div>
        <div style={reveal(0)} className="flex flex-col items-center">
          <p className="mt-3 text-[16px] font-semibold text-pay-text short:mt-2 short:text-[15px]">
            Cambio confirmado
          </p>
          <h1 className="mt-1 text-[26px] font-bold leading-[1.15] tracking-tight text-foreground short:text-[22px]">
            Tu boleto ahora es <KigoWord />
          </h1>
        </div>
      </section>

      {/* Espacios flexibles (mín/máx): crecen en teléfonos altos y se
          compactan en bajos, para un ritmo parejo sin amontonar arriba. */}
      <FlexGap min="min-h-7 short:min-h-4" max="max-h-12" />

      <div style={reveal(1)}>
        <ExitInstructions title="Para salir" />
      </div>

      {/* El banner ya trae aire transparente abajo, por eso este gap es menor */}
      <FlexGap min="min-h-3 short:min-h-2" max="max-h-7" />

      <div style={reveal(2)}>
        <NextVisitTip />
      </div>

      <FlexGap min="min-h-6 short:min-h-4" max="max-h-10" />

      <div style={reveal(3)}>
        <TicketDetail ticketNumber={ticketNumber} locationName={locationName} />
      </div>

      {/* El sobrante que exceda los máximos queda arriba del CTA */}
      <div className="min-h-4 flex-1" />

      {/* CTA que cierra el webview (lo maneja la app nativa) */}
      <div
        style={reveal(4)}
        className="shrink-0 pb-[max(env(safe-area-inset-bottom),24px)] short:pb-[max(env(safe-area-inset-bottom),16px)]"
      >
        <button
          onClick={() => closeWebView()}
          className="btn-success flex h-[52px] w-full items-center justify-center rounded-full px-5 text-[17px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F855A] focus-visible:ring-offset-2"
        >
          ¡Listo! Salir con Kigo
        </button>
      </div>
    </div>
  );
}

/**
 * Check de éxito dibujado a mano: disco verde suave, anillo fino que se
 * traza alrededor y la palomita que se dibuja al final. Con `animate` en
 * false se muestra ya completo.
 */
function SuccessCheck({ animate }: { animate: boolean }) {
  return (
    <div className="relative size-14">
      {animate && (
        <span
          aria-hidden
          className="success-ring absolute inset-0 rounded-full border border-pay/50"
          style={{ animationDelay: "620ms" }}
        />
      )}
      <svg viewBox="0 0 56 56" className="relative size-14" aria-hidden>
        <circle
          cx="28"
          cy="28"
          r="28"
          fill="var(--pay-soft)"
          className={animate ? "check-fill" : undefined}
        />
        <circle
          cx="28"
          cy="28"
          r="27"
          fill="none"
          stroke="var(--pay)"
          strokeOpacity="0.35"
          strokeWidth="1"
          pathLength={1}
          strokeDasharray="1"
          transform="rotate(-90 28 28)"
          className={animate ? "check-ring" : undefined}
        />
        <path
          d="M18.5 28.8 L24.8 35 L37.5 21.8"
          fill="none"
          stroke="var(--pay)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1"
          className={animate ? "check-mark" : undefined}
        />
      </svg>
    </div>
  );
}

/* ─────────────────────────  Error  ───────────────────────── */

/** Duración de la animación de entrada/salida del sheet. */
const SHEET_MS = 300;

/**
 * Bottom sheet de error sobre la pantalla de convertir. Cubre el CTA
 * "Convertir"; "Reintentar" (o tocar el fondo / Escape) lo baja sin loading
 * y devuelve al usuario a la pantalla para volver a intentarlo.
 */
function ErrorSheet({
  error,
  onDismissed,
}: {
  error: ConvertTicketError;
  onDismissed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const closingRef = useRef(false);
  const retryRef = useRef<HTMLButtonElement>(null);

  // Montado cerrado y abierto en el siguiente frame para que la transición corra.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (open) retryRef.current?.focus();
  }, [open]);

  const dismiss = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setOpen(false);
    setTimeout(onDismissed, prefersReducedMotion() ? 0 : SHEET_MS);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      {/* Fondo atenuado: tocarlo también cierra */}
      <div
        aria-hidden
        onClick={dismiss}
        className="absolute inset-0 bg-[#0F172B]/40 transition-opacity ease-out motion-reduce:transition-none"
        style={{ opacity: open ? 1 : 0, transitionDuration: `${SHEET_MS}ms` }}
      />

      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="error-sheet-title"
        aria-describedby="error-sheet-description"
        className="relative w-full max-w-[430px] rounded-t-[28px] bg-card px-5 pt-3 pb-[max(env(safe-area-inset-bottom),24px)] shadow-[0_-12px_40px_-12px_rgba(15,23,43,0.25)] transition-transform motion-reduce:transition-none"
        style={{
          transform: open ? "translateY(0)" : "translateY(100%)",
          transitionDuration: `${SHEET_MS}ms`,
          transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* Asa del sheet */}
        <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-[#E9DEDD]" />

        <div className="flex flex-col items-center pt-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="size-7 text-destructive" aria-hidden />
          </div>
          <h2
            id="error-sheet-title"
            className="mt-4 text-[22px] font-bold leading-[1.2] tracking-tight text-foreground"
          >
            No pudimos convertir tu boleto
          </h2>
          <div id="error-sheet-description" className="max-w-[320px]">
            <p className="mt-2 text-[16px] leading-relaxed text-[#4B5563]">{error.message}</p>
            {/* Aparte, para que se lea como tranquilidad y no como parte del error */}
            <p className="mt-3 text-[15px] font-medium leading-snug text-foreground">
              Tu boleto físico sigue siendo válido.
            </p>
          </div>
        </div>

        <button
          ref={retryRef}
          onClick={dismiss}
          className="btn-kigo mt-6 flex h-[52px] w-full items-center justify-center rounded-full px-5 text-[17px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Reintentar
        </button>
      </section>
    </div>
  );
}

/* ─────────────────────────  Piezas compartidas  ───────────────────────── */

/** "Kigo" resaltado en naranja dentro de títulos grandes. */
function KigoWord() {
  return <span className="text-kigo-title">Kigo</span>;
}

/** Tarjeta con el tótem y los pasos para salir usando la app. */
const EXIT_STEPS_ALT =
  "Paso 1: ve a la pluma de salida. Paso 2: escanea el QR del tótem con tu app Kigo.";

function ExitInstructions({
  className = "",
  title = "Cómo salir",
  layout = "horizontal",
}: {
  className?: string;
  title?: string;
  /**
   * `vertical`: banner casi cuadrado con los pasos arriba y el tótem abajo
   * (pantalla de convertir). `horizontal`: banner compacto (pantalla de salida).
   */
  layout?: "horizontal" | "vertical";
}) {
  return (
    <section aria-labelledby="exit-instructions-title" className={className}>
      {layout === "vertical" ? (
        // Título a todo el ancho (como en la pantalla de salida); solo el
        // banner va centrado al 86%, con sombra suave y filo blanco.
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <SectionTitle id="exit-instructions-title">{title}</SectionTitle>
          {/* El contenedor pide el alto de la imagen (aspect-ratio) pero puede
              encogerse (min-h-0) cuando no cabe. La imagen conserva su
              proporción con max-w/max-h, así el redondeo cae en sus esquinas
              reales y tapa las transparentes del archivo. */}
          <div className="relative mx-auto aspect-[1080/1135] min-h-0 w-[86%] shrink">
            <img
              src={bannerConvertirVertical}
              alt={EXIT_STEPS_ALT}
              width={1080}
              height={1135}
              className="absolute inset-x-0 top-0 mx-auto block max-h-full max-w-full select-none rounded-[26px] object-cover shadow-[0_18px_40px_-18px_rgba(15,23,43,0.35),0_2px_6px_-2px_rgba(15,23,43,0.10),0_0_0_1px_rgba(255,255,255,0.7)]"
              draggable={false}
            />
          </div>
        </div>
      ) : (
        <>
          <SectionTitle id="exit-instructions-title">{title}</SectionTitle>
          {/* El PNG trae una tarjeta blanca (píldora) que empieza a ~30px del
              borde del archivo, más el tótem a la derecha. Se corre ~10px (y se
              ensancha lo mismo) para que el borde de esa tarjeta alinee con el
              de las demás tarjetas de la pantalla. */}
          <img
            src={bannerConvertirHorizontal}
            alt={EXIT_STEPS_ALT}
            width={1080}
            height={400}
            className="-ml-[10px] block h-auto w-[calc(100%+10px)] max-w-none select-none"
            draggable={false}
          />
        </>
      )}
    </section>
  );
}

/**
 * Separación flexible entre secciones: crece con el espacio disponible
 * hasta `max` y nunca baja de `min` (clases de Tailwind).
 */
function FlexGap({ min, max }: { min: string; max: string }) {
  return <div aria-hidden className={`flex-1 shrink-0 ${min} ${max}`} />;
}

/** Título de sección fuera de la tarjeta (ej. "Cómo salir", "Detalles"). */
function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="mb-2.5 px-1 text-[14px] font-medium uppercase tracking-[0.06em] text-[#4B5563] short:mb-1.5"
    >
      {children}
    </h2>
  );
}

/**
 * Recordatorio para la próxima visita. Replica en código el diseño de
 * `banner-recordatorio` (borde naranja suave, foco en círculo y arcos
 * decorativos) para que el texto sea real: legible a 15/14px, escalable
 * con el zoom del usuario y leído por lectores de pantalla.
 */
function NextVisitTip({ className = "" }: { className?: string }) {
  return (
    <section
      aria-label="Recordatorio para tu próxima visita"
      className={`relative flex items-center gap-3.5 overflow-hidden rounded-[28px] border-[1.5px] border-[#FECCA2] bg-[#FFFBF8] py-3.5 pr-10 pl-3.5 short:py-3 ${className}`}
    >
      {/* Arcos decorativos (esquina inferior derecha), como en el banner */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -bottom-12 size-28 rounded-full bg-[#FFE9D6]/70"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -bottom-16 size-24 rounded-full bg-[#FFDDC2]/60"
      />
      <span
        aria-hidden
        className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-kigo-soft"
      >
        <Lightbulb className="size-[22px] text-kigo-title" strokeWidth={2.2} />
      </span>
      <div className="relative min-w-0">
        <p className="text-[15px] font-semibold leading-snug text-foreground">
          En tu próxima visita, no tomes boleto
        </p>
        <p className="mt-0.5 text-[14px] leading-snug text-[#4B5563]">
          Escanea el QR con tu app Kigo al entrar y al salir.
        </p>
      </div>
    </section>
  );
}

function TicketDetail({
  ticketNumber,
  locationName,
  variant = "gray",
  className = "",
}: {
  ticketNumber: string;
  locationName?: string;
  /** `white`: tarjeta blanca con borde (pantalla de confirmar). */
  variant?: "gray" | "white";
  className?: string;
}) {
  const surface =
    variant === "white" ? "border border-border bg-card" : "border border-[#E7E5E4] bg-[#F5F5F4]";
  const divider = variant === "white" ? "bg-border" : "bg-[#E5E5E4]";

  return (
    <section aria-labelledby="ticket-detail-title" className={className}>
      <SectionTitle id="ticket-detail-title">Detalles</SectionTitle>
      <div className={`overflow-hidden rounded-2xl ${surface}`}>
        {locationName && (
          <>
            <div className="flex items-center justify-between gap-4 px-5 py-4 short:py-3">
              <span className="text-[15px] short:text-[14px] text-[#4B5563]">Ubicación</span>
              <span className="text-right text-[15px] short:text-[14px] font-medium text-foreground">
                {locationName}
              </span>
            </div>
            <div className={`mx-5 h-px ${divider}`} />
          </>
        )}
        <div className="flex items-center justify-between gap-4 px-5 py-4 short:py-3">
          <span className="text-[15px] short:text-[14px] text-[#4B5563]">Boleto físico</span>
          <span className="font-mono text-[15px] short:text-[14px] font-medium tracking-wide text-foreground">
            {ticketNumber}
          </span>
        </div>
      </div>
    </section>
  );
}
