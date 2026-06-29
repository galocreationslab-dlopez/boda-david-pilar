/**
 * api/admin/[inviteCode]/asistentes/route.ts
 * POST: crea un nuevo asistente para una invitación.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateAdminCode } from "@/lib/admin-auth";

export async function POST(req: Request, { params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json();
  if (!body.invitation_id || !body.nombre) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

  const supabase = createServerClient();
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
  return NextResponse.json({ ok: true, asistente: data });
}
