/**
 * lib/og-image.ts
 * Carga y normaliza imágenes para la vista previa al compartir (1200x630, JPEG, ≤300 KB).
 * Solo servidor (usa sharp si está disponible, next/og como alternativa, y el token de Drive).
 */

import { createElement } from "react";
import type sharpType from "sharp";
import { downloadDriveFile } from "@/lib/google-drive";
import { isDriveUrl } from "@/lib/drive-image";
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_MAX_BYTES,
  OG_IMAGE_WIDTH,
  isLocalImagePath,
  normalizeLocalPath,
  unwrapPreviewSrc,
} from "@/lib/share-metadata";

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

type SharpFn = typeof sharpType;
let sharpPromise: Promise<SharpFn | null> | null = null;

/** Carga sharp bajo demanda: si el binario nativo no está disponible, devuelve null en vez de tumbar la ruta. */
function loadSharp(): Promise<SharpFn | null> {
  sharpPromise ??= import("sharp")
    .then((mod) => (mod.default ?? mod) as SharpFn)
    .catch((error) => {
      console.error("[og-image] sharp no disponible", error);
      return null;
    });
  return sharpPromise;
}

export type LoadedImage = { buffer: Buffer; contentType: string };

export function extractDriveId(raw: string): string {
  const value = raw.trim();
  if (!value) return "";

  if (/^[a-zA-Z0-9_-]{20,}$/.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);
    const idFromQuery = url.searchParams.get("id");
    if (idFromQuery) return idFromQuery;

    const folderMatch = url.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (folderMatch?.[1]) return folderMatch[1];
  } catch {
    return "";
  }

  return "";
}

/** Content-Type real a partir de los bytes; se usa cuando el origen no lo informa bien. */
export function detectImageContentType(buffer: Buffer, declared?: string | null): string {
  const header = declared?.split(";")[0].trim().toLowerCase() ?? "";
  if (header.startsWith("image/")) return header;

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 6 && buffer.subarray(0, 3).toString("ascii") === "GIF") return "image/gif";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  const head = buffer.subarray(0, 512).toString("utf8").trimStart();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "image/svg+xml";
  return header || "application/octet-stream";
}

async function fetchImage(url: URL): Promise<LoadedImage> {
  const response = await fetch(url, { redirect: "follow", cache: "no-store" });
  if (!response.ok) throw new Error(`No se pudo descargar la imagen: ${response.status}`);
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_SOURCE_BYTES) throw new Error("La imagen es demasiado grande");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_SOURCE_BYTES) throw new Error("La imagen es demasiado grande");
  return { buffer, contentType: detectImageContentType(buffer, response.headers.get("content-type")) };
}

/**
 * Descarga una imagen desde Drive, /public/images (mismo origen) o, si se permite, una URL externa.
 * `origin` es el origen de la petición actual, para resolver rutas locales.
 */
export async function loadImageSource(
  rawSrc: string,
  origin: string,
  options: { allowExternal?: boolean } = {},
): Promise<LoadedImage> {
  const src = normalizeLocalPath(unwrapPreviewSrc(rawSrc));
  if (!src) throw new Error("Falta la imagen");

  if (isLocalImagePath(src)) {
    return fetchImage(new URL(src, origin));
  }

  const driveId = isDriveUrl(src) || /^[a-zA-Z0-9_-]{20,}$/.test(src) ? extractDriveId(src) : "";
  if (driveId) {
    const file = await downloadDriveFile(driveId);
    return { buffer: file.buffer, contentType: detectImageContentType(file.buffer, file.contentType) };
  }

  if (options.allowExternal && /^https?:\/\//i.test(src)) {
    return fetchImage(new URL(src));
  }

  throw new Error("Origen de imagen no soportado");
}

export type ImageInfo = {
  bytes: number;
  width: number | null;
  height: number | null;
  contentType: string;
};

export async function inspectImage(image: LoadedImage): Promise<ImageInfo> {
  const sharp = await loadSharp();
  const meta = sharp ? await sharp(image.buffer).metadata().catch(() => null) : null;
  const dims = meta ?? readImageDimensions(image.buffer);
  return {
    bytes: image.buffer.length,
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    contentType: image.contentType,
  };
}

