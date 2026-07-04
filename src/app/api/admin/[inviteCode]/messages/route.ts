import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateAdminCode } from "@/lib/admin-auth";

async function getInvitationById(supabase: ReturnType<typeof createServerClient>, invitationId: string) {
  return supabase
    .from("invitaciones")
    .select("id, invite_code, nombre_visible, wedding_id, estado")
    .eq("id", invitationId)
    .maybeSingle();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const url = new URL(request.url);
  const invitationId = url.searchParams.get("invitationId");
  if (!invitationId) {
    return NextResponse.json({ error: "Falta invitationId" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: invitacion, error } = await getInvitationById(supabase, invitationId);
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

  const unreadGuestIds = (mensajes ?? [])
    .filter((mensaje) => mensaje.author_role === "guest" && !mensaje.read_at_admin)
    .map((mensaje) => mensaje.id);

  if (unreadGuestIds.length > 0) {
    await supabase
      .from("invitaciones_mensajes")
      .update({ read_at_admin: new Date().toISOString() })
      .in("id", unreadGuestIds);
  }

  return NextResponse.json({ invitacion, messages: mensajes ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = (await request.json()) as { invitationId?: string; contenido?: string; authorName?: string };
  if (!body.invitationId || !body.contenido?.trim()) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: invitacion, error } = await getInvitationById(supabase, body.invitationId);
  if (error || !invitacion) {
    return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
  }

  const { error: insertError } = await supabase.from("invitaciones_mensajes").insert({
    wedding_id: invitacion.wedding_id,
    invitation_id: invitacion.id,
    author_role: "admin",
    author_name: body.authorName?.trim() || "Novios",
    contenido: body.contenido.trim(),
    read_at_admin: new Date().toISOString(),
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}