/**
 * lib/theme-fonts.ts
 * Roles de fuente (nombres / titulos / textos) y generacion de CSS (@font-face y variables).
 * Seguro para cliente y servidor.
 */
import type { CSSProperties } from "react";
import type { FuenteRol, FuenteSubida, TemaFuentes } from "@/config/wedding.config";
import { getComponentSizeKind } from "@/lib/component-size";

export const FONT_ROLE_KEYS: FuenteRol[] = ["nombres", "titulos", "textos"];

export const FONT_ROLE_LABELS: Record<FuenteRol, string> = {
  nombres: "Nombres (novios e invitados)",
  titulos: "Títulos y fechas",
  textos: "Textos",
};

export const FONT_FORMATS: Record<string, FuenteSubida["formato"]> = {
  woff2: "woff2",
  woff: "woff",
  ttf: "truetype",
  otf: "opentype",
};

// Componentes que usan un rol concreto si no se ha elegido otro.
const DEFAULT_COMPONENT_FONT_ROLE: Partial<Record<string, FuenteRol>> = {
  "portada.nombres": "nombres",
};

export function sanitizeFontFamily(value: string): string {
  return value.replace(/[^\p{L}\p{N} \-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60);
}

function isSafeFontUrl(url: string): boolean {
  return /^https:\/\/[^\s"'()<>\\]+$/.test(url);
}

function getValidFonts(fuentes: TemaFuentes): FuenteSubida[] {
  return (fuentes.biblioteca ?? []).filter(
    (font) => font.familia && sanitizeFontFamily(font.familia) === font.familia && isSafeFontUrl(font.url),
  );
}

export function resolveFontRoleStack(fuentes: TemaFuentes, role: FuenteRol): string {
  const fallback = role === "textos" ? fuentes.body : fuentes.display;
  const fontId = fuentes.roles?.[role];
  const font = fontId ? getValidFonts(fuentes).find((item) => item.id === fontId) : undefined;
  return font ? `'${font.familia}', ${fallback}` : fallback;
}

/** Variables CSS de fuente. `--font-display`/`--font-body` siguen a los roles titulos/textos. */
export function buildFontCssVars(fuentes: TemaFuentes): Record<string, string> {
  const titulos = resolveFontRoleStack(fuentes, "titulos");
  const textos = resolveFontRoleStack(fuentes, "textos");
  return {
    "--font-display": titulos,
    "--font-body": textos,
    "--font-nombres": resolveFontRoleStack(fuentes, "nombres"),
    "--font-titulos": titulos,
    "--font-textos": textos,
  };
}

/** @font-face de las fuentes asignadas a algun rol (o de toda la biblioteca con `all`). */
export function buildFontFaceCss(fuentes: TemaFuentes, all = false): string {
  const usedIds = new Set(Object.values(fuentes.roles ?? {}));
  return getValidFonts(fuentes)
    .filter((font) => all || usedIds.has(font.id))
    .map(
      (font) =>
        `@font-face { font-family: '${font.familia}'; src: url('${font.url}') format('${font.formato}'); font-weight: normal; font-style: normal; font-display: swap; }`,
    )
    .join("\n");
}

export function getComponentFontRole(key: string, stored?: FuenteRol): FuenteRol | undefined {
  if (getComponentSizeKind(key) !== "font") return undefined;
  return stored ?? DEFAULT_COMPONENT_FONT_ROLE[key];
}

export function getComponentFontStyle(key: string, stored?: FuenteRol): CSSProperties {
  const role = getComponentFontRole(key, stored);
  return role ? { fontFamily: `var(--font-${role})` } : {};
}
