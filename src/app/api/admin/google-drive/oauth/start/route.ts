/**
 * app/api/admin/google-drive/oauth/start/route.ts
 * Inicia el flujo de reconexión OAuth con Google Drive.
 * Requiere ?code=<inviteCode admin> para autorizar la operación.
 * La redirect_uri es fija (no depende del inviteCode) para poder
 * registrarla una única vez en Google Cloud Console.
 */

import { NextResponse } from "next/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { buildGoogleDriveOAuthUrl } from "@/lib/google-drive";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const inviteCode = url.searchParams.get("code") ?? "";

  if (!inviteCode || !(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const redirectUri = `${url.origin}/api/admin/google-drive/oauth/callback`;

  try {
    const authUrl = buildGoogleDriveOAuthUrl(redirectUri, inviteCode);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo iniciar la conexión con Google Drive" },
      { status: 500 },
    );
  }
}
