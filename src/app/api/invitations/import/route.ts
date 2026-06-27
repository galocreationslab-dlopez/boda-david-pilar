import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createServerClient();

    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length) {
      return NextResponse.json({ error: "No hay filas para importar" }, { status: 400 });
    }

    const { data: bodaData, error: bodaError } = await supabase
      .from("bodas")
      .select("id")
      .eq("slug", body.weddingSlug || "pilar-y-david")
      .maybeSingle();

    if (bodaError || !bodaData) {
      return NextResponse.json({ error: "No se encontró la boda configurada" }, { status: 404 });
    }

    const created = [] as Array<{ invite_code: string; nombre_visible: string }>;

    for (const row of rows) {
      const inviteCode = (row.invite_code || row.codigo || row.code || crypto.randomUUID().slice(0, 8)).toString();
      const nombreVisible = row.nombre_visible || row.nombre || row.name || `Invitación ${inviteCode}`;

      const personas = Array.isArray(row.personas)
        ? row.personas
        : [
            {
              nombre: row.nombre_persona || row.persona || row.name || nombreVisible,
              tipo_persona: row.tipo_persona || "adulto",
              edad: row.edad ?? null,
            },
          ];

      const { data: invitacionData, error: invitacionError } = await supabase
        .from("invitaciones")
        .insert({
          wedding_id: bodaData.id,
          invite_code: inviteCode,
          nombre_visible: nombreVisible,
          tipo_invitacion: row.tipo_invitacion || "individual",
          personas_json: personas,
          adultos_estimados: Number(row.adultos_estimados || 0),
          adolescentes_estimados: Number(row.adolescentes_estimados || 0),
          ninos_estimados: Number(row.ninos_estimados || 0),
          bebes_estimados: Number(row.bebes_estimados || 0),
          estado: "pendiente",
          metadata: {
            origen: "importacion",
            fuente: body.source || "manual"
          },
        })
        .select("invite_code, nombre_visible")
        .single();

      if (invitacionError || !invitacionData) {
        continue;
      }

      created.push({ invite_code: invitacionData.invite_code, nombre_visible: invitacionData.nombre_visible });
    }

    return NextResponse.json({ ok: true, created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error inesperado" },
      { status: 500 }
    );
  }
}
