/**
 * app/api/admin/google-drive/oauth/callback/route.ts
 * Recibe el "code" de Google, lo canjea por un refresh_token y lo guarda en
 * Supabase (tabla google_drive_oauth_tokens) para que la conexión con Drive
 * sea persistente entre despliegues.
 */

import { NextResponse } from "next/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { exchangeGoogleDriveOAuthCode } from "@/lib/google-drive";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const inviteCode = url.searchParams.get("state") ?? "";
  const oauthError = url.searchParams.get("error");

  const backTo = `/admin/${encodeURIComponent(inviteCode)}/datos`;

  if (oauthError) {
    return NextResponse.redirect(`${url.origin}${backTo}?drive=error&reason=${encodeURIComponent(oauthError)}`);
  }

  if (!code || !inviteCode || !(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const redirectUri = `${url.origin}/api/admin/google-drive/oauth/callback`;

  try {
    await exchangeGoogleDriveOAuthCode(code, redirectUri);
    return NextResponse.redirect(`${url.origin}${backTo}?drive=connected`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.redirect(`${url.origin}${backTo}?drive=error&reason=${encodeURIComponent(reason)}`);
  }
}
