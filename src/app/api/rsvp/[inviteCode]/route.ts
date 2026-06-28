import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  try {
    const { inviteCode } = await params;
    const supabase = createServerClient();

    const { data: invitacion, error } = await supabase
      .from("invitaciones")
      .select("id, invite_code, nombre_visible, tipo_invitacion, nombre1, nombre2, estado, adultos_estimados, adolescentes_estimados, ninos_estimados, bebes_estimados")
      .eq("invite_code", inviteCode)
      .maybeSingle();

    if (error || !invitacion) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    const { data: asistentes, error: asistentesError } = await supabase
      .from("asistentes")
      .select("id, nombre, edad, tipo_persona, estado_asistencia, transporte, necesidades, comentarios")
      .eq("invitation_id", invitacion.id)
      .order("created_at", { ascending: true });

    if (asistentesError) {
      return NextResponse.json({ error: asistentesError.message }, { status: 500 });
    }

    const personas = asistentes?.length
      ? asistentes.map((asistente: any) => ({
          id: asistente.id,
          nombre: asistente.nombre,
          edad: asistente.edad,
          tipo_persona: asistente.tipo_persona,
          estado_asistencia: asistente.estado_asistencia,
          transporte: asistente.transporte,
          necesidades: asistente.necesidades,
          comentarios: asistente.comentarios,
        }))
      : [];

    return NextResponse.json({ invitacion, personas });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error inesperado" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  try {
    const { inviteCode } = await params;
    const body = await request.json();
    const supabase = createServerClient();

    const { data: invitacion, error: invitacionError } = await supabase
      .from("invitaciones")
      .select("id")
      .eq("invite_code", inviteCode)
      .maybeSingle();

    if (invitacionError || !invitacion) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    const estadoInvitacion =
      body.asistencia_estimada === "si"
        ? "confirmada"
        : body.asistencia_estimada === "no"
          ? "rechazada"
          : "pendiente_respondida";

    const { error: updateError } = await supabase
      .from("invitaciones")
      .update({
        estado: estadoInvitacion,
      })
      .eq("id", invitacion.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const personas = Array.isArray(body.personas) ? body.personas : [];

    for (const persona of personas) {
      const payload = {
        invitation_id: invitacion.id,
        nombre: persona.nombre || "Invitado",
        edad:
          persona.tipo_persona === "nino" || persona.tipo_persona === "bebe"
            ? persona.edad ?? null
            : null,
        tipo_persona: persona.tipo_persona || "adulto",
        estado_asistencia: persona.asistira === "si" ? "si" : persona.asistira === "no" ? "no" : "pendiente",
        transporte: Array.isArray(persona.transporte) ? persona.transporte : [],
        necesidades: {
          alergias: persona.alergias || null,
          necesidades_alimentarias: persona.necesidades_alimentarias || null,
          alojamiento: persona.alojamiento || null,
          come_con_padres: persona.come_con_padres ?? null,
          menu_adulto: persona.menu_adulto ?? null,
          necesita_trona: persona.necesita_trona ?? null,
          necesita_ayuda: persona.necesita_ayuda ?? null,
        },
        comentarios: persona.comentarios || body.comentarios || null,
      };

      if (persona.id) {
        const { error: personaError } = await supabase
          .from("asistentes")
          .update(payload)
          .eq("id", persona.id)
          .eq("invitation_id", invitacion.id);

        if (personaError) {
          return NextResponse.json({ error: personaError.message }, { status: 500 });
        }
      } else {
        const { error: personaError } = await supabase.from("asistentes").insert(payload);

        if (personaError) {
          return NextResponse.json({ error: personaError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
