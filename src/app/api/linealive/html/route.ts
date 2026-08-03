import { NextResponse } from "next/server";
import { getWeddingConfig } from "@/lib/wedding-config-server";
import { downloadDriveFile } from "@/lib/google-drive";
import { collectLineAliveHtmlDriveFileIds } from "@/lib/linealive/utils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fileId = url.searchParams.get("fileId")?.trim() ?? "";
  if (!fileId) {
    return NextResponse.json({ error: "Falta fileId" }, { status: 400 });
  }

  const config = await getWeddingConfig();
  const allowedIds = collectLineAliveHtmlDriveFileIds(config);
  if (!allowedIds.has(fileId)) {
    return NextResponse.json({ error: "Archivo no autorizado" }, { status: 404 });
  }

  try {
    const file = await downloadDriveFile(fileId);
    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar la animacion" },
      { status: 500 },
    );
  }
}