import type { CSSProperties } from "react";
import type { TratamientoImagen } from "@/config/wedding.config";

const MAX_EDGE_FADE_PX = 100;

export function getImageTreatmentStyle(treatment?: TratamientoImagen): CSSProperties {
  const overlayOpacity = Math.max(0, Math.min(100, treatment?.opacidadOverlay ?? 0));
  const edgeFadePx = Math.max(0, Math.min(MAX_EDGE_FADE_PX, treatment?.difuminadoBordePx ?? 0));

  return {
    ["--content-texture-opacity" as string]: overlayOpacity / 100,
    ...(edgeFadePx > 0
      ? {
          maskImage: `linear-gradient(to right, transparent 0, #000 ${edgeFadePx}px, #000 calc(100% - ${edgeFadePx}px), transparent 100%), linear-gradient(to bottom, transparent 0, #000 ${edgeFadePx}px, #000 calc(100% - ${edgeFadePx}px), transparent 100%)`,
          WebkitMaskImage: `linear-gradient(to right, transparent 0, #000 ${edgeFadePx}px, #000 calc(100% - ${edgeFadePx}px), transparent 100%), linear-gradient(to bottom, transparent 0, #000 ${edgeFadePx}px, #000 calc(100% - ${edgeFadePx}px), transparent 100%)`,
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }
      : {}),
  };
}