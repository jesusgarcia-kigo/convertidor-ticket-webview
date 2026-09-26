import kigoLogoPng from "@/assets/kigo-logo.png";

const LOGO_ASPECT = "1081 / 709";

/**
 * Kigo logo orange — for light backgrounds.
 * The source PNG is white, so it's used as a mask and painted with the
 * Kigo brand orange (`--kigo`, #FF6900).
 */
export function KigoLogo({ className = "h-8" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Kigo"
      className={`inline-block select-none ${className}`}
      style={{
        aspectRatio: LOGO_ASPECT,
        backgroundColor: "var(--kigo)",
        WebkitMaskImage: `url("${kigoLogoPng}")`,
        maskImage: `url("${kigoLogoPng}")`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

/**
 * Kigo logo white — for dark or orange backgrounds.
 * The source PNG is white, displayed as-is.
 */
export function KigoLogoWhite({ className = "h-8" }: { className?: string }) {
  return (
    <img
      src={kigoLogoPng}
      alt="Kigo"
      className={`w-auto select-none ${className}`}
      draggable={false}
    />
  );
}
