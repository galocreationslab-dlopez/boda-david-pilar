/**
 * api/admin/[inviteCode]/asistentes/[asistenteId]/route.ts
 * PATCH: actualiza un asistente.
 * DELETE: elimina un asistente.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { computeInvitacionEstado } from "@/lib/rsvp-status";

type Ctx = { params: Promise<{ inviteCode: string; asistenteId: string }> };

async function syncInvitacionEstado(supabase: ReturnType<typeof createServerClient>, invitationId: string) {
  const { data: asistentes } = await supabase
    .from("asistentes")
    .select("estado_asistencia")
    .eq("invitation_id", invitationId);
  const estado = computeInvitacionEstado((asistentes ?? []).map((a) => a.estado_asistencia));
  await supabase.from("invitaciones").update({ estado }).eq("id", invitationId);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { inviteCode, asistenteId } = await params;
  if (!(await validateAdminCode(inviteCode))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  const allowed = ["nombre", "edad", "tipo_persona", "estado_asistencia", "transporte", "necesidades", "comentarios"];
  const patch: Record<string, unknown> = {};
  if (typeof body === "object" && body !== null) {
    const record = body as Record<string, unknown>;
    for (const k of allowed) {
      if (k in record) patch[k] = record[k];
    }
  }

  const supabase = createServerClient();
  const { data: updated, error } = await supabase.from("asistentes").update(patch).eq("id", asistenteId).select("invitation_id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (updated?.invitation_id) await syncInvitacionEstado(supabase, updated.invitation_id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { inviteCode, asistenteId } = await params;
  if (!(await validateAdminCode(inviteCode))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const supabase = createServerClient();
  const { data: existing } = await supabase.from("asistentes").select("invitation_id").eq("id", asistenteId).maybeSingle();
  const { error } = await supabase.from("asistentes").delete().eq("id", asistenteId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (existing?.invitation_id) await syncInvitacionEstado(supabase, existing.invitation_id);
  return NextResponse.json({ ok: true });
}

