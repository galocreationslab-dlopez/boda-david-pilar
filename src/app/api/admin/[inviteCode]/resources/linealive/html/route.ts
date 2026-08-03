import { NextResponse } from "next/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { downloadDriveFile } from "@/lib/google-drive";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const url = new URL(request.url);
  const fileId = url.searchParams.get("fileId")?.trim() ?? "";
  if (!fileId) {
    return NextResponse.json({ error: "Falta fileId" }, { status: 400 });
  }

  try {
    const file = await downloadDriveFile(fileId);
    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar la animacion" },
      { status: 500 },
    );
  }
}