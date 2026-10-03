import type { CSSProperties } from "react";
import type { TemaColores, TemaColorRoleBase, TemaPaleta } from "@/config/wedding.config";

export const ROLE_KEYS = [
  "titulo",
  "tituloSeccion",
  "textoPrincipal",
  "textoSecundario",
  "fondoSeccion",
  "fondoSubseccion",
  "fondoBoton",
  "textoBoton",
  "logo",
  "nexosTransicionesBordes",
  "bordes",
] as const;

export type TemaColorRole = (typeof ROLE_KEYS)[number] | (string & {});

export const ROLE_LABELS: Record<TemaColorRoleBase, string> = {
  titulo: "Título",
  tituloSeccion: "Título sección",
  textoPrincipal: "Texto principal",
  textoSecundario: "Texto secundario",
  fondoSeccion: "Fondo sección",
  fondoSubseccion: "Fondo subsección",
  fondoBoton: "Fondo botón",
  textoBoton: "Texto botón",
  logo: "Logo",
  nexosTransicionesBordes: "Nexos, transiciones y bordes",
  bordes: "Bordes",
};

export const DEFAULT_ROLE_SWATCH: Record<TemaColorRoleBase, keyof TemaColores> = {
  titulo: "brownDark",
  tituloSeccion: "brownDark",
  textoPrincipal: "brownDark",
  textoSecundario: "oliveMuted",
  fondoSeccion: "cream",
  fondoSubseccion: "white",
  fondoBoton: "bronze",
  textoBoton: "white",
  logo: "bronze",
  nexosTransicionesBordes: "bronzeLight",
  bordes: "bronzeLight",
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

function toHumanRoleLabel(rawRole: string): string {
  return rawRole
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getRoleLabel(role: string, palette?: TemaPaleta | null): string {
  return palette?.roleLabels?.[role] ?? ROLE_LABELS[role as TemaColorRoleBase] ?? toHumanRoleLabel(role);
}

export function getPaletteRoleKeys(palette?: TemaPaleta | null): string[] {
  const fromPalette = Object.keys(palette?.rolesColor ?? {});
  const merged = [...ROLE_KEYS, ...fromPalette];
  return Array.from(new Set(merged));
}

function resolveRoleSwatchId(palette: TemaPaleta, role: string): string {
  const assigned = palette.rolesColor?.[role];
  if (assigned && buildPaletteSwatches(palette).some((swatch) => swatch.id === assigned)) {
    return assigned;
  }
  const fallbackKey = DEFAULT_ROLE_SWATCH[role as TemaColorRoleBase];
  return fallbackKey ?? "cream";
}

export function resolvePaletteRoleMap(palette: TemaPaleta): Record<string, string> {
  const roles = getPaletteRoleKeys(palette);
  return roles.reduce((acc, role) => {
    acc[role] = resolveRoleSwatchId(palette, role);
    return acc;
  }, {} as Record<string, string>);
}

function getSwatchColorById(palette: TemaPaleta, swatchId: string): string | null {
  if (swatchId in palette.colores) {
    return palette.colores[swatchId as keyof TemaColores];
  }
  const extra = (palette.coloresExtra ?? []).find((item) => item.id === swatchId);
  return extra?.texturaUrl?.trim() && extra.texturaBaseTransparente ? "transparent" : extra?.valor ?? null;
}

export function resolvePaletteRoleColors(palette: TemaPaleta): Record<string, string> {
  const map = resolvePaletteRoleMap(palette);
  const roles = getPaletteRoleKeys(palette);
  return roles.reduce((acc, role) => {
    const fromMap = getSwatchColorById(palette, map[role]);
    const fallbackKey = DEFAULT_ROLE_SWATCH[role as TemaColorRoleBase] ?? "cream";
    const fallback = palette.colores[fallbackKey];
    acc[role] = fromMap ?? fallback;
    return acc;
  }, {} as Record<string, string>);
}

export type PaletteTexture = {
  url: string;
  sizePx?: number;
  /** Color base que queda bajo la textura. */
  color: string;
};

function getSwatchTexture(palette: TemaPaleta, swatchId: string): PaletteTexture | null {
  const extra = (palette.coloresExtra ?? []).find((item) => item.id === swatchId);
  const url = extra?.texturaUrl?.trim();
  if (!extra || !url) return null;
  return { url, sizePx: extra.texturaTamanoPx, color: extra.valor };
}

/** Solo incluye los roles cuyo color elegido es una textura. */
export function resolvePaletteRoleTextures(palette: TemaPaleta): Record<string, PaletteTexture> {
  const map = resolvePaletteRoleMap(palette);
  return getPaletteRoleKeys(palette).reduce((acc, role) => {
    const texture = getSwatchTexture(palette, map[role]);
    if (texture) acc[role] = texture;
    return acc;
  }, {} as Record<string, PaletteTexture>);
}

export function textureToCssImage(texture: PaletteTexture | undefined, resolveSrc: (src: string) => string): { image: string; size: string } {
  if (!texture) return { image: "none", size: "auto" };
  const src = resolveSrc(texture.url).replace(/["\\\n\r]/g, "");
  return {
    image: src ? `url("${src}")` : "none",
    size: texture.sizePx && texture.sizePx > 0 ? `${Math.round(texture.sizePx)}px` : "auto",
  };
}

// Componentes cuyo fondo ya lleva una clase `.tex-*`: si su rol no es textura hay que anular la de la clase.
const CLASS_TEXTURED_KEYS = new Set([
  "historia.card", "timeline.card", "galeria.card",
  "historia.fondoSeccion", "timeline.fondoSeccion", "galeria.fondoSeccion",
]);

export function withTextureStyle(
  key: string,
  style: CSSProperties,
  texture: PaletteTexture | undefined,
  resolveSrc: (src: string) => string,
): CSSProperties {
  if (!("backgroundColor" in style)) return style;
  if (!texture) return CLASS_TEXTURED_KEYS.has(key) ? { ...style, backgroundImage: "none" } : style;
  const { image, size } = textureToCssImage(texture, resolveSrc);
  return { ...style, backgroundImage: image, backgroundSize: size, backgroundRepeat: "repeat" };
}

// Componentes que dibujan un borde y admiten ocultarlo desde el panel de diseño.
export const BORDER_TOGGLE_KEYS = new Set([
  "historia.card", "timeline.card", "galeria.card",
  "historia.fondoSeccion", "timeline.fondoSeccion", "galeria.fondoSeccion",
  "portada.ctaFondo", "portada.separador",
]);

export function withBorderStyle(key: string, style: CSSProperties, visible: boolean | undefined): CSSProperties {
  if (visible !== false || !BORDER_TOGGLE_KEYS.has(key)) return style;
  return { ...style, border: "none", borderTop: "none", borderRight: "none", borderBottom: "none", borderLeft: "none" };
}

/** Variables CSS `--tex-*` que usan las clases `.tex-*` de globals.css; siempre definidas para sobrescribir las heredadas. */
export function buildTextureCssVars(palette: TemaPaleta | null | undefined, resolveSrc: (src: string) => string): Record<string, string> {
  const textures = palette ? resolvePaletteRoleTextures(palette) : {};
  const section = textureToCssImage(textures.fondoSeccion, resolveSrc);
  const sub = textureToCssImage(textures.fondoSubseccion, resolveSrc);
  return {
    "--tex-cream": section.image,
    "--tex-cream-size": section.size,
    "--tex-white": sub.image,
    "--tex-white-size": sub.size,
    "--tex-cream-dark": sub.image,
    "--tex-cream-dark-size": sub.size,
  };
}

export function resolvePaletteToThemeColors(palette: TemaPaleta): TemaColores {
  const roles = resolvePaletteRoleColors(palette);
  return {
    bronze: roles.logo ?? palette.colores.bronze,
    bronzeLight: roles.nexosTransicionesBordes ?? palette.colores.bronzeLight,
    olive: palette.colores.olive,
    oliveMuted: palette.colores.oliveMuted,
    cream: roles.fondoSeccion ?? palette.colores.cream,
    brownDark: roles.textoPrincipal ?? palette.colores.brownDark,
    white: roles.fondoSubseccion ?? palette.colores.white,
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
      label: "Texto principal sobre fondo sección",
      ratio: contrastRatio(roles.textoPrincipal, roles.fondoSeccion),
    },
    {
      label: "Texto secundario sobre fondo sección",
      ratio: contrastRatio(roles.textoSecundario, roles.fondoSeccion),
    },
    {
      label: "Texto de botón sobre fondo de botón",
      ratio: contrastRatio(roles.textoBoton, roles.fondoBoton),
    },
    {
      label: "Logo sobre fondo sección",
      ratio: contrastRatio(roles.logo, roles.fondoSeccion),
    },
  ];

  return checks
    .filter((item) => item.ratio !== null && item.ratio < 4.5)
    .map((item) => `${item.label}: ${item.ratio?.toFixed(2)} (mínimo recomendado 4.5)`);
}
