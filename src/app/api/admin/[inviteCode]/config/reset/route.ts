/**
 * app/api/admin/[inviteCode]/config/reset/route.ts
 * DELETE: elimina el config_json de la BD, restaurando los valores por defecto.
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
  const { data: boda, error: bodaError } = await supabase
    .from("bodas")
    .select("id")
    .eq("slug", weddingConfig.slug)
    .maybeSingle();

  if (bodaError || !boda?.id) {
    return NextResponse.json({ error: "Boda no encontrada" }, { status: 404 });
  }

  const { error } = await supabase
    .from("bodas")
    .update({ config_json: {} })
    .eq("id", boda.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await supabase
      .from("bodas_secciones")
      .delete()
      .eq("boda_id", boda.id)
      .in("clave_config", ["historia", "timeline"]);
  } catch {
    // Si las tablas nuevas no existen todavia, no bloquear el reset clasico.
  }

  revalidatePath("/", "layout");
  revalidatePath("/", "page");
  revalidatePath("/[inviteCode]", "page");
  revalidatePath("/rsvp", "page");
  revalidatePath("/rsvp/[inviteCode]", "page");

  return NextResponse.json({ ok: true });
}