/**
 * Devuelve una imagen apta para og:image: 1200x630 y ≤300 KB.
 * Si el original ya cumple (JPEG/PNG, 1200x630, ≤300 KB) se devuelve sin tocar.
 * Imágenes muy distintas de 1.91:1 (p. ej. un logo cuadrado) se encajan completas sobre un fondo.
 * Usa sharp (JPEG); si no está disponible en el entorno, recurre a next/og (PNG).
 */
export async function buildOgImage(image: LoadedImage): Promise<LoadedImage> {
  const info = await inspectImage(image);
  const alreadyOk =
    (info.contentType === "image/jpeg" || info.contentType === "image/png")
    && info.width === OG_IMAGE_WIDTH
    && info.height === OG_IMAGE_HEIGHT
    && info.bytes <= OG_IMAGE_MAX_BYTES;
  if (alreadyOk) return image;

  const sharp = await loadSharp();
  if (sharp) {
    try {
      return await buildOgImageWithSharp(sharp, image, info);
    } catch (error) {
      console.error("[og-image] sharp no pudo procesar la imagen; se usa next/og", error);
    }
  }
  return buildOgImageWithNextOg(image, info);
}

async function buildOgImageWithSharp(sharp: SharpFn, image: LoadedImage, info: ImageInfo): Promise<LoadedImage> {
  // SVG: densidad ajustada para rasterizar a ~2400px de lado (nítido sin superar el límite de píxeles)
  const maxSide = Math.max(info.width ?? 0, info.height ?? 0);
  const density = info.contentType === "image/svg+xml" && maxSide > 0
    ? Math.max(1, Math.min(300, Math.round((72 * 2400) / maxSide)))
    : 72;
  const input = () => sharp(image.buffer, { density, failOn: "none" }).rotate();
  const fitsCover = isNearOgRatio(info);

  let composed: Buffer;
  if (fitsCover) {
    composed = await input()
      .resize(OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, { fit: "cover", position: "attention" })
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();
  } else {
    const background = await input()
      .resize(OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, { fit: "cover" })
      .flatten({ background: "#ffffff" })
      .blur(40)
      .modulate({ brightness: 0.85 })
      .png()
      .toBuffer();
    const foreground = await input()
      .resize(OG_IMAGE_WIDTH - 80, OG_IMAGE_HEIGHT - 60, { fit: "inside", withoutEnlargement: false })
      .png()
      .toBuffer();
    composed = await sharp(background)
      .composite([{ input: foreground, gravity: "centre" }])
      .png()
      .toBuffer();
  }

  let output = composed;
  for (const quality of [85, 78, 70, 62, 54, 46, 38]) {
    output = await sharp(composed).jpeg({ quality, mozjpeg: true, progressive: true }).toBuffer();
    if (output.length <= OG_IMAGE_MAX_BYTES) break;
  }
  return { buffer: output, contentType: "image/jpeg" };
}

async function buildOgImageWithNextOg(image: LoadedImage, info: ImageInfo): Promise<LoadedImage> {
  const { ImageResponse } = await import("next/og");
  const dataUrl = `data:${image.contentType};base64,${image.buffer.toString("base64")}`;
  const cover = isNearOgRatio(info);
  const element = createElement(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f4efe6",
      },
    },
    createElement("img", {
      src: dataUrl,
      width: cover ? OG_IMAGE_WIDTH : OG_IMAGE_WIDTH - 80,
      height: cover ? OG_IMAGE_HEIGHT : OG_IMAGE_HEIGHT - 60,
      style: { objectFit: cover ? "cover" : "contain", width: "100%", height: "100%", ...(cover ? {} : { padding: "30px 40px" }) },
    }),
  );
  const response = new ImageResponse(element, { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT });
  return { buffer: Buffer.from(await response.arrayBuffer()), contentType: "image/png" };
}

function isNearOgRatio(info: ImageInfo): boolean {
  const targetRatio = OG_IMAGE_WIDTH / OG_IMAGE_HEIGHT;
  const ratio = info.width && info.height ? info.width / info.height : targetRatio;
  return ratio >= targetRatio * 0.8 && ratio <= targetRatio * 1.25;
}

/** Dimensiones de PNG/JPEG/GIF leyendo la cabecera (sin sharp). */
function readImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length >= 24 && buffer.readUInt32BE(0) === 0x89504e47) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length >= 10 && buffer.subarray(0, 3).toString("ascii") === "GIF") {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return null;
}
