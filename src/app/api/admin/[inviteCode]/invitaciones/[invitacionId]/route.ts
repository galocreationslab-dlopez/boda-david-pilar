/**
 * api/admin/[inviteCode]/invitaciones/[invitacionId]/route.ts
 * PATCH: actualiza campos de una invitación.
 * DELETE: elimina una invitación (cascada a asistentes).
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { countRsvpPeople, exceedsRsvpLimits, getRsvpLimits } from "@/lib/rsvp-limits";
import { getWeddingConfig } from "@/lib/wedding-config-server";

type Ctx = { params: Promise<{ inviteCode: string; invitacionId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { inviteCode, invitacionId } = await params;
  if (!(await validateAdminCode(inviteCode))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const allowed = ["nombre_visible", "tipo_invitacion", "estado", "nombre1", "nombre2", "texto_invitacion_personalizado",
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
  const { data: invitacion } = await supabase
    .from("invitaciones")
    .select("adultos_estimados, adolescentes_estimados, ninos_estimados, bebes_estimados")
    .eq("id", invitacionId)
    .maybeSingle();
  if (!invitacion) return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });

  for (const key of ["adultos_estimados", "adolescentes_estimados", "ninos_estimados", "bebes_estimados"]) {
    if (key in patch && (!Number.isInteger(patch[key]) || Number(patch[key]) < 0)) {
      return NextResponse.json({ error: "Los cupos deben ser enteros no negativos" }, { status: 400 });
    }
  }
  if ((await getWeddingConfig()).rsvp?.cuposLimitantes !== false) {
    const { data: asistentes } = await supabase.from("asistentes").select("tipo_persona").eq("invitation_id", invitacionId);
    const limits = getRsvpLimits({ ...invitacion, ...patch });
    const limiteExcedido = exceedsRsvpLimits(countRsvpPeople(asistentes ?? []), limits);
    if (limiteExcedido) return NextResponse.json({ error: `El cupo de ${limiteExcedido} no puede ser inferior a sus asistentes actuales` }, { status: 400 });
  }

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
