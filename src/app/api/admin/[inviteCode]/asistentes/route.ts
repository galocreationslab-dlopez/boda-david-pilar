/**
 * api/admin/[inviteCode]/asistentes/route.ts
 * POST: crea un nuevo asistente para una invitación.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateAdminCode } from "@/lib/admin-auth";
import { computeInvitacionEstado } from "@/lib/rsvp-status";
import { countRsvpPeople, exceedsRsvpLimits, getRsvpLimits, RSVP_PERSONA_TYPES } from "@/lib/rsvp-limits";
import type { PersonaTipo } from "@/types/rsvp";
import { getWeddingConfig } from "@/lib/wedding-config-server";

async function syncInvitacionEstado(supabase: ReturnType<typeof createServerClient>, invitationId: string) {
  const { data: asistentes } = await supabase
    .from("asistentes")
    .select("estado_asistencia")
    .eq("invitation_id", invitationId);
  const estado = computeInvitacionEstado((asistentes ?? []).map((a) => a.estado_asistencia));
  await supabase.from("invitaciones").update({ estado }).eq("id", invitationId);
}

export async function POST(req: Request, { params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  if (!body.invitation_id || !body.nombre) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

  const supabase = createServerClient();
  const { data: invitacion } = await supabase
    .from("invitaciones")
    .select("adultos_estimados, adolescentes_estimados, ninos_estimados, bebes_estimados")
    .eq("id", body.invitation_id)
    .maybeSingle();
  if (!invitacion) return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  if (!RSVP_PERSONA_TYPES.includes(body.tipo_persona as PersonaTipo)) return NextResponse.json({ error: "Tipo de persona no válido" }, { status: 400 });
  if ((await getWeddingConfig()).rsvp?.cuposLimitantes !== false) {
    const { data: existentes } = await supabase.from("asistentes").select("tipo_persona").eq("invitation_id", body.invitation_id);
    const limiteExcedido = exceedsRsvpLimits(countRsvpPeople([...(existentes ?? []), { tipo_persona: body.tipo_persona }]), getRsvpLimits(invitacion));
    if (limiteExcedido) return NextResponse.json({ error: `El cupo de ${limiteExcedido} está completo` }, { status: 400 });
  }
  const { data, error } = await supabase.from("asistentes").insert({
    invitation_id: body.invitation_id,
    nombre: body.nombre,
    edad: body.edad ?? null,
    tipo_persona: body.tipo_persona ?? "adulto",
    estado_asistencia: body.estado_asistencia ?? "pendiente",
    transporte: body.transporte ?? [],
    necesidades: body.necesidades ?? {},
    comentarios: body.comentarios ?? null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await syncInvitacionEstado(supabase, body.invitation_id);
  return NextResponse.json({ ok: true, asistente: data });
}

