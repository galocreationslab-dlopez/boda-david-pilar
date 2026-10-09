/**
 * lib/share-metadata.ts
 * Datos de la vista previa al compartir el enlace (Open Graph / WhatsApp).
 * Sin dependencias de servidor: se usa en app/layout.tsx y en el panel de admin.
 */

import type { WeddingConfig } from "@/config/wedding.config";
import { isDriveUrl } from "@/lib/drive-image";

export const SITE_URL = "https://boda-pilar-david.vercel.app";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
/** WhatsApp ignora imágenes de vista previa más pesadas que esto. */
export const OG_IMAGE_MAX_BYTES = 300 * 1024;
/** Raster del sello de la portada: se usa cuando la portada no tiene logo propio (WhatsApp no muestra SVG). */
export const DEFAULT_OG_IMAGE = "/images/Sello.jpg";

const PREVIEW_PREFIX = "/api/resources/preview";

/** Si la URL ya es nuestro proxy público (/api/resources/preview?src=...), devuelve la URL original. */
export function unwrapPreviewSrc(value?: string | null): string {
  const raw = value?.trim() ?? "";
  if (!raw.startsWith(PREVIEW_PREFIX)) return raw;
  try {
    return new URL(raw, SITE_URL).searchParams.get("src")?.trim() ?? "";
  } catch {
    return "";
  }
}

/** Ruta local servida desde /public/images (sin query ni path traversal). */
export function isLocalImagePath(value: string): boolean {
  return /^\/images\/[^?#]+$/.test(value) && !value.includes("..");
}

export function normalizeLocalPath(value: string): string {
  const trimmed = value.replace(/^\.\//, "");
  if (trimmed.startsWith("images/")) return `/${trimmed}`;
  if (/^[^/:]+\.(svg|png|jpe?g|webp|gif|avif)$/i.test(trimmed)) return `/images/${trimmed}`;
  return trimmed;
}

function isUsableImageSource(value: string): boolean {
  if (!value) return false;
  if (/\.html?($|\?)/i.test(value) || value.toLowerCase().includes("/linealive/")) return false;
  return isDriveUrl(value) || isLocalImagePath(value) || /^https?:\/\//i.test(value);
}

function portadaLogoSource(config: WeddingConfig): string {
  const portada = config.diseno?.secciones?.find((section) => section.tipo === "portada" && section.selloUrl?.trim());
  return portada?.selloUrl?.trim() ?? "";
}

/** Imagen original elegida: la configurada en "Datos boda" o, si no, el logo de la portada. */
export function resolveShareImageSource(config: WeddingConfig): string {
  const candidates = [
    config.compartir?.imagenUrl,
    portadaLogoSource(config),
    config.logo,
  ];
  for (const candidate of candidates) {
    const value = normalizeLocalPath(unwrapPreviewSrc(candidate));
    if (isUsableImageSource(value)) return value;
  }
  return DEFAULT_OG_IMAGE;
}

/**
 * URL (relativa a metadataBase) que se publica en og:image.
 * Drive y /images pasan por el proxy público con og=1, que entrega un JPEG 1200x630 de ≤300 KB.
 */
export function resolveShareImageUrl(config: WeddingConfig): string {
  const source = resolveShareImageSource(config);
  if (isDriveUrl(source) || isLocalImagePath(source)) {
    return `${PREVIEW_PREFIX}?src=${encodeURIComponent(source)}&og=1`;
  }
  return source;
}

export function resolveNombreConjunto(config: WeddingConfig): string {
  return config.nombreConjunto?.trim() || `${config.novia.nombre} & ${config.novio.nombre}`;
}

export type ShareData = {
  title: string;
  description: string;
  siteName: string;
  imageUrl: string;
  imageAlt: string;
};

export function resolveShareData(config: WeddingConfig): ShareData {
  const nombreConjunto = resolveNombreConjunto(config);
  return {
    title: config.compartir?.titulo?.trim() || nombreConjunto,
    description: config.compartir?.descripcion?.trim() ?? "",
    siteName: nombreConjunto,
    imageUrl: resolveShareImageUrl(config),
    imageAlt: `Boda de ${nombreConjunto}`,
  };
}
