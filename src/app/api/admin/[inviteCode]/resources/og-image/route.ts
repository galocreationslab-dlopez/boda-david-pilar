import { NextResponse } from "next/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { buildOgImage, inspectImage, loadImageSource } from "@/lib/og-image";
import { OG_IMAGE_HEIGHT, OG_IMAGE_MAX_BYTES, OG_IMAGE_WIDTH } from "@/lib/share-metadata";

export const runtime = "nodejs";

/**
 * GET ?src=...&mode=info  → { bytes, width, height, contentType, tooHeavy, isOgSize }
 * GET ?src=...            → JPEG 1200x630 ≤300 KB generado a partir de la imagen (para guardarlo en Recursos/General).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const url = new URL(request.url);
  const src = url.searchParams.get("src") ?? "";
  const mode = url.searchParams.get("mode");

  try {
    const image = await loadImageSource(src, url.origin, { allowExternal: true });

    if (mode === "info") {
      const info = await inspectImage(image);
      return NextResponse.json(
        {
          ...info,
          maxBytes: OG_IMAGE_MAX_BYTES,
          tooHeavy: info.bytes > OG_IMAGE_MAX_BYTES,
          isOgSize: info.width === OG_IMAGE_WIDTH && info.height === OG_IMAGE_HEIGHT,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const og = await buildOgImage(image);
    return new NextResponse(new Uint8Array(og.buffer), {
      status: 200,
      headers: {
        "Content-Type": og.contentType,
        "Content-Length": String(og.buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo procesar la imagen" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
