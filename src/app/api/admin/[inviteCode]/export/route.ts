/**
 * app/api/admin/[inviteCode]/export/route.ts
 * Genera y descarga un Excel con todas las invitaciones y asistentes.
 */

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createServerClient } from "@/lib/supabase/server";
import { validateAdminCode } from "@/lib/admin-auth";

type ExportAsistente = {
  nombre: string;
  edad: number | null;
  tipo_persona: string;
  estado_asistencia: string;
  transporte: unknown[];
  necesidades: {
    alojamiento?: string | null;
    alergias?: string | null;
    necesidades_alimentarias?: string | null;
    menu_adulto?: boolean | null;
    necesita_trona?: boolean | null;
    come_con_padres?: boolean | null;
    necesita_ayuda?: boolean | null;
  };
  comentarios: string | null;
};

type ExportInvitacion = {
  invite_code: string;
  nombre_visible: string;
  tipo_invitacion: string;
  estado: string;
  adultos_estimados: number;
  adolescentes_estimados: number;
  ninos_estimados: number;
  bebes_estimados: number;
  created_at: string | null;
  asistentes?: ExportAsistente[];
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  const { inviteCode } = await params;
  if (!(await validateAdminCode(inviteCode))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const supabase = createServerClient();

  const { data: invitaciones } = await supabase
    .from("invitaciones")
    .select(`
      invite_code,
      nombre_visible,
      tipo_invitacion,
      estado,
      adultos_estimados,
      adolescentes_estimados,
      ninos_estimados,
      bebes_estimados,
      created_at,
      asistentes (
        nombre,
        edad,
        tipo_persona,
        estado_asistencia,
        transporte,
        necesidades,
        comentarios
      )
    `)
    .neq("tipo_invitacion", "admin")
    .order("nombre_visible");

  // ── Hoja 1: Invitaciones ──────────────────────────────────────
  const rowsInvitaciones = (invitaciones ?? []).map((inv: ExportInvitacion) => ({
    "Código":            inv.invite_code,
    "Nombre visible":    inv.nombre_visible,
    "Tipo":              inv.tipo_invitacion,
    "Estado":            inv.estado,
    "Adultos estimados": inv.adultos_estimados,
    "Adolescentes est.": inv.adolescentes_estimados,
    "Niños estimados":   inv.ninos_estimados,
    "Bebés estimados":   inv.bebes_estimados,
    "Fecha creación":    inv.created_at ? new Date(inv.created_at).toLocaleDateString("es-ES") : "",
  }));

  // ── Hoja 2: Asistentes ────────────────────────────────────────
  const rowsAsistentes: Record<string, string | number>[] = [];
  for (const inv of (invitaciones ?? []) as ExportInvitacion[]) {
    for (const a of inv.asistentes ?? []) {
      const transporte: string[] = Array.isArray(a.transporte)
        ? a.transporte.filter((item): item is string => typeof item === "string")
        : [];
      const nec = a.necesidades ?? {};
      rowsAsistentes.push({
        "Invitación":              inv.nombre_visible,
        "Código invitación":       inv.invite_code,
        "Estado invitación":       inv.estado,
        "Nombre asistente":        a.nombre,
        "Tipo persona":            a.tipo_persona,
        "Edad":                    a.edad ?? "",
        "¿Asistirá?":              a.estado_asistencia,
        "Alojamiento":             nec.alojamiento ?? "",
        "Granada → Beas":          transporte.includes("granada-beas") ? "Sí" : "No",
        "Beas → Torre del Rey":    transporte.includes("beas-torre") ? "Sí" : "No",
        "Torre → Granada":         transporte.includes("torre-granada") ? "Sí" : "No",
        "Alergias":                nec.alergias ?? "",
        "Necesidades alimentarias": nec.necesidades_alimentarias ?? "",
        "Menú adulto":             nec.menu_adulto ? "Sí" : nec.menu_adulto === false ? "No" : "",
        "Necesita trona":          nec.necesita_trona ? "Sí" : nec.necesita_trona === false ? "No" : "",
        "Come con padres":         nec.come_con_padres ? "Sí" : nec.come_con_padres === false ? "No" : "",
        "Necesita ayuda":          nec.necesita_ayuda ? "Sí" : nec.necesita_ayuda === false ? "No" : "",
        "Comentarios":             a.comentarios ?? "",
      });
    }
  }

  // ── Hoja 3: Resumen ───────────────────────────────────────────
  const total     = (invitaciones ?? []).length;
  const confirmadas = (invitaciones ?? []).filter((i: ExportInvitacion) => i.estado === "confirmada").length;
  const rechazadas  = (invitaciones ?? []).filter((i: ExportInvitacion) => i.estado === "rechazada").length;
  const pendientes  = total - confirmadas - rechazadas;
  const asistentesConf = rowsAsistentes.filter((r) => r["¿Asistirá?"] === "si").length;

  const rowsResumen = [
    { "Métrica": "Total invitaciones",       "Valor": total },
    { "Métrica": "Confirmadas",              "Valor": confirmadas },
    { "Métrica": "Rechazadas",               "Valor": rechazadas },
    { "Métrica": "Pendientes",               "Valor": pendientes },
    { "Métrica": "Asistentes confirmados",   "Valor": asistentesConf },
    { "Métrica": "Transporte Granada→Beas",  "Valor": rowsAsistentes.filter((r) => r["Granada → Beas"] === "Sí").length },
    { "Métrica": "Transporte Beas→Torre",    "Valor": rowsAsistentes.filter((r) => r["Beas → Torre del Rey"] === "Sí").length },
    { "Métrica": "Transporte Torre→Granada", "Valor": rowsAsistentes.filter((r) => r["Torre → Granada"] === "Sí").length },
    { "Métrica": "Necesitan trona",          "Valor": rowsAsistentes.filter((r) => r["Necesita trona"] === "Sí").length },
  ];

  // ── Construir workbook ────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsResumen),       "Resumen");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsInvitaciones),  "Invitaciones");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsAsistentes),    "Asistentes");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="invitados-${fecha}.xlsx"`,
    },
  });
}
