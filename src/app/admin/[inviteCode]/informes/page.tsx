/**
 * app/admin/[inviteCode]/informes/page.tsx
 * Sección de informes: listado de invitaciones y asistentes confirmados.
 */

import { createServerClient } from "@/lib/supabase/server";
import InformesView from "@/components/admin/InformesView";

async function getReportData() {
  const supabase = createServerClient();

  const { data: invitaciones } = await supabase
    .from("invitaciones")
    .select(`
      id,
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
        id,
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

  return { invitaciones: invitaciones ?? [] };
}

export default async function InformesPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  const data = await getReportData();

  return <InformesView inviteCode={inviteCode} invitaciones={data.invitaciones} />;
}
