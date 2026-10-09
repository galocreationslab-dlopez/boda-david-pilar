import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { computeInvitacionEstado } from "@/lib/rsvp-status";
import { countRsvpPeople, exceedsRsvpLimits, getRsvpLimits, RSVP_PERSONA_TYPES } from "@/lib/rsvp-limits";
import type { PersonaTipo } from "@/types/rsvp";
import { getWeddingConfig } from "@/lib/wedding-config-server";

export const dynamic = "force-dynamic";

type RSVPUpdateBody = {
  asistencia_estimada?: "si" | "no" | "pendiente";
  comentarios?: string | null;
  personas?: Array<{
    id?: string;
    nombre?: string;
    edad?: number | null;
    tipo_persona?: string;
    asistira?: "si" | "no" | "pendiente";
    transporte?: string[];
    alergias?: string | null;
    necesidades_alimentarias?: string | null;
    alojamiento?: string | null;
    come_con_padres?: boolean | null;
    menu_adulto?: boolean | null;
    necesita_trona?: boolean | null;
    necesita_ayuda?: boolean | null;
  }>;
};

type RSVPPersona = NonNullable<RSVPUpdateBody["personas"]>[number];
type RSVPAsistenteRow = {
  id: string;
  nombre: string;
  edad: number | null;
  tipo_persona: string;
  estado_asistencia: string;
  transporte: unknown[];
  necesidades: Record<string, unknown>;
  comentarios: string | null;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  try {
    const { inviteCode } = await params;
    const supabase = createServerClient();

    const { data: invitacion, error } = await supabase
      .from("invitaciones")
      .select("id, invite_code, nombre_visible, tipo_invitacion, nombre1, nombre2, estado, adultos_estimados, adolescentes_estimados, ninos_estimados, bebes_estimados, texto_invitacion_personalizado")
      .eq("invite_code", inviteCode)
      .maybeSingle();

    if (error) {
      console.error("Error al consultar la invitación RSVP:", error);
      return NextResponse.json(
        { error: "No se pudo cargar la invitación. Inténtalo de nuevo." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (!invitacion) {
      return NextResponse.json(
        { error: "Invitación no encontrada" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { data: asistentes, error: asistentesError } = await supabase
      .from("asistentes")
      .select("id, nombre, edad, tipo_persona, estado_asistencia, transporte, necesidades, comentarios")
      .eq("invitation_id", invitacion.id)
      .order("created_at", { ascending: true });

    if (asistentesError) {
      console.error("Error al consultar los asistentes RSVP:", asistentesError);
      return NextResponse.json(
        { error: "No se pudieron cargar los asistentes. Inténtalo de nuevo." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const personas = asistentes?.length
      ? asistentes.map((asistente: RSVPAsistenteRow) => ({
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

    return NextResponse.json({ invitacion, personas }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error inesperado al cargar RSVP:", error);
    return NextResponse.json(
      { error: "No se pudo cargar la invitación. Inténtalo de nuevo." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  try {
    const { inviteCode } = await params;
    const body = (await request.json()) as RSVPUpdateBody;
    const supabase = createServerClient();

    const { data: invitacion, error: invitacionError } = await supabase
      .from("invitaciones")
      .select("id, adultos_estimados, adolescentes_estimados, ninos_estimados, bebes_estimados")
      .eq("invite_code", inviteCode)
      .maybeSingle();

    if (invitacionError) {
      console.error("Error al consultar la invitación para guardar RSVP:", invitacionError);
      return NextResponse.json(
        { error: "No se pudo comprobar la invitación. Inténtalo de nuevo." },
        { status: 503 },
      );
    }
    if (!invitacion) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    const personas = Array.isArray(body.personas) ? body.personas : [];
    const rsvpConfig = (await getWeddingConfig()).rsvp;

    const { data: existentes, error: existentesError } = await supabase
      .from("asistentes")
      .select("id, tipo_persona, estado_asistencia")
      .eq("invitation_id", invitacion.id);

    if (existentesError) {
      return NextResponse.json({ error: existentesError.message }, { status: 500 });
    }

    const idsRecibidos = personas.map((persona) => persona.id).filter((id): id is string => Boolean(id));
    if (new Set(idsRecibidos).size !== idsRecibidos.length) {
      return NextResponse.json({ error: "No se puede guardar una persona repetida" }, { status: 400 });
    }

    const idsExistentes = new Set((existentes ?? []).map((persona) => persona.id));
    if (idsRecibidos.some((id) => !idsExistentes.has(id))) {
      return NextResponse.json({ error: "Una persona no pertenece a esta invitación" }, { status: 400 });
    }

    for (const persona of personas) {
      if (!RSVP_PERSONA_TYPES.includes(persona.tipo_persona as PersonaTipo)) {
        return NextResponse.json({ error: "Tipo de persona no válido" }, { status: 400 });
      }
    }

    const tiposRecibidos = new Map(
      personas
        .filter((persona): persona is RSVPPersona & { id: string } => Boolean(persona.id))
        .map((persona) => [persona.id, persona.tipo_persona]),
    );
    const personasFinales = (existentes ?? []).map((persona) => ({
      tipo_persona: tiposRecibidos.get(persona.id) ?? persona.tipo_persona,
    })).concat(personas.filter((persona) => !persona.id).map((persona) => ({ tipo_persona: persona.tipo_persona })));
    if (rsvpConfig?.cuposLimitantes !== false) {
      const personasExistentes = countRsvpPeople(existentes ?? []);
      const limites = getRsvpLimits(invitacion);
      for (const tipo of RSVP_PERSONA_TYPES) limites[tipo] = Math.max(limites[tipo], personasExistentes[tipo]);
      const limiteExcedido = exceedsRsvpLimits(countRsvpPeople(personasFinales), limites);
      if (limiteExcedido) {
        return NextResponse.json({ error: `El cupo de ${limiteExcedido} está completo` }, { status: 400 });
      }
    }

    for (const persona of personas as RSVPPersona[]) {
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
        comentarios: body.comentarios || null,
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

    const { data: asistentesActualizados, error: estadoError } = await supabase
      .from("asistentes")
      .select("estado_asistencia")
      .eq("invitation_id", invitacion.id);
    if (estadoError) return NextResponse.json({ error: estadoError.message }, { status: 500 });

    const { error: updateError } = await supabase
      .from("invitaciones")
      .update({ estado: computeInvitacionEstado((asistentesActualizados ?? []).map((persona) => persona.estado_asistencia)) })
      .eq("id", invitacion.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
