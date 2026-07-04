import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

async function getInvitationByCode(supabase: ReturnType<typeof createServerClient>, inviteCode: string) {
  return supabase
    .from("invitaciones")
    .select("id, invite_code, nombre_visible, wedding_id, estado")
    .eq("invite_code", inviteCode)
    .maybeSingle();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  const supabase = createServerClient();
  const { data: invitacion, error } = await getInvitationByCode(supabase, inviteCode);

  if (error || !invitacion) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }

  const { data: mensajes, error: mensajesError } = await supabase
    .from("invitaciones_mensajes")
    .select("id, invitation_id, author_role, author_name, contenido, read_at_admin, read_at_guest, created_at")
    .eq("invitation_id", invitacion.id)
    .order("created_at", { ascending: true });

  if (mensajesError) {
    return NextResponse.json({ error: mensajesError.message }, { status: 500 });
  }

  const unreadAdminIds = (mensajes ?? [])
    .filter((mensaje) => mensaje.author_role === "admin" && !mensaje.read_at_guest)
    .map((mensaje) => mensaje.id);

  if (unreadAdminIds.length > 0) {
    await supabase
      .from("invitaciones_mensajes")
      .update({ read_at_guest: new Date().toISOString() })
      .in("id", unreadAdminIds);
  }

  return NextResponse.json({ messages: mensajes ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  const supabase = createServerClient();
  const { data: invitacion, error } = await getInvitationByCode(supabase, inviteCode);

  if (error || !invitacion) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }

  const body = (await request.json()) as { contenido?: string };
  const contenido = body.contenido?.trim();
  if (!contenido) {
    return NextResponse.json({ error: "Escribe un mensaje" }, { status: 400 });
  }

  const { error: insertError } = await supabase.from("invitaciones_mensajes").insert({
    wedding_id: invitacion.wedding_id,
    invitation_id: invitacion.id,
    author_role: "guest",
    author_name: invitacion.nombre_visible,
    contenido,
    read_at_guest: new Date().toISOString(),
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const nextState = invitacion.estado === "rechazada" ? invitacion.estado : "pendiente_respondida";
  if (nextState !== invitacion.estado) {
    await supabase.from("invitaciones").update({ estado: nextState }).eq("id", invitacion.id);
  }

  return NextResponse.json({ ok: true });
}