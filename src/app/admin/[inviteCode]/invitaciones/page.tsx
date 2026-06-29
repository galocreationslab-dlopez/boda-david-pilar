/**
 * app/admin/[inviteCode]/invitaciones/page.tsx
 * Vista tabla de todas las invitaciones con invitados expandibles.
 */

import { createServerClient } from "@/lib/supabase/server";
import InvitacionesView from "@/components/admin/InvitacionesView";

async function getData() {
  const supabase = createServerClient();
  const { data } = await supabase
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
  return data ?? [];
}

export default async function InvitacionesPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  const invitaciones = await getData();
  return <InvitacionesView inviteCode={inviteCode} invitaciones={invitaciones} />;
}
