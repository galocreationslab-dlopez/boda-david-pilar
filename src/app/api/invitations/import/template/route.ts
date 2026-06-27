import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    example: [
      {
        invite_code: "A1",
        nombre_visible: "Pilar y David",
        tipo_invitacion: "pareja",
        adultos_estimados: 2,
        adolescentes_estimados: 0,
        ninos_estimados: 1,
        bebes_estimados: 0,
        personas: [
          { nombre: "Pilar", tipo_persona: "adulto", edad: 34 },
          { nombre: "David", tipo_persona: "adulto", edad: 35 },
          { nombre: "Leo", tipo_persona: "nino", edad: 7 }
        ]
      }
    ]
  });
}
