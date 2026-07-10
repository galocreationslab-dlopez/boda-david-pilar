import type { TemaColores, TemaPaleta } from "@/config/wedding.config";

export const ROLE_KEYS = [
  "fondoPrincipal",
  "fondoAlterno",
  "textoPrincipal",
  "textoSecundario",
  "titulos",
  "botonFondo",
  "botonTexto",
  "bordesDivisores",
  "highlightAcento",
] as const;

export type TemaColorRole = (typeof ROLE_KEYS)[number];

export const ROLE_LABELS: Record<TemaColorRole, string> = {
  fondoPrincipal: "Fondo principal",
  fondoAlterno: "Fondo alterno / sección",
  textoPrincipal: "Texto principal",
  textoSecundario: "Texto secundario",
  titulos: "Títulos / encabezados",
  botonFondo: "Botón — fondo",
  botonTexto: "Botón — texto",
  bordesDivisores: "Bordes / divisores",
  highlightAcento: "Highlight / acento",
};

export const DEFAULT_ROLE_SWATCH: Record<TemaColorRole, keyof TemaColores> = {
  fondoPrincipal: "cream",
  fondoAlterno: "white",
  textoPrincipal: "brownDark",
  textoSecundario: "oliveMuted",
  titulos: "brownDark",
  botonFondo: "bronze",
  botonTexto: "white",
  bordesDivisores: "bronzeLight",
  highlightAcento: "bronze",
};

export type SwatchOption = {
  id: string;
  label: string;
  color: string;
};

export function buildPaletteSwatches(palette: TemaPaleta): SwatchOption[] {
  const core = Object.entries(palette.colores).map(([id, color]) => ({
    id,
    label: palette.etiquetasColores?.[id as keyof TemaColores] ?? id,
    color,
  }));
  const extra = (palette.coloresExtra ?? []).map((item) => ({
    id: item.id,
    label: item.nombre,
    color: item.valor,
  }));
  return [...core, ...extra];
}

function resolveRoleSwatchId(palette: TemaPaleta, role: TemaColorRole): string {
  const assigned = palette.rolesColor?.[role];
  if (assigned && buildPaletteSwatches(palette).some((swatch) => swatch.id === assigned)) {
    return assigned;
  }
  return DEFAULT_ROLE_SWATCH[role];
}

export function resolvePaletteRoleMap(palette: TemaPaleta): Record<TemaColorRole, string> {
  return ROLE_KEYS.reduce((acc, role) => {
    acc[role] = resolveRoleSwatchId(palette, role);
    return acc;
  }, {} as Record<TemaColorRole, string>);
}

function getSwatchColorById(palette: TemaPaleta, swatchId: string): string | null {
  if (swatchId in palette.colores) {
    return palette.colores[swatchId as keyof TemaColores];
  }
  const extra = (palette.coloresExtra ?? []).find((item) => item.id === swatchId);
  return extra?.valor ?? null;
}

export function resolvePaletteRoleColors(palette: TemaPaleta): Record<TemaColorRole, string> {
  const map = resolvePaletteRoleMap(palette);
  return ROLE_KEYS.reduce((acc, role) => {
    const fromMap = getSwatchColorById(palette, map[role]);
    const fallback = palette.colores[DEFAULT_ROLE_SWATCH[role]];
    acc[role] = fromMap ?? fallback;
    return acc;
  }, {} as Record<TemaColorRole, string>);
}

export function resolvePaletteToThemeColors(palette: TemaPaleta): TemaColores {
  const roles = resolvePaletteRoleColors(palette);
  return {
    bronze: roles.highlightAcento,
    bronzeLight: roles.bordesDivisores,
    olive: roles.botonFondo,
    oliveMuted: roles.textoSecundario,
    cream: roles.fondoPrincipal,
    brownDark: roles.textoPrincipal,
    white: roles.fondoAlterno,
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  const normalized = cleaned.length === 3
    ? cleaned.split("").map((char) => `${char}${char}`).join("")
    : cleaned;
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function toLuminance(channel: number): number {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(foregroundHex: string, backgroundHex: string): number | null {
  const fg = hexToRgb(foregroundHex);
  const bg = hexToRgb(backgroundHex);
  if (!fg || !bg) return null;
  const fgLum = 0.2126 * toLuminance(fg.r) + 0.7152 * toLuminance(fg.g) + 0.0722 * toLuminance(fg.b);
  const bgLum = 0.2126 * toLuminance(bg.r) + 0.7152 * toLuminance(bg.g) + 0.0722 * toLuminance(bg.b);
  const light = Math.max(fgLum, bgLum);
  const dark = Math.min(fgLum, bgLum);
  return Number(((light + 0.05) / (dark + 0.05)).toFixed(2));
}

export function buildRoleContrastWarnings(palette: TemaPaleta): string[] {
  const roles = resolvePaletteRoleColors(palette);
  const checks = [
    {
      label: "Texto principal sobre fondo principal",
      ratio: contrastRatio(roles.textoPrincipal, roles.fondoPrincipal),
    },
    {
      label: "Texto secundario sobre fondo principal",
      ratio: contrastRatio(roles.textoSecundario, roles.fondoPrincipal),
    },
    {
      label: "Texto de botón sobre fondo de botón",
      ratio: contrastRatio(roles.botonTexto, roles.botonFondo),
    },
    {
      label: "Acento sobre fondo principal",
      ratio: contrastRatio(roles.highlightAcento, roles.fondoPrincipal),
    },
  ];

  return checks
    .filter((item) => item.ratio !== null && item.ratio < 4.5)
    .map((item) => `${item.label}: ${item.ratio?.toFixed(2)} (mínimo recomendado 4.5)`);
}
