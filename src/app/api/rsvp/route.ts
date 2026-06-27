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

    const weddingId = bodaData.id;

    const { data: asistenteData, error: asistenteError } = await supabase
      .from("asistentes")
      .insert({
        wedding_id: weddingId,
        nombre: body.nombre,
        apellidos: body.apellidos,
        email: body.email || null,
        telefono: body.telefono || null,
        confirma: body.confirma,
        tiene_acompanante: body.tieneAcompanante || false,
        alergias: body.alergias || null,
        comentarios: body.comentarios || null,
        transporte_id: body.transporteId || null,
      })
      .select("id")
      .single();

    if (asistenteError || !asistenteData) {
      return NextResponse.json(
        { error: asistenteError?.message || "No se pudo guardar el asistente" },
        { status: 500 }
      );
    }

    if (body.acompanante) {
      const { error: acompananteError } = await supabase.from("acompanantes").insert({
        wedding_id: weddingId,
        asistente_id: asistenteData.id,
        nombre: body.acompanante.nombre,
        apellidos: body.acompanante.apellidos,
        alergias: body.acompanante.alergias || null,
        comentarios: null,
      });

      if (acompananteError) {
        return NextResponse.json(
          { error: acompananteError.message || "No se pudo guardar el acompañante" },
          { status: 500 }
        );
      }
    }

    if (body.ninos?.length) {
      const ninosToInsert = body.ninos.map((nino: any) => ({
        wedding_id: weddingId,
        asistente_id: asistenteData.id,
        nombre: nino.nombre,
        edad: Number(nino.edad || 0),
        alergias: nino.alergias || null,
        come_con_padres: Boolean(nino.comeConPadres),
      }));

      const { error: ninosError } = await supabase.from("ninos").insert(ninosToInsert);

      if (ninosError) {
        return NextResponse.json(
          { error: ninosError.message || "No se pudieron guardar los niños" },
          { status: 500 }
        );
      }
    }

    if (body.transporteId) {
      const { error: transporteError } = await supabase.from("reservas_transporte").insert({
        wedding_id: weddingId,
        asistente_id: asistenteData.id,
        trayecto_id: body.transporteId,
        num_plazas: 1,
      });

      if (transporteError) {
        return NextResponse.json(
          { error: transporteError.message || "No se pudo guardar la reserva de transporte" },
          { status: 500 }
        );
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
