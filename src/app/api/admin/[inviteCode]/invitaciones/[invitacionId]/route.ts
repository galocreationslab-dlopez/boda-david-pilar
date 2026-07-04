/**
 * api/admin/[inviteCode]/invitaciones/[invitacionId]/route.ts
 * PATCH: actualiza campos de una invitación.
 * DELETE: elimina una invitación (cascada a asistentes).
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateAdminCode } from "@/lib/admin-auth";

type Ctx = { params: Promise<{ inviteCode: string; invitacionId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { inviteCode, invitacionId } = await params;
  if (!(await validateAdminCode(inviteCode))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const allowed = ["nombre_visible", "tipo_invitacion", "estado", "nombre1", "nombre2",
    "adultos_estimados", "adolescentes_estimados", "ninos_estimados", "bebes_estimados"];
  const patch: Record<string, string | number | null> = {};
  if (typeof body === "object" && body !== null) {
    const record = body as Record<string, unknown>;
    for (const k of allowed) {
      const value = record[k];
      if (typeof value === "string" || typeof value === "number" || value === null) {
        patch[k] = value;
      }
    }
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("invitaciones").update(patch).eq("id", invitacionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { inviteCode, invitacionId } = await params;
  if (!(await validateAdminCode(inviteCode))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const supabase = createServerClient();
  const { error } = await supabase.from("invitaciones").delete().eq("id", invitacionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
