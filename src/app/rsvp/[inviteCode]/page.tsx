import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { InviteRsvpForm } from "@/components/wedding/InviteRsvpForm";

export const dynamic = "force-dynamic";

async function getInvitation(inviteCode: string) {
  const supabase = createServerClient();

  const { data: invitacion, error } = await supabase
    .from("invitaciones")
    .select("id, invite_code, nombre_visible, tipo_invitacion, adultos_estimados, adolescentes_estimados, ninos_estimados, bebes_estimados, personas_json")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (error || !invitacion) {
    return null;
  }

  const { data: asistentes } = await supabase
    .from("asistentes")
    .select("id, nombre, edad, tipo_persona, estado_asistencia, transporte, necesidades, comentarios")
    .eq("invitation_id", invitacion.id)
    .order("created_at", { ascending: true });

  const personas = (asistentes?.length
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
    : Array.isArray(invitacion.personas_json)
      ? invitacion.personas_json.map((persona: any) => ({
          id: "",
          nombre: persona.nombre || "Invitado",
          edad: persona.edad ?? null,
          tipo_persona: persona.tipo_persona || "adulto",
          estado_asistencia: "pendiente",
          transporte: [],
          necesidades: {},
          comentarios: null,
        }))
      : []);

  return { invitacion, personas };
}

export default async function InvitePage({ params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = await params;
  const data = await getInvitation(inviteCode);

  if (!data) {
    notFound();
  }

  return (
    <InviteRsvpForm
      inviteCode={inviteCode}
      invitacion={data.invitacion}
      personas={data.personas}
    />
  );
}
