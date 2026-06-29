/**
 * app/api/admin/[inviteCode]/config/reset/route.ts
 * DELETE: elimina el config_json de la BD, restaurando los valores por defecto.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { weddingConfig } from "@/config/wedding.config";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("bodas")
    .update({ config_json: {} })
    .eq("slug", weddingConfig.slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
