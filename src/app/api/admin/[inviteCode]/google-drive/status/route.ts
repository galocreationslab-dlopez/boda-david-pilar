/**
 * app/api/admin/[inviteCode]/google-drive/status/route.ts
 * Devuelve el estado de la conexión OAuth con Google Drive.
 */

import { NextResponse } from "next/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { getGoogleDriveConnectionStatus } from "@/lib/google-drive";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const status = await getGoogleDriveConnectionStatus();
  return NextResponse.json(status);
}
