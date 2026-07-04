import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createServerClient();

    const { data: bodaData, error: bodaError } = await supabase
      .from("bodas")
      .select("id")
      .eq("slug", body.weddingSlug || "pilar-y-david")
      .maybeSingle();

    if (bodaError || !bodaData) {
      return NextResponse.json(
        { error: "No se ha encontrado la boda configurada" },
        { status: 404 }
      );
    }

    const inviteCode = body.invite_code || crypto.randomUUID().slice(0, 8);

    const { data: invitacionData, error: invitacionError } = await supabase
      .from("invitaciones")
      .insert({
        wedding_id: bodaData.id,
        invite_code: inviteCode,
        nombre_visible: body.nombre_visible || "Invitación",
        tipo_invitacion: body.tipo_invitacion || "individual",
        adultos_estimados: Number(body.adultos_estimados || 0),
        adolescentes_estimados: Number(body.adolescentes_estimados || 0),
        ninos_estimados: Number(body.ninos_estimados || 0),
        bebes_estimados: Number(body.bebes_estimados || 0),
        estado: "pendiente",
      })
      .select("id, invite_code")
      .single();

    if (invitacionError || !invitacionData) {
      return NextResponse.json(
        { error: invitacionError?.message || "No se pudo crear la invitación" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, invite_code: invitacionData.invite_code });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
