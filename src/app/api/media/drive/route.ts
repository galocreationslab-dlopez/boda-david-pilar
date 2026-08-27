import { NextResponse } from "next/server";
import { downloadDriveFile } from "@/lib/google-drive";

function extractDriveId(raw: string): string {
  const value = raw.trim();
  if (/^[a-zA-Z0-9_-]{20,}$/.test(value)) return value;

  try {
    const url = new URL(value);
    const queryId = url.searchParams.get("id") ?? "";
    if (/^[a-zA-Z0-9_-]{20,}$/.test(queryId)) return queryId;
    const nestedPathMatch = queryId.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (nestedPathMatch?.[1]) return nestedPathMatch[1];
    const pathMatch = url.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return pathMatch?.[1] ?? "";
  } catch {
    return "";
  }
}

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src") ?? "";
  const fileId = extractDriveId(src);
  if (!fileId) {
    return NextResponse.json({ error: "URL de Drive inválida" }, { status: 400 });
  }

  try {
    const file = await downloadDriveFile(fileId);
    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar la imagen" },
      { status: 502 },
    );
  }
}
