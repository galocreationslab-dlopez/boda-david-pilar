import { NextResponse } from "next/server";
import { downloadDriveFile } from "@/lib/google-drive";
import { buildOgImage, detectImageContentType, extractDriveId, loadImageSource, type LoadedImage } from "@/lib/og-image";
import { isLocalImagePath, unwrapPreviewSrc } from "@/lib/share-metadata";

export const runtime = "nodejs";

// Público: sin auth, sin cookies y sin inviteCode (lo usan los rastreadores de WhatsApp/Facebook para og:image).
const CACHE_OK = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";
const OG_MEMORY_TTL_MS = 6 * 60 * 60 * 1000;
const OG_MEMORY_MAX_ENTRIES = 32;
const ogMemoryCache = new Map<string, { image: LoadedImage; expiresAt: number }>();

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const src = unwrapPreviewSrc(url.searchParams.get("src") ?? "");
  // og=1 → JPEG 1200x630 de ≤300 KB, apto para la vista previa de WhatsApp.
  const og = url.searchParams.get("og") === "1";

  const cached = og ? ogMemoryCache.get(src) : undefined;
  if (cached && cached.expiresAt > Date.now()) return imageResponse(cached.image);

  let source: LoadedImage;
  try {
    if (og && isLocalImagePath(src)) {
      source = await loadImageSource(src, url.origin);
    } else {
      const fileId = extractDriveId(src);
      if (!fileId) return errorResponse("fileId invalido", 400);
      const file = await downloadDriveFile(fileId);
      source = { buffer: file.buffer, contentType: detectImageContentType(file.buffer, file.contentType) };
    }
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "No se pudo cargar la preview", 500);
  }

  let output = source;
  if (og) {
    try {
      output = await buildOgImage(source);
      if (ogMemoryCache.size >= OG_MEMORY_MAX_ENTRIES) {
        const oldestKey = ogMemoryCache.keys().next().value;
        if (oldestKey !== undefined) ogMemoryCache.delete(oldestKey);
      }
      ogMemoryCache.set(src, { image: output, expiresAt: Date.now() + OG_MEMORY_TTL_MS });
    } catch (error) {
      console.error("[resources/preview] No se pudo optimizar la imagen og", error);
    }
  }

  return imageResponse(output);
}

function imageResponse(image: LoadedImage) {
  return new NextResponse(new Uint8Array(image.buffer), {
    status: 200,
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(image.buffer.length),
      "Cache-Control": CACHE_OK,
    },
  });
}
