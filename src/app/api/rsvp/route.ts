import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

type RSVPCreateBody = {
  weddingSlug?: string;
  invite_code?: string;
  nombre_visible?: string;
  nombre?: string;
  tipo_invitacion?: string;
  adultos_estimados?: number;
  adolescentes_estimados?: number;
  ninos_estimados?: number;
  bebes_estimados?: number;
  confirma?: boolean;
  personas?: Array<{
    nombre?: string;
    edad?: number | null;
    tipo_persona?: string;
    asistira?: "si" | "no" | "pendiente";
    transporte?: string[];
    alergias?: string | null;
    necesidades_alimentarias?: string | null;
    come_con_padres?: boolean | null;
    menu_adulto?: boolean | null;
    necesita_trona?: boolean | null;
  }>;
  comentarios?: string | null;
  edad?: number | null;
  tipo_persona?: string;
  alergias?: string | null;
  transporteIds?: string[];
};

type RSVPCreatePersona = NonNullable<RSVPCreateBody["personas"]>[number];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RSVPCreateBody;
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
    const personas = Array.isArray(body.personas) ? body.personas : [];

    const { data: invitacionData, error: invitacionError } = await supabase
      .from("invitaciones")
      .insert({
        wedding_id: bodaData.id,
        invite_code: inviteCode,
        nombre_visible: body.nombre_visible || body.nombre || "Invitación",
        tipo_invitacion: body.tipo_invitacion || "individual",
        adultos_estimados: Number(body.adultos_estimados || personas.length || 1),
        estado: body.confirma === true ? "confirmada" : "pendiente",
      })
      .select("id")
      .single();

    if (invitacionError || !invitacionData) {
      return NextResponse.json(
        { error: invitacionError?.message || "No se pudo crear la invitación" },
        { status: 500 }
      );
    }

    const asistentes = personas.length
        ? (personas as RSVPCreatePersona[]).map((persona) => ({
          invitation_id: invitacionData.id,
          nombre: persona.nombre || "Invitado",
          edad: persona.edad ?? null,
          tipo_persona: persona.tipo_persona || "adulto",
          estado_asistencia: persona.asistira === "si" ? "si" : persona.asistira === "no" ? "no" : "pendiente",
          transporte: Array.isArray(persona.transporte) ? persona.transporte : [],
          necesidades: {
            alergias: persona.alergias || null,
            necesidades_alimentarias: persona.necesidades_alimentarias || null,
            come_con_padres: persona.come_con_padres ?? null,
            menu_adulto: persona.menu_adulto ?? null,
            necesita_trona: persona.necesita_trona ?? null,
          },
          comentarios: body.comentarios || null,
        }))
      : [
          {
            invitation_id: invitacionData.id,
            nombre: body.nombre || "Invitado",
            edad: body.edad ?? null,
            tipo_persona: body.tipo_persona || "adulto",
            estado_asistencia: body.confirma === true ? "si" : body.confirma === false ? "no" : "pendiente",
            transporte: body.transporteIds || [],
            necesidades: {
              alergias: body.alergias || null,
              necesidades_alimentarias: null,
              come_con_padres: null,
              menu_adulto: null,
              necesita_trona: null,
              necesita_ayuda: null,
            },
            comentarios: body.comentarios || null,
          },
        ];

    const { error: asistentesError } = await supabase.from("asistentes").insert(asistentes);
    if (asistentesError) {
      return NextResponse.json(
        { error: asistentesError.message || "No se pudieron guardar los asistentes" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, inviteCode });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
