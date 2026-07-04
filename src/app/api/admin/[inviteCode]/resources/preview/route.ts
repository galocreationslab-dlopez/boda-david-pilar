import { NextResponse } from "next/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { downloadDriveFile } from "@/lib/google-drive";

function extractDriveId(raw: string): string {
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
  const fileId = extractDriveId(src);
  if (!fileId) {
    return NextResponse.json({ error: "fileId inválido" }, { status: 400 });
  }

  try {
    const file = await downloadDriveFile(fileId);
    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar la preview" },
      { status: 500 },
    );
  }
}
