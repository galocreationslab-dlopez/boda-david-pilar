/**
 * lib/timeline-logo-size.ts
 * Tamano (px) del logo de cada evento del timeline, independiente para movil y PC.
 * Se guarda en el propio evento (identificado por su id estable), asi que sigue al evento
 * al reordenarlo o duplicar la seccion.
 */
import type { AlineacionLogoDispositivo, AlineacionLogoTimeline, TamanoLogoTimeline } from "@/config/wedding.config";

export const TIMELINE_LOGO_VERTICAL = ["arriba", "centro", "abajo"] as const;
export const TIMELINE_LOGO_HORIZONTAL = ["izquierda", "centro", "derecha"] as const;

const DEFAULT_ALIGN: Record<"movil" | "pc", Required<AlineacionLogoDispositivo>> = {
  movil: { vertical: "centro", horizontal: "izquierda" },
  pc: { vertical: "abajo", horizontal: "centro" },
};

export function resolveTimelineLogoAlign(
  alineacion: AlineacionLogoTimeline | undefined,
  device: "movil" | "pc",
): Required<AlineacionLogoDispositivo> {
  return { ...DEFAULT_ALIGN[device], ...(alineacion?.[device] ?? {}) };
}

function normalizeAlineacionDispositivo(raw: unknown): AlineacionLogoDispositivo | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const result: AlineacionLogoDispositivo = {};
  const vertical = TIMELINE_LOGO_VERTICAL.find((v) => v === r.vertical);
  const horizontal = TIMELINE_LOGO_HORIZONTAL.find((h) => h === r.horizontal);
  if (vertical) result.vertical = vertical;
  if (horizontal) result.horizontal = horizontal;
  return Object.keys(result).length > 0 ? result : undefined;
}

export function normalizeAlineacionLogoTimeline(value: unknown): AlineacionLogoTimeline | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  // Formato previo (vertical/horizontal sin dispositivo): se aplica a ambos.
  const legacy = normalizeAlineacionDispositivo(raw);
  const movil = normalizeAlineacionDispositivo(raw.movil) ?? legacy;
  const pc = normalizeAlineacionDispositivo(raw.pc) ?? legacy;
  if (!movil && !pc) return undefined;
  return { ...(movil ? { movil } : {}), ...(pc ? { pc } : {}) };
}

export type TimelineLogoDevice = "movil" | "pc";

export const TIMELINE_LOGO_RANGE: Record<TimelineLogoDevice, { min: number; max: number; step: number }> = {
  movil: { min: 16, max: 96, step: 2 },
  pc: { min: 16, max: 160, step: 2 },
};

// Tamano historico: icono integrado (SVG) 22px; imagen personalizada 44px.
const DEFAULT_ICON_PX = 22;
const DEFAULT_IMAGE_PX = 44;
// Valor por defecto del antiguo slider global "timeline.icono" (escala = valor / 22).
const LEGACY_SLIDER_REFERENCE_PX = 22;

export function defaultTimelineLogoSize(hasImage: boolean, legacySliderValue?: number): number {
  const base = hasImage ? DEFAULT_IMAGE_PX : DEFAULT_ICON_PX;
  if (typeof legacySliderValue !== "number" || !Number.isFinite(legacySliderValue) || legacySliderValue <= 0) return base;
  return Math.round(base * (legacySliderValue / LEGACY_SLIDER_REFERENCE_PX));
}

export function clampTimelineLogoSize(value: number, device: TimelineLogoDevice): number {
  const { min, max } = TIMELINE_LOGO_RANGE[device];
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** `configured` indica si el tamano viene de un valor guardado para ese dispositivo. */
export function resolveTimelineLogoSize(
  logoTamano: TamanoLogoTimeline | undefined,
  device: TimelineLogoDevice,
  hasImage: boolean,
  legacySliderValue?: number,
): { size: number; configured: boolean } {
  const stored = logoTamano?.[device];
  if (typeof stored === "number" && Number.isFinite(stored) && stored > 0) {
    return { size: clampTimelineLogoSize(stored, device), configured: true };
  }
  return { size: defaultTimelineLogoSize(hasImage, legacySliderValue), configured: false };
}

export function normalizeTamanoLogoTimeline(value: unknown): TamanoLogoTimeline | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const result: TamanoLogoTimeline = {};
  for (const device of ["movil", "pc"] as const) {
    const n = raw[device];
    if (typeof n === "number" && Number.isFinite(n) && n > 0) result[device] = clampTimelineLogoSize(n, device);
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
