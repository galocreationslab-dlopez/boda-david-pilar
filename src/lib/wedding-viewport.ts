import type { CSSProperties } from "react";
import type { WeddingConfig } from "@/config/wedding.config";

export const DESKTOP_BREAKPOINT = 768;
type Design = WeddingConfig["diseno"];

export function normalizePageMargins(value: NonNullable<Design>["margenesPc"]) {
  const px = (n: number | undefined) => Number.isFinite(n) ? Math.max(0, Number(n)) : 0;
  return { izquierdo: px(value?.izquierdo), derecho: px(value?.derecho) };
}

export function getUsefulViewport(width: number, margins: ReturnType<typeof normalizePageMargins>, desktop: boolean) {
  const available = Math.max(0, width);
  const largest = Math.max(margins.izquierdo, margins.derecho);
  const totalRatio = largest > 0 ? margins.izquierdo / largest + margins.derecho / largest : 0;
  const budget = Math.max(0, available - 1);
  const shrink = largest > 0 && largest > budget / totalRatio;
  const left = !desktop ? 0 : shrink ? budget * (margins.izquierdo / largest) / totalRatio : margins.izquierdo;
  const right = !desktop ? 0 : shrink ? budget * (margins.derecho / largest) / totalRatio : margins.derecho;
  return { left, right, width: available - left - right };
}

export function getPageBackgroundStyle(design: Design, resolveSrc: (src?: string) => string): CSSProperties {
  const image = resolveSrc(design?.fondoPaginaImagen);
  const size = design?.fondoPaginaTexturaTamanoPx;
  return {
    backgroundColor: design?.fondoPaginaColor || "var(--role-fondo-principal)",
    backgroundImage: image ? `url("${image.replace(/["\\\n\r]/g, "")}")` : design?.fondoPaginaColor ? "none" : "var(--tex-cream, none)",
    backgroundSize: image ? size && Number.isFinite(size) && size > 0 ? `${size}px` : "auto" : "var(--tex-cream-size, auto)",
    backgroundRepeat: "repeat",
  };
}
